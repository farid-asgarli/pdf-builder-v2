namespace PDFBuilder.Infrastructure.Configuration;

/// <summary>
/// Configuration settings for QuestPDF library.
/// </summary>
public sealed class QuestPdfSettings
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "QuestPdf";

    /// <summary>
    /// Gets or sets the license type for QuestPDF.
    /// Values: "Community", "Professional", "Enterprise".
    /// </summary>
    public string LicenseType { get; set; } = "Community";

    /// <summary>
    /// Gets or sets the license key for commercial use.
    /// </summary>
    public string? LicenseKey { get; set; }

    /// <summary>
    /// Gets or sets the default page size.
    /// </summary>
    public string DefaultPageSize { get; set; } = "A4";

    /// <summary>
    /// Gets or sets the default page margin in points.
    /// </summary>
    public float DefaultPageMargin { get; set; } = 50f;

    /// <summary>
    /// Gets or sets the default font family.
    /// </summary>
    public string DefaultFontFamily { get; set; } = "Helvetica";

    /// <summary>
    /// Gets or sets the default font size in points.
    /// </summary>
    public float DefaultFontSize { get; set; } = 12f;

    /// <summary>
    /// Gets or sets a value indicating whether to enable debugging features.
    /// </summary>
    public bool EnableDebugging { get; set; }

    /// <summary>
    /// Gets or sets the maximum document size in bytes (default 50MB).
    /// </summary>
    public long MaxDocumentSizeBytes { get; set; } = 52_428_800;

    /// <summary>
    /// Gets or sets the image compression quality (0-100).
    /// </summary>
    public int ImageCompressionQuality { get; set; } = 90;
}
