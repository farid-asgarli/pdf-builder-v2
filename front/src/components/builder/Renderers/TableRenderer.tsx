/**
 * Table Renderer
 * Visual renderer for Table components in the canvas
 *
 * Features:
 * - Grid structure visualization with columns and rows
 * - Dynamic column width display (relative/constant)
 * - Selection state handling
 * - Drag and drop target
 * - Empty state placeholder
 * - Visual indicators for table structure (header, footer)
 * - Cell spanning visualization
 * - Interactive column width adjustment via drag handles
 */
"use client";

import React, {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import {
  RENDERER_CONTAINER_STYLES,
  COMPONENT_CATEGORY_COLORS,
  MIN_CONTAINER_SIZE,
} from "./types";
import { ChildRenderer, ComponentLabel } from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { TableProperties, TableColumn } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { Table2, GripHorizontal } from "lucide-react";
import { TableColumnResizer } from "../Canvas/Interactions";
import { useCanvasStore } from "@/store/canvas-store";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Table renderer
 */
export interface TableRendererProps extends RendererProps {
  /** Override column definitions (for preview) */
  previewColumns?: TableColumn[];
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum cell width in pixels for visualization */
const MIN_CELL_WIDTH = 60;

/** Minimum cell height in pixels */
const MIN_CELL_HEIGHT = 32;

/** Maximum columns to display (for performance) */
const MAX_DISPLAY_COLUMNS = 12;

/** Default column count when no definition provided */
const DEFAULT_COLUMN_COUNT = 3;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse column definitions from properties
 */
function parseColumnDefinitions(
  properties: Record<string, unknown>
): TableColumn[] {
  const tableProps = properties as unknown as TableProperties;
  if (tableProps.columns && Array.isArray(tableProps.columns)) {
    return tableProps.columns.slice(0, MAX_DISPLAY_COLUMNS);
  }
  // Default: 3 relative columns
  return Array(DEFAULT_COLUMN_COUNT)
    .fill(null)
    .map(() => ({ type: "relative" as const, value: 1 }));
}

/**
 * Calculate visual widths for columns
 * Converts relative/constant definitions to flex or fixed widths
 */
function calculateColumnWidths(columns: TableColumn[]): string[] {
  const totalRelative = columns
    .filter((c) => c.type === "relative")
    .reduce((sum, c) => sum + c.value, 0);

  return columns.map((col) => {
    if (col.type === "constant") {
      return `${Math.max(col.value, MIN_CELL_WIDTH)}px`;
    }
    // Relative: use flex-based percentage
    const percentage =
      totalRelative > 0
        ? (col.value / totalRelative) * 100
        : 100 / columns.length;
    return `${percentage}%`;
  });
}

/**
 * Format column definition for display
 */
function formatColumnDef(col: TableColumn): string {
  if (col.type === "constant") {
    return `${col.value}pt`;
  }
  return `${col.value}*`;
}

/**
 * Calculate grid dimensions based on children
 */
function calculateGridDimensions(
  childCount: number,
  columnCount: number
): { rows: number; cols: number } {
  if (childCount === 0) {
    return { rows: 1, cols: columnCount };
  }
  const rows = Math.ceil(childCount / columnCount);
  return { rows, cols: columnCount };
}

// ============================================================================
// Component
// ============================================================================

/**
 * Table Renderer Component
 * Renders a table container with grid structure
 */
function TableRendererComponent({
  node,
  depth,
  isSelected,
  isPrimarySelection,
  isHovered,
  isDropTarget,
  onClick,
  onDoubleClick,
  onContextMenu,
  className,
  hideChildren,
  previewColumns,
}: TableRendererProps) {
  // ========================================
  // Refs & State
  // ========================================

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Get updateComponentProperty from canvas store
  const updateComponentProperty = useCanvasStore(
    (state) => state.updateComponentProperty
  );

  // ========================================
  // Effects
  // ========================================

  // Measure container width for column resize calculations
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const rect = container.getBoundingClientRect();
      setContainerWidth(rect.width - 16); // Account for padding
    };

    // Initial measurement
    updateWidth();

    // Observe resize
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // ========================================
  // Event Handlers
  // ========================================

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(e, node.id);
    },
    [onClick, node.id]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(e, node.id);
    },
    [onDoubleClick, node.id]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e, node.id);
    },
    [onContextMenu, node.id]
  );

  /**
   * Handle column width changes from TableColumnResizer
   */
  const handleColumnsChange = useCallback(
    (newColumns: TableColumn[]) => {
      updateComponentProperty(node.id, "columns", newColumns);
    },
    [node.id, updateComponentProperty]
  );

  /**
   * Handle auto-size column (double-click on divider)
   * Sets the column to a reasonable constant width based on content estimation
   */
  const handleAutoSizeColumn = useCallback(
    (columnIndex: number) => {
      const currentCols = parseColumnDefinitions(node.properties);
      const newColumns = currentCols.map((col, idx) => {
        if (idx === columnIndex) {
          // Auto-size: convert to constant width with a reasonable default
          // In a real implementation, this could measure cell content
          return {
            type: "constant" as const,
            value: 100, // Default auto-size width in points
          };
        }
        return { ...col };
      });
      updateComponentProperty(node.id, "columns", newColumns);
    },
    [node.id, node.properties, updateComponentProperty]
  );

  // ========================================
  // Computed Values
  // ========================================

  const hasChildren = node.children && node.children.length > 0;

  // Get column definitions from properties or use override
  const columns = useMemo(() => {
    if (previewColumns) {
      return previewColumns.slice(0, MAX_DISPLAY_COLUMNS);
    }
    return parseColumnDefinitions(node.properties);
  }, [node.properties, previewColumns]);

  // Calculate visual column widths
  const columnWidths = useMemo(() => calculateColumnWidths(columns), [columns]);

  // Calculate grid dimensions
  const gridDimensions = useMemo(
    () => calculateGridDimensions(node.children?.length ?? 0, columns.length),
    [node.children?.length, columns.length]
  );

  // Check for header/footer in properties
  const tableProps = node.properties as unknown as TableProperties;
  const hasHeader = tableProps.header !== undefined;
  const hasFooter = tableProps.footer !== undefined;

  // ========================================
  // Render
  // ========================================

  return (
    <div
      ref={containerRef}
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "relative rounded-sm border",
        COMPONENT_CATEGORY_COLORS.container,
        isSelected && RENDERER_CONTAINER_STYLES.selected,
        isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
        isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
        isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
        className
      )}
      style={{
        minWidth: Math.max(
          MIN_CONTAINER_SIZE.width,
          columns.length * MIN_CELL_WIDTH
        ),
        marginLeft: depth > 0 ? 4 : 0,
        padding: 8,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      data-component-id={node.id}
      data-component-type={node.type}
      data-depth={depth}
      role="region"
      aria-label={`Table with ${columns.length} columns and ${gridDimensions.rows} rows`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Table" />

      {/* Table header with icon and info */}
      <div className="mb-2 flex items-center gap-1.5 border-b border-blue-500/20 pb-1.5">
        <Table2 className="h-3.5 w-3.5 text-blue-500/70" />
        <span className="text-[10px] font-medium tracking-wide text-blue-600/80 uppercase">
          Table
        </span>
        <span className="text-muted-foreground ml-auto text-[9px]">
          {columns.length} col{columns.length !== 1 ? "s" : ""} ×{" "}
          {gridDimensions.rows} row{gridDimensions.rows !== 1 ? "s" : ""}
        </span>
        {(hasHeader || hasFooter) && (
          <span className="text-muted-foreground bg-muted rounded px-1 text-[9px]">
            {hasHeader && "H"}
            {hasHeader && hasFooter && "/"}
            {hasFooter && "F"}
          </span>
        )}
      </div>

      {/* Column definitions indicator */}
      <ColumnDefinitionsBar columns={columns} columnWidths={columnWidths} />

      {/* Table grid area */}
      {!hideChildren && (
        <div className="border-border/50 mt-2 overflow-hidden rounded border">
          {/* Header row indicator (if defined) */}
          {hasHeader && (
            <TableSectionIndicator type="header" columnCount={columns.length} />
          )}

          {/* Main table grid */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: columnWidths.join(" "),
            }}
          >
            {hasChildren ? (
              // Render children in grid cells
              node.children!.map((child, index) => (
                <TableCellWrapper
                  key={child.id}
                  index={index}
                  columnCount={columns.length}
                  isSelected={isSelected}
                >
                  <ChildRenderer
                    node={child}
                    depth={depth + 1}
                    onClick={onClick}
                    onDoubleClick={onDoubleClick}
                    onContextMenu={onContextMenu}
                  />
                </TableCellWrapper>
              ))
            ) : (
              // Empty state: show placeholder cells
              <EmptyTableGrid
                columns={columns.length}
                rows={1}
                onDrop={() => {}}
              />
            )}
          </div>

          {/* Footer row indicator (if defined) */}
          {hasFooter && (
            <TableSectionIndicator type="footer" columnCount={columns.length} />
          )}
        </div>
      )}

      {/* Info overlay when selected */}
      {isSelected && hasChildren && (
        <div className="absolute right-1 bottom-1 rounded bg-blue-500/90 px-1 py-0.5 text-[9px] text-white">
          {node.children!.length} cell{node.children!.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Column width adjusters - shown when selected and has multiple columns */}
      {isSelected && columns.length >= 2 && containerWidth > 0 && (
        <TableColumnResizer
          componentId={node.id}
          columns={columns}
          totalWidth={containerWidth}
          enabled={isPrimarySelection}
          minColumnWidth={20}
          onColumnsChange={handleColumnsChange}
          onAutoSizeColumn={handleAutoSizeColumn}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Visual indicator for column definitions
 */
const ColumnDefinitionsBar = memo(function ColumnDefinitionsBar({
  columns,
  columnWidths,
}: {
  columns: TableColumn[];
  columnWidths: string[];
}) {
  return (
    <div className="border-border/30 mb-1 flex gap-px overflow-hidden rounded-sm border">
      {columns.map((col, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center justify-center py-1 text-[8px] font-medium transition-colors",
            col.type === "constant"
              ? "bg-orange-500/10 text-orange-600/80"
              : "bg-blue-500/10 text-blue-600/80"
          )}
          style={{ width: columnWidths[index], minWidth: MIN_CELL_WIDTH / 2 }}
          title={`Column ${index + 1}: ${col.type === "constant" ? "Constant" : "Relative"} (${formatColumnDef(col)})`}
        >
          <GripHorizontal className="mr-0.5 h-2.5 w-2.5 opacity-50" />
          {formatColumnDef(col)}
        </div>
      ))}
    </div>
  );
});

ColumnDefinitionsBar.displayName = "ColumnDefinitionsBar";

/**
 * Wrapper for table cells with visual indicators
 */
const TableCellWrapper = memo(function TableCellWrapper({
  children,
  index,
  columnCount,
  isSelected,
}: {
  children: React.ReactNode;
  index: number;
  columnCount: number;
  isSelected?: boolean;
}) {
  const row = Math.floor(index / columnCount);
  const col = index % columnCount;

  return (
    <div
      className={cn(
        "border-border/30 relative border p-1 transition-colors",
        "hover:bg-accent/30",
        isSelected && "bg-primary/5"
      )}
      style={{ minHeight: MIN_CELL_HEIGHT }}
      data-cell-index={index}
      data-cell-row={row}
      data-cell-col={col}
    >
      {/* Cell position indicator (shown on hover) */}
      <span className="text-muted-foreground/30 pointer-events-none absolute top-0.5 left-0.5 text-[7px] opacity-0 transition-opacity group-hover:opacity-100">
        {row + 1},{col + 1}
      </span>
      {children}
    </div>
  );
});

TableCellWrapper.displayName = "TableCellWrapper";

/**
 * Visual indicator for header/footer sections
 */
const TableSectionIndicator = memo(function TableSectionIndicator({
  type,
  columnCount,
}: {
  type: "header" | "footer";
  columnCount: number;
}) {
  const isHeader = type === "header";

  return (
    <div
      className={cn(
        "border-border/30 flex items-center justify-center border-x px-2 py-1",
        isHeader
          ? "border-t bg-blue-500/10 text-blue-600/70"
          : "border-b bg-gray-500/10 text-gray-600/70"
      )}
    >
      <span className="text-[9px] font-medium tracking-wider uppercase">
        {isHeader ? "Header" : "Footer"} (spans {columnCount} columns)
      </span>
    </div>
  );
});

TableSectionIndicator.displayName = "TableSectionIndicator";

/**
 * Empty grid placeholder for tables without children
 */
const EmptyTableGrid = memo(function EmptyTableGrid({
  columns,
  rows,
  onDrop: _onDrop,
}: {
  columns: number;
  rows: number;
  onDrop: () => void;
}) {
  const cells = Array(columns * rows).fill(null);

  return (
    <>
      {cells.map((_, index) => (
        <div
          key={index}
          className={cn(
            "border-border/40 flex items-center justify-center border border-dashed p-2",
            "text-muted-foreground/40 text-[10px]",
            "hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-colors"
          )}
          style={{ minHeight: MIN_CELL_HEIGHT }}
        >
          {index === Math.floor(cells.length / 2) ? (
            <span>Drop content here</span>
          ) : (
            <span className="opacity-0">·</span>
          )}
        </div>
      ))}
    </>
  );
});

EmptyTableGrid.displayName = "EmptyTableGrid";

// ============================================================================
// Exports & Registration
// ============================================================================

export const TableRenderer = memo(TableRendererComponent);
TableRenderer.displayName = "TableRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Table, TableRenderer);

export default TableRenderer;
