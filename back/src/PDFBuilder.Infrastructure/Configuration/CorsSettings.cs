namespace PDFBuilder.Infrastructure.Configuration;

/// <summary>
/// Configuration settings for CORS (Cross-Origin Resource Sharing).
/// </summary>
public sealed class CorsSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Cors";

    /// <summary>
    /// Gets or sets the allowed origins for CORS.
    /// </summary>
    public string[] AllowedOrigins { get; set; } =
        ["http://localhost:3000", "http://localhost:5173"];

    /// <summary>
    /// Gets or sets the allowed HTTP methods.
    /// </summary>
    public string[] AllowedMethods { get; set; } =
        ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];

    /// <summary>
    /// Gets or sets the allowed headers.
    /// </summary>
    public string[] AllowedHeaders { get; set; } =
        [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-Correlation-Id",
            "X-SignalR-User-Agent", // Required for SignalR
        ];

    /// <summary>
    /// Gets or sets the exposed headers.
    /// </summary>
    public string[] ExposedHeaders { get; set; } =
        ["Content-Disposition", "X-Correlation-Id", "X-Operation-Id"];

    /// <summary>
    /// Gets or sets a value indicating whether credentials are allowed.
    /// Required for SignalR with authentication.
    /// </summary>
    public bool AllowCredentials { get; set; } = true;

    /// <summary>
    /// Gets or sets the preflight max age in seconds.
    /// </summary>
    public int PreflightMaxAgeSeconds { get; set; } = 600;

    /// <summary>
    /// Gets or sets a value indicating whether SignalR connections are allowed.
    /// </summary>
    public bool EnableSignalR { get; set; } = true;
}
