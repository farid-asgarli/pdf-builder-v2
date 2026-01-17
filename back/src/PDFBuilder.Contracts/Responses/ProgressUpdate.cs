namespace PDFBuilder.Contracts.Responses;

/// <summary>
/// Response model for progress updates during long operations.
/// Used with SignalR for real-time progress reporting.
/// </summary>
public class ProgressUpdate
{
    /// <summary>
    /// Gets or sets the unique operation identifier.
    /// </summary>
    public string OperationId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the type of operation.
    /// </summary>
    public OperationType OperationType { get; set; }

    /// <summary>
    /// Gets or sets the current progress percentage (0-100).
    /// </summary>
    public int ProgressPercentage { get; set; }

    /// <summary>
    /// Gets or sets the current status of the operation.
    /// </summary>
    public OperationStatus Status { get; set; }

    /// <summary>
    /// Gets or sets a human-readable message describing current progress.
    /// </summary>
    public string? Message { get; set; }

    /// <summary>
    /// Gets or sets the current step description.
    /// </summary>
    public string? CurrentStep { get; set; }

    /// <summary>
    /// Gets or sets the total number of steps (if known).
    /// </summary>
    public int? TotalSteps { get; set; }

    /// <summary>
    /// Gets or sets the current step number (if known).
    /// </summary>
    public int? CurrentStepNumber { get; set; }

    /// <summary>
    /// Gets or sets the elapsed time in milliseconds.
    /// </summary>
    public long ElapsedMilliseconds { get; set; }

    /// <summary>
    /// Gets or sets the estimated time remaining in milliseconds.
    /// </summary>
    public long? EstimatedRemainingMilliseconds { get; set; }

    /// <summary>
    /// Gets or sets the timestamp of this progress update.
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets additional data specific to the operation.
    /// </summary>
    public Dictionary<string, object>? AdditionalData { get; set; }

    /// <summary>
    /// Gets or sets the error message if the operation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Type of operation being tracked.
/// </summary>
public enum OperationType
{
    /// <summary>
    /// PDF document generation.
    /// </summary>
    PdfGeneration,

    /// <summary>
    /// Image upload operation.
    /// </summary>
    ImageUpload,

    /// <summary>
    /// Batch image processing.
    /// </summary>
    BatchImageProcessing,

    /// <summary>
    /// Template validation.
    /// </summary>
    Validation,

    /// <summary>
    /// Other operation type.
    /// </summary>
    Other,
}

/// <summary>
/// Status of an operation.
/// </summary>
public enum OperationStatus
{
    /// <summary>
    /// Operation is pending/queued.
    /// </summary>
    Pending,

    /// <summary>
    /// Operation is currently in progress.
    /// </summary>
    InProgress,

    /// <summary>
    /// Operation completed successfully.
    /// </summary>
    Completed,

    /// <summary>
    /// Operation failed with an error.
    /// </summary>
    Failed,

    /// <summary>
    /// Operation was cancelled.
    /// </summary>
    Cancelled,
}
