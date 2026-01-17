using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace PDFBuilder.API.Filters;

/// <summary>
/// Action filter that validates models using FluentValidation.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="ValidationFilter"/> class.
/// </remarks>
/// <param name="logger">The logger instance.</param>
public class ValidationFilter(ILogger<ValidationFilter> logger) : IAsyncActionFilter
{
    private readonly ILogger<ValidationFilter> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Executes the validation filter.
    /// </summary>
    /// <param name="context">The action executing context.</param>
    /// <param name="next">The next delegate in the pipeline.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next
    )
    {
        if (!context.ModelState.IsValid)
        {
            _logger.LogWarning(
                "Model validation failed for action {ActionName}",
                context.ActionDescriptor.DisplayName
            );

            var errors = context
                .ModelState.Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                );

            var problemDetails = new ValidationProblemDetails(context.ModelState)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation Failed",
                Detail = "One or more validation errors occurred.",
                Instance = context.HttpContext.Request.Path,
                Type = "https://httpstatuses.com/400",
            };

            problemDetails.Extensions["timestamp"] = DateTime.UtcNow.ToString("O");

            context.Result = new BadRequestObjectResult(problemDetails);
            return;
        }

        await next();
    }
}
