using System.Diagnostics;

namespace PDFBuilder.API.Middleware;

/// <summary>
/// Middleware for logging HTTP request and response information.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="RequestLoggingMiddleware"/> class.
/// </remarks>
/// <param name="next">The next middleware in the pipeline.</param>
/// <param name="logger">The logger instance.</param>
public class RequestLoggingMiddleware(
    RequestDelegate next,
    ILogger<RequestLoggingMiddleware> logger
)
{
    private readonly RequestDelegate _next = next ?? throw new ArgumentNullException(nameof(next));
    private readonly ILogger<RequestLoggingMiddleware> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Invokes the middleware.
    /// </summary>
    /// <param name="context">The HTTP context.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = GetOrCreateCorrelationId(context);
        var stopwatch = Stopwatch.StartNew();

        // Add correlation ID to response headers
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Correlation-Id"] = correlationId;
            return Task.CompletedTask;
        });

        using (
            _logger.BeginScope(
                new Dictionary<string, object>
                {
                    ["CorrelationId"] = correlationId,
                    ["RequestPath"] = context.Request.Path.ToString(),
                    ["RequestMethod"] = context.Request.Method,
                }
            )
        )
        {
            _logger.LogInformation(
                "HTTP {Method} {Path} started",
                context.Request.Method,
                context.Request.Path
            );

            try
            {
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();

                var level =
                    context.Response.StatusCode >= 500 ? LogLevel.Error
                    : context.Response.StatusCode >= 400 ? LogLevel.Warning
                    : LogLevel.Information;

                _logger.Log(
                    level,
                    "HTTP {Method} {Path} completed with {StatusCode} in {ElapsedMilliseconds}ms",
                    context.Request.Method,
                    context.Request.Path,
                    context.Response.StatusCode,
                    stopwatch.ElapsedMilliseconds
                );
            }
        }
    }

    private static string GetOrCreateCorrelationId(HttpContext context)
    {
        if (
            context.Request.Headers.TryGetValue("X-Correlation-Id", out var correlationId)
            && !string.IsNullOrWhiteSpace(correlationId)
        )
        {
            return correlationId.ToString();
        }

        return Activity.Current?.Id ?? Guid.NewGuid().ToString("N");
    }
}

/// <summary>
/// Extension methods for the request logging middleware.
/// </summary>
public static class RequestLoggingMiddlewareExtensions
{
    /// <summary>
    /// Adds the request logging middleware to the application pipeline.
    /// </summary>
    /// <param name="app">The application builder.</param>
    /// <returns>The application builder for chaining.</returns>
    public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder app)
    {
        return app.UseMiddleware<RequestLoggingMiddleware>();
    }
}
