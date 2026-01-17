using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.FlowControl;

/// <summary>
/// Renders a SkipOnce component that hides its content on the first page
/// but displays it on subsequent pages. This is the opposite of ShowOnce.
/// </summary>
/// <remarks>
/// QuestPDF SkipOnce API:
/// - container.SkipOnce() - Omits content on first page, shows on subsequent pages
///
/// Behavior:
/// - Content is hidden/skipped on the first page where the parent element appears
/// - On subsequent pages, the content is displayed normally
/// - Useful in conjunction with decorations that repeat on every page
/// - Combine with ShowOnce for sophisticated first-page/continuation layouts
///
/// Properties:
/// - child (LayoutNode, optional): The child content to skip on first page
///
/// Use Cases:
/// - Showing "Continued" labels on subsequent pages
/// - Displaying condensed headers on continuation pages
/// - Creating glossary layouts where the term shows "(continued)" on subsequent pages
/// - Professional multi-page document headers with continuation indicators
///
/// Example JSON (Show "Continued" on subsequent pages):
/// <code>
/// {
///   "type": "SkipOnce",
///   "child": {
///     "type": "Text",
///     "content": " (continued)",
///     "style": { "fontStyle": "italic" }
///   }
/// }
/// </code>
///
/// Example combining ShowOnce and SkipOnce for glossary term:
/// <code>
/// {
///   "type": "Decoration",
///   "before": {
///     "type": "DefaultTextStyle",
///     "style": { "fontSize": 24, "fontWeight": "bold", "color": "#1565C0" },
///     "child": {
///       "type": "Column",
///       "children": [
///         {
///           "type": "ShowOnce",
///           "child": { "type": "Text", "content": "Repository" }
///         },
///         {
///           "type": "SkipOnce",
///           "child": {
///             "type": "Text",
///             "spans": [
///               { "text": "Repository" },
///               { "text": " (continued)", "style": { "fontWeight": "normal", "fontStyle": "italic" } }
///             ]
///           }
///         }
///       ]
///     }
///   },
///   "content": {
///     "type": "Text",
///     "content": "A centralized storage location for source code..."
///   }
/// }
/// </code>
///
/// Complete example for multi-page glossary:
/// <code>
/// {
///   "type": "Column",
///   "spacing": 15,
///   "children": [
///     {
///       "type": "ForEach",
///       "source": "{{ data.terms }}",
///       "itemVariable": "term",
///       "child": {
///         "type": "Decoration",
///         "before": {
///           "type": "Column",
///           "children": [
///             { "type": "ShowOnce", "child": { "type": "Text", "content": "{{ term.name }}" } },
///             {
///               "type": "SkipOnce",
///               "child": {
///                 "type": "Text",
///                 "content": "{{ term.name }} (continued)"
///               }
///             }
///           ]
///         },
///         "content": { "type": "Text", "content": "{{ term.definition }}" }
///       }
///     }
///   ]
/// }
/// </code>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="SkipOnceRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class SkipOnceRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<SkipOnceRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.SkipOnce;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.FlowControl;

    /// <summary>
    /// SkipOnce supports a single child element as the content to skip on first page.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// SkipOnce is a wrapper that wraps its child content with skip-once behavior.
    /// </summary>
    public override bool IsWrapper => true;

    /// <summary>
    /// SkipOnce does not require expression evaluation as it has no dynamic properties.
    /// </summary>
    public override bool RequiresExpressionEvaluation => false;

    /// <summary>
    /// SkipOnce passes style inheritance to its child.
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
        Logger.LogTrace("Rendering SkipOnce for node {NodeId}", node.Id ?? "unnamed");

        // Apply SkipOnce to hide content on first page but show on subsequent pages
        // This is useful for "continued" labels, condensed headers on continuation pages,
        // or any content that should only appear after the first page
        container
            .SkipOnce()
            .Element(innerContainer =>
            {
                // Render child using the base class helper method
                RenderChild(innerContainer, node, context, layoutEngine);
            });

        Logger.LogDebug("SkipOnce rendered successfully for node {NodeId}", node.Id ?? "unnamed");
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // SkipOnce has no required properties
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
                    Message = "SkipOnce component has no child. The component will have no effect.",
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
                        "SkipOnce component does not support 'children' array. "
                        + "Use 'child' property instead. Only the first child will be rendered.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
