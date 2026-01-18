using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using FluentValidation;
using PDFBuilder.Contracts.DTOs;
using PDFBuilder.Contracts.Requests;
using PDFBuilder.Contracts.Responses;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Validation.Interfaces;
using PDFBuilder.Validation.Validators;

namespace PDFBuilder.Validation.Services;

/// <summary>
/// Service that orchestrates comprehensive layout validation.
/// Combines FluentValidation with custom business rules.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="LayoutValidationService"/> class.
/// </remarks>
/// <param name="layoutNodeValidator">The layout node validator.</param>
/// <param name="requestValidator">The request validator.</param>
/// <param name="logger">The logger instance.</param>
public sealed class LayoutValidationService(
    IValidator<LayoutNodeDto> layoutNodeValidator,
    IValidator<GeneratePdfRequest> requestValidator,
    ILogger<LayoutValidationService> logger
) : ILayoutValidationService
{
    private readonly IValidator<LayoutNodeDto> _layoutNodeValidator =
        layoutNodeValidator ?? throw new ArgumentNullException(nameof(layoutNodeValidator));
    private readonly IValidator<GeneratePdfRequest> _requestValidator =
        requestValidator ?? throw new ArgumentNullException(nameof(requestValidator));
    private readonly ILogger<LayoutValidationService> _logger =
        logger ?? throw new ArgumentNullException(nameof(logger));

    /// <summary>
    /// Expression pattern regex for {{ expression }} syntax.
    /// Handles nested braces and whitespace properly.
    /// </summary>
    private static readonly Regex ExpressionPattern = new(
        @"\{\{\s*(.+?)\s*\}\}",
        RegexOptions.Compiled | RegexOptions.Singleline
    );

    /// <summary>
    /// Component metadata for documentation and validation.
    /// </summary>
    private static readonly Dictionary<string, ComponentMetadata> ComponentMetadataMap =
        BuildComponentMetadata();

    /// <inheritdoc />
    public async Task<ValidationResponse> ValidateAsync(
        ValidateLayoutRequest request,
        CancellationToken cancellationToken = default
    )
    {
        return await Task.Run(() => Validate(request), cancellationToken);
    }

    /// <inheritdoc />
    public ValidationResponse Validate(ValidateLayoutRequest request)
    {
        var stopwatch = Stopwatch.StartNew();
        var errors = new List<ValidationErrorDto>();
        var warnings = new List<ValidationWarningDto>();

        _logger.LogDebug("Starting layout validation");

        // Step 1: Validate the layout node structure using FluentValidation
        var layoutResult = _layoutNodeValidator.Validate(request.Layout);

        if (!layoutResult.IsValid)
        {
            foreach (var failure in layoutResult.Errors)
            {
                errors.Add(
                    new ValidationErrorDto
                    {
                        Code = MapErrorCode(failure.ErrorCode),
                        Message = failure.ErrorMessage,
                        Path = BuildJsonPath(failure.PropertyName),
                        NodeId = ExtractNodeId(failure.PropertyName, request.Layout),
                        Severity = MapSeverity(failure.Severity),
                        ActualValue = failure.AttemptedValue,
                        Suggestions = GetSuggestions(failure),
                    }
                );
            }
        }

        // Step 2: Validate expressions if sample data is provided and option is enabled
        var options = request.Options ?? new ValidationOptionsDto();

        if (options.ValidateExpressions && request.SampleData.HasValue)
        {
            var expressionErrors = ValidateExpressions(
                request.Layout,
                request.SampleData.Value,
                "$"
            );
            errors.AddRange(expressionErrors);
        }

        // Step 2.5: Validate expression syntax (without sample data)
        if (options.ValidateExpressions)
        {
            var syntaxErrors = ValidateExpressionSyntax(request.Layout, "$");
            errors.AddRange(syntaxErrors);
        }

        // Step 3: Validate component-specific properties
        var propertyErrors = ValidateComponentProperties(request.Layout, "$");
        errors.AddRange(propertyErrors);

        // Step 4: Check for deprecations if enabled
        if (options.CheckDeprecations)
        {
            var deprecationWarnings = CheckDeprecations(request.Layout, "$");
            warnings.AddRange(deprecationWarnings);
        }

        // Step 5: Check for performance issues if enabled
        if (options.IncludePerformanceWarnings)
        {
            var performanceWarnings = CheckPerformanceIssues(request.Layout, "$");
            warnings.AddRange(performanceWarnings);
        }

        // Step 6: Validate unique IDs
        var idErrors = ValidateUniqueIds(request.Layout);
        errors.AddRange(idErrors);

        // Step 7: Check for circular references (within the static tree structure)
        var circularRefErrors = CheckCircularReferences(request.Layout, "$");
        errors.AddRange(circularRefErrors);

        // Step 8: Validate image URLs if enabled
        if (options.ValidateImageUrls)
        {
            var imageWarnings = ValidateImageUrls(request.Layout, "$");
            warnings.AddRange(imageWarnings);
        }

        // Step 9: Validate fonts if enabled
        if (options.ValidateFonts)
        {
            var fontWarnings = ValidateFonts(request.Layout, "$");
            warnings.AddRange(fontWarnings);
        }

        // Step 10: Calculate layout statistics
        var statistics = CalculateStatistics(request.Layout);

        // Step 11: Apply strict mode if enabled
        if (options.StrictMode)
        {
            // In strict mode, warnings become errors
            foreach (var warning in warnings)
            {
                errors.Add(
                    new ValidationErrorDto
                    {
                        Code = warning.Code,
                        Message = $"[Strict Mode] {warning.Message}",
                        Path = warning.Path,
                        NodeId = warning.NodeId,
                        Severity = Contracts.Responses.ValidationSeverity.Error,
                        Suggestions = warning.Suggestions,
                    }
                );
            }
            warnings.Clear();
        }

        stopwatch.Stop();

        var response = new ValidationResponse
        {
            IsValid = errors.Count == 0,
            Errors = errors,
            Warnings = warnings,
            Statistics = statistics,
            ValidationTimeMs = stopwatch.ElapsedMilliseconds,
        };

        _logger.LogDebug(
            "Layout validation completed in {ElapsedMs}ms. IsValid: {IsValid}, Errors: {ErrorCount}, Warnings: {WarningCount}",
            stopwatch.ElapsedMilliseconds,
            response.IsValid,
            errors.Count,
            warnings.Count
        );

        return response;
    }

    /// <summary>
    /// Validates a full PDF generation request.
    /// </summary>
    /// <param name="request">The PDF generation request.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    /// <returns>A validation response with errors and warnings.</returns>
    public async Task<ValidationResponse> ValidateGeneratePdfRequestAsync(
        GeneratePdfRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var stopwatch = Stopwatch.StartNew();
        var errors = new List<ValidationErrorDto>();
        var warnings = new List<ValidationWarningDto>();

        _logger.LogDebug("Starting PDF generation request validation");

        // Validate the request using FluentValidation
        var requestResult = await _requestValidator.ValidateAsync(request, cancellationToken);

        if (!requestResult.IsValid)
        {
            foreach (var failure in requestResult.Errors)
            {
                errors.Add(
                    new ValidationErrorDto
                    {
                        Code = MapErrorCode(failure.ErrorCode),
                        Message = failure.ErrorMessage,
                        Path = BuildJsonPath(failure.PropertyName),
                        Severity = MapSeverity(failure.Severity),
                        ActualValue = failure.AttemptedValue,
                        Suggestions = GetSuggestions(failure),
                    }
                );
            }
        }

        // If template layout has content, perform layout-specific validation
        if (request.TemplateLayout.Content != null)
        {
            var layoutRequest = new ValidateLayoutRequest
            {
                Layout = request.TemplateLayout.Content,
                SampleData = request.Data,
                PageSettings = request.TemplateLayout.PageSettings,
            };

            var layoutValidation = Validate(layoutRequest);
            errors.AddRange(layoutValidation.Errors);
            warnings.AddRange(layoutValidation.Warnings);
        }

        stopwatch.Stop();

        var response = new ValidationResponse
        {
            IsValid = errors.Count == 0,
            Errors = errors,
            Warnings = warnings,
            ValidationTimeMs = stopwatch.ElapsedMilliseconds,
        };

        _logger.LogDebug(
            "PDF generation request validation completed in {ElapsedMs}ms. IsValid: {IsValid}, Errors: {ErrorCount}",
            stopwatch.ElapsedMilliseconds,
            response.IsValid,
            errors.Count
        );

        return response;
    }

    /// <inheritdoc />
    public ComponentDocumentation GetComponentDocumentation()
    {
        var components = ComponentMetadataMap
            .Values.Select(m => new Core.Interfaces.ComponentDefinition
            {
                Type = m.Type,
                Category = m.Category,
                Description = m.Description,
                AcceptsChildren = m.AcceptsChildren,
                AcceptsSingleChild = m.AcceptsSingleChild,
                RequiredProperties = m
                    .RequiredProperties.Select(p => new Core.Interfaces.PropertyDefinition
                    {
                        Name = p.Name,
                        Type = p.Type,
                        Description = p.Description,
                        DefaultValue = p.DefaultValue,
                        SupportsExpressions = p.SupportsExpressions,
                    })
                    .ToList(),
                OptionalProperties = m
                    .OptionalProperties.Select(p => new Core.Interfaces.PropertyDefinition
                    {
                        Name = p.Name,
                        Type = p.Type,
                        Description = p.Description,
                        DefaultValue = p.DefaultValue,
                        SupportsExpressions = p.SupportsExpressions,
                    })
                    .ToList(),
            })
            .OrderBy(c => c.Category)
            .ThenBy(c => c.Type)
            .ToList();

        return new ComponentDocumentation { Components = components, SchemaVersion = "1.0" };
    }

    /// <inheritdoc />
    public bool IsValidComponentType(string componentType)
    {
        return LayoutNodeValidator.GetValidComponentTypes().Contains(componentType);
    }

    #region Private Validation Methods

    /// <summary>
    /// Validates expression syntax without requiring sample data.
    /// </summary>
    private List<ValidationErrorDto> ValidateExpressionSyntax(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationErrorDto>();

        // Validate Visible expression syntax
        if (!string.IsNullOrEmpty(node.Visible) && ContainsExpression(node.Visible))
        {
            var syntaxErrors = ValidateExpressionSyntaxForProperty(
                node.Visible,
                $"{path}.visible",
                node.Id
            );
            errors.AddRange(syntaxErrors);
        }

        // Validate RepeatFor expression syntax
        if (!string.IsNullOrEmpty(node.RepeatFor) && ContainsExpression(node.RepeatFor))
        {
            var syntaxErrors = ValidateExpressionSyntaxForProperty(
                node.RepeatFor,
                $"{path}.repeatFor",
                node.Id
            );
            errors.AddRange(syntaxErrors);
        }

        // Validate expressions in properties
        if (node.Properties != null)
        {
            foreach (var (key, value) in node.Properties)
            {
                if (value.ValueKind == JsonValueKind.String)
                {
                    var stringValue = value.GetString();
                    if (stringValue != null && ContainsExpression(stringValue))
                    {
                        var syntaxErrors = ValidateExpressionSyntaxForProperty(
                            stringValue,
                            $"{path}.properties.{key}",
                            node.Id
                        );
                        errors.AddRange(syntaxErrors);
                    }
                }
            }
        }

        // Recursively validate children
        if (node.Children != null)
        {
            for (int i = 0; i < node.Children.Count; i++)
            {
                errors.AddRange(
                    ValidateExpressionSyntax(node.Children[i], $"{path}.children[{i}]")
                );
            }
        }

        if (node.Child != null)
        {
            errors.AddRange(ValidateExpressionSyntax(node.Child, $"{path}.child"));
        }

        return errors;
    }

    private static List<ValidationErrorDto> ValidateExpressionSyntaxForProperty(
        string expressionText,
        string path,
        string? nodeId
    )
    {
        var errors = new List<ValidationErrorDto>();
        var validationResults = ExpressionValidator.ValidateString(expressionText);

        foreach (var result in validationResults)
        {
            if (!result.IsValid)
            {
                errors.Add(
                    new ValidationErrorDto
                    {
                        Code = "EXPRESSION_SYNTAX_ERROR",
                        Message = $"Expression syntax error: {result.ErrorMessage}",
                        Path = path,
                        NodeId = nodeId,
                        Severity = Contracts.Responses.ValidationSeverity.Error,
                        ActualValue = expressionText,
                        Suggestions =
                        [
                            "Check for balanced brackets and parentheses",
                            "Ensure property names are valid identifiers",
                            "Review expression syntax in documentation",
                        ],
                    }
                );
            }
        }

        return errors;
    }

    /// <summary>
    /// Validates that all node IDs in the tree are unique.
    /// </summary>
    private List<ValidationErrorDto> ValidateUniqueIds(LayoutNodeDto root)
    {
        var errors = new List<ValidationErrorDto>();
        var seenIds = new Dictionary<string, string>(); // id -> path

        ValidateUniqueIdsRecursive(root, "$", seenIds, errors);

        return errors;
    }

    private static void ValidateUniqueIdsRecursive(
        LayoutNodeDto node,
        string path,
        Dictionary<string, string> seenIds,
        List<ValidationErrorDto> errors
    )
    {
        if (!string.IsNullOrEmpty(node.Id))
        {
            if (seenIds.TryGetValue(node.Id, out var existingPath))
            {
                errors.Add(
                    new ValidationErrorDto
                    {
                        Code = "DUPLICATE_NODE_ID",
                        Message =
                            $"Duplicate node ID '{node.Id}' found. Previously defined at '{existingPath}'",
                        Path = $"{path}.id",
                        NodeId = node.Id,
                        Severity = Contracts.Responses.ValidationSeverity.Error,
                        ActualValue = node.Id,
                        Suggestions =
                        [
                            "Ensure each node has a unique ID",
                            "Consider using a naming convention like 'section-header-1'",
                        ],
                    }
                );
            }
            else
            {
                seenIds[node.Id] = path;
            }
        }

        if (node.Children != null)
        {
            for (int i = 0; i < node.Children.Count; i++)
            {
                ValidateUniqueIdsRecursive(
                    node.Children[i],
                    $"{path}.children[{i}]",
                    seenIds,
                    errors
                );
            }
        }

        if (node.Child != null)
        {
            ValidateUniqueIdsRecursive(node.Child, $"{path}.child", seenIds, errors);
        }
    }

    /// <summary>
    /// Checks for potential circular references in expressions.
    /// </summary>
    private static List<ValidationErrorDto> CheckCircularReferences(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationErrorDto>();

        // Check if RepeatFor references something that could create infinite loop
        if (!string.IsNullOrEmpty(node.RepeatFor))
        {
            // Extract the expression and check for self-referential patterns
            var matches = ExpressionPattern.Matches(node.RepeatFor);
            foreach (Match match in matches)
            {
                var expression = match.Groups[1].Value.Trim();

                // Check for potentially problematic patterns
                if (expression.Contains("repeatFor") || expression.Contains("RepeatFor"))
                {
                    errors.Add(
                        new ValidationErrorDto
                        {
                            Code = "POTENTIAL_CIRCULAR_REFERENCE",
                            Message = "RepeatFor expression may contain a self-referential pattern",
                            Path = $"{path}.repeatFor",
                            NodeId = node.Id,
                            Severity = Contracts.Responses.ValidationSeverity.Warning,
                            ActualValue = node.RepeatFor,
                            Suggestions =
                            [
                                "Review the expression to ensure it doesn't create infinite recursion",
                            ],
                        }
                    );
                }
            }
        }

        // Recursively check children
        if (node.Children != null)
        {
            for (int i = 0; i < node.Children.Count; i++)
            {
                errors.AddRange(CheckCircularReferences(node.Children[i], $"{path}.children[{i}]"));
            }
        }

        if (node.Child != null)
        {
            errors.AddRange(CheckCircularReferences(node.Child, $"{path}.child"));
        }

        return errors;
    }

    /// <summary>
    /// Validates image URLs if the option is enabled.
    /// </summary>
    private List<ValidationWarningDto> ValidateImageUrls(LayoutNodeDto node, string path)
    {
        var warnings = new List<ValidationWarningDto>();

        if (node.Type?.Equals("Image", StringComparison.OrdinalIgnoreCase) == true)
        {
            if (
                node.Properties != null
                && node.Properties.TryGetValue("source", out var sourceElement)
            )
            {
                var source = sourceElement.GetString();
                if (!string.IsNullOrEmpty(source) && !ContainsExpression(source))
                {
                    // Skip base64 encoded images
                    if (!source.StartsWith("data:"))
                    {
                        if (Uri.TryCreate(source, UriKind.Absolute, out var uri))
                        {
                            if (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
                            {
                                // Could potentially validate the URL is accessible
                                // For now, just warn about HTTP (non-HTTPS) URLs
                                if (uri.Scheme == Uri.UriSchemeHttp)
                                {
                                    warnings.Add(
                                        new ValidationWarningDto
                                        {
                                            Code = "INSECURE_IMAGE_URL",
                                            Message = "Image uses HTTP instead of HTTPS",
                                            Category = WarningCategory.BestPractice,
                                            Path = $"{path}.properties.source",
                                            NodeId = node.Id,
                                            Suggestions = ["Use HTTPS for secure image loading"],
                                        }
                                    );
                                }
                            }
                        }
                        else if (!source.StartsWith("/") && !source.StartsWith("./"))
                        {
                            warnings.Add(
                                new ValidationWarningDto
                                {
                                    Code = "INVALID_IMAGE_SOURCE",
                                    Message =
                                        $"Image source '{source}' may not be a valid URL or path",
                                    Category = WarningCategory.General,
                                    Path = $"{path}.properties.source",
                                    NodeId = node.Id,
                                    Suggestions =
                                    [
                                        "Use a valid absolute URL (https://...)",
                                        "Use a relative path starting with / or ./",
                                        "Use a base64 encoded data URI",
                                    ],
                                }
                            );
                        }
                    }
                }
            }
        }

        // Recursively validate children
        if (node.Children != null)
        {
            for (int i = 0; i < node.Children.Count; i++)
            {
                warnings.AddRange(ValidateImageUrls(node.Children[i], $"{path}.children[{i}]"));
            }
        }

        if (node.Child != null)
        {
            warnings.AddRange(ValidateImageUrls(node.Child, $"{path}.child"));
        }

        return warnings;
    }

    /// <summary>
    /// Validates font usage in the layout.
    /// </summary>
    private List<ValidationWarningDto> ValidateFonts(LayoutNodeDto node, string path)
    {
        var warnings = new List<ValidationWarningDto>();

        // Known safe system fonts
        var knownFonts = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Arial",
            "Helvetica",
            "Times New Roman",
            "Times",
            "Courier New",
            "Courier",
            "Verdana",
            "Georgia",
            "Palatino",
            "Garamond",
            "Bookman",
            "Trebuchet MS",
            "Arial Black",
            "Impact",
            "Comic Sans MS",
            "Lato",
            "Open Sans",
            "Roboto",
            "Segoe UI",
            "Tahoma",
            "Calibri",
            "Cambria",
            "Consolas",
        };

        // Check style for font family
        if (node.Style?.FontFamily != null)
        {
            var fontFamily = node.Style.FontFamily;
            if (!ContainsExpression(fontFamily) && !knownFonts.Contains(fontFamily))
            {
                warnings.Add(
                    new ValidationWarningDto
                    {
                        Code = "UNKNOWN_FONT_FAMILY",
                        Message = $"Font family '{fontFamily}' may not be available at runtime",
                        Category = WarningCategory.General,
                        Path = $"{path}.style.fontFamily",
                        NodeId = node.Id,
                        Suggestions =
                        [
                            "Ensure the font is registered with QuestPDF",
                            "Consider using a common system font as fallback",
                        ],
                    }
                );
            }
        }

        // Check properties for font-related settings
        if (
            node.Properties != null
            && node.Properties.TryGetValue("fontFamily", out var fontElement)
        )
        {
            var fontFamily = fontElement.GetString();
            if (
                !string.IsNullOrEmpty(fontFamily)
                && !ContainsExpression(fontFamily)
                && !knownFonts.Contains(fontFamily)
            )
            {
                warnings.Add(
                    new ValidationWarningDto
                    {
                        Code = "UNKNOWN_FONT_FAMILY",
                        Message = $"Font family '{fontFamily}' may not be available at runtime",
                        Category = WarningCategory.General,
                        Path = $"{path}.properties.fontFamily",
                        NodeId = node.Id,
                        Suggestions =
                        [
                            "Ensure the font is registered with QuestPDF",
                            "Consider using a common system font as fallback",
                        ],
                    }
                );
            }
        }

        // Recursively validate children
        if (node.Children != null)
        {
            for (int i = 0; i < node.Children.Count; i++)
            {
                warnings.AddRange(ValidateFonts(node.Children[i], $"{path}.children[{i}]"));
            }
        }

        if (node.Child != null)
        {
            warnings.AddRange(ValidateFonts(node.Child, $"{path}.child"));
        }

        return warnings;
    }

    private List<ValidationErrorDto> ValidateExpressions(
        LayoutNodeDto node,
        JsonElement sampleData,
        string path
    )
    {
        var errors = new List<ValidationErrorDto>();

        // Validate Visible expression
        if (!string.IsNullOrEmpty(node.Visible) && ContainsExpression(node.Visible))
        {
            var expressionError = ValidateSingleExpression(
                node.Visible,
                sampleData,
                $"{path}.visible",
                node.Id
            );
            if (expressionError != null)
            {
                errors.Add(expressionError);
            }
        }

        // Validate RepeatFor expression
        if (!string.IsNullOrEmpty(node.RepeatFor))
        {
            var expressionError = ValidateSingleExpression(
                node.RepeatFor,
                sampleData,
                $"{path}.repeatFor",
                node.Id,
                expectArray: true
            );
            if (expressionError != null)
            {
                errors.Add(expressionError);
            }
        }

        // Validate expressions in properties
        if (node.Properties != null)
        {
            foreach (var (key, value) in node.Properties)
            {
                if (value.ValueKind == JsonValueKind.String)
                {
                    var stringValue = value.GetString();
                    if (stringValue != null && ContainsExpression(stringValue))
                    {
                        var expressionError = ValidateSingleExpression(
                            stringValue,
                            sampleData,
                            $"{path}.properties.{key}",
                            node.Id
                        );
                        if (expressionError != null)
                        {
                            errors.Add(expressionError);
                        }
                    }
                }
            }
        }

        // Recursively validate children
        if (node.Children != null)
        {
            for (int i = 0; i < node.Children.Count; i++)
            {
                errors.AddRange(
                    ValidateExpressions(node.Children[i], sampleData, $"{path}.children[{i}]")
                );
            }
        }

        // Recursively validate single child
        if (node.Child != null)
        {
            errors.AddRange(ValidateExpressions(node.Child, sampleData, $"{path}.child"));
        }

        return errors;
    }

    private static ValidationErrorDto? ValidateSingleExpression(
        string expressionText,
        JsonElement sampleData,
        string path,
        string? nodeId,
        bool expectArray = false
    )
    {
        var matches = ExpressionPattern.Matches(expressionText);

        foreach (Match match in matches)
        {
            var expression = match.Groups[1].Value.Trim();

            // Try to resolve the expression path against sample data
            var result = TryResolveExpressionPath(expression, sampleData);

            if (!result.Success)
            {
                return new ValidationErrorDto
                {
                    Code = "EXPRESSION_PATH_ERROR",
                    Message =
                        $"Expression path '{expression}' could not be resolved: {result.Error}",
                    Path = path,
                    NodeId = nodeId,
                    Severity = Contracts.Responses.ValidationSeverity.Error,
                    ActualValue = expressionText,
                    Suggestions =
                    [
                        "Check that the data path matches your sample data structure",
                        "Ensure all property names are spelled correctly",
                    ],
                };
            }

            if (expectArray && result.Value.ValueKind != JsonValueKind.Array)
            {
                return new ValidationErrorDto
                {
                    Code = "EXPRESSION_TYPE_ERROR",
                    Message = $"Expression '{expression}' must resolve to an array for RepeatFor",
                    Path = path,
                    NodeId = nodeId,
                    Severity = Contracts.Responses.ValidationSeverity.Error,
                    ActualValue = result.Value.ValueKind.ToString(),
                    ExpectedFormat = "Array",
                    Suggestions = ["Ensure the expression points to an array in your data"],
                };
            }
        }

        return null;
    }

    private static (bool Success, JsonElement Value, string? Error) TryResolveExpressionPath(
        string expression,
        JsonElement data
    )
    {
        try
        {
            // Simple path resolution (e.g., "data.customer.name")
            var parts = expression.Split('.');
            var current = data;

            foreach (var part in parts)
            {
                // Skip 'data' prefix as it's typically the root
                if (part.Equals("data", StringComparison.OrdinalIgnoreCase) && parts[0] == part)
                {
                    continue;
                }

                // Handle array indexing (e.g., "items[0]")
                var arrayMatch = Regex.Match(part, @"^(\w+)\[(\d+)\]$");
                if (arrayMatch.Success)
                {
                    var propertyName = arrayMatch.Groups[1].Value;
                    var index = int.Parse(arrayMatch.Groups[2].Value);

                    if (!current.TryGetProperty(propertyName, out var arrayElement))
                    {
                        return (false, default, $"Property '{propertyName}' not found");
                    }

                    if (arrayElement.ValueKind != JsonValueKind.Array)
                    {
                        return (false, default, $"Property '{propertyName}' is not an array");
                    }

                    if (index >= arrayElement.GetArrayLength())
                    {
                        return (false, default, $"Array index {index} is out of bounds");
                    }

                    current = arrayElement[index];
                }
                else
                {
                    if (!current.TryGetProperty(part, out var nextElement))
                    {
                        return (false, default, $"Property '{part}' not found");
                    }
                    current = nextElement;
                }
            }

            return (true, current, null);
        }
        catch (Exception ex)
        {
            return (false, default, ex.Message);
        }
    }

    private List<ValidationErrorDto> ValidateComponentProperties(LayoutNodeDto node, string path)
    {
        var errors = new List<ValidationErrorDto>();

        if (string.IsNullOrEmpty(node.Type))
        {
            return errors;
        }

        if (!ComponentMetadataMap.TryGetValue(node.Type.ToLowerInvariant(), out var metadata))
        {
            // Unknown component type - already caught by FluentValidation
            return errors;
        }

        // Check required properties
        foreach (var required in metadata.RequiredProperties)
        {
            if (node.Properties == null || !node.Properties.ContainsKey(required.Name))
            {
                errors.Add(
                    new ValidationErrorDto
                    {
                        Code = "MISSING_REQUIRED_PROPERTY",
                        Message = $"Component '{node.Type}' requires property '{required.Name}'",
                        Path = $"{path}.properties.{required.Name}",
                        NodeId = node.Id,
                        Severity = Contracts.Responses.ValidationSeverity.Error,
                        ExpectedFormat = required.Type,
                        Suggestions =
                        [
                            $"Add the '{required.Name}' property to this {node.Type} component",
                        ],
                    }
                );
            }
        }

        // Validate property types
        if (node.Properties != null)
        {
            foreach (var (key, value) in node.Properties)
            {
                var propertyDef = metadata
                    .RequiredProperties.Concat(metadata.OptionalProperties)
                    .FirstOrDefault(p => p.Name.Equals(key, StringComparison.OrdinalIgnoreCase));

                if (propertyDef != null)
                {
                    var typeError = ValidatePropertyType(
                        value,
                        propertyDef,
                        $"{path}.properties.{key}",
                        node.Id
                    );
                    if (typeError != null)
                    {
                        errors.Add(typeError);
                    }
                }
            }
        }

        // Recursively validate children
        if (node.Children != null)
        {
            for (int i = 0; i < node.Children.Count; i++)
            {
                errors.AddRange(
                    ValidateComponentProperties(node.Children[i], $"{path}.children[{i}]")
                );
            }
        }

        if (node.Child != null)
        {
            errors.AddRange(ValidateComponentProperties(node.Child, $"{path}.child"));
        }

        return errors;
    }

    private static ValidationErrorDto? ValidatePropertyType(
        JsonElement value,
        PropertyMetadata property,
        string path,
        string? nodeId
    )
    {
        // Allow expressions for any property
        if (value.ValueKind == JsonValueKind.String)
        {
            var stringValue = value.GetString();
            if (stringValue != null && ContainsExpression(stringValue))
            {
                return null; // Expressions are validated separately
            }
        }

        var expectedType = property.Type.ToLowerInvariant();
        var isValid = expectedType switch
        {
            "string" => value.ValueKind == JsonValueKind.String,
            "number" => value.ValueKind == JsonValueKind.Number,
            "integer" => value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out _),
            "boolean" => value.ValueKind == JsonValueKind.True
                || value.ValueKind == JsonValueKind.False,
            "array" => value.ValueKind == JsonValueKind.Array,
            "object" => value.ValueKind == JsonValueKind.Object,
            _ => true, // Unknown type - allow anything
        };

        if (!isValid)
        {
            return new ValidationErrorDto
            {
                Code = "INVALID_PROPERTY_TYPE",
                Message = $"Property '{property.Name}' must be of type '{property.Type}'",
                Path = path,
                NodeId = nodeId,
                Severity = Contracts.Responses.ValidationSeverity.Error,
                ActualValue = value.ValueKind.ToString(),
                ExpectedFormat = property.Type,
            };
        }

        return null;
    }

    private static List<ValidationWarningDto> CheckDeprecations(LayoutNodeDto node, string path)
    {
        var warnings = new List<ValidationWarningDto>();

        // Check for deprecated component types (none currently, but infrastructure is ready)
        var deprecatedComponents = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            // { "OldComponentName", "Use NewComponentName instead" }
        };

        if (
            !string.IsNullOrEmpty(node.Type)
            && deprecatedComponents.TryGetValue(node.Type, out var replacement)
        )
        {
            warnings.Add(
                new ValidationWarningDto
                {
                    Code = "DEPRECATED_COMPONENT",
                    Message = $"Component '{node.Type}' is deprecated. {replacement}",
                    Category = WarningCategory.Deprecation,
                    Path = $"{path}.type",
                    NodeId = node.Id,
                    Suggestions = [replacement],
                }
            );
        }

        // Recursively check children
        if (node.Children != null)
        {
            for (int i = 0; i < node.Children.Count; i++)
            {
                warnings.AddRange(CheckDeprecations(node.Children[i], $"{path}.children[{i}]"));
            }
        }

        if (node.Child != null)
        {
            warnings.AddRange(CheckDeprecations(node.Child, $"{path}.child"));
        }

        return warnings;
    }

    private static List<ValidationWarningDto> CheckPerformanceIssues(
        LayoutNodeDto node,
        string path
    )
    {
        var warnings = new List<ValidationWarningDto>();

        // Check for deeply nested structures
        var depth = CalculateDepth(node);
        if (depth > 30)
        {
            warnings.Add(
                new ValidationWarningDto
                {
                    Code = "DEEP_NESTING",
                    Message =
                        $"Layout tree is deeply nested ({depth} levels). This may impact performance.",
                    Category = WarningCategory.Performance,
                    Path = path,
                    Suggestions =
                    [
                        "Consider flattening the layout structure",
                        "Use components like Column with spacing instead of nested Padding components",
                    ],
                }
            );
        }

        // Check for large number of children in a single container
        if (node.Children != null && node.Children.Count > 100)
        {
            warnings.Add(
                new ValidationWarningDto
                {
                    Code = "MANY_CHILDREN",
                    Message =
                        $"Container has {node.Children.Count} children. Consider using pagination or lazy loading.",
                    Category = WarningCategory.Performance,
                    Path = path,
                    NodeId = node.Id,
                    Suggestions =
                    [
                        "Break content into multiple pages",
                        "Use Table component for large datasets",
                    ],
                }
            );
        }

        // Check for unnecessary wrapper nesting
        if (IsUnnecessaryWrapper(node))
        {
            warnings.Add(
                new ValidationWarningDto
                {
                    Code = "UNNECESSARY_WRAPPER",
                    Message =
                        $"Single wrapper components can often be combined. Consider merging properties.",
                    Category = WarningCategory.BestPractice,
                    Path = path,
                    NodeId = node.Id,
                    Suggestions =
                    [
                        "Combine Padding, Background, and Border into the Style property",
                    ],
                }
            );
        }

        // Recursively check children
        if (node.Children != null)
        {
            for (int i = 0; i < node.Children.Count; i++)
            {
                warnings.AddRange(
                    CheckPerformanceIssues(node.Children[i], $"{path}.children[{i}]")
                );
            }
        }

        if (node.Child != null)
        {
            warnings.AddRange(CheckPerformanceIssues(node.Child, $"{path}.child"));
        }

        return warnings;
    }

    private static bool IsUnnecessaryWrapper(LayoutNodeDto node)
    {
        // Check for patterns like Padding > Background > Border with single children
        var wrapperTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Padding",
            "Background",
            "Border",
        };

        if (!wrapperTypes.Contains(node.Type ?? ""))
        {
            return false;
        }

        var child = node.Child;
        var wrapperCount = 1;

        while (child != null && wrapperTypes.Contains(child.Type ?? ""))
        {
            wrapperCount++;
            child = child.Child;
        }

        return wrapperCount >= 3;
    }

    private LayoutStatistics CalculateStatistics(LayoutNodeDto node)
    {
        var stats = new LayoutStatistics { ComponentCounts = [] };

        CalculateStatisticsRecursive(node, stats, 0);

        // Calculate complexity score (1-10)
        stats.ComplexityScore = CalculateComplexityScore(stats);

        return stats;
    }

    private static void CalculateStatisticsRecursive(
        LayoutNodeDto node,
        LayoutStatistics stats,
        int depth
    )
    {
        stats.TotalNodes++;
        stats.MaxDepth = Math.Max(stats.MaxDepth, depth);

        // Count component types
        if (!string.IsNullOrEmpty(node.Type))
        {
            if (!stats.ComponentCounts.TryGetValue(node.Type, out var count))
            {
                count = 0;
            }
            stats.ComponentCounts[node.Type] = count + 1;
        }

        // Count expressions
        if (ContainsExpression(node.Visible))
        {
            stats.ExpressionCount++;
            stats.ConditionalNodeCount++;
        }

        if (ContainsExpression(node.RepeatFor))
        {
            stats.ExpressionCount++;
            stats.RepeatNodeCount++;
        }

        if (node.Properties != null)
        {
            foreach (var value in node.Properties.Values)
            {
                if (value.ValueKind == JsonValueKind.String)
                {
                    var stringValue = value.GetString();
                    if (ContainsExpression(stringValue))
                    {
                        stats.ExpressionCount++;
                    }
                }
            }
        }

        // Count images
        if (node.Type?.Equals("Image", StringComparison.OrdinalIgnoreCase) == true)
        {
            stats.ImageCount++;
        }

        // Recurse into children
        if (node.Children != null)
        {
            foreach (var child in node.Children)
            {
                CalculateStatisticsRecursive(child, stats, depth + 1);
            }
        }

        if (node.Child != null)
        {
            CalculateStatisticsRecursive(node.Child, stats, depth + 1);
        }
    }

    private static int CalculateComplexityScore(LayoutStatistics stats)
    {
        var score = 0.0;

        // Node count factor
        score += Math.Min(stats.TotalNodes / 50.0, 3.0);

        // Depth factor
        score += Math.Min(stats.MaxDepth / 15.0, 2.0);

        // Expression count factor
        score += Math.Min(stats.ExpressionCount / 20.0, 2.0);

        // Repeating nodes factor
        score += Math.Min(stats.RepeatNodeCount * 0.5, 1.5);

        // Image count factor
        score += Math.Min(stats.ImageCount / 10.0, 1.5);

        return Math.Clamp((int)Math.Round(score), 1, 10);
    }

    private static int CalculateDepth(LayoutNodeDto node)
    {
        var maxChildDepth = 0;

        if (node.Children != null)
        {
            foreach (var child in node.Children)
            {
                maxChildDepth = Math.Max(maxChildDepth, CalculateDepth(child));
            }
        }

        if (node.Child != null)
        {
            maxChildDepth = Math.Max(maxChildDepth, CalculateDepth(node.Child));
        }

        return maxChildDepth + 1;
    }

    private static bool ContainsExpression(string? value)
    {
        return !string.IsNullOrEmpty(value) && value.Contains("{{") && value.Contains("}}");
    }

    private static string MapErrorCode(string? errorCode)
    {
        return errorCode switch
        {
            "NotEmptyValidator" => "REQUIRED_FIELD",
            "MaximumLengthValidator" => "MAX_LENGTH_EXCEEDED",
            "RegularExpressionValidator" => "INVALID_FORMAT",
            "PredicateValidator" => "VALIDATION_FAILED",
            "InclusiveBetweenValidator" => "VALUE_OUT_OF_RANGE",
            _ => errorCode ?? "VALIDATION_ERROR",
        };
    }

    private static Contracts.Responses.ValidationSeverity MapSeverity(
        FluentValidation.Severity severity
    )
    {
        return severity switch
        {
            FluentValidation.Severity.Error => Contracts.Responses.ValidationSeverity.Error,
            FluentValidation.Severity.Warning => Contracts.Responses.ValidationSeverity.Warning,
            FluentValidation.Severity.Info => Contracts.Responses.ValidationSeverity.Info,
            _ => Contracts.Responses.ValidationSeverity.Error,
        };
    }

    private static string BuildJsonPath(string propertyName)
    {
        // Convert FluentValidation property paths to JSON paths
        return "$." + propertyName.Replace("[", "[").Replace("]", "]");
    }

    private static string? ExtractNodeId(string propertyName, LayoutNodeDto root)
    {
        // Try to extract the node ID from the property path
        // Parse the property path to navigate to the correct node
        try
        {
            var node = NavigateToNode(propertyName, root);
            return node?.Id;
        }
        catch
        {
            return null;
        }
    }

    private static LayoutNodeDto? NavigateToNode(string propertyPath, LayoutNodeDto root)
    {
        // Parse paths like "Children[0].Children[1].Type" or "Child.Child.Properties.value"
        var segments = ParsePathSegments(propertyPath);
        var current = root;

        foreach (var segment in segments)
        {
            if (current == null)
                return null;

            if (segment.IsChildrenIndex)
            {
                if (current.Children == null || segment.Index >= current.Children.Count)
                    return null;
                current = current.Children[segment.Index];
            }
            else if (segment.Name.Equals("Child", StringComparison.OrdinalIgnoreCase))
            {
                current = current.Child;
            }
            else if (segment.Name.Equals("Children", StringComparison.OrdinalIgnoreCase))
            {
                // Just "Children" without index - stay at current node
                continue;
            }
            else
            {
                // Property name - we've reached the end of navigation
                break;
            }
        }

        return current;
    }

    private static List<PathSegment> ParsePathSegments(string path)
    {
        var segments = new List<PathSegment>();
        var regex = new Regex(@"(\w+)(?:\[(\d+)\])?", RegexOptions.Compiled);
        var matches = regex.Matches(path);

        foreach (Match match in matches)
        {
            var name = match.Groups[1].Value;
            var hasIndex = match.Groups[2].Success;
            var index = hasIndex ? int.Parse(match.Groups[2].Value) : -1;

            segments.Add(
                new PathSegment
                {
                    Name = name,
                    Index = index,
                    IsChildrenIndex =
                        hasIndex && name.Equals("Children", StringComparison.OrdinalIgnoreCase),
                }
            );
        }

        return segments;
    }

    private struct PathSegment
    {
        public string Name;
        public int Index;
        public bool IsChildrenIndex;
    }

    private static List<string>? GetSuggestions(FluentValidation.Results.ValidationFailure failure)
    {
        // Provide context-aware suggestions based on the error
        return failure.ErrorCode switch
        {
            "NotEmptyValidator" => ["Provide a value for this required field"],
            "MaximumLengthValidator" => ["Reduce the length of the value"],
            "RegularExpressionValidator" => ["Check the expected format in the documentation"],
            _ => null,
        };
    }

    #endregion

    #region Component Metadata

    private static Dictionary<string, ComponentMetadata> BuildComponentMetadata()
    {
        return new Dictionary<string, ComponentMetadata>(StringComparer.OrdinalIgnoreCase)
        {
            // Container Components
            ["column"] = new ComponentMetadata
            {
                Type = "Column",
                Category = "Container",
                Description = "Stacks child elements vertically with optional spacing",
                AcceptsChildren = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "spacing",
                        Type = "number",
                        Description = "Space between children in points",
                    },
                ],
            },
            ["row"] = new ComponentMetadata
            {
                Type = "Row",
                Category = "Container",
                Description = "Arranges child elements horizontally",
                AcceptsChildren = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "spacing",
                        Type = "number",
                        Description = "Space between children in points",
                    },
                ],
            },
            ["table"] = new ComponentMetadata
            {
                Type = "Table",
                Category = "Container",
                Description = "Grid layout with rows and columns",
                AcceptsChildren = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "columnsDefinition",
                        Type = "array",
                        Description = "Column width definitions",
                    },
                ],
            },
            ["layers"] = new ComponentMetadata
            {
                Type = "Layers",
                Category = "Container",
                Description = "Stacks elements on top of each other (z-axis)",
                AcceptsChildren = true,
            },
            ["decoration"] = new ComponentMetadata
            {
                Type = "Decoration",
                Category = "Container",
                Description = "Container with repeating header/footer sections",
                AcceptsChildren = true,
            },
            ["inlined"] = new ComponentMetadata
            {
                Type = "Inlined",
                Category = "Container",
                Description = "Inline flow layout (text wrapping behavior)",
                AcceptsChildren = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "spacing",
                        Type = "number",
                        Description = "Horizontal spacing",
                    },
                    new PropertyMetadata
                    {
                        Name = "verticalSpacing",
                        Type = "number",
                        Description = "Vertical spacing",
                    },
                    new PropertyMetadata
                    {
                        Name = "baselineAlignment",
                        Type = "string",
                        Description = "Baseline alignment mode",
                    },
                ],
            },
            ["multicolumn"] = new ComponentMetadata
            {
                Type = "MultiColumn",
                Category = "Container",
                Description = "Newspaper-style multi-column layout",
                AcceptsChildren = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "columnCount",
                        Type = "integer",
                        Description = "Number of columns",
                    },
                    new PropertyMetadata
                    {
                        Name = "spacing",
                        Type = "number",
                        Description = "Space between columns",
                    },
                ],
            },

            // Content Components
            ["text"] = new ComponentMetadata
            {
                Type = "Text",
                Category = "Content",
                Description = "Renders text with styling options",
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "content",
                        Type = "string",
                        Description = "Text content or expression",
                    },
                ],
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "spans",
                        Type = "array",
                        Description = "Rich text spans for mixed styling",
                    },
                ],
            },
            ["image"] = new ComponentMetadata
            {
                Type = "Image",
                Category = "Content",
                Description = "Displays an image from URL, file path, or base64",
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "source",
                        Type = "string",
                        Description = "Image source (URL, path, or base64)",
                    },
                ],
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "width",
                        Type = "number",
                        Description = "Image width",
                    },
                    new PropertyMetadata
                    {
                        Name = "height",
                        Type = "number",
                        Description = "Image height",
                    },
                    new PropertyMetadata
                    {
                        Name = "fit",
                        Type = "string",
                        Description = "How image fits: contain, cover, fill",
                    },
                ],
            },
            ["line"] = new ComponentMetadata
            {
                Type = "Line",
                Category = "Content",
                Description = "Horizontal or vertical divider line",
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "orientation",
                        Type = "string",
                        Description = "horizontal or vertical",
                        DefaultValue = "horizontal",
                    },
                    new PropertyMetadata
                    {
                        Name = "thickness",
                        Type = "number",
                        Description = "Line thickness in points",
                        DefaultValue = 1,
                    },
                    new PropertyMetadata
                    {
                        Name = "color",
                        Type = "string",
                        Description = "Line color",
                    },
                ],
            },
            ["placeholder"] = new ComponentMetadata
            {
                Type = "Placeholder",
                Category = "Content",
                Description = "Placeholder box for prototyping",
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "label",
                        Type = "string",
                        Description = "Label text shown on placeholder",
                    },
                ],
            },
            ["hyperlink"] = new ComponentMetadata
            {
                Type = "Hyperlink",
                Category = "Content",
                Description = "Clickable link wrapping content",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "url",
                        Type = "string",
                        Description = "Target URL",
                    },
                ],
            },
            ["list"] = new ComponentMetadata
            {
                Type = "List",
                Category = "Content",
                Description = "Ordered or unordered list",
                AcceptsChildren = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "listType",
                        Type = "string",
                        Description = "ordered or unordered",
                        DefaultValue = "unordered",
                    },
                    new PropertyMetadata
                    {
                        Name = "spacing",
                        Type = "number",
                        Description = "Space between items",
                    },
                    new PropertyMetadata
                    {
                        Name = "bulletCharacter",
                        Type = "string",
                        Description = "Custom bullet character",
                    },
                ],
            },
            ["canvas"] = new ComponentMetadata
            {
                Type = "Canvas",
                Category = "Content",
                Description = "Custom vector graphics drawing area",
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "width",
                        Type = "number",
                        Description = "Canvas width",
                    },
                    new PropertyMetadata
                    {
                        Name = "height",
                        Type = "number",
                        Description = "Canvas height",
                    },
                    new PropertyMetadata
                    {
                        Name = "commands",
                        Type = "array",
                        Description = "Drawing commands",
                    },
                ],
            },
            ["barcode"] = new ComponentMetadata
            {
                Type = "Barcode",
                Category = "Content",
                Description = "Generates a barcode",
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "value",
                        Type = "string",
                        Description = "Barcode value",
                    },
                    new PropertyMetadata
                    {
                        Name = "format",
                        Type = "string",
                        Description = "Barcode format (e.g., Code128, QR)",
                    },
                ],
            },
            ["qrcode"] = new ComponentMetadata
            {
                Type = "QRCode",
                Category = "Content",
                Description = "Generates a QR code",
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "value",
                        Type = "string",
                        Description = "QR code content",
                    },
                ],
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "size",
                        Type = "number",
                        Description = "QR code size in points",
                    },
                ],
            },

            // Styling Components
            ["padding"] = new ComponentMetadata
            {
                Type = "Padding",
                Category = "Styling",
                Description = "Adds padding around child content",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "all",
                        Type = "number",
                        Description = "Uniform padding",
                    },
                    new PropertyMetadata
                    {
                        Name = "horizontal",
                        Type = "number",
                        Description = "Left and right padding",
                    },
                    new PropertyMetadata
                    {
                        Name = "vertical",
                        Type = "number",
                        Description = "Top and bottom padding",
                    },
                    new PropertyMetadata
                    {
                        Name = "top",
                        Type = "number",
                        Description = "Top padding",
                    },
                    new PropertyMetadata
                    {
                        Name = "right",
                        Type = "number",
                        Description = "Right padding",
                    },
                    new PropertyMetadata
                    {
                        Name = "bottom",
                        Type = "number",
                        Description = "Bottom padding",
                    },
                    new PropertyMetadata
                    {
                        Name = "left",
                        Type = "number",
                        Description = "Left padding",
                    },
                ],
            },
            ["border"] = new ComponentMetadata
            {
                Type = "Border",
                Category = "Styling",
                Description = "Adds border around child content",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "thickness",
                        Type = "number",
                        Description = "Border thickness",
                    },
                    new PropertyMetadata
                    {
                        Name = "color",
                        Type = "string",
                        Description = "Border color",
                    },
                ],
            },
            ["background"] = new ComponentMetadata
            {
                Type = "Background",
                Category = "Styling",
                Description = "Adds background color to child content",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "color",
                        Type = "string",
                        Description = "Background color",
                    },
                ],
            },
            ["roundedcorners"] = new ComponentMetadata
            {
                Type = "RoundedCorners",
                Category = "Styling",
                Description = "Applies rounded corners to content",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "radius",
                        Type = "number",
                        Description = "Corner radius",
                    },
                ],
            },
            ["shadow"] = new ComponentMetadata
            {
                Type = "Shadow",
                Category = "Styling",
                Description = "Adds drop shadow effect",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "color",
                        Type = "string",
                        Description = "Shadow color",
                    },
                    new PropertyMetadata
                    {
                        Name = "blurRadius",
                        Type = "number",
                        Description = "Blur radius",
                    },
                    new PropertyMetadata
                    {
                        Name = "offsetX",
                        Type = "number",
                        Description = "Horizontal offset",
                    },
                    new PropertyMetadata
                    {
                        Name = "offsetY",
                        Type = "number",
                        Description = "Vertical offset",
                    },
                ],
            },
            ["defaulttextstyle"] = new ComponentMetadata
            {
                Type = "DefaultTextStyle",
                Category = "Styling",
                Description = "Sets default text styling for descendants",
                AcceptsSingleChild = true,
            },

            // Sizing Components
            ["width"] = new ComponentMetadata
            {
                Type = "Width",
                Category = "Sizing",
                Description = "Sets width constraint",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "value",
                        Type = "number",
                        Description = "Width value",
                    },
                    new PropertyMetadata
                    {
                        Name = "unit",
                        Type = "string",
                        Description = "Unit: pt, cm, inch, %",
                    },
                ],
            },
            ["height"] = new ComponentMetadata
            {
                Type = "Height",
                Category = "Sizing",
                Description = "Sets height constraint",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "value",
                        Type = "number",
                        Description = "Height value",
                    },
                    new PropertyMetadata
                    {
                        Name = "unit",
                        Type = "string",
                        Description = "Unit: pt, cm, inch, %",
                    },
                ],
            },
            ["alignment"] = new ComponentMetadata
            {
                Type = "Alignment",
                Category = "Sizing",
                Description = "Aligns child content within available space",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "horizontal",
                        Type = "string",
                        Description = "left, center, right",
                    },
                    new PropertyMetadata
                    {
                        Name = "vertical",
                        Type = "string",
                        Description = "top, middle, bottom",
                    },
                ],
            },
            ["aspectratio"] = new ComponentMetadata
            {
                Type = "AspectRatio",
                Category = "Sizing",
                Description = "Maintains aspect ratio of content",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "ratio",
                        Type = "number",
                        Description = "Width/height ratio (e.g., 16/9)",
                    },
                ],
            },
            ["extend"] = new ComponentMetadata
            {
                Type = "Extend",
                Category = "Sizing",
                Description = "Extends to fill available space",
                AcceptsSingleChild = true,
            },
            ["shrink"] = new ComponentMetadata
            {
                Type = "Shrink",
                Category = "Sizing",
                Description = "Shrinks to minimum required size",
                AcceptsSingleChild = true,
            },
            ["unconstrained"] = new ComponentMetadata
            {
                Type = "Unconstrained",
                Category = "Sizing",
                Description = "Removes size constraints from parent",
                AcceptsSingleChild = true,
            },
            ["constrained"] = new ComponentMetadata
            {
                Type = "Constrained",
                Category = "Sizing",
                Description = "Applies size constraints to child content",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "minWidth",
                        Type = "number",
                        Description = "Minimum width constraint",
                    },
                    new PropertyMetadata
                    {
                        Name = "maxWidth",
                        Type = "number",
                        Description = "Maximum width constraint",
                    },
                    new PropertyMetadata
                    {
                        Name = "minHeight",
                        Type = "number",
                        Description = "Minimum height constraint",
                    },
                    new PropertyMetadata
                    {
                        Name = "maxHeight",
                        Type = "number",
                        Description = "Maximum height constraint",
                    },
                ],
            },
            ["minwidth"] = new ComponentMetadata
            {
                Type = "MinWidth",
                Category = "Sizing",
                Description = "Sets minimum width constraint",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "value",
                        Type = "number",
                        Description = "Minimum width value in points",
                    },
                ],
            },
            ["maxwidth"] = new ComponentMetadata
            {
                Type = "MaxWidth",
                Category = "Sizing",
                Description = "Sets maximum width constraint",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "value",
                        Type = "number",
                        Description = "Maximum width value in points",
                    },
                ],
            },
            ["minheight"] = new ComponentMetadata
            {
                Type = "MinHeight",
                Category = "Sizing",
                Description = "Sets minimum height constraint",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "value",
                        Type = "number",
                        Description = "Minimum height value in points",
                    },
                ],
            },
            ["maxheight"] = new ComponentMetadata
            {
                Type = "MaxHeight",
                Category = "Sizing",
                Description = "Sets maximum height constraint",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "value",
                        Type = "number",
                        Description = "Maximum height value in points",
                    },
                ],
            },

            // Transformation Components
            ["rotate"] = new ComponentMetadata
            {
                Type = "Rotate",
                Category = "Transformation",
                Description = "Rotates content by specified angle",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "angle",
                        Type = "number",
                        Description = "Rotation angle in degrees",
                    },
                ],
            },
            ["scale"] = new ComponentMetadata
            {
                Type = "Scale",
                Category = "Transformation",
                Description = "Scales content by factor",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "factor",
                        Type = "number",
                        Description = "Uniform scale factor",
                    },
                    new PropertyMetadata
                    {
                        Name = "factorX",
                        Type = "number",
                        Description = "Horizontal scale factor",
                    },
                    new PropertyMetadata
                    {
                        Name = "factorY",
                        Type = "number",
                        Description = "Vertical scale factor",
                    },
                ],
            },
            ["scaletofit"] = new ComponentMetadata
            {
                Type = "ScaleToFit",
                Category = "Transformation",
                Description = "Scales content to fit available space",
                AcceptsSingleChild = true,
            },
            ["translate"] = new ComponentMetadata
            {
                Type = "Translate",
                Category = "Transformation",
                Description = "Offsets content position",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "x",
                        Type = "number",
                        Description = "Horizontal offset",
                    },
                    new PropertyMetadata
                    {
                        Name = "y",
                        Type = "number",
                        Description = "Vertical offset",
                    },
                ],
            },
            ["flip"] = new ComponentMetadata
            {
                Type = "Flip",
                Category = "Transformation",
                Description = "Mirrors content horizontally or vertically",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "horizontal",
                        Type = "boolean",
                        Description = "Flip horizontally",
                    },
                    new PropertyMetadata
                    {
                        Name = "vertical",
                        Type = "boolean",
                        Description = "Flip vertically",
                    },
                ],
            },

            // Flow Control Components
            ["pagebreak"] = new ComponentMetadata
            {
                Type = "PageBreak",
                Category = "FlowControl",
                Description = "Forces a page break",
            },
            ["ensurespace"] = new ComponentMetadata
            {
                Type = "EnsureSpace",
                Category = "FlowControl",
                Description = "Ensures minimum space before content or breaks to new page",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "minHeight",
                        Type = "number",
                        Description = "Minimum required space",
                    },
                ],
            },
            ["showentire"] = new ComponentMetadata
            {
                Type = "ShowEntire",
                Category = "FlowControl",
                Description = "Keeps content together on same page",
                AcceptsSingleChild = true,
            },
            ["stoppaging"] = new ComponentMetadata
            {
                Type = "StopPaging",
                Category = "FlowControl",
                Description = "Prevents pagination of content",
                AcceptsSingleChild = true,
            },
            ["section"] = new ComponentMetadata
            {
                Type = "Section",
                Category = "FlowControl",
                Description = "Named section for table of contents",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "name",
                        Type = "string",
                        Description = "Section name",
                    },
                ],
            },
            ["repeat"] = new ComponentMetadata
            {
                Type = "Repeat",
                Category = "FlowControl",
                Description = "Repeats content on every page",
                AcceptsSingleChild = true,
            },
            ["showonce"] = new ComponentMetadata
            {
                Type = "ShowOnce",
                Category = "FlowControl",
                Description = "Shows content only on first page",
                AcceptsSingleChild = true,
            },
            ["skiponce"] = new ComponentMetadata
            {
                Type = "SkipOnce",
                Category = "FlowControl",
                Description = "Skips content on first page",
                AcceptsSingleChild = true,
            },

            // Special Components
            ["contentdirection"] = new ComponentMetadata
            {
                Type = "ContentDirection",
                Category = "Special",
                Description = "Sets content direction (LTR/RTL)",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "direction",
                        Type = "string",
                        Description = "ltr or rtl",
                    },
                ],
            },
            ["showif"] = new ComponentMetadata
            {
                Type = "ShowIf",
                Category = "Special",
                Description = "Conditionally shows content based on expression",
                AcceptsSingleChild = true,
                RequiredProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "condition",
                        Type = "string",
                        Description = "Boolean expression",
                    },
                ],
            },
            ["preventpagebreak"] = new ComponentMetadata
            {
                Type = "PreventPageBreak",
                Category = "FlowControl",
                Description = "Prevents page break within content",
                AcceptsSingleChild = true,
            },
            ["zindex"] = new ComponentMetadata
            {
                Type = "ZIndex",
                Category = "Special",
                Description = "Controls layer stacking order for overlapping content",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "value",
                        Type = "integer",
                        Description = "Z-index value (higher values are rendered on top)",
                    },
                ],
            },
            ["debugarea"] = new ComponentMetadata
            {
                Type = "DebugArea",
                Category = "Debug",
                Description = "Visual debugging helper that highlights component boundaries",
                AcceptsSingleChild = true,
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "color",
                        Type = "string",
                        Description = "Border color for highlighting",
                    },
                    new PropertyMetadata
                    {
                        Name = "label",
                        Type = "string",
                        Description = "Label to display on the debug area",
                    },
                ],
            },
            ["debugpointer"] = new ComponentMetadata
            {
                Type = "DebugPointer",
                Category = "Debug",
                Description = "Visual debugging helper that shows a pointer at a specific location",
                OptionalProperties =
                [
                    new PropertyMetadata
                    {
                        Name = "label",
                        Type = "string",
                        Description = "Label to display at the pointer",
                    },
                    new PropertyMetadata
                    {
                        Name = "color",
                        Type = "string",
                        Description = "Pointer color",
                    },
                ],
            },
        };
    }

    #endregion
}

/// <summary>
/// Metadata for a component type.
/// </summary>
internal class ComponentMetadata
{
    public string Type { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool AcceptsChildren { get; set; }
    public bool AcceptsSingleChild { get; set; }
    public List<PropertyMetadata> RequiredProperties { get; set; } = [];
    public List<PropertyMetadata> OptionalProperties { get; set; } = [];
}

/// <summary>
/// Metadata for a component property.
/// </summary>
internal class PropertyMetadata
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public object? DefaultValue { get; set; }
    public bool SupportsExpressions { get; set; } = true;
}
