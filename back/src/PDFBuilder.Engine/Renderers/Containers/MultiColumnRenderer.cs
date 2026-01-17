using System.Text.Json;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Containers;

/// <summary>
/// Renders a MultiColumn container component that arranges content into vertical columns,
/// similar to newspaper or magazine formatting.
/// </summary>
/// <remarks>
/// QuestPDF MultiColumn API: container.MultiColumn(multiColumn => { multiColumn.Columns(3); multiColumn.Content()... })
///
/// Properties:
/// - columns (int): Number of vertical columns. Default: 2
/// - spacing (float): Horizontal space between adjacent columns in points. Default: 0
/// - balanceHeight (bool): When true, distributes content so columns have similar heights. Default: false
/// - content (LayoutNode): Required. The main content to be distributed across columns.
/// - spacer (LayoutNode): Optional. Visual element placed between columns (e.g., vertical line divider).
///
/// The MultiColumn component is designed for:
/// - Newspaper-style article layouts
/// - Magazine formatting
/// - Optimizing horizontal space usage
/// - Enhancing readability for wide containers
///
/// WARNING: Multi-column layouts require significant computational resources,
/// which may impact performance for large documents.
///
/// Common use cases:
/// - Multi-column text articles
/// - Side-by-side content comparison
/// - Compact data presentation
/// - Print-style document layouts
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="MultiColumnRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class MultiColumnRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<MultiColumnRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        /// <summary>
        /// Number of columns to create.
        /// </summary>
        public const string Columns = "columns";

        /// <summary>
        /// Horizontal spacing between columns.
        /// </summary>
        public const string Spacing = "spacing";

        /// <summary>
        /// Whether to balance column heights.
        /// </summary>
        public const string BalanceHeight = "balanceHeight";

        /// <summary>
        /// The main content layout node.
        /// </summary>
        public const string Content = "content";

        /// <summary>
        /// The spacer layout node (visual divider between columns).
        /// </summary>
        public const string Spacer = "spacer";
    }

    /// <summary>
    /// Default number of columns.
    /// </summary>
    private const int DefaultColumnCount = 2;

    /// <summary>
    /// Minimum allowed column count.
    /// </summary>
    private const int MinColumnCount = 1;

    /// <summary>
    /// Maximum allowed column count (for performance reasons).
    /// </summary>
    private const int MaxColumnCount = 12;

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.MultiColumn;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Container;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

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
        var columnCount = EvaluateIntProperty(
            node,
            PropertyNames.Columns,
            context,
            DefaultColumnCount
        );
        var spacing = EvaluateFloatProperty(node, PropertyNames.Spacing, context, 0f);
        var balanceHeight = EvaluateBoolProperty(node, PropertyNames.BalanceHeight, context, false);

        // Clamp column count to valid range
        var effectiveColumnCount = Math.Clamp(
            columnCount ?? DefaultColumnCount,
            MinColumnCount,
            MaxColumnCount
        );

        if (
            columnCount.HasValue
            && (columnCount.Value < MinColumnCount || columnCount.Value > MaxColumnCount)
        )
        {
            Logger.LogWarning(
                "Column count {Requested} is outside valid range [{Min}-{Max}], using {Effective}",
                columnCount.Value,
                MinColumnCount,
                MaxColumnCount,
                effectiveColumnCount
            );
        }

        // Extract content and spacer nodes from properties
        var contentNode = GetLayoutNodeProperty(node, PropertyNames.Content);
        var spacerNode = GetLayoutNodeProperty(node, PropertyNames.Spacer);

        // Validate content is present
        if (contentNode is null)
        {
            Logger.LogWarning(
                "MultiColumn node {NodeId} has no content section defined. Nothing will be rendered.",
                node.Id ?? "unnamed"
            );
            return;
        }

        Logger.LogTrace(
            "Rendering MultiColumn with columns={Columns}, spacing={Spacing}, balanceHeight={BalanceHeight}, hasSpacer={HasSpacer}",
            effectiveColumnCount,
            spacing ?? 0f,
            balanceHeight ?? false,
            spacerNode is not null
        );

        container.MultiColumn(multiColumn =>
        {
            // Set column count
            multiColumn.Columns(effectiveColumnCount);

            // Apply spacing between columns
            if (spacing.HasValue && spacing.Value > 0)
            {
                multiColumn.Spacing(spacing.Value);
            }

            // Apply balance height if enabled
            if (balanceHeight == true)
            {
                multiColumn.BalanceHeight();
            }

            // Render spacer if provided
            if (spacerNode is not null)
            {
                multiColumn
                    .Spacer()
                    .Element(spacerContainer =>
                    {
                        layoutEngine.Render(spacerContainer, spacerNode, context);
                    });
            }

            // Render content
            multiColumn
                .Content()
                .Element(contentContainer =>
                {
                    layoutEngine.Render(contentContainer, contentNode, context);
                });
        });
    }

    /// <summary>
    /// Gets a LayoutNode from a property.
    /// </summary>
    /// <param name="node">The parent node.</param>
    /// <param name="propertyName">The property name.</param>
    /// <returns>The LayoutNode or null if not found.</returns>
    private LayoutNode? GetLayoutNodeProperty(LayoutNode node, string propertyName)
    {
        if (node.Properties is null || !node.Properties.TryGetValue(propertyName, out var element))
        {
            return null;
        }

        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return element.Deserialize<LayoutNode>(options);
        }
        catch (JsonException ex)
        {
            Logger.LogWarning(
                ex,
                "Failed to deserialize {PropertyName} property as LayoutNode for node {NodeId}",
                propertyName,
                node.Id ?? "unnamed"
            );
            return null;
        }
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        return [PropertyNames.Content];
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            [PropertyNames.Columns] = DefaultColumnCount,
            [PropertyNames.Spacing] = 0f,
            [PropertyNames.BalanceHeight] = false,
            [PropertyNames.Spacer] = null,
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate content section is present
        if (!node.HasProperty(PropertyNames.Content))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Content,
                    Message =
                        "MultiColumn component requires a 'content' property containing the main content layout",
                    Severity = ValidationSeverity.Error,
                }
            );
        }
        else
        {
            // Validate that content is a valid LayoutNode
            var contentNode = GetLayoutNodeProperty(node, PropertyNames.Content);
            if (contentNode is null)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.Content,
                        Message = "MultiColumn 'content' property must be a valid layout node",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
        }

        // Validate columns is within valid range if specified
        var columns = node.GetIntProperty(PropertyNames.Columns);
        if (columns.HasValue)
        {
            if (columns.Value < MinColumnCount)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.Columns,
                        Message =
                            $"Column count must be at least {MinColumnCount}, got {columns.Value}",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
            else if (columns.Value > MaxColumnCount)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.Columns,
                        Message =
                            $"Column count exceeds maximum of {MaxColumnCount}, got {columns.Value}. "
                            + "Large column counts may significantly impact performance.",
                        Severity = ValidationSeverity.Warning,
                    }
                );
            }
        }

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

        // Validate spacer if present
        if (node.HasProperty(PropertyNames.Spacer))
        {
            var spacerNode = GetLayoutNodeProperty(node, PropertyNames.Spacer);
            if (spacerNode is null)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.Spacer,
                        Message = "MultiColumn 'spacer' property must be a valid layout node",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
        }

        // Add performance warning for multi-column layouts
        if (columns.HasValue && columns.Value > 4)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Columns,
                    Message =
                        "Multi-column layouts with many columns may significantly impact performance. "
                        + "Consider using fewer columns for better performance.",
                    Severity = ValidationSeverity.Info,
                }
            );
        }

        return errors;
    }
}
