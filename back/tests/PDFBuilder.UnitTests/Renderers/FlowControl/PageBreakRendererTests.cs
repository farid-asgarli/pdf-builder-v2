using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Renderers.FlowControl;
using PDFBuilder.Engine.Services;
using QuestPDF.Infrastructure;

namespace PDFBuilder.UnitTests.Renderers.FlowControl;

/// <summary>
/// Unit tests for the PageBreakRenderer class.
/// </summary>
public sealed class PageBreakRendererTests : IDisposable
{
    private readonly Mock<ILogger<PageBreakRenderer>> _loggerMock;
    private readonly Mock<ILogger<ExpressionEvaluator>> _expressionLoggerMock;
    private readonly Mock<ILogger<StyleResolver>> _styleResolverLoggerMock;
    private readonly Mock<ILayoutEngine> _layoutEngineMock;
    private readonly MemoryCache _cache;
    private readonly ExpressionEvaluator _expressionEvaluator;
    private readonly StyleResolver _styleResolver;
    private readonly PageBreakRenderer _renderer;

    public PageBreakRendererTests()
    {
        _loggerMock = new Mock<ILogger<PageBreakRenderer>>();
        _expressionLoggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _styleResolverLoggerMock = new Mock<ILogger<StyleResolver>>();
        _layoutEngineMock = new Mock<ILayoutEngine>();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _expressionEvaluator = new ExpressionEvaluator(_cache, _expressionLoggerMock.Object);
        _styleResolver = new StyleResolver(_expressionEvaluator, _styleResolverLoggerMock.Object);

        _renderer = new PageBreakRenderer(_expressionEvaluator, _styleResolver, _loggerMock.Object);
    }

    public void Dispose()
    {
        _cache.Dispose();
    }

    #region Component Type Tests

    [Fact]
    public void ComponentType_ShouldBePageBreak()
    {
        // Assert
        _renderer.ComponentType.Should().Be(ComponentType.PageBreak);
    }

    [Fact]
    public void RendererName_ShouldBePageBreakRenderer()
    {
        // Assert
        _renderer.RendererName.Should().Be("PageBreakRenderer");
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
    public void IsWrapper_ShouldBeFalse()
    {
        // Assert
        _renderer.IsWrapper.Should().BeFalse();
    }

    [Fact]
    public void RequiresExpressionEvaluation_ShouldBeFalse()
    {
        // Assert
        _renderer.RequiresExpressionEvaluation.Should().BeFalse();
    }

    [Fact]
    public void InheritsStyle_ShouldBeFalse()
    {
        // Assert
        _renderer.InheritsStyle.Should().BeFalse();
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
        var node = new LayoutNode { Type = ComponentType.PageBreak, Id = "test-page-break" };

        // Act
        var errors = _renderer.ValidateProperties(node);

        // Assert
        errors.Where(e => e.Severity == ValidationSeverity.Error).Should().BeEmpty();
    }

    [Fact]
    public void ValidateProperties_WithChildren_ShouldReturnWarning()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.PageBreak,
            Id = "test-page-break",
            Children = [new LayoutNode { Type = ComponentType.Text }],
        };

        // Act
        var errors = _renderer.ValidateProperties(node).ToList();

        // Assert
        errors
            .Should()
            .ContainSingle(e =>
                e.Severity == ValidationSeverity.Warning && e.PropertyName == "children"
            );
    }

    [Fact]
    public void ValidateProperties_WithChild_ShouldReturnWarning()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.PageBreak,
            Id = "test-page-break",
            Child = new LayoutNode { Type = ComponentType.Text },
        };

        // Act
        var errors = _renderer.ValidateProperties(node).ToList();

        // Assert
        errors
            .Should()
            .ContainSingle(e =>
                e.Severity == ValidationSeverity.Warning && e.PropertyName == "child"
            );
    }

    #endregion

    #region Render Tests

    [Fact]
    public void Render_WithValidNode_ShouldNotThrow()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.PageBreak, Id = "test-page-break" };

        var context = new RenderContext();

        // Use a test container that tracks method calls
        var container = new TestContainer();

        // Act
        var act = () => _renderer.Render(container, node, context, _layoutEngineMock.Object);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void Render_WithValidNode_ShouldSetChildOnContainer()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.PageBreak, Id = "test-page-break" };

        var context = new RenderContext();
        var container = new TestContainer();

        // Act
        _renderer.Render(container, node, context, _layoutEngineMock.Object);

        // Assert - QuestPDF's PageBreak() extension sets the Child property
        // to a PageBreak element, so Child should not be null after rendering
        container.Child.Should().NotBeNull();
    }

    [Fact]
    public void Render_ShouldNotRenderChildren()
    {
        // Arrange
        var node = new LayoutNode
        {
            Type = ComponentType.PageBreak,
            Id = "test-page-break",
            Children = [new LayoutNode { Type = ComponentType.Text }],
        };

        var context = new RenderContext();
        var container = new TestContainer();

        // Act
        _renderer.Render(container, node, context, _layoutEngineMock.Object);

        // Assert - layout engine should never be asked to render children
        _layoutEngineMock.Verify(
            x =>
                x.Render(It.IsAny<IContainer>(), It.IsAny<LayoutNode>(), It.IsAny<RenderContext>()),
            Times.Never
        );
        _layoutEngineMock.Verify(
            x =>
                x.RenderChildren(
                    It.IsAny<IContainer>(),
                    It.IsAny<IList<LayoutNode>>(),
                    It.IsAny<RenderContext>()
                ),
            Times.Never
        );
    }

    [Fact]
    public void Render_WithNullContainer_ShouldThrowArgumentNullException()
    {
        // Arrange
        var node = new LayoutNode { Type = ComponentType.PageBreak, Id = "test-page-break" };
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

        // Assert - BaseRenderer delegates to RenderWithContext which throws on null
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
