namespace PDFBuilder.Infrastructure.Configuration;

/// <summary>
/// Configuration settings for performance and caching.
/// </summary>
public sealed class PerformanceSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Performance";

    /// <summary>
    /// Gets or sets whether performance tracking is enabled.
    /// </summary>
    public bool EnablePerformanceTracking { get; set; } = true;

    /// <summary>
    /// Gets or sets whether memory tracking is enabled.
    /// </summary>
    public bool EnableMemoryTracking { get; set; }

    /// <summary>
    /// Gets or sets whether detailed component timing is logged.
    /// </summary>
    public bool LogDetailedTiming { get; set; }

    /// <summary>
    /// Gets or sets the threshold in milliseconds above which operations are logged as slow.
    /// </summary>
    public int SlowOperationThresholdMs { get; set; } = 100;
}

/// <summary>
/// Configuration settings for the image cache.
/// </summary>
public sealed class ImageCacheSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "ImageCache";

    /// <summary>
    /// Gets or sets the maximum cache size in bytes. Default: 100 MB.
    /// </summary>
    public long MaxSizeBytes { get; set; } = 100 * 1024 * 1024;

    /// <summary>
    /// Gets or sets the maximum number of entries.
    /// </summary>
    public int MaxEntries { get; set; } = 500;

    /// <summary>
    /// Gets or sets the maximum single item size in bytes. Default: 10 MB.
    /// </summary>
    public long MaxSingleItemBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// Gets or sets the cache expiration in minutes.
    /// </summary>
    public int ExpirationMinutes { get; set; } = 30;
}

/// <summary>
/// Configuration settings for lazy loading.
/// </summary>
public sealed class LazyLoadingSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "LazyLoading";

    /// <summary>
    /// Gets or sets the default batch size.
    /// </summary>
    public int DefaultBatchSize { get; set; } = 100;

    /// <summary>
    /// Gets or sets the threshold above which lazy loading is auto-enabled.
    /// </summary>
    public int AutoEnableThreshold { get; set; } = 1000;

    /// <summary>
    /// Gets or sets whether to yield between batches.
    /// </summary>
    public bool YieldBetweenBatches { get; set; } = true;

    /// <summary>
    /// Gets or sets the GC trigger threshold.
    /// </summary>
    public int GCTriggerThreshold { get; set; } = 10000;
}

/// <summary>
/// Configuration settings for the font manager.
/// </summary>
public sealed class FontSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Fonts";

    /// <summary>
    /// Gets or sets the base path for custom fonts.
    /// </summary>
    public string? FontBasePath { get; set; }

    /// <summary>
    /// Gets or sets the default font family.
    /// </summary>
    public string DefaultFontFamily { get; set; } = "Arial";

    /// <summary>
    /// Gets or sets whether to preload fonts on startup.
    /// </summary>
    public bool PreloadFonts { get; set; } = true;

    /// <summary>
    /// Gets or sets the maximum cache size for fonts in bytes.
    /// </summary>
    public long MaxCacheSizeBytes { get; set; } = 50 * 1024 * 1024;
}

/// <summary>
/// Configuration settings for streaming PDF generation.
/// </summary>
public sealed class StreamingSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Streaming";

    /// <summary>
    /// Gets or sets whether streaming mode is enabled by default.
    /// </summary>
    public bool EnableStreaming { get; set; } = true;

    /// <summary>
    /// Gets or sets the buffer size for streaming operations.
    /// </summary>
    public int BufferSize { get; set; } = 65536;

    /// <summary>
    /// Gets or sets whether compression is enabled.
    /// </summary>
    public bool EnableCompression { get; set; } = true;

    /// <summary>
    /// Gets or sets the compression level (1-9).
    /// </summary>
    public int CompressionLevel { get; set; } = 6;

    /// <summary>
    /// Gets or sets whether incremental rendering is enabled.
    /// </summary>
    public bool EnableIncrementalRendering { get; set; } = true;

    /// <summary>
    /// Gets or sets the maximum memory before flushing to stream.
    /// </summary>
    public long MaxMemoryBeforeFlush { get; set; } = 50 * 1024 * 1024;
}
