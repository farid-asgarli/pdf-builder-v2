namespace PDFBuilder.Contracts.Responses;

/// <summary>
/// Response model for image upload operations.
/// </summary>
public class ImageUploadResponse
{
    /// <summary>
    /// Gets or sets whether the upload was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets the unique identifier for the uploaded image.
    /// </summary>
    public string? ImageId { get; set; }

    /// <summary>
    /// Gets or sets the URL to access the uploaded image.
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// Gets or sets the original filename.
    /// </summary>
    public string? OriginalFilename { get; set; }

    /// <summary>
    /// Gets or sets the stored filename.
    /// </summary>
    public string? StoredFilename { get; set; }

    /// <summary>
    /// Gets or sets the content type of the image.
    /// </summary>
    public string? ContentType { get; set; }

    /// <summary>
    /// Gets or sets the file size in bytes.
    /// </summary>
    public long FileSizeBytes { get; set; }

    /// <summary>
    /// Gets or sets the image width in pixels.
    /// </summary>
    public int? Width { get; set; }

    /// <summary>
    /// Gets or sets the image height in pixels.
    /// </summary>
    public int? Height { get; set; }

    /// <summary>
    /// Gets or sets the upload timestamp.
    /// </summary>
    public DateTime UploadedAt { get; set; }

    /// <summary>
    /// Gets or sets the error message if upload failed.
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Response model for batch image upload operations.
/// </summary>
public class BatchImageUploadResponse
{
    /// <summary>
    /// Gets or sets whether all uploads were successful.
    /// </summary>
    public bool AllSuccessful { get; set; }

    /// <summary>
    /// Gets or sets the total number of files uploaded.
    /// </summary>
    public int TotalFiles { get; set; }

    /// <summary>
    /// Gets or sets the number of successful uploads.
    /// </summary>
    public int SuccessfulUploads { get; set; }

    /// <summary>
    /// Gets or sets the number of failed uploads.
    /// </summary>
    public int FailedUploads { get; set; }

    /// <summary>
    /// Gets or sets the individual upload results.
    /// </summary>
    public List<ImageUploadResponse> Results { get; set; } = [];
}
