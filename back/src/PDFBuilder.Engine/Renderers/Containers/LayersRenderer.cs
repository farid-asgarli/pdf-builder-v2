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
/// <para>
/// <b>QuestPDF Layers API:</b>
/// <code>
/// container.Layers(layers => { layers.Layer()..., layers.PrimaryLayer()... })
/// </code>
/// </para>
///
/// <para>
/// <b>Component-Level vs Page-Level Backgrounds/Foregrounds:</b>
/// </para>
/// <para>
/// This Layers component provides <b>component-level</b> layering, which is distinct from the
/// page-level Background/Foreground slots in <see cref="PDFBuilder.Core.Domain.TemplateLayout"/>:
/// </para>
/// <list type="table">
///   <listheader>
///     <term>Feature</term>
///     <description>Layers Component | TemplateLayout Background/Foreground</description>
///   </listheader>
///   <item>
///     <term>Scope</term>
///     <description>Local to the component | Full page (ignores margins)</description>
///   </item>
///   <item>
///     <term>Size</term>
///     <description>Determined by primary layer | Full page dimensions</description>
///   </item>
///   <item>
///     <term>Nesting</term>
///     <description>Can be nested within other components | Only at page root level</description>
///   </item>
///   <item>
///     <term>Use Case</term>
///     <description>Cards with backgrounds, local watermarks | Page watermarks, full-page backgrounds</description>
///   </item>
/// </list>
///
/// <para>
/// <b>Behavior:</b>
/// </para>
/// <list type="bullet">
///   <item>Exactly one child must be marked as the primary layer (isPrimary=true)</item>
///   <item>The primary layer determines the container's size and supports paging</item>
///   <item>Other layers are drawn in order of appearance (first = bottommost)</item>
///   <item>All layers repeat on each page when content paginates</item>
/// </list>
///
/// <para>
/// <b>Properties (on container):</b> None
/// </para>
///
/// <para>
/// <b>Child Properties (on each layer child node):</b>
/// </para>
/// <list type="bullet">
///   <item><b>isPrimary</b> (bool): If true, this is the primary content layer. Default: false</item>
/// </list>
///
/// <para>
/// <b>Z-Order:</b>
/// Children appear in the order they are defined:
/// </para>
/// <list type="bullet">
///   <item>Non-primary layers before the primary layer appear underneath (background)</item>
///   <item>Non-primary layers after the primary layer appear on top (foreground/watermark)</item>
/// </list>
///
/// <para>
/// <b>Common use cases:</b>
/// </para>
/// <list type="bullet">
///   <item>Cards or panels with background images/colors</item>
///   <item>Content with decorative overlays</item>
///   <item>Local watermarks on specific sections</item>
///   <item>Layered graphics with text</item>
/// </list>
///
/// <para>
/// <b>When to use TemplateLayout.Background/Foreground instead:</b>
/// </para>
/// <list type="bullet">
///   <item>Full-page watermarks (e.g., "DRAFT", "CONFIDENTIAL")</item>
///   <item>Page backgrounds that extend edge-to-edge</item>
///   <item>Security overlays that cover the entire page</item>
///   <item>Decorative page borders</item>
/// </list>
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
