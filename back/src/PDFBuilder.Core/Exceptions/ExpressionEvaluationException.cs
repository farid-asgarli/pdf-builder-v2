namespace PDFBuilder.Core.Exceptions;

/// <summary>
/// Exception thrown when expression evaluation fails.
/// </summary>
public class ExpressionEvaluationException : PdfBuilderException
{
    /// <inheritdoc />
    public override string ErrorCode => "EXPRESSION_EVALUATION_ERROR";

    /// <summary>
    /// Gets the expression that failed to evaluate.
    /// </summary>
    public string? Expression { get; }

    /// <summary>
    /// Gets the position in the expression where the error occurred.
    /// </summary>
    public int? ErrorPosition { get; init; }

    /// <summary>
    /// Gets the node ID where the expression is defined.
    /// </summary>
    public string? NodeId { get; }

    /// <summary>
    /// Gets the property name containing the expression.
    /// </summary>
    public string? PropertyName { get; }

    /// <summary>
    /// Gets the expected type for the expression result.
    /// </summary>
    public Type? ExpectedType { get; }

    /// <summary>
    /// Gets the actual type returned by the expression.
    /// </summary>
    public Type? ActualType { get; }

    /// <summary>
    /// Initializes a new instance of the ExpressionEvaluationException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    public ExpressionEvaluationException(string message)
        : base(message) { }

    /// <summary>
    /// Initializes a new instance of the ExpressionEvaluationException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="expression">The expression that failed.</param>
    public ExpressionEvaluationException(string message, string expression)
        : base(message)
    {
        Expression = expression;
    }

    /// <summary>
    /// Initializes a new instance of the ExpressionEvaluationException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="expression">The expression that failed.</param>
    /// <param name="innerException">The inner exception.</param>
    public ExpressionEvaluationException(
        string message,
        string expression,
        Exception innerException
    )
        : base(message, innerException)
    {
        Expression = expression;
    }

    /// <summary>
    /// Initializes a new instance of the ExpressionEvaluationException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="expression">The expression that failed.</param>
    /// <param name="nodeId">The node ID containing the expression.</param>
    /// <param name="propertyName">The property name containing the expression.</param>
    public ExpressionEvaluationException(
        string message,
        string expression,
        string? nodeId,
        string? propertyName
    )
        : base(message)
    {
        Expression = expression;
        NodeId = nodeId;
        PropertyName = propertyName;
    }

    /// <summary>
    /// Initializes a new instance of the ExpressionEvaluationException class for type mismatch.
    /// </summary>
    /// <param name="expression">The expression that failed.</param>
    /// <param name="expectedType">The expected result type.</param>
    /// <param name="actualType">The actual result type.</param>
    public ExpressionEvaluationException(string expression, Type expectedType, Type? actualType)
        : base(
            $"Expression '{expression}' returned type '{actualType?.Name ?? "null"}' but expected '{expectedType.Name}'."
        )
    {
        Expression = expression;
        ExpectedType = expectedType;
        ActualType = actualType;
    }

    /// <summary>
    /// Initializes a new instance of the ExpressionEvaluationException class.
    /// </summary>
    /// <param name="message">The error message.</param>
    /// <param name="innerException">The inner exception.</param>
    public ExpressionEvaluationException(string message, Exception innerException)
        : base(message, innerException) { }

    /// <summary>
    /// Creates an exception for an undefined variable.
    /// </summary>
    /// <param name="variableName">The undefined variable name.</param>
    /// <param name="expression">The expression containing the variable.</param>
    /// <returns>A new ExpressionEvaluationException.</returns>
    public static ExpressionEvaluationException UndefinedVariable(
        string variableName,
        string expression
    ) => new($"Variable '{variableName}' is not defined.", expression);

    /// <summary>
    /// Creates an exception for a syntax error.
    /// </summary>
    /// <param name="expression">The expression with syntax error.</param>
    /// <param name="errorMessage">The syntax error message.</param>
    /// <param name="position">The position of the error.</param>
    /// <returns>A new ExpressionEvaluationException.</returns>
    public static ExpressionEvaluationException SyntaxError(
        string expression,
        string errorMessage,
        int? position = null
    ) =>
        new($"Syntax error in expression: {errorMessage}", expression) { ErrorPosition = position };
}
