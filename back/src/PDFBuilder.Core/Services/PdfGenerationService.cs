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
}
