using System.Text.Json.Serialization;

namespace PDFBuilder.Core.Domain;

/// <summary>
/// Represents the style properties that can be applied to layout nodes.
/// Supports style inheritance - child nodes inherit parent styles unless overridden.
/// </summary>
public class StyleProperties
{
    // ========================================
    // Text Styling Properties
    // ========================================

    /// <summary>
    /// Gets or sets the font family name.
    /// </summary>
    public string? FontFamily { get; set; }

    /// <summary>
    /// Gets or sets the font size in points.
    /// </summary>
    public float? FontSize { get; set; }

    /// <summary>
    /// Gets or sets the font weight.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public FontWeight? FontWeight { get; set; }

    /// <summary>
    /// Gets or sets the font style (normal, italic).
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public FontStyle? FontStyle { get; set; }

    /// <summary>
    /// Gets or sets the text color in hex format (e.g., "#333333").
    /// </summary>
    public string? Color { get; set; }

    /// <summary>
    /// Gets or sets the text decoration (underline, strikethrough).
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public TextDecoration? TextDecoration { get; set; }

    /// <summary>
    /// Gets or sets the line height multiplier.
    /// </summary>
    public float? LineHeight { get; set; }

    /// <summary>
    /// Gets or sets the letter spacing in points.
    /// </summary>
    public float? LetterSpacing { get; set; }

    /// <summary>
    /// Gets or sets the text alignment.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public TextAlignment? TextAlignment { get; set; }

    // ========================================
    // Layout Properties
    // ========================================

    /// <summary>
    /// Gets or sets the horizontal alignment within parent.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public HorizontalAlignment? HorizontalAlignment { get; set; }

    /// <summary>
    /// Gets or sets the vertical alignment within parent.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public VerticalAlignment? VerticalAlignment { get; set; }

    // ========================================
    // Spacing Properties
    // ========================================

    /// <summary>
    /// Gets or sets uniform padding on all sides.
    /// </summary>
    public float? Padding { get; set; }

    /// <summary>
    /// Gets or sets the top padding.
    /// </summary>
    public float? PaddingTop { get; set; }

    /// <summary>
    /// Gets or sets the right padding.
    /// </summary>
    public float? PaddingRight { get; set; }

    /// <summary>
    /// Gets or sets the bottom padding.
    /// </summary>
    public float? PaddingBottom { get; set; }

    /// <summary>
    /// Gets or sets the left padding.
    /// </summary>
    public float? PaddingLeft { get; set; }

    /// <summary>
    /// Gets or sets horizontal padding (left and right).
    /// </summary>
    public float? PaddingHorizontal { get; set; }

    /// <summary>
    /// Gets or sets vertical padding (top and bottom).
    /// </summary>
    public float? PaddingVertical { get; set; }

    // ========================================
    // Visual Properties
    // ========================================

    /// <summary>
    /// Gets or sets the background color in hex format.
    /// </summary>
    public string? BackgroundColor { get; set; }

    /// <summary>
    /// Gets or sets the border color in hex format.
    /// </summary>
    public string? BorderColor { get; set; }

    /// <summary>
    /// Gets or sets the border width in points.
    /// </summary>
    public float? BorderWidth { get; set; }

    /// <summary>
    /// Gets or sets the top border width.
    /// </summary>
    public float? BorderTop { get; set; }

    /// <summary>
    /// Gets or sets the right border width.
    /// </summary>
    public float? BorderRight { get; set; }

    /// <summary>
    /// Gets or sets the bottom border width.
    /// </summary>
    public float? BorderBottom { get; set; }

    /// <summary>
    /// Gets or sets the left border width.
    /// </summary>
    public float? BorderLeft { get; set; }

    /// <summary>
    /// Gets or sets the border radius for rounded corners.
    /// </summary>
    public float? BorderRadius { get; set; }

    /// <summary>
    /// Gets or sets the opacity (0.0 to 1.0).
    /// </summary>
    public float? Opacity { get; set; }

    // ========================================
    // Sizing Properties
    // ========================================

    /// <summary>
    /// Gets or sets the fixed width.
    /// </summary>
    public float? Width { get; set; }

    /// <summary>
    /// Gets or sets the fixed height.
    /// </summary>
    public float? Height { get; set; }

    /// <summary>
    /// Gets or sets the minimum width.
    /// </summary>
    public float? MinWidth { get; set; }

    /// <summary>
    /// Gets or sets the maximum width.
    /// </summary>
    public float? MaxWidth { get; set; }

    /// <summary>
    /// Gets or sets the minimum height.
    /// </summary>
    public float? MinHeight { get; set; }

    /// <summary>
    /// Gets or sets the maximum height.
    /// </summary>
    public float? MaxHeight { get; set; }

    /// <summary>
    /// Merges this style with a parent style.
    /// Child properties override parent properties.
    /// </summary>
    /// <param name="parentStyle">The parent style to inherit from.</param>
    /// <returns>A new StyleProperties with merged values.</returns>
    public StyleProperties MergeWith(StyleProperties? parentStyle)
    {
        if (parentStyle is null)
        {
            return Clone();
        }

        return new StyleProperties
        {
            // Text properties - inherit from parent if not set
            FontFamily = FontFamily ?? parentStyle.FontFamily,
            FontSize = FontSize ?? parentStyle.FontSize,
            FontWeight = FontWeight ?? parentStyle.FontWeight,
            FontStyle = FontStyle ?? parentStyle.FontStyle,
            Color = Color ?? parentStyle.Color,
            TextDecoration = TextDecoration ?? parentStyle.TextDecoration,
            LineHeight = LineHeight ?? parentStyle.LineHeight,
            LetterSpacing = LetterSpacing ?? parentStyle.LetterSpacing,
            TextAlignment = TextAlignment ?? parentStyle.TextAlignment,

            // Layout properties - inherit from parent if not set
            HorizontalAlignment = HorizontalAlignment ?? parentStyle.HorizontalAlignment,
            VerticalAlignment = VerticalAlignment ?? parentStyle.VerticalAlignment,

            // Spacing - do NOT inherit (each node has its own spacing)
            Padding = Padding,
            PaddingTop = PaddingTop,
            PaddingRight = PaddingRight,
            PaddingBottom = PaddingBottom,
            PaddingLeft = PaddingLeft,
            PaddingHorizontal = PaddingHorizontal,
            PaddingVertical = PaddingVertical,

            // Visual - do NOT inherit (each node has its own visual style)
            BackgroundColor = BackgroundColor,
            BorderColor = BorderColor,
            BorderWidth = BorderWidth,
            BorderTop = BorderTop,
            BorderRight = BorderRight,
            BorderBottom = BorderBottom,
            BorderLeft = BorderLeft,
            BorderRadius = BorderRadius,
            Opacity = Opacity,

            // Sizing - do NOT inherit
            Width = Width,
            Height = Height,
            MinWidth = MinWidth,
            MaxWidth = MaxWidth,
            MinHeight = MinHeight,
            MaxHeight = MaxHeight,
        };
    }

    /// <summary>
    /// Creates a deep clone of this style.
    /// </summary>
    /// <returns>A new StyleProperties with the same values.</returns>
    public StyleProperties Clone()
    {
        return new StyleProperties
        {
            FontFamily = FontFamily,
            FontSize = FontSize,
            FontWeight = FontWeight,
            FontStyle = FontStyle,
            Color = Color,
            TextDecoration = TextDecoration,
            LineHeight = LineHeight,
            LetterSpacing = LetterSpacing,
            TextAlignment = TextAlignment,
            HorizontalAlignment = HorizontalAlignment,
            VerticalAlignment = VerticalAlignment,
            Padding = Padding,
            PaddingTop = PaddingTop,
            PaddingRight = PaddingRight,
            PaddingBottom = PaddingBottom,
            PaddingLeft = PaddingLeft,
            PaddingHorizontal = PaddingHorizontal,
            PaddingVertical = PaddingVertical,
            BackgroundColor = BackgroundColor,
            BorderColor = BorderColor,
            BorderWidth = BorderWidth,
            BorderTop = BorderTop,
            BorderRight = BorderRight,
            BorderBottom = BorderBottom,
            BorderLeft = BorderLeft,
            BorderRadius = BorderRadius,
            Opacity = Opacity,
            Width = Width,
            Height = Height,
            MinWidth = MinWidth,
            MaxWidth = MaxWidth,
            MinHeight = MinHeight,
            MaxHeight = MaxHeight,
        };
    }

    /// <summary>
    /// Gets the effective padding values, resolving shorthand and specific values.
    /// </summary>
    /// <returns>A tuple of (top, right, bottom, left) padding values.</returns>
    public (float Top, float Right, float Bottom, float Left) GetEffectivePadding()
    {
        var uniformPadding = Padding ?? 0;
        var horizontalPadding = PaddingHorizontal ?? uniformPadding;
        var verticalPadding = PaddingVertical ?? uniformPadding;

        return (
            PaddingTop ?? verticalPadding,
            PaddingRight ?? horizontalPadding,
            PaddingBottom ?? verticalPadding,
            PaddingLeft ?? horizontalPadding
        );
    }

    /// <summary>
    /// Gets the effective border values, resolving shorthand and specific values.
    /// </summary>
    /// <returns>A tuple of (top, right, bottom, left) border values.</returns>
    public (float Top, float Right, float Bottom, float Left) GetEffectiveBorder()
    {
        var uniformBorder = BorderWidth ?? 0;

        return (
            BorderTop ?? uniformBorder,
            BorderRight ?? uniformBorder,
            BorderBottom ?? uniformBorder,
            BorderLeft ?? uniformBorder
        );
    }

    /// <summary>
    /// Checks if this style has any text-related properties set.
    /// </summary>
    public bool HasTextProperties =>
        FontFamily is not null
        || FontSize.HasValue
        || FontWeight.HasValue
        || FontStyle.HasValue
        || Color is not null
        || TextDecoration.HasValue
        || LineHeight.HasValue
        || LetterSpacing.HasValue
        || TextAlignment.HasValue;

    /// <summary>
    /// Checks if this style has any padding properties set.
    /// </summary>
    public bool HasPaddingProperties =>
        Padding.HasValue
        || PaddingTop.HasValue
        || PaddingRight.HasValue
        || PaddingBottom.HasValue
        || PaddingLeft.HasValue
        || PaddingHorizontal.HasValue
        || PaddingVertical.HasValue;

    /// <summary>
    /// Checks if this style has any border properties set.
    /// </summary>
    public bool HasBorderProperties =>
        BorderWidth.HasValue
        || BorderTop.HasValue
        || BorderRight.HasValue
        || BorderBottom.HasValue
        || BorderLeft.HasValue
        || BorderColor is not null
        || BorderRadius.HasValue;

    /// <summary>
    /// Checks if this style has any visual properties set.
    /// </summary>
    public bool HasVisualProperties =>
        BackgroundColor is not null || HasBorderProperties || Opacity.HasValue;
}

/// <summary>
/// Font weight enumeration matching common CSS values.
/// </summary>
public enum FontWeight
{
    /// <summary>Thin (100)</summary>
    Thin = 100,

    /// <summary>Extra Light (200)</summary>
    ExtraLight = 200,

    /// <summary>Light (300)</summary>
    Light = 300,

    /// <summary>Normal/Regular (400)</summary>
    Normal = 400,

    /// <summary>Medium (500)</summary>
    Medium = 500,

    /// <summary>Semi Bold (600)</summary>
    SemiBold = 600,

    /// <summary>Bold (700)</summary>
    Bold = 700,

    /// <summary>Extra Bold (800)</summary>
    ExtraBold = 800,

    /// <summary>Black (900)</summary>
    Black = 900,
}

/// <summary>
/// Font style enumeration.
/// </summary>
public enum FontStyle
{
    /// <summary>Normal upright text.</summary>
    Normal,

    /// <summary>Italic text.</summary>
    Italic,

    /// <summary>Oblique text.</summary>
    Oblique,
}

/// <summary>
/// Text decoration enumeration.
/// </summary>
public enum TextDecoration
{
    /// <summary>No decoration.</summary>
    None,

    /// <summary>Underlined text.</summary>
    Underline,

    /// <summary>Line through text.</summary>
    Strikethrough,

    /// <summary>Line above text.</summary>
    Overline,
}

/// <summary>
/// Text alignment enumeration.
/// </summary>
public enum TextAlignment
{
    /// <summary>Left-aligned text.</summary>
    Left,

    /// <summary>Center-aligned text.</summary>
    Center,

    /// <summary>Right-aligned text.</summary>
    Right,

    /// <summary>Justified text.</summary>
    Justify,

    /// <summary>Start of text direction (LTR = Left, RTL = Right).</summary>
    Start,

    /// <summary>End of text direction (LTR = Right, RTL = Left).</summary>
    End,
}

/// <summary>
/// Horizontal alignment enumeration.
/// </summary>
public enum HorizontalAlignment
{
    /// <summary>Align to the left.</summary>
    Left,

    /// <summary>Align to the center.</summary>
    Center,

    /// <summary>Align to the right.</summary>
    Right,
}

/// <summary>
/// Vertical alignment enumeration.
/// </summary>
public enum VerticalAlignment
{
    /// <summary>Align to the top.</summary>
    Top,

    /// <summary>Align to the middle.</summary>
    Middle,

    /// <summary>Align to the bottom.</summary>
    Bottom,
}

/// <summary>
/// Content direction for LTR/RTL layout support.
/// </summary>
public enum ContentDirection
{
    /// <summary>Left to right (default for most languages).</summary>
    LeftToRight,

    /// <summary>Right to left (for Arabic, Hebrew, etc.).</summary>
    RightToLeft,
}

/// <summary>
/// Page break behavior enumeration.
/// </summary>
public enum PageBreakBehavior
{
    /// <summary>Automatic page breaks as needed.</summary>
    Auto,

    /// <summary>Force a page break before.</summary>
    Before,

    /// <summary>Force a page break after.</summary>
    After,

    /// <summary>Avoid page breaks if possible.</summary>
    Avoid,
}

/// <summary>
/// List type enumeration.
/// </summary>
public enum ListType
{
    /// <summary>Unordered list with bullets.</summary>
    Unordered,

    /// <summary>Ordered list with numbers.</summary>
    Ordered,

    /// <summary>Ordered list with letters.</summary>
    Alphabetic,

    /// <summary>Ordered list with Roman numerals.</summary>
    Roman,
}

/// <summary>
/// Line orientation for the Line component.
/// </summary>
public enum LineOrientation
{
    /// <summary>Horizontal line.</summary>
    Horizontal,

    /// <summary>Vertical line.</summary>
    Vertical,
}

/// <summary>
/// Flip direction for the Flip component.
/// </summary>
public enum FlipDirection
{
    /// <summary>Flip horizontally (mirror left-right).</summary>
    Horizontal,

    /// <summary>Flip vertically (mirror top-bottom).</summary>
    Vertical,

    /// <summary>Flip both horizontally and vertically.</summary>
    Both,
}

/// <summary>
/// Aspect ratio fitting mode.
/// </summary>
public enum AspectRatioMode
{
    /// <summary>Fit within the available space, maintaining aspect ratio.</summary>
    FitWidth,

    /// <summary>Fit the height, potentially exceeding width.</summary>
    FitHeight,

    /// <summary>Fill the entire area, potentially clipping content.</summary>
    FitArea,
}

/// <summary>
/// Barcode type enumeration.
/// </summary>
public enum BarcodeType
{
    /// <summary>QR Code.</summary>
    QRCode,

    /// <summary>Code 128 barcode.</summary>
    Code128,

    /// <summary>Code 39 barcode.</summary>
    Code39,

    /// <summary>EAN-13 barcode.</summary>
    Ean13,

    /// <summary>EAN-8 barcode.</summary>
    Ean8,

    /// <summary>UPC-A barcode.</summary>
    UpcA,

    /// <summary>UPC-E barcode.</summary>
    UpcE,

    /// <summary>PDF417 barcode.</summary>
    Pdf417,

    /// <summary>Data Matrix barcode.</summary>
    DataMatrix,
}
