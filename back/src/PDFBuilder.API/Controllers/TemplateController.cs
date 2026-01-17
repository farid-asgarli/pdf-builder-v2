using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PDFBuilder.Contracts.DTOs;
using PDFBuilder.Contracts.Requests;
using PDFBuilder.Contracts.Responses;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using Swashbuckle.AspNetCore.Annotations;

namespace PDFBuilder.API.Controllers;

/// <summary>
/// Controller for template management operations (CRUD).
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="TemplateController"/> class.
/// </remarks>
/// <param name="templateRepository">The template repository.</param>
/// <param name="logger">The logger instance.</param>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class TemplateController(
    ITemplateRepository templateRepository,
    ILogger<TemplateController> logger
) : ControllerBase
{
    private readonly ITemplateRepository _templateRepository =
        templateRepository ?? throw new ArgumentNullException(nameof(templateRepository));
    private readonly ILogger<TemplateController> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    /// <summary>
    /// Gets a paginated list of all templates with optional filtering.
    /// </summary>
    /// <param name="search">Search term to filter by name or description.</param>
    /// <param name="category">Category to filter by.</param>
    /// <param name="tags">Tags to filter by (comma-separated).</param>
    /// <param name="isActive">Filter by active status.</param>
    /// <param name="page">Page number (1-based).</param>
    /// <param name="pageSize">Number of items per page.</param>
    /// <param name="sortBy">Field to sort by (name, category, createdAt, updatedAt, version).</param>
    /// <param name="sortDescending">Sort in descending order.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A paginated list of templates.</returns>
    [HttpGet]
    [SwaggerOperation(
        Summary = "List all templates",
        Description = "Returns a paginated list of templates with optional filtering by search term, category, tags, and active status."
    )]
    [SwaggerResponse(200, "Templates retrieved successfully", typeof(TemplateListResponse))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    public async Task<ActionResult<TemplateListResponse>> GetAll(
        [FromQuery] string? search = null,
        [FromQuery] string? category = null,
        [FromQuery] string? tags = null,
        [FromQuery] bool? isActive = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDescending = true,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = GetCorrelationId();
        _logger.LogInformation(
            "Getting templates list. CorrelationId: {CorrelationId}, Page: {Page}, PageSize: {PageSize}",
            correlationId,
            page,
            pageSize
        );

        try
        {
            // Validate pagination parameters
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var filter = new TemplateFilter
            {
                SearchTerm = search,
                Category = category,
                Tags = tags,
                IsActive = isActive,
                Page = page,
                PageSize = pageSize,
                SortBy = sortBy,
                SortDescending = sortDescending,
            };

            var result = await _templateRepository.GetAllAsync(filter, cancellationToken);

            var templateSummaries = result.Items.Select(MapToSummaryDto).ToList();

            _logger.LogInformation(
                "Templates retrieved successfully. CorrelationId: {CorrelationId}, Count: {Count}, TotalCount: {TotalCount}",
                correlationId,
                templateSummaries.Count,
                result.TotalCount
            );

            return Ok(
                TemplateListResponse.Successful(
                    templateSummaries,
                    result.TotalCount,
                    result.Page,
                    result.PageSize
                )
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error retrieving templates. CorrelationId: {CorrelationId}",
                correlationId
            );
            return StatusCode(
                500,
                TemplateListResponse.Failed("An error occurred while retrieving templates.")
            );
        }
    }

    /// <summary>
    /// Gets a template by its unique identifier.
    /// </summary>
    /// <param name="id">The template ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The template if found.</returns>
    [HttpGet("{id:guid}")]
    [SwaggerOperation(
        Summary = "Get template by ID",
        Description = "Returns a single template with its full layout definition."
    )]
    [SwaggerResponse(200, "Template retrieved successfully", typeof(TemplateResponse))]
    [SwaggerResponse(404, "Template not found", typeof(TemplateResponse))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    public async Task<ActionResult<TemplateResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = GetCorrelationId();
        _logger.LogInformation(
            "Getting template by ID. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
            correlationId,
            id
        );

        try
        {
            var template = await _templateRepository.GetByIdAsync(id, cancellationToken);

            if (template == null)
            {
                _logger.LogWarning(
                    "Template not found. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                    correlationId,
                    id
                );
                return NotFound(TemplateResponse.Failed($"Template with ID '{id}' was not found."));
            }

            var templateDto = MapToDto(template);

            _logger.LogInformation(
                "Template retrieved successfully. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                correlationId,
                id
            );

            return Ok(TemplateResponse.Successful(templateDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error retrieving template. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                correlationId,
                id
            );
            return StatusCode(
                500,
                TemplateResponse.Failed("An error occurred while retrieving the template.")
            );
        }
    }

    /// <summary>
    /// Creates a new template.
    /// </summary>
    /// <param name="request">The template creation request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The created template.</returns>
    [HttpPost]
    [SwaggerOperation(
        Summary = "Create a new template",
        Description = "Creates a new template with the provided layout definition and metadata."
    )]
    [SwaggerResponse(201, "Template created successfully", typeof(TemplateResponse))]
    [SwaggerResponse(400, "Invalid request", typeof(ValidationProblemDetails))]
    [SwaggerResponse(409, "Template with this name already exists", typeof(TemplateResponse))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    [Consumes("application/json")]
    public async Task<ActionResult<TemplateResponse>> Create(
        [FromBody] SaveTemplateRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = GetCorrelationId();
        _logger.LogInformation(
            "Creating new template. CorrelationId: {CorrelationId}, Name: {TemplateName}",
            correlationId,
            request.Name
        );

        try
        {
            // Check if template with same name already exists
            if (await _templateRepository.ExistsAsync(request.Name, null, cancellationToken))
            {
                _logger.LogWarning(
                    "Template with name already exists. CorrelationId: {CorrelationId}, Name: {TemplateName}",
                    correlationId,
                    request.Name
                );
                return Conflict(
                    TemplateResponse.Failed(
                        $"A template with the name '{request.Name}' already exists."
                    )
                );
            }

            // Map request to domain entity
            var template = new Template
            {
                Name = request.Name,
                Description = request.Description,
                Category = request.Category,
                LayoutJson = SerializeLayout(request.Layout),
                Tags = request.Tags,
                MetadataJson =
                    request.Metadata != null
                        ? JsonSerializer.Serialize(request.Metadata, JsonOptions)
                        : null,
            };

            var createdTemplate = await _templateRepository.AddAsync(template, cancellationToken);
            var templateDto = MapToDto(createdTemplate);

            _logger.LogInformation(
                "Template created successfully. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                correlationId,
                createdTemplate.Id
            );

            return CreatedAtAction(
                nameof(GetById),
                new { id = createdTemplate.Id },
                TemplateResponse.Successful(templateDto)
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error creating template. CorrelationId: {CorrelationId}, Name: {TemplateName}",
                correlationId,
                request.Name
            );
            return StatusCode(
                500,
                TemplateResponse.Failed("An error occurred while creating the template.")
            );
        }
    }

    /// <summary>
    /// Updates an existing template.
    /// </summary>
    /// <param name="id">The template ID.</param>
    /// <param name="request">The template update request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The updated template.</returns>
    [HttpPut("{id:guid}")]
    [SwaggerOperation(
        Summary = "Update an existing template",
        Description = "Updates the specified template with the provided changes. Only provided fields will be updated."
    )]
    [SwaggerResponse(200, "Template updated successfully", typeof(TemplateResponse))]
    [SwaggerResponse(400, "Invalid request", typeof(ValidationProblemDetails))]
    [SwaggerResponse(404, "Template not found", typeof(TemplateResponse))]
    [SwaggerResponse(409, "Template with this name already exists", typeof(TemplateResponse))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    [Consumes("application/json")]
    public async Task<ActionResult<TemplateResponse>> Update(
        Guid id,
        [FromBody] UpdateTemplateRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = GetCorrelationId();
        _logger.LogInformation(
            "Updating template. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
            correlationId,
            id
        );

        try
        {
            // Check if template exists
            var existingTemplate = await _templateRepository.GetByIdAsync(id, cancellationToken);
            if (existingTemplate == null)
            {
                _logger.LogWarning(
                    "Template not found for update. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                    correlationId,
                    id
                );
                return NotFound(TemplateResponse.Failed($"Template with ID '{id}' was not found."));
            }

            // Check if new name conflicts with existing template
            if (
                !string.IsNullOrWhiteSpace(request.Name)
                && request.Name != existingTemplate.Name
                && await _templateRepository.ExistsAsync(request.Name, id, cancellationToken)
            )
            {
                _logger.LogWarning(
                    "Template name conflict. CorrelationId: {CorrelationId}, Name: {TemplateName}",
                    correlationId,
                    request.Name
                );
                return Conflict(
                    TemplateResponse.Failed(
                        $"A template with the name '{request.Name}' already exists."
                    )
                );
            }

            // Update template properties
            var template = new Template
            {
                Id = id,
                Name = request.Name ?? existingTemplate.Name,
                Description = request.Description ?? existingTemplate.Description,
                Category = request.Category ?? existingTemplate.Category,
                LayoutJson =
                    request.Layout != null
                        ? SerializeLayout(request.Layout)
                        : existingTemplate.LayoutJson,
                Tags = request.Tags ?? existingTemplate.Tags,
                IsActive = request.IsActive ?? existingTemplate.IsActive,
                MetadataJson =
                    request.Metadata != null
                        ? JsonSerializer.Serialize(request.Metadata, JsonOptions)
                        : existingTemplate.MetadataJson,
            };

            var updatedTemplate = await _templateRepository.UpdateAsync(
                template,
                cancellationToken
            );
            var templateDto = MapToDto(updatedTemplate);

            _logger.LogInformation(
                "Template updated successfully. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}, Version: {Version}",
                correlationId,
                id,
                updatedTemplate.Version
            );

            return Ok(TemplateResponse.Successful(templateDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error updating template. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                correlationId,
                id
            );
            return StatusCode(
                500,
                TemplateResponse.Failed("An error occurred while updating the template.")
            );
        }
    }

    /// <summary>
    /// Deletes a template (soft delete).
    /// </summary>
    /// <param name="id">The template ID.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>Deletion confirmation.</returns>
    [HttpDelete("{id:guid}")]
    [SwaggerOperation(
        Summary = "Delete a template",
        Description = "Soft-deletes the specified template. The template can be restored later."
    )]
    [SwaggerResponse(200, "Template deleted successfully", typeof(DeleteTemplateResponse))]
    [SwaggerResponse(404, "Template not found", typeof(DeleteTemplateResponse))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    public async Task<ActionResult<DeleteTemplateResponse>> Delete(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = GetCorrelationId();
        _logger.LogInformation(
            "Deleting template. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
            correlationId,
            id
        );

        try
        {
            var deleted = await _templateRepository.DeleteAsync(id, cancellationToken);

            if (!deleted)
            {
                _logger.LogWarning(
                    "Template not found for deletion. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                    correlationId,
                    id
                );
                return NotFound(
                    DeleteTemplateResponse.Failed($"Template with ID '{id}' was not found.")
                );
            }

            _logger.LogInformation(
                "Template deleted successfully. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                correlationId,
                id
            );

            return Ok(DeleteTemplateResponse.Successful(id));
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error deleting template. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                correlationId,
                id
            );
            return StatusCode(
                500,
                DeleteTemplateResponse.Failed("An error occurred while deleting the template.")
            );
        }
    }

    /// <summary>
    /// Duplicates an existing template.
    /// </summary>
    /// <param name="id">The template ID to duplicate.</param>
    /// <param name="request">Optional duplication settings.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The duplicated template.</returns>
    [HttpPost("{id:guid}/duplicate")]
    [SwaggerOperation(
        Summary = "Duplicate a template",
        Description = "Creates a copy of the specified template with an optional new name and category."
    )]
    [SwaggerResponse(201, "Template duplicated successfully", typeof(TemplateResponse))]
    [SwaggerResponse(404, "Template not found", typeof(TemplateResponse))]
    [SwaggerResponse(409, "Template with the new name already exists", typeof(TemplateResponse))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    [Consumes("application/json")]
    public async Task<ActionResult<TemplateResponse>> Duplicate(
        Guid id,
        [FromBody] DuplicateTemplateRequest? request = null,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = GetCorrelationId();
        _logger.LogInformation(
            "Duplicating template. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
            correlationId,
            id
        );

        try
        {
            // Check if new name conflicts with existing template
            if (
                !string.IsNullOrWhiteSpace(request?.NewName)
                && await _templateRepository.ExistsAsync(request.NewName, null, cancellationToken)
            )
            {
                _logger.LogWarning(
                    "Duplicate template name conflict. CorrelationId: {CorrelationId}, Name: {TemplateName}",
                    correlationId,
                    request.NewName
                );
                return Conflict(
                    TemplateResponse.Failed(
                        $"A template with the name '{request.NewName}' already exists."
                    )
                );
            }

            var duplicatedTemplate = await _templateRepository.DuplicateAsync(
                id,
                request?.NewName,
                request?.Category,
                cancellationToken
            );

            if (duplicatedTemplate == null)
            {
                _logger.LogWarning(
                    "Source template not found for duplication. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                    correlationId,
                    id
                );
                return NotFound(
                    TemplateResponse.Failed(
                        $"Template with ID '{id}' was not found for duplication."
                    )
                );
            }

            var templateDto = MapToDto(duplicatedTemplate);

            _logger.LogInformation(
                "Template duplicated successfully. CorrelationId: {CorrelationId}, OriginalId: {OriginalId}, NewId: {NewId}",
                correlationId,
                id,
                duplicatedTemplate.Id
            );

            return CreatedAtAction(
                nameof(GetById),
                new { id = duplicatedTemplate.Id },
                TemplateResponse.Successful(templateDto)
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error duplicating template. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                correlationId,
                id
            );
            return StatusCode(
                500,
                TemplateResponse.Failed("An error occurred while duplicating the template.")
            );
        }
    }

    /// <summary>
    /// Restores a soft-deleted template.
    /// </summary>
    /// <param name="id">The template ID to restore.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>Restoration confirmation.</returns>
    [HttpPost("{id:guid}/restore")]
    [SwaggerOperation(
        Summary = "Restore a deleted template",
        Description = "Restores a soft-deleted template back to active status."
    )]
    [SwaggerResponse(200, "Template restored successfully", typeof(TemplateResponse))]
    [SwaggerResponse(404, "Template not found or not deleted", typeof(TemplateResponse))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    public async Task<ActionResult<TemplateResponse>> Restore(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = GetCorrelationId();
        _logger.LogInformation(
            "Restoring template. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
            correlationId,
            id
        );

        try
        {
            var restored = await _templateRepository.RestoreAsync(id, cancellationToken);

            if (!restored)
            {
                _logger.LogWarning(
                    "Template not found for restoration. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                    correlationId,
                    id
                );
                return NotFound(
                    TemplateResponse.Failed(
                        $"Template with ID '{id}' was not found or is not deleted."
                    )
                );
            }

            // Fetch the restored template
            var template = await _templateRepository.GetByIdAsync(id, cancellationToken);
            var templateDto = template != null ? MapToDto(template) : null;

            _logger.LogInformation(
                "Template restored successfully. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                correlationId,
                id
            );

            return Ok(TemplateResponse.Successful(templateDto!));
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error restoring template. CorrelationId: {CorrelationId}, TemplateId: {TemplateId}",
                correlationId,
                id
            );
            return StatusCode(
                500,
                TemplateResponse.Failed("An error occurred while restoring the template.")
            );
        }
    }

    /// <summary>
    /// Gets all distinct categories.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>List of categories.</returns>
    [HttpGet("categories")]
    [SwaggerOperation(
        Summary = "Get all categories",
        Description = "Returns a list of all distinct categories used by templates."
    )]
    [SwaggerResponse(200, "Categories retrieved successfully", typeof(IEnumerable<string>))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    public async Task<ActionResult<IEnumerable<string>>> GetCategories(
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = GetCorrelationId();
        _logger.LogInformation("Getting categories. CorrelationId: {CorrelationId}", correlationId);

        try
        {
            var categories = await _templateRepository.GetCategoriesAsync(cancellationToken);

            _logger.LogInformation(
                "Categories retrieved successfully. CorrelationId: {CorrelationId}, Count: {Count}",
                correlationId,
                categories.Count()
            );

            return Ok(categories);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error retrieving categories. CorrelationId: {CorrelationId}",
                correlationId
            );
            return StatusCode(
                500,
                new ProblemDetails
                {
                    Title = "Error",
                    Detail = "An error occurred while retrieving categories.",
                    Status = 500,
                }
            );
        }
    }

    /// <summary>
    /// Gets all distinct tags.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>List of tags.</returns>
    [HttpGet("tags")]
    [SwaggerOperation(
        Summary = "Get all tags",
        Description = "Returns a list of all distinct tags used by templates."
    )]
    [SwaggerResponse(200, "Tags retrieved successfully", typeof(IEnumerable<string>))]
    [SwaggerResponse(500, "Internal server error", typeof(ProblemDetails))]
    public async Task<ActionResult<IEnumerable<string>>> GetTags(
        CancellationToken cancellationToken = default
    )
    {
        var correlationId = GetCorrelationId();
        _logger.LogInformation("Getting tags. CorrelationId: {CorrelationId}", correlationId);

        try
        {
            var tags = await _templateRepository.GetTagsAsync(cancellationToken);

            _logger.LogInformation(
                "Tags retrieved successfully. CorrelationId: {CorrelationId}, Count: {Count}",
                correlationId,
                tags.Count()
            );

            return Ok(tags);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error retrieving tags. CorrelationId: {CorrelationId}",
                correlationId
            );
            return StatusCode(
                500,
                new ProblemDetails
                {
                    Title = "Error",
                    Detail = "An error occurred while retrieving tags.",
                    Status = 500,
                }
            );
        }
    }

    #region Private Helper Methods

    private string GetCorrelationId()
    {
        return Activity.Current?.Id ?? HttpContext.TraceIdentifier;
    }

    private static string SerializeLayout(LayoutNodeDto layout)
    {
        return JsonSerializer.Serialize(layout, JsonOptions);
    }

    private static LayoutNodeDto? DeserializeLayout(string? layoutJson)
    {
        if (string.IsNullOrWhiteSpace(layoutJson) || layoutJson == "{}")
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<LayoutNodeDto>(layoutJson, JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private static Dictionary<string, object>? DeserializeMetadata(string? metadataJson)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, object>>(
                metadataJson,
                JsonOptions
            );
        }
        catch
        {
            return null;
        }
    }

    private static TemplateDto MapToDto(Template template)
    {
        return new TemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            Category = template.Category,
            Layout = DeserializeLayout(template.LayoutJson),
            Version = template.Version,
            IsActive = template.IsActive,
            CreatedAt = template.CreatedAt,
            UpdatedAt = template.UpdatedAt,
            CreatedBy = template.CreatedBy,
            UpdatedBy = template.UpdatedBy,
            Tags = template.Tags,
            Metadata = DeserializeMetadata(template.MetadataJson),
        };
    }

    private static TemplateSummaryDto MapToSummaryDto(Template template)
    {
        return new TemplateSummaryDto
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            Category = template.Category,
            Version = template.Version,
            IsActive = template.IsActive,
            CreatedAt = template.CreatedAt,
            UpdatedAt = template.UpdatedAt,
            Tags = template.Tags,
        };
    }

    #endregion
}
