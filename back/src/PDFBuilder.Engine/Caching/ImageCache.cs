using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace PDFBuilder.Engine.Caching;

/// <summary>
/// Thread-safe cache for processed images with memory-aware LRU eviction.
/// Manages image data with size limits and automatic cleanup.
/// </summary>
public sealed class ImageCache : IDisposable
{
    private readonly ConcurrentDictionary<string, CachedImage> _cache;
    private readonly ILogger<ImageCache> _logger;
    private readonly ImageCacheOptions _options;
    private readonly SemaphoreSlim _evictionLock = new(1, 1);
    private readonly Timer _cleanupTimer;
    private long _currentSizeBytes;
    private long _hitCount;
    private long _missCount;
    private bool _disposed;

    /// <summary>
    /// Initializes a new instance of the ImageCache class.
    /// </summary>
    /// <param name="options">The cache options.</param>
    /// <param name="logger">The logger instance.</param>
    public ImageCache(ImageCacheOptions options, ILogger<ImageCache> logger)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _cache = new ConcurrentDictionary<string, CachedImage>(StringComparer.Ordinal);

        // Setup periodic cleanup every 2 minutes
        _cleanupTimer = new Timer(
            PerformCleanup,
            null,
            TimeSpan.FromMinutes(2),
            TimeSpan.FromMinutes(2)
        );

        _logger.LogInformation(
            "Image cache initialized with max size: {MaxSizeMB} MB, max entries: {MaxEntries}, expiration: {ExpirationMinutes} minutes",
            _options.MaxSizeBytes / (1024 * 1024),
            _options.MaxEntries,
            _options.ExpirationMinutes
        );
    }

    /// <summary>
    /// Gets the current cache size in bytes.
    /// </summary>
    public long CurrentSizeBytes => Interlocked.Read(ref _currentSizeBytes);

    /// <summary>
    /// Gets the current entry count.
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
    /// Gets the cache hit ratio.
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
    /// Generates a cache key for an image source with optional processing options.
    /// </summary>
    /// <param name="source">The image source.</param>
    /// <param name="processingOptions">Optional processing options hash.</param>
    /// <returns>The cache key.</returns>
    public static string GenerateCacheKey(string source, string? processingOptions = null)
    {
        // For data URIs, hash the content to create a reasonable key
        if (source.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            var hash = ComputeHash(source);
            return processingOptions is null ? $"data:{hash}" : $"data:{hash}:{processingOptions}";
        }

        // For URLs and paths, use as-is (normalized)
        var normalizedSource = source.ToLowerInvariant().Trim();
        return processingOptions is null
            ? normalizedSource
            : $"{normalizedSource}:{processingOptions}";
    }

    /// <summary>
    /// Tries to get a cached image.
    /// </summary>
    /// <param name="cacheKey">The cache key.</param>
    /// <param name="image">The cached image data if found.</param>
    /// <returns>True if found and not expired; otherwise, false.</returns>
    public bool TryGet(string cacheKey, out byte[]? image)
    {
        image = null;

        if (_cache.TryGetValue(cacheKey, out var cached))
        {
            var age = DateTime.UtcNow - cached.CachedAt;
            if (age.TotalMinutes < _options.ExpirationMinutes)
            {
                cached.RecordAccess();
                Interlocked.Increment(ref _hitCount);
                image = cached.Data;
                return true;
            }

            // Expired, remove it
            RemoveInternal(cacheKey, cached);
        }

        Interlocked.Increment(ref _missCount);
        return false;
    }

    /// <summary>
    /// Tries to get the full cached image entry.
    /// </summary>
    /// <param name="cacheKey">The cache key.</param>
    /// <param name="cachedImage">The cached image if found.</param>
    /// <returns>True if found and not expired; otherwise, false.</returns>
    public bool TryGetEntry(string cacheKey, out CachedImage? cachedImage)
    {
        cachedImage = null;

        if (_cache.TryGetValue(cacheKey, out var cached))
        {
            var age = DateTime.UtcNow - cached.CachedAt;
            if (age.TotalMinutes < _options.ExpirationMinutes)
            {
                cached.RecordAccess();
                Interlocked.Increment(ref _hitCount);
                cachedImage = cached;
                return true;
            }

            RemoveInternal(cacheKey, cached);
        }

        Interlocked.Increment(ref _missCount);
        return false;
    }

    /// <summary>
    /// Adds an image to the cache.
    /// </summary>
    /// <param name="cacheKey">The cache key.</param>
    /// <param name="image">The cached image entry.</param>
    /// <returns>True if added; false if cache is full.</returns>
    public bool TryAdd(string cacheKey, CachedImage image)
    {
        ArgumentNullException.ThrowIfNull(cacheKey);
        ArgumentNullException.ThrowIfNull(image);

        // Check if image is too large
        if (image.SizeBytes > _options.MaxSingleItemBytes)
        {
            _logger.LogWarning(
                "Image too large to cache: {Size} bytes (max: {MaxSize} bytes)",
                image.SizeBytes,
                _options.MaxSingleItemBytes
            );
            return false;
        }

        // Evict if necessary to make room
        while (
            _cache.Count >= _options.MaxEntries
            || CurrentSizeBytes + image.SizeBytes > _options.MaxSizeBytes
        )
        {
            if (!EvictOne())
            {
                break;
            }
        }

        // Check again after eviction
        if (
            _cache.Count >= _options.MaxEntries
            || CurrentSizeBytes + image.SizeBytes > _options.MaxSizeBytes
        )
        {
            _logger.LogDebug(
                "Cache full, cannot add image: {CacheKey}",
                TruncateForLogging(cacheKey)
            );
            return false;
        }

        if (_cache.TryAdd(cacheKey, image))
        {
            Interlocked.Add(ref _currentSizeBytes, image.SizeBytes);
            _logger.LogTrace(
                "Image cached: {CacheKey} ({Size} bytes, {Width}x{Height})",
                TruncateForLogging(cacheKey),
                image.SizeBytes,
                image.Width,
                image.Height
            );
            return true;
        }

        return false;
    }

    /// <summary>
    /// Removes an image from the cache.
    /// </summary>
    /// <param name="cacheKey">The cache key.</param>
    /// <returns>True if removed; otherwise, false.</returns>
    public bool Remove(string cacheKey)
    {
        if (_cache.TryRemove(cacheKey, out var cached))
        {
            Interlocked.Add(ref _currentSizeBytes, -cached.SizeBytes);
            return true;
        }
        return false;
    }

    /// <summary>
    /// Clears all cached images.
    /// </summary>
    public void Clear()
    {
        _cache.Clear();
        Interlocked.Exchange(ref _currentSizeBytes, 0);
        _logger.LogInformation("Image cache cleared");
    }

    /// <summary>
    /// Gets cache statistics.
    /// </summary>
    /// <returns>Cache statistics.</returns>
    public ImageCacheStatistics GetStatistics()
    {
        return new ImageCacheStatistics
        {
            EntryCount = _cache.Count,
            MaxEntries = _options.MaxEntries,
            CurrentSizeBytes = CurrentSizeBytes,
            MaxSizeBytes = _options.MaxSizeBytes,
            HitCount = HitCount,
            MissCount = MissCount,
            HitRatio = HitRatio,
        };
    }

    private void RemoveInternal(string key, CachedImage cached)
    {
        if (_cache.TryRemove(key, out _))
        {
            Interlocked.Add(ref _currentSizeBytes, -cached.SizeBytes);
        }
    }

    private bool EvictOne()
    {
        // Find LRU entry
        var lru = _cache.OrderBy(kvp => kvp.Value.LastAccessedAt).FirstOrDefault();

        if (lru.Key is not null)
        {
            RemoveInternal(lru.Key, lru.Value);
            _logger.LogTrace("Evicted image from cache: {CacheKey}", TruncateForLogging(lru.Key));
            return true;
        }

        return false;
    }

    private void PerformCleanup(object? state)
    {
        if (_disposed)
            return;

        var now = DateTime.UtcNow;
        var expiredKeys = _cache
            .Where(kvp => (now - kvp.Value.CachedAt).TotalMinutes >= _options.ExpirationMinutes)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredKeys)
        {
            if (_cache.TryRemove(key, out var cached))
            {
                Interlocked.Add(ref _currentSizeBytes, -cached.SizeBytes);
            }
        }

        if (expiredKeys.Count > 0)
        {
            _logger.LogDebug("Cleaned up {Count} expired images from cache", expiredKeys.Count);
        }
    }

    private static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes)[..16].ToLowerInvariant();
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
/// Image cache configuration options.
/// </summary>
public sealed class ImageCacheOptions
{
    /// <summary>
    /// Gets or sets the maximum cache size in bytes. Default: 100 MB.
    /// </summary>
    public long MaxSizeBytes { get; set; } = 100 * 1024 * 1024;

    /// <summary>
    /// Gets or sets the maximum number of entries. Default: 500.
    /// </summary>
    public int MaxEntries { get; set; } = 500;

    /// <summary>
    /// Gets or sets the maximum single item size in bytes. Default: 10 MB.
    /// </summary>
    public long MaxSingleItemBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// Gets or sets the cache expiration in minutes. Default: 30 minutes.
    /// </summary>
    public int ExpirationMinutes { get; set; } = 30;
}

/// <summary>
/// Image cache statistics.
/// </summary>
public sealed class ImageCacheStatistics
{
    /// <summary>
    /// Gets or sets the current entry count.
    /// </summary>
    public int EntryCount { get; init; }

    /// <summary>
    /// Gets or sets the maximum entries allowed.
    /// </summary>
    public int MaxEntries { get; init; }

    /// <summary>
    /// Gets or sets the current size in bytes.
    /// </summary>
    public long CurrentSizeBytes { get; init; }

    /// <summary>
    /// Gets or sets the maximum size in bytes.
    /// </summary>
    public long MaxSizeBytes { get; init; }

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
}
