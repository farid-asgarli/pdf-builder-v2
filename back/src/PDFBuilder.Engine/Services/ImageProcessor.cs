using System.Security.Cryptography;
using Microsoft.Extensions.Caching.Memory;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace PDFBuilder.Engine.Services;

/// <summary>
/// Service for loading, processing, and caching images from various sources.
/// Supports HTTP/HTTPS URLs, base64 data URIs, and local file paths.
/// Provides image validation, resizing, and compression using ImageSharp.
/// </summary>
/// <remarks>
/// Initializes a new instance of the ImageProcessor class.
/// </remarks>
/// <param name="httpClient">The HTTP client for fetching remote images.</param>
/// <param name="cache">The memory cache for caching loaded images.</param>
/// <param name="options">Configuration options for image processing.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ImageProcessor(
    HttpClient httpClient,
    IMemoryCache cache,
    ImageProcessorOptions options,
    ILogger<ImageProcessor> logger
) : IImageProcessor
{
    private readonly HttpClient _httpClient =
        httpClient ?? throw new ArgumentNullException(nameof(httpClient));
    private readonly IMemoryCache _cache = cache ?? throw new ArgumentNullException(nameof(cache));
    private readonly ILogger<ImageProcessor> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));
    private readonly ImageProcessorOptions _options =
        options ?? throw new ArgumentNullException(nameof(options));
    private readonly SemaphoreSlim _loadLock = new(10); // Limit concurrent image loads
    private bool _disposed;

    /// <summary>
    /// Supported file extensions for images.
    /// </summary>
    private static readonly HashSet<string> SupportedExtensions = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".bmp",
        ".webp",
        ".tiff",
        ".tif",
    };

    /// <summary>
    /// Loads an image from the specified source asynchronously.
    /// Validates format, applies size limits, and optionally resizes/compresses the image.
    /// </summary>
    /// <param name="source">The image source (URL, base64 data URI, or file path).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The processed image as a byte array, or null if loading failed.</returns>
    public async Task<byte[]?> LoadImageAsync(
        string source,
        CancellationToken cancellationToken = default
    )
    {
        return await LoadImageAsync(source, null, cancellationToken);
    }

    /// <summary>
    /// Loads an image from the specified source asynchronously with processing options.
    /// Validates format, applies size limits, and optionally resizes/compresses the image.
    /// </summary>
    /// <param name="source">The image source (URL, base64 data URI, or file path).</param>
    /// <param name="processingOptions">Optional processing options for resize/compress.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The processed image as a byte array, or null if loading failed.</returns>
    public async Task<byte[]?> LoadImageAsync(
        string source,
        ImageProcessingRequest? processingOptions,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            _logger.LogWarning("Image source is null or empty");
            return null;
        }

        // Generate cache key that includes processing options
        var cacheKey = GetCacheKey(source, processingOptions);

        // Check cache first
        if (_cache.TryGetValue(cacheKey, out byte[]? cachedImage))
        {
            _logger.LogTrace("Image loaded from cache: {Source}", TruncateForLogging(source));
            return cachedImage;
        }

        try
        {
            await _loadLock.WaitAsync(cancellationToken);

            // Double-check cache after acquiring lock
            if (_cache.TryGetValue(cacheKey, out cachedImage))
            {
                return cachedImage;
            }

            // Load raw image data from source
            byte[]? rawImageData = await LoadImageFromSourceAsync(source, cancellationToken);

            if (rawImageData is null || rawImageData.Length == 0)
            {
                return null;
            }

            // Validate image format using ImageSharp
            var validationResult = ValidateImageFormat(rawImageData);
            if (!validationResult.IsValid)
            {
                _logger.LogWarning(
                    "Image format validation failed for source: {Source}. Reason: {Reason}",
                    TruncateForLogging(source),
                    validationResult.ErrorMessage
                );
                return null;
            }

            // Process the image (resize/compress if needed)
            byte[] processedImage = await ProcessImageAsync(
                rawImageData,
                validationResult.Format!,
                validationResult.Width,
                validationResult.Height,
                processingOptions,
                cancellationToken
            );

            // Cache the processed image
            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = _options.CacheDuration,
                Size = processedImage.Length, // For cache size limits
            };

            _cache.Set(cacheKey, processedImage, cacheOptions);
            _logger.LogTrace(
                "Image cached: {Source} ({Size} bytes, {Width}x{Height})",
                TruncateForLogging(source),
                processedImage.Length,
                validationResult.Width,
                validationResult.Height
            );

            return processedImage;
        }
        finally
        {
            _loadLock.Release();
        }
    }

    /// <summary>
    /// Loads an image synchronously (blocking). Use async version when possible.
    /// </summary>
    /// <param name="source">The image source.</param>
    /// <returns>The image as a byte array, or null if loading failed.</returns>
    public byte[]? LoadImage(string source)
    {
        return LoadImageAsync(source, CancellationToken.None).GetAwaiter().GetResult();
    }

    /// <summary>
    /// Loads an image synchronously with processing options (blocking).
    /// Use async version when possible.
    /// </summary>
    /// <param name="source">The image source.</param>
    /// <param name="processingOptions">Optional processing options for resize/compress.</param>
    /// <returns>The image as a byte array, or null if loading failed.</returns>
    public byte[]? LoadImage(string source, ImageProcessingRequest? processingOptions)
    {
        return LoadImageAsync(source, processingOptions, CancellationToken.None)
            .GetAwaiter()
            .GetResult();
    }

    /// <summary>
    /// Gets image metadata without fully loading and processing the image.
    /// Useful for validation or getting dimensions before processing.
    /// </summary>
    /// <param name="source">The image source.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Image metadata, or null if the image couldn't be read.</returns>
    public async Task<ImageMetadata?> GetImageMetadataAsync(
        string source,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return null;
        }

        try
        {
            var rawData = await LoadImageFromSourceAsync(source, cancellationToken);
            if (rawData is null)
            {
                return null;
            }

            using var stream = new MemoryStream(rawData);
            var imageInfo = await Image.IdentifyAsync(stream, cancellationToken);

            if (imageInfo is null)
            {
                return null;
            }

            return new ImageMetadata
            {
                Width = imageInfo.Width,
                Height = imageInfo.Height,
                Format = imageInfo.Metadata.DecodedImageFormat?.Name ?? "Unknown",
                FileSizeBytes = rawData.Length,
                HasAlphaChannel = DetectAlphaChannel(rawData),
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to get image metadata for: {Source}",
                TruncateForLogging(source)
            );
            return null;
        }
    }

    /// <summary>
    /// Determines the type of image source.
    /// </summary>
    /// <param name="source">The image source string.</param>
    /// <returns>The detected image source type.</returns>
    public static ImageSourceType GetSourceType(string source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return ImageSourceType.Unknown;
        }

        source = source.Trim();

        // Check for data URI (base64)
        if (source.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            return ImageSourceType.Base64DataUri;
        }

        // Check for HTTP/HTTPS URL
        if (
            source.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || source.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
        )
        {
            return ImageSourceType.HttpUrl;
        }

        // Check if it looks like a file path
        if (
            Path.IsPathRooted(source)
            || source.Contains(Path.DirectorySeparatorChar)
            || source.Contains(Path.AltDirectorySeparatorChar)
        )
        {
            return ImageSourceType.FilePath;
        }

        // Could be a relative file path or unrecognized format
        return ImageSourceType.FilePath;
    }

    /// <summary>
    /// Validates an image source without loading it.
    /// </summary>
    /// <param name="source">The image source to validate.</param>
    /// <returns>True if the source appears valid; otherwise, false.</returns>
    public static bool ValidateSource(string source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            return false;
        }

        var sourceType = GetSourceType(source);

        return sourceType switch
        {
            ImageSourceType.Base64DataUri => ValidateBase64DataUri(source),
            ImageSourceType.HttpUrl => ValidateHttpUrl(source),
            ImageSourceType.FilePath => ValidateFilePath(source),
            _ => false,
        };
    }

    /// <summary>
    /// Validates image data format using ImageSharp.
    /// </summary>
    /// <param name="imageData">The raw image data to validate.</param>
    /// <returns>Validation result with format information.</returns>
    public ImageValidationResult ValidateImageData(byte[] imageData)
    {
        return ValidateImageFormat(imageData);
    }

    /// <summary>
    /// Resizes and/or compresses an image.
    /// </summary>
    /// <param name="imageData">The source image data.</param>
    /// <param name="options">Processing options for resize and compression.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The processed image data.</returns>
    public async Task<byte[]> ResizeAndCompressAsync(
        byte[] imageData,
        ImageProcessingRequest options,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(imageData);
        ArgumentNullException.ThrowIfNull(options);

        var validation = ValidateImageFormat(imageData);
        if (!validation.IsValid || validation.Format is null)
        {
            throw new InvalidOperationException($"Invalid image format: {validation.ErrorMessage}");
        }

        return await ProcessImageAsync(
            imageData,
            validation.Format,
            validation.Width,
            validation.Height,
            options,
            cancellationToken
        );
    }

    /// <summary>
    /// Clears all cached images.
    /// </summary>
    public void ClearCache()
    {
        // Note: IMemoryCache doesn't have a Clear method, so we rely on expiration
        // For more control, use a custom cache implementation
        _logger.LogInformation("Image cache clear requested (will expire naturally)");
    }

    /// <summary>
    /// Removes a specific image from the cache.
    /// </summary>
    /// <param name="source">The image source to remove from cache.</param>
    public void RemoveFromCache(string source)
    {
        var cacheKey = GetCacheKey(source, null);
        _cache.Remove(cacheKey);
        _logger.LogTrace("Image removed from cache: {Source}", TruncateForLogging(source));
    }

    // ========================================
    // Private Methods - Image Loading
    // ========================================

    private async Task<byte[]?> LoadImageFromSourceAsync(
        string source,
        CancellationToken cancellationToken
    )
    {
        var sourceType = GetSourceType(source);

        _logger.LogTrace(
            "Loading image from {SourceType}: {Source}",
            sourceType,
            TruncateForLogging(source)
        );

        // Check security constraints
        if (sourceType == ImageSourceType.FilePath && !_options.AllowLocalFiles)
        {
            _logger.LogWarning("Local file access is disabled: {Source}", source);
            return null;
        }

        if (
            sourceType == ImageSourceType.HttpUrl
            && !_options.AllowInsecureHttp
            && source.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
        )
        {
            _logger.LogWarning("Insecure HTTP is disabled: {Source}", source);
            return null;
        }

        return sourceType switch
        {
            ImageSourceType.Base64DataUri => LoadFromBase64DataUri(source),
            ImageSourceType.HttpUrl => await LoadFromHttpUrlAsync(source, cancellationToken),
            ImageSourceType.FilePath => await LoadFromFilePathAsync(source, cancellationToken),
            _ => null,
        };
    }

    private byte[]? LoadFromBase64DataUri(string dataUri)
    {
        try
        {
            // Format: data:[<mediatype>][;base64],<data>
            var commaIndex = dataUri.IndexOf(',');
            if (commaIndex < 0)
            {
                _logger.LogWarning("Invalid data URI format: missing comma separator");
                return null;
            }

            var base64Data = dataUri[(commaIndex + 1)..];
            var imageData = Convert.FromBase64String(base64Data);

            if (imageData.Length > _options.MaxImageSizeBytes)
            {
                _logger.LogWarning(
                    "Base64 image exceeds maximum size: {Size} > {MaxSize}",
                    imageData.Length,
                    _options.MaxImageSizeBytes
                );
                return null;
            }

            _logger.LogTrace("Loaded base64 image: {Size} bytes", imageData.Length);
            return imageData;
        }
        catch (FormatException ex)
        {
            _logger.LogWarning(ex, "Failed to decode base64 image data");
            return null;
        }
    }

    private async Task<byte[]?> LoadFromHttpUrlAsync(
        string url,
        CancellationToken cancellationToken
    )
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(_options.HttpTimeout);

            using var response = await _httpClient.GetAsync(
                url,
                HttpCompletionOption.ResponseHeadersRead,
                cts.Token
            );

            response.EnsureSuccessStatusCode();

            // Check content length before downloading
            var contentLength = response.Content.Headers.ContentLength;
            if (contentLength > _options.MaxImageSizeBytes)
            {
                _logger.LogWarning(
                    "Remote image exceeds maximum size: {Size} > {MaxSize}",
                    contentLength,
                    _options.MaxImageSizeBytes
                );
                return null;
            }

            var imageData = await response.Content.ReadAsByteArrayAsync(cts.Token);

            if (imageData.Length > _options.MaxImageSizeBytes)
            {
                _logger.LogWarning(
                    "Downloaded image exceeds maximum size: {Size} > {MaxSize}",
                    imageData.Length,
                    _options.MaxImageSizeBytes
                );
                return null;
            }

            _logger.LogTrace("Loaded HTTP image: {Url} ({Size} bytes)", url, imageData.Length);
            return imageData;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "HTTP request failed for image: {Url}", url);
            return null;
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            _logger.LogWarning("Timeout loading image from: {Url}", url);
            return null;
        }
        catch (OperationCanceledException)
        {
            _logger.LogDebug("Image loading cancelled: {Url}", url);
            throw;
        }
    }

    private async Task<byte[]?> LoadFromFilePathAsync(
        string filePath,
        CancellationToken cancellationToken
    )
    {
        try
        {
            if (!File.Exists(filePath))
            {
                _logger.LogWarning("Image file not found: {FilePath}", filePath);
                return null;
            }

            var fileInfo = new FileInfo(filePath);
            if (fileInfo.Length > _options.MaxImageSizeBytes)
            {
                _logger.LogWarning(
                    "Image file exceeds maximum size: {Size} > {MaxSize}",
                    fileInfo.Length,
                    _options.MaxImageSizeBytes
                );
                return null;
            }

            var imageData = await File.ReadAllBytesAsync(filePath, cancellationToken);
            _logger.LogTrace(
                "Loaded file image: {FilePath} ({Size} bytes)",
                filePath,
                imageData.Length
            );
            return imageData;
        }
        catch (IOException ex)
        {
            _logger.LogWarning(ex, "Failed to read image file: {FilePath}", filePath);
            return null;
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Access denied to image file: {FilePath}", filePath);
            return null;
        }
    }

    private static bool ValidateBase64DataUri(string dataUri)
    {
        if (!dataUri.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var commaIndex = dataUri.IndexOf(',');
        if (commaIndex < 0)
        {
            return false;
        }

        var header = dataUri[..commaIndex].ToLowerInvariant();

        // Check for valid image MIME types
        return header.Contains("image/png")
            || header.Contains("image/jpeg")
            || header.Contains("image/jpg")
            || header.Contains("image/gif")
            || header.Contains("image/webp")
            || header.Contains("image/bmp")
            || header.Contains("image/svg+xml");
    }

    private static bool ValidateHttpUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    private static bool ValidateFilePath(string filePath)
    {
        try
        {
            // Check if path is valid (doesn't check existence)
            _ = Path.GetFullPath(filePath);

            // Check for valid image extension
            var extension = Path.GetExtension(filePath).ToLowerInvariant();
            return SupportedExtensions.Contains(extension);
        }
        catch
        {
            return false;
        }
    }

    // ========================================
    // Private Methods - Image Processing
    // ========================================

    /// <summary>
    /// Validates image format and extracts metadata using ImageSharp.
    /// </summary>
    private ImageValidationResult ValidateImageFormat(byte[] imageData)
    {
        try
        {
            using var stream = new MemoryStream(imageData);
            var imageInfo = Image.Identify(stream);

            if (imageInfo is null)
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Unable to identify image format",
                };
            }

            var format = imageInfo.Metadata.DecodedImageFormat;
            if (format is null)
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Unknown image format",
                };
            }

            // Check for supported formats (QuestPDF supports JPEG, PNG, BMP, WEBP)
            var supportedFormats = new[] { "JPEG", "PNG", "BMP", "WEBP", "GIF", "TIFF" };
            if (!supportedFormats.Contains(format.Name, StringComparer.OrdinalIgnoreCase))
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage =
                        $"Unsupported image format: {format.Name}. Supported: {string.Join(", ", supportedFormats)}",
                };
            }

            // Check image dimensions
            if (imageInfo.Width <= 0 || imageInfo.Height <= 0)
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Invalid image dimensions",
                };
            }

            // Check for maximum dimensions
            if (_options.MaxImageWidth > 0 && imageInfo.Width > _options.MaxImageWidth)
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage =
                        $"Image width ({imageInfo.Width}px) exceeds maximum ({_options.MaxImageWidth}px)",
                };
            }

            if (_options.MaxImageHeight > 0 && imageInfo.Height > _options.MaxImageHeight)
            {
                return new ImageValidationResult
                {
                    IsValid = false,
                    ErrorMessage =
                        $"Image height ({imageInfo.Height}px) exceeds maximum ({_options.MaxImageHeight}px)",
                };
            }

            return new ImageValidationResult
            {
                IsValid = true,
                Width = imageInfo.Width,
                Height = imageInfo.Height,
                Format = format,
            };
        }
        catch (UnknownImageFormatException)
        {
            return new ImageValidationResult
            {
                IsValid = false,
                ErrorMessage = "Unknown or corrupted image format",
            };
        }
        catch (Exception ex)
        {
            return new ImageValidationResult
            {
                IsValid = false,
                ErrorMessage = $"Image validation error: {ex.Message}",
            };
        }
    }

    /// <summary>
    /// Processes the image: resizes and/or compresses as needed.
    /// </summary>
    private async Task<byte[]> ProcessImageAsync(
        byte[] imageData,
        IImageFormat format,
        int originalWidth,
        int originalHeight,
        ImageProcessingRequest? options,
        CancellationToken cancellationToken
    )
    {
        // If no processing needed, return original
        if (options is null && !ShouldAutoResize(originalWidth, originalHeight))
        {
            return imageData;
        }

        try
        {
            using var inputStream = new MemoryStream(imageData);
            using var image = await Image.LoadAsync<Rgba32>(inputStream, cancellationToken);

            // Calculate target dimensions
            var (targetWidth, targetHeight) = CalculateTargetDimensions(
                originalWidth,
                originalHeight,
                options
            );

            // Resize if dimensions changed
            if (targetWidth != originalWidth || targetHeight != originalHeight)
            {
                var resizeOptions = new ResizeOptions
                {
                    Size = new Size(targetWidth, targetHeight),
                    Mode = GetResizeMode(options?.ResizeMode ?? ImageResizeMode.Max),
                    Sampler = KnownResamplers.Lanczos3, // High quality resampling
                };

                image.Mutate(x => x.Resize(resizeOptions));

                _logger.LogTrace(
                    "Image resized from {OriginalWidth}x{OriginalHeight} to {TargetWidth}x{TargetHeight}",
                    originalWidth,
                    originalHeight,
                    image.Width,
                    image.Height
                );
            }

            // Encode with appropriate format and compression
            using var outputStream = new MemoryStream();
            await EncodeImageAsync(image, outputStream, format, options, cancellationToken);

            var result = outputStream.ToArray();

            _logger.LogTrace(
                "Image processed: {OriginalSize} -> {NewSize} bytes ({Ratio:P0} of original)",
                imageData.Length,
                result.Length,
                (double)result.Length / imageData.Length
            );

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Image processing failed, returning original image");
            return imageData;
        }
    }

    /// <summary>
    /// Determines if auto-resize should be applied based on global settings.
    /// </summary>
    private bool ShouldAutoResize(int width, int height)
    {
        if (!_options.AutoResizeEnabled)
        {
            return false;
        }

        return (_options.MaxImageWidth > 0 && width > _options.MaxImageWidth)
            || (_options.MaxImageHeight > 0 && height > _options.MaxImageHeight);
    }

    /// <summary>
    /// Calculates target dimensions based on options and constraints.
    /// </summary>
    private (int Width, int Height) CalculateTargetDimensions(
        int originalWidth,
        int originalHeight,
        ImageProcessingRequest? options
    )
    {
        int targetWidth = options?.TargetWidth ?? originalWidth;
        int targetHeight = options?.TargetHeight ?? originalHeight;

        // Apply global auto-resize limits if enabled
        if (_options.AutoResizeEnabled)
        {
            if (_options.MaxImageWidth > 0 && targetWidth > _options.MaxImageWidth)
            {
                var ratio = (float)_options.MaxImageWidth / targetWidth;
                targetWidth = _options.MaxImageWidth;
                if (options?.MaintainAspectRatio != false)
                {
                    targetHeight = (int)(targetHeight * ratio);
                }
            }

            if (_options.MaxImageHeight > 0 && targetHeight > _options.MaxImageHeight)
            {
                var ratio = (float)_options.MaxImageHeight / targetHeight;
                targetHeight = _options.MaxImageHeight;
                if (options?.MaintainAspectRatio != false)
                {
                    targetWidth = (int)(targetWidth * ratio);
                }
            }
        }

        // Apply explicit resize from options
        if (options is not null && (options.TargetWidth > 0 || options.TargetHeight > 0))
        {
            if (options.MaintainAspectRatio)
            {
                var aspectRatio = (float)originalWidth / originalHeight;

                if (options.TargetWidth > 0 && options.TargetHeight > 0)
                {
                    // Both specified: fit within bounds
                    var widthRatio = (float)options.TargetWidth / originalWidth;
                    var heightRatio = (float)options.TargetHeight / originalHeight;
                    var ratio = Math.Min(widthRatio, heightRatio);
                    targetWidth = (int)(originalWidth * ratio);
                    targetHeight = (int)(originalHeight * ratio);
                }
                else if (options.TargetWidth > 0)
                {
                    targetWidth = options.TargetWidth;
                    targetHeight = (int)(options.TargetWidth / aspectRatio);
                }
                else if (options.TargetHeight > 0)
                {
                    targetHeight = options.TargetHeight;
                    targetWidth = (int)(options.TargetHeight * aspectRatio);
                }
            }
            else
            {
                targetWidth = options.TargetWidth > 0 ? options.TargetWidth : originalWidth;
                targetHeight = options.TargetHeight > 0 ? options.TargetHeight : originalHeight;
            }
        }

        // Ensure minimum size
        targetWidth = Math.Max(1, targetWidth);
        targetHeight = Math.Max(1, targetHeight);

        return (targetWidth, targetHeight);
    }

    /// <summary>
    /// Encodes the image to the output stream with specified format and compression.
    /// </summary>
    private static async Task EncodeImageAsync(
        Image<Rgba32> image,
        Stream outputStream,
        IImageFormat originalFormat,
        ImageProcessingRequest? options,
        CancellationToken cancellationToken
    )
    {
        var quality = options?.CompressionQuality ?? 85;
        var outputFormat = options?.OutputFormat ?? originalFormat.Name;

        IImageEncoder encoder = outputFormat.ToUpperInvariant() switch
        {
            "JPEG" or "JPG" => new JpegEncoder { Quality = quality },
            "PNG" => new PngEncoder
            {
                CompressionLevel =
                    quality >= 90 ? PngCompressionLevel.BestSpeed
                    : quality >= 70 ? PngCompressionLevel.DefaultCompression
                    : PngCompressionLevel.BestCompression,
            },
            "WEBP" => new WebpEncoder { Quality = quality, FileFormat = WebpFileFormatType.Lossy },
            _ => GetDefaultEncoder(originalFormat, quality),
        };

        await image.SaveAsync(outputStream, encoder, cancellationToken);
    }

    /// <summary>
    /// Gets the default encoder for the given format.
    /// </summary>
    private static IImageEncoder GetDefaultEncoder(IImageFormat format, int quality)
    {
        return format.Name.ToUpperInvariant() switch
        {
            "JPEG" or "JPG" => new JpegEncoder { Quality = quality },
            "PNG" => new PngEncoder(),
            "WEBP" => new WebpEncoder { Quality = quality },
            "BMP" => new SixLabors.ImageSharp.Formats.Bmp.BmpEncoder(),
            "GIF" => new SixLabors.ImageSharp.Formats.Gif.GifEncoder(),
            "TIFF" => new SixLabors.ImageSharp.Formats.Tiff.TiffEncoder(),
            _ => new PngEncoder(), // Safe default
        };
    }

    /// <summary>
    /// Converts ImageResizeMode to ImageSharp ResizeMode.
    /// </summary>
    private static ResizeMode GetResizeMode(ImageResizeMode mode)
    {
        return mode switch
        {
            ImageResizeMode.Stretch => ResizeMode.Stretch,
            ImageResizeMode.Crop => ResizeMode.Crop,
            ImageResizeMode.Pad => ResizeMode.Pad,
            ImageResizeMode.BoxPad => ResizeMode.BoxPad,
            ImageResizeMode.Min => ResizeMode.Min,
            ImageResizeMode.Max => ResizeMode.Max,
            _ => ResizeMode.Max,
        };
    }

    /// <summary>
    /// Detects if an image has an alpha channel.
    /// </summary>
    private static bool DetectAlphaChannel(byte[] imageData)
    {
        try
        {
            using var stream = new MemoryStream(imageData);
            var info = Image.Identify(stream);

            if (info is null)
            {
                return false;
            }

            // PNG format typically supports alpha
            var formatName = info.Metadata.DecodedImageFormat?.Name;
            return formatName?.ToUpperInvariant() is "PNG" or "WEBP" or "GIF";
        }
        catch
        {
            return false;
        }
    }

    // ========================================
    // Private Methods - Caching
    // ========================================

    /// <summary>
    /// Generates a cache key for the image source and processing options.
    /// </summary>
    private static string GetCacheKey(string source, ImageProcessingRequest? options)
    {
        var baseKey = source.Length > 256 ? ComputeHash(source) : source;

        if (options is null)
        {
            return $"img_{baseKey}";
        }

        // Include processing options in cache key
        var optionsKey =
            $"{options.TargetWidth}x{options.TargetHeight}_{options.CompressionQuality}_{options.OutputFormat ?? "orig"}";
        return $"img_{baseKey}_{optionsKey}";
    }

    /// <summary>
    /// Computes a hash of the input string for cache key generation.
    /// </summary>
    private static string ComputeHash(string input)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(input);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash)[..16]; // First 16 chars of hex
    }

    private static string TruncateForLogging(string value, int maxLength = 100)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value;
        }

        return value.Length <= maxLength ? value : string.Concat(value.AsSpan(0, maxLength), "...");
    }

    /// <inheritdoc />
    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _loadLock.Dispose();
        _disposed = true;
    }
}

// ========================================
// Supporting Types
// ========================================

/// <summary>
/// Interface for the image processor service.
/// </summary>
public interface IImageProcessor : IDisposable
{
    /// <summary>
    /// Loads an image from the specified source asynchronously.
    /// </summary>
    Task<byte[]?> LoadImageAsync(string source, CancellationToken cancellationToken = default);

    /// <summary>
    /// Loads an image from the specified source with processing options asynchronously.
    /// </summary>
    Task<byte[]?> LoadImageAsync(
        string source,
        ImageProcessingRequest? processingOptions,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Loads an image synchronously.
    /// </summary>
    byte[]? LoadImage(string source);

    /// <summary>
    /// Loads an image synchronously with processing options.
    /// </summary>
    byte[]? LoadImage(string source, ImageProcessingRequest? processingOptions);

    /// <summary>
    /// Gets image metadata without fully loading the image.
    /// </summary>
    Task<ImageMetadata?> GetImageMetadataAsync(
        string source,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Validates image data format.
    /// </summary>
    ImageValidationResult ValidateImageData(byte[] imageData);

    /// <summary>
    /// Resizes and/or compresses an image.
    /// </summary>
    Task<byte[]> ResizeAndCompressAsync(
        byte[] imageData,
        ImageProcessingRequest options,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Clears all cached images.
    /// </summary>
    void ClearCache();

    /// <summary>
    /// Removes a specific image from the cache.
    /// </summary>
    void RemoveFromCache(string source);
}

/// <summary>
/// Configuration options for the ImageProcessor service.
/// </summary>
public sealed class ImageProcessorOptions
{
    /// <summary>
    /// Gets or sets the maximum allowed image file size in bytes.
    /// Default: 10 MB
    /// </summary>
    public long MaxImageSizeBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// Gets or sets the maximum allowed image width in pixels.
    /// Set to 0 to disable. Default: 4096
    /// </summary>
    public int MaxImageWidth { get; set; } = 4096;

    /// <summary>
    /// Gets or sets the maximum allowed image height in pixels.
    /// Set to 0 to disable. Default: 4096
    /// </summary>
    public int MaxImageHeight { get; set; } = 4096;

    /// <summary>
    /// Gets or sets whether to automatically resize images that exceed max dimensions.
    /// Default: true
    /// </summary>
    public bool AutoResizeEnabled { get; set; } = true;

    /// <summary>
    /// Gets or sets the default compression quality (1-100) for JPEG output.
    /// Default: 85
    /// </summary>
    public int DefaultCompressionQuality { get; set; } = 85;

    /// <summary>
    /// Gets or sets the HTTP timeout for loading remote images.
    /// Default: 30 seconds
    /// </summary>
    public TimeSpan HttpTimeout { get; set; } = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Gets or sets how long images are cached in memory.
    /// Default: 30 minutes
    /// </summary>
    public TimeSpan CacheDuration { get; set; } = TimeSpan.FromMinutes(30);

    /// <summary>
    /// Gets or sets whether to allow loading from local file paths.
    /// Default: true
    /// </summary>
    public bool AllowLocalFiles { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to allow loading from HTTP URLs (not HTTPS).
    /// Default: true
    /// </summary>
    public bool AllowInsecureHttp { get; set; } = true;

    /// <summary>
    /// Gets or sets the base path for resolving relative file paths.
    /// </summary>
    public string? BaseFilePath { get; set; }

    /// <summary>
    /// Gets or sets the list of allowed URL host patterns for remote images.
    /// Empty list allows all hosts. Uses glob patterns.
    /// </summary>
    public List<string> AllowedHosts { get; set; } = new();
}

/// <summary>
/// Request options for image processing.
/// </summary>
public sealed class ImageProcessingRequest
{
    /// <summary>
    /// Gets or sets the target width in pixels. 0 means no width constraint.
    /// </summary>
    public int TargetWidth { get; set; }

    /// <summary>
    /// Gets or sets the target height in pixels. 0 means no height constraint.
    /// </summary>
    public int TargetHeight { get; set; }

    /// <summary>
    /// Gets or sets whether to maintain aspect ratio when resizing.
    /// Default: true
    /// </summary>
    public bool MaintainAspectRatio { get; set; } = true;

    /// <summary>
    /// Gets or sets the resize mode.
    /// Default: Max (fit within bounds while maintaining aspect ratio)
    /// </summary>
    public ImageResizeMode ResizeMode { get; set; } = ImageResizeMode.Max;

    /// <summary>
    /// Gets or sets the compression quality (1-100).
    /// Default: 85
    /// </summary>
    public int CompressionQuality { get; set; } = 85;

    /// <summary>
    /// Gets or sets the output format. Null means preserve original format.
    /// Supported: "JPEG", "PNG", "WEBP"
    /// </summary>
    public string? OutputFormat { get; set; }
}

/// <summary>
/// Result of image format validation.
/// </summary>
public sealed class ImageValidationResult
{
    /// <summary>
    /// Gets or sets whether the image is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Gets or sets the error message if validation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Gets or sets the detected image format.
    /// </summary>
    public IImageFormat? Format { get; set; }

    /// <summary>
    /// Gets or sets the image width in pixels.
    /// </summary>
    public int Width { get; set; }

    /// <summary>
    /// Gets or sets the image height in pixels.
    /// </summary>
    public int Height { get; set; }
}

/// <summary>
/// Image metadata information.
/// </summary>
public sealed class ImageMetadata
{
    /// <summary>
    /// Gets or sets the image width in pixels.
    /// </summary>
    public int Width { get; set; }

    /// <summary>
    /// Gets or sets the image height in pixels.
    /// </summary>
    public int Height { get; set; }

    /// <summary>
    /// Gets or sets the image format name.
    /// </summary>
    public string Format { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the file size in bytes.
    /// </summary>
    public long FileSizeBytes { get; set; }

    /// <summary>
    /// Gets or sets whether the image has an alpha channel.
    /// </summary>
    public bool HasAlphaChannel { get; set; }
}

/// <summary>
/// Image resize modes.
/// </summary>
public enum ImageResizeMode
{
    /// <summary>Stretches to fill, ignoring aspect ratio.</summary>
    Stretch,

    /// <summary>Crops to fill the target dimensions.</summary>
    Crop,

    /// <summary>Pads to fit within target dimensions.</summary>
    Pad,

    /// <summary>Pads with box around the image.</summary>
    BoxPad,

    /// <summary>Scales to minimum dimensions (may exceed target).</summary>
    Min,

    /// <summary>Scales to maximum dimensions (fits within target).</summary>
    Max,
}

/// <summary>
/// Types of image sources supported by the ImageProcessor.
/// </summary>
public enum ImageSourceType
{
    /// <summary>Unknown or unsupported source type.</summary>
    Unknown,

    /// <summary>HTTP or HTTPS URL.</summary>
    HttpUrl,

    /// <summary>Base64 encoded data URI (data:image/...).</summary>
    Base64DataUri,

    /// <summary>Local file system path.</summary>
    FilePath,
}
