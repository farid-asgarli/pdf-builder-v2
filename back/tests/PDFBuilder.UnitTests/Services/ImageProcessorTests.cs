using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Moq.Protected;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.UnitTests.Services;

/// <summary>
/// Unit tests for the ImageProcessor service.
/// Tests cover image loading from various sources, caching, validation, and processing.
/// </summary>
public sealed class ImageProcessorTests : IDisposable
{
    private readonly Mock<ILogger<ImageProcessor>> _loggerMock;
    private readonly IMemoryCache _cache;
    private readonly ImageProcessorOptions _options;
    private readonly Mock<HttpMessageHandler> _httpHandlerMock;
    private readonly HttpClient _httpClient;
    private ImageProcessor _sut;

    // Sample 1x1 pixel PNG image (smallest valid PNG)
    private static readonly byte[] SamplePngImage = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    );

    // Sample 1x1 pixel JPEG image
    private static readonly byte[] SampleJpegImage = Convert.FromBase64String(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC/AB//2Q=="
    );

    public ImageProcessorTests()
    {
        _loggerMock = new Mock<ILogger<ImageProcessor>>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _options = new ImageProcessorOptions
        {
            MaxImageSizeBytes = 10 * 1024 * 1024, // 10 MB
            MaxImageWidth = 4096,
            MaxImageHeight = 4096,
            AutoResizeEnabled = true,
            DefaultCompressionQuality = 85,
            HttpTimeout = TimeSpan.FromSeconds(30),
            CacheDuration = TimeSpan.FromMinutes(30),
            AllowLocalFiles = true,
            AllowInsecureHttp = true,
        };

        _httpHandlerMock = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_httpHandlerMock.Object);

        _sut = new ImageProcessor(_httpClient, _cache, _options, _loggerMock.Object);
    }

    public void Dispose()
    {
        _sut.Dispose();
        _httpClient.Dispose();
        _cache.Dispose();
    }

    #region Source Type Detection Tests

    [Theory]
    [InlineData("https://example.com/image.png", ImageSourceType.HttpUrl)]
    [InlineData("http://example.com/image.jpg", ImageSourceType.HttpUrl)]
    [InlineData("HTTPS://EXAMPLE.COM/IMAGE.PNG", ImageSourceType.HttpUrl)]
    [InlineData("data:image/png;base64,iVBORw0KGgo=", ImageSourceType.Base64DataUri)]
    [InlineData("data:image/jpeg;base64,/9j/4AAQSk=", ImageSourceType.Base64DataUri)]
    [InlineData("DATA:IMAGE/PNG;BASE64,abc=", ImageSourceType.Base64DataUri)]
    [InlineData("C:\\images\\logo.png", ImageSourceType.FilePath)]
    [InlineData("/var/images/logo.png", ImageSourceType.FilePath)]
    [InlineData("./images/logo.png", ImageSourceType.FilePath)]
    [InlineData("images/logo.png", ImageSourceType.FilePath)]
    public void GetSourceType_ShouldDetectCorrectType(string source, ImageSourceType expectedType)
    {
        // Act
        var result = ImageProcessor.GetSourceType(source);

        // Assert
        result.Should().Be(expectedType);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void GetSourceType_WithInvalidInput_ShouldReturnUnknown(string? source)
    {
        // Act
        var result = ImageProcessor.GetSourceType(source!);

        // Assert
        result.Should().Be(ImageSourceType.Unknown);
    }

    #endregion

    #region Source Validation Tests

    [Theory]
    [InlineData("https://example.com/image.png", true)]
    [InlineData("http://example.com/image.jpg", true)]
    [InlineData("data:image/png;base64,iVBORw0KGgo=", true)]
    [InlineData("C:\\images\\logo.png", true)]
    [InlineData("images/logo.jpg", true)]
    public void ValidateSource_WithValidSources_ShouldReturnTrue(string source, bool expected)
    {
        // Act
        var result = ImageProcessor.ValidateSource(source);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("data:text/plain;base64,abc=")] // Not an image
    [InlineData("C:\\images\\logo.txt")] // Invalid extension
    [InlineData("images/logo.docx")] // Invalid extension
    public void ValidateSource_WithInvalidSources_ShouldReturnFalse(string? source)
    {
        // Act
        var result = ImageProcessor.ValidateSource(source!);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region Base64 Loading Tests

    [Fact]
    public async Task LoadImageAsync_WithValidBase64DataUri_ShouldReturnImageData()
    {
        // Arrange
        var base64Image = Convert.ToBase64String(SamplePngImage);
        var dataUri = $"data:image/png;base64,{base64Image}";

        // Act
        var result = await _sut.LoadImageAsync(dataUri);

        // Assert
        result.Should().NotBeNull();
        result!.Length.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task LoadImageAsync_WithInvalidBase64_ShouldReturnNull()
    {
        // Arrange
        var dataUri = "data:image/png;base64,not-valid-base64!!!";

        // Act
        var result = await _sut.LoadImageAsync(dataUri);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LoadImageAsync_WithBase64MissingComma_ShouldReturnNull()
    {
        // Arrange
        var dataUri = "data:image/png;base64abc123";

        // Act
        var result = await _sut.LoadImageAsync(dataUri);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region HTTP Loading Tests

    [Fact]
    public async Task LoadImageAsync_WithValidHttpUrl_ShouldReturnImageData()
    {
        // Arrange
        var url = "https://example.com/test.png";
        SetupHttpResponse(url, SamplePngImage, HttpStatusCode.OK);

        // Act
        var result = await _sut.LoadImageAsync(url);

        // Assert
        result.Should().NotBeNull();
        result!.Length.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task LoadImageAsync_WithHttp404_ShouldReturnNull()
    {
        // Arrange
        var url = "https://example.com/notfound.png";
        SetupHttpResponse(url, Array.Empty<byte>(), HttpStatusCode.NotFound);

        // Act
        var result = await _sut.LoadImageAsync(url);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LoadImageAsync_WithInsecureHttpDisabled_ShouldReturnNull()
    {
        // Arrange
        _options.AllowInsecureHttp = false;
        _sut = new ImageProcessor(_httpClient, _cache, _options, _loggerMock.Object);

        var url = "http://example.com/test.png";
        SetupHttpResponse(url, SamplePngImage, HttpStatusCode.OK);

        // Act
        var result = await _sut.LoadImageAsync(url);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task LoadImageAsync_WithImageExceedingMaxSize_ShouldReturnNull()
    {
        // Arrange
        _options.MaxImageSizeBytes = 100; // Very small limit
        _sut = new ImageProcessor(_httpClient, _cache, _options, _loggerMock.Object);

        var url = "https://example.com/large.png";
        var largeData = new byte[1000];
        SetupHttpResponse(url, largeData, HttpStatusCode.OK, contentLength: 1000);

        // Act
        var result = await _sut.LoadImageAsync(url);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region Caching Tests

    [Fact]
    public async Task LoadImageAsync_ShouldCacheResult()
    {
        // Arrange
        var url = "https://example.com/cached.png";
        var callCount = 0;

        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                callCount++;
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(SamplePngImage),
                };
            });

        // Act
        var result1 = await _sut.LoadImageAsync(url);
        var result2 = await _sut.LoadImageAsync(url);

        // Assert
        result1.Should().NotBeNull();
        result2.Should().NotBeNull();
        callCount.Should().Be(1, "Second call should use cached result");
    }

    [Fact]
    public void RemoveFromCache_ShouldRemoveCachedImage()
    {
        // Arrange
        var url = "https://example.com/toremove.png";
        SetupHttpResponse(url, SamplePngImage, HttpStatusCode.OK);

        // Load to populate cache
        _ = _sut.LoadImage(url);

        // Act
        _sut.RemoveFromCache(url);

        // Verify by checking if HTTP is called again
        var callCount = 0;
        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                callCount++;
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(SamplePngImage),
                };
            });

        // Load again - should make HTTP call since cache was cleared
        _ = _sut.LoadImage(url);

        // Assert
        callCount.Should().Be(1);
    }

    #endregion

    #region Image Validation Tests

    [Fact]
    public void ValidateImageData_WithValidPng_ShouldReturnValid()
    {
        // Act
        var result = _sut.ValidateImageData(SamplePngImage);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Format.Should().NotBeNull();
        result.Format!.Name.Should().Be("PNG");
        result.Width.Should().BeGreaterThan(0);
        result.Height.Should().BeGreaterThan(0);
    }

    [Fact]
    public void ValidateImageData_WithValidJpeg_ShouldReturnValid()
    {
        // Act
        var result = _sut.ValidateImageData(SampleJpegImage);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Format.Should().NotBeNull();
        result.Format!.Name.Should().Be("JPEG");
    }

    [Fact]
    public void ValidateImageData_WithInvalidData_ShouldReturnInvalid()
    {
        // Arrange
        var invalidData = new byte[] { 0x00, 0x01, 0x02, 0x03 };

        // Act
        var result = _sut.ValidateImageData(invalidData);

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void ValidateImageData_WithEmptyData_ShouldReturnInvalid()
    {
        // Act
        var result = _sut.ValidateImageData(Array.Empty<byte>());

        // Assert
        result.IsValid.Should().BeFalse();
    }

    #endregion

    #region Image Processing Tests

    [Fact]
    public async Task ResizeAndCompressAsync_WithValidOptions_ShouldProcessImage()
    {
        // Arrange
        var options = new ImageProcessingRequest
        {
            TargetWidth = 1,
            TargetHeight = 1,
            CompressionQuality = 75,
            MaintainAspectRatio = true,
        };

        // Act
        var result = await _sut.ResizeAndCompressAsync(SamplePngImage, options);

        // Assert
        result.Should().NotBeNull();
        result.Length.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task ResizeAndCompressAsync_WithNullData_ShouldThrowArgumentNullException()
    {
        // Arrange
        var options = new ImageProcessingRequest { TargetWidth = 100 };

        // Act
        var act = () => _sut.ResizeAndCompressAsync(null!, options);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [Fact]
    public async Task ResizeAndCompressAsync_WithNullOptions_ShouldThrowArgumentNullException()
    {
        // Act
        var act = () => _sut.ResizeAndCompressAsync(SamplePngImage, null!);

        // Assert
        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    #endregion

    #region Metadata Tests

    [Fact]
    public async Task GetImageMetadataAsync_WithValidBase64_ShouldReturnMetadata()
    {
        // Arrange
        var base64Image = Convert.ToBase64String(SamplePngImage);
        var dataUri = $"data:image/png;base64,{base64Image}";

        // Act
        var result = await _sut.GetImageMetadataAsync(dataUri);

        // Assert
        result.Should().NotBeNull();
        result!.Width.Should().BeGreaterThan(0);
        result.Height.Should().BeGreaterThan(0);
        result.Format.Should().Be("PNG");
        result.FileSizeBytes.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetImageMetadataAsync_WithInvalidSource_ShouldReturnNull()
    {
        // Arrange
        var invalidSource = "data:image/png;base64,not-valid!!!";

        // Act
        var result = await _sut.GetImageMetadataAsync(invalidSource);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region Size Limit Tests

    [Fact]
    public async Task LoadImageAsync_WithImageExceedingMaxWidth_ShouldRejectImage()
    {
        // Arrange
        _options.MaxImageWidth = 1; // Very small limit, image won't pass validation after processing
        _options.AutoResizeEnabled = false; // Disable auto-resize to test rejection
        _sut = new ImageProcessor(_httpClient, _cache, _options, _loggerMock.Object);

        // Create a larger test image (2x2 pixels)
        var largerPng = Convert.FromBase64String(
            "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVQI12P4////f4YxAw4GAH6m/v8FBJZ+AAAAAElFTkSuQmCC"
        );
        var dataUri = $"data:image/png;base64,{Convert.ToBase64String(largerPng)}";

        // Act
        var result = await _sut.LoadImageAsync(dataUri);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region Local File Disabled Tests

    [Fact]
    public async Task LoadImageAsync_WithLocalFileDisabled_ShouldReturnNull()
    {
        // Arrange
        _options.AllowLocalFiles = false;
        _sut = new ImageProcessor(_httpClient, _cache, _options, _loggerMock.Object);

        // Act
        var result = await _sut.LoadImageAsync("C:\\test\\image.png");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region Synchronous Loading Tests

    [Fact]
    public void LoadImage_ShouldWorkSynchronously()
    {
        // Arrange
        var base64Image = Convert.ToBase64String(SamplePngImage);
        var dataUri = $"data:image/png;base64,{base64Image}";

        // Act
        var result = _sut.LoadImage(dataUri);

        // Assert
        result.Should().NotBeNull();
        result!.Length.Should().BeGreaterThan(0);
    }

    [Fact]
    public void LoadImage_WithProcessingOptions_ShouldWorkSynchronously()
    {
        // Arrange
        var base64Image = Convert.ToBase64String(SamplePngImage);
        var dataUri = $"data:image/png;base64,{base64Image}";
        var options = new ImageProcessingRequest { CompressionQuality = 75 };

        // Act
        var result = _sut.LoadImage(dataUri, options);

        // Assert
        result.Should().NotBeNull();
    }

    #endregion

    #region Helper Methods

    private void SetupHttpResponse(
        string url,
        byte[] content,
        HttpStatusCode statusCode,
        long? contentLength = null
    )
    {
        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString() == url),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(() =>
            {
                var response = new HttpResponseMessage(statusCode)
                {
                    Content = new ByteArrayContent(content),
                };

                if (contentLength.HasValue)
                {
                    response.Content.Headers.ContentLength = contentLength;
                }

                return response;
            });
    }

    #endregion
}
