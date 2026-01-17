using PDFBuilder.Core.Domain;

namespace PDFBuilder.Core.Interfaces;

/// <summary>
/// Contract for the PDF generation service.
/// Orchestrates the complete PDF generation process from layout to bytes.
/// </summary>
public interface IPdfGenerator
{
    /// <summary>
    /// Generates a PDF document from a layout definition and data.
    /// </summary>
    /// <param name="layout">The root layout node defining the PDF structure.</param>
    /// <param name="data">The data object for expression evaluation.</param>
    /// <param name="options">Optional PDF generation options.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The generated PDF as a byte array.</returns>
    Task<byte[]> GeneratePdfAsync(
        LayoutNode layout,
        object? data = null,
        PdfGenerationOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generates a PDF document and writes it to a stream.
    /// </summary>
    /// <param name="layout">The root layout node defining the PDF structure.</param>
    /// <param name="outputStream">The stream to write the PDF to.</param>
    /// <param name="data">The data object for expression evaluation.</param>
    /// <param name="options">Optional PDF generation options.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    Task GeneratePdfAsync(
        LayoutNode layout,
        Stream outputStream,
        object? data = null,
        PdfGenerationOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Generates a PDF document from a template and data.
    /// </summary>
    /// <param name="template">The template containing the layout definition.</param>
    /// <param name="data">The data object for expression evaluation.</param>
    /// <param name="options">Optional PDF generation options.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>The generated PDF as a byte array.</returns>
    Task<byte[]> GeneratePdfFromTemplateAsync(
        Template template,
        object? data = null,
        PdfGenerationOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Validates a layout before generation without producing a PDF.
    /// </summary>
    /// <param name="layout">The layout node to validate.</param>
    /// <param name="data">Optional data object to validate expressions against.</param>
    /// <returns>The validation result.</returns>
    Task<PdfValidationResult> ValidateLayoutAsync(LayoutNode layout, object? data = null);

    /// <summary>
    /// Gets metadata about the generated PDF without full generation.
    /// Useful for previewing page count, size estimates, etc.
    /// </summary>
    /// <param name="layout">The root layout node.</param>
    /// <param name="data">The data object for expression evaluation.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>Metadata about the PDF that would be generated.</returns>
    Task<PdfMetadata> GetMetadataAsync(
        LayoutNode layout,
        object? data = null,
        CancellationToken cancellationToken = default
    );
}

/// <summary>
/// Options for PDF generation.
/// </summary>
public class PdfGenerationOptions
{
    /// <summary>
    /// Gets or sets the document title.
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Gets or sets the document author.
    /// </summary>
    public string? Author { get; set; }

    /// <summary>
    /// Gets or sets the document subject.
    /// </summary>
    public string? Subject { get; set; }

    /// <summary>
    /// Gets or sets the document keywords.
    /// </summary>
    public string? Keywords { get; set; }

    /// <summary>
    /// Gets or sets the document creator application name.
    /// </summary>
    public string? Creator { get; set; }

    /// <summary>
    /// Gets or sets the document producer name.
    /// </summary>
    public string? Producer { get; set; }

    /// <summary>
    /// Gets or sets the PDF compression level (0-9, where 9 is maximum compression).
    /// </summary>
    public int CompressionLevel { get; set; } = 6;

    /// <summary>
    /// Gets or sets whether to embed fonts in the PDF.
    /// </summary>
    public bool EmbedFonts { get; set; } = true;

    /// <summary>
    /// Gets or sets the default page size if not specified in the layout.
    /// </summary>
    public PageSize? DefaultPageSize { get; set; }

    /// <summary>
    /// Gets or sets the default page margins if not specified in the layout.
    /// </summary>
    public PageMargins? DefaultMargins { get; set; }

    /// <summary>
    /// Gets or sets whether to enable debug mode with visual aids.
    /// </summary>
    public bool DebugMode { get; set; }

    /// <summary>
    /// Gets or sets the maximum number of pages to generate (for safety).
    /// </summary>
    public int MaxPages { get; set; } = 1000;

    /// <summary>
    /// Gets or sets the timeout for PDF generation.
    /// </summary>
    public TimeSpan Timeout { get; set; } = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Gets the default generation options.
    /// </summary>
    public static PdfGenerationOptions Default => new();
}

/// <summary>
/// Represents the page size for PDF generation.
/// </summary>
public class PageSize
{
    /// <summary>
    /// Gets or sets the width in points.
    /// </summary>
    public float Width { get; set; }

    /// <summary>
    /// Gets or sets the height in points.
    /// </summary>
    public float Height { get; set; }

    /// <summary>
    /// Gets or sets the page orientation.
    /// </summary>
    public PageOrientation Orientation { get; set; } = PageOrientation.Portrait;

    /// <summary>
    /// A4 page size (210mm x 297mm).
    /// </summary>
    public static PageSize A4 => new() { Width = 595.28f, Height = 841.89f };

    /// <summary>
    /// Letter page size (8.5in x 11in).
    /// </summary>
    public static PageSize Letter => new() { Width = 612f, Height = 792f };

    /// <summary>
    /// Legal page size (8.5in x 14in).
    /// </summary>
    public static PageSize Legal => new() { Width = 612f, Height = 1008f };
}

/// <summary>
/// Page orientation options.
/// </summary>
public enum PageOrientation
{
    /// <summary>
    /// Portrait orientation (taller than wide).
    /// </summary>
    Portrait,

    /// <summary>
    /// Landscape orientation (wider than tall).
    /// </summary>
    Landscape,
}

/// <summary>
/// Represents page margins.
/// </summary>
public class PageMargins
{
    /// <summary>
    /// Gets or sets the top margin in points.
    /// </summary>
    public float Top { get; set; }

    /// <summary>
    /// Gets or sets the right margin in points.
    /// </summary>
    public float Right { get; set; }

    /// <summary>
    /// Gets or sets the bottom margin in points.
    /// </summary>
    public float Bottom { get; set; }

    /// <summary>
    /// Gets or sets the left margin in points.
    /// </summary>
    public float Left { get; set; }

    /// <summary>
    /// Creates uniform margins.
    /// </summary>
    /// <param name="all">The margin value for all sides.</param>
    /// <returns>A PageMargins with uniform margins.</returns>
    public static PageMargins Uniform(float all) =>
        new()
        {
            Top = all,
            Right = all,
            Bottom = all,
            Left = all,
        };

    /// <summary>
    /// Default margins (72 points / 1 inch on all sides).
    /// </summary>
    public static PageMargins Default => Uniform(72f);

    /// <summary>
    /// No margins.
    /// </summary>
    public static PageMargins None => Uniform(0f);
}

/// <summary>
/// Represents the result of PDF layout validation.
/// </summary>
public class PdfValidationResult
{
    /// <summary>
    /// Gets or sets a value indicating whether the layout is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Gets the collection of validation errors.
    /// </summary>
    public List<PdfValidationError> Errors { get; init; } = [];

    /// <summary>
    /// Gets the collection of validation warnings.
    /// </summary>
    public List<PdfValidationWarning> Warnings { get; init; } = [];

    /// <summary>
    /// Creates a successful validation result.
    /// </summary>
    /// <returns>A valid result.</returns>
    public static PdfValidationResult Success() => new() { IsValid = true };

    /// <summary>
    /// Creates a failed validation result.
    /// </summary>
    /// <param name="errors">The validation errors.</param>
    /// <returns>An invalid result.</returns>
    public static PdfValidationResult Failure(params PdfValidationError[] errors) =>
        new() { IsValid = false, Errors = [.. errors] };
}

/// <summary>
/// Represents a PDF validation error.
/// </summary>
public class PdfValidationError
{
    /// <summary>
    /// Gets or sets the error code.
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the error message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the path to the problematic element.
    /// </summary>
    public string? Path { get; set; }

    /// <summary>
    /// Gets or sets the node ID if applicable.
    /// </summary>
    public string? NodeId { get; set; }
}

/// <summary>
/// Represents a PDF validation warning.
/// </summary>
public class PdfValidationWarning
{
    /// <summary>
    /// Gets or sets the warning code.
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the warning message.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the path to the element.
    /// </summary>
    public string? Path { get; set; }
}

/// <summary>
/// Represents metadata about a PDF document.
/// </summary>
public class PdfMetadata
{
    /// <summary>
    /// Gets or sets the estimated number of pages.
    /// </summary>
    public int EstimatedPageCount { get; set; }

    /// <summary>
    /// Gets or sets the estimated file size in bytes.
    /// </summary>
    public long EstimatedSizeBytes { get; set; }

    /// <summary>
    /// Gets or sets the page size.
    /// </summary>
    public PageSize? PageSize { get; set; }

    /// <summary>
    /// Gets or sets the document title from options.
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Gets or sets the document author from options.
    /// </summary>
    public string? Author { get; set; }

    /// <summary>
    /// Gets or sets the list of fonts used in the document.
    /// </summary>
    public List<string> FontsUsed { get; init; } = [];

    /// <summary>
    /// Gets or sets the number of images in the document.
    /// </summary>
    public int ImageCount { get; set; }

    /// <summary>
    /// Gets or sets any warnings generated during metadata extraction.
    /// </summary>
    public List<string> Warnings { get; init; } = [];
}
