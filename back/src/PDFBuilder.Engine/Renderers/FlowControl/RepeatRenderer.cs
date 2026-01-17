using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.FlowControl;

/// <summary>
/// Renders a Repeat component that ensures its content is visible on every page
/// where the containing element appears. This is useful for headers, footers,
/// labels, or key terms that should be repeated across page breaks.
/// </summary>
/// <remarks>
/// QuestPDF Repeat API:
/// - container.Repeat() - Renders the content on every page where it would be visible
///
/// Behavior:
/// - Content inside Repeat is displayed on every page where the parent element spans
/// - Useful within Row elements to keep labels visible when content wraps to multiple pages
/// - Works in conjunction with other layout containers like Decoration, Row, and Table
/// - Without Repeat, content is rendered once and then the space is left empty on subsequent pages
///
/// Properties:
/// - child (LayoutNode, optional): The child content to repeat on every page
///
/// Use Cases:
/// - Repeating glossary terms in term/definition layouts
/// - Keeping row headers visible across page breaks
/// - Displaying labels consistently in multi-page tables
/// - Showing key information that should remain visible on every page
///
/// Example JSON (Term/Definition with repeated term):
/// <code>
/// {
///   "type": "Row",
///   "children": [
///     {
///       "type": "RelativeColumn",
///       "size": 2,
///       "child": {
///         "type": "Repeat",
///         "child": {
///           "type": "Background",
///           "color": "#E8E8E8",
///           "child": {
///             "type": "Padding",
///             "value": 15,
///             "child": { "type": "Text", "content": "Variable" }
///           }
///         }
///       }
///     },
///     {
///       "type": "RelativeColumn",
///       "size": 3,
///       "child": {
///         "type": "Padding",
///         "value": 15,
///         "child": { "type": "Text", "content": "A named storage location that holds a value..." }
///       }
///     }
///   ]
/// }
/// </code>
///
/// Example in a Decoration header:
/// <code>
/// {
///   "type": "Decoration",
///   "before": {
///     "type": "Repeat",
///     "child": { "type": "Text", "content": "Terms and definitions:", "style": { "fontWeight": "bold" } }
///   },
///   "content": {
///     "type": "Column",
///     "children": [ ... glossary items ... ]
///   }
/// }
/// </code>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="RepeatRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class RepeatRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<RepeatRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Repeat;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.FlowControl;

    /// <summary>
    /// Repeat supports a single child element as the content to repeat.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// Repeat is a wrapper that wraps its child content with repeat behavior.
    /// </summary>
    public override bool IsWrapper => true;

    /// <summary>
    /// Repeat does not require expression evaluation as it has no dynamic properties.
    /// </summary>
    public override bool RequiresExpressionEvaluation => false;

    /// <summary>
    /// Repeat passes style inheritance to its child.
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
        Logger.LogTrace("Rendering Repeat for node {NodeId}", node.Id ?? "unnamed");

        // Apply Repeat to ensure content is visible on every page
        // This is useful for labels, headers, or terms that should repeat
        // when the containing element spans multiple pages
        container
            .Repeat()
            .Element(innerContainer =>
            {
                // Render child using the base class helper method
                RenderChild(innerContainer, node, context, layoutEngine);
            });

        Logger.LogDebug("Repeat rendered successfully for node {NodeId}", node.Id ?? "unnamed");
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // Repeat has no required properties
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
                    Message = "Repeat component has no child. The component will have no effect.",
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
                        "Repeat component does not support 'children' array. "
                        + "Use 'child' property instead. Only the first child will be rendered.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
