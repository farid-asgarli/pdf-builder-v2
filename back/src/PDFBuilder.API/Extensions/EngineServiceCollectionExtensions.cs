using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine;
using PDFBuilder.Engine.Extensions;
using PDFBuilder.Engine.Factories;
using PDFBuilder.Engine.Services;
using PDFBuilder.Infrastructure.Configuration;
using PDFBuilder.Infrastructure.External;

namespace PDFBuilder.API.Extensions;

/// <summary>
/// Extension methods for registering PDF Builder Engine services in the DI container.
/// </summary>
public static class EngineServiceCollectionExtensions
{
    /// <summary>
    /// Adds the PDF Builder Engine services to the service collection.
    /// This includes the LayoutEngine, RendererFactory, StyleResolver, ComponentRegistry, and ImageProcessor.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderEngine(
        this IServiceCollection services,
        IConfiguration? configuration = null
    )
    {
        // Register ComponentRegistry as singleton (component metadata is static)
        services.AddSingleton<ComponentRegistry>();

        // Register StyleResolver as singleton (stateless with expression evaluator dependency)
        services.AddSingleton<StyleResolver>();

        // Register ImageProcessor with interface
        services.AddSingleton<IImageProcessor>(sp =>
        {
            var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
            var cache = sp.GetRequiredService<IMemoryCache>();
            var options = sp.GetRequiredService<ImageProcessorOptions>();
            var logger = sp.GetRequiredService<ILogger<ImageProcessor>>();
            return new ImageProcessor(
                httpClientFactory.CreateClient("ImageClient"),
                cache,
                options,
                logger
            );
        });

        // Also register the concrete type for backward compatibility
        services.AddSingleton<ImageProcessor>(sp =>
            (ImageProcessor)sp.GetRequiredService<IImageProcessor>()
        );

        // Register RendererFactory as singleton (handles its own caching)
        services.AddSingleton<IRendererFactory, RendererFactory>();

        // Also register the concrete type for backward compatibility
        services.AddSingleton<RendererFactory>(sp =>
            (RendererFactory)sp.GetRequiredService<IRendererFactory>()
        );

        // Register LayoutEngine as singleton (stateless, uses injected dependencies)
        services.AddSingleton<ILayoutEngine, LayoutEngine>();

        // Register performance optimization services if configuration is provided
        if (configuration is not null)
        {
            services.AddPdfBuilderPerformanceServices(configuration);
        }
        else
        {
            // Register minimal services without configuration
            services.AddExpressionCache();
            services.AddPdfBuilderPooling();
        }

        // Register cache statistics service
        services.AddSingleton<CacheStatisticsService>();

        // Register font manager
        services.AddSingleton(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<FontManager>>();
            var options = new FontManagerOptions();

            if (configuration is not null)
            {
                var section = configuration.GetSection(FontSettings.SectionName);
                if (section.Exists())
                {
                    options.FontBasePath = section["FontBasePath"];
                    options.DefaultFontFamily = section["DefaultFontFamily"] ?? "Arial";
                    if (bool.TryParse(section["PreloadFonts"], out var preload))
                        options.PreloadFonts = preload;
                    if (long.TryParse(section["MaxCacheSizeBytes"], out var maxCache))
                        options.MaxCacheSizeBytes = maxCache;
                }
            }

            return new FontManager(options, logger);
        });

        // Register service disposal manager
        services.AddSingleton<ServiceDisposalManager>();

        return services;
    }

    /// <summary>
    /// Adds ImageProcessor options from configuration.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddImageProcessorOptions(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        var section = configuration.GetSection("ImageProcessing");

        services.AddSingleton(sp =>
        {
            var options = new ImageProcessorOptions();

            if (section.Exists())
            {
                if (long.TryParse(section["MaxImageSizeBytes"], out var maxSize))
                    options.MaxImageSizeBytes = maxSize;

                if (int.TryParse(section["MaxImageWidth"], out var maxWidth))
                    options.MaxImageWidth = maxWidth;

                if (int.TryParse(section["MaxImageHeight"], out var maxHeight))
                    options.MaxImageHeight = maxHeight;

                if (bool.TryParse(section["AutoResizeEnabled"], out var autoResize))
                    options.AutoResizeEnabled = autoResize;

                if (int.TryParse(section["DefaultCompressionQuality"], out var quality))
                    options.DefaultCompressionQuality = quality;

                if (int.TryParse(section["HttpTimeoutSeconds"], out var timeout))
                    options.HttpTimeout = TimeSpan.FromSeconds(timeout);

                if (int.TryParse(section["CacheDurationMinutes"], out var cacheDuration))
                    options.CacheDuration = TimeSpan.FromMinutes(cacheDuration);

                if (bool.TryParse(section["AllowLocalFiles"], out var allowLocal))
                    options.AllowLocalFiles = allowLocal;

                if (bool.TryParse(section["AllowInsecureHttp"], out var allowHttp))
                    options.AllowInsecureHttp = allowHttp;

                options.BaseFilePath = section["BaseFilePath"];

                var allowedHosts = section.GetSection("AllowedHosts").Get<List<string>>();
                if (allowedHosts is not null)
                    options.AllowedHosts = allowedHosts;
            }

            return options;
        });

        return services;
    }

    /// <summary>
    /// Adds all component renderers to the service collection.
    /// Renderers are discovered and registered by the RendererFactory.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderRenderers(this IServiceCollection services)
    {
        // Register all component renderers from the Engine assembly
        // This scans for all implementations of IComponentRenderer
        var engineAssembly = typeof(LayoutEngine).Assembly;
        var rendererTypes = engineAssembly
            .GetTypes()
            .Where(t =>
                !t.IsAbstract && !t.IsInterface && typeof(IComponentRenderer).IsAssignableFrom(t)
            )
            .ToList();

        foreach (var rendererType in rendererTypes)
        {
            // Register each renderer as singleton (they are stateless with injected dependencies)
            services.AddSingleton(typeof(IComponentRenderer), rendererType);
            services.AddSingleton(rendererType);
        }

        return services;
    }

    /// <summary>
    /// Registers a specific component renderer type.
    /// </summary>
    /// <typeparam name="TRenderer">The renderer type to register.</typeparam>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddRenderer<TRenderer>(this IServiceCollection services)
        where TRenderer : class, IComponentRenderer
    {
        services.AddSingleton<IComponentRenderer, TRenderer>();
        services.AddSingleton<TRenderer>();
        return services;
    }
}
