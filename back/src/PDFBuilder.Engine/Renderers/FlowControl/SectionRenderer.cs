using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.FlowControl;

/// <summary>
/// Renders a Section component that defines a named fragment of the document.
/// Sections are useful for creating table of contents and enabling document navigation.
/// </summary>
/// <remarks>
/// QuestPDF Section API:
/// - container.Section("name") - Creates a named section that can span multiple pages
/// - container.SectionLink("name") - Creates a clickable link to navigate to a section
/// - text.BeginPageNumberOfSection("name") - Displays the starting page number of a section
/// - text.EndPageNumberOfSection("name") - Displays the ending page number of a section
///
/// Properties:
/// - name (string, required): The unique identifier for this section
/// - child (LayoutNode, optional): The content to include in the section
///
/// Use Cases:
/// - Creating table of contents with page numbers
/// - Enabling cross-document navigation
/// - Organizing document into logical sections
/// - Generating clickable navigation links
///
/// Section names should be unique within the document. The section name is used for:
/// - Navigation links (SectionLink)
/// - Page number references (BeginPageNumberOfSection, EndPageNumberOfSection)
///
/// Example JSON (Section definition):
/// <code>
/// {
///   "type": "Section",
///   "name": "introduction",
///   "child": {
///     "type": "Column",
///     "children": [
///       { "type": "Text", "content": "Introduction", "style": { "fontSize": 24, "fontWeight": "bold" } },
///       { "type": "Text", "content": "This document explains..." }
///     ]
///   }
/// }
/// </code>
///
/// Complete example with Table of Contents:
/// <code>
/// {
///   "type": "Column",
///   "children": [
///     // Table of Contents
///     { "type": "Text", "content": "Table of Contents", "style": { "fontSize": 24, "fontWeight": "bold" } },
///     {
///       "type": "SectionLink",
///       "targetSection": "chapter-1",
///       "child": { "type": "Text", "content": "Chapter 1 - Introduction" }
///     },
///     { "type": "PageBreak" },
///
///     // Actual content section
///     {
///       "type": "Section",
///       "name": "chapter-1",
///       "child": {
///         "type": "Text",
///         "content": "Chapter 1: Introduction..."
///       }
///     }
///   ]
/// }
/// </code>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="SectionRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class SectionRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<SectionRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Section;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.FlowControl;

    /// <summary>
    /// Section supports a single child element as the section content.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// Section is a wrapper that wraps its child content with section metadata.
    /// </summary>
    public override bool IsWrapper => true;

    /// <summary>
    /// Section requires expression evaluation for the name property.
    /// </summary>
    public override bool RequiresExpressionEvaluation => true;

    /// <summary>
    /// Section passes style inheritance to its child.
    /// </summary>
    public override bool InheritsStyle => true;

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        // Get the section name with expression evaluation
        var sectionName = EvaluateStringProperty(node, "name", context);

        if (string.IsNullOrWhiteSpace(sectionName))
        {
            throw new InvalidOperationException(
                $"Section component requires a non-empty 'name' property. Node: {node.Id ?? "unnamed"}"
            );
        }

        Logger.LogTrace(
            "Rendering Section for node {NodeId} with name='{SectionName}'",
            node.Id ?? "unnamed",
            sectionName
        );

        // Apply Section with the specified name
        container
            .Section(sectionName)
            .Element(innerContainer =>
            {
                // Render child using the base class helper method
                RenderChild(innerContainer, node, context, layoutEngine);
            });

        Logger.LogDebug(
            "Section rendered successfully for node {NodeId} with name='{SectionName}'",
            node.Id ?? "unnamed",
            sectionName
        );
    }

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        return new[] { "name" };
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?> { ["child"] = null };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate name property is present
        if (!node.HasProperty("name"))
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "name",
                    Message = "Section component requires a 'name' property.",
                    Severity = ValidationSeverity.Error,
                }
            );
        }
        else
        {
            // Validate name is a non-empty string (unless it's an expression)
            var name = node.GetStringProperty("name");
            if (string.IsNullOrWhiteSpace(name))
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = "name",
                        Message = "Section 'name' cannot be empty or whitespace.",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
        }

        // Warn if no child is defined
        if (node.Child is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message = "Section component has no child. The section will be empty.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Warn if using children instead of child
        if (node.Children is not null && node.Children.Count > 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "children",
                    Message =
                        "Section component uses 'child' not 'children'. Only the 'child' property will be used.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
