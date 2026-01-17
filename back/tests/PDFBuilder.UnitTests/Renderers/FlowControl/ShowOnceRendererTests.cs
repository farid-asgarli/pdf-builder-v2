using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Renderers.FlowControl;
using PDFBuilder.Engine.Services;
using QuestPDF.Infrastructure;

namespace PDFBuilder.UnitTests.Renderers.FlowControl;

/// <summary>
/// Unit tests for the ShowOnceRenderer class.
/// </summary>
public sealed class ShowOnceRendererTests : IDisposable
{
    private readonly Mock<ILogger<ShowOnceRenderer>> _loggerMock;
    private readonly Mock<ILogger<ExpressionEvaluator>> _expressionLoggerMock;
    private readonly Mock<ILogger<StyleResolver>> _styleResolverLoggerMock;
    private readonly Mock<ILayoutEngine> _layoutEngineMock;
    private readonly MemoryCache _cache;
    private readonly ExpressionEvaluator _expressionEvaluator;
    private readonly StyleResolver _styleResolver;
    private readonly ShowOnceRenderer _renderer;

    public ShowOnceRendererTests()
    {
        _loggerMock = new Mock<ILogger<ShowOnceRenderer>>();
        _expressionLoggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _styleResolverLoggerMock = new Mock<ILogger<StyleResolver>>();
        _layoutEngineMock = new Mock<ILayoutEngine>();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _expressionEvaluator = new ExpressionEvaluator(_cache, _expressionLoggerMock.Object);
        _styleResolver = new StyleResolver(_expressionEvaluator, _styleResolverLoggerMock.Object);

        _renderer = new ShowOnceRenderer(_expressionEvaluator, _styleResolver, _loggerMock.Object);
    }

    public void Dispose()
    {
        _cache.Dispose();
    }

    #region Component Type Tests

    [Fact]
    public void ComponentType_ShouldBeShowOnce()
    {
        // Assert
        _renderer.ComponentType.Should().Be(ComponentType.ShowOnce);
    }

    [Fact]
    public void RendererName_ShouldBeShowOnceRenderer()
    {
        // Assert
        _renderer.RendererName.Should().Be("ShowOnceRenderer");
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
        var node = new LayoutNode { Type = ComponentType.ShowOnce, Id = "test-show-once" };

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
            Type = ComponentType.ShowOnce,
            Id = "test-show-once",
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
            Type = ComponentType.ShowOnce,
            Id = "test-show-once",
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
            Type = ComponentType.ShowOnce,
            Id = "test-show-once",
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
            Type = ComponentType.ShowOnce,
            Id = "test-show-once",
            Child = childNode,
        };

        var context = new RenderContext();
        var container = new TestContainer();

        // Act
        _renderer.Render(container, node, context, _layoutEngineMock.Object);

        // Assert - ShowOnce should call layout engine to render its child
        _layoutEngineMock.Verify(
            x => x.Render(It.IsAny<IContainer>(), It.Is<LayoutNode>(n => n == childNode), context),
            Times.Once
        );
    }

    [Fact]
    public void Render_WithoutChild_ShouldNotCallLayoutEngine()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.ShowOnce, Id = "test-show-once" };

        var context = new RenderContext();
        var container = new TestContainer();

        // Act
        _renderer.Render(container, node, context, _layoutEngineMock.Object);

        // Assert - No child, so layout engine should not be called
        _layoutEngineMock.Verify(
            x =>
                x.Render(It.IsAny<IContainer>(), It.IsAny<LayoutNode>(), It.IsAny<RenderContext>()),
            Times.Never
        );
    }

    [Fact]
    public void Render_WithNullContainer_ShouldThrowArgumentNullException()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.ShowOnce, Id = "test-show-once" };
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
