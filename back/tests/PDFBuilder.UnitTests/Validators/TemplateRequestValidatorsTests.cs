using FluentValidation.TestHelper;
using PDFBuilder.Contracts.DTOs;
using PDFBuilder.Contracts.Requests;
using PDFBuilder.Validation.Validators;

namespace PDFBuilder.UnitTests.Validators;

/// <summary>
/// Unit tests for template request validators.
/// </summary>
public class TemplateRequestValidatorsTests
{
    #region SaveTemplateRequestValidator Tests

    [Fact]
    public void SaveTemplateRequest_ShouldBeValid_WhenAllFieldsAreCorrect()
    {
        // Arrange
        var validator = new SaveTemplateRequestValidator();
        var request = new SaveTemplateRequest
        {
            Name = "Invoice Template",
            Description = "A template for invoices",
            Category = "Invoice",
            Layout = new LayoutNodeDto { Type = "Column" },
            Tags = "invoice,business",
        };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void SaveTemplateRequest_ShouldFail_WhenNameIsEmpty()
    {
        // Arrange
        var validator = new SaveTemplateRequestValidator();
        var request = new SaveTemplateRequest
        {
            Name = "",
            Layout = new LayoutNodeDto { Type = "Column" },
        };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void SaveTemplateRequest_ShouldFail_WhenNameExceedsMaxLength()
    {
        // Arrange
        var validator = new SaveTemplateRequestValidator();
        var request = new SaveTemplateRequest
        {
            Name = new string('a', 201),
            Layout = new LayoutNodeDto { Type = "Column" },
        };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result
            .ShouldHaveValidationErrorFor(x => x.Name)
            .WithErrorMessage("Template name cannot exceed 200 characters.");
    }

    [Fact]
    public void SaveTemplateRequest_ShouldFail_WhenNameHasInvalidCharacters()
    {
        // Arrange
        var validator = new SaveTemplateRequestValidator();
        var request = new SaveTemplateRequest
        {
            Name = "Template<script>",
            Layout = new LayoutNodeDto { Type = "Column" },
        };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void SaveTemplateRequest_ShouldFail_WhenLayoutIsNull()
    {
        // Arrange
        var validator = new SaveTemplateRequestValidator();
        var request = new SaveTemplateRequest { Name = "Valid Name", Layout = null! };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Layout);
    }

    [Fact]
    public void SaveTemplateRequest_ShouldFail_WhenDescriptionExceedsMaxLength()
    {
        // Arrange
        var validator = new SaveTemplateRequestValidator();
        var request = new SaveTemplateRequest
        {
            Name = "Valid Name",
            Description = new string('a', 2001),
            Layout = new LayoutNodeDto { Type = "Column" },
        };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result
            .ShouldHaveValidationErrorFor(x => x.Description)
            .WithErrorMessage("Description cannot exceed 2000 characters.");
    }

    [Fact]
    public void SaveTemplateRequest_ShouldFail_WhenCategoryExceedsMaxLength()
    {
        // Arrange
        var validator = new SaveTemplateRequestValidator();
        var request = new SaveTemplateRequest
        {
            Name = "Valid Name",
            Category = new string('a', 101),
            Layout = new LayoutNodeDto { Type = "Column" },
        };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result
            .ShouldHaveValidationErrorFor(x => x.Category)
            .WithErrorMessage("Category cannot exceed 100 characters.");
    }

    [Fact]
    public void SaveTemplateRequest_ShouldFail_WhenTagsExceedsMaxLength()
    {
        // Arrange
        var validator = new SaveTemplateRequestValidator();
        var request = new SaveTemplateRequest
        {
            Name = "Valid Name",
            Tags = new string('a', 501),
            Layout = new LayoutNodeDto { Type = "Column" },
        };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result
            .ShouldHaveValidationErrorFor(x => x.Tags)
            .WithErrorMessage("Tags cannot exceed 500 characters.");
    }

    [Fact]
    public void SaveTemplateRequest_ShouldAcceptValidTags()
    {
        // Arrange
        var validator = new SaveTemplateRequestValidator();
        var request = new SaveTemplateRequest
        {
            Name = "Valid Name",
            Tags = "invoice,business,legal-docs",
            Layout = new LayoutNodeDto { Type = "Column" },
        };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Tags);
    }

    [Fact]
    public void SaveTemplateRequest_ShouldAcceptNameWithParentheses()
    {
        // Arrange
        var validator = new SaveTemplateRequestValidator();
        var request = new SaveTemplateRequest
        {
            Name = "Invoice Template (Copy)",
            Layout = new LayoutNodeDto { Type = "Column" },
        };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveValidationErrorFor(x => x.Name);
    }

    #endregion

    #region UpdateTemplateRequestValidator Tests

    [Fact]
    public void UpdateTemplateRequest_ShouldBeValid_WhenOnlyNameIsProvided()
    {
        // Arrange
        var validator = new UpdateTemplateRequestValidator();
        var request = new UpdateTemplateRequest { Name = "Updated Name" };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void UpdateTemplateRequest_ShouldBeValid_WhenNoFieldsAreProvided()
    {
        // Arrange
        var validator = new UpdateTemplateRequestValidator();
        var request = new UpdateTemplateRequest();

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void UpdateTemplateRequest_ShouldFail_WhenNameExceedsMaxLength()
    {
        // Arrange
        var validator = new UpdateTemplateRequestValidator();
        var request = new UpdateTemplateRequest { Name = new string('a', 201) };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    #endregion

    #region DuplicateTemplateRequestValidator Tests

    [Fact]
    public void DuplicateTemplateRequest_ShouldBeValid_WhenAllFieldsAreCorrect()
    {
        // Arrange
        var validator = new DuplicateTemplateRequestValidator();
        var request = new DuplicateTemplateRequest
        {
            NewName = "Copied Template",
            Category = "Invoice",
        };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void DuplicateTemplateRequest_ShouldBeValid_WhenNoFieldsAreProvided()
    {
        // Arrange
        var validator = new DuplicateTemplateRequestValidator();
        var request = new DuplicateTemplateRequest();

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void DuplicateTemplateRequest_ShouldFail_WhenNewNameExceedsMaxLength()
    {
        // Arrange
        var validator = new DuplicateTemplateRequestValidator();
        var request = new DuplicateTemplateRequest { NewName = new string('a', 201) };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result
            .ShouldHaveValidationErrorFor(x => x.NewName)
            .WithErrorMessage("New name cannot exceed 200 characters.");
    }

    [Fact]
    public void DuplicateTemplateRequest_ShouldFail_WhenNewNameHasInvalidCharacters()
    {
        // Arrange
        var validator = new DuplicateTemplateRequestValidator();
        var request = new DuplicateTemplateRequest { NewName = "Template@#$%" };

        // Act
        var result = validator.TestValidate(request);

        // Assert
        result.ShouldHaveValidationErrorFor(x => x.NewName);
    }

    #endregion
}
