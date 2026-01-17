using System.Collections.Concurrent;
using System.Diagnostics;

namespace PDFBuilder.Engine.Diagnostics;

/// <summary>
/// Provides performance measurement and diagnostics for PDF generation.
/// Tracks timing for various stages of the rendering pipeline.
/// </summary>
/// <remarks>
/// Initializes a new instance of the PerformanceTracker class.
/// </remarks>
/// <param name="logger">The logger instance.</param>
/// <param name="isEnabled">Whether tracking is enabled.</param>
public sealed class PerformanceTracker(ILogger<PerformanceTracker> logger, bool isEnabled = true)
    : IDisposable
{
    private readonly ConcurrentDictionary<string, OperationMetrics> _metrics =
        new ConcurrentDictionary<string, OperationMetrics>(StringComparer.OrdinalIgnoreCase);
    private readonly ILogger<PerformanceTracker> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));
    private readonly Stopwatch _totalStopwatch = Stopwatch.StartNew();
    private readonly bool _isEnabled = isEnabled;
    private bool _disposed;

    /// <summary>
    /// Gets whether tracking is enabled.
    /// </summary>
    public bool IsEnabled => _isEnabled;

    /// <summary>
    /// Gets the total elapsed time since tracking started.
    /// </summary>
    public TimeSpan TotalElapsed => _totalStopwatch.Elapsed;

    /// <summary>
    /// Starts timing an operation and returns a disposable that stops timing when disposed.
    /// </summary>
    /// <param name="operationName">The name of the operation.</param>
    /// <returns>A disposable that stops timing when disposed.</returns>
    public IDisposable TrackOperation(string operationName)
    {
        if (!_isEnabled)
        {
            return NullDisposable.Instance;
        }

        return new OperationTracker(this, operationName);
    }

    /// <summary>
    /// Records a completed operation with explicit timing.
    /// </summary>
    /// <param name="operationName">The name of the operation.</param>
    /// <param name="elapsed">The elapsed time.</param>
    public void RecordOperation(string operationName, TimeSpan elapsed)
    {
        if (!_isEnabled)
            return;

        var metrics = _metrics.GetOrAdd(operationName, _ => new OperationMetrics());
        metrics.Record(elapsed);
    }

    /// <summary>
    /// Records a component render operation.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <param name="elapsed">The elapsed time.</param>
    public void RecordComponentRender(string componentType, TimeSpan elapsed)
    {
        RecordOperation($"Component:{componentType}", elapsed);
    }

    /// <summary>
    /// Records an expression evaluation.
    /// </summary>
    /// <param name="elapsed">The elapsed time.</param>
    /// <param name="wasCached">Whether the expression was cached.</param>
    public void RecordExpressionEvaluation(TimeSpan elapsed, bool wasCached)
    {
        RecordOperation(wasCached ? "Expression:Cached" : "Expression:Compiled", elapsed);
    }

    /// <summary>
    /// Records an image load operation.
    /// </summary>
    /// <param name="elapsed">The elapsed time.</param>
    /// <param name="wasCached">Whether the image was cached.</param>
    /// <param name="sizeBytes">The image size in bytes.</param>
    public void RecordImageLoad(TimeSpan elapsed, bool wasCached, long sizeBytes)
    {
        var operationName = wasCached ? "Image:Cached" : "Image:Loaded";
        RecordOperation(operationName, elapsed);

        if (!wasCached)
        {
            var sizeMetrics = _metrics.GetOrAdd("Image:Size", _ => new OperationMetrics());
            sizeMetrics.RecordValue(sizeBytes);
        }
    }

    /// <summary>
    /// Gets the metrics for all tracked operations.
    /// </summary>
    /// <returns>Dictionary of operation names to metrics.</returns>
    public IDictionary<string, OperationSummary> GetMetrics()
    {
        var result = new Dictionary<string, OperationSummary>(StringComparer.OrdinalIgnoreCase);

        foreach (var kvp in _metrics)
        {
            result[kvp.Key] = kvp.Value.GetSummary();
        }

        return result;
    }

    /// <summary>
    /// Gets a comprehensive performance report.
    /// </summary>
    /// <returns>A performance report.</returns>
    public PerformanceReport GetReport()
    {
        _totalStopwatch.Stop();

        return new PerformanceReport
        {
            TotalDuration = TotalElapsed,
            Operations = GetMetrics(),
            GeneratedAt = DateTime.UtcNow,
        };
    }

    /// <summary>
    /// Logs a performance summary.
    /// </summary>
    public void LogSummary()
    {
        if (!_isEnabled)
            return;

        var report = GetReport();

        _logger.LogInformation(
            "Performance Summary - Total: {TotalMs}ms, Operations: {OpCount}",
            report.TotalDuration.TotalMilliseconds,
            report.Operations.Count
        );

        foreach (var op in report.Operations.OrderByDescending(o => o.Value.TotalTime))
        {
            _logger.LogDebug(
                "  {Operation}: Count={Count}, Total={TotalMs}ms, Avg={AvgMs}ms, Max={MaxMs}ms",
                op.Key,
                op.Value.Count,
                op.Value.TotalTime.TotalMilliseconds,
                op.Value.AverageTime.TotalMilliseconds,
                op.Value.MaxTime.TotalMilliseconds
            );
        }
    }

    /// <summary>
    /// Resets all tracked metrics.
    /// </summary>
    public void Reset()
    {
        _metrics.Clear();
        _totalStopwatch.Restart();
    }

    /// <inheritdoc />
    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        _totalStopwatch.Stop();
    }

    /// <summary>
    /// Helper class for tracking an operation's duration.
    /// </summary>
    private sealed class OperationTracker(PerformanceTracker tracker, string operationName)
        : IDisposable
    {
        private readonly PerformanceTracker _tracker = tracker;
        private readonly string _operationName = operationName;
        private readonly Stopwatch _stopwatch = Stopwatch.StartNew();

        public void Dispose()
        {
            _stopwatch.Stop();
            _tracker.RecordOperation(_operationName, _stopwatch.Elapsed);
        }
    }

    /// <summary>
    /// Null disposable for when tracking is disabled.
    /// </summary>
    private sealed class NullDisposable : IDisposable
    {
        public static readonly NullDisposable Instance = new();

        public void Dispose() { }
    }
}

/// <summary>
/// Thread-safe metrics for a single operation type.
/// </summary>
internal sealed class OperationMetrics
{
    private long _count;
    private long _totalTicks;
    private long _minTicks = long.MaxValue;
    private long _maxTicks;
    private long _totalValue;

    public void Record(TimeSpan elapsed)
    {
        var ticks = elapsed.Ticks;
        Interlocked.Increment(ref _count);
        Interlocked.Add(ref _totalTicks, ticks);

        UpdateMin(ticks);
        UpdateMax(ticks);
    }

    public void RecordValue(long value)
    {
        Interlocked.Add(ref _totalValue, value);
    }

    private void UpdateMin(long ticks)
    {
        long currentMin;
        do
        {
            currentMin = Interlocked.Read(ref _minTicks);
            if (ticks >= currentMin)
                break;
        } while (Interlocked.CompareExchange(ref _minTicks, ticks, currentMin) != currentMin);
    }

    private void UpdateMax(long ticks)
    {
        long currentMax;
        do
        {
            currentMax = Interlocked.Read(ref _maxTicks);
            if (ticks <= currentMax)
                break;
        } while (Interlocked.CompareExchange(ref _maxTicks, ticks, currentMax) != currentMax);
    }

    public OperationSummary GetSummary()
    {
        var count = Interlocked.Read(ref _count);
        var totalTicks = Interlocked.Read(ref _totalTicks);
        var minTicks = Interlocked.Read(ref _minTicks);
        var maxTicks = Interlocked.Read(ref _maxTicks);

        return new OperationSummary
        {
            Count = count,
            TotalTime = TimeSpan.FromTicks(totalTicks),
            MinTime = count > 0 ? TimeSpan.FromTicks(minTicks) : TimeSpan.Zero,
            MaxTime = TimeSpan.FromTicks(maxTicks),
            AverageTime = count > 0 ? TimeSpan.FromTicks(totalTicks / count) : TimeSpan.Zero,
            TotalValue = Interlocked.Read(ref _totalValue),
        };
    }
}

/// <summary>
/// Summary of metrics for a single operation type.
/// </summary>
public sealed class OperationSummary
{
    /// <summary>
    /// Gets or sets the number of times this operation was executed.
    /// </summary>
    public long Count { get; init; }

    /// <summary>
    /// Gets or sets the total time spent on this operation.
    /// </summary>
    public TimeSpan TotalTime { get; init; }

    /// <summary>
    /// Gets or sets the minimum execution time.
    /// </summary>
    public TimeSpan MinTime { get; init; }

    /// <summary>
    /// Gets or sets the maximum execution time.
    /// </summary>
    public TimeSpan MaxTime { get; init; }

    /// <summary>
    /// Gets or sets the average execution time.
    /// </summary>
    public TimeSpan AverageTime { get; init; }

    /// <summary>
    /// Gets or sets the total value (for size tracking).
    /// </summary>
    public long TotalValue { get; init; }
}

/// <summary>
/// Comprehensive performance report for a PDF generation run.
/// </summary>
public sealed class PerformanceReport
{
    /// <summary>
    /// Gets or sets the total duration of the operation.
    /// </summary>
    public TimeSpan TotalDuration { get; init; }

    /// <summary>
    /// Gets or sets the metrics for each operation type.
    /// </summary>
    public IDictionary<string, OperationSummary> Operations { get; init; } =
        new Dictionary<string, OperationSummary>();

    /// <summary>
    /// Gets or sets when this report was generated.
    /// </summary>
    public DateTime GeneratedAt { get; init; }

    /// <summary>
    /// Converts the report to a loggable string.
    /// </summary>
    /// <returns>A formatted string representation.</returns>
    public override string ToString()
    {
        var lines = new List<string>
        {
            $"Performance Report - Generated: {GeneratedAt:O}",
            $"Total Duration: {TotalDuration.TotalMilliseconds:F2}ms",
            $"Operations: {Operations.Count}",
            "",
        };

        foreach (var op in Operations.OrderByDescending(o => o.Value.TotalTime))
        {
            lines.Add(
                $"  {op.Key}: Count={op.Value.Count}, "
                    + $"Total={op.Value.TotalTime.TotalMilliseconds:F2}ms, "
                    + $"Avg={op.Value.AverageTime.TotalMilliseconds:F2}ms, "
                    + $"Min={op.Value.MinTime.TotalMilliseconds:F2}ms, "
                    + $"Max={op.Value.MaxTime.TotalMilliseconds:F2}ms"
            );
        }

        return string.Join(Environment.NewLine, lines);
    }
}
