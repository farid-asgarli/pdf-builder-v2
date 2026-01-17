using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Renderers.Sizing;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.UnitTests.Renderers.Sizing;

/// <summary>
/// Unit tests for the UnconstrainedRenderer class.
/// </summary>
public sealed class UnconstrainedRendererTests : IDisposable
{
    private readonly Mock<ILogger<UnconstrainedRenderer>> _loggerMock;
    private readonly Mock<ILogger<ExpressionEvaluator>> _expressionLoggerMock;
    private readonly Mock<ILogger<StyleResolver>> _styleResolverLoggerMock;
    private readonly MemoryCache _cache;
    private readonly ExpressionEvaluator _expressionEvaluator;
    private readonly StyleResolver _styleResolver;
    private readonly UnconstrainedRenderer _renderer;

    public UnconstrainedRendererTests()
    {
        _loggerMock = new Mock<ILogger<UnconstrainedRenderer>>();
        _expressionLoggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _styleResolverLoggerMock = new Mock<ILogger<StyleResolver>>();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _expressionEvaluator = new ExpressionEvaluator(_cache, _expressionLoggerMock.Object);
        _styleResolver = new StyleResolver(_expressionEvaluator, _styleResolverLoggerMock.Object);

        _renderer = new UnconstrainedRenderer(
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
    public void ComponentType_ShouldBeUnconstrained()
    {
        // Assert
        _renderer.ComponentType.Should().Be(ComponentType.Unconstrained);
    }

    [Fact]
    public void RendererName_ShouldBeUnconstrainedRenderer()
    {
        // Assert
        _renderer.RendererName.Should().Be("UnconstrainedRenderer");
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
    public void GetOptionalProperties_ShouldReturnEmptyDictionary()
    {
        // Act
        var optionalProperties = _renderer.GetOptionalProperties();

        // Assert
        optionalProperties.Should().BeEmpty();
    }

    #endregion

    #region Validation Tests

    [Fact]
    public void ValidateProperties_WithMinimalNode_ShouldReturnNoErrors()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.Unconstrained, Id = "test-unconstrained" };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithChild_ShouldReturnNoErrors()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Unconstrained,
            Id = "test-unconstrained",
            Child = new LayoutNode { Type = ComponentType.Text },
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithExtraProperties_ShouldStillReturnNoErrors()
    {
        // Arrange - Unconstrained doesn't use any properties, but shouldn't fail if extras are provided
        var node = new LayoutNode
        {
            Type = ComponentType.Unconstrained,
            Id = "test-unconstrained",
            Properties = CreateProperties(new { someUnusedProperty = "value" }),
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
