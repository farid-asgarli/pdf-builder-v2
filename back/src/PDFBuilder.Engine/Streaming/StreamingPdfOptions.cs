namespace PDFBuilder.Engine.Streaming;

/// <summary>
/// Options for streaming PDF generation.
/// Provides configuration for memory-efficient large document generation.
/// </summary>
public sealed class StreamingPdfOptions
{
    /// <summary>
    /// Gets or sets whether to enable streaming mode.
    /// When enabled, the document is generated in a streaming fashion
    /// to reduce memory consumption for large documents.
    /// </summary>
    public bool EnableStreaming { get; set; } = true;

    /// <summary>
    /// Gets or sets the buffer size for streaming operations.
    /// Default: 64 KB.
    /// </summary>
    public int BufferSize { get; set; } = 64 * 1024;

    /// <summary>
    /// Gets or sets whether to compress the PDF output.
    /// Compression reduces file size but increases CPU usage.
    /// </summary>
    public bool EnableCompression { get; set; } = true;

    /// <summary>
    /// Gets or sets the compression level (1-9).
    /// 1 = fastest, 9 = best compression. Default: 6.
    /// </summary>
    public int CompressionLevel { get; set; } = 6;

    /// <summary>
    /// Gets or sets whether to enable incremental rendering.
    /// When enabled, pages are rendered incrementally to reduce memory.
    /// </summary>
    public bool EnableIncrementalRendering { get; set; } = true;

    /// <summary>
    /// Gets or sets the maximum memory usage before flushing to stream.
    /// Default: 50 MB.
    /// </summary>
    public long MaxMemoryBeforeFlush { get; set; } = 50 * 1024 * 1024;

    /// <summary>
    /// Gets or sets whether to report progress during generation.
    /// </summary>
    public bool ReportProgress { get; set; }

    /// <summary>
    /// Gets or sets the progress reporting interval in pages.
    /// Progress is reported every N pages. Default: 10.
    /// </summary>
    public int ProgressReportInterval { get; set; } = 10;

    /// <summary>
    /// Default streaming options.
    /// </summary>
    public static StreamingPdfOptions Default { get; } = new();

    /// <summary>
    /// Options optimized for minimal memory usage.
    /// </summary>
    public static StreamingPdfOptions LowMemory { get; } =
        new()
        {
            EnableStreaming = true,
            BufferSize = 32 * 1024,
            EnableIncrementalRendering = true,
            MaxMemoryBeforeFlush = 20 * 1024 * 1024,
        };

    /// <summary>
    /// Options optimized for speed (higher memory usage).
    /// </summary>
    public static StreamingPdfOptions HighPerformance { get; } =
        new()
        {
            EnableStreaming = false,
            BufferSize = 256 * 1024,
            EnableIncrementalRendering = false,
            MaxMemoryBeforeFlush = 200 * 1024 * 1024,
        };
}

/// <summary>
/// Progress information for streaming PDF generation.
/// </summary>
public sealed class PdfGenerationProgress
{
    /// <summary>
    /// Gets or sets the current page being processed.
    /// </summary>
    public int CurrentPage { get; init; }

    /// <summary>
    /// Gets or sets the estimated total pages (may be approximate).
    /// </summary>
    public int? EstimatedTotalPages { get; init; }

    /// <summary>
    /// Gets or sets the bytes written so far.
    /// </summary>
    public long BytesWritten { get; init; }

    /// <summary>
    /// Gets or sets the current memory usage.
    /// </summary>
    public long CurrentMemoryBytes { get; init; }

    /// <summary>
    /// Gets or sets the elapsed time.
    /// </summary>
    public TimeSpan Elapsed { get; init; }

    /// <summary>
    /// Gets the progress percentage (0-100) if total pages is known.
    /// </summary>
    public double? ProgressPercentage =>
        EstimatedTotalPages.HasValue && EstimatedTotalPages.Value > 0
            ? (double)CurrentPage / EstimatedTotalPages.Value * 100
            : null;
}

/// <summary>
/// Delegate for progress reporting during PDF generation.
/// </summary>
/// <param name="progress">The current progress.</param>
public delegate void PdfProgressCallback(PdfGenerationProgress progress);
