namespace PDFBuilder.Core.Exceptions;

/// <summary>
/// Exception thrown when layout validation fails.
/// </summary>
public class ValidationException : PdfBuilderException
{
    /// <inheritdoc />
    public override string ErrorCode => "VALIDATION_ERROR";

    /// <summary>
    /// Gets the collection of validation errors.
    /// </summary>
    public IReadOnlyList<ValidationError> ValidationErrors { get; }

    /// <summary>
    /// Gets the total number of validation errors.
    /// </summary>
    public int ErrorCount => ValidationErrors.Count;

    /// <summary>
    /// Initializes a new instance of the ValidationException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public ValidationException(string message)
        : base(message)
    {
        ValidationErrors = [];
    }

    /// <summary>
    /// Initializes a new instance of the ValidationException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="errors">The collection of validation errors.</param>
    public ValidationException(string message, IEnumerable<ValidationError> errors)
        : base(message)
    {
        ValidationErrors = errors.ToList().AsReadOnly();
    }

    /// <summary>
    /// Initializes a new instance of the ValidationException class.
    /// </summary>
    /// <param name="errors">The collection of validation errors.</param>
    public ValidationException(IEnumerable<ValidationError> errors)
        : base($"Validation failed with {errors.Count()} error(s).")
    {
        ValidationErrors = errors.ToList().AsReadOnly();
    }

    /// <summary>
    /// Initializes a new instance of the ValidationException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="innerException">The inner exception.</param>
    public ValidationException(string message, Exception innerException)
        : base(message, innerException)
    {
        ValidationErrors = [];
    }
}

/// <summary>
/// Represents a single validation error.
/// </summary>
public class ValidationError
{
    /// <summary>
    /// Gets or sets the error code.
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the error message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the JSON path to the property that failed validation.
    /// </summary>
    public string? PropertyPath { get; set; }

    /// <summary>
    /// Gets or sets the node ID where the error occurred.
    /// </summary>
    public string? NodeId { get; set; }

    /// <summary>
    /// Gets or sets the attempted value that failed validation.
    /// </summary>
    public object? AttemptedValue { get; set; }

    /// <summary>
    /// Gets or sets the severity of the error.
    /// </summary>
    public ValidationErrorSeverity Severity { get; set; } = ValidationErrorSeverity.Error;

    /// <summary>
    /// Gets or sets suggestions for fixing the error.
    /// </summary>
    public List<string>? Suggestions { get; set; }
}

/// <summary>
/// Severity levels for validation errors.
/// </summary>
public enum ValidationErrorSeverity
{
    /// <summary>
    /// Informational message.
    /// </summary>
    Info,

    /// <summary>
    /// Warning - validation passed but with concerns.
    /// </summary>
    Warning,

    /// <summary>
    /// Error - validation failed.
    /// </summary>
    Error,

    /// <summary>
    /// Critical - layout cannot be processed.
    /// </summary>
    Critical,
}
