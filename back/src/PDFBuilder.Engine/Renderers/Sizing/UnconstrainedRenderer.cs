using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Sizing;

/// <summary>
/// Renders an Unconstrained wrapper component that creates a space where content
/// can go beyond the limits set by parent elements.
/// </summary>
/// <remarks>
/// QuestPDF Unconstrained API:
/// - Unconstrained() - Removes all size constraints from parent elements.
///
/// Properties:
/// - None required. This component simply removes size constraints.
///
/// Behavior:
/// - When you use Unconstrained, the container doesn't take up space in the layout.
/// - It removes any size limits from parent elements, making content appear to
///   "float" compared to other elements.
/// - Often paired with Translate to place elements exactly where you want them.
///
/// Use Cases:
/// - Creating elements that overlap or extend past their container.
/// - Placing absolute-positioned decorative elements.
/// - Creating watermarks or overlays that ignore normal layout constraints.
/// - Rendering content that needs to break out of its container bounds.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="UnconstrainedRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class UnconstrainedRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<UnconstrainedRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Unconstrained;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Sizing;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // No required properties - Unconstrained has no configuration options
        return Enumerable.Empty<string>();
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        // No optional properties
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
            "Rendering Unconstrained for node {NodeId} - removing size constraints",
            node.Id ?? "unnamed"
        );

        // Apply unconstrained modifier
        var unconstrainedContainer = container.Unconstrained();

        // Render the child content
        RenderChild(unconstrainedContainer, node, context, layoutEngine);
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        // No properties to validate
        return Enumerable.Empty<ComponentValidationError>();
    }
}
