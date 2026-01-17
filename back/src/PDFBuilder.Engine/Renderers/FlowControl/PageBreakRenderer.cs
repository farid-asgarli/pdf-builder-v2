using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.FlowControl;

/// <summary>
/// Renders a PageBreak component that forces content to start on a new page.
/// This is useful for separating sections, improving readability, and ensuring
/// that specific elements appear on dedicated pages.
/// </summary>
/// <remarks>
/// QuestPDF PageBreak API:
/// - container.PageBreak() - Forces a page break at the current position
///
/// Properties: (none required)
/// This component has no configurable properties. It simply inserts a page break.
///
/// Usage Notes:
/// - PageBreak is typically used within a Column or similar container
/// - The page break occurs before subsequent content
/// - This component does not support children or wrapper behavior
///
/// Example JSON:
/// <code>
/// {
///   "type": "PageBreak"
/// }
/// </code>
///
/// When placed in a Column:
/// <code>
/// {
///   "type": "Column",
///   "children": [
///     { "type": "Text", "content": "Page 1 content" },
///     { "type": "PageBreak" },
///     { "type": "Text", "content": "Page 2 content" }
///   ]
/// }
/// </code>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="PageBreakRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class PageBreakRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<PageBreakRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.PageBreak;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.FlowControl;

    /// <summary>
    /// PageBreak does not support children - it is a leaf component.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// PageBreak is not a wrapper - it does not wrap other content.
    /// </summary>
    public override bool IsWrapper => false;

    /// <summary>
    /// PageBreak does not require expression evaluation as it has no dynamic properties.
    /// </summary>
    public override bool RequiresExpressionEvaluation => false;

    /// <summary>
    /// PageBreak does not need to inherit styles as it has no visual appearance.
    /// </summary>
    public override bool InheritsStyle => false;

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        Logger.LogTrace("Rendering PageBreak for node {NodeId}", node.Id ?? "unnamed");

        // Apply the page break using QuestPDF's PageBreak() method
        // This forces subsequent content to start on a new page
        container.PageBreak();

        Logger.LogDebug("PageBreak rendered successfully for node {NodeId}", node.Id ?? "unnamed");
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // PageBreak has no required properties
        return Enumerable.Empty<string>();
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        // PageBreak has no optional properties
        return new Dictionary<string, object?>();
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Warn if children are defined (they will be ignored)
        if (node.Children is not null && node.Children.Count > 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "children",
                    Message =
                        "PageBreak component does not support children. Any children will be ignored.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Warn if child is defined (it will be ignored)
        if (node.Child is not null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message =
                        "PageBreak component does not support a child. The child will be ignored.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
