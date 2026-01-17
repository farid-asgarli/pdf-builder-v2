namespace PDFBuilder.Contracts.Responses;

/// <summary>
/// Standard API response wrapper for consistent error handling.
/// </summary>
/// <typeparam name="T">The type of the data payload.</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// Gets or sets whether the request was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets the response data.
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    /// Gets or sets the error information if the request failed.
    /// </summary>
    public ApiError? Error { get; set; }

    /// <summary>
    /// Gets or sets metadata about the response.
    /// </summary>
    public ResponseMetadata? Metadata { get; set; }

    /// <summary>
    /// Creates a successful response with data.
    /// </summary>
    public static ApiResponse<T> Ok(T data, ResponseMetadata? metadata = null)
    {
        return new ApiResponse<T>
        {
            Success = true,
            Data = data,
            Metadata = metadata,
        };
    }

    /// <summary>
    /// Creates a failed response with error.
    /// </summary>
    public static ApiResponse<T> Fail(string message, string code = "ERROR", int? statusCode = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Error = new ApiError
            {
                Code = code,
                Message = message,
                StatusCode = statusCode,
            },
        };
    }

    /// <summary>
    /// Creates a failed response with detailed error.
    /// </summary>
    public static ApiResponse<T> Fail(ApiError error)
    {
        return new ApiResponse<T> { Success = false, Error = error };
    }
}

/// <summary>
/// Standard API error structure.
/// </summary>
public class ApiError
{
    /// <summary>
    /// Gets or sets the error code.
    /// </summary>
    /// <example>VALIDATION_ERROR</example>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the error message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the HTTP status code.
    /// </summary>
    public int? StatusCode { get; set; }

    /// <summary>
    /// Gets or sets detailed validation errors.
    /// </summary>
    public List<FieldError>? Details { get; set; }

    /// <summary>
    /// Gets or sets a unique trace ID for debugging.
    /// </summary>
    public string? TraceId { get; set; }

    /// <summary>
    /// Gets or sets the timestamp when the error occurred.
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Represents a field-level error.
/// </summary>
public class FieldError
{
    /// <summary>
    /// Gets or sets the field name or path.
    /// </summary>
    /// <example>layout.children[0].type</example>
    public string Field { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the error message for this field.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the rejected value.
    /// </summary>
    public object? RejectedValue { get; set; }
}

/// <summary>
/// Response metadata.
/// </summary>
public class ResponseMetadata
{
    /// <summary>
    /// Gets or sets the request processing time in milliseconds.
    /// </summary>
    public long? ProcessingTimeMs { get; set; }

    /// <summary>
    /// Gets or sets the server timestamp.
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the API version.
    /// </summary>
    public string? ApiVersion { get; set; }

    /// <summary>
    /// Gets or sets the request trace ID for debugging.
    /// </summary>
    public string? TraceId { get; set; }
}
