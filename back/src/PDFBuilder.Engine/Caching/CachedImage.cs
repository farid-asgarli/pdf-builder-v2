namespace PDFBuilder.Engine.Caching;

/// <summary>
/// Represents a cached image with metadata for cache management.
/// </summary>
public sealed class CachedImage
{
    /// <summary>
    /// Gets or sets the image data.
    /// </summary>
    public required byte[] Data { get; init; }

    /// <summary>
    /// Gets or sets the original source (URL, path, or data URI hash).
    /// </summary>
    public required string Source { get; init; }

    /// <summary>
    /// Gets or sets the image format (e.g., "PNG", "JPEG").
    /// </summary>
    public required string Format { get; init; }

    /// <summary>
    /// Gets or sets the image width.
    /// </summary>
    public int Width { get; init; }

    /// <summary>
    /// Gets or sets the image height.
    /// </summary>
    public int Height { get; init; }

    /// <summary>
    /// Gets the time when this image was cached.
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
    /// Gets the size in bytes.
    /// </summary>
    public int SizeBytes => Data.Length;

    /// <summary>
    /// Gets or sets whether this image has an alpha channel.
    /// </summary>
    public bool HasAlphaChannel { get; init; }

    /// <summary>
    /// Gets or sets any processing options that were applied.
    /// </summary>
    public string? ProcessingOptionsHash { get; init; }

    /// <summary>
    /// Updates access statistics when the image is used.
    /// </summary>
    public void RecordAccess()
    {
        LastAccessedAt = DateTime.UtcNow;
        Interlocked.Increment(ref _accessCount);
    }

    private long _accessCount;
}
