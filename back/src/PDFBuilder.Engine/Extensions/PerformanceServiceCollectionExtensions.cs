using Microsoft.Extensions.Configuration;
using PDFBuilder.Engine.Caching;
using PDFBuilder.Engine.Diagnostics;
using PDFBuilder.Engine.Pooling;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.Engine.Extensions;

/// <summary>
/// Extension methods for registering performance optimization services.
/// </summary>
public static class PerformanceServiceCollectionExtensions
{
    /// <summary>
    /// Adds performance optimization services to the service collection.
    /// Includes caching, pooling, and diagnostics services.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderPerformanceServices(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        // Add expression cache
        services.AddExpressionCache();

        // Add image cache
        services.AddImageCache(configuration);

        // Add object pooling
        services.AddPdfBuilderPooling();

        // Add lazy loading support
        services.AddLazyLoadingSupport(configuration);

        // Add performance diagnostics
        services.AddPerformanceDiagnostics(configuration);

        return services;
    }

    /// <summary>
    /// Adds the expression cache service.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddExpressionCache(this IServiceCollection services)
    {
        services.AddSingleton<ExpressionCache>();
        return services;
    }

    /// <summary>
    /// Adds the image cache service.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddImageCache(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        // Configure image cache options
        services.AddSingleton(sp =>
        {
            var section = configuration.GetSection("ImageCache");
            var options = new ImageCacheOptions();

            if (section.Exists())
            {
                if (long.TryParse(section["MaxSizeBytes"], out var maxSize))
                    options.MaxSizeBytes = maxSize;

                if (int.TryParse(section["MaxEntries"], out var maxEntries))
                    options.MaxEntries = maxEntries;

                if (long.TryParse(section["MaxSingleItemBytes"], out var maxItem))
                    options.MaxSingleItemBytes = maxItem;

                if (int.TryParse(section["ExpirationMinutes"], out var expiration))
                    options.ExpirationMinutes = expiration;
            }

            return options;
        });

        services.AddSingleton<ImageCache>();
        return services;
    }

    /// <summary>
    /// Adds object pooling services.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderPooling(this IServiceCollection services)
    {
        // Register RenderContext pool
        services.AddSingleton<RenderContextPool>();

        return services;
    }

    /// <summary>
    /// Adds lazy loading support services.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddLazyLoadingSupport(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        // Configure lazy loading options
        services.AddSingleton(sp =>
        {
            var section = configuration.GetSection("LazyLoading");
            var options = new LazyLoadingOptions();

            if (section.Exists())
            {
                if (int.TryParse(section["DefaultBatchSize"], out var batchSize))
                    options.DefaultBatchSize = batchSize;

                if (int.TryParse(section["AutoEnableThreshold"], out var threshold))
                    options.AutoEnableThreshold = threshold;

                if (bool.TryParse(section["YieldBetweenBatches"], out var yield))
                    options.YieldBetweenBatches = yield;

                if (int.TryParse(section["GCTriggerThreshold"], out var gcThreshold))
                    options.GCTriggerThreshold = gcThreshold;
            }

            return options;
        });

        services.AddSingleton<LazyDataProviderFactory>();
        return services;
    }

    /// <summary>
    /// Adds performance diagnostics services.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPerformanceDiagnostics(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        // Configure diagnostics options
        var section = configuration.GetSection("Diagnostics");
        var enableDiagnostics = true;

        if (section.Exists())
        {
            if (bool.TryParse(section["EnablePerformanceTracking"], out var enabled))
                enableDiagnostics = enabled;
        }

        // Register as transient since each PDF generation should have its own tracker
        services.AddTransient<PerformanceTracker>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<PerformanceTracker>>();
            return new PerformanceTracker(logger, enableDiagnostics);
        });

        services.AddTransient<MemoryTracker>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<MemoryTracker>>();
            return new MemoryTracker(logger, enableDiagnostics);
        });

        return services;
    }
}
