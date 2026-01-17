using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Containers;

/// <summary>
/// Renders a Column container component that stacks children vertically.
/// Supports spacing between items and proper paging functionality.
/// </summary>
/// <remarks>
/// QuestPDF Column API: container.Column(col => { col.Item()... })
///
/// Properties:
/// - spacing (float): Vertical space between items in points. Default: 0
/// - shrinkHorizontal (bool): If true, items shrink to content width instead of matching widest item. Default: false
///
/// Children are rendered vertically from top to bottom.
/// Content flows naturally across multiple pages when needed.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ColumnRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ColumnRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ColumnRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Spacing = "spacing";
        public const string ShrinkHorizontal = "shrinkHorizontal";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Column;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Container;

    /// <inheritdoc />
    public override bool SupportsChildren => true;

    /// <inheritdoc />
    public override bool IsWrapper => false;

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        // Extract properties with expression evaluation
        var spacing = EvaluateFloatProperty(node, PropertyNames.Spacing, context, 0f);
        var shrinkHorizontal = EvaluateBoolProperty(
            node,
            PropertyNames.ShrinkHorizontal,
            context,
            false
        );

        Logger.LogTrace(
            "Rendering Column with spacing={Spacing}, shrinkHorizontal={ShrinkHorizontal}, children={ChildCount}",
            spacing,
            shrinkHorizontal,
            node.Children?.Count ?? 0
        );

        container.Column(column =>
        {
            // Apply spacing between items if specified
            if (spacing.HasValue && spacing.Value > 0)
            {
                column.Spacing(spacing.Value);
            }

            // Render each child as a column item
            if (node.Children is not null && node.Children.Count > 0)
            {
                foreach (var child in node.Children)
                {
                    column
                        .Item()
                        .Element(itemContainer =>
                        {
                            // Apply shrink horizontal if enabled
                            var targetContainer =
                                shrinkHorizontal == true
                                    ? itemContainer.ShrinkHorizontal()
                                    : itemContainer;

                            // Render the child into the column item
                            layoutEngine.Render(targetContainer, child, context);
                        });
                }
            }
            else
            {
                Logger.LogDebug(
                    "Column node {NodeId} has no children to render",
                    node.Id ?? "unnamed"
                );
            }
        });
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            [PropertyNames.Spacing] = 0f,
            [PropertyNames.ShrinkHorizontal] = false,
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate spacing is non-negative if specified
        var spacing = node.GetFloatProperty(PropertyNames.Spacing);
        if (spacing.HasValue && spacing.Value < 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Spacing,
                    Message = $"Spacing must be non-negative, got {spacing.Value}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Warn if Column has no children (valid but likely unintended)
        if (node.Children is null || node.Children.Count == 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "children",
                    Message = "Column component has no children - this will render empty content",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
