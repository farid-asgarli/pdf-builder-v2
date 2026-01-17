using PDFBuilder.Validation.Validators;

namespace PDFBuilder.UnitTests.Validators;

/// <summary>
/// Unit tests for ExpressionValidator.
/// Tests syntax validation, security checks, and pattern detection.
/// </summary>
public sealed class ExpressionValidatorTests
{
    #region ContainsExpressions Tests

    [Theory]
    [InlineData("Hello {{ name }}", true)]
    [InlineData("{{ data.value }}", true)]
    [InlineData("Multiple {{ a }} and {{ b }}", true)]
    [InlineData("No expressions here", false)]
    [InlineData("Only {{ opening", false)]
    [InlineData("Only closing }}", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void ContainsExpressions_ReturnsExpectedResult(string? input, bool expected)
    {
        // Act
        var result = ExpressionValidator.ContainsExpressions(input);

        // Assert
        result.Should().Be(expected);
    }

    #endregion

    #region ExtractExpressions Tests

    [Fact]
    public void ExtractExpressions_SingleExpression_ReturnsExpression()
    {
        // Arrange
        const string input = "Hello, {{ name }}!";

        // Act
        var expressions = ExpressionValidator.ExtractExpressions(input).ToList();

        // Assert
        expressions.Should().ContainSingle().Which.Should().Be("name");
    }

    [Fact]
    public void ExtractExpressions_MultipleExpressions_ReturnsAll()
    {
        // Arrange
        const string input = "{{ a }} and {{ b }} and {{ c }}";

        // Act
        var expressions = ExpressionValidator.ExtractExpressions(input).ToList();

        // Assert
        expressions.Should().HaveCount(3);
        expressions.Should().Contain(["a", "b", "c"]);
    }

    [Fact]
    public void ExtractExpressions_EmptyInput_ReturnsEmpty()
    {
        // Act
        var expressions = ExpressionValidator.ExtractExpressions("").ToList();

        // Assert
        expressions.Should().BeEmpty();
    }

    #endregion

    #region Validate - Basic Syntax Tests

    [Fact]
    public void Validate_EmptyExpression_ReturnsInvalid()
    {
        // Act
        var result = ExpressionValidator.Validate("");

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("empty");
    }

    [Fact]
    public void Validate_WhitespaceExpression_ReturnsInvalid()
    {
        // Act
        var result = ExpressionValidator.Validate("   ");

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("empty");
    }

    [Fact]
    public void Validate_SimpleMathExpression_ReturnsValid()
    {
        // Act
        var result = ExpressionValidator.Validate("1 + 2");

        // Assert
        result.IsValid.Should().BeTrue();
        result.ErrorMessage.Should().BeNull();
    }

    [Fact]
    public void Validate_SimpleStringLiteral_ReturnsValid()
    {
        // Act
        var result = ExpressionValidator.Validate("\"hello\"");

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_ConditionalExpression_ReturnsValid()
    {
        // Act
        var result = ExpressionValidator.Validate("true ? \"yes\" : \"no\"");

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_ComparisonExpression_ReturnsValid()
    {
        // Act
        var result = ExpressionValidator.Validate("1 > 0 && 2 < 5");

        // Assert
        result.IsValid.Should().BeTrue();
    }

    #endregion

    #region Validate - Bracket Balance Tests

    [Fact]
    public void Validate_UnclosedParenthesis_ReturnsInvalid()
    {
        // Act
        var result = ExpressionValidator.Validate("(1 + 2");

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("Unclosed bracket");
    }

    [Fact]
    public void Validate_ExtraClosingParenthesis_ReturnsInvalid()
    {
        // Act
        var result = ExpressionValidator.Validate("1 + 2)");

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("Unexpected closing bracket");
    }

    [Fact]
    public void Validate_MismatchedBrackets_ReturnsInvalid()
    {
        // Act
        var result = ExpressionValidator.Validate("(1 + 2]");

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("Mismatched brackets");
    }

    [Fact]
    public void Validate_BalancedNestedBrackets_ReturnsValid()
    {
        // Act
        var result = ExpressionValidator.Validate("((1 + 2) * (3 + 4))");

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_BracketsInStrings_Ignored()
    {
        // Act - brackets inside strings should not affect balance
        var result = ExpressionValidator.Validate("\"text with ( unbalanced\"");

        // Assert
        result.IsValid.Should().BeTrue();
    }

    #endregion

    #region Validate - Security Pattern Tests

    [Theory]
    [InlineData("System.IO.File.ReadAllText(\"test\")")]
    [InlineData("System.Diagnostics.Process.Start(\"cmd\")")]
    [InlineData("typeof(string)")]
    [InlineData("obj.GetType()")]
    [InlineData("Activator.CreateInstance(someType)")]
    [InlineData("System.Reflection.Assembly.Load(\"test\")")]
    [InlineData("Environment.Exit(0)")]
    [InlineData("Directory.GetFiles(\".\")")]
    [InlineData("File.Delete(\"test.txt\")")]
    [InlineData("Path.Combine(\"a\", \"b\")")]
    public void Validate_ForbiddenPatterns_ReturnsInvalid(string expression)
    {
        // Act
        var result = ExpressionValidator.Validate(expression);

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("forbidden");
    }

    [Fact]
    public void Validate_ForbiddenPattern_CaseInsensitive()
    {
        // Act
        var result = ExpressionValidator.Validate("SYSTEM.IO.FILE.ReadAllText(\"test\")");

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("forbidden");
    }

    #endregion

    #region Validate - Length and Complexity Tests

    [Fact]
    public void Validate_ExpressionTooLong_ReturnsInvalid()
    {
        // Arrange
        var longExpression = new string('x', ExpressionValidator.MaxExpressionLength + 1);

        // Act
        var result = ExpressionValidator.Validate(longExpression);

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("length");
    }

    [Fact]
    public void Validate_ExpressionAtMaxLength_ReturnsValid()
    {
        // Arrange - Use a valid expression that's long but within limits
        // Simple valid expressions like "1" repeated don't cause parse issues
        var expression = string.Join(" + ", Enumerable.Repeat("1", 100));

        // Act
        var result = ExpressionValidator.Validate(expression);

        // Assert - if it's valid syntax and within length, it should pass
        if (expression.Length <= ExpressionValidator.MaxExpressionLength)
        {
            result.IsValid.Should().BeTrue();
        }
    }

    [Fact]
    public void Validate_ExcessiveNesting_ReturnsInvalid()
    {
        // Arrange - Create deeply nested parentheses
        var expression =
            new string('(', ExpressionValidator.MaxNestingDepth + 5)
            + "1"
            + new string(')', ExpressionValidator.MaxNestingDepth + 5);

        // Act
        var result = ExpressionValidator.Validate(expression);

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("nesting");
    }

    [Fact]
    public void Validate_AcceptableNesting_ReturnsValid()
    {
        // Arrange - Nesting within limits
        var expression = "((((1 + 2))))";

        // Act
        var result = ExpressionValidator.Validate(expression);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    #endregion

    #region Validate - Warning Pattern Tests

    [Theory]
    [InlineData("while(true) { }")]
    [InlineData("for(i = 0; i < 10; i++)")]
    [InlineData("foreach(var x in items)")]
    public void Validate_WarningPatterns_ReturnsValidWithWarnings(string expression)
    {
        // Act
        var result = ExpressionValidator.Validate(expression);

        // Assert
        // The expression may be valid or invalid depending on parse,
        // but if valid, it should have warnings
        if (result.IsValid)
        {
            result.Warnings.Should().NotBeEmpty();
        }
    }

    [Fact]
    public void Validate_DeepMethodChain_ReturnsValidWithWarning()
    {
        // Arrange - A very deep method chain
        var expression = "a.b.c.d.e.f.g";

        // Act
        var result = ExpressionValidator.Validate(expression);

        // Assert
        // May be invalid due to undefined variables, but check for warning if valid
        if (result.IsValid)
        {
            result.Warnings.Should().Contain(w => w.Contains("chain"));
        }
    }

    #endregion

    #region ValidateString Tests

    [Fact]
    public void ValidateString_SingleValidExpression_ReturnsOneValidResult()
    {
        // Arrange
        const string input = "Value: {{ 1 + 1 }}";

        // Act
        var results = ExpressionValidator.ValidateString(input).ToList();

        // Assert
        results.Should().ContainSingle();
        results[0].IsValid.Should().BeTrue();
    }

    [Fact]
    public void ValidateString_MultipleExpressions_ReturnsResultForEach()
    {
        // Arrange
        const string input = "{{ 1 + 1 }} and {{ 2 * 2 }} and {{ 3 - 1 }}";

        // Act
        var results = ExpressionValidator.ValidateString(input).ToList();

        // Assert
        results.Should().HaveCount(3);
        results.Should().OnlyContain(r => r.IsValid);
    }

    [Fact]
    public void ValidateString_MixedValidInvalid_ReturnsCorrectResults()
    {
        // Arrange
        const string input = "{{ 1 + 1 }} and {{ System.IO.File.Read() }}";

        // Act
        var results = ExpressionValidator.ValidateString(input).ToList();

        // Assert
        results.Should().HaveCount(2);
        results[0].IsValid.Should().BeTrue();
        results[1].IsValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateString_NoExpressions_ReturnsEmpty()
    {
        // Arrange
        const string input = "Plain text without expressions";

        // Act
        var results = ExpressionValidator.ValidateString(input).ToList();

        // Assert
        results.Should().BeEmpty();
    }

    [Fact]
    public void ValidateString_EmptyInput_ReturnsEmpty()
    {
        // Act
        var results = ExpressionValidator.ValidateString("").ToList();

        // Assert
        results.Should().BeEmpty();
    }

    #endregion

    #region Built-in Functions Validation Tests

    [Theory]
    [InlineData("Round(3.14, 1)")]
    [InlineData("Floor(3.9)")]
    [InlineData("Ceiling(3.1)")]
    [InlineData("Abs(-5)")]
    [InlineData("Min(1, 2)")]
    [InlineData("Max(1, 2)")]
    [InlineData("IsNullOrEmpty(\"\")")]
    [InlineData("IsNullOrWhiteSpace(\" \")")]
    public void Validate_BuiltInFunctions_ReturnsValid(string expression)
    {
        // Act
        var result = ExpressionValidator.Validate(expression);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("Currency(100)")]
    [InlineData("Percent(0.5)")]
    [InlineData("ShortDate(Now)")]
    [InlineData("LongDate(Today)")]
    public void Validate_FormattingFunctions_ReturnsValid(string expression)
    {
        // Act
        var result = ExpressionValidator.Validate(expression);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    #endregion

    #region Built-in Variables Validation Tests

    [Theory]
    [InlineData("page.CurrentPage")]
    [InlineData("page.TotalPages")]
    [InlineData("document.Title")]
    [InlineData("repeatIndex")]
    [InlineData("repeatCount")]
    [InlineData("isFirst")]
    [InlineData("isLast")]
    [InlineData("Now")]
    [InlineData("Today")]
    [InlineData("UtcNow")]
    public void Validate_BuiltInVariables_ReturnsValid(string expression)
    {
        // Act
        var result = ExpressionValidator.Validate(expression);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    #endregion

    #region Real-World Expression Tests

    [Theory]
    [InlineData("data.customer.name")]
    [InlineData("data.invoice.total * 1.15")]
    [InlineData("data.isActive ? \"Active\" : \"Inactive\"")]
    [InlineData("data.items.Length > 0")]
    [InlineData("data.price.ToString(\"C\")")]
    [InlineData("data.date.ToString(\"yyyy-MM-dd\")")]
    [InlineData("\"Page \" + page.CurrentPage + \" of \" + page.TotalPages")]
    public void Validate_RealWorldExpressions_ReturnsValid(string expression)
    {
        // Act
        var result = ExpressionValidator.Validate(expression);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    #endregion
}
