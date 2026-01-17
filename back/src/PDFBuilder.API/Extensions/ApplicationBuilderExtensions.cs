using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using PDFBuilder.API.Middleware;

namespace PDFBuilder.API.Extensions;

/// <summary>
/// Extension methods for configuring the application builder.
/// </summary>
public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// Configures the PDF Builder middleware pipeline.
    /// </summary>
    /// <param name="app">The application builder.</param>
    /// <param name="_">The host environment (reserved for future use).</param>
    /// <returns>The application builder for chaining.</returns>
    public static IApplicationBuilder UsePdfBuilderMiddleware(
        this IApplicationBuilder app,
        IHostEnvironment _
    )
    {
        // Global exception handling
        app.UseGlobalExceptionHandler();

        // Request logging
        app.UseRequestLogging();

        // Security headers
        app.UseSecurityHeaders();

        return app;
    }

    /// <summary>
    /// Adds security headers to responses.
    /// </summary>
    /// <param name="app">The application builder.</param>
    /// <returns>The application builder for chaining.</returns>
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
    {
        return app.Use(
            async (context, next) =>
            {
                context.Response.Headers["X-Content-Type-Options"] = "nosniff";
                context.Response.Headers["X-Frame-Options"] = "DENY";
                context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
                context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

                await next();
            }
        );
    }

    /// <summary>
    /// Maps health check endpoints.
    /// </summary>
    /// <param name="app">The endpoint route builder.</param>
    /// <returns>The endpoint route builder for chaining.</returns>
    public static IEndpointRouteBuilder MapPdfBuilderHealthChecks(this IEndpointRouteBuilder app)
    {
        // Health check endpoint
        app.MapHealthChecks(
            "/health",
            new HealthCheckOptions
            {
                ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse,
                AllowCachingResponses = false,
            }
        );

        // Liveness probe - always returns healthy if the app is running
        app.MapHealthChecks(
            "/health/live",
            new HealthCheckOptions
            {
                Predicate = _ => false,
                ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse,
            }
        );

        // Readiness probe - checks database and other dependencies
        app.MapHealthChecks(
            "/health/ready",
            new HealthCheckOptions
            {
                Predicate = check => check.Tags.Contains("ready"),
                ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse,
            }
        );

        return app;
    }
}
