using PDFBuilder.Contracts.DTOs;

namespace PDFBuilder.Contracts.Responses;

/// <summary>
/// Response model for template operations.
/// </summary>
public class TemplateResponse
{
    /// <summary>
    /// Gets or sets whether the operation was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets the template data.
    /// </summary>
    public TemplateDto? Template { get; set; }

    /// <summary>
    /// Gets or sets the error message if the operation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Gets or sets detailed error information.
    /// </summary>
    public ErrorDetails? Error { get; set; }

    /// <summary>
    /// Creates a successful response with template data.
    /// </summary>
    public static TemplateResponse Successful(TemplateDto template)
    {
        return new TemplateResponse { Success = true, Template = template };
    }

    /// <summary>
    /// Creates a failed response.
    /// </summary>
    public static TemplateResponse Failed(string errorMessage, ErrorDetails? error = null)
    {
        return new TemplateResponse
        {
            Success = false,
            ErrorMessage = errorMessage,
            Error = error,
        };
    }
}

/// <summary>
/// Response model for listing templates.
/// </summary>
public class TemplateListResponse
{
    /// <summary>
    /// Gets or sets whether the operation was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets the list of template summaries.
    /// </summary>
    public List<TemplateSummaryDto> Templates { get; set; } = [];

    /// <summary>
    /// Gets or sets the total count of templates (before pagination).
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
    /// Gets or sets the total number of pages.
    /// </summary>
    public int TotalPages { get; set; }

    /// <summary>
    /// Gets or sets whether there are more pages.
    /// </summary>
    public bool HasNextPage { get; set; }

    /// <summary>
    /// Gets or sets whether there are previous pages.
    /// </summary>
    public bool HasPreviousPage { get; set; }

    /// <summary>
    /// Gets or sets the error message if the operation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Creates a successful response with template list.
    /// </summary>
    public static TemplateListResponse Successful(
        List<TemplateSummaryDto> templates,
        int totalCount,
        int page,
        int pageSize
    )
    {
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        return new TemplateListResponse
        {
            Success = true,
            Templates = templates,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages,
            HasNextPage = page < totalPages,
            HasPreviousPage = page > 1,
        };
    }

    /// <summary>
    /// Creates a failed response.
    /// </summary>
    public static TemplateListResponse Failed(string errorMessage)
    {
        return new TemplateListResponse { Success = false, ErrorMessage = errorMessage };
    }
}

/// <summary>
/// Response model for template deletion.
/// </summary>
public class DeleteTemplateResponse
{
    /// <summary>
    /// Gets or sets whether the deletion was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets the ID of the deleted template.
    /// </summary>
    public Guid? DeletedTemplateId { get; set; }

    /// <summary>
    /// Gets or sets the error message if deletion failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Creates a successful deletion response.
    /// </summary>
    public static DeleteTemplateResponse Successful(Guid templateId)
    {
        return new DeleteTemplateResponse { Success = true, DeletedTemplateId = templateId };
    }

    /// <summary>
    /// Creates a failed deletion response.
    /// </summary>
    public static DeleteTemplateResponse Failed(string errorMessage)
    {
        return new DeleteTemplateResponse { Success = false, ErrorMessage = errorMessage };
    }
}
