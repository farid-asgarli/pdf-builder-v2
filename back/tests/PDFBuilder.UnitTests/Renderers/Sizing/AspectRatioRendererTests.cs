using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Renderers.Sizing;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.UnitTests.Renderers.Sizing;

/// <summary>
/// Unit tests for the AspectRatioRenderer class.
/// </summary>
public sealed class AspectRatioRendererTests : IDisposable
{
    private readonly Mock<ILogger<AspectRatioRenderer>> _loggerMock;
    private readonly Mock<ILogger<ExpressionEvaluator>> _expressionLoggerMock;
    private readonly Mock<ILogger<StyleResolver>> _styleResolverLoggerMock;
    private readonly MemoryCache _cache;
    private readonly ExpressionEvaluator _expressionEvaluator;
    private readonly StyleResolver _styleResolver;
    private readonly AspectRatioRenderer _renderer;

    public AspectRatioRendererTests()
    {
        _loggerMock = new Mock<ILogger<AspectRatioRenderer>>();
        _expressionLoggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _styleResolverLoggerMock = new Mock<ILogger<StyleResolver>>();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _expressionEvaluator = new ExpressionEvaluator(_cache, _expressionLoggerMock.Object);
        _styleResolver = new StyleResolver(_expressionEvaluator, _styleResolverLoggerMock.Object);

        _renderer = new AspectRatioRenderer(
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
    public void ComponentType_ShouldBeAspectRatio()
    {
        // Assert
        _renderer.ComponentType.Should().Be(ComponentType.AspectRatio);
    }

    [Fact]
    public void RendererName_ShouldBeAspectRatioRenderer()
    {
        // Assert
        _renderer.RendererName.Should().Be("AspectRatioRenderer");
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
    public void GetRequiredProperties_ShouldContainRatio()
    {
        // Act
        var requiredProperties = _renderer.GetRequiredProperties();

        // Assert
        requiredProperties.Should().ContainSingle().Which.Should().Be("ratio");
    }

    [Fact]
    public void GetOptionalProperties_ShouldContainOption()
    {
        // Act
        var optionalProperties = _renderer.GetOptionalProperties();

        // Assert
        optionalProperties.Should().ContainKey("option");
        optionalProperties["option"].Should().Be("fitWidth");
    }

    #endregion

    #region Validation Tests

    [Fact]
    public void ValidateProperties_WithValidRatio_ShouldReturnNoErrors()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.AspectRatio,
            Id = "test-aspect-ratio",
            Properties = CreateProperties(new { ratio = 1.5f }),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithMissingRatio_ShouldReturnError()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.AspectRatio, Id = "test-aspect-ratio" };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "ratio" && e.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void ValidateProperties_WithZeroRatio_ShouldReturnError()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.AspectRatio,
            Id = "test-aspect-ratio",
            Properties = CreateProperties(new { ratio = 0f }),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "ratio" && e.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void ValidateProperties_WithNegativeRatio_ShouldReturnError()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.AspectRatio,
            Id = "test-aspect-ratio",
            Properties = CreateProperties(new { ratio = -1.5f }),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "ratio" && e.Severity == ValidationSeverity.Error);
    }

    [Theory]
    [InlineData("fitWidth")]
    [InlineData("fitHeight")]
    [InlineData("fitArea")]
    [InlineData("FitWidth")]
    [InlineData("FITAREA")]
    public void ValidateProperties_WithValidOption_ShouldReturnNoErrors(string option)
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.AspectRatio,
            Id = "test-aspect-ratio",
            Properties = CreateProperties(new { ratio = 1.5f, option }),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithInvalidOption_ShouldReturnError()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.AspectRatio,
            Id = "test-aspect-ratio",
            Properties = CreateProperties(new { ratio = 1.5f, option = "invalid" }),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "option" && e.Severity == ValidationSeverity.Error);
    }

    #endregion

    #region Common Ratio Values Tests

    [Theory]
    [InlineData(1.7778f)] // 16:9
    [InlineData(1.3333f)] // 4:3
    [InlineData(1.0f)] // 1:1 (square)
    [InlineData(0.5625f)] // 9:16 (portrait)
    [InlineData(2.3333f)] // 21:9 (ultrawide)
    public void ValidateProperties_WithCommonRatios_ShouldReturnNoErrors(float ratio)
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.AspectRatio,
            Id = "test-aspect-ratio",
            Properties = CreateProperties(new { ratio }),
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
