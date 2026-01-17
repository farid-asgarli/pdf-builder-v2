using System.ComponentModel.DataAnnotations;

namespace PDFBuilder.Contracts.DTOs;

/// <summary>
/// Data transfer object for style properties that can be applied to layout nodes.
/// Supports style inheritance - child nodes inherit parent styles unless overridden.
/// </summary>
public class StylePropertiesDto
{
    // ========================================
    // Text Styling Properties
    // ========================================

    /// <summary>
    /// Gets or sets the font family name.
    /// </summary>
    /// <example>Arial</example>
    [StringLength(100, ErrorMessage = "Font family name cannot exceed 100 characters")]
    public string? FontFamily { get; set; }

    /// <summary>
    /// Gets or sets the font size in points.
    /// </summary>
    /// <example>12</example>
    [Range(1, 1000, ErrorMessage = "Font size must be between 1 and 1000")]
    public float? FontSize { get; set; }

    /// <summary>
    /// Gets or sets the font weight (e.g., "Normal", "Bold", "Thin", "Black").
    /// </summary>
    /// <example>Bold</example>
    [StringLength(50, ErrorMessage = "Font weight cannot exceed 50 characters")]
    public string? FontWeight { get; set; }

    /// <summary>
    /// Gets or sets the font style ("Normal" or "Italic").
    /// </summary>
    /// <example>Italic</example>
    [StringLength(50, ErrorMessage = "Font style cannot exceed 50 characters")]
    public string? FontStyle { get; set; }

    /// <summary>
    /// Gets or sets the text color in hex format (e.g., "#333333").
    /// </summary>
    /// <example>#333333</example>
    [RegularExpression(
        @"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$",
        ErrorMessage = "Color must be a valid hex color (e.g., #333333 or #RGB)"
    )]
    public string? Color { get; set; }

    /// <summary>
    /// Gets or sets the text decoration ("None", "Underline", "Strikethrough").
    /// </summary>
    /// <example>Underline</example>
    [StringLength(50, ErrorMessage = "Text decoration cannot exceed 50 characters")]
    public string? TextDecoration { get; set; }

    /// <summary>
    /// Gets or sets the line height multiplier.
    /// </summary>
    /// <example>1.5</example>
    [Range(0.1, 10, ErrorMessage = "Line height must be between 0.1 and 10")]
    public float? LineHeight { get; set; }

    /// <summary>
    /// Gets or sets the letter spacing in points.
    /// </summary>
    /// <example>0.5</example>
    [Range(-100, 100, ErrorMessage = "Letter spacing must be between -100 and 100")]
    public float? LetterSpacing { get; set; }

    /// <summary>
    /// Gets or sets the text alignment ("Left", "Center", "Right", "Justify").
    /// </summary>
    /// <example>Left</example>
    [StringLength(50, ErrorMessage = "Text alignment cannot exceed 50 characters")]
    public string? TextAlignment { get; set; }

    // ========================================
    // Layout Properties
    // ========================================

    /// <summary>
    /// Gets or sets the horizontal alignment within parent ("Left", "Center", "Right").
    /// </summary>
    /// <example>Center</example>
    [StringLength(50, ErrorMessage = "Horizontal alignment cannot exceed 50 characters")]
    public string? HorizontalAlignment { get; set; }

    /// <summary>
    /// Gets or sets the vertical alignment within parent ("Top", "Middle", "Bottom").
    /// </summary>
    /// <example>Middle</example>
    [StringLength(50, ErrorMessage = "Vertical alignment cannot exceed 50 characters")]
    public string? VerticalAlignment { get; set; }

    // ========================================
    // Spacing Properties
    // ========================================

    /// <summary>
    /// Gets or sets uniform padding on all sides in points.
    /// </summary>
    /// <example>10</example>
    [Range(0, 1000, ErrorMessage = "Padding must be between 0 and 1000")]
    public float? Padding { get; set; }

    /// <summary>
    /// Gets or sets the top padding in points.
    /// </summary>
    [Range(0, 1000, ErrorMessage = "PaddingTop must be between 0 and 1000")]
    public float? PaddingTop { get; set; }

    /// <summary>
    /// Gets or sets the right padding in points.
    /// </summary>
    [Range(0, 1000, ErrorMessage = "PaddingRight must be between 0 and 1000")]
    public float? PaddingRight { get; set; }

    /// <summary>
    /// Gets or sets the bottom padding in points.
    /// </summary>
    [Range(0, 1000, ErrorMessage = "PaddingBottom must be between 0 and 1000")]
    public float? PaddingBottom { get; set; }

    /// <summary>
    /// Gets or sets the left padding in points.
    /// </summary>
    [Range(0, 1000, ErrorMessage = "PaddingLeft must be between 0 and 1000")]
    public float? PaddingLeft { get; set; }

    /// <summary>
    /// Gets or sets horizontal padding (left and right) in points.
    /// </summary>
    [Range(0, 1000, ErrorMessage = "PaddingHorizontal must be between 0 and 1000")]
    public float? PaddingHorizontal { get; set; }

    /// <summary>
    /// Gets or sets vertical padding (top and bottom) in points.
    /// </summary>
    [Range(0, 1000, ErrorMessage = "PaddingVertical must be between 0 and 1000")]
    public float? PaddingVertical { get; set; }

    // ========================================
    // Visual Properties
    // ========================================

    /// <summary>
    /// Gets or sets the background color in hex format.
    /// </summary>
    /// <example>#FFFFFF</example>
    [RegularExpression(
        @"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$",
        ErrorMessage = "Background color must be a valid hex color"
    )]
    public string? BackgroundColor { get; set; }

    /// <summary>
    /// Gets or sets the border color in hex format.
    /// </summary>
    /// <example>#000000</example>
    [RegularExpression(
        @"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$",
        ErrorMessage = "Border color must be a valid hex color"
    )]
    public string? BorderColor { get; set; }

    /// <summary>
    /// Gets or sets the border width in points (all sides).
    /// </summary>
    [Range(0, 100, ErrorMessage = "BorderWidth must be between 0 and 100")]
    public float? BorderWidth { get; set; }

    /// <summary>
    /// Gets or sets the top border width in points.
    /// </summary>
    [Range(0, 100, ErrorMessage = "BorderTop must be between 0 and 100")]
    public float? BorderTop { get; set; }

    /// <summary>
    /// Gets or sets the right border width in points.
    /// </summary>
    [Range(0, 100, ErrorMessage = "BorderRight must be between 0 and 100")]
    public float? BorderRight { get; set; }

    /// <summary>
    /// Gets or sets the bottom border width in points.
    /// </summary>
    [Range(0, 100, ErrorMessage = "BorderBottom must be between 0 and 100")]
    public float? BorderBottom { get; set; }

    /// <summary>
    /// Gets or sets the left border width in points.
    /// </summary>
    [Range(0, 100, ErrorMessage = "BorderLeft must be between 0 and 100")]
    public float? BorderLeft { get; set; }

    /// <summary>
    /// Gets or sets the border radius for rounded corners in points.
    /// </summary>
    [Range(0, 500, ErrorMessage = "BorderRadius must be between 0 and 500")]
    public float? BorderRadius { get; set; }

    /// <summary>
    /// Gets or sets the opacity (0.0 to 1.0).
    /// </summary>
    [Range(0, 1, ErrorMessage = "Opacity must be between 0 and 1")]
    public float? Opacity { get; set; }
}
