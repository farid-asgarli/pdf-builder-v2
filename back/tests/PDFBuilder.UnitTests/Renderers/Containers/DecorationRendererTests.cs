using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Renderers.Containers;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.UnitTests.Renderers.Containers;

/// <summary>
/// Unit tests for the DecorationRenderer class.
/// </summary>
public sealed class DecorationRendererTests : IDisposable
{
    private readonly Mock<ILogger<DecorationRenderer>> _loggerMock;
    private readonly Mock<ILogger<ExpressionEvaluator>> _expressionLoggerMock;
    private readonly Mock<ILogger<StyleResolver>> _styleResolverLoggerMock;
    private readonly MemoryCache _cache;
    private readonly ExpressionEvaluator _expressionEvaluator;
    private readonly StyleResolver _styleResolver;
    private readonly DecorationRenderer _renderer;

    public DecorationRendererTests()
    {
        _loggerMock = new Mock<ILogger<DecorationRenderer>>();
        _expressionLoggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _styleResolverLoggerMock = new Mock<ILogger<StyleResolver>>();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _expressionEvaluator = new ExpressionEvaluator(_cache, _expressionLoggerMock.Object);
        _styleResolver = new StyleResolver(_expressionEvaluator, _styleResolverLoggerMock.Object);

        _renderer = new DecorationRenderer(
            _expressionEvaluator,
            _styleResolver,
            _loggerMock.Object
        );
    }

    public void Dispose()
    {
        _cache.Dispose();
    }

    #region Component Type Tests

    [Fact]
    public void ComponentType_ShouldBeDecoration()
    {
        // Assert
        _renderer.ComponentType.Should().Be(ComponentType.Decoration);
    }

    [Fact]
    public void RendererName_ShouldBeDecorationRenderer()
    {
        // Assert
        _renderer.RendererName.Should().Be("DecorationRenderer");
    }

    [Fact]
    public void Category_ShouldBeContainer()
    {
        // Assert
        _renderer.Category.Should().Be(RendererCategory.Container);
    }

    #endregion

    #region Behavior Properties Tests

    [Fact]
    public void SupportsChildren_ShouldBeFalse()
    {
        // Decoration uses properties (before, content, after) instead of children
        // Assert
        _renderer.SupportsChildren.Should().BeFalse();
    }

    [Fact]
    public void IsWrapper_ShouldBeFalse()
    {
        // Assert
        _renderer.IsWrapper.Should().BeFalse();
    }

    [Fact]
    public void RequiresExpressionEvaluation_ShouldBeTrue()
    {
        // Assert
        _renderer.RequiresExpressionEvaluation.Should().BeTrue();
    }

    [Fact]
    public void InheritsStyle_ShouldBeTrue()
    {
        // Assert
        _renderer.InheritsStyle.Should().BeTrue();
    }

    #endregion

    #region Required/Optional Properties Tests

    [Fact]
    public void GetRequiredProperties_ShouldContainContent()
    {
        // Act
        var requiredProperties = _renderer.GetRequiredProperties();

        // Assert
        requiredProperties.Should().Contain("content");
    }

    [Fact]
    public void GetOptionalProperties_ShouldContainBeforeAndAfter()
    {
        // Act
        var optionalProperties = _renderer.GetOptionalProperties();

        // Assert
        optionalProperties.Should().ContainKey("before");
        optionalProperties.Should().ContainKey("after");
    }

    #endregion

    #region Validation Tests

    [Fact]
    public void ValidateProperties_WithNoContent_ShouldReturnError()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Decoration,
            Id = "test-decoration",
            Properties = null,
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "content" && e.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void ValidateProperties_WithValidContent_ShouldReturnNoErrors()
    {
        // Arrange
        var contentNode = new LayoutNode { Type = ComponentType.Text, Id = "main-content" };
        var properties = new Dictionary<string, JsonElement>
        {
            ["content"] = JsonSerializer.SerializeToElement(contentNode),
        };

        var node = new LayoutNode
        {
            Type = ComponentType.Decoration,
            Id = "test-decoration",
            Properties = properties,
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithInvalidContent_ShouldReturnError()
    {
        // Arrange
        var properties = new Dictionary<string, JsonElement>
        {
            ["content"] = JsonSerializer.SerializeToElement("not a layout node"),
        };

        var node = new LayoutNode
        {
            Type = ComponentType.Decoration,
            Id = "test-decoration",
            Properties = properties,
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "content" && e.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void ValidateProperties_WithAllSections_ShouldReturnNoErrors()
    {
        // Arrange
        var beforeNode = new LayoutNode { Type = ComponentType.Text, Id = "header" };
        var contentNode = new LayoutNode { Type = ComponentType.Column, Id = "main" };
        var afterNode = new LayoutNode { Type = ComponentType.Text, Id = "footer" };

        var properties = new Dictionary<string, JsonElement>
        {
            ["before"] = JsonSerializer.SerializeToElement(beforeNode),
            ["content"] = JsonSerializer.SerializeToElement(contentNode),
            ["after"] = JsonSerializer.SerializeToElement(afterNode),
        };

        var node = new LayoutNode
        {
            Type = ComponentType.Decoration,
            Id = "test-decoration",
            Properties = properties,
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithInvalidBeforeSection_ShouldReturnError()
    {
        // Arrange
        var contentNode = new LayoutNode { Type = ComponentType.Text, Id = "content" };
        var properties = new Dictionary<string, JsonElement>
        {
            ["before"] = JsonSerializer.SerializeToElement("invalid before"),
            ["content"] = JsonSerializer.SerializeToElement(contentNode),
        };

        var node = new LayoutNode
        {
            Type = ComponentType.Decoration,
            Id = "test-decoration",
            Properties = properties,
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "before" && e.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void ValidateProperties_WithInvalidAfterSection_ShouldReturnError()
    {
        // Arrange
        var contentNode = new LayoutNode { Type = ComponentType.Text, Id = "content" };
        var properties = new Dictionary<string, JsonElement>
        {
            ["content"] = JsonSerializer.SerializeToElement(contentNode),
            ["after"] = JsonSerializer.SerializeToElement(123), // Invalid: number instead of LayoutNode
        };

        var node = new LayoutNode
        {
            Type = ComponentType.Decoration,
            Id = "test-decoration",
            Properties = properties,
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "after" && e.Severity == ValidationSeverity.Error);
    }

    #endregion
}
