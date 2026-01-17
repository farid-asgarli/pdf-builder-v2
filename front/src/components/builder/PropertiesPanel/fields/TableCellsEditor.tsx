/**
 * TableCellsEditor Component
 * Property panel field for editing table cells with a visual grid interface
 *
 * Features:
 * - Visual grid representation of table cells
 * - Click to select and edit individual cells
 * - Support for cell spanning visualization
 * - Add/remove rows
 * - Integration with TableCellEditorModal
 */
"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TableCellEditorModal from "./TableCellEditorModal";
import type {
  TableCellData,
  TableColumn,
  TableRowData,
} from "@/types/properties";
import type { LayoutNode } from "@/types/component";
import { Plus, Trash2, Grid3X3, ChevronDown, ChevronRight } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for TableCellsEditor
 */
export interface TableCellsEditorProps {
  /** Table column definitions */
  columns: TableColumn[];
  /** Row data containing cells */
  rows: TableRowData[];
  /** Callback when rows change */
  onRowsChange: (rows: TableRowData[]) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Label for the field */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Section type (body, header, footer) */
  sectionType?: "body" | "header" | "footer";
}

/**
 * Selected cell position
 */
interface SelectedCell {
  rowIndex: number;
  cellIndex: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum cell width for grid display */
const MIN_CELL_WIDTH = 40;

/** Maximum rows to display in compact mode */
const COMPACT_MAX_ROWS = 5;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a summary of cell content
 */
function getCellContentSummary(cell: TableCellData): string {
  if (!cell.content) return "Empty";

  const content = cell.content as LayoutNode;
  if (!content.type) return "Custom";

  switch (content.type) {
    case "Text":
      const text = content.properties?.content as string;
      return text
        ? `"${text.slice(0, 15)}${text.length > 15 ? "…" : ""}"`
        : "Text";
    case "Image":
      return "Image";
    case "Column":
      return `Col (${content.children?.length || 0})`;
    case "Row":
      return `Row (${content.children?.length || 0})`;
    default:
      return content.type;
  }
}

/**
 * Create an empty cell
 */
function createEmptyCell(): TableCellData {
  return {
    rowSpan: 1,
    columnSpan: 1,
  };
}

/**
 * Create a new row with empty cells
 */
function createEmptyRow(columnCount: number): TableRowData {
  return {
    cells: Array(columnCount)
      .fill(null)
      .map(() => createEmptyCell()),
  };
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Individual cell in the grid
 */
const CellGridItem = memo(function CellGridItem({
  cell,
  rowIndex,
  cellIndex,
  columnCount,
  isSelected,
  onClick,
  disabled,
}: {
  cell: TableCellData;
  rowIndex: number;
  cellIndex: number;
  columnCount: number;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const hasSpan =
    (cell.rowSpan && cell.rowSpan > 1) ||
    (cell.columnSpan && cell.columnSpan > 1);
  const hasContent = cell.content !== undefined;
  const hasExplicitPosition =
    cell.row !== undefined || cell.column !== undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-center p-1 text-xs",
        "border-border/50 rounded-sm border transition-all",
        "hover:border-primary/50 hover:bg-accent/50",
        "focus:ring-primary/30 focus:ring-2 focus:outline-none",
        isSelected && "ring-primary border-primary bg-primary/10 ring-2",
        hasContent ? "bg-muted/30" : "bg-background",
        disabled && "cursor-not-allowed opacity-50"
      )}
      style={{
        minWidth: MIN_CELL_WIDTH,
        minHeight: 32,
        gridColumn:
          cell.columnSpan && cell.columnSpan > 1
            ? `span ${Math.min(cell.columnSpan, columnCount - cellIndex)}`
            : undefined,
        gridRow:
          cell.rowSpan && cell.rowSpan > 1 ? `span ${cell.rowSpan}` : undefined,
      }}
      title={`Row ${rowIndex + 1}, Cell ${cellIndex + 1}`}
    >
      {/* Span indicators */}
      {hasSpan && (
        <div className="absolute top-0.5 right-0.5 flex gap-0.5">
          {cell.rowSpan && cell.rowSpan > 1 && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
              ↕{cell.rowSpan}
            </Badge>
          )}
          {cell.columnSpan && cell.columnSpan > 1 && (
            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
              ↔{cell.columnSpan}
            </Badge>
          )}
        </div>
      )}

      {/* Position indicator */}
      {hasExplicitPosition && (
        <div className="absolute bottom-0.5 left-0.5">
          <Badge variant="outline" className="h-3 px-0.5 text-[7px]">
            {cell.row},{cell.column}
          </Badge>
        </div>
      )}

      {/* Content summary */}
      <span
        className={cn(
          "max-w-full truncate px-1 text-[10px]",
          hasContent ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {getCellContentSummary(cell)}
      </span>
    </button>
  );
});

/**
 * Row controls (delete, reorder)
 */
const RowControls = memo(function RowControls({
  rowIndex,
  onDelete,
  disabled,
}: {
  rowIndex: number;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground w-5 text-right text-[10px]">
        {rowIndex + 1}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={disabled}
            className="text-muted-foreground h-6 w-6 p-0 hover:text-red-500"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete row {rowIndex + 1}</TooltipContent>
      </Tooltip>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * TableCellsEditor - Visual editor for table cells
 */
export function TableCellsEditor({
  columns,
  rows,
  onRowsChange,
  disabled,
  label = "Table Cells",
  className,
  sectionType = "body",
}: TableCellsEditorProps) {
  // ========================================
  // State
  // ========================================

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // ========================================
  // Computed Values
  // ========================================

  const columnCount = columns.length || 3;
  const hasRows = rows.length > 0;
  const needsCompact = rows.length > COMPACT_MAX_ROWS;

  // Get selected cell data
  const selectedCellData = useMemo(() => {
    if (!selectedCell) return null;
    const row = rows[selectedCell.rowIndex];
    if (!row) return null;
    return row.cells[selectedCell.cellIndex] || createEmptyCell();
  }, [selectedCell, rows]);

  // ========================================
  // Handlers
  // ========================================

  const handleCellClick = useCallback((rowIndex: number, cellIndex: number) => {
    setSelectedCell({ rowIndex, cellIndex });
    setIsModalOpen(true);
  }, []);

  const handleCellSave = useCallback(
    (cellData: TableCellData) => {
      if (!selectedCell) return;

      const newRows = [...rows];
      const rowIndex = selectedCell.rowIndex;
      const cellIndex = selectedCell.cellIndex;

      // Ensure row exists
      if (!newRows[rowIndex]) {
        newRows[rowIndex] = createEmptyRow(columnCount);
      }

      // Ensure cells array exists
      if (!newRows[rowIndex].cells) {
        newRows[rowIndex].cells = [];
      }

      // Update the cell
      newRows[rowIndex] = {
        ...newRows[rowIndex],
        cells: [
          ...newRows[rowIndex].cells.slice(0, cellIndex),
          cellData,
          ...newRows[rowIndex].cells.slice(cellIndex + 1),
        ],
      };

      onRowsChange(newRows);
      setSelectedCell(null);
    },
    [selectedCell, rows, columnCount, onRowsChange]
  );

  const handleAddRow = useCallback(() => {
    const newRow = createEmptyRow(columnCount);
    onRowsChange([...rows, newRow]);
  }, [rows, columnCount, onRowsChange]);

  const handleDeleteRow = useCallback(
    (rowIndex: number) => {
      const newRows = rows.filter((_, i) => i !== rowIndex);
      onRowsChange(newRows);

      // Clear selection if deleted row was selected
      if (selectedCell?.rowIndex === rowIndex) {
        setSelectedCell(null);
      }
    },
    [rows, onRowsChange, selectedCell]
  );

  const handleModalClose = useCallback((open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedCell(null);
    }
  }, []);

  // ========================================
  // Render
  // ========================================

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="hover:text-primary flex items-center gap-2 text-sm font-medium transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Grid3X3 className="text-muted-foreground h-4 w-4" />
          <span>{label}</span>
          <Badge variant="secondary" className="ml-1 h-5">
            {rows.length} row{rows.length !== 1 ? "s" : ""}
          </Badge>
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          disabled={disabled}
          className="h-7 text-xs"
        >
          <Plus className="mr-1 h-3 w-3" />
          Add Row
        </Button>
      </div>

      {/* Grid */}
      {isExpanded && (
        <div className="space-y-2">
          {!hasRows ? (
            // Empty state
            <div className="border-muted flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6">
              <Grid3X3 className="text-muted-foreground/50 mb-2 h-8 w-8" />
              <p className="text-muted-foreground mb-3 text-center text-sm">
                No rows defined. Add a row to start editing cells.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                disabled={disabled}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add First Row
              </Button>
            </div>
          ) : (
            // Cell grid
            <div className="overflow-hidden rounded-md border">
              {/* Column headers */}
              <div
                className="bg-muted/50 grid border-b"
                style={{
                  gridTemplateColumns: `40px repeat(${columnCount}, minmax(${MIN_CELL_WIDTH}px, 1fr))`,
                }}
              >
                <div className="text-muted-foreground p-1 text-center text-[10px]">
                  #
                </div>
                {columns.map((col, i) => (
                  <div
                    key={i}
                    className="text-muted-foreground border-border/50 border-l p-1 text-center text-[10px]"
                  >
                    {col.type === "constant"
                      ? `${col.value}pt`
                      : `${col.value}*`}
                  </div>
                ))}
              </div>

              {/* Rows */}
              <div className="max-h-75 overflow-y-auto">
                {rows
                  .slice(
                    0,
                    needsCompact && !isExpanded ? COMPACT_MAX_ROWS : undefined
                  )
                  .map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="group grid border-b last:border-b-0"
                      style={{
                        gridTemplateColumns: `40px repeat(${columnCount}, minmax(${MIN_CELL_WIDTH}px, 1fr))`,
                      }}
                    >
                      {/* Row controls */}
                      <div className="border-border/50 bg-muted/30 flex items-center justify-center border-r">
                        <RowControls
                          rowIndex={rowIndex}
                          onDelete={() => handleDeleteRow(rowIndex)}
                          disabled={disabled}
                        />
                      </div>

                      {/* Cells */}
                      {row.cells.map((cell, cellIndex) => (
                        <CellGridItem
                          key={cellIndex}
                          cell={cell || createEmptyCell()}
                          rowIndex={rowIndex}
                          cellIndex={cellIndex}
                          columnCount={columnCount}
                          isSelected={
                            selectedCell?.rowIndex === rowIndex &&
                            selectedCell?.cellIndex === cellIndex
                          }
                          onClick={() => handleCellClick(rowIndex, cellIndex)}
                          disabled={disabled}
                        />
                      ))}

                      {/* Fill remaining columns if row has fewer cells */}
                      {row.cells.length < columnCount &&
                        Array(columnCount - row.cells.length)
                          .fill(null)
                          .map((_, i) => (
                            <CellGridItem
                              key={`empty-${i}`}
                              cell={createEmptyCell()}
                              rowIndex={rowIndex}
                              cellIndex={row.cells.length + i}
                              columnCount={columnCount}
                              isSelected={
                                selectedCell?.rowIndex === rowIndex &&
                                selectedCell?.cellIndex === row.cells.length + i
                              }
                              onClick={() =>
                                handleCellClick(rowIndex, row.cells.length + i)
                              }
                              disabled={disabled}
                            />
                          ))}
                    </div>
                  ))}
              </div>

              {/* Show more indicator */}
              {needsCompact && (
                <div className="bg-muted/30 border-t p-2 text-center">
                  <span className="text-muted-foreground text-xs">
                    {rows.length - COMPACT_MAX_ROWS} more row
                    {rows.length - COMPACT_MAX_ROWS !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <p className="text-muted-foreground text-xs">
            Click a cell to edit its content, spanning, and positioning.
          </p>
        </div>
      )}

      {/* Cell Editor Modal */}
      {selectedCellData && (
        <TableCellEditorModal
          open={isModalOpen}
          onOpenChange={handleModalClose}
          cellData={selectedCellData}
          onSave={handleCellSave}
          tableColumns={columns}
          tableRowCount={rows.length}
          cellRowIndex={selectedCell?.rowIndex}
          cellColumnIndex={selectedCell?.cellIndex}
          isHeaderCell={sectionType === "header"}
          isFooterCell={sectionType === "footer"}
        />
      )}
    </div>
  );
}

export default memo(TableCellsEditor);
