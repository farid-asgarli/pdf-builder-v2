namespace PDFBuilder.Core.Domain;

/// <summary>
/// Represents special page context variables that require dynamic handling by QuestPDF.
/// These variables cannot be pre-evaluated and must be rendered using QuestPDF's native methods.
/// </summary>
public enum PageContextVariable
{
    /// <summary>
    /// Not a page context variable.
    /// </summary>
    None = 0,

    /// <summary>
    /// Current page number (1-based).
    /// Must use QuestPDF's text.CurrentPageNumber() method.
    /// Expression: {{ currentPage }} or {{ page.CurrentPage }}
    /// </summary>
    CurrentPage = 1,

    /// <summary>
    /// Total number of pages in the document.
    /// Must use QuestPDF's text.TotalPages() method.
    /// Expression: {{ totalPages }} or {{ page.TotalPages }}
    /// </summary>
    TotalPages = 2,

    /// <summary>
    /// First page number of a named section.
    /// Must use QuestPDF's text.BeginPageNumberOfSection(sectionName) method.
    /// Expression: {{ section.beginPage }} or {{ beginPageOfSection("sectionName") }}
    /// </summary>
    SectionBeginPage = 3,

    /// <summary>
    /// Last page number of a named section.
    /// Must use QuestPDF's text.EndPageNumberOfSection(sectionName) method.
    /// Expression: {{ section.endPage }} or {{ endPageOfSection("sectionName") }}
    /// </summary>
    SectionEndPage = 4,

    /// <summary>
    /// Page number relative to section beginning (1-based within section).
    /// Must use QuestPDF's text.PageNumberWithinSection(sectionName) method.
    /// Expression: {{ section.pageNumber }} or {{ pageWithinSection("sectionName") }}
    /// </summary>
    PageWithinSection = 5,

    /// <summary>
    /// Total pages within a named section.
    /// Must use QuestPDF's text.TotalPagesWithinSection(sectionName) method.
    /// Expression: {{ section.totalPages }} or {{ totalPagesWithinSection("sectionName") }}
    /// </summary>
    TotalPagesWithinSection = 6,
}

/// <summary>
/// Represents a parsed page context expression with its variable type and optional parameters.
/// </summary>
public sealed class PageContextExpression
{
    /// <summary>
    /// Gets the type of page context variable.
    /// </summary>
    public PageContextVariable Variable { get; init; } = PageContextVariable.None;

    /// <summary>
    /// Gets the section name for section-related variables.
    /// Null for document-level variables like CurrentPage and TotalPages.
    /// </summary>
    public string? SectionName { get; init; }

    /// <summary>
    /// Gets whether this is a valid page context expression.
    /// </summary>
    public bool IsPageContextVariable => Variable != PageContextVariable.None;

    /// <summary>
    /// Gets whether this expression requires a section name parameter.
    /// </summary>
    public bool RequiresSectionName =>
        Variable
            is PageContextVariable.SectionBeginPage
                or PageContextVariable.SectionEndPage
                or PageContextVariable.PageWithinSection
                or PageContextVariable.TotalPagesWithinSection;

    /// <summary>
    /// Creates a non-page-context result.
    /// </summary>
    public static PageContextExpression NotPageContext =>
        new() { Variable = PageContextVariable.None };

    /// <summary>
    /// Creates a current page expression.
    /// </summary>
    public static PageContextExpression CurrentPage =>
        new() { Variable = PageContextVariable.CurrentPage };

    /// <summary>
    /// Creates a total pages expression.
    /// </summary>
    public static PageContextExpression TotalPages =>
        new() { Variable = PageContextVariable.TotalPages };

    /// <summary>
    /// Creates a section begin page expression.
    /// </summary>
    /// <param name="sectionName">The section name.</param>
    public static PageContextExpression SectionBeginPage(string sectionName) =>
        new() { Variable = PageContextVariable.SectionBeginPage, SectionName = sectionName };

    /// <summary>
    /// Creates a section end page expression.
    /// </summary>
    /// <param name="sectionName">The section name.</param>
    public static PageContextExpression SectionEndPage(string sectionName) =>
        new() { Variable = PageContextVariable.SectionEndPage, SectionName = sectionName };

    /// <summary>
    /// Creates a page within section expression.
    /// </summary>
    /// <param name="sectionName">The section name.</param>
    public static PageContextExpression PageWithinSection(string sectionName) =>
        new() { Variable = PageContextVariable.PageWithinSection, SectionName = sectionName };

    /// <summary>
    /// Creates a total pages within section expression.
    /// </summary>
    /// <param name="sectionName">The section name.</param>
    public static PageContextExpression TotalPagesWithinSection(string sectionName) =>
        new() { Variable = PageContextVariable.TotalPagesWithinSection, SectionName = sectionName };
}

/// <summary>
/// Helper class for parsing and detecting page context expressions.
/// </summary>
public static class PageContextParser
{
    /// <summary>
    /// Section-related page context expression prefixes.
    /// </summary>
    private static readonly Dictionary<string, PageContextVariable> SectionExpressionPrefixes = new(
        StringComparer.OrdinalIgnoreCase
    )
    {
        { "beginPageOfSection", PageContextVariable.SectionBeginPage },
        { "endPageOfSection", PageContextVariable.SectionEndPage },
        { "pageWithinSection", PageContextVariable.PageWithinSection },
        { "totalPagesWithinSection", PageContextVariable.TotalPagesWithinSection },
    };

    /// <summary>
    /// Parses an expression to determine if it's a page context variable.
    /// </summary>
    /// <param name="expression">The expression string (without {{ }} markers).</param>
    /// <returns>A PageContextExpression describing the parsed result.</returns>
    public static PageContextExpression Parse(string? expression)
    {
        if (string.IsNullOrWhiteSpace(expression))
        {
            return PageContextExpression.NotPageContext;
        }

        var trimmed = expression.Trim();

        // Check for simple page context expressions
        if (
            trimmed.Equals("currentPage", StringComparison.OrdinalIgnoreCase)
            || trimmed.Equals("page.CurrentPage", StringComparison.OrdinalIgnoreCase)
        )
        {
            return PageContextExpression.CurrentPage;
        }

        if (
            trimmed.Equals("totalPages", StringComparison.OrdinalIgnoreCase)
            || trimmed.Equals("page.TotalPages", StringComparison.OrdinalIgnoreCase)
        )
        {
            return PageContextExpression.TotalPages;
        }

        // Check for section-related expressions using the current section
        if (trimmed.Equals("section.beginPage", StringComparison.OrdinalIgnoreCase))
        {
            return PageContextExpression.SectionBeginPage(string.Empty); // Empty means use current section
        }

        if (trimmed.Equals("section.endPage", StringComparison.OrdinalIgnoreCase))
        {
            return PageContextExpression.SectionEndPage(string.Empty);
        }

        if (trimmed.Equals("section.pageNumber", StringComparison.OrdinalIgnoreCase))
        {
            return PageContextExpression.PageWithinSection(string.Empty);
        }

        if (trimmed.Equals("section.totalPages", StringComparison.OrdinalIgnoreCase))
        {
            return PageContextExpression.TotalPagesWithinSection(string.Empty);
        }

        // Check for function-style section expressions like beginPageOfSection("sectionName")
        foreach (var (prefix, variable) in SectionExpressionPrefixes)
        {
            if (
                trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                && TryExtractFunctionArgument(trimmed, prefix, out var sectionName)
            )
            {
                return variable switch
                {
                    PageContextVariable.SectionBeginPage => PageContextExpression.SectionBeginPage(
                        sectionName
                    ),
                    PageContextVariable.SectionEndPage => PageContextExpression.SectionEndPage(
                        sectionName
                    ),
                    PageContextVariable.PageWithinSection =>
                        PageContextExpression.PageWithinSection(sectionName),
                    PageContextVariable.TotalPagesWithinSection =>
                        PageContextExpression.TotalPagesWithinSection(sectionName),
                    _ => PageContextExpression.NotPageContext,
                };
            }
        }

        return PageContextExpression.NotPageContext;
    }

    /// <summary>
    /// Checks if an expression is a page context variable that requires QuestPDF native handling.
    /// </summary>
    /// <param name="expression">The expression string (without {{ }} markers).</param>
    /// <returns>True if this is a page context variable; otherwise, false.</returns>
    public static bool IsPageContextVariable(string? expression)
    {
        return Parse(expression).IsPageContextVariable;
    }

    /// <summary>
    /// Checks if a string contains any page context expressions.
    /// </summary>
    /// <param name="input">The input string that may contain {{ expression }} patterns.</param>
    /// <returns>True if the string contains page context expressions; otherwise, false.</returns>
    public static bool ContainsPageContextExpressions(string? input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return false;
        }

        // Quick check for common patterns
        return input.Contains("currentPage", StringComparison.OrdinalIgnoreCase)
            || input.Contains("totalPages", StringComparison.OrdinalIgnoreCase)
            || input.Contains("section.beginPage", StringComparison.OrdinalIgnoreCase)
            || input.Contains("section.endPage", StringComparison.OrdinalIgnoreCase)
            || input.Contains("section.pageNumber", StringComparison.OrdinalIgnoreCase)
            || input.Contains("section.totalPages", StringComparison.OrdinalIgnoreCase)
            || input.Contains("beginPageOfSection", StringComparison.OrdinalIgnoreCase)
            || input.Contains("endPageOfSection", StringComparison.OrdinalIgnoreCase)
            || input.Contains("pageWithinSection", StringComparison.OrdinalIgnoreCase)
            || input.Contains("totalPagesWithinSection", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Attempts to extract a function argument from a function-style expression.
    /// For example: beginPageOfSection("sectionName") -> "sectionName"
    /// </summary>
    private static bool TryExtractFunctionArgument(
        string expression,
        string functionName,
        out string argument
    )
    {
        argument = string.Empty;

        var afterFunction = expression.AsSpan(functionName.Length).Trim();

        // Must start with ( and end with )
        if (afterFunction.Length < 2 || afterFunction[0] != '(' || afterFunction[^1] != ')')
        {
            return false;
        }

        // Extract the content between parentheses
        var content = afterFunction[1..^1].Trim();

        // Handle quoted strings
        if (content.Length >= 2)
        {
            if (
                (content[0] == '"' && content[^1] == '"')
                || (content[0] == '\'' && content[^1] == '\'')
            )
            {
                argument = content[1..^1].ToString();
                return true;
            }
        }

        // Handle unquoted identifiers
        argument = content.ToString();
        return !string.IsNullOrEmpty(argument);
    }
}
