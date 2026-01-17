namespace PDFBuilder.Infrastructure.Configuration;

/// <summary>
/// Configuration settings for file storage.
/// </summary>
public sealed class StorageSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "Storage";

    /// <summary>
    /// Gets or sets the base path for local file storage.
    /// </summary>
    public string BasePath { get; set; } = "./storage";

    /// <summary>
    /// Gets or sets the path for storing generated PDFs.
    /// </summary>
    public string PdfOutputPath { get; set; } = "./storage/pdfs";

    /// <summary>
    /// Gets or sets the path for storing uploaded images.
    /// </summary>
    public string ImageUploadPath { get; set; } = "./storage/images";

    /// <summary>
    /// Gets or sets the path for custom fonts.
    /// </summary>
    public string FontsPath { get; set; } = "./storage/fonts";

    /// <summary>
    /// Gets or sets the maximum file size for uploads in bytes (default 10MB).
    /// </summary>
    public long MaxUploadSizeBytes { get; set; } = 10_485_760;

    /// <summary>
    /// Gets or sets the allowed image file extensions.
    /// </summary>
    public string[] AllowedImageExtensions { get; set; } =
        [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"];

    /// <summary>
    /// Gets or sets a value indicating whether to clean up temporary files automatically.
    /// </summary>
    public bool AutoCleanupTempFiles { get; set; } = true;

    /// <summary>
    /// Gets or sets the retention period for generated PDFs in hours.
    /// </summary>
    public int PdfRetentionHours { get; set; } = 24;
}
