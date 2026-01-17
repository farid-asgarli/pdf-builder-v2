namespace PDFBuilder.Core.Exceptions;

/// <summary>
/// Base exception for all PDF Builder exceptions.
/// </summary>
public abstract class PdfBuilderException : Exception
{
    /// <summary>
    /// Gets the error code for this exception.
    /// </summary>
    public abstract string ErrorCode { get; }

    /// <summary>
    /// Initializes a new instance of the PdfBuilderException class.
    /// </summary>
    protected PdfBuilderException() { }

    /// <summary>
    /// Initializes a new instance of the PdfBuilderException class with a message.
    /// </summary>
    /// <param name="message">The error message.</param>
    protected PdfBuilderException(string message)
        : base(message) { }

    /// <summary>
    /// Initializes a new instance of the PdfBuilderException class with a message and inner exception.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="innerException">The inner exception.</param>
    protected PdfBuilderException(string message, Exception innerException)
        : base(message, innerException) { }
}

/// <summary>
/// Exception thrown when layout rendering fails.
/// </summary>
public class LayoutRenderException : PdfBuilderException
{
    /// <inheritdoc />
    public override string ErrorCode => "LAYOUT_RENDER_ERROR";

    /// <summary>
    /// Gets the node ID where the error occurred.
    /// </summary>
    public string? NodeId { get; }

    /// <summary>
    /// Gets the path to the node in the layout tree.
    /// </summary>
    public string? NodePath { get; }

    /// <summary>
    /// Gets the component type that failed to render.
    /// </summary>
    public string? ComponentType { get; }

    /// <summary>
    /// Initializes a new instance of the LayoutRenderException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public LayoutRenderException(string message)
        : base(message) { }

    /// <summary>
    /// Initializes a new instance of the LayoutRenderException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="nodeId">The node ID where the error occurred.</param>
    /// <param name="nodePath">The path to the node.</param>
    /// <param name="componentType">The component type.</param>
    public LayoutRenderException(
        string message,
        string? nodeId,
        string? nodePath,
        string? componentType
    )
        : base(message)
    {
        NodeId = nodeId;
        NodePath = nodePath;
        ComponentType = componentType;
    }

    /// <summary>
    /// Initializes a new instance of the LayoutRenderException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="innerException">The inner exception.</param>
    public LayoutRenderException(string message, Exception innerException)
        : base(message, innerException) { }

    /// <summary>
    /// Initializes a new instance of the LayoutRenderException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="nodeId">The node ID where the error occurred.</param>
    /// <param name="nodePath">The path to the node.</param>
    /// <param name="componentType">The component type.</param>
    /// <param name="innerException">The inner exception.</param>
    public LayoutRenderException(
        string message,
        string? nodeId,
        string? nodePath,
        string? componentType,
        Exception innerException
    )
        : base(message, innerException)
    {
        NodeId = nodeId;
        NodePath = nodePath;
        ComponentType = componentType;
    }
}
