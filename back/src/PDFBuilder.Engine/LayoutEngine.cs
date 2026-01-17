using System.Collections;
using System.Diagnostics;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Exceptions;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Factories;
using PDFBuilder.Engine.Services;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine;

/// <summary>
/// Main layout engine that orchestrates PDF layout rendering.
/// Handles recursive component rendering, expression evaluation, and style inheritance.
/// </summary>
/// <remarks>
/// Initializes a new instance of the LayoutEngine class.
/// </remarks>
/// <param name="rendererFactory">The renderer factory for creating component renderers.</param>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for inheritance.</param>
/// <param name="componentRegistry">The component registry for metadata.</param>
/// <param name="logger">The logger instance.</param>
public sealed class LayoutEngine(
    IRendererFactory rendererFactory,
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ComponentRegistry componentRegistry,
    ILogger<LayoutEngine> logger
) : ILayoutEngine
{
    private readonly IRendererFactory _rendererFactory =
        rendererFactory ?? throw new ArgumentNullException(nameof(rendererFactory));
    private readonly IExpressionEvaluator _expressionEvaluator =
        expressionEvaluator ?? throw new ArgumentNullException(nameof(expressionEvaluator));
    private readonly StyleResolver _styleResolver =
        styleResolver ?? throw new ArgumentNullException(nameof(styleResolver));
    private readonly ComponentRegistry _componentRegistry =
        componentRegistry ?? throw new ArgumentNullException(nameof(componentRegistry));
    private readonly ILogger<LayoutEngine> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Maximum depth of nested components to prevent stack overflow.
    /// </summary>
    private const int MaxRenderingDepth = 100;

    /// <inheritdoc />
    public void Render(IContainer container, LayoutNode node, RenderContext context)
    {
        ArgumentNullException.ThrowIfNull(container);
        ArgumentNullException.ThrowIfNull(node);
        ArgumentNullException.ThrowIfNull(context);

        RenderInternal(container, node, context, "root", 0);
    }

    /// <inheritdoc />
    public void RenderChildren(
        IContainer container,
        IEnumerable<LayoutNode> nodes,
        RenderContext context
    )
    {
        ArgumentNullException.ThrowIfNull(container);
        ArgumentNullException.ThrowIfNull(nodes);
        ArgumentNullException.ThrowIfNull(context);

        var nodeList = nodes.ToList();
        _logger.LogTrace("Rendering {Count} children", nodeList.Count);

        for (var i = 0; i < nodeList.Count; i++)
        {
            var node = nodeList[i];
            var childPath = $"children[{i}]";

            // For collections, we render each child into the same container
            // The container handles layout (Column stacks vertically, Row horizontally, etc.)
            RenderInternal(container, node, context, childPath, 0);
        }
    }

    /// <inheritdoc />
    public LayoutValidationResult ValidateLayout(LayoutNode node)
    {
        ArgumentNullException.ThrowIfNull(node);

        var result = new LayoutValidationResult { IsValid = true };
        ValidateNodeRecursive(node, "root", result);
        return result;
    }

    /// <inheritdoc />
    public IComponentRenderer GetRenderer(ComponentType componentType)
    {
        return _rendererFactory.GetRenderer(componentType);
    }

    /// <inheritdoc />
    public bool HasRenderer(ComponentType componentType)
    {
        return _rendererFactory.HasRenderer(componentType);
    }

    /// <summary>
    /// Internal recursive rendering method with depth tracking and path building.
    /// </summary>
    private void RenderInternal(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        string path,
        int depth
    )
    {
        // Guard against infinite recursion
        if (depth > MaxRenderingDepth)
        {
            var error =
                $"Maximum rendering depth ({MaxRenderingDepth}) exceeded at path '{path}'. "
                + "Check for circular references or excessive nesting in your layout.";
            _logger.LogError(error);
            throw new LayoutRenderException(error, node.Id, path, node.Type.ToString());
        }

        var stopwatch = Stopwatch.StartNew();
        var nodeId = node.Id ?? $"anonymous-{node.Type}";
        var fullPath = string.IsNullOrEmpty(node.Id) ? path : $"{path}#{node.Id}";

        _logger.LogTrace(
            "Starting render of {ComponentType} at path {Path} (depth: {Depth})",
            node.Type,
            fullPath,
            depth
        );

        try
        {
            // Step 1: Check visibility condition
            if (!EvaluateVisibility(node, context, fullPath))
            {
                _logger.LogTrace(
                    "Node {NodeId} at path {Path} is not visible, skipping render",
                    nodeId,
                    fullPath
                );
                return;
            }

            // Step 2: Handle RepeatFor iteration
            if (ShouldRepeat(node))
            {
                RenderRepeated(container, node, context, fullPath, depth);
                return;
            }

            // Step 3: Resolve and apply styles
            var childContext = _styleResolver.CreateChildContext(node, context);

            // Step 4: Get the renderer for this component type
            var renderer = GetRendererWithLogging(node.Type, fullPath);

            // Step 5: Create a wrapper for child rendering with depth tracking
            var childEngine = new ChildRenderingLayoutEngine(this, fullPath, depth + 1);

            // Step 6: Render the component
            _logger.LogDebug(
                "Rendering component {ComponentType} (id: {NodeId}) at path {Path}",
                node.Type,
                nodeId,
                fullPath
            );

            renderer.Render(container, node, childContext, childEngine);

            stopwatch.Stop();
            _logger.LogTrace(
                "Completed render of {ComponentType} at path {Path} in {ElapsedMs}ms",
                node.Type,
                fullPath,
                stopwatch.ElapsedMilliseconds
            );
        }
        catch (LayoutRenderException)
        {
            throw;
        }
        catch (InvalidComponentException)
        {
            throw;
        }
        catch (ExpressionEvaluationException ex)
        {
            _logger.LogError(
                ex,
                "Expression evaluation failed for component {ComponentType} at path {Path}",
                node.Type,
                fullPath
            );

            throw new LayoutRenderException(
                $"Expression evaluation failed: {ex.Message}",
                node.Id,
                fullPath,
                node.Type.ToString(),
                ex
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to render component {ComponentType} at path {Path}",
                node.Type,
                fullPath
            );

            throw new LayoutRenderException(
                $"Failed to render {node.Type}: {ex.Message}",
                node.Id,
                fullPath,
                node.Type.ToString(),
                ex
            );
        }
    }

    /// <summary>
    /// Evaluates the visibility condition for a node.
    /// </summary>
    private bool EvaluateVisibility(LayoutNode node, RenderContext context, string path)
    {
        if (string.IsNullOrWhiteSpace(node.Visible))
        {
            return true;
        }

        try
        {
            // Handle expression markers if present
            var expression = node.Visible.Trim();
            if (expression.StartsWith("{{") && expression.EndsWith("}}"))
            {
                expression = expression[2..^2].Trim();
            }

            var result = _expressionEvaluator.EvaluateCondition(expression, context);

            _logger.LogTrace(
                "Visibility expression '{Expression}' for node at {Path} evaluated to {Result}",
                node.Visible,
                path,
                result
            );

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to evaluate visibility expression '{Expression}' for node at {Path}, defaulting to visible",
                node.Visible,
                path
            );

            // Default to visible on expression error
            return true;
        }
    }

    /// <summary>
    /// Checks if a node has a RepeatFor directive.
    /// </summary>
    private static bool ShouldRepeat(LayoutNode node)
    {
        return !string.IsNullOrWhiteSpace(node.RepeatFor);
    }

    /// <summary>
    /// Renders a node with RepeatFor iteration.
    /// </summary>
    private void RenderRepeated(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        string path,
        int depth
    )
    {
        var repeatExpression = node.RepeatFor!.Trim();

        // Handle expression markers if present
        if (repeatExpression.StartsWith("{{") && repeatExpression.EndsWith("}}"))
        {
            repeatExpression = repeatExpression[2..^2].Trim();
        }

        _logger.LogTrace(
            "Evaluating RepeatFor expression '{Expression}' at path {Path}",
            repeatExpression,
            path
        );

        IEnumerable? collection;
        try
        {
            collection = _expressionEvaluator.Evaluate<IEnumerable>(repeatExpression, context);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to evaluate RepeatFor expression '{Expression}' at path {Path}",
                repeatExpression,
                path
            );

            throw new LayoutRenderException(
                $"Failed to evaluate RepeatFor expression: {ex.Message}",
                node.Id,
                path,
                node.Type.ToString(),
                ex
            );
        }

        if (collection is null)
        {
            _logger.LogWarning(
                "RepeatFor expression '{Expression}' at path {Path} returned null, skipping",
                repeatExpression,
                path
            );
            return;
        }

        var itemName = node.RepeatAs ?? "item";
        var indexName = node.RepeatIndex ?? "index";
        var items = collection.Cast<object?>().ToList();

        _logger.LogDebug(
            "Repeating node at {Path} for {Count} items (item: {ItemName}, index: {IndexName})",
            path,
            items.Count,
            itemName,
            indexName
        );

        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var iterationPath = $"{path}[{i}]";

            // Create a scoped context for this iteration
            using var scope = context.CreateScope();
            context.SetupRepeatIteration(i, items.Count, item, itemName, indexName);

            _logger.LogTrace(
                "Rendering iteration {Index} of {Count} at path {Path}",
                i + 1,
                items.Count,
                iterationPath
            );

            // Create a clone of the node without the RepeatFor to prevent infinite recursion
            var iterationNode = CloneNodeWithoutRepeat(node);

            // Render the iteration
            RenderInternal(container, iterationNode, context, iterationPath, depth);
        }
    }

    /// <summary>
    /// Creates a shallow clone of a node without the RepeatFor directive.
    /// </summary>
    private static LayoutNode CloneNodeWithoutRepeat(LayoutNode node)
    {
        return new LayoutNode
        {
            Id = node.Id,
            Type = node.Type,
            Properties = node.Properties,
            Children = node.Children,
            Child = node.Child,
            Style = node.Style,
            Visible = node.Visible,
            RepeatFor = null, // Clear RepeatFor to prevent recursion
            RepeatAs = null,
            RepeatIndex = null,
        };
    }

    /// <summary>
    /// Gets a renderer with logging.
    /// </summary>
    private IComponentRenderer GetRendererWithLogging(ComponentType componentType, string path)
    {
        if (!_rendererFactory.HasRenderer(componentType))
        {
            var metadata = _componentRegistry.GetMetadata(componentType);

            _logger.LogError(
                "No renderer found for component type {ComponentType} ({Category}) at path {Path}. "
                    + "This component may not be implemented yet (Tier {Tier}).",
                componentType,
                metadata.Category,
                path,
                metadata.PriorityTier
            );

            throw new InvalidComponentException(componentType);
        }

        return _rendererFactory.GetRenderer(componentType);
    }

    /// <summary>
    /// Recursively validates a node and its children.
    /// </summary>
    private void ValidateNodeRecursive(LayoutNode node, string path, LayoutValidationResult result)
    {
        // Validate component type is registered
        if (!_componentRegistry.IsRegistered(node.Type))
        {
            result.AddError(
                new LayoutValidationError
                {
                    NodeId = node.Id,
                    Path = path,
                    Message = $"Unknown component type '{node.Type}'",
                    ErrorCode = "UNKNOWN_COMPONENT",
                }
            );
        }
        else
        {
            // Validate required properties
            var propertyErrors = _componentRegistry.ValidateRequiredProperties(node);
            foreach (var error in propertyErrors)
            {
                result.AddError(
                    new LayoutValidationError
                    {
                        NodeId = node.Id,
                        Path = path,
                        Message = error,
                        ErrorCode = "MISSING_REQUIRED_PROPERTY",
                    }
                );
            }

            // Check if renderer exists
            if (!_rendererFactory.HasRenderer(node.Type))
            {
                var metadata = _componentRegistry.GetMetadata(node.Type);
                result.AddWarning(
                    new LayoutValidationWarning
                    {
                        NodeId = node.Id,
                        Path = path,
                        Message =
                            $"No renderer found for component type '{node.Type}' (Tier {metadata.PriorityTier}). "
                            + "This component may not be implemented yet.",
                        WarningCode = "RENDERER_NOT_FOUND",
                    }
                );
            }
        }

        // Validate expressions
        ValidateExpressions(node, path, result);

        // Validate children
        if (node.Children is not null)
        {
            for (var i = 0; i < node.Children.Count; i++)
            {
                var childPath = $"{path}.children[{i}]";
                ValidateNodeRecursive(node.Children[i], childPath, result);
            }
        }

        // Validate single child
        if (node.Child is not null)
        {
            var childPath = $"{path}.child";
            ValidateNodeRecursive(node.Child, childPath, result);
        }
    }

    /// <summary>
    /// Validates expressions in a node.
    /// </summary>
    private void ValidateExpressions(LayoutNode node, string path, LayoutValidationResult result)
    {
        // Validate Visible expression
        if (!string.IsNullOrEmpty(node.Visible))
        {
            ValidateExpression(node.Visible, "Visible", node, path, result);
        }

        // Validate RepeatFor expression
        if (!string.IsNullOrEmpty(node.RepeatFor))
        {
            ValidateExpression(node.RepeatFor, "RepeatFor", node, path, result);
        }

        // Validate property expressions
        if (node.Properties is not null)
        {
            foreach (var propertyName in node.Properties.Keys)
            {
                var stringValue = node.GetStringProperty(propertyName);
                if (
                    stringValue is not null
                    && _expressionEvaluator.ContainsExpressions(stringValue)
                )
                {
                    ValidateExpression(stringValue, propertyName, node, path, result);
                }
            }
        }
    }

    /// <summary>
    /// Validates a single expression.
    /// </summary>
    private void ValidateExpression(
        string expression,
        string propertyName,
        LayoutNode node,
        string path,
        LayoutValidationResult result
    )
    {
        var validationResults = _expressionEvaluator.ValidateExpressions(expression);

        foreach (var validationResult in validationResults)
        {
            if (!validationResult.IsValid)
            {
                result.AddError(
                    new LayoutValidationError
                    {
                        NodeId = node.Id,
                        Path = path,
                        PropertyName = propertyName,
                        Message =
                            $"Invalid expression in '{propertyName}': {validationResult.ErrorMessage}",
                        ErrorCode = "INVALID_EXPRESSION",
                    }
                );
            }
        }
    }

    /// <summary>
    /// Internal class that wraps the layout engine for child rendering with path and depth tracking.
    /// </summary>
    private sealed class ChildRenderingLayoutEngine(
        LayoutEngine parent,
        string parentPath,
        int depth
    ) : ILayoutEngine
    {
        private readonly LayoutEngine _parent = parent;
        private readonly string _parentPath = parentPath;
        private readonly int _depth = depth;

        public void Render(IContainer container, LayoutNode node, RenderContext context)
        {
            var childPath = BuildChildPath(node);
            _parent.RenderInternal(container, node, context, childPath, _depth);
        }

        public void RenderChildren(
            IContainer container,
            IEnumerable<LayoutNode> nodes,
            RenderContext context
        )
        {
            var nodeList = nodes.ToList();

            for (var i = 0; i < nodeList.Count; i++)
            {
                var node = nodeList[i];
                var childPath = $"{_parentPath}.children[{i}]";
                _parent.RenderInternal(container, node, context, childPath, _depth);
            }
        }

        public LayoutValidationResult ValidateLayout(LayoutNode node)
        {
            return _parent.ValidateLayout(node);
        }

        public IComponentRenderer GetRenderer(ComponentType componentType)
        {
            return _parent.GetRenderer(componentType);
        }

        public bool HasRenderer(ComponentType componentType)
        {
            return _parent.HasRenderer(componentType);
        }

        private string BuildChildPath(LayoutNode node)
        {
            if (!string.IsNullOrEmpty(node.Id))
            {
                return $"{_parentPath}.child#{node.Id}";
            }

            return $"{_parentPath}.child";
        }
    }
}
