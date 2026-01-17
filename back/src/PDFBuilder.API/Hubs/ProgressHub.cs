using Microsoft.AspNetCore.SignalR;
using PDFBuilder.Contracts.Responses;

namespace PDFBuilder.API.Hubs;

/// <summary>
/// SignalR hub for real-time progress reporting on long-running operations.
/// Clients can subscribe to receive progress updates for specific operations.
/// </summary>
public class ProgressHub : Hub
{
    private readonly ILogger<ProgressHub> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProgressHub"/> class.
    /// </summary>
    /// <param name="logger">The logger instance.</param>
    public ProgressHub(ILogger<ProgressHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Called when a client connects to the hub.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation(
            "Client connected to ProgressHub: {ConnectionId}",
            Context.ConnectionId
        );
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a client disconnects from the hub.
    /// </summary>
    /// <param name="exception">The exception that caused the disconnect, if any.</param>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation(
            "Client disconnected from ProgressHub: {ConnectionId}. Exception: {Exception}",
            Context.ConnectionId,
            exception?.Message ?? "None"
        );
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Subscribes the client to receive updates for a specific operation.
    /// </summary>
    /// <param name="operationId">The operation ID to subscribe to.</param>
    public async Task SubscribeToOperation(string operationId)
    {
        if (string.IsNullOrWhiteSpace(operationId))
        {
            _logger.LogWarning(
                "Client {ConnectionId} attempted to subscribe with empty operation ID",
                Context.ConnectionId
            );
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, operationId);
        _logger.LogDebug(
            "Client {ConnectionId} subscribed to operation {OperationId}",
            Context.ConnectionId,
            operationId
        );
    }

    /// <summary>
    /// Unsubscribes the client from receiving updates for a specific operation.
    /// </summary>
    /// <param name="operationId">The operation ID to unsubscribe from.</param>
    public async Task UnsubscribeFromOperation(string operationId)
    {
        if (string.IsNullOrWhiteSpace(operationId))
        {
            return;
        }

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, operationId);
        _logger.LogDebug(
            "Client {ConnectionId} unsubscribed from operation {OperationId}",
            Context.ConnectionId,
            operationId
        );
    }

    /// <summary>
    /// Allows clients to ping the server to check connection status.
    /// </summary>
    /// <returns>A pong response with timestamp.</returns>
    public Task<object> Ping()
    {
        return Task.FromResult<object>(new { Response = "pong", Timestamp = DateTime.UtcNow });
    }
}
