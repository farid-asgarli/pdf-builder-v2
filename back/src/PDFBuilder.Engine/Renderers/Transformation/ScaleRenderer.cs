using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Transformation;

/// <summary>
/// Renders a Scale wrapper component that applies scaling transformation to its child content.
/// Supports uniform scaling (proportional) and non-uniform scaling (horizontal/vertical separately).
/// </summary>
/// <remarks>
/// QuestPDF Scale API:
/// - Scale(factor) - Scales content proportionally. Values greater than 1 enlarge, less than 1 reduce.
/// - ScaleHorizontal(factor) - Scales only the horizontal space (X axis), causing content to appear expanded or squished.
/// - ScaleVertical(factor) - Scales only the vertical space (Y axis), causing content to appear expanded or squished.
///
/// Properties:
/// - factor (float): The uniform scale factor. 1.0 = no change, 1.5 = 50% larger, 0.5 = 50% smaller.
/// - horizontal (float): Optional horizontal scale factor. Overrides uniform scaling for X axis.
/// - vertical (float): Optional vertical scale factor. Overrides uniform scaling for Y axis.
/// - type (string): The scale type: "uniform" (default), "horizontal", or "vertical".
///
/// Note: Scaling affects all content inside the container proportionally, including text, images, padding, etc.
/// Some elements like images may retain their size if using specific scaling settings.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ScaleRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ScaleRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ScaleRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Factor = "factor";
        public const string Horizontal = "horizontal";
        public const string Vertical = "vertical";
        public const string Type = "type";
    }

    /// <summary>
    /// Scale type options.
    /// </summary>
    private enum ScaleType
    {
        /// <summary>
        /// Uniform proportional scaling.
        /// </summary>
        Uniform,

        /// <summary>
        /// Horizontal scaling only.
        /// </summary>
        Horizontal,

        /// <summary>
        /// Vertical scaling only.
        /// </summary>
        Vertical,

        /// <summary>
        /// Non-uniform scaling with separate X and Y factors.
        /// </summary>
        NonUniform,
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Scale;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Transformation;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // No required properties - defaults to 1.0 (no scaling)
        yield break;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.Factor, 1.0f },
            { PropertyNames.Horizontal, null },
            { PropertyNames.Vertical, null },
            { PropertyNames.Type, "uniform" },
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
        // Extract scale properties with expression evaluation
        var scaleType = EvaluateEnumProperty(node, PropertyNames.Type, context, ScaleType.Uniform);
        var factor = EvaluateFloatProperty(node, PropertyNames.Factor, context, 1.0f) ?? 1.0f;
        var horizontal = EvaluateFloatProperty(node, PropertyNames.Horizontal, context);
        var vertical = EvaluateFloatProperty(node, PropertyNames.Vertical, context);

        // Determine effective scale type based on provided properties
        if (horizontal.HasValue && vertical.HasValue)
        {
            scaleType = ScaleType.NonUniform;
        }
        else if (horizontal.HasValue && !vertical.HasValue)
        {
            scaleType = ScaleType.Horizontal;
        }
        else if (vertical.HasValue && !horizontal.HasValue)
        {
            scaleType = ScaleType.Vertical;
        }

        Logger.LogTrace(
            "Rendering Scale with type={Type}, factor={Factor}, horizontal={Horizontal}, vertical={Vertical}",
            scaleType,
            factor,
            horizontal,
            vertical
        );

        // Apply scaling based on type
        IContainer scaledContainer = ApplyScaling(
            container,
            scaleType,
            factor,
            horizontal,
            vertical
        );

        // Render the child content
        RenderChild(scaledContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies scaling transformation to the container.
    /// </summary>
    /// <param name="container">The container to scale.</param>
    /// <param name="scaleType">The type of scaling to apply.</param>
    /// <param name="factor">The uniform scale factor.</param>
    /// <param name="horizontal">The horizontal scale factor (optional).</param>
    /// <param name="vertical">The vertical scale factor (optional).</param>
    /// <returns>The scaled container.</returns>
    private IContainer ApplyScaling(
        IContainer container,
        ScaleType scaleType,
        float factor,
        float? horizontal,
        float? vertical
    )
    {
        return scaleType switch
        {
            ScaleType.Uniform => ApplyUniformScale(container, factor),
            ScaleType.Horizontal => container.ScaleHorizontal(horizontal ?? factor),
            ScaleType.Vertical => container.ScaleVertical(vertical ?? factor),
            ScaleType.NonUniform => ApplyNonUniformScale(
                container,
                horizontal ?? factor,
                vertical ?? factor
            ),
            _ => container.Scale(factor),
        };
    }

    /// <summary>
    /// Applies uniform proportional scaling.
    /// </summary>
    /// <param name="container">The container to scale.</param>
    /// <param name="factor">The scale factor.</param>
    /// <returns>The scaled container.</returns>
    private IContainer ApplyUniformScale(IContainer container, float factor)
    {
        // Skip scaling if factor is essentially 1.0
        if (Math.Abs(factor - 1.0f) < 0.001f)
        {
            Logger.LogTrace("Scale factor is 1.0, skipping scaling");
            return container;
        }

        return container.Scale(factor);
    }

    /// <summary>
    /// Applies non-uniform scaling with separate horizontal and vertical factors.
    /// </summary>
    /// <param name="container">The container to scale.</param>
    /// <param name="horizontalFactor">The horizontal scale factor.</param>
    /// <param name="verticalFactor">The vertical scale factor.</param>
    /// <returns>The scaled container.</returns>
    private static IContainer ApplyNonUniformScale(
        IContainer container,
        float horizontalFactor,
        float verticalFactor
    )
    {
        // Apply both horizontal and vertical scaling
        return container.ScaleHorizontal(horizontalFactor).ScaleVertical(verticalFactor);
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate type is valid
        var type = node.GetStringProperty(PropertyNames.Type);
        if (type is not null && !Enum.TryParse<ScaleType>(type, ignoreCase: true, out _))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Type,
                    Message =
                        $"Invalid scale type: '{type}'. Valid values are: uniform, horizontal, vertical, nonuniform",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate factor is positive
        var factor = node.GetFloatProperty(PropertyNames.Factor);
        if (factor is not null && factor <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Factor,
                    Message = $"Scale factor must be positive, got: {factor}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate horizontal factor is positive
        var horizontal = node.GetFloatProperty(PropertyNames.Horizontal);
        if (horizontal is not null && horizontal <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Horizontal,
                    Message = $"Horizontal scale factor must be positive, got: {horizontal}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate vertical factor is positive
        var vertical = node.GetFloatProperty(PropertyNames.Vertical);
        if (vertical is not null && vertical <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Vertical,
                    Message = $"Vertical scale factor must be positive, got: {vertical}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        return errors;
    }
}
