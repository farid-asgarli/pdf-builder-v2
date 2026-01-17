using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Special;

/// <summary>
/// Renders a DebugArea component that helps visually debug document layouts by drawing
/// a labeled box around its content. This aids in understanding spacing, alignment,
/// and pinpointing specific sections of the document during development.
/// </summary>
/// <remarks>
/// QuestPDF DebugArea API:
/// - container.DebugArea("label", color) - Draws a debug box with label and specified color
/// - container.DebugArea("label") - Draws a debug box with label (red by default)
/// - container.DebugArea() - Draws a debug box with no label (red by default)
///
/// Properties:
/// - label (string, optional): Text label to display on the debug area. Default: none.
/// - color (string, optional): Color for the debug border/label in hex format. Default: "#FF0000" (red).
/// - child (LayoutNode, optional): The child content to wrap with debug visualization.
///
/// Color Support:
/// - Accepts hex color codes: "#FF0000", "FF0000", "#ff6666"
/// - Common colors: red (default), blue (#0000FF), green (#00FF00), etc.
/// - Use contrasting colors to distinguish between different debug areas
///
/// Use Cases:
/// - Debugging complex layouts during development
/// - Understanding spacing and margin behavior
/// - Identifying specific sections when troubleshooting PDF generation
/// - Visual regression testing of document structure
/// - Learning and understanding QuestPDF layout behavior
///
/// Performance Note:
/// - DebugArea adds visual overhead and should typically be removed from production builds
/// - Consider using conditional logic or build configurations to exclude debug components
///
/// Example JSON (Simple debug area):
/// <code>
/// {
///   "type": "DebugArea",
///   "child": {
///     "type": "Placeholder"
///   }
/// }
/// </code>
///
/// Example JSON (Debug area with label and custom color):
/// <code>
/// {
///   "type": "DebugArea",
///   "label": "Header Section",
///   "color": "#0000FF",
///   "child": {
///     "type": "Column",
///     "children": [
///       { "type": "Text", "content": "Page Header" },
///       { "type": "Text", "content": "Subtitle" }
///     ]
///   }
/// }
/// </code>
///
/// Example JSON (Multiple debug areas for layout debugging):
/// <code>
/// {
///   "type": "Column",
///   "children": [
///     {
///       "type": "DebugArea",
///       "label": "Header",
///       "color": "#FF0000",
///       "child": { "type": "Placeholder" }
///     },
///     {
///       "type": "DebugArea",
///       "label": "Content",
///       "color": "#00FF00",
///       "child": { "type": "Placeholder" }
///     },
///     {
///       "type": "DebugArea",
///       "label": "Footer",
///       "color": "#0000FF",
///       "child": { "type": "Placeholder" }
///     }
///   ]
/// }
/// </code>
///
/// Example JSON (Grid layout debugging):
/// <code>
/// {
///   "type": "DebugArea",
///   "label": "Grid example",
///   "color": "#0000FF",
///   "child": {
///     "type": "Width",
///     "value": 250,
///     "child": {
///       "type": "Height",
///       "value": 250,
///       "child": {
///         "type": "Padding",
///         "all": 25,
///         "child": {
///           "type": "Table",
///           "columns": 3,
///           "children": [ ... grid items ... ]
///         }
///       }
///     }
///   }
/// }
/// </code>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="DebugAreaRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class DebugAreaRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<DebugAreaRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Label = "label";
        public const string Color = "color";
    }

    /// <summary>
    /// Default debug color (red).
    /// </summary>
    private const string DefaultDebugColor = "#FF0000";

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.DebugArea;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Special;

    /// <summary>
    /// DebugArea supports a single child element.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// DebugArea is a wrapper that wraps its child with debug visualization.
    /// </summary>
    public override bool IsWrapper => true;

    /// <summary>
    /// DebugArea requires expression evaluation for label and color properties.
    /// </summary>
    public override bool RequiresExpressionEvaluation => true;

    /// <summary>
    /// DebugArea passes style inheritance to its child.
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
        // Get the label property with expression evaluation
        var label = EvaluateStringProperty(node, PropertyNames.Label, context);

        // Get the color property with expression evaluation
        var colorString = EvaluateStringProperty(
            node,
            PropertyNames.Color,
            context,
            DefaultDebugColor
        );
        var parsedColor = ParseColor(colorString, DefaultDebugColor);

        Logger.LogTrace(
            "Rendering DebugArea with label='{Label}', color={Color} for node {NodeId}",
            label ?? "(none)",
            parsedColor,
            node.Id ?? "unnamed"
        );

        // Apply debug area based on available properties
        IContainer debugContainer = ApplyDebugArea(container, label, parsedColor);

        // Render the child content with the debug visualization
        RenderChild(debugContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies debug area visualization to the container using QuestPDF's API.
    /// </summary>
    /// <param name="container">The container to apply debug visualization to.</param>
    /// <param name="label">The optional label text.</param>
    /// <param name="color">The debug color in hex format.</param>
    /// <returns>The container with debug area applied.</returns>
    private static IContainer ApplyDebugArea(IContainer container, string? label, string color)
    {
        // QuestPDF supports various overloads:
        // - DebugArea() - no label, red color
        // - DebugArea("label") - with label, red color
        // - DebugArea("label", color) - with label and custom color

        if (string.IsNullOrWhiteSpace(label))
        {
            // No label - just apply with color
            // Note: QuestPDF's Debug() method is used for no-label debug areas
            // DebugArea requires a label, so we use an empty string
            return container.DebugArea(string.Empty, color);
        }

        // Apply debug area with label and color
        return container.DebugArea(label, color);
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.Label, null },
            { PropertyNames.Color, DefaultDebugColor },
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate color format if provided
        if (node.HasProperty(PropertyNames.Color))
        {
            var color = node.GetStringProperty(PropertyNames.Color);
            if (!string.IsNullOrWhiteSpace(color))
            {
                var normalized = color.Trim();
                if (!normalized.StartsWith('#'))
                {
                    normalized = "#" + normalized;
                }

                // Check if it's a valid hex color
                if (!IsValidHexColor(normalized))
                {
                    errors.Add(
                        new ComponentValidationError
                        {
                            PropertyName = PropertyNames.Color,
                            Message =
                                $"Invalid color format '{color}'. Expected hex format like '#FF0000' or 'FF0000'.",
                            Severity = ValidationSeverity.Warning,
                        }
                    );
                }
            }
        }

        // Info message about production use
        errors.Add(
            new ComponentValidationError
            {
                PropertyName = string.Empty,
                Message =
                    "DebugArea is intended for development/debugging. Consider removing it from production layouts.",
                Severity = ValidationSeverity.Info,
            }
        );

        // Validate that wrapper has a child
        if (node.Child is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message = "DebugArea wrapper must have a child element to visualize.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }

    /// <summary>
    /// Validates if a string is a valid hex color.
    /// </summary>
    /// <param name="color">The color string to validate (must include # prefix).</param>
    /// <returns>True if valid hex color; otherwise, false.</returns>
    private static bool IsValidHexColor(string color)
    {
        // Valid formats: #RRGGBB or #AARRGGBB
        if (color.Length != 7 && color.Length != 9)
        {
            return false;
        }

        if (color[0] != '#')
        {
            return false;
        }

        for (var i = 1; i < color.Length; i++)
        {
            if (!Uri.IsHexDigit(color[i]))
            {
                return false;
            }
        }

        return true;
    }
}
