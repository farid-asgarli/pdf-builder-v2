using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace PDFBuilder.API.Controllers;

/// <summary>
/// Health check and status controller.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="StatusController"/> class.
/// </remarks>
/// <param name="logger">The logger instance.</param>
/// <param name="environment">The host environment.</param>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class StatusController(ILogger<StatusController> logger, IHostEnvironment environment)
    : ControllerBase
{
    private readonly ILogger<StatusController> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));
    private readonly IHostEnvironment _environment =
        environment ?? throw new ArgumentNullException(nameof(environment));

    /// <summary>
    /// Gets the API status and version information.
    /// </summary>
    /// <returns>Status information about the API.</returns>
    [HttpGet]
    [SwaggerOperation(
        Summary = "Get API Status",
        Description = "Returns the current status and version information of the PDF Builder API"
    )]
    [SwaggerResponse(200, "Returns the API status", typeof(StatusResponse))]
    public ActionResult<StatusResponse> GetStatus()
    {
        _logger.LogInformation("Status check requested");

        var response = new StatusResponse
        {
            Status = "Healthy",
            Version = "1.0.0",
            Environment = _environment.EnvironmentName,
            Timestamp = DateTime.UtcNow,
        };

        return Ok(response);
    }

    /// <summary>
    /// Simple ping endpoint to verify the API is responding.
    /// </summary>
    /// <returns>A pong response.</returns>
    [HttpGet("ping")]
    [SwaggerOperation(
        Summary = "Ping",
        Description = "Simple endpoint to verify the API is responding"
    )]
    [SwaggerResponse(200, "Returns pong")]
    public ActionResult<PingResponse> Ping()
    {
        return Ok(new PingResponse { Message = "pong", Timestamp = DateTime.UtcNow });
    }
}

/// <summary>
/// API status response model.
/// </summary>
public class StatusResponse
{
    /// <summary>
    /// Gets or sets the API health status.
    /// </summary>
    public string Status { get; set; } = "Unknown";

    /// <summary>
    /// Gets or sets the API version.
    /// </summary>
    public string Version { get; set; } = "0.0.0";

    /// <summary>
    /// Gets or sets the current environment name.
    /// </summary>
    public string Environment { get; set; } = "Unknown";

    /// <summary>
    /// Gets or sets the timestamp of the response.
    /// </summary>
    public DateTime Timestamp { get; set; }
}

/// <summary>
/// Ping response model.
/// </summary>
public class PingResponse
{
    /// <summary>
    /// Gets or sets the response message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the timestamp of the response.
    /// </summary>
    public DateTime Timestamp { get; set; }
}
