using System.Diagnostics;

namespace PDFBuilder.Engine.Diagnostics;

/// <summary>
/// Provides memory usage tracking and diagnostics.
/// Useful for profiling PDF generation memory consumption.
/// </summary>
public sealed class MemoryTracker
{
    private readonly ILogger<MemoryTracker> _logger;
    private readonly bool _isEnabled;
    private long _initialMemory;
    private long _peakMemory;

    /// <summary>
    /// Initializes a new instance of the MemoryTracker class.
    /// </summary>
    /// <param name="logger">The logger instance.</param>
    /// <param name="isEnabled">Whether tracking is enabled.</param>
    public MemoryTracker(ILogger<MemoryTracker> logger, bool isEnabled = true)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _isEnabled = isEnabled;

        if (_isEnabled)
        {
            _initialMemory = GetCurrentMemory();
            _peakMemory = _initialMemory;
        }
    }

    /// <summary>
    /// Gets whether tracking is enabled.
    /// </summary>
    public bool IsEnabled => _isEnabled;

    /// <summary>
    /// Gets the initial memory usage when tracking started.
    /// </summary>
    public long InitialMemoryBytes => _initialMemory;

    /// <summary>
    /// Gets the current memory usage.
    /// </summary>
    public long CurrentMemoryBytes => GetCurrentMemory();

    /// <summary>
    /// Gets the peak memory usage observed.
    /// </summary>
    public long PeakMemoryBytes => _peakMemory;

    /// <summary>
    /// Gets the memory delta from start.
    /// </summary>
    public long MemoryDeltaBytes => CurrentMemoryBytes - _initialMemory;

    /// <summary>
    /// Samples the current memory and updates peak if necessary.
    /// </summary>
    public void Sample()
    {
        if (!_isEnabled)
            return;

        var current = GetCurrentMemory();
        if (current > _peakMemory)
        {
            Interlocked.Exchange(ref _peakMemory, current);
        }
    }

    /// <summary>
    /// Forces a garbage collection and updates memory tracking.
    /// Use sparingly as GC.Collect can impact performance.
    /// </summary>
    public void ForceGarbageCollection()
    {
        if (!_isEnabled)
            return;

        var before = GetCurrentMemory();

        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();

        var after = GetCurrentMemory();

        _logger.LogDebug(
            "Forced GC: Before={BeforeMB:F2}MB, After={AfterMB:F2}MB, Freed={FreedMB:F2}MB",
            before / (1024.0 * 1024.0),
            after / (1024.0 * 1024.0),
            (before - after) / (1024.0 * 1024.0)
        );
    }

    /// <summary>
    /// Gets a memory usage snapshot.
    /// </summary>
    /// <returns>A memory snapshot.</returns>
    public MemorySnapshot GetSnapshot()
    {
        Sample();

        var process = Process.GetCurrentProcess();

        return new MemorySnapshot
        {
            TakenAt = DateTime.UtcNow,
            ManagedMemoryBytes = GetCurrentMemory(),
            WorkingSetBytes = process.WorkingSet64,
            PrivateMemoryBytes = process.PrivateMemorySize64,
            VirtualMemoryBytes = process.VirtualMemorySize64,
            PeakWorkingSetBytes = process.PeakWorkingSet64,
            InitialManagedMemoryBytes = _initialMemory,
            PeakManagedMemoryBytes = _peakMemory,
            Gen0Collections = GC.CollectionCount(0),
            Gen1Collections = GC.CollectionCount(1),
            Gen2Collections = GC.CollectionCount(2),
        };
    }

    /// <summary>
    /// Logs the current memory status.
    /// </summary>
    public void LogMemoryStatus()
    {
        if (!_isEnabled)
            return;

        var snapshot = GetSnapshot();

        _logger.LogInformation(
            "Memory Status - Managed: {ManagedMB:F2}MB (Peak: {PeakMB:F2}MB), "
                + "Working Set: {WsMB:F2}MB, Delta: {DeltaMB:F2}MB, "
                + "GC: Gen0={Gen0}, Gen1={Gen1}, Gen2={Gen2}",
            snapshot.ManagedMemoryBytes / (1024.0 * 1024.0),
            snapshot.PeakManagedMemoryBytes / (1024.0 * 1024.0),
            snapshot.WorkingSetBytes / (1024.0 * 1024.0),
            (snapshot.ManagedMemoryBytes - snapshot.InitialManagedMemoryBytes) / (1024.0 * 1024.0),
            snapshot.Gen0Collections,
            snapshot.Gen1Collections,
            snapshot.Gen2Collections
        );
    }

    /// <summary>
    /// Resets the tracking to current state.
    /// </summary>
    public void Reset()
    {
        if (!_isEnabled)
            return;

        _initialMemory = GetCurrentMemory();
        _peakMemory = _initialMemory;
    }

    private static long GetCurrentMemory()
    {
        return GC.GetTotalMemory(forceFullCollection: false);
    }
}

/// <summary>
/// Represents a snapshot of memory usage at a point in time.
/// </summary>
public sealed class MemorySnapshot
{
    /// <summary>
    /// Gets or sets when this snapshot was taken.
    /// </summary>
    public DateTime TakenAt { get; init; }

    /// <summary>
    /// Gets or sets the managed memory usage (from GC).
    /// </summary>
    public long ManagedMemoryBytes { get; init; }

    /// <summary>
    /// Gets or sets the process working set.
    /// </summary>
    public long WorkingSetBytes { get; init; }

    /// <summary>
    /// Gets or sets the private memory size.
    /// </summary>
    public long PrivateMemoryBytes { get; init; }

    /// <summary>
    /// Gets or sets the virtual memory size.
    /// </summary>
    public long VirtualMemoryBytes { get; init; }

    /// <summary>
    /// Gets or sets the peak working set.
    /// </summary>
    public long PeakWorkingSetBytes { get; init; }

    /// <summary>
    /// Gets or sets the initial managed memory when tracking started.
    /// </summary>
    public long InitialManagedMemoryBytes { get; init; }

    /// <summary>
    /// Gets or sets the peak managed memory observed.
    /// </summary>
    public long PeakManagedMemoryBytes { get; init; }

    /// <summary>
    /// Gets or sets the Gen0 collection count.
    /// </summary>
    public int Gen0Collections { get; init; }

    /// <summary>
    /// Gets or sets the Gen1 collection count.
    /// </summary>
    public int Gen1Collections { get; init; }

    /// <summary>
    /// Gets or sets the Gen2 collection count.
    /// </summary>
    public int Gen2Collections { get; init; }

    /// <summary>
    /// Gets the memory delta from initial.
    /// </summary>
    public long DeltaBytes => ManagedMemoryBytes - InitialManagedMemoryBytes;

    /// <summary>
    /// Converts to a human-readable string.
    /// </summary>
    public override string ToString()
    {
        return $"Memory: {ManagedMemoryBytes / (1024.0 * 1024.0):F2}MB "
            + $"(Peak: {PeakManagedMemoryBytes / (1024.0 * 1024.0):F2}MB, "
            + $"Delta: {DeltaBytes / (1024.0 * 1024.0):F2}MB), "
            + $"Working Set: {WorkingSetBytes / (1024.0 * 1024.0):F2}MB, "
            + $"GC: Gen0={Gen0Collections}, Gen1={Gen1Collections}, Gen2={Gen2Collections}";
    }
}
