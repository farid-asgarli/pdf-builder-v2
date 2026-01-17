using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
// Type alias for Color to avoid ambiguity
using Color = QuestPDF.Infrastructure.Color;

namespace PDFBuilder.Engine.Renderers.Content;

/// <summary>
/// Renders Line content components (horizontal and vertical dividers).
/// Creates simple, customizable visual dividers within the layout.
/// </summary>
/// <remarks>
/// QuestPDF Line API:
/// - container.LineHorizontal(thickness) - Creates a horizontal line
/// - container.LineVertical(thickness) - Creates a vertical line
/// - .LineColor(color) - Sets the line color (solid)
/// - .LineGradient([colors]) - Sets gradient colors
/// - .LineDashPattern([pattern]) - Sets dash pattern
///
/// Properties:
/// - orientation (string): "horizontal" (default) or "vertical"
/// - thickness (float): Line thickness in points. Default: 1
/// - color (string): Line color in hex format (e.g., "#000000"). Default: "#000000"
/// - gradient (array): Array of hex color strings for gradient. Overrides color if specified.
/// - dashPattern (array): Array of floats for dash pattern (e.g., [4, 4] for dashed line).
///   Pattern length must be even. First value is dash length, second is gap length, etc.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="LineRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class LineRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<LineRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        /// <summary>
        /// Line orientation: "horizontal" or "vertical".
        /// </summary>
        public const string Orientation = "orientation";

        /// <summary>
        /// Line thickness in points.
        /// </summary>
        public const string Thickness = "thickness";

        /// <summary>
        /// Solid line color in hex format.
        /// </summary>
        public const string Color = "color";

        /// <summary>
        /// Array of colors for gradient line.
        /// </summary>
        public const string Gradient = "gradient";

        /// <summary>
        /// Array of floats for dash pattern.
        /// </summary>
        public const string DashPattern = "dashPattern";
    }

    /// <summary>
    /// Default values for line properties.
    /// </summary>
    private static class Defaults
    {
        public const string Orientation = "horizontal";
        public const float Thickness = 1f;
        public const string Color = "#000000";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Line;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Content;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => false;

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        // Get line properties with expression evaluation
        var orientation =
            EvaluateStringProperty(node, PropertyNames.Orientation, context, Defaults.Orientation)
                ?.ToLowerInvariant() ?? Defaults.Orientation;
        var thickness =
            EvaluateFloatProperty(node, PropertyNames.Thickness, context, Defaults.Thickness)
            ?? Defaults.Thickness;
        var color = EvaluateStringProperty(node, PropertyNames.Color, context, Defaults.Color);
        var gradient = node.GetProperty<List<string>>(PropertyNames.Gradient);
        var dashPattern = node.GetProperty<List<float>>(PropertyNames.DashPattern);

        // Validate thickness
        if (thickness <= 0)
        {
            Logger.LogWarning(
                "Line thickness must be positive for node {NodeId}, using default: {Default}",
                node.Id ?? "unnamed",
                Defaults.Thickness
            );
            thickness = Defaults.Thickness;
        }

        Logger.LogTrace(
            "Rendering {Orientation} line with thickness {Thickness} for node {NodeId}",
            orientation,
            thickness,
            node.Id ?? "unnamed"
        );

        // Render based on orientation
        if (orientation == "vertical")
        {
            RenderVerticalLine(container, thickness, color, gradient, dashPattern);
        }
        else
        {
            RenderHorizontalLine(container, thickness, color, gradient, dashPattern);
        }
    }

    /// <summary>
    /// Renders a horizontal line with the specified properties.
    /// </summary>
    private void RenderHorizontalLine(
        IContainer container,
        float thickness,
        string? color,
        List<string>? gradient,
        List<float>? dashPattern
    )
    {
        var lineDescriptor = container.LineHorizontal(thickness);
        ApplyLineStyle(lineDescriptor, color, gradient, dashPattern);
    }

    /// <summary>
    /// Renders a vertical line with the specified properties.
    /// </summary>
    private void RenderVerticalLine(
        IContainer container,
        float thickness,
        string? color,
        List<string>? gradient,
        List<float>? dashPattern
    )
    {
        var lineDescriptor = container.LineVertical(thickness);
        ApplyLineStyle(lineDescriptor, color, gradient, dashPattern);
    }

    /// <summary>
    /// Applies color, gradient, and dash pattern styling to a line descriptor.
    /// </summary>
    private void ApplyLineStyle(
        LineDescriptor lineDescriptor,
        string? color,
        List<string>? gradient,
        List<float>? dashPattern
    )
    {
        // Apply dash pattern if specified
        if (dashPattern is not null && dashPattern.Count > 0)
        {
            // Validate dash pattern length is even
            if (dashPattern.Count % 2 != 0)
            {
                Logger.LogWarning(
                    "Dash pattern length must be even, ignoring last value. Pattern: [{Pattern}]",
                    string.Join(", ", dashPattern)
                );
                dashPattern = dashPattern.Take(dashPattern.Count - 1).ToList();
            }

            if (dashPattern.Count > 0)
            {
                lineDescriptor.LineDashPattern(dashPattern.ToArray());
            }
        }

        // Apply gradient if specified (takes precedence over solid color)
        if (gradient is not null && gradient.Count >= 2)
        {
            var gradientColors = gradient
                .Select(c => (Color)ParseColor(c, Defaults.Color))
                .ToArray();

            lineDescriptor.LineGradient(gradientColors);
            return;
        }

        // Apply solid color
        var parsedColor = ParseColor(color, Defaults.Color);
        lineDescriptor.LineColor(parsedColor);
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate orientation if specified
        var orientation = node.GetStringProperty(PropertyNames.Orientation);
        if (!string.IsNullOrEmpty(orientation))
        {
            var lowerOrientation = orientation.ToLowerInvariant();
            if (lowerOrientation != "horizontal" && lowerOrientation != "vertical")
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.Orientation,
                        Message =
                            $"Orientation must be 'horizontal' or 'vertical', got: '{orientation}'",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
        }

        // Validate thickness if specified
        var thickness = node.GetFloatProperty(PropertyNames.Thickness);
        if (thickness.HasValue && thickness.Value <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Thickness,
                    Message = "Thickness must be a positive value",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate dash pattern length if specified
        var dashPattern = node.GetProperty<List<float>>(PropertyNames.DashPattern);
        if (dashPattern is not null && dashPattern.Count % 2 != 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.DashPattern,
                    Message = "Dash pattern array length must be even",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate gradient has at least 2 colors if specified
        var gradient = node.GetProperty<List<string>>(PropertyNames.Gradient);
        if (gradient is not null && gradient.Count > 0 && gradient.Count < 2)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Gradient,
                    Message = "Gradient must have at least 2 colors",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        return errors;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.Orientation, Defaults.Orientation },
            { PropertyNames.Thickness, Defaults.Thickness },
            { PropertyNames.Color, Defaults.Color },
            { PropertyNames.Gradient, null },
            { PropertyNames.DashPattern, null },
        };
    }
}
