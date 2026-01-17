using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Sizing;

/// <summary>
/// Renders a Shrink wrapper component that renders its content in the most
/// compact size achievable.
/// </summary>
/// <remarks>
/// QuestPDF Shrink API:
/// - Shrink() - Shrinks both vertically and horizontally.
/// - ShrinkVertical() - Minimizes content height to the minimum.
/// - ShrinkHorizontal() - Minimizes content width to the minimum.
///
/// Properties:
/// - direction (string): Shrink direction: "both" (default), "vertical", "horizontal".
///
/// Use Cases:
/// - Ideal for situations where the parent element provides more space than necessary.
/// - Wrapping content to its natural minimum size.
/// - Creating compact layouts within larger containers.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ShrinkRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ShrinkRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ShrinkRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Direction = "direction";
    }

    /// <summary>
    /// Shrink direction options.
    /// </summary>
    private enum ShrinkDirection
    {
        /// <summary>
        /// Shrink in both directions (width and height). Default.
        /// </summary>
        Both,

        /// <summary>
        /// Shrink only vertically (minimize height).
        /// </summary>
        Vertical,

        /// <summary>
        /// Shrink only horizontally (minimize width).
        /// </summary>
        Horizontal,
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Shrink;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Sizing;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // No required properties - direction has a default value
        return Enumerable.Empty<string>();
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?> { { PropertyNames.Direction, "both" } };
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
        // Extract shrink direction with expression evaluation
        var direction = EvaluateEnumProperty(
            node,
            PropertyNames.Direction,
            context,
            ShrinkDirection.Both
        );

        Logger.LogTrace("Rendering Shrink with direction={Direction}", direction);

        // Apply shrink based on direction
        var shrunkContainer = ApplyShrink(container, direction);

        // Render the child content
        RenderChild(shrunkContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies the shrink modifier to the container based on the direction.
    /// </summary>
    /// <param name="container">The container to apply the shrink to.</param>
    /// <param name="direction">The shrink direction.</param>
    /// <returns>The shrunk container.</returns>
    private static IContainer ApplyShrink(IContainer container, ShrinkDirection direction)
    {
        return direction switch
        {
            ShrinkDirection.Both => container.Shrink(),
            ShrinkDirection.Vertical => container.ShrinkVertical(),
            ShrinkDirection.Horizontal => container.ShrinkHorizontal(),
            _ => container.Shrink(),
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate direction is valid
        var direction = node.GetStringProperty(PropertyNames.Direction);
        if (
            direction is not null
            && !Enum.TryParse<ShrinkDirection>(direction, ignoreCase: true, out _)
        )
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Direction,
                    Message =
                        $"Invalid shrink direction: '{direction}'. Valid values are: both, vertical, horizontal",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        return errors;
    }
}
