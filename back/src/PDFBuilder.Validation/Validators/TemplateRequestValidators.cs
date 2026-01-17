using FluentValidation;
using PDFBuilder.Contracts.Requests;
using PDFBuilder.Validation.Rules;

namespace PDFBuilder.Validation.Validators;

/// <summary>
/// Validator for SaveTemplateRequest.
/// </summary>
public class SaveTemplateRequestValidator : AbstractValidator<SaveTemplateRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="SaveTemplateRequestValidator"/> class.
    /// </summary>
    public SaveTemplateRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Template name is required.")
            .MinimumLength(1)
            .WithMessage("Template name must be at least 1 character.")
            .MaximumLength(200)
            .WithMessage("Template name cannot exceed 200 characters.")
            .Must(ValidationRules.BeValidTemplateName)
            .WithMessage(
                "Template name contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed."
            );

        RuleFor(x => x.Description)
            .MaximumLength(2000)
            .WithMessage("Description cannot exceed 2000 characters.")
            .When(x => !string.IsNullOrEmpty(x.Description));

        RuleFor(x => x.Category)
            .MaximumLength(100)
            .WithMessage("Category cannot exceed 100 characters.")
            .Must(ValidationRules.BeValidCategory)
            .WithMessage(
                "Category contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed."
            )
            .When(x => !string.IsNullOrEmpty(x.Category));

        RuleFor(x => x.Layout)
            .NotNull()
            .WithMessage("Layout definition is required.")
            .SetValidator(new LayoutNodeValidator()!);

        RuleFor(x => x.Tags)
            .MaximumLength(500)
            .WithMessage("Tags cannot exceed 500 characters.")
            .Must(ValidationRules.BeValidTags)
            .WithMessage(
                "Tags must be comma-separated values containing only letters, numbers, spaces, and hyphens."
            )
            .When(x => !string.IsNullOrEmpty(x.Tags));

        RuleFor(x => x.PageSettings)
            .SetValidator(new PageSettingsValidator()!)
            .When(x => x.PageSettings != null);
    }
}

/// <summary>
/// Validator for UpdateTemplateRequest.
/// </summary>
public class UpdateTemplateRequestValidator : AbstractValidator<UpdateTemplateRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="UpdateTemplateRequestValidator"/> class.
    /// </summary>
    public UpdateTemplateRequestValidator()
    {
        RuleFor(x => x.Name)
            .MinimumLength(1)
            .WithMessage("Template name must be at least 1 character.")
            .MaximumLength(200)
            .WithMessage("Template name cannot exceed 200 characters.")
            .Must(ValidationRules.BeValidTemplateName)
            .WithMessage(
                "Template name contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed."
            )
            .When(x => !string.IsNullOrEmpty(x.Name));

        RuleFor(x => x.Description)
            .MaximumLength(2000)
            .WithMessage("Description cannot exceed 2000 characters.")
            .When(x => x.Description != null);

        RuleFor(x => x.Category)
            .MaximumLength(100)
            .WithMessage("Category cannot exceed 100 characters.")
            .Must(ValidationRules.BeValidCategory)
            .WithMessage(
                "Category contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed."
            )
            .When(x => !string.IsNullOrEmpty(x.Category));

        RuleFor(x => x.Layout).SetValidator(new LayoutNodeValidator()!).When(x => x.Layout != null);

        RuleFor(x => x.Tags)
            .MaximumLength(500)
            .WithMessage("Tags cannot exceed 500 characters.")
            .Must(ValidationRules.BeValidTags)
            .WithMessage(
                "Tags must be comma-separated values containing only letters, numbers, spaces, and hyphens."
            )
            .When(x => !string.IsNullOrEmpty(x.Tags));

        RuleFor(x => x.PageSettings)
            .SetValidator(new PageSettingsValidator()!)
            .When(x => x.PageSettings != null);
    }
}

/// <summary>
/// Validator for DuplicateTemplateRequest.
/// </summary>
public class DuplicateTemplateRequestValidator : AbstractValidator<DuplicateTemplateRequest>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="DuplicateTemplateRequestValidator"/> class.
    /// </summary>
    public DuplicateTemplateRequestValidator()
    {
        RuleFor(x => x.NewName)
            .MaximumLength(200)
            .WithMessage("New name cannot exceed 200 characters.")
            .Must(ValidationRules.BeValidTemplateName)
            .WithMessage(
                "New name contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed."
            )
            .When(x => !string.IsNullOrEmpty(x.NewName));

        RuleFor(x => x.Category)
            .MaximumLength(100)
            .WithMessage("Category cannot exceed 100 characters.")
            .Must(ValidationRules.BeValidCategory)
            .WithMessage(
                "Category contains invalid characters. Only letters, numbers, spaces, hyphens, and underscores are allowed."
            )
            .When(x => !string.IsNullOrEmpty(x.Category));
    }
}
