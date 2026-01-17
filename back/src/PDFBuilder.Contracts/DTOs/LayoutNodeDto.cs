using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace PDFBuilder.Contracts.DTOs;

/// <summary>
/// Data transfer object representing a node in the PDF layout tree structure.
/// This is the primary schema for JSON layout definitions.
/// </summary>
public class LayoutNodeDto
{
    /// <summary>
    /// Gets or sets the unique identifier of this node within the layout tree.
    /// Optional - used for debugging and error reporting.
    /// </summary>
    /// <example>header-section</example>
    [StringLength(100, ErrorMessage = "Node ID cannot exceed 100 characters")]
    public string? Id { get; set; }

    /// <summary>
    /// Gets or sets the component type of this node.
    /// Must be a valid component type string (e.g., "Column", "Row", "Text").
    /// </summary>
    /// <example>Column</example>
    [Required(ErrorMessage = "Component type is required")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the component-specific properties.
    /// Properties can contain expressions using {{ expression }} syntax.
    /// </summary>
    /// <example>{"spacing": 10, "content": "{{ data.title }}"}</example>
    public Dictionary<string, JsonElement>? Properties { get; set; }

    /// <summary>
    /// Gets or sets the child nodes for container components.
    /// Used by Column, Row, Table, and other container components.
    /// </summary>
    public List<LayoutNodeDto>? Children { get; set; }

    /// <summary>
    /// Gets or sets the single child node for wrapper components.
    /// Used by styling, sizing, and transformation components.
    /// </summary>
    public LayoutNodeDto? Child { get; set; }

    /// <summary>
    /// Gets or sets the style properties that apply to this node and its children.
    /// Supports style inheritance down the tree.
    /// </summary>
    public StylePropertiesDto? Style { get; set; }

    /// <summary>
    /// Gets or sets a conditional expression that determines if this node should be rendered.
    /// Uses {{ expression }} syntax, must evaluate to boolean.
    /// </summary>
    /// <example>{{ data.showHeader }}</example>
    [StringLength(500, ErrorMessage = "Visible expression cannot exceed 500 characters")]
    public string? Visible { get; set; }

    /// <summary>
    /// Gets or sets the data binding path for repeating this node.
    /// When set, the node will be repeated for each item in the bound array.
    /// Uses {{ expression }} syntax to reference a collection.
    /// </summary>
    /// <example>{{ data.items }}</example>
    [StringLength(500, ErrorMessage = "RepeatFor expression cannot exceed 500 characters")]
    public string? RepeatFor { get; set; }

    /// <summary>
    /// Gets or sets the variable name to use when iterating with RepeatFor.
    /// Default is "item" if not specified.
    /// </summary>
    /// <example>item</example>
    [StringLength(50, ErrorMessage = "RepeatAs variable name cannot exceed 50 characters")]
    [RegularExpression(
        @"^[a-zA-Z_][a-zA-Z0-9_]*$",
        ErrorMessage = "RepeatAs must be a valid identifier"
    )]
    public string? RepeatAs { get; set; }

    /// <summary>
    /// Gets or sets the index variable name when iterating with RepeatFor.
    /// Default is "index" if not specified.
    /// </summary>
    /// <example>index</example>
    [StringLength(50, ErrorMessage = "RepeatIndex variable name cannot exceed 50 characters")]
    [RegularExpression(
        @"^[a-zA-Z_][a-zA-Z0-9_]*$",
        ErrorMessage = "RepeatIndex must be a valid identifier"
    )]
    public string? RepeatIndex { get; set; }
}
