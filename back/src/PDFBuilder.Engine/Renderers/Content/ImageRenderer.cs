using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Content;

/// <summary>
/// Renders Image content components with support for various image sources.
/// Supports HTTP/HTTPS URLs, base64 data URIs, and local file paths.
/// </summary>
/// <remarks>
/// QuestPDF Image API: container.Image(bytes) or container.Image("path")
///
/// Properties:
/// - source (string, required): The image source. Can be:
///   - HTTP/HTTPS URL: "https://example.com/image.png"
///   - Base64 data URI: "data:image/png;base64,..."
///   - Local file path: "C:\images\logo.png" or relative path
///
/// - fit (string): How the image scales to fit the container. Options:
///   - "width" (default): Scale to fill container width, maintain aspect ratio
///   - "height": Scale to fill container height, maintain aspect ratio
///   - "area": Scale to fill available area while maintaining aspect ratio
///   - "unproportionally": Stretch to fill, ignoring aspect ratio
///
/// - width (float): Fixed width in points. If set, constrains image width.
/// - height (float): Fixed height in points. If set, constrains image height.
///
/// - dpi (int): Target DPI for rendering. Default: 300
/// - compressionQuality (string): JPEG compression quality: "veryLow", "low", "medium", "high", "veryHigh"
///
/// - placeholder (string): Placeholder text to show if image fails to load.
/// - showPlaceholderOnError (bool): Whether to show a placeholder box on error. Default: true
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ImageRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="imageProcessor">The image processor for loading images.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ImageRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ImageProcessor imageProcessor,
    ILogger<ImageRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Source = "source";
        public const string Fit = "fit";
        public const string Width = "width";
        public const string Height = "height";
        public const string Dpi = "dpi";
        public const string CompressionQuality = "compressionQuality";
        public const string Placeholder = "placeholder";
        public const string ShowPlaceholderOnError = "showPlaceholderOnError";
    }

    private readonly ImageProcessor _imageProcessor =
        imageProcessor ?? throw new ArgumentNullException(nameof(imageProcessor));

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Image;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Content;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => false;

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        // Get image source with expression evaluation
        var source = EvaluateStringProperty(node, PropertyNames.Source, context);

        if (string.IsNullOrWhiteSpace(source))
        {
            Logger.LogWarning("Image node {NodeId} has no source", node.Id ?? "unnamed");
            RenderPlaceholder(container, node, context, "No image source");
            return;
        }

        Logger.LogTrace(
            "Rendering image from source: {Source}",
            source.Length > 100 ? source[..100] + "..." : source
        );

        // Load the image
        byte[]? imageData;
        try
        {
            imageData = _imageProcessor.LoadImage(source);
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Failed to load image from source: {Source}", source);
            RenderPlaceholder(container, node, context, "Image load failed");
            return;
        }

        if (imageData is null || imageData.Length == 0)
        {
            Logger.LogWarning("Image data is empty for source: {Source}", source);
            RenderPlaceholder(container, node, context, "Image not found");
            return;
        }

        // Apply size constraints if specified
        var targetContainer = ApplySizeConstraints(container, node, context);

        // Render the image
        try
        {
            RenderImage(targetContainer, node, context, imageData);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Failed to render image for node {NodeId}", node.Id ?? "unnamed");
            RenderPlaceholder(container, node, context, "Image render failed");
        }
    }

    /// <summary>
    /// Applies width and height constraints to the container.
    /// </summary>
    private IContainer ApplySizeConstraints(
        IContainer container,
        LayoutNode node,
        RenderContext context
    )
    {
        var width = EvaluateFloatProperty(node, PropertyNames.Width, context);
        var height = EvaluateFloatProperty(node, PropertyNames.Height, context);

        var targetContainer = container;

        if (width.HasValue && width.Value > 0)
        {
            targetContainer = targetContainer.Width(width.Value);
        }

        if (height.HasValue && height.Value > 0)
        {
            targetContainer = targetContainer.Height(height.Value);
        }

        return targetContainer;
    }

    /// <summary>
    /// Renders the image with the specified fit mode.
    /// </summary>
    private void RenderImage(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        byte[] imageData
    )
    {
        var fit = EvaluateStringProperty(node, PropertyNames.Fit, context, "width");
        var compressionQuality = EvaluateStringProperty(
            node,
            PropertyNames.CompressionQuality,
            context
        );
        var dpi = EvaluateIntProperty(node, PropertyNames.Dpi, context, 300);

        // Create the image descriptor
        var image = container.Image(imageData);

        // Apply fit mode
        ApplyFitMode(image, fit);

        // Apply compression quality if specified
        if (!string.IsNullOrEmpty(compressionQuality))
        {
            ApplyCompressionQuality(image, compressionQuality);
        }

        Logger.LogTrace("Image rendered with fit={Fit}, dpi={Dpi}", fit, dpi);
    }

    /// <summary>
    /// Applies the fit mode to the image descriptor.
    /// </summary>
    private static void ApplyFitMode(ImageDescriptor image, string? fit)
    {
        switch (fit?.ToLowerInvariant())
        {
            case "width":
            case "fitwidth":
                image.FitWidth();
                break;

            case "height":
            case "fitheight":
                image.FitHeight();
                break;

            case "area":
            case "fitarea":
                image.FitArea();
                break;

            case "unproportionally":
            case "fitunproportionally":
            case "stretch":
                image.FitUnproportionally();
                break;

            default:
                // Default to FitWidth for best compatibility
                image.FitWidth();
                break;
        }
    }

    /// <summary>
    /// Applies compression quality to the image descriptor.
    /// </summary>
    private static void ApplyCompressionQuality(ImageDescriptor image, string quality)
    {
        switch (quality.ToLowerInvariant())
        {
            case "verylow":
            case "very_low":
            case "very-low":
                image.WithCompressionQuality(ImageCompressionQuality.VeryLow);
                break;

            case "low":
                image.WithCompressionQuality(ImageCompressionQuality.Low);
                break;

            case "medium":
                image.WithCompressionQuality(ImageCompressionQuality.Medium);
                break;

            case "high":
                image.WithCompressionQuality(ImageCompressionQuality.High);
                break;

            case "veryhigh":
            case "very_high":
            case "very-high":
                image.WithCompressionQuality(ImageCompressionQuality.VeryHigh);
                break;
        }
    }

    /// <summary>
    /// Renders a placeholder when image loading fails.
    /// </summary>
    private void RenderPlaceholder(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        string errorMessage
    )
    {
        var showPlaceholder = EvaluateBoolProperty(
            node,
            PropertyNames.ShowPlaceholderOnError,
            context,
            true
        );

        if (showPlaceholder != true)
        {
            // Don't render anything if placeholder is disabled
            Logger.LogDebug(
                "Image placeholder disabled for node {NodeId}, rendering empty",
                node.Id ?? "unnamed"
            );
            return;
        }

        var placeholderText =
            EvaluateStringProperty(node, PropertyNames.Placeholder, context, errorMessage)
            ?? errorMessage;

        // Get size constraints for placeholder
        var width = EvaluateFloatProperty(node, PropertyNames.Width, context);
        var height = EvaluateFloatProperty(node, PropertyNames.Height, context);

        var targetContainer = container;

        // Apply size constraints
        if (width.HasValue && width.Value > 0)
        {
            targetContainer = targetContainer.Width(width.Value);
        }
        else
        {
            targetContainer = targetContainer.Width(100); // Default placeholder width
        }

        if (height.HasValue && height.Value > 0)
        {
            targetContainer = targetContainer.Height(height.Value);
        }
        else
        {
            targetContainer = targetContainer.Height(100); // Default placeholder height
        }

        // Render placeholder box
        targetContainer
            .Background("#f0f0f0")
            .Border(1)
            .BorderColor("#cccccc")
            .AlignCenter()
            .AlignMiddle()
            .Padding(5)
            .Text(placeholderText)
            .FontSize(10)
            .FontColor("#666666")
            .AlignCenter();

        Logger.LogDebug(
            "Rendered placeholder for image node {NodeId}: {Message}",
            node.Id ?? "unnamed",
            placeholderText
        );
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        return [PropertyNames.Source];
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            [PropertyNames.Fit] = "width",
            [PropertyNames.Width] = null,
            [PropertyNames.Height] = null,
            [PropertyNames.Dpi] = 300,
            [PropertyNames.CompressionQuality] = null,
            [PropertyNames.Placeholder] = "Image not found",
            [PropertyNames.ShowPlaceholderOnError] = true,
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate source is present (handled by GetRequiredProperties, but add specific message)
        var source = node.GetStringProperty(PropertyNames.Source);
        if (string.IsNullOrWhiteSpace(source))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Source,
                    Message = "Image source is required",
                    Severity = ValidationSeverity.Error,
                }
            );
        }
        else if (!IsExpressionOrValidSource(source))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Source,
                    Message = $"Image source appears invalid: {source}",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate width if provided
        var width = node.GetFloatProperty(PropertyNames.Width);
        if (width.HasValue && width.Value <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Width,
                    Message = $"Image width must be positive, got {width.Value}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate height if provided
        var height = node.GetFloatProperty(PropertyNames.Height);
        if (height.HasValue && height.Value <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Height,
                    Message = $"Image height must be positive, got {height.Value}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate DPI if provided
        var dpi = node.GetIntProperty(PropertyNames.Dpi);
        if (dpi.HasValue && (dpi.Value < 1 || dpi.Value > 1200))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Dpi,
                    Message = $"DPI must be between 1 and 1200, got {dpi.Value}",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate fit mode if provided
        var fit = node.GetStringProperty(PropertyNames.Fit);
        if (!string.IsNullOrEmpty(fit) && !IsValidFitMode(fit))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Fit,
                    Message =
                        $"Invalid fit mode '{fit}'. Valid options: width, height, area, unproportionally",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }

    /// <summary>
    /// Checks if a source is an expression or a valid image source.
    /// </summary>
    private bool IsExpressionOrValidSource(string source)
    {
        // If it's an expression, we can't validate it until runtime
        if (ExpressionEvaluator.ContainsExpressions(source))
        {
            return true;
        }

        return ImageProcessor.ValidateSource(source);
    }

    /// <summary>
    /// Validates that a fit mode string is valid.
    /// </summary>
    private static bool IsValidFitMode(string fit)
    {
        var validModes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "width",
            "fitwidth",
            "height",
            "fitheight",
            "area",
            "fitarea",
            "unproportionally",
            "fitunproportionally",
            "stretch",
        };

        return validModes.Contains(fit);
    }
}
