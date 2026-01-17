using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using Color = QuestPDF.Infrastructure.Color;

namespace PDFBuilder.Engine.Renderers.Styling;

/// <summary>
/// Renders a Background wrapper component that applies a background color or gradient to its child content.
/// Supports solid colors and linear gradients.
/// </summary>
/// <remarks>
/// QuestPDF Background API:
/// - Background(color) - Solid background color (hex string)
/// - BackgroundLinearGradient(angle, colors) - Linear gradient with angle and color stops
///
/// Properties:
/// - color (string): Solid background color in hex format (e.g., "#FF0000", "FF0000"). Default: none.
/// - gradientAngle (float): Angle in degrees for gradient direction. 0 = horizontal, 90 = vertical.
/// - gradientColors (string[]): Array of colors for gradient background (at least 2 required for gradient).
///
/// Color precedence:
/// - If gradientColors has 2+ colors and gradientAngle is specified, gradient is used.
/// - Otherwise, solid color is used.
///
/// The child property must contain a single child node to wrap.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="BackgroundRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class BackgroundRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<BackgroundRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Color = "color";
        public const string GradientAngle = "gradientAngle";
        public const string GradientColors = "gradientColors";
    }

    /// <summary>
    /// Default background color (transparent/none - no background applied).
    /// </summary>
    private const string DefaultBackgroundColor = "#FFFFFF";

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Background;

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
        // Extract background properties with expression evaluation
        var color = EvaluateStringProperty(node, PropertyNames.Color, context);
        var gradientAngle = EvaluateFloatProperty(node, PropertyNames.GradientAngle, context);
        var gradientColors = GetGradientColors(node, context);

        // Determine if we should use gradient or solid color
        var useGradient = gradientColors is not null && gradientColors.Length >= 2;

        Logger.LogTrace(
            "Rendering Background with color={Color}, useGradient={UseGradient}, gradientAngle={GradientAngle}",
            color ?? "none",
            useGradient,
            gradientAngle
        );

        // Apply background using the appropriate QuestPDF method
        IContainer backgroundContainer = ApplyBackground(
            container,
            color,
            useGradient,
            gradientAngle,
            gradientColors
        );

        // Render the child content
        RenderChild(backgroundContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Gets gradient colors from the node properties.
    /// </summary>
    /// <param name="node">The layout node.</param>
    /// <param name="_">The render context (unused).</param>
    /// <returns>Array of gradient colors or null if not specified.</returns>
    private string[]? GetGradientColors(LayoutNode node, RenderContext _)
    {
        if (!node.HasProperty(PropertyNames.GradientColors))
        {
            return null;
        }

        try
        {
            var colors = node.GetProperty<string[]>(PropertyNames.GradientColors);
            return colors;
        }
        catch (Exception ex)
        {
            Logger.LogWarning(
                ex,
                "Failed to parse gradient colors for node {NodeId}",
                node.Id ?? "unnamed"
            );
            return null;
        }
    }

    /// <summary>
    /// Applies background to a container using the appropriate QuestPDF method.
    /// </summary>
    /// <param name="container">The container to apply background to.</param>
    /// <param name="color">Solid background color (hex format).</param>
    /// <param name="useGradient">Whether to use gradient instead of solid color.</param>
    /// <param name="gradientAngle">Gradient angle in degrees.</param>
    /// <param name="gradientColors">Array of gradient colors.</param>
    /// <returns>The container with background applied.</returns>
    private IContainer ApplyBackground(
        IContainer container,
        string? color,
        bool useGradient,
        float? gradientAngle,
        string[]? gradientColors
    )
    {
        // Check if there's any background to apply
        if (!useGradient && string.IsNullOrWhiteSpace(color))
        {
            return container;
        }

        if (useGradient && gradientColors is not null)
        {
            // Apply gradient background
            return ApplyGradientBackground(container, gradientAngle ?? 0f, gradientColors);
        }
        else if (!string.IsNullOrWhiteSpace(color))
        {
            // Apply solid color background
            return ApplySolidBackground(container, color);
        }

        return container;
    }

    /// <summary>
    /// Applies a solid color background.
    /// </summary>
    /// <param name="container">The container to apply background to.</param>
    /// <param name="color">The color in hex format.</param>
    /// <returns>The container with solid background.</returns>
    private IContainer ApplySolidBackground(IContainer container, string color)
    {
        var parsedColor = ParseColor(color, DefaultBackgroundColor);
        return container.Background(parsedColor);
    }

    /// <summary>
    /// Applies a linear gradient background.
    /// </summary>
    /// <param name="container">The container to apply background to.</param>
    /// <param name="angle">The gradient angle in degrees.</param>
    /// <param name="colors">The array of colors for the gradient.</param>
    /// <returns>The container with gradient background.</returns>
    private IContainer ApplyGradientBackground(IContainer container, float angle, string[] colors)
    {
        // Parse and validate all colors - convert string[] to Color[]
        Color[] parsedColors = colors
            .Select(c => (Color)ParseColor(c, DefaultBackgroundColor))
            .ToArray();

        return container.BackgroundLinearGradient(angle, parsedColors);
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.Color, null },
            { PropertyNames.GradientAngle, 0f },
            { PropertyNames.GradientColors, null },
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate that at least one background property is specified
        var hasAnyBackground =
            node.HasProperty(PropertyNames.Color) || node.HasProperty(PropertyNames.GradientColors);

        if (!hasAnyBackground)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Color,
                    Message =
                        "At least one background property (color or gradientColors) should be specified",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate gradient colors if specified
        if (node.HasProperty(PropertyNames.GradientColors))
        {
            try
            {
                var colors = node.GetProperty<string[]>(PropertyNames.GradientColors);
                if (colors is null || colors.Length < 2)
                {
                    errors.Add(
                        new ComponentValidationError
                        {
                            PropertyName = PropertyNames.GradientColors,
                            Message =
                                "gradientColors must contain at least 2 colors for a gradient",
                            Severity = ValidationSeverity.Error,
                        }
                    );
                }
            }
            catch
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.GradientColors,
                        Message = "gradientColors must be an array of color strings",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
        }

        // Validate gradient angle is within reasonable range
        if (node.HasProperty(PropertyNames.GradientAngle))
        {
            var angle = node.GetFloatProperty(PropertyNames.GradientAngle);
            if (angle.HasValue && (angle.Value < 0 || angle.Value > 360))
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.GradientAngle,
                        Message =
                            $"gradientAngle should be between 0 and 360 degrees, got {angle.Value}",
                        Severity = ValidationSeverity.Warning,
                    }
                );
            }
        }

        // Validate that wrapper has a child
        if (node.Child is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message = "Background wrapper must have a child element",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
