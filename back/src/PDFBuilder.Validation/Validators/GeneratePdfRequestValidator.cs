using System.Text.Json;
using FluentValidation;
using PDFBuilder.Contracts.DTOs;
using PDFBuilder.Contracts.Requests;

namespace PDFBuilder.Validation.Validators;

/// <summary>
/// FluentValidation validator for GeneratePdfRequest.
/// Validates the complete PDF generation request including layout structure,
/// data context, and generation options.
/// </summary>
public sealed class GeneratePdfRequestValidator : AbstractValidator<GeneratePdfRequest>
{
    /// <summary>
    /// Maximum size for the data object (10 MB).
    /// </summary>
    private const int MaxDataSizeBytes = 10 * 1024 * 1024;

    /// <summary>
    /// Maximum depth for the data object structure.
    /// </summary>
    private const int MaxDataDepth = 20;

    /// <summary>
    /// Maximum number of array elements in the data object.
    /// </summary>
    private const int MaxArrayElements = 10000;

    /// <summary>
    /// Initializes a new instance of the <see cref="GeneratePdfRequestValidator"/> class.
    /// </summary>
    public GeneratePdfRequestValidator()
    {
        // Validate that TemplateLayout is provided and has valid content
        RuleFor(x => x.TemplateLayout).NotNull().WithMessage("TemplateLayout is required");

        RuleFor(x => x)
            .Must(x => x.HasValidLayout())
            .WithMessage("TemplateLayout must contain a valid 'Content' layout");

        // Validate TemplateLayout structure
        RuleFor(x => x.TemplateLayout)
            .SetValidator(new TemplateLayoutValidator()!)
            .When(x => x.TemplateLayout != null);

        // Validate Data object structure
        RuleFor(x => x.Data)
            .Custom(
                (data, context) =>
                {
                    if (
                        !data.HasValue
                        || data.Value.ValueKind == JsonValueKind.Undefined
                        || data.Value.ValueKind == JsonValueKind.Null
                    )
                        return;

                    // Check data size
                    var estimatedSize = EstimateJsonSize(data.Value);
                    if (estimatedSize > MaxDataSizeBytes)
                    {
                        context.AddFailure(
                            "Data",
                            $"Data object exceeds maximum size of {MaxDataSizeBytes / (1024 * 1024)} MB"
                        );
                        return;
                    }

                    var dataErrors = ValidateDataObject(data.Value, "$data", 0);
                    foreach (var error in dataErrors)
                    {
                        context.AddFailure("Data", error);
                    }
                }
            );

        // Validate Filename
        RuleFor(x => x.Filename)
            .MaximumLength(200)
            .WithMessage("Filename cannot exceed 200 characters")
            .Matches(@"^[a-zA-Z0-9\-_]+$")
            .WithMessage("Filename can only contain letters, numbers, hyphens, and underscores")
            .When(x => !string.IsNullOrEmpty(x.Filename));

        // Validate Metadata
        RuleFor(x => x.Metadata)
            .SetValidator(new PdfMetadataValidator()!)
            .When(x => x.Metadata != null);

        // Validate Options
        RuleFor(x => x.Options)
            .SetValidator(new GenerationOptionsValidator()!)
            .When(x => x.Options != null);
    }

    /// <summary>
    /// Validates the data object structure recursively.
    /// </summary>
    private static List<string> ValidateDataObject(JsonElement element, string path, int depth)
    {
        var errors = new List<string>();

        // Check depth
        if (depth > MaxDataDepth)
        {
            errors.Add(
                $"Data object exceeds maximum nesting depth of {MaxDataDepth} at path: {path}"
            );
            return errors;
        }

        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                {
                    var propertyPath = $"{path}.{property.Name}";

                    // Validate property name
                    if (string.IsNullOrWhiteSpace(property.Name))
                    {
                        errors.Add($"Empty property name found at path: {path}");
                        continue;
                    }

                    // Check for potentially problematic property names
                    if (
                        property.Name.Contains("__proto__") || property.Name.Contains("constructor")
                    )
                    {
                        errors.Add(
                            $"Property name '{property.Name}' is not allowed at path: {path}"
                        );
                        continue;
                    }

                    errors.AddRange(ValidateDataObject(property.Value, propertyPath, depth + 1));
                }
                break;

            case JsonValueKind.Array:
                var arrayLength = element.GetArrayLength();
                if (arrayLength > MaxArrayElements)
                {
                    errors.Add(
                        $"Array at path {path} exceeds maximum element count of {MaxArrayElements}"
                    );
                    return errors;
                }

                int index = 0;
                foreach (var item in element.EnumerateArray())
                {
                    var itemPath = $"{path}[{index}]";
                    errors.AddRange(ValidateDataObject(item, itemPath, depth + 1));
                    index++;
                }
                break;

            case JsonValueKind.String:
                var stringValue = element.GetString();
                // Check for extremely large strings
                if (stringValue != null && stringValue.Length > 1_000_000)
                {
                    errors.Add(
                        $"String value at path {path} exceeds maximum length of 1,000,000 characters"
                    );
                }
                break;

            case JsonValueKind.Number:
            case JsonValueKind.True:
            case JsonValueKind.False:
            case JsonValueKind.Null:
                // These are all valid
                break;

            case JsonValueKind.Undefined:
                errors.Add($"Undefined value found at path: {path}");
                break;
        }

        return errors;
    }

    /// <summary>
    /// Estimates the size of a JsonElement in bytes.
    /// </summary>
    public static long EstimateJsonSize(JsonElement element)
    {
        return element.GetRawText().Length * 2; // Approximate UTF-16 size
    }
}

/// <summary>
/// Validator for PageSettingsDto.
/// </summary>
public sealed class PageSettingsValidator : AbstractValidator<PageSettingsDto>
{
    /// <summary>
    /// Valid page size presets.
    /// </summary>
    private static readonly HashSet<string> ValidPageSizes = new(StringComparer.OrdinalIgnoreCase)
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
        "Half Letter",
        "JisB0",
        "JisB1",
        "JisB2",
        "JisB3",
        "JisB4",
        "JisB5",
        "JisB6",
        "JisB7",
        "JisB8",
        "JisB9",
        "Custom",
        "PostA4",
        "PostA5",
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="PageSettingsValidator"/> class.
    /// </summary>
    public PageSettingsValidator()
    {
        // PageSize - enum validation
        RuleFor(x => x.PageSize)
            .MaximumLength(50)
            .Must(BeValidPageSize)
            .WithMessage(x =>
                $"Invalid page size '{x.PageSize}'. Valid values: A4, Letter, Legal, Custom, etc."
            )
            .When(x => !string.IsNullOrEmpty(x.PageSize));

        // Width - required if PageSize is Custom, must be in valid range
        RuleFor(x => x.Width)
            .InclusiveBetween(72f, 10000f)
            .WithMessage("Page width must be between 72 and 10000 points (1-138.9 inches)")
            .When(x => x.Width.HasValue);

        // Height - required if PageSize is Custom, must be in valid range
        RuleFor(x => x.Height)
            .InclusiveBetween(72f, 10000f)
            .WithMessage("Page height must be between 72 and 10000 points (1-138.9 inches)")
            .When(x => x.Height.HasValue);

        // Custom page size requires both width and height
        RuleFor(x => x)
            .Must(x => x.Width.HasValue && x.Height.HasValue)
            .WithMessage("Both Width and Height must be specified when using custom page size")
            .When(x => string.Equals(x.PageSize, "Custom", StringComparison.OrdinalIgnoreCase));

        // Orientation - enum validation
        RuleFor(x => x.Orientation)
            .Must(BeValidOrientation)
            .WithMessage("Orientation must be 'Portrait' or 'Landscape'")
            .When(x => !string.IsNullOrEmpty(x.Orientation));

        // Margins
        RuleFor(x => x.Margin)
            .InclusiveBetween(0f, 500f)
            .WithMessage("Margin must be between 0 and 500 points")
            .When(x => x.Margin.HasValue);

        RuleFor(x => x.MarginTop)
            .InclusiveBetween(0f, 500f)
            .WithMessage("MarginTop must be between 0 and 500 points")
            .When(x => x.MarginTop.HasValue);

        RuleFor(x => x.MarginRight)
            .InclusiveBetween(0f, 500f)
            .WithMessage("MarginRight must be between 0 and 500 points")
            .When(x => x.MarginRight.HasValue);

        RuleFor(x => x.MarginBottom)
            .InclusiveBetween(0f, 500f)
            .WithMessage("MarginBottom must be between 0 and 500 points")
            .When(x => x.MarginBottom.HasValue);

        RuleFor(x => x.MarginLeft)
            .InclusiveBetween(0f, 500f)
            .WithMessage("MarginLeft must be between 0 and 500 points")
            .When(x => x.MarginLeft.HasValue);

        // BackgroundColor - format validation
        RuleFor(x => x.BackgroundColor)
            .Must(BeValidColor)
            .WithMessage(x =>
                $"Invalid background color format '{x.BackgroundColor}'. Use hex format (#RGB, #RRGGBB, or #AARRGGBB)"
            )
            .When(x => !string.IsNullOrEmpty(x.BackgroundColor));

        // PageNumberFormat
        RuleFor(x => x.PageNumberFormat)
            .MaximumLength(100)
            .WithMessage("Page number format cannot exceed 100 characters")
            .When(x => !string.IsNullOrEmpty(x.PageNumberFormat));

        // Header height validation
        RuleFor(x => x.HeaderHeight)
            .InclusiveBetween(0f, 500f)
            .WithMessage("HeaderHeight must be between 0 and 500 points")
            .When(x => x.HeaderHeight.HasValue);

        RuleFor(x => x.MinHeaderHeight)
            .InclusiveBetween(0f, 500f)
            .WithMessage("MinHeaderHeight must be between 0 and 500 points")
            .When(x => x.MinHeaderHeight.HasValue);

        RuleFor(x => x.MaxHeaderHeight)
            .InclusiveBetween(0f, 500f)
            .WithMessage("MaxHeaderHeight must be between 0 and 500 points")
            .When(x => x.MaxHeaderHeight.HasValue);

        // Footer height validation
        RuleFor(x => x.FooterHeight)
            .InclusiveBetween(0f, 500f)
            .WithMessage("FooterHeight must be between 0 and 500 points")
            .When(x => x.FooterHeight.HasValue);

        RuleFor(x => x.MinFooterHeight)
            .InclusiveBetween(0f, 500f)
            .WithMessage("MinFooterHeight must be between 0 and 500 points")
            .When(x => x.MinFooterHeight.HasValue);

        RuleFor(x => x.MaxFooterHeight)
            .InclusiveBetween(0f, 500f)
            .WithMessage("MaxFooterHeight must be between 0 and 500 points")
            .When(x => x.MaxFooterHeight.HasValue);
    }

    private static bool BeValidPageSize(string? value)
    {
        return string.IsNullOrEmpty(value) || ValidPageSizes.Contains(value);
    }

    private static bool BeValidOrientation(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return true;

        return value.Equals("Portrait", StringComparison.OrdinalIgnoreCase)
            || value.Equals("Landscape", StringComparison.OrdinalIgnoreCase);
    }

    private static bool BeValidColor(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return true;

        // Check hex format
        if (value.StartsWith('#'))
        {
            var hex = value[1..];
            return (hex.Length == 3 || hex.Length == 6 || hex.Length == 8)
                && hex.All(c => char.IsAsciiHexDigit(c));
        }

        return false;
    }
}

/// <summary>
/// Validator for PdfMetadataDto.
/// </summary>
public sealed class PdfMetadataValidator : AbstractValidator<PdfMetadataDto>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PdfMetadataValidator"/> class.
    /// </summary>
    public PdfMetadataValidator()
    {
        RuleFor(x => x.Title)
            .MaximumLength(500)
            .WithMessage("Title cannot exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.Title));

        RuleFor(x => x.Author)
            .MaximumLength(200)
            .WithMessage("Author cannot exceed 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Author));

        RuleFor(x => x.Subject)
            .MaximumLength(500)
            .WithMessage("Subject cannot exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.Subject));

        RuleFor(x => x.Keywords)
            .MaximumLength(500)
            .WithMessage("Keywords cannot exceed 500 characters")
            .When(x => !string.IsNullOrEmpty(x.Keywords));

        RuleFor(x => x.Creator)
            .MaximumLength(200)
            .WithMessage("Creator cannot exceed 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Creator));

        RuleFor(x => x.Producer)
            .MaximumLength(200)
            .WithMessage("Producer cannot exceed 200 characters")
            .When(x => !string.IsNullOrEmpty(x.Producer));
    }
}

/// <summary>
/// Validator for GenerationOptionsDto.
/// </summary>
public sealed class GenerationOptionsValidator : AbstractValidator<GenerationOptionsDto>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="GenerationOptionsValidator"/> class.
    /// </summary>
    public GenerationOptionsValidator()
    {
        RuleFor(x => x.ImageQuality)
            .InclusiveBetween(1, 100)
            .WithMessage("Image quality must be between 1 and 100")
            .When(x => x.ImageQuality.HasValue);

        RuleFor(x => x.TimeoutSeconds)
            .InclusiveBetween(1, 300)
            .WithMessage("Timeout must be between 1 and 300 seconds")
            .When(x => x.TimeoutSeconds.HasValue);
    }
}

/// <summary>
/// Validator for ValidateLayoutRequest.
/// </summary>
public sealed class ValidateLayoutRequestValidator : AbstractValidator<ValidateLayoutRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="ValidateLayoutRequestValidator"/> class.
    /// </summary>
    public ValidateLayoutRequestValidator()
    {
        // Layout is required
        RuleFor(x => x.Layout)
            .NotNull()
            .WithMessage("Layout definition is required for validation")
            .SetValidator(new LayoutNodeValidator()!)
            .When(x => x.Layout != null);

        // Also validate component properties
        RuleFor(x => x.Layout)
            .SetValidator(new ComponentPropertyValidator()!)
            .When(x => x.Layout != null);
    }
}

/// <summary>
/// Validator for TemplateLayoutDto.
/// Validates the complete template layout structure including header, content, footer,
/// background, and foreground slots.
/// </summary>
public sealed class TemplateLayoutValidator : AbstractValidator<TemplateLayoutDto>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="TemplateLayoutValidator"/> class.
    /// </summary>
    public TemplateLayoutValidator()
    {
        // Content is required
        RuleFor(x => x.Content)
            .NotNull()
            .WithMessage("Content layout tree is required in TemplateLayout");

        // Validate Content layout node
        RuleFor(x => x.Content)
            .SetValidator(new LayoutNodeValidator()!)
            .When(x => x.Content != null);

        // Validate Content component properties
        RuleFor(x => x.Content)
            .SetValidator(new ComponentPropertyValidator()!)
            .When(x => x.Content != null);

        // Validate Header layout node (optional)
        RuleFor(x => x.Header)
            .SetValidator(new LayoutNodeValidator()!)
            .When(x => x.Header != null);

        // Validate Header component properties
        RuleFor(x => x.Header)
            .SetValidator(new ComponentPropertyValidator()!)
            .When(x => x.Header != null);

        // Validate Footer layout node (optional)
        RuleFor(x => x.Footer)
            .SetValidator(new LayoutNodeValidator()!)
            .When(x => x.Footer != null);

        // Validate Footer component properties
        RuleFor(x => x.Footer)
            .SetValidator(new ComponentPropertyValidator()!)
            .When(x => x.Footer != null);

        // Validate Background layout node (optional)
        RuleFor(x => x.Background)
            .SetValidator(new LayoutNodeValidator()!)
            .When(x => x.Background != null);

        // Validate Background component properties
        RuleFor(x => x.Background)
            .SetValidator(new ComponentPropertyValidator()!)
            .When(x => x.Background != null);

        // Validate Foreground layout node (optional)
        RuleFor(x => x.Foreground)
            .SetValidator(new LayoutNodeValidator()!)
            .When(x => x.Foreground != null);

        // Validate Foreground component properties
        RuleFor(x => x.Foreground)
            .SetValidator(new ComponentPropertyValidator()!)
            .When(x => x.Foreground != null);

        // Validate PageSettings
        RuleFor(x => x.PageSettings)
            .SetValidator(new PageSettingsValidator()!)
            .When(x => x.PageSettings != null);

        // Validate header height consistency
        RuleFor(x => x)
            .Custom(
                (layout, context) =>
                {
                    if (layout.PageSettings == null)
                        return;

                    // If header height is specified but no header is provided, warn
                    if (
                        layout.PageSettings.HeaderHeight.HasValue
                        && layout.PageSettings.HeaderHeight.Value > 0
                        && layout.Header == null
                    )
                    {
                        context.AddFailure(
                            "Header",
                            "HeaderHeight is specified in PageSettings but no Header layout is provided"
                        );
                    }

                    // If footer height is specified but no footer is provided, warn
                    if (
                        layout.PageSettings.FooterHeight.HasValue
                        && layout.PageSettings.FooterHeight.Value > 0
                        && layout.Footer == null
                    )
                    {
                        context.AddFailure(
                            "Footer",
                            "FooterHeight is specified in PageSettings but no Footer layout is provided"
                        );
                    }

                    // Validate min/max header height consistency
                    if (
                        layout.PageSettings.MinHeaderHeight.HasValue
                        && layout.PageSettings.MaxHeaderHeight.HasValue
                        && layout.PageSettings.MinHeaderHeight.Value
                            > layout.PageSettings.MaxHeaderHeight.Value
                    )
                    {
                        context.AddFailure(
                            "PageSettings",
                            "MinHeaderHeight cannot be greater than MaxHeaderHeight"
                        );
                    }

                    // Validate min/max footer height consistency
                    if (
                        layout.PageSettings.MinFooterHeight.HasValue
                        && layout.PageSettings.MaxFooterHeight.HasValue
                        && layout.PageSettings.MinFooterHeight.Value
                            > layout.PageSettings.MaxFooterHeight.Value
                    )
                    {
                        context.AddFailure(
                            "PageSettings",
                            "MinFooterHeight cannot be greater than MaxFooterHeight"
                        );
                    }
                }
            );
    }
}
