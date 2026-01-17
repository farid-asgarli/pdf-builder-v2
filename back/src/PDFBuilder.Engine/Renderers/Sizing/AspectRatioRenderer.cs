using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Sizing;

/// <summary>
/// Renders an AspectRatio wrapper component that constrains its content to maintain
/// a given width-to-height ratio.
/// </summary>
/// <remarks>
/// QuestPDF AspectRatio API:
/// - AspectRatio(ratio) - Constrains content to maintain the specified ratio.
/// - AspectRatio(ratio, AspectRatioOption) - Constrains with specific fitting option.
///
/// Properties:
/// - ratio (float): The width-to-height ratio (e.g., 16/9 = 1.7778). Required.
/// - option (string): Fitting option: "fitWidth" (default), "fitHeight", "fitArea".
///
/// Fitting Options:
/// - FitWidth: Adjusts content to occupy the full width available. Default.
/// - FitHeight: Adjusts content to fill the available height.
/// - FitArea: Adjusts content to fill the available area while maintaining ratio.
///
/// Warning: This component may try to enforce size constraints that are impossible
/// to meet. For example, the container may require more space than is available,
/// or may try to squeeze its child into less space than possible. Such scenarios
/// result in a layout exception.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="AspectRatioRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class AspectRatioRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<AspectRatioRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Ratio = "ratio";
        public const string Option = "option";
    }

    /// <summary>
    /// Aspect ratio fitting options.
    /// </summary>
    private enum FittingOption
    {
        /// <summary>
        /// Adjusts content to occupy the full width available. Default.
        /// </summary>
        FitWidth,

        /// <summary>
        /// Adjusts content to fill the available height.
        /// </summary>
        FitHeight,

        /// <summary>
        /// Adjusts content to fill the available area while maintaining aspect ratio.
        /// </summary>
        FitArea,
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.AspectRatio;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Sizing;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        yield return PropertyNames.Ratio;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?> { { PropertyNames.Option, "fitWidth" } };
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
        // Extract aspect ratio properties with expression evaluation
        var ratio = EvaluateFloatProperty(node, PropertyNames.Ratio, context);
        var fittingOption = EvaluateEnumProperty(
            node,
            PropertyNames.Option,
            context,
            FittingOption.FitWidth
        );

        if (ratio is null || ratio <= 0)
        {
            Logger.LogWarning(
                "AspectRatio ratio is null or non-positive for node {NodeId}, skipping constraint",
                node.Id ?? "unnamed"
            );
            RenderChild(container, node, context, layoutEngine);
            return;
        }

        Logger.LogTrace(
            "Rendering AspectRatio with ratio={Ratio}, option={Option}",
            ratio,
            fittingOption
        );

        // Apply aspect ratio constraint with fitting option
        var constrainedContainer = ApplyAspectRatio(container, ratio.Value, fittingOption);

        // Render the child content
        RenderChild(constrainedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies the aspect ratio constraint to the container.
    /// </summary>
    /// <param name="container">The container to apply the constraint to.</param>
    /// <param name="ratio">The width-to-height ratio.</param>
    /// <param name="option">The fitting option.</param>
    /// <returns>The constrained container.</returns>
    private static IContainer ApplyAspectRatio(
        IContainer container,
        float ratio,
        FittingOption option
    )
    {
        var questPdfOption = option switch
        {
            FittingOption.FitWidth => AspectRatioOption.FitWidth,
            FittingOption.FitHeight => AspectRatioOption.FitHeight,
            FittingOption.FitArea => AspectRatioOption.FitArea,
            _ => AspectRatioOption.FitWidth,
        };

        return container.AspectRatio(ratio, questPdfOption);
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate ratio is positive
        var ratio = node.GetFloatProperty(PropertyNames.Ratio);
        if (ratio is not null && ratio <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Ratio,
                    Message = $"AspectRatio ratio must be positive, got: {ratio}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate option is valid
        var option = node.GetStringProperty(PropertyNames.Option);
        if (option is not null && !Enum.TryParse<FittingOption>(option, ignoreCase: true, out _))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Option,
                    Message =
                        $"Invalid fitting option: '{option}'. Valid values are: fitWidth, fitHeight, fitArea",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        return errors;
    }
}
