using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;

namespace PDFBuilder.Engine.Services;

/// <summary>
/// Resolves and merges style properties throughout the layout tree.
/// Handles style inheritance from parent nodes to children.
/// </summary>
/// <remarks>
/// Initializes a new instance of the StyleResolver class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic style values.</param>
/// <param name="logger">The logger instance.</param>
public sealed class StyleResolver(
    IExpressionEvaluator expressionEvaluator,
    ILogger<StyleResolver> logger
)
{
    private readonly IExpressionEvaluator _expressionEvaluator =
        expressionEvaluator ?? throw new ArgumentNullException(nameof(expressionEvaluator));
    private readonly ILogger<StyleResolver> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Resolves the effective style for a node by merging with inherited styles.
    /// </summary>
    /// <param name="node">The layout node.</param>
    /// <param name="context">The render context with inherited styles.</param>
    /// <returns>The resolved effective style.</returns>
    public StyleProperties ResolveStyle(LayoutNode node, RenderContext context)
    {
        ArgumentNullException.ThrowIfNull(node);
        ArgumentNullException.ThrowIfNull(context);

        var nodeStyle = node.Style;
        var inheritedStyle = context.InheritedStyle;

        if (nodeStyle is null && inheritedStyle is null)
        {
            _logger.LogTrace(
                "Node {NodeId} has no style and no inherited style, returning empty style",
                node.Id ?? "unknown"
            );
            return new StyleProperties();
        }

        if (nodeStyle is null)
        {
            _logger.LogTrace(
                "Node {NodeId} has no style, using inherited style",
                node.Id ?? "unknown"
            );
            return inheritedStyle!.Clone();
        }

        if (inheritedStyle is null)
        {
            _logger.LogTrace(
                "Node {NodeId} has style but no inherited style",
                node.Id ?? "unknown"
            );
            return nodeStyle.Clone();
        }

        _logger.LogTrace(
            "Merging node style with inherited style for node {NodeId}",
            node.Id ?? "unknown"
        );

        return nodeStyle.MergeWith(inheritedStyle);
    }

    /// <summary>
    /// Evaluates any expression-based style properties.
    /// </summary>
    /// <param name="style">The style to evaluate.</param>
    /// <param name="context">The render context for expression evaluation.</param>
    /// <returns>A new StyleProperties with evaluated values.</returns>
    public StyleProperties EvaluateStyleExpressions(StyleProperties? style, RenderContext context)
    {
        if (style is null)
        {
            return new StyleProperties();
        }

        // Create a clone to avoid modifying the original
        var evaluatedStyle = style.Clone();

        // Evaluate string properties that might contain expressions
        if (!string.IsNullOrEmpty(evaluatedStyle.Color))
        {
            evaluatedStyle.Color = EvaluateStringProperty(evaluatedStyle.Color, context, "Color");
        }

        if (!string.IsNullOrEmpty(evaluatedStyle.FontFamily))
        {
            evaluatedStyle.FontFamily = EvaluateStringProperty(
                evaluatedStyle.FontFamily,
                context,
                "FontFamily"
            );
        }

        if (!string.IsNullOrEmpty(evaluatedStyle.BackgroundColor))
        {
            evaluatedStyle.BackgroundColor = EvaluateStringProperty(
                evaluatedStyle.BackgroundColor,
                context,
                "BackgroundColor"
            );
        }

        if (!string.IsNullOrEmpty(evaluatedStyle.BorderColor))
        {
            evaluatedStyle.BorderColor = EvaluateStringProperty(
                evaluatedStyle.BorderColor,
                context,
                "BorderColor"
            );
        }

        return evaluatedStyle;
    }

    /// <summary>
    /// Creates a child context with the resolved style for child rendering.
    /// </summary>
    /// <param name="node">The current node.</param>
    /// <param name="parentContext">The parent render context.</param>
    /// <returns>A new context with merged styles for children.</returns>
    public RenderContext CreateChildContext(LayoutNode node, RenderContext parentContext)
    {
        ArgumentNullException.ThrowIfNull(node);
        ArgumentNullException.ThrowIfNull(parentContext);

        var resolvedStyle = ResolveStyle(node, parentContext);
        var evaluatedStyle = EvaluateStyleExpressions(resolvedStyle, parentContext);

        return parentContext.CreateChildContext(evaluatedStyle);
    }

    /// <summary>
    /// Gets the effective text style for text rendering.
    /// </summary>
    /// <param name="node">The layout node.</param>
    /// <param name="context">The render context.</param>
    /// <returns>The effective text style properties.</returns>
    public TextStyleInfo GetEffectiveTextStyle(LayoutNode node, RenderContext context)
    {
        var effectiveStyle = ResolveStyle(node, context);
        var evaluatedStyle = EvaluateStyleExpressions(effectiveStyle, context);

        return new TextStyleInfo
        {
            FontFamily = evaluatedStyle.FontFamily ?? "Helvetica",
            FontSize = evaluatedStyle.FontSize ?? 12f,
            FontWeight = evaluatedStyle.FontWeight ?? Core.Domain.FontWeight.Normal,
            FontStyle = evaluatedStyle.FontStyle ?? Core.Domain.FontStyle.Normal,
            Color = evaluatedStyle.Color ?? "#000000",
            LineHeight = evaluatedStyle.LineHeight ?? 1.2f,
            LetterSpacing = evaluatedStyle.LetterSpacing ?? 0f,
            TextDecoration = evaluatedStyle.TextDecoration,
            TextAlignment = evaluatedStyle.TextAlignment ?? Core.Domain.TextAlignment.Left,
        };
    }

    /// <summary>
    /// Checks if a node has any style properties that need to be applied.
    /// </summary>
    /// <param name="node">The layout node to check.</param>
    /// <returns>True if the node has style properties; otherwise, false.</returns>
    public static bool HasStyleProperties(LayoutNode node)
    {
        if (node.Style is null)
        {
            return false;
        }

        return node.Style.HasTextProperties
            || node.Style.HasPaddingProperties
            || node.Style.HasBorderProperties
            || node.Style.HasVisualProperties;
    }

    /// <summary>
    /// Evaluates a string property that might contain expressions.
    /// </summary>
    private string EvaluateStringProperty(string value, RenderContext context, string propertyName)
    {
        if (!_expressionEvaluator.ContainsExpressions(value))
        {
            return value;
        }

        try
        {
            return _expressionEvaluator.EvaluateString(value, context);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to evaluate expression in style property {PropertyName}: {Value}",
                propertyName,
                value
            );
            return value;
        }
    }
}

/// <summary>
/// Represents the effective text style for rendering.
/// </summary>
public sealed class TextStyleInfo
{
    /// <summary>
    /// Gets or sets the font family name.
    /// </summary>
    public required string FontFamily { get; set; }

    /// <summary>
    /// Gets or sets the font size in points.
    /// </summary>
    public required float FontSize { get; set; }

    /// <summary>
    /// Gets or sets the font weight.
    /// </summary>
    public required FontWeight FontWeight { get; set; }

    /// <summary>
    /// Gets or sets the font style.
    /// </summary>
    public required FontStyle FontStyle { get; set; }

    /// <summary>
    /// Gets or sets the text color.
    /// </summary>
    public required string Color { get; set; }

    /// <summary>
    /// Gets or sets the line height multiplier.
    /// </summary>
    public required float LineHeight { get; set; }

    /// <summary>
    /// Gets or sets the letter spacing.
    /// </summary>
    public required float LetterSpacing { get; set; }

    /// <summary>
    /// Gets or sets the text decoration.
    /// </summary>
    public TextDecoration? TextDecoration { get; set; }

    /// <summary>
    /// Gets or sets the text alignment.
    /// </summary>
    public required TextAlignment TextAlignment { get; set; }
}
