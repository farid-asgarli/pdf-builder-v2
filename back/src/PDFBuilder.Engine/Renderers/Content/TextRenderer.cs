using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;
// Type alias to avoid ambiguity with QuestPDF.Infrastructure.FontWeight
using FontWeight = PDFBuilder.Core.Domain.FontWeight;

namespace PDFBuilder.Engine.Renderers.Content;

/// <summary>
/// Renders Text content components with rich styling support.
/// Supports simple text, expression evaluation, and rich text with spans.
/// </summary>
/// <remarks>
/// QuestPDF Text API: container.Text("...") or container.Text(text => { text.Span("..."); })
///
/// Properties:
/// - content (string): The text content to display. Supports {{ expression }} syntax.
/// - spans (array): Optional array of span objects for rich text formatting.
///   Each span has: text, fontFamily, fontSize, fontWeight, fontStyle, color, backgroundColor,
///   underline, strikethrough, overline, superscript, subscript
///
/// Text Styling (via properties or inherited style):
/// - fontFamily (string): Font family name. Default: "Helvetica"
/// - fontSize (float): Font size in points. Default: 12
/// - fontWeight (string): Thin, ExtraLight, Light, Normal, Medium, SemiBold, Bold, ExtraBold, Black
/// - fontStyle (string): Normal, Italic
/// - color (string): Text color in hex format (e.g., "#333333")
/// - lineHeight (float): Line height multiplier. Default: 1.2
/// - letterSpacing (float): Letter spacing in points. Default: 0
///
/// Paragraph Styling:
/// - alignment (string): Left, Center, Right, Justify. Default: Left
/// - paragraphSpacing (float): Space between paragraphs in points. Default: 0
/// - firstLineIndentation (float): First line indentation in points. Default: 0
///
/// Decorations:
/// - underline (bool): Whether to underline text. Default: false
/// - strikethrough (bool): Whether to strike through text. Default: false
/// - overline (bool): Whether to overline text. Default: false
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="TextRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class TextRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<TextRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        // Content
        public const string Content = "content";
        public const string Spans = "spans";

        // Text styling
        public const string FontFamily = "fontFamily";
        public const string FontSize = "fontSize";
        public const string FontWeight = "fontWeight";
        public const string FontStyle = "fontStyle";
        public const string Color = "color";
        public const string BackgroundColor = "backgroundColor";
        public const string LineHeight = "lineHeight";
        public const string LetterSpacing = "letterSpacing";
        public const string WordSpacing = "wordSpacing";

        // Paragraph styling
        public const string Alignment = "alignment";
        public const string ParagraphSpacing = "paragraphSpacing";
        public const string FirstLineIndentation = "firstLineIndentation";

        // Decorations
        public const string Underline = "underline";
        public const string Strikethrough = "strikethrough";
        public const string Overline = "overline";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Text;

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
        // Check if we have spans (rich text) or simple content
        var spans = node.GetProperty<List<TextSpanDto>>(PropertyNames.Spans);

        if (spans is not null && spans.Count > 0)
        {
            RenderRichText(container, node, context, resolvedStyle, spans);
        }
        else
        {
            RenderSimpleText(container, node, context, resolvedStyle);
        }
    }

    /// <summary>
    /// Renders simple text content with uniform styling.
    /// Handles page context variables (currentPage, totalPages) using QuestPDF native methods.
    /// </summary>
    private void RenderSimpleText(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        StyleProperties resolvedStyle
    )
    {
        // Get raw content (don't evaluate expressions yet - we need to detect page context)
        var rawContent = node.GetStringProperty(PropertyNames.Content) ?? string.Empty;

        if (string.IsNullOrEmpty(rawContent))
        {
            Logger.LogDebug("Text node {NodeId} has empty content", node.Id ?? "unnamed");
            return;
        }

        Logger.LogTrace(
            "Rendering simple text: '{Content}' (truncated to 50 chars)",
            rawContent.Length > 50 ? rawContent[..50] + "..." : rawContent
        );

        // Check if we have page context expressions that need QuestPDF native handling
        var hasPageContext = ExpressionEvaluator.ContainsPageContextExpressions(rawContent);

        if (hasPageContext)
        {
            // Use the advanced parsing to handle page context variables
            RenderTextWithPageContext(container, node, context, resolvedStyle, rawContent);
        }
        else
        {
            // Standard text rendering with expression evaluation
            var content = EvaluateStringProperty(node, PropertyNames.Content, context, string.Empty);

            if (string.IsNullOrEmpty(content))
            {
                return;
            }

            container.Text(text =>
            {
                ApplyParagraphStyling(text, node, context, resolvedStyle);
                ApplyDefaultTextStyle(text, node, context, resolvedStyle);

                var span = text.Span(content);
                ApplyTextDecorations(span, node, context);
            });
        }
    }

    /// <summary>
    /// Renders text content that contains page context expressions.
    /// Uses QuestPDF's native CurrentPageNumber() and TotalPages() methods.
    /// </summary>
    private void RenderTextWithPageContext(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        StyleProperties resolvedStyle,
        string rawContent
    )
    {
        // Parse text into segments (static text vs page context variables)
        var segments = ExpressionEvaluator.ParseTextWithPageContext(rawContent, context).ToList();

        if (segments.Count == 0)
        {
            return;
        }

        container.Text(text =>
        {
            ApplyParagraphStyling(text, node, context, resolvedStyle);
            ApplyDefaultTextStyle(text, node, context, resolvedStyle);

            foreach (var segment in segments)
            {
                if (segment.Type == TextSegmentType.StaticText)
                {
                    // Static text - render as regular span
                    if (!string.IsNullOrEmpty(segment.Text))
                    {
                        var span = text.Span(segment.Text);
                        ApplyTextDecorations(span, node, context);
                    }
                }
                else if (segment.Type == TextSegmentType.PageContext && segment.PageContext is not null)
                {
                    // Page context variable - use QuestPDF native methods
                    RenderPageContextSegment(text, segment.PageContext, node, context);
                }
            }
        });
    }

    /// <summary>
    /// Renders a page context segment using QuestPDF's native page number methods.
    /// </summary>
    private void RenderPageContextSegment(
        TextDescriptor text,
        PageContextExpression pageContext,
        LayoutNode node,
        RenderContext context
    )
    {
        // Determine section name - use provided or fall back to current section in context
        var sectionName = !string.IsNullOrEmpty(pageContext.SectionName)
            ? pageContext.SectionName
            : context.SectionInfo.Name ?? context.CurrentSection ?? string.Empty;

        switch (pageContext.Variable)
        {
            case PageContextVariable.CurrentPage:
                var currentPageSpan = text.CurrentPageNumber();
                ApplyTextDecorations(currentPageSpan, node, context);
                break;

            case PageContextVariable.TotalPages:
                var totalPagesSpan = text.TotalPages();
                ApplyTextDecorations(totalPagesSpan, node, context);
                break;

            case PageContextVariable.SectionBeginPage when !string.IsNullOrEmpty(sectionName):
                var beginPageSpan = text.BeginPageNumberOfSection(sectionName);
                ApplyTextDecorations(beginPageSpan, node, context);
                break;

            case PageContextVariable.SectionEndPage when !string.IsNullOrEmpty(sectionName):
                var endPageSpan = text.EndPageNumberOfSection(sectionName);
                ApplyTextDecorations(endPageSpan, node, context);
                break;

            case PageContextVariable.PageWithinSection when !string.IsNullOrEmpty(sectionName):
                var pageWithinSpan = text.PageNumberWithinSection(sectionName);
                ApplyTextDecorations(pageWithinSpan, node, context);
                break;

            case PageContextVariable.TotalPagesWithinSection when !string.IsNullOrEmpty(sectionName):
                var totalWithinSpan = text.TotalPagesWithinSection(sectionName);
                ApplyTextDecorations(totalWithinSpan, node, context);
                break;

            default:
                // Unknown or invalid page context - log and skip
                Logger.LogWarning(
                    "Unknown or invalid page context variable: {Variable} with section: {Section}",
                    pageContext.Variable,
                    sectionName
                );
                break;
        }
    }

    /// <summary>
    /// Renders rich text with multiple styled spans.
    /// Handles page context variables within individual spans.
    /// </summary>
    private void RenderRichText(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        StyleProperties resolvedStyle,
        List<TextSpanDto> spans
    )
    {
        Logger.LogTrace("Rendering rich text with {SpanCount} spans", spans.Count);

        container.Text(text =>
        {
            // Apply paragraph styling
            ApplyParagraphStyling(text, node, context, resolvedStyle);

            // Apply default text style from resolved style
            ApplyDefaultTextStyle(text, node, context, resolvedStyle);

            // Render each span
            foreach (var spanDto in spans)
            {
                RenderSpan(text, spanDto, context, resolvedStyle);
            }
        });
    }

    /// <summary>
    /// Renders a single text span with its styling.
    /// Handles page context variables within the span text.
    /// </summary>
    private void RenderSpan(
        TextDescriptor text,
        TextSpanDto spanDto,
        RenderContext context,
        StyleProperties resolvedStyle
    )
    {
        var spanText = spanDto.Text ?? string.Empty;

        if (string.IsNullOrEmpty(spanText))
        {
            return;
        }

        // Check for page context expressions in this span
        if (ExpressionEvaluator.ContainsPageContextExpressions(spanText))
        {
            // Parse and render segments with page context handling
            var segments = ExpressionEvaluator.ParseTextWithPageContext(spanText, context);

            foreach (var segment in segments)
            {
                if (segment.Type == TextSegmentType.StaticText)
                {
                    if (!string.IsNullOrEmpty(segment.Text))
                    {
                        var span = text.Span(segment.Text);
                        ApplySpanStyling(span, spanDto, resolvedStyle);
                    }
                }
                else if (segment.Type == TextSegmentType.PageContext && segment.PageContext is not null)
                {
                    RenderPageContextSegmentWithSpanStyle(text, segment.PageContext, spanDto, context, resolvedStyle);
                }
            }
        }
        else if (ExpressionEvaluator.ContainsExpressions(spanText))
        {
            // Regular expression evaluation
            spanText = ExpressionEvaluator.EvaluateString(spanText, context);

            if (!string.IsNullOrEmpty(spanText))
            {
                var span = text.Span(spanText);
                ApplySpanStyling(span, spanDto, resolvedStyle);
            }
        }
        else
        {
            // Static text
            var span = text.Span(spanText);
            ApplySpanStyling(span, spanDto, resolvedStyle);
        }
    }

    /// <summary>
    /// Renders a page context segment with span-specific styling.
    /// </summary>
    private void RenderPageContextSegmentWithSpanStyle(
        TextDescriptor text,
        PageContextExpression pageContext,
        TextSpanDto spanDto,
        RenderContext context,
        StyleProperties resolvedStyle
    )
    {
        var sectionName = !string.IsNullOrEmpty(pageContext.SectionName)
            ? pageContext.SectionName
            : context.SectionInfo.Name ?? context.CurrentSection ?? string.Empty;

        TextSpanDescriptor? spanDescriptor = pageContext.Variable switch
        {
            PageContextVariable.CurrentPage => text.CurrentPageNumber(),
            PageContextVariable.TotalPages => text.TotalPages(),
            PageContextVariable.SectionBeginPage when !string.IsNullOrEmpty(sectionName) =>
                text.BeginPageNumberOfSection(sectionName),
            PageContextVariable.SectionEndPage when !string.IsNullOrEmpty(sectionName) =>
                text.EndPageNumberOfSection(sectionName),
            PageContextVariable.PageWithinSection when !string.IsNullOrEmpty(sectionName) =>
                text.PageNumberWithinSection(sectionName),
            PageContextVariable.TotalPagesWithinSection when !string.IsNullOrEmpty(sectionName) =>
                text.TotalPagesWithinSection(sectionName),
            _ => null,
        };

        if (spanDescriptor is null)
        {
            Logger.LogWarning(
                "Unknown or invalid page context variable in span: {Variable}",
                pageContext.Variable
            );
            return;
        }

        ApplySpanStyling(spanDescriptor, spanDto, resolvedStyle);
    }

    /// <summary>
    /// Applies paragraph-level styling to the text descriptor.
    /// </summary>
    private void ApplyParagraphStyling(
        TextDescriptor text,
        LayoutNode node,
        RenderContext context,
        StyleProperties resolvedStyle
    )
    {
        // Text alignment
        var alignment = EvaluateEnumProperty<TextAlignment>(
            node,
            PropertyNames.Alignment,
            context,
            resolvedStyle.TextAlignment ?? TextAlignment.Left
        );

        switch (alignment)
        {
            case TextAlignment.Left:
            case TextAlignment.Start:
                text.AlignLeft();
                break;
            case TextAlignment.Center:
                text.AlignCenter();
                break;
            case TextAlignment.Right:
            case TextAlignment.End:
                text.AlignRight();
                break;
            case TextAlignment.Justify:
                text.Justify();
                break;
        }

        // Paragraph spacing
        var paragraphSpacing = EvaluateFloatProperty(
            node,
            PropertyNames.ParagraphSpacing,
            context,
            0f
        );
        if (paragraphSpacing > 0)
        {
            text.ParagraphSpacing(paragraphSpacing.Value);
        }

        // First line indentation
        var firstLineIndentation = EvaluateFloatProperty(
            node,
            PropertyNames.FirstLineIndentation,
            context,
            0f
        );
        if (firstLineIndentation > 0)
        {
            text.ParagraphFirstLineIndentation(firstLineIndentation.Value);
        }
    }

    /// <summary>
    /// Applies default text style from resolved styles.
    /// </summary>
    private void ApplyDefaultTextStyle(
        TextDescriptor text,
        LayoutNode node,
        RenderContext context,
        StyleProperties resolvedStyle
    )
    {
        text.DefaultTextStyle(style =>
        {
            // Font family - from property, style, or default
            var fontFamily =
                EvaluateStringProperty(node, PropertyNames.FontFamily, context)
                ?? resolvedStyle.FontFamily
                ?? "Helvetica";
            style = style.FontFamily(fontFamily);

            // Font size
            var fontSize =
                EvaluateFloatProperty(node, PropertyNames.FontSize, context)
                ?? resolvedStyle.FontSize
                ?? 12f;
            style = style.FontSize(fontSize);

            // Font weight
            var fontWeightStr = EvaluateStringProperty(node, PropertyNames.FontWeight, context);
            var fontWeight = ParseFontWeight(fontWeightStr) ?? resolvedStyle.FontWeight;
            if (fontWeight.HasValue)
            {
                style = ApplyFontWeight(style, fontWeight.Value);
            }

            // Font style (italic)
            var fontStyleStr = EvaluateStringProperty(node, PropertyNames.FontStyle, context);
            var fontStyle = ParseFontStyle(fontStyleStr) ?? resolvedStyle.FontStyle;
            if (fontStyle == Core.Domain.FontStyle.Italic)
            {
                style = style.Italic();
            }

            // Font color
            var color =
                EvaluateStringProperty(node, PropertyNames.Color, context)
                ?? resolvedStyle.Color
                ?? "#000000";
            style = style.FontColor(ParseColor(color));

            // Background color
            var bgColor =
                EvaluateStringProperty(node, PropertyNames.BackgroundColor, context)
                ?? resolvedStyle.BackgroundColor;
            if (!string.IsNullOrEmpty(bgColor))
            {
                style = style.BackgroundColor(ParseColor(bgColor));
            }

            // Line height
            var lineHeight =
                EvaluateFloatProperty(node, PropertyNames.LineHeight, context)
                ?? resolvedStyle.LineHeight;
            if (lineHeight.HasValue && lineHeight.Value > 0)
            {
                style = style.LineHeight(lineHeight.Value);
            }

            // Letter spacing
            var letterSpacing =
                EvaluateFloatProperty(node, PropertyNames.LetterSpacing, context)
                ?? resolvedStyle.LetterSpacing;
            if (letterSpacing.HasValue)
            {
                style = style.LetterSpacing(letterSpacing.Value);
            }

            // Word spacing
            var wordSpacing = EvaluateFloatProperty(node, PropertyNames.WordSpacing, context);
            if (wordSpacing.HasValue)
            {
                style = style.WordSpacing(wordSpacing.Value);
            }

            return style;
        });
    }

    /// <summary>
    /// Applies text decorations to a span from node properties.
    /// </summary>
    private void ApplyTextDecorations(
        TextSpanDescriptor span,
        LayoutNode node,
        RenderContext context
    )
    {
        var underline = EvaluateBoolProperty(node, PropertyNames.Underline, context, false);
        if (underline == true)
        {
            span.Underline();
        }

        var strikethrough = EvaluateBoolProperty(node, PropertyNames.Strikethrough, context, false);
        if (strikethrough == true)
        {
            span.Strikethrough();
        }

        var overline = EvaluateBoolProperty(node, PropertyNames.Overline, context, false);
        if (overline == true)
        {
            span.Overline();
        }
    }

    /// <summary>
    /// Applies styling to a span from span DTO.
    /// </summary>
    private void ApplySpanStyling(TextSpanDescriptor span, TextSpanDto spanDto, StyleProperties _)
    {
        // Font family
        if (!string.IsNullOrEmpty(spanDto.FontFamily))
        {
            span.FontFamily(spanDto.FontFamily);
        }

        // Font size
        if (spanDto.FontSize.HasValue)
        {
            span.FontSize(spanDto.FontSize.Value);
        }

        // Font weight
        if (!string.IsNullOrEmpty(spanDto.FontWeight))
        {
            var weight = ParseFontWeight(spanDto.FontWeight);
            if (weight.HasValue)
            {
                ApplyFontWeightToSpan(span, weight.Value);
            }
        }

        // Font style (italic)
        if (spanDto.Italic == true)
        {
            span.Italic();
        }

        // Font color
        if (!string.IsNullOrEmpty(spanDto.Color))
        {
            span.FontColor(ParseColor(spanDto.Color));
        }

        // Background color
        if (!string.IsNullOrEmpty(spanDto.BackgroundColor))
        {
            span.BackgroundColor(ParseColor(spanDto.BackgroundColor));
        }

        // Line height
        if (spanDto.LineHeight.HasValue)
        {
            span.LineHeight(spanDto.LineHeight.Value);
        }

        // Letter spacing
        if (spanDto.LetterSpacing.HasValue)
        {
            span.LetterSpacing(spanDto.LetterSpacing.Value);
        }

        // Decorations
        if (spanDto.Underline == true)
        {
            span.Underline();
        }

        if (spanDto.Strikethrough == true)
        {
            span.Strikethrough();
        }

        if (spanDto.Overline == true)
        {
            span.Overline();
        }

        // Subscript/Superscript
        if (spanDto.Subscript == true)
        {
            span.Subscript();
        }

        if (spanDto.Superscript == true)
        {
            span.Superscript();
        }
    }

    /// <summary>
    /// Applies font weight to a TextStyle.
    /// </summary>
    private static TextStyle ApplyFontWeight(TextStyle style, FontWeight weight)
    {
        return weight switch
        {
            FontWeight.Thin => style.Thin(),
            FontWeight.ExtraLight => style.ExtraLight(),
            FontWeight.Light => style.Light(),
            FontWeight.Normal => style.NormalWeight(),
            FontWeight.Medium => style.Medium(),
            FontWeight.SemiBold => style.SemiBold(),
            FontWeight.Bold => style.Bold(),
            FontWeight.ExtraBold => style.ExtraBold(),
            FontWeight.Black => style.Black(),
            _ => style.NormalWeight(),
        };
    }

    /// <summary>
    /// Applies font weight to a TextSpanDescriptor.
    /// </summary>
    private static void ApplyFontWeightToSpan(TextSpanDescriptor span, FontWeight weight)
    {
        switch (weight)
        {
            case FontWeight.Thin:
                span.Thin();
                break;
            case FontWeight.ExtraLight:
                span.ExtraLight();
                break;
            case FontWeight.Light:
                span.Light();
                break;
            case FontWeight.Normal:
                span.NormalWeight();
                break;
            case FontWeight.Medium:
                span.Medium();
                break;
            case FontWeight.SemiBold:
                span.SemiBold();
                break;
            case FontWeight.Bold:
                span.Bold();
                break;
            case FontWeight.ExtraBold:
                span.ExtraBold();
                break;
            case FontWeight.Black:
                span.Black();
                break;
        }
    }

    /// <summary>
    /// Parses a font weight string to the enum value.
    /// </summary>
    private static FontWeight? ParseFontWeight(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return null;
        }

        return value.ToLowerInvariant() switch
        {
            "thin" or "100" => FontWeight.Thin,
            "extralight" or "extra-light" or "200" => FontWeight.ExtraLight,
            "light" or "300" => FontWeight.Light,
            "normal" or "regular" or "400" => FontWeight.Normal,
            "medium" or "500" => FontWeight.Medium,
            "semibold" or "semi-bold" or "600" => FontWeight.SemiBold,
            "bold" or "700" => FontWeight.Bold,
            "extrabold" or "extra-bold" or "800" => FontWeight.ExtraBold,
            "black" or "900" => FontWeight.Black,
            _ => Enum.TryParse<FontWeight>(value, ignoreCase: true, out var result) ? result : null,
        };
    }

    /// <summary>
    /// Parses a font style string to the enum value.
    /// </summary>
    private static Core.Domain.FontStyle? ParseFontStyle(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return null;
        }

        return value.ToLowerInvariant() switch
        {
            "normal" => Core.Domain.FontStyle.Normal,
            "italic" => Core.Domain.FontStyle.Italic,
            "oblique" => Core.Domain.FontStyle.Oblique,
            _ => Enum.TryParse<Core.Domain.FontStyle>(value, ignoreCase: true, out var result)
                ? result
                : null,
        };
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        // Either content or spans is required, but validation is handled in ValidateComponentProperties
        return [];
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            [PropertyNames.Content] = string.Empty,
            [PropertyNames.Spans] = null,
            [PropertyNames.FontFamily] = "Helvetica",
            [PropertyNames.FontSize] = 12f,
            [PropertyNames.FontWeight] = "Normal",
            [PropertyNames.FontStyle] = "Normal",
            [PropertyNames.Color] = "#000000",
            [PropertyNames.BackgroundColor] = null,
            [PropertyNames.LineHeight] = 1.2f,
            [PropertyNames.LetterSpacing] = 0f,
            [PropertyNames.WordSpacing] = 0f,
            [PropertyNames.Alignment] = "Left",
            [PropertyNames.ParagraphSpacing] = 0f,
            [PropertyNames.FirstLineIndentation] = 0f,
            [PropertyNames.Underline] = false,
            [PropertyNames.Strikethrough] = false,
            [PropertyNames.Overline] = false,
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Check that either content or spans is provided
        var hasContent = node.HasProperty(PropertyNames.Content);
        var hasSpans = node.HasProperty(PropertyNames.Spans);

        if (!hasContent && !hasSpans)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Content,
                    Message =
                        $"Text component requires either '{PropertyNames.Content}' or '{PropertyNames.Spans}' property",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate font size if provided
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

        // Validate line height if provided
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

        return errors;
    }
}

/// <summary>
/// DTO for text span configuration in rich text.
/// </summary>
public sealed class TextSpanDto
{
    /// <summary>
    /// Gets or sets the text content of the span.
    /// Supports {{ expression }} syntax.
    /// </summary>
    public string? Text { get; set; }

    /// <summary>
    /// Gets or sets the font family for this span.
    /// </summary>
    public string? FontFamily { get; set; }

    /// <summary>
    /// Gets or sets the font size in points.
    /// </summary>
    public float? FontSize { get; set; }

    /// <summary>
    /// Gets or sets the font weight (e.g., "Bold", "Light").
    /// </summary>
    public string? FontWeight { get; set; }

    /// <summary>
    /// Gets or sets whether the text is italic.
    /// </summary>
    public bool? Italic { get; set; }

    /// <summary>
    /// Gets or sets the text color in hex format.
    /// </summary>
    public string? Color { get; set; }

    /// <summary>
    /// Gets or sets the background color in hex format.
    /// </summary>
    public string? BackgroundColor { get; set; }

    /// <summary>
    /// Gets or sets the line height multiplier.
    /// </summary>
    public float? LineHeight { get; set; }

    /// <summary>
    /// Gets or sets the letter spacing.
    /// </summary>
    public float? LetterSpacing { get; set; }

    /// <summary>
    /// Gets or sets whether the text is underlined.
    /// </summary>
    public bool? Underline { get; set; }

    /// <summary>
    /// Gets or sets whether the text has strikethrough.
    /// </summary>
    public bool? Strikethrough { get; set; }

    /// <summary>
    /// Gets or sets whether the text has overline.
    /// </summary>
    public bool? Overline { get; set; }

    /// <summary>
    /// Gets or sets whether the text is subscript.
    /// </summary>
    public bool? Subscript { get; set; }

    /// <summary>
    /// Gets or sets whether the text is superscript.
    /// </summary>
    public bool? Superscript { get; set; }
}
