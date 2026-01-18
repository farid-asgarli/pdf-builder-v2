using System.Text.Json;
using System.Text.Json.Serialization;

namespace PDFBuilder.Core.Domain;

/// <summary>
/// Represents a node in the PDF layout tree structure.
/// Each node corresponds to a component that will be rendered in the PDF.
/// </summary>
public class LayoutNode
{
    /// <summary>
    /// Gets or sets the unique identifier of this node within the layout tree.
    /// Optional - used for debugging and error reporting.
    /// </summary>
    public string? Id { get; set; }

    /// <summary>
    /// Gets or sets the component type of this node.
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ComponentType Type { get; set; }

    /// <summary>
    /// Gets or sets the component-specific properties as a dynamic dictionary.
    /// Properties can contain expressions using {{ expression }} syntax.
    /// </summary>
    public Dictionary<string, JsonElement>? Properties { get; set; }

    /// <summary>
    /// Gets or sets the child nodes for container components.
    /// </summary>
    public List<LayoutNode>? Children { get; set; }

    /// <summary>
    /// Gets or sets the single child node for wrapper components.
    /// Used by styling, sizing, and transformation components.
    /// </summary>
    public LayoutNode? Child { get; set; }

    /// <summary>
    /// Gets or sets the style properties that apply to this node and its children.
    /// Supports style inheritance down the tree.
    /// </summary>
    public StyleProperties? Style { get; set; }

    /// <summary>
    /// Gets or sets a conditional expression that determines if this node should be rendered.
    /// Uses {{ expression }} syntax, must evaluate to boolean.
    /// </summary>
    public string? Visible { get; set; }

    /// <summary>
    /// Gets or sets the data binding path for repeating this node.
    /// When set, the node will be repeated for each item in the bound array.
    /// Uses {{ expression }} syntax to reference a collection.
    /// </summary>
    public string? RepeatFor { get; set; }

    /// <summary>
    /// Gets or sets the variable name to use when iterating with RepeatFor.
    /// Default is "item" if not specified.
    /// </summary>
    public string? RepeatAs { get; set; }

    /// <summary>
    /// Gets or sets the index variable name when iterating with RepeatFor.
    /// Default is "index" if not specified.
    /// </summary>
    public string? RepeatIndex { get; set; }

    /// <summary>
    /// Gets a property value as the specified type.
    /// </summary>
    /// <typeparam name="T">The type to convert the property to.</typeparam>
    /// <param name="propertyName">The name of the property.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The property value or default.</returns>
    public T? GetProperty<T>(string propertyName, T? defaultValue = default)
    {
        if (Properties is null || !Properties.TryGetValue(propertyName, out var element))
        {
            return defaultValue;
        }

        try
        {
            return element.Deserialize<T>();
        }
        catch
        {
            return defaultValue;
        }
    }

    /// <summary>
    /// Gets a property value as a string.
    /// If the property contains an expression, it will be returned as-is for evaluation.
    /// </summary>
    /// <param name="propertyName">The name of the property.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The property value as string or default.</returns>
    public string? GetStringProperty(string propertyName, string? defaultValue = null)
    {
        if (Properties is null || !Properties.TryGetValue(propertyName, out var element))
        {
            return defaultValue;
        }

        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.GetRawText(),
            JsonValueKind.True => "true",
            JsonValueKind.False => "false",
            JsonValueKind.Null => null,
            _ => element.GetRawText(),
        };
    }

    /// <summary>
    /// Gets a property value as a float.
    /// </summary>
    /// <param name="propertyName">The name of the property.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The property value as float or default.</returns>
    public float? GetFloatProperty(string propertyName, float? defaultValue = null)
    {
        if (Properties is null || !Properties.TryGetValue(propertyName, out var element))
        {
            return defaultValue;
        }

        return element.ValueKind switch
        {
            JsonValueKind.Number => element.GetSingle(),
            JsonValueKind.String when float.TryParse(element.GetString(), out var value) => value,
            _ => defaultValue,
        };
    }

    /// <summary>
    /// Gets a property value as an integer.
    /// </summary>
    /// <param name="propertyName">The name of the property.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The property value as int or default.</returns>
    public int? GetIntProperty(string propertyName, int? defaultValue = null)
    {
        if (Properties is null || !Properties.TryGetValue(propertyName, out var element))
        {
            return defaultValue;
        }

        return element.ValueKind switch
        {
            JsonValueKind.Number => element.GetInt32(),
            JsonValueKind.String when int.TryParse(element.GetString(), out var value) => value,
            _ => defaultValue,
        };
    }

    /// <summary>
    /// Gets a property value as a boolean.
    /// </summary>
    /// <param name="propertyName">The name of the property.</param>
    /// <param name="defaultValue">The default value if property doesn't exist.</param>
    /// <returns>The property value as bool or default.</returns>
    public bool? GetBoolProperty(string propertyName, bool? defaultValue = null)
    {
        if (Properties is null || !Properties.TryGetValue(propertyName, out var element))
        {
            return defaultValue;
        }

        return element.ValueKind switch
        {
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.String when bool.TryParse(element.GetString(), out var value) => value,
            _ => defaultValue,
        };
    }

    /// <summary>
    /// Checks if a property exists.
    /// </summary>
    /// <param name="propertyName">The name of the property.</param>
    /// <returns>True if the property exists; otherwise, false.</returns>
    public bool HasProperty(string propertyName)
    {
        return Properties?.ContainsKey(propertyName) ?? false;
    }

    /// <summary>
    /// Checks if a property value contains an expression ({{ }}).
    /// </summary>
    /// <param name="propertyName">The name of the property.</param>
    /// <returns>True if the property contains an expression; otherwise, false.</returns>
    public bool IsExpression(string propertyName)
    {
        var value = GetStringProperty(propertyName);
        return value is not null && value.Contains("{{") && value.Contains("}}");
    }

    /// <summary>
    /// Gets the effective children - either Children list or single Child wrapped in a list.
    /// </summary>
    /// <returns>An enumerable of child nodes.</returns>
    public IEnumerable<LayoutNode> GetEffectiveChildren()
    {
        if (Children is not null && Children.Count > 0)
        {
            return Children;
        }

        if (Child is not null)
        {
            return [Child];
        }

        return [];
    }

    /// <summary>
    /// Creates a deep clone of this layout node.
    /// </summary>
    /// <returns>A deep clone of the node.</returns>
    public LayoutNode Clone()
    {
        return new LayoutNode
        {
            Id = Id,
            Type = Type,
            Properties = Properties is not null
                ? new Dictionary<string, JsonElement>(Properties)
                : null,
            Children = Children?.Select(c => c.Clone()).ToList(),
            Child = Child?.Clone(),
            Style = Style?.Clone(),
            Visible = Visible,
            RepeatFor = RepeatFor,
            RepeatAs = RepeatAs,
            RepeatIndex = RepeatIndex,
        };
    }

    /// <summary>
    /// Determines if this node contains any flow control components that may cause issues in non-paginating slots.
    /// Non-paginating slots (header, footer, background, foreground) do not support page breaks.
    /// </summary>
    /// <returns>True if the node tree contains flow control components that require pagination.</returns>
    public bool ContainsPaginationDependentComponents()
    {
        // Check if this node is a pagination-dependent component
        if (
            Type
            is ComponentType.PageBreak
                or ComponentType.EnsureSpace
                or ComponentType.StopPaging
                or ComponentType.ShowOnce
                or ComponentType.SkipOnce
        )
        {
            return true;
        }

        // Recursively check children
        if (Children is not null)
        {
            foreach (var child in Children)
            {
                if (child.ContainsPaginationDependentComponents())
                {
                    return true;
                }
            }
        }

        // Check single child
        if (Child?.ContainsPaginationDependentComponents() == true)
        {
            return true;
        }

        return false;
    }

    /// <summary>
    /// Gets a list of all pagination-dependent component types found in this node tree.
    /// Useful for validation error messages.
    /// </summary>
    /// <returns>A list of component types that depend on pagination.</returns>
    public IReadOnlyList<ComponentType> GetPaginationDependentComponents()
    {
        var result = new List<ComponentType>();
        CollectPaginationDependentComponents(this, result);
        return result;
    }

    private static void CollectPaginationDependentComponents(
        LayoutNode node,
        List<ComponentType> result
    )
    {
        if (
            node.Type
            is ComponentType.PageBreak
                or ComponentType.EnsureSpace
                or ComponentType.StopPaging
                or ComponentType.ShowOnce
                or ComponentType.SkipOnce
        )
        {
            if (!result.Contains(node.Type))
            {
                result.Add(node.Type);
            }
        }

        if (node.Children is not null)
        {
            foreach (var child in node.Children)
            {
                CollectPaginationDependentComponents(child, result);
            }
        }

        if (node.Child is not null)
        {
            CollectPaginationDependentComponents(node.Child, result);
        }
    }

    /// <summary>
    /// Returns a string representation of the node for debugging.
    /// </summary>
    /// <returns>A debug string.</returns>
    public override string ToString()
    {
        var id = Id is not null ? $"#{Id}" : "";
        var childCount = Children?.Count ?? (Child is not null ? 1 : 0);
        return $"LayoutNode[{Type}{id}] (Children: {childCount})";
    }
}

/// <summary>
/// Represents a table row in the layout structure.
/// </summary>
public class TableRow
{
    /// <summary>
    /// Gets or sets the cells in this row.
    /// </summary>
    public List<LayoutNode>? Cells { get; set; }

    /// <summary>
    /// Gets or sets whether this is a header row.
    /// </summary>
    public bool IsHeader { get; set; }

    /// <summary>
    /// Gets or sets whether this is a footer row.
    /// </summary>
    public bool IsFooter { get; set; }

    /// <summary>
    /// Gets or sets the row-specific style.
    /// </summary>
    public StyleProperties? Style { get; set; }
}

/// <summary>
/// Represents a table column definition.
/// </summary>
public class TableColumn
{
    /// <summary>
    /// Gets or sets the column width (in points or relative units).
    /// </summary>
    public float? Width { get; set; }

    /// <summary>
    /// Gets or sets whether the column width is relative (proportional).
    /// </summary>
    public bool IsRelative { get; set; }

    /// <summary>
    /// Gets or sets the minimum width.
    /// </summary>
    public float? MinWidth { get; set; }

    /// <summary>
    /// Gets or sets the maximum width.
    /// </summary>
    public float? MaxWidth { get; set; }
}

/// <summary>
/// Represents cell-specific properties for table cells.
/// </summary>
public class CellProperties
{
    /// <summary>
    /// Gets or sets the number of rows this cell spans.
    /// </summary>
    public int RowSpan { get; set; } = 1;

    /// <summary>
    /// Gets or sets the number of columns this cell spans.
    /// </summary>
    public int ColumnSpan { get; set; } = 1;

    /// <summary>
    /// Gets or sets the cell-specific style.
    /// </summary>
    public StyleProperties? Style { get; set; }
}
