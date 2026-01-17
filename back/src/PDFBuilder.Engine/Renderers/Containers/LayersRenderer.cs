using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Containers;

/// <summary>
/// Renders a Layers container component that stacks content on multiple planes.
/// Supports background layers (underneath), primary layer (main content), and foreground layers (on top).
/// </summary>
/// <remarks>
/// QuestPDF Layers API: container.Layers(layers => { layers.Layer()..., layers.PrimaryLayer()... })
///
/// Properties:
/// - (none at container level)
///
/// Children:
/// - Each child should be a Layer with an optional "isPrimary" property
/// - Exactly one child must have isPrimary=true to define the primary layer
/// - The primary layer determines the container's size and supports paging
/// - Other layers are drawn in order of appearance (first = bottommost)
///
/// Child Properties (on each layer child node):
/// - isPrimary (bool): If true, this is the primary content layer. Default: false
///
/// Order of children determines z-order:
/// - Children appear in the order they are defined
/// - Use isPrimary on one child to designate it as the main content layer
/// - Non-primary layers before the primary layer appear underneath
/// - Non-primary layers after the primary layer appear on top
///
/// Common use cases:
/// - Background images behind content
/// - Watermarks on top of content
/// - Decorative elements layered with text
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="LayersRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class LayersRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<LayersRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        /// <summary>
        /// Child property indicating this is the primary layer.
        /// </summary>
        public const string IsPrimary = "isPrimary";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Layers;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Container;

    /// <inheritdoc />
    public override bool SupportsChildren => true;

    /// <inheritdoc />
    public override bool IsWrapper => false;

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        var children = node.Children;

        if (children is null || children.Count == 0)
        {
            Logger.LogDebug("Layers node {NodeId} has no children to render", node.Id ?? "unnamed");
            return;
        }

        // Find the primary layer - exactly one must be marked as primary
        var primaryLayerIndex = FindPrimaryLayerIndex(children, context);

        if (primaryLayerIndex < 0)
        {
            Logger.LogWarning(
                "Layers node {NodeId} has no primary layer defined. First child will be used as primary.",
                node.Id ?? "unnamed"
            );
            primaryLayerIndex = 0;
        }

        Logger.LogTrace(
            "Rendering Layers with {ChildCount} layers, primary layer at index {PrimaryIndex}",
            children.Count,
            primaryLayerIndex
        );

        container.Layers(layers =>
        {
            // Render all layers in order
            // QuestPDF draws layers in the order they are defined
            for (var i = 0; i < children.Count; i++)
            {
                var child = children[i];
                var isPrimary = i == primaryLayerIndex;

                if (isPrimary)
                {
                    // Primary layer - determines container size and supports paging
                    layers
                        .PrimaryLayer()
                        .Element(layerContainer =>
                        {
                            layoutEngine.Render(layerContainer, child, context);
                        });
                }
                else
                {
                    // Regular layer - stacked underneath or on top based on order
                    layers
                        .Layer()
                        .Element(layerContainer =>
                        {
                            layoutEngine.Render(layerContainer, child, context);
                        });
                }
            }
        });
    }

    /// <summary>
    /// Finds the index of the primary layer among the children.
    /// </summary>
    /// <param name="children">The list of child nodes.</param>
    /// <param name="context">The render context.</param>
    /// <returns>The index of the primary layer, or -1 if none is found.</returns>
    private int FindPrimaryLayerIndex(List<LayoutNode> children, RenderContext context)
    {
        var primaryCount = 0;
        var primaryIndex = -1;

        for (var i = 0; i < children.Count; i++)
        {
            var child = children[i];
            var isPrimary = EvaluateBoolProperty(child, PropertyNames.IsPrimary, context, false);

            if (isPrimary == true)
            {
                primaryCount++;
                if (primaryIndex < 0)
                {
                    primaryIndex = i;
                }
            }
        }

        if (primaryCount > 1)
        {
            Logger.LogWarning(
                "Multiple primary layers defined ({Count}). Using the first one at index {Index}.",
                primaryCount,
                primaryIndex
            );
        }

        return primaryIndex;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            // No container-level properties, but document child properties
            // Child properties are documented in the class remarks
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate that at least one child exists
        if (node.Children is null || node.Children.Count == 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "children",
                    Message = "Layers component must have at least one child layer",
                    Severity = ValidationSeverity.Error,
                }
            );
            return errors;
        }

        // Count primary layers
        var primaryCount = 0;
        foreach (var child in node.Children)
        {
            var isPrimary = child.GetBoolProperty(PropertyNames.IsPrimary, false);
            if (isPrimary == true)
            {
                primaryCount++;
            }
        }

        if (primaryCount == 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.IsPrimary,
                    Message =
                        "Layers component must have exactly one child with isPrimary=true. First child will be used as primary if not specified.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }
        else if (primaryCount > 1)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.IsPrimary,
                    Message =
                        $"Layers component has {primaryCount} primary layers, but only one is allowed. Only the first will be used as primary.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
