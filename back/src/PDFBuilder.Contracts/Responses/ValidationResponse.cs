namespace PDFBuilder.Contracts.Responses;

/// <summary>
/// Response model for layout validation.
/// </summary>
public class ValidationResponse
{
    /// <summary>
    /// Gets or sets whether the layout is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Gets or sets the validation errors.
    /// </summary>
    public List<ValidationErrorDto> Errors { get; set; } = [];

    /// <summary>
    /// Gets or sets the validation warnings.
    /// </summary>
    public List<ValidationWarningDto> Warnings { get; set; } = [];

    /// <summary>
    /// Gets or sets statistics about the validated layout.
    /// </summary>
    public LayoutStatistics? Statistics { get; set; }

    /// <summary>
    /// Gets or sets the validation time in milliseconds.
    /// </summary>
    public long ValidationTimeMs { get; set; }

    /// <summary>
    /// Creates a valid response.
    /// </summary>
    public static ValidationResponse Valid(LayoutStatistics? statistics = null)
    {
        return new ValidationResponse { IsValid = true, Statistics = statistics };
    }

    /// <summary>
    /// Creates an invalid response with errors.
    /// </summary>
    public static ValidationResponse Invalid(IEnumerable<ValidationErrorDto> errors)
    {
        return new ValidationResponse { IsValid = false, Errors = errors.ToList() };
    }
}

/// <summary>
/// Represents a validation error.
/// </summary>
public class ValidationErrorDto
{
    /// <summary>
    /// Gets or sets the error code.
    /// </summary>
    /// <example>INVALID_COMPONENT_TYPE</example>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the error message.
    /// </summary>
    /// <example>Unknown component type 'InvalidType'</example>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the severity of the error.
    /// </summary>
    public ValidationSeverity Severity { get; set; } = ValidationSeverity.Error;

    /// <summary>
    /// Gets or sets the JSON path to the error location.
    /// </summary>
    /// <example>$.layout.children[0].type</example>
    public string? Path { get; set; }

    /// <summary>
    /// Gets or sets the node ID if available.
    /// </summary>
    public string? NodeId { get; set; }

    /// <summary>
    /// Gets or sets the property name if applicable.
    /// </summary>
    public string? PropertyName { get; set; }

    /// <summary>
    /// Gets or sets the actual value that caused the error.
    /// </summary>
    public object? ActualValue { get; set; }

    /// <summary>
    /// Gets or sets the expected value or format.
    /// </summary>
    public string? ExpectedFormat { get; set; }

    /// <summary>
    /// Gets or sets suggestions for fixing the error.
    /// </summary>
    public List<string>? Suggestions { get; set; }
}

/// <summary>
/// Represents a validation warning.
/// </summary>
public class ValidationWarningDto
{
    /// <summary>
    /// Gets or sets the warning code.
    /// </summary>
    /// <example>DEPRECATED_PROPERTY</example>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the warning message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the category of the warning.
    /// </summary>
    public WarningCategory Category { get; set; } = WarningCategory.General;

    /// <summary>
    /// Gets or sets the JSON path to the warning location.
    /// </summary>
    public string? Path { get; set; }

    /// <summary>
    /// Gets or sets the node ID if available.
    /// </summary>
    public string? NodeId { get; set; }

    /// <summary>
    /// Gets or sets suggestions for addressing the warning.
    /// </summary>
    public List<string>? Suggestions { get; set; }
}

/// <summary>
/// Validation error severity levels.
/// </summary>
public enum ValidationSeverity
{
    /// <summary>
    /// Informational message.
    /// </summary>
    Info,

    /// <summary>
    /// Warning - layout will work but may have issues.
    /// </summary>
    Warning,

    /// <summary>
    /// Error - layout is invalid and will not render correctly.
    /// </summary>
    Error,

    /// <summary>
    /// Critical - layout cannot be processed at all.
    /// </summary>
    Critical,
}

/// <summary>
/// Warning categories.
/// </summary>
public enum WarningCategory
{
    /// <summary>
    /// General warning.
    /// </summary>
    General,

    /// <summary>
    /// Performance-related warning.
    /// </summary>
    Performance,

    /// <summary>
    /// Deprecation warning.
    /// </summary>
    Deprecation,

    /// <summary>
    /// Accessibility warning.
    /// </summary>
    Accessibility,

    /// <summary>
    /// Best practice suggestion.
    /// </summary>
    BestPractice,
}

/// <summary>
/// Statistics about a layout tree.
/// </summary>
public class LayoutStatistics
{
    /// <summary>
    /// Gets or sets the total number of nodes in the tree.
    /// </summary>
    public int TotalNodes { get; set; }

    /// <summary>
    /// Gets or sets the maximum depth of the tree.
    /// </summary>
    public int MaxDepth { get; set; }

    /// <summary>
    /// Gets or sets the count of each component type.
    /// </summary>
    public Dictionary<string, int> ComponentCounts { get; set; } = [];

    /// <summary>
    /// Gets or sets the number of expressions found.
    /// </summary>
    public int ExpressionCount { get; set; }

    /// <summary>
    /// Gets or sets the number of images referenced.
    /// </summary>
    public int ImageCount { get; set; }

    /// <summary>
    /// Gets or sets the number of repeating nodes.
    /// </summary>
    public int RepeatNodeCount { get; set; }

    /// <summary>
    /// Gets or sets the number of conditional nodes.
    /// </summary>
    public int ConditionalNodeCount { get; set; }

    /// <summary>
    /// Gets or sets the estimated complexity score (1-10).
    /// </summary>
    public int ComplexityScore { get; set; }
}
