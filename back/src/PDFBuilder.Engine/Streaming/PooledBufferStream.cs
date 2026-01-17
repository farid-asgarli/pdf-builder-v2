using System.Buffers;

namespace PDFBuilder.Engine.Streaming;

/// <summary>
/// A stream wrapper that uses pooled buffers for efficient streaming.
/// Reduces allocations when writing large amounts of data.
/// </summary>
/// <remarks>
/// Initializes a new instance of the PooledBufferStream class.
/// </remarks>
/// <param name="innerStream">The underlying stream to write to.</param>
/// <param name="bufferSize">The buffer size to use.</param>
public sealed class PooledBufferStream(Stream innerStream, int bufferSize = 65536) : Stream
{
    private readonly Stream _innerStream =
        innerStream ?? throw new ArgumentNullException(nameof(innerStream));
    private readonly int _bufferSize = bufferSize;
    private byte[] _buffer = ArrayPool<byte>.Shared.Rent(bufferSize);
    private int _bufferPosition = 0;
    private long _totalBytesWritten;
    private bool _disposed;

    /// <inheritdoc />
    public override bool CanRead => false;

    /// <inheritdoc />
    public override bool CanSeek => false;

    /// <inheritdoc />
    public override bool CanWrite => true;

    /// <inheritdoc />
    public override long Length => _totalBytesWritten + _bufferPosition;

    /// <inheritdoc />
    public override long Position
    {
        get => _totalBytesWritten + _bufferPosition;
        set => throw new NotSupportedException();
    }

    /// <summary>
    /// Gets the total bytes written to the underlying stream.
    /// </summary>
    public long TotalBytesWritten => _totalBytesWritten;

    /// <inheritdoc />
    public override void Write(byte[] buffer, int offset, int count)
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(PooledBufferStream));

        var bytesToWrite = count;
        var sourceOffset = offset;

        while (bytesToWrite > 0)
        {
            var spaceInBuffer = _bufferSize - _bufferPosition;
            var bytesToCopy = Math.Min(bytesToWrite, spaceInBuffer);

            Buffer.BlockCopy(buffer, sourceOffset, _buffer, _bufferPosition, bytesToCopy);
            _bufferPosition += bytesToCopy;
            sourceOffset += bytesToCopy;
            bytesToWrite -= bytesToCopy;

            if (_bufferPosition >= _bufferSize)
            {
                FlushBuffer();
            }
        }
    }

    /// <inheritdoc />
    public override void Write(ReadOnlySpan<byte> buffer)
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(PooledBufferStream));

        var bytesToWrite = buffer.Length;
        var sourceOffset = 0;

        while (bytesToWrite > 0)
        {
            var spaceInBuffer = _bufferSize - _bufferPosition;
            var bytesToCopy = Math.Min(bytesToWrite, spaceInBuffer);

            buffer.Slice(sourceOffset, bytesToCopy).CopyTo(_buffer.AsSpan(_bufferPosition));
            _bufferPosition += bytesToCopy;
            sourceOffset += bytesToCopy;
            bytesToWrite -= bytesToCopy;

            if (_bufferPosition >= _bufferSize)
            {
                FlushBuffer();
            }
        }
    }

    /// <inheritdoc />
    public override async Task WriteAsync(
        byte[] buffer,
        int offset,
        int count,
        CancellationToken cancellationToken
    )
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(PooledBufferStream));

        var bytesToWrite = count;
        var sourceOffset = offset;

        while (bytesToWrite > 0)
        {
            var spaceInBuffer = _bufferSize - _bufferPosition;
            var bytesToCopy = Math.Min(bytesToWrite, spaceInBuffer);

            Buffer.BlockCopy(buffer, sourceOffset, _buffer, _bufferPosition, bytesToCopy);
            _bufferPosition += bytesToCopy;
            sourceOffset += bytesToCopy;
            bytesToWrite -= bytesToCopy;

            if (_bufferPosition >= _bufferSize)
            {
                await FlushBufferAsync(cancellationToken);
            }
        }
    }

    /// <inheritdoc />
    public override async ValueTask WriteAsync(
        ReadOnlyMemory<byte> buffer,
        CancellationToken cancellationToken = default
    )
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(PooledBufferStream));

        var bytesToWrite = buffer.Length;
        var sourceOffset = 0;

        while (bytesToWrite > 0)
        {
            var spaceInBuffer = _bufferSize - _bufferPosition;
            var bytesToCopy = Math.Min(bytesToWrite, spaceInBuffer);

            buffer.Span.Slice(sourceOffset, bytesToCopy).CopyTo(_buffer.AsSpan(_bufferPosition));
            _bufferPosition += bytesToCopy;
            sourceOffset += bytesToCopy;
            bytesToWrite -= bytesToCopy;

            if (_bufferPosition >= _bufferSize)
            {
                await FlushBufferAsync(cancellationToken);
            }
        }
    }

    /// <inheritdoc />
    public override void Flush()
    {
        FlushBuffer();
        _innerStream.Flush();
    }

    /// <inheritdoc />
    public override async Task FlushAsync(CancellationToken cancellationToken)
    {
        await FlushBufferAsync(cancellationToken);
        await _innerStream.FlushAsync(cancellationToken);
    }

    private void FlushBuffer()
    {
        if (_bufferPosition > 0)
        {
            _innerStream.Write(_buffer, 0, _bufferPosition);
            _totalBytesWritten += _bufferPosition;
            _bufferPosition = 0;
        }
    }

    private async Task FlushBufferAsync(CancellationToken cancellationToken)
    {
        if (_bufferPosition > 0)
        {
            await _innerStream.WriteAsync(_buffer.AsMemory(0, _bufferPosition), cancellationToken);
            _totalBytesWritten += _bufferPosition;
            _bufferPosition = 0;
        }
    }

    /// <inheritdoc />
    public override int Read(byte[] buffer, int offset, int count)
    {
        throw new NotSupportedException();
    }

    /// <inheritdoc />
    public override long Seek(long offset, SeekOrigin origin)
    {
        throw new NotSupportedException();
    }

    /// <inheritdoc />
    public override void SetLength(long value)
    {
        throw new NotSupportedException();
    }

    /// <inheritdoc />
    protected override void Dispose(bool disposing)
    {
        if (_disposed)
            return;

        if (disposing)
        {
            // Flush any remaining data
            FlushBuffer();

            // Return the buffer to the pool
            ArrayPool<byte>.Shared.Return(_buffer);
            _buffer = null!;
        }

        _disposed = true;
        base.Dispose(disposing);
    }

    /// <inheritdoc />
    public override async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        await FlushBufferAsync(CancellationToken.None);

        ArrayPool<byte>.Shared.Return(_buffer);
        _buffer = null!;
        _disposed = true;

        await base.DisposeAsync();
    }
}
