using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Exceptions;

namespace PDFBuilder.Core.Interfaces;

/// <summary>
/// Contract for expression evaluation using Monaco {{ expression }} syntax.
/// Evaluates dynamic expressions within layout properties and text content.
/// </summary>
public interface IExpressionEvaluator
{
    /// <summary>
    /// Evaluates all expressions in a string and returns the result.
    /// Expressions are denoted by {{ expression }} syntax.
    /// </summary>
    /// <param name="input">The string containing expressions to evaluate.</param>
    /// <param name="context">The render context containing variables for evaluation.</param>
    /// <returns>The string with all expressions replaced by their evaluated values.</returns>
    /// <example>
    /// Input: "Hello, {{ data.name }}!"
    /// Output: "Hello, John!" (if data.name = "John")
    /// </example>
    string EvaluateString(string input, RenderContext context);

    /// <summary>
    /// Evaluates an expression and returns the result as the specified type.
    /// </summary>
    /// <typeparam name="T">The expected return type.</typeparam>
    /// <param name="expression">The expression to evaluate (without {{ }} markers).</param>
    /// <param name="context">The render context containing variables for evaluation.</param>
    /// <returns>The evaluated result cast to type T.</returns>
    /// <exception cref="ExpressionEvaluationException">Thrown when evaluation fails or type conversion fails.</exception>
    T Evaluate<T>(string expression, RenderContext context);

    /// <summary>
    /// Evaluates an expression and returns the result as an object.
    /// </summary>
    /// <param name="expression">The expression to evaluate (without {{ }} markers).</param>
    /// <param name="context">The render context containing variables for evaluation.</param>
    /// <returns>The evaluated result.</returns>
    /// <exception cref="ExpressionEvaluationException">Thrown when evaluation fails.</exception>
    object? Evaluate(string expression, RenderContext context);

    /// <summary>
    /// Attempts to evaluate an expression, returning success/failure without throwing.
    /// </summary>
    /// <typeparam name="T">The expected return type.</typeparam>
    /// <param name="expression">The expression to evaluate.</param>
    /// <param name="context">The render context containing variables for evaluation.</param>
    /// <param name="result">The evaluated result if successful.</param>
    /// <returns>True if evaluation succeeded; otherwise, false.</returns>
    bool TryEvaluate<T>(string expression, RenderContext context, out T? result);

    /// <summary>
    /// Attempts to evaluate all expressions in a string, returning success/failure without throwing.
    /// </summary>
    /// <param name="input">The string containing expressions to evaluate.</param>
    /// <param name="context">The render context containing variables for evaluation.</param>
    /// <param name="result">The evaluated string if successful.</param>
    /// <returns>True if all expressions were evaluated successfully; otherwise, false.</returns>
    bool TryEvaluateString(string input, RenderContext context, out string? result);

    /// <summary>
    /// Evaluates a boolean expression, typically used for conditional rendering.
    /// </summary>
    /// <param name="expression">The boolean expression to evaluate.</param>
    /// <param name="context">The render context containing variables for evaluation.</param>
    /// <returns>The boolean result of the expression.</returns>
    /// <exception cref="ExpressionEvaluationException">Thrown when the expression is invalid or doesn't return a boolean.</exception>
    bool EvaluateCondition(string expression, RenderContext context);

    /// <summary>
    /// Checks if a string contains any expressions ({{ }} syntax).
    /// </summary>
    /// <param name="input">The string to check.</param>
    /// <returns>True if the string contains expressions; otherwise, false.</returns>
    bool ContainsExpressions(string? input);

    /// <summary>
    /// Extracts all expressions from a string.
    /// </summary>
    /// <param name="input">The string to extract expressions from.</param>
    /// <returns>A collection of expression strings (without {{ }} markers).</returns>
    IEnumerable<string> ExtractExpressions(string input);

    /// <summary>
    /// Validates an expression syntax without evaluating it.
    /// </summary>
    /// <param name="expression">The expression to validate (without {{ }} markers).</param>
    /// <returns>A validation result indicating syntax validity.</returns>
    ExpressionValidationResult ValidateExpression(string expression);

    /// <summary>
    /// Validates all expressions in a string.
    /// </summary>
    /// <param name="input">The string containing expressions to validate.</param>
    /// <returns>A validation result for each expression found.</returns>
    IEnumerable<ExpressionValidationResult> ValidateExpressions(string input);

    /// <summary>
    /// Evaluates an expression that should return a collection for iteration.
    /// </summary>
    /// <param name="expression">The collection expression to evaluate.</param>
    /// <param name="context">The render context containing variables for evaluation.</param>
    /// <returns>An enumerable of objects from the collection.</returns>
    /// <exception cref="ExpressionEvaluationException">Thrown when the expression doesn't return an enumerable.</exception>
    IEnumerable<object?> EvaluateCollection(string expression, RenderContext context);
}

/// <summary>
/// Represents the result of expression validation.
/// </summary>
public class ExpressionValidationResult
{
    /// <summary>
    /// Gets or sets the original expression.
    /// </summary>
    public string Expression { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the expression is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Gets or sets the error message if the expression is invalid.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Gets or sets the position of the error in the expression, if applicable.
    /// </summary>
    public int? ErrorPosition { get; set; }

    /// <summary>
    /// Gets or sets any warnings about the expression.
    /// </summary>
    public List<string> Warnings { get; init; } = [];

    /// <summary>
    /// Creates a valid result.
    /// </summary>
    /// <param name="expression">The validated expression.</param>
    /// <returns>A valid result.</returns>
    public static ExpressionValidationResult Valid(string expression) =>
        new() { Expression = expression, IsValid = true };

    /// <summary>
    /// Creates an invalid result with an error message.
    /// </summary>
    /// <param name="expression">The invalid expression.</param>
    /// <param name="errorMessage">The error message.</param>
    /// <param name="errorPosition">Optional position of the error.</param>
    /// <returns>An invalid result.</returns>
    public static ExpressionValidationResult Invalid(
        string expression,
        string errorMessage,
        int? errorPosition = null
    ) =>
        new()
        {
            Expression = expression,
            IsValid = false,
            ErrorMessage = errorMessage,
            ErrorPosition = errorPosition,
        };
}
