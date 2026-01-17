using System.Buffers;
using System.Text;
using Microsoft.Extensions.ObjectPool;

namespace PDFBuilder.Engine.Pooling;

/// <summary>
/// Provides object pools for commonly used objects in PDF generation.
/// Uses Microsoft.Extensions.ObjectPool for efficient reuse of objects.
/// </summary>
public static class ObjectPools
{
    /// <summary>
    /// Pool for StringBuilder instances used in expression evaluation and text building.
    /// </summary>
    public static ObjectPool<StringBuilder> StringBuilderPool { get; } =
        new DefaultObjectPoolProvider().CreateStringBuilderPool(
            initialCapacity: 256,
            maximumRetainedCapacity: 4096
        );

    /// <summary>
    /// Pool for List&lt;string&gt; instances used in expression extraction.
    /// </summary>
    public static ObjectPool<List<string>> StringListPool { get; } =
        new DefaultObjectPoolProvider().Create(new StringListPooledObjectPolicy());

    /// <summary>
    /// Pool for Dictionary&lt;string, object?&gt; instances used in scope management.
    /// </summary>
    public static ObjectPool<Dictionary<string, object?>> DictionaryPool { get; } =
        new DefaultObjectPoolProvider().Create(new DictionaryPooledObjectPolicy());

    /// <summary>
    /// Pool for MemoryStream instances used in image processing.
    /// </summary>
    public static ObjectPool<MemoryStream> MemoryStreamPool { get; } =
        new DefaultObjectPoolProvider().Create(new MemoryStreamPooledObjectPolicy());
}

/// <summary>
/// Policy for pooling List&lt;string&gt; instances.
/// </summary>
internal sealed class StringListPooledObjectPolicy : PooledObjectPolicy<List<string>>
{
    public override List<string> Create() => new(capacity: 16);

    public override bool Return(List<string> obj)
    {
        if (obj.Capacity > 256)
        {
            // Don't return very large lists to the pool
            return false;
        }

        obj.Clear();
        return true;
    }
}

/// <summary>
/// Policy for pooling Dictionary&lt;string, object?&gt; instances.
/// </summary>
internal sealed class DictionaryPooledObjectPolicy : PooledObjectPolicy<Dictionary<string, object?>>
{
    public override Dictionary<string, object?> Create() =>
        new(capacity: 16, StringComparer.OrdinalIgnoreCase);

    public override bool Return(Dictionary<string, object?> obj)
    {
        if (obj.Count > 100)
        {
            // Don't return very large dictionaries to the pool
            return false;
        }

        obj.Clear();
        return true;
    }
}

/// <summary>
/// Policy for pooling MemoryStream instances.
/// </summary>
internal sealed class MemoryStreamPooledObjectPolicy : PooledObjectPolicy<MemoryStream>
{
    private const int MaxRetainedCapacity = 1024 * 1024; // 1 MB

    public override MemoryStream Create() => new(capacity: 4096);

    public override bool Return(MemoryStream obj)
    {
        if (obj.Capacity > MaxRetainedCapacity)
        {
            // Don't return very large streams to the pool
            return false;
        }

        obj.Position = 0;
        obj.SetLength(0);
        return true;
    }
}

/// <summary>
/// Helper class for using pooled objects with using statement.
/// </summary>
/// <typeparam name="T">The type of pooled object.</typeparam>
/// <remarks>
/// Initializes a new instance of the PooledObject struct.
/// </remarks>
/// <param name="pool">The object pool.</param>
public readonly struct PooledObject<T>(ObjectPool<T> pool) : IDisposable
    where T : class
{
    private readonly ObjectPool<T> _pool = pool;
    private readonly T _value = pool.Get();

    /// <summary>
    /// Gets the pooled value.
    /// </summary>
    public T Value => _value;

    /// <summary>
    /// Returns the object to the pool.
    /// </summary>
    public void Dispose()
    {
        _pool.Return(_value);
    }
}

/// <summary>
/// Extension methods for object pools.
/// </summary>
public static class ObjectPoolExtensions
{
    /// <summary>
    /// Gets a pooled object that will be returned when disposed.
    /// </summary>
    /// <typeparam name="T">The type of pooled object.</typeparam>
    /// <param name="pool">The object pool.</param>
    /// <returns>A disposable wrapper around the pooled object.</returns>
    public static PooledObject<T> GetPooled<T>(this ObjectPool<T> pool)
        where T : class
    {
        return new PooledObject<T>(pool);
    }
}

/// <summary>
/// Array pool wrapper for byte arrays used in image and PDF processing.
/// </summary>
public static class ByteArrayPool
{
    /// <summary>
    /// Rents a byte array of at least the specified length.
    /// </summary>
    /// <param name="minimumLength">The minimum required length.</param>
    /// <returns>A rented byte array.</returns>
    public static byte[] Rent(int minimumLength)
    {
        return ArrayPool<byte>.Shared.Rent(minimumLength);
    }

    /// <summary>
    /// Returns a rented byte array to the pool.
    /// </summary>
    /// <param name="array">The array to return.</param>
    /// <param name="clearArray">Whether to clear the array before returning.</param>
    public static void Return(byte[] array, bool clearArray = false)
    {
        ArrayPool<byte>.Shared.Return(array, clearArray);
    }

    /// <summary>
    /// Creates a pooled byte array wrapper that returns the array when disposed.
    /// </summary>
    /// <param name="minimumLength">The minimum required length.</param>
    /// <returns>A disposable wrapper around the rented array.</returns>
    public static PooledByteArray RentPooled(int minimumLength)
    {
        return new PooledByteArray(minimumLength);
    }
}

/// <summary>
/// Disposable wrapper for pooled byte arrays.
/// </summary>
/// <remarks>
/// Initializes a new instance of the PooledByteArray struct.
/// </remarks>
/// <param name="minimumLength">The minimum required length.</param>
public readonly struct PooledByteArray(int minimumLength) : IDisposable
{
    private readonly byte[] _array = ArrayPool<byte>.Shared.Rent(minimumLength);

    /// <summary>
    /// Gets the underlying array.
    /// </summary>
    public byte[] Array => _array;

    /// <summary>
    /// Gets the requested length (not the array's actual length).
    /// </summary>
    public int Length { get; } = minimumLength;

    /// <summary>
    /// Gets a span over the requested length.
    /// </summary>
    public Span<byte> Span => _array.AsSpan(0, Length);

    /// <summary>
    /// Gets a memory over the requested length.
    /// </summary>
    public Memory<byte> Memory => _array.AsMemory(0, Length);

    /// <summary>
    /// Returns the array to the pool.
    /// </summary>
    public void Dispose()
    {
        ArrayPool<byte>.Shared.Return(_array);
    }
}
