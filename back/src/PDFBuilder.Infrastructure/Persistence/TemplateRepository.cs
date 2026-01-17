using Microsoft.EntityFrameworkCore;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;

namespace PDFBuilder.Infrastructure.Persistence;

/// <summary>
/// Entity Framework implementation of the template repository.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="TemplateRepository"/> class.
/// </remarks>
/// <param name="context">The database context.</param>
/// <param name="logger">The logger.</param>
public class TemplateRepository(TemplateDbContext context, ILogger<TemplateRepository> logger)
    : ITemplateRepository
{
    private readonly TemplateDbContext _context =
        context ?? throw new ArgumentNullException(nameof(context));
    private readonly ILogger<TemplateRepository> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <inheritdoc/>
    public async Task<PaginatedResult<Template>> GetAllAsync(
        TemplateFilter? filter = null,
        CancellationToken cancellationToken = default
    )
    {
        filter ??= new TemplateFilter();
        _logger.LogDebug(
            "Fetching templates with filter: SearchTerm={SearchTerm}, Category={Category}, Page={Page}, PageSize={PageSize}",
            filter.SearchTerm,
            filter.Category,
            filter.Page,
            filter.PageSize
        );

        var query = _context.Templates.AsQueryable();

        // Apply active filter
        if (filter.IsActive.HasValue)
        {
            query = query.Where(t => t.IsActive == filter.IsActive.Value);
        }

        // Apply search term filter (searches in name and description)
        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var searchTerm = filter.SearchTerm.ToLower();
            query = query.Where(t =>
                t.Name.ToLower().Contains(searchTerm)
                || (t.Description != null && t.Description.ToLower().Contains(searchTerm))
            );
        }

        // Apply category filter
        if (!string.IsNullOrWhiteSpace(filter.Category))
        {
            query = query.Where(t => t.Category == filter.Category);
        }

        // Apply tags filter
        if (!string.IsNullOrWhiteSpace(filter.Tags))
        {
            var tagList = filter
                .Tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(t => t.Trim().ToLower())
                .ToList();

            foreach (var tag in tagList)
            {
                query = query.Where(t => t.Tags != null && t.Tags.ToLower().Contains(tag));
            }
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply sorting
        query = ApplySorting(query, filter.SortBy, filter.SortDescending);

        // Apply pagination
        var skip = (filter.Page - 1) * filter.PageSize;
        var items = await query
            .Skip(skip)
            .Take(filter.PageSize)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return new PaginatedResult<Template>
        {
            Items = items,
            TotalCount = totalCount,
            Page = filter.Page,
            PageSize = filter.PageSize,
        };
    }

    /// <inheritdoc/>
    public async Task<Template?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogDebug("Fetching template with ID: {TemplateId}", id);

        return await _context
            .Templates.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Template>> GetByCategoryAsync(
        string category,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogDebug("Fetching templates in category: {Category}", category);

        return await _context
            .Templates.Where(t => t.IsActive && t.Category == category)
            .OrderByDescending(t => t.UpdatedAt)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Template>> SearchByNameAsync(
        string searchTerm,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogDebug("Searching templates with term: {SearchTerm}", searchTerm);

        var lowerSearchTerm = searchTerm.ToLower();
        return await _context
            .Templates.Where(t => t.IsActive && t.Name.ToLower().Contains(lowerSearchTerm))
            .OrderByDescending(t => t.UpdatedAt)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<Template>> GetByTagsAsync(
        string tags,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogDebug("Fetching templates with tags: {Tags}", tags);

        var tagList = tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.Trim().ToLower())
            .ToList();

        var query = _context.Templates.Where(t => t.IsActive);

        foreach (var tag in tagList)
        {
            query = query.Where(t => t.Tags != null && t.Tags.ToLower().Contains(tag));
        }

        return await query
            .OrderByDescending(t => t.UpdatedAt)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<string>> GetCategoriesAsync(
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogDebug("Fetching all distinct categories");

        return await _context
            .Templates.Where(t => t.IsActive && t.Category != null)
            .Select(t => t.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<IEnumerable<string>> GetTagsAsync(
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogDebug("Fetching all distinct tags");

        var allTags = await _context
            .Templates.Where(t => t.IsActive && t.Tags != null)
            .Select(t => t.Tags!)
            .ToListAsync(cancellationToken);

        return allTags
            .SelectMany(t => t.Split(',', StringSplitOptions.RemoveEmptyEntries))
            .Select(t => t.Trim())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct()
            .OrderBy(t => t)
            .ToList();
    }

    /// <inheritdoc/>
    public async Task<Template> AddAsync(
        Template template,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogInformation("Adding new template: {TemplateName}", template.Name);

        template.Id = Guid.NewGuid();
        template.CreatedAt = DateTime.UtcNow;
        template.UpdatedAt = DateTime.UtcNow;
        template.Version = 1;
        template.IsActive = true;

        await _context.Templates.AddAsync(template, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Template added successfully with ID: {TemplateId}", template.Id);

        return template;
    }

    /// <inheritdoc/>
    public async Task<Template> UpdateAsync(
        Template template,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogInformation("Updating template: {TemplateId}", template.Id);

        var existingTemplate = await _context.Templates.FirstOrDefaultAsync(
            t => t.Id == template.Id,
            cancellationToken
        );

        if (existingTemplate == null)
        {
            throw new InvalidOperationException($"Template with ID {template.Id} not found");
        }

        // Update only if values are provided
        if (!string.IsNullOrEmpty(template.Name))
        {
            existingTemplate.Name = template.Name;
        }

        existingTemplate.Description = template.Description;
        existingTemplate.Category = template.Category;

        if (!string.IsNullOrEmpty(template.LayoutJson) && template.LayoutJson != "{}")
        {
            existingTemplate.LayoutJson = template.LayoutJson;
        }

        existingTemplate.Version = existingTemplate.Version + 1;
        existingTemplate.UpdatedAt = DateTime.UtcNow;
        existingTemplate.UpdatedBy = template.UpdatedBy;
        existingTemplate.MetadataJson = template.MetadataJson;
        existingTemplate.Tags = template.Tags;
        existingTemplate.IsActive = template.IsActive;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Template updated successfully: {TemplateId}, Version: {Version}",
            template.Id,
            existingTemplate.Version
        );

        return existingTemplate;
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Soft-deleting template: {TemplateId}", id);

        var template = await _context.Templates.FirstOrDefaultAsync(
            t => t.Id == id,
            cancellationToken
        );

        if (template == null)
        {
            _logger.LogWarning("Template not found for deletion: {TemplateId}", id);
            return false;
        }

        // Soft delete - mark as inactive
        template.IsActive = false;
        template.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Template soft-deleted successfully: {TemplateId}", id);

        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> HardDeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _logger.LogWarning("Permanently deleting template: {TemplateId}", id);

        var template = await _context.Templates.FirstOrDefaultAsync(
            t => t.Id == id,
            cancellationToken
        );

        if (template == null)
        {
            _logger.LogWarning("Template not found for permanent deletion: {TemplateId}", id);
            return false;
        }

        _context.Templates.Remove(template);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Template permanently deleted: {TemplateId}", id);

        return true;
    }

    /// <inheritdoc/>
    public async Task<Template?> DuplicateAsync(
        Guid id,
        string? newName = null,
        string? category = null,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogInformation("Duplicating template: {TemplateId}", id);

        var sourceTemplate = await _context
            .Templates.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (sourceTemplate == null)
        {
            _logger.LogWarning("Source template not found for duplication: {TemplateId}", id);
            return null;
        }

        var duplicatedTemplate = new Template
        {
            Id = Guid.NewGuid(),
            Name = newName ?? $"{sourceTemplate.Name} (Copy)",
            Description = sourceTemplate.Description,
            Category = category ?? sourceTemplate.Category,
            LayoutJson = sourceTemplate.LayoutJson,
            Version = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = sourceTemplate.CreatedBy,
            MetadataJson = sourceTemplate.MetadataJson,
            Tags = sourceTemplate.Tags,
        };

        await _context.Templates.AddAsync(duplicatedTemplate, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Template duplicated successfully. Original: {OriginalId}, New: {NewId}",
            id,
            duplicatedTemplate.Id
        );

        return duplicatedTemplate;
    }

    /// <inheritdoc/>
    public async Task<bool> ExistsAsync(
        string name,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default
    )
    {
        var query = _context.Templates.Where(t => t.Name == name && t.IsActive);

        if (excludeId.HasValue)
        {
            query = query.Where(t => t.Id != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<bool> ExistsByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Templates.AnyAsync(t => t.Id == id, cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<bool> RestoreAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Restoring soft-deleted template: {TemplateId}", id);

        var template = await _context.Templates.FirstOrDefaultAsync(
            t => t.Id == id && !t.IsActive,
            cancellationToken
        );

        if (template == null)
        {
            _logger.LogWarning(
                "Template not found or already active for restoration: {TemplateId}",
                id
            );
            return false;
        }

        template.IsActive = true;
        template.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Template restored successfully: {TemplateId}", id);

        return true;
    }

    /// <summary>
    /// Applies sorting to the query based on the specified field.
    /// </summary>
    private static IQueryable<Template> ApplySorting(
        IQueryable<Template> query,
        string? sortBy,
        bool descending
    )
    {
        return sortBy?.ToLowerInvariant() switch
        {
            "name" => descending
                ? query.OrderByDescending(t => t.Name)
                : query.OrderBy(t => t.Name),
            "category" => descending
                ? query.OrderByDescending(t => t.Category)
                : query.OrderBy(t => t.Category),
            "createdat" => descending
                ? query.OrderByDescending(t => t.CreatedAt)
                : query.OrderBy(t => t.CreatedAt),
            "version" => descending
                ? query.OrderByDescending(t => t.Version)
                : query.OrderBy(t => t.Version),
            _ => descending
                ? query.OrderByDescending(t => t.UpdatedAt)
                : query.OrderBy(t => t.UpdatedAt), // Default: sort by UpdatedAt
        };
    }
}
