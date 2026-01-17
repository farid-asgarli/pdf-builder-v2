using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using PDFBuilder.Infrastructure.Configuration;

namespace PDFBuilder.Engine.Caching;

/// <summary>
/// Thread-safe cache for compiled expressions with LRU eviction and statistics.
/// Optimizes expression evaluation by caching compiled Lambda objects.
/// </summary>
public sealed class ExpressionCache : IDisposable
{
    private readonly ConcurrentDictionary<string, CachedExpression> _cache;
    private readonly ExpressionSettings _settings;
    private readonly ILogger<ExpressionCache> _logger;
    private readonly SemaphoreSlim _evictionLock = new(1, 1);
    private readonly Timer _cleanupTimer;
    private long _hitCount;
    private long _missCount;
    private bool _disposed;

    /// <summary>
    /// Initializes a new instance of the ExpressionCache class.
    /// </summary>
    /// <param name="settings">The expression settings.</param>
    /// <param name="logger">The logger instance.</param>
    public ExpressionCache(IOptions<ExpressionSettings> settings, ILogger<ExpressionCache> logger)
    {
        _settings = settings?.Value ?? throw new ArgumentNullException(nameof(settings));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _cache = new ConcurrentDictionary<string, CachedExpression>(StringComparer.Ordinal);

        // Setup periodic cleanup every 5 minutes
        _cleanupTimer = new Timer(
            PerformCleanup,
            null,
            TimeSpan.FromMinutes(5),
            TimeSpan.FromMinutes(5)
        );

        _logger.LogInformation(
            "Expression cache initialized with max size: {MaxSize}, expiration: {ExpirationMinutes} minutes",
            _settings.MaxCacheSize,
            _settings.CacheExpirationMinutes
        );
    }

    /// <summary>
    /// Gets the current cache size.
    /// </summary>
    public int Count => _cache.Count;

    /// <summary>
    /// Gets the cache hit count.
    /// </summary>
    public long HitCount => Interlocked.Read(ref _hitCount);

    /// <summary>
    /// Gets the cache miss count.
    /// </summary>
    public long MissCount => Interlocked.Read(ref _missCount);

    /// <summary>
    /// Gets the cache hit ratio (0.0 to 1.0).
    /// </summary>
    public double HitRatio
    {
        get
        {
            var total = HitCount + MissCount;
            return total > 0 ? (double)HitCount / total : 0.0;
        }
    }

    /// <summary>
    /// Gets or creates a compiled expression from the cache.
    /// </summary>
    /// <param name="expression">The expression string.</param>
    /// <param name="cacheKey">The cache key (may include context-specific info).</param>
    /// <param name="factory">Factory function to compile the expression if not cached.</param>
    /// <returns>The cached or newly compiled expression.</returns>
    public CachedExpression GetOrAdd(
        string expression,
        string cacheKey,
        Func<string, CachedExpression> factory
    )
    {
        ArgumentNullException.ThrowIfNull(expression);
        ArgumentNullException.ThrowIfNull(cacheKey);
        ArgumentNullException.ThrowIfNull(factory);

        if (!_settings.EnableCaching)
        {
            Interlocked.Increment(ref _missCount);
            return factory(expression);
        }

        if (_cache.TryGetValue(cacheKey, out var cached))
        {
            // Check if expired
            var age = DateTime.UtcNow - cached.CachedAt;
            if (age.TotalMinutes < _settings.CacheExpirationMinutes)
            {
                cached.RecordAccess();
                Interlocked.Increment(ref _hitCount);
                return cached;
            }

            // Expired, remove it
            _cache.TryRemove(cacheKey, out _);
        }

        Interlocked.Increment(ref _missCount);

        // Compile new expression
        var newCached = factory(expression);

        // Check if we need to evict before adding
        if (_cache.Count >= _settings.MaxCacheSize)
        {
            EvictLRU();
        }

        _cache.TryAdd(cacheKey, newCached);

        _logger.LogTrace(
            "Expression cached: {Expression} (cache size: {Size})",
            TruncateForLogging(expression),
            _cache.Count
        );

        return newCached;
    }

    /// <summary>
    /// Tries to get a cached expression.
    /// </summary>
    /// <param name="cacheKey">The cache key.</param>
    /// <param name="cached">The cached expression if found.</param>
    /// <returns>True if found and not expired; otherwise, false.</returns>
    public bool TryGet(string cacheKey, out CachedExpression? cached)
    {
        cached = null;

        if (!_settings.EnableCaching)
        {
            return false;
        }

        if (_cache.TryGetValue(cacheKey, out cached))
        {
            var age = DateTime.UtcNow - cached.CachedAt;
            if (age.TotalMinutes < _settings.CacheExpirationMinutes)
            {
                cached.RecordAccess();
                Interlocked.Increment(ref _hitCount);
                return true;
            }

            // Expired
            _cache.TryRemove(cacheKey, out _);
            cached = null;
        }

        Interlocked.Increment(ref _missCount);
        return false;
    }

    /// <summary>
    /// Removes a specific expression from the cache.
    /// </summary>
    /// <param name="cacheKey">The cache key.</param>
    /// <returns>True if removed; otherwise, false.</returns>
    public bool Remove(string cacheKey)
    {
        return _cache.TryRemove(cacheKey, out _);
    }

    /// <summary>
    /// Clears all cached expressions.
    /// </summary>
    public void Clear()
    {
        _cache.Clear();
        _logger.LogInformation("Expression cache cleared");
    }

    /// <summary>
    /// Gets cache statistics.
    /// </summary>
    /// <returns>Cache statistics.</returns>
    public ExpressionCacheStatistics GetStatistics()
    {
        return new ExpressionCacheStatistics
        {
            Size = _cache.Count,
            MaxSize = _settings.MaxCacheSize,
            HitCount = HitCount,
            MissCount = MissCount,
            HitRatio = HitRatio,
            EstimatedMemoryBytes = _cache.Values.Sum(c => c.EstimatedSizeBytes),
        };
    }

    /// <summary>
    /// Evicts the least recently used expressions.
    /// </summary>
    private void EvictLRU()
    {
        if (!_evictionLock.Wait(0))
        {
            // Another thread is evicting, skip
            return;
        }

        try
        {
            // Target removing 10% of entries
            var targetRemoval = Math.Max(1, _settings.MaxCacheSize / 10);
            var toRemove = _cache
                .OrderBy(kvp => kvp.Value.LastAccessedAt)
                .Take(targetRemoval)
                .Select(kvp => kvp.Key)
                .ToList();

            foreach (var key in toRemove)
            {
                _cache.TryRemove(key, out _);
            }

            _logger.LogDebug("Evicted {Count} expressions from cache (LRU)", toRemove.Count);
        }
        finally
        {
            _evictionLock.Release();
        }
    }

    /// <summary>
    /// Performs periodic cleanup of expired entries.
    /// </summary>
    private void PerformCleanup(object? state)
    {
        if (_disposed)
            return;

        var expiredKeys = _cache
            .Where(kvp =>
                (DateTime.UtcNow - kvp.Value.CachedAt).TotalMinutes
                >= _settings.CacheExpirationMinutes
            )
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredKeys)
        {
            _cache.TryRemove(key, out _);
        }

        if (expiredKeys.Count > 0)
        {
            _logger.LogDebug(
                "Cleaned up {Count} expired expressions from cache",
                expiredKeys.Count
            );
        }
    }

    private static string TruncateForLogging(string value, int maxLength = 50)
    {
        if (string.IsNullOrEmpty(value) || value.Length <= maxLength)
            return value;
        return value[..maxLength] + "...";
    }

    /// <inheritdoc />
    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        _cleanupTimer.Dispose();
        _evictionLock.Dispose();
        _cache.Clear();
    }
}

/// <summary>
/// Expression cache statistics.
/// </summary>
public sealed class ExpressionCacheStatistics
{
    /// <summary>
    /// Gets or sets the current cache size.
    /// </summary>
    public int Size { get; init; }

    /// <summary>
    /// Gets or sets the maximum cache size.
    /// </summary>
    public int MaxSize { get; init; }

    /// <summary>
    /// Gets or sets the cache hit count.
    /// </summary>
    public long HitCount { get; init; }

    /// <summary>
    /// Gets or sets the cache miss count.
    /// </summary>
    public long MissCount { get; init; }

    /// <summary>
    /// Gets or sets the cache hit ratio.
    /// </summary>
    public double HitRatio { get; init; }

    /// <summary>
    /// Gets or sets the estimated total memory usage.
    /// </summary>
    public long EstimatedMemoryBytes { get; init; }
}
