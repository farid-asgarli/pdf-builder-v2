using Microsoft.AspNetCore.Mvc;
using PDFBuilder.Engine.Caching;
using PDFBuilder.Engine.Pooling;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.API.Controllers;

/// <summary>
/// Controller for system diagnostics, cache statistics, and performance monitoring.
/// </summary>
/// <remarks>
/// Initializes a new instance of the DiagnosticsController class.
/// </remarks>
/// <param name="cacheStatsService">The cache statistics service.</param>
/// <param name="logger">The logger instance.</param>
/// <param name="expressionCache">The expression cache (optional).</param>
/// <param name="imageCache">The image cache (optional).</param>
/// <param name="contextPool">The render context pool (optional).</param>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class DiagnosticsController(
    CacheStatisticsService cacheStatsService,
    ILogger<DiagnosticsController> logger,
    ExpressionCache? expressionCache = null,
    ImageCache? imageCache = null,
    RenderContextPool? contextPool = null
) : ControllerBase
{
    private readonly CacheStatisticsService _cacheStatsService =
        cacheStatsService ?? throw new ArgumentNullException(nameof(cacheStatsService));
    private readonly ExpressionCache? _expressionCache = expressionCache;
    private readonly ImageCache? _imageCache = imageCache;
    private readonly RenderContextPool? _contextPool = contextPool;
    private readonly ILogger<DiagnosticsController> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Gets aggregated cache statistics from all caching systems.
    /// </summary>
    /// <returns>Cache statistics for all subsystems.</returns>
    [HttpGet("cache/stats")]
    [ProducesResponseType(typeof(AggregatedCacheStatistics), StatusCodes.Status200OK)]
    public ActionResult<AggregatedCacheStatistics> GetCacheStatistics()
    {
        var stats = _cacheStatsService.GetStatistics();
        return Ok(stats);
    }

    /// <summary>
    /// Gets expression cache statistics.
    /// </summary>
    /// <returns>Expression cache statistics.</returns>
    [HttpGet("cache/expression")]
    [ProducesResponseType(typeof(ExpressionCacheStatistics), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<ExpressionCacheStatistics> GetExpressionCacheStats()
    {
        if (_expressionCache is null)
        {
            return NotFound(new { Message = "Expression cache is not configured" });
        }

        return Ok(_expressionCache.GetStatistics());
    }

    /// <summary>
    /// Gets image cache statistics.
    /// </summary>
    /// <returns>Image cache statistics.</returns>
    [HttpGet("cache/image")]
    [ProducesResponseType(typeof(ImageCacheStatistics), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<ImageCacheStatistics> GetImageCacheStats()
    {
        if (_imageCache is null)
        {
            return NotFound(new { Message = "Image cache is not configured" });
        }

        return Ok(_imageCache.GetStatistics());
    }

    /// <summary>
    /// Clears all caches.
    /// </summary>
    /// <returns>Confirmation of cache clearing.</returns>
    [HttpPost("cache/clear")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult ClearAllCaches()
    {
        _logger.LogInformation("Cache clear requested via API");
        _cacheStatsService.ClearAllCaches();
        return Ok(new { Message = "All caches cleared", ClearedAt = DateTime.UtcNow });
    }

    /// <summary>
    /// Clears the expression cache.
    /// </summary>
    /// <returns>Confirmation of cache clearing.</returns>
    [HttpPost("cache/expression/clear")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult ClearExpressionCache()
    {
        if (_expressionCache is null)
        {
            return NotFound(new { Message = "Expression cache is not configured" });
        }

        _expressionCache.Clear();
        _logger.LogInformation("Expression cache cleared via API");
        return Ok(new { Message = "Expression cache cleared", ClearedAt = DateTime.UtcNow });
    }

    /// <summary>
    /// Clears the image cache.
    /// </summary>
    /// <returns>Confirmation of cache clearing.</returns>
    [HttpPost("cache/image/clear")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult ClearImageCache()
    {
        if (_imageCache is null)
        {
            return NotFound(new { Message = "Image cache is not configured" });
        }

        _imageCache.Clear();
        _logger.LogInformation("Image cache cleared via API");
        return Ok(new { Message = "Image cache cleared", ClearedAt = DateTime.UtcNow });
    }

    /// <summary>
    /// Gets object pool statistics.
    /// </summary>
    /// <returns>Pool statistics.</returns>
    [HttpGet("pools")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult GetPoolStatistics()
    {
        var stats = new
        {
            RenderContextPool = _contextPool?.GetStatistics(),
            GeneratedAt = DateTime.UtcNow,
        };

        return Ok(stats);
    }

    /// <summary>
    /// Gets cache health status.
    /// </summary>
    /// <returns>Health status for caching systems.</returns>
    [HttpGet("health/cache")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public ActionResult GetCacheHealth()
    {
        var health = _cacheStatsService.GetHealthStatus();

        if (health.IsHealthy)
        {
            return Ok(health);
        }

        return StatusCode(StatusCodes.Status503ServiceUnavailable, health);
    }

    /// <summary>
    /// Gets memory statistics.
    /// </summary>
    /// <returns>Current memory usage statistics.</returns>
    [HttpGet("memory")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult GetMemoryStats()
    {
        var process = System.Diagnostics.Process.GetCurrentProcess();

        var stats = new
        {
            ManagedMemory = new
            {
                TotalBytes = GC.GetTotalMemory(forceFullCollection: false),
                TotalMB = GC.GetTotalMemory(forceFullCollection: false) / (1024.0 * 1024.0),
            },
            ProcessMemory = new
            {
                WorkingSetBytes = process.WorkingSet64,
                WorkingSetMB = process.WorkingSet64 / (1024.0 * 1024.0),
                PrivateMemoryBytes = process.PrivateMemorySize64,
                PrivateMemoryMB = process.PrivateMemorySize64 / (1024.0 * 1024.0),
                PeakWorkingSetBytes = process.PeakWorkingSet64,
                PeakWorkingSetMB = process.PeakWorkingSet64 / (1024.0 * 1024.0),
            },
            GarbageCollection = new
            {
                Gen0Collections = GC.CollectionCount(0),
                Gen1Collections = GC.CollectionCount(1),
                Gen2Collections = GC.CollectionCount(2),
            },
            GeneratedAt = DateTime.UtcNow,
        };

        return Ok(stats);
    }

    /// <summary>
    /// Triggers garbage collection (use sparingly, for diagnostics only).
    /// </summary>
    /// <returns>Memory stats before and after GC.</returns>
    [HttpPost("memory/gc")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult TriggerGarbageCollection()
    {
        _logger.LogWarning("Garbage collection triggered via API");

        var before = GC.GetTotalMemory(forceFullCollection: false);

        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();

        var after = GC.GetTotalMemory(forceFullCollection: false);

        return Ok(
            new
            {
                BeforeBytes = before,
                BeforeMB = before / (1024.0 * 1024.0),
                AfterBytes = after,
                AfterMB = after / (1024.0 * 1024.0),
                FreedBytes = before - after,
                FreedMB = (before - after) / (1024.0 * 1024.0),
                CollectedAt = DateTime.UtcNow,
            }
        );
    }
}
