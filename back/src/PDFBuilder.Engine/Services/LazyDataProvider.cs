using System.Runtime.CompilerServices;

namespace PDFBuilder.Engine.Services;

/// <summary>
/// Provides lazy data loading support for large collections in tables.
/// Enables memory-efficient rendering of large datasets by loading data on demand.
/// </summary>
public interface ILazyDataProvider
{
    /// <summary>
    /// Gets the total count of items (may be estimated for very large datasets).
    /// </summary>
    /// <returns>The total count, or null if unknown.</returns>
    int? GetTotalCount();

    /// <summary>
    /// Gets items in batches for efficient processing.
    /// </summary>
    /// <param name="batchSize">The batch size.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>An async enumerable of batches.</returns>
    IAsyncEnumerable<IReadOnlyList<object>> GetBatchesAsync(
        int batchSize,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets a specific page of items.
    /// </summary>
    /// <param name="pageIndex">The zero-based page index.</param>
    /// <param name="pageSize">The page size.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A list of items for the page.</returns>
    Task<IReadOnlyList<object>> GetPageAsync(
        int pageIndex,
        int pageSize,
        CancellationToken cancellationToken = default
    );
}

/// <summary>
/// Default implementation of lazy data provider that wraps an enumerable.
/// </summary>
/// <typeparam name="T">The item type.</typeparam>
/// <remarks>
/// Initializes a new instance of the LazyDataProvider class.
/// </remarks>
/// <param name="source">The source enumerable.</param>
/// <param name="logger">The logger instance.</param>
public sealed class LazyDataProvider<T>(IEnumerable<T> source, ILogger<LazyDataProvider<T>> logger)
    : ILazyDataProvider
{
    private readonly IEnumerable<T> _source =
        source ?? throw new ArgumentNullException(nameof(source));
    private readonly int? _totalCount = source switch
    {
        ICollection<T> collection => collection.Count,
        IReadOnlyCollection<T> readOnlyCollection => readOnlyCollection.Count,
        _ => null,
    };
    private readonly ILogger<LazyDataProvider<T>> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Initializes a new instance with a known count.
    /// </summary>
    /// <param name="source">The source enumerable.</param>
    /// <param name="totalCount">The known total count.</param>
    /// <param name="logger">The logger instance.</param>
    public LazyDataProvider(
        IEnumerable<T> source,
        int totalCount,
        ILogger<LazyDataProvider<T>> logger
    )
        : this(source, logger)
    {
        _totalCount = totalCount;
    }

    /// <inheritdoc />
    public int? GetTotalCount() => _totalCount;

    /// <inheritdoc />
    public async IAsyncEnumerable<IReadOnlyList<object>> GetBatchesAsync(
        int batchSize,
        [EnumeratorCancellation] CancellationToken cancellationToken = default
    )
    {
        var batch = new List<object>(batchSize);

        foreach (var item in _source)
        {
            if (cancellationToken.IsCancellationRequested)
                yield break;

            batch.Add(item!);

            if (batch.Count >= batchSize)
            {
                _logger.LogTrace("Yielding batch of {Count} items", batch.Count);
                yield return batch.ToList();
                batch.Clear();

                // Allow other tasks to run
                await Task.Yield();
            }
        }

        if (batch.Count > 0)
        {
            _logger.LogTrace("Yielding final batch of {Count} items", batch.Count);
            yield return batch.ToList();
        }
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<object>> GetPageAsync(
        int pageIndex,
        int pageSize,
        CancellationToken cancellationToken = default
    )
    {
        var items = _source.Skip(pageIndex * pageSize).Take(pageSize).Cast<object>().ToList();

        return Task.FromResult<IReadOnlyList<object>>(items);
    }
}

/// <summary>
/// Async lazy data provider for sources that support async enumeration.
/// </summary>
/// <typeparam name="T">The item type.</typeparam>
/// <remarks>
/// Initializes a new instance of the AsyncLazyDataProvider class.
/// </remarks>
/// <param name="source">The async source enumerable.</param>
/// <param name="totalCount">The optional total count.</param>
/// <param name="logger">The logger instance.</param>
public sealed class AsyncLazyDataProvider<T>(
    IAsyncEnumerable<T> source,
    int? totalCount,
    ILogger<AsyncLazyDataProvider<T>> logger
) : ILazyDataProvider
{
    private readonly IAsyncEnumerable<T> _source =
        source ?? throw new ArgumentNullException(nameof(source));
    private readonly int? _totalCount = totalCount;
    private readonly ILogger<AsyncLazyDataProvider<T>> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <inheritdoc />
    public int? GetTotalCount() => _totalCount;

    /// <inheritdoc />
    public async IAsyncEnumerable<IReadOnlyList<object>> GetBatchesAsync(
        int batchSize,
        [EnumeratorCancellation] CancellationToken cancellationToken = default
    )
    {
        var batch = new List<object>(batchSize);

        await foreach (var item in _source.WithCancellation(cancellationToken))
        {
            batch.Add(item!);

            if (batch.Count >= batchSize)
            {
                _logger.LogTrace("Yielding async batch of {Count} items", batch.Count);
                yield return batch.ToList();
                batch.Clear();
            }
        }

        if (batch.Count > 0)
        {
            _logger.LogTrace("Yielding final async batch of {Count} items", batch.Count);
            yield return batch.ToList();
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<object>> GetPageAsync(
        int pageIndex,
        int pageSize,
        CancellationToken cancellationToken = default
    )
    {
        var items = new List<object>();
        var skipCount = pageIndex * pageSize;
        var currentIndex = 0;

        await foreach (var item in _source.WithCancellation(cancellationToken))
        {
            if (currentIndex >= skipCount)
            {
                items.Add(item!);
                if (items.Count >= pageSize)
                    break;
            }
            currentIndex++;
        }

        return items;
    }
}

/// <summary>
/// Options for lazy loading behavior.
/// </summary>
public sealed class LazyLoadingOptions
{
    /// <summary>
    /// Gets or sets the default batch size for lazy loading.
    /// Default: 100 items.
    /// </summary>
    public int DefaultBatchSize { get; set; } = 100;

    /// <summary>
    /// Gets or sets the threshold above which lazy loading is automatically enabled.
    /// Default: 1000 items.
    /// </summary>
    public int AutoEnableThreshold { get; set; } = 1000;

    /// <summary>
    /// Gets or sets whether to yield between batches for UI responsiveness.
    /// </summary>
    public bool YieldBetweenBatches { get; set; } = true;

    /// <summary>
    /// Gets or sets the maximum items to process before forcing a GC.
    /// Default: 10000 items.
    /// </summary>
    public int GCTriggerThreshold { get; set; } = 10000;
}

/// <summary>
/// Factory for creating lazy data providers.
/// </summary>
/// <remarks>
/// Initializes a new instance of the LazyDataProviderFactory class.
/// </remarks>
/// <param name="loggerFactory">The logger factory.</param>
/// <param name="options">Lazy loading options.</param>
public sealed class LazyDataProviderFactory(
    ILoggerFactory loggerFactory,
    LazyLoadingOptions? options = null
)
{
    private readonly ILoggerFactory _loggerFactory =
        loggerFactory ?? throw new ArgumentNullException(nameof(loggerFactory));
    private readonly LazyLoadingOptions _options = options ?? new LazyLoadingOptions();

    /// <summary>
    /// Creates a lazy data provider for an enumerable.
    /// </summary>
    /// <typeparam name="T">The item type.</typeparam>
    /// <param name="source">The source enumerable.</param>
    /// <returns>A lazy data provider.</returns>
    public ILazyDataProvider Create<T>(IEnumerable<T> source)
    {
        var logger = _loggerFactory.CreateLogger<LazyDataProvider<T>>();
        return new LazyDataProvider<T>(source, logger);
    }

    /// <summary>
    /// Creates a lazy data provider for an async enumerable.
    /// </summary>
    /// <typeparam name="T">The item type.</typeparam>
    /// <param name="source">The async source enumerable.</param>
    /// <param name="totalCount">Optional total count.</param>
    /// <returns>A lazy data provider.</returns>
    public ILazyDataProvider CreateAsync<T>(IAsyncEnumerable<T> source, int? totalCount = null)
    {
        var logger = _loggerFactory.CreateLogger<AsyncLazyDataProvider<T>>();
        return new AsyncLazyDataProvider<T>(source, totalCount, logger);
    }

    /// <summary>
    /// Determines if lazy loading should be used for a collection.
    /// </summary>
    /// <param name="count">The collection count.</param>
    /// <returns>True if lazy loading is recommended.</returns>
    public bool ShouldUseLazyLoading(int count)
    {
        return count >= _options.AutoEnableThreshold;
    }

    /// <summary>
    /// Gets the recommended batch size.
    /// </summary>
    /// <returns>The batch size.</returns>
    public int GetRecommendedBatchSize() => _options.DefaultBatchSize;
}
