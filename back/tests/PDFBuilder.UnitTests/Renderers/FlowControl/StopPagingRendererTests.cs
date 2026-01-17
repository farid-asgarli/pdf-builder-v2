using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Renderers.FlowControl;
using PDFBuilder.Engine.Services;
using QuestPDF.Infrastructure;

namespace PDFBuilder.UnitTests.Renderers.FlowControl;

/// <summary>
/// Unit tests for the StopPagingRenderer class.
/// </summary>
public sealed class StopPagingRendererTests : IDisposable
{
    private readonly Mock<ILogger<StopPagingRenderer>> _loggerMock;
    private readonly Mock<ILogger<ExpressionEvaluator>> _expressionLoggerMock;
    private readonly Mock<ILogger<StyleResolver>> _styleResolverLoggerMock;
    private readonly Mock<ILayoutEngine> _layoutEngineMock;
    private readonly MemoryCache _cache;
    private readonly ExpressionEvaluator _expressionEvaluator;
    private readonly StyleResolver _styleResolver;
    private readonly StopPagingRenderer _renderer;

    public StopPagingRendererTests()
    {
        _loggerMock = new Mock<ILogger<StopPagingRenderer>>();
        _expressionLoggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _styleResolverLoggerMock = new Mock<ILogger<StyleResolver>>();
        _layoutEngineMock = new Mock<ILayoutEngine>();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _expressionEvaluator = new ExpressionEvaluator(_cache, _expressionLoggerMock.Object);
        _styleResolver = new StyleResolver(_expressionEvaluator, _styleResolverLoggerMock.Object);

        _renderer = new StopPagingRenderer(
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
    public void ComponentType_ShouldBeStopPaging()
    {
        // Assert
        _renderer.ComponentType.Should().Be(ComponentType.StopPaging);
    }

    [Fact]
    public void RendererName_ShouldBeStopPagingRenderer()
    {
        // Assert
        _renderer.RendererName.Should().Be("StopPagingRenderer");
    }

    [Fact]
    public void Category_ShouldBeFlowControl()
    {
        // Assert
        _renderer.Category.Should().Be(RendererCategory.FlowControl);
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
    public void RequiresExpressionEvaluation_ShouldBeFalse()
    {
        // Assert
        _renderer.RequiresExpressionEvaluation.Should().BeFalse();
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
    public void GetOptionalProperties_ShouldContainChild()
    {
        // Act
        var optionalProperties = _renderer.GetOptionalProperties();

        // Assert
        optionalProperties.Should().ContainKey("child");
    }

    #endregion

    #region Validation Tests

    [Fact]
    public void ValidateProperties_WithMinimalNode_ShouldReturnWarningForNoChild()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.StopPaging, Id = "test-stop-paging" };

        // Act
        var errors = _renderer.ValidateProperties(node).ToList();

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
        errors
            .Should()
            .Contain(e => e.PropertyName == "child" && e.Severity == ValidationSeverity.Warning);
    }

    [Fact]
    public void ValidateProperties_WithChild_ShouldReturnNoErrors()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.StopPaging,
            Id = "test-stop-paging",
            Child = new LayoutNode { Type = ComponentType.Text },
        };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
        errors.Where(e => e.Severity == ValidationSeverity.Warning).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithChildren_ShouldReturnWarning()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.StopPaging,
            Id = "test-stop-paging",
            Children = [new LayoutNode { Type = ComponentType.Text }],
        };

        // Act
        var errors = _renderer.ValidateProperties(node).ToList();

        // Assert
        errors
            .Should()
            .Contain(e => e.Severity == ValidationSeverity.Warning && e.PropertyName == "children");
    }

    #endregion

    #region Render Tests

    [Fact]
    public void Render_WithValidNode_ShouldNotThrow()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.StopPaging,
            Id = "test-stop-paging",
            Child = new LayoutNode { Type = ComponentType.Text, Id = "child-text" },
        };

        var context = new RenderContext();
        var container = new TestContainer();

        // Act
        var act = () => _renderer.Render(container, node, context, _layoutEngineMock.Object);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Render_WithChild_ShouldRenderChildViaLayoutEngine()
    {
        // Arrange
        var childNode = new LayoutNode { Type = ComponentType.Text, Id = "child-text" };
        var node = new LayoutNode
        {
            Type = ComponentType.StopPaging,
            Id = "test-stop-paging",
            Child = childNode,
        };

        var context = new RenderContext();
        var container = new TestContainer();

        // Act
        _renderer.Render(container, node, context, _layoutEngineMock.Object);

        // Assert - StopPaging should call layout engine to render its child
        _layoutEngineMock.Verify(
            x => x.Render(It.IsAny<IContainer>(), It.Is<LayoutNode>(n => n == childNode), context),
            Times.Once
        );
    }

    [Fact]
    public void Render_WithNullContainer_ShouldThrowArgumentNullException()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.StopPaging, Id = "test-stop-paging" };
        var context = new RenderContext();

        // Act
        var act = () => _renderer.Render(null!, node, context, _layoutEngineMock.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Render_WithNullNode_ShouldThrow()
    {
        // Arrange
        var container = new TestContainer();
        var context = new RenderContext();

        // Act
        var act = () => _renderer.Render(container, null!, context, _layoutEngineMock.Object);

        // Assert
        act.Should().Throw<Exception>();
    }

    #endregion

    #region Test Helpers

    /// <summary>
    /// A test container that implements IContainer for testing.
    /// QuestPDF extension methods set the Child property.
    /// </summary>
    private sealed class TestContainer : IContainer
    {
        public IElement? Child { get; set; }

        public void Compose(Action<IContainer> handler)
        {
            handler?.Invoke(this);
        }
    }

    #endregion
}
