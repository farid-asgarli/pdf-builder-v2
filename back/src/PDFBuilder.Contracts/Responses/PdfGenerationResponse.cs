namespace PDFBuilder.Contracts.Responses;

/// <summary>
/// Response model for PDF generation.
/// </summary>
public class PdfGenerationResponse
{
    /// <summary>
    /// Gets or sets whether the generation was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets the generated PDF as a byte array.
    /// Only populated when Success is true and streaming is not used.
    /// </summary>
    public byte[]? PdfBytes { get; set; }

    /// <summary>
    /// Gets or sets the generated filename.
    /// </summary>
    /// <example>invoice-2024-001.pdf</example>
    public string? Filename { get; set; }

    /// <summary>
    /// Gets or sets the MIME type of the response.
    /// </summary>
    /// <example>application/pdf</example>
    public string ContentType { get; set; } = "application/pdf";

    /// <summary>
    /// Gets or sets the size of the generated PDF in bytes.
    /// </summary>
    public long? FileSizeBytes { get; set; }

    /// <summary>
    /// Gets or sets the number of pages in the generated PDF.
    /// </summary>
    public int? PageCount { get; set; }

    /// <summary>
    /// Gets or sets the generation time in milliseconds.
    /// </summary>
    public long? GenerationTimeMs { get; set; }

    /// <summary>
    /// Gets or sets the operation ID for progress tracking.
    /// Used with SignalR for real-time progress updates.
    /// </summary>
    public string? OperationId { get; set; }

    /// <summary>
    /// Gets or sets any warnings that occurred during generation.
    /// </summary>
    public List<string>? Warnings { get; set; }

    /// <summary>
    /// Gets or sets the error message if generation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Gets or sets detailed error information if generation failed.
    /// </summary>
    public ErrorDetails? Error { get; set; }

    /// <summary>
    /// Creates a successful response.
    /// </summary>
    public static PdfGenerationResponse Successful(
        byte[] pdfBytes,
        string filename,
        int pageCount,
        long generationTimeMs
    )
    {
        return new PdfGenerationResponse
        {
            Success = true,
            PdfBytes = pdfBytes,
            Filename = filename,
            FileSizeBytes = pdfBytes.Length,
            PageCount = pageCount,
            GenerationTimeMs = generationTimeMs,
        };
    }

    /// <summary>
    /// Creates a failed response.
    /// </summary>
    public static PdfGenerationResponse Failed(string errorMessage, ErrorDetails? error = null)
    {
        return new PdfGenerationResponse
        {
            Success = false,
            ErrorMessage = errorMessage,
            Error = error,
        };
    }
}

/// <summary>
/// Detailed error information.
/// </summary>
public class ErrorDetails
{
    /// <summary>
    /// Gets or sets the error code.
    /// </summary>
    /// <example>LAYOUT_INVALID</example>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the error message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the path to the component that caused the error.
    /// </summary>
    /// <example>layout.children[0].children[2]</example>
    public string? Path { get; set; }

    /// <summary>
    /// Gets or sets the node ID if available.
    /// </summary>
    public string? NodeId { get; set; }

    /// <summary>
    /// Gets or sets the component type.
    /// </summary>
    public string? ComponentType { get; set; }

    /// <summary>
    /// Gets or sets the property name if the error is property-specific.
    /// </summary>
    public string? PropertyName { get; set; }

    /// <summary>
    /// Gets or sets the inner exception message if applicable.
    /// </summary>
    public string? InnerError { get; set; }

    /// <summary>
    /// Gets or sets the stack trace (only in development mode).
    /// </summary>
    public string? StackTrace { get; set; }

    /// <summary>
    /// Gets or sets additional context data.
    /// </summary>
    public Dictionary<string, object>? Context { get; set; }
}
