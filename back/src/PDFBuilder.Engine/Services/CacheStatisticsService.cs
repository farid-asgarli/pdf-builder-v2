using PDFBuilder.Engine.Caching;
using PDFBuilder.Engine.Interfaces;

namespace PDFBuilder.Engine.Services;

/// <summary>
/// Aggregates statistics from all caching systems for monitoring and diagnostics.
/// </summary>
/// <remarks>
/// Initializes a new instance of the CacheStatisticsService class.
/// </remarks>
/// <param name="logger">The logger instance.</param>
/// <param name="expressionCache">The expression cache (optional).</param>
/// <param name="imageCache">The image cache (optional).</param>
public sealed class CacheStatisticsService(
    ILogger<CacheStatisticsService> logger,
    ExpressionCache? expressionCache = null,
    ImageCache? imageCache = null
) : IHealthReporter
{
    private readonly ExpressionCache? _expressionCache = expressionCache;
    private readonly ImageCache? _imageCache = imageCache;
    private readonly ILogger<CacheStatisticsService> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Gets aggregated cache statistics from all caching systems.
    /// </summary>
    /// <returns>Aggregated cache statistics.</returns>
    public AggregatedCacheStatistics GetStatistics()
    {
        var stats = new AggregatedCacheStatistics { GeneratedAt = DateTime.UtcNow };

        if (_expressionCache is not null)
        {
            stats.ExpressionCache = _expressionCache.GetStatistics();
        }

        if (_imageCache is not null)
        {
            stats.ImageCache = _imageCache.GetStatistics();
        }

        return stats;
    }

    /// <summary>
    /// Logs current cache statistics at the information level.
    /// </summary>
    public void LogStatistics()
    {
        var stats = GetStatistics();

        if (stats.ExpressionCache is not null)
        {
            _logger.LogInformation(
                "Expression Cache: Size={Size}/{MaxSize}, HitRatio={HitRatio:P2}, Memory={MemoryKB:F2}KB",
                stats.ExpressionCache.Size,
                stats.ExpressionCache.MaxSize,
                stats.ExpressionCache.HitRatio,
                stats.ExpressionCache.EstimatedMemoryBytes / 1024.0
            );
        }

        if (stats.ImageCache is not null)
        {
            _logger.LogInformation(
                "Image Cache: Entries={Entries}/{MaxEntries}, Size={SizeMB:F2}MB/{MaxSizeMB:F2}MB, HitRatio={HitRatio:P2}",
                stats.ImageCache.EntryCount,
                stats.ImageCache.MaxEntries,
                stats.ImageCache.CurrentSizeBytes / (1024.0 * 1024.0),
                stats.ImageCache.MaxSizeBytes / (1024.0 * 1024.0),
                stats.ImageCache.HitRatio
            );
        }
    }

    /// <summary>
    /// Clears all caches.
    /// </summary>
    public void ClearAllCaches()
    {
        _expressionCache?.Clear();
        _imageCache?.Clear();
        _logger.LogInformation("All caches cleared");
    }

    /// <inheritdoc />
    public ServiceHealthStatus GetHealthStatus()
    {
        var stats = GetStatistics();
        var details = new Dictionary<string, object>();

        var isHealthy = true;
        var issues = new List<string>();

        // Check expression cache health
        if (stats.ExpressionCache is not null)
        {
            var expStats = stats.ExpressionCache;
            details["ExpressionCache.Size"] = expStats.Size;
            details["ExpressionCache.HitRatio"] = expStats.HitRatio;

            if (expStats.Size >= expStats.MaxSize * 0.9)
            {
                issues.Add("Expression cache near capacity");
            }

            if (expStats.HitRatio < 0.5 && expStats.HitCount + expStats.MissCount > 100)
            {
                issues.Add("Low expression cache hit ratio");
            }
        }

        // Check image cache health
        if (stats.ImageCache is not null)
        {
            var imgStats = stats.ImageCache;
            details["ImageCache.Entries"] = imgStats.EntryCount;
            details["ImageCache.SizeBytes"] = imgStats.CurrentSizeBytes;
            details["ImageCache.HitRatio"] = imgStats.HitRatio;

            if (imgStats.CurrentSizeBytes >= imgStats.MaxSizeBytes * 0.9)
            {
                issues.Add("Image cache near capacity");
            }
        }

        if (issues.Count > 0)
        {
            isHealthy = false;
        }

        return new ServiceHealthStatus
        {
            ServiceName = "CacheService",
            IsHealthy = isHealthy,
            Message = isHealthy ? "All caches healthy" : string.Join("; ", issues),
            Details = details,
        };
    }
}

/// <summary>
/// Aggregated statistics from all caching systems.
/// </summary>
public sealed class AggregatedCacheStatistics
{
    /// <summary>
    /// Gets or sets when these statistics were generated.
    /// </summary>
    public DateTime GeneratedAt { get; init; }

    /// <summary>
    /// Gets or sets the expression cache statistics.
    /// </summary>
    public ExpressionCacheStatistics? ExpressionCache { get; set; }

    /// <summary>
    /// Gets or sets the image cache statistics.
    /// </summary>
    public ImageCacheStatistics? ImageCache { get; set; }

    /// <summary>
    /// Gets the total estimated memory usage across all caches.
    /// </summary>
    public long TotalEstimatedMemoryBytes =>
        (ExpressionCache?.EstimatedMemoryBytes ?? 0) + (ImageCache?.CurrentSizeBytes ?? 0);

    /// <summary>
    /// Gets the overall cache hit ratio across all caches.
    /// </summary>
    public double OverallHitRatio
    {
        get
        {
            var totalHits = (ExpressionCache?.HitCount ?? 0) + (ImageCache?.HitCount ?? 0);
            var totalMisses = (ExpressionCache?.MissCount ?? 0) + (ImageCache?.MissCount ?? 0);
            var total = totalHits + totalMisses;
            return total > 0 ? (double)totalHits / total : 0.0;
        }
    }
}
