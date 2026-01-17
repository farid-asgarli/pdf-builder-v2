using System.Text.Json;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Containers;

/// <summary>
/// Renders a Row container component that arranges children horizontally.
/// Supports spacing between items, different item types (constant, relative, auto), and proper paging functionality.
/// </summary>
/// <remarks>
/// QuestPDF Row API: container.Row(row => { row.ConstantItem(), row.RelativeItem(), row.AutoItem() })
///
/// Properties:
/// - spacing (float): Horizontal space between items in points. Default: 0
/// - shrinkVertical (bool): If true, items shrink to content height instead of matching tallest item. Default: false
///
/// Child Properties (on each child node):
/// - itemType (string): "constant", "relative", or "auto". Default: "relative"
/// - size (float): Width for constant items (points) or weight for relative items. Default: 100 for constant, 1 for relative.
///
/// Children are rendered horizontally from left to right.
/// Content flows naturally across multiple pages when needed.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="RowRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class RowRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<RowRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Spacing = "spacing";
        public const string ShrinkVertical = "shrinkVertical";

        // Child-level properties
        public const string ItemType = "itemType";
        public const string Size = "size";
    }

    /// <summary>
    /// Supported item types for row children.
    /// </summary>
    private static class ItemTypes
    {
        public const string Constant = "constant";
        public const string Relative = "relative";
        public const string Auto = "auto";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Row;

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
        // Extract row-level properties with expression evaluation
        var spacing = EvaluateFloatProperty(node, PropertyNames.Spacing, context, 0f);
        var shrinkVertical = EvaluateBoolProperty(
            node,
            PropertyNames.ShrinkVertical,
            context,
            false
        );

        Logger.LogTrace(
            "Rendering Row with spacing={Spacing}, shrinkVertical={ShrinkVertical}, children={ChildCount}",
            spacing,
            shrinkVertical,
            node.Children?.Count ?? 0
        );

        container.Row(row =>
        {
            // Apply spacing between items if specified
            if (spacing.HasValue && spacing.Value > 0)
            {
                row.Spacing(spacing.Value);
            }

            // Render each child as a row item
            if (node.Children is not null && node.Children.Count > 0)
            {
                for (var i = 0; i < node.Children.Count; i++)
                {
                    var child = node.Children[i];
                    RenderRowItem(row, child, context, layoutEngine, shrinkVertical == true, i);
                }
            }
            else
            {
                Logger.LogDebug(
                    "Row node {NodeId} has no children to render",
                    node.Id ?? "unnamed"
                );
            }
        });
    }

    /// <summary>
    /// Renders a single row item based on its configuration.
    /// </summary>
    /// <param name="row">The QuestPDF row descriptor.</param>
    /// <param name="child">The child layout node.</param>
    /// <param name="context">The render context.</param>
    /// <param name="layoutEngine">The layout engine for rendering.</param>
    /// <param name="shrinkVertical">Whether to apply vertical shrinking.</param>
    /// <param name="index">The index of the child for logging.</param>
    private void RenderRowItem(
        RowDescriptor row,
        LayoutNode child,
        RenderContext context,
        ILayoutEngine layoutEngine,
        bool shrinkVertical,
        int index
    )
    {
        // Get item type from child properties (default to relative)
        var itemType = GetChildPropertyString(child, PropertyNames.ItemType, ItemTypes.Relative);
        var size = GetChildPropertyFloat(child, PropertyNames.Size, context);

        Logger.LogTrace(
            "Rendering Row item {Index} with type={ItemType}, size={Size}",
            index,
            itemType,
            size
        );

        // Create the appropriate row item based on type
        switch (itemType.ToLowerInvariant())
        {
            case ItemTypes.Constant:
                var constantWidth = size ?? 100f; // Default width for constant items
                row.ConstantItem(constantWidth)
                    .Element(itemContainer =>
                    {
                        RenderItemContent(
                            itemContainer,
                            child,
                            context,
                            layoutEngine,
                            shrinkVertical
                        );
                    });
                break;

            case ItemTypes.Auto:
                row.AutoItem()
                    .Element(itemContainer =>
                    {
                        RenderItemContent(
                            itemContainer,
                            child,
                            context,
                            layoutEngine,
                            shrinkVertical
                        );
                    });
                break;

            case ItemTypes.Relative:
            default:
                var weight = size ?? 1f; // Default weight for relative items
                row.RelativeItem(weight)
                    .Element(itemContainer =>
                    {
                        RenderItemContent(
                            itemContainer,
                            child,
                            context,
                            layoutEngine,
                            shrinkVertical
                        );
                    });
                break;
        }
    }

    /// <summary>
    /// Renders the content of a row item with optional vertical shrinking.
    /// </summary>
    private static void RenderItemContent(
        IContainer itemContainer,
        LayoutNode child,
        RenderContext context,
        ILayoutEngine layoutEngine,
        bool shrinkVertical
    )
    {
        var targetContainer = shrinkVertical ? itemContainer.ShrinkVertical() : itemContainer;
        layoutEngine.Render(targetContainer, child, context);
    }

    /// <summary>
    /// Gets a string property from a child node's properties.
    /// </summary>
    private static string GetChildPropertyString(
        LayoutNode child,
        string propertyName,
        string defaultValue
    )
    {
        if (
            child.Properties is null
            || !child.Properties.TryGetValue(propertyName, out var element)
        )
        {
            return defaultValue;
        }

        return element.ValueKind == JsonValueKind.String
            ? element.GetString() ?? defaultValue
            : defaultValue;
    }

    /// <summary>
    /// Gets a float property from a child node's properties with expression evaluation.
    /// </summary>
    private float? GetChildPropertyFloat(
        LayoutNode child,
        string propertyName,
        RenderContext context
    )
    {
        if (
            child.Properties is null
            || !child.Properties.TryGetValue(propertyName, out var element)
        )
        {
            return null;
        }

        if (element.ValueKind == JsonValueKind.Number)
        {
            return element.GetSingle();
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            var stringValue = element.GetString();
            if (string.IsNullOrEmpty(stringValue))
            {
                return null;
            }

            // Try expression evaluation
            if (stringValue.Contains("{{") && stringValue.Contains("}}"))
            {
                try
                {
                    var evaluated = ExpressionEvaluator.EvaluateString(stringValue, context);
                    if (float.TryParse(evaluated, out var result))
                    {
                        return result;
                    }
                }
                catch
                {
                    // Fall through to float.TryParse
                }
            }

            return float.TryParse(stringValue, out var parsed) ? parsed : null;
        }

        return null;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            [PropertyNames.Spacing] = 0f,
            [PropertyNames.ShrinkVertical] = false,
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

        // Validate child item configurations
        if (node.Children is not null)
        {
            for (var i = 0; i < node.Children.Count; i++)
            {
                var child = node.Children[i];
                var itemType = GetChildPropertyString(
                    child,
                    PropertyNames.ItemType,
                    ItemTypes.Relative
                );

                if (
                    !string.Equals(itemType, ItemTypes.Constant, StringComparison.OrdinalIgnoreCase)
                    && !string.Equals(
                        itemType,
                        ItemTypes.Relative,
                        StringComparison.OrdinalIgnoreCase
                    )
                    && !string.Equals(itemType, ItemTypes.Auto, StringComparison.OrdinalIgnoreCase)
                )
                {
                    errors.Add(
                        new ComponentValidationError
                        {
                            PropertyName = $"children[{i}].{PropertyNames.ItemType}",
                            Message =
                                $"Invalid item type '{itemType}'. Must be 'constant', 'relative', or 'auto'",
                            Severity = ValidationSeverity.Error,
                        }
                    );
                }

                // Validate size for constant items
                if (string.Equals(itemType, ItemTypes.Constant, StringComparison.OrdinalIgnoreCase))
                {
                    if (
                        child.Properties is not null
                        && child.Properties.TryGetValue(PropertyNames.Size, out var sizeElement)
                    )
                    {
                        if (sizeElement.ValueKind == JsonValueKind.Number)
                        {
                            var size = sizeElement.GetSingle();
                            if (size <= 0)
                            {
                                errors.Add(
                                    new ComponentValidationError
                                    {
                                        PropertyName = $"children[{i}].{PropertyNames.Size}",
                                        Message =
                                            $"Constant item size must be positive, got {size}",
                                        Severity = ValidationSeverity.Error,
                                    }
                                );
                            }
                        }
                    }
                }
            }
        }

        // Warn if Row has no children (valid but likely unintended)
        if (node.Children is null || node.Children.Count == 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "children",
                    Message = "Row component has no children - this will render empty content",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
