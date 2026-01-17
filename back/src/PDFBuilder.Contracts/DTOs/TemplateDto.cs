using System.ComponentModel.DataAnnotations;

namespace PDFBuilder.Contracts.DTOs;

/// <summary>
/// Data transfer object for template metadata and layout.
/// Used for template CRUD operations.
/// </summary>
public class TemplateDto
{
    /// <summary>
    /// Gets or sets the unique identifier of the template.
    /// </summary>
    public Guid Id { get; set; }

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
    /// <example>Standard invoice template with company branding.</example>
    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters")]
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the template category.
    /// </summary>
    /// <example>Invoice</example>
    [StringLength(100, ErrorMessage = "Category cannot exceed 100 characters")]
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the layout definition as a LayoutNodeDto tree.
    /// </summary>
    public LayoutNodeDto? Layout { get; set; }

    /// <summary>
    /// Gets or sets the template version number.
    /// </summary>
    public int Version { get; set; } = 1;

    /// <summary>
    /// Gets or sets a value indicating whether the template is active.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets the creation timestamp.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the last update timestamp.
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Gets or sets the user who created the template.
    /// </summary>
    [StringLength(200, ErrorMessage = "CreatedBy cannot exceed 200 characters")]
    public string? CreatedBy { get; set; }

    /// <summary>
    /// Gets or sets the user who last updated the template.
    /// </summary>
    [StringLength(200, ErrorMessage = "UpdatedBy cannot exceed 200 characters")]
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// Gets or sets the tags associated with this template as a comma-separated string.
    /// </summary>
    /// <example>invoice,business,standard</example>
    [StringLength(500, ErrorMessage = "Tags cannot exceed 500 characters")]
    public string? Tags { get; set; }

    /// <summary>
    /// Gets or sets additional metadata as a dictionary.
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }
}

/// <summary>
/// Summary DTO for template listing (without full layout).
/// Used for efficient template list retrieval.
/// </summary>
public class TemplateSummaryDto
{
    /// <summary>
    /// Gets or sets the unique identifier of the template.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the template name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the template description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the template category.
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the template version.
    /// </summary>
    public int Version { get; set; }

    /// <summary>
    /// Gets or sets whether the template is active.
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// Gets or sets the creation timestamp.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the last update timestamp.
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// Gets or sets the tags.
    /// </summary>
    public string? Tags { get; set; }
}
