/**
 * TableCellEditorModal Component
 * Modal dialog for editing table cell properties including spanning and positioning
 *
 * Features:
 * - Edit cell rowSpan and columnSpan
 * - Optional explicit row/column positioning
 * - Content preview and type selection
 * - Component palette for cell content
 * - Validation with visual feedback
 * - Keyboard shortcuts (Enter to save, Escape to close)
 */
"use client";

import { useState, useCallback, useMemo, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ToggleField } from "./ToggleField";
import type { TableCellData, TableColumn } from "@/types/properties";
import type { LayoutNode } from "@/types/component";
import {
  Table2,
  Grid3X3,
  ArrowRightLeft,
  ArrowUpDown,
  MoveHorizontal,
  MoveVertical,
  Layers,
  AlertCircle,
  Check,
  X,
  Info,
  Type,
  Image as ImageIcon,
  LayoutGrid,
  Columns,
  Rows,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for TableCellEditorModal
 */
export interface TableCellEditorModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal close is requested */
  onOpenChange: (open: boolean) => void;
  /** Current cell data */
  cellData: TableCellData;
  /** Callback when cell data is saved */
  onSave: (data: TableCellData) => void;
  /** Table column definitions (for validation) */
  tableColumns?: TableColumn[];
  /** Current row count in the table (for validation) */
  tableRowCount?: number;
  /** Row index of this cell (0-based, for display) */
  cellRowIndex?: number;
  /** Column index of this cell (0-based, for display) */
  cellColumnIndex?: number;
  /** Whether the cell is in header section */
  isHeaderCell?: boolean;
  /** Whether the cell is in footer section */
  isFooterCell?: boolean;
  /** Optional title override */
  title?: string;
}

/**
 * Cell content type options
 */
type CellContentType = "text" | "image" | "column" | "row" | "custom" | "empty";

/**
 * Validation errors interface
 */
interface ValidationErrors {
  rowSpan?: string;
  columnSpan?: string;
  row?: string;
  column?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default span values */
const DEFAULT_SPAN = 1;

/** Maximum span values */
const MAX_SPAN = 50;

/** Content type options with icons */
const CONTENT_TYPE_OPTIONS: {
  value: CellContentType;
  label: string;
  icon: ReactNode;
  description: string;
}[] = [
  {
    value: "text",
    label: "Text",
    icon: <Type className="h-4 w-4" />,
    description: "Simple text content",
  },
  {
    value: "image",
    label: "Image",
    icon: <ImageIcon className="h-4 w-4" aria-hidden="true" />,
    description: "Image content",
  },
  {
    value: "column",
    label: "Column",
    icon: <Columns className="h-4 w-4" />,
    description: "Vertical layout container",
  },
  {
    value: "row",
    label: "Row",
    icon: <Rows className="h-4 w-4" />,
    description: "Horizontal layout container",
  },
  {
    value: "custom",
    label: "Custom",
    icon: <LayoutGrid className="h-4 w-4" />,
    description: "Custom component structure",
  },
  {
    value: "empty",
    label: "Empty",
    icon: <Grid3X3 className="h-4 w-4" />,
    description: "No content",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect content type from LayoutNode
 */
function detectContentType(content: unknown): CellContentType {
  if (!content) return "empty";

  const node = content as LayoutNode;
  if (!node.type) return "custom";

  switch (node.type) {
    case "Text":
      return "text";
    case "Image":
      return "image";
    case "Column":
      return "column";
    case "Row":
      return "row";
    default:
      return "custom";
  }
}

/**
 * Get a preview summary of content
 */
function getContentPreview(content: unknown): string {
  if (!content) return "No content";

  const node = content as LayoutNode;
  if (!node.type) return "Unknown content";

  const props = node.properties || {};

  switch (node.type) {
    case "Text":
      const text = props.content as string;
      return text
        ? `"${text.slice(0, 30)}${text.length > 30 ? "..." : ""}"`
        : "Empty text";
    case "Image":
      return props.source ? "Image set" : "No image";
    case "Column":
    case "Row":
      const childCount = node.children?.length || 0;
      return `${node.type} (${childCount} item${childCount !== 1 ? "s" : ""})`;
    default:
      return `${node.type} component`;
  }
}

/**
 * Validate cell data against table constraints
 */
function validateCellData(
  data: TableCellData,
  tableColumns?: TableColumn[],
  tableRowCount?: number,
  useExplicitPosition?: boolean
): ValidationErrors {
  const errors: ValidationErrors = {};
  const columnCount = tableColumns?.length || 3;

  // Validate rowSpan
  if (data.rowSpan !== undefined) {
    if (data.rowSpan < 1) {
      errors.rowSpan = "Row span must be at least 1";
    } else if (data.rowSpan > MAX_SPAN) {
      errors.rowSpan = `Row span cannot exceed ${MAX_SPAN}`;
    }
  }

  // Validate columnSpan
  if (data.columnSpan !== undefined) {
    if (data.columnSpan < 1) {
      errors.columnSpan = "Column span must be at least 1";
    } else if (data.columnSpan > columnCount) {
      errors.columnSpan = `Column span cannot exceed ${columnCount} (table column count)`;
    } else if (data.columnSpan > MAX_SPAN) {
      errors.columnSpan = `Column span cannot exceed ${MAX_SPAN}`;
    }
  }

  // Validate explicit position if enabled
  if (useExplicitPosition) {
    if (data.row !== undefined) {
      if (data.row < 1) {
        errors.row = "Row must be at least 1 (1-based index)";
      } else if (tableRowCount && data.row > tableRowCount + MAX_SPAN) {
        errors.row = `Row position seems too large`;
      }
    }

    if (data.column !== undefined) {
      if (data.column < 1) {
        errors.column = "Column must be at least 1 (1-based index)";
      } else if (data.column > columnCount) {
        errors.column = `Column cannot exceed ${columnCount} (table column count)`;
      }
    }
  }

  return errors;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Inner content component that manages its own state
 * Gets re-mounted via key prop when cellData identity changes
 */
interface TableCellEditorContentProps {
  cellData: TableCellData;
  onSave: (data: TableCellData) => void;
  onClose: () => void;
  tableColumns?: TableColumn[];
  tableRowCount?: number;
  cellRowIndex?: number;
  cellColumnIndex?: number;
  isHeaderCell?: boolean;
  isFooterCell?: boolean;
  title?: string;
}

function TableCellEditorContent({
  cellData,
  onSave,
  onClose,
  tableColumns,
  tableRowCount,
  cellRowIndex,
  cellColumnIndex,
  isHeaderCell,
  isFooterCell,
  title,
}: TableCellEditorContentProps) {
  // ========================================
  // State - Initialize from props (resets on re-mount via key)
  // ========================================

  const [rowSpan, setRowSpan] = useState<number>(
    cellData.rowSpan ?? DEFAULT_SPAN
  );
  const [columnSpan, setColumnSpan] = useState<number>(
    cellData.columnSpan ?? DEFAULT_SPAN
  );
  const [useExplicitPosition, setUseExplicitPosition] = useState<boolean>(
    cellData.row !== undefined || cellData.column !== undefined
  );
  const [row, setRow] = useState<number | undefined>(cellData.row);
  const [column, setColumn] = useState<number | undefined>(cellData.column);
  const [content, setContent] = useState<unknown>(cellData.content);
  const [contentType, setContentType] = useState<CellContentType>(
    detectContentType(cellData.content)
  );

  // ========================================
  // Derived Values
  // ========================================

  const columnCount = tableColumns?.length || 3;

  // Compute errors using useMemo
  const errors = useMemo(() => {
    const currentData: TableCellData = {
      rowSpan,
      columnSpan,
      row: useExplicitPosition ? row : undefined,
      column: useExplicitPosition ? column : undefined,
      content,
    };
    return validateCellData(
      currentData,
      tableColumns,
      tableRowCount,
      useExplicitPosition
    );
  }, [
    rowSpan,
    columnSpan,
    row,
    column,
    useExplicitPosition,
    tableColumns,
    tableRowCount,
    content,
  ]);

  const hasErrors = Object.keys(errors).length > 0;

  const dialogTitle = useMemo(() => {
    if (title) return title;

    const position =
      cellRowIndex !== undefined && cellColumnIndex !== undefined
        ? ` (Row ${cellRowIndex + 1}, Col ${cellColumnIndex + 1})`
        : "";

    const section = isHeaderCell
      ? "Header Cell"
      : isFooterCell
        ? "Footer Cell"
        : "Table Cell";

    return `Edit ${section}${position}`;
  }, [title, cellRowIndex, cellColumnIndex, isHeaderCell, isFooterCell]);

  // ========================================
  // Handlers
  // ========================================

  const handleSave = useCallback(() => {
    if (hasErrors) return;

    const newCellData: TableCellData = {
      rowSpan: rowSpan !== DEFAULT_SPAN ? rowSpan : undefined,
      columnSpan: columnSpan !== DEFAULT_SPAN ? columnSpan : undefined,
      row: useExplicitPosition ? row : undefined,
      column: useExplicitPosition ? column : undefined,
      content,
    };

    // Clean up undefined values
    Object.keys(newCellData).forEach((key) => {
      if ((newCellData as Record<string, unknown>)[key] === undefined) {
        delete (newCellData as Record<string, unknown>)[key];
      }
    });

    onSave(newCellData);
    onClose();
  }, [
    hasErrors,
    rowSpan,
    columnSpan,
    useExplicitPosition,
    row,
    column,
    content,
    onSave,
    onClose,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const handleContentTypeChange = useCallback((type: CellContentType) => {
    setContentType(type);

    // Create default content based on type
    if (type === "empty") {
      setContent(undefined);
    } else if (type === "text") {
      setContent({
        id: `cell-text-${Date.now()}`,
        type: "Text",
        properties: { content: "" },
      });
    } else if (type === "image") {
      setContent({
        id: `cell-image-${Date.now()}`,
        type: "Image",
        properties: { source: "" },
      });
    } else if (type === "column") {
      setContent({
        id: `cell-column-${Date.now()}`,
        type: "Column",
        properties: { spacing: 4 },
        children: [],
      });
    } else if (type === "row") {
      setContent({
        id: `cell-row-${Date.now()}`,
        type: "Row",
        properties: { spacing: 4 },
        children: [],
      });
    }
  }, []);

  // ========================================
  // Render
  // ========================================

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Table2 className="h-5 w-5 text-blue-500" />
          {dialogTitle}
        </DialogTitle>
        <DialogDescription>
          Configure cell spanning, positioning, and content type.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4" onKeyDown={handleKeyDown}>
        {/* Cell Spanning Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Cell Spanning</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Row Span */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="text-muted-foreground h-3.5 w-3.5" />
                <Label htmlFor="rowSpan" className="text-xs">
                  Row Span
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-muted-foreground h-3 w-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>Number of rows this cell should span vertically</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="rowSpan"
                type="number"
                min={1}
                max={MAX_SPAN}
                value={rowSpan}
                onChange={(e) =>
                  setRowSpan(Math.max(1, parseInt(e.target.value) || 1))
                }
                className={cn(
                  "h-9",
                  errors.rowSpan && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              {errors.rowSpan && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.rowSpan}
                </p>
              )}
            </div>

            {/* Column Span */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <ArrowRightLeft className="text-muted-foreground h-3.5 w-3.5" />
                <Label htmlFor="columnSpan" className="text-xs">
                  Column Span
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-muted-foreground h-3 w-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>Number of columns this cell should span horizontally</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="columnSpan"
                type="number"
                min={1}
                max={columnCount}
                value={columnSpan}
                onChange={(e) =>
                  setColumnSpan(Math.max(1, parseInt(e.target.value) || 1))
                }
                className={cn(
                  "h-9",
                  errors.columnSpan &&
                    "border-red-500 focus-visible:ring-red-500"
                )}
              />
              {errors.columnSpan && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.columnSpan}
                </p>
              )}
            </div>
          </div>

          {/* Visual span indicator */}
          <div className="bg-muted/50 rounded-md p-3">
            <div className="text-muted-foreground mb-2 text-xs">Preview</div>
            <div
              className="grid gap-0.5"
              style={{
                gridTemplateColumns: `repeat(${Math.min(columnCount, 6)}, 1fr)`,
                gridTemplateRows: `repeat(${Math.min(rowSpan + 1, 4)}, 20px)`,
              }}
            >
              {/* Render grid cells with span highlight */}
              {Array.from({
                length: Math.min(columnCount, 6) * Math.min(rowSpan + 1, 4),
              }).map((_, i) => {
                const cellRow = Math.floor(i / Math.min(columnCount, 6));
                const cellCol = i % Math.min(columnCount, 6);
                const isSpanned =
                  cellRow < rowSpan &&
                  cellCol < Math.min(columnSpan, columnCount);

                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-sm border transition-colors",
                      isSpanned
                        ? "border-blue-500 bg-blue-500/20"
                        : "bg-muted border-border/50"
                    )}
                  />
                );
              })}
            </div>
            <div className="text-muted-foreground mt-2 text-xs">
              Cell spans {rowSpan} row{rowSpan !== 1 ? "s" : ""} × {columnSpan}{" "}
              column
              {columnSpan !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <Separator />

        {/* Explicit Position Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MoveHorizontal className="text-muted-foreground h-4 w-4" />
              <h3 className="text-sm font-medium">Explicit Position</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="text-muted-foreground h-3 w-3 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>
                    Override automatic cell placement with explicit row/column
                    position. Use this for complex table layouts with merged
                    cells.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <ToggleField
              label=""
              value={useExplicitPosition}
              onChange={setUseExplicitPosition}
            />
          </div>

          {useExplicitPosition && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              {/* Row Position */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <MoveVertical className="text-muted-foreground h-3.5 w-3.5" />
                  <Label htmlFor="row" className="text-xs">
                    Row (1-based)
                  </Label>
                </div>
                <Input
                  id="row"
                  type="number"
                  min={1}
                  value={row ?? ""}
                  placeholder="Auto"
                  onChange={(e) => {
                    const val = e.target.value;
                    setRow(val ? parseInt(val) : undefined);
                  }}
                  className={cn(
                    "h-9",
                    errors.row && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.row && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {errors.row}
                  </p>
                )}
              </div>

              {/* Column Position */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <MoveHorizontal className="text-muted-foreground h-3.5 w-3.5" />
                  <Label htmlFor="column" className="text-xs">
                    Column (1-based)
                  </Label>
                </div>
                <Input
                  id="column"
                  type="number"
                  min={1}
                  max={columnCount}
                  value={column ?? ""}
                  placeholder="Auto"
                  onChange={(e) => {
                    const val = e.target.value;
                    setColumn(val ? parseInt(val) : undefined);
                  }}
                  className={cn(
                    "h-9",
                    errors.column && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {errors.column && (
                  <p className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {errors.column}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Content Type Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="text-muted-foreground h-4 w-4" />
            <h3 className="text-sm font-medium">Cell Content</h3>
          </div>

          <div className="space-y-3">
            <Label className="text-xs">Content Type</Label>
            <Select
              value={contentType}
              onValueChange={(v) =>
                handleContentTypeChange(v as CellContentType)
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <span>{option.label}</span>
                      <span className="text-muted-foreground text-xs">
                        — {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Content Preview */}
            <div className="bg-muted/50 rounded-md p-3">
              <div className="text-muted-foreground mb-1 text-xs">
                Current Content
              </div>
              <div className="text-sm font-medium">
                {getContentPreview(content)}
              </div>
              {contentType !== "empty" && contentType !== "custom" && (
                <p className="text-muted-foreground mt-2 text-xs">
                  💡 Use the Properties Panel to edit the cell content after
                  saving
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <DialogClose asChild>
          <Button variant="outline" size="sm">
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        </DialogClose>
        <Button
          onClick={handleSave}
          disabled={hasErrors}
          size="sm"
          className="gap-1"
        >
          <Check className="h-4 w-4" />
          Save Cell
          <span className="text-muted-foreground ml-1 text-xs">(⌘+Enter)</span>
        </Button>
      </DialogFooter>
    </>
  );
}

// ============================================================================
// Main Wrapper Component
// ============================================================================

/**
 * TableCellEditorModal wraps the content component in a Dialog
 * Uses key prop to reset internal state when cellData changes
 */
function TableCellEditorModal({
  open,
  onOpenChange,
  cellData,
  onSave,
  tableColumns,
  tableRowCount,
  cellRowIndex,
  cellColumnIndex,
  isHeaderCell,
  isFooterCell,
  title,
}: TableCellEditorModalProps) {
  // Generate a stable key based on cell position or content identity
  const contentKey = useMemo(() => {
    return `${cellRowIndex ?? "new"}-${cellColumnIndex ?? "new"}-${open ? "open" : "closed"}`;
  }, [cellRowIndex, cellColumnIndex, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <TableCellEditorContent
          key={contentKey}
          cellData={cellData}
          onSave={onSave}
          onClose={() => onOpenChange(false)}
          tableColumns={tableColumns}
          tableRowCount={tableRowCount}
          cellRowIndex={cellRowIndex}
          cellColumnIndex={cellColumnIndex}
          isHeaderCell={isHeaderCell}
          isFooterCell={isFooterCell}
          title={title}
        />
      </DialogContent>
    </Dialog>
  );
}

export default TableCellEditorModal;
