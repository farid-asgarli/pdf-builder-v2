namespace PDFBuilder.Contracts.Requests;

/// <summary>
/// Request model for image upload processing options.
/// </summary>
public class ImageUploadRequest
{
    /// <summary>
    /// Gets or sets whether to resize the image to fit within max dimensions.
    /// </summary>
    public bool? AutoResize { get; set; }

    /// <summary>
    /// Gets or sets the maximum width for resizing.
    /// </summary>
    public int? MaxWidth { get; set; }

    /// <summary>
    /// Gets or sets the maximum height for resizing.
    /// </summary>
    public int? MaxHeight { get; set; }

    /// <summary>
    /// Gets or sets the compression quality (1-100).
    /// </summary>
    public int? Quality { get; set; }

    /// <summary>
    /// Gets or sets the output format (null to keep original).
    /// Supported: "jpeg", "png", "webp".
    /// </summary>
    public string? OutputFormat { get; set; }

    /// <summary>
    /// Gets or sets a custom filename (without extension).
    /// </summary>
    public string? CustomFilename { get; set; }
}
