using System.ComponentModel.DataAnnotations;

namespace PDFBuilder.Contracts.DTOs;

/// <summary>
/// Data transfer object representing the complete layout structure for a PDF template.
/// Contains separate layout trees for header, content, and footer sections,
/// along with page configuration settings.
/// </summary>
/// <remarks>
/// <para>
/// The TemplateLayoutDto follows QuestPDF's page structure with three main slots:
/// </para>
/// <list type="bullet">
///   <item>
///     <term>Header</term>
///     <description>
///       Rendered at the top of every page. Does not support pagination.
///     </description>
///   </item>
///   <item>
///     <term>Content</term>
///     <description>
///       The primary content area between header and footer. Supports pagination.
///     </description>
///   </item>
///   <item>
///     <term>Footer</term>
///     <description>
///       Rendered at the bottom of every page. Does not support pagination.
///     </description>
///   </item>
/// </list>
/// </remarks>
public class TemplateLayoutDto
{
    /// <summary>
    /// Gets or sets the page settings for the document.
    /// Defines page size, orientation, margins, and header/footer heights.
    /// </summary>
    /// <remarks>
    /// If not specified, defaults to A4 portrait with standard margins.
    /// </remarks>
    public PageSettingsDto? PageSettings { get; set; }

    /// <summary>
    /// Gets or sets the header layout tree.
    /// The header is rendered at the top of every page and does not paginate.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The header slot appears above the main content on every page of the document.
    /// It is ideal for:
    /// </para>
    /// <list type="bullet">
    ///   <item>Company logos and branding</item>
    ///   <item>Document titles</item>
    ///   <item>Report headers with date/time</item>
    ///   <item>Repeating section identifiers</item>
    /// </list>
    /// <para>
    /// Set to <c>null</c> if no header is needed.
    /// </para>
    /// </remarks>
    public LayoutNodeDto? Header { get; set; }

    /// <summary>
    /// Gets or sets the main content layout tree.
    /// This is the primary document content that flows across pages.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The content slot is the main body of the document and supports pagination.
    /// When content exceeds the available space on a page, it automatically flows
    /// to subsequent pages.
    /// </para>
    /// </remarks>
    [Required(ErrorMessage = "Content layout is required")]
    public LayoutNodeDto Content { get; set; } = null!;

    /// <summary>
    /// Gets or sets the footer layout tree.
    /// The footer is rendered at the bottom of every page and does not paginate.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The footer slot appears below the main content on every page of the document.
    /// It is ideal for:
    /// </para>
    /// <list type="bullet">
    ///   <item>Page numbers (e.g., "Page 1 of 10")</item>
    ///   <item>Copyright notices</item>
    ///   <item>Document identifiers or version numbers</item>
    ///   <item>Confidentiality statements</item>
    /// </list>
    /// <para>
    /// For page numbers, use expressions like <c>{{ currentPage }}</c> and
    /// <c>{{ totalPages }}</c> in text components within the footer.
    /// </para>
    /// </remarks>
    public LayoutNodeDto? Footer { get; set; }

    /// <summary>
    /// Gets or sets the background layout tree.
    /// The background is rendered behind all other content and spans the entire page.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The background slot is drawn behind the header, content, and footer.
    /// It is not affected by page margins and always occupies the entire page area.
    /// Useful for background images, patterns, or decorative borders.
    /// </para>
    /// </remarks>
    public LayoutNodeDto? Background { get; set; }

    /// <summary>
    /// Gets or sets the foreground layout tree.
    /// The foreground is rendered in front of all other content and spans the entire page.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The foreground slot is drawn on top of the header, content, and footer.
    /// It is not affected by page margins and always occupies the entire page area.
    /// Useful for watermarks (e.g., "DRAFT", "CONFIDENTIAL"), overlay graphics,
    /// or security markings.
    /// </para>
    /// </remarks>
    public LayoutNodeDto? Foreground { get; set; }
}
