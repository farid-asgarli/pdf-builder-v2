using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Exceptions;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Core.Interfaces;

/// <summary>
/// Contract for the layout engine that orchestrates PDF layout rendering.
/// The layout engine is responsible for traversing the layout tree and
/// delegating rendering to appropriate component renderers.
/// </summary>
public interface ILayoutEngine
{
    /// <summary>
    /// Renders a layout node and its children to the given QuestPDF container.
    /// </summary>
    /// <param name="container">The QuestPDF container to render into.</param>
    /// <param name="node">The layout node to render.</param>
    /// <param name="context">The render context containing data and state.</param>
    void Render(IContainer container, LayoutNode node, RenderContext context);

    /// <summary>
    /// Renders a collection of layout nodes to the given QuestPDF container.
    /// </summary>
    /// <param name="container">The QuestPDF container to render into.</param>
    /// <param name="nodes">The collection of layout nodes to render.</param>
    /// <param name="context">The render context containing data and state.</param>
    void RenderChildren(IContainer container, IEnumerable<LayoutNode> nodes, RenderContext context);

    /// <summary>
    /// Validates a layout node structure before rendering.
    /// </summary>
    /// <param name="node">The layout node to validate.</param>
    /// <returns>A validation result indicating success or failure with details.</returns>
    LayoutValidationResult ValidateLayout(LayoutNode node);

    /// <summary>
    /// Gets the component renderer for a specific component type.
    /// </summary>
    /// <param name="componentType">The type of component.</param>
    /// <returns>The renderer for the component type.</returns>
    /// <exception cref="InvalidComponentException">Thrown when no renderer exists for the component type.</exception>
    IComponentRenderer GetRenderer(ComponentType componentType);

    /// <summary>
    /// Checks if a renderer exists for the specified component type.
    /// </summary>
    /// <param name="componentType">The type of component.</param>
    /// <returns>True if a renderer exists; otherwise, false.</returns>
    bool HasRenderer(ComponentType componentType);
}

/// <summary>
/// Represents the result of a layout validation operation.
/// </summary>
public class LayoutValidationResult
{
    /// <summary>
    /// Gets or sets a value indicating whether the layout is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Gets the collection of validation errors.
    /// </summary>
    public List<LayoutValidationError> Errors { get; init; } = [];

    /// <summary>
    /// Gets the collection of validation warnings.
    /// </summary>
    public List<LayoutValidationWarning> Warnings { get; init; } = [];

    /// <summary>
    /// Creates a successful validation result.
    /// </summary>
    /// <returns>A valid result with no errors.</returns>
    public static LayoutValidationResult Success() => new() { IsValid = true };

    /// <summary>
    /// Creates a failed validation result with errors.
    /// </summary>
    /// <param name="errors">The validation errors.</param>
    /// <returns>An invalid result with the specified errors.</returns>
    public static LayoutValidationResult Failure(params LayoutValidationError[] errors) =>
        new() { IsValid = false, Errors = [.. errors] };

    /// <summary>
    /// Adds an error to the validation result.
    /// </summary>
    /// <param name="error">The error to add.</param>
    public void AddError(LayoutValidationError error)
    {
        Errors.Add(error);
        IsValid = false;
    }

    /// <summary>
    /// Adds a warning to the validation result.
    /// </summary>
    /// <param name="warning">The warning to add.</param>
    public void AddWarning(LayoutValidationWarning warning)
    {
        Warnings.Add(warning);
    }
}

/// <summary>
/// Represents a validation error for a layout node.
/// </summary>
public class LayoutValidationError
{
    /// <summary>
    /// Gets or sets the node ID where the error occurred.
    /// </summary>
    public string? NodeId { get; set; }

    /// <summary>
    /// Gets or sets the path to the node in the layout tree (e.g., "root.children[0].child").
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the error message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the error code for programmatic handling.
    /// </summary>
    public string ErrorCode { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the property name that caused the error, if applicable.
    /// </summary>
    public string? PropertyName { get; set; }
}

/// <summary>
/// Represents a validation warning for a layout node.
/// </summary>
public class LayoutValidationWarning
{
    /// <summary>
    /// Gets or sets the node ID where the warning occurred.
    /// </summary>
    public string? NodeId { get; set; }

    /// <summary>
    /// Gets or sets the path to the node in the layout tree.
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the warning message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the warning code for programmatic handling.
    /// </summary>
    public string WarningCode { get; set; } = string.Empty;
}
