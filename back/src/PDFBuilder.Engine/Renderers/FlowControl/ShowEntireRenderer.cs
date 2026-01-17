using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.FlowControl;

/// <summary>
/// Renders a ShowEntire component that ensures its child content remains on a single page,
/// preventing it from being split across multiple pages.
/// </summary>
/// <remarks>
/// QuestPDF ShowEntire API:
/// - container.ShowEntire() - Ensures content is not split across pages
///
/// Behavior:
/// - Content is kept together on a single page
/// - If content doesn't fit on the current page, it moves to the next page
/// - Imposes strict space constraints - content must fit within a single page
/// - May throw DocumentLayoutException if content exceeds page capacity
///
/// Properties:
/// - child (LayoutNode, optional): The child content to keep together
///
/// Use Cases:
/// - Keeping glossary terms and definitions together
/// - Ensuring table rows stay together
/// - Maintaining visual cohesiveness for grouped content
/// - Preventing awkward content breaks in structured data
///
/// WARNING:
/// The ShowEntire element imposes strict space constraints. If the enclosed content
/// exceeds the page's capacity, it may cause a DocumentLayoutException. Ensure that
/// the content fits within a single page. Consider using EnsureSpace for a less strict
/// alternative that maintains visual consistency without hard page constraints.
///
/// Example JSON:
/// <code>
/// {
///   "type": "ShowEntire",
///   "child": {
///     "type": "Column",
///     "children": [
///       { "type": "Text", "content": "Term:", "style": { "fontWeight": "bold" } },
///       { "type": "Text", "content": "Definition of the term goes here..." }
///     ]
///   }
/// }
/// </code>
///
/// Usage in a glossary:
/// <code>
/// {
///   "type": "Column",
///   "spacing": 15,
///   "children": [
///     {
///       "type": "ShowEntire",
///       "child": {
///         "type": "Text",
///         "content": "Function - A reusable block of code..."
///       }
///     },
///     {
///       "type": "ShowEntire",
///       "child": {
///         "type": "Text",
///         "content": "Recursion - A programming technique..."
///       }
///     }
///   ]
/// }
/// </code>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ShowEntireRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ShowEntireRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ShowEntireRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.ShowEntire;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.FlowControl;

    /// <summary>
    /// ShowEntire supports a single child element to keep together.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// ShowEntire is a wrapper that wraps its child content with page constraints.
    /// </summary>
    public override bool IsWrapper => true;

    /// <summary>
    /// ShowEntire does not require expression evaluation as it has no dynamic properties.
    /// </summary>
    public override bool RequiresExpressionEvaluation => false;

    /// <summary>
    /// ShowEntire passes style inheritance to its child.
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
        Logger.LogTrace("Rendering ShowEntire for node {NodeId}", node.Id ?? "unnamed");

        // Apply ShowEntire constraint to keep content on a single page
        container
            .ShowEntire()
            .Element(innerContainer =>
            {
                // Render child using the base class helper method
                RenderChild(innerContainer, node, context, layoutEngine);
            });

        Logger.LogDebug("ShowEntire rendered successfully for node {NodeId}", node.Id ?? "unnamed");
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // ShowEntire has no required properties
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
                        "ShowEntire component has no child. The component will have no effect.",
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
                        "ShowEntire component uses 'child' not 'children'. Only the 'child' property will be used.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Info warning about potential layout exceptions
        if (node.Child is not null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message =
                        "ShowEntire imposes strict page constraints. Ensure the child content fits within a single page to avoid DocumentLayoutException.",
                    Severity = ValidationSeverity.Info,
                }
            );
        }

        return errors;
    }
}
