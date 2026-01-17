using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.FlowControl;

/// <summary>
/// Renders a StopPaging component that prevents its content from spanning multiple pages.
/// Any portion of the content that doesn't fit on the current page is omitted.
/// </summary>
/// <remarks>
/// QuestPDF StopPaging API:
/// - container.StopPaging() - Renders content exclusively on the first page, omitting overflow
///
/// Behavior:
/// - Content is rendered only on the current page
/// - Any content that exceeds the available space is clipped/omitted
/// - Unlike ShowEntire, which moves content to a new page if it doesn't fit,
///   StopPaging simply truncates the content that doesn't fit
///
/// Properties:
/// - child (LayoutNode, optional): The child content to render with paging disabled
///
/// Use Cases:
/// - Limiting content to a specific area without flowing to additional pages
/// - Creating fixed-size content regions that should not overflow
/// - Truncating long content rather than paginating it
/// - Book descriptions or summaries that should not exceed a certain space
///
/// WARNING:
/// Content that doesn't fit will be permanently lost/hidden. Consider using
/// Text's ClampLines property or ScaleToFit for alternative approaches that
/// preserve content visibility.
///
/// Example JSON:
/// <code>
/// {
///   "type": "StopPaging",
///   "child": {
///     "type": "Text",
///     "content": "This is a very long text that might not fit completely on the page..."
///   }
/// }
/// </code>
///
/// Example with constrained height:
/// <code>
/// {
///   "type": "Width",
///   "value": 400,
///   "child": {
///     "type": "Height",
///     "value": 300,
///     "child": {
///       "type": "StopPaging",
///       "child": {
///         "type": "Decoration",
///         "before": { "type": "Text", "content": "Book description:", "style": { "fontWeight": "bold" } },
///         "content": { "type": "Text", "content": "A very long book description that may get truncated..." }
///       }
///     }
///   }
/// }
/// </code>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="StopPagingRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class StopPagingRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<StopPagingRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.StopPaging;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.FlowControl;

    /// <summary>
    /// StopPaging supports a single child element as the content to render.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// StopPaging is a wrapper that wraps its child content with paging prevention.
    /// </summary>
    public override bool IsWrapper => true;

    /// <summary>
    /// StopPaging does not require expression evaluation as it has no dynamic properties.
    /// </summary>
    public override bool RequiresExpressionEvaluation => false;

    /// <summary>
    /// StopPaging passes style inheritance to its child.
    /// </summary>
    public override bool InheritsStyle => true;

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        Logger.LogTrace("Rendering StopPaging for node {NodeId}", node.Id ?? "unnamed");

        // Apply StopPaging constraint to prevent content from spanning multiple pages
        // Content that doesn't fit is omitted rather than flowing to additional pages
        container
            .StopPaging()
            .Element(innerContainer =>
            {
                // Render child using the base class helper method
                RenderChild(innerContainer, node, context, layoutEngine);
            });

        Logger.LogDebug("StopPaging rendered successfully for node {NodeId}", node.Id ?? "unnamed");
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // StopPaging has no required properties
        return Enumerable.Empty<string>();
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?> { ["child"] = null };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Warn if no child is defined
        if (node.Child is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message =
                        "StopPaging component has no child. The component will have no effect.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Warn if using children instead of child
        if (node.Children is not null && node.Children.Count > 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "children",
                    Message =
                        "StopPaging component does not support 'children' array. "
                        + "Use 'child' property instead. Only the first child will be rendered.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
