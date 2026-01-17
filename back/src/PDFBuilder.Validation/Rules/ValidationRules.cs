namespace PDFBuilder.Validation.Rules;

/// <summary>
/// Provides shared validation rules used across multiple validators.
/// These rules encapsulate common validation patterns for reuse.
/// </summary>
public static class ValidationRules
{
    #region Size Constraints

    /// <summary>
    /// Minimum allowed font size in points.
    /// </summary>
    public const float MinFontSize = 1f;

    /// <summary>
    /// Maximum allowed font size in points.
    /// </summary>
    public const float MaxFontSize = 1000f;

    /// <summary>
    /// Minimum allowed dimension value in points.
    /// </summary>
    public const float MinDimension = 0f;

    /// <summary>
    /// Maximum allowed dimension value in points.
    /// </summary>
    public const float MaxDimension = 10000f;

    /// <summary>
    /// Maximum margin value in points.
    /// </summary>
    public const float MaxMargin = 500f;

    /// <summary>
    /// Maximum padding value in points.
    /// </summary>
    public const float MaxPadding = 500f;

    /// <summary>
    /// Maximum border thickness in points.
    /// </summary>
    public const float MaxBorderThickness = 100f;

    /// <summary>
    /// Maximum corner radius in points.
    /// </summary>
    public const float MaxCornerRadius = 500f;

    /// <summary>
    /// Maximum line height multiplier.
    /// </summary>
    public const float MaxLineHeight = 10f;

    /// <summary>
    /// Minimum line height multiplier.
    /// </summary>
    public const float MinLineHeight = 0.1f;

    /// <summary>
    /// Maximum letter spacing in points.
    /// </summary>
    public const float MaxLetterSpacing = 100f;

    /// <summary>
    /// Minimum letter spacing in points.
    /// </summary>
    public const float MinLetterSpacing = -100f;

    #endregion

    #region Tree Constraints

    /// <summary>
    /// Maximum depth allowed for nested layout trees.
    /// </summary>
    public const int MaxTreeDepth = 50;

    /// <summary>
    /// Maximum number of children allowed in a single container.
    /// </summary>
    public const int MaxChildrenCount = 500;

    /// <summary>
    /// Maximum depth for data object structure.
    /// </summary>
    public const int MaxDataDepth = 20;

    /// <summary>
    /// Maximum number of array elements in data objects.
    /// </summary>
    public const int MaxArrayElements = 10000;

    #endregion

    #region String Length Constraints

    /// <summary>
    /// Maximum length for node IDs.
    /// </summary>
    public const int MaxNodeIdLength = 100;

    /// <summary>
    /// Maximum length for expression strings.
    /// </summary>
    public const int MaxExpressionLength = 500;

    /// <summary>
    /// Maximum length for variable names.
    /// </summary>
    public const int MaxVariableNameLength = 50;

    /// <summary>
    /// Maximum length for font family names.
    /// </summary>
    public const int MaxFontFamilyLength = 100;

    /// <summary>
    /// Maximum length for URLs.
    /// </summary>
    public const int MaxUrlLength = 2000;

    /// <summary>
    /// Maximum length for filenames.
    /// </summary>
    public const int MaxFilenameLength = 200;

    /// <summary>
    /// Maximum length for titles.
    /// </summary>
    public const int MaxTitleLength = 500;

    #endregion

    #region Validation Methods

    /// <summary>
    /// Validates that a string is a valid hex color format.
    /// Supports #RGB, #RRGGBB, and #AARRGGBB formats.
    /// </summary>
    /// <param name="value">The color string to validate.</param>
    /// <returns>True if the string is a valid hex color; otherwise, false.</returns>
    public static bool IsValidHexColor(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return false;

        if (!value.StartsWith('#'))
            return false;

        var hex = value[1..];
        return (hex.Length == 3 || hex.Length == 6 || hex.Length == 8)
            && hex.All(c => char.IsAsciiHexDigit(c));
    }

    /// <summary>
    /// Validates that a string is a valid color (hex or named color).
    /// </summary>
    /// <param name="value">The color string to validate.</param>
    /// <returns>True if the string is a valid color; otherwise, false.</returns>
    public static bool IsValidColor(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return false;

        if (IsValidHexColor(value))
            return true;

        // Check common color names
        return CommonColorNames.Contains(value);
    }

    /// <summary>
    /// Validates that a string is a valid expression format ({{ ... }}).
    /// </summary>
    /// <param name="value">The string to validate.</param>
    /// <returns>True if the string is an expression; otherwise, false.</returns>
    public static bool IsExpression(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return false;

        var trimmed = value.Trim();
        return trimmed.Contains("{{") && trimmed.Contains("}}");
    }

    /// <summary>
    /// Validates that a string is a valid identifier (variable name).
    /// </summary>
    /// <param name="value">The string to validate.</param>
    /// <returns>True if the string is a valid identifier; otherwise, false.</returns>
    public static bool IsValidIdentifier(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return false;

        if (char.IsDigit(value[0]))
            return false;

        return value.All(c => char.IsLetterOrDigit(c) || c == '_');
    }

    /// <summary>
    /// Validates that a string is a valid URL or data URI.
    /// </summary>
    /// <param name="value">The string to validate.</param>
    /// <returns>True if the string is a valid URL or data URI; otherwise, false.</returns>
    public static bool IsValidUrlOrDataUri(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return false;

        if (value.StartsWith("data:"))
            return true;

        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && (uri.Scheme == "http" || uri.Scheme == "https");
    }

    /// <summary>
    /// Validates that a numeric value is within an inclusive range.
    /// </summary>
    /// <param name="value">The value to validate.</param>
    /// <param name="min">The minimum allowed value.</param>
    /// <param name="max">The maximum allowed value.</param>
    /// <returns>True if the value is within range; otherwise, false.</returns>
    public static bool IsInRange(float value, float min, float max)
    {
        return value >= min && value <= max;
    }

    /// <summary>
    /// Validates that a numeric value is positive (greater than 0).
    /// </summary>
    /// <param name="value">The value to validate.</param>
    /// <returns>True if the value is positive; otherwise, false.</returns>
    public static bool IsPositive(float value)
    {
        return value > 0;
    }

    /// <summary>
    /// Validates that a numeric value is non-negative (greater than or equal to 0).
    /// </summary>
    /// <param name="value">The value to validate.</param>
    /// <returns>True if the value is non-negative; otherwise, false.</returns>
    public static bool IsNonNegative(float value)
    {
        return value >= 0;
    }

    #endregion

    #region Common Values

    /// <summary>
    /// Common color names that are recognized.
    /// </summary>
    public static readonly HashSet<string> CommonColorNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "black",
        "white",
        "red",
        "green",
        "blue",
        "yellow",
        "orange",
        "purple",
        "pink",
        "brown",
        "gray",
        "grey",
        "transparent",
        "cyan",
        "magenta",
        "navy",
        "teal",
        "olive",
        "maroon",
        "aqua",
        "lime",
        "fuchsia",
        "silver",
    };

    /// <summary>
    /// Valid font weight values.
    /// </summary>
    public static readonly HashSet<string> ValidFontWeights = new(StringComparer.OrdinalIgnoreCase)
    {
        "Thin",
        "ExtraLight",
        "Light",
        "Normal",
        "Regular",
        "Medium",
        "SemiBold",
        "Bold",
        "ExtraBold",
        "Black",
        "Heavy",
        "100",
        "200",
        "300",
        "400",
        "500",
        "600",
        "700",
        "800",
        "900",
    };

    /// <summary>
    /// Valid font style values.
    /// </summary>
    public static readonly HashSet<string> ValidFontStyles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Normal",
        "Italic",
        "Oblique",
    };

    /// <summary>
    /// Valid text alignment values.
    /// </summary>
    public static readonly HashSet<string> ValidTextAlignments = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Left",
        "Center",
        "Right",
        "Justify",
        "Start",
        "End",
    };

    /// <summary>
    /// Valid horizontal alignment values.
    /// </summary>
    public static readonly HashSet<string> ValidHorizontalAlignments = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Left",
        "Center",
        "Right",
        "Start",
        "End",
    };

    /// <summary>
    /// Valid vertical alignment values.
    /// </summary>
    public static readonly HashSet<string> ValidVerticalAlignments = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        "Top",
        "Middle",
        "Center",
        "Bottom",
    };

    /// <summary>
    /// Valid page size presets.
    /// </summary>
    public static readonly HashSet<string> ValidPageSizes = new(StringComparer.OrdinalIgnoreCase)
    {
        "A0",
        "A1",
        "A2",
        "A3",
        "A4",
        "A5",
        "A6",
        "A7",
        "A8",
        "A9",
        "A10",
        "B0",
        "B1",
        "B2",
        "B3",
        "B4",
        "B5",
        "B6",
        "B7",
        "B8",
        "B9",
        "B10",
        "Letter",
        "Legal",
        "Tabloid",
        "Ledger",
        "Executive",
        "Folio",
        "Quarto",
        "Statement",
        "Custom",
    };

    /// <summary>
    /// Valid page orientation values.
    /// </summary>
    public static readonly HashSet<string> ValidOrientations = new(StringComparer.OrdinalIgnoreCase)
    {
        "Portrait",
        "Landscape",
    };

    /// <summary>
    /// Valid unit values for dimensions.
    /// </summary>
    public static readonly HashSet<string> ValidUnits = new(StringComparer.OrdinalIgnoreCase)
    {
        "Point",
        "Points",
        "Pt",
        "Inch",
        "Inches",
        "In",
        "Centimeter",
        "Centimeters",
        "Cm",
        "Millimeter",
        "Millimeters",
        "Mm",
        "Percent",
        "%",
    };

    #endregion

    #region Template Validation Rules

    /// <summary>
    /// Pattern for valid template names.
    /// Allows letters, numbers, spaces, hyphens, underscores, and parentheses.
    /// </summary>
    private static readonly System.Text.RegularExpressions.Regex ValidTemplateNamePattern = new(
        @"^[\p{L}\p{N}\s\-_()]+$",
        System.Text.RegularExpressions.RegexOptions.Compiled
    );

    /// <summary>
    /// Pattern for valid category names.
    /// Allows letters, numbers, spaces, hyphens, and underscores.
    /// </summary>
    private static readonly System.Text.RegularExpressions.Regex ValidCategoryPattern = new(
        @"^[\p{L}\p{N}\s\-_]+$",
        System.Text.RegularExpressions.RegexOptions.Compiled
    );

    /// <summary>
    /// Pattern for valid tag values.
    /// Tags should be comma-separated values containing letters, numbers, spaces, and hyphens.
    /// </summary>
    private static readonly System.Text.RegularExpressions.Regex ValidTagPattern = new(
        @"^[\p{L}\p{N}\-]+$",
        System.Text.RegularExpressions.RegexOptions.Compiled
    );

    /// <summary>
    /// Validates that a string is a valid template name.
    /// </summary>
    /// <param name="name">The template name to validate.</param>
    /// <returns>True if the name is valid; otherwise, false.</returns>
    public static bool BeValidTemplateName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return true; // Let Required/NotEmpty handle empty values
        }

        return ValidTemplateNamePattern.IsMatch(name);
    }

    /// <summary>
    /// Validates that a string is a valid category name.
    /// </summary>
    /// <param name="category">The category to validate.</param>
    /// <returns>True if the category is valid; otherwise, false.</returns>
    public static bool BeValidCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
        {
            return true; // Categories are optional
        }

        return ValidCategoryPattern.IsMatch(category);
    }

    /// <summary>
    /// Validates that a string contains valid tags.
    /// Tags should be comma-separated values.
    /// </summary>
    /// <param name="tags">The tags string to validate.</param>
    /// <returns>True if the tags are valid; otherwise, false.</returns>
    public static bool BeValidTags(string? tags)
    {
        if (string.IsNullOrWhiteSpace(tags))
        {
            return true; // Tags are optional
        }

        var tagList = tags.Split(',', StringSplitOptions.RemoveEmptyEntries);

        foreach (var tag in tagList)
        {
            var trimmedTag = tag.Trim();
            if (string.IsNullOrWhiteSpace(trimmedTag))
            {
                continue;
            }

            if (!ValidTagPattern.IsMatch(trimmedTag))
            {
                return false;
            }
        }

        return true;
    }

    #endregion
}
