using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.Engine.Factories;

/// <summary>
/// Factory interface for creating and resolving component renderers.
/// Provides abstraction over renderer resolution for better testability and DI.
/// </summary>
public interface IRendererFactory
{
    /// <summary>
    /// Gets a renderer for the specified component type.
    /// </summary>
    /// <param name="componentType">The component type to get a renderer for.</param>
    /// <returns>The renderer instance for the component type.</returns>
    /// <exception cref="Core.Exceptions.InvalidComponentException">
    /// Thrown when no renderer exists for the component type.
    /// </exception>
    IComponentRenderer GetRenderer(ComponentType componentType);

    /// <summary>
    /// Tries to get a renderer for the specified component type.
    /// </summary>
    /// <param name="componentType">The component type to get a renderer for.</param>
    /// <param name="renderer">The renderer if found; otherwise, null.</param>
    /// <returns>True if a renderer was found; otherwise, false.</returns>
    bool TryGetRenderer(ComponentType componentType, out IComponentRenderer? renderer);

    /// <summary>
    /// Checks if a renderer exists for the specified component type.
    /// </summary>
    /// <param name="componentType">The component type to check.</param>
    /// <returns>True if a renderer exists; otherwise, false.</returns>
    bool HasRenderer(ComponentType componentType);

    /// <summary>
    /// Validates that a renderer exists for the specified component type and logs metadata.
    /// </summary>
    /// <param name="componentType">The component type to validate.</param>
    /// <returns>True if a renderer exists; otherwise, false.</returns>
    bool ValidateRendererExists(ComponentType componentType);

    /// <summary>
    /// Gets the component registry for accessing component metadata.
    /// </summary>
    ComponentRegistry ComponentRegistry { get; }

    /// <summary>
    /// Registers a renderer type for a component type.
    /// </summary>
    /// <typeparam name="TRenderer">The renderer type to register.</typeparam>
    /// <param name="componentType">The component type to associate with the renderer.</param>
    void RegisterRenderer<TRenderer>(ComponentType componentType)
        where TRenderer : class, IComponentRenderer;

    /// <summary>
    /// Registers a renderer instance for a component type.
    /// </summary>
    /// <param name="componentType">The component type to associate with the renderer.</param>
    /// <param name="renderer">The renderer instance to register.</param>
    void RegisterRenderer(ComponentType componentType, IComponentRenderer renderer);

    /// <summary>
    /// Gets all registered renderers.
    /// </summary>
    /// <returns>A read-only dictionary of component types to renderers.</returns>
    IReadOnlyDictionary<ComponentType, IComponentRenderer> GetAllRenderers();

    /// <summary>
    /// Gets the count of registered renderers.
    /// </summary>
    int RendererCount { get; }

    /// <summary>
    /// Gets a list of component types that have registered renderers.
    /// </summary>
    /// <returns>An enumerable of component types with registered renderers.</returns>
    IEnumerable<ComponentType> GetSupportedComponentTypes();

    /// <summary>
    /// Gets a list of component types that do not have registered renderers.
    /// </summary>
    /// <returns>An enumerable of component types without registered renderers.</returns>
    IEnumerable<ComponentType> GetUnsupportedComponentTypes();
}
