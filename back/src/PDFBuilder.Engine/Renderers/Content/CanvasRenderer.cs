using System.Text;
using System.Text.Json;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Content;

/// <summary>
/// Renders Canvas content components for custom vector graphics.
/// Uses QuestPDF's dynamic SVG generation to render custom shapes, paths, and graphics.
/// </summary>
/// <remarks>
/// QuestPDF Canvas API: container.Svg(size => GenerateSvg(size))
///
/// The Canvas component allows drawing custom vector graphics using SVG.
/// It supports both pre-defined shapes and custom SVG content.
///
/// Properties:
/// - svgContent (string): Static SVG content to render directly.
/// - shapes (array): Array of shape definitions to render as SVG.
/// - width (float): Fixed width in points. Optional.
/// - height (float): Fixed height in points. Optional.
/// - viewBox (string): Custom SVG viewBox. Optional, auto-calculated if not specified.
/// - preserveAspectRatio (string): SVG preserveAspectRatio value. Default: "xMidYMid meet"
///
/// Shape definitions support:
/// - rectangle: { type: "rectangle", x, y, width, height, rx?, ry?, fill?, stroke?, strokeWidth? }
/// - circle: { type: "circle", cx, cy, r, fill?, stroke?, strokeWidth? }
/// - ellipse: { type: "ellipse", cx, cy, rx, ry, fill?, stroke?, strokeWidth? }
/// - line: { type: "line", x1, y1, x2, y2, stroke?, strokeWidth?, strokeDashArray? }
/// - polyline: { type: "polyline", points, fill?, stroke?, strokeWidth? }
/// - polygon: { type: "polygon", points, fill?, stroke?, strokeWidth? }
/// - path: { type: "path", d, fill?, stroke?, strokeWidth? }
/// - text: { type: "text", x, y, content, fontSize?, fontFamily?, fill?, textAnchor? }
/// - group: { type: "group", children, transform? }
///
/// Common use cases:
/// - Custom charts and diagrams
/// - Decorative graphics and borders
/// - Signatures and stamps
/// - Custom shapes and icons
/// - Dynamic graphics based on data
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="CanvasRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class CanvasRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<CanvasRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        /// <summary>
        /// Static SVG content to render directly.
        /// </summary>
        public const string SvgContent = "svgContent";

        /// <summary>
        /// Array of shape definitions to render.
        /// </summary>
        public const string Shapes = "shapes";

        /// <summary>
        /// Fixed width in points.
        /// </summary>
        public const string Width = "width";

        /// <summary>
        /// Fixed height in points.
        /// </summary>
        public const string Height = "height";

        /// <summary>
        /// Custom SVG viewBox.
        /// </summary>
        public const string ViewBox = "viewBox";

        /// <summary>
        /// SVG preserveAspectRatio value.
        /// </summary>
        public const string PreserveAspectRatio = "preserveAspectRatio";

        /// <summary>
        /// Background color for the canvas.
        /// </summary>
        public const string BackgroundColor = "backgroundColor";
    }

    /// <summary>
    /// Supported shape types.
    /// </summary>
    private static class ShapeTypes
    {
        public const string Rectangle = "rectangle";
        public const string Circle = "circle";
        public const string Ellipse = "ellipse";
        public const string Line = "line";
        public const string Polyline = "polyline";
        public const string Polygon = "polygon";
        public const string Path = "path";
        public const string Text = "text";
        public const string Group = "group";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Canvas;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Content;

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
        // Check for static SVG content first
        var svgContent = EvaluateStringProperty(node, PropertyNames.SvgContent, context);

        // Get optional size constraints
        var fixedWidth = EvaluateFloatProperty(node, PropertyNames.Width, context);
        var fixedHeight = EvaluateFloatProperty(node, PropertyNames.Height, context);

        // Apply size constraints if specified
        var targetContainer = container;
        if (fixedWidth.HasValue && fixedWidth.Value > 0)
        {
            targetContainer = targetContainer.Width(fixedWidth.Value);
        }
        if (fixedHeight.HasValue && fixedHeight.Value > 0)
        {
            targetContainer = targetContainer.Height(fixedHeight.Value);
        }

        // If static SVG content is provided, render it directly
        if (!string.IsNullOrWhiteSpace(svgContent))
        {
            Logger.LogTrace("Rendering static SVG content for node {NodeId}", node.Id ?? "unnamed");

            // Evaluate expressions within the SVG content
            var evaluatedSvg = EvaluateSvgExpressions(svgContent, context);
            targetContainer.Svg(evaluatedSvg);
            return;
        }

        // Otherwise, generate SVG from shape definitions
        if (
            node.Properties is null
            || !node.Properties.TryGetValue(PropertyNames.Shapes, out var shapesElement)
        )
        {
            Logger.LogWarning(
                "Canvas node {NodeId} has no svgContent or shapes defined. Nothing will be rendered.",
                node.Id ?? "unnamed"
            );
            targetContainer.Placeholder();
            return;
        }

        if (shapesElement.ValueKind != JsonValueKind.Array)
        {
            Logger.LogWarning(
                "Canvas node {NodeId} shapes property is not an array. Nothing will be rendered.",
                node.Id ?? "unnamed"
            );
            targetContainer.Placeholder();
            return;
        }

        // Get additional SVG properties
        var viewBox = EvaluateStringProperty(node, PropertyNames.ViewBox, context);
        var preserveAspectRatio = EvaluateStringProperty(
            node,
            PropertyNames.PreserveAspectRatio,
            context,
            "xMidYMid meet"
        );
        var backgroundColor = EvaluateStringProperty(node, PropertyNames.BackgroundColor, context);

        Logger.LogTrace(
            "Generating SVG from {ShapeCount} shapes for node {NodeId}",
            shapesElement.GetArrayLength(),
            node.Id ?? "unnamed"
        );

        // Use dynamic SVG generation with size callback
        targetContainer.Svg(size =>
        {
            return GenerateSvgFromShapes(
                size,
                shapesElement,
                context,
                viewBox,
                preserveAspectRatio,
                backgroundColor
            );
        });
    }

    /// <summary>
    /// Evaluates expressions within SVG content.
    /// </summary>
    private string EvaluateSvgExpressions(string svgContent, RenderContext context)
    {
        try
        {
            return ExpressionEvaluator.EvaluateString(svgContent, context);
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Failed to evaluate expressions in SVG content, using original");
            return svgContent;
        }
    }

    /// <summary>
    /// Generates SVG content from shape definitions.
    /// </summary>
    private string GenerateSvgFromShapes(
        Size size,
        JsonElement shapesArray,
        RenderContext context,
        string? viewBox,
        string? preserveAspectRatio,
        string? backgroundColor
    )
    {
        var sb = new StringBuilder();

        // Build SVG header
        var effectiveViewBox = viewBox ?? $"0 0 {size.Width} {size.Height}";
        var effectivePreserveAspectRatio = preserveAspectRatio ?? "xMidYMid meet";

        sb.AppendLine(
            $"""<svg width="{size.Width}" height="{size.Height}" viewBox="{effectiveViewBox}" preserveAspectRatio="{effectivePreserveAspectRatio}" xmlns="http://www.w3.org/2000/svg">"""
        );

        // Add background if specified
        if (!string.IsNullOrEmpty(backgroundColor))
        {
            sb.AppendLine(
                $"""  <rect x="0" y="0" width="{size.Width}" height="{size.Height}" fill="{backgroundColor}" />"""
            );
        }

        // Render each shape
        foreach (var shapeElement in shapesArray.EnumerateArray())
        {
            var shapeSvg = RenderShape(shapeElement, context, size);
            if (!string.IsNullOrEmpty(shapeSvg))
            {
                sb.AppendLine($"  {shapeSvg}");
            }
        }

        sb.AppendLine("</svg>");
        return sb.ToString();
    }

    /// <summary>
    /// Renders a single shape element to SVG string.
    /// </summary>
    private string? RenderShape(JsonElement shapeElement, RenderContext context, Size canvasSize)
    {
        if (shapeElement.ValueKind != JsonValueKind.Object)
        {
            Logger.LogWarning("Shape element is not an object, skipping");
            return null;
        }

        var shapeType = GetJsonString(shapeElement, "type")?.ToLowerInvariant();
        if (string.IsNullOrEmpty(shapeType))
        {
            Logger.LogWarning("Shape element has no 'type' property, skipping");
            return null;
        }

        return shapeType switch
        {
            ShapeTypes.Rectangle => RenderRectangle(shapeElement, context, canvasSize),
            ShapeTypes.Circle => RenderCircle(shapeElement, context, canvasSize),
            ShapeTypes.Ellipse => RenderEllipse(shapeElement, context, canvasSize),
            ShapeTypes.Line => RenderLine(shapeElement, context, canvasSize),
            ShapeTypes.Polyline => RenderPolyline(shapeElement, context),
            ShapeTypes.Polygon => RenderPolygon(shapeElement, context),
            ShapeTypes.Path => RenderPath(shapeElement, context),
            ShapeTypes.Text => RenderText(shapeElement, context),
            ShapeTypes.Group => RenderGroup(shapeElement, context, canvasSize),
            _ => HandleUnknownShape(shapeType),
        };
    }

    /// <summary>
    /// Renders a rectangle shape.
    /// </summary>
    private string RenderRectangle(JsonElement shape, RenderContext context, Size canvasSize)
    {
        var x = EvaluateShapeNumber(shape, "x", context, 0);
        var y = EvaluateShapeNumber(shape, "y", context, 0);
        var width = EvaluateShapeNumber(shape, "width", context, canvasSize.Width);
        var height = EvaluateShapeNumber(shape, "height", context, canvasSize.Height);
        var rx = EvaluateShapeNumber(shape, "rx", context, 0);
        var ry = EvaluateShapeNumber(shape, "ry", context, 0);

        var styles = BuildStyleAttributes(shape, context);

        var rxAttr = rx > 0 ? $""" rx="{rx}" """ : "";
        var ryAttr = ry > 0 ? $""" ry="{ry}" """ : "";

        return $"""<rect x="{x}" y="{y}" width="{width}" height="{height}"{rxAttr}{ryAttr}{styles}/>""";
    }

    /// <summary>
    /// Renders a circle shape.
    /// </summary>
    private string RenderCircle(JsonElement shape, RenderContext context, Size canvasSize)
    {
        var cx = EvaluateShapeNumber(shape, "cx", context, canvasSize.Width / 2);
        var cy = EvaluateShapeNumber(shape, "cy", context, canvasSize.Height / 2);
        var r = EvaluateShapeNumber(
            shape,
            "r",
            context,
            Math.Min(canvasSize.Width, canvasSize.Height) / 4
        );

        var styles = BuildStyleAttributes(shape, context);

        return $"""<circle cx="{cx}" cy="{cy}" r="{r}"{styles}/>""";
    }

    /// <summary>
    /// Renders an ellipse shape.
    /// </summary>
    private string RenderEllipse(JsonElement shape, RenderContext context, Size canvasSize)
    {
        var cx = EvaluateShapeNumber(shape, "cx", context, canvasSize.Width / 2);
        var cy = EvaluateShapeNumber(shape, "cy", context, canvasSize.Height / 2);
        var rx = EvaluateShapeNumber(shape, "rx", context, canvasSize.Width / 4);
        var ry = EvaluateShapeNumber(shape, "ry", context, canvasSize.Height / 4);

        var styles = BuildStyleAttributes(shape, context);

        return $"""<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"{styles}/>""";
    }

    /// <summary>
    /// Renders a line shape.
    /// </summary>
    private string RenderLine(JsonElement shape, RenderContext context, Size canvasSize)
    {
        var x1 = EvaluateShapeNumber(shape, "x1", context, 0);
        var y1 = EvaluateShapeNumber(shape, "y1", context, 0);
        var x2 = EvaluateShapeNumber(shape, "x2", context, canvasSize.Width);
        var y2 = EvaluateShapeNumber(shape, "y2", context, canvasSize.Height);

        var styles = BuildStyleAttributes(
            shape,
            context,
            defaultFill: "none",
            defaultStroke: "#000000"
        );

        return $"""<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"{styles}/>""";
    }

    /// <summary>
    /// Renders a polyline shape.
    /// </summary>
    private string RenderPolyline(JsonElement shape, RenderContext context)
    {
        var points = EvaluateShapeString(shape, "points", context);
        if (string.IsNullOrEmpty(points))
        {
            Logger.LogWarning("Polyline has no points, skipping");
            return string.Empty;
        }

        var styles = BuildStyleAttributes(
            shape,
            context,
            defaultFill: "none",
            defaultStroke: "#000000"
        );

        return $"""<polyline points="{points}"{styles}/>""";
    }

    /// <summary>
    /// Renders a polygon shape.
    /// </summary>
    private string RenderPolygon(JsonElement shape, RenderContext context)
    {
        var points = EvaluateShapeString(shape, "points", context);
        if (string.IsNullOrEmpty(points))
        {
            Logger.LogWarning("Polygon has no points, skipping");
            return string.Empty;
        }

        var styles = BuildStyleAttributes(shape, context);

        return $"""<polygon points="{points}"{styles}/>""";
    }

    /// <summary>
    /// Renders a path shape.
    /// </summary>
    private string RenderPath(JsonElement shape, RenderContext context)
    {
        var d = EvaluateShapeString(shape, "d", context);
        if (string.IsNullOrEmpty(d))
        {
            Logger.LogWarning("Path has no 'd' attribute, skipping");
            return string.Empty;
        }

        var styles = BuildStyleAttributes(shape, context);

        return $"""<path d="{d}"{styles}/>""";
    }

    /// <summary>
    /// Renders a text element.
    /// </summary>
    private string RenderText(JsonElement shape, RenderContext context)
    {
        var x = EvaluateShapeNumber(shape, "x", context, 0);
        var y = EvaluateShapeNumber(shape, "y", context, 0);
        var content = EvaluateShapeString(shape, "content", context) ?? "";
        var fontSize = EvaluateShapeNumber(shape, "fontSize", context, 12);
        var fontFamily = EvaluateShapeString(shape, "fontFamily", context) ?? "sans-serif";
        var textAnchor = EvaluateShapeString(shape, "textAnchor", context) ?? "start";
        var fill = EvaluateShapeString(shape, "fill", context) ?? "#000000";

        // Escape XML special characters in content
        content = EscapeXml(content);

        return $"""<text x="{x}" y="{y}" font-size="{fontSize}" font-family="{fontFamily}" text-anchor="{textAnchor}" fill="{fill}">{content}</text>""";
    }

    /// <summary>
    /// Renders a group of shapes.
    /// </summary>
    private string RenderGroup(JsonElement shape, RenderContext context, Size canvasSize)
    {
        var transform = EvaluateShapeString(shape, "transform", context);
        var children = shape.TryGetProperty("children", out var childrenElement)
            ? childrenElement
            : default;

        if (children.ValueKind != JsonValueKind.Array)
        {
            Logger.LogWarning("Group has no children array, skipping");
            return string.Empty;
        }

        var sb = new StringBuilder();
        var transformAttr = !string.IsNullOrEmpty(transform)
            ? $""" transform="{transform}" """
            : "";

        sb.Append($"<g{transformAttr}>");

        foreach (var child in children.EnumerateArray())
        {
            var childSvg = RenderShape(child, context, canvasSize);
            if (!string.IsNullOrEmpty(childSvg))
            {
                sb.Append(childSvg);
            }
        }

        sb.Append("</g>");
        return sb.ToString();
    }

    /// <summary>
    /// Handles unknown shape types.
    /// </summary>
    private string? HandleUnknownShape(string shapeType)
    {
        Logger.LogWarning("Unknown shape type: {ShapeType}, skipping", shapeType);
        return null;
    }

    /// <summary>
    /// Builds style attributes for a shape.
    /// </summary>
    private string BuildStyleAttributes(
        JsonElement shape,
        RenderContext context,
        string? defaultFill = null,
        string? defaultStroke = null
    )
    {
        var sb = new StringBuilder();

        var fill = EvaluateShapeString(shape, "fill", context) ?? defaultFill;
        var stroke = EvaluateShapeString(shape, "stroke", context) ?? defaultStroke;
        var strokeWidth = EvaluateShapeNumber(shape, "strokeWidth", context, -1);
        var strokeDashArray = EvaluateShapeString(shape, "strokeDashArray", context);
        var opacity = EvaluateShapeNumber(shape, "opacity", context, -1);
        var transform = EvaluateShapeString(shape, "transform", context);

        if (!string.IsNullOrEmpty(fill))
        {
            sb.Append($""" fill="{fill}" """);
        }

        if (!string.IsNullOrEmpty(stroke))
        {
            sb.Append($""" stroke="{stroke}" """);
        }

        if (strokeWidth >= 0)
        {
            sb.Append($""" stroke-width="{strokeWidth}" """);
        }

        if (!string.IsNullOrEmpty(strokeDashArray))
        {
            sb.Append($""" stroke-dasharray="{strokeDashArray}" """);
        }

        if (opacity >= 0 && opacity <= 1)
        {
            sb.Append($""" opacity="{opacity}" """);
        }

        if (!string.IsNullOrEmpty(transform))
        {
            sb.Append($""" transform="{transform}" """);
        }

        return sb.ToString().TrimEnd();
    }

    /// <summary>
    /// Gets a string value from a JSON element.
    /// </summary>
    private static string? GetJsonString(JsonElement element, string propertyName)
    {
        if (
            element.TryGetProperty(propertyName, out var prop)
            && prop.ValueKind == JsonValueKind.String
        )
        {
            return prop.GetString();
        }
        return null;
    }

    /// <summary>
    /// Evaluates a shape property as a number with expression support.
    /// </summary>
    private float EvaluateShapeNumber(
        JsonElement shape,
        string propertyName,
        RenderContext context,
        float defaultValue
    )
    {
        if (!shape.TryGetProperty(propertyName, out var prop))
        {
            return defaultValue;
        }

        if (prop.ValueKind == JsonValueKind.Number)
        {
            return prop.GetSingle();
        }

        if (prop.ValueKind == JsonValueKind.String)
        {
            var stringValue = prop.GetString();
            if (string.IsNullOrEmpty(stringValue))
            {
                return defaultValue;
            }

            // Try expression evaluation
            if (stringValue.Contains("{{") && stringValue.Contains("}}"))
            {
                try
                {
                    var evaluated = ExpressionEvaluator.EvaluateString(stringValue, context);
                    if (float.TryParse(evaluated, out var result))
                    {
                        return result;
                    }
                }
                catch (Exception ex)
                {
                    Logger.LogWarning(
                        ex,
                        "Failed to evaluate expression for shape property {PropertyName}",
                        propertyName
                    );
                }
            }

            // Try direct parsing
            if (float.TryParse(stringValue, out var parsed))
            {
                return parsed;
            }
        }

        return defaultValue;
    }

    /// <summary>
    /// Evaluates a shape property as a string with expression support.
    /// </summary>
    private string? EvaluateShapeString(
        JsonElement shape,
        string propertyName,
        RenderContext context
    )
    {
        if (!shape.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }

        if (prop.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        var stringValue = prop.GetString();
        if (string.IsNullOrEmpty(stringValue))
        {
            return stringValue;
        }

        // Try expression evaluation
        if (stringValue.Contains("{{") && stringValue.Contains("}}"))
        {
            try
            {
                return ExpressionEvaluator.EvaluateString(stringValue, context);
            }
            catch (Exception ex)
            {
                Logger.LogWarning(
                    ex,
                    "Failed to evaluate expression for shape property {PropertyName}",
                    propertyName
                );
            }
        }

        return stringValue;
    }

    /// <summary>
    /// Escapes XML special characters in a string.
    /// </summary>
    private static string EscapeXml(string input)
    {
        return input
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&apos;");
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            [PropertyNames.SvgContent] = null,
            [PropertyNames.Shapes] = null,
            [PropertyNames.Width] = null,
            [PropertyNames.Height] = null,
            [PropertyNames.ViewBox] = null,
            [PropertyNames.PreserveAspectRatio] = "xMidYMid meet",
            [PropertyNames.BackgroundColor] = null,
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate that either svgContent or shapes is provided
        var hasSvgContent = node.HasProperty(PropertyNames.SvgContent);
        var hasShapes = node.HasProperty(PropertyNames.Shapes);

        if (!hasSvgContent && !hasShapes)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.SvgContent,
                    Message = "Canvas component requires either 'svgContent' or 'shapes' property",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate width if specified
        var width = node.GetFloatProperty(PropertyNames.Width);
        if (width.HasValue && width.Value <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Width,
                    Message = "Width must be a positive value",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate height if specified
        var height = node.GetFloatProperty(PropertyNames.Height);
        if (height.HasValue && height.Value <= 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Height,
                    Message = "Height must be a positive value",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Validate shapes array if present
        if (
            node.Properties is not null
            && node.Properties.TryGetValue(PropertyNames.Shapes, out var shapesValidationElement)
            && shapesValidationElement.ValueKind == JsonValueKind.Array
        )
        {
            var index = 0;
            foreach (var shape in shapesValidationElement.EnumerateArray())
            {
                if (shape.ValueKind != JsonValueKind.Object)
                {
                    errors.Add(
                        new ComponentValidationError
                        {
                            PropertyName = $"{PropertyNames.Shapes}[{index}]",
                            Message = "Each shape must be an object",
                            Severity = ValidationSeverity.Error,
                        }
                    );
                }
                else if (!shape.TryGetProperty("type", out _))
                {
                    errors.Add(
                        new ComponentValidationError
                        {
                            PropertyName = $"{PropertyNames.Shapes}[{index}].type",
                            Message = "Each shape must have a 'type' property",
                            Severity = ValidationSeverity.Error,
                        }
                    );
                }
                index++;
            }
        }

        return errors;
    }
}
