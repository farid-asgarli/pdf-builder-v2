using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Sizing;

/// <summary>
/// Renders a Width wrapper component that applies width constraints to its child content.
/// Supports fixed width, minimum width, and maximum width constraints.
/// </summary>
/// <remarks>
/// QuestPDF Width API:
/// - Width(value) - Sets the exact width of its content.
/// - MinWidth(value) - Sets the minimum width of its content.
/// - MaxWidth(value) - Sets the maximum width of its content.
///
/// Properties:
/// - value (float): The width value in points. Required.
/// - type (string): The constraint type: "fixed" (default), "min", or "max".
/// - unit (string): The unit of measurement: "pt" (default), "cm", "mm", "in".
///
/// Note: Be careful with width constraints. This component may try to enforce size
/// constraints that are impossible to meet, which will result in a layout exception.
/// For example, the container may require more space than is available.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="WidthRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class WidthRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<WidthRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Value = "value";
        public const string Type = "type";
        public const string Unit = "unit";
    }

    /// <summary>
    /// Width constraint types.
    /// </summary>
    private enum WidthType
    {
        /// <summary>
        /// Fixed exact width.
        /// </summary>
        Fixed,

        /// <summary>
        /// Minimum width constraint.
        /// </summary>
        Min,

        /// <summary>
        /// Maximum width constraint.
        /// </summary>
        Max,
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
    public override ComponentType ComponentType => ComponentType.Width;

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
        return new Dictionary<string, object?>
        {
            { PropertyNames.Type, "fixed" },
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
        // Extract width properties with expression evaluation
        var value = EvaluateFloatProperty(node, PropertyNames.Value, context);
        var widthType = EvaluateEnumProperty(node, PropertyNames.Type, context, WidthType.Fixed);
        var unit = EvaluateEnumProperty(node, PropertyNames.Unit, context, UnitType.Pt);

        if (value is null || value <= 0)
        {
            Logger.LogWarning(
                "Width value is null or non-positive for node {NodeId}, skipping width constraint",
                node.Id ?? "unnamed"
            );
            RenderChild(container, node, context, layoutEngine);
            return;
        }

        // Convert value to points if needed
        var valueInPoints = ConvertToPoints(value.Value, unit);

        Logger.LogTrace(
            "Rendering Width with type={Type}, value={Value}pt (original: {OriginalValue}{Unit})",
            widthType,
            valueInPoints,
            value,
            unit.ToString().ToLowerInvariant()
        );

        // Apply width constraint based on type
        IContainer constrainedContainer = ApplyWidthConstraint(container, widthType, valueInPoints);

        // Render the child content
        RenderChild(constrainedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies the width constraint to the container based on the constraint type.
    /// </summary>
    /// <param name="container">The container to apply the constraint to.</param>
    /// <param name="widthType">The type of width constraint.</param>
    /// <param name="value">The width value in points.</param>
    /// <returns>The constrained container.</returns>
    private static IContainer ApplyWidthConstraint(
        IContainer container,
        WidthType widthType,
        float value
    )
    {
        return widthType switch
        {
            WidthType.Fixed => container.Width(value),
            WidthType.Min => container.MinWidth(value),
            WidthType.Max => container.MaxWidth(value),
            _ => container.Width(value),
        };
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
                    Message = $"Width value must be positive, got: {value}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate type is valid
        var type = node.GetStringProperty(PropertyNames.Type);
        if (type is not null && !Enum.TryParse<WidthType>(type, ignoreCase: true, out _))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Type,
                    Message = $"Invalid width type: '{type}'. Valid values are: fixed, min, max",
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
