using Microsoft.Extensions.ObjectPool;
using PDFBuilder.Core.Domain;

namespace PDFBuilder.Engine.Pooling;

/// <summary>
/// Factory for creating pooled RenderContext instances.
/// Provides efficient reuse of context objects for PDF rendering.
/// </summary>
public sealed class RenderContextPool
{
    private readonly ObjectPool<RenderContext> _pool;
    private readonly ILogger<RenderContextPool> _logger;
    private long _rentCount;
    private long _returnCount;

    /// <summary>
    /// Initializes a new instance of the RenderContextPool class.
    /// </summary>
    /// <param name="logger">The logger instance.</param>
    public RenderContextPool(ILogger<RenderContextPool> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _pool = new DefaultObjectPoolProvider().Create(new RenderContextPooledObjectPolicy());
        _logger.LogDebug("RenderContext pool initialized");
    }

    /// <summary>
    /// Gets a RenderContext from the pool.
    /// </summary>
    /// <returns>A pooled RenderContext.</returns>
    public RenderContext Rent()
    {
        Interlocked.Increment(ref _rentCount);
        _logger.LogTrace("RenderContext rented from pool (total rented: {RentCount})", _rentCount);
        return _pool.Get();
    }

    /// <summary>
    /// Gets a RenderContext from the pool with initial data.
    /// </summary>
    /// <param name="data">The data object to set.</param>
    /// <returns>A pooled RenderContext with data.</returns>
    public RenderContext Rent(object? data)
    {
        var context = Rent();
        if (data is not null)
        {
            context.SetVariable("data", data);
        }
        return context;
    }

    /// <summary>
    /// Returns a RenderContext to the pool.
    /// </summary>
    /// <param name="context">The context to return.</param>
    public void Return(RenderContext context)
    {
        if (context is null)
            return;

        Interlocked.Increment(ref _returnCount);
        _pool.Return(context);
    }

    /// <summary>
    /// Gets a pooled context that will be returned when disposed.
    /// </summary>
    /// <param name="data">Optional data object.</param>
    /// <returns>A disposable wrapper around the pooled context.</returns>
    public PooledRenderContext GetPooled(object? data = null)
    {
        return new PooledRenderContext(this, data);
    }

    /// <summary>
    /// Gets pool statistics.
    /// </summary>
    /// <returns>Pool statistics.</returns>
    public RenderContextPoolStatistics GetStatistics()
    {
        return new RenderContextPoolStatistics
        {
            RentCount = Interlocked.Read(ref _rentCount),
            ReturnCount = Interlocked.Read(ref _returnCount),
        };
    }
}

/// <summary>
/// Policy for pooling RenderContext instances.
/// </summary>
internal sealed class RenderContextPooledObjectPolicy : PooledObjectPolicy<RenderContext>
{
    public override RenderContext Create() => new();

    public override bool Return(RenderContext obj)
    {
        obj.Reset();
        return true;
    }
}

/// <summary>
/// Disposable wrapper for pooled RenderContext.
/// </summary>
/// <remarks>
/// Initializes a new instance of the PooledRenderContext struct.
/// </remarks>
/// <param name="pool">The context pool.</param>
/// <param name="data">Optional data object.</param>
public readonly struct PooledRenderContext(RenderContextPool pool, object? data = null)
    : IDisposable
{
    private readonly RenderContextPool _pool = pool;
    private readonly RenderContext _context = pool.Rent(data);

    /// <summary>
    /// Gets the pooled context.
    /// </summary>
    public RenderContext Context => _context;

    /// <summary>
    /// Returns the context to the pool.
    /// </summary>
    public void Dispose()
    {
        _pool.Return(_context);
    }
}

/// <summary>
/// Statistics for the RenderContext pool.
/// </summary>
public sealed class RenderContextPoolStatistics
{
    /// <summary>
    /// Gets or sets the number of contexts rented.
    /// </summary>
    public long RentCount { get; init; }

    /// <summary>
    /// Gets or sets the number of contexts returned.
    /// </summary>
    public long ReturnCount { get; init; }

    /// <summary>
    /// Gets the number of outstanding rentals.
    /// </summary>
    public long OutstandingCount => RentCount - ReturnCount;
}
