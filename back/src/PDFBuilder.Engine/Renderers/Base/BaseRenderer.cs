using System.Diagnostics;
using System.Text.Json;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Exceptions;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Services;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Base;

/// <summary>
/// Abstract base class for all component renderers.
/// Provides common functionality for expression evaluation, style resolution,
/// error handling, and logging integration.
/// </summary>
/// <remarks>
/// Initializes a new instance of the BaseRenderer class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public abstract class BaseRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger logger
) : IRenderer
{
    /// <summary>
    /// The expression evaluator for processing {{ expression }} syntax.
    /// </summary>
    protected readonly IExpressionEvaluator ExpressionEvaluator =
        expressionEvaluator ?? throw new ArgumentNullException(nameof(expressionEvaluator));

    /// <summary>
    /// The style resolver for handling style inheritance.
    /// </summary>
    protected readonly StyleResolver StyleResolver =
        styleResolver ?? throw new ArgumentNullException(nameof(styleResolver));

    /// <summary>
    /// The logger instance for this renderer.
    /// </summary>
    protected readonly ILogger Logger = logger ?? throw new ArgumentNullException(nameof(logger));

    // ========================================
    // Abstract Properties - Must be implemented by derived classes
    // ========================================

    /// <inheritdoc />
    public abstract ComponentType ComponentType { get; }

    /// <inheritdoc />
    public abstract RendererCategory Category { get; }

    /// <inheritdoc />
    public virtual string RendererName => GetType().Name;

    /// <inheritdoc />
    public abstract bool SupportsChildren { get; }

    /// <inheritdoc />
    public abstract bool IsWrapper { get; }

    /// <inheritdoc />
    public virtual bool RequiresExpressionEvaluation => true;

    /// <inheritdoc />
    public virtual bool InheritsStyle => true;

    // ========================================
    // Template Method Pattern - Core Rendering
    // ========================================

    /// <inheritdoc />
    public void Render(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine
    )
    {
        // Delegate to RenderWithContext with default path
        RenderWithContext(container, node, context, layoutEngine, node.Id ?? "unknown");
    }

    /// <inheritdoc />
    public void RenderWithContext(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        string nodePath
    )
    {
        ArgumentNullException.ThrowIfNull(container);
        ArgumentNullException.ThrowIfNull(node);
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(layoutEngine);

        var stopwatch = Stopwatch.StartNew();

        Logger.LogDebug(
            "Starting render of {RendererName} for node {NodeId} at path {NodePath}",
            RendererName,
            node.Id ?? "unnamed",
            nodePath
        );

        try
        {
            // Step 1: Resolve styles (inheritance)
            var resolvedStyle = ResolveStyles(node, context);

            // Step 2: Create a new context with resolved styles for children
            var childContext = CreateChildContext(context, resolvedStyle);

            // Step 3: Execute the actual rendering logic
            RenderCore(container, node, childContext, layoutEngine, resolvedStyle);

            stopwatch.Stop();
            Logger.LogDebug(
                "Completed render of {RendererName} for node {NodeId} in {ElapsedMs}ms",
                RendererName,
                node.Id ?? "unnamed",
                stopwatch.ElapsedMilliseconds
            );
        }
        catch (PdfBuilderException)
        {
            // Re-throw domain exceptions as-is
            throw;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            Logger.LogError(
                ex,
                "Error rendering {RendererName} for node {NodeId} at path {NodePath}",
                RendererName,
                node.Id ?? "unnamed",
                nodePath
            );

            throw new LayoutRenderException(
                $"Failed to render {RendererName}: {ex.Message}",
                node.Id,
                nodePath,
                ComponentType.ToString(),
                ex
            );
        }
    }

    /// <summary>
    /// Core rendering logic to be implemented by derived classes.
    /// This method is called after style resolution and within error handling wrapper.
    /// </summary>
    /// <param name="container">The QuestPDF container to render into.</param>
    /// <param name="node">The layout node containing component configuration.</param>
    /// <param name="context">The render context with resolved styles.</param>
    /// <param name="layoutEngine">The layout engine for rendering children.</param>
    /// <param name="resolvedStyle">The resolved style properties for this node.</param>
    protected abstract void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    );

    // ========================================
    // Validation
    // ========================================

    /// <inheritdoc />
    public virtual IEnumerable<ComponentValidationError> ValidateProperties(LayoutNode node)
    {
        var errors = new List<ComponentValidationError>();

        // Validate required properties
        foreach (var requiredProperty in GetRequiredProperties())
        {
            if (!node.HasProperty(requiredProperty))
            {
                errors.Add(
                    new ComponentValidationError
                    {
                        PropertyName = requiredProperty,
                        Message =
                            $"Required property '{requiredProperty}' is missing for {RendererName}",
                        Severity = ValidationSeverity.Error,
                    }
                );
            }
        }

        // Allow derived classes to add component-specific validation
        errors.AddRange(ValidateComponentProperties(node));

        return errors;
    }

    /// <summary>
    /// Validates component-specific properties. Override in derived classes.
    /// </summary>
    /// <param name="node">The layout node to validate.</param>
    /// <returns>A collection of validation errors.</returns>
    protected virtual IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        return Enumerable.Empty<ComponentValidationError>();
    }

    /// <inheritdoc />
    public virtual IEnumerable<string> GetRequiredProperties()
    {
        return Enumerable.Empty<string>();
    }

    /// <inheritdoc />
    public virtual IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>();
    }

    // ========================================
    // Expression Evaluation Helpers
    // ========================================

    /// <summary>
    /// Evaluates a string property that may contain expressions.
    /// </summary>
    /// <param name="node">The layout node.</param>
    /// <param name="propertyName">The property name.</param>
    /// <param name="context">The render context.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The evaluated string value.</returns>
    protected string? EvaluateStringProperty(
        LayoutNode node,
        string propertyName,
        RenderContext context,
        string? defaultValue = null
    )
    {
        var rawValue = node.GetStringProperty(propertyName, defaultValue);

        if (string.IsNullOrEmpty(rawValue) || !RequiresExpressionEvaluation)
        {
            return rawValue;
        }

        try
        {
            return ExpressionEvaluator.EvaluateString(rawValue, context);
        }
        catch (ExpressionEvaluationException ex)
        {
            Logger.LogWarning(
                ex,
                "Failed to evaluate expression in property {PropertyName} for node {NodeId}: {Expression}",
                propertyName,
                node.Id ?? "unnamed",
                rawValue
            );
            return rawValue; // Return original value on error
        }
    }

    /// <summary>
    /// Evaluates a float property that may contain expressions.
    /// </summary>
    /// <param name="node">The layout node.</param>
    /// <param name="propertyName">The property name.</param>
    /// <param name="context">The render context.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The evaluated float value.</returns>
    protected float? EvaluateFloatProperty(
        LayoutNode node,
        string propertyName,
        RenderContext context,
        float? defaultValue = null
    )
    {
        var rawValue = node.GetStringProperty(propertyName);

        if (rawValue is null)
        {
            return node.GetFloatProperty(propertyName, defaultValue);
        }

        // Check if it's an expression
        if (rawValue.Contains("{{") && rawValue.Contains("}}"))
        {
            try
            {
                var evaluated = ExpressionEvaluator.EvaluateString(rawValue, context);
                if (float.TryParse(evaluated, out var result))
                {
                    return result;
                }
            }
            catch (ExpressionEvaluationException ex)
            {
                Logger.LogWarning(
                    ex,
                    "Failed to evaluate float expression in property {PropertyName} for node {NodeId}",
                    propertyName,
                    node.Id ?? "unnamed"
                );
            }
        }

        return node.GetFloatProperty(propertyName, defaultValue);
    }

    /// <summary>
    /// Evaluates an integer property that may contain expressions.
    /// </summary>
    /// <param name="node">The layout node.</param>
    /// <param name="propertyName">The property name.</param>
    /// <param name="context">The render context.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The evaluated integer value.</returns>
    protected int? EvaluateIntProperty(
        LayoutNode node,
        string propertyName,
        RenderContext context,
        int? defaultValue = null
    )
    {
        var rawValue = node.GetStringProperty(propertyName);

        if (rawValue is null)
        {
            return node.GetIntProperty(propertyName, defaultValue);
        }

        // Check if it's an expression
        if (rawValue.Contains("{{") && rawValue.Contains("}}"))
        {
            try
            {
                var evaluated = ExpressionEvaluator.EvaluateString(rawValue, context);
                if (int.TryParse(evaluated, out var result))
                {
                    return result;
                }
            }
            catch (ExpressionEvaluationException ex)
            {
                Logger.LogWarning(
                    ex,
                    "Failed to evaluate int expression in property {PropertyName} for node {NodeId}",
                    propertyName,
                    node.Id ?? "unnamed"
                );
            }
        }

        return node.GetIntProperty(propertyName, defaultValue);
    }

    /// <summary>
    /// Evaluates a boolean property that may contain expressions.
    /// </summary>
    /// <param name="node">The layout node.</param>
    /// <param name="propertyName">The property name.</param>
    /// <param name="context">The render context.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The evaluated boolean value.</returns>
    protected bool? EvaluateBoolProperty(
        LayoutNode node,
        string propertyName,
        RenderContext context,
        bool? defaultValue = null
    )
    {
        var rawValue = node.GetStringProperty(propertyName);

        if (rawValue is null)
        {
            return node.GetBoolProperty(propertyName, defaultValue);
        }

        // Check if it's an expression
        if (rawValue.Contains("{{") && rawValue.Contains("}}"))
        {
            try
            {
                var evaluated = ExpressionEvaluator.EvaluateString(rawValue, context);
                if (bool.TryParse(evaluated, out var result))
                {
                    return result;
                }
            }
            catch (ExpressionEvaluationException ex)
            {
                Logger.LogWarning(
                    ex,
                    "Failed to evaluate bool expression in property {PropertyName} for node {NodeId}",
                    propertyName,
                    node.Id ?? "unnamed"
                );
            }
        }

        return node.GetBoolProperty(propertyName, defaultValue);
    }

    /// <summary>
    /// Evaluates a property as a specific type using expressions.
    /// </summary>
    /// <typeparam name="T">The expected type.</typeparam>
    /// <param name="node">The layout node.</param>
    /// <param name="propertyName">The property name.</param>
    /// <param name="context">The render context.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The evaluated value.</returns>
    protected T? EvaluateProperty<T>(
        LayoutNode node,
        string propertyName,
        RenderContext context,
        T? defaultValue = default
    )
    {
        if (!node.HasProperty(propertyName))
        {
            return defaultValue;
        }

        var rawValue = node.GetStringProperty(propertyName);

        // If it's an expression, evaluate it
        if (rawValue is not null && rawValue.Contains("{{") && rawValue.Contains("}}"))
        {
            try
            {
                // Extract the expression and evaluate
                var trimmed = rawValue.Trim();
                if (trimmed.StartsWith("{{") && trimmed.EndsWith("}}"))
                {
                    var expression = trimmed[2..^2].Trim();
                    return ExpressionEvaluator.Evaluate<T>(expression, context);
                }

                // Mixed expression - evaluate as string and try to convert
                var evaluated = ExpressionEvaluator.EvaluateString(rawValue, context);
                return ConvertValue<T>(evaluated);
            }
            catch (Exception ex)
            {
                Logger.LogWarning(
                    ex,
                    "Failed to evaluate expression for property {PropertyName} in node {NodeId}",
                    propertyName,
                    node.Id ?? "unnamed"
                );
                return defaultValue;
            }
        }

        // Not an expression, get the raw value
        return node.GetProperty(propertyName, defaultValue);
    }

    /// <summary>
    /// Evaluates an enumeration property that may contain expressions.
    /// </summary>
    /// <typeparam name="TEnum">The enum type.</typeparam>
    /// <param name="node">The layout node.</param>
    /// <param name="propertyName">The property name.</param>
    /// <param name="context">The render context.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The evaluated enum value.</returns>
    protected TEnum EvaluateEnumProperty<TEnum>(
        LayoutNode node,
        string propertyName,
        RenderContext context,
        TEnum defaultValue = default
    )
        where TEnum : struct, Enum
    {
        var stringValue = EvaluateStringProperty(node, propertyName, context);

        if (string.IsNullOrEmpty(stringValue))
        {
            return defaultValue;
        }

        if (Enum.TryParse<TEnum>(stringValue, ignoreCase: true, out var result))
        {
            return result;
        }

        Logger.LogWarning(
            "Invalid enum value '{Value}' for property {PropertyName} in node {NodeId}, using default {Default}",
            stringValue,
            propertyName,
            node.Id ?? "unnamed",
            defaultValue
        );

        return defaultValue;
    }

    // ========================================
    // Style Resolution Helpers
    // ========================================

    /// <summary>
    /// Resolves the effective styles for a node by merging with inherited styles.
    /// </summary>
    /// <param name="node">The layout node.</param>
    /// <param name="context">The render context with inherited styles.</param>
    /// <returns>The resolved style properties.</returns>
    protected StyleProperties ResolveStyles(LayoutNode node, RenderContext context)
    {
        if (!InheritsStyle)
        {
            // Return only the node's own style (or empty if none)
            return node.Style?.Clone() ?? new StyleProperties();
        }

        var resolved = StyleResolver.ResolveStyle(node, context);
        return StyleResolver.EvaluateStyleExpressions(resolved, context);
    }

    /// <summary>
    /// Creates a child context with the resolved styles for passing to children.
    /// </summary>
    /// <param name="parentContext">The parent render context.</param>
    /// <param name="resolvedStyle">The resolved style to inherit.</param>
    /// <returns>A new render context for children.</returns>
    protected static RenderContext CreateChildContext(
        RenderContext parentContext,
        StyleProperties resolvedStyle
    )
    {
        // Clone the context to avoid modifying the parent
        var childContext = parentContext.Clone();
        childContext.InheritedStyle = resolvedStyle;
        return childContext;
    }

    // ========================================
    // Child Rendering Helpers
    // ========================================

    /// <summary>
    /// Renders the single child of a wrapper component.
    /// </summary>
    /// <param name="container">The QuestPDF container.</param>
    /// <param name="node">The parent layout node.</param>
    /// <param name="context">The render context.</param>
    /// <param name="layoutEngine">The layout engine.</param>
    protected void RenderChild(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine
    )
    {
        if (node.Child is null)
        {
            Logger.LogDebug(
                "Wrapper component {RendererName} has no child to render for node {NodeId}",
                RendererName,
                node.Id ?? "unnamed"
            );
            return;
        }

        layoutEngine.Render(container, node.Child, context);
    }

    /// <summary>
    /// Renders all children of a container component.
    /// </summary>
    /// <param name="container">The QuestPDF container.</param>
    /// <param name="node">The parent layout node.</param>
    /// <param name="context">The render context.</param>
    /// <param name="layoutEngine">The layout engine.</param>
    protected void RenderChildren(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine
    )
    {
        if (node.Children is null || node.Children.Count == 0)
        {
            Logger.LogDebug(
                "Container component {RendererName} has no children to render for node {NodeId}",
                RendererName,
                node.Id ?? "unnamed"
            );
            return;
        }

        layoutEngine.RenderChildren(container, node.Children, context);
    }

    // ========================================
    // Utility Methods
    // ========================================

    /// <summary>
    /// Converts a string value to the specified type.
    /// </summary>
    /// <typeparam name="T">The target type.</typeparam>
    /// <param name="value">The string value to convert.</param>
    /// <returns>The converted value.</returns>
    private static T? ConvertValue<T>(string? value)
    {
        if (value is null)
        {
            return default;
        }

        var targetType = typeof(T);
        var underlyingType = Nullable.GetUnderlyingType(targetType) ?? targetType;

        try
        {
            if (underlyingType == typeof(string))
            {
                return (T)(object)value;
            }

            if (underlyingType == typeof(int))
            {
                return int.TryParse(value, out var intResult) ? (T)(object)intResult : default;
            }

            if (underlyingType == typeof(float))
            {
                return float.TryParse(value, out var floatResult)
                    ? (T)(object)floatResult
                    : default;
            }

            if (underlyingType == typeof(double))
            {
                return double.TryParse(value, out var doubleResult)
                    ? (T)(object)doubleResult
                    : default;
            }

            if (underlyingType == typeof(bool))
            {
                return bool.TryParse(value, out var boolResult) ? (T)(object)boolResult : default;
            }

            if (underlyingType.IsEnum)
            {
                return Enum.TryParse(underlyingType, value, ignoreCase: true, out var enumResult)
                    ? (T)enumResult
                    : default;
            }

            // Try JSON deserialization for complex types
            return JsonSerializer.Deserialize<T>(value);
        }
        catch
        {
            return default;
        }
    }

    /// <summary>
    /// Parses a color string (hex format) and validates it.
    /// </summary>
    /// <param name="colorString">The color string (e.g., "#FF0000" or "FF0000").</param>
    /// <param name="defaultColor">The default color if parsing fails.</param>
    /// <returns>The normalized color string with # prefix.</returns>
    protected string ParseColor(string? colorString, string defaultColor = "#000000")
    {
        if (string.IsNullOrWhiteSpace(colorString))
        {
            return defaultColor;
        }

        var color = colorString.Trim();

        // Add # prefix if missing
        if (!color.StartsWith('#'))
        {
            color = "#" + color;
        }

        // Validate hex color format
        if (IsValidHexColor(color))
        {
            return color;
        }

        Logger.LogWarning(
            "Invalid color format '{Color}', using default '{Default}'",
            colorString,
            defaultColor
        );

        return defaultColor;
    }

    /// <summary>
    /// Validates if a string is a valid hex color.
    /// </summary>
    /// <param name="color">The color string to validate.</param>
    /// <returns>True if valid hex color; otherwise, false.</returns>
    private static bool IsValidHexColor(string color)
    {
        if (color.Length != 7 && color.Length != 9) // #RRGGBB or #AARRGGBB
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

    /// <summary>
    /// Clamps a value between a minimum and maximum.
    /// </summary>
    /// <param name="value">The value to clamp.</param>
    /// <param name="min">The minimum value.</param>
    /// <param name="max">The maximum value.</param>
    /// <returns>The clamped value.</returns>
    protected static float Clamp(float value, float min, float max)
    {
        return Math.Max(min, Math.Min(max, value));
    }

    /// <summary>
    /// Ensures a value is positive, returning the default if not.
    /// </summary>
    /// <param name="value">The value to check.</param>
    /// <param name="defaultValue">The default value to use.</param>
    /// <returns>The positive value or default.</returns>
    protected static float EnsurePositive(float? value, float defaultValue = 0f)
    {
        return value.HasValue && value.Value > 0 ? value.Value : defaultValue;
    }
}
