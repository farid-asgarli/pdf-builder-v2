using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Renderers.Containers;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.UnitTests.Renderers.Containers;

/// <summary>
/// Unit tests for the LayersRenderer class.
/// </summary>
public sealed class LayersRendererTests : IDisposable
{
    private readonly Mock<ILogger<LayersRenderer>> _loggerMock;
    private readonly Mock<ILogger<ExpressionEvaluator>> _expressionLoggerMock;
    private readonly Mock<ILogger<StyleResolver>> _styleResolverLoggerMock;
    private readonly MemoryCache _cache;
    private readonly ExpressionEvaluator _expressionEvaluator;
    private readonly StyleResolver _styleResolver;
    private readonly LayersRenderer _renderer;

    public LayersRendererTests()
    {
        _loggerMock = new Mock<ILogger<LayersRenderer>>();
        _expressionLoggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _styleResolverLoggerMock = new Mock<ILogger<StyleResolver>>();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _expressionEvaluator = new ExpressionEvaluator(_cache, _expressionLoggerMock.Object);
        _styleResolver = new StyleResolver(_expressionEvaluator, _styleResolverLoggerMock.Object);

        _renderer = new LayersRenderer(_expressionEvaluator, _styleResolver, _loggerMock.Object);
    }

    public void Dispose()
    {
        _cache.Dispose();
    }

    #region Component Type Tests

    [Fact]
    public void ComponentType_ShouldBeLayers()
    {
        // Assert
        _renderer.ComponentType.Should().Be(ComponentType.Layers);
    }

    [Fact]
    public void RendererName_ShouldBeLayersRenderer()
    {
        // Assert
        _renderer.RendererName.Should().Be("LayersRenderer");
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
    public void SupportsChildren_ShouldBeTrue()
    {
        // Assert
        _renderer.SupportsChildren.Should().BeTrue();
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
    public void ValidateProperties_WithNoChildren_ShouldReturnError()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Layers,
            Id = "test-layers",
            Children = null,
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "children" && e.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void ValidateProperties_WithEmptyChildren_ShouldReturnError()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Layers,
            Id = "test-layers",
            Children = [],
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e => e.PropertyName == "children" && e.Severity == ValidationSeverity.Error);
    }

    [Fact]
    public void ValidateProperties_WithChildrenButNoPrimaryLayer_ShouldReturnWarning()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Layers,
            Id = "test-layers",
            Children =
            [
                new LayoutNode { Type = ComponentType.Text, Id = "layer-1" },
                new LayoutNode { Type = ComponentType.Image, Id = "layer-2" },
            ],
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e =>
                e.PropertyName == "isPrimary" && e.Severity == ValidationSeverity.Warning
            );
    }

    [Fact]
    public void ValidateProperties_WithOnePrimaryLayer_ShouldReturnNoErrors()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Layers,
            Id = "test-layers",
            Children =
            [
                new LayoutNode { Type = ComponentType.Image, Id = "background" },
                new LayoutNode
                {
                    Type = ComponentType.Text,
                    Id = "primary",
                    Properties = new Dictionary<string, JsonElement>
                    {
                        ["isPrimary"] = JsonSerializer.SerializeToElement(true),
                    },
                },
            ],
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithMultiplePrimaryLayers_ShouldReturnWarning()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Layers,
            Id = "test-layers",
            Children =
            [
                new LayoutNode
                {
                    Type = ComponentType.Text,
                    Id = "layer-1",
                    Properties = new Dictionary<string, JsonElement>
                    {
                        ["isPrimary"] = JsonSerializer.SerializeToElement(true),
                    },
                },
                new LayoutNode
                {
                    Type = ComponentType.Image,
                    Id = "layer-2",
                    Properties = new Dictionary<string, JsonElement>
                    {
                        ["isPrimary"] = JsonSerializer.SerializeToElement(true),
                    },
                },
            ],
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors
            .Should()
            .Contain(e =>
                e.PropertyName == "isPrimary"
                && e.Severity == ValidationSeverity.Warning
                && e.Message.Contains("2")
            );
    }

    #endregion
}
