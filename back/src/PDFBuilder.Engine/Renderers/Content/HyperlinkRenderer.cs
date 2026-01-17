using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Content;

/// <summary>
/// Renders Hyperlink components that create clickable areas redirecting to external URLs.
/// Can wrap any child content (text, images, containers) making them clickable.
/// </summary>
/// <remarks>
/// QuestPDF Hyperlink API:
/// - container.Hyperlink("url").Element(child => ...) - Wraps child content with a clickable link
///
/// Properties:
/// - url (string, required): The target URL to open when clicked. Supports expression syntax.
///   Must be a valid URL (http://, https://, mailto:, tel:, etc.)
///
/// Child:
/// - The hyperlink wraps a single child element, making it clickable.
/// - If no child is provided, the hyperlink has no visual representation.
///
/// Usage Examples:
/// 1. Clickable image:
///    { "type": "Hyperlink", "properties": { "url": "https://example.com" },
///      "child": { "type": "Image", "properties": { "source": "logo.png" } } }
///
/// 2. Clickable text (consider using text spans for inline hyperlinks):
///    { "type": "Hyperlink", "properties": { "url": "{{ data.website }}" },
///      "child": { "type": "Text", "properties": { "content": "Click here" } } }
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="HyperlinkRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class HyperlinkRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<HyperlinkRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        /// <summary>
        /// The target URL for the hyperlink. Required.
        /// </summary>
        public const string Url = "url";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Hyperlink;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Content;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        // Get URL with expression evaluation
        var url = EvaluateStringProperty(node, PropertyNames.Url, context);

        if (string.IsNullOrWhiteSpace(url))
        {
            Logger.LogWarning(
                "Hyperlink node {NodeId} has no URL specified, rendering child without link",
                node.Id ?? "unnamed"
            );

            // Render child without hyperlink wrapper using inherited base method
            RenderChild(container, node, context, layoutEngine);
            return;
        }

        // Validate URL format
        if (!IsValidUrl(url))
        {
            Logger.LogWarning(
                "Hyperlink URL '{Url}' appears invalid for node {NodeId}, proceeding anyway",
                url,
                node.Id ?? "unnamed"
            );
        }

        Logger.LogTrace(
            "Rendering hyperlink to '{Url}' for node {NodeId}",
            url,
            node.Id ?? "unnamed"
        );

        // Apply hyperlink wrapper and render child using inherited base method
        container
            .Hyperlink(url)
            .Element(childContainer => RenderChild(childContainer, node, context, layoutEngine));
    }

    /// <summary>
    /// Validates that a URL string appears to be a valid URL.
    /// Performs basic validation without requiring network access.
    /// </summary>
    /// <param name="url">The URL to validate.</param>
    /// <returns>True if the URL appears valid; otherwise, false.</returns>
    private static bool IsValidUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return false;
        }

        // Check for common URL schemes
        var validSchemes = new[] { "http://", "https://", "mailto:", "tel:", "ftp://" };

        foreach (var scheme in validSchemes)
        {
            if (url.StartsWith(scheme, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        // Try Uri parsing for more complex validation
        return Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && (
                uri.Scheme == Uri.UriSchemeHttp
                || uri.Scheme == Uri.UriSchemeHttps
                || uri.Scheme == Uri.UriSchemeMailto
                || uri.Scheme == Uri.UriSchemeFtp
            );
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate URL is present
        var url = node.GetStringProperty(PropertyNames.Url);
        if (string.IsNullOrWhiteSpace(url))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Url,
                    Message = "Hyperlink requires a 'url' property",
                    Severity = ValidationSeverity.Error,
                }
            );
        }
        else if (!url.Contains("{{") && !IsValidUrl(url))
        {
            // Only validate non-expression URLs
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Url,
                    Message = $"URL '{url}' does not appear to be a valid URL",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate child is present
        if (node.Child is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message = "Hyperlink should have a child element to be visible",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        return new[] { PropertyNames.Url };
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>();
    }
}
