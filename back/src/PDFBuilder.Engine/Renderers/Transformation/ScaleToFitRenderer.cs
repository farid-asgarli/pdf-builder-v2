using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Transformation;

/// <summary>
/// Renders a ScaleToFit wrapper component that dynamically adjusts content to fit within available space.
/// The content is proportionally scaled down if necessary to prevent layout issues.
/// </summary>
/// <remarks>
/// QuestPDF ScaleToFit API:
/// - ScaleToFit() - Dynamically adjusts content to fit within available space by proportionally scaling it down.
///
/// This component determines the optimal scale value through multiple iterations.
/// It is particularly useful when content generally fits but occasionally needs slight adjustments.
///
/// Properties:
/// (This component has no configurable properties - it automatically determines the optimal scale.)
///
/// Warning: For complex content, this may introduce performance overhead due to iterative calculations.
///
/// Important: This component scales the available space, not the content directly.
/// You may still encounter situations where content doesn't fit properly, especially when
/// a child element enforces a specific aspect ratio or has other fixed dimensional constraints.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ScaleToFitRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ScaleToFitRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ScaleToFitRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.ScaleToFit;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Transformation;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // No required properties - ScaleToFit works automatically
        yield break;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        // No optional properties - ScaleToFit is fully automatic
        return new Dictionary<string, object?>();
    }

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        Logger.LogTrace(
            "Rendering ScaleToFit - content will be automatically scaled to fit available space"
        );

        // Apply ScaleToFit transformation
        // Note: This may have performance implications for complex content
        var scaledContainer = container.ScaleToFit();

        // Render the child content
        RenderChild(scaledContainer, node, context, layoutEngine);
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        // No component-specific validation needed
        // ScaleToFit has no configurable properties
        return Enumerable.Empty<ComponentValidationError>();
    }
}
