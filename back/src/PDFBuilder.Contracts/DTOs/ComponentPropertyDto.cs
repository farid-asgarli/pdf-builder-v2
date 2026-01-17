using System.Text.Json;

namespace PDFBuilder.Contracts.DTOs;

/// <summary>
/// Represents a single component property with its value and metadata.
/// Used for detailed property inspection and validation.
/// </summary>
public class ComponentPropertyDto
{
    /// <summary>
    /// Gets or sets the property name.
    /// </summary>
    /// <example>spacing</example>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the property value as a JSON element.
    /// Can be a primitive, object, or expression string.
    /// </summary>
    public JsonElement? Value { get; set; }

    /// <summary>
    /// Gets or sets the property value as a string representation.
    /// Useful for display and logging purposes.
    /// </summary>
    public string? ValueString { get; set; }

    /// <summary>
    /// Gets or sets the expected type of this property.
    /// </summary>
    /// <example>number</example>
    public string? ExpectedType { get; set; }

    /// <summary>
    /// Gets or sets whether this property is required.
    /// </summary>
    public bool IsRequired { get; set; }

    /// <summary>
    /// Gets or sets whether this property contains an expression.
    /// </summary>
    public bool IsExpression { get; set; }

    /// <summary>
    /// Gets or sets the expression content if IsExpression is true.
    /// </summary>
    /// <example>data.customer.name</example>
    public string? ExpressionContent { get; set; }
}

/// <summary>
/// Metadata describing a component type and its available properties.
/// Used by the component registry for validation and documentation.
/// </summary>
public class ComponentMetadataDto
{
    /// <summary>
    /// Gets or sets the component type name.
    /// </summary>
    /// <example>Column</example>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the component category.
    /// </summary>
    /// <example>Container</example>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the component description.
    /// </summary>
    /// <example>Vertical stacking container with optional spacing.</example>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets whether this component accepts children.
    /// </summary>
    public bool AcceptsChildren { get; set; }

    /// <summary>
    /// Gets or sets whether this component accepts a single child.
    /// </summary>
    public bool AcceptsChild { get; set; }

    /// <summary>
    /// Gets or sets the list of available properties for this component.
    /// </summary>
    public List<PropertyMetadataDto> Properties { get; set; } = [];

    /// <summary>
    /// Gets or sets example usage JSON.
    /// </summary>
    public string? ExampleJson { get; set; }
}

/// <summary>
/// Metadata describing a single property definition for a component.
/// </summary>
public class PropertyMetadataDto
{
    /// <summary>
    /// Gets or sets the property name.
    /// </summary>
    /// <example>spacing</example>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the property type.
    /// </summary>
    /// <example>number</example>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the property description.
    /// </summary>
    /// <example>Space between child elements in points.</example>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets whether this property is required.
    /// </summary>
    public bool IsRequired { get; set; }

    /// <summary>
    /// Gets or sets the default value if not specified.
    /// </summary>
    public object? DefaultValue { get; set; }

    /// <summary>
    /// Gets or sets whether this property supports expression binding.
    /// </summary>
    public bool SupportsExpression { get; set; } = true;

    /// <summary>
    /// Gets or sets validation constraints (min, max, pattern, etc.).
    /// </summary>
    public Dictionary<string, object>? Constraints { get; set; }

    /// <summary>
    /// Gets or sets allowed values for enum-like properties.
    /// </summary>
    public List<string>? AllowedValues { get; set; }
}
