namespace PDFBuilder.Infrastructure.Configuration;

/// <summary>
/// Configuration settings for expression evaluation.
/// </summary>
public sealed class ExpressionSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Expression";

    /// <summary>
    /// Gets or sets the maximum execution time for expressions in milliseconds.
    /// </summary>
    public int TimeoutMilliseconds { get; set; } = 5000;

    /// <summary>
    /// Gets or sets the maximum complexity level for expressions.
    /// Higher values allow more complex expressions but may impact performance.
    /// </summary>
    public int MaxComplexity { get; set; } = 100;

    /// <summary>
    /// Gets or sets a value indicating whether to cache compiled expressions.
    /// </summary>
    public bool EnableCaching { get; set; } = true;

    /// <summary>
    /// Gets or sets the maximum number of cached expressions.
    /// </summary>
    public int MaxCacheSize { get; set; } = 1000;

    /// <summary>
    /// Gets or sets the cache expiration time in minutes.
    /// </summary>
    public int CacheExpirationMinutes { get; set; } = 60;

    /// <summary>
    /// Gets or sets a value indicating whether to allow method calls in expressions.
    /// </summary>
    public bool AllowMethodCalls { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether to allow custom functions.
    /// </summary>
    public bool AllowCustomFunctions { get; set; } = true;

    /// <summary>
    /// Gets or sets the list of blocked namespaces for security.
    /// </summary>
    public string[] BlockedNamespaces { get; set; } =
        [
            "System.IO",
            "System.Net",
            "System.Reflection",
            "System.Runtime",
            "System.Diagnostics.Process",
        ];
}
