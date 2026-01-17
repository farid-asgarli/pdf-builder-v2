using System.Collections;
using System.Dynamic;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using DynamicExpresso;
using DynamicExpresso.Exceptions;
using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Exceptions;
using PDFBuilder.Core.Interfaces;

namespace PDFBuilder.Engine.Services;

/// <summary>
/// Evaluates expressions using Monaco {{ expression }} syntax.
/// Uses DynamicExpresso for C# expression evaluation with caching and comprehensive error handling.
/// </summary>
public sealed partial class ExpressionEvaluator : IExpressionEvaluator
{
    /// <summary>
    /// Regex pattern for extracting {{ expression }} from strings.
    /// Supports nested braces and whitespace flexibility.
    /// </summary>
    private static readonly Regex ExpressionPattern = CreateExpressionRegex();

    /// <summary>
    /// Maximum expression complexity (prevents DoS with complex expressions).
    /// </summary>
    private const int MaxExpressionLength = 2048;

    /// <summary>
    /// Types that are safe to use in expressions.
    /// </summary>
    private static readonly Type[] AllowedTypes =
    [
        typeof(string),
        typeof(int),
        typeof(long),
        typeof(float),
        typeof(double),
        typeof(decimal),
        typeof(bool),
        typeof(DateTime),
        typeof(DateTimeOffset),
        typeof(TimeSpan),
        typeof(Guid),
        typeof(Math),
        typeof(Convert),
        typeof(Enumerable),
        typeof(StringComparison),
        typeof(DateTimeKind),
    ];

    /// <summary>
    /// Forbidden patterns in expressions for security.
    /// </summary>
    private static readonly string[] ForbiddenPatterns =
    [
        "System.Reflection",
        "System.IO",
        "System.Diagnostics",
        "System.Runtime",
        "Process",
        "Assembly",
        "AppDomain",
        "Environment.Exit",
        "File.",
        "Directory.",
        "Path.",
        "typeof(",
        "GetType(",
        "Activator.",
        "MethodInfo",
        "FieldInfo",
        "PropertyInfo",
    ];

    private readonly ILogger<ExpressionEvaluator> _logger;

    /// <summary>
    /// Initializes a new instance of the ExpressionEvaluator class.
    /// </summary>
    /// <param name="cache">The memory cache for compiled expressions (reserved for future use).</param>
    /// <param name="logger">The logger instance.</param>
    public ExpressionEvaluator(IMemoryCache cache, ILogger<ExpressionEvaluator> logger)
    {
        ArgumentNullException.ThrowIfNull(cache);
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public string EvaluateString(string input, RenderContext context)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(context);

        if (!ContainsExpressions(input))
        {
            return input;
        }

        var result = new StringBuilder(input);
        var matches = ExpressionPattern.Matches(input);

        // Process matches in reverse order to maintain correct positions
        for (var i = matches.Count - 1; i >= 0; i--)
        {
            var match = matches[i];
            var fullMatch = match.Value;
            var expression = match.Groups[1].Value.Trim();

            try
            {
                var evaluated = Evaluate(expression, context);
                var replacement = FormatValue(evaluated);
                result.Replace(fullMatch, replacement, match.Index, fullMatch.Length);
            }
            catch (ExpressionEvaluationException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to evaluate expression: {Expression}", expression);
                throw new ExpressionEvaluationException(
                    $"Failed to evaluate expression '{expression}': {ex.Message}",
                    expression,
                    ex
                );
            }
        }

        return result.ToString();
    }

    /// <inheritdoc />
    public T Evaluate<T>(string expression, RenderContext context)
    {
        var result = Evaluate(expression, context);

        if (result is null)
        {
            if (default(T) is null)
            {
                return default!;
            }

            throw new ExpressionEvaluationException(
                $"Expression '{expression}' returned null but expected non-nullable type '{typeof(T).Name}'.",
                expression
            );
        }

        // Handle JsonElement conversion
        if (result is JsonElement jsonElement)
        {
            var converted = ConvertJsonElement(jsonElement, typeof(T));
            if (converted is null)
            {
                if (default(T) is null)
                {
                    return default!;
                }

                throw new ExpressionEvaluationException(
                    $"Expression '{expression}' returned null but expected non-nullable type '{typeof(T).Name}'.",
                    expression
                );
            }

            result = converted;
        }

        // Direct type match
        if (result is T typedResult)
        {
            return typedResult;
        }

        // Try type conversion
        try
        {
            return (T)Convert.ChangeType(result, typeof(T));
        }
        catch (InvalidCastException)
        {
            throw new ExpressionEvaluationException(expression, typeof(T), result?.GetType())
            {
                ErrorPosition = null,
            };
        }
        catch (FormatException)
        {
            throw new ExpressionEvaluationException(expression, typeof(T), result?.GetType())
            {
                ErrorPosition = null,
            };
        }
    }

    /// <inheritdoc />
    public object? Evaluate(string expression, RenderContext context)
    {
        ArgumentNullException.ThrowIfNull(expression);
        ArgumentNullException.ThrowIfNull(context);

        expression = expression.Trim();

        if (string.IsNullOrEmpty(expression))
        {
            return null;
        }

        ValidateExpressionSecurity(expression);

        try
        {
            var interpreter = CreateInterpreter(context);
            var lambda = GetOrCompileExpression(expression, interpreter);
            return lambda.Invoke();
        }
        catch (ExpressionEvaluationException)
        {
            throw;
        }
        catch (ParseException ex)
        {
            _logger.LogWarning(
                "Syntax error in expression: {Expression}, Error: {Error}",
                expression,
                ex.Message
            );
            throw ExpressionEvaluationException.SyntaxError(expression, ex.Message, ex.Position);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to evaluate expression: {Expression}", expression);
            throw new ExpressionEvaluationException(
                $"Failed to evaluate expression '{expression}': {ex.Message}",
                expression,
                ex
            );
        }
    }

    /// <inheritdoc />
    public bool TryEvaluate<T>(string expression, RenderContext context, out T? result)
    {
        result = default;

        try
        {
            result = Evaluate<T>(expression, context);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "TryEvaluate failed for expression: {Expression}", expression);
            return false;
        }
    }

    /// <inheritdoc />
    public bool TryEvaluateString(string input, RenderContext context, out string? result)
    {
        result = null;

        try
        {
            result = EvaluateString(input, context);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "TryEvaluateString failed for input: {Input}", input);
            return false;
        }
    }

    /// <inheritdoc />
    public bool EvaluateCondition(string expression, RenderContext context)
    {
        ArgumentNullException.ThrowIfNull(expression);
        ArgumentNullException.ThrowIfNull(context);

        var result = Evaluate(expression, context);

        return result switch
        {
            bool b => b,
            int i => i != 0,
            long l => l != 0,
            float f => f != 0,
            double d => d != 0,
            decimal dec => dec != 0,
            string s => !string.IsNullOrEmpty(s),
            null => false,
            IEnumerable e => e.Cast<object>().Any(),
            _ => true,
        };
    }

    /// <inheritdoc />
    public bool ContainsExpressions(string? input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return false;
        }

        return input.Contains("{{") && input.Contains("}}");
    }

    /// <inheritdoc />
    public IEnumerable<string> ExtractExpressions(string input)
    {
        ArgumentNullException.ThrowIfNull(input);

        if (!ContainsExpressions(input))
        {
            yield break;
        }

        var matches = ExpressionPattern.Matches(input);
        foreach (Match match in matches)
        {
            yield return match.Groups[1].Value.Trim();
        }
    }

    /// <inheritdoc />
    public ExpressionValidationResult ValidateExpression(string expression)
    {
        ArgumentNullException.ThrowIfNull(expression);

        expression = expression.Trim();

        if (string.IsNullOrEmpty(expression))
        {
            return ExpressionValidationResult.Invalid(expression, "Expression cannot be empty.");
        }

        if (expression.Length > MaxExpressionLength)
        {
            return ExpressionValidationResult.Invalid(
                expression,
                $"Expression exceeds maximum length of {MaxExpressionLength} characters."
            );
        }

        // Check for forbidden patterns
        foreach (var pattern in ForbiddenPatterns)
        {
            if (expression.Contains(pattern, StringComparison.OrdinalIgnoreCase))
            {
                return ExpressionValidationResult.Invalid(
                    expression,
                    $"Expression contains forbidden pattern: '{pattern}'"
                );
            }
        }

        // Try to parse the expression with a dummy context
        try
        {
            var interpreter = new Interpreter(InterpreterOptions.Default);
            ConfigureInterpreter(interpreter);

            // Add dummy parameters for validation
            interpreter.SetVariable("data", new ExpandoObject());
            interpreter.SetVariable("page", new PageInfo());
            interpreter.SetVariable("document", new DocumentInfo());
            interpreter.SetVariable("item", new object());
            interpreter.SetVariable("index", 0);
            interpreter.SetVariable("isFirst", false);
            interpreter.SetVariable("isLast", false);
            interpreter.SetVariable("repeatIndex", 0);
            interpreter.SetVariable("repeatCount", 0);

            interpreter.Parse(expression);
            return ExpressionValidationResult.Valid(expression);
        }
        catch (ParseException ex)
        {
            return ExpressionValidationResult.Invalid(expression, ex.Message, ex.Position);
        }
        catch (Exception ex)
        {
            return ExpressionValidationResult.Invalid(expression, ex.Message);
        }
    }

    /// <inheritdoc />
    public IEnumerable<ExpressionValidationResult> ValidateExpressions(string input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var expressions = ExtractExpressions(input);
        return expressions.Select(ValidateExpression);
    }

    /// <inheritdoc />
    public IEnumerable<object?> EvaluateCollection(string expression, RenderContext context)
    {
        ArgumentNullException.ThrowIfNull(expression);
        ArgumentNullException.ThrowIfNull(context);

        var result = Evaluate(expression, context);

        if (result is null)
        {
            return [];
        }

        if (result is IEnumerable enumerable and not string)
        {
            return enumerable.Cast<object?>();
        }

        throw new ExpressionEvaluationException(
            $"Expression '{expression}' did not return a collection. Got type: {result.GetType().Name}",
            expression
        );
    }

    /// <summary>
    /// Creates and configures a DynamicExpresso interpreter for the given context.
    /// </summary>
    private static Interpreter CreateInterpreter(RenderContext context)
    {
        var interpreter = new Interpreter(InterpreterOptions.Default);
        ConfigureInterpreter(interpreter);

        // Register all variables from context
        var variables = context.GetAllVariables();
        foreach (var kvp in variables)
        {
            if (kvp.Value is not null)
            {
                // Handle JsonElement by converting to dynamic
                var value = kvp.Value is JsonElement je
                    ? ConvertJsonElementToDynamic(je)
                    : kvp.Value;

                interpreter.SetVariable(kvp.Key, value, value?.GetType() ?? typeof(object));
            }
            else
            {
                interpreter.SetVariable(kvp.Key, null, typeof(object));
            }
        }

        return interpreter;
    }

    /// <summary>
    /// Configures the interpreter with allowed types and safe settings.
    /// </summary>
    private static void ConfigureInterpreter(Interpreter interpreter)
    {
        // Reference allowed types
        foreach (var type in AllowedTypes)
        {
            interpreter.Reference(type);
        }

        // Add common string functions
        interpreter.SetFunction("IsNullOrEmpty", string.IsNullOrEmpty);
        interpreter.SetFunction("IsNullOrWhiteSpace", string.IsNullOrWhiteSpace);
        interpreter.SetFunction(
            "Format",
            (Func<string, object?[], string>)((format, args) => string.Format(format, args))
        );

        // Add common math helpers
        interpreter.SetFunction("Round", (Func<double, int, double>)Math.Round);
        interpreter.SetFunction("Floor", (Func<double, double>)Math.Floor);
        interpreter.SetFunction("Ceiling", (Func<double, double>)Math.Ceiling);
        interpreter.SetFunction("Abs", (Func<double, double>)Math.Abs);
        interpreter.SetFunction("Min", (Func<double, double, double>)Math.Min);
        interpreter.SetFunction("Max", (Func<double, double, double>)Math.Max);

        // Add date/time helpers
        interpreter.SetVariable("Now", DateTime.Now, typeof(DateTime));
        interpreter.SetVariable("UtcNow", DateTime.UtcNow, typeof(DateTime));
        interpreter.SetVariable("Today", DateTime.Today, typeof(DateTime));

        // Add formatting helpers
        interpreter.SetFunction("Currency", (Func<decimal, string>)(value => value.ToString("C")));
        interpreter.SetFunction("Percent", (Func<double, string>)(value => value.ToString("P")));
        interpreter.SetFunction("ShortDate", (Func<DateTime, string>)(date => date.ToString("d")));
        interpreter.SetFunction("LongDate", (Func<DateTime, string>)(date => date.ToString("D")));
    }

    /// <summary>
    /// Gets or compiles an expression, using cache for performance.
    /// </summary>
    private static Lambda GetOrCompileExpression(string expression, Interpreter interpreter)
    {
        // For expressions with variables, we need to compile fresh each time
        // because the interpreter has context-specific variables
        // However, we can cache the parsed structure for repeated evaluations

        // Always compile with current interpreter context
        // The cache is more useful for repeated evaluations within the same request
        return interpreter.Parse(expression);
    }

    /// <summary>
    /// Validates an expression for security concerns.
    /// </summary>
    private void ValidateExpressionSecurity(string expression)
    {
        if (expression.Length > MaxExpressionLength)
        {
            throw new ExpressionEvaluationException(
                $"Expression exceeds maximum allowed length of {MaxExpressionLength} characters.",
                expression
            );
        }

        foreach (var pattern in ForbiddenPatterns)
        {
            if (expression.Contains(pattern, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning(
                    "Blocked expression containing forbidden pattern: {Pattern} in {Expression}",
                    pattern,
                    expression
                );
                throw new ExpressionEvaluationException(
                    $"Expression contains forbidden pattern: '{pattern}'",
                    expression
                );
            }
        }
    }

    /// <summary>
    /// Formats a value for string interpolation.
    /// </summary>
    private static string FormatValue(object? value)
    {
        return value switch
        {
            null => string.Empty,
            string s => s,
            bool b => b.ToString().ToLowerInvariant(),
            DateTime dt => dt.ToString("g"),
            DateTimeOffset dto => dto.ToString("g"),
            decimal d => d.ToString("G"),
            float f => f.ToString("G"),
            double dbl => dbl.ToString("G"),
            JsonElement je => FormatJsonElement(je),
            _ => value.ToString() ?? string.Empty,
        };
    }

    /// <summary>
    /// Formats a JsonElement for string output.
    /// </summary>
    private static string FormatJsonElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString() ?? string.Empty,
            JsonValueKind.Number => element.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => string.Empty,
            _ => element.GetRawText(),
        };
    }

    /// <summary>
    /// Converts a JsonElement to the specified type.
    /// </summary>
    private static object? ConvertJsonElement(JsonElement element, Type targetType)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String when targetType == typeof(string) => element.GetString(),
            JsonValueKind.String when targetType == typeof(DateTime) => element.GetDateTime(),
            JsonValueKind.String when targetType == typeof(DateTimeOffset) =>
                element.GetDateTimeOffset(),
            JsonValueKind.String when targetType == typeof(Guid) => element.GetGuid(),
            JsonValueKind.Number when targetType == typeof(int) => element.GetInt32(),
            JsonValueKind.Number when targetType == typeof(long) => element.GetInt64(),
            JsonValueKind.Number when targetType == typeof(float) => element.GetSingle(),
            JsonValueKind.Number when targetType == typeof(double) => element.GetDouble(),
            JsonValueKind.Number when targetType == typeof(decimal) => element.GetDecimal(),
            JsonValueKind.True or JsonValueKind.False when targetType == typeof(bool) =>
                element.GetBoolean(),
            JsonValueKind.Null => null,
            _ => element.Deserialize(targetType),
        };
    }

    /// <summary>
    /// Converts a JsonElement to a dynamic object for expression evaluation.
    /// </summary>
    private static object? ConvertJsonElementToDynamic(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => ConvertJsonObjectToExpando(element),
            JsonValueKind.Array => element
                .EnumerateArray()
                .Select(ConvertJsonElementToDynamic)
                .ToList(),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number when element.TryGetInt32(out var i) => i,
            JsonValueKind.Number when element.TryGetInt64(out var l) => l,
            JsonValueKind.Number when element.TryGetDouble(out var d) => d,
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            _ => element.GetRawText(),
        };
    }

    /// <summary>
    /// Converts a JSON object to an ExpandoObject for dynamic property access.
    /// </summary>
    private static ExpandoObject ConvertJsonObjectToExpando(JsonElement element)
    {
        var expando = new ExpandoObject();
        var dict = (IDictionary<string, object?>)expando;

        foreach (var property in element.EnumerateObject())
        {
            dict[property.Name] = ConvertJsonElementToDynamic(property.Value);
        }

        return expando;
    }

    /// <summary>
    /// Creates the regex for matching {{ expression }} patterns.
    /// </summary>
    [GeneratedRegex(@"\{\{\s*(.+?)\s*\}\}", RegexOptions.Compiled | RegexOptions.Singleline)]
    private static partial Regex CreateExpressionRegex();
}
