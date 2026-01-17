using PDFBuilder.Core.Domain;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Core.Interfaces;

/// <summary>
/// Contract for component renderers that convert layout nodes to QuestPDF elements.
/// Each component type has a corresponding renderer implementation.
/// </summary>
public interface IComponentRenderer
{
    /// <summary>
    /// Gets the component type this renderer handles.
    /// </summary>
    ComponentType ComponentType { get; }

    /// <summary>
    /// Gets a value indicating whether this renderer supports child nodes.
    /// Container components return true, leaf components return false.
    /// </summary>
    bool SupportsChildren { get; }

    /// <summary>
    /// Gets a value indicating whether this renderer wraps a single child.
    /// Wrapper components (styling, sizing, transformation) return true.
    /// </summary>
    bool IsWrapper { get; }

    /// <summary>
    /// Renders the component to the given QuestPDF container.
    /// </summary>
    /// <param name="container">The QuestPDF container to render into.</param>
    /// <param name="node">The layout node containing component configuration.</param>
    /// <param name="context">The render context with data and state.</param>
    /// <param name="layoutEngine">The layout engine for rendering children.</param>
    void Render(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine
    );

    /// <summary>
    /// Validates the component-specific properties of a layout node.
    /// </summary>
    /// <param name="node">The layout node to validate.</param>
    /// <returns>A collection of validation errors, empty if valid.</returns>
    IEnumerable<ComponentValidationError> ValidateProperties(LayoutNode node);
}

/// <summary>
/// Represents a component-specific validation error.
/// </summary>
public class ComponentValidationError
{
    /// <summary>
    /// Gets or sets the name of the property that caused the error.
    /// </summary>
    public string PropertyName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the error message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the expected value or format.
    /// </summary>
    public string? ExpectedFormat { get; set; }

    /// <summary>
    /// Gets or sets the actual value that caused the error.
    /// </summary>
    public string? ActualValue { get; set; }

    /// <summary>
    /// Gets or sets the error severity.
    /// </summary>
    public ValidationSeverity Severity { get; set; } = ValidationSeverity.Error;
}

/// <summary>
/// Severity levels for validation issues.
/// </summary>
public enum ValidationSeverity
{
    /// <summary>
    /// Informational message, does not affect rendering.
    /// </summary>
    Info,

    /// <summary>
    /// Warning that may cause unexpected behavior.
    /// </summary>
    Warning,

    /// <summary>
    /// Error that will prevent proper rendering.
    /// </summary>
    Error,
}
