namespace PDFBuilder.Core.Domain;

/// <summary>
/// Represents page configuration settings for PDF generation.
/// Defines page size, orientation, margins, header/footer heights, and other page-level properties.
/// </summary>
public class PageSettings
{
    /// <summary>
    /// Gets or sets the page size preset (e.g., "A4", "Letter", "Legal").
    /// When specified, <see cref="Width"/> and <see cref="Height"/> are ignored.
    /// </summary>
    /// <remarks>
    /// Supported presets: A0-A10, B0-B10, Letter, Legal, Ledger, Tabloid, Executive, etc.
    /// </remarks>
    public string? PageSize { get; set; }

    /// <summary>
    /// Gets or sets custom page width in points (1 inch = 72 points).
    /// Only used when <see cref="PageSize"/> is not specified or is "Custom".
    /// </summary>
    public float? Width { get; set; }

    /// <summary>
    /// Gets or sets custom page height in points (1 inch = 72 points).
    /// Only used when <see cref="PageSize"/> is not specified or is "Custom".
    /// </summary>
    public float? Height { get; set; }

    /// <summary>
    /// Gets or sets the page orientation.
    /// </summary>
    public PageOrientation Orientation { get; set; } = PageOrientation.Portrait;

    /// <summary>
    /// Gets or sets the uniform margin applied to all sides in points.
    /// Individual margin properties take precedence when specified.
    /// </summary>
    public float? Margin { get; set; }

    /// <summary>
    /// Gets or sets the top margin in points.
    /// </summary>
    public float? MarginTop { get; set; }

    /// <summary>
    /// Gets or sets the right margin in points.
    /// </summary>
    public float? MarginRight { get; set; }

    /// <summary>
    /// Gets or sets the bottom margin in points.
    /// </summary>
    public float? MarginBottom { get; set; }

    /// <summary>
    /// Gets or sets the left margin in points.
    /// </summary>
    public float? MarginLeft { get; set; }

    /// <summary>
    /// Gets or sets the fixed height for the header slot in points.
    /// When specified, the header area will have a fixed height.
    /// If null, header height is determined by its content.
    /// </summary>
    /// <remarks>
    /// The header repeats on every page. Setting a fixed height ensures
    /// consistent layout across all pages.
    /// </remarks>
    public float? HeaderHeight { get; set; }

    /// <summary>
    /// Gets or sets the minimum height for the header slot in points.
    /// Used when header height is content-driven but needs a minimum.
    /// </summary>
    public float? MinHeaderHeight { get; set; }

    /// <summary>
    /// Gets or sets the maximum height for the header slot in points.
    /// Used to limit header expansion when height is content-driven.
    /// </summary>
    public float? MaxHeaderHeight { get; set; }

    /// <summary>
    /// Gets or sets the fixed height for the footer slot in points.
    /// When specified, the footer area will have a fixed height.
    /// If null, footer height is determined by its content.
    /// </summary>
    /// <remarks>
    /// The footer repeats on every page. Setting a fixed height ensures
    /// consistent layout across all pages.
    /// </remarks>
    public float? FooterHeight { get; set; }

    /// <summary>
    /// Gets or sets the minimum height for the footer slot in points.
    /// Used when footer height is content-driven but needs a minimum.
    /// </summary>
    public float? MinFooterHeight { get; set; }

    /// <summary>
    /// Gets or sets the maximum height for the footer slot in points.
    /// Used to limit footer expansion when height is content-driven.
    /// </summary>
    public float? MaxFooterHeight { get; set; }

    /// <summary>
    /// Gets or sets whether to extend the header to fill allocated space.
    /// When true, header content will extend to fill the HeaderHeight.
    /// </summary>
    public bool ExtendHeaderToFillSpace { get; set; }

    /// <summary>
    /// Gets or sets whether to extend the footer to fill allocated space.
    /// When true, footer content will extend to fill the FooterHeight.
    /// </summary>
    public bool ExtendFooterToFillSpace { get; set; }

    /// <summary>
    /// Gets or sets the background color for all pages in hex format (e.g., "#FFFFFF").
    /// </summary>
    public string? BackgroundColor { get; set; }

    /// <summary>
    /// Gets or sets whether continuous page mode is enabled.
    /// In continuous mode, the page height adjusts to content with no page breaks.
    /// </summary>
    public bool ContinuousMode { get; set; }

    /// <summary>
    /// Gets or sets the content direction for the page.
    /// </summary>
    public ContentDirection ContentDirection { get; set; } = ContentDirection.LeftToRight;

    /// <summary>
    /// Gets the effective top margin, considering uniform margin fallback.
    /// </summary>
    public float EffectiveMarginTop => MarginTop ?? Margin ?? DefaultMargin;

    /// <summary>
    /// Gets the effective right margin, considering uniform margin fallback.
    /// </summary>
    public float EffectiveMarginRight => MarginRight ?? Margin ?? DefaultMargin;

    /// <summary>
    /// Gets the effective bottom margin, considering uniform margin fallback.
    /// </summary>
    public float EffectiveMarginBottom => MarginBottom ?? Margin ?? DefaultMargin;

    /// <summary>
    /// Gets the effective left margin, considering uniform margin fallback.
    /// </summary>
    public float EffectiveMarginLeft => MarginLeft ?? Margin ?? DefaultMargin;

    /// <summary>
    /// Gets the effective header height, applying min/max constraints if specified.
    /// Returns null if header height is purely content-driven.
    /// </summary>
    /// <param name="contentDrivenHeight">The actual height determined by content (optional).</param>
    /// <returns>The constrained header height.</returns>
    public float? GetEffectiveHeaderHeight(float? contentDrivenHeight = null)
    {
        // Fixed height takes precedence
        if (HeaderHeight.HasValue)
        {
            return HeaderHeight.Value;
        }

        // If content-driven height is provided, apply constraints
        if (contentDrivenHeight.HasValue)
        {
            var height = contentDrivenHeight.Value;
            if (MinHeaderHeight.HasValue && height < MinHeaderHeight.Value)
            {
                height = MinHeaderHeight.Value;
            }
            if (MaxHeaderHeight.HasValue && height > MaxHeaderHeight.Value)
            {
                height = MaxHeaderHeight.Value;
            }
            return height;
        }

        // Return minimum if specified
        return MinHeaderHeight;
    }

    /// <summary>
    /// Gets the effective footer height, applying min/max constraints if specified.
    /// Returns null if footer height is purely content-driven.
    /// </summary>
    /// <param name="contentDrivenHeight">The actual height determined by content (optional).</param>
    /// <returns>The constrained footer height.</returns>
    public float? GetEffectiveFooterHeight(float? contentDrivenHeight = null)
    {
        // Fixed height takes precedence
        if (FooterHeight.HasValue)
        {
            return FooterHeight.Value;
        }

        // If content-driven height is provided, apply constraints
        if (contentDrivenHeight.HasValue)
        {
            var height = contentDrivenHeight.Value;
            if (MinFooterHeight.HasValue && height < MinFooterHeight.Value)
            {
                height = MinFooterHeight.Value;
            }
            if (MaxFooterHeight.HasValue && height > MaxFooterHeight.Value)
            {
                height = MaxFooterHeight.Value;
            }
            return height;
        }

        // Return minimum if specified
        return MinFooterHeight;
    }

    /// <summary>
    /// Validates the page settings and returns any validation errors.
    /// </summary>
    /// <returns>A list of validation error messages.</returns>
    public IReadOnlyList<string> Validate()
    {
        var errors = new List<string>();

        // Validate page dimensions
        if (Width.HasValue && Width.Value <= 0)
        {
            errors.Add("Page width must be greater than zero.");
        }

        if (Height.HasValue && Height.Value <= 0)
        {
            errors.Add("Page height must be greater than zero.");
        }

        // Validate header height constraints
        if (HeaderHeight.HasValue && HeaderHeight.Value < 0)
        {
            errors.Add("Header height cannot be negative.");
        }

        if (MinHeaderHeight.HasValue && MinHeaderHeight.Value < 0)
        {
            errors.Add("Minimum header height cannot be negative.");
        }

        if (MaxHeaderHeight.HasValue && MaxHeaderHeight.Value < 0)
        {
            errors.Add("Maximum header height cannot be negative.");
        }

        if (
            MinHeaderHeight.HasValue
            && MaxHeaderHeight.HasValue
            && MinHeaderHeight.Value > MaxHeaderHeight.Value
        )
        {
            errors.Add("Minimum header height cannot be greater than maximum header height.");
        }

        if (
            HeaderHeight.HasValue
            && MinHeaderHeight.HasValue
            && HeaderHeight.Value < MinHeaderHeight.Value
        )
        {
            errors.Add("Fixed header height cannot be less than minimum header height.");
        }

        if (
            HeaderHeight.HasValue
            && MaxHeaderHeight.HasValue
            && HeaderHeight.Value > MaxHeaderHeight.Value
        )
        {
            errors.Add("Fixed header height cannot be greater than maximum header height.");
        }

        // Validate footer height constraints
        if (FooterHeight.HasValue && FooterHeight.Value < 0)
        {
            errors.Add("Footer height cannot be negative.");
        }

        if (MinFooterHeight.HasValue && MinFooterHeight.Value < 0)
        {
            errors.Add("Minimum footer height cannot be negative.");
        }

        if (MaxFooterHeight.HasValue && MaxFooterHeight.Value < 0)
        {
            errors.Add("Maximum footer height cannot be negative.");
        }

        if (
            MinFooterHeight.HasValue
            && MaxFooterHeight.HasValue
            && MinFooterHeight.Value > MaxFooterHeight.Value
        )
        {
            errors.Add("Minimum footer height cannot be greater than maximum footer height.");
        }

        if (
            FooterHeight.HasValue
            && MinFooterHeight.HasValue
            && FooterHeight.Value < MinFooterHeight.Value
        )
        {
            errors.Add("Fixed footer height cannot be less than minimum footer height.");
        }

        if (
            FooterHeight.HasValue
            && MaxFooterHeight.HasValue
            && FooterHeight.Value > MaxFooterHeight.Value
        )
        {
            errors.Add("Fixed footer height cannot be greater than maximum footer height.");
        }

        // Validate margins
        if (Margin.HasValue && Margin.Value < 0)
        {
            errors.Add("Margin cannot be negative.");
        }

        if (MarginTop.HasValue && MarginTop.Value < 0)
        {
            errors.Add("Top margin cannot be negative.");
        }

        if (MarginRight.HasValue && MarginRight.Value < 0)
        {
            errors.Add("Right margin cannot be negative.");
        }

        if (MarginBottom.HasValue && MarginBottom.Value < 0)
        {
            errors.Add("Bottom margin cannot be negative.");
        }

        if (MarginLeft.HasValue && MarginLeft.Value < 0)
        {
            errors.Add("Left margin cannot be negative.");
        }

        return errors;
    }

    /// <summary>
    /// Gets the default margin value in points (approximately 0.5 inch).
    /// </summary>
    public const float DefaultMargin = 36f;

    /// <summary>
    /// Gets the default page width for A4 in points.
    /// </summary>
    public const float DefaultWidth = 595f;

    /// <summary>
    /// Gets the default page height for A4 in points.
    /// </summary>
    public const float DefaultHeight = 842f;

    /// <summary>
    /// Creates a default page settings instance with A4 size and standard margins.
    /// </summary>
    /// <returns>A new <see cref="PageSettings"/> instance with default values.</returns>
    public static PageSettings CreateDefault()
    {
        return new PageSettings
        {
            PageSize = "A4",
            Orientation = PageOrientation.Portrait,
            Margin = DefaultMargin,
            ContentDirection = ContentDirection.LeftToRight,
        };
    }

    /// <summary>
    /// Creates page settings for a continuous (receipt-style) document.
    /// </summary>
    /// <param name="width">The page width in points.</param>
    /// <returns>A new <see cref="PageSettings"/> instance configured for continuous mode.</returns>
    public static PageSettings CreateContinuous(float width = 215f)
    {
        return new PageSettings
        {
            Width = width,
            ContinuousMode = true,
            Margin = 10f,
        };
    }
}
