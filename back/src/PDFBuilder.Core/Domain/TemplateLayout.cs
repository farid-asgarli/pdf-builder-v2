namespace PDFBuilder.Core.Domain;

/// <summary>
/// Represents the complete layout structure for a PDF template.
/// Contains separate layout trees for header, content, and footer sections,
/// along with page configuration settings.
/// </summary>
/// <remarks>
/// <para>
/// The TemplateLayout follows QuestPDF's page structure with three main slots:
/// </para>
/// <list type="bullet">
///   <item>
///     <term>Header</term>
///     <description>
///       Rendered at the top of every page. Does not support pagination.
///       Content must fit within the header area on a single page.
///     </description>
///   </item>
///   <item>
///     <term>Content</term>
///     <description>
///       The primary content area between header and footer.
///       Supports pagination and determines the document length.
///     </description>
///   </item>
///   <item>
///     <term>Footer</term>
///     <description>
///       Rendered at the bottom of every page. Does not support pagination.
///       Commonly used for page numbers, copyright notices, etc.
///     </description>
///   </item>
/// </list>
/// </remarks>
public class TemplateLayout
{
    /// <summary>
    /// Gets or sets the page settings for the document.
    /// Defines page size, orientation, margins, and header/footer heights.
    /// </summary>
    /// <remarks>
    /// If not specified, defaults to A4 portrait with standard margins.
    /// </remarks>
    public PageSettings PageSettings { get; set; } = PageSettings.CreateDefault();

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
    public LayoutNode? Header { get; set; }

    /// <summary>
    /// Gets or sets the main content layout tree.
    /// This is the primary document content that flows across pages.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The content slot is the main body of the document and supports pagination.
    /// When content exceeds the available space on a page (accounting for header
    /// and footer), it automatically flows to subsequent pages.
    /// </para>
    /// <para>
    /// This property is required for document generation.
    /// </para>
    /// </remarks>
    public LayoutNode Content { get; set; } = null!;

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
    /// Set to <c>null</c> if no footer is needed.
    /// </para>
    /// <para>
    /// For page numbers, use expressions like <c>{{ currentPage }}</c> and
    /// <c>{{ totalPages }}</c> in text components within the footer.
    /// </para>
    /// </remarks>
    public LayoutNode? Footer { get; set; }

    /// <summary>
    /// Gets or sets the background layout tree.
    /// The background is rendered behind all other content and spans the entire page.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The background slot is drawn behind the header, content, and footer.
    /// It is not affected by page margins and always occupies the entire page area.
    /// Useful for:
    /// </para>
    /// <list type="bullet">
    ///   <item>Background images or patterns</item>
    ///   <item>Decorative borders</item>
    ///   <item>Watermarks (though Foreground is preferred for overlays)</item>
    /// </list>
    /// <para>
    /// Set to <c>null</c> if no background is needed.
    /// </para>
    /// </remarks>
    public LayoutNode? Background { get; set; }

    /// <summary>
    /// Gets or sets the foreground layout tree.
    /// The foreground is rendered in front of all other content and spans the entire page.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The foreground slot is drawn on top of the header, content, and footer.
    /// It is not affected by page margins and always occupies the entire page area.
    /// Useful for:
    /// </para>
    /// <list type="bullet">
    ///   <item>Watermarks (e.g., "DRAFT", "CONFIDENTIAL")</item>
    ///   <item>Overlay graphics</item>
    ///   <item>Security markings</item>
    /// </list>
    /// <para>
    /// Set to <c>null</c> if no foreground overlay is needed.
    /// </para>
    /// </remarks>
    public LayoutNode? Foreground { get; set; }

    /// <summary>
    /// Gets a value indicating whether this layout has a header defined.
    /// </summary>
    public bool HasHeader => Header is not null;

    /// <summary>
    /// Gets a value indicating whether this layout has a footer defined.
    /// </summary>
    public bool HasFooter => Footer is not null;

    /// <summary>
    /// Gets a value indicating whether this layout has a background defined.
    /// </summary>
    public bool HasBackground => Background is not null;

    /// <summary>
    /// Gets a value indicating whether this layout has a foreground defined.
    /// </summary>
    public bool HasForeground => Foreground is not null;

    /// <summary>
    /// Validates the template layout structure.
    /// </summary>
    /// <returns>A list of validation errors, or an empty list if valid.</returns>
    public IReadOnlyList<string> Validate()
    {
        var errors = new List<string>();

        if (Content is null)
        {
            errors.Add("Content layout tree is required.");
        }

        if (PageSettings is null)
        {
            errors.Add("Page settings are required.");
        }
        else
        {
            // Include page settings validation errors
            errors.AddRange(PageSettings.Validate());

            // Validate header height settings are meaningful
            if (
                PageSettings.HeaderHeight.HasValue
                && PageSettings.HeaderHeight.Value > 0
                && Header is null
            )
            {
                errors.Add(
                    "Header height is specified but no header layout is provided. Remove header height or provide a header layout."
                );
            }

            // Validate footer height settings are meaningful
            if (
                PageSettings.FooterHeight.HasValue
                && PageSettings.FooterHeight.Value > 0
                && Footer is null
            )
            {
                errors.Add(
                    "Footer height is specified but no footer layout is provided. Remove footer height or provide a footer layout."
                );
            }

            // Validate min/max header height settings are meaningful
            if (
                (PageSettings.MinHeaderHeight.HasValue || PageSettings.MaxHeaderHeight.HasValue)
                && Header is null
            )
            {
                errors.Add(
                    "Header height constraints are specified but no header layout is provided."
                );
            }

            // Validate min/max footer height settings are meaningful
            if (
                (PageSettings.MinFooterHeight.HasValue || PageSettings.MaxFooterHeight.HasValue)
                && Footer is null
            )
            {
                errors.Add(
                    "Footer height constraints are specified but no footer layout is provided."
                );
            }

            // Warn about ExtendToFillSpace without fixed height
            if (PageSettings.ExtendHeaderToFillSpace && !PageSettings.HeaderHeight.HasValue)
            {
                // This is a warning rather than an error - the system will still work
                // but ExtendToFillSpace has no effect without a fixed height
            }

            if (PageSettings.ExtendFooterToFillSpace && !PageSettings.FooterHeight.HasValue)
            {
                // This is a warning rather than an error - the system will still work
                // but ExtendToFillSpace has no effect without a fixed height
            }
        }

        // Validate that non-paginating slots don't contain pagination-dependent components
        ValidateNonPaginatingSlot(Header, "Header", errors);
        ValidateNonPaginatingSlot(Footer, "Footer", errors);
        ValidateNonPaginatingSlot(Background, "Background", errors);
        ValidateNonPaginatingSlot(Foreground, "Foreground", errors);

        return errors;
    }

    /// <summary>
    /// Validates that a non-paginating slot doesn't contain pagination-dependent components.
    /// </summary>
    private static void ValidateNonPaginatingSlot(
        LayoutNode? node,
        string slotName,
        List<string> errors
    )
    {
        if (node is null)
        {
            return;
        }

        var paginationComponents = node.GetPaginationDependentComponents();
        if (paginationComponents.Count > 0)
        {
            var componentNames = string.Join(", ", paginationComponents.Select(c => c.ToString()));
            errors.Add(
                $"{slotName} slot contains pagination-dependent components ({componentNames}) which are not supported in non-paginating slots."
            );
        }
    }

    /// <summary>
    /// Creates a simple template layout with only content (no header/footer).
    /// </summary>
    /// <param name="content">The content layout node.</param>
    /// <param name="pageSettings">Optional page settings. Defaults to A4 if not specified.</param>
    /// <returns>A new <see cref="TemplateLayout"/> instance.</returns>
    public static TemplateLayout CreateSimple(LayoutNode content, PageSettings? pageSettings = null)
    {
        return new TemplateLayout
        {
            Content = content,
            PageSettings = pageSettings ?? PageSettings.CreateDefault(),
        };
    }

    /// <summary>
    /// Creates a template layout with header, content, and footer.
    /// </summary>
    /// <param name="header">The header layout node.</param>
    /// <param name="content">The content layout node.</param>
    /// <param name="footer">The footer layout node.</param>
    /// <param name="pageSettings">Optional page settings. Defaults to A4 if not specified.</param>
    /// <returns>A new <see cref="TemplateLayout"/> instance.</returns>
    public static TemplateLayout CreateWithHeaderFooter(
        LayoutNode? header,
        LayoutNode content,
        LayoutNode? footer,
        PageSettings? pageSettings = null
    )
    {
        return new TemplateLayout
        {
            Header = header,
            Content = content,
            Footer = footer,
            PageSettings = pageSettings ?? PageSettings.CreateDefault(),
        };
    }

    /// <summary>
    /// Creates a full template layout with all page slots (background, header, content, footer, foreground).
    /// </summary>
    /// <param name="content">The main content layout node (required).</param>
    /// <param name="header">The header layout node (optional).</param>
    /// <param name="footer">The footer layout node (optional).</param>
    /// <param name="background">The background layout node (optional).</param>
    /// <param name="foreground">The foreground layout node (optional).</param>
    /// <param name="pageSettings">Optional page settings. Defaults to A4 if not specified.</param>
    /// <returns>A new <see cref="TemplateLayout"/> instance with all slots configured.</returns>
    public static TemplateLayout CreateFull(
        LayoutNode content,
        LayoutNode? header = null,
        LayoutNode? footer = null,
        LayoutNode? background = null,
        LayoutNode? foreground = null,
        PageSettings? pageSettings = null
    )
    {
        return new TemplateLayout
        {
            Content = content,
            Header = header,
            Footer = footer,
            Background = background,
            Foreground = foreground,
            PageSettings = pageSettings ?? PageSettings.CreateDefault(),
        };
    }

    /// <summary>
    /// Creates a deep clone of this template layout.
    /// </summary>
    /// <returns>A new <see cref="TemplateLayout"/> instance that is a deep clone of this one.</returns>
    public TemplateLayout Clone()
    {
        return new TemplateLayout
        {
            PageSettings = new PageSettings
            {
                PageSize = PageSettings.PageSize,
                Width = PageSettings.Width,
                Height = PageSettings.Height,
                Orientation = PageSettings.Orientation,
                Margin = PageSettings.Margin,
                MarginTop = PageSettings.MarginTop,
                MarginRight = PageSettings.MarginRight,
                MarginBottom = PageSettings.MarginBottom,
                MarginLeft = PageSettings.MarginLeft,
                HeaderHeight = PageSettings.HeaderHeight,
                MinHeaderHeight = PageSettings.MinHeaderHeight,
                MaxHeaderHeight = PageSettings.MaxHeaderHeight,
                FooterHeight = PageSettings.FooterHeight,
                MinFooterHeight = PageSettings.MinFooterHeight,
                MaxFooterHeight = PageSettings.MaxFooterHeight,
                ExtendHeaderToFillSpace = PageSettings.ExtendHeaderToFillSpace,
                ExtendFooterToFillSpace = PageSettings.ExtendFooterToFillSpace,
                BackgroundColor = PageSettings.BackgroundColor,
                ContinuousMode = PageSettings.ContinuousMode,
                ContentDirection = PageSettings.ContentDirection,
            },
            Header = Header?.Clone(),
            Content = Content?.Clone()!,
            Footer = Footer?.Clone(),
            Background = Background?.Clone(),
            Foreground = Foreground?.Clone(),
        };
    }
}
