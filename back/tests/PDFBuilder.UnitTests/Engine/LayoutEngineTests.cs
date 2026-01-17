using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Exceptions;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine;
using PDFBuilder.Engine.Factories;
using PDFBuilder.Engine.Services;
using QuestPDF.Infrastructure;

namespace PDFBuilder.UnitTests.Engine;

/// <summary>
/// Unit tests for the LayoutEngine class.
/// Tests component routing, expression evaluation integration,
/// style inheritance, and recursive rendering.
/// </summary>
public sealed class LayoutEngineTests : IDisposable
{
    private readonly Mock<ILogger<LayoutEngine>> _loggerMock;
    private readonly Mock<ILogger<RendererFactory>> _factoryLoggerMock;
    private readonly Mock<ILogger<StyleResolver>> _styleResolverLoggerMock;
    private readonly Mock<ILogger<ComponentRegistry>> _registryLoggerMock;
    private readonly Mock<ILogger<ExpressionEvaluator>> _expressionLoggerMock;
    private readonly MemoryCache _cache;
    private readonly ExpressionEvaluator _expressionEvaluator;
    private readonly StyleResolver _styleResolver;
    private readonly ComponentRegistry _componentRegistry;
    private readonly Mock<IServiceProvider> _serviceProviderMock;
    private readonly RendererFactory _rendererFactory;
    private readonly LayoutEngine _layoutEngine;

    public LayoutEngineTests()
    {
        _loggerMock = new Mock<ILogger<LayoutEngine>>();
        _factoryLoggerMock = new Mock<ILogger<RendererFactory>>();
        _styleResolverLoggerMock = new Mock<ILogger<StyleResolver>>();
        _registryLoggerMock = new Mock<ILogger<ComponentRegistry>>();
        _expressionLoggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _serviceProviderMock = new Mock<IServiceProvider>();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _expressionEvaluator = new ExpressionEvaluator(_cache, _expressionLoggerMock.Object);
        _styleResolver = new StyleResolver(_expressionEvaluator, _styleResolverLoggerMock.Object);
        _componentRegistry = new ComponentRegistry(_registryLoggerMock.Object);

        // Setup mock service provider to return empty enumerable for renderer discovery
        _serviceProviderMock
            .Setup(x => x.GetService(typeof(IEnumerable<IComponentRenderer>)))
            .Returns(Enumerable.Empty<IComponentRenderer>());

        _rendererFactory = new RendererFactory(
            _serviceProviderMock.Object,
            _componentRegistry,
            _factoryLoggerMock.Object
        );

        _layoutEngine = new LayoutEngine(
            _rendererFactory,
            _expressionEvaluator,
            _styleResolver,
            _componentRegistry,
            _loggerMock.Object
        );
    }

    public void Dispose()
    {
        _cache.Dispose();
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullRendererFactory_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(
            () =>
                new LayoutEngine(
                    null!,
                    _expressionEvaluator,
                    _styleResolver,
                    _componentRegistry,
                    _loggerMock.Object
                )
        );
    }

    [Fact]
    public void Constructor_WithNullExpressionEvaluator_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(
            () =>
                new LayoutEngine(
                    _rendererFactory,
                    null!,
                    _styleResolver,
                    _componentRegistry,
                    _loggerMock.Object
                )
        );
    }

    [Fact]
    public void Constructor_WithNullStyleResolver_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(
            () =>
                new LayoutEngine(
                    _rendererFactory,
                    _expressionEvaluator,
                    null!,
                    _componentRegistry,
                    _loggerMock.Object
                )
        );
    }

    [Fact]
    public void Constructor_WithNullComponentRegistry_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(
            () =>
                new LayoutEngine(
                    _rendererFactory,
                    _expressionEvaluator,
                    _styleResolver,
                    null!,
                    _loggerMock.Object
                )
        );
    }

    [Fact]
    public void Constructor_WithNullLogger_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(
            () =>
                new LayoutEngine(
                    _rendererFactory,
                    _expressionEvaluator,
                    _styleResolver,
                    _componentRegistry,
                    null!
                )
        );
    }

    #endregion

    #region ValidateLayout Tests

    [Fact]
    public void ValidateLayout_WithNullNode_ThrowsArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => _layoutEngine.ValidateLayout(null!));
    }

    [Fact]
    public void ValidateLayout_WithValidColumn_ReturnsValidResult()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.Column };

        // Act
        var result = _layoutEngine.ValidateLayout(node);

        // Assert
        result.Should().NotBeNull();
        // Note: May have warnings about missing renderer, but should not have errors for valid component type
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void ValidateLayout_WithUnknownComponentType_ReturnsErrorResult()
    {
        // Arrange - Using an undefined enum value
        var node = new LayoutNode { Type = (ComponentType)9999 };

        // Act
        var result = _layoutEngine.ValidateLayout(node);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorCode == "UNKNOWN_COMPONENT");
    }

    [Fact]
    public void ValidateLayout_WithMissingRequiredProperty_ReturnsErrorResult()
    {
        // Arrange - Table requires 'columns' property
        var node = new LayoutNode { Type = ComponentType.Table };

        // Act
        var result = _layoutEngine.ValidateLayout(node);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.ErrorCode == "MISSING_REQUIRED_PROPERTY");
    }

    [Fact]
    public void ValidateLayout_WithNestedChildren_ValidatesRecursively()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Column,
            Children =
            [
                new LayoutNode
                {
                    Type = ComponentType.Text,
                    Properties = CreateProperties(("content", "Hello")),
                },
                new LayoutNode { Type = (ComponentType)9999 }, // Invalid component
            ],
        };

        // Act
        var result = _layoutEngine.ValidateLayout(node);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Path.Contains("children[1]"));
    }

    [Fact]
    public void ValidateLayout_WithValidExpressions_ReturnsValidResult()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.Text,
            Properties = CreateProperties(("content", "{{ data.name }}")),
        };

        // Act
        var result = _layoutEngine.ValidateLayout(node);

        // Assert
        result.Should().NotBeNull();
        // Expression syntax is valid
        result.Errors.Where(e => e.ErrorCode == "INVALID_EXPRESSION").Should().BeEmpty();
    }

    #endregion

    #region HasRenderer Tests

    [Fact]
    public void HasRenderer_ForRegisteredType_ReturnsTrue_WhenRendererExists()
    {
        // Arrange
        var mockRenderer = new Mock<IComponentRenderer>();
        mockRenderer.Setup(r => r.ComponentType).Returns(ComponentType.Column);

        _serviceProviderMock
            .Setup(x => x.GetService(typeof(IEnumerable<IComponentRenderer>)))
            .Returns(new[] { mockRenderer.Object });

        var factory = new RendererFactory(
            _serviceProviderMock.Object,
            _componentRegistry,
            _factoryLoggerMock.Object
        );

        var engine = new LayoutEngine(
            factory,
            _expressionEvaluator,
            _styleResolver,
            _componentRegistry,
            _loggerMock.Object
        );

        // Act
        var result = engine.HasRenderer(ComponentType.Column);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void HasRenderer_ForUnregisteredType_ReturnsFalse()
    {
        // Act
        var result = _layoutEngine.HasRenderer(ComponentType.Column);

        // Assert - No renderers are registered in this test setup
        result.Should().BeFalse();
    }

    #endregion

    #region GetRenderer Tests

    [Fact]
    public void GetRenderer_ForRegisteredType_ReturnsRenderer()
    {
        // Arrange
        var mockRenderer = new Mock<IComponentRenderer>();
        mockRenderer.Setup(r => r.ComponentType).Returns(ComponentType.Column);

        _serviceProviderMock
            .Setup(x => x.GetService(typeof(IEnumerable<IComponentRenderer>)))
            .Returns(new[] { mockRenderer.Object });

        var factory = new RendererFactory(
            _serviceProviderMock.Object,
            _componentRegistry,
            _factoryLoggerMock.Object
        );

        var engine = new LayoutEngine(
            factory,
            _expressionEvaluator,
            _styleResolver,
            _componentRegistry,
            _loggerMock.Object
        );

        // Act
        var result = engine.GetRenderer(ComponentType.Column);

        // Assert
        result.Should().NotBeNull();
        result.ComponentType.Should().Be(ComponentType.Column);
    }

    [Fact]
    public void GetRenderer_ForUnregisteredType_ThrowsInvalidComponentException()
    {
        // Act & Assert
        Assert.Throws<InvalidComponentException>(
            () => _layoutEngine.GetRenderer(ComponentType.Column)
        );
    }

    #endregion

    #region Render Tests (with mock renderer)

    [Fact]
    public void Render_WithNullContainer_ThrowsArgumentNullException()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.Column };
        var context = new RenderContext();

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => _layoutEngine.Render(null!, node, context));
    }

    [Fact]
    public void Render_WithNullNode_ThrowsArgumentNullException()
    {
        // Arrange
        var container = new Mock<IContainer>().Object;
        var context = new RenderContext();

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => _layoutEngine.Render(container, null!, context));
    }

    [Fact]
    public void Render_WithNullContext_ThrowsArgumentNullException()
    {
        // Arrange
        var container = new Mock<IContainer>().Object;
        var node = new LayoutNode { Type = ComponentType.Column };

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => _layoutEngine.Render(container, node, null!));
    }

    [Fact]
    public void Render_WithVisibleFalse_SkipsRendering()
    {
        // Arrange
        var mockRenderer = new Mock<IComponentRenderer>();
        mockRenderer.Setup(r => r.ComponentType).Returns(ComponentType.Column);

        _serviceProviderMock
            .Setup(x => x.GetService(typeof(IEnumerable<IComponentRenderer>)))
            .Returns(new[] { mockRenderer.Object });

        var factory = new RendererFactory(
            _serviceProviderMock.Object,
            _componentRegistry,
            _factoryLoggerMock.Object
        );

        var engine = new LayoutEngine(
            factory,
            _expressionEvaluator,
            _styleResolver,
            _componentRegistry,
            _loggerMock.Object
        );

        var container = new Mock<IContainer>();
        var node = new LayoutNode { Type = ComponentType.Column, Visible = "{{ false }}" };
        var context = new RenderContext();

        // Act
        engine.Render(container.Object, node, context);

        // Assert - Renderer should never be called
        mockRenderer.Verify(
            r =>
                r.Render(
                    It.IsAny<IContainer>(),
                    It.IsAny<LayoutNode>(),
                    It.IsAny<RenderContext>(),
                    It.IsAny<ILayoutEngine>()
                ),
            Times.Never
        );
    }

    [Fact]
    public void Render_WithVisibleTrue_CallsRenderer()
    {
        // Arrange
        var mockRenderer = new Mock<IComponentRenderer>();
        mockRenderer.Setup(r => r.ComponentType).Returns(ComponentType.Column);

        _serviceProviderMock
            .Setup(x => x.GetService(typeof(IEnumerable<IComponentRenderer>)))
            .Returns(new[] { mockRenderer.Object });

        var factory = new RendererFactory(
            _serviceProviderMock.Object,
            _componentRegistry,
            _factoryLoggerMock.Object
        );

        var engine = new LayoutEngine(
            factory,
            _expressionEvaluator,
            _styleResolver,
            _componentRegistry,
            _loggerMock.Object
        );

        var container = new Mock<IContainer>();
        var node = new LayoutNode { Type = ComponentType.Column, Visible = "{{ true }}" };
        var context = new RenderContext();

        // Act
        engine.Render(container.Object, node, context);

        // Assert
        mockRenderer.Verify(
            r =>
                r.Render(
                    container.Object,
                    node,
                    It.IsAny<RenderContext>(),
                    It.IsAny<ILayoutEngine>()
                ),
            Times.Once
        );
    }

    [Fact]
    public void Render_WithDataBoundVisibility_EvaluatesCorrectly()
    {
        // Arrange
        var mockRenderer = new Mock<IComponentRenderer>();
        mockRenderer.Setup(r => r.ComponentType).Returns(ComponentType.Column);

        _serviceProviderMock
            .Setup(x => x.GetService(typeof(IEnumerable<IComponentRenderer>)))
            .Returns(new[] { mockRenderer.Object });

        var factory = new RendererFactory(
            _serviceProviderMock.Object,
            _componentRegistry,
            _factoryLoggerMock.Object
        );

        var engine = new LayoutEngine(
            factory,
            _expressionEvaluator,
            _styleResolver,
            _componentRegistry,
            _loggerMock.Object
        );

        var container = new Mock<IContainer>();
        var node = new LayoutNode { Type = ComponentType.Column, Visible = "{{ data.isVisible }}" };
        var context = new RenderContext();
        context.SetVariable("data", new { isVisible = true });

        // Act
        engine.Render(container.Object, node, context);

        // Assert
        mockRenderer.Verify(
            r =>
                r.Render(
                    container.Object,
                    node,
                    It.IsAny<RenderContext>(),
                    It.IsAny<ILayoutEngine>()
                ),
            Times.Once
        );
    }

    #endregion

    #region RenderChildren Tests

    [Fact]
    public void RenderChildren_WithNullContainer_ThrowsArgumentNullException()
    {
        // Arrange
        var nodes = new List<LayoutNode>();
        var context = new RenderContext();

        // Act & Assert
        Assert.Throws<ArgumentNullException>(
            () => _layoutEngine.RenderChildren(null!, nodes, context)
        );
    }

    [Fact]
    public void RenderChildren_WithNullNodes_ThrowsArgumentNullException()
    {
        // Arrange
        var container = new Mock<IContainer>().Object;
        var context = new RenderContext();

        // Act & Assert
        Assert.Throws<ArgumentNullException>(
            () => _layoutEngine.RenderChildren(container, null!, context)
        );
    }

    [Fact]
    public void RenderChildren_WithNullContext_ThrowsArgumentNullException()
    {
        // Arrange
        var container = new Mock<IContainer>().Object;
        var nodes = new List<LayoutNode>();

        // Act & Assert
        Assert.Throws<ArgumentNullException>(
            () => _layoutEngine.RenderChildren(container, nodes, null!)
        );
    }

    #endregion

    #region Helper Methods

    private static Dictionary<string, JsonElement> CreateProperties(
        params (string key, object value)[] props
    )
    {
        var dict = new Dictionary<string, JsonElement>();
        foreach (var (key, value) in props)
        {
            var json = JsonSerializer.Serialize(value);
            dict[key] = JsonDocument.Parse(json).RootElement.Clone();
        }
        return dict;
    }

    #endregion
}
