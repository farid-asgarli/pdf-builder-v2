using PDFBuilder.Engine.Caching;
using PDFBuilder.Infrastructure.External;

namespace PDFBuilder.Engine.Services;

/// <summary>
/// Manages cleanup of disposable services when the application shuts down.
/// Ensures proper release of resources like caches, pools, and external connections.
/// </summary>
public sealed class ServiceDisposalManager : IDisposable, IAsyncDisposable
{
    private readonly ILogger<ServiceDisposalManager> _logger;
    private readonly List<IDisposable> _disposables;
    private readonly List<IAsyncDisposable> _asyncDisposables;
    private bool _disposed;

    /// <summary>
    /// Initializes a new instance of the ServiceDisposalManager class.
    /// </summary>
    /// <param name="logger">The logger instance.</param>
    /// <param name="expressionCache">The expression cache.</param>
    /// <param name="imageCache">The image cache.</param>
    /// <param name="fontManager">The font manager (optional).</param>
    public ServiceDisposalManager(
        ILogger<ServiceDisposalManager> logger,
        ExpressionCache? expressionCache = null,
        ImageCache? imageCache = null,
        FontManager? fontManager = null
    )
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _disposables = [];
        _asyncDisposables = [];

        // Register known disposable services
        if (expressionCache is not null)
            _disposables.Add(expressionCache);

        if (imageCache is not null)
            _disposables.Add(imageCache);

        if (fontManager is not null)
            _disposables.Add(fontManager);
    }

    /// <summary>
    /// Registers a disposable service for cleanup.
    /// </summary>
    /// <param name="disposable">The disposable to register.</param>
    public void Register(IDisposable disposable)
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(ServiceDisposalManager));

        ArgumentNullException.ThrowIfNull(disposable);
        _disposables.Add(disposable);
    }

    /// <summary>
    /// Registers an async disposable service for cleanup.
    /// </summary>
    /// <param name="disposable">The async disposable to register.</param>
    public void Register(IAsyncDisposable disposable)
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(ServiceDisposalManager));

        ArgumentNullException.ThrowIfNull(disposable);
        _asyncDisposables.Add(disposable);
    }

    /// <summary>
    /// Disposes all registered services synchronously.
    /// </summary>
    public void Dispose()
    {
        if (_disposed)
            return;

        _logger.LogInformation(
            "Disposing {Count} services...",
            _disposables.Count + _asyncDisposables.Count
        );

        foreach (var disposable in _disposables)
        {
            try
            {
                disposable.Dispose();
                _logger.LogDebug("Disposed service: {Type}", disposable.GetType().Name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Error disposing service: {Type}",
                    disposable.GetType().Name
                );
            }
        }

        // Dispose async disposables synchronously (not ideal but necessary)
        foreach (var disposable in _asyncDisposables)
        {
            try
            {
                // Try synchronous dispose if available
                if (disposable is IDisposable syncDisposable)
                {
                    syncDisposable.Dispose();
                }
                else
                {
                    disposable.DisposeAsync().AsTask().GetAwaiter().GetResult();
                }
                _logger.LogDebug("Disposed async service: {Type}", disposable.GetType().Name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Error disposing async service: {Type}",
                    disposable.GetType().Name
                );
            }
        }

        _disposed = true;
        _logger.LogInformation("All services disposed");
    }

    /// <summary>
    /// Disposes all registered services asynchronously.
    /// </summary>
    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _logger.LogInformation(
            "Disposing {Count} services asynchronously...",
            _disposables.Count + _asyncDisposables.Count
        );

        // Dispose sync disposables
        foreach (var disposable in _disposables)
        {
            try
            {
                disposable.Dispose();
                _logger.LogDebug("Disposed service: {Type}", disposable.GetType().Name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Error disposing service: {Type}",
                    disposable.GetType().Name
                );
            }
        }

        // Dispose async disposables properly
        foreach (var disposable in _asyncDisposables)
        {
            try
            {
                await disposable.DisposeAsync();
                _logger.LogDebug("Disposed async service: {Type}", disposable.GetType().Name);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Error disposing async service: {Type}",
                    disposable.GetType().Name
                );
            }
        }

        _disposed = true;
        _logger.LogInformation("All services disposed asynchronously");
    }
}
