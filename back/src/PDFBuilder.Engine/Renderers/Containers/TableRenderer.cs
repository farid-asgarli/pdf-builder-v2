using System.Text.Json;
using PDFBuilder.Core.Domain;
using PDFBuilder.Core.Interfaces;
using PDFBuilder.Engine.Renderers.Base;
using PDFBuilder.Engine.Services;
using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace PDFBuilder.Engine.Renderers.Containers;

/// <summary>
/// Renders a Table container component with a grid layout of rows and columns.
/// Supports cell spanning (rowspan/colspan), repeating headers on page breaks, and table footers.
/// </summary>
/// <remarks>
/// QuestPDF Table API: container.Table(table => { table.ColumnsDefinition(...); table.Cell()... })
///
/// Properties:
/// - columns (array): Column definitions. Each can be:
///   - { type: "constant", width: number } - Fixed width column
///   - { type: "relative", weight: number } - Proportional width column (default weight: 1)
/// - rows (array): Array of row objects, each containing:
///   - cells (array): Array of cell objects for the row
///     - Each cell is a layout node that will be rendered in the cell
///     - Cell can have additional properties: rowSpan, columnSpan, row, column
/// - header (object): Optional header section that repeats on every page
///   - Contains same structure as rows, with cells array
/// - footer (object): Optional footer section that repeats on every page
///   - Contains same structure as rows, with cells array
///
/// Cell Spanning:
/// - rowSpan: Number of rows this cell should span (default: 1)
/// - columnSpan: Number of columns this cell should span (default: 1)
///
/// Manual Cell Placement (optional):
/// - row: Explicit 1-based row position
/// - column: Explicit 1-based column position
///
/// Supports automatic page breaks with content continuation.
/// Headers automatically repeat at the top of each new page.
/// </remarks>
/// <remarks>
/// Initializes a new instance of the <see cref="TableRenderer"/> class.
/// </remarks>
/// <param name="expressionEvaluator">The expression evaluator for dynamic content.</param>
/// <param name="styleResolver">The style resolver for style inheritance.</param>
/// <param name="logger">The logger instance.</param>
public sealed class TableRenderer(
    IExpressionEvaluator expressionEvaluator,
    StyleResolver styleResolver,
    ILogger<TableRenderer> logger
) : BaseRenderer(expressionEvaluator, styleResolver, logger)
{
    /// <summary>
    /// Property name constants for type safety and documentation.
    /// </summary>
    private static class PropertyNames
    {
        public const string Columns = "columns";
        public const string Rows = "rows";
        public const string Header = "header";
        public const string Footer = "footer";

        // Column-level properties
        public const string ColumnType = "type";
        public const string ColumnWidth = "width";
        public const string ColumnWeight = "weight";

        // Cell-level properties
        public const string Cells = "cells";
        public const string RowSpan = "rowSpan";
        public const string ColumnSpan = "columnSpan";
        public const string Row = "row";
        public const string Column = "column";

        // Cell content property (when cell is wrapped with span info)
        public const string Content = "content";
    }

    /// <summary>
    /// Supported column types.
    /// </summary>
    private static class ColumnTypes
    {
        public const string Constant = "constant";
        public const string Relative = "relative";
    }

    /// <inheritdoc />
    public override ComponentType ComponentType => ComponentType.Table;

    /// <inheritdoc />
    public override RendererCategory Category => RendererCategory.Container;

    /// <inheritdoc />
    public override bool SupportsChildren => false; // Table uses structured rows/cells, not Children

    /// <inheritdoc />
    public override bool IsWrapper => false;

    /// <inheritdoc />
    public override IEnumerable<string> GetRequiredProperties()
    {
        return [PropertyNames.Columns];
    }

    /// <inheritdoc />
    protected override void RenderCore(
        IContainer container,
        LayoutNode node,
        RenderContext context,
        ILayoutEngine layoutEngine,
        StyleProperties resolvedStyle
    )
    {
        // Extract column definitions
        var columns = GetColumnDefinitions(node, context);
        var rows = GetRowDefinitions(node, context);
        var headerRows = GetHeaderDefinitions(node, context);
        var footerRows = GetFooterDefinitions(node, context);

        Logger.LogTrace(
            "Rendering Table with {ColumnCount} columns, {RowCount} rows, {HeaderRowCount} header rows, and {FooterRowCount} footer rows",
            columns.Count,
            rows.Count,
            headerRows.Count,
            footerRows.Count
        );

        if (columns.Count == 0)
        {
            Logger.LogWarning(
                "Table node {NodeId} has no column definitions - skipping render",
                node.Id ?? "unnamed"
            );
            return;
        }

        container.Table(table =>
        {
            // Define columns
            table.ColumnsDefinition(columnsDescriptor =>
            {
                foreach (var column in columns)
                {
                    if (column.IsConstant)
                    {
                        columnsDescriptor.ConstantColumn(column.Width);
                        Logger.LogTrace("Added constant column with width={Width}", column.Width);
                    }
                    else
                    {
                        columnsDescriptor.RelativeColumn(column.Weight);
                        Logger.LogTrace(
                            "Added relative column with weight={Weight}",
                            column.Weight
                        );
                    }
                }
            });

            // Render header section (repeats on every page)
            if (headerRows.Count > 0)
            {
                table.Header(header =>
                {
                    foreach (var row in headerRows)
                    {
                        foreach (var cell in row.Cells)
                        {
                            RenderCellToHeader(header, cell, context, layoutEngine);
                        }
                    }
                });
                Logger.LogTrace("Rendered table header with {RowCount} rows", headerRows.Count);
            }

            // Render footer section (repeats on every page)
            if (footerRows.Count > 0)
            {
                table.Footer(footer =>
                {
                    foreach (var row in footerRows)
                    {
                        foreach (var cell in row.Cells)
                        {
                            RenderCellToFooter(footer, cell, context, layoutEngine);
                        }
                    }
                });
                Logger.LogTrace("Rendered table footer with {RowCount} rows", footerRows.Count);
            }

            // Render body cells
            foreach (var row in rows)
            {
                foreach (var cell in row.Cells)
                {
                    RenderTableCellToDescriptor(table, cell, context, layoutEngine);
                }
            }
        });
    }

    /// <summary>
    /// Renders a cell to the table header section.
    /// Uses QuestPDF's header descriptor which provides Cell() method.
    /// </summary>
    private static void RenderCellToHeader(
        TableCellDescriptor header,
        TableCellDefinition cell,
        RenderContext context,
        ILayoutEngine layoutEngine
    )
    {
        // Build the cell descriptor with optional positioning and spanning
        var cellDescriptor = header.Cell();

        // Apply manual row positioning if specified
        if (cell.Row.HasValue)
        {
            cellDescriptor = cellDescriptor.Row(cell.Row.Value);
        }

        // Apply manual column positioning if specified
        if (cell.Column.HasValue)
        {
            cellDescriptor = cellDescriptor.Column(cell.Column.Value);
        }

        // Apply row span if specified
        if (cell.RowSpan > 1)
        {
            cellDescriptor = cellDescriptor.RowSpan(cell.RowSpan);
        }

        // Apply column span if specified
        if (cell.ColumnSpan > 1)
        {
            cellDescriptor = cellDescriptor.ColumnSpan(cell.ColumnSpan);
        }

        // Render cell content
        if (cell.Content is not null)
        {
            var content = cell.Content;
            cellDescriptor.Element(cellContainer =>
            {
                layoutEngine.Render(cellContainer, content, context);
            });
        }
    }

    /// <summary>
    /// Renders a cell to the table footer section.
    /// Uses QuestPDF's footer descriptor which provides Cell() method.
    /// </summary>
    private static void RenderCellToFooter(
        TableCellDescriptor footer,
        TableCellDefinition cell,
        RenderContext context,
        ILayoutEngine layoutEngine
    )
    {
        // Build the cell descriptor with optional positioning and spanning
        var cellDescriptor = footer.Cell();

        // Apply manual row positioning if specified
        if (cell.Row.HasValue)
        {
            cellDescriptor = cellDescriptor.Row(cell.Row.Value);
        }

        // Apply manual column positioning if specified
        if (cell.Column.HasValue)
        {
            cellDescriptor = cellDescriptor.Column(cell.Column.Value);
        }

        // Apply row span if specified
        if (cell.RowSpan > 1)
        {
            cellDescriptor = cellDescriptor.RowSpan(cell.RowSpan);
        }

        // Apply column span if specified
        if (cell.ColumnSpan > 1)
        {
            cellDescriptor = cellDescriptor.ColumnSpan(cell.ColumnSpan);
        }

        // Render cell content
        if (cell.Content is not null)
        {
            var content = cell.Content;
            cellDescriptor.Element(cellContainer =>
            {
                layoutEngine.Render(cellContainer, content, context);
            });
        }
    }

    /// <summary>
    /// Renders a single table cell with optional spanning and positioning to a TableDescriptor.
    /// </summary>
    private void RenderTableCellToDescriptor(
        TableDescriptor tableDescriptor,
        TableCellDefinition cell,
        RenderContext context,
        ILayoutEngine layoutEngine
    )
    {
        // Start with basic cell and build up the descriptor
        var cellDescriptor = tableDescriptor.Cell();

        // Apply manual row positioning if specified
        if (cell.Row.HasValue)
        {
            cellDescriptor = cellDescriptor.Row(cell.Row.Value);
            Logger.LogTrace("Cell positioned at row {Row}", cell.Row.Value);
        }

        // Apply manual column positioning if specified
        if (cell.Column.HasValue)
        {
            cellDescriptor = cellDescriptor.Column(cell.Column.Value);
            Logger.LogTrace("Cell positioned at column {Column}", cell.Column.Value);
        }

        // Apply row span if specified
        if (cell.RowSpan > 1)
        {
            cellDescriptor = cellDescriptor.RowSpan(cell.RowSpan);
            Logger.LogTrace("Cell row span: {RowSpan}", cell.RowSpan);
        }

        // Apply column span if specified
        if (cell.ColumnSpan > 1)
        {
            cellDescriptor = cellDescriptor.ColumnSpan(cell.ColumnSpan);
            Logger.LogTrace("Cell column span: {ColumnSpan}", cell.ColumnSpan);
        }

        // Render cell content
        if (cell.Content is not null)
        {
            var content = cell.Content;
            cellDescriptor.Element(cellContainer =>
            {
                layoutEngine.Render(cellContainer, content, context);
            });
        }
    }

    /// <summary>
    /// Extracts column definitions from the node properties.
    /// </summary>
    private List<ColumnDefinition> GetColumnDefinitions(LayoutNode node, RenderContext context)
    {
        var columns = new List<ColumnDefinition>();

        if (
            node.Properties is null
            || !node.Properties.TryGetValue(PropertyNames.Columns, out var columnsElement)
        )
        {
            // Check if columns are defined as Children for convenience
            // This allows a simpler JSON structure where each child is a column definition
            return columns;
        }

        if (columnsElement.ValueKind != JsonValueKind.Array)
        {
            Logger.LogWarning(
                "Table node {NodeId} has invalid columns property (expected array)",
                node.Id ?? "unnamed"
            );
            return columns;
        }

        foreach (var columnElement in columnsElement.EnumerateArray())
        {
            var column = ParseColumnDefinition(columnElement, context);
            if (column is not null)
            {
                columns.Add(column);
            }
        }

        return columns;
    }

    /// <summary>
    /// Parses a single column definition from JSON.
    /// </summary>
    private ColumnDefinition? ParseColumnDefinition(JsonElement element, RenderContext context)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            var type = ColumnTypes.Relative; // Default to relative
            float width = 100f;
            float weight = 1f;

            if (
                element.TryGetProperty(PropertyNames.ColumnType, out var typeElement)
                && typeElement.ValueKind == JsonValueKind.String
            )
            {
                type = typeElement.GetString() ?? ColumnTypes.Relative;
            }

            if (element.TryGetProperty(PropertyNames.ColumnWidth, out var widthElement))
            {
                width = GetFloatFromElement(widthElement, context, 100f);
            }

            if (element.TryGetProperty(PropertyNames.ColumnWeight, out var weightElement))
            {
                weight = GetFloatFromElement(weightElement, context, 1f);
            }

            var isConstant = string.Equals(
                type,
                ColumnTypes.Constant,
                StringComparison.OrdinalIgnoreCase
            );

            return new ColumnDefinition
            {
                IsConstant = isConstant,
                Width = width,
                Weight = weight,
            };
        }

        if (element.ValueKind == JsonValueKind.Number)
        {
            // Simple number means relative column with that weight
            return new ColumnDefinition
            {
                IsConstant = false,
                Weight = element.GetSingle(),
                Width = 0,
            };
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            // String could be an expression or "auto" shorthand
            var strValue = element.GetString();
            if (string.IsNullOrEmpty(strValue))
            {
                return null;
            }

            // Try expression evaluation
            if (strValue.Contains("{{") && strValue.Contains("}}"))
            {
                try
                {
                    var evaluated = ExpressionEvaluator.EvaluateString(strValue, context);
                    if (float.TryParse(evaluated, out var result))
                    {
                        return new ColumnDefinition
                        {
                            IsConstant = false,
                            Weight = result,
                            Width = 0,
                        };
                    }
                }
                catch
                {
                    // Fall through to default
                }
            }

            // Try to parse as number
            if (float.TryParse(strValue, out var parsed))
            {
                return new ColumnDefinition
                {
                    IsConstant = false,
                    Weight = parsed,
                    Width = 0,
                };
            }
        }

        // Default to relative column with weight 1
        return new ColumnDefinition
        {
            IsConstant = false,
            Weight = 1f,
            Width = 0,
        };
    }

    /// <summary>
    /// Extracts row definitions from the node properties.
    /// </summary>
    private List<TableRowDefinition> GetRowDefinitions(LayoutNode node, RenderContext context)
    {
        var rows = new List<TableRowDefinition>();

        if (
            node.Properties is null
            || !node.Properties.TryGetValue(PropertyNames.Rows, out var rowsElement)
        )
        {
            // Check if rows are defined as Children for convenience
            // This allows a simpler JSON structure where each child represents a row
            if (node.Children is not null && node.Children.Count > 0)
            {
                foreach (var childRow in node.Children)
                {
                    var row = ParseRowFromChild(childRow, context);
                    rows.Add(row);
                }
            }
            return rows;
        }

        if (rowsElement.ValueKind != JsonValueKind.Array)
        {
            Logger.LogWarning(
                "Table node {NodeId} has invalid rows property (expected array)",
                node.Id ?? "unnamed"
            );
            return rows;
        }

        foreach (var rowElement in rowsElement.EnumerateArray())
        {
            var row = ParseRowDefinition(rowElement, context);
            if (row is not null)
            {
                rows.Add(row);
            }
        }

        return rows;
    }

    /// <summary>
    /// Extracts header row definitions from the node properties.
    /// Header rows repeat on every page when the table spans multiple pages.
    /// </summary>
    private List<TableRowDefinition> GetHeaderDefinitions(LayoutNode node, RenderContext context)
    {
        var headerRows = new List<TableRowDefinition>();

        if (
            node.Properties is null
            || !node.Properties.TryGetValue(PropertyNames.Header, out var headerElement)
        )
        {
            return headerRows;
        }

        // Header can be an object with rows, or directly an array of rows
        if (headerElement.ValueKind == JsonValueKind.Object)
        {
            if (
                headerElement.TryGetProperty(PropertyNames.Rows, out var rowsElement)
                && rowsElement.ValueKind == JsonValueKind.Array
            )
            {
                foreach (var rowElement in rowsElement.EnumerateArray())
                {
                    var row = ParseRowDefinition(rowElement, context);
                    if (row is not null)
                    {
                        headerRows.Add(row);
                    }
                }
            }
            else if (
                headerElement.TryGetProperty(PropertyNames.Cells, out var cellsElement)
                && cellsElement.ValueKind == JsonValueKind.Array
            )
            {
                // Single row header defined directly with cells
                var row = ParseRowDefinition(headerElement, context);
                if (row is not null)
                {
                    headerRows.Add(row);
                }
            }
        }
        else if (headerElement.ValueKind == JsonValueKind.Array)
        {
            // Header is an array of rows
            foreach (var rowElement in headerElement.EnumerateArray())
            {
                var row = ParseRowDefinition(rowElement, context);
                if (row is not null)
                {
                    headerRows.Add(row);
                }
            }
        }

        return headerRows;
    }

    /// <summary>
    /// Extracts footer row definitions from the node properties.
    /// Footer rows repeat on every page when the table spans multiple pages.
    /// </summary>
    private List<TableRowDefinition> GetFooterDefinitions(LayoutNode node, RenderContext context)
    {
        var footerRows = new List<TableRowDefinition>();

        if (
            node.Properties is null
            || !node.Properties.TryGetValue(PropertyNames.Footer, out var footerElement)
        )
        {
            return footerRows;
        }

        // Footer can be an object with rows, or directly an array of rows
        if (footerElement.ValueKind == JsonValueKind.Object)
        {
            if (
                footerElement.TryGetProperty(PropertyNames.Rows, out var rowsElement)
                && rowsElement.ValueKind == JsonValueKind.Array
            )
            {
                foreach (var rowElement in rowsElement.EnumerateArray())
                {
                    var row = ParseRowDefinition(rowElement, context);
                    if (row is not null)
                    {
                        footerRows.Add(row);
                    }
                }
            }
            else if (
                footerElement.TryGetProperty(PropertyNames.Cells, out var cellsElement)
                && cellsElement.ValueKind == JsonValueKind.Array
            )
            {
                // Single row footer defined directly with cells
                var row = ParseRowDefinition(footerElement, context);
                if (row is not null)
                {
                    footerRows.Add(row);
                }
            }
        }
        else if (footerElement.ValueKind == JsonValueKind.Array)
        {
            // Footer is an array of rows
            foreach (var rowElement in footerElement.EnumerateArray())
            {
                var row = ParseRowDefinition(rowElement, context);
                if (row is not null)
                {
                    footerRows.Add(row);
                }
            }
        }

        return footerRows;
    }

    /// <summary>
    /// Parses a row definition from a child node (alternative structure).
    /// When table Children are used, each child represents a row, and its Children represent cells.
    /// </summary>
    private TableRowDefinition ParseRowFromChild(LayoutNode childRow, RenderContext context)
    {
        var row = new TableRowDefinition();

        if (childRow.Children is not null)
        {
            // Each child's children are the cells
            foreach (var cellNode in childRow.Children)
            {
                var cell = ParseCellFromLayoutNode(cellNode, context);
                row.Cells.Add(cell);
            }
        }
        else if (childRow.Child is not null)
        {
            // Single child case
            var cell = ParseCellFromLayoutNode(childRow.Child, context);
            row.Cells.Add(cell);
        }
        else
        {
            // The child itself might be the cell content
            var cell = ParseCellFromLayoutNode(childRow, context);
            row.Cells.Add(cell);
        }

        return row;
    }

    /// <summary>
    /// Parses a row definition from JSON.
    /// </summary>
    private TableRowDefinition? ParseRowDefinition(JsonElement element, RenderContext context)
    {
        var row = new TableRowDefinition();

        if (element.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        if (
            element.TryGetProperty(PropertyNames.Cells, out var cellsElement)
            && cellsElement.ValueKind == JsonValueKind.Array
        )
        {
            foreach (var cellElement in cellsElement.EnumerateArray())
            {
                var cell = ParseCellDefinition(cellElement, context);
                if (cell is not null)
                {
                    row.Cells.Add(cell);
                }
            }
        }

        return row;
    }

    /// <summary>
    /// Parses a cell definition from JSON element with support for spanning and positioning.
    /// Cell can be either:
    /// 1. A simple LayoutNode (no spanning)
    /// 2. An object with rowSpan, columnSpan, row, column, and content properties
    /// </summary>
    private TableCellDefinition? ParseCellDefinition(JsonElement element, RenderContext context)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var cell = new TableCellDefinition();

        // Check for explicit spanning properties
        if (element.TryGetProperty(PropertyNames.RowSpan, out var rowSpanElement))
        {
            cell.RowSpan = GetUIntFromElement(rowSpanElement, context, 1);
        }

        if (element.TryGetProperty(PropertyNames.ColumnSpan, out var columnSpanElement))
        {
            cell.ColumnSpan = GetUIntFromElement(columnSpanElement, context, 1);
        }

        // Check for explicit positioning
        if (element.TryGetProperty(PropertyNames.Row, out var rowElement))
        {
            cell.Row = GetUIntFromElement(rowElement, context, null);
        }

        if (element.TryGetProperty(PropertyNames.Column, out var columnElement))
        {
            cell.Column = GetUIntFromElement(columnElement, context, null);
        }

        // Check if content is wrapped in a "content" property
        if (element.TryGetProperty(PropertyNames.Content, out var contentElement))
        {
            cell.Content = ParseCellAsLayoutNode(contentElement);
        }
        else
        {
            // The element itself is the LayoutNode content
            // Only if it doesn't have spanning properties, or treat it as content with spanning
            cell.Content = ParseCellAsLayoutNode(element);
        }

        return cell;
    }

    /// <summary>
    /// Parses a LayoutNode from a cell and extracts spanning properties.
    /// </summary>
    private TableCellDefinition ParseCellFromLayoutNode(LayoutNode node, RenderContext context)
    {
        var cell = new TableCellDefinition
        {
            Content = node,
            RowSpan = 1,
            ColumnSpan = 1,
        };

        // Check if the node has spanning properties
        if (node.Properties is not null)
        {
            if (node.Properties.TryGetValue(PropertyNames.RowSpan, out var rowSpanElement))
            {
                cell.RowSpan = GetUIntFromElement(rowSpanElement, context, 1);
            }

            if (node.Properties.TryGetValue(PropertyNames.ColumnSpan, out var columnSpanElement))
            {
                cell.ColumnSpan = GetUIntFromElement(columnSpanElement, context, 1);
            }

            if (node.Properties.TryGetValue(PropertyNames.Row, out var rowElement))
            {
                cell.Row = GetUIntFromElement(rowElement, context, null);
            }

            if (node.Properties.TryGetValue(PropertyNames.Column, out var columnElement))
            {
                cell.Column = GetUIntFromElement(columnElement, context, null);
            }
        }

        return cell;
    }

    /// <summary>
    /// Parses a cell JSON element as a LayoutNode.
    /// </summary>
    private LayoutNode? ParseCellAsLayoutNode(JsonElement element)
    {
        try
        {
            return element.Deserialize<LayoutNode>();
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Failed to parse table cell as LayoutNode");
            return null;
        }
    }

    /// <summary>
    /// Gets a float value from a JSON element with expression evaluation support.
    /// </summary>
    private float GetFloatFromElement(
        JsonElement element,
        RenderContext context,
        float defaultValue
    )
    {
        if (element.ValueKind == JsonValueKind.Number)
        {
            return element.GetSingle();
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            var strValue = element.GetString();
            if (string.IsNullOrEmpty(strValue))
            {
                return defaultValue;
            }

            // Try expression evaluation
            if (strValue.Contains("{{") && strValue.Contains("}}"))
            {
                try
                {
                    var evaluated = ExpressionEvaluator.EvaluateString(strValue, context);
                    if (float.TryParse(evaluated, out var result))
                    {
                        return result;
                    }
                }
                catch
                {
                    // Fall through
                }
            }

            return float.TryParse(strValue, out var parsed) ? parsed : defaultValue;
        }

        return defaultValue;
    }

    /// <summary>
    /// Gets a uint value from a JSON element with expression evaluation support.
    /// </summary>
    private uint GetUIntFromElement(JsonElement element, RenderContext context, uint defaultValue)
    {
        if (element.ValueKind == JsonValueKind.Number)
        {
            return (uint)Math.Max(0, element.GetInt32());
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            var strValue = element.GetString();
            if (string.IsNullOrEmpty(strValue))
            {
                return defaultValue;
            }

            // Try expression evaluation
            if (strValue.Contains("{{") && strValue.Contains("}}"))
            {
                try
                {
                    var evaluated = ExpressionEvaluator.EvaluateString(strValue, context);
                    if (uint.TryParse(evaluated, out var result))
                    {
                        return result;
                    }
                }
                catch
                {
                    // Fall through
                }
            }

            return uint.TryParse(strValue, out var parsed) ? parsed : defaultValue;
        }

        return defaultValue;
    }

    /// <summary>
    /// Gets a nullable uint value from a JSON element with expression evaluation support.
    /// </summary>
    private uint? GetUIntFromElement(JsonElement element, RenderContext context, uint? defaultValue)
    {
        if (element.ValueKind == JsonValueKind.Number)
        {
            return (uint)Math.Max(0, element.GetInt32());
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            var strValue = element.GetString();
            if (string.IsNullOrEmpty(strValue))
            {
                return defaultValue;
            }

            // Try expression evaluation
            if (strValue.Contains("{{") && strValue.Contains("}}"))
            {
                try
                {
                    var evaluated = ExpressionEvaluator.EvaluateString(strValue, context);
                    if (uint.TryParse(evaluated, out var result))
                    {
                        return result;
                    }
                }
                catch
                {
                    // Fall through
                }
            }

            return uint.TryParse(strValue, out var parsed) ? parsed : defaultValue;
        }

        return defaultValue;
    }

    /// <inheritdoc />
    public override IReadOnlyDictionary<string, object?> GetOptionalProperties()
    {
        return new Dictionary<string, object?>
        {
            [PropertyNames.Rows] = new List<object>(),
            [PropertyNames.Header] = null,
            [PropertyNames.Footer] = null,
        };
    }

    /// <inheritdoc />
    protected override IEnumerable<ComponentValidationError> ValidateComponentProperties(
        LayoutNode node
    )
    {
        var errors = new List<ComponentValidationError>();

        // Validate columns exist
        if (
            node.Properties is null
            || !node.Properties.TryGetValue(PropertyNames.Columns, out var columnsElement)
        )
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Columns,
                    Message = "Table requires 'columns' property with column definitions",
                    Severity = ValidationSeverity.Error,
                }
            );
            return errors;
        }

        if (columnsElement.ValueKind != JsonValueKind.Array)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Columns,
                    Message = "Table 'columns' must be an array of column definitions",
                    Severity = ValidationSeverity.Error,
                }
            );
            return errors;
        }

        var columnCount = 0;
        foreach (var columnElement in columnsElement.EnumerateArray())
        {
            if (columnElement.ValueKind == JsonValueKind.Object)
            {
                if (
                    columnElement.TryGetProperty(PropertyNames.ColumnType, out var typeElement)
                    && typeElement.ValueKind == JsonValueKind.String
                )
                {
                    var type = typeElement.GetString()?.ToLowerInvariant();
                    if (type != ColumnTypes.Constant && type != ColumnTypes.Relative)
                    {
                        errors.Add(
                            new ComponentValidationError
                            {
                                PropertyName = $"{PropertyNames.Columns}[{columnCount}].type",
                                Message =
                                    $"Invalid column type '{type}'. Must be 'constant' or 'relative'",
                                Severity = ValidationSeverity.Error,
                            }
                        );
                    }

                    // Validate constant column has positive width
                    if (type == ColumnTypes.Constant)
                    {
                        if (
                            columnElement.TryGetProperty(
                                PropertyNames.ColumnWidth,
                                out var widthElement
                            )
                            && widthElement.ValueKind == JsonValueKind.Number
                        )
                        {
                            var width = widthElement.GetSingle();
                            if (width <= 0)
                            {
                                errors.Add(
                                    new ComponentValidationError
                                    {
                                        PropertyName =
                                            $"{PropertyNames.Columns}[{columnCount}].width",
                                        Message =
                                            $"Constant column width must be positive, got {width}",
                                        Severity = ValidationSeverity.Error,
                                    }
                                );
                            }
                        }
                    }
                }
            }
            columnCount++;
        }

        if (columnCount == 0)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Columns,
                    Message = "Table must have at least one column defined",
                    Severity = ValidationSeverity.Error,
                }
            );
        }

        // Warn if table has no rows (valid but likely unintended)
        var hasRows = false;
        if (
            node.Properties is not null
            && node.Properties.TryGetValue(PropertyNames.Rows, out var rowsElement)
            && rowsElement.ValueKind == JsonValueKind.Array
        )
        {
            hasRows = rowsElement.GetArrayLength() > 0;
        }
        else if (node.Children is not null && node.Children.Count > 0)
        {
            hasRows = true;
        }

        if (!hasRows)
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = PropertyNames.Rows,
                    Message = "Table has no rows defined - this will render an empty table",
                    Severity = ValidationSeverity.Warning,
                }
            );
        }

        // Validate header if present
        if (
            node.Properties is not null
            && node.Properties.TryGetValue(PropertyNames.Header, out var headerElement)
        )
        {
            ValidateTableSection(headerElement, PropertyNames.Header, errors);
        }

        // Validate footer if present
        if (
            node.Properties is not null
            && node.Properties.TryGetValue(PropertyNames.Footer, out var footerElement)
        )
        {
            ValidateTableSection(footerElement, PropertyNames.Footer, errors);
        }

        return errors;
    }

    /// <summary>
    /// Validates a table section (header or footer).
    /// </summary>
    private static void ValidateTableSection(
        JsonElement sectionElement,
        string sectionName,
        List<ComponentValidationError> errors
    )
    {
        if (
            sectionElement.ValueKind != JsonValueKind.Object
            && sectionElement.ValueKind != JsonValueKind.Array
        )
        {
            errors.Add(
                new ComponentValidationError
                {
                    PropertyName = sectionName,
                    Message =
                        $"Table '{sectionName}' must be an object with rows/cells or an array of rows",
                    Severity = ValidationSeverity.Error,
                }
            );
            return;
        }

        // Validate cell spans are positive integers
        if (sectionElement.ValueKind == JsonValueKind.Object)
        {
            ValidateCellSpans(sectionElement, sectionName, errors);
        }
        else if (sectionElement.ValueKind == JsonValueKind.Array)
        {
            var rowIndex = 0;
            foreach (var rowElement in sectionElement.EnumerateArray())
            {
                ValidateCellSpans(rowElement, $"{sectionName}[{rowIndex}]", errors);
                rowIndex++;
            }
        }
    }

    /// <summary>
    /// Validates cell span values in a row or section element.
    /// </summary>
    private static void ValidateCellSpans(
        JsonElement element,
        string path,
        List<ComponentValidationError> errors
    )
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            return;
        }

        if (
            element.TryGetProperty(PropertyNames.Cells, out var cellsElement)
            && cellsElement.ValueKind == JsonValueKind.Array
        )
        {
            var cellIndex = 0;
            foreach (var cellElement in cellsElement.EnumerateArray())
            {
                if (cellElement.ValueKind == JsonValueKind.Object)
                {
                    // Validate rowSpan
                    if (
                        cellElement.TryGetProperty(PropertyNames.RowSpan, out var rowSpanElement)
                        && rowSpanElement.ValueKind == JsonValueKind.Number
                    )
                    {
                        var rowSpan = rowSpanElement.GetInt32();
                        if (rowSpan < 1)
                        {
                            errors.Add(
                                new ComponentValidationError
                                {
                                    PropertyName = $"{path}.cells[{cellIndex}].rowSpan",
                                    Message = $"rowSpan must be at least 1, got {rowSpan}",
                                    Severity = ValidationSeverity.Error,
                                }
                            );
                        }
                    }

                    // Validate columnSpan
                    if (
                        cellElement.TryGetProperty(
                            PropertyNames.ColumnSpan,
                            out var columnSpanElement
                        )
                        && columnSpanElement.ValueKind == JsonValueKind.Number
                    )
                    {
                        var columnSpan = columnSpanElement.GetInt32();
                        if (columnSpan < 1)
                        {
                            errors.Add(
                                new ComponentValidationError
                                {
                                    PropertyName = $"{path}.cells[{cellIndex}].columnSpan",
                                    Message = $"columnSpan must be at least 1, got {columnSpan}",
                                    Severity = ValidationSeverity.Error,
                                }
                            );
                        }
                    }

                    // Validate row position if specified
                    if (
                        cellElement.TryGetProperty(PropertyNames.Row, out var rowElement)
                        && rowElement.ValueKind == JsonValueKind.Number
                    )
                    {
                        var row = rowElement.GetInt32();
                        if (row < 1)
                        {
                            errors.Add(
                                new ComponentValidationError
                                {
                                    PropertyName = $"{path}.cells[{cellIndex}].row",
                                    Message =
                                        $"row position must be at least 1 (1-based index), got {row}",
                                    Severity = ValidationSeverity.Error,
                                }
                            );
                        }
                    }

                    // Validate column position if specified
                    if (
                        cellElement.TryGetProperty(PropertyNames.Column, out var columnElement)
                        && columnElement.ValueKind == JsonValueKind.Number
                    )
                    {
                        var column = columnElement.GetInt32();
                        if (column < 1)
                        {
                            errors.Add(
                                new ComponentValidationError
                                {
                                    PropertyName = $"{path}.cells[{cellIndex}].column",
                                    Message =
                                        $"column position must be at least 1 (1-based index), got {column}",
                                    Severity = ValidationSeverity.Error,
                                }
                            );
                        }
                    }
                }
                cellIndex++;
            }
        }
    }

    /// <summary>
    /// Internal class representing a column definition.
    /// </summary>
    private sealed class ColumnDefinition
    {
        public bool IsConstant { get; init; }
        public float Width { get; init; }
        public float Weight { get; init; }
    }

    /// <summary>
    /// Internal class representing a table row definition.
    /// </summary>
    private sealed class TableRowDefinition
    {
        public List<TableCellDefinition> Cells { get; } = [];
    }

    /// <summary>
    /// Internal class representing a table cell definition with spanning support.
    /// </summary>
    private sealed class TableCellDefinition
    {
        /// <summary>
        /// The layout node content of the cell.
        /// </summary>
        public LayoutNode? Content { get; set; }

        /// <summary>
        /// Number of rows this cell spans (default: 1).
        /// </summary>
        public uint RowSpan { get; set; } = 1;

        /// <summary>
        /// Number of columns this cell spans (default: 1).
        /// </summary>
        public uint ColumnSpan { get; set; } = 1;

        /// <summary>
        /// Optional explicit 1-based row position.
        /// </summary>
        public uint? Row { get; set; }

        /// <summary>
        /// Optional explicit 1-based column position.
        /// </summary>
        public uint? Column { get; set; }
    }
}
