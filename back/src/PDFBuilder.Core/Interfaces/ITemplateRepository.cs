using PDFBuilder.Core.Domain;

namespace PDFBuilder.Core.Interfaces;

/// <summary>
/// Filter options for querying templates.
/// </summary>
public class TemplateFilter
{
    /// <summary>
    /// Gets or sets the search term to filter by name or description.
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// Gets or sets the category to filter by.
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the tags to filter by (comma-separated).
    /// </summary>
    public string? Tags { get; set; }

    /// <summary>
    /// Gets or sets whether to include only active templates.
    /// Default is true.
    /// </summary>
    public bool? IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets the page number (1-based). Default is 1.
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Gets or sets the page size. Default is 20.
    /// </summary>
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// Gets or sets the field to sort by.
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// Gets or sets whether to sort in descending order.
    /// </summary>
    public bool SortDescending { get; set; } = true;
}

/// <summary>
/// Paginated result containing templates and pagination metadata.
/// </summary>
public class PaginatedResult<T>
{
    /// <summary>
    /// Gets or sets the items for the current page.
    /// </summary>
    public IReadOnlyList<T> Items { get; set; } = [];

    /// <summary>
    /// Gets or sets the total count of items (before pagination).
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Gets or sets the current page number (1-based).
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Gets or sets the page size.
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Gets the total number of pages.
    /// </summary>
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;

    /// <summary>
    /// Gets whether there is a next page.
    /// </summary>
    public bool HasNextPage => Page < TotalPages;

    /// <summary>
    /// Gets whether there is a previous page.
    /// </summary>
    public bool HasPreviousPage => Page > 1;
}

/// <summary>
/// Repository interface for Template persistence operations.
/// </summary>
public interface ITemplateRepository
{
    /// <summary>
    /// Gets all templates with optional filtering and pagination.
    /// </summary>
    /// <param name="filter">The filter options.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated result of templates.</returns>
    Task<PaginatedResult<Template>> GetAllAsync(
        TemplateFilter? filter = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets a template by its unique identifier.
    /// </summary>
    /// <param name="id">The template identifier.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The template if found; otherwise, null.</returns>
    Task<Template?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets templates by category.
    /// </summary>
    /// <param name="category">The category to filter by.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of templates in the specified category.</returns>
    Task<IEnumerable<Template>> GetByCategoryAsync(
        string category,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Searches templates by name.
    /// </summary>
    /// <param name="searchTerm">The search term.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of templates matching the search term.</returns>
    Task<IEnumerable<Template>> SearchByNameAsync(
        string searchTerm,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets templates by tags.
    /// </summary>
    /// <param name="tags">The tags to search for (comma-separated).</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of templates matching the tags.</returns>
    Task<IEnumerable<Template>> GetByTagsAsync(
        string tags,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets all distinct categories.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of distinct category names.</returns>
    Task<IEnumerable<string>> GetCategoriesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all distinct tags.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A collection of distinct tags.</returns>
    Task<IEnumerable<string>> GetTagsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Adds a new template.
    /// </summary>
    /// <param name="template">The template to add.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The added template with generated ID.</returns>
    Task<Template> AddAsync(Template template, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates an existing template.
    /// </summary>
    /// <param name="template">The template to update.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The updated template.</returns>
    Task<Template> UpdateAsync(Template template, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a template by its identifier (soft delete).
    /// </summary>
    /// <param name="id">The template identifier.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if the template was deleted; otherwise, false.</returns>
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Permanently deletes a template from the database.
    /// </summary>
    /// <param name="id">The template identifier.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if the template was permanently deleted; otherwise, false.</returns>
    Task<bool> HardDeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Duplicates an existing template.
    /// </summary>
    /// <param name="id">The ID of the template to duplicate.</param>
    /// <param name="newName">The name for the duplicated template.</param>
    /// <param name="category">Optional category for the duplicated template.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The duplicated template.</returns>
    Task<Template?> DuplicateAsync(
        Guid id,
        string? newName = null,
        string? category = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Checks if a template with the specified name exists.
    /// </summary>
    /// <param name="name">The template name.</param>
    /// <param name="excludeId">Optional ID to exclude from the check.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if a template with the name exists; otherwise, false.</returns>
    Task<bool> ExistsAsync(
        string name,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Checks if a template with the specified ID exists.
    /// </summary>
    /// <param name="id">The template ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if the template exists; otherwise, false.</returns>
    Task<bool> ExistsByIdAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Restores a soft-deleted template.
    /// </summary>
    /// <param name="id">The template identifier.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>True if the template was restored; otherwise, false.</returns>
    Task<bool> RestoreAsync(Guid id, CancellationToken cancellationToken = default);
}
