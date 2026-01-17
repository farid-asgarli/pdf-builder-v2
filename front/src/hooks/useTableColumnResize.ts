/**
 * useTableColumnResize Hook
 * Encapsulates table column resize interaction logic
 *
 * Features:
 * - Mouse down/move/up event handlers for column divider drag
 * - Calculate new column widths from mouse position
 * - Snap to grid increments (Ctrl key)
 * - Updates canvas store during adjustment
 * - Double-click to auto-size column
 * - Two-way binding support with properties panel
 */
"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useInteractionStore } from "@/store/interaction-store";
import { useCanvasStore } from "@/store/canvas-store";
import type { Point } from "@/types/canvas";
import type { TableColumn } from "@/types/properties";

// ============================================================================
// Types
// ============================================================================

/**
 * Column resize state exposed by the hook
 */
export interface ColumnResizeState {
  /** Whether column resize is currently active */
  isResizing: boolean;
  /** Index of the column divider being dragged */
  activeColumnIndex: number | null;
  /** Current column widths during resize */
  currentColumns: TableColumn[];
  /** Original column widths before resize started */
  originalColumns: TableColumn[];
}

/**
 * Options for the useTableColumnResize hook
 */
export interface UseTableColumnResizeOptions {
  /** Table component ID */
  componentId: string;
  /** Current column definitions */
  columns: TableColumn[];
  /** Total table width in pixels (for relative calculations) */
  totalWidth: number;
  /** Whether column resize is enabled */
  enabled?: boolean;
  /** Minimum column width in points (default: 20) */
  minColumnWidth?: number;
  /** Callback when resize starts */
  onResizeStart?: (columnIndex: number) => void;
  /** Callback during resize */
  onResize?: (columns: TableColumn[]) => void;
  /** Callback when resize ends */
  onResizeEnd?: (columns: TableColumn[] | null) => void;
  /** Callback for double-click auto-size */
  onAutoSize?: (columnIndex: number) => void;
  /** Whether to update canvas store automatically */
  updateStore?: boolean;
}

/**
 * Return type for the useTableColumnResize hook
 */
export interface UseTableColumnResizeReturn {
  /** Current column resize state */
  state: ColumnResizeState;
  /** Handler for mouse down on column divider */
  handleMouseDown: (columnIndex: number, event: React.MouseEvent) => void;
  /** Handler for double-click on column divider (auto-size) */
  handleDoubleClick: (columnIndex: number, event: React.MouseEvent) => void;
  /** Cancel current resize */
  cancelResize: () => void;
  /** Check if resize can be performed */
  canResize: boolean;
  /** Get cursor style for a column divider */
  getCursorStyle: (columnIndex: number) => string;
  /** Check if a specific divider is being resized */
  isDividerActive: (columnIndex: number) => boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default minimum column width in points */
const DEFAULT_MIN_COLUMN_WIDTH = 20;

/** Default auto-size width when content width can't be calculated */
const DEFAULT_AUTO_SIZE_WIDTH = 100;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing table column resize interactions
 */
export function useTableColumnResize({
  componentId,
  columns,
  totalWidth,
  enabled = true,
  minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
  onResizeStart,
  onResize,
  onResizeEnd,
  onAutoSize,
  updateStore = true,
}: UseTableColumnResizeOptions): UseTableColumnResizeReturn {
  // Stores
  const {
    activeInteraction,
    columnResize: storeColumnResize,
    startColumnResize,
    updateColumnResize,
    endColumnResize,
    cancelColumnResize: storeCancelResize,
  } = useInteractionStore();

  const updateComponentProperty = useCanvasStore(
    (state) => state.updateComponentProperty
  );

  // Track if this component's columns are being resized
  const isResizing =
    activeInteraction === "column-resize" &&
    storeColumnResize?.componentId === componentId;

  // Refs for tracking during resize
  const isResizingRef = useRef(false);
  const callbackRef = useRef({ onResize, onResizeEnd });

  // Update callback ref in effect
  useEffect(() => {
    callbackRef.current = { onResize, onResizeEnd };
  }, [onResize, onResizeEnd]);

  // Calculate resize state
  const state: ColumnResizeState = useMemo(
    () => ({
      isResizing,
      activeColumnIndex: isResizing
        ? (storeColumnResize?.columnIndex ?? null)
        : null,
      currentColumns: isResizing
        ? (storeColumnResize?.currentColumns ?? columns)
        : columns,
      originalColumns: isResizing
        ? (storeColumnResize?.originalColumns ?? columns)
        : columns,
    }),
    [isResizing, storeColumnResize, columns]
  );

  // Check if resize can be performed (need at least 2 columns)
  const canResize = useMemo(() => {
    return enabled && columns.length >= 2;
  }, [enabled, columns.length]);

  // ========================================
  // Mouse Event Handlers
  // ========================================

  /**
   * Handle mouse down on column divider
   */
  const handleMouseDown = useCallback(
    (columnIndex: number, event: React.MouseEvent) => {
      if (!enabled || !canResize) return;
      if (columnIndex < 0 || columnIndex >= columns.length - 1) return;

      event.preventDefault();
      event.stopPropagation();

      const startPosition: Point = {
        x: event.clientX,
        y: event.clientY,
      };

      // Start column resize in store
      startColumnResize(
        componentId,
        columnIndex,
        startPosition,
        columns,
        totalWidth,
        minColumnWidth
      );

      isResizingRef.current = true;
      onResizeStart?.(columnIndex);
    },
    [
      enabled,
      canResize,
      componentId,
      columns,
      totalWidth,
      minColumnWidth,
      startColumnResize,
      onResizeStart,
    ]
  );

  /**
   * Handle double-click on column divider for auto-size
   */
  const handleDoubleClick = useCallback(
    (columnIndex: number, event: React.MouseEvent) => {
      if (!enabled || !canResize) return;
      if (columnIndex < 0 || columnIndex >= columns.length - 1) return;

      event.preventDefault();
      event.stopPropagation();

      // Call the auto-size callback - the parent component should calculate
      // the actual content width and update accordingly
      if (onAutoSize) {
        onAutoSize(columnIndex);
      } else if (updateStore) {
        // Default behavior: set to constant width
        const newColumns = columns.map((col, idx) => {
          if (idx === columnIndex) {
            return {
              type: "constant" as const,
              value: DEFAULT_AUTO_SIZE_WIDTH,
            };
          }
          return { ...col };
        });
        updateComponentProperty(componentId, "columns", newColumns);
      }
    },
    [
      enabled,
      canResize,
      columns,
      onAutoSize,
      updateStore,
      componentId,
      updateComponentProperty,
    ]
  );

  /**
   * Handle mouse move during resize
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isResizingRef.current || !storeColumnResize) return;

      const currentPosition: Point = {
        x: event.clientX,
        y: event.clientY,
      };

      // Check for Ctrl key (snap to grid)
      const modifiers = {
        ctrl: event.ctrlKey || event.metaKey,
      };

      // Update column widths in store
      updateColumnResize(currentPosition, modifiers);
    },
    [storeColumnResize, updateColumnResize]
  );

  /**
   * Handle mouse up to end resize
   */
  const handleMouseUp = useCallback(() => {
    if (!isResizingRef.current) return;

    isResizingRef.current = false;

    const finalColumns = endColumnResize();

    if (finalColumns !== null && updateStore) {
      // Update the component's columns property
      updateComponentProperty(componentId, "columns", finalColumns);
    }

    callbackRef.current.onResizeEnd?.(finalColumns);
  }, [componentId, updateStore, endColumnResize, updateComponentProperty]);

  /**
   * Handle escape key to cancel resize
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && isResizingRef.current) {
        isResizingRef.current = false;
        storeCancelResize();
        callbackRef.current.onResizeEnd?.(null);
      }
    },
    [storeCancelResize]
  );

  /**
   * Cancel current resize
   */
  const cancelResize = useCallback(() => {
    if (isResizingRef.current) {
      isResizingRef.current = false;
      storeCancelResize();
      callbackRef.current.onResizeEnd?.(null);
    }
  }, [storeCancelResize]);

  /**
   * Get cursor style for a column divider
   */
  const getCursorStyle = useCallback(
    (columnIndex: number): string => {
      if (!canResize) return "default";
      if (columnIndex < 0 || columnIndex >= columns.length - 1)
        return "default";

      const isDragging =
        isResizing && storeColumnResize?.columnIndex === columnIndex;

      return isDragging ? "col-resize" : "col-resize";
    },
    [canResize, columns.length, isResizing, storeColumnResize]
  );

  /**
   * Check if a specific divider is being resized
   */
  const isDividerActive = useCallback(
    (columnIndex: number): boolean => {
      return isResizing && storeColumnResize?.columnIndex === columnIndex;
    },
    [isResizing, storeColumnResize]
  );

  // ========================================
  // Effect: Global Event Listeners
  // ========================================

  useEffect(() => {
    if (!isResizing) return;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isResizing, handleMouseMove, handleMouseUp, handleKeyDown]);

  // ========================================
  // Notify callback during resize
  // ========================================

  useEffect(() => {
    if (isResizing && storeColumnResize?.currentColumns) {
      callbackRef.current.onResize?.(storeColumnResize.currentColumns);
    }
  }, [isResizing, storeColumnResize?.currentColumns]);

  return {
    state,
    handleMouseDown,
    handleDoubleClick,
    cancelResize,
    canResize,
    getCursorStyle,
    isDividerActive,
  };
}

export default useTableColumnResize;
