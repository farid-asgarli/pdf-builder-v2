namespace PDFBuilder.Infrastructure.Configuration;

/// <summary>
/// Configuration settings for database connection.
/// </summary>
public sealed class DatabaseSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Database";

    /// <summary>
    /// Gets or sets the database connection string.
    /// </summary>
    public string ConnectionString { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether to enable detailed logging for EF Core.
    /// </summary>
    public bool EnableDetailedErrors { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether to enable sensitive data logging.
    /// Should be false in production.
    /// </summary>
    public bool EnableSensitiveDataLogging { get; set; }

    /// <summary>
    /// Gets or sets the command timeout in seconds.
    /// </summary>
    public int CommandTimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Gets or sets the maximum retry count for transient failures.
    /// </summary>
    public int MaxRetryCount { get; set; } = 3;

    /// <summary>
    /// Gets or sets the maximum retry delay in seconds.
    /// </summary>
    public int MaxRetryDelaySeconds { get; set; } = 30;

    /// <summary>
    /// Gets or sets a value indicating whether to run migrations on startup.
    /// </summary>
    public bool RunMigrationsOnStartup { get; set; }
}
