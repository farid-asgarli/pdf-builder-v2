using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Special;

/// <summary>
/// Renders a ZIndex component that controls the layer stacking order of content.
/// By default, the library draws content in the order it is defined; this component allows
/// altering the rendering order to ensure content is displayed in the correct visual sequence.
/// </summary>
/// <remarks>
/// QuestPDF ZIndex API:
/// - container.ZIndex(value) - Sets the z-index for the content
///
/// Properties:
/// - value (int): The z-index value. Default: 0. Higher values are rendered above lower values.
/// - child (LayoutNode, optional): The child content to apply z-index to.
///
/// Z-Index Behavior:
/// - The default z-index is 0, unless a different value is inherited from a parent container
/// - Higher values are rendered above (on top of) lower values
/// - Negative values are valid and will render below elements with z-index 0
/// - Z-index only affects elements within the same stacking context (parent container)
///
/// Common Use Cases:
/// - Creating visually appealing pricing tables with elevated/highlighted sections
/// - Overlapping elements that need specific visual ordering
/// - Pop-out effects where content appears to float above surroundings
/// - Card-style layouts with shadow overlaps
/// - Header/footer elements that need to appear above content
///
/// Example JSON (Pricing table with highlighted middle option):
/// <code>
/// {
///   "type": "Row",
///   "children": [
///     {
///       "type": "Background",
///       "color": "#DDDDDD",
///       "child": { "type": "Text", "content": "Basic\n$99" }
///     },
///     {
///       "type": "ZIndex",
///       "value": 1,
///       "child": {
///         "type": "Padding",
///         "top": -15,
///         "child": {
///           "type": "Border",
///           "thickness": 1,
///           "color": "#000000",
///           "child": {
///             "type": "Background",
///             "color": "#AAAAAA",
///             "child": {
///               "type": "Padding",
///               "top": 15,
///               "child": { "type": "Text", "content": "Professional\n$699" }
///             }
///           }
///         }
///       }
///     },
///     {
///       "type": "Background",
///       "color": "#DDDDDD",
///       "child": { "type": "Text", "content": "Enterprise\n$1999" }
///     }
///   ]
/// }
/// </code>
///
/// Example JSON (Card with elevated effect):
/// <code>
/// {
///   "type": "Layers",
///   "children": [
///     {
///       "type": "ZIndex",
///       "value": 0,
///       "child": {
///         "type": "Background",
///         "color": "#EEEEEE",
///         "child": { "type": "Placeholder" }
///       }
///     },
///     {
///       "type": "ZIndex",
///       "value": 1,
///       "child": {
///         "type": "Padding",
///         "all": 20,
///         "child": {
///           "type": "Shadow",
///           "blur": 10,
///           "child": {
///             "type": "Background",
///             "color": "#FFFFFF",
///             "child": { "type": "Text", "content": "Elevated Card" }
///           }
///         }
///       }
///     }
///   ]
/// }
/// </code>
///
/// Visual Behavior:
/// - Z-Index 0: Default rendering order (first defined = first drawn)
/// - Z-Index 1+: Renders above default elements
/// - Z-Index -1 or lower: Renders below default elements
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ZIndexRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ZIndexRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ZIndexRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Value = "value";
    }

    /// <summary>
    /// Default z-index value.
    /// </summary>
    private const int DefaultZIndex = 0;

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.ZIndex;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Special;

    /// <summary>
    /// ZIndex supports a single child element.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// ZIndex is a wrapper that wraps its child with z-index stacking order.
    /// </summary>
    public override bool IsWrapper => true;

    /// <summary>
    /// ZIndex requires expression evaluation for the value property.
    /// </summary>
    public override bool RequiresExpressionEvaluation => true;

    /// <summary>
    /// ZIndex passes style inheritance to its child.
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
        // Get the z-index value with expression evaluation
        var zIndex =
            EvaluateIntProperty(node, PropertyNames.Value, context, DefaultZIndex) ?? DefaultZIndex;

        Logger.LogTrace(
            "Rendering ZIndex with value={ZIndex} for node {NodeId}",
            zIndex,
            node.Id ?? "unnamed"
        );

        // Apply z-index to the container using QuestPDF's API
        // Higher values are rendered above lower values
        var zIndexContainer = container.ZIndex(zIndex);

        // Render the child content with the applied z-index
        RenderChild(zIndexContainer, node, context, layoutEngine);
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?> { { PropertyNames.Value, DefaultZIndex } };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate z-index value if provided
        if (node.HasProperty(PropertyNames.Value))
        {
            var value = node.GetIntProperty(PropertyNames.Value);

            // Provide guidance for extreme values
            if (value.HasValue)
            {
                if (value.Value < -1000 || value.Value > 1000)
                {
                    errors.Add(
                        new ComponentValidationError
                        {
                            PropertyName = PropertyNames.Value,
                            Message =
                                $"Z-index value {value.Value} is unusually extreme. Consider using values between -100 and 100 for maintainability.",
                            Severity = ValidationSeverity.Info,
                        }
                    );
                }
            }
        }

        // Validate that wrapper has a child
        if (node.Child is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message =
                        "ZIndex wrapper must have a child element to apply stacking order to.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
