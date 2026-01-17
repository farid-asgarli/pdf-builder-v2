using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Exceptions;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.Engine.Factories;

/// <summary>
/// Factory for creating and resolving component renderers.
/// Uses dependency injection to resolve renderer instances by component type.
/// Implements thread-safe caching and graceful handling of unknown components.
/// </summary>
public sealed class RendererFactory : IRendererFactory, IDisposable
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ComponentRegistry _componentRegistry;
    private readonly ILogger<RendererFactory> _logger;
    private readonly Dictionary<ComponentType, Type> _rendererTypeMap;
    private readonly Dictionary<ComponentType, IComponentRenderer> _rendererCache;
    private readonly ReaderWriterLockSlim _cacheLock = new(LockRecursionPolicy.SupportsRecursion);

    /// <summary>
    /// Initializes a new instance of the RendererFactory class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for DI resolution.</param>
    /// <param name="componentRegistry">The component registry for metadata.</param>
    /// <param name="logger">The logger instance.</param>
    public RendererFactory(
        IServiceProvider serviceProvider,
        ComponentRegistry componentRegistry,
        ILogger<RendererFactory> logger
    )
    {
        _serviceProvider =
            serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _componentRegistry =
            componentRegistry ?? throw new ArgumentNullException(nameof(componentRegistry));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _rendererTypeMap = new Dictionary<ComponentType, Type>();
        _rendererCache = new Dictionary<ComponentType, IComponentRenderer>();

        DiscoverRenderers();
    }

    /// <summary>
    /// Gets a renderer for the specified component type.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>The renderer instance.</returns>
    /// <exception cref="InvalidComponentException">Thrown when no renderer exists for the component type.</exception>
    public IComponentRenderer GetRenderer(ComponentType componentType)
    {
        _cacheLock.EnterUpgradeableReadLock();
        try
        {
            // Check cache first (read lock)
            if (_rendererCache.TryGetValue(componentType, out var cachedRenderer))
            {
                return cachedRenderer;
            }

            _cacheLock.EnterWriteLock();
            try
            {
                // Double-check after acquiring write lock
                if (_rendererCache.TryGetValue(componentType, out cachedRenderer))
                {
                    return cachedRenderer;
                }

                // Try to resolve from registered type map
                if (_rendererTypeMap.TryGetValue(componentType, out var rendererType))
                {
                    var renderer = ResolveRenderer(rendererType, componentType);
                    _rendererCache[componentType] = renderer;
                    return renderer;
                }

                // Try to resolve from DI container
                var resolvedRenderer = TryResolveFromContainer(componentType);
                if (resolvedRenderer is not null)
                {
                    _rendererCache[componentType] = resolvedRenderer;
                    return resolvedRenderer;
                }

                // Log and throw for unknown component types
                LogUnknownComponentType(componentType);
                throw new InvalidComponentException(componentType);
            }
            finally
            {
                _cacheLock.ExitWriteLock();
            }
        }
        finally
        {
            _cacheLock.ExitUpgradeableReadLock();
        }
    }

    /// <inheritdoc />
    public bool TryGetRenderer(ComponentType componentType, out IComponentRenderer? renderer)
    {
        try
        {
            renderer = GetRenderer(componentType);
            return true;
        }
        catch (InvalidComponentException)
        {
            renderer = null;
            return false;
        }
    }

    /// <summary>
    /// Checks if a renderer exists for the specified component type.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>True if a renderer exists; otherwise, false.</returns>
    public bool HasRenderer(ComponentType componentType)
    {
        _cacheLock.EnterReadLock();
        try
        {
            if (
                _rendererCache.ContainsKey(componentType)
                || _rendererTypeMap.ContainsKey(componentType)
            )
            {
                return true;
            }
        }
        finally
        {
            _cacheLock.ExitReadLock();
        }

        // Try to resolve from container (outside lock to avoid deadlock)
        return TryResolveFromContainer(componentType) is not null;
    }

    /// <summary>
    /// Registers a renderer type for a component type.
    /// </summary>
    /// <typeparam name="TRenderer">The renderer type.</typeparam>
    /// <param name="componentType">The component type.</param>
    public void RegisterRenderer<TRenderer>(ComponentType componentType)
        where TRenderer : class, IComponentRenderer
    {
        _cacheLock.EnterWriteLock();
        try
        {
            _rendererTypeMap[componentType] = typeof(TRenderer);
            _rendererCache.Remove(componentType); // Invalidate cache

            _logger.LogDebug(
                "Registered renderer {RendererType} for component type {ComponentType}",
                typeof(TRenderer).Name,
                componentType
            );
        }
        finally
        {
            _cacheLock.ExitWriteLock();
        }
    }

    /// <summary>
    /// Registers a renderer instance for a component type.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <param name="renderer">The renderer instance.</param>
    public void RegisterRenderer(ComponentType componentType, IComponentRenderer renderer)
    {
        ArgumentNullException.ThrowIfNull(renderer);

        _cacheLock.EnterWriteLock();
        try
        {
            _rendererCache[componentType] = renderer;
            _rendererTypeMap.Remove(componentType);

            _logger.LogDebug(
                "Registered renderer instance for component type {ComponentType}",
                componentType
            );
        }
        finally
        {
            _cacheLock.ExitWriteLock();
        }
    }

    /// <summary>
    /// Gets all registered renderers.
    /// </summary>
    /// <returns>A dictionary of component type to renderer.</returns>
    public IReadOnlyDictionary<ComponentType, IComponentRenderer> GetAllRenderers()
    {
        _cacheLock.EnterWriteLock();
        try
        {
            // Ensure all mapped types are resolved
            foreach (var (componentType, rendererType) in _rendererTypeMap)
            {
                if (!_rendererCache.ContainsKey(componentType))
                {
                    try
                    {
                        var renderer = ResolveRenderer(rendererType, componentType);
                        _rendererCache[componentType] = renderer;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(
                            ex,
                            "Failed to resolve renderer for component type {ComponentType}",
                            componentType
                        );
                    }
                }
            }

            return new Dictionary<ComponentType, IComponentRenderer>(_rendererCache);
        }
        finally
        {
            _cacheLock.ExitWriteLock();
        }
    }

    /// <summary>
    /// Gets the count of registered renderers.
    /// </summary>
    public int RendererCount
    {
        get
        {
            _cacheLock.EnterReadLock();
            try
            {
                return _rendererTypeMap.Count
                    + _rendererCache.Count(kvp => !_rendererTypeMap.ContainsKey(kvp.Key));
            }
            finally
            {
                _cacheLock.ExitReadLock();
            }
        }
    }

    /// <inheritdoc />
    public IEnumerable<ComponentType> GetSupportedComponentTypes()
    {
        _cacheLock.EnterReadLock();
        try
        {
            var types = new HashSet<ComponentType>(_rendererTypeMap.Keys);
            types.UnionWith(_rendererCache.Keys);
            return types;
        }
        finally
        {
            _cacheLock.ExitReadLock();
        }
    }

    /// <inheritdoc />
    public IEnumerable<ComponentType> GetUnsupportedComponentTypes()
    {
        var allComponentTypes = Enum.GetValues<ComponentType>();
        var supportedTypes = GetSupportedComponentTypes().ToHashSet();

        return allComponentTypes.Where(ct => !supportedTypes.Contains(ct));
    }

    /// <summary>
    /// Discovers renderers registered in the DI container.
    /// </summary>
    private void DiscoverRenderers()
    {
        try
        {
            // Try to get all IComponentRenderer implementations from DI
            var renderers = _serviceProvider.GetServices<IComponentRenderer>();

            foreach (var renderer in renderers)
            {
                _rendererCache[renderer.ComponentType] = renderer;
                _logger.LogTrace(
                    "Discovered renderer {RendererType} for component type {ComponentType}",
                    renderer.GetType().Name,
                    renderer.ComponentType
                );
            }

            _logger.LogInformation(
                "Discovered {Count} renderers from DI container",
                _rendererCache.Count
            );
        }
        catch (Exception ex)
        {
            _logger.LogDebug(
                ex,
                "No pre-registered renderers found in DI container (this is normal during startup)"
            );
        }
    }

    /// <summary>
    /// Resolves a renderer from its type.
    /// </summary>
    private IComponentRenderer ResolveRenderer(Type rendererType, ComponentType componentType)
    {
        try
        {
            var renderer = _serviceProvider.GetService(rendererType) as IComponentRenderer;

            if (renderer is null)
            {
                // Try to create using ActivatorUtilities
                renderer =
                    ActivatorUtilities.CreateInstance(_serviceProvider, rendererType)
                    as IComponentRenderer;
            }

            if (renderer is null)
            {
                throw new InvalidComponentException(
                    $"Failed to resolve renderer of type '{rendererType.Name}' for component '{componentType}'."
                );
            }

            _logger.LogDebug(
                "Resolved renderer {RendererType} for component type {ComponentType}",
                rendererType.Name,
                componentType
            );

            return renderer;
        }
        catch (InvalidComponentException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to resolve renderer {RendererType} for component type {ComponentType}",
                rendererType.Name,
                componentType
            );

            throw new InvalidComponentException(
                $"Failed to create renderer for component type '{componentType}': {ex.Message}",
                ex
            );
        }
    }

    /// <summary>
    /// Tries to resolve a renderer from the DI container by component type.
    /// </summary>
    private IComponentRenderer? TryResolveFromContainer(ComponentType componentType)
    {
        try
        {
            // Try to get all registered renderers and find a matching one
            var renderers = _serviceProvider.GetServices<IComponentRenderer>();
            return renderers.FirstOrDefault(r => r.ComponentType == componentType);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the component registry for accessing component metadata.
    /// </summary>
    public ComponentRegistry ComponentRegistry => _componentRegistry;

    /// <summary>
    /// Validates that a renderer exists for the specified component type and logs metadata.
    /// </summary>
    /// <param name="componentType">The component type to validate.</param>
    /// <returns>True if a renderer exists; otherwise, false.</returns>
    public bool ValidateRendererExists(ComponentType componentType)
    {
        var hasRenderer = HasRenderer(componentType);
        var metadata = _componentRegistry.GetMetadata(componentType);

        if (!hasRenderer)
        {
            _logger.LogWarning(
                "No renderer available for component type {ComponentType} ({ComponentName}). "
                    + "This is a Tier {Tier} component in the {Category} category.",
                componentType,
                metadata.Name,
                metadata.PriorityTier,
                metadata.Category
            );
        }

        return hasRenderer;
    }

    /// <summary>
    /// Logs detailed information about an unknown component type.
    /// Provides helpful suggestions for troubleshooting using component registry metadata.
    /// </summary>
    private void LogUnknownComponentType(ComponentType componentType)
    {
        var metadata = _componentRegistry.GetMetadata(componentType);
        var category = metadata.Category;
        var tier = metadata.PriorityTier;
        var supportedInCategory = GetSupportedComponentTypes()
            .Where(ct => ct.GetCategory() == category)
            .ToList();

        _logger.LogError(
            "No renderer found for component type {ComponentType} ({ComponentName}). "
                + "Description: {Description}. "
                + "Category: {Category}, Priority Tier: {Tier}. "
                + "Supported components in this category: [{SupportedComponents}]. "
                + "QuestPDF API: {QuestPdfApi}. "
                + "Ensure the renderer is registered in the DI container or manually registered via RegisterRenderer.",
            componentType,
            metadata.Name,
            metadata.Description,
            category,
            tier,
            string.Join(", ", supportedInCategory),
            metadata.QuestPdfApi
        );

        // Log required properties for reference
        if (metadata.RequiredProperties.Length > 0)
        {
            _logger.LogDebug(
                "Component {ComponentType} requires properties: [{RequiredProperties}]",
                componentType,
                string.Join(", ", metadata.RequiredProperties)
            );
        }

        // Additional debug information
        _logger.LogDebug(
            "Total registered renderers: {Count}. All supported types: [{AllTypes}]",
            RendererCount,
            string.Join(", ", GetSupportedComponentTypes())
        );
    }

    /// <summary>
    /// Disposes the factory and releases resources.
    /// </summary>
    public void Dispose()
    {
        _cacheLock.Dispose();
    }
}
