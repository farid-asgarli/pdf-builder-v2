using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.FlowControl;

/// <summary>
/// Renders an EnsureSpace component that ensures minimum vertical space is available
/// before rendering its child content. If the required space is not available,
/// the content is moved to the next page.
/// </summary>
/// <remarks>
/// QuestPDF EnsureSpace API:
/// - container.EnsureSpace(minHeight) - Ensures minimum space before rendering content
///
/// Behavior:
/// - If there is enough space, the content is rendered as usual
/// - If a page break is required, ensures minimum space is available before rendering
/// - This rule applies only to the first page where the content appears
/// - If content spans multiple pages, subsequent pages render without this restriction
///
/// Properties:
/// - minHeight (float, required): The minimum height in points required before rendering
/// - child (LayoutNode, optional): The child content to render with space guarantee
///
/// Use Cases:
/// - Preventing tables from starting too close to page bottom
/// - Ensuring section headers have adequate space below them
/// - Improving readability by avoiding small content fragments at page breaks
///
/// Example JSON:
/// <code>
/// {
///   "type": "EnsureSpace",
///   "minHeight": 100,
///   "child": {
///     "type": "Table",
///     "columns": [...],
///     "rows": [...]
///   }
/// }
/// </code>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="EnsureSpaceRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class EnsureSpaceRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<EnsureSpaceRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// The default minimum height in points when not specified.
    /// </summary>
    private const float DefaultMinHeight = 50f;

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.EnsureSpace;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.FlowControl;

    /// <summary>
    /// EnsureSpace supports a single child element to wrap with space guarantee.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// EnsureSpace is a wrapper that wraps its child content with space constraints.
    /// </summary>
    public override bool IsWrapper => true;

    /// <summary>
    /// EnsureSpace may use expressions for the minHeight property.
    /// </summary>
    public override bool RequiresExpressionEvaluation => true;

    /// <summary>
    /// EnsureSpace passes style inheritance to its child.
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
        // Get the minimum height with expression evaluation
        var minHeight =
            EvaluateFloatProperty(node, "minHeight", context, DefaultMinHeight) ?? DefaultMinHeight;

        Logger.LogTrace(
            "Rendering EnsureSpace for node {NodeId} with minHeight={MinHeight}pt",
            node.Id ?? "unnamed",
            minHeight
        );

        // Apply EnsureSpace constraint
        container
            .EnsureSpace(minHeight)
            .Element(innerContainer =>
            {
                // Render child using the base class helper method
                RenderChild(innerContainer, node, context, layoutEngine);
            });

        Logger.LogDebug(
            "EnsureSpace rendered successfully for node {NodeId} with minHeight={MinHeight}pt",
            node.Id ?? "unnamed",
            minHeight
        );
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // minHeight has a default value, so nothing is strictly required
        return Enumerable.Empty<string>();
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            ["minHeight"] = DefaultMinHeight,
            ["child"] = null,
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate minHeight if present
        if (node.HasProperty("minHeight"))
        {
            var minHeightValue = node.GetFloatProperty("minHeight");
            if (minHeightValue.HasValue && minHeightValue.Value <= 0)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = "minHeight",
                        Message = "Property 'minHeight' must be greater than 0.",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
        }

        // Warn if using children instead of child
        if (node.Children is not null && node.Children.Count > 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "children",
                    Message =
                        "EnsureSpace component uses 'child' not 'children'. Only the first child will be used.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
