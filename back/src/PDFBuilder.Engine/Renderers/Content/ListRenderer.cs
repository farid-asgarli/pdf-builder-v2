using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Content;

/// <summary>
/// Renders List components with support for ordered, unordered, and nested lists.
/// Uses QuestPDF Column and Row elements to create list structures.
/// </summary>
/// <remarks>
/// QuestPDF List API: Custom implementation using Column and Row elements.
///
/// Properties:
/// - type (string): List type - "ordered", "unordered", or "none". Default: "unordered"
/// - items (array, required): Array of list item objects or strings.
///   Each item can have:
///   - content (string): The text content of the list item. Supports {{ expression }} syntax.
///   - children (array): Optional nested list items.
///   - type (string): Override list type for this item.
///
/// Styling:
/// - bulletChar (string): Character for unordered bullets. Default: "•"
/// - bulletSize (float): Size of the bullet character in points. Default: 12
/// - bulletColor (string): Color of the bullet/number in hex format. Default: "#333333"
/// - spacing (float): Spacing between list items in points. Default: 5
/// - indentSize (float): Indentation per nesting level in points. Default: 20
/// - startIndex (int): Starting number for ordered lists. Default: 1
/// - numberFormat (string): Number format - "decimal", "alpha", "roman", "alpha-lower", "roman-lower". Default: "decimal"
///
/// Text Styling (via properties or inherited style):
/// - fontFamily (string): Font family name. Default: "Helvetica"
/// - fontSize (float): Font size in points. Default: 12
/// - color (string): Text color in hex format. Default: "#333333"
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ListRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ListRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ListRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        // List configuration
        public const string Type = "type";
        public const string Items = "items";

        // Bullet styling
        public const string BulletChar = "bulletChar";
        public const string BulletSize = "bulletSize";
        public const string BulletColor = "bulletColor";

        // Layout
        public const string Spacing = "spacing";
        public const string IndentSize = "indentSize";

        // Ordered list
        public const string StartIndex = "startIndex";
        public const string NumberFormat = "numberFormat";

        // Text styling
        public const string FontFamily = "fontFamily";
        public const string FontSize = "fontSize";
        public const string Color = "color";
    }

    /// <summary>
    /// List type enumeration.
    /// </summary>
    private enum ListType
    {
        Unordered,
        Ordered,
        None,
    }

    /// <summary>
    /// Number format for ordered lists.
    /// </summary>
    private enum NumberFormatType
    {
        Decimal,
        Alpha,
        AlphaLower,
        Roman,
        RomanLower,
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.List;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Content;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => false;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        yield return PropertyNames.Items;
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
        // Get list items
        var items = node.GetProperty<List<ListItemDto>>(PropertyNames.Items);
        if (items is null || items.Count == 0)
        {
            Logger.LogDebug("List node {NodeId} has no items", node.Id ?? "unnamed");
            return;
        }

        // Get list configuration
        var listType = ParseListType(
            EvaluateStringProperty(node, PropertyNames.Type, context, "unordered")
        );
        var bulletChar =
            EvaluateStringProperty(node, PropertyNames.BulletChar, context, "•") ?? "•";
        var bulletSize =
            EvaluateFloatProperty(
                node,
                PropertyNames.BulletSize,
                context,
                resolvedStyle.FontSize ?? 12f
            ) ?? 12f;
        var bulletColor = ParseColor(
            EvaluateStringProperty(node, PropertyNames.BulletColor, context),
            resolvedStyle.Color ?? "#333333"
        );
        var spacing = EvaluateFloatProperty(node, PropertyNames.Spacing, context, 5f) ?? 5f;
        var indentSize = EvaluateFloatProperty(node, PropertyNames.IndentSize, context, 20f) ?? 20f;
        var startIndex = EvaluateIntProperty(node, PropertyNames.StartIndex, context, 1) ?? 1;
        var numberFormat = ParseNumberFormat(
            EvaluateStringProperty(node, PropertyNames.NumberFormat, context, "decimal")
        );

        // Get text styling
        var fontFamily =
            EvaluateStringProperty(
                node,
                PropertyNames.FontFamily,
                context,
                resolvedStyle.FontFamily ?? "Helvetica"
            ) ?? "Helvetica";
        var fontSize =
            EvaluateFloatProperty(
                node,
                PropertyNames.FontSize,
                context,
                resolvedStyle.FontSize ?? 12f
            ) ?? 12f;
        var textColor = ParseColor(
            EvaluateStringProperty(node, PropertyNames.Color, context),
            resolvedStyle.Color ?? "#333333"
        );

        Logger.LogTrace("Rendering {ListType} list with {ItemCount} items", listType, items.Count);

        // Create the list configuration for rendering
        var config = new ListRenderConfig
        {
            ListType = listType,
            BulletChar = bulletChar,
            BulletSize = bulletSize,
            BulletColor = bulletColor,
            Spacing = spacing,
            IndentSize = indentSize,
            NumberFormat = numberFormat,
            FontFamily = fontFamily,
            FontSize = fontSize,
            TextColor = textColor,
        };

        // Render the list
        container.Column(column =>
        {
            column.Spacing(spacing);
            RenderListItems(column, items, context, config, nestingLevel: 0, startIndex);
        });
    }

    /// <summary>
    /// Renders a collection of list items recursively.
    /// </summary>
    private void RenderListItems(
        ColumnDescriptor column,
        List<ListItemDto> items,
        RenderContext context,
        ListRenderConfig config,
        int nestingLevel,
        int startIndex
    )
    {
        var itemIndex = startIndex;

        foreach (var item in items)
        {
            // Allow item to override list type
            var itemListType = item.Type is not null ? ParseListType(item.Type) : config.ListType;

            // Calculate total indentation
            var indentation = config.IndentSize * nestingLevel;

            // Get bullet/number text
            var bulletText = GetBulletText(itemListType, config, itemIndex);
            var bulletWidth = CalculateBulletWidth(itemListType, config, itemIndex);

            // Evaluate content expressions
            var content = item.Content;
            if (!string.IsNullOrEmpty(content) && content.Contains("{{") && content.Contains("}}"))
            {
                try
                {
                    content = ExpressionEvaluator.EvaluateString(content, context);
                }
                catch (Exception ex)
                {
                    Logger.LogWarning(
                        ex,
                        "Failed to evaluate expression in list item content: {Content}",
                        content
                    );
                    // Keep original content on error
                }
            }

            // Render the list item row
            column
                .Item()
                .Row(row =>
                {
                    // Indentation
                    if (indentation > 0)
                    {
                        row.ConstantItem(indentation);
                    }

                    // Bullet/number
                    if (!string.IsNullOrEmpty(bulletText))
                    {
                        row.ConstantItem(bulletWidth)
                            .Text(bulletText)
                            .FontSize(config.BulletSize)
                            .FontColor(config.BulletColor);
                    }

                    // Spacer between bullet and content
                    row.ConstantItem(5);

                    // Content
                    row.RelativeItem()
                        .Text(text =>
                        {
                            text.Span(content ?? string.Empty)
                                .FontFamily(config.FontFamily)
                                .FontSize(config.FontSize)
                                .FontColor(config.TextColor);
                        });
                });

            // Render nested children if any
            if (item.Children is { Count: > 0 })
            {
                column
                    .Item()
                    .Column(nestedColumn =>
                    {
                        nestedColumn.Spacing(config.Spacing);
                        RenderListItems(
                            nestedColumn,
                            item.Children,
                            context,
                            config,
                            nestingLevel + 1,
                            startIndex: 1 // Reset numbering for nested lists
                        );
                    });
            }

            itemIndex++;
        }
    }

    /// <summary>
    /// Gets the bullet or number text for a list item.
    /// </summary>
    private static string GetBulletText(ListType listType, ListRenderConfig config, int index)
    {
        return listType switch
        {
            ListType.Unordered => config.BulletChar,
            ListType.Ordered => FormatNumber(index, config.NumberFormat),
            ListType.None => string.Empty,
            _ => config.BulletChar,
        };
    }

    /// <summary>
    /// Calculates the width needed for the bullet column.
    /// </summary>
    private static float CalculateBulletWidth(
        ListType listType,
        ListRenderConfig config,
        int maxIndex
    )
    {
        return listType switch
        {
            ListType.Unordered => config.BulletSize + 5,
            ListType.Ordered => CalculateNumberWidth(maxIndex, config),
            ListType.None => 0,
            _ => config.BulletSize + 5,
        };
    }

    /// <summary>
    /// Calculates the width needed for ordered list numbers.
    /// </summary>
    private static float CalculateNumberWidth(int maxIndex, ListRenderConfig config)
    {
        // Estimate width based on number of digits and format
        var formatted = FormatNumber(maxIndex, config.NumberFormat);
        // Rough estimate: each character is about 0.6 * font size
        return Math.Max(formatted.Length * config.BulletSize * 0.6f + 5, 20f);
    }

    /// <summary>
    /// Formats a number according to the specified format.
    /// </summary>
    private static string FormatNumber(int number, NumberFormatType format)
    {
        return format switch
        {
            NumberFormatType.Decimal => $"{number}.",
            NumberFormatType.Alpha => $"{ToAlpha(number, uppercase: true)})",
            NumberFormatType.AlphaLower => $"{ToAlpha(number, uppercase: false)})",
            NumberFormatType.Roman => $"{ToRoman(number)}.",
            NumberFormatType.RomanLower => $"{ToRoman(number).ToLowerInvariant()}.",
            _ => $"{number}.",
        };
    }

    /// <summary>
    /// Converts a number to alphabetic representation (A, B, C, ..., Z, AA, AB, ...).
    /// </summary>
    private static string ToAlpha(int number, bool uppercase)
    {
        var result = string.Empty;
        while (number > 0)
        {
            number--;
            result = (char)((uppercase ? 'A' : 'a') + number % 26) + result;
            number /= 26;
        }
        return result;
    }

    /// <summary>
    /// Converts a number to Roman numeral representation.
    /// </summary>
    private static string ToRoman(int number)
    {
        if (number <= 0 || number > 3999)
        {
            return number.ToString();
        }

        ReadOnlySpan<string> romanNumerals =
        [
            "M",
            "CM",
            "D",
            "CD",
            "C",
            "XC",
            "L",
            "XL",
            "X",
            "IX",
            "V",
            "IV",
            "I",
        ];
        ReadOnlySpan<int> values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];

        var result = string.Empty;
        for (var i = 0; i < values.Length; i++)
        {
            while (number >= values[i])
            {
                result += romanNumerals[i];
                number -= values[i];
            }
        }
        return result;
    }

    /// <summary>
    /// Parses the list type from a string.
    /// </summary>
    private static ListType ParseListType(string? type)
    {
        return type?.ToLowerInvariant() switch
        {
            "ordered" => ListType.Ordered,
            "unordered" => ListType.Unordered,
            "none" => ListType.None,
            _ => ListType.Unordered,
        };
    }

    /// <summary>
    /// Parses the number format from a string.
    /// </summary>
    private static NumberFormatType ParseNumberFormat(string? format)
    {
        return format?.ToLowerInvariant() switch
        {
            "decimal" => NumberFormatType.Decimal,
            "alpha" => NumberFormatType.Alpha,
            "alpha-upper" => NumberFormatType.Alpha,
            "alpha-lower" => NumberFormatType.AlphaLower,
            "roman" => NumberFormatType.Roman,
            "roman-upper" => NumberFormatType.Roman,
            "roman-lower" => NumberFormatType.RomanLower,
            _ => NumberFormatType.Decimal,
        };
    }

    /// <summary>
    /// Configuration for list rendering.
    /// </summary>
    private sealed class ListRenderConfig
    {
        public ListType ListType { get; init; }
        public string BulletChar { get; init; } = "•";
        public float BulletSize { get; init; } = 12f;
        public string BulletColor { get; init; } = "#333333";
        public float Spacing { get; init; } = 5f;
        public float IndentSize { get; init; } = 20f;
        public NumberFormatType NumberFormat { get; init; } = NumberFormatType.Decimal;
        public string FontFamily { get; init; } = "Helvetica";
        public float FontSize { get; init; } = 12f;
        public string TextColor { get; init; } = "#333333";
    }
}

/// <summary>
/// DTO for list item data.
/// </summary>
public sealed class ListItemDto
{
    /// <summary>
    /// The text content of the list item. Supports {{ expression }} syntax.
    /// </summary>
    public string? Content { get; set; }

    /// <summary>
    /// Optional override for the list type of this item.
    /// </summary>
    public string? Type { get; set; }

    /// <summary>
    /// Optional nested list items.
    /// </summary>
    public List<ListItemDto>? Children { get; set; }
}
