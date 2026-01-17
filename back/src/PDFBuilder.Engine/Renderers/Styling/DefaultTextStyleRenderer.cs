using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Styling;

/// <summary>
/// Renders a DefaultTextStyle wrapper component that applies default text styling to all nested Text elements.
/// The styling is inherited and can be extended or overridden by child elements.
/// </summary>
/// <remarks>
/// QuestPDF DefaultTextStyle API:
/// - DefaultTextStyle(x => x.Bold().Underline()) - Lambda-based style configuration
/// - DefaultTextStyle(TextStyle.Default.Bold()) - Object-based style configuration
///
/// Properties:
/// - fontFamily (string): Font family name (e.g., "Arial", "Times New Roman"). Supports fallback fonts separated by comma.
/// - fontSize (float): Font size in points. Default: 12.
/// - fontColor (string): Text color in hex format (e.g., "#000000"). Default: black.
/// - backgroundColor (string): Background color in hex format. Default: none.
/// - bold (bool): Whether text should be bold. Default: false.
/// - italic (bool): Whether text should be italic. Default: false.
/// - underline (bool): Whether text should be underlined. Default: false.
/// - strikethrough (bool): Whether text should have strikethrough. Default: false.
/// - overline (bool): Whether text should have overline. Default: false.
/// - decorationStyle (string): Style of decoration line: "solid", "double", "wavy", "dotted", "dashed". Default: "solid".
/// - decorationColor (string): Color of decoration line in hex format. Default: same as fontColor.
/// - decorationThickness (float): Thickness of decoration line. Default: 1.
/// - lineHeight (float): Line height multiplier (e.g., 1.5 for 150%). Default: 1.0.
/// - letterSpacing (float): Letter spacing adjustment. Default: 0.
/// - wordSpacing (float): Word spacing adjustment. Default: 0.
/// - fontWeight (string): Font weight: "thin", "extraLight", "light", "normal", "medium", "semiBold", "bold", "extraBold", "black". Default: "normal".
/// - subscript (bool): Whether text should be subscript. Default: false.
/// - superscript (bool): Whether text should be superscript. Default: false.
///
/// The child property must contain a single child node to wrap.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="DefaultTextStyleRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class DefaultTextStyleRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<DefaultTextStyleRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string FontFamily = "fontFamily";
        public const string FontSize = "fontSize";
        public const string FontColor = "fontColor";
        public const string BackgroundColor = "backgroundColor";
        public const string Bold = "bold";
        public const string Italic = "italic";
        public const string Underline = "underline";
        public const string Strikethrough = "strikethrough";
        public const string Overline = "overline";
        public const string DecorationStyle = "decorationStyle";
        public const string DecorationColor = "decorationColor";
        public const string DecorationThickness = "decorationThickness";
        public const string LineHeight = "lineHeight";
        public const string LetterSpacing = "letterSpacing";
        public const string WordSpacing = "wordSpacing";
        public const string FontWeight = "fontWeight";
        public const string Subscript = "subscript";
        public const string Superscript = "superscript";
    }

    /// <summary>
    /// Valid font weight values.
    /// </summary>
    private static readonly HashSet<string> ValidFontWeights = new(StringComparer.OrdinalIgnoreCase)
    {
        "thin",
        "extraLight",
        "light",
        "normal",
        "medium",
        "semiBold",
        "bold",
        "extraBold",
        "black",
        "extraBlack",
    };

    /// <summary>
    /// Valid decoration style values.
    /// </summary>
    private static readonly HashSet<string> ValidDecorationStyles = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "solid",
        "double",
        "wavy",
        "dotted",
        "dashed",
    };

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.DefaultTextStyle;

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
        // Extract text style properties with expression evaluation
        var fontFamily = EvaluateStringProperty(node, PropertyNames.FontFamily, context);
        var fontSize = EvaluateFloatProperty(node, PropertyNames.FontSize, context);
        var fontColor = EvaluateStringProperty(node, PropertyNames.FontColor, context);
        var backgroundColor = EvaluateStringProperty(node, PropertyNames.BackgroundColor, context);
        var bold = EvaluateBoolProperty(node, PropertyNames.Bold, context);
        var italic = EvaluateBoolProperty(node, PropertyNames.Italic, context);
        var underline = EvaluateBoolProperty(node, PropertyNames.Underline, context);
        var strikethrough = EvaluateBoolProperty(node, PropertyNames.Strikethrough, context);
        var overline = EvaluateBoolProperty(node, PropertyNames.Overline, context);
        var decorationStyle = EvaluateStringProperty(node, PropertyNames.DecorationStyle, context);
        var decorationColor = EvaluateStringProperty(node, PropertyNames.DecorationColor, context);
        var decorationThickness = EvaluateFloatProperty(
            node,
            PropertyNames.DecorationThickness,
            context
        );
        var lineHeight = EvaluateFloatProperty(node, PropertyNames.LineHeight, context);
        var letterSpacing = EvaluateFloatProperty(node, PropertyNames.LetterSpacing, context);
        var wordSpacing = EvaluateFloatProperty(node, PropertyNames.WordSpacing, context);
        var fontWeight = EvaluateStringProperty(node, PropertyNames.FontWeight, context);
        var subscript = EvaluateBoolProperty(node, PropertyNames.Subscript, context);
        var superscript = EvaluateBoolProperty(node, PropertyNames.Superscript, context);

        Logger.LogTrace(
            "Rendering DefaultTextStyle with fontFamily={FontFamily}, fontSize={FontSize}, bold={Bold}, italic={Italic}",
            fontFamily ?? "default",
            fontSize ?? 12f,
            bold ?? false,
            italic ?? false
        );

        // Apply default text style to the container
        container.DefaultTextStyle(style =>
        {
            var result = style;

            // Apply font family with fallback support
            if (!string.IsNullOrEmpty(fontFamily))
            {
                var fonts = fontFamily.Split(
                    ',',
                    StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries
                );
                if (fonts.Length > 0)
                {
                    result = result.FontFamily(fonts);
                }
            }

            // Apply font size
            if (fontSize.HasValue && fontSize.Value > 0)
            {
                result = result.FontSize(fontSize.Value);
            }

            // Apply font color
            if (!string.IsNullOrEmpty(fontColor))
            {
                var parsedColor = ParseColor(fontColor);
                result = result.FontColor(parsedColor);
            }

            // Apply background color
            if (!string.IsNullOrEmpty(backgroundColor))
            {
                var parsedBgColor = ParseColor(backgroundColor);
                result = result.BackgroundColor(parsedBgColor);
            }

            // Apply font weight
            if (!string.IsNullOrEmpty(fontWeight))
            {
                result = ApplyFontWeight(result, fontWeight);
            }
            else if (bold == true)
            {
                result = result.Bold();
            }

            // Apply italic
            if (italic == true)
            {
                result = result.Italic();
            }

            // Apply decorations (underline, strikethrough, overline)
            result = ApplyDecorations(
                result,
                underline,
                strikethrough,
                overline,
                decorationStyle,
                decorationColor,
                decorationThickness
            );

            // Apply line height
            if (lineHeight.HasValue)
            {
                result = result.LineHeight(lineHeight.Value);
            }

            // Apply letter spacing
            if (letterSpacing.HasValue)
            {
                result = result.LetterSpacing(letterSpacing.Value);
            }

            // Apply word spacing
            if (wordSpacing.HasValue)
            {
                result = result.WordSpacing(wordSpacing.Value);
            }

            // Apply subscript
            if (subscript == true)
            {
                result = result.Subscript();
            }

            // Apply superscript
            if (superscript == true)
            {
                result = result.Superscript();
            }

            return result;
        });

        // Render the child content
        RenderChild(container, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies font weight to the text style.
    /// </summary>
    /// <param name="style">The text style to apply weight to.</param>
    /// <param name="fontWeight">The font weight name.</param>
    /// <returns>The text style with font weight applied.</returns>
    private static TextStyle ApplyFontWeight(TextStyle style, string fontWeight)
    {
        return fontWeight.ToLowerInvariant() switch
        {
            "thin" => style.Thin(),
            "extralight" => style.ExtraLight(),
            "light" => style.Light(),
            "normal" => style.NormalWeight(),
            "medium" => style.Medium(),
            "semibold" => style.SemiBold(),
            "bold" => style.Bold(),
            "extrabold" => style.ExtraBold(),
            "black" => style.Black(),
            "extrablack" => style.ExtraBlack(),
            _ => style.NormalWeight(),
        };
    }

    /// <summary>
    /// Applies text decorations (underline, strikethrough, overline) with optional styling.
    /// </summary>
    /// <param name="style">The text style to apply decorations to.</param>
    /// <param name="underline">Whether to apply underline.</param>
    /// <param name="strikethrough">Whether to apply strikethrough.</param>
    /// <param name="overline">Whether to apply overline.</param>
    /// <param name="decorationStyle">The style of decoration line.</param>
    /// <param name="decorationColor">The color of decoration line.</param>
    /// <param name="decorationThickness">The thickness of decoration line.</param>
    /// <returns>The text style with decorations applied.</returns>
    private TextStyle ApplyDecorations(
        TextStyle style,
        bool? underline,
        bool? strikethrough,
        bool? overline,
        string? decorationStyle,
        string? decorationColor,
        float? decorationThickness
    )
    {
        var result = style;

        // Apply underline
        if (underline == true)
        {
            result = result.Underline();
        }

        // Apply strikethrough
        if (strikethrough == true)
        {
            result = result.Strikethrough();
        }

        // Apply overline
        if (overline == true)
        {
            result = result.Overline();
        }

        // Apply decoration style if any decoration is active
        if (
            (underline == true || strikethrough == true || overline == true)
            && !string.IsNullOrEmpty(decorationStyle)
        )
        {
            result = ApplyDecorationStyle(result, decorationStyle);
        }

        // Apply decoration color if any decoration is active
        if (
            (underline == true || strikethrough == true || overline == true)
            && !string.IsNullOrEmpty(decorationColor)
        )
        {
            var parsedColor = ParseColor(decorationColor);
            result = result.DecorationColor(parsedColor);
        }

        // Apply decoration thickness if any decoration is active
        if (
            (underline == true || strikethrough == true || overline == true)
            && decorationThickness.HasValue
            && decorationThickness.Value > 0
        )
        {
            result = result.DecorationThickness(decorationThickness.Value);
        }

        return result;
    }

    /// <summary>
    /// Applies decoration line style to the text style.
    /// </summary>
    /// <param name="style">The text style to apply decoration style to.</param>
    /// <param name="decorationStyle">The decoration style name.</param>
    /// <returns>The text style with decoration style applied.</returns>
    private static TextStyle ApplyDecorationStyle(TextStyle style, string decorationStyle)
    {
        return decorationStyle.ToLowerInvariant() switch
        {
            "solid" => style.DecorationSolid(),
            "double" => style.DecorationDouble(),
            "wavy" => style.DecorationWavy(),
            "dotted" => style.DecorationDotted(),
            "dashed" => style.DecorationDashed(),
            _ => style.DecorationSolid(),
        };
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.FontFamily, null },
            { PropertyNames.FontSize, 12f },
            { PropertyNames.FontColor, "#000000" },
            { PropertyNames.BackgroundColor, null },
            { PropertyNames.Bold, false },
            { PropertyNames.Italic, false },
            { PropertyNames.Underline, false },
            { PropertyNames.Strikethrough, false },
            { PropertyNames.Overline, false },
            { PropertyNames.DecorationStyle, "solid" },
            { PropertyNames.DecorationColor, null },
            { PropertyNames.DecorationThickness, 1f },
            { PropertyNames.LineHeight, 1f },
            { PropertyNames.LetterSpacing, 0f },
            { PropertyNames.WordSpacing, 0f },
            { PropertyNames.FontWeight, "normal" },
            { PropertyNames.Subscript, false },
            { PropertyNames.Superscript, false },
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate fontSize is positive
        var fontSize = node.GetFloatProperty(PropertyNames.FontSize);
        if (fontSize.HasValue && fontSize.Value <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.FontSize,
                    Message = $"Font size must be positive, got {fontSize.Value}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate fontWeight is valid
        var fontWeight = node.GetStringProperty(PropertyNames.FontWeight);
        if (!string.IsNullOrEmpty(fontWeight) && !ValidFontWeights.Contains(fontWeight))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.FontWeight,
                    Message =
                        $"Invalid font weight '{fontWeight}'. Valid values are: {string.Join(", ", ValidFontWeights)}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate decorationStyle is valid
        var decorationStyle = node.GetStringProperty(PropertyNames.DecorationStyle);
        if (
            !string.IsNullOrEmpty(decorationStyle)
            && !ValidDecorationStyles.Contains(decorationStyle)
        )
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.DecorationStyle,
                    Message =
                        $"Invalid decoration style '{decorationStyle}'. Valid values are: {string.Join(", ", ValidDecorationStyles)}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate lineHeight is positive
        var lineHeight = node.GetFloatProperty(PropertyNames.LineHeight);
        if (lineHeight.HasValue && lineHeight.Value <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.LineHeight,
                    Message = $"Line height must be positive, got {lineHeight.Value}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate decorationThickness is non-negative
        var decorationThickness = node.GetFloatProperty(PropertyNames.DecorationThickness);
        if (decorationThickness.HasValue && decorationThickness.Value < 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.DecorationThickness,
                    Message =
                        $"Decoration thickness must be non-negative, got {decorationThickness.Value}",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Warn about conflicting subscript and superscript
        var subscript = node.GetBoolProperty(PropertyNames.Subscript);
        var superscript = node.GetBoolProperty(PropertyNames.Superscript);
        if (subscript == true && superscript == true)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Subscript,
                    Message =
                        "Both subscript and superscript are enabled. Only subscript will be applied.",
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
                    Message = "DefaultTextStyle wrapper must have a child element",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
