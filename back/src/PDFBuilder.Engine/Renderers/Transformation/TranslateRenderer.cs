using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Transformation;

/// <summary>
/// Renders a Translate wrapper component that applies position offset to its child content.
/// Moves content horizontally and/or vertically relative to its original position.
/// </summary>
/// <remarks>
/// QuestPDF Translate API:
/// - TranslateX(value) - Moves content along the horizontal axis. Positive = right, negative = left.
/// - TranslateY(value) - Moves content along the vertical axis. Positive = down, negative = up.
///
/// Properties:
/// - x (float): Horizontal offset in points. Positive moves right, negative moves left. Default: 0.
/// - y (float): Vertical offset in points. Positive moves down, negative moves up. Default: 0.
/// - unit (string): The unit of measurement: "pt" (default), "cm", "mm", "in".
///
/// Note: Translation does not alter the available space - the element maintains its original
/// size constraints while only shifting its visual position. This means translated content
/// may overlap with other elements or extend beyond the container boundaries.
///
/// Translate is commonly used in combination with Rotate to achieve rotation around a specific point.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="TranslateRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class TranslateRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<TranslateRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string X = "x";
        public const string Y = "y";
        public const string Unit = "unit";
    }

    /// <summary>
    /// Measurement unit types.
    /// </summary>
    private enum UnitType
    {
        /// <summary>
        /// Points (default).
        /// </summary>
        Pt,

        /// <summary>
        /// Centimeters.
        /// </summary>
        Cm,

        /// <summary>
        /// Millimeters.
        /// </summary>
        Mm,

        /// <summary>
        /// Inches.
        /// </summary>
        In,
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Translate;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Transformation;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // No required properties - defaults to (0, 0) if not specified
        yield break;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.X, 0f },
            { PropertyNames.Y, 0f },
            { PropertyNames.Unit, "pt" },
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
        // Extract translation properties with expression evaluation
        var x = EvaluateFloatProperty(node, PropertyNames.X, context, 0f) ?? 0f;
        var y = EvaluateFloatProperty(node, PropertyNames.Y, context, 0f) ?? 0f;
        var unit = EvaluateEnumProperty(node, PropertyNames.Unit, context, UnitType.Pt);

        // Convert to points if necessary
        var xPoints = ConvertToPoints(x, unit);
        var yPoints = ConvertToPoints(y, unit);

        Logger.LogTrace(
            "Rendering Translate with x={X}pt, y={Y}pt (original: {OriginalX}{Unit}, {OriginalY}{Unit})",
            xPoints,
            yPoints,
            x,
            unit.ToString().ToLowerInvariant(),
            y,
            unit.ToString().ToLowerInvariant()
        );

        // Apply translation - only apply if there's actual offset
        IContainer translatedContainer = ApplyTranslation(container, xPoints, yPoints);

        // Render the child content
        RenderChild(translatedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies translation transformation to the container.
    /// </summary>
    /// <param name="container">The container to translate.</param>
    /// <param name="x">The horizontal offset in points.</param>
    /// <param name="y">The vertical offset in points.</param>
    /// <returns>The translated container.</returns>
    private IContainer ApplyTranslation(IContainer container, float x, float y)
    {
        var hasXOffset = Math.Abs(x) > 0.001f;
        var hasYOffset = Math.Abs(y) > 0.001f;

        // Skip translation if no offset
        if (!hasXOffset && !hasYOffset)
        {
            Logger.LogTrace("No translation offset specified, skipping translation");
            return container;
        }

        // Apply X and Y translations as needed
        IContainer result = container;

        if (hasXOffset)
        {
            result = result.TranslateX(x);
        }

        if (hasYOffset)
        {
            result = result.TranslateY(y);
        }

        return result;
    }

    /// <summary>
    /// Converts a measurement value to points.
    /// </summary>
    /// <param name="value">The value to convert.</param>
    /// <param name="unit">The unit of the value.</param>
    /// <returns>The value in points.</returns>
    private static float ConvertToPoints(float value, UnitType unit)
    {
        return unit switch
        {
            UnitType.Pt => value,
            UnitType.Cm => value * 28.3465f, // 1 cm = 28.3465 pt
            UnitType.Mm => value * 2.83465f, // 1 mm = 2.83465 pt
            UnitType.In => value * 72f, // 1 inch = 72 pt
            _ => value,
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate x is a valid number
        var x = node.GetFloatProperty(PropertyNames.X);
        if (x is not null && (float.IsNaN(x.Value) || float.IsInfinity(x.Value)))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.X,
                    Message = "Translation X offset must be a valid number",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate y is a valid number
        var y = node.GetFloatProperty(PropertyNames.Y);
        if (y is not null && (float.IsNaN(y.Value) || float.IsInfinity(y.Value)))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Y,
                    Message = "Translation Y offset must be a valid number",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate unit is valid
        var unit = node.GetStringProperty(PropertyNames.Unit);
        if (unit is not null && !Enum.TryParse<UnitType>(unit, ignoreCase: true, out _))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Unit,
                    Message = $"Invalid unit: '{unit}'. Valid values are: pt, cm, mm, in",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        return errors;
    }
}
