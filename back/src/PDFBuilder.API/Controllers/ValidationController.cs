using System.Diagnostics;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using PDFBuilder.Contracts.Requests;
using PDFBuilder.Contracts.Responses;
using PDFBuilder.Validation.Interfaces;
using Swashbuckle.AspNetCore.Annotations;

namespace PDFBuilder.API.Controllers;

/// <summary>
/// Controller for layout validation operations.
/// Provides pre-validation of layouts before PDF generation.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="ValidationController"/> class.
/// </remarks>
/// <param name="layoutValidator">The layout validation service.</param>
/// <param name="logger">The logger instance.</param>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ValidationController(
    ILayoutValidationService layoutValidator,
    ILogger<ValidationController> logger
) : ControllerBase
{
    private readonly ILayoutValidationService _layoutValidator =
        layoutValidator ?? throw new ArgumentNullException(nameof(layoutValidator));
    private readonly ILogger<ValidationController> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Validates a layout definition before PDF generation.
    /// </summary>
    /// <param name="request">The validation request containing the layout to validate.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>Validation results with errors and warnings.</returns>
    /// <response code="200">Returns validation results (may include errors).</response>
    /// <response code="400">If the request structure is invalid.</response>
    /// <response code="500">If an error occurs during validation.</response>
    [HttpPost("validate")]
    [SwaggerOperation(
        Summary = "Validate layout definition",
        Description = "Pre-validates a layout definition before PDF generation. "
            + "Returns detailed validation errors with JSON paths, warnings for potential issues, "
            + "and statistics about the layout complexity. Use this endpoint to catch errors "
            + "before attempting PDF generation."
    )]
    [SwaggerResponse(200, "Validation completed", typeof(ValidationResponse))]
    [SwaggerResponse(400, "Invalid request structure", typeof(ProblemDetails))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    [Consumes("application/json")]
    public async Task<ActionResult<ValidationResponse>> ValidateLayout(
        [FromBody] ValidateLayoutRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var stopwatch = Stopwatch.StartNew();

        _logger.LogInformation(
            "Layout validation request received. CorrelationId: {CorrelationId}, HasSampleData: {HasSampleData}",
            correlationId,
            request.SampleData.HasValue
        );

        try
        {
            var response = await _layoutValidator.ValidateAsync(request, cancellationToken);

            stopwatch.Stop();
            response.ValidationTimeMs = stopwatch.ElapsedMilliseconds;

            _logger.LogInformation(
                "Layout validation completed. CorrelationId: {CorrelationId}, IsValid: {IsValid}, "
                    + "ErrorCount: {ErrorCount}, WarningCount: {WarningCount}, TimeMs: {TimeMs}",
                correlationId,
                response.IsValid,
                response.Errors.Count,
                response.Warnings.Count,
                response.ValidationTimeMs
            );

            return Ok(response);
        }
        catch (ValidationException ex)
        {
            stopwatch.Stop();

            _logger.LogWarning(
                ex,
                "Layout validation failed with validation exception. CorrelationId: {CorrelationId}",
                correlationId
            );

            var response = new ValidationResponse
            {
                IsValid = false,
                ValidationTimeMs = stopwatch.ElapsedMilliseconds,
                Errors = ex
                    .Errors.Select(e => new ValidationErrorDto
                    {
                        Code = "VALIDATION_ERROR",
                        Message = e.ErrorMessage,
                        Path = e.PropertyName,
                        Severity = Contracts.Responses.ValidationSeverity.Error,
                        ActualValue = e.AttemptedValue,
                    })
                    .ToList(),
            };

            return Ok(response);
        }
    }

    /// <summary>
    /// Validates multiple layouts in batch.
    /// </summary>
    /// <param name="requests">The batch of validation requests.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>Validation results for each layout.</returns>
    [HttpPost("validate/batch")]
    [SwaggerOperation(
        Summary = "Validate multiple layouts",
        Description = "Validates multiple layout definitions in a single request. "
            + "Useful for validating related templates or variations."
    )]
    [SwaggerResponse(200, "Batch validation completed", typeof(BatchValidationResponse))]
    [SwaggerResponse(400, "Invalid request structure", typeof(ProblemDetails))]
    [Consumes("application/json")]
    public async Task<ActionResult<BatchValidationResponse>> ValidateLayoutBatch(
        [FromBody] List<ValidateLayoutRequest> requests,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var stopwatch = Stopwatch.StartNew();

        _logger.LogInformation(
            "Batch layout validation request received. CorrelationId: {CorrelationId}, Count: {Count}",
            correlationId,
            requests.Count
        );

        if (requests.Count > 100)
        {
            return BadRequest(
                new ProblemDetails
                {
                    Title = "Too many requests",
                    Detail = "Batch validation is limited to 100 layouts per request.",
                    Status = 400,
                }
            );
        }

        var results = new List<ValidationResponse>();

        foreach (var request in requests)
        {
            try
            {
                var result = await _layoutValidator.ValidateAsync(request, cancellationToken);
                results.Add(result);
            }
            catch (ValidationException ex)
            {
                results.Add(
                    new ValidationResponse
                    {
                        IsValid = false,
                        Errors = ex
                            .Errors.Select(e => new ValidationErrorDto
                            {
                                Code = "VALIDATION_ERROR",
                                Message = e.ErrorMessage,
                                Path = e.PropertyName,
                                Severity = Contracts.Responses.ValidationSeverity.Error,
                            })
                            .ToList(),
                    }
                );
            }
        }

        stopwatch.Stop();

        var response = new BatchValidationResponse
        {
            Results = results,
            TotalCount = results.Count,
            ValidCount = results.Count(r => r.IsValid),
            InvalidCount = results.Count(r => !r.IsValid),
            TotalValidationTimeMs = stopwatch.ElapsedMilliseconds,
        };

        _logger.LogInformation(
            "Batch layout validation completed. CorrelationId: {CorrelationId}, "
                + "Total: {Total}, Valid: {Valid}, Invalid: {Invalid}, TimeMs: {TimeMs}",
            correlationId,
            response.TotalCount,
            response.ValidCount,
            response.InvalidCount,
            response.TotalValidationTimeMs
        );

        return Ok(response);
    }

    /// <summary>
    /// Gets the list of supported component types and their properties.
    /// </summary>
    /// <returns>Component type documentation.</returns>
    [HttpGet("components")]
    [SwaggerOperation(
        Summary = "Get supported components",
        Description = "Returns a list of all supported component types with their "
            + "required and optional properties for documentation purposes."
    )]
    [SwaggerResponse(
        200,
        "Component list retrieved",
        typeof(Core.Interfaces.ComponentDocumentation)
    )]
    public ActionResult<Core.Interfaces.ComponentDocumentation> GetSupportedComponents()
    {
        var documentation = _layoutValidator.GetComponentDocumentation();
        return Ok(documentation);
    }
}

/// <summary>
/// Response for batch validation operations.
/// </summary>
public class BatchValidationResponse
{
    /// <summary>
    /// Gets or sets the validation results for each layout.
    /// </summary>
    public List<ValidationResponse> Results { get; set; } = [];

    /// <summary>
    /// Gets or sets the total number of layouts validated.
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Gets or sets the number of valid layouts.
    /// </summary>
    public int ValidCount { get; set; }

    /// <summary>
    /// Gets or sets the number of invalid layouts.
    /// </summary>
    public int InvalidCount { get; set; }

    /// <summary>
    /// Gets or sets the total validation time in milliseconds.
    /// </summary>
    public long TotalValidationTimeMs { get; set; }
}
