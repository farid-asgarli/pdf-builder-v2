using Microsoft.AspNetCore.SignalR;
using PDFBuilder.API.Hubs;
using PDFBuilder.Contracts.Responses;

namespace PDFBuilder.API.Services;

/// <summary>
/// Service for reporting progress on long-running operations via SignalR.
/// Provides methods to send progress updates to subscribed clients.
/// </summary>
public interface IProgressReporter
{
    /// <summary>
    /// Reports progress for an operation.
    /// </summary>
    /// <param name="update">The progress update to send.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task ReportProgressAsync(ProgressUpdate update, CancellationToken cancellationToken = default);

    /// <summary>
    /// Reports the start of an operation.
    /// </summary>
    /// <param name="operationId">The operation identifier.</param>
    /// <param name="operationType">The type of operation.</param>
    /// <param name="message">Optional message.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task ReportStartedAsync(
        string operationId,
        OperationType operationType,
        string? message = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reports an incremental progress update.
    /// </summary>
    /// <param name="operationId">The operation identifier.</param>
    /// <param name="progressPercentage">Progress percentage (0-100).</param>
    /// <param name="currentStep">Current step description.</param>
    /// <param name="elapsedMs">Elapsed milliseconds.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task ReportProgressAsync(
        string operationId,
        int progressPercentage,
        string? currentStep = null,
        long elapsedMs = 0,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reports the successful completion of an operation.
    /// </summary>
    /// <param name="operationId">The operation identifier.</param>
    /// <param name="message">Completion message.</param>
    /// <param name="elapsedMs">Total elapsed milliseconds.</param>
    /// <param name="additionalData">Additional data to include.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task ReportCompletedAsync(
        string operationId,
        string? message = null,
        long elapsedMs = 0,
        Dictionary<string, object>? additionalData = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reports that an operation has failed.
    /// </summary>
    /// <param name="operationId">The operation identifier.</param>
    /// <param name="errorMessage">The error message.</param>
    /// <param name="elapsedMs">Total elapsed milliseconds.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task ReportFailedAsync(
        string operationId,
        string errorMessage,
        long elapsedMs = 0,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Reports that an operation was cancelled.
    /// </summary>
    /// <param name="operationId">The operation identifier.</param>
    /// <param name="elapsedMs">Total elapsed milliseconds.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task ReportCancelledAsync(
        string operationId,
        long elapsedMs = 0,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generates a unique operation ID.
    /// </summary>
    /// <returns>A new unique operation ID.</returns>
    string GenerateOperationId();
}

/// <summary>
/// SignalR-based implementation of <see cref="IProgressReporter"/>.
/// Sends progress updates to clients subscribed to specific operation groups.
/// </summary>
public class SignalRProgressReporter : IProgressReporter
{
    private readonly IHubContext<ProgressHub> _hubContext;
    private readonly ILogger<SignalRProgressReporter> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="SignalRProgressReporter"/> class.
    /// </summary>
    /// <param name="hubContext">The SignalR hub context.</param>
    /// <param name="logger">The logger instance.</param>
    public SignalRProgressReporter(
        IHubContext<ProgressHub> hubContext,
        ILogger<SignalRProgressReporter> logger
    )
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task ReportProgressAsync(
        ProgressUpdate update,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(update.OperationId))
        {
            _logger.LogWarning("Attempted to report progress without operation ID");
            return;
        }

        try
        {
            await _hubContext
                .Clients.Group(update.OperationId)
                .SendAsync("ProgressUpdate", update, cancellationToken);

            _logger.LogTrace(
                "Progress reported for operation {OperationId}: {Percentage}% - {Status}",
                update.OperationId,
                update.ProgressPercentage,
                update.Status
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to send progress update for operation {OperationId}",
                update.OperationId
            );
        }
    }

    /// <inheritdoc />
    public async Task ReportStartedAsync(
        string operationId,
        OperationType operationType,
        string? message = null,
        CancellationToken cancellationToken = default
    )
    {
        var update = new ProgressUpdate
        {
            OperationId = operationId,
            OperationType = operationType,
            Status = OperationStatus.InProgress,
            ProgressPercentage = 0,
            Message = message ?? "Operation started",
            CurrentStep = "Initializing",
            Timestamp = DateTime.UtcNow,
        };

        await ReportProgressAsync(update, cancellationToken);
    }

    /// <inheritdoc />
    public async Task ReportProgressAsync(
        string operationId,
        int progressPercentage,
        string? currentStep = null,
        long elapsedMs = 0,
        CancellationToken cancellationToken = default
    )
    {
        var update = new ProgressUpdate
        {
            OperationId = operationId,
            Status = OperationStatus.InProgress,
            ProgressPercentage = Math.Clamp(progressPercentage, 0, 100),
            CurrentStep = currentStep,
            ElapsedMilliseconds = elapsedMs,
            Timestamp = DateTime.UtcNow,
        };

        await ReportProgressAsync(update, cancellationToken);
    }

    /// <inheritdoc />
    public async Task ReportCompletedAsync(
        string operationId,
        string? message = null,
        long elapsedMs = 0,
        Dictionary<string, object>? additionalData = null,
        CancellationToken cancellationToken = default
    )
    {
        var update = new ProgressUpdate
        {
            OperationId = operationId,
            Status = OperationStatus.Completed,
            ProgressPercentage = 100,
            Message = message ?? "Operation completed successfully",
            ElapsedMilliseconds = elapsedMs,
            AdditionalData = additionalData,
            Timestamp = DateTime.UtcNow,
        };

        await ReportProgressAsync(update, cancellationToken);
    }

    /// <inheritdoc />
    public async Task ReportFailedAsync(
        string operationId,
        string errorMessage,
        long elapsedMs = 0,
        CancellationToken cancellationToken = default
    )
    {
        var update = new ProgressUpdate
        {
            OperationId = operationId,
            Status = OperationStatus.Failed,
            ErrorMessage = errorMessage,
            ElapsedMilliseconds = elapsedMs,
            Timestamp = DateTime.UtcNow,
        };

        await ReportProgressAsync(update, cancellationToken);
    }

    /// <inheritdoc />
    public async Task ReportCancelledAsync(
        string operationId,
        long elapsedMs = 0,
        CancellationToken cancellationToken = default
    )
    {
        var update = new ProgressUpdate
        {
            OperationId = operationId,
            Status = OperationStatus.Cancelled,
            Message = "Operation was cancelled",
            ElapsedMilliseconds = elapsedMs,
            Timestamp = DateTime.UtcNow,
        };

        await ReportProgressAsync(update, cancellationToken);
    }

    /// <inheritdoc />
    public string GenerateOperationId()
    {
        return $"op_{Guid.NewGuid():N}";
    }
}

/// <summary>
/// No-op implementation of <see cref="IProgressReporter"/> for when SignalR is not needed.
/// </summary>
public class NullProgressReporter : IProgressReporter
{
    /// <inheritdoc />
    public Task ReportProgressAsync(
        ProgressUpdate update,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;

    /// <inheritdoc />
    public Task ReportStartedAsync(
        string operationId,
        OperationType operationType,
        string? message = null,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;

    /// <inheritdoc />
    public Task ReportProgressAsync(
        string operationId,
        int progressPercentage,
        string? currentStep = null,
        long elapsedMs = 0,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;

    /// <inheritdoc />
    public Task ReportCompletedAsync(
        string operationId,
        string? message = null,
        long elapsedMs = 0,
        Dictionary<string, object>? additionalData = null,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;

    /// <inheritdoc />
    public Task ReportFailedAsync(
        string operationId,
        string errorMessage,
        long elapsedMs = 0,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;

    /// <inheritdoc />
    public Task ReportCancelledAsync(
        string operationId,
        long elapsedMs = 0,
        CancellationToken cancellationToken = default
    ) => Task.CompletedTask;

    /// <inheritdoc />
    public string GenerateOperationId() => $"op_{Guid.NewGuid():N}";
}
