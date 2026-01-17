using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using PDFBuilder.API.Services;
using PDFBuilder.Contracts.Requests;
using PDFBuilder.Contracts.Responses;
using Swashbuckle.AspNetCore.Annotations;

namespace PDFBuilder.API.Controllers;

/// <summary>
/// Controller for image upload and management operations.
/// Provides endpoints for uploading, retrieving, and deleting images.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ImagesController : ControllerBase
{
    private readonly IImageUploadService _imageUploadService;
    private readonly IProgressReporter _progressReporter;
    private readonly ILogger<ImagesController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ImagesController"/> class.
    /// </summary>
    /// <param name="imageUploadService">The image upload service.</param>
    /// <param name="progressReporter">The progress reporter for long operations.</param>
    /// <param name="logger">The logger instance.</param>
    public ImagesController(
        IImageUploadService imageUploadService,
        IProgressReporter progressReporter,
        ILogger<ImagesController> logger
    )
    {
        _imageUploadService =
            imageUploadService ?? throw new ArgumentNullException(nameof(imageUploadService));
        _progressReporter =
            progressReporter ?? throw new ArgumentNullException(nameof(progressReporter));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Uploads a single image file.
    /// </summary>
    /// <param name="file">The image file to upload.</param>
    /// <param name="autoResize">Whether to auto-resize large images.</param>
    /// <param name="maxWidth">Maximum width for resizing.</param>
    /// <param name="maxHeight">Maximum height for resizing.</param>
    /// <param name="quality">Compression quality (1-100).</param>
    /// <param name="outputFormat">Output format (jpeg, png, webp).</param>
    /// <param name="customFilename">Custom filename (optional).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The upload result with image details.</returns>
    [HttpPost("upload")]
    [SwaggerOperation(
        Summary = "Upload a single image",
        Description = "Uploads a single image file with optional processing (resize, compress, convert format)."
    )]
    [SwaggerResponse(200, "Image uploaded successfully", typeof(ImageUploadResponse))]
    [SwaggerResponse(400, "Invalid request or validation failure", typeof(ProblemDetails))]
    [SwaggerResponse(413, "File too large")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_485_760)] // 10MB
    public async Task<ActionResult<ImageUploadResponse>> UploadImage(
        IFormFile file,
        [FromQuery] bool autoResize = true,
        [FromQuery] int? maxWidth = null,
        [FromQuery] int? maxHeight = null,
        [FromQuery] int? quality = null,
        [FromQuery] string? outputFormat = null,
        [FromQuery] string? customFilename = null,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        _logger.LogInformation(
            "Image upload request received. CorrelationId: {CorrelationId}, Filename: {Filename}, Size: {Size} bytes",
            correlationId,
            file.FileName,
            file.Length
        );

        var response = await _imageUploadService.UploadImageAsync(
            file,
            autoResize,
            maxWidth,
            maxHeight,
            quality,
            outputFormat,
            customFilename,
            cancellationToken
        );

        if (!response.Success)
        {
            _logger.LogWarning(
                "Image upload failed. CorrelationId: {CorrelationId}, Error: {Error}",
                correlationId,
                response.ErrorMessage
            );

            return BadRequest(
                new ProblemDetails
                {
                    Title = "Image upload failed",
                    Detail = response.ErrorMessage,
                    Status = StatusCodes.Status400BadRequest,
                }
            );
        }

        _logger.LogInformation(
            "Image uploaded successfully. CorrelationId: {CorrelationId}, ImageId: {ImageId}",
            correlationId,
            response.ImageId
        );

        return Ok(response);
    }

    /// <summary>
    /// Uploads multiple image files.
    /// </summary>
    /// <param name="files">The image files to upload.</param>
    /// <param name="autoResize">Whether to auto-resize large images.</param>
    /// <param name="quality">Compression quality (1-100).</param>
    /// <param name="operationId">Optional operation ID for progress tracking via SignalR.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The batch upload result.</returns>
    [HttpPost("upload/batch")]
    [SwaggerOperation(
        Summary = "Upload multiple images",
        Description = "Uploads multiple image files in a single request. Use the operationId with SignalR to track progress."
    )]
    [SwaggerResponse(200, "Batch upload completed", typeof(BatchImageUploadResponse))]
    [SwaggerResponse(400, "Invalid request")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(104_857_600)] // 100MB for batch uploads
    public async Task<ActionResult<BatchImageUploadResponse>> UploadImages(
        IFormFileCollection files,
        [FromQuery] bool autoResize = true,
        [FromQuery] int? quality = null,
        [FromQuery] string? operationId = null,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        _logger.LogInformation(
            "Batch image upload request received. CorrelationId: {CorrelationId}, FileCount: {Count}",
            correlationId,
            files.Count
        );

        if (files.Count == 0)
        {
            return BadRequest(
                new ProblemDetails
                {
                    Title = "No files provided",
                    Detail = "At least one file must be provided for batch upload",
                    Status = StatusCodes.Status400BadRequest,
                }
            );
        }

        var response = await _imageUploadService.UploadImagesAsync(
            files,
            autoResize,
            quality,
            _progressReporter,
            operationId,
            cancellationToken
        );

        _logger.LogInformation(
            "Batch upload completed. CorrelationId: {CorrelationId}, Success: {Success}, Failed: {Failed}",
            correlationId,
            response.SuccessfulUploads,
            response.FailedUploads
        );

        return Ok(response);
    }

    /// <summary>
    /// Retrieves an uploaded image by its ID.
    /// </summary>
    /// <param name="imageId">The image identifier.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The image file.</returns>
    [HttpGet("{imageId}")]
    [SwaggerOperation(
        Summary = "Get an uploaded image",
        Description = "Retrieves a previously uploaded image by its unique identifier."
    )]
    [SwaggerResponse(200, "Returns the image file")]
    [SwaggerResponse(404, "Image not found")]
    [Produces(
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "application/json"
    )]
    public async Task<IActionResult> GetImage(
        string imageId,
        CancellationToken cancellationToken = default
    )
    {
        var result = await _imageUploadService.GetImageAsync(imageId, cancellationToken);

        if (result is null)
        {
            _logger.LogWarning("Image not found: {ImageId}", imageId);
            return NotFound(
                new ProblemDetails
                {
                    Title = "Image not found",
                    Detail = $"No image found with ID '{imageId}'",
                    Status = StatusCodes.Status404NotFound,
                }
            );
        }

        return File(result.Value.Data, result.Value.ContentType, result.Value.Filename);
    }

    /// <summary>
    /// Deletes an uploaded image by its ID.
    /// </summary>
    /// <param name="imageId">The image identifier.</param>
    /// <returns>No content if successful.</returns>
    [HttpDelete("{imageId}")]
    [SwaggerOperation(
        Summary = "Delete an uploaded image",
        Description = "Deletes a previously uploaded image by its unique identifier."
    )]
    [SwaggerResponse(204, "Image deleted successfully")]
    [SwaggerResponse(404, "Image not found")]
    public async Task<IActionResult> DeleteImage(string imageId)
    {
        var deleted = await _imageUploadService.DeleteImageAsync(imageId);

        if (!deleted)
        {
            _logger.LogWarning("Image not found for deletion: {ImageId}", imageId);
            return NotFound(
                new ProblemDetails
                {
                    Title = "Image not found",
                    Detail = $"No image found with ID '{imageId}'",
                    Status = StatusCodes.Status404NotFound,
                }
            );
        }

        _logger.LogInformation("Image deleted: {ImageId}", imageId);
        return NoContent();
    }

    /// <summary>
    /// Generates a new operation ID for progress tracking.
    /// </summary>
    /// <returns>A new unique operation ID.</returns>
    [HttpPost("operation-id")]
    [SwaggerOperation(
        Summary = "Generate operation ID",
        Description = "Generates a new unique operation ID that can be used for progress tracking with SignalR."
    )]
    [SwaggerResponse(200, "Returns the generated operation ID")]
    public ActionResult<object> GenerateOperationId()
    {
        var operationId = _progressReporter.GenerateOperationId();
        return Ok(new { operationId });
    }
}
