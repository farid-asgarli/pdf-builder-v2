using PDFBuilder.API.Hubs;
using PDFBuilder.API.Services;
using PDFBuilder.Infrastructure.Configuration;

namespace PDFBuilder.API.Extensions;

/// <summary>
/// Extension methods for configuring SignalR and progress reporting services.
/// </summary>
public static class SignalRServiceCollectionExtensions
{
    /// <summary>
    /// Adds SignalR services for real-time progress reporting.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The configuration (reserved for future use).</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderSignalR(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        _ = configuration; // Reserved for future SignalR configuration options

        // Add SignalR
        var signalRBuilder = services.AddSignalR(options =>
        {
            options.EnableDetailedErrors = true;
            options.MaximumReceiveMessageSize = 102400; // 100KB
            options.StreamBufferCapacity = 10;
            options.HandshakeTimeout = TimeSpan.FromSeconds(15);
            options.KeepAliveInterval = TimeSpan.FromSeconds(15);
            options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
        });

        // Configure JSON serialization for SignalR
        signalRBuilder.AddJsonProtocol(options =>
        {
            options.PayloadSerializerOptions.PropertyNamingPolicy = System
                .Text
                .Json
                .JsonNamingPolicy
                .CamelCase;
        });

        // Register progress reporter
        services.AddSingleton<IProgressReporter, SignalRProgressReporter>();

        return services;
    }

    /// <summary>
    /// Adds image upload services.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddPdfBuilderImageUpload(this IServiceCollection services)
    {
        services.AddScoped<IImageUploadService, ImageUploadService>();
        return services;
    }

    /// <summary>
    /// Maps SignalR hubs for the application.
    /// </summary>
    /// <param name="app">The web application.</param>
    /// <returns>The web application for chaining.</returns>
    public static WebApplication MapPdfBuilderHubs(this WebApplication app)
    {
        app.MapHub<ProgressHub>("/hubs/progress");

        return app;
    }
}
