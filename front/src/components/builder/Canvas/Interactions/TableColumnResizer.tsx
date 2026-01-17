/**
 * TableColumnResizer Component
 * Visual column dividers for adjusting table column widths
 *
 * Features:
 * - Vertical dividers between columns
 * - Drag to adjust column width
 * - Updates all rows simultaneously
 * - Shows column width tooltip during drag
 * - Double-click to auto-size column
 * - Visual feedback for active state
 */
"use client";

import React, { memo, useCallback, useMemo, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTableColumnResize } from "@/hooks/useTableColumnResize";
import type { TableColumn } from "@/types/properties";
import { GripVertical } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for TableColumnResizer component
 */
export interface TableColumnResizerProps {
  /** Table component ID */
  componentId: string;
  /** Current column definitions */
  columns: TableColumn[];
  /** Total table width in pixels */
  totalWidth: number;
  /** Whether the resizer is enabled */
  enabled?: boolean;
  /** Minimum column width in points (default: 20) */
  minColumnWidth?: number;
  /** Callback when columns change */
  onColumnsChange?: (columns: TableColumn[]) => void;
  /** Callback when double-click auto-size is triggered */
  onAutoSizeColumn?: (columnIndex: number) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for individual column divider
 */
interface ColumnDividerProps {
  /** Index of the divider (between column N and N+1) */
  dividerIndex: number;
  /** Left column definition */
  leftColumn: TableColumn;
  /** Right column definition */
  rightColumn: TableColumn;
  /** Whether this divider is being dragged */
  isActive: boolean;
  /** Whether resize is enabled */
  enabled: boolean;
  /** Handler for mouse down */
  onMouseDown: (index: number, event: React.MouseEvent) => void;
  /** Handler for double click (auto-size) */
  onDoubleClick: (index: number, event: React.MouseEvent) => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Divider hit area width in pixels */
const DIVIDER_HIT_WIDTH = 12;

/** Visual divider line width */
const DIVIDER_LINE_WIDTH = 2;

/** Points to pixels conversion factor (approximate) */
const POINTS_TO_PIXELS = 1.33;

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Width tooltip showing current column widths during resize
 */
interface WidthTooltipProps {
  leftColumn: TableColumn;
  rightColumn: TableColumn;
  visible: boolean;
  isSnapped?: boolean;
  className?: string;
}

const WidthTooltip = memo(function WidthTooltip({
  leftColumn,
  rightColumn,
  visible,
  isSnapped,
  className,
}: WidthTooltipProps) {
  if (!visible) return null;

  const formatValue = (col: TableColumn) => {
    if (col.type === "constant") {
      return `${Math.round(col.value)}pt`;
    }
    return `${col.value.toFixed(1)}*`;
  };

  return (
    <div
      className={cn(
        // Base styles
        "pointer-events-none absolute z-100",
        "rounded-md px-2 py-1 shadow-lg",
        "text-xs font-medium whitespace-nowrap",
        "-translate-x-1/2 transform",
        "transition-opacity duration-100",
        // Position above divider
        "-top-8 left-1/2",
        // Color based on state
        isSnapped
          ? "bg-primary text-primary-foreground"
          : "bg-gray-800 text-white",
        // Visibility
        visible ? "opacity-100" : "opacity-0",
        className
      )}
      role="tooltip"
      aria-live="polite"
    >
      <span className="flex items-center gap-1.5">
        <span className="text-gray-300">←</span>
        {formatValue(leftColumn)}
        <span className="text-gray-400">|</span>
        {formatValue(rightColumn)}
        <span className="text-gray-300">→</span>
        {isSnapped && <span className="text-[10px] opacity-75">●</span>}
      </span>
    </div>
  );
});

WidthTooltip.displayName = "WidthTooltip";

/**
 * Individual column divider component
 */
const ColumnDivider = memo(function ColumnDivider({
  dividerIndex,
  leftColumn,
  rightColumn,
  isActive,
  enabled,
  onMouseDown,
  onDoubleClick,
}: ColumnDividerProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!enabled) return;
      onMouseDown(dividerIndex, event);
    },
    [enabled, dividerIndex, onMouseDown]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!enabled) return;
      onDoubleClick(dividerIndex, event);
    },
    [enabled, dividerIndex, onDoubleClick]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div
      className={cn(
        // Base styles - absolute positioning within column header
        "absolute top-0 bottom-0 z-10",
        "flex items-center justify-center",
        // Cursor
        enabled ? "cursor-col-resize" : "cursor-default",
        // Hit area
        "group"
      )}
      style={{
        width: DIVIDER_HIT_WIDTH,
        marginLeft: -(DIVIDER_HIT_WIDTH / 2),
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-divider-index={dividerIndex}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize divider between column ${dividerIndex + 1} and ${dividerIndex + 2}`}
      tabIndex={enabled ? 0 : -1}
    >
      {/* Tooltip */}
      <WidthTooltip
        leftColumn={leftColumn}
        rightColumn={rightColumn}
        visible={isActive}
        isSnapped={false}
      />

      {/* Visual divider line */}
      <div
        className={cn(
          "absolute top-0 bottom-0 transition-all duration-100",
          // Default state
          "bg-border/50",
          // Hover state
          (isHovered || isActive) && enabled && "bg-primary",
          // Active state
          isActive && "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]"
        )}
        style={{
          width: isActive ? DIVIDER_LINE_WIDTH + 1 : DIVIDER_LINE_WIDTH,
        }}
      />

      {/* Grip handle indicator */}
      <div
        className={cn(
          "absolute flex items-center justify-center",
          "rounded-full transition-all duration-150",
          "h-6 w-6",
          // Default state - hidden
          "opacity-0",
          // Hover state
          (isHovered || isActive) && enabled && "opacity-100",
          // Background colors
          isActive
            ? "border-primary bg-primary/20 border-2"
            : "border-muted-foreground/30 bg-background border"
        )}
      >
        <GripVertical
          className={cn(
            "h-4 w-4 transition-colors",
            isActive
              ? "text-primary"
              : "text-muted-foreground/60 group-hover:text-primary/80"
          )}
        />
      </div>

      {/* Auto-size hint on hover (when not dragging) */}
      {isHovered && !isActive && enabled && (
        <div
          className={cn(
            "pointer-events-none absolute z-50",
            "rounded px-1.5 py-0.5 text-[9px]",
            "bg-muted text-muted-foreground",
            "-bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
          )}
        >
          Double-click to auto-size
        </div>
      )}
    </div>
  );
});

ColumnDivider.displayName = "ColumnDivider";

// ============================================================================
// Main Component
// ============================================================================

/**
 * TableColumnResizer Component
 * Renders column dividers for a table that can be dragged to resize
 */
function TableColumnResizerComponent({
  componentId,
  columns,
  totalWidth,
  enabled = true,
  minColumnWidth = 20,
  onColumnsChange,
  onAutoSizeColumn,
  className,
}: TableColumnResizerProps) {
  // Container ref for position calculations
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the column resize hook
  const {
    state,
    handleMouseDown,
    handleDoubleClick,
    canResize,
    isDividerActive,
  } = useTableColumnResize({
    componentId,
    columns,
    totalWidth,
    enabled,
    minColumnWidth,
    onResize: onColumnsChange,
    onResizeEnd: (newColumns) => {
      if (newColumns) {
        onColumnsChange?.(newColumns);
      }
    },
    onAutoSize: onAutoSizeColumn,
  });

  // Get current columns (may be different during resize)
  const currentColumns = state.isResizing ? state.currentColumns : columns;

  // Calculate column positions (cumulative widths)
  const columnPositions = useMemo(() => {
    const positions: number[] = [];
    let accumulatedWidth = 0;

    // Calculate total relative value for percentage conversion
    const totalRelative =
      currentColumns
        .filter((c) => c.type === "relative")
        .reduce((sum, c) => sum + c.value, 0) || 1;

    // Remaining width after constant columns
    const constantTotal = currentColumns
      .filter((c) => c.type === "constant")
      .reduce((sum, c) => sum + c.value * POINTS_TO_PIXELS, 0);
    const relativeWidth = totalWidth - constantTotal;

    currentColumns.forEach((col, index) => {
      let colWidth: number;
      if (col.type === "constant") {
        colWidth = col.value * POINTS_TO_PIXELS;
      } else {
        colWidth = (col.value / totalRelative) * relativeWidth;
      }
      accumulatedWidth += colWidth;

      // Don't add position after the last column
      if (index < currentColumns.length - 1) {
        positions.push(accumulatedWidth);
      }
    });

    return positions;
  }, [currentColumns, totalWidth]);

  // ========================================
  // Render
  // ========================================

  if (!canResize || currentColumns.length < 2) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0",
        "*:pointer-events-auto",
        className
      )}
      data-testid="table-column-resizer"
    >
      {/* Render dividers at calculated positions */}
      {columnPositions.map((position, index) => (
        <div
          key={`divider-${index}`}
          className="absolute top-0 bottom-0"
          style={{ left: position }}
        >
          <ColumnDivider
            dividerIndex={index}
            leftColumn={currentColumns[index]}
            rightColumn={currentColumns[index + 1]}
            isActive={isDividerActive(index)}
            enabled={enabled}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
          />
        </div>
      ))}

      {/* Overlay during resize to capture all mouse events */}
      {state.isResizing && (
        <div
          className="fixed inset-0 z-50 cursor-col-resize"
          style={{ pointerEvents: "all" }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export const TableColumnResizer = memo(TableColumnResizerComponent);
TableColumnResizer.displayName = "TableColumnResizer";

export default TableColumnResizer;
