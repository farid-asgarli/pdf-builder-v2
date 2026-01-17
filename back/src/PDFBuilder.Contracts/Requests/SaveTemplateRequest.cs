using System.ComponentModel.DataAnnotations;
using PDFBuilder.Contracts.DTOs;

namespace PDFBuilder.Contracts.Requests;

/// <summary>
/// Request model for saving a new template.
/// </summary>
public class SaveTemplateRequest
{
    /// <summary>
    /// Gets or sets the template name.
    /// </summary>
    /// <example>Invoice Template</example>
    [Required(ErrorMessage = "Template name is required")]
    [StringLength(
        200,
        MinimumLength = 1,
        ErrorMessage = "Template name must be between 1 and 200 characters"
    )]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the template description.
    /// </summary>
    /// <example>Standard invoice template with company branding and line items.</example>
    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the template category.
    /// </summary>
    /// <example>Invoice</example>
    [StringLength(100, ErrorMessage = "Category cannot exceed 100 characters")]
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the layout definition.
    /// </summary>
    [Required(ErrorMessage = "Layout definition is required")]
    public LayoutNodeDto Layout { get; set; } = null!;

    /// <summary>
    /// Gets or sets the page settings for this template.
    /// </summary>
    public PageSettingsDto? PageSettings { get; set; }

    /// <summary>
    /// Gets or sets the tags associated with this template.
    /// </summary>
    /// <example>invoice,business,standard</example>
    [StringLength(500, ErrorMessage = "Tags cannot exceed 500 characters")]
    public string? Tags { get; set; }

    /// <summary>
    /// Gets or sets additional metadata.
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }
}

/// <summary>
/// Request model for updating an existing template.
/// </summary>
public class UpdateTemplateRequest
{
    /// <summary>
    /// Gets or sets the template name.
    /// </summary>
    [StringLength(
        200,
        MinimumLength = 1,
        ErrorMessage = "Template name must be between 1 and 200 characters"
    )]
    public string? Name { get; set; }

    /// <summary>
    /// Gets or sets the template description.
    /// </summary>
    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the template category.
    /// </summary>
    [StringLength(100, ErrorMessage = "Category cannot exceed 100 characters")]
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the layout definition.
    /// If null, layout is not updated.
    /// </summary>
    public LayoutNodeDto? Layout { get; set; }

    /// <summary>
    /// Gets or sets the page settings for this template.
    /// </summary>
    public PageSettingsDto? PageSettings { get; set; }

    /// <summary>
    /// Gets or sets whether the template is active.
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// Gets or sets the tags associated with this template.
    /// </summary>
    [StringLength(500, ErrorMessage = "Tags cannot exceed 500 characters")]
    public string? Tags { get; set; }

    /// <summary>
    /// Gets or sets additional metadata.
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }
}

/// <summary>
/// Request model for duplicating a template.
/// </summary>
public class DuplicateTemplateRequest
{
    /// <summary>
    /// Gets or sets the new template name.
    /// If not specified, " (Copy)" will be appended to the original name.
    /// </summary>
    [StringLength(200, ErrorMessage = "New name cannot exceed 200 characters")]
    public string? NewName { get; set; }

    /// <summary>
    /// Gets or sets the category for the duplicated template.
    /// If not specified, uses the original category.
    /// </summary>
    [StringLength(100, ErrorMessage = "Category cannot exceed 100 characters")]
    public string? Category { get; set; }
}

/// <summary>
/// Request model for generating PDF from an existing template.
/// </summary>
public class GenerateFromTemplateRequest
{
    /// <summary>
    /// Gets or sets the data context for expression evaluation.
    /// </summary>
    public System.Text.Json.JsonElement? Data { get; set; }

    /// <summary>
    /// Gets or sets page settings overrides.
    /// These will override the template's default page settings.
    /// </summary>
    public PageSettingsDto? PageSettingsOverrides { get; set; }

    /// <summary>
    /// Gets or sets the output filename (without extension).
    /// </summary>
    [StringLength(200, ErrorMessage = "Filename cannot exceed 200 characters")]
    [RegularExpression(
        @"^[a-zA-Z0-9\-_]+$",
        ErrorMessage = "Filename can only contain letters, numbers, hyphens, and underscores"
    )]
    public string? Filename { get; set; }

    /// <summary>
    /// Gets or sets optional generation options.
    /// </summary>
    public GenerationOptionsDto? Options { get; set; }
}
