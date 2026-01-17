namespace PDFBuilder.Core.Domain;

/// <summary>
/// Represents a PDF template stored in the database.
/// </summary>
public class Template
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
    /// Gets or sets the layout JSON definition.
    /// </summary>
    public string LayoutJson { get; set; } = "{}";

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
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the last update timestamp.
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the user who created the template.
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// Gets or sets the user who last updated the template.
    /// </summary>
    public string? UpdatedBy { get; set; }

    /// <summary>
    /// Gets or sets additional metadata as JSON.
    /// </summary>
    public string? MetadataJson { get; set; }

    /// <summary>
    /// Gets or sets the tags associated with this template.
    /// </summary>
    public string? Tags { get; set; }
}
