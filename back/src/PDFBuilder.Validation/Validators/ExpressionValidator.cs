using System.Dynamic;
using System.Text.RegularExpressions;
using DynamicExpresso;
using DynamicExpresso.Exceptions;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;

namespace PDFBuilder.Validation.Validators;

/// <summary>
/// Validates expression syntax and security without evaluating against actual data.
/// Provides detailed error messages for syntax issues and security violations.
/// </summary>
public sealed partial class ExpressionValidator
{
    /// <summary>
    /// Regex pattern for extracting {{ expression }} from strings.
    /// </summary>
    private static readonly Regex ExpressionPattern = CreateExpressionRegex();

    /// <summary>
    /// Maximum allowed expression length.
    /// </summary>
    public const int MaxExpressionLength = 2048;

    /// <summary>
    /// Maximum nesting depth for expressions.
    /// </summary>
    public const int MaxNestingDepth = 10;

    /// <summary>
    /// Patterns that are forbidden for security reasons.
    /// </summary>
    private static readonly string[] ForbiddenPatterns =
    [
        "System.Reflection",
        "System.IO",
        "System.Diagnostics",
        "System.Runtime",
        "System.Net",
        "System.Security",
        "Process",
        "Assembly",
        "AppDomain",
        "Environment.Exit",
        "Environment.GetEnvironmentVariable",
        "File.",
        "Directory.",
        "Path.",
        "typeof(",
        "GetType(",
        "Activator.",
        "MethodInfo",
        "FieldInfo",
        "PropertyInfo",
        "Invoke(",
        "DynamicInvoke",
        "Emit",
        "Marshal",
        "GCHandle",
        "unsafe",
        "fixed(",
        "stackalloc",
        "__arglist",
        "__makeref",
        "__reftype",
        "__refvalue",
    ];

    /// <summary>
    /// Patterns that trigger warnings but are allowed.
    /// </summary>
    private static readonly string[] WarningPatterns =
    [
        "while(",
        "for(",
        "foreach(",
        "do{",
        "goto",
        "Thread.",
        "Task.",
        "async",
        "await",
    ];

    /// <summary>
    /// Types that are safe to reference in expressions.
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
    ];

    /// <summary>
    /// Validates an expression string for syntax and security issues.
    /// </summary>
    /// <param name="expression">The expression to validate (without {{ }} markers).</param>
    /// <returns>A validation result with details about any issues found.</returns>
    public static ExpressionValidationResult Validate(string expression)
    {
        if (string.IsNullOrWhiteSpace(expression))
        {
            return ExpressionValidationResult.Invalid(
                expression ?? string.Empty,
                "Expression cannot be empty or whitespace."
            );
        }

        expression = expression.Trim();

        // Check length
        if (expression.Length > MaxExpressionLength)
        {
            return ExpressionValidationResult.Invalid(
                expression,
                $"Expression exceeds maximum length of {MaxExpressionLength} characters."
            );
        }

        // Check for balanced brackets/parentheses
        var balanceResult = CheckBracketBalance(expression);
        if (!balanceResult.IsValid)
        {
            return balanceResult;
        }

        // Check for forbidden patterns (security)
        var securityResult = CheckSecurityPatterns(expression);
        if (!securityResult.IsValid)
        {
            return securityResult;
        }

        // Check nesting depth
        var nestingResult = CheckNestingDepth(expression);
        if (!nestingResult.IsValid)
        {
            return nestingResult;
        }

        // Try to parse with DynamicExpresso
        var parseResult = TryParse(expression);
        if (!parseResult.IsValid)
        {
            return parseResult;
        }

        // Check for warnings
        var warnings = CheckWarningPatterns(expression);

        return new ExpressionValidationResult
        {
            Expression = expression,
            IsValid = true,
            Warnings = warnings,
        };
    }

    /// <summary>
    /// Validates a string that may contain multiple {{ expression }} blocks.
    /// </summary>
    /// <param name="input">The string containing expressions.</param>
    /// <returns>Validation results for each expression found.</returns>
    public static IEnumerable<ExpressionValidationResult> ValidateString(string input)
    {
        if (string.IsNullOrEmpty(input))
        {
            yield break;
        }

        var matches = ExpressionPattern.Matches(input);

        if (matches.Count == 0)
        {
            yield break;
        }

        foreach (Match match in matches)
        {
            var expression = match.Groups[1].Value.Trim();
            yield return Validate(expression);
        }
    }

    /// <summary>
    /// Checks if a string contains any expression syntax.
    /// </summary>
    /// <param name="input">The string to check.</param>
    /// <returns>True if the string contains {{ }} patterns.</returns>
    public static bool ContainsExpressions(string? input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return false;
        }

        return input.Contains("{{") && input.Contains("}}");
    }

    /// <summary>
    /// Extracts all expressions from a string.
    /// </summary>
    /// <param name="input">The string to extract from.</param>
    /// <returns>The extracted expression strings (without {{ }} markers).</returns>
    public static IEnumerable<string> ExtractExpressions(string input)
    {
        if (string.IsNullOrEmpty(input))
        {
            yield break;
        }

        var matches = ExpressionPattern.Matches(input);
        foreach (Match match in matches)
        {
            yield return match.Groups[1].Value.Trim();
        }
    }

    /// <summary>
    /// Checks if brackets and parentheses are balanced.
    /// </summary>
    private static ExpressionValidationResult CheckBracketBalance(string expression)
    {
        var stack = new Stack<(char bracket, int position)>();
        var pairs = new Dictionary<char, char>
        {
            { ')', '(' },
            { ']', '[' },
            { '}', '{' },
        };

        for (var i = 0; i < expression.Length; i++)
        {
            var c = expression[i];

            // Skip characters inside strings
            if (c == '"' || c == '\'')
            {
                var quote = c;
                i++;
                while (i < expression.Length)
                {
                    if (expression[i] == quote && (i == 0 || expression[i - 1] != '\\'))
                    {
                        break;
                    }

                    i++;
                }

                continue;
            }

            if (c is '(' or '[' or '{')
            {
                stack.Push((c, i));
            }
            else if (pairs.TryGetValue(c, out var opening))
            {
                if (stack.Count == 0)
                {
                    return ExpressionValidationResult.Invalid(
                        expression,
                        $"Unexpected closing bracket '{c}' at position {i}.",
                        i
                    );
                }

                var (lastBracket, lastPos) = stack.Pop();
                if (lastBracket != opening)
                {
                    return ExpressionValidationResult.Invalid(
                        expression,
                        $"Mismatched brackets: expected closing for '{lastBracket}' at position {lastPos}, found '{c}' at position {i}.",
                        i
                    );
                }
            }
        }

        if (stack.Count > 0)
        {
            var (bracket, position) = stack.Pop();
            return ExpressionValidationResult.Invalid(
                expression,
                $"Unclosed bracket '{bracket}' at position {position}.",
                position
            );
        }

        return ExpressionValidationResult.Valid(expression);
    }

    /// <summary>
    /// Checks for forbidden security patterns.
    /// </summary>
    private static ExpressionValidationResult CheckSecurityPatterns(string expression)
    {
        foreach (var pattern in ForbiddenPatterns)
        {
            var index = expression.IndexOf(pattern, StringComparison.OrdinalIgnoreCase);
            if (index >= 0)
            {
                return ExpressionValidationResult.Invalid(
                    expression,
                    $"Expression contains forbidden pattern: '{pattern}'. This pattern is blocked for security reasons.",
                    index
                );
            }
        }

        return ExpressionValidationResult.Valid(expression);
    }

    /// <summary>
    /// Checks for warning patterns.
    /// </summary>
    private static List<string> CheckWarningPatterns(string expression)
    {
        var warnings = new List<string>();

        foreach (var pattern in WarningPatterns)
        {
            if (expression.Contains(pattern, StringComparison.OrdinalIgnoreCase))
            {
                warnings.Add(
                    $"Expression contains pattern '{pattern}' which may indicate complex logic. Consider simplifying."
                );
            }
        }

        // Check for very long method chains
        var dotCount = expression.Count(c => c == '.');
        if (dotCount > 5)
        {
            warnings.Add(
                "Expression contains a deep method chain. Consider breaking it into smaller parts."
            );
        }

        return warnings;
    }

    /// <summary>
    /// Checks expression nesting depth.
    /// </summary>
    private static ExpressionValidationResult CheckNestingDepth(string expression)
    {
        var depth = 0;
        var maxDepth = 0;
        var maxDepthPos = 0;

        for (var i = 0; i < expression.Length; i++)
        {
            var c = expression[i];

            // Skip strings
            if (c == '"' || c == '\'')
            {
                var quote = c;
                i++;
                while (i < expression.Length && expression[i] != quote)
                {
                    if (expression[i] == '\\')
                    {
                        i++;
                    }

                    i++;
                }

                continue;
            }

            if (c == '(')
            {
                depth++;
                if (depth > maxDepth)
                {
                    maxDepth = depth;
                    maxDepthPos = i;
                }
            }
            else if (c == ')')
            {
                depth--;
            }
        }

        if (maxDepth > MaxNestingDepth)
        {
            return ExpressionValidationResult.Invalid(
                expression,
                $"Expression nesting depth ({maxDepth}) exceeds maximum allowed ({MaxNestingDepth}).",
                maxDepthPos
            );
        }

        return ExpressionValidationResult.Valid(expression);
    }

    /// <summary>
    /// Attempts to parse the expression with DynamicExpresso.
    /// </summary>
    private static ExpressionValidationResult TryParse(string expression)
    {
        try
        {
            var interpreter = new Interpreter(InterpreterOptions.Default);

            // Reference allowed types
            foreach (var type in AllowedTypes)
            {
                interpreter.Reference(type);
            }

            // Set up dummy variables that match what the real evaluator provides
            interpreter.SetVariable("data", CreateDummyObject());
            interpreter.SetVariable("page", new PageInfo());
            interpreter.SetVariable("document", new DocumentInfo());
            interpreter.SetVariable("item", CreateDummyObject());
            interpreter.SetVariable("index", 0);
            interpreter.SetVariable("isFirst", false);
            interpreter.SetVariable("isLast", false);
            interpreter.SetVariable("repeatIndex", 0);
            interpreter.SetVariable("repeatCount", 0);

            // Add built-in functions
            interpreter.SetVariable("Now", DateTime.Now);
            interpreter.SetVariable("Today", DateTime.Today);
            interpreter.SetVariable("UtcNow", DateTime.UtcNow);

            interpreter.SetFunction("IsNullOrEmpty", string.IsNullOrEmpty);
            interpreter.SetFunction("IsNullOrWhiteSpace", string.IsNullOrWhiteSpace);
            interpreter.SetFunction("Round", (Func<double, int, double>)Math.Round);
            interpreter.SetFunction("Floor", (Func<double, double>)Math.Floor);
            interpreter.SetFunction("Ceiling", (Func<double, double>)Math.Ceiling);
            interpreter.SetFunction("Abs", (Func<double, double>)Math.Abs);
            interpreter.SetFunction("Min", (Func<double, double, double>)Math.Min);
            interpreter.SetFunction("Max", (Func<double, double, double>)Math.Max);
            interpreter.SetFunction("Currency", (Func<decimal, string>)(v => v.ToString("C")));
            interpreter.SetFunction("Percent", (Func<double, string>)(v => v.ToString("P")));
            interpreter.SetFunction("ShortDate", (Func<DateTime, string>)(d => d.ToString("d")));
            interpreter.SetFunction("LongDate", (Func<DateTime, string>)(d => d.ToString("D")));

            // Parse (but don't evaluate)
            interpreter.Parse(expression);

            return ExpressionValidationResult.Valid(expression);
        }
        catch (ParseException ex)
        {
            return ExpressionValidationResult.Invalid(expression, ex.Message, ex.Position);
        }
        catch (Exception ex)
        {
            return ExpressionValidationResult.Invalid(
                expression,
                $"Failed to parse expression: {ex.Message}"
            );
        }
    }

    /// <summary>
    /// Creates a dummy object for validation that allows property access.
    /// </summary>
    private static dynamic CreateDummyObject()
    {
        dynamic obj = new ExpandoObject();
        return obj;
    }

    /// <summary>
    /// Creates the regex for matching {{ expression }} patterns.
    /// </summary>
    [GeneratedRegex(@"\{\{\s*(.+?)\s*\}\}", RegexOptions.Compiled | RegexOptions.Singleline)]
    private static partial Regex CreateExpressionRegex();
}
