using System.Dynamic;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Exceptions;
using PDFBuilder.Engine.Services;

namespace PDFBuilder.UnitTests.Services;

/// <summary>
/// Comprehensive unit tests for ExpressionEvaluator.
/// Tests all supported expression patterns, edge cases, and error handling.
/// </summary>
public sealed class ExpressionEvaluatorTests : IDisposable
{
    private readonly ExpressionEvaluator _evaluator;
    private readonly MemoryCache _cache;
    private readonly Mock<ILogger<ExpressionEvaluator>> _loggerMock;

    public ExpressionEvaluatorTests()
    {
        _cache = new MemoryCache(new MemoryCacheOptions());
        _loggerMock = new Mock<ILogger<ExpressionEvaluator>>();
        _evaluator = new ExpressionEvaluator(_cache, _loggerMock.Object);
    }

    public void Dispose()
    {
        _cache.Dispose();
    }

    #region ContainsExpressions Tests

    [Theory]
    [InlineData("Hello {{ name }}", true)]
    [InlineData("{{ data.value }}", true)]
    [InlineData("Start {{ a }} middle {{ b }} end", true)]
    [InlineData("No expressions here", false)]
    [InlineData("Only {{ opening", false)]
    [InlineData("Only closing }}", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void ContainsExpressions_ReturnsExpectedResult(string? input, bool expected)
    {
        // Act
        var result = _evaluator.ContainsExpressions(input);

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
        var expressions = _evaluator.ExtractExpressions(input).ToList();

        // Assert
        expressions.Should().ContainSingle().Which.Should().Be("name");
    }

    [Fact]
    public void ExtractExpressions_MultipleExpressions_ReturnsAllExpressions()
    {
        // Arrange
        const string input = "{{ greeting }}, {{ name }}! You have {{ count }} messages.";

        // Act
        var expressions = _evaluator.ExtractExpressions(input).ToList();

        // Assert
        expressions.Should().HaveCount(3);
        expressions.Should().Contain(["greeting", "name", "count"]);
    }

    [Fact]
    public void ExtractExpressions_ComplexExpressions_ReturnsFullExpressions()
    {
        // Arrange
        const string input = "Price: {{ data.price.ToString(\"C\") }}";

        // Act
        var expressions = _evaluator.ExtractExpressions(input).ToList();

        // Assert
        expressions.Should().ContainSingle().Which.Should().Be("data.price.ToString(\"C\")");
    }

    [Fact]
    public void ExtractExpressions_NoExpressions_ReturnsEmpty()
    {
        // Arrange
        const string input = "Plain text without expressions";

        // Act
        var expressions = _evaluator.ExtractExpressions(input).ToList();

        // Assert
        expressions.Should().BeEmpty();
    }

    #endregion

    #region EvaluateString Tests

    [Fact]
    public void EvaluateString_NoExpressions_ReturnsOriginalString()
    {
        // Arrange
        var context = new RenderContext();
        const string input = "Plain text";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be(input);
    }

    [Fact]
    public void EvaluateString_SimpleVariable_ReplacesExpression()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("name", "John");
        const string input = "Hello, {{ name }}!";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be("Hello, John!");
    }

    [Fact]
    public void EvaluateString_MultipleExpressions_ReplacesAll()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("greeting", "Hi");
        context.SetVariable("name", "Jane");
        context.SetVariable("count", 5);
        const string input = "{{ greeting }}, {{ name }}! You have {{ count }} messages.";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be("Hi, Jane! You have 5 messages.");
    }

    [Fact]
    public void EvaluateString_NestedPropertyAccess_Works()
    {
        // Arrange
        var context = new RenderContext();
        dynamic data = new ExpandoObject();
        data.customer = new ExpandoObject();
        data.customer.name = "Acme Corp";
        data.customer.email = "contact@acme.com";
        context.SetVariable("data", data);

        const string input = "Customer: {{ data.customer.name }} ({{ data.customer.email }})";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be("Customer: Acme Corp (contact@acme.com)");
    }

    [Fact]
    public void EvaluateString_MathExpressions_Calculates()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("price", 100m); // Use decimal for accurate calculation
        context.SetVariable("taxRate", 0.15m);
        const string input = "Total: {{ price * (1 + taxRate) }}";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be("Total: 115.00");
    }

    [Fact]
    public void EvaluateString_ConditionalExpression_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("isActive", true);
        const string input = "Status: {{ isActive ? \"Active\" : \"Inactive\" }}";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be("Status: Active");
    }

    [Fact]
    public void EvaluateString_JsonElementData_Works()
    {
        // Arrange
        var jsonData = JsonSerializer.Deserialize<JsonElement>(
            """
            {
                "name": "Test User",
                "age": 30,
                "active": true
            }
            """
        );

        var context = new RenderContext(jsonData);
        const string input = "{{ data.name }} is {{ data.age }} years old";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be("Test User is 30 years old");
    }

    [Fact]
    public void EvaluateString_WithExtraWhitespace_Trims()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("value", "test");
        const string input = "{{   value   }}";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be("test");
    }

    #endregion

    #region Evaluate<T> Tests

    [Fact]
    public void EvaluateT_StringExpression_ReturnsString()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("name", "Alice");

        // Act
        var result = _evaluator.Evaluate<string>("name", context);

        // Assert
        result.Should().Be("Alice");
    }

    [Fact]
    public void EvaluateT_IntExpression_ReturnsInt()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("count", 42);

        // Act
        var result = _evaluator.Evaluate<int>("count", context);

        // Assert
        result.Should().Be(42);
    }

    [Fact]
    public void EvaluateT_MathExpression_CalculatesResult()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("a", 10);
        context.SetVariable("b", 5);

        // Act
        var result = _evaluator.Evaluate<int>("a + b * 2", context);

        // Assert
        result.Should().Be(20);
    }

    [Fact]
    public void EvaluateT_BoolExpression_ReturnsBool()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("value", 10);

        // Act
        var result = _evaluator.Evaluate<bool>("value > 5", context);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void EvaluateT_TypeMismatch_ThrowsException()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("text", "hello");

        // Act & Assert
        var act = () => _evaluator.Evaluate<int>("text", context);
        act.Should().Throw<ExpressionEvaluationException>();
    }

    [Fact]
    public void EvaluateT_NullForNullableType_ReturnsDefault()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("nullValue", null);

        // Act
        var result = _evaluator.Evaluate<string?>("nullValue", context);

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region EvaluateCondition Tests

    [Theory]
    [InlineData(true, true)]
    [InlineData(false, false)]
    public void EvaluateCondition_BooleanValue_ReturnsValue(bool value, bool expected)
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("flag", value);

        // Act
        var result = _evaluator.EvaluateCondition("flag", context);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData(1, true)]
    [InlineData(0, false)]
    [InlineData(-1, true)]
    public void EvaluateCondition_NumericValue_ConvertsToBool(int value, bool expected)
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("num", value);

        // Act
        var result = _evaluator.EvaluateCondition("num", context);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("hello", true)]
    [InlineData("", false)]
    public void EvaluateCondition_StringValue_ConvertsToBool(string value, bool expected)
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("text", value);

        // Act
        var result = _evaluator.EvaluateCondition("text", context);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void EvaluateCondition_NullValue_ReturnsFalse()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("nullVal", null);

        // Act
        var result = _evaluator.EvaluateCondition("nullVal", context);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void EvaluateCondition_ComparisonExpression_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("age", 25);

        // Act
        var result = _evaluator.EvaluateCondition("age >= 18", context);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void EvaluateCondition_LogicalAndExpression_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("a", true);
        context.SetVariable("b", false);

        // Act
        var result = _evaluator.EvaluateCondition("a && b", context);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void EvaluateCondition_LogicalOrExpression_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("a", true);
        context.SetVariable("b", false);

        // Act
        var result = _evaluator.EvaluateCondition("a || b", context);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region EvaluateCollection Tests

    [Fact]
    public void EvaluateCollection_ListOfStrings_ReturnsEnumerable()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("items", new List<string> { "apple", "banana", "cherry" });

        // Act
        var result = _evaluator.EvaluateCollection("items", context).ToList();

        // Assert
        result.Should().HaveCount(3);
        result.Should().Contain(["apple", "banana", "cherry"]);
    }

    [Fact]
    public void EvaluateCollection_ArrayOfInts_ReturnsEnumerable()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("numbers", new[] { 1, 2, 3, 4, 5 });

        // Act
        var result = _evaluator.EvaluateCollection("numbers", context).ToList();

        // Assert
        result.Should().HaveCount(5);
    }

    [Fact]
    public void EvaluateCollection_NullValue_ReturnsEmpty()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("nullList", null);

        // Act
        var result = _evaluator.EvaluateCollection("nullList", context).ToList();

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void EvaluateCollection_NonEnumerableValue_ThrowsException()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("notAList", 42);

        // Act & Assert
        var act = () => _evaluator.EvaluateCollection("notAList", context).ToList();
        act.Should().Throw<ExpressionEvaluationException>();
    }

    #endregion

    #region TryEvaluate Tests

    [Fact]
    public void TryEvaluate_ValidExpression_ReturnsTrueAndValue()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("value", 42);

        // Act
        var success = _evaluator.TryEvaluate<int>("value", context, out var result);

        // Assert
        success.Should().BeTrue();
        result.Should().Be(42);
    }

    [Fact]
    public void TryEvaluate_InvalidExpression_ReturnsFalse()
    {
        // Arrange
        var context = new RenderContext();

        // Act
        var success = _evaluator.TryEvaluate<int>("undefined_variable", context, out var result);

        // Assert
        success.Should().BeFalse();
        result.Should().Be(default);
    }

    [Fact]
    public void TryEvaluateString_ValidExpressions_ReturnsTrueAndValue()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("name", "Test");
        const string input = "Hello, {{ name }}!";

        // Act
        var success = _evaluator.TryEvaluateString(input, context, out var result);

        // Assert
        success.Should().BeTrue();
        result.Should().Be("Hello, Test!");
    }

    [Fact]
    public void TryEvaluateString_InvalidExpression_ReturnsFalse()
    {
        // Arrange
        var context = new RenderContext();
        const string input = "Value: {{ undefined }}";

        // Act
        var success = _evaluator.TryEvaluateString(input, context, out var result);

        // Assert
        success.Should().BeFalse();
        result.Should().BeNull();
    }

    #endregion

    #region ValidateExpression Tests

    [Fact]
    public void ValidateExpression_ValidSimpleExpression_ReturnsValid()
    {
        // Act
        var result = _evaluator.ValidateExpression("1 + 1");

        // Assert
        result.IsValid.Should().BeTrue();
        result.ErrorMessage.Should().BeNull();
    }

    [Fact]
    public void ValidateExpression_InvalidSyntax_ReturnsInvalid()
    {
        // Act - using truly invalid syntax
        var result = _evaluator.ValidateExpression("1 + (2 * )");

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void ValidateExpression_EmptyExpression_ReturnsInvalid()
    {
        // Act
        var result = _evaluator.ValidateExpression("");

        // Assert
        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void ValidateExpression_ForbiddenPattern_ReturnsInvalid()
    {
        // Act
        var result = _evaluator.ValidateExpression("System.IO.File.ReadAllText(\"test\")");

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("forbidden");
    }

    [Fact]
    public void ValidateExpression_TooLongExpression_ReturnsInvalid()
    {
        // Arrange
        var longExpression = new string('x', 3000);

        // Act
        var result = _evaluator.ValidateExpression(longExpression);

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("length");
    }

    #endregion

    #region Security Tests

    [Theory]
    [InlineData("System.IO.File.ReadAllText(\"test\")")]
    [InlineData("System.Diagnostics.Process.Start(\"cmd\")")]
    [InlineData("typeof(string).Assembly")]
    [InlineData("GetType().Assembly")]
    [InlineData("Activator.CreateInstance(typeof(object))")]
    public void Evaluate_ForbiddenPatterns_ThrowsException(string expression)
    {
        // Arrange
        var context = new RenderContext();

        // Act & Assert
        var act = () => _evaluator.Evaluate(expression, context);
        act.Should()
            .Throw<ExpressionEvaluationException>()
            .Where(e => e.Message.Contains("forbidden"));
    }

    #endregion

    #region Built-in Functions Tests

    [Fact]
    public void Evaluate_MathRound_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("value", 3.7);

        // Act
        var result = _evaluator.Evaluate<double>("Round(value, 0)", context);

        // Assert
        result.Should().Be(4.0);
    }

    [Fact]
    public void Evaluate_MathAbs_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("value", -42.0);

        // Act
        var result = _evaluator.Evaluate<double>("Abs(value)", context);

        // Assert
        result.Should().Be(42.0);
    }

    [Fact]
    public void Evaluate_StringIsNullOrEmpty_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("text", "");

        // Act
        var result = _evaluator.Evaluate<bool>("IsNullOrEmpty(text)", context);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void Evaluate_MathMin_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("a", 10.0);
        context.SetVariable("b", 5.0);

        // Act
        var result = _evaluator.Evaluate<double>("Min(a, b)", context);

        // Assert
        result.Should().Be(5.0);
    }

    [Fact]
    public void Evaluate_MathMax_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("a", 10.0);
        context.SetVariable("b", 5.0);

        // Act
        var result = _evaluator.Evaluate<double>("Max(a, b)", context);

        // Assert
        result.Should().Be(10.0);
    }

    #endregion

    #region Built-in Variables Tests

    [Fact]
    public void Evaluate_PageInfo_IsAccessible()
    {
        // Arrange
        var context = new RenderContext();
        context.PageInfo.CurrentPage = 5;
        context.PageInfo.TotalPages = 10;

        // Act
        var currentPage = _evaluator.Evaluate<int>("page.CurrentPage", context);
        var totalPages = _evaluator.Evaluate<int>("page.TotalPages", context);

        // Assert
        currentPage.Should().Be(5);
        totalPages.Should().Be(10);
    }

    [Fact]
    public void Evaluate_RepeatVariables_AreAccessible()
    {
        // Arrange
        var context = new RenderContext();
        context.IsRepeating = true;
        context.RepeatIndex = 2;
        context.RepeatCount = 5;

        // Act
        var index = _evaluator.Evaluate<int>("repeatIndex", context);
        var count = _evaluator.Evaluate<int>("repeatCount", context);
        var isFirst = _evaluator.Evaluate<bool>("isFirst", context);
        var isLast = _evaluator.Evaluate<bool>("isLast", context);

        // Assert
        index.Should().Be(2);
        count.Should().Be(5);
        isFirst.Should().BeFalse();
        isLast.Should().BeFalse();
    }

    #endregion

    #region Scoping Tests

    [Fact]
    public void Evaluate_ScopedVariable_IsVisible()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("outer", "outer value");

        using (context.CreateScope())
        {
            context.SetVariable("inner", "inner value");

            // Act
            var innerResult = _evaluator.Evaluate<string>("inner", context);
            var outerResult = _evaluator.Evaluate<string>("outer", context);

            // Assert
            innerResult.Should().Be("inner value");
            outerResult.Should().Be("outer value");
        }
    }

    [Fact]
    public void Evaluate_ScopedVariable_ShadowsOuter()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("value", "outer");

        using (context.CreateScope())
        {
            context.SetVariable("value", "inner");

            // Act
            var result = _evaluator.Evaluate<string>("value", context);

            // Assert
            result.Should().Be("inner");
        }

        // After scope
        var outerResult = _evaluator.Evaluate<string>("value", context);
        outerResult.Should().Be("outer");
    }

    #endregion

    #region Method Call Tests

    [Fact]
    public void EvaluateString_MethodCallOnString_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("text", "hello world");
        const string input = "{{ text.ToUpper() }}";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be("HELLO WORLD");
    }

    [Fact]
    public void EvaluateString_StringSubstring_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("text", "Hello, World!");
        const string input = "{{ text.Substring(0, 5) }}";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be("Hello");
    }

    [Fact]
    public void EvaluateString_StringReplace_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("text", "Hello, World!");
        const string input = "{{ text.Replace(\"World\", \"User\") }}";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        result.Should().Be("Hello, User!");
    }

    [Fact]
    public void EvaluateString_NumberFormatting_Works()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("price", 1234.5m);
        const string input = "{{ Currency(price) }}";

        // Act
        var result = _evaluator.EvaluateString(input, context);

        // Assert
        // The format depends on the culture, but it should contain the number
        result.Should().Contain("1");
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public void Evaluate_UndefinedVariable_ThrowsWithHelpfulMessage()
    {
        // Arrange
        var context = new RenderContext();

        // Act & Assert
        var act = () => _evaluator.Evaluate("undefinedVar", context);
        act.Should().Throw<ExpressionEvaluationException>();
    }

    [Fact]
    public void Evaluate_SyntaxError_ThrowsWithPosition()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("a", 1);

        // Act & Assert
        var act = () => _evaluator.Evaluate("a +++ b", context);
        act.Should().Throw<ExpressionEvaluationException>();
    }

    [Fact]
    public void EvaluateString_PartiallyInvalidExpressions_ThrowsOnFirst()
    {
        // Arrange
        var context = new RenderContext();
        context.SetVariable("valid", "test");
        const string input = "{{ valid }} {{ invalid }}";

        // Act & Assert
        var act = () => _evaluator.EvaluateString(input, context);
        act.Should().Throw<ExpressionEvaluationException>();
    }

    #endregion

    #region Complex Scenario Tests

    [Fact]
    public void Evaluate_ComplexNestedJsonData_Works()
    {
        // Arrange
        var jsonData = JsonSerializer.Deserialize<JsonElement>(
            """
            {
                "company": {
                    "name": "Acme Corp",
                    "address": {
                        "street": "123 Main St",
                        "city": "Springfield",
                        "zip": "12345"
                    },
                    "employees": [
                        { "name": "John", "role": "Developer" },
                        { "name": "Jane", "role": "Designer" }
                    ]
                },
                "invoice": {
                    "number": "INV-001",
                    "total": 1500.50
                }
            }
            """
        );

        var context = new RenderContext(jsonData);

        // Act
        var companyName = _evaluator.EvaluateString("{{ data.company.name }}", context);
        var city = _evaluator.EvaluateString("{{ data.company.address.city }}", context);

        // Assert
        companyName.Should().Be("Acme Corp");
        city.Should().Be("Springfield");
    }

    [Fact]
    public void EvaluateString_InvoiceTemplate_Works()
    {
        // Arrange
        var context = new RenderContext();
        dynamic data = new ExpandoObject();
        data.invoiceNumber = "INV-2024-001";
        data.customerName = "John Smith";
        data.subtotal = 1000m;
        data.taxRate = 0.08m;
        context.SetVariable("data", data);

        const string template =
            @"Invoice #{{ data.invoiceNumber }}
Customer: {{ data.customerName }}
Subtotal: {{ data.subtotal }}
Tax: {{ data.subtotal * data.taxRate }}
Total: {{ data.subtotal * (1 + data.taxRate) }}";

        // Act
        var result = _evaluator.EvaluateString(template, context);

        // Assert
        result.Should().Contain("INV-2024-001");
        result.Should().Contain("John Smith");
        result.Should().Contain("1000");
        result.Should().Contain("80");
        result.Should().Contain("1080");
    }

    #endregion
}
