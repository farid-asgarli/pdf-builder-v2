using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Base;

/// <summary>
/// Internal renderer interface for the Engine layer.
/// Extends IComponentRenderer with additional engine-specific capabilities.
/// This interface is used for type-safe renderer discovery and registration.
/// </summary>
public interface IRenderer : IComponentRenderer
{
    /// <summary>
    /// Gets the unique identifier for this renderer.
    /// Used for logging, debugging, and error messages.
    /// </summary>
    string RendererName { get; }

    /// <summary>
    /// Gets the category of this renderer for organizational purposes.
    /// </summary>
    RendererCategory Category { get; }

    /// <summary>
    /// Gets a value indicating whether this renderer requires expression evaluation.
    /// When true, properties will be evaluated for {{ expression }} syntax.
    /// </summary>
    bool RequiresExpressionEvaluation { get; }

    /// <summary>
    /// Gets a value indicating whether this renderer inherits styles from parent.
    /// </summary>
    bool InheritsStyle { get; }

    /// <summary>
    /// Renders the component with additional context information for error handling.
    /// </summary>
    /// <param name="container">The QuestPDF container to render into.</param>
    /// <param name="node">The layout node containing component configuration.</param>
    /// <param name="context">The render context with data and state.</param>
    /// <param name="layoutEngine">The layout engine for rendering children.</param>
    /// <param name="nodePath">The path to the current node in the layout tree.</param>
    void RenderWithContext(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        string nodePath
    );

    /// <summary>
    /// Gets the list of required property names for this renderer.
    /// </summary>
    /// <returns>A collection of required property names.</returns>
    IEnumerable<string> GetRequiredProperties();

    /// <summary>
    /// Gets the list of optional property names with their default values.
    /// </summary>
    /// <returns>A dictionary of optional property names and their default values.</returns>
    IReadOnlyDictionary<string, object?> GetOptionalProperties();
}

/// <summary>
/// Categories for organizing renderers by functionality.
/// </summary>
public enum RendererCategory
{
    /// <summary>
    /// Container components that hold multiple children (Column, Row, Table).
    /// </summary>
    Container,

    /// <summary>
    /// Content components that display data (Text, Image, Line).
    /// </summary>
    Content,

    /// <summary>
    /// Styling components that modify appearance (Padding, Border, Background).
    /// </summary>
    Styling,

    /// <summary>
    /// Sizing components that control dimensions (Width, Height, Alignment).
    /// </summary>
    Sizing,

    /// <summary>
    /// Transformation components that modify position/scale (Rotate, Scale, Translate).
    /// </summary>
    Transformation,

    /// <summary>
    /// Flow control components that affect pagination (PageBreak, EnsureSpace).
    /// </summary>
    FlowControl,

    /// <summary>
    /// Special components with unique behavior.
    /// </summary>
    Special,
}
