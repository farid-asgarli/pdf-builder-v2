using System.Diagnostics;
using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using PDFBuilder.API.Services;
using PDFBuilder.Contracts.DTOs;
using PDFBuilder.Contracts.Requests;
using PDFBuilder.Contracts.Responses;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using Swashbuckle.AspNetCore.Annotations;

namespace PDFBuilder.API.Controllers;

/// <summary>
/// Controller for PDF generation operations.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="PdfController"/> class.
/// </remarks>
/// <param name="pdfGenerator">The PDF generation service.</param>
/// <param name="mapper">The AutoMapper instance.</param>
/// <param name="progressReporter">The progress reporter for long operations.</param>
/// <param name="logger">The logger instance.</param>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class PdfController(
    IPdfGenerator pdfGenerator,
    IMapper mapper,
    IProgressReporter progressReporter,
    ILogger<PdfController> logger
) : ControllerBase
{
    private readonly IPdfGenerator _pdfGenerator =
        pdfGenerator ?? throw new ArgumentNullException(nameof(pdfGenerator));
    private readonly IMapper _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
    private readonly IProgressReporter _progressReporter =
        progressReporter ?? throw new ArgumentNullException(nameof(progressReporter));
    private readonly ILogger<PdfController> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Generates a PDF document from a JSON layout definition and data.
    /// </summary>
    /// <param name="request">The PDF generation request containing layout and data.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The generated PDF file.</returns>
    /// <response code="200">Returns the generated PDF file.</response>
    /// <response code="400">If the request is invalid or validation fails.</response>
    /// <response code="500">If an error occurs during PDF generation.</response>
    [HttpPost("generate")]
    [SwaggerOperation(
        Summary = "Generate PDF from JSON layout",
        Description = "Generates a PDF document from a JSON layout definition and optional data context. "
            + "Supports full template layout with header, content, footer, background, and foreground slots. "
            + "The layout defines the structure and styling of the PDF, while the data context "
            + "provides values for dynamic expressions (e.g., {{ data.customer.name }})."
    )]
    [SwaggerResponse(200, "PDF generated successfully", typeof(FileContentResult))]
    [SwaggerResponse(400, "Invalid request or validation failure", typeof(ProblemDetails))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    [Consumes("application/json")]
    [Produces("application/pdf", "application/json")]
    public async Task<IActionResult> GeneratePdf(
        [FromBody] GeneratePdfRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        _logger.LogInformation(
            "PDF generation request received. CorrelationId: {CorrelationId}, HasData: {HasData}, HasTemplateLayout: {HasTemplateLayout}",
            correlationId,
            request.Data.HasValue,
            request.TemplateLayout is not null
        );

        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Convert JsonElement to object for expression evaluation
            object? data = request.Data.HasValue
                ? System.Text.Json.JsonSerializer.Deserialize<object>(request.Data.Value)
                : null;

            // Build PDF generation options
            var options = BuildGenerationOptions(request);

            // Map DTO to domain model using template layout
            var templateLayout = _mapper.Map<TemplateLayout>(request.TemplateLayout);

            _logger.LogDebug(
                "Using TemplateLayout with HasHeader: {HasHeader}, HasFooter: {HasFooter}, HasBackground: {HasBackground}, HasForeground: {HasForeground}",
                templateLayout.HasHeader,
                templateLayout.HasFooter,
                templateLayout.HasBackground,
                templateLayout.HasForeground
            );

            // Generate PDF using TemplateLayout
            var pdfBytes = await _pdfGenerator.GeneratePdfFromTemplateLayoutAsync(
                templateLayout,
                data,
                options,
                cancellationToken
            );

            stopwatch.Stop();

            // Determine filename
            var filename = string.IsNullOrWhiteSpace(request.Filename)
                ? $"document-{DateTime.UtcNow:yyyyMMdd-HHmmss}.pdf"
                : $"{request.Filename}.pdf";

            _logger.LogInformation(
                "PDF generated successfully. CorrelationId: {CorrelationId}, "
                    + "Size: {SizeKB:F2} KB, Duration: {DurationMs}ms, Filename: {Filename}",
                correlationId,
                pdfBytes.Length / 1024.0,
                stopwatch.ElapsedMilliseconds,
                filename
            );

            // Return PDF file with proper headers
            return File(pdfBytes, "application/pdf", filename);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                ex,
                "PDF generation failed. CorrelationId: {CorrelationId}, Duration: {DurationMs}ms",
                correlationId,
                stopwatch.ElapsedMilliseconds
            );

            // The ExceptionHandlingMiddleware will handle the exception
            // and return a consistent error response
            throw;
        }
    }

    /// <summary>
    /// Generates a PDF document and returns metadata instead of the file.
    /// Useful for testing or when only metadata is needed.
    /// </summary>
    /// <param name="request">The PDF generation request containing layout and data.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>PDF generation response with metadata.</returns>
    /// <response code="200">Returns the PDF generation metadata.</response>
    /// <response code="400">If the request is invalid or validation fails.</response>
    /// <response code="500">If an error occurs during PDF generation.</response>
    [HttpPost("generate/metadata")]
    [SwaggerOperation(
        Summary = "Generate PDF and return metadata",
        Description = "Generates a PDF document but returns only metadata (file size, page count, generation time) "
            + "without the actual PDF bytes. Supports full template layout with header/footer/content. "
            + "Useful for validation, testing, or preview purposes."
    )]
    [SwaggerResponse(200, "PDF metadata generated successfully", typeof(PdfGenerationResponse))]
    [SwaggerResponse(400, "Invalid request or validation failure", typeof(ProblemDetails))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    [Consumes("application/json")]
    [Produces("application/json")]
    public async Task<ActionResult<PdfGenerationResponse>> GeneratePdfMetadata(
        [FromBody] GeneratePdfRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;

        _logger.LogInformation(
            "PDF metadata generation request received. CorrelationId: {CorrelationId}",
            correlationId
        );

        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Convert JsonElement to object for expression evaluation
            object? data = request.Data.HasValue
                ? System.Text.Json.JsonSerializer.Deserialize<object>(request.Data.Value)
                : null;

            // Build PDF generation options
            var options = BuildGenerationOptions(request);

            // Map DTO to domain model using template layout
            var templateLayout = _mapper.Map<TemplateLayout>(request.TemplateLayout);

            // Generate PDF using TemplateLayout
            var pdfBytes = await _pdfGenerator.GeneratePdfFromTemplateLayoutAsync(
                templateLayout,
                data,
                options,
                cancellationToken
            );

            stopwatch.Stop();

            // Determine filename
            var filename = string.IsNullOrWhiteSpace(request.Filename)
                ? $"document-{DateTime.UtcNow:yyyyMMdd-HHmmss}.pdf"
                : $"{request.Filename}.pdf";

            // Get page count from the generated PDF
            var pageCount = GetPageCount(pdfBytes);

            var response = new PdfGenerationResponse
            {
                Success = true,
                Filename = filename,
                ContentType = "application/pdf",
                FileSizeBytes = pdfBytes.Length,
                PageCount = pageCount,
                GenerationTimeMs = stopwatch.ElapsedMilliseconds,
            };

            _logger.LogInformation(
                "PDF metadata generated successfully. CorrelationId: {CorrelationId}, "
                    + "Size: {SizeKB:F2} KB, Pages: {PageCount}, Duration: {DurationMs}ms",
                correlationId,
                pdfBytes.Length / 1024.0,
                pageCount,
                stopwatch.ElapsedMilliseconds
            );

            return Ok(response);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            _logger.LogError(
                ex,
                "PDF metadata generation failed. CorrelationId: {CorrelationId}, Duration: {DurationMs}ms",
                correlationId,
                stopwatch.ElapsedMilliseconds
            );

            throw;
        }
    }

    /// <summary>
    /// Generates a PDF document with real-time progress reporting via SignalR.
    /// Subscribe to the progress hub with the returned operationId to receive updates.
    /// </summary>
    /// <param name="request">The PDF generation request containing layout and data.</param>
    /// <param name="operationId">Optional operation ID for progress tracking. If not provided, one will be generated.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The PDF generation response with operation ID.</returns>
    [HttpPost("generate/async")]
    [SwaggerOperation(
        Summary = "Generate PDF with progress reporting",
        Description = "Generates a PDF document and reports progress via SignalR. "
            + "Supports full template layout with header/footer/content. "
            + "Connect to /hubs/progress and subscribe to the operationId to receive real-time updates."
    )]
    [SwaggerResponse(200, "PDF generation started", typeof(PdfGenerationResponse))]
    [SwaggerResponse(400, "Invalid request or validation failure", typeof(ProblemDetails))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    [Consumes("application/json")]
    [Produces("application/json")]
    public async Task<ActionResult<PdfGenerationResponse>> GeneratePdfWithProgress(
        [FromBody] GeneratePdfRequest request,
        [FromQuery] string? operationId = null,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var effectiveOperationId = operationId ?? _progressReporter.GenerateOperationId();

        _logger.LogInformation(
            "PDF generation with progress started. CorrelationId: {CorrelationId}, OperationId: {OperationId}, HasTemplateLayout: {HasTemplateLayout}",
            correlationId,
            effectiveOperationId,
            request.TemplateLayout is not null
        );

        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Report start
            await _progressReporter.ReportStartedAsync(
                effectiveOperationId,
                OperationType.PdfGeneration,
                "Starting PDF generation",
                cancellationToken
            );

            // Map DTO to domain model
            await _progressReporter.ReportProgressAsync(
                effectiveOperationId,
                10,
                "Parsing layout definition",
                stopwatch.ElapsedMilliseconds,
                cancellationToken
            );

            // Convert JsonElement to object for expression evaluation
            await _progressReporter.ReportProgressAsync(
                effectiveOperationId,
                20,
                "Processing data context",
                stopwatch.ElapsedMilliseconds,
                cancellationToken
            );

            object? data = request.Data.HasValue
                ? System.Text.Json.JsonSerializer.Deserialize<object>(request.Data.Value)
                : null;

            // Build PDF generation options
            await _progressReporter.ReportProgressAsync(
                effectiveOperationId,
                30,
                "Configuring generation options",
                stopwatch.ElapsedMilliseconds,
                cancellationToken
            );

            var options = BuildGenerationOptions(request);

            // Generate PDF
            await _progressReporter.ReportProgressAsync(
                effectiveOperationId,
                50,
                "Rendering PDF document",
                stopwatch.ElapsedMilliseconds,
                cancellationToken
            );

            // Map DTO to domain model using template layout
            var templateLayout = _mapper.Map<TemplateLayout>(request.TemplateLayout);

            // Generate PDF using TemplateLayout
            var pdfBytes = await _pdfGenerator.GeneratePdfFromTemplateLayoutAsync(
                templateLayout,
                data,
                options,
                cancellationToken
            );

            stopwatch.Stop();

            // Determine filename
            var filename = string.IsNullOrWhiteSpace(request.Filename)
                ? $"document-{DateTime.UtcNow:yyyyMMdd-HHmmss}.pdf"
                : $"{request.Filename}.pdf";

            // Get page count from the generated PDF
            var pageCount = GetPageCount(pdfBytes);

            var response = new PdfGenerationResponse
            {
                Success = true,
                Filename = filename,
                ContentType = "application/pdf",
                FileSizeBytes = pdfBytes.Length,
                PageCount = pageCount,
                GenerationTimeMs = stopwatch.ElapsedMilliseconds,
                OperationId = effectiveOperationId,
            };

            // Report completion
            await _progressReporter.ReportCompletedAsync(
                effectiveOperationId,
                $"PDF generated successfully: {pdfBytes.Length / 1024.0:F2} KB, {pageCount} pages",
                stopwatch.ElapsedMilliseconds,
                new Dictionary<string, object>
                {
                    ["filename"] = filename,
                    ["fileSizeBytes"] = pdfBytes.Length,
                    ["pageCount"] = pageCount ?? 0,
                    ["pdfBase64"] = Convert.ToBase64String(pdfBytes),
                },
                cancellationToken
            );

            _logger.LogInformation(
                "PDF generated with progress. CorrelationId: {CorrelationId}, OperationId: {OperationId}, "
                    + "Size: {SizeKB:F2} KB, Pages: {PageCount}, Duration: {DurationMs}ms",
                correlationId,
                effectiveOperationId,
                pdfBytes.Length / 1024.0,
                pageCount,
                stopwatch.ElapsedMilliseconds
            );

            return Ok(response);
        }
        catch (OperationCanceledException)
        {
            stopwatch.Stop();
            await _progressReporter.ReportCancelledAsync(
                effectiveOperationId,
                stopwatch.ElapsedMilliseconds,
                cancellationToken
            );
            throw;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            await _progressReporter.ReportFailedAsync(
                effectiveOperationId,
                ex.Message,
                stopwatch.ElapsedMilliseconds,
                cancellationToken
            );

            _logger.LogError(
                ex,
                "PDF generation with progress failed. CorrelationId: {CorrelationId}, OperationId: {OperationId}, Duration: {DurationMs}ms",
                correlationId,
                effectiveOperationId,
                stopwatch.ElapsedMilliseconds
            );

            throw;
        }
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

    /// <summary>
    /// Builds PDF generation options from the request.
    /// </summary>
    private static PdfGenerationOptions BuildGenerationOptions(GeneratePdfRequest request)
    {
        var options = new PdfGenerationOptions();

        // Apply page settings from template layout if provided
        if (request.TemplateLayout.PageSettings != null)
        {
            // Map page size
            options.DefaultPageSize = MapPageSize(request.TemplateLayout.PageSettings);

            // Map margins
            options.DefaultMargins = MapMargins(request.TemplateLayout.PageSettings);
        }

        // Apply metadata if provided
        if (request.Metadata != null)
        {
            options.Title = request.Metadata.Title;
            options.Author = request.Metadata.Author;
            options.Subject = request.Metadata.Subject;
            options.Keywords = request.Metadata.Keywords;
            options.Creator = request.Metadata.Creator;
            options.Producer = request.Metadata.Producer;
        }

        // Apply generation options if provided
        if (request.Options != null)
        {
            options.EmbedFonts = request.Options.EmbedFonts ?? options.EmbedFonts;
            options.DebugMode = request.Options.IncludeDebugInfo ?? options.DebugMode;

            if (request.Options.TimeoutSeconds.HasValue)
            {
                options.Timeout = TimeSpan.FromSeconds(request.Options.TimeoutSeconds.Value);
            }
        }

        return options;
    }

    /// <summary>
    /// Maps page size and orientation from DTO to domain model.
    /// </summary>
    private static PageSize MapPageSize(PageSettingsDto settings)
    {
        // Determine page size
        PageSize pageSize;

        if (
            !string.IsNullOrWhiteSpace(settings.PageSize)
            && settings.PageSize.ToUpperInvariant() != "CUSTOM"
        )
        {
            // Use preset page size
            pageSize = settings.PageSize.ToUpperInvariant() switch
            {
                "A0" => new PageSize { Width = 2384f, Height = 3370f },
                "A1" => new PageSize { Width = 1684f, Height = 2384f },
                "A2" => new PageSize { Width = 1191f, Height = 1684f },
                "A3" => new PageSize { Width = 842f, Height = 1191f },
                "A4" => PageSize.A4,
                "A5" => new PageSize { Width = 420f, Height = 595f },
                "A6" => new PageSize { Width = 298f, Height = 420f },
                "LETTER" => PageSize.Letter,
                "LEGAL" => PageSize.Legal,
                "TABLOID" => new PageSize { Width = 792f, Height = 1224f },
                _ => PageSize.A4,
            };
        }
        else if (settings.Width.HasValue && settings.Height.HasValue)
        {
            // Use custom dimensions
            pageSize = new PageSize
            {
                Width = settings.Width.Value,
                Height = settings.Height.Value,
            };
        }
        else
        {
            // Default to A4
            pageSize = PageSize.A4;
        }

        // Set orientation
        pageSize.Orientation = MapPageOrientation(settings.Orientation);

        return pageSize;
    }

    /// <summary>
    /// Maps margins from DTO to domain model.
    /// </summary>
    private static PageMargins MapMargins(PageSettingsDto settings)
    {
        // If uniform margin is specified, use it
        if (settings.Margin.HasValue)
        {
            return PageMargins.Uniform(settings.Margin.Value);
        }

        // Otherwise, use individual margins or defaults
        return new PageMargins
        {
            Top = settings.MarginTop ?? 72f,
            Right = settings.MarginRight ?? 72f,
            Bottom = settings.MarginBottom ?? 72f,
            Left = settings.MarginLeft ?? 72f,
        };
    }

    /// <summary>
    /// Maps page orientation from string to domain enum.
    /// </summary>
    private static Core.Interfaces.PageOrientation MapPageOrientation(string? orientation)
    {
        if (string.IsNullOrWhiteSpace(orientation))
        {
            return Core.Interfaces.PageOrientation.Portrait;
        }

        return orientation.ToUpperInvariant() switch
        {
            "PORTRAIT" => Core.Interfaces.PageOrientation.Portrait,
            "LANDSCAPE" => Core.Interfaces.PageOrientation.Landscape,
            _ => Core.Interfaces.PageOrientation.Portrait,
        };
    }

    /// <summary>
    /// Extracts the page count from a PDF byte array.
    /// This is a simple implementation that counts "/Type /Page" occurrences.
    /// For production, consider using a PDF library like PdfSharp or iTextSharp.
    /// </summary>
    private static int? GetPageCount(byte[] pdfBytes)
    {
        try
        {
            // Simple page count detection by searching for PDF page markers
            // This is a basic implementation - QuestPDF should provide page count in metadata
            var pdfText = System.Text.Encoding.ASCII.GetString(pdfBytes);
            var pageMatches = System.Text.RegularExpressions.Regex.Matches(
                pdfText,
                @"/Type\s*/Page[^s]"
            );
            return pageMatches.Count;
        }
        catch
        {
            // If page count extraction fails, return null
            return null;
        }
    }
}
