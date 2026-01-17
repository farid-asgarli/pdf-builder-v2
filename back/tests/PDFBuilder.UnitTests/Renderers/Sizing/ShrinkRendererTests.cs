using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Renderers.Sizing;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.UnitTests.Renderers.Sizing;

/// <summary>
/// Unit tests for the ShrinkRenderer class.
/// </summary>
public sealed class ShrinkRendererTests : IDisposable
{
    private readonly Mock<ILogger<ShrinkRenderer>> _loggerMock;
    private readonly Mock<ILogger<ExpressionEvaluator>> _expressionLoggerMock;
    private readonly Mock<ILogger<StyleResolver>> _styleResolverLoggerMock;
    private readonly MemoryCache _cache;
    private readonly ExpressionEvaluator _expressionEvaluator;
    private readonly StyleResolver _styleResolver;
    private readonly ShrinkRenderer _renderer;

    public ShrinkRendererTests()
    {
        _loggerMock = new Mock<ILogger<ShrinkRenderer>>();
        _expressionLoggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _styleResolverLoggerMock = new Mock<ILogger<StyleResolver>>();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _expressionEvaluator = new ExpressionEvaluator(_cache, _expressionLoggerMock.Object);
        _styleResolver = new StyleResolver(_expressionEvaluator, _styleResolverLoggerMock.Object);

        _renderer = new ShrinkRenderer(_expressionEvaluator, _styleResolver, _loggerMock.Object);
    }

    public void Dispose()
    {
        _cache.Dispose();
    }

    #region Component Type Tests

    [Fact]
    public void ComponentType_ShouldBeShrink()
    {
        // Assert
        _renderer.ComponentType.Should().Be(ComponentType.Shrink);
    }

    [Fact]
    public void RendererName_ShouldBeShrinkRenderer()
    {
        // Assert
        _renderer.RendererName.Should().Be("ShrinkRenderer");
    }

    [Fact]
    public void Category_ShouldBeSizing()
    {
        // Assert
        _renderer.Category.Should().Be(RendererCategory.Sizing);
    }

    #endregion

    #region Behavior Properties Tests

    [Fact]
    public void SupportsChildren_ShouldBeFalse()
    {
        // Assert
        _renderer.SupportsChildren.Should().BeFalse();
    }

    [Fact]
    public void IsWrapper_ShouldBeTrue()
    {
        // Assert
        _renderer.IsWrapper.Should().BeTrue();
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
    public void GetRequiredProperties_ShouldReturnEmptyCollection()
    {
        // Act
        var requiredProperties = _renderer.GetRequiredProperties();

        // Assert
        requiredProperties.Should().BeEmpty();
    }

    [Fact]
    public void GetOptionalProperties_ShouldContainDirection()
    {
        // Act
        var optionalProperties = _renderer.GetOptionalProperties();

        // Assert
        optionalProperties.Should().ContainKey("direction");
        optionalProperties["direction"].Should().Be("both");
    }

    #endregion

    #region Validation Tests

    [Fact]
    public void ValidateProperties_WithMinimalNode_ShouldReturnNoErrors()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.Shrink, Id = "test-shrink" };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Theory]
    [InlineData("both")]
    [InlineData("vertical")]
    [InlineData("horizontal")]
    [InlineData("Both")]
    [InlineData("VERTICAL")]
    [InlineData("Horizontal")]
    public void ValidateProperties_WithValidDirection_ShouldReturnNoErrors(string direction)
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shrink,
            Id = "test-shrink",
            Properties = CreateProperties(new { direction }),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithInvalidDirection_ShouldReturnError()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shrink,
            Id = "test-shrink",
            Properties = CreateProperties(new { direction = "invalid" }),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "direction" && e.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void ValidateProperties_WithChild_ShouldReturnNoErrors()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shrink,
            Id = "test-shrink",
            Child = new LayoutNode { Type = ComponentType.Text },
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    #endregion

    #region Helper Methods

    private static Dictionary<string, JsonElement> CreateProperties(object obj)
    {
        var json = JsonSerializer.Serialize(obj);
        var doc = JsonDocument.Parse(json);
        var props = new Dictionary<string, JsonElement>();

        foreach (var property in doc.RootElement.EnumerateObject())
        {
            props[property.Name] = property.Value.Clone();
        }

        return props;
    }

    #endregion
}
