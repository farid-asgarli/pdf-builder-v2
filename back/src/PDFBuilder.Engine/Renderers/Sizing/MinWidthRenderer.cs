using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Sizing;

/// <summary>
/// Renders a MinWidth wrapper component that applies a minimum width constraint to its child content.
/// </summary>
/// <remarks>
/// QuestPDF MinWidth API:
/// - MinWidth(value) - Sets the minimum width of its content.
///
/// Properties:
/// - value (float): The minimum width value in points. Required.
/// - unit (string): The unit of measurement: "pt" (default), "cm", "mm", "in".
///
/// Note: Be careful with width constraints. This component may try to enforce size
/// constraints that are impossible to meet, which will result in a layout exception.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="MinWidthRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class MinWidthRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<MinWidthRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Value = "value";
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
    public override ComponentType ComponentType => ComponentType.MinWidth;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Sizing;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        yield return PropertyNames.Value;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?> { { PropertyNames.Unit, "pt" } };
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
        // Extract width properties with expression evaluation
        var value = EvaluateFloatProperty(node, PropertyNames.Value, context);
        var unit = EvaluateEnumProperty(node, PropertyNames.Unit, context, UnitType.Pt);

        if (value is null || value <= 0)
        {
            Logger.LogWarning(
                "MinWidth value is null or non-positive for node {NodeId}, skipping width constraint",
                node.Id ?? "unnamed"
            );
            RenderChild(container, node, context, layoutEngine);
            return;
        }

        // Convert value to points if needed
        var valueInPoints = ConvertToPoints(value.Value, unit);

        Logger.LogTrace(
            "Rendering MinWidth with value={Value}pt (original: {OriginalValue}{Unit})",
            valueInPoints,
            value,
            unit.ToString().ToLowerInvariant()
        );

        // Apply minimum width constraint
        IContainer constrainedContainer = container.MinWidth(valueInPoints);

        // Render the child content
        RenderChild(constrainedContainer, node, context, layoutEngine);
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

        // Validate value is positive
        var value = node.GetFloatProperty(PropertyNames.Value);
        if (value is not null && value <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Value,
                    Message = $"MinWidth value must be positive, got: {value}",
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
