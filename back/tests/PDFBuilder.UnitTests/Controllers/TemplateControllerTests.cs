using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PDFBuilder.API.Controllers;
using PDFBuilder.Contracts.DTOs;
using PDFBuilder.Contracts.Requests;
using PDFBuilder.Contracts.Responses;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;

namespace PDFBuilder.UnitTests.Controllers;

/// <summary>
/// Unit tests for the TemplateController.
/// </summary>
public class TemplateControllerTests
{
    private readonly Mock<ITemplateRepository> _repositoryMock;
    private readonly Mock<ILogger<TemplateController>> _loggerMock;
    private readonly TemplateController _controller;

    public TemplateControllerTests()
    {
        _repositoryMock = new Mock<ITemplateRepository>();
        _loggerMock = new Mock<ILogger<TemplateController>>();
        _controller = new TemplateController(_repositoryMock.Object, _loggerMock.Object);

        // Setup HTTP context for correlation ID
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext(),
        };
    }

    #region GetAll Tests

    [Fact]
    public async Task GetAll_ReturnsOkWithTemplates_WhenTemplatesExist()
    {
        // Arrange
        var templates = new List<Template>
        {
            CreateTestTemplate("Template 1"),
            CreateTestTemplate("Template 2"),
        };

        _repositoryMock
            .Setup(r => r.GetAllAsync(It.IsAny<TemplateFilter>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new PaginatedResult<Template>
                {
                    Items = templates,
                    TotalCount = 2,
                    Page = 1,
                    PageSize = 20,
                }
            );

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TemplateListResponse>().Subject;
        response.Success.Should().BeTrue();
        response.Templates.Should().HaveCount(2);
        response.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetAll_AppliesFilterParameters()
    {
        // Arrange
        TemplateFilter? capturedFilter = null;
        _repositoryMock
            .Setup(r => r.GetAllAsync(It.IsAny<TemplateFilter>(), It.IsAny<CancellationToken>()))
            .Callback<TemplateFilter?, CancellationToken>((f, _) => capturedFilter = f)
            .ReturnsAsync(
                new PaginatedResult<Template>
                {
                    Items = [],
                    TotalCount = 0,
                    Page = 1,
                    PageSize = 10,
                }
            );

        // Act
        await _controller.GetAll(
            search: "test",
            category: "Invoice",
            tags: "business",
            isActive: true,
            page: 2,
            pageSize: 10
        );

        // Assert
        capturedFilter.Should().NotBeNull();
        capturedFilter!.SearchTerm.Should().Be("test");
        capturedFilter.Category.Should().Be("Invoice");
        capturedFilter.Tags.Should().Be("business");
        capturedFilter.IsActive.Should().BeTrue();
        capturedFilter.Page.Should().Be(2);
        capturedFilter.PageSize.Should().Be(10);
    }

    [Fact]
    public async Task GetAll_ClampsPaginationParameters()
    {
        // Arrange
        TemplateFilter? capturedFilter = null;
        _repositoryMock
            .Setup(r => r.GetAllAsync(It.IsAny<TemplateFilter>(), It.IsAny<CancellationToken>()))
            .Callback<TemplateFilter?, CancellationToken>((f, _) => capturedFilter = f)
            .ReturnsAsync(
                new PaginatedResult<Template>
                {
                    Items = [],
                    TotalCount = 0,
                    Page = 1,
                    PageSize = 100,
                }
            );

        // Act
        await _controller.GetAll(page: -5, pageSize: 500);

        // Assert
        capturedFilter!.Page.Should().Be(1); // Clamped to minimum
        capturedFilter.PageSize.Should().Be(100); // Clamped to maximum
    }

    #endregion

    #region GetById Tests

    [Fact]
    public async Task GetById_ReturnsOkWithTemplate_WhenTemplateExists()
    {
        // Arrange
        var templateId = Guid.NewGuid();
        var template = CreateTestTemplate("Test Template", templateId);

        _repositoryMock
            .Setup(r => r.GetByIdAsync(templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(template);

        // Act
        var result = await _controller.GetById(templateId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeTrue();
        response.Template.Should().NotBeNull();
        response.Template!.Id.Should().Be(templateId);
        response.Template.Name.Should().Be("Test Template");
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenTemplateDoesNotExist()
    {
        // Arrange
        var templateId = Guid.NewGuid();
        _repositoryMock
            .Setup(r => r.GetByIdAsync(templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Template?)null);

        // Act
        var result = await _controller.GetById(templateId);

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeFalse();
        response.ErrorMessage.Should().Contain(templateId.ToString());
    }

    #endregion

    #region Create Tests

    [Fact]
    public async Task Create_ReturnsCreated_WhenRequestIsValid()
    {
        // Arrange
        var request = CreateTestSaveRequest("New Template");
        var createdTemplate = CreateTestTemplate("New Template");

        _repositoryMock
            .Setup(r => r.ExistsAsync("New Template", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Template>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdTemplate);

        // Act
        var result = await _controller.Create(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var response = createdResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeTrue();
        response.Template.Should().NotBeNull();
        response.Template!.Name.Should().Be("New Template");
    }

    [Fact]
    public async Task Create_ReturnsConflict_WhenNameAlreadyExists()
    {
        // Arrange
        var request = CreateTestSaveRequest("Existing Template");

        _repositoryMock
            .Setup(r => r.ExistsAsync("Existing Template", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.Create(request);

        // Assert
        var conflictResult = result.Result.Should().BeOfType<ConflictObjectResult>().Subject;
        var response = conflictResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeFalse();
        response.ErrorMessage.Should().Contain("Existing Template");
    }

    #endregion

    #region Update Tests

    [Fact]
    public async Task Update_ReturnsOk_WhenUpdateIsSuccessful()
    {
        // Arrange
        var templateId = Guid.NewGuid();
        var existingTemplate = CreateTestTemplate("Original Name", templateId);
        var request = new UpdateTemplateRequest { Name = "Updated Name" };
        var updatedTemplate = CreateTestTemplate("Updated Name", templateId);
        updatedTemplate.Version = 2;

        _repositoryMock
            .Setup(r => r.GetByIdAsync(templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingTemplate);

        _repositoryMock
            .Setup(r => r.ExistsAsync("Updated Name", templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _repositoryMock
            .Setup(r => r.UpdateAsync(It.IsAny<Template>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(updatedTemplate);

        // Act
        var result = await _controller.Update(templateId, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeTrue();
        response.Template!.Name.Should().Be("Updated Name");
        response.Template.Version.Should().Be(2);
    }

    [Fact]
    public async Task Update_ReturnsNotFound_WhenTemplateDoesNotExist()
    {
        // Arrange
        var templateId = Guid.NewGuid();
        var request = new UpdateTemplateRequest { Name = "Updated Name" };

        _repositoryMock
            .Setup(r => r.GetByIdAsync(templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Template?)null);

        // Act
        var result = await _controller.Update(templateId, request);

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeFalse();
    }

    [Fact]
    public async Task Update_ReturnsConflict_WhenNewNameAlreadyExists()
    {
        // Arrange
        var templateId = Guid.NewGuid();
        var existingTemplate = CreateTestTemplate("Original Name", templateId);
        var request = new UpdateTemplateRequest { Name = "Conflicting Name" };

        _repositoryMock
            .Setup(r => r.GetByIdAsync(templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingTemplate);

        _repositoryMock
            .Setup(r =>
                r.ExistsAsync("Conflicting Name", templateId, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(true);

        // Act
        var result = await _controller.Update(templateId, request);

        // Assert
        var conflictResult = result.Result.Should().BeOfType<ConflictObjectResult>().Subject;
        var response = conflictResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeFalse();
    }

    #endregion

    #region Delete Tests

    [Fact]
    public async Task Delete_ReturnsOk_WhenDeleteIsSuccessful()
    {
        // Arrange
        var templateId = Guid.NewGuid();

        _repositoryMock
            .Setup(r => r.DeleteAsync(templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.Delete(templateId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<DeleteTemplateResponse>().Subject;
        response.Success.Should().BeTrue();
        response.DeletedTemplateId.Should().Be(templateId);
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_WhenTemplateDoesNotExist()
    {
        // Arrange
        var templateId = Guid.NewGuid();

        _repositoryMock
            .Setup(r => r.DeleteAsync(templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.Delete(templateId);

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<DeleteTemplateResponse>().Subject;
        response.Success.Should().BeFalse();
    }

    #endregion

    #region Duplicate Tests

    [Fact]
    public async Task Duplicate_ReturnsCreated_WhenDuplicateIsSuccessful()
    {
        // Arrange
        var sourceId = Guid.NewGuid();
        var request = new DuplicateTemplateRequest { NewName = "Copied Template" };
        var duplicatedTemplate = CreateTestTemplate("Copied Template");

        _repositoryMock
            .Setup(r => r.ExistsAsync("Copied Template", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _repositoryMock
            .Setup(r =>
                r.DuplicateAsync(sourceId, "Copied Template", null, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(duplicatedTemplate);

        // Act
        var result = await _controller.Duplicate(sourceId, request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var response = createdResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeTrue();
        response.Template!.Name.Should().Be("Copied Template");
    }

    [Fact]
    public async Task Duplicate_ReturnsNotFound_WhenSourceTemplateDoesNotExist()
    {
        // Arrange
        var sourceId = Guid.NewGuid();

        _repositoryMock
            .Setup(r =>
                r.DuplicateAsync(
                    sourceId,
                    It.IsAny<string?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((Template?)null);

        // Act
        var result = await _controller.Duplicate(sourceId, null);

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeFalse();
    }

    [Fact]
    public async Task Duplicate_ReturnsConflict_WhenNewNameAlreadyExists()
    {
        // Arrange
        var sourceId = Guid.NewGuid();
        var request = new DuplicateTemplateRequest { NewName = "Existing Name" };

        _repositoryMock
            .Setup(r => r.ExistsAsync("Existing Name", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.Duplicate(sourceId, request);

        // Assert
        var conflictResult = result.Result.Should().BeOfType<ConflictObjectResult>().Subject;
        var response = conflictResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeFalse();
    }

    #endregion

    #region Restore Tests

    [Fact]
    public async Task Restore_ReturnsOk_WhenRestoreIsSuccessful()
    {
        // Arrange
        var templateId = Guid.NewGuid();
        var restoredTemplate = CreateTestTemplate("Restored Template", templateId);

        _repositoryMock
            .Setup(r => r.RestoreAsync(templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        _repositoryMock
            .Setup(r => r.GetByIdAsync(templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(restoredTemplate);

        // Act
        var result = await _controller.Restore(templateId);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeTrue();
    }

    [Fact]
    public async Task Restore_ReturnsNotFound_WhenTemplateCannotBeRestored()
    {
        // Arrange
        var templateId = Guid.NewGuid();

        _repositoryMock
            .Setup(r => r.RestoreAsync(templateId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.Restore(templateId);

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<TemplateResponse>().Subject;
        response.Success.Should().BeFalse();
    }

    #endregion

    #region GetCategories and GetTags Tests

    [Fact]
    public async Task GetCategories_ReturnsOkWithCategories()
    {
        // Arrange
        var categories = new List<string> { "Invoice", "Report", "Certificate" };

        _repositoryMock
            .Setup(r => r.GetCategoriesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(categories);

        // Act
        var result = await _controller.GetCategories();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedCategories = okResult
            .Value.Should()
            .BeAssignableTo<IEnumerable<string>>()
            .Subject;
        returnedCategories.Should().BeEquivalentTo(categories);
    }

    [Fact]
    public async Task GetTags_ReturnsOkWithTags()
    {
        // Arrange
        var tags = new List<string> { "business", "finance", "legal" };

        _repositoryMock
            .Setup(r => r.GetTagsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(tags);

        // Act
        var result = await _controller.GetTags();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedTags = okResult.Value.Should().BeAssignableTo<IEnumerable<string>>().Subject;
        returnedTags.Should().BeEquivalentTo(tags);
    }

    #endregion

    #region Helper Methods

    private static Template CreateTestTemplate(string name, Guid? id = null)
    {
        return new Template
        {
            Id = id ?? Guid.NewGuid(),
            Name = name,
            Description = "Test description",
            Category = "Test",
            LayoutJson = """{"type":"Column","children":[]}""",
            Version = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Tags = "test,sample",
        };
    }

    private static SaveTemplateRequest CreateTestSaveRequest(string name)
    {
        return new SaveTemplateRequest
        {
            Name = name,
            Description = "Test description",
            Category = "Test",
            Layout = new LayoutNodeDto { Type = "Column" },
            Tags = "test,sample",
        };
    }

    #endregion
}
