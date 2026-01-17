using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using PDFBuilder.Contracts.DTOs;

namespace PDFBuilder.Contracts.Requests;

/// <summary>
/// Request model for layout validation.
/// Used to pre-validate a layout before PDF generation.
/// </summary>
public class ValidateLayoutRequest
{
    /// <summary>
    /// Gets or sets the layout tree definition to validate.
    /// </summary>
    [Required(ErrorMessage = "Layout definition is required")]
    public LayoutNodeDto Layout { get; set; } = null!;

    /// <summary>
    /// Gets or sets sample data for expression validation.
    /// If provided, expressions will be validated against this data structure.
    /// </summary>
    public JsonElement? SampleData { get; set; }

    /// <summary>
    /// Gets or sets the page settings to validate.
    /// </summary>
    public PageSettingsDto? PageSettings { get; set; }

    /// <summary>
    /// Gets or sets validation options.
    /// </summary>
    public ValidationOptionsDto? Options { get; set; }
}

/// <summary>
/// Options for layout validation.
/// </summary>
public class ValidationOptionsDto
{
    /// <summary>
    /// Gets or sets whether to validate expressions.
    /// Default is true.
    /// </summary>
    public bool ValidateExpressions { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to validate image URLs are accessible.
    /// Default is false (can be slow).
    /// </summary>
    public bool ValidateImageUrls { get; set; } = false;

    /// <summary>
    /// Gets or sets whether to validate font availability.
    /// Default is true.
    /// </summary>
    public bool ValidateFonts { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to check for deprecated component usage.
    /// Default is true.
    /// </summary>
    public bool CheckDeprecations { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to include performance warnings.
    /// Default is true.
    /// </summary>
    public bool IncludePerformanceWarnings { get; set; } = true;

    /// <summary>
    /// Gets or sets the maximum depth to validate in the layout tree.
    /// Default is 100.
    /// </summary>
    [Range(1, 1000, ErrorMessage = "MaxDepth must be between 1 and 1000")]
    public int MaxDepth { get; set; } = 100;

    /// <summary>
    /// Gets or sets whether strict mode is enabled.
    /// In strict mode, warnings are treated as errors.
    /// </summary>
    public bool StrictMode { get; set; } = false;
}
