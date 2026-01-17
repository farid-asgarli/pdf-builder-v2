using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Styling;

/// <summary>
/// Renders a RoundedCorners wrapper component that applies rounded corners to its child content.
/// Supports uniform corner radius and per-corner radius specifications.
/// </summary>
/// <remarks>
/// QuestPDF Rounded Corners API:
/// - CornerRadius(value) - Uniform corner radius on all corners
/// - CornerRadiusTopLeft(value) - Top-left corner radius only
/// - CornerRadiusTopRight(value) - Top-right corner radius only
/// - CornerRadiusBottomLeft(value) - Bottom-left corner radius only
/// - CornerRadiusBottomRight(value) - Bottom-right corner radius only
///
/// Properties:
/// - all (float): Uniform corner radius on all corners in points. Overridden by specific corner properties.
/// - topLeft (float): Top-left corner radius in points.
/// - topRight (float): Top-right corner radius in points.
/// - bottomLeft (float): Bottom-left corner radius in points.
/// - bottomRight (float): Bottom-right corner radius in points.
///
/// All radius values must be non-negative. A value of 0 means no rounding for that corner.
/// The child property must contain a single child node to wrap.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="RoundedCornersRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class RoundedCornersRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<RoundedCornersRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string All = "all";
        public const string TopLeft = "topLeft";
        public const string TopRight = "topRight";
        public const string BottomLeft = "bottomLeft";
        public const string BottomRight = "bottomRight";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.RoundedCorners;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Styling;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        // Extract corner radius properties with expression evaluation
        var all = EvaluateFloatProperty(node, PropertyNames.All, context);
        var topLeft = EvaluateFloatProperty(node, PropertyNames.TopLeft, context);
        var topRight = EvaluateFloatProperty(node, PropertyNames.TopRight, context);
        var bottomLeft = EvaluateFloatProperty(node, PropertyNames.BottomLeft, context);
        var bottomRight = EvaluateFloatProperty(node, PropertyNames.BottomRight, context);

        // Resolve effective corner radius values with priority:
        // Individual corners > all > 0
        var effectiveTopLeft = EnsureNonNegative(topLeft ?? all);
        var effectiveTopRight = EnsureNonNegative(topRight ?? all);
        var effectiveBottomLeft = EnsureNonNegative(bottomLeft ?? all);
        var effectiveBottomRight = EnsureNonNegative(bottomRight ?? all);

        Logger.LogTrace(
            "Rendering RoundedCorners with topLeft={TopLeft}, topRight={TopRight}, bottomLeft={BottomLeft}, bottomRight={BottomRight}",
            effectiveTopLeft,
            effectiveTopRight,
            effectiveBottomLeft,
            effectiveBottomRight
        );

        // Apply rounded corners using the appropriate QuestPDF method
        IContainer roundedContainer = ApplyRoundedCorners(
            container,
            effectiveTopLeft,
            effectiveTopRight,
            effectiveBottomLeft,
            effectiveBottomRight
        );

        // Render the child content
        RenderChild(roundedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies rounded corners to a container using the most efficient QuestPDF method.
    /// </summary>
    /// <param name="container">The container to apply rounded corners to.</param>
    /// <param name="topLeft">Top-left corner radius.</param>
    /// <param name="topRight">Top-right corner radius.</param>
    /// <param name="bottomLeft">Bottom-left corner radius.</param>
    /// <param name="bottomRight">Bottom-right corner radius.</param>
    /// <returns>The container with rounded corners applied.</returns>
    private static IContainer ApplyRoundedCorners(
        IContainer container,
        float topLeft,
        float topRight,
        float bottomLeft,
        float bottomRight
    )
    {
        // Check if there's no rounding to apply
        if (topLeft == 0f && topRight == 0f && bottomLeft == 0f && bottomRight == 0f)
        {
            return container;
        }

        // Check if all corners are equal for uniform rounding
        if (topLeft == topRight && topRight == bottomLeft && bottomLeft == bottomRight)
        {
            return container.CornerRadius(topLeft);
        }

        // Apply individual corner radii
        IContainer result = container;

        if (topLeft > 0f)
        {
            result = result.CornerRadiusTopLeft(topLeft);
        }

        if (topRight > 0f)
        {
            result = result.CornerRadiusTopRight(topRight);
        }

        if (bottomLeft > 0f)
        {
            result = result.CornerRadiusBottomLeft(bottomLeft);
        }

        if (bottomRight > 0f)
        {
            result = result.CornerRadiusBottomRight(bottomRight);
        }

        return result;
    }

    /// <summary>
    /// Ensures a value is non-negative, returning 0 if null or negative.
    /// </summary>
    /// <param name="value">The value to check.</param>
    /// <returns>The non-negative value or 0.</returns>
    private static float EnsureNonNegative(float? value)
    {
        return value.HasValue && value.Value > 0 ? value.Value : 0f;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.All, null },
            { PropertyNames.TopLeft, null },
            { PropertyNames.TopRight, null },
            { PropertyNames.BottomLeft, null },
            { PropertyNames.BottomRight, null },
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate that at least one corner radius property is specified
        var hasAnyRadius =
            node.HasProperty(PropertyNames.All)
            || node.HasProperty(PropertyNames.TopLeft)
            || node.HasProperty(PropertyNames.TopRight)
            || node.HasProperty(PropertyNames.BottomLeft)
            || node.HasProperty(PropertyNames.BottomRight);

        if (!hasAnyRadius)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.All,
                    Message =
                        "At least one corner radius property (all, topLeft, topRight, bottomLeft, bottomRight) should be specified",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate corner radius values are non-negative
        ValidateCornerRadius(node, PropertyNames.All, errors);
        ValidateCornerRadius(node, PropertyNames.TopLeft, errors);
        ValidateCornerRadius(node, PropertyNames.TopRight, errors);
        ValidateCornerRadius(node, PropertyNames.BottomLeft, errors);
        ValidateCornerRadius(node, PropertyNames.BottomRight, errors);

        // Validate that wrapper has a child
        if (node.Child is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message = "RoundedCorners wrapper must have a child element",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }

    /// <summary>
    /// Validates that a corner radius property is non-negative.
    /// </summary>
    /// <param name="node">The layout node.</param>
    /// <param name="propertyName">The property name to validate.</param>
    /// <param name="errors">The list to add validation errors to.</param>
    private static void ValidateCornerRadius(
        LayoutNode node,
        string propertyName,
        List<ComponentValidationError> errors
    )
    {
        var value = node.GetFloatProperty(propertyName);
        if (value.HasValue && value.Value < 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = propertyName,
                    Message =
                        $"Corner radius '{propertyName}' must be non-negative, got {value.Value}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }
    }
}
