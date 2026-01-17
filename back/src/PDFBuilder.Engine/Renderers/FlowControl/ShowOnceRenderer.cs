using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.FlowControl;

/// <summary>
/// Renders a ShowOnce component that ensures its content is displayed only on the first page
/// where the parent element appears. On subsequent pages, the content is hidden.
/// </summary>
/// <remarks>
/// QuestPDF ShowOnce API:
/// - container.ShowOnce() - Renders the content only on the first occurrence
///
/// Behavior:
/// - Content is displayed on the first page where the parent element appears
/// - On subsequent pages, the content is hidden/skipped
/// - Useful in conjunction with decorations that repeat on every page
/// - Combine with SkipOnce for sophisticated first-page/continuation layouts
///
/// Properties:
/// - child (LayoutNode, optional): The child content to show only once
///
/// Use Cases:
/// - Showing a detailed header only on the first page
/// - Displaying a logo or company information only once
/// - Creating invoice headers with full details on first page, condensed on subsequent pages
/// - Professional document layouts with first-page specific content
///
/// Example JSON (Show detailed header once):
/// <code>
/// {
///   "type": "ShowOnce",
///   "child": {
///     "type": "Row",
///     "children": [
///       {
///         "type": "ConstantColumn",
///         "size": 80,
///         "child": { "type": "Placeholder" }
///       },
///       {
///         "type": "ConstantColumn",
///         "size": 10
///       },
///       {
///         "type": "Column",
///         "children": [
///           { "type": "Text", "content": "Invoice #1234", "style": { "fontSize": 24, "fontWeight": "bold" } },
///           { "type": "Text", "content": "Generated on {{ data.date }}", "style": { "fontSize": 16 } }
///         ]
///       }
///     ]
///   }
/// }
/// </code>
///
/// Example combining ShowOnce and SkipOnce for invoice header:
/// <code>
/// {
///   "type": "Decoration",
///   "before": {
///     "type": "Column",
///     "children": [
///       {
///         "type": "ShowOnce",
///         "child": {
///           "type": "Row",
///           "children": [
///             { "type": "Image", "source": "logo.png" },
///             {
///               "type": "Column",
///               "children": [
///                 { "type": "Text", "content": "Invoice #1234", "style": { "fontSize": 24, "fontWeight": "bold" } },
///                 { "type": "Text", "content": "Date: {{ data.invoiceDate }}" }
///               ]
///             }
///           ]
///         }
///       },
///       {
///         "type": "SkipOnce",
///         "child": { "type": "Text", "content": "Invoice #1234", "style": { "fontSize": 24, "fontWeight": "bold" } }
///       }
///     ]
///   },
///   "content": {
///     "type": "Table",
///     "children": [ ... invoice line items ... ]
///   }
/// }
/// </code>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ShowOnceRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ShowOnceRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ShowOnceRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.ShowOnce;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.FlowControl;

    /// <summary>
    /// ShowOnce supports a single child element as the content to show once.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// ShowOnce is a wrapper that wraps its child content with show-once behavior.
    /// </summary>
    public override bool IsWrapper => true;

    /// <summary>
    /// ShowOnce does not require expression evaluation as it has no dynamic properties.
    /// </summary>
    public override bool RequiresExpressionEvaluation => false;

    /// <summary>
    /// ShowOnce passes style inheritance to its child.
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
        Logger.LogTrace("Rendering ShowOnce for node {NodeId}", node.Id ?? "unnamed");

        // Apply ShowOnce to ensure content appears only on the first page
        // This is useful for detailed headers, logos, or information that
        // should not repeat on subsequent pages
        container
            .ShowOnce()
            .Element(innerContainer =>
            {
                // Render child using the base class helper method
                RenderChild(innerContainer, node, context, layoutEngine);
            });

        Logger.LogDebug("ShowOnce rendered successfully for node {NodeId}", node.Id ?? "unnamed");
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // ShowOnce has no required properties
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
                    Message = "ShowOnce component has no child. The component will have no effect.",
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
                        "ShowOnce component does not support 'children' array. "
                        + "Use 'child' property instead. Only the first child will be rendered.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
