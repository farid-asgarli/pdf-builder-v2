using FluentValidation;
using PDFBuilder.Contracts.Requests;

namespace PDFBuilder.Validation.Validators;

/// <summary>
/// Validator for image upload request parameters.
/// </summary>
public class ImageUploadRequestValidator : AbstractValidator<ImageUploadRequest>
{
    /// <summary>
    /// Supported output formats for image conversion.
    /// </summary>
    private static readonly string[] SupportedOutputFormats = ["jpeg", "jpg", "png", "webp", "gif"];

    /// <summary>
    /// Initializes a new instance of the <see cref="ImageUploadRequestValidator"/> class.
    /// </summary>
    public ImageUploadRequestValidator()
    {
        RuleFor(x => x.MaxWidth)
            .GreaterThan(0)
            .When(x => x.MaxWidth.HasValue)
            .WithMessage("MaxWidth must be greater than 0");

        RuleFor(x => x.MaxWidth)
            .LessThanOrEqualTo(10000)
            .When(x => x.MaxWidth.HasValue)
            .WithMessage("MaxWidth cannot exceed 10000 pixels");

        RuleFor(x => x.MaxHeight)
            .GreaterThan(0)
            .When(x => x.MaxHeight.HasValue)
            .WithMessage("MaxHeight must be greater than 0");

        RuleFor(x => x.MaxHeight)
            .LessThanOrEqualTo(10000)
            .When(x => x.MaxHeight.HasValue)
            .WithMessage("MaxHeight cannot exceed 10000 pixels");

        RuleFor(x => x.Quality)
            .InclusiveBetween(1, 100)
            .When(x => x.Quality.HasValue)
            .WithMessage("Quality must be between 1 and 100");

        RuleFor(x => x.OutputFormat)
            .Must(format =>
                string.IsNullOrEmpty(format)
                || SupportedOutputFormats.Contains(format.ToLowerInvariant())
            )
            .When(x => !string.IsNullOrEmpty(x.OutputFormat))
            .WithMessage(
                $"OutputFormat must be one of: {string.Join(", ", SupportedOutputFormats)}"
            );

        RuleFor(x => x.CustomFilename)
            .MaximumLength(200)
            .When(x => !string.IsNullOrEmpty(x.CustomFilename))
            .WithMessage("CustomFilename cannot exceed 200 characters");

        RuleFor(x => x.CustomFilename)
            .Matches(@"^[a-zA-Z0-9\-_]+$")
            .When(x => !string.IsNullOrEmpty(x.CustomFilename))
            .WithMessage(
                "CustomFilename can only contain letters, numbers, hyphens, and underscores"
            );
    }
}
