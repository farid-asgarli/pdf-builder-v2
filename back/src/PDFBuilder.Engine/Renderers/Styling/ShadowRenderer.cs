using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using Color = QuestPDF.Infrastructure.Color;

namespace PDFBuilder.Engine.Renderers.Styling;

/// <summary>
/// Renders a Shadow wrapper component that applies drop shadow effects to its child content.
/// Supports customizable shadow color, blur, spread, and offset values.
/// </summary>
/// <remarks>
/// QuestPDF Shadow API:
/// - Shadow(BoxShadowStyle) - Applies shadow effect with the specified style
///
/// BoxShadowStyle Properties:
/// - Color: The shadow color
/// - Blur: Blur radius in pixels (0 = sharp, higher = more diffused). NOTE: Blur significantly impacts performance.
/// - Spread: Spread radius in pixels (positive = expand, negative = contract)
/// - OffsetX: Horizontal offset in pixels (positive = right, negative = left)
/// - OffsetY: Vertical offset in pixels (positive = down, negative = up)
///
/// Properties:
/// - color (string): Shadow color in hex format (e.g., "#000000"). Default: "#808080" (gray).
/// - blur (float): Blur radius in pixels. Higher values produce softer shadows. Default: 5.
///   WARNING: Non-zero blur values may significantly impact performance and increase file size.
/// - spread (float): Spread radius in pixels. Positive expands, negative contracts. Default: 0.
/// - offsetX (float): Horizontal offset in pixels. Default: 5.
/// - offsetY (float): Vertical offset in pixels. Default: 5.
///
/// The child property must contain a single child node to wrap.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ShadowRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ShadowRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ShadowRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Color = "color";
        public const string Blur = "blur";
        public const string Spread = "spread";
        public const string OffsetX = "offsetX";
        public const string OffsetY = "offsetY";
    }

    /// <summary>
    /// Default shadow color (medium gray).
    /// </summary>
    private const string DefaultShadowColor = "#808080";

    /// <summary>
    /// Default blur radius.
    /// </summary>
    private const float DefaultBlur = 5f;

    /// <summary>
    /// Default spread radius.
    /// </summary>
    private const float DefaultSpread = 0f;

    /// <summary>
    /// Default horizontal offset.
    /// </summary>
    private const float DefaultOffsetX = 5f;

    /// <summary>
    /// Default vertical offset.
    /// </summary>
    private const float DefaultOffsetY = 5f;

    /// <summary>
    /// Maximum allowed blur radius to prevent performance issues.
    /// </summary>
    private const float MaxBlurRadius = 100f;

    /// <summary>
    /// Maximum allowed spread radius.
    /// </summary>
    private const float MaxSpreadRadius = 100f;

    /// <summary>
    /// Maximum allowed offset value.
    /// </summary>
    private const float MaxOffset = 500f;

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Shadow;

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
        // Extract shadow properties with expression evaluation
        var color = EvaluateStringProperty(node, PropertyNames.Color, context);
        var blur = EvaluateFloatProperty(node, PropertyNames.Blur, context);
        var spread = EvaluateFloatProperty(node, PropertyNames.Spread, context);
        var offsetX = EvaluateFloatProperty(node, PropertyNames.OffsetX, context);
        var offsetY = EvaluateFloatProperty(node, PropertyNames.OffsetY, context);

        // Apply defaults and constraints
        var effectiveColor = ParseColor(color, DefaultShadowColor);
        var effectiveBlur = ClampValue(blur ?? DefaultBlur, 0f, MaxBlurRadius);
        var effectiveSpread = ClampValue(
            spread ?? DefaultSpread,
            -MaxSpreadRadius,
            MaxSpreadRadius
        );
        var effectiveOffsetX = ClampValue(offsetX ?? DefaultOffsetX, -MaxOffset, MaxOffset);
        var effectiveOffsetY = ClampValue(offsetY ?? DefaultOffsetY, -MaxOffset, MaxOffset);

        // Log performance warning for large blur values
        if (effectiveBlur > 20f)
        {
            Logger.LogWarning(
                "Shadow blur radius {Blur} is high and may significantly impact PDF generation performance and file size for node {NodeId}",
                effectiveBlur,
                node.Id ?? "unnamed"
            );
        }

        Logger.LogTrace(
            "Rendering Shadow with color={Color}, blur={Blur}, spread={Spread}, offsetX={OffsetX}, offsetY={OffsetY}",
            effectiveColor,
            effectiveBlur,
            effectiveSpread,
            effectiveOffsetX,
            effectiveOffsetY
        );

        // Create the shadow style
        var shadowStyle = new BoxShadowStyle
        {
            Color = (Color)effectiveColor,
            Blur = effectiveBlur,
            Spread = effectiveSpread,
            OffsetX = effectiveOffsetX,
            OffsetY = effectiveOffsetY,
        };

        // Apply shadow and render the child content
        IContainer shadowContainer = container.Shadow(shadowStyle);

        // Render the child content
        RenderChild(shadowContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Clamps a value between a minimum and maximum range.
    /// </summary>
    /// <param name="value">The value to clamp.</param>
    /// <param name="min">The minimum allowed value.</param>
    /// <param name="max">The maximum allowed value.</param>
    /// <returns>The clamped value.</returns>
    private static float ClampValue(float value, float min, float max)
    {
        return Math.Max(min, Math.Min(max, value));
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // Shadow has no required properties - all have sensible defaults
        return [];
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.Color, DefaultShadowColor },
            { PropertyNames.Blur, DefaultBlur },
            { PropertyNames.Spread, DefaultSpread },
            { PropertyNames.OffsetX, DefaultOffsetX },
            { PropertyNames.OffsetY, DefaultOffsetY },
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate blur value
        var blur = node.GetFloatProperty(PropertyNames.Blur);
        if (blur.HasValue)
        {
            if (blur.Value < 0)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.Blur,
                        Message = $"Shadow blur must be non-negative, got {blur.Value}",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
            else if (blur.Value > MaxBlurRadius)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.Blur,
                        Message =
                            $"Shadow blur value {blur.Value} exceeds maximum {MaxBlurRadius}. This will be clamped.",
                        Severity = ValidationSeverity.Warning,
                    }
                );
            }
            else if (blur.Value > 20)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.Blur,
                        Message =
                            $"Shadow blur value {blur.Value} is high and may significantly impact performance and file size",
                        Severity = ValidationSeverity.Warning,
                    }
                );
            }
        }

        // Validate spread value
        var spread = node.GetFloatProperty(PropertyNames.Spread);
        if (spread.HasValue && Math.Abs(spread.Value) > MaxSpreadRadius)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Spread,
                    Message =
                        $"Shadow spread value {spread.Value} exceeds maximum range [-{MaxSpreadRadius}, {MaxSpreadRadius}]. This will be clamped.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate offset values
        var offsetX = node.GetFloatProperty(PropertyNames.OffsetX);
        if (offsetX.HasValue && Math.Abs(offsetX.Value) > MaxOffset)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.OffsetX,
                    Message =
                        $"Shadow offsetX value {offsetX.Value} exceeds maximum range [-{MaxOffset}, {MaxOffset}]. This will be clamped.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        var offsetY = node.GetFloatProperty(PropertyNames.OffsetY);
        if (offsetY.HasValue && Math.Abs(offsetY.Value) > MaxOffset)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.OffsetY,
                    Message =
                        $"Shadow offsetY value {offsetY.Value} exceeds maximum range [-{MaxOffset}, {MaxOffset}]. This will be clamped.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate color format
        var color = node.GetStringProperty(PropertyNames.Color);
        if (!string.IsNullOrEmpty(color) && !IsValidColorFormat(color))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Color,
                    Message =
                        $"Invalid shadow color format '{color}'. Expected hex format (e.g., '#FF0000' or 'FF0000')",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate that wrapper has a child
        if (node.Child is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message = "Shadow wrapper must have a child element",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }

    /// <summary>
    /// Validates if a string is a valid hex color format.
    /// </summary>
    /// <param name="color">The color string to validate.</param>
    /// <returns>True if valid hex color format; otherwise, false.</returns>
    private static bool IsValidColorFormat(string color)
    {
        if (string.IsNullOrWhiteSpace(color))
        {
            return false;
        }

        var normalizedColor = color.TrimStart('#');

        // Valid formats: RRGGBB (6 chars) or AARRGGBB (8 chars)
        if (normalizedColor.Length != 6 && normalizedColor.Length != 8)
        {
            return false;
        }

        return normalizedColor.All(c => Uri.IsHexDigit(c));
    }
}
