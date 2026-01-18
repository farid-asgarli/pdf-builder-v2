using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;

namespace PDFBuilder.Engine.Services;

/// <summary>
/// Registry containing metadata for all PDF components.
/// Provides component information, validation rules, and documentation.
/// This is the single source of truth for component specifications.
/// </summary>
public sealed class ComponentRegistry
{
    private readonly Dictionary<ComponentType, ComponentMetadata> _components;
    private readonly ILogger<ComponentRegistry> _logger;

    /// <summary>
    /// Initializes a new instance of the ComponentRegistry class.
    /// </summary>
    /// <param name="logger">The logger instance.</param>
    public ComponentRegistry(ILogger<ComponentRegistry> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _components = new Dictionary<ComponentType, ComponentMetadata>();
        RegisterAllComponents();
        _logger.LogInformation(
            "ComponentRegistry initialized with {Count} components",
            _components.Count
        );
    }

    /// <summary>
    /// Gets the total count of registered components.
    /// </summary>
    public int Count => _components.Count;

    /// <summary>
    /// Gets the metadata for a specific component type.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>The component metadata.</returns>
    public ComponentMetadata GetMetadata(ComponentType componentType)
    {
        if (_components.TryGetValue(componentType, out var metadata))
        {
            return metadata;
        }

        _logger.LogWarning("No metadata found for component type {ComponentType}", componentType);
        return CreateDefaultMetadata(componentType);
    }

    /// <summary>
    /// Checks if a component type is registered.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>True if the component is registered; otherwise, false.</returns>
    public bool IsRegistered(ComponentType componentType)
    {
        return _components.ContainsKey(componentType);
    }

    /// <summary>
    /// Gets all registered component types.
    /// </summary>
    /// <returns>An enumerable of all component types.</returns>
    public IEnumerable<ComponentType> GetAllComponentTypes()
    {
        return _components.Keys;
    }

    /// <summary>
    /// Gets all component metadata grouped by category.
    /// </summary>
    /// <returns>A dictionary of category name to component metadata list.</returns>
    public Dictionary<string, List<ComponentMetadata>> GetComponentsByCategory()
    {
        return _components
            .Values.GroupBy(m => m.Category)
            .ToDictionary(g => g.Key, g => g.ToList());
    }

    /// <summary>
    /// Gets all components of a specific priority tier.
    /// </summary>
    /// <param name="tier">The priority tier (1-4).</param>
    /// <returns>Component metadata for the specified tier.</returns>
    public IEnumerable<ComponentMetadata> GetComponentsByTier(int tier)
    {
        return _components.Values.Where(m => m.PriorityTier == tier);
    }

    /// <summary>
    /// Validates that required properties are present for a component.
    /// </summary>
    /// <param name="node">The layout node to validate.</param>
    /// <returns>A list of validation errors.</returns>
    public List<string> ValidateRequiredProperties(LayoutNode node)
    {
        var errors = new List<string>();
        var metadata = GetMetadata(node.Type);

        foreach (var prop in metadata.RequiredProperties)
        {
            if (!node.HasProperty(prop))
            {
                errors.Add($"Required property '{prop}' is missing for component '{node.Type}'");
            }
        }

        return errors;
    }

    /// <summary>
    /// Validates all properties of a layout node against the component's property definitions.
    /// </summary>
    /// <param name="node">The layout node to validate.</param>
    /// <returns>A comprehensive list of validation errors.</returns>
    public List<ValidationError> ValidateNode(LayoutNode node)
    {
        var errors = new List<ValidationError>();
        var metadata = GetMetadata(node.Type);

        // Validate required properties
        foreach (var prop in metadata.RequiredProperties)
        {
            if (!node.HasProperty(prop))
            {
                errors.Add(
                    new ValidationError
                    {
                        PropertyName = prop,
                        ErrorType = ValidationErrorType.MissingRequired,
                        Message =
                            $"Required property '{prop}' is missing for component '{node.Type}'",
                        ComponentType = node.Type,
                        NodeId = node.Id,
                    }
                );
            }
        }

        // Validate property definitions if available
        foreach (var propDef in metadata.PropertyDefinitions)
        {
            if (!node.HasProperty(propDef.Name))
            {
                // Already handled in required properties check
                continue;
            }

            var propErrors = ValidatePropertyValue(node, propDef);
            errors.AddRange(propErrors);
        }

        // Validate unknown properties (optional - warning level)
        if (node.Properties is not null)
        {
            var knownProps = metadata
                .PropertyDefinitions.Select(p => p.Name)
                .Concat(metadata.RequiredProperties)
                .Concat(metadata.OptionalProperties)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var prop in node.Properties.Keys)
            {
                if (!knownProps.Contains(prop))
                {
                    errors.Add(
                        new ValidationError
                        {
                            PropertyName = prop,
                            ErrorType = ValidationErrorType.UnknownProperty,
                            Message = $"Unknown property '{prop}' for component '{node.Type}'",
                            ComponentType = node.Type,
                            NodeId = node.Id,
                            Severity = ValidationSeverity.Warning,
                        }
                    );
                }
            }
        }

        // Validate children structure
        if (metadata.SupportsChildren && metadata.IsWrapper && node.Children?.Count > 1)
        {
            errors.Add(
                new ValidationError
                {
                    PropertyName = "children",
                    ErrorType = ValidationErrorType.InvalidStructure,
                    Message =
                        $"Wrapper component '{node.Type}' can only have a single child, use 'child' instead of 'children'",
                    ComponentType = node.Type,
                    NodeId = node.Id,
                }
            );
        }

        if (!metadata.SupportsChildren && node.Children?.Count > 0)
        {
            errors.Add(
                new ValidationError
                {
                    PropertyName = "children",
                    ErrorType = ValidationErrorType.InvalidStructure,
                    Message = $"Component '{node.Type}' does not support children",
                    ComponentType = node.Type,
                    NodeId = node.Id,
                }
            );
        }

        if (!metadata.IsWrapper && node.Child is not null)
        {
            errors.Add(
                new ValidationError
                {
                    PropertyName = "child",
                    ErrorType = ValidationErrorType.InvalidStructure,
                    Message =
                        $"Component '{node.Type}' does not support single child, use 'children' instead",
                    ComponentType = node.Type,
                    NodeId = node.Id,
                }
            );
        }

        return errors;
    }

    /// <summary>
    /// Validates a property value against its definition.
    /// </summary>
    private static List<ValidationError> ValidatePropertyValue(
        LayoutNode node,
        PropertyDefinition propDef
    )
    {
        var errors = new List<ValidationError>();
        var propValue = node.GetStringProperty(propDef.Name);

        // Skip expression validation (expressions are evaluated at runtime)
        if (propValue is not null && propValue.Contains("{{") && propValue.Contains("}}"))
        {
            return errors;
        }

        // Type-specific validation
        switch (propDef.Type)
        {
            case PropertyType.Number:
            case PropertyType.Float:
                if (propValue is not null && !float.TryParse(propValue, out _))
                {
                    errors.Add(
                        new ValidationError
                        {
                            PropertyName = propDef.Name,
                            ErrorType = ValidationErrorType.InvalidType,
                            Message = $"Property '{propDef.Name}' must be a number",
                            ComponentType = node.Type,
                            NodeId = node.Id,
                            ExpectedType = propDef.Type.ToString(),
                            ActualValue = propValue,
                        }
                    );
                }
                else if (propValue is not null)
                {
                    var floatVal = float.Parse(propValue);
                    if (propDef.MinValue.HasValue && floatVal < propDef.MinValue.Value)
                    {
                        errors.Add(
                            new ValidationError
                            {
                                PropertyName = propDef.Name,
                                ErrorType = ValidationErrorType.OutOfRange,
                                Message =
                                    $"Property '{propDef.Name}' must be at least {propDef.MinValue}",
                                ComponentType = node.Type,
                                NodeId = node.Id,
                            }
                        );
                    }
                    if (propDef.MaxValue.HasValue && floatVal > propDef.MaxValue.Value)
                    {
                        errors.Add(
                            new ValidationError
                            {
                                PropertyName = propDef.Name,
                                ErrorType = ValidationErrorType.OutOfRange,
                                Message =
                                    $"Property '{propDef.Name}' must be at most {propDef.MaxValue}",
                                ComponentType = node.Type,
                                NodeId = node.Id,
                            }
                        );
                    }
                }
                break;

            case PropertyType.Integer:
                if (propValue is not null && !int.TryParse(propValue, out _))
                {
                    errors.Add(
                        new ValidationError
                        {
                            PropertyName = propDef.Name,
                            ErrorType = ValidationErrorType.InvalidType,
                            Message = $"Property '{propDef.Name}' must be an integer",
                            ComponentType = node.Type,
                            NodeId = node.Id,
                            ExpectedType = propDef.Type.ToString(),
                            ActualValue = propValue,
                        }
                    );
                }
                break;

            case PropertyType.Boolean:
                if (propValue is not null && !bool.TryParse(propValue, out _))
                {
                    errors.Add(
                        new ValidationError
                        {
                            PropertyName = propDef.Name,
                            ErrorType = ValidationErrorType.InvalidType,
                            Message = $"Property '{propDef.Name}' must be a boolean",
                            ComponentType = node.Type,
                            NodeId = node.Id,
                            ExpectedType = propDef.Type.ToString(),
                            ActualValue = propValue,
                        }
                    );
                }
                break;

            case PropertyType.Enum:
                if (propValue is not null && propDef.AllowedValues?.Length > 0)
                {
                    if (
                        !propDef.AllowedValues.Contains(propValue, StringComparer.OrdinalIgnoreCase)
                    )
                    {
                        errors.Add(
                            new ValidationError
                            {
                                PropertyName = propDef.Name,
                                ErrorType = ValidationErrorType.InvalidValue,
                                Message =
                                    $"Property '{propDef.Name}' must be one of: {string.Join(", ", propDef.AllowedValues)}",
                                ComponentType = node.Type,
                                NodeId = node.Id,
                                ActualValue = propValue,
                                AllowedValues = propDef.AllowedValues,
                            }
                        );
                    }
                }
                break;

            case PropertyType.Color:
                if (propValue is not null && !IsValidColor(propValue))
                {
                    errors.Add(
                        new ValidationError
                        {
                            PropertyName = propDef.Name,
                            ErrorType = ValidationErrorType.InvalidFormat,
                            Message =
                                $"Property '{propDef.Name}' must be a valid color (hex format #RRGGBB or #AARRGGBB, or color name)",
                            ComponentType = node.Type,
                            NodeId = node.Id,
                            ActualValue = propValue,
                        }
                    );
                }
                break;

            case PropertyType.Url:
                if (
                    propValue is not null
                    && !Uri.TryCreate(propValue, UriKind.Absolute, out _)
                    && !propValue.StartsWith("data:")
                )
                {
                    errors.Add(
                        new ValidationError
                        {
                            PropertyName = propDef.Name,
                            ErrorType = ValidationErrorType.InvalidFormat,
                            Message = $"Property '{propDef.Name}' must be a valid URL or data URI",
                            ComponentType = node.Type,
                            NodeId = node.Id,
                            ActualValue = propValue,
                        }
                    );
                }
                break;
        }

        return errors;
    }

    /// <summary>
    /// Validates if a string is a valid color format.
    /// </summary>
    private static bool IsValidColor(string value)
    {
        // Check hex format
        if (value.StartsWith('#'))
        {
            var hex = value[1..];
            return hex.Length is 6 or 8 && hex.All(c => char.IsAsciiHexDigit(c));
        }

        // Check common color names
        var commonColors = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "black",
            "white",
            "red",
            "green",
            "blue",
            "yellow",
            "orange",
            "purple",
            "pink",
            "brown",
            "gray",
            "grey",
            "transparent",
        };

        return commonColors.Contains(value);
    }

    /// <summary>
    /// Gets a user-friendly description of a component's expected structure.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>A description string.</returns>
    public string GetComponentDescription(ComponentType componentType)
    {
        var metadata = GetMetadata(componentType);
        var parts = new List<string>
        {
            metadata.Description,
            $"Category: {metadata.Category}",
            $"Priority Tier: {metadata.PriorityTier}",
        };

        if (metadata.RequiredProperties.Length > 0)
        {
            parts.Add($"Required: {string.Join(", ", metadata.RequiredProperties)}");
        }

        if (metadata.OptionalProperties.Length > 0)
        {
            parts.Add($"Optional: {string.Join(", ", metadata.OptionalProperties)}");
        }

        if (metadata.SupportsChildren)
        {
            parts.Add(metadata.IsWrapper ? "Accepts single child" : "Accepts multiple children");
        }

        return string.Join(". ", parts);
    }

    /// <summary>
    /// Gets all property definitions for a component type.
    /// </summary>
    /// <param name="componentType">The component type.</param>
    /// <returns>The property definitions.</returns>
    public IEnumerable<PropertyDefinition> GetPropertyDefinitions(ComponentType componentType)
    {
        var metadata = GetMetadata(componentType);
        return metadata.PropertyDefinitions;
    }

    /// <summary>
    /// Registers all component metadata.
    /// </summary>
    private void RegisterAllComponents()
    {
        // ========================================
        // Container Components
        // ========================================
        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Column,
                Name = "Column",
                Description = "Vertical stacking container with optional spacing",
                Category = "Container",
                PriorityTier = 1,
                SupportsChildren = true,
                IsWrapper = false,
                RequiredProperties = [],
                OptionalProperties = ["spacing"],
                PropertyDefinitions =
                [
                    new PropertyDefinition
                    {
                        Name = "spacing",
                        DisplayName = "Spacing",
                        Description = "Vertical space between child elements in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        DefaultValue = 0f,
                        MinValue = 0,
                        Unit = "pt",
                        Examples = ["5", "10", "15"],
                    },
                ],
                QuestPdfApi = "container.Column(col => ...)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Row,
                Name = "Row",
                Description = "Horizontal arrangement container with optional spacing",
                Category = "Container",
                PriorityTier = 1,
                SupportsChildren = true,
                IsWrapper = false,
                RequiredProperties = [],
                OptionalProperties = ["spacing"],
                PropertyDefinitions =
                [
                    new PropertyDefinition
                    {
                        Name = "spacing",
                        DisplayName = "Spacing",
                        Description = "Horizontal space between child elements in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        DefaultValue = 0f,
                        MinValue = 0,
                        Unit = "pt",
                        Examples = ["5", "10", "15"],
                    },
                ],
                QuestPdfApi = "container.Row(row => ...)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Table,
                Name = "Table",
                Description = "Grid layout with rows, columns, and cell spanning",
                Category = "Container",
                PriorityTier = 1,
                SupportsChildren = true,
                IsWrapper = false,
                RequiredProperties = ["columns"],
                OptionalProperties = ["rows", "header", "footer"],
                PropertyDefinitions =
                [
                    new PropertyDefinition
                    {
                        Name = "columns",
                        DisplayName = "Columns",
                        Description = "Column definitions specifying width for each column",
                        Type = PropertyType.Array,
                        IsRequired = true,
                        Examples = ["[100, 200, 100]", "[{\"type\": \"relative\", \"value\": 1}]"],
                    },
                    new PropertyDefinition
                    {
                        Name = "rows",
                        DisplayName = "Rows",
                        Description = "Table row definitions containing cells",
                        Type = PropertyType.Array,
                        IsRequired = false,
                    },
                    new PropertyDefinition
                    {
                        Name = "header",
                        DisplayName = "Header",
                        Description = "Table header that repeats on each page",
                        Type = PropertyType.Object,
                        IsRequired = false,
                    },
                    new PropertyDefinition
                    {
                        Name = "footer",
                        DisplayName = "Footer",
                        Description = "Table footer that appears at the end or on each page",
                        Type = PropertyType.Object,
                        IsRequired = false,
                    },
                ],
                QuestPdfApi = "container.Table(table => ...)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Layers,
                Name = "Layers",
                Description =
                    "Stacking planes for layered content (background, primary, foreground). Use for local backgrounds, watermarks, and layered graphics within content. Children can have 'isPrimary=true' to mark the main layer. For page-level backgrounds/foregrounds, use TemplateLayout.Background/Foreground slots instead.",
                Category = "Container",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = false,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi =
                    "container.Layers(layers => { layers.Layer()...; layers.PrimaryLayer()... })",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Decoration,
                Name = "Decoration",
                Description =
                    "Repeating section headers/footers with main content area. Use 'before' for content above and 'after' for content below main area. These repeat on every page when content spans multiple pages. Note: For page-level headers/footers, use TemplateLayout.Header/Footer slots instead.",
                Category = "Container",
                PriorityTier = 2,
                SupportsChildren = false, // Uses properties, not children
                IsWrapper = false,
                RequiredProperties = ["content"],
                OptionalProperties = ["before", "after"],
                QuestPdfApi =
                    "container.Decoration(dec => { dec.Before()...; dec.Content()...; dec.After()... })",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Inlined,
                Name = "Inlined",
                Description = "Inline flow layout for text-like wrapping",
                Category = "Container",
                PriorityTier = 4,
                SupportsChildren = true,
                IsWrapper = false,
                RequiredProperties = [],
                OptionalProperties = ["spacing", "verticalSpacing"],
                QuestPdfApi = "container.Inlined(inline => ...)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.MultiColumn,
                Name = "MultiColumn",
                Description = "Newspaper-style multi-column layout",
                Category = "Container",
                PriorityTier = 4,
                SupportsChildren = true,
                IsWrapper = false,
                RequiredProperties = ["columns"],
                OptionalProperties = ["spacing"],
                QuestPdfApi = "Custom implementation using Column",
            }
        );

        // ========================================
        // Content Components
        // ========================================
        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Text,
                Name = "Text",
                Description = "Rich text with styling support",
                Category = "Content",
                PriorityTier = 1,
                SupportsChildren = false,
                IsWrapper = false,
                RequiredProperties = ["content"],
                OptionalProperties =
                [
                    "fontSize",
                    "fontFamily",
                    "fontWeight",
                    "fontColor",
                    "backgroundColor",
                    "alignment",
                    "lineHeight",
                    "italic",
                    "underline",
                    "strikethrough",
                    "letterSpacing",
                ],
                PropertyDefinitions =
                [
                    new PropertyDefinition
                    {
                        Name = "content",
                        DisplayName = "Content",
                        Description =
                            "The text content to display. Supports expressions like {{data.value}}",
                        Type = PropertyType.String,
                        IsRequired = true,
                        SupportsExpressions = true,
                        Examples = ["Hello World", "{{data.title}}", "Total: {{data.amount}}"],
                    },
                    new PropertyDefinition
                    {
                        Name = "fontSize",
                        DisplayName = "Font Size",
                        Description = "The font size in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        DefaultValue = 12f,
                        MinValue = 1,
                        MaxValue = 1000,
                        Unit = "pt",
                        Examples = ["12", "16", "24"],
                    },
                    new PropertyDefinition
                    {
                        Name = "fontFamily",
                        DisplayName = "Font Family",
                        Description = "The font family name. Can specify fallback fonts",
                        Type = PropertyType.String,
                        IsRequired = false,
                        DefaultValue = "Lato",
                        Examples = ["Arial", "Times New Roman", "Helvetica"],
                    },
                    new PropertyDefinition
                    {
                        Name = "fontWeight",
                        DisplayName = "Font Weight",
                        Description = "The font weight (thickness)",
                        Type = PropertyType.Enum,
                        IsRequired = false,
                        DefaultValue = "normal",
                        AllowedValues =
                        [
                            "thin",
                            "extraLight",
                            "light",
                            "normal",
                            "medium",
                            "semiBold",
                            "bold",
                            "extraBold",
                            "black",
                        ],
                    },
                    new PropertyDefinition
                    {
                        Name = "fontColor",
                        DisplayName = "Font Color",
                        Description = "The text color in hex format or color name",
                        Type = PropertyType.Color,
                        IsRequired = false,
                        DefaultValue = "#000000",
                        Examples = ["#000000", "#FF5733", "blue"],
                    },
                    new PropertyDefinition
                    {
                        Name = "backgroundColor",
                        DisplayName = "Background Color",
                        Description = "Background color behind the text",
                        Type = PropertyType.Color,
                        IsRequired = false,
                        Examples = ["#FFFF00", "yellow"],
                    },
                    new PropertyDefinition
                    {
                        Name = "alignment",
                        DisplayName = "Alignment",
                        Description = "Text horizontal alignment",
                        Type = PropertyType.Enum,
                        IsRequired = false,
                        DefaultValue = "left",
                        AllowedValues = ["left", "center", "right", "justify", "start", "end"],
                    },
                    new PropertyDefinition
                    {
                        Name = "lineHeight",
                        DisplayName = "Line Height",
                        Description = "Line height multiplier",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        DefaultValue = 1.2f,
                        MinValue = 0.5f,
                        MaxValue = 5f,
                        Examples = ["1", "1.5", "2"],
                    },
                    new PropertyDefinition
                    {
                        Name = "italic",
                        DisplayName = "Italic",
                        Description = "Whether the text is italicized",
                        Type = PropertyType.Boolean,
                        IsRequired = false,
                        DefaultValue = false,
                    },
                    new PropertyDefinition
                    {
                        Name = "underline",
                        DisplayName = "Underline",
                        Description = "Whether the text is underlined",
                        Type = PropertyType.Boolean,
                        IsRequired = false,
                        DefaultValue = false,
                    },
                    new PropertyDefinition
                    {
                        Name = "strikethrough",
                        DisplayName = "Strikethrough",
                        Description = "Whether the text has a strikethrough",
                        Type = PropertyType.Boolean,
                        IsRequired = false,
                        DefaultValue = false,
                    },
                    new PropertyDefinition
                    {
                        Name = "letterSpacing",
                        DisplayName = "Letter Spacing",
                        Description = "Space between letters in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        DefaultValue = 0f,
                        Unit = "pt",
                    },
                ],
                QuestPdfApi = "container.Text(\"...\")",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Image,
                Name = "Image",
                Description = "Raster and SVG images",
                Category = "Content",
                PriorityTier = 1,
                SupportsChildren = false,
                IsWrapper = false,
                RequiredProperties = ["source"],
                OptionalProperties = ["width", "height", "fitMode", "compressionQuality", "dpi"],
                PropertyDefinitions =
                [
                    new PropertyDefinition
                    {
                        Name = "source",
                        DisplayName = "Source",
                        Description = "Image source URL, file path, or base64 data URI",
                        Type = PropertyType.Url,
                        IsRequired = true,
                        SupportsExpressions = true,
                        Examples =
                        [
                            "https://example.com/image.png",
                            "data:image/png;base64,...",
                            "{{data.logoUrl}}",
                        ],
                    },
                    new PropertyDefinition
                    {
                        Name = "width",
                        DisplayName = "Width",
                        Description =
                            "Image width in points. If not specified, uses original width or scales to fit",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = 1,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "height",
                        DisplayName = "Height",
                        Description =
                            "Image height in points. If not specified, uses original height or scales to fit",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = 1,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "fitMode",
                        DisplayName = "Fit Mode",
                        Description = "How the image should fit within its container",
                        Type = PropertyType.Enum,
                        IsRequired = false,
                        DefaultValue = "fitWidth",
                        AllowedValues = ["fitWidth", "fitHeight", "fitArea", "fitUnproportionally"],
                    },
                    new PropertyDefinition
                    {
                        Name = "compressionQuality",
                        DisplayName = "Compression Quality",
                        Description =
                            "JPEG compression quality (1-100). Higher values mean better quality but larger file size",
                        Type = PropertyType.Integer,
                        IsRequired = false,
                        DefaultValue = 85,
                        MinValue = 1,
                        MaxValue = 100,
                    },
                    new PropertyDefinition
                    {
                        Name = "dpi",
                        DisplayName = "DPI",
                        Description = "Target DPI for image rendering",
                        Type = PropertyType.Integer,
                        IsRequired = false,
                        DefaultValue = 144,
                        MinValue = 72,
                        MaxValue = 600,
                    },
                ],
                QuestPdfApi = "container.Image(bytes/path)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Line,
                Name = "Line",
                Description = "Horizontal or vertical divider lines",
                Category = "Content",
                PriorityTier = 2,
                SupportsChildren = false,
                IsWrapper = false,
                RequiredProperties = [],
                OptionalProperties = ["thickness", "color", "orientation"],
                QuestPdfApi = "container.LineHorizontal(1) / LineVertical(1)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Placeholder,
                Name = "Placeholder",
                Description = "Gray placeholder box for prototyping",
                Category = "Content",
                PriorityTier = 2,
                SupportsChildren = false,
                IsWrapper = false,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "container.Placeholder()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Hyperlink,
                Name = "Hyperlink",
                Description = "Clickable hyperlink URLs",
                Category = "Content",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["url"],
                OptionalProperties = [],
                QuestPdfApi = "container.Hyperlink(\"url\", c => ...)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.List,
                Name = "List",
                Description = "Ordered and unordered lists",
                Category = "Content",
                PriorityTier = 3,
                SupportsChildren = true,
                IsWrapper = false,
                RequiredProperties = [],
                OptionalProperties = ["type", "bulletStyle", "startNumber"],
                QuestPdfApi = "Custom implementation",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Canvas,
                Name = "Canvas",
                Description = "Custom vector graphics using canvas",
                Category = "Content",
                PriorityTier = 4,
                SupportsChildren = false,
                IsWrapper = false,
                RequiredProperties = ["commands"],
                OptionalProperties = [],
                QuestPdfApi = "container.Canvas(...)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Barcode,
                Name = "Barcode",
                Description = "QR code and barcode rendering",
                Category = "Content",
                PriorityTier = 3,
                SupportsChildren = false,
                IsWrapper = false,
                RequiredProperties = ["value", "type"],
                OptionalProperties = ["width", "height", "foregroundColor", "backgroundColor"],
                QuestPdfApi = "Integration with QRCoder/ZXing.Net",
            }
        );

        // ========================================
        // Styling Components
        // ========================================
        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Padding,
                Name = "Padding",
                Description = "Padding/spacing around content",
                Category = "Styling",
                PriorityTier = 1,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties =
                [
                    "all",
                    "top",
                    "right",
                    "bottom",
                    "left",
                    "horizontal",
                    "vertical",
                ],
                PropertyDefinitions =
                [
                    new PropertyDefinition
                    {
                        Name = "all",
                        DisplayName = "All Sides",
                        Description = "Uniform padding on all sides in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = -1000,
                        MaxValue = 1000,
                        Unit = "pt",
                        Examples = ["10", "20", "-5"],
                    },
                    new PropertyDefinition
                    {
                        Name = "top",
                        DisplayName = "Top",
                        Description = "Top padding in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = -1000,
                        MaxValue = 1000,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "right",
                        DisplayName = "Right",
                        Description = "Right padding in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = -1000,
                        MaxValue = 1000,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "bottom",
                        DisplayName = "Bottom",
                        Description = "Bottom padding in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = -1000,
                        MaxValue = 1000,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "left",
                        DisplayName = "Left",
                        Description = "Left padding in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = -1000,
                        MaxValue = 1000,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "horizontal",
                        DisplayName = "Horizontal",
                        Description = "Left and right padding in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = -1000,
                        MaxValue = 1000,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "vertical",
                        DisplayName = "Vertical",
                        Description = "Top and bottom padding in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = -1000,
                        MaxValue = 1000,
                        Unit = "pt",
                    },
                ],
                QuestPdfApi = "container.Padding(10)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Border,
                Name = "Border",
                Description = "Border with thickness and color",
                Category = "Styling",
                PriorityTier = 1,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties =
                [
                    "width",
                    "color",
                    "top",
                    "right",
                    "bottom",
                    "left",
                    "horizontal",
                    "vertical",
                ],
                PropertyDefinitions =
                [
                    new PropertyDefinition
                    {
                        Name = "width",
                        DisplayName = "Width",
                        Description = "Border width on all sides in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        DefaultValue = 1f,
                        MinValue = 0,
                        MaxValue = 100,
                        Unit = "pt",
                        Examples = ["1", "2", "3"],
                    },
                    new PropertyDefinition
                    {
                        Name = "color",
                        DisplayName = "Color",
                        Description = "Border color in hex format or color name",
                        Type = PropertyType.Color,
                        IsRequired = false,
                        DefaultValue = "#000000",
                        Examples = ["#000000", "#333333", "gray"],
                    },
                    new PropertyDefinition
                    {
                        Name = "top",
                        DisplayName = "Top Width",
                        Description = "Top border width in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = 0,
                        MaxValue = 100,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "right",
                        DisplayName = "Right Width",
                        Description = "Right border width in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = 0,
                        MaxValue = 100,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "bottom",
                        DisplayName = "Bottom Width",
                        Description = "Bottom border width in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = 0,
                        MaxValue = 100,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "left",
                        DisplayName = "Left Width",
                        Description = "Left border width in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = 0,
                        MaxValue = 100,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "horizontal",
                        DisplayName = "Horizontal Width",
                        Description = "Left and right border width in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = 0,
                        MaxValue = 100,
                        Unit = "pt",
                    },
                    new PropertyDefinition
                    {
                        Name = "vertical",
                        DisplayName = "Vertical Width",
                        Description = "Top and bottom border width in points",
                        Type = PropertyType.Float,
                        IsRequired = false,
                        MinValue = 0,
                        MaxValue = 100,
                        Unit = "pt",
                    },
                ],
                QuestPdfApi = "container.Border(1)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Background,
                Name = "Background",
                Description = "Background color fill",
                Category = "Styling",
                PriorityTier = 1,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["color"],
                OptionalProperties = [],
                PropertyDefinitions =
                [
                    new PropertyDefinition
                    {
                        Name = "color",
                        DisplayName = "Color",
                        Description = "Background color in hex format or color name",
                        Type = PropertyType.Color,
                        IsRequired = true,
                        Examples = ["#FFFFFF", "#F0F0F0", "lightgray", "{{data.themeColor}}"],
                    },
                ],
                QuestPdfApi = "container.Background(color)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.RoundedCorners,
                Name = "RoundedCorners",
                Description = "Rounded corner borders",
                Category = "Styling",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["radius", "topLeft", "topRight", "bottomLeft", "bottomRight"],
                QuestPdfApi = "Custom implementation",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Shadow,
                Name = "Shadow",
                Description = "Drop shadow effect",
                Category = "Styling",
                PriorityTier = 3,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["color", "blur", "spread", "offsetX", "offsetY"],
                QuestPdfApi = "container.Shadow(BoxShadowStyle)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.DefaultTextStyle,
                Name = "DefaultTextStyle",
                Description = "Text style inheritance for child elements",
                Category = "Styling",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties =
                [
                    "fontSize",
                    "fontFamily",
                    "fontWeight",
                    "color",
                    "lineHeight",
                ],
                QuestPdfApi = "container.DefaultTextStyle(x => ...)",
            }
        );

        // ========================================
        // Sizing Components
        // ========================================
        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Width,
                Name = "Width",
                Description =
                    "Fixed or constrained width. Supports fixed, min, and max width constraints.",
                Category = "Sizing",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["value"],
                OptionalProperties = ["type", "unit"],
                QuestPdfApi = "container.Width(100) / MinWidth(100) / MaxWidth(100)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Height,
                Name = "Height",
                Description =
                    "Fixed or constrained height. Supports fixed, min, and max height constraints.",
                Category = "Sizing",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["value"],
                OptionalProperties = ["type", "unit"],
                QuestPdfApi = "container.Height(50) / MinHeight(50) / MaxHeight(50)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.MinWidth,
                Name = "MinWidth",
                Description = "Minimum width constraint",
                Category = "Sizing",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["value"],
                OptionalProperties = ["unit"],
                QuestPdfApi = "container.MinWidth(100)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.MaxWidth,
                Name = "MaxWidth",
                Description = "Maximum width constraint",
                Category = "Sizing",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["value"],
                OptionalProperties = ["unit"],
                QuestPdfApi = "container.MaxWidth(200)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.MinHeight,
                Name = "MinHeight",
                Description = "Minimum height constraint",
                Category = "Sizing",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["value"],
                OptionalProperties = ["unit"],
                QuestPdfApi = "container.MinHeight(50)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.MaxHeight,
                Name = "MaxHeight",
                Description = "Maximum height constraint",
                Category = "Sizing",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["value"],
                OptionalProperties = ["unit"],
                QuestPdfApi = "container.MaxHeight(100)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Alignment,
                Name = "Alignment",
                Description =
                    "Horizontal and vertical content alignment. Supports 9 positions combining horizontal (left, center, right) and vertical (top, middle, bottom) alignment.",
                Category = "Sizing",
                PriorityTier = 2,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["horizontal", "vertical", "position"],
                QuestPdfApi =
                    "container.AlignLeft() / AlignCenter() / AlignRight() / AlignTop() / AlignMiddle() / AlignBottom()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.AspectRatio,
                Name = "AspectRatio",
                Description = "Maintain aspect ratio of content",
                Category = "Sizing",
                PriorityTier = 3,
                SupportsChildren = false,
                IsWrapper = true,
                RequiredProperties = ["ratio"],
                OptionalProperties = ["option"],
                QuestPdfApi = "container.AspectRatio(16/9f, AspectRatioOption.FitWidth)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Extend,
                Name = "Extend",
                Description = "Extend to fill available space",
                Category = "Sizing",
                PriorityTier = 3,
                SupportsChildren = false,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["direction"],
                QuestPdfApi = "container.Extend()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Shrink,
                Name = "Shrink",
                Description = "Shrink to minimum required size",
                Category = "Sizing",
                PriorityTier = 3,
                SupportsChildren = false,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["direction"],
                QuestPdfApi = "container.Shrink()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Unconstrained,
                Name = "Unconstrained",
                Description = "Remove size constraints from parent",
                Category = "Sizing",
                PriorityTier = 4,
                SupportsChildren = false,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "container.Unconstrained()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Constrained,
                Name = "Constrained",
                Description = "Constrain content within min/max bounds",
                Category = "Sizing",
                PriorityTier = 4,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["minWidth", "maxWidth", "minHeight", "maxHeight"],
                QuestPdfApi = "container.Constrained()",
            }
        );

        // ========================================
        // Transformation Components
        // ========================================
        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Rotate,
                Name = "Rotate",
                Description = "Rotation transform",
                Category = "Transformation",
                PriorityTier = 3,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["angle"],
                OptionalProperties = ["originX", "originY"],
                QuestPdfApi = "container.Rotate(45)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Scale,
                Name = "Scale",
                Description = "Scale transform (uniform or non-uniform)",
                Category = "Transformation",
                PriorityTier = 3,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["factor", "x", "y"],
                QuestPdfApi = "container.Scale(1.5f)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.ScaleToFit,
                Name = "ScaleToFit",
                Description = "Auto-scale content to fit available space",
                Category = "Transformation",
                PriorityTier = 4,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "container.ScaleToFit()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Translate,
                Name = "Translate",
                Description = "Position offset/translation",
                Category = "Transformation",
                PriorityTier = 3,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["x", "y"],
                QuestPdfApi = "container.Translate(10, 20)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Flip,
                Name = "Flip",
                Description = "Mirror/flip horizontally or vertically",
                Category = "Transformation",
                PriorityTier = 4,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["horizontal", "vertical"],
                QuestPdfApi = "container.FlipHorizontal() / FlipVertical()",
            }
        );

        // ========================================
        // Flow Control Components
        // ========================================
        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.PageBreak,
                Name = "PageBreak",
                Description = "Force a new page",
                Category = "FlowControl",
                PriorityTier = 1,
                SupportsChildren = false,
                IsWrapper = false,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "container.PageBreak()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.EnsureSpace,
                Name = "EnsureSpace",
                Description = "Ensure minimum space or break to new page",
                Category = "FlowControl",
                PriorityTier = 3,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["space"],
                OptionalProperties = [],
                QuestPdfApi = "container.EnsureSpace(100)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.ShowEntire,
                Name = "ShowEntire",
                Description = "Keep content together (prevent breaking)",
                Category = "FlowControl",
                PriorityTier = 3,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "container.ShowEntire()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.StopPaging,
                Name = "StopPaging",
                Description = "Prevent content from paginating",
                Category = "FlowControl",
                PriorityTier = 4,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "container.StopPaging()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Section,
                Name = "Section",
                Description = "Named section for table of contents",
                Category = "FlowControl",
                PriorityTier = 3,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["name"],
                OptionalProperties = [],
                QuestPdfApi = "container.Section(\"name\")",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.Repeat,
                Name = "Repeat",
                Description = "Repeat content on every page",
                Category = "FlowControl",
                PriorityTier = 4,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "Custom implementation",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.ShowOnce,
                Name = "ShowOnce",
                Description = "Show content only on first page",
                Category = "FlowControl",
                PriorityTier = 4,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "container.ShowOnce()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.SkipOnce,
                Name = "SkipOnce",
                Description = "Skip content on first page",
                Category = "FlowControl",
                PriorityTier = 4,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "container.SkipOnce()",
            }
        );

        // ========================================
        // Special/Debug Components
        // ========================================
        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.ContentDirection,
                Name = "ContentDirection",
                Description =
                    "Set content direction (LTR/RTL) for proper text alignment and content organization with different languages",
                Category = "Special",
                PriorityTier = 4,
                SupportsChildren = false,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["direction"],
                QuestPdfApi = "container.ContentFromRightToLeft() / ContentFromLeftToRight()",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.ZIndex,
                Name = "ZIndex",
                Description =
                    "Control layer stacking order - higher values rendered above lower values",
                Category = "Special",
                PriorityTier = 4,
                SupportsChildren = false,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["value"],
                QuestPdfApi = "container.ZIndex(value)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.DebugArea,
                Name = "DebugArea",
                Description =
                    "Visual debug helper that draws a labeled box around content for layout debugging",
                Category = "Special",
                PriorityTier = 4,
                SupportsChildren = false,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = ["label", "color"],
                QuestPdfApi = "container.DebugArea(\"label\", color)",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.DebugPointer,
                Name = "DebugPointer",
                Description = "Debug pointer for precise positioning",
                Category = "Special",
                PriorityTier = 4,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "container.DebugPointer()",
            }
        );

        // ========================================
        // Conditional Components
        // ========================================
        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.ShowIf,
                Name = "ShowIf",
                Description = "Conditionally show content based on expression",
                Category = "Conditional",
                PriorityTier = 3,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = ["condition"],
                OptionalProperties = [],
                QuestPdfApi = "Custom implementation with ShowIf",
            }
        );

        RegisterComponent(
            new ComponentMetadata
            {
                Type = ComponentType.PreventPageBreak,
                Name = "PreventPageBreak",
                Description = "Prevent page break within content",
                Category = "Conditional",
                PriorityTier = 3,
                SupportsChildren = true,
                IsWrapper = true,
                RequiredProperties = [],
                OptionalProperties = [],
                QuestPdfApi = "container.PreventPageBreak()",
            }
        );
    }

    /// <summary>
    /// Registers a component with the registry.
    /// </summary>
    private void RegisterComponent(ComponentMetadata metadata)
    {
        _components[metadata.Type] = metadata;
    }

    /// <summary>
    /// Creates default metadata for unregistered component types.
    /// </summary>
    private static ComponentMetadata CreateDefaultMetadata(ComponentType componentType)
    {
        return new ComponentMetadata
        {
            Type = componentType,
            Name = componentType.ToString(),
            Description = $"Component type {componentType}",
            Category = componentType.GetCategory(),
            PriorityTier = componentType.GetPriorityTier(),
            SupportsChildren = componentType.IsContainer(),
            IsWrapper = componentType.IsWrapper(),
            RequiredProperties = [],
            OptionalProperties = [],
            PropertyDefinitions = [],
            QuestPdfApi = "Unknown",
        };
    }
}

/// <summary>
/// Metadata describing a PDF component type.
/// Provides comprehensive information about component capabilities,
/// properties, and validation rules.
/// </summary>
public sealed class ComponentMetadata
{
    /// <summary>
    /// Gets or sets the component type.
    /// </summary>
    public required ComponentType Type { get; init; }

    /// <summary>
    /// Gets or sets the display name.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets or sets the component description.
    /// </summary>
    public required string Description { get; init; }

    /// <summary>
    /// Gets or sets the component category.
    /// </summary>
    public required string Category { get; init; }

    /// <summary>
    /// Gets or sets the implementation priority tier (1-4).
    /// 1 = Essential (MVP), 2 = Common, 3 = Advanced, 4 = Specialized.
    /// </summary>
    public required int PriorityTier { get; init; }

    /// <summary>
    /// Gets or sets whether the component supports child nodes.
    /// </summary>
    public required bool SupportsChildren { get; init; }

    /// <summary>
    /// Gets or sets whether the component wraps a single child.
    /// </summary>
    public required bool IsWrapper { get; init; }

    /// <summary>
    /// Gets or sets the required property names.
    /// </summary>
    public required string[] RequiredProperties { get; init; }

    /// <summary>
    /// Gets or sets the optional property names.
    /// </summary>
    public required string[] OptionalProperties { get; init; }

    /// <summary>
    /// Gets or sets detailed property definitions with type information and validation rules.
    /// </summary>
    public PropertyDefinition[] PropertyDefinitions { get; init; } = [];

    /// <summary>
    /// Gets or sets the QuestPDF API reference.
    /// </summary>
    public required string QuestPdfApi { get; init; }

    /// <summary>
    /// Gets all property names (both required and optional).
    /// </summary>
    public IEnumerable<string> AllPropertyNames =>
        RequiredProperties.Concat(OptionalProperties).Distinct();
}

/// <summary>
/// Defines metadata for a component property including type, constraints, and validation rules.
/// </summary>
public sealed class PropertyDefinition
{
    /// <summary>
    /// Gets or sets the property name.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets or sets the property display name (human-readable).
    /// </summary>
    public string? DisplayName { get; init; }

    /// <summary>
    /// Gets or sets the property description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets or sets the property data type.
    /// </summary>
    public required PropertyType Type { get; init; }

    /// <summary>
    /// Gets or sets whether the property is required.
    /// </summary>
    public bool IsRequired { get; init; }

    /// <summary>
    /// Gets or sets the default value for the property.
    /// </summary>
    public object? DefaultValue { get; init; }

    /// <summary>
    /// Gets or sets the minimum value for numeric properties.
    /// </summary>
    public float? MinValue { get; init; }

    /// <summary>
    /// Gets or sets the maximum value for numeric properties.
    /// </summary>
    public float? MaxValue { get; init; }

    /// <summary>
    /// Gets or sets the minimum length for string properties.
    /// </summary>
    public int? MinLength { get; init; }

    /// <summary>
    /// Gets or sets the maximum length for string properties.
    /// </summary>
    public int? MaxLength { get; init; }

    /// <summary>
    /// Gets or sets the allowed values for enum properties.
    /// </summary>
    public string[]? AllowedValues { get; init; }

    /// <summary>
    /// Gets or sets the regex pattern for string validation.
    /// </summary>
    public string? Pattern { get; init; }

    /// <summary>
    /// Gets or sets whether the property supports expressions ({{ }}).
    /// </summary>
    public bool SupportsExpressions { get; init; } = true;

    /// <summary>
    /// Gets or sets the unit type for numeric values (e.g., "pt", "mm", "in").
    /// </summary>
    public string? Unit { get; init; }

    /// <summary>
    /// Gets or sets example values for documentation.
    /// </summary>
    public string[]? Examples { get; init; }
}

/// <summary>
/// Enumeration of property data types.
/// </summary>
public enum PropertyType
{
    /// <summary>String value.</summary>
    String,

    /// <summary>Integer value.</summary>
    Integer,

    /// <summary>Floating-point number.</summary>
    Float,

    /// <summary>Generic number (int or float).</summary>
    Number,

    /// <summary>Boolean value.</summary>
    Boolean,

    /// <summary>Color value (hex, name, or rgba).</summary>
    Color,

    /// <summary>URL or URI value.</summary>
    Url,

    /// <summary>Enumerated value from a fixed set.</summary>
    Enum,

    /// <summary>JSON object.</summary>
    Object,

    /// <summary>JSON array.</summary>
    Array,

    /// <summary>Expression string ({{ expression }}).</summary>
    Expression,
}

/// <summary>
/// Represents a validation error for a layout node.
/// </summary>
public sealed class ValidationError
{
    /// <summary>
    /// Gets or sets the property name that has the error.
    /// </summary>
    public required string PropertyName { get; init; }

    /// <summary>
    /// Gets or sets the type of validation error.
    /// </summary>
    public required ValidationErrorType ErrorType { get; init; }

    /// <summary>
    /// Gets or sets the error message.
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// Gets or sets the component type.
    /// </summary>
    public required ComponentType ComponentType { get; init; }

    /// <summary>
    /// Gets or sets the node ID (if available).
    /// </summary>
    public string? NodeId { get; init; }

    /// <summary>
    /// Gets or sets the severity of the error.
    /// </summary>
    public ValidationSeverity Severity { get; init; } = ValidationSeverity.Error;

    /// <summary>
    /// Gets or sets the expected type (for type mismatch errors).
    /// </summary>
    public string? ExpectedType { get; init; }

    /// <summary>
    /// Gets or sets the actual value that caused the error.
    /// </summary>
    public string? ActualValue { get; init; }

    /// <summary>
    /// Gets or sets the allowed values (for enum validation errors).
    /// </summary>
    public string[]? AllowedValues { get; init; }

    /// <summary>
    /// Returns a string representation of the error.
    /// </summary>
    public override string ToString()
    {
        var prefix = Severity == ValidationSeverity.Warning ? "Warning" : "Error";
        return $"[{prefix}] {ComponentType}.{PropertyName}: {Message}";
    }
}

/// <summary>
/// Types of validation errors.
/// </summary>
public enum ValidationErrorType
{
    /// <summary>Required property is missing.</summary>
    MissingRequired,

    /// <summary>Property has wrong type.</summary>
    InvalidType,

    /// <summary>Property value is invalid.</summary>
    InvalidValue,

    /// <summary>Property value is out of allowed range.</summary>
    OutOfRange,

    /// <summary>Property value has invalid format.</summary>
    InvalidFormat,

    /// <summary>Property is not known for this component.</summary>
    UnknownProperty,

    /// <summary>Component structure is invalid.</summary>
    InvalidStructure,

    /// <summary>Expression syntax is invalid.</summary>
    InvalidExpression,
}
