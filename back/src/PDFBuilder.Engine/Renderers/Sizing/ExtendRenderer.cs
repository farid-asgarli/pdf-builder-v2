using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Sizing;

/// <summary>
/// Renders an Extend wrapper component that forces its content to occupy
/// the entire available space.
/// </summary>
/// <remarks>
/// QuestPDF Extend API:
/// - Extend() - Forces content to occupy entire available space (both width and height).
/// - ExtendVertical() - Forces content to occupy entire available vertical space.
/// - ExtendHorizontal() - Forces content to occupy entire available horizontal space.
///
/// Properties:
/// - direction (string): Extension direction: "both" (default), "vertical", "horizontal".
///
/// Use Cases:
/// - Making a child element fill its parent container completely.
/// - Creating full-width or full-height backgrounds.
/// - Ensuring content takes up all available space in a layout.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ExtendRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ExtendRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ExtendRenderer> logger
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
    /// Extension direction options.
    /// </summary>
    private enum ExtendDirection
    {
        /// <summary>
        /// Extend in both directions (width and height). Default.
        /// </summary>
        Both,

        /// <summary>
        /// Extend only vertically (maximize height).
        /// </summary>
        Vertical,

        /// <summary>
        /// Extend only horizontally (maximize width).
        /// </summary>
        Horizontal,
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Extend;

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
        // Extract extend direction with expression evaluation
        var direction = EvaluateEnumProperty(
            node,
            PropertyNames.Direction,
            context,
            ExtendDirection.Both
        );

        Logger.LogTrace("Rendering Extend with direction={Direction}", direction);

        // Apply extend based on direction
        var extendedContainer = ApplyExtend(container, direction);

        // Render the child content
        RenderChild(extendedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies the extend modifier to the container based on the direction.
    /// </summary>
    /// <param name="container">The container to apply the extend to.</param>
    /// <param name="direction">The extension direction.</param>
    /// <returns>The extended container.</returns>
    private static IContainer ApplyExtend(IContainer container, ExtendDirection direction)
    {
        return direction switch
        {
            ExtendDirection.Both => container.Extend(),
            ExtendDirection.Vertical => container.ExtendVertical(),
            ExtendDirection.Horizontal => container.ExtendHorizontal(),
            _ => container.Extend(),
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
            && !Enum.TryParse<ExtendDirection>(direction, ignoreCase: true, out _)
        )
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Direction,
                    Message =
                        $"Invalid extend direction: '{direction}'. Valid values are: both, vertical, horizontal",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        return errors;
    }
}
