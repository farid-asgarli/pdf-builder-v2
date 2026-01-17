using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
using Color = QuestPDF.Infrastructure.Color;

namespace PDFBuilder.Engine.Renderers.Styling;

/// <summary>
/// Renders a Border wrapper component that adds borders around its child content.
/// Supports uniform borders, per-side borders, various thicknesses, and colors (solid or gradient).
/// </summary>
/// <remarks>
/// QuestPDF Border API:
/// - Border(thickness) - Uniform border on all sides
/// - BorderVertical(thickness), BorderHorizontal(thickness) - Grouped sides
/// - BorderTop(thickness), BorderBottom(thickness), BorderLeft(thickness), BorderRight(thickness) - Individual sides
/// - BorderColor(color) - Solid color for the border
/// - BorderLinearGradient(angle, colors) - Gradient color for the border
///
/// Properties:
/// - all (float): Uniform border thickness on all sides in points. Overridden by specific side properties.
/// - top (float): Top border thickness in points.
/// - bottom (float): Bottom border thickness in points.
/// - left (float): Left border thickness in points.
/// - right (float): Right border thickness in points.
/// - horizontal (float): Left and right border thickness in points. Overridden by left/right properties.
/// - vertical (float): Top and bottom border thickness in points. Overridden by top/bottom properties.
/// - color (string): Solid color for the border in hex format (e.g., "#FF0000"). Default: "#000000".
/// - gradientAngle (float): Angle in degrees for gradient direction. 0 = horizontal, 90 = vertical.
/// - gradientColors (string[]): Array of colors for gradient border.
///
/// The child property must contain a single child node to wrap.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="BorderRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class BorderRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<BorderRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string All = "all";
        public const string Top = "top";
        public const string Bottom = "bottom";
        public const string Left = "left";
        public const string Right = "right";
        public const string Horizontal = "horizontal";
        public const string Vertical = "vertical";
        public const string Color = "color";
        public const string GradientAngle = "gradientAngle";
        public const string GradientColors = "gradientColors";
    }

    /// <summary>
    /// Default border color (black).
    /// </summary>
    private const string DefaultBorderColor = "#000000";

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Border;

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
        // Extract border thickness properties with expression evaluation
        var all = EvaluateFloatProperty(node, PropertyNames.All, context);
        var horizontal = EvaluateFloatProperty(node, PropertyNames.Horizontal, context);
        var vertical = EvaluateFloatProperty(node, PropertyNames.Vertical, context);
        var top = EvaluateFloatProperty(node, PropertyNames.Top, context);
        var bottom = EvaluateFloatProperty(node, PropertyNames.Bottom, context);
        var left = EvaluateFloatProperty(node, PropertyNames.Left, context);
        var right = EvaluateFloatProperty(node, PropertyNames.Right, context);

        // Resolve effective border thickness with priority:
        // Individual sides > horizontal/vertical > all > 0
        var effectiveTop = EnsurePositive(top ?? vertical ?? all);
        var effectiveBottom = EnsurePositive(bottom ?? vertical ?? all);
        var effectiveLeft = EnsurePositive(left ?? horizontal ?? all);
        var effectiveRight = EnsurePositive(right ?? horizontal ?? all);

        // Extract color properties
        var color = EvaluateStringProperty(node, PropertyNames.Color, context);
        var gradientAngle = EvaluateFloatProperty(node, PropertyNames.GradientAngle, context);
        var gradientColors = GetGradientColors(node);

        Logger.LogTrace(
            "Rendering Border with top={Top}, bottom={Bottom}, left={Left}, right={Right}, color={Color}",
            effectiveTop,
            effectiveBottom,
            effectiveLeft,
            effectiveRight,
            color ?? DefaultBorderColor
        );

        // Apply border using the appropriate QuestPDF method
        IContainer borderedContainer = ApplyBorder(
            container,
            effectiveTop,
            effectiveBottom,
            effectiveLeft,
            effectiveRight,
            color,
            gradientAngle,
            gradientColors
        );

        // Render the child content
        RenderChild(borderedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Gets gradient colors from the node properties.
    /// </summary>
    /// <param name="node">The layout node.</param>
    /// <returns>Array of gradient colors or null if not specified.</returns>
    private string[]? GetGradientColors(LayoutNode node)
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
    /// Applies border to a container using the appropriate QuestPDF method.
    /// </summary>
    /// <param name="container">The container to apply border to.</param>
    /// <param name="top">Top border thickness.</param>
    /// <param name="bottom">Bottom border thickness.</param>
    /// <param name="left">Left border thickness.</param>
    /// <param name="right">Right border thickness.</param>
    /// <param name="color">Solid border color (hex format).</param>
    /// <param name="gradientAngle">Gradient angle in degrees.</param>
    /// <param name="gradientColors">Array of gradient colors.</param>
    /// <returns>The bordered container.</returns>
    private IContainer ApplyBorder(
        IContainer container,
        float top,
        float bottom,
        float left,
        float right,
        string? color,
        float? gradientAngle,
        string[]? gradientColors
    )
    {
        // Check if there's no border to apply
        if (top == 0f && bottom == 0f && left == 0f && right == 0f)
        {
            return container;
        }

        // Determine if we should use gradient or solid color
        var useGradient = gradientColors is not null && gradientColors.Length >= 2;

        IContainer borderedContainer = container;

        // Check if all sides are equal for uniform border
        if (top == bottom && bottom == left && left == right && top > 0)
        {
            borderedContainer = ApplyUniformBorder(
                borderedContainer,
                top,
                color,
                useGradient,
                gradientAngle,
                gradientColors
            );
        }
        else
        {
            // Apply individual borders for each side
            borderedContainer = ApplyIndividualBorders(
                borderedContainer,
                top,
                bottom,
                left,
                right,
                color
            );
        }

        return borderedContainer;
    }

    /// <summary>
    /// Applies a uniform border to all sides.
    /// </summary>
    private IContainer ApplyUniformBorder(
        IContainer container,
        float thickness,
        string? color,
        bool useGradient,
        float? gradientAngle,
        string[]? gradientColors
    )
    {
        var borderedContainer = container.Border(thickness);

        if (useGradient && gradientColors is not null)
        {
            // Apply gradient border - convert string[] to Color[]
            var angle = gradientAngle ?? 0f;
            Color[] parsedColors = gradientColors
                .Select(c => (Color)ParseColor(c, DefaultBorderColor))
                .ToArray();
            borderedContainer = borderedContainer.BorderLinearGradient(angle, parsedColors);
        }
        else
        {
            // Apply solid color border
            var parsedColor = ParseColor(color, DefaultBorderColor);
            borderedContainer = borderedContainer.BorderColor(parsedColor);
        }

        return borderedContainer;
    }

    /// <summary>
    /// Applies individual borders to each side.
    /// </summary>
    private IContainer ApplyIndividualBorders(
        IContainer container,
        float top,
        float bottom,
        float left,
        float right,
        string? color
    )
    {
        IContainer borderedContainer = container;
        var parsedColor = ParseColor(color, DefaultBorderColor);

        // Apply borders in the order: top, right, bottom, left (clockwise)
        if (top > 0)
        {
            borderedContainer = borderedContainer.BorderTop(top).BorderColor(parsedColor);
        }

        if (right > 0)
        {
            borderedContainer = borderedContainer.BorderRight(right).BorderColor(parsedColor);
        }

        if (bottom > 0)
        {
            borderedContainer = borderedContainer.BorderBottom(bottom).BorderColor(parsedColor);
        }

        if (left > 0)
        {
            borderedContainer = borderedContainer.BorderLeft(left).BorderColor(parsedColor);
        }

        return borderedContainer;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.All, 1f },
            { PropertyNames.Top, null },
            { PropertyNames.Bottom, null },
            { PropertyNames.Left, null },
            { PropertyNames.Right, null },
            { PropertyNames.Horizontal, null },
            { PropertyNames.Vertical, null },
            { PropertyNames.Color, DefaultBorderColor },
            { PropertyNames.GradientAngle, null },
            { PropertyNames.GradientColors, null },
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate that at least one border thickness property is specified
        var hasAnyBorder =
            node.HasProperty(PropertyNames.All)
            || node.HasProperty(PropertyNames.Top)
            || node.HasProperty(PropertyNames.Bottom)
            || node.HasProperty(PropertyNames.Left)
            || node.HasProperty(PropertyNames.Right)
            || node.HasProperty(PropertyNames.Horizontal)
            || node.HasProperty(PropertyNames.Vertical);

        if (!hasAnyBorder)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.All,
                    Message =
                        "At least one border thickness property (all, top, bottom, left, right, horizontal, vertical) should be specified",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate border thickness values are non-negative
        ValidateBorderThickness(node, PropertyNames.All, errors);
        ValidateBorderThickness(node, PropertyNames.Top, errors);
        ValidateBorderThickness(node, PropertyNames.Bottom, errors);
        ValidateBorderThickness(node, PropertyNames.Left, errors);
        ValidateBorderThickness(node, PropertyNames.Right, errors);
        ValidateBorderThickness(node, PropertyNames.Horizontal, errors);
        ValidateBorderThickness(node, PropertyNames.Vertical, errors);

        // Validate gradient colors if angle is specified
        if (node.HasProperty(PropertyNames.GradientAngle))
        {
            if (!node.HasProperty(PropertyNames.GradientColors))
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.GradientColors,
                        Message = "gradientColors must be specified when gradientAngle is provided",
                        Severity = ValidationSeverity.Error,
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
                    Message = "Border wrapper must have a child element",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }

    /// <summary>
    /// Validates that a border thickness property is non-negative.
    /// </summary>
    private static void ValidateBorderThickness(
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
                        $"Border thickness '{propertyName}' must be non-negative, got {value.Value}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }
    }
}
