using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using PDFBuilder.Contracts.DTOs;

namespace PDFBuilder.Contracts.Requests;

/// <summary>
/// Request model for PDF generation.
/// Contains the layout definition and data context for rendering.
/// </summary>
/// <remarks>
/// <para>
/// This request uses the full template layout structure with separate
/// header, content, and footer trees that map to QuestPDF's page slots:
/// </para>
/// <list type="bullet">
///   <item>
///     <term>Header</term>
///     <description>Repeats at the top of every page.</description>
///   </item>
///   <item>
///     <term>Content</term>
///     <description>Primary content that flows across pages.</description>
///   </item>
///   <item>
///     <term>Footer</term>
///     <description>Repeats at the bottom of every page.</description>
///   </item>
///   <item>
///     <term>Background</term>
///     <description>Behind all content, spans entire page.</description>
///   </item>
///   <item>
///     <term>Foreground</term>
///     <description>In front of all content (watermarks).</description>
///   </item>
/// </list>
/// </remarks>
public class GeneratePdfRequest
{
    /// <summary>
    /// Gets or sets the complete template layout definition.
    /// Contains page settings, header, content, footer, background, and foreground trees.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Example JSON:
    /// <code>
    /// {
    ///   "templateLayout": {
    ///     "pageSettings": { "pageSize": "A4", "orientation": "Portrait" },
    ///     "header": { "type": "Text", "properties": { "content": "Header" } },
    ///     "content": { "type": "Column", "children": [...] },
    ///     "footer": { "type": "Text", "properties": { "content": "Page {{ currentPage }} of {{ totalPages }}" } }
    ///   }
    /// }
    /// </code>
    /// </para>
    /// </remarks>
    [Required(ErrorMessage = "TemplateLayout is required")]
    public TemplateLayoutDto TemplateLayout { get; set; } = null!;

    /// <summary>
    /// Gets or sets the data context for expression evaluation.
    /// This object will be available as 'data' in expressions.
    /// </summary>
    /// <example>{"customer": {"name": "John Doe"}, "items": [{"name": "Item 1", "price": 10}]}</example>
    public JsonElement? Data { get; set; }

    /// <summary>
    /// Gets or sets the output filename (without extension).
    /// If not specified, a default name will be generated.
    /// </summary>
    /// <example>invoice-2024-001</example>
    [StringLength(200, ErrorMessage = "Filename cannot exceed 200 characters")]
    [RegularExpression(
        @"^[a-zA-Z0-9\-_]+$",
        ErrorMessage = "Filename can only contain letters, numbers, hyphens, and underscores"
    )]
    public string? Filename { get; set; }

    /// <summary>
    /// Gets or sets the PDF metadata (title, author, subject, etc.).
    /// </summary>
    public PdfMetadataDto? Metadata { get; set; }

    /// <summary>
    /// Gets or sets optional generation options.
    /// </summary>
    public GenerationOptionsDto? Options { get; set; }

    /// <summary>
    /// Validates that the request has required layout information.
    /// </summary>
    /// <returns>True if valid layout is provided, false otherwise.</returns>
    public bool HasValidLayout()
    {
        return TemplateLayout?.Content is not null;
    }
}

/// <summary>
/// PDF document metadata.
/// </summary>
public class PdfMetadataDto
{
    /// <summary>
    /// Gets or sets the document title.
    /// </summary>
    /// <example>Invoice #2024-001</example>
    [StringLength(500, ErrorMessage = "Title cannot exceed 500 characters")]
    public string? Title { get; set; }

    /// <summary>
    /// Gets or sets the document author.
    /// </summary>
    /// <example>Acme Corporation</example>
    [StringLength(200, ErrorMessage = "Author cannot exceed 200 characters")]
    public string? Author { get; set; }

    /// <summary>
    /// Gets or sets the document subject.
    /// </summary>
    /// <example>Invoice for services rendered</example>
    [StringLength(500, ErrorMessage = "Subject cannot exceed 500 characters")]
    public string? Subject { get; set; }

    /// <summary>
    /// Gets or sets the document keywords.
    /// </summary>
    /// <example>invoice, billing, services</example>
    [StringLength(500, ErrorMessage = "Keywords cannot exceed 500 characters")]
    public string? Keywords { get; set; }

    /// <summary>
    /// Gets or sets the document creator application.
    /// </summary>
    /// <example>PDF Builder v1.0</example>
    [StringLength(200, ErrorMessage = "Creator cannot exceed 200 characters")]
    public string? Creator { get; set; }

    /// <summary>
    /// Gets or sets the document producer.
    /// </summary>
    [StringLength(200, ErrorMessage = "Producer cannot exceed 200 characters")]
    public string? Producer { get; set; }
}

/// <summary>
/// PDF generation options.
/// </summary>
public class GenerationOptionsDto
{
    /// <summary>
    /// Gets or sets whether to compress images.
    /// Default is true.
    /// </summary>
    public bool? CompressImages { get; set; }

    /// <summary>
    /// Gets or sets the image quality (0-100) when compression is enabled.
    /// Default is 85.
    /// </summary>
    [Range(1, 100, ErrorMessage = "ImageQuality must be between 1 and 100")]
    public int? ImageQuality { get; set; }

    /// <summary>
    /// Gets or sets whether to embed fonts in the PDF.
    /// Default is true.
    /// </summary>
    public bool? EmbedFonts { get; set; }

    /// <summary>
    /// Gets or sets whether to generate PDF/A compliant output.
    /// </summary>
    public bool? PdfACompliant { get; set; }

    /// <summary>
    /// Gets or sets the maximum generation timeout in seconds.
    /// Default is 60 seconds.
    /// </summary>
    [Range(1, 300, ErrorMessage = "Timeout must be between 1 and 300 seconds")]
    public int? TimeoutSeconds { get; set; }

    /// <summary>
    /// Gets or sets whether to include debug information in the PDF.
    /// Only applies in development mode.
    /// </summary>
    public bool? IncludeDebugInfo { get; set; }
}
