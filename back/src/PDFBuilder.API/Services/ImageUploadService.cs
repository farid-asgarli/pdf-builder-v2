using Microsoft.Extensions.Options;
using PDFBuilder.Contracts.Responses;
using PDFBuilder.Engine.Services;
using PDFBuilder.Infrastructure.Configuration;

namespace PDFBuilder.API.Services;

/// <summary>
/// Service for handling image file uploads with validation and processing.
/// </summary>
public interface IImageUploadService
{
    /// <summary>
    /// Uploads a single image file.
    /// </summary>
    /// <param name="file">The uploaded file.</param>
    /// <param name="autoResize">Whether to auto-resize large images.</param>
    /// <param name="maxWidth">Maximum width for resizing.</param>
    /// <param name="maxHeight">Maximum height for resizing.</param>
    /// <param name="quality">Compression quality.</param>
    /// <param name="outputFormat">Output format override.</param>
    /// <param name="customFilename">Custom filename (optional).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Upload response with details.</returns>
    Task<ImageUploadResponse> UploadImageAsync(
        IFormFile file,
        bool autoResize = true,
        int? maxWidth = null,
        int? maxHeight = null,
        int? quality = null,
        string? outputFormat = null,
        string? customFilename = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Uploads multiple image files.
    /// </summary>
    /// <param name="files">The uploaded files.</param>
    /// <param name="autoResize">Whether to auto-resize large images.</param>
    /// <param name="quality">Compression quality.</param>
    /// <param name="progressReporter">Optional progress reporter.</param>
    /// <param name="operationId">Operation ID for progress reporting.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Batch upload response with results.</returns>
    Task<BatchImageUploadResponse> UploadImagesAsync(
        IFormFileCollection files,
        bool autoResize = true,
        int? quality = null,
        IProgressReporter? progressReporter = null,
        string? operationId = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the URL for an uploaded image by its ID.
    /// </summary>
    /// <param name="imageId">The image identifier.</param>
    /// <returns>The image URL, or null if not found.</returns>
    string? GetImageUrl(string imageId);

    /// <summary>
    /// Gets an uploaded image by its ID.
    /// </summary>
    /// <param name="imageId">The image identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The image data, or null if not found.</returns>
    Task<(byte[] Data, string ContentType, string Filename)?> GetImageAsync(
        string imageId,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes an uploaded image by its ID.
    /// </summary>
    /// <param name="imageId">The image identifier.</param>
    /// <returns>True if deleted, false if not found.</returns>
    Task<bool> DeleteImageAsync(string imageId);
}

/// <summary>
/// Implementation of <see cref="IImageUploadService"/> that stores images on the file system.
/// </summary>
public class ImageUploadService : IImageUploadService
{
    private readonly IImageProcessor _imageProcessor;
    private readonly StorageSettings _storageSettings;
    private readonly ILogger<ImageUploadService> _logger;
    private readonly string _uploadPath;

    private static readonly HashSet<string> AllowedContentTypes = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/svg+xml",
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="ImageUploadService"/> class.
    /// </summary>
    public ImageUploadService(
        IImageProcessor imageProcessor,
        IOptions<StorageSettings> storageSettings,
        ILogger<ImageUploadService> logger
    )
    {
        _imageProcessor = imageProcessor ?? throw new ArgumentNullException(nameof(imageProcessor));
        _storageSettings =
            storageSettings?.Value ?? throw new ArgumentNullException(nameof(storageSettings));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        _uploadPath = Path.GetFullPath(_storageSettings.ImageUploadPath);

        // Ensure upload directory exists
        if (!Directory.Exists(_uploadPath))
        {
            Directory.CreateDirectory(_uploadPath);
            _logger.LogInformation("Created image upload directory: {Path}", _uploadPath);
        }
    }

    /// <inheritdoc />
    public async Task<ImageUploadResponse> UploadImageAsync(
        IFormFile file,
        bool autoResize = true,
        int? maxWidth = null,
        int? maxHeight = null,
        int? quality = null,
        string? outputFormat = null,
        string? customFilename = null,
        CancellationToken cancellationToken = default
    )
    {
        var response = new ImageUploadResponse
        {
            OriginalFilename = file.FileName,
            UploadedAt = DateTime.UtcNow,
        };

        try
        {
            // Validate file
            var validationResult = ValidateFile(file);
            if (!validationResult.IsValid)
            {
                response.Success = false;
                response.ErrorMessage = validationResult.ErrorMessage;
                return response;
            }

            // Read file into memory
            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream, cancellationToken);
            var imageData = memoryStream.ToArray();

            // Process image if needed
            byte[] processedData = imageData;
            if (autoResize || quality.HasValue || !string.IsNullOrEmpty(outputFormat))
            {
                var processingOptions = new ImageProcessingRequest
                {
                    TargetWidth = maxWidth ?? 0,
                    TargetHeight = maxHeight ?? 0,
                    CompressionQuality = quality ?? 85,
                    OutputFormat = outputFormat,
                };

                var processed = await _imageProcessor.LoadImageAsync(
                    $"data:{file.ContentType};base64,{Convert.ToBase64String(imageData)}",
                    processingOptions,
                    cancellationToken
                );

                if (processed != null)
                {
                    processedData = processed;
                }
            }

            // Get image metadata
            var metadata = await _imageProcessor.GetImageMetadataAsync(
                $"data:{file.ContentType};base64,{Convert.ToBase64String(processedData)}",
                cancellationToken
            );

            // Generate unique ID and filename
            var imageId = GenerateImageId();
            var extension = GetExtension(file.FileName, outputFormat);
            var storedFilename = string.IsNullOrWhiteSpace(customFilename)
                ? $"{imageId}{extension}"
                : $"{SanitizeFilename(customFilename)}-{imageId}{extension}";

            var filePath = Path.Combine(_uploadPath, storedFilename);

            // Save to disk
            await File.WriteAllBytesAsync(filePath, processedData, cancellationToken);

            response.Success = true;
            response.ImageId = imageId;
            response.StoredFilename = storedFilename;
            response.Url = $"/api/images/{imageId}";
            response.ContentType = GetContentType(extension);
            response.FileSizeBytes = processedData.Length;
            response.Width = metadata?.Width;
            response.Height = metadata?.Height;

            _logger.LogInformation(
                "Image uploaded successfully: {ImageId}, Original: {Original}, Size: {Size} bytes",
                imageId,
                file.FileName,
                processedData.Length
            );

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload image: {Filename}", file.FileName);
            response.Success = false;
            response.ErrorMessage = "An error occurred while uploading the image";
            return response;
        }
    }

    /// <inheritdoc />
    public async Task<BatchImageUploadResponse> UploadImagesAsync(
        IFormFileCollection files,
        bool autoResize = true,
        int? quality = null,
        IProgressReporter? progressReporter = null,
        string? operationId = null,
        CancellationToken cancellationToken = default
    )
    {
        var response = new BatchImageUploadResponse
        {
            TotalFiles = files.Count,
            Results = new List<ImageUploadResponse>(files.Count),
        };

        var effectiveOperationId = operationId ?? Guid.NewGuid().ToString("N");

        if (progressReporter != null)
        {
            await progressReporter.ReportStartedAsync(
                effectiveOperationId,
                OperationType.BatchImageProcessing,
                $"Starting upload of {files.Count} images",
                cancellationToken
            );
        }

        var processed = 0;
        foreach (var file in files)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                if (progressReporter != null)
                {
                    await progressReporter.ReportCancelledAsync(
                        effectiveOperationId,
                        cancellationToken: cancellationToken
                    );
                }
                break;
            }

            var result = await UploadImageAsync(
                file,
                autoResize,
                quality: quality,
                cancellationToken: cancellationToken
            );

            response.Results.Add(result);

            if (result.Success)
            {
                response.SuccessfulUploads++;
            }
            else
            {
                response.FailedUploads++;
            }

            processed++;

            if (progressReporter != null)
            {
                var percentage = (int)((processed / (double)files.Count) * 100);
                await progressReporter.ReportProgressAsync(
                    effectiveOperationId,
                    percentage,
                    $"Processed {processed} of {files.Count} images",
                    cancellationToken: cancellationToken
                );
            }
        }

        response.AllSuccessful = response.FailedUploads == 0;

        if (progressReporter != null)
        {
            await progressReporter.ReportCompletedAsync(
                effectiveOperationId,
                $"Upload completed: {response.SuccessfulUploads} successful, {response.FailedUploads} failed",
                additionalData: new Dictionary<string, object>
                {
                    ["successfulUploads"] = response.SuccessfulUploads,
                    ["failedUploads"] = response.FailedUploads,
                },
                cancellationToken: cancellationToken
            );
        }

        return response;
    }

    /// <inheritdoc />
    public string? GetImageUrl(string imageId)
    {
        var files = Directory.GetFiles(_uploadPath, $"*{imageId}*");
        if (files.Length == 0)
        {
            return null;
        }

        return $"/api/images/{imageId}";
    }

    /// <inheritdoc />
    public async Task<(byte[] Data, string ContentType, string Filename)?> GetImageAsync(
        string imageId,
        CancellationToken cancellationToken = default
    )
    {
        var files = Directory.GetFiles(_uploadPath, $"*{imageId}*");
        if (files.Length == 0)
        {
            return null;
        }

        var filePath = files[0];
        var filename = Path.GetFileName(filePath);
        var extension = Path.GetExtension(filePath);
        var contentType = GetContentType(extension);

        var data = await File.ReadAllBytesAsync(filePath, cancellationToken);
        return (data, contentType, filename);
    }

    /// <inheritdoc />
    public Task<bool> DeleteImageAsync(string imageId)
    {
        var files = Directory.GetFiles(_uploadPath, $"*{imageId}*");
        if (files.Length == 0)
        {
            return Task.FromResult(false);
        }

        foreach (var file in files)
        {
            File.Delete(file);
            _logger.LogInformation("Deleted image: {ImageId}", imageId);
        }

        return Task.FromResult(true);
    }

    private (bool IsValid, string? ErrorMessage) ValidateFile(IFormFile file)
    {
        if (file.Length == 0)
        {
            return (false, "File is empty");
        }

        if (file.Length > _storageSettings.MaxUploadSizeBytes)
        {
            return (
                false,
                $"File size exceeds maximum allowed size of {_storageSettings.MaxUploadSizeBytes / 1024 / 1024}MB"
            );
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            return (false, $"Content type '{file.ContentType}' is not allowed");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_storageSettings.AllowedImageExtensions.Contains(extension))
        {
            return (false, $"File extension '{extension}' is not allowed");
        }

        return (true, null);
    }

    private static string GenerateImageId()
    {
        return $"img_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}"[..32];
    }

    private static string GetExtension(string filename, string? outputFormat)
    {
        if (!string.IsNullOrEmpty(outputFormat))
        {
            return outputFormat.ToLowerInvariant() switch
            {
                "jpeg" or "jpg" => ".jpg",
                "png" => ".png",
                "webp" => ".webp",
                "gif" => ".gif",
                _ => Path.GetExtension(filename).ToLowerInvariant(),
            };
        }

        return Path.GetExtension(filename).ToLowerInvariant();
    }

    private static string GetContentType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            ".svg" => "image/svg+xml",
            _ => "application/octet-stream",
        };
    }

    private static string SanitizeFilename(string filename)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = new string(filename.Where(c => !invalidChars.Contains(c)).ToArray());
        return sanitized.Replace(" ", "_").ToLowerInvariant();
    }
}
