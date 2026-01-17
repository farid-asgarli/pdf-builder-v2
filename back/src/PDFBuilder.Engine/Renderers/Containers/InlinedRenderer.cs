using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Containers;

/// <summary>
/// Renders an Inlined container component that arranges elements sequentially in a line,
/// automatically wrapping to the next line when needed.
/// </summary>
/// <remarks>
/// QuestPDF Inlined API: container.Inlined(inlined => { inlined.Item()... })
///
/// Properties:
/// - spacing (float): Sets both vertical and horizontal gaps between items in points. Default: 0
/// - verticalSpacing (float): Sets vertical gaps between items in points. Overrides 'spacing' for vertical. Default: 0
/// - horizontalSpacing (float): Sets horizontal gaps between items in points. Overrides 'spacing' for horizontal. Default: 0
/// - horizontalAlignment (string): Horizontal alignment of items. Values: "left", "center", "right", "justify", "spaceAround". Default: "left"
/// - baselineAlignment (string): Vertical baseline alignment of items. Values: "top", "middle", "bottom". Default: "top"
///
/// Children are rendered inline, flowing from left to right and wrapping to new lines as needed.
/// This is similar to how text flows in a paragraph.
///
/// Common use cases:
/// - Tag clouds or badge displays
/// - Flowing button groups
/// - Photo galleries with varying sizes
/// - Inline form elements
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="InlinedRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class InlinedRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<InlinedRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        /// <summary>
        /// Sets both vertical and horizontal spacing between items.
        /// </summary>
        public const string Spacing = "spacing";

        /// <summary>
        /// Sets vertical spacing between items (overrides Spacing for vertical).
        /// </summary>
        public const string VerticalSpacing = "verticalSpacing";

        /// <summary>
        /// Sets horizontal spacing between items (overrides Spacing for horizontal).
        /// </summary>
        public const string HorizontalSpacing = "horizontalSpacing";

        /// <summary>
        /// Horizontal alignment of items: left, center, right, justify, spaceAround.
        /// </summary>
        public const string HorizontalAlignment = "horizontalAlignment";

        /// <summary>
        /// Baseline alignment of items: top, middle, bottom.
        /// </summary>
        public const string BaselineAlignment = "baselineAlignment";
    }

    /// <summary>
    /// Supported horizontal alignment values.
    /// </summary>
    private static class HorizontalAlignmentValues
    {
        public const string Left = "left";
        public const string Center = "center";
        public const string Right = "right";
        public const string Justify = "justify";
        public const string SpaceAround = "spaceAround";
    }

    /// <summary>
    /// Supported baseline alignment values.
    /// </summary>
    private static class BaselineAlignmentValues
    {
        public const string Top = "top";
        public const string Middle = "middle";
        public const string Bottom = "bottom";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Inlined;

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
        // Extract spacing properties with expression evaluation
        var spacing = EvaluateFloatProperty(node, PropertyNames.Spacing, context, 0f);
        var verticalSpacing = EvaluateFloatProperty(node, PropertyNames.VerticalSpacing, context);
        var horizontalSpacing = EvaluateFloatProperty(
            node,
            PropertyNames.HorizontalSpacing,
            context
        );

        // Extract alignment properties
        var horizontalAlignment = EvaluateStringProperty(
            node,
            PropertyNames.HorizontalAlignment,
            context,
            HorizontalAlignmentValues.Left
        );
        var baselineAlignment = EvaluateStringProperty(
            node,
            PropertyNames.BaselineAlignment,
            context,
            BaselineAlignmentValues.Top
        );

        // Calculate effective spacing values
        var effectiveVerticalSpacing = verticalSpacing ?? spacing ?? 0f;
        var effectiveHorizontalSpacing = horizontalSpacing ?? spacing ?? 0f;

        Logger.LogTrace(
            "Rendering Inlined with verticalSpacing={VerticalSpacing}, horizontalSpacing={HorizontalSpacing}, "
                + "horizontalAlignment={HorizontalAlignment}, baselineAlignment={BaselineAlignment}, children={ChildCount}",
            effectiveVerticalSpacing,
            effectiveHorizontalSpacing,
            horizontalAlignment,
            baselineAlignment,
            node.Children?.Count ?? 0
        );

        container.Inlined(inlined =>
        {
            // Apply spacing
            ApplySpacing(inlined, effectiveVerticalSpacing, effectiveHorizontalSpacing);

            // Apply horizontal alignment
            ApplyHorizontalAlignment(inlined, horizontalAlignment);

            // Apply baseline alignment
            ApplyBaselineAlignment(inlined, baselineAlignment);

            // Render each child as an inlined item
            if (node.Children is not null && node.Children.Count > 0)
            {
                foreach (var child in node.Children)
                {
                    inlined
                        .Item()
                        .Element(itemContainer =>
                        {
                            layoutEngine.Render(itemContainer, child, context);
                        });
                }
            }
            else
            {
                Logger.LogDebug(
                    "Inlined node {NodeId} has no children to render",
                    node.Id ?? "unnamed"
                );
            }
        });
    }

    /// <summary>
    /// Applies spacing configuration to the inlined descriptor.
    /// </summary>
    /// <param name="inlined">The QuestPDF inlined descriptor.</param>
    /// <param name="verticalSpacing">The vertical spacing value.</param>
    /// <param name="horizontalSpacing">The horizontal spacing value.</param>
    private static void ApplySpacing(
        InlinedDescriptor inlined,
        float verticalSpacing,
        float horizontalSpacing
    )
    {
        // If both spacings are the same, use the combined Spacing method
        if (Math.Abs(verticalSpacing - horizontalSpacing) < 0.001f && verticalSpacing > 0)
        {
            inlined.Spacing(verticalSpacing);
        }
        else
        {
            // Apply individual spacing values
            if (verticalSpacing > 0)
            {
                inlined.VerticalSpacing(verticalSpacing);
            }

            if (horizontalSpacing > 0)
            {
                inlined.HorizontalSpacing(horizontalSpacing);
            }
        }
    }

    /// <summary>
    /// Applies horizontal alignment to the inlined descriptor.
    /// </summary>
    /// <param name="inlined">The QuestPDF inlined descriptor.</param>
    /// <param name="alignment">The horizontal alignment value.</param>
    private void ApplyHorizontalAlignment(InlinedDescriptor inlined, string? alignment)
    {
        switch (alignment?.ToLowerInvariant())
        {
            case HorizontalAlignmentValues.Left:
                inlined.AlignLeft();
                break;

            case HorizontalAlignmentValues.Center:
                inlined.AlignCenter();
                break;

            case HorizontalAlignmentValues.Right:
                inlined.AlignRight();
                break;

            case HorizontalAlignmentValues.Justify:
                inlined.AlignJustify();
                break;

            case HorizontalAlignmentValues.SpaceAround:
            case "space-around":
            case "spacearound":
                inlined.AlignSpaceAround();
                break;

            default:
                // Default to left alignment
                inlined.AlignLeft();
                if (!string.IsNullOrEmpty(alignment))
                {
                    Logger.LogWarning(
                        "Unknown horizontal alignment '{Alignment}', defaulting to 'left'",
                        alignment
                    );
                }
                break;
        }
    }

    /// <summary>
    /// Applies baseline alignment to the inlined descriptor.
    /// </summary>
    /// <param name="inlined">The QuestPDF inlined descriptor.</param>
    /// <param name="alignment">The baseline alignment value.</param>
    private void ApplyBaselineAlignment(InlinedDescriptor inlined, string? alignment)
    {
        switch (alignment?.ToLowerInvariant())
        {
            case BaselineAlignmentValues.Top:
                inlined.BaselineTop();
                break;

            case BaselineAlignmentValues.Middle:
                inlined.BaselineMiddle();
                break;

            case BaselineAlignmentValues.Bottom:
                inlined.BaselineBottom();
                break;

            default:
                // Default to top baseline
                inlined.BaselineTop();
                if (!string.IsNullOrEmpty(alignment))
                {
                    Logger.LogWarning(
                        "Unknown baseline alignment '{Alignment}', defaulting to 'top'",
                        alignment
                    );
                }
                break;
        }
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            [PropertyNames.Spacing] = 0f,
            [PropertyNames.VerticalSpacing] = null,
            [PropertyNames.HorizontalSpacing] = null,
            [PropertyNames.HorizontalAlignment] = HorizontalAlignmentValues.Left,
            [PropertyNames.BaselineAlignment] = BaselineAlignmentValues.Top,
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate spacing values are non-negative if specified
        ValidateNonNegativeProperty(
            node,
            PropertyNames.Spacing,
            errors,
            "Spacing must be non-negative"
        );
        ValidateNonNegativeProperty(
            node,
            PropertyNames.VerticalSpacing,
            errors,
            "Vertical spacing must be non-negative"
        );
        ValidateNonNegativeProperty(
            node,
            PropertyNames.HorizontalSpacing,
            errors,
            "Horizontal spacing must be non-negative"
        );

        // Validate horizontal alignment if specified
        var horizontalAlignment = node.GetStringProperty(PropertyNames.HorizontalAlignment);
        if (!string.IsNullOrEmpty(horizontalAlignment))
        {
            var validAlignments = new[]
            {
                HorizontalAlignmentValues.Left,
                HorizontalAlignmentValues.Center,
                HorizontalAlignmentValues.Right,
                HorizontalAlignmentValues.Justify,
                HorizontalAlignmentValues.SpaceAround,
                "space-around",
                "spacearound",
            };

            if (
                !validAlignments.Any(a =>
                    string.Equals(a, horizontalAlignment, StringComparison.OrdinalIgnoreCase)
                )
            )
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.HorizontalAlignment,
                        Message =
                            $"Invalid horizontal alignment '{horizontalAlignment}'. "
                            + "Valid values are: left, center, right, justify, spaceAround",
                        Severity = ValidationSeverity.Warning,
                    }
                );
            }
        }

        // Validate baseline alignment if specified
        var baselineAlignment = node.GetStringProperty(PropertyNames.BaselineAlignment);
        if (!string.IsNullOrEmpty(baselineAlignment))
        {
            var validBaselines = new[]
            {
                BaselineAlignmentValues.Top,
                BaselineAlignmentValues.Middle,
                BaselineAlignmentValues.Bottom,
            };

            if (
                !validBaselines.Any(b =>
                    string.Equals(b, baselineAlignment, StringComparison.OrdinalIgnoreCase)
                )
            )
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.BaselineAlignment,
                        Message =
                            $"Invalid baseline alignment '{baselineAlignment}'. "
                            + "Valid values are: top, middle, bottom",
                        Severity = ValidationSeverity.Warning,
                    }
                );
            }
        }

        // Warn if Inlined has no children (valid but likely unintended)
        if (node.Children is null || node.Children.Count == 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "children",
                    Message = "Inlined component has no children - this will render empty content",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }

    /// <summary>
    /// Validates that a property value is non-negative.
    /// </summary>
    private static void ValidateNonNegativeProperty(
        LayoutNode node,
        string propertyName,
        List<ComponentValidationError> errors,
        string message
    )
    {
        var value = node.GetFloatProperty(propertyName);
        if (value.HasValue && value.Value < 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = propertyName,
                    Message = $"{message}, got {value.Value}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }
    }
}
