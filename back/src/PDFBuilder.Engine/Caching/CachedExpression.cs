using DynamicExpresso;

namespace PDFBuilder.Engine.Caching;

/// <summary>
/// Represents a cached compiled expression with metadata for cache management.
/// </summary>
public sealed class CachedExpression
{
    /// <summary>
    /// Gets or sets the compiled lambda expression.
    /// </summary>
    public required Lambda CompiledExpression { get; init; }

    /// <summary>
    /// Gets or sets the original expression string.
    /// </summary>
    public required string Expression { get; init; }

    /// <summary>
    /// Gets or sets the parameter names required by this expression.
    /// </summary>
    public required string[] ParameterNames { get; init; }

    /// <summary>
    /// Gets the time when this expression was cached.
    /// </summary>
    public DateTime CachedAt { get; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the last access time for LRU eviction.
    /// </summary>
    public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the access count for statistics.
    /// </summary>
    public long AccessCount { get; set; }

    /// <summary>
    /// Gets or sets the estimated memory size in bytes.
    /// </summary>
    public long EstimatedSizeBytes { get; init; }

    /// <summary>
    /// Updates access statistics when the expression is used.
    /// </summary>
    public void RecordAccess()
    {
        LastAccessedAt = DateTime.UtcNow;
        Interlocked.Increment(ref _accessCount);
    }

    private long _accessCount;
}
