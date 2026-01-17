using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Transformation;

/// <summary>
/// Renders a Flip wrapper component that creates mirror images of its child content.
/// Supports horizontal, vertical, and combined (over) flipping.
/// </summary>
/// <remarks>
/// QuestPDF Flip API:
/// - FlipHorizontal() - Creates a mirror image along the Y axis (left becomes right).
/// - FlipVertical() - Creates a mirror image along the X axis (top becomes bottom).
/// - FlipOver() - Creates a mirror image across both axes (top-left becomes bottom-right).
///
/// Properties:
/// - direction (string): The flip direction: "horizontal", "vertical", or "over" (both). Required.
/// - horizontal (bool): Flip horizontally. Default: false.
/// - vertical (bool): Flip vertically. Default: false.
///
/// You can use either the 'direction' property for single-axis flipping, or combine
/// 'horizontal' and 'vertical' boolean properties for fine-grained control.
///
/// Note: Flipping affects all visual content within the container. For text, this creates
/// mirror-image text that can be used for special effects or printing on transparent materials.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="FlipRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class FlipRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<FlipRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Direction = "direction";
        public const string Horizontal = "horizontal";
        public const string Vertical = "vertical";
    }

    /// <summary>
    /// Flip direction options.
    /// </summary>
    private enum FlipDirection
    {
        /// <summary>
        /// No explicit direction - use boolean properties.
        /// </summary>
        None,

        /// <summary>
        /// Mirror along Y axis (left-right swap).
        /// </summary>
        Horizontal,

        /// <summary>
        /// Mirror along X axis (top-bottom swap).
        /// </summary>
        Vertical,

        /// <summary>
        /// Mirror along both axes (diagonal swap).
        /// </summary>
        Over,
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Flip;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Transformation;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // No required properties - can use direction or boolean properties
        yield break;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.Direction, null },
            { PropertyNames.Horizontal, false },
            { PropertyNames.Vertical, false },
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
        // Extract flip properties with expression evaluation
        var direction = EvaluateEnumProperty(
            node,
            PropertyNames.Direction,
            context,
            FlipDirection.None
        );
        var flipHorizontal =
            EvaluateBoolProperty(node, PropertyNames.Horizontal, context, false) ?? false;
        var flipVertical =
            EvaluateBoolProperty(node, PropertyNames.Vertical, context, false) ?? false;

        // Determine effective flip operations based on direction or boolean properties
        var (effectiveHorizontal, effectiveVertical) = DetermineEffectiveFlip(
            direction,
            flipHorizontal,
            flipVertical
        );

        Logger.LogTrace(
            "Rendering Flip with direction={Direction}, horizontal={Horizontal}, vertical={Vertical}",
            direction,
            effectiveHorizontal,
            effectiveVertical
        );

        // Apply flip transformation
        IContainer flippedContainer = ApplyFlip(container, effectiveHorizontal, effectiveVertical);

        // Render the child content
        RenderChild(flippedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Determines the effective horizontal and vertical flip settings based on direction or boolean properties.
    /// </summary>
    /// <param name="direction">The flip direction.</param>
    /// <param name="horizontal">The horizontal flip boolean.</param>
    /// <param name="vertical">The vertical flip boolean.</param>
    /// <returns>A tuple of (flipHorizontal, flipVertical) booleans.</returns>
    private static (bool horizontal, bool vertical) DetermineEffectiveFlip(
        FlipDirection direction,
        bool horizontal,
        bool vertical
    )
    {
        // If direction is specified, use it to determine flip
        return direction switch
        {
            FlipDirection.Horizontal => (true, false),
            FlipDirection.Vertical => (false, true),
            FlipDirection.Over => (true, true),
            FlipDirection.None => (horizontal, vertical), // Use boolean properties
            _ => (horizontal, vertical),
        };
    }

    /// <summary>
    /// Applies flip transformation to the container.
    /// </summary>
    /// <param name="container">The container to flip.</param>
    /// <param name="horizontal">Whether to flip horizontally.</param>
    /// <param name="vertical">Whether to flip vertically.</param>
    /// <returns>The flipped container.</returns>
    private IContainer ApplyFlip(IContainer container, bool horizontal, bool vertical)
    {
        // No flip needed
        if (!horizontal && !vertical)
        {
            Logger.LogTrace("No flip direction specified, skipping flip transformation");
            return container;
        }

        // Both horizontal and vertical = FlipOver
        if (horizontal && vertical)
        {
            return container.FlipOver();
        }

        // Horizontal only
        if (horizontal)
        {
            return container.FlipHorizontal();
        }

        // Vertical only
        return container.FlipVertical();
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate direction is valid if specified
        var direction = node.GetStringProperty(PropertyNames.Direction);
        if (
            direction is not null
            && !Enum.TryParse<FlipDirection>(direction, ignoreCase: true, out _)
        )
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Direction,
                    Message =
                        $"Invalid flip direction: '{direction}'. Valid values are: horizontal, vertical, over",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Check that at least one flip property is specified
        var hasDirection = direction is not null;
        var hasHorizontal = node.HasProperty(PropertyNames.Horizontal);
        var hasVertical = node.HasProperty(PropertyNames.Vertical);

        if (!hasDirection && !hasHorizontal && !hasVertical)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Direction,
                    Message =
                        "At least one flip property must be specified: 'direction', 'horizontal', or 'vertical'",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
