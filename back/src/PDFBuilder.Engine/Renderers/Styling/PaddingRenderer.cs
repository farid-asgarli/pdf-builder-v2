using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Styling;

/// <summary>
/// Renders a Padding wrapper component that adds empty space around its child content.
/// Supports uniform padding, per-side padding, and negative padding (similar to negative margins).
/// </summary>
/// <remarks>
/// QuestPDF Padding API:
/// - Padding(value) - Uniform padding on all sides
/// - PaddingVertical(value) - Top and bottom padding
/// - PaddingHorizontal(value) - Left and right padding
/// - PaddingTop(value), PaddingBottom(value), PaddingLeft(value), PaddingRight(value) - Individual sides
///
/// Properties:
/// - all (float): Uniform padding on all sides in points. Overridden by specific side properties.
/// - top (float): Top padding in points.
/// - bottom (float): Bottom padding in points.
/// - left (float): Left padding in points.
/// - right (float): Right padding in points.
/// - horizontal (float): Left and right padding in points. Overridden by left/right properties.
/// - vertical (float): Top and bottom padding in points. Overridden by top/bottom properties.
///
/// Negative values push content beyond edges, increasing available space.
/// The child property must contain a single child node to wrap.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="PaddingRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class PaddingRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<PaddingRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string All = "all";
        public const string Top = "top";
        public const string Bottom = "bottom";
        public const string Left = "left";
        public const string Right = "right";
        public const string Horizontal = "horizontal";
        public const string Vertical = "vertical";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Padding;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Styling;

    /// <inheritdoc />
    public override bool SupportsChildren => false;

    /// <inheritdoc />
    public override bool IsWrapper => true;

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        // Extract padding properties with expression evaluation
        var all = EvaluateFloatProperty(node, PropertyNames.All, context);
        var horizontal = EvaluateFloatProperty(node, PropertyNames.Horizontal, context);
        var vertical = EvaluateFloatProperty(node, PropertyNames.Vertical, context);
        var top = EvaluateFloatProperty(node, PropertyNames.Top, context);
        var bottom = EvaluateFloatProperty(node, PropertyNames.Bottom, context);
        var left = EvaluateFloatProperty(node, PropertyNames.Left, context);
        var right = EvaluateFloatProperty(node, PropertyNames.Right, context);

        // Resolve effective padding values with priority:
        // Individual sides > horizontal/vertical > all > 0
        var effectiveTop = top ?? vertical ?? all ?? 0f;
        var effectiveBottom = bottom ?? vertical ?? all ?? 0f;
        var effectiveLeft = left ?? horizontal ?? all ?? 0f;
        var effectiveRight = right ?? horizontal ?? all ?? 0f;

        Logger.LogTrace(
            "Rendering Padding with top={Top}, bottom={Bottom}, left={Left}, right={Right}",
            effectiveTop,
            effectiveBottom,
            effectiveLeft,
            effectiveRight
        );

        // Apply padding using the most efficient QuestPDF method
        IContainer paddedContainer = ApplyPadding(
            container,
            effectiveTop,
            effectiveBottom,
            effectiveLeft,
            effectiveRight
        );

        // Render the child content
        RenderChild(paddedContainer, node, context, layoutEngine);
    }

    /// <summary>
    /// Applies padding to a container using the most efficient QuestPDF method.
    /// </summary>
    /// <param name="container">The container to apply padding to.</param>
    /// <param name="top">Top padding value.</param>
    /// <param name="bottom">Bottom padding value.</param>
    /// <param name="left">Left padding value.</param>
    /// <param name="right">Right padding value.</param>
    /// <returns>The padded container.</returns>
    private static IContainer ApplyPadding(
        IContainer container,
        float top,
        float bottom,
        float left,
        float right
    )
    {
        // Check if all sides are equal for uniform padding
        if (top == bottom && bottom == left && left == right)
        {
            if (top == 0f)
            {
                return container;
            }
            return container.Padding(top);
        }

        // Check if horizontal and vertical are equal
        if (top == bottom && left == right)
        {
            var result = container as IContainer;
            if (top != 0f)
            {
                result = result.PaddingVertical(top);
            }
            if (left != 0f)
            {
                result = result.PaddingHorizontal(left);
            }
            return result;
        }

        // Apply individual padding for each side
        IContainer paddedContainer = container;

        if (top != 0f)
        {
            paddedContainer = paddedContainer.PaddingTop(top);
        }

        if (bottom != 0f)
        {
            paddedContainer = paddedContainer.PaddingBottom(bottom);
        }

        if (left != 0f)
        {
            paddedContainer = paddedContainer.PaddingLeft(left);
        }

        if (right != 0f)
        {
            paddedContainer = paddedContainer.PaddingRight(right);
        }

        return paddedContainer;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            { PropertyNames.All, 0f },
            { PropertyNames.Top, null },
            { PropertyNames.Bottom, null },
            { PropertyNames.Left, null },
            { PropertyNames.Right, null },
            { PropertyNames.Horizontal, null },
            { PropertyNames.Vertical, null },
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate that at least one padding property is specified
        var hasAnyPadding =
            node.HasProperty(PropertyNames.All)
            || node.HasProperty(PropertyNames.Top)
            || node.HasProperty(PropertyNames.Bottom)
            || node.HasProperty(PropertyNames.Left)
            || node.HasProperty(PropertyNames.Right)
            || node.HasProperty(PropertyNames.Horizontal)
            || node.HasProperty(PropertyNames.Vertical);

        if (!hasAnyPadding)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.All,
                    Message =
                        "At least one padding property (all, top, bottom, left, right, horizontal, vertical) should be specified",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate that wrapper has a child
        if (node.Child is null)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = "child",
                    Message = "Padding wrapper must have a child element",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        return errors;
    }
}
