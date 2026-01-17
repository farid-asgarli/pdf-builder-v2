namespace PDFBuilder.Engine.Interfaces;

/// <summary>
/// Marker interface for disposable services that should be cleaned up on shutdown.
/// </summary>
public interface IDisposableService : IDisposable
{
    /// <summary>
    /// Gets a value indicating whether this service has been disposed.
    /// </summary>
    bool IsDisposed { get; }
}

/// <summary>
/// Interface for services that support async disposal.
/// </summary>
public interface IAsyncDisposableService : IAsyncDisposable
{
    /// <summary>
    /// Gets a value indicating whether this service has been disposed.
    /// </summary>
    bool IsDisposed { get; }
}

/// <summary>
/// Interface for services that provide health status information.
/// </summary>
public interface IHealthReporter
{
    /// <summary>
    /// Gets the health status of the service.
    /// </summary>
    /// <returns>The health status.</returns>
    ServiceHealthStatus GetHealthStatus();
}

/// <summary>
/// Represents the health status of a service.
/// </summary>
public sealed class ServiceHealthStatus
{
    /// <summary>
    /// Gets or sets the service name.
    /// </summary>
    public required string ServiceName { get; init; }

    /// <summary>
    /// Gets or sets whether the service is healthy.
    /// </summary>
    public bool IsHealthy { get; init; }

    /// <summary>
    /// Gets or sets the status message.
    /// </summary>
    public string? Message { get; init; }

    /// <summary>
    /// Gets or sets additional details.
    /// </summary>
    public IDictionary<string, object>? Details { get; init; }

    /// <summary>
    /// Gets or sets when this status was checked.
    /// </summary>
    public DateTime CheckedAt { get; init; } = DateTime.UtcNow;

    /// <summary>
    /// Creates a healthy status.
    /// </summary>
    /// <param name="serviceName">The service name.</param>
    /// <param name="details">Optional details.</param>
    /// <returns>A healthy status.</returns>
    public static ServiceHealthStatus Healthy(
        string serviceName,
        IDictionary<string, object>? details = null
    )
    {
        return new ServiceHealthStatus
        {
            ServiceName = serviceName,
            IsHealthy = true,
            Message = "Service is healthy",
            Details = details,
        };
    }

    /// <summary>
    /// Creates an unhealthy status.
    /// </summary>
    /// <param name="serviceName">The service name.</param>
    /// <param name="message">The error message.</param>
    /// <param name="details">Optional details.</param>
    /// <returns>An unhealthy status.</returns>
    public static ServiceHealthStatus Unhealthy(
        string serviceName,
        string message,
        IDictionary<string, object>? details = null
    )
    {
        return new ServiceHealthStatus
        {
            ServiceName = serviceName,
            IsHealthy = false,
            Message = message,
            Details = details,
        };
    }
}
