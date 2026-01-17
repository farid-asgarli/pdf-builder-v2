using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Renderers.Styling;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.UnitTests.Renderers.Styling;

/// <summary>
/// Unit tests for the ShadowRenderer class.
/// </summary>
public sealed class ShadowRendererTests : IDisposable
{
    private readonly Mock<ILogger<ShadowRenderer>> _loggerMock;
    private readonly Mock<ILogger<ExpressionEvaluator>> _expressionLoggerMock;
    private readonly Mock<ILogger<StyleResolver>> _styleResolverLoggerMock;
    private readonly MemoryCache _cache;
    private readonly ExpressionEvaluator _expressionEvaluator;
    private readonly StyleResolver _styleResolver;
    private readonly ShadowRenderer _renderer;

    public ShadowRendererTests()
    {
        _loggerMock = new Mock<ILogger<ShadowRenderer>>();
        _expressionLoggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _styleResolverLoggerMock = new Mock<ILogger<StyleResolver>>();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _expressionEvaluator = new ExpressionEvaluator(_cache, _expressionLoggerMock.Object);
        _styleResolver = new StyleResolver(_expressionEvaluator, _styleResolverLoggerMock.Object);

        _renderer = new ShadowRenderer(_expressionEvaluator, _styleResolver, _loggerMock.Object);
    }

    public void Dispose()
    {
        _cache.Dispose();
    }

    #region Component Type Tests

    [Fact]
    public void ComponentType_ShouldBeShadow()
    {
        // Assert
        _renderer.ComponentType.Should().Be(ComponentType.Shadow);
    }

    [Fact]
    public void RendererName_ShouldBeShadowRenderer()
    {
        // Assert
        _renderer.RendererName.Should().Be("ShadowRenderer");
    }

    [Fact]
    public void Category_ShouldBeStyling()
    {
        // Assert
        _renderer.Category.Should().Be(RendererCategory.Styling);
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
    public void GetRequiredProperties_ShouldBeEmpty()
    {
        // Act
        var requiredProperties = _renderer.GetRequiredProperties();

        // Assert
        requiredProperties.Should().BeEmpty();
    }

    [Fact]
    public void GetOptionalProperties_ShouldContainAllShadowProperties()
    {
        // Act
        var optionalProperties = _renderer.GetOptionalProperties();

        // Assert
        optionalProperties.Should().ContainKey("color");
        optionalProperties.Should().ContainKey("blur");
        optionalProperties.Should().ContainKey("spread");
        optionalProperties.Should().ContainKey("offsetX");
        optionalProperties.Should().ContainKey("offsetY");
    }

    [Fact]
    public void GetOptionalProperties_ShouldHaveCorrectDefaults()
    {
        // Act
        var optionalProperties = _renderer.GetOptionalProperties();

        // Assert
        optionalProperties["color"].Should().Be("#808080");
        optionalProperties["blur"].Should().Be(5f);
        optionalProperties["spread"].Should().Be(0f);
        optionalProperties["offsetX"].Should().Be(5f);
        optionalProperties["offsetY"].Should().Be(5f);
    }

    #endregion

    #region Validation Tests - Valid Configurations

    [Fact]
    public void ValidateProperties_WithNoProperties_ShouldReturnNoErrors()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithAllValidProperties_ShouldReturnNoErrors()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(
                new
                {
                    color = "#000000",
                    blur = 10f,
                    spread = 5f,
                    offsetX = 8f,
                    offsetY = 8f,
                }
            ),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Theory]
    [InlineData("#FF0000")]
    [InlineData("#00FF00")]
    [InlineData("#0000FF")]
    [InlineData("#AABBCC")]
    [InlineData("FF0000")]
    [InlineData("00FF00")]
    [InlineData("#80808080")] // With alpha
    public void ValidateProperties_WithValidColorFormats_ShouldReturnNoErrors(string color)
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { color }),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Where(e => e.PropertyName == "color" && e.Severity == ValidationSeverity.Error)
            .Should()
            .BeEmpty();
    }

    #endregion

    #region Validation Tests - Invalid Configurations

    [Fact]
    public void ValidateProperties_WithNegativeBlur_ShouldReturnError()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { blur = -5f }),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "blur" && e.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void ValidateProperties_WithMissingChild_ShouldReturnWarning()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { blur = 5f }),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "child" && e.Severity == ValidationSeverity.Warning);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("#GGG")]
    [InlineData("#12345")]
    [InlineData("red")]
    [InlineData("rgb(255,0,0)")]
    public void ValidateProperties_WithInvalidColorFormat_ShouldReturnWarning(string color)
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { color }),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "color" && e.Severity == ValidationSeverity.Warning);
    }

    #endregion

    #region Validation Tests - Performance Warnings

    [Theory]
    [InlineData(25f)]
    [InlineData(50f)]
    [InlineData(100f)]
    public void ValidateProperties_WithHighBlur_ShouldReturnPerformanceWarning(float blur)
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { blur }),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e =>
                e.PropertyName == "blur"
                && e.Severity == ValidationSeverity.Warning
                && e.Message!.Contains("performance", StringComparison.OrdinalIgnoreCase)
            );
    }

    [Fact]
    public void ValidateProperties_WithBlurExceedingMax_ShouldReturnWarning()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { blur = 150f }),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e =>
                e.PropertyName == "blur"
                && e.Severity == ValidationSeverity.Warning
                && e.Message!.Contains("clamped", StringComparison.OrdinalIgnoreCase)
            );
    }

    #endregion

    #region Validation Tests - Spread Limits

    [Theory]
    [InlineData(150f)]
    [InlineData(-150f)]
    public void ValidateProperties_WithSpreadExceedingMax_ShouldReturnWarning(float spread)
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { spread }),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "spread" && e.Severity == ValidationSeverity.Warning);
    }

    [Theory]
    [InlineData(0f)]
    [InlineData(10f)]
    [InlineData(-10f)]
    [InlineData(50f)]
    [InlineData(-50f)]
    public void ValidateProperties_WithValidSpread_ShouldReturnNoErrors(float spread)
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { spread }),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Where(e => e.PropertyName == "spread" && e.Severity == ValidationSeverity.Error)
            .Should()
            .BeEmpty();
    }

    #endregion

    #region Validation Tests - Offset Limits

    [Theory]
    [InlineData(600f)]
    [InlineData(-600f)]
    public void ValidateProperties_WithOffsetXExceedingMax_ShouldReturnWarning(float offsetX)
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { offsetX }),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "offsetX" && e.Severity == ValidationSeverity.Warning);
    }

    [Theory]
    [InlineData(600f)]
    [InlineData(-600f)]
    public void ValidateProperties_WithOffsetYExceedingMax_ShouldReturnWarning(float offsetY)
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { offsetY }),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "offsetY" && e.Severity == ValidationSeverity.Warning);
    }

    [Theory]
    [InlineData(0f, 0f)]
    [InlineData(10f, 10f)]
    [InlineData(-10f, -10f)]
    [InlineData(100f, 50f)]
    public void ValidateProperties_WithValidOffsets_ShouldReturnNoErrors(
        float offsetX,
        float offsetY
    )
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(new { offsetX, offsetY }),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Where(e =>
                (e.PropertyName == "offsetX" || e.PropertyName == "offsetY")
                && e.Severity == ValidationSeverity.Error
            )
            .Should()
            .BeEmpty();
    }

    #endregion

    #region Common Shadow Configurations Tests

    [Theory]
    [InlineData(0f, 0f, 8f, 8f)] // Sharp shadow, no blur
    [InlineData(5f, 0f, 5f, 5f)] // Standard soft shadow
    [InlineData(10f, 5f, 0f, 10f)] // Spread shadow
    [InlineData(15f, 0f, 10f, 10f)] // Large blur shadow
    public void ValidateProperties_WithCommonShadowConfigurations_ShouldReturnNoErrors(
        float blur,
        float spread,
        float offsetX,
        float offsetY
    )
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(
                new
                {
                    blur,
                    spread,
                    offsetX,
                    offsetY,
                    color = "#808080",
                }
            ),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithZeroBlurSharpShadow_ShouldReturnNoErrors()
    {
        // Arrange - Sharp shadow with no blur (better performance)
        var node = new LayoutNode
        {
            Type = ComponentType.Shadow,
            Id = "test-shadow",
            Properties = CreateProperties(
                new
                {
                    color = "#808080",
                    blur = 0f,
                    spread = 0f,
                    offsetX = 8f,
                    offsetY = 8f,
                }
            ),
            Child = CreateChildNode(),
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
        errors.Where(e => e.Severity == ValidationSeverity.Warning).Should().BeEmpty();
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

    private static LayoutNode CreateChildNode()
    {
        return new LayoutNode
        {
            Type = ComponentType.Text,
            Id = "child-text",
            Properties = CreateProperties(new { content = "Shadow content" }),
        };
    }

    #endregion
}
