using PDFBuilder.Core.Domain;

namespace PDFBuilder.TestUtilities.Builders;

/// <summary>
/// Builder for creating Template test objects.
/// </summary>
public class TemplateBuilder
{
    private Guid _id = Guid.NewGuid();
    private string _name = "Test Template";
    private string? _description = "A test template description";
    private string? _category = "Test";
    private string _layoutJson = "{}";
    private int _version = 1;
    private bool _isActive = true;
    private DateTime _createdAt = DateTime.UtcNow;
    private DateTime _updatedAt = DateTime.UtcNow;
    private string? _createdBy = "TestUser";
    private string? _updatedBy = "TestUser";

    /// <summary>
    /// Sets the template ID.
    /// </summary>
    /// <param name="id">The ID to set.</param>
    /// <returns>The builder instance.</returns>
    public TemplateBuilder WithId(Guid id)
    {
        _id = id;
        return this;
    }

    /// <summary>
    /// Sets the template name.
    /// </summary>
    /// <param name="name">The name to set.</param>
    /// <returns>The builder instance.</returns>
    public TemplateBuilder WithName(string name)
    {
        _name = name;
        return this;
    }

    /// <summary>
    /// Sets the template description.
    /// </summary>
    /// <param name="description">The description to set.</param>
    /// <returns>The builder instance.</returns>
    public TemplateBuilder WithDescription(string? description)
    {
        _description = description;
        return this;
    }

    /// <summary>
    /// Sets the template category.
    /// </summary>
    /// <param name="category">The category to set.</param>
    /// <returns>The builder instance.</returns>
    public TemplateBuilder WithCategory(string? category)
    {
        _category = category;
        return this;
    }

    /// <summary>
    /// Sets the template layout JSON.
    /// </summary>
    /// <param name="layoutJson">The layout JSON to set.</param>
    /// <returns>The builder instance.</returns>
    public TemplateBuilder WithLayoutJson(string layoutJson)
    {
        _layoutJson = layoutJson;
        return this;
    }

    /// <summary>
    /// Sets the template version.
    /// </summary>
    /// <param name="version">The version to set.</param>
    /// <returns>The builder instance.</returns>
    public TemplateBuilder WithVersion(int version)
    {
        _version = version;
        return this;
    }

    /// <summary>
    /// Sets whether the template is active.
    /// </summary>
    /// <param name="isActive">The active status to set.</param>
    /// <returns>The builder instance.</returns>
    public TemplateBuilder WithIsActive(bool isActive)
    {
        _isActive = isActive;
        return this;
    }

    /// <summary>
    /// Sets the created by user.
    /// </summary>
    /// <param name="createdBy">The user who created the template.</param>
    /// <returns>The builder instance.</returns>
    public TemplateBuilder WithCreatedBy(string? createdBy)
    {
        _createdBy = createdBy;
        return this;
    }

    /// <summary>
    /// Builds the Template instance.
    /// </summary>
    /// <returns>A new Template instance.</returns>
    public Template Build()
    {
        return new Template
        {
            Id = _id,
            Name = _name,
            Description = _description,
            Category = _category,
            LayoutJson = _layoutJson,
            Version = _version,
            IsActive = _isActive,
            CreatedAt = _createdAt,
            UpdatedAt = _updatedAt,
            CreatedBy = _createdBy,
            UpdatedBy = _updatedBy,
        };
    }
}
