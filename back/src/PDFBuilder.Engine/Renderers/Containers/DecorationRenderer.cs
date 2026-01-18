using System.Text.Json;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Containers;

/// <summary>
/// Renders a Decoration container component that divides space into three sections:
/// before (header), content (main), and after (footer).
/// </summary>
/// <remarks>
/// <para>
/// <b>QuestPDF Decoration API:</b>
/// <code>
/// container.Decoration(dec => { dec.Before()..., dec.Content()..., dec.After()... })
/// </code>
/// </para>
///
/// <para>
/// <b>Component-Level vs Page-Level Headers/Footers:</b>
/// </para>
/// <para>
/// This Decoration component provides <b>component-level</b> repeating headers and footers,
/// which are distinct from the page-level Header/Footer slots in <see cref="PDFBuilder.Core.Domain.TemplateLayout"/>:
/// </para>
/// <list type="table">
///   <listheader>
///     <term>Feature</term>
///     <description>Decoration Component | TemplateLayout Header/Footer</description>
///   </listheader>
///   <item>
///     <term>Scope</term>
///     <description>Local to the component | Global to the entire page</description>
///   </item>
///   <item>
///     <term>Position</term>
///     <description>Within the content flow | Fixed page slots (outside margins)</description>
///   </item>
///   <item>
///     <term>Nesting</term>
///     <description>Can be nested within other components | Only at page root level</description>
///   </item>
///   <item>
///     <term>Use Case</term>
///     <description>Table captions, section headers | Company logos, page numbers</description>
///   </item>
/// </list>
///
/// <para>
/// <b>Behavior:</b>
/// </para>
/// <list type="bullet">
///   <item>The 'before' section is rendered above the main content on every page the content spans</item>
///   <item>The 'content' section is the main content that may span multiple pages</item>
///   <item>The 'after' section is rendered below the main content on every page the content spans</item>
/// </list>
///
/// <para>
/// <b>Properties:</b>
/// </para>
/// <list type="bullet">
///   <item><b>before</b> (LayoutNode): Optional. Content to render above the main content, repeated on each page.</item>
///   <item><b>content</b> (LayoutNode): Required. The main content section that may paginate.</item>
///   <item><b>after</b> (LayoutNode): Optional. Content to render below the main content, repeated on each page.</item>
/// </list>
///
/// <para>
/// <b>Common use cases:</b>
/// </para>
/// <list type="bullet">
///   <item>Table headers that repeat on each page when a table spans multiple pages</item>
///   <item>Section-level captions or titles</item>
///   <item>Repeating annotations or notes for long content sections</item>
/// </list>
///
/// <para>
/// <b>Tip:</b> Combine with ShowOnce and SkipOnce components within before/after sections
/// to vary content between first and subsequent pages (e.g., "Instructions" vs "Instructions [continued]").
/// </para>
///
/// <para>
/// <b>When to use TemplateLayout.Header/Footer instead:</b>
/// </para>
/// <list type="bullet">
///   <item>Page numbers (using {{ currentPage }} and {{ totalPages }})</item>
///   <item>Company branding that appears on every page regardless of content</item>
///   <item>Legal disclaimers or confidentiality notices</item>
///   <item>Document-wide headers with title and date</item>
/// </list>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="DecorationRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class DecorationRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<DecorationRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        /// <summary>
        /// The section rendered before (above) the main content on each page.
        /// </summary>
        public const string Before = "before";

        /// <summary>
        /// The main content section.
        /// </summary>
        public const string Content = "content";

        /// <summary>
        /// The section rendered after (below) the main content on each page.
        /// </summary>
        public const string After = "after";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Decoration;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Container;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

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
        // Extract the three section nodes from properties
        var beforeNode = GetLayoutNodeProperty(node, PropertyNames.Before);
        var contentNode = GetLayoutNodeProperty(node, PropertyNames.Content);
        var afterNode = GetLayoutNodeProperty(node, PropertyNames.After);

        // Validate that content is present
        if (contentNode is null)
        {
            Logger.LogWarning(
                "Decoration node {NodeId} has no content section defined. Nothing will be rendered.",
                node.Id ?? "unnamed"
            );
            return;
        }

        var hasBeforeSection = beforeNode is not null;
        var hasAfterSection = afterNode is not null;

        Logger.LogTrace(
            "Rendering Decoration with before={HasBefore}, content=true, after={HasAfter}",
            hasBeforeSection,
            hasAfterSection
        );

        container.Decoration(decoration =>
        {
            // Render 'before' section (header)
            if (beforeNode is not null)
            {
                decoration
                    .Before()
                    .Element(beforeContainer =>
                    {
                        layoutEngine.Render(beforeContainer, beforeNode, context);
                    });
            }

            // Render 'content' section (main content)
            decoration
                .Content()
                .Element(contentContainer =>
                {
                    layoutEngine.Render(contentContainer, contentNode, context);
                });

            // Render 'after' section (footer)
            if (afterNode is not null)
            {
                decoration
                    .After()
                    .Element(afterContainer =>
                    {
                        layoutEngine.Render(afterContainer, afterNode, context);
                    });
            }
        });
    }

    /// <summary>
    /// Gets a LayoutNode from a property.
    /// </summary>
    /// <param name="node">The parent node.</param>
    /// <param name="propertyName">The property name.</param>
    /// <returns>The LayoutNode or null if not found.</returns>
    private LayoutNode? GetLayoutNodeProperty(LayoutNode node, string propertyName)
    {
        if (node.Properties is null || !node.Properties.TryGetValue(propertyName, out var element))
        {
            return null;
        }

        try
        {
            var options = new System.Text.Json.JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            };
            return element.Deserialize<LayoutNode>(options);
        }
        catch (System.Text.Json.JsonException ex)
        {
            Logger.LogWarning(
                ex,
                "Failed to deserialize {PropertyName} property as LayoutNode for node {NodeId}",
                propertyName,
                node.Id ?? "unnamed"
            );
            return null;
        }
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        return [PropertyNames.Content];
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            [PropertyNames.Before] = null,
            [PropertyNames.After] = null,
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate content section is present
        if (!node.HasProperty(PropertyNames.Content))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Content,
                    Message =
                        "Decoration component requires a 'content' property containing the main content layout",
                    Severity = ValidationSeverity.Error,
                }
            );
        }
        else
        {
            // Validate that content is a valid LayoutNode
            var contentNode = GetLayoutNodeProperty(node, PropertyNames.Content);
            if (contentNode is null)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.Content,
                        Message = "Decoration 'content' property must be a valid layout node",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
        }

        // Validate before section if present
        if (node.HasProperty(PropertyNames.Before))
        {
            var beforeNode = GetLayoutNodeProperty(node, PropertyNames.Before);
            if (beforeNode is null)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.Before,
                        Message = "Decoration 'before' property must be a valid layout node",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
        }

        // Validate after section if present
        if (node.HasProperty(PropertyNames.After))
        {
            var afterNode = GetLayoutNodeProperty(node, PropertyNames.After);
            if (afterNode is null)
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = PropertyNames.After,
                        Message = "Decoration 'after' property must be a valid layout node",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
        }

        return errors;
    }
}
