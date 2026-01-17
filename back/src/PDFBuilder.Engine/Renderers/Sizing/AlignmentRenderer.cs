using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Sizing;

/// <summary>
/// Renders an Alignment wrapper component that controls the positioning of its child content.
/// Supports 9 alignment positions combining horizontal and vertical options.
/// </summary>
/// <remarks>
/// QuestPDF Alignment API:
/// Horizontal:
/// - AlignLeft() - Aligns content horizontally to the left side.
/// - AlignCenter() - Aligns content horizontally to the center.
/// - AlignRight() - Aligns content horizontally to the right side.
///
/// Vertical:
/// - AlignTop() - Aligns content vertically to the top.
/// - AlignMiddle() - Aligns content vertically to the center.
/// - AlignBottom() - Aligns content vertically to the bottom.
///
/// Properties:
/// - horizontal (string): Horizontal alignment: "left", "center", "right". Default: none (no horizontal alignment).
/// - vertical (string): Vertical alignment: "top", "middle", "bottom". Default: none (no vertical alignment).
/// - position (string): Combined position shorthand: "topLeft", "topCenter", "topRight",
///                      "middleLeft", "middleCenter", "middleRight",
///                      "bottomLeft", "bottomCenter", "bottomRight".
///                      Overrides horizontal and vertical if specified.
///
/// Note: Alignment can be applied horizontally, vertically, or both. When using
/// the position shorthand, both horizontal and vertical alignment are set together.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="AlignmentRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class AlignmentRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<AlignmentRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Horizontal = "horizontal";
        public const string Vertical = "vertical";
        public const string Position = "position";
    }

    /// <summary>
    /// Horizontal alignment options.
    /// </summary>
    private enum HorizontalAlignment
    {
        /// <summary>
        /// No horizontal alignment (content uses default positioning).
        /// </summary>
        None,

        /// <summary>
        /// Align content to the left.
        /// </summary>
        Left,

        /// <summary>
        /// Align content to the center horizontally.
        /// </summary>
        Center,

        /// <summary>
        /// Align content to the right.
        /// </summary>
        Right,
    }

    /// <summary>
    /// Vertical alignment options.
    /// </summary>
    private enum VerticalAlignment
    {
        /// <summary>
        /// No vertical alignment (content uses default positioning).
        /// </summary>
        None,

        /// <summary>
        /// Align content to the top.
        /// </summary>
        Top,

        /// <summary>
        /// Align content to the middle vertically.
        /// </summary>
        Middle,

        /// <summary>
        /// Align content to the bottom.
        /// </summary>
        Bottom,
    }

    /// <summary>
    /// Combined position presets for the 9 alignment positions.
    /// </summary>
    private enum AlignmentPosition
    {
        /// <summary>
        /// No preset position.
        /// </summary>
        None,

        /// <summary>
        /// Top-left corner.
        /// </summary>
        TopLeft,

        /// <summary>
        /// Top-center.
        /// </summary>
        TopCenter,

        /// <summary>
        /// Top-right corner.
        /// </summary>
        TopRight,

        /// <summary>
        /// Middle-left (vertically centered, left aligned).
        /// </summary>
        MiddleLeft,

        /// <summary>
        /// Middle-center (centered both horizontally and vertically).
        /// </summary>
        MiddleCenter,

        /// <summary>
        /// Middle-right (vertically centered, right aligned).
        /// </summary>
        MiddleRight,

        /// <summary>
        /// Bottom-left corner.
        /// </summary>
        BottomLeft,

        /// <summary>
        /// Bottom-center.
        /// </summary>
        BottomCenter,

        /// <summary>
        /// Bottom-right corner.
        /// </summary>
        BottomRight,
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Alignment;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Sizing;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.Horizontal, null },
            { PropertyNames.Vertical, null },
            { PropertyNames.Position, null },
        };
    }

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        // Extract alignment properties with expression evaluation
        var position = EvaluateEnumProperty(
            node,
            PropertyNames.Position,
            context,
            AlignmentPosition.None
        );

        HorizontalAlignment horizontal;
        VerticalAlignment vertical;

        // If position is specified, use it to determine both horizontal and vertical
        if (position != AlignmentPosition.None)
        {
            (horizontal, vertical) = GetAlignmentFromPosition(position);
        }
        else
        {
            // Use individual horizontal and vertical properties
            horizontal = EvaluateEnumProperty(
                node,
                PropertyNames.Horizontal,
                context,
                HorizontalAlignment.None
            );
            vertical = EvaluateEnumProperty(
                node,
                PropertyNames.Vertical,
                context,
                VerticalAlignment.None
            );
        }

        // Log if no alignment is specified
        if (horizontal == HorizontalAlignment.None && vertical == VerticalAlignment.None)
        {
            Logger.LogWarning(
                "No alignment specified for node {NodeId}, rendering child without alignment",
                node.Id ?? "unnamed"
            );
            RenderChild(container, node, context, layoutEngine);
            return;
        }

        Logger.LogTrace(
            "Rendering Alignment with horizontal={Horizontal}, vertical={Vertical}",
            horizontal,
            vertical
        );

        // Apply alignment to container
        IContainer alignedContainer = ApplyAlignment(container, horizontal, vertical);

        // Render the child content
        RenderChild(alignedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Gets the horizontal and vertical alignment from a combined position preset.
    /// </summary>
    /// <param name="position">The position preset.</param>
    /// <returns>A tuple of horizontal and vertical alignment.</returns>
    private static (
        HorizontalAlignment Horizontal,
        VerticalAlignment Vertical
    ) GetAlignmentFromPosition(AlignmentPosition position)
    {
        return position switch
        {
            AlignmentPosition.TopLeft => (HorizontalAlignment.Left, VerticalAlignment.Top),
            AlignmentPosition.TopCenter => (HorizontalAlignment.Center, VerticalAlignment.Top),
            AlignmentPosition.TopRight => (HorizontalAlignment.Right, VerticalAlignment.Top),
            AlignmentPosition.MiddleLeft => (HorizontalAlignment.Left, VerticalAlignment.Middle),
            AlignmentPosition.MiddleCenter => (
                HorizontalAlignment.Center,
                VerticalAlignment.Middle
            ),
            AlignmentPosition.MiddleRight => (HorizontalAlignment.Right, VerticalAlignment.Middle),
            AlignmentPosition.BottomLeft => (HorizontalAlignment.Left, VerticalAlignment.Bottom),
            AlignmentPosition.BottomCenter => (
                HorizontalAlignment.Center,
                VerticalAlignment.Bottom
            ),
            AlignmentPosition.BottomRight => (HorizontalAlignment.Right, VerticalAlignment.Bottom),
            _ => (HorizontalAlignment.None, VerticalAlignment.None),
        };
    }

    /// <summary>
    /// Applies horizontal and vertical alignment to a container.
    /// </summary>
    /// <param name="container">The container to apply alignment to.</param>
    /// <param name="horizontal">The horizontal alignment.</param>
    /// <param name="vertical">The vertical alignment.</param>
    /// <returns>The aligned container.</returns>
    private static IContainer ApplyAlignment(
        IContainer container,
        HorizontalAlignment horizontal,
        VerticalAlignment vertical
    )
    {
        // QuestPDF allows chaining of alignment methods
        // Order doesn't matter - we apply vertical first, then horizontal

        IContainer result = container;

        // Apply vertical alignment
        result = vertical switch
        {
            VerticalAlignment.Top => result.AlignTop(),
            VerticalAlignment.Middle => result.AlignMiddle(),
            VerticalAlignment.Bottom => result.AlignBottom(),
            _ => result,
        };

        // Apply horizontal alignment
        result = horizontal switch
        {
            HorizontalAlignment.Left => result.AlignLeft(),
            HorizontalAlignment.Center => result.AlignCenter(),
            HorizontalAlignment.Right => result.AlignRight(),
            _ => result,
        };

        return result;
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate position if specified
        var position = node.GetStringProperty(PropertyNames.Position);
        if (
            position is not null
            && !Enum.TryParse<AlignmentPosition>(position, ignoreCase: true, out _)
        )
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Position,
                    Message =
                        $"Invalid position: '{position}'. Valid values are: topLeft, topCenter, topRight, "
                        + "middleLeft, middleCenter, middleRight, bottomLeft, bottomCenter, bottomRight",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate horizontal if specified
        var horizontal = node.GetStringProperty(PropertyNames.Horizontal);
        if (
            horizontal is not null
            && !Enum.TryParse<HorizontalAlignment>(horizontal, ignoreCase: true, out _)
        )
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Horizontal,
                    Message =
                        $"Invalid horizontal alignment: '{horizontal}'. Valid values are: left, center, right",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate vertical if specified
        var vertical = node.GetStringProperty(PropertyNames.Vertical);
        if (
            vertical is not null
            && !Enum.TryParse<VerticalAlignment>(vertical, ignoreCase: true, out _)
        )
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Vertical,
                    Message =
                        $"Invalid vertical alignment: '{vertical}'. Valid values are: top, middle, bottom",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Warn if both position and individual alignments are specified
        if (position is not null && (horizontal is not null || vertical is not null))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Position,
                    Message =
                        "Both 'position' and individual alignment properties are specified. "
                        + "The 'position' property will take precedence.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Warn if no alignment is specified at all
        if (position is null && horizontal is null && vertical is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "alignment",
                    Message =
                        "No alignment specified. Specify 'position' or at least one of 'horizontal'/'vertical'.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
