using PDFBuilder.Core.Domain;

namespace PDFBuilder.Core.Exceptions;

/// <summary>
/// Exception thrown when an invalid or unsupported component type is encountered.
/// </summary>
public class InvalidComponentException : PdfBuilderException
{
    /// <inheritdoc />
    public override string ErrorCode => "INVALID_COMPONENT";

    /// <summary>
    /// Gets the invalid component type.
    /// </summary>
    public ComponentType? ComponentType { get; }

    /// <summary>
    /// Gets the component type name as a string (for unknown types).
    /// </summary>
    public string? ComponentTypeName { get; }

    /// <summary>
    /// Gets the node ID where the error occurred.
    /// </summary>
    public string? NodeId { get; }

    /// <summary>
    /// Gets the path to the node in the layout tree.
    /// </summary>
    public string? NodePath { get; }

    /// <summary>
    /// Initializes a new instance of the InvalidComponentException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public InvalidComponentException(string message)
        : base(message) { }

    /// <summary>
    /// Initializes a new instance of the InvalidComponentException class.
    /// </summary>
    /// <param name="componentType">The invalid component type.</param>
    public InvalidComponentException(ComponentType componentType)
        : base($"No renderer found for component type '{componentType}'.")
    {
        ComponentType = componentType;
    }

    /// <summary>
    /// Initializes a new instance of the InvalidComponentException class.
    /// </summary>
    /// <param name="componentTypeName">The invalid component type name.</param>
    /// <param name="isTypeName">Indicator that this is a type name lookup (used for overload resolution).</param>
#pragma warning disable IDE0060 // Remove unused parameter - isTypeName is used for overload resolution
    public InvalidComponentException(string componentTypeName, bool isTypeName)
        : base($"Unknown component type '{componentTypeName}'.")
#pragma warning restore IDE0060
    {
        ComponentTypeName = componentTypeName;
    }

    /// <summary>
    /// Initializes a new instance of the InvalidComponentException class.
    /// </summary>
    /// <param name="componentType">The invalid component type.</param>
    /// <param name="nodeId">The node ID where the error occurred.</param>
    /// <param name="nodePath">The path to the node.</param>
    public InvalidComponentException(ComponentType componentType, string? nodeId, string? nodePath)
        : base($"No renderer found for component type '{componentType}' at path '{nodePath}'.")
    {
        ComponentType = componentType;
        NodeId = nodeId;
        NodePath = nodePath;
    }

    /// <summary>
    /// Initializes a new instance of the InvalidComponentException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="innerException">The inner exception.</param>
    public InvalidComponentException(string message, Exception innerException)
        : base(message, innerException) { }
}
