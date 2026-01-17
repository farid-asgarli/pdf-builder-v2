using System.ComponentModel.DataAnnotations;

namespace PDFBuilder.Contracts.DTOs;

/// <summary>
/// Data transfer object for PDF page settings.
/// Defines page size, orientation, margins, and other page-level properties.
/// </summary>
public class PageSettingsDto
{
    /// <summary>
    /// Gets or sets the page size preset (e.g., "A4", "Letter", "Legal").
    /// If specified, Width and Height are ignored.
    /// </summary>
    /// <example>A4</example>
    [StringLength(50, ErrorMessage = "Page size cannot exceed 50 characters")]
    public string? PageSize { get; set; }

    /// <summary>
    /// Gets or sets custom page width in points (1 inch = 72 points).
    /// Only used when PageSize is not specified or is "Custom".
    /// </summary>
    /// <example>595</example>
    [Range(72, 10000, ErrorMessage = "Width must be between 72 and 10000 points")]
    public float? Width { get; set; }

    /// <summary>
    /// Gets or sets custom page height in points (1 inch = 72 points).
    /// Only used when PageSize is not specified or is "Custom".
    /// </summary>
    /// <example>842</example>
    [Range(72, 10000, ErrorMessage = "Height must be between 72 and 10000 points")]
    public float? Height { get; set; }

    /// <summary>
    /// Gets or sets the page orientation ("Portrait" or "Landscape").
    /// </summary>
    /// <example>Portrait</example>
    [RegularExpression(
        "^(Portrait|Landscape)$",
        ErrorMessage = "Orientation must be 'Portrait' or 'Landscape'"
    )]
    public string? Orientation { get; set; }

    /// <summary>
    /// Gets or sets uniform margin on all sides in points.
    /// </summary>
    /// <example>36</example>
    [Range(0, 500, ErrorMessage = "Margin must be between 0 and 500")]
    public float? Margin { get; set; }

    /// <summary>
    /// Gets or sets the top margin in points.
    /// </summary>
    [Range(0, 500, ErrorMessage = "MarginTop must be between 0 and 500")]
    public float? MarginTop { get; set; }

    /// <summary>
    /// Gets or sets the right margin in points.
    /// </summary>
    [Range(0, 500, ErrorMessage = "MarginRight must be between 0 and 500")]
    public float? MarginRight { get; set; }

    /// <summary>
    /// Gets or sets the bottom margin in points.
    /// </summary>
    [Range(0, 500, ErrorMessage = "MarginBottom must be between 0 and 500")]
    public float? MarginBottom { get; set; }

    /// <summary>
    /// Gets or sets the left margin in points.
    /// </summary>
    [Range(0, 500, ErrorMessage = "MarginLeft must be between 0 and 500")]
    public float? MarginLeft { get; set; }

    /// <summary>
    /// Gets or sets the background color for all pages in hex format.
    /// </summary>
    /// <example>#FFFFFF</example>
    [RegularExpression(
        @"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$",
        ErrorMessage = "BackgroundColor must be a valid hex color"
    )]
    public string? BackgroundColor { get; set; }

    /// <summary>
    /// Gets or sets whether page numbers should be shown.
    /// </summary>
    public bool? ShowPageNumbers { get; set; }

    /// <summary>
    /// Gets or sets the page number format (e.g., "Page {current} of {total}").
    /// </summary>
    /// <example>Page {current} of {total}</example>
    [StringLength(100, ErrorMessage = "PageNumberFormat cannot exceed 100 characters")]
    public string? PageNumberFormat { get; set; }

    /// <summary>
    /// Gets or sets the page number position ("TopLeft", "TopCenter", "TopRight",
    /// "BottomLeft", "BottomCenter", "BottomRight").
    /// </summary>
    /// <example>BottomCenter</example>
    [StringLength(50, ErrorMessage = "PageNumberPosition cannot exceed 50 characters")]
    public string? PageNumberPosition { get; set; }

    /// <summary>
    /// Gets or sets whether to enable continuous page mode (no page breaks).
    /// </summary>
    public bool? ContinuousMode { get; set; }

    /// <summary>
    /// Gets or sets the content direction ("LTR" or "RTL").
    /// </summary>
    /// <example>LTR</example>
    [RegularExpression("^(LTR|RTL)$", ErrorMessage = "ContentDirection must be 'LTR' or 'RTL'")]
    public string? ContentDirection { get; set; }
}
