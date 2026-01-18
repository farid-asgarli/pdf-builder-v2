using System.Diagnostics;
using System.Text.Json;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Exceptions;
using PDFBuilder.Core.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
// Alias to avoid conflicts with QuestPDF types
using QuestPageSize = QuestPDF.Helpers.PageSize;
using QuestPageSizes = QuestPDF.Helpers.PageSizes;

namespace PDFBuilder.Core.Services;

/// <summary>
/// PDF generation service that orchestrates layout rendering to produce PDF documents.
/// Implements the complete pipeline: Layout → RenderContext → LayoutEngine → QuestPDF → PDF bytes.
/// </summary>
/// <remarks>
/// Initializes a new instance of the PdfGenerationService class.
/// </remarks>
/// <param name="layoutEngine">The layout engine for rendering components.</param>
/// <param name="logger">The logger instance.</param>
public sealed class PdfGenerationService(
    ILayoutEngine layoutEngine,
    ILogger<PdfGenerationService> logger
) : IPdfGenerator
{
    private readonly ILayoutEngine _layoutEngine =
        layoutEngine ?? throw new ArgumentNullException(nameof(layoutEngine));
    private readonly ILogger<PdfGenerationService> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <inheritdoc />
    public async Task<byte[]> GeneratePdfAsync(
        LayoutNode layout,
        object? data = null,
        PdfGenerationOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(layout);

        options ??= PdfGenerationOptions.Default;
        var stopwatch = Stopwatch.StartNew();

        _logger.LogInformation(
            "Starting PDF generation for layout with root type {RootType}",
            layout.Type
        );

        try
        {
            // Validate layout before generation
            var validationResult = await ValidateLayoutAsync(layout, data);
            if (!validationResult.IsValid)
            {
                var errors = string.Join("; ", validationResult.Errors.Select(e => e.Message));
                throw new LayoutRenderException(
                    $"Layout validation failed: {errors}",
                    layout.Id,
                    "root",
                    layout.Type.ToString()
                );
            }

            // Create render context with data
            var context = CreateRenderContext(data, options);

            // Create and configure QuestPDF document
            var document = CreateDocument(layout, context, options);

            // Generate PDF bytes with cancellation support
            byte[] pdfBytes;
            using (var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
            {
                cts.CancelAfter(options.Timeout);

                try
                {
                    pdfBytes = await Task.Run(() => GeneratePdfBytes(document), cts.Token);
                }
                catch (OperationCanceledException)
                    when (cts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
                {
                    throw new TimeoutException(
                        $"PDF generation exceeded timeout of {options.Timeout.TotalSeconds} seconds"
                    );
                }
            }

            stopwatch.Stop();
            _logger.LogInformation(
                "PDF generation completed successfully in {ElapsedMs}ms. Size: {SizeKB:F2} KB",
                stopwatch.ElapsedMilliseconds,
                pdfBytes.Length / 1024.0
            );

            return pdfBytes;
        }
        catch (LayoutRenderException)
        {
            throw;
        }
        catch (TimeoutException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "PDF generation failed for layout with root type {RootType}",
                layout.Type
            );
            throw new LayoutRenderException(
                $"PDF generation failed: {ex.Message}",
                layout.Id,
                "root",
                layout.Type.ToString(),
                ex
            );
        }
    }

    /// <inheritdoc />
    public async Task GeneratePdfAsync(
        LayoutNode layout,
        Stream outputStream,
        object? data = null,
        PdfGenerationOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(layout);
        ArgumentNullException.ThrowIfNull(outputStream);

        if (!outputStream.CanWrite)
        {
            throw new ArgumentException("Output stream must be writable", nameof(outputStream));
        }

        options ??= PdfGenerationOptions.Default;
        var stopwatch = Stopwatch.StartNew();

        _logger.LogInformation(
            "Starting PDF generation to stream for layout with root type {RootType}",
            layout.Type
        );

        try
        {
            // Validate layout before generation
            var validationResult = await ValidateLayoutAsync(layout, data);
            if (!validationResult.IsValid)
            {
                var errors = string.Join("; ", validationResult.Errors.Select(e => e.Message));
                throw new LayoutRenderException(
                    $"Layout validation failed: {errors}",
                    layout.Id,
                    "root",
                    layout.Type.ToString()
                );
            }

            // Create render context with data
            var context = CreateRenderContext(data, options);

            // Create and configure QuestPDF document
            var document = CreateDocument(layout, context, options);

            // Generate PDF to stream with cancellation support
            using (var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
            {
                cts.CancelAfter(options.Timeout);

                try
                {
                    await Task.Run(() => document.GeneratePdf(outputStream), cts.Token);
                }
                catch (OperationCanceledException)
                    when (cts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
                {
                    throw new TimeoutException(
                        $"PDF generation exceeded timeout of {options.Timeout.TotalSeconds} seconds"
                    );
                }
            }

            stopwatch.Stop();
            _logger.LogInformation(
                "PDF generation to stream completed successfully in {ElapsedMs}ms",
                stopwatch.ElapsedMilliseconds
            );
        }
        catch (LayoutRenderException)
        {
            throw;
        }
        catch (TimeoutException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "PDF generation to stream failed for layout with root type {RootType}",
                layout.Type
            );
            throw new LayoutRenderException(
                $"PDF generation failed: {ex.Message}",
                layout.Id,
                "root",
                layout.Type.ToString(),
                ex
            );
        }
    }

    /// <inheritdoc />
    public async Task<byte[]> GeneratePdfFromTemplateAsync(
        Template template,
        object? data = null,
        PdfGenerationOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(template);

        _logger.LogInformation(
            "Starting PDF generation from template {TemplateName} (ID: {TemplateId})",
            template.Name,
            template.Id
        );

        try
        {
            // Parse layout from template JSON
            var layout = DeserializeLayout(template.LayoutJson, template.Name);

            // Merge template metadata with options
            var mergedOptions = MergeTemplateOptions(template, options);

            return await GeneratePdfAsync(layout, data, mergedOptions, cancellationToken);
        }
        catch (LayoutRenderException)
        {
            throw;
        }
        catch (JsonException ex)
        {
            _logger.LogError(
                ex,
                "Failed to parse layout JSON for template {TemplateName}",
                template.Name
            );
            throw new LayoutRenderException(
                $"Invalid layout JSON in template '{template.Name}': {ex.Message}",
                null,
                "template",
                null,
                ex
            );
        }
    }

    /// <inheritdoc />
    public Task<PdfValidationResult> ValidateLayoutAsync(LayoutNode layout, object? data = null)
    {
        ArgumentNullException.ThrowIfNull(layout);

        _logger.LogDebug("Validating layout with root type {RootType}", layout.Type);

        var result = new PdfValidationResult { IsValid = true };

        try
        {
            // Use layout engine's validation
            var engineValidation = _layoutEngine.ValidateLayout(layout);

            if (!engineValidation.IsValid)
            {
                result.IsValid = false;
                result.Errors.AddRange(
                    engineValidation.Errors.Select(e => new PdfValidationError
                    {
                        Code = e.ErrorCode,
                        Message = e.Message,
                        Path = e.Path,
                        NodeId = e.NodeId,
                    })
                );
            }

            result.Warnings.AddRange(
                engineValidation.Warnings.Select(w => new PdfValidationWarning
                {
                    Code = w.WarningCode,
                    Message = w.Message,
                    Path = w.Path,
                })
            );

            // Additional validation: Check if root component is appropriate
            if (!IsValidRootComponent(layout.Type))
            {
                result.Errors.Add(
                    new PdfValidationError
                    {
                        Code = "INVALID_ROOT_COMPONENT",
                        Message =
                            $"Component type '{layout.Type}' is not valid as a root component. "
                            + "Use a container component like Column, Row, or Table as the root.",
                        Path = "root",
                        NodeId = layout.Id,
                    }
                );
                result.IsValid = false;
            }

            _logger.LogDebug(
                "Layout validation completed. IsValid: {IsValid}, Errors: {ErrorCount}, Warnings: {WarningCount}",
                result.IsValid,
                result.Errors.Count,
                result.Warnings.Count
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Layout validation encountered an unexpected error");
            result.IsValid = false;
            result.Errors.Add(
                new PdfValidationError
                {
                    Code = "VALIDATION_ERROR",
                    Message = $"Validation failed: {ex.Message}",
                    Path = "root",
                }
            );
        }

        return Task.FromResult(result);
    }

    /// <inheritdoc />
    public async Task<PdfMetadata> GetMetadataAsync(
        LayoutNode layout,
        object? data = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(layout);

        _logger.LogDebug("Extracting metadata for layout with root type {RootType}", layout.Type);

        var metadata = new PdfMetadata();

        try
        {
            // Count components and extract information by traversing the layout tree
            var (componentCount, imageCount, fontsUsed) = AnalyzeLayout(layout);

            // Estimate page count (rough estimate based on component count)
            metadata.EstimatedPageCount = Math.Max(1, componentCount / 50);

            // Estimate size (very rough: ~1KB base + ~500 bytes per component + ~50KB per image)
            metadata.EstimatedSizeBytes = 1024 + (componentCount * 500) + (imageCount * 51200);

            metadata.ImageCount = imageCount;
            metadata.FontsUsed.AddRange(fontsUsed);

            // Extract page size from layout properties if available
            metadata.PageSize = ExtractPageSize(layout);

            _logger.LogDebug(
                "Metadata extracted. EstimatedPages: {Pages}, EstimatedSize: {SizeKB:F2} KB, Images: {Images}",
                metadata.EstimatedPageCount,
                metadata.EstimatedSizeBytes / 1024.0,
                metadata.ImageCount
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract some metadata");
            metadata.Warnings.Add($"Metadata extraction incomplete: {ex.Message}");
        }

        return await Task.FromResult(metadata);
    }

    /// <summary>
    /// Creates a render context with the provided data and options.
    /// </summary>
    private static RenderContext CreateRenderContext(object? data, PdfGenerationOptions options)
    {
        var context = new RenderContext(data);

        // Set debug mode in context if enabled
        if (options.DebugMode)
        {
            context.SetVariable("_debugMode", true);
        }

        // Set default page size info
        if (options.DefaultPageSize is not null)
        {
            context.PageInfo.PageWidth = options.DefaultPageSize.Width;
            context.PageInfo.PageHeight = options.DefaultPageSize.Height;
        }

        // Set document metadata
        if (!string.IsNullOrEmpty(options.Title))
        {
            context.DocumentInfo.Title = options.Title;
        }
        if (!string.IsNullOrEmpty(options.Author))
        {
            context.DocumentInfo.Author = options.Author;
        }

        return context;
    }

    /// <summary>
    /// Creates and configures a QuestPDF document from the layout.
    /// </summary>
    private IDocument CreateDocument(
        LayoutNode layout,
        RenderContext context,
        PdfGenerationOptions options
    )
    {
        return Document
            .Create(container =>
            {
                container.Page(page =>
                {
                    // Configure page size
                    ConfigurePageSize(page, options);

                    // Configure margins
                    ConfigureMargins(page, options);

                    // Configure default text style if needed
                    if (options.DebugMode)
                    {
                        // In debug mode, use a visible debug background
                        page.PageColor(Colors.Grey.Lighten4);
                    }
                    else
                    {
                        page.PageColor(Colors.White);
                    }

                    // Render the layout into the content area
                    page.Content()
                        .Element(contentContainer =>
                        {
                            _layoutEngine.Render(contentContainer, layout, context);
                        });
                });
            })
            .WithMetadata(CreateDocumentMetadata(options))
            .WithSettings(CreateDocumentSettings(options));
    }

    /// <summary>
    /// Configures page size based on options.
    /// </summary>
    private static void ConfigurePageSize(PageDescriptor page, PdfGenerationOptions options)
    {
        if (options.DefaultPageSize is not null)
        {
            float width = options.DefaultPageSize.Width;
            float height = options.DefaultPageSize.Height;

            // For landscape orientation, swap width and height if height > width
            if (
                options.DefaultPageSize.Orientation == Interfaces.PageOrientation.Landscape
                && height > width
            )
            {
                (width, height) = (height, width);
            }

            page.Size(new QuestPageSize(width, height));
        }
        else
        {
            // Default to A4
            page.Size(QuestPageSizes.A4);
        }
    }

    /// <summary>
    /// Configures page margins based on options.
    /// </summary>
    private static void ConfigureMargins(PageDescriptor page, PdfGenerationOptions options)
    {
        if (options.DefaultMargins is not null)
        {
            var margins = options.DefaultMargins;
            page.MarginTop(margins.Top);
            page.MarginRight(margins.Right);
            page.MarginBottom(margins.Bottom);
            page.MarginLeft(margins.Left);
        }
        else
        {
            // Default margin of 1 inch (72 points)
            page.Margin(72);
        }
    }

    /// <summary>
    /// Creates document metadata from options.
    /// </summary>
    private static DocumentMetadata CreateDocumentMetadata(PdfGenerationOptions options)
    {
        return new DocumentMetadata
        {
            Title = options.Title,
            Author = options.Author,
            Subject = options.Subject,
            Keywords = options.Keywords,
            Creator = options.Creator ?? "PDF Builder",
            Producer = options.Producer ?? "PDF Builder with QuestPDF",
            CreationDate = DateTimeOffset.UtcNow,
            ModifiedDate = DateTimeOffset.UtcNow,
        };
    }

    /// <summary>
    /// Creates document settings from options.
    /// </summary>
    private static DocumentSettings CreateDocumentSettings(PdfGenerationOptions options)
    {
        var settings = new DocumentSettings { CompressDocument = options.CompressionLevel > 0 };

        // Map compression level to image quality
        settings.ImageCompressionQuality = options.CompressionLevel switch
        {
            <= 3 => ImageCompressionQuality.VeryHigh,
            <= 5 => ImageCompressionQuality.High,
            <= 7 => ImageCompressionQuality.Medium,
            _ => ImageCompressionQuality.Low,
        };

        return settings;
    }

    /// <summary>
    /// Generates PDF bytes from a QuestPDF document.
    /// </summary>
    private static byte[] GeneratePdfBytes(IDocument document)
    {
        return document.GeneratePdf();
    }

    /// <summary>
    /// Deserializes a layout from JSON string.
    /// </summary>
    private static LayoutNode DeserializeLayout(string layoutJson, string templateName)
    {
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        var layout = JsonSerializer.Deserialize<LayoutNode>(layoutJson, options);

        if (layout is null)
        {
            throw new LayoutRenderException(
                $"Failed to deserialize layout from template '{templateName}'. The layout JSON is null or empty.",
                null,
                "template",
                null
            );
        }

        return layout;
    }

    /// <summary>
    /// Merges template metadata with provided options.
    /// </summary>
    private static PdfGenerationOptions MergeTemplateOptions(
        Template template,
        PdfGenerationOptions? options
    )
    {
        var merged = options ?? new PdfGenerationOptions();

        // Template name as title if not set
        if (string.IsNullOrEmpty(merged.Title))
        {
            merged.Title = template.Name;
        }

        // Parse template metadata if available
        if (!string.IsNullOrEmpty(template.MetadataJson))
        {
            try
            {
                var templateMetadata = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
                    template.MetadataJson
                );
                if (templateMetadata is not null)
                {
                    // Apply template-specific settings
                    if (templateMetadata.TryGetValue("author", out var author))
                    {
                        merged.Author ??= author.GetString();
                    }
                    if (templateMetadata.TryGetValue("subject", out var subject))
                    {
                        merged.Subject ??= subject.GetString();
                    }
                }
            }
            catch (JsonException)
            {
                // Ignore invalid metadata JSON
            }
        }

        return merged;
    }

    /// <summary>
    /// Checks if a component type is valid as a root component.
    /// </summary>
    private static bool IsValidRootComponent(ComponentType type)
    {
        return type switch
        {
            // Container components that are valid as root
            ComponentType.Column => true,
            ComponentType.Row => true,
            ComponentType.Table => true,
            ComponentType.Layers => true,
            ComponentType.Decoration => true,
            ComponentType.Inlined => true,
            ComponentType.MultiColumn => true,

            // Wrapper components that are valid (they wrap a single child)
            ComponentType.Padding => true,
            ComponentType.Border => true,
            ComponentType.Background => true,
            ComponentType.RoundedCorners => true,
            ComponentType.Shadow => true,
            ComponentType.DefaultTextStyle => true,
            ComponentType.Width => true,
            ComponentType.Height => true,
            ComponentType.MinWidth => true,
            ComponentType.MaxWidth => true,
            ComponentType.MinHeight => true,
            ComponentType.MaxHeight => true,
            ComponentType.Alignment => true,
            ComponentType.AspectRatio => true,
            ComponentType.Extend => true,
            ComponentType.Shrink => true,
            ComponentType.Unconstrained => true,
            ComponentType.Rotate => true,
            ComponentType.Scale => true,
            ComponentType.ScaleToFit => true,
            ComponentType.Translate => true,
            ComponentType.Flip => true,
            ComponentType.ContentDirection => true,

            // Content components - valid as simple single-element documents
            ComponentType.Text => true,
            ComponentType.Image => true,
            ComponentType.Placeholder => true,

            // Flow control - some are valid
            ComponentType.Section => true,
            ComponentType.ShowEntire => true,
            ComponentType.EnsureSpace => true,

            // Not typically used as root
            _ => false,
        };
    }

    /// <summary>
    /// Analyzes the layout tree to extract statistics.
    /// </summary>
    private static (int componentCount, int imageCount, HashSet<string> fontsUsed) AnalyzeLayout(
        LayoutNode node
    )
    {
        var componentCount = 0;
        var imageCount = 0;
        var fontsUsed = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        AnalyzeNodeRecursive(node, ref componentCount, ref imageCount, fontsUsed);

        return (componentCount, imageCount, fontsUsed);
    }

    /// <summary>
    /// Recursively analyzes a layout node.
    /// </summary>
    private static void AnalyzeNodeRecursive(
        LayoutNode node,
        ref int componentCount,
        ref int imageCount,
        HashSet<string> fontsUsed
    )
    {
        componentCount++;

        // Check for images
        if (node.Type == ComponentType.Image)
        {
            imageCount++;
        }

        // Check for fonts in text components
        if (node.Type == ComponentType.Text && node.Properties is not null)
        {
            if (node.Properties.TryGetValue("fontFamily", out var fontElement))
            {
                var fontFamily = fontElement.GetString();
                if (!string.IsNullOrEmpty(fontFamily))
                {
                    fontsUsed.Add(fontFamily);
                }
            }
        }

        // Check style for fonts
        if (node.Style?.FontFamily is not null)
        {
            fontsUsed.Add(node.Style.FontFamily);
        }

        // Recurse into children
        if (node.Children is not null)
        {
            foreach (var child in node.Children)
            {
                AnalyzeNodeRecursive(child, ref componentCount, ref imageCount, fontsUsed);
            }
        }

        // Recurse into child (for wrapper components)
        if (node.Child is not null)
        {
            AnalyzeNodeRecursive(node.Child, ref componentCount, ref imageCount, fontsUsed);
        }
    }

    /// <summary>
    /// Extracts page size from layout properties if specified.
    /// </summary>
    private static Interfaces.PageSize? ExtractPageSize(LayoutNode layout)
    {
        // Look for page configuration in the root node properties
        if (layout.Properties is not null)
        {
            if (layout.Properties.TryGetValue("pageSize", out var pageSizeElement))
            {
                var pageSizeName = pageSizeElement.GetString()?.ToUpperInvariant();
                return pageSizeName switch
                {
                    "A4" => Interfaces.PageSize.A4,
                    "LETTER" => Interfaces.PageSize.Letter,
                    "LEGAL" => Interfaces.PageSize.Legal,
                    _ => null,
                };
            }

            // Check for explicit width/height
            if (
                layout.Properties.TryGetValue("pageWidth", out var widthElement)
                && layout.Properties.TryGetValue("pageHeight", out var heightElement)
            )
            {
                return new Interfaces.PageSize
                {
                    Width = widthElement.GetSingle(),
                    Height = heightElement.GetSingle(),
                };
            }
        }

        return null;
    }

    #region TemplateLayout Support (Header/Footer/Content)

    /// <inheritdoc />
    public async Task<byte[]> GeneratePdfFromTemplateLayoutAsync(
        TemplateLayout templateLayout,
        object? data = null,
        PdfGenerationOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(templateLayout);
        ArgumentNullException.ThrowIfNull(templateLayout.Content, nameof(templateLayout.Content));

        options ??= PdfGenerationOptions.Default;
        var stopwatch = Stopwatch.StartNew();

        _logger.LogInformation(
            "Starting PDF generation from TemplateLayout with content type {ContentType}, HasHeader: {HasHeader}, HasFooter: {HasFooter}",
            templateLayout.Content.Type,
            templateLayout.HasHeader,
            templateLayout.HasFooter
        );

        try
        {
            // Validate layout before generation
            var validationResult = await ValidateTemplateLayoutAsync(templateLayout, data);
            if (!validationResult.IsValid)
            {
                var errors = string.Join("; ", validationResult.Errors.Select(e => e.Message));
                throw new LayoutRenderException(
                    $"Template layout validation failed: {errors}",
                    templateLayout.Content.Id,
                    "templateLayout",
                    templateLayout.Content.Type.ToString()
                );
            }

            // Create render context with data
            var context = CreateRenderContext(data, options);

            // Apply page settings to context
            ApplyPageSettingsToContext(templateLayout.PageSettings, context);

            // Create and configure QuestPDF document with full template layout
            var document = CreateDocumentFromTemplateLayout(templateLayout, context, options);

            // Generate PDF bytes with cancellation support
            byte[] pdfBytes;
            using (var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
            {
                cts.CancelAfter(options.Timeout);

                try
                {
                    pdfBytes = await Task.Run(() => GeneratePdfBytes(document), cts.Token);
                }
                catch (OperationCanceledException)
                    when (cts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
                {
                    throw new TimeoutException(
                        $"PDF generation exceeded timeout of {options.Timeout.TotalSeconds} seconds"
                    );
                }
            }

            stopwatch.Stop();
            _logger.LogInformation(
                "PDF generation from TemplateLayout completed successfully in {ElapsedMs}ms. Size: {SizeKB:F2} KB",
                stopwatch.ElapsedMilliseconds,
                pdfBytes.Length / 1024.0
            );

            return pdfBytes;
        }
        catch (LayoutRenderException)
        {
            throw;
        }
        catch (TimeoutException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "PDF generation from TemplateLayout failed for content type {ContentType}",
                templateLayout.Content.Type
            );
            throw new LayoutRenderException(
                $"PDF generation from template layout failed: {ex.Message}",
                templateLayout.Content.Id,
                "templateLayout",
                templateLayout.Content.Type.ToString(),
                ex
            );
        }
    }

    /// <inheritdoc />
    public async Task GeneratePdfFromTemplateLayoutAsync(
        TemplateLayout templateLayout,
        Stream outputStream,
        object? data = null,
        PdfGenerationOptions? options = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(templateLayout);
        ArgumentNullException.ThrowIfNull(templateLayout.Content, nameof(templateLayout.Content));
        ArgumentNullException.ThrowIfNull(outputStream);

        if (!outputStream.CanWrite)
        {
            throw new ArgumentException("Output stream must be writable", nameof(outputStream));
        }

        options ??= PdfGenerationOptions.Default;
        var stopwatch = Stopwatch.StartNew();

        _logger.LogInformation(
            "Starting PDF generation to stream from TemplateLayout with content type {ContentType}",
            templateLayout.Content.Type
        );

        try
        {
            // Validate layout before generation
            var validationResult = await ValidateTemplateLayoutAsync(templateLayout, data);
            if (!validationResult.IsValid)
            {
                var errors = string.Join("; ", validationResult.Errors.Select(e => e.Message));
                throw new LayoutRenderException(
                    $"Template layout validation failed: {errors}",
                    templateLayout.Content.Id,
                    "templateLayout",
                    templateLayout.Content.Type.ToString()
                );
            }

            // Create render context with data
            var context = CreateRenderContext(data, options);

            // Apply page settings to context
            ApplyPageSettingsToContext(templateLayout.PageSettings, context);

            // Create and configure QuestPDF document with full template layout
            var document = CreateDocumentFromTemplateLayout(templateLayout, context, options);

            // Generate PDF to stream with cancellation support
            using (var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
            {
                cts.CancelAfter(options.Timeout);

                try
                {
                    await Task.Run(() => document.GeneratePdf(outputStream), cts.Token);
                }
                catch (OperationCanceledException)
                    when (cts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
                {
                    throw new TimeoutException(
                        $"PDF generation exceeded timeout of {options.Timeout.TotalSeconds} seconds"
                    );
                }
            }

            stopwatch.Stop();
            _logger.LogInformation(
                "PDF generation to stream from TemplateLayout completed successfully in {ElapsedMs}ms",
                stopwatch.ElapsedMilliseconds
            );
        }
        catch (LayoutRenderException)
        {
            throw;
        }
        catch (TimeoutException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "PDF generation to stream from TemplateLayout failed for content type {ContentType}",
                templateLayout.Content.Type
            );
            throw new LayoutRenderException(
                $"PDF generation from template layout failed: {ex.Message}",
                templateLayout.Content.Id,
                "templateLayout",
                templateLayout.Content.Type.ToString(),
                ex
            );
        }
    }

    /// <inheritdoc />
    public Task<PdfValidationResult> ValidateTemplateLayoutAsync(
        TemplateLayout templateLayout,
        object? data = null
    )
    {
        ArgumentNullException.ThrowIfNull(templateLayout);

        _logger.LogDebug(
            "Validating template layout with content type {ContentType}",
            templateLayout.Content?.Type
        );

        var result = new PdfValidationResult { IsValid = true };

        try
        {
            // Validate the TemplateLayout structure itself
            var layoutErrors = templateLayout.Validate();
            foreach (var error in layoutErrors)
            {
                result.Errors.Add(
                    new PdfValidationError
                    {
                        Code = "TEMPLATE_LAYOUT_ERROR",
                        Message = error,
                        Path = "templateLayout",
                    }
                );
                result.IsValid = false;
            }

            // Validate content (required)
            if (templateLayout.Content is not null)
            {
                ValidateLayoutNodeForResult(templateLayout.Content, "content", result);
            }

            // Validate header if present
            if (templateLayout.Header is not null)
            {
                ValidateLayoutNodeForResult(templateLayout.Header, "header", result);
            }

            // Validate footer if present
            if (templateLayout.Footer is not null)
            {
                ValidateLayoutNodeForResult(templateLayout.Footer, "footer", result);
            }

            // Validate background if present
            if (templateLayout.Background is not null)
            {
                ValidateLayoutNodeForResult(templateLayout.Background, "background", result);
            }

            // Validate foreground if present
            if (templateLayout.Foreground is not null)
            {
                ValidateLayoutNodeForResult(templateLayout.Foreground, "foreground", result);
            }

            _logger.LogDebug(
                "Template layout validation completed. IsValid: {IsValid}, Errors: {ErrorCount}, Warnings: {WarningCount}",
                result.IsValid,
                result.Errors.Count,
                result.Warnings.Count
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Template layout validation encountered an unexpected error");
            result.IsValid = false;
            result.Errors.Add(
                new PdfValidationError
                {
                    Code = "VALIDATION_ERROR",
                    Message = $"Validation failed: {ex.Message}",
                    Path = "templateLayout",
                }
            );
        }

        return Task.FromResult(result);
    }

    /// <inheritdoc />
    public Task<PdfMetadata> GetTemplateLayoutMetadataAsync(
        TemplateLayout templateLayout,
        object? data = null,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(templateLayout);
        ArgumentNullException.ThrowIfNull(templateLayout.Content, nameof(templateLayout.Content));

        _logger.LogDebug(
            "Extracting metadata for template layout with content type {ContentType}",
            templateLayout.Content.Type
        );

        var metadata = new PdfMetadata();

        try
        {
            // Analyze all layout trees
            var totalComponents = 0;
            var totalImages = 0;
            var allFonts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // Analyze content (required)
            var (contentCount, contentImages, contentFonts) = AnalyzeLayout(templateLayout.Content);
            totalComponents += contentCount;
            totalImages += contentImages;
            foreach (var font in contentFonts)
            {
                allFonts.Add(font);
            }

            // Analyze header if present
            if (templateLayout.Header is not null)
            {
                var (headerCount, headerImages, headerFonts) = AnalyzeLayout(templateLayout.Header);
                totalComponents += headerCount;
                totalImages += headerImages;
                foreach (var font in headerFonts)
                {
                    allFonts.Add(font);
                }
            }

            // Analyze footer if present
            if (templateLayout.Footer is not null)
            {
                var (footerCount, footerImages, footerFonts) = AnalyzeLayout(templateLayout.Footer);
                totalComponents += footerCount;
                totalImages += footerImages;
                foreach (var font in footerFonts)
                {
                    allFonts.Add(font);
                }
            }

            // Analyze background if present
            if (templateLayout.Background is not null)
            {
                var (bgCount, bgImages, bgFonts) = AnalyzeLayout(templateLayout.Background);
                totalComponents += bgCount;
                totalImages += bgImages;
                foreach (var font in bgFonts)
                {
                    allFonts.Add(font);
                }
            }

            // Analyze foreground if present
            if (templateLayout.Foreground is not null)
            {
                var (fgCount, fgImages, fgFonts) = AnalyzeLayout(templateLayout.Foreground);
                totalComponents += fgCount;
                totalImages += fgImages;
                foreach (var font in fgFonts)
                {
                    allFonts.Add(font);
                }
            }

            // Estimate page count (rough estimate based on component count)
            metadata.EstimatedPageCount = Math.Max(1, totalComponents / 50);

            // Estimate size (very rough: ~1KB base + ~500 bytes per component + ~50KB per image)
            metadata.EstimatedSizeBytes = 1024 + (totalComponents * 500) + (totalImages * 51200);

            metadata.ImageCount = totalImages;
            metadata.FontsUsed.AddRange(allFonts);

            // Extract page size from page settings
            metadata.PageSize = ExtractPageSizeFromSettings(templateLayout.PageSettings);

            _logger.LogDebug(
                "Template layout metadata extracted. EstimatedPages: {Pages}, EstimatedSize: {SizeKB:F2} KB, Images: {Images}",
                metadata.EstimatedPageCount,
                metadata.EstimatedSizeBytes / 1024.0,
                metadata.ImageCount
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract some metadata from template layout");
            metadata.Warnings.Add($"Metadata extraction incomplete: {ex.Message}");
        }

        return Task.FromResult(metadata);
    }

    /// <summary>
    /// Creates and configures a QuestPDF document from a complete TemplateLayout.
    /// This method maps the TemplateLayout structure to QuestPDF's page slots:
    /// Header, Content, Footer, Background, and Foreground.
    /// </summary>
    /// <param name="templateLayout">The template layout with all page slots.</param>
    /// <param name="context">The render context with data.</param>
    /// <param name="options">The PDF generation options.</param>
    /// <returns>A configured QuestPDF document.</returns>
    private IDocument CreateDocumentFromTemplateLayout(
        TemplateLayout templateLayout,
        RenderContext context,
        PdfGenerationOptions options
    )
    {
        return Document
            .Create(container =>
            {
                container.Page(page =>
                {
                    // Configure page from PageSettings
                    ConfigurePageFromSettings(page, templateLayout.PageSettings, options);

                    // Render background slot (behind all content, full page)
                    if (templateLayout.HasBackground && templateLayout.Background is not null)
                    {
                        _logger.LogDebug("Rendering background slot");
                        page.Background()
                            .Element(bgContainer =>
                            {
                                _layoutEngine.Render(
                                    bgContainer,
                                    templateLayout.Background,
                                    context
                                );
                            });
                    }

                    // Render header slot (top of every page)
                    if (templateLayout.HasHeader && templateLayout.Header is not null)
                    {
                        _logger.LogDebug("Rendering header slot");
                        var headerContainer = page.Header();

                        // Apply header height constraints from PageSettings
                        if (templateLayout.PageSettings.HeaderHeight.HasValue)
                        {
                            headerContainer = headerContainer.Height(
                                templateLayout.PageSettings.HeaderHeight.Value
                            );
                        }
                        else if (
                            templateLayout.PageSettings.MinHeaderHeight.HasValue
                            || templateLayout.PageSettings.MaxHeaderHeight.HasValue
                        )
                        {
                            if (templateLayout.PageSettings.MinHeaderHeight.HasValue)
                            {
                                headerContainer = headerContainer.MinHeight(
                                    templateLayout.PageSettings.MinHeaderHeight.Value
                                );
                            }
                            if (templateLayout.PageSettings.MaxHeaderHeight.HasValue)
                            {
                                headerContainer = headerContainer.MaxHeight(
                                    templateLayout.PageSettings.MaxHeaderHeight.Value
                                );
                            }
                        }

                        // Apply extend to fill space if configured
                        if (templateLayout.PageSettings.ExtendHeaderToFillSpace)
                        {
                            headerContainer = headerContainer.ExtendVertical();
                        }

                        headerContainer.Element(hdrContainer =>
                        {
                            _layoutEngine.Render(hdrContainer, templateLayout.Header, context);
                        });
                    }

                    // Render content slot (main content area, supports pagination)
                    _logger.LogDebug("Rendering content slot");
                    page.Content()
                        .Element(contentContainer =>
                        {
                            _layoutEngine.Render(contentContainer, templateLayout.Content, context);
                        });

                    // Render footer slot (bottom of every page)
                    if (templateLayout.HasFooter && templateLayout.Footer is not null)
                    {
                        _logger.LogDebug("Rendering footer slot");
                        var footerContainer = page.Footer();

                        // Apply footer height constraints from PageSettings
                        if (templateLayout.PageSettings.FooterHeight.HasValue)
                        {
                            footerContainer = footerContainer.Height(
                                templateLayout.PageSettings.FooterHeight.Value
                            );
                        }
                        else if (
                            templateLayout.PageSettings.MinFooterHeight.HasValue
                            || templateLayout.PageSettings.MaxFooterHeight.HasValue
                        )
                        {
                            if (templateLayout.PageSettings.MinFooterHeight.HasValue)
                            {
                                footerContainer = footerContainer.MinHeight(
                                    templateLayout.PageSettings.MinFooterHeight.Value
                                );
                            }
                            if (templateLayout.PageSettings.MaxFooterHeight.HasValue)
                            {
                                footerContainer = footerContainer.MaxHeight(
                                    templateLayout.PageSettings.MaxFooterHeight.Value
                                );
                            }
                        }

                        // Apply extend to fill space if configured
                        if (templateLayout.PageSettings.ExtendFooterToFillSpace)
                        {
                            footerContainer = footerContainer.ExtendVertical();
                        }

                        footerContainer.Element(ftrContainer =>
                        {
                            _layoutEngine.Render(ftrContainer, templateLayout.Footer, context);
                        });
                    }

                    // Render foreground slot (in front of all content, full page - for watermarks)
                    if (templateLayout.HasForeground && templateLayout.Foreground is not null)
                    {
                        _logger.LogDebug("Rendering foreground slot");
                        page.Foreground()
                            .Element(fgContainer =>
                            {
                                _layoutEngine.Render(
                                    fgContainer,
                                    templateLayout.Foreground,
                                    context
                                );
                            });
                    }
                });
            })
            .WithMetadata(CreateDocumentMetadata(options))
            .WithSettings(CreateDocumentSettings(options));
    }

    /// <summary>
    /// Configures a QuestPDF page from PageSettings.
    /// </summary>
    /// <param name="page">The page descriptor to configure.</param>
    /// <param name="settings">The page settings.</param>
    /// <param name="options">The generation options for fallback values.</param>
    private static void ConfigurePageFromSettings(
        PageDescriptor page,
        PageSettings settings,
        PdfGenerationOptions options
    )
    {
        // Configure page size
        var pageSize = GetQuestPdfPageSize(settings);
        page.Size(pageSize);

        // Configure margins
        page.MarginTop(settings.EffectiveMarginTop);
        page.MarginRight(settings.EffectiveMarginRight);
        page.MarginBottom(settings.EffectiveMarginBottom);
        page.MarginLeft(settings.EffectiveMarginLeft);

        // Configure page color/background
        if (!string.IsNullOrEmpty(settings.BackgroundColor))
        {
            page.PageColor(settings.BackgroundColor);
        }
        else if (options.DebugMode)
        {
            page.PageColor(Colors.Grey.Lighten4);
        }
        else
        {
            page.PageColor(Colors.White);
        }

        // Configure content direction
        if (settings.ContentDirection == Domain.ContentDirection.RightToLeft)
        {
            page.ContentFromRightToLeft();
        }
        else
        {
            page.ContentFromLeftToRight();
        }

        // Configure continuous mode (infinite page height)
        if (settings.ContinuousMode)
        {
            page.ContinuousSize(pageSize.Width);
        }
    }

    /// <summary>
    /// Gets a QuestPDF PageSize from PageSettings.
    /// </summary>
    private static QuestPageSize GetQuestPdfPageSize(PageSettings settings)
    {
        // Check for preset page size
        if (!string.IsNullOrEmpty(settings.PageSize))
        {
            var (found, size) = TryGetPageSizeByName(settings.PageSize);
            if (found)
            {
                return settings.Orientation == Domain.PageOrientation.Landscape
                    ? size.Landscape()
                    : size;
            }
        }

        // Custom dimensions
        if (settings.Width.HasValue && settings.Height.HasValue)
        {
            var width = settings.Width.Value;
            var height = settings.Height.Value;

            // Handle landscape by swapping if needed
            if (settings.Orientation == Domain.PageOrientation.Landscape && height > width)
            {
                (width, height) = (height, width);
            }

            return new QuestPageSize(width, height);
        }

        // Default to A4
        return settings.Orientation == Domain.PageOrientation.Landscape
            ? QuestPageSizes.A4.Landscape()
            : QuestPageSizes.A4;
    }

    /// <summary>
    /// Tries to get a standard page size by name.
    /// </summary>
    private static (bool Found, QuestPageSize Size) TryGetPageSizeByName(string name)
    {
        var result = name.ToUpperInvariant() switch
        {
            "A0" => (true, QuestPageSizes.A0),
            "A1" => (true, QuestPageSizes.A1),
            "A2" => (true, QuestPageSizes.A2),
            "A3" => (true, QuestPageSizes.A3),
            "A4" => (true, QuestPageSizes.A4),
            "A5" => (true, QuestPageSizes.A5),
            "A6" => (true, QuestPageSizes.A6),
            "A7" => (true, QuestPageSizes.A7),
            "A8" => (true, QuestPageSizes.A8),
            "A9" => (true, QuestPageSizes.A9),
            "A10" => (true, QuestPageSizes.A10),
            "B0" => (true, QuestPageSizes.B0),
            "B1" => (true, QuestPageSizes.B1),
            "B2" => (true, QuestPageSizes.B2),
            "B3" => (true, QuestPageSizes.B3),
            "B4" => (true, QuestPageSizes.B4),
            "B5" => (true, QuestPageSizes.B5),
            "B6" => (true, QuestPageSizes.B6),
            "B7" => (true, QuestPageSizes.B7),
            "B8" => (true, QuestPageSizes.B8),
            "B9" => (true, QuestPageSizes.B9),
            "B10" => (true, QuestPageSizes.B10),
            "LETTER" => (true, QuestPageSizes.Letter),
            "LEGAL" => (true, QuestPageSizes.Legal),
            "LEDGER" => (true, QuestPageSizes.Ledger),
            "TABLOID" => (true, QuestPageSizes.Tabloid),
            "EXECUTIVE" => (true, QuestPageSizes.Executive),
            _ => (false, QuestPageSizes.A4),
        };

        return result;
    }

    /// <summary>
    /// Applies PageSettings to the render context for expression evaluation.
    /// </summary>
    private static void ApplyPageSettingsToContext(PageSettings settings, RenderContext context)
    {
        // Set page size info
        var pageSize = GetQuestPdfPageSize(settings);
        context.PageInfo.PageWidth = pageSize.Width;
        context.PageInfo.PageHeight = pageSize.Height;

        // Set orientation info
        context.SetVariable("pageOrientation", settings.Orientation.ToString());
        context.SetVariable("pageSize", settings.PageSize ?? "A4");
    }

    /// <summary>
    /// Validates a layout node and adds results to the validation result.
    /// </summary>
    private void ValidateLayoutNodeForResult(
        LayoutNode node,
        string slot,
        PdfValidationResult result
    )
    {
        var engineValidation = _layoutEngine.ValidateLayout(node);

        if (!engineValidation.IsValid)
        {
            result.IsValid = false;
            foreach (var error in engineValidation.Errors)
            {
                result.Errors.Add(
                    new PdfValidationError
                    {
                        Code = error.ErrorCode,
                        Message = $"[{slot}] {error.Message}",
                        Path = $"{slot}.{error.Path}",
                        NodeId = error.NodeId,
                    }
                );
            }
        }

        foreach (var warning in engineValidation.Warnings)
        {
            result.Warnings.Add(
                new PdfValidationWarning
                {
                    Code = warning.WarningCode,
                    Message = $"[{slot}] {warning.Message}",
                    Path = $"{slot}.{warning.Path}",
                }
            );
        }

        // Additional validation: Check if component is valid for slot
        if (!IsValidSlotComponent(node.Type, slot))
        {
            result.Warnings.Add(
                new PdfValidationWarning
                {
                    Code = "UNUSUAL_SLOT_COMPONENT",
                    Message =
                        $"Component type '{node.Type}' is unusual for the {slot} slot. "
                        + "This may work but consider using a more appropriate component.",
                    Path = slot,
                }
            );
        }
    }

    /// <summary>
    /// Checks if a component type is appropriate for a given slot.
    /// </summary>
    private static bool IsValidSlotComponent(ComponentType type, string slot)
    {
        // Most components are valid in most slots, but some combinations are unusual
        return slot switch
        {
            "header" or "footer" =>
            // Page break doesn't make sense in header/footer
            type != ComponentType.PageBreak,

            "background" or "foreground" =>
            // These typically use images, layers, or simple content
            type
                is ComponentType.Image
                    or ComponentType.Layers
                    or ComponentType.Text
                    or ComponentType.Column
                    or ComponentType.Row
                    or ComponentType.Background
                    or ComponentType.Alignment
                    or ComponentType.Padding
                    or ComponentType.Scale
                    or ComponentType.Rotate
                    or ComponentType.Translate,

            _ => true,
        };
    }

    /// <summary>
    /// Extracts page size from PageSettings.
    /// </summary>
    private static Interfaces.PageSize? ExtractPageSizeFromSettings(PageSettings settings)
    {
        var questSize = GetQuestPdfPageSize(settings);

        return new Interfaces.PageSize
        {
            Width = questSize.Width,
            Height = questSize.Height,
            Orientation =
                settings.Orientation == Domain.PageOrientation.Landscape
                    ? Interfaces.PageOrientation.Landscape
                    : Interfaces.PageOrientation.Portrait,
        };
    }

    #endregion
}
