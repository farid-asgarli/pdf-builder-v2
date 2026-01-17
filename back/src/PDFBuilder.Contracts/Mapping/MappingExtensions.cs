using System.Text.Json;
using AutoMapper;
using PDFBuilder.Contracts.DTOs;
using PDFBuilder.Contracts.Requests;
using PDFBuilder.Core.Domain;

namespace PDFBuilder.Contracts.Mapping;

/// <summary>
/// Provides extension methods for object mapping operations.
/// </summary>
public static class MappingExtensions
{
    /// <summary>
    /// Converts a LayoutNodeDto to a LayoutNode domain entity.
    /// </summary>
    /// <param name="dto">The DTO to convert.</param>
    /// <param name="mapper">The AutoMapper instance.</param>
    /// <returns>The domain entity.</returns>
    public static LayoutNode ToDomain(this LayoutNodeDto dto, IMapper mapper)
    {
        return mapper.Map<LayoutNode>(dto);
    }

    /// <summary>
    /// Converts a LayoutNode domain entity to a LayoutNodeDto.
    /// </summary>
    /// <param name="entity">The domain entity to convert.</param>
    /// <param name="mapper">The AutoMapper instance.</param>
    /// <returns>The DTO.</returns>
    public static LayoutNodeDto ToDto(this LayoutNode entity, IMapper mapper)
    {
        return mapper.Map<LayoutNodeDto>(entity);
    }

    /// <summary>
    /// Converts a Template domain entity to a TemplateDto including parsed layout.
    /// </summary>
    /// <param name="entity">The template entity.</param>
    /// <param name="mapper">The AutoMapper instance.</param>
    /// <param name="options">JSON serialization options.</param>
    /// <returns>The template DTO.</returns>
    public static TemplateDto ToDto(
        this Template entity,
        IMapper mapper,
        JsonSerializerOptions? options = null
    )
    {
        var dto = mapper.Map<TemplateDto>(entity);

        // Parse layout JSON if available
        if (!string.IsNullOrWhiteSpace(entity.LayoutJson) && entity.LayoutJson != "{}")
        {
            try
            {
                var layoutNodeDto = JsonSerializer.Deserialize<LayoutNodeDto>(
                    entity.LayoutJson,
                    options ?? GetDefaultJsonOptions()
                );
                dto.Layout = layoutNodeDto;
            }
            catch (JsonException)
            {
                // Layout parsing failed, leave as null
            }
        }

        // Parse metadata JSON if available
        if (!string.IsNullOrWhiteSpace(entity.MetadataJson))
        {
            try
            {
                var metadata = JsonSerializer.Deserialize<Dictionary<string, object>>(
                    entity.MetadataJson,
                    options ?? GetDefaultJsonOptions()
                );
                dto.Metadata = metadata;
            }
            catch (JsonException)
            {
                // Metadata parsing failed, leave as null
            }
        }

        return dto;
    }

    /// <summary>
    /// Converts a TemplateDto to a Template domain entity including serialized layout.
    /// </summary>
    /// <param name="dto">The template DTO.</param>
    /// <param name="mapper">The AutoMapper instance.</param>
    /// <param name="options">JSON serialization options.</param>
    /// <returns>The template entity.</returns>
    public static Template ToDomain(
        this TemplateDto dto,
        IMapper mapper,
        JsonSerializerOptions? options = null
    )
    {
        var entity = mapper.Map<Template>(dto);

        // Serialize layout to JSON
        if (dto.Layout is not null)
        {
            entity.LayoutJson = JsonSerializer.Serialize(
                dto.Layout,
                options ?? GetDefaultJsonOptions()
            );
        }

        // Serialize metadata to JSON
        if (dto.Metadata is not null)
        {
            entity.MetadataJson = JsonSerializer.Serialize(
                dto.Metadata,
                options ?? GetDefaultJsonOptions()
            );
        }

        return entity;
    }

    /// <summary>
    /// Converts a SaveTemplateRequest to a Template domain entity.
    /// </summary>
    /// <param name="request">The save request.</param>
    /// <param name="options">JSON serialization options.</param>
    /// <returns>The template entity.</returns>
    public static Template ToNewTemplate(
        this SaveTemplateRequest request,
        JsonSerializerOptions? options = null
    )
    {
        var jsonOptions = options ?? GetDefaultJsonOptions();

        return new Template
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            Category = request.Category,
            LayoutJson = JsonSerializer.Serialize(request.Layout, jsonOptions),
            Tags = request.Tags,
            Version = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            MetadataJson = request.Metadata is not null
                ? JsonSerializer.Serialize(request.Metadata, jsonOptions)
                : null,
        };
    }

    /// <summary>
    /// Converts a StylePropertiesDto to StyleProperties domain entity.
    /// </summary>
    /// <param name="dto">The DTO to convert.</param>
    /// <param name="mapper">The AutoMapper instance.</param>
    /// <returns>The domain entity.</returns>
    public static StyleProperties ToDomain(this StylePropertiesDto dto, IMapper mapper)
    {
        return mapper.Map<StyleProperties>(dto);
    }

    /// <summary>
    /// Converts a StyleProperties domain entity to StylePropertiesDto.
    /// </summary>
    /// <param name="entity">The domain entity to convert.</param>
    /// <param name="mapper">The AutoMapper instance.</param>
    /// <returns>The DTO.</returns>
    public static StylePropertiesDto ToDto(this StyleProperties entity, IMapper mapper)
    {
        return mapper.Map<StylePropertiesDto>(entity);
    }

    private static JsonSerializerOptions GetDefaultJsonOptions()
    {
        return new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            WriteIndented = false,
        };
    }
}
