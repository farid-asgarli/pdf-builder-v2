using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PDFBuilder.Core.Exceptions;

namespace PDFBuilder.API.Middleware;

/// <summary>
/// Global exception handling middleware that catches all unhandled exceptions
/// and returns consistent error responses with correlation IDs.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="ExceptionHandlingMiddleware"/> class.
/// </remarks>
/// <param name="next">The next middleware in the pipeline.</param>
/// <param name="logger">The logger instance.</param>
/// <param name="environment">The host environment.</param>
public class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger,
    IHostEnvironment environment
)
{
    private readonly RequestDelegate _next = next ?? throw new ArgumentNullException(nameof(next));
    private readonly ILogger<ExceptionHandlingMiddleware> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));
    private readonly IHostEnvironment _environment =
        environment ?? throw new ArgumentNullException(nameof(environment));

    /// <summary>
    /// Invokes the middleware.
    /// </summary>
    /// <param name="context">The HTTP context.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var correlationId = Activity.Current?.Id ?? context.TraceIdentifier;

        // Log based on exception type
        LogException(exception, correlationId, context.Request.Path);

        var (statusCode, title, errorCode) = GetErrorDetails(exception);

        var problemDetails = new ProblemDetails
        {
            Status = (int)statusCode,
            Title = title,
            Detail = GetErrorDetail(exception),
            Instance = context.Request.Path,
            Type = $"https://httpstatuses.com/{(int)statusCode}",
        };

        // Add correlation ID for tracking
        problemDetails.Extensions["correlationId"] = correlationId;
        problemDetails.Extensions["timestamp"] = DateTime.UtcNow.ToString("O");
        problemDetails.Extensions["errorCode"] = errorCode;

        // Add custom exception details
        AddCustomExceptionDetails(problemDetails, exception);

        // Add development-only details
        if (_environment.IsDevelopment())
        {
            problemDetails.Extensions["exception"] = exception.GetType().FullName;
            problemDetails.Extensions["stackTrace"] = exception.StackTrace;
        }

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/problem+json";

        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = _environment.IsDevelopment(),
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(problemDetails, options));
    }

    private void LogException(Exception exception, string correlationId, PathString path)
    {
        var logLevel = exception switch
        {
            // Client errors - log as Warning
            // Note: PdfBuilderException covers all custom exceptions including ValidationException
            PdfBuilderException => LogLevel.Warning,
            FluentValidation.ValidationException => LogLevel.Warning,
            ArgumentException => LogLevel.Warning,
            KeyNotFoundException => LogLevel.Warning,

            // Cancellation - log as Information
            OperationCanceledException => LogLevel.Information,

            // Server errors - log as Error
            _ => LogLevel.Error,
        };

        _logger.Log(
            logLevel,
            exception,
            "Exception occurred. CorrelationId: {CorrelationId}, Path: {Path}, Type: {ExceptionType}, ErrorCode: {ErrorCode}",
            correlationId,
            path,
            exception.GetType().Name,
            exception is PdfBuilderException pbe ? pbe.ErrorCode : "UNKNOWN"
        );
    }

    private string GetErrorDetail(Exception exception)
    {
        // Always show message for our custom exceptions
        if (exception is PdfBuilderException)
        {
            return exception.Message;
        }

        // Show FluentValidation messages
        if (exception is FluentValidation.ValidationException validationEx)
        {
            return string.Join("; ", validationEx.Errors.Select(e => e.ErrorMessage));
        }

        // For other exceptions, only show details in development
        return _environment.IsDevelopment()
            ? exception.Message
            : "An error occurred while processing your request.";
    }

    private static void AddCustomExceptionDetails(
        ProblemDetails problemDetails,
        Exception exception
    )
    {
        switch (exception)
        {
            case LayoutRenderException layoutEx:
                if (layoutEx.NodeId != null)
                    problemDetails.Extensions["nodeId"] = layoutEx.NodeId;
                if (layoutEx.NodePath != null)
                    problemDetails.Extensions["nodePath"] = layoutEx.NodePath;
                if (layoutEx.ComponentType != null)
                    problemDetails.Extensions["componentType"] = layoutEx.ComponentType;
                break;

            case InvalidComponentException componentEx:
                if (componentEx.NodeId != null)
                    problemDetails.Extensions["nodeId"] = componentEx.NodeId;
                if (componentEx.NodePath != null)
                    problemDetails.Extensions["nodePath"] = componentEx.NodePath;
                if (componentEx.ComponentTypeName != null)
                    problemDetails.Extensions["componentType"] = componentEx.ComponentTypeName;
                break;

            case ExpressionEvaluationException expressionEx:
                if (expressionEx.Expression != null)
                    problemDetails.Extensions["expression"] = expressionEx.Expression;
                if (expressionEx.NodeId != null)
                    problemDetails.Extensions["nodeId"] = expressionEx.NodeId;
                if (expressionEx.PropertyName != null)
                    problemDetails.Extensions["propertyName"] = expressionEx.PropertyName;
                if (expressionEx.ErrorPosition.HasValue)
                    problemDetails.Extensions["errorPosition"] = expressionEx.ErrorPosition.Value;
                break;

            case TemplateNotFoundException templateEx:
                if (templateEx.TemplateId.HasValue)
                    problemDetails.Extensions["templateId"] = templateEx.TemplateId.Value;
                if (templateEx.TemplateName != null)
                    problemDetails.Extensions["templateName"] = templateEx.TemplateName;
                break;

            case Core.Exceptions.ValidationException validationEx:
                problemDetails.Extensions["validationErrors"] = validationEx
                    .ValidationErrors.Select(e => new
                    {
                        e.Code,
                        e.Message,
                        e.PropertyPath,
                        e.NodeId,
                        e.Severity,
                    })
                    .ToList();
                break;

            case FluentValidation.ValidationException fluentEx:
                problemDetails.Extensions["validationErrors"] = fluentEx
                    .Errors.Select(e => new
                    {
                        e.ErrorCode,
                        e.ErrorMessage,
                        e.PropertyName,
                        AttemptedValue = e.AttemptedValue?.ToString(),
                    })
                    .ToList();
                break;
        }
    }

    private static (HttpStatusCode StatusCode, string Title, string ErrorCode) GetErrorDetails(
        Exception exception
    )
    {
        return exception switch
        {
            // PDF Builder custom exceptions
            LayoutRenderException ex => (
                HttpStatusCode.BadRequest,
                "Layout Rendering Failed",
                ex.ErrorCode
            ),
            InvalidComponentException ex => (
                HttpStatusCode.BadRequest,
                "Invalid Component",
                ex.ErrorCode
            ),
            ExpressionEvaluationException ex => (
                HttpStatusCode.BadRequest,
                "Expression Evaluation Failed",
                ex.ErrorCode
            ),
            TemplateNotFoundException ex => (
                HttpStatusCode.NotFound,
                "Template Not Found",
                ex.ErrorCode
            ),
            Core.Exceptions.ValidationException ex => (
                HttpStatusCode.BadRequest,
                "Validation Failed",
                ex.ErrorCode
            ),

            // FluentValidation exception
            FluentValidation.ValidationException => (
                HttpStatusCode.BadRequest,
                "Validation Failed",
                "VALIDATION_ERROR"
            ),

            // Standard exceptions
            ArgumentNullException => (
                HttpStatusCode.BadRequest,
                "Missing Required Parameter",
                "MISSING_PARAMETER"
            ),
            ArgumentException => (
                HttpStatusCode.BadRequest,
                "Invalid Argument",
                "INVALID_ARGUMENT"
            ),
            InvalidOperationException => (
                HttpStatusCode.BadRequest,
                "Invalid Operation",
                "INVALID_OPERATION"
            ),
            UnauthorizedAccessException => (
                HttpStatusCode.Unauthorized,
                "Unauthorized",
                "UNAUTHORIZED"
            ),
            KeyNotFoundException => (HttpStatusCode.NotFound, "Resource Not Found", "NOT_FOUND"),
            NotImplementedException => (
                HttpStatusCode.NotImplemented,
                "Not Implemented",
                "NOT_IMPLEMENTED"
            ),
            OperationCanceledException => (
                HttpStatusCode.RequestTimeout,
                "Operation Cancelled",
                "OPERATION_CANCELLED"
            ),
            TimeoutException => (HttpStatusCode.GatewayTimeout, "Request Timeout", "TIMEOUT"),

            // Default
            _ => (HttpStatusCode.InternalServerError, "Internal Server Error", "INTERNAL_ERROR"),
        };
    }
}

/// <summary>
/// Extension methods for the exception handling middleware.
/// </summary>
public static class ExceptionHandlingMiddlewareExtensions
{
    /// <summary>
    /// Adds the exception handling middleware to the application pipeline.
    /// </summary>
    /// <param name="app">The application builder.</param>
    /// <returns>The application builder for chaining.</returns>
    public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
    {
        return app.UseMiddleware<ExceptionHandlingMiddleware>();
    }
}
