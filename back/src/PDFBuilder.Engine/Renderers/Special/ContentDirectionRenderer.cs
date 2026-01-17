using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Special;

/// <summary>
/// Renders a ContentDirection component that controls the flow direction of content (LTR/RTL).
/// Essential for proper text alignment and content organization when working with different languages.
/// </summary>
/// <remarks>
/// QuestPDF Content Direction API:
/// - container.ContentFromLeftToRight() - Sets left-to-right (LTR) direction (default)
/// - container.ContentFromRightToLeft() - Sets right-to-left (RTL) direction
///
/// Properties:
/// - direction (string): The content direction - "ltr" or "rtl". Default: "ltr".
/// - child (LayoutNode, optional): The child content to render with the specified direction.
///
/// Content Direction Impact:
/// - Text alignment and positioning
/// - Text direction and word wrapping
/// - Element ordering in collections (Row, Table, etc.)
/// - Default content alignment
/// - Content flow direction
///
/// Behavior by Direction:
/// LTR (Left-to-Right):
/// - Items are typically aligned to the left
/// - First item positioned on the left, last item on the right
/// - Default behavior for most Western languages
///
/// RTL (Right-to-Left):
/// - Items are typically aligned to the right
/// - First item positioned on the right, last item on the left
/// - Appropriate for Arabic, Hebrew, Persian, and other RTL languages
///
/// Overriding Behavior:
/// - ContentDirection can be overridden for nested elements
/// - A child element can specify a different direction than its parent
/// - Useful for mixed-language documents
///
/// Example JSON (RTL document with LTR override):
/// <code>
/// {
///   "type": "ContentDirection",
///   "direction": "rtl",
///   "child": {
///     "type": "Column",
///     "children": [
///       { "type": "Text", "content": "النص العربي هنا" },
///       {
///         "type": "ContentDirection",
///         "direction": "ltr",
///         "child": { "type": "Text", "content": "English text override" }
///       }
///     ]
///   }
/// }
/// </code>
///
/// Example JSON (RTL Row with elements):
/// <code>
/// {
///   "type": "ContentDirection",
///   "direction": "rtl",
///   "child": {
///     "type": "Row",
///     "spacing": 5,
///     "children": [
///       { "type": "Background", "color": "#FF6666", "child": { "type": "Width", "value": 50, "child": { "type": "Height", "value": 50, "child": { "type": "Placeholder" } } } },
///       { "type": "Background", "color": "#66FF66", "child": { "type": "Width", "value": 50, "child": { "type": "Height", "value": 50, "child": { "type": "Placeholder" } } } },
///       { "type": "Background", "color": "#6666FF", "child": { "type": "Width", "value": 75, "child": { "type": "Height", "value": 50, "child": { "type": "Placeholder" } } } }
///     ]
///   }
/// }
/// </code>
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="ContentDirectionRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class ContentDirectionRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<ContentDirectionRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Direction = "direction";
    }

    /// <summary>
    /// Valid direction values.
    /// </summary>
    private static class DirectionValues
    {
        public const string LeftToRight = "ltr";
        public const string RightToLeft = "rtl";
    }

    /// <summary>
    /// Default direction (left-to-right).
    /// </summary>
    private const string DefaultDirection = DirectionValues.LeftToRight;

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.ContentDirection;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Special;

    /// <summary>
    /// ContentDirection supports a single child element.
    /// </summary>
    public override bool SupportsChildren => false;

    /// <summary>
    /// ContentDirection is a wrapper that wraps its child with direction context.
    /// </summary>
    public override bool IsWrapper => true;

    /// <summary>
    /// ContentDirection requires expression evaluation for the direction property.
    /// </summary>
    public override bool RequiresExpressionEvaluation => true;

    /// <summary>
    /// ContentDirection passes style inheritance to its child.
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
        // Get the direction property with expression evaluation
        var direction = EvaluateStringProperty(
            node,
            PropertyNames.Direction,
            context,
            DefaultDirection
        );

        // Normalize direction value
        var normalizedDirection = NormalizeDirection(direction);

        Logger.LogTrace(
            "Rendering ContentDirection with direction={Direction} for node {NodeId}",
            normalizedDirection,
            node.Id ?? "unnamed"
        );

        // Apply content direction based on the specified value
        IContainer directedContainer = ApplyContentDirection(container, normalizedDirection);

        // Render the child content with the applied direction
        RenderChild(directedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Normalizes the direction string to a valid value.
    /// </summary>
    /// <param name="direction">The direction string to normalize.</param>
    /// <returns>The normalized direction value.</returns>
    private string NormalizeDirection(string? direction)
    {
        if (string.IsNullOrWhiteSpace(direction))
        {
            return DefaultDirection;
        }

        var normalized = direction.Trim().ToLowerInvariant();

        return normalized switch
        {
            DirectionValues.LeftToRight => DirectionValues.LeftToRight,
            "left-to-right" => DirectionValues.LeftToRight,
            "lefttoright" => DirectionValues.LeftToRight,
            "left" => DirectionValues.LeftToRight,
            DirectionValues.RightToLeft => DirectionValues.RightToLeft,
            "right-to-left" => DirectionValues.RightToLeft,
            "righttoleft" => DirectionValues.RightToLeft,
            "right" => DirectionValues.RightToLeft,
            _ => LogAndReturnDefault(direction),
        };
    }

    /// <summary>
    /// Logs a warning for an invalid direction and returns the default.
    /// </summary>
    /// <param name="direction">The invalid direction value.</param>
    /// <returns>The default direction.</returns>
    private string LogAndReturnDefault(string direction)
    {
        Logger.LogWarning(
            "Invalid direction value '{Direction}', using default '{Default}'. Valid values are 'ltr' or 'rtl'.",
            direction,
            DefaultDirection
        );
        return DefaultDirection;
    }

    /// <summary>
    /// Applies the content direction to the container using QuestPDF's API.
    /// </summary>
    /// <param name="container">The container to apply direction to.</param>
    /// <param name="direction">The normalized direction value.</param>
    /// <returns>The container with direction applied.</returns>
    private static IContainer ApplyContentDirection(IContainer container, string direction)
    {
        return direction switch
        {
            DirectionValues.RightToLeft => container.ContentFromRightToLeft(),
            _ => container.ContentFromLeftToRight(), // Default to LTR
        };
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?> { { PropertyNames.Direction, DefaultDirection } };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate direction value if provided
        if (node.HasProperty(PropertyNames.Direction))
        {
            var direction = node.GetStringProperty(PropertyNames.Direction);
            if (!string.IsNullOrWhiteSpace(direction))
            {
                var normalized = direction.Trim().ToLowerInvariant();
                var validValues = new[]
                {
                    DirectionValues.LeftToRight,
                    DirectionValues.RightToLeft,
                    "left-to-right",
                    "right-to-left",
                    "lefttoright",
                    "righttoleft",
                    "left",
                    "right",
                };

                if (!validValues.Contains(normalized))
                {
                    errors.Add(
                        new ComponentValidationError
                        {
                            PropertyName = PropertyNames.Direction,
                            Message =
                                $"Invalid direction value '{direction}'. Valid values are 'ltr', 'rtl', 'left-to-right', or 'right-to-left'.",
                            Severity = ValidationSeverity.Warning,
                        }
                    );
                }
            }
        }

        // Validate that wrapper has a child
        if (node.Child is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message =
                        "ContentDirection wrapper must have a child element to apply direction to.",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
