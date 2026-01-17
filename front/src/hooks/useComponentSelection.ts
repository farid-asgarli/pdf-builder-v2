/**
 * useComponentSelection Hook
 *
 * A higher-level hook that combines the selection store with the canvas store
 * to provide selection functionality with full component data.
 *
 * Features:
 * - Get selected components (not just IDs)
 * - Selection with keyboard modifiers (Ctrl/Shift)
 * - Integration with canvas tree for range selection
 * - Automatic validation of selection against canvas state
 */
"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import {
  useSelectionStore,
  useSelectedIds,
  usePrimarySelectedId,
  useHasSelection,
  useIsMultiSelection,
} from "@/store/selection-store";
import type { LayoutNode } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

export interface ComponentSelectionState {
  /** Array of selected component IDs */
  selectedIds: string[];

  /** Array of selected component nodes */
  selectedComponents: LayoutNode[];

  /** The primary (first) selected component ID */
  primarySelectedId: string | null;

  /** The primary (first) selected component node */
  primarySelectedComponent: LayoutNode | null;

  /** Whether any component is selected */
  hasSelection: boolean;

  /** Whether multiple components are selected */
  isMultiSelection: boolean;

  /** Number of selected components */
  selectionCount: number;
}

export interface ComponentSelectionActions {
  /**
   * Select a component, optionally with keyboard modifiers
   * @param id - Component ID to select
   * @param modifiers - Keyboard modifiers (ctrl, shift)
   */
  handleSelect: (
    id: string,
    modifiers?: { ctrl?: boolean; shift?: boolean; meta?: boolean }
  ) => void;

  /**
   * Simple select (replaces current selection)
   * @param id - Component ID to select
   */
  select: (id: string) => void;

  /**
   * Select multiple components
   * @param ids - Array of component IDs to select
   */
  selectMultiple: (ids: string[]) => void;

  /**
   * Toggle selection of a component
   * @param id - Component ID to toggle
   */
  toggleSelection: (id: string) => void;

  /**
   * Add a component to selection
   * @param id - Component ID to add
   */
  addToSelection: (id: string) => void;

  /**
   * Remove a component from selection
   * @param id - Component ID to remove
   */
  removeFromSelection: (id: string) => void;

  /**
   * Clear all selections
   */
  clearSelection: () => void;

  /**
   * Select all components in the canvas
   */
  selectAllComponents: () => void;

  /**
   * Check if a specific component is selected
   * @param id - Component ID to check
   */
  isSelected: (id: string) => boolean;

  /**
   * Delete all selected components
   */
  deleteSelected: () => { success: boolean; deletedCount: number };

  /**
   * Get the parent of the primary selected component
   */
  getSelectedParent: () => LayoutNode | null;
}

export interface UseComponentSelectionReturn
  extends ComponentSelectionState, ComponentSelectionActions {}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing component selection with canvas integration
 */
export function useComponentSelection(): UseComponentSelectionReturn {
  // Get stores
  const canvasStore = useCanvasStore();
  const selectionStore = useSelectionStore();

  // Optimized state selectors
  const selectedIds = useSelectedIds();
  const primarySelectedId = usePrimarySelectedId();
  const hasSelection = useHasSelection();
  const isMultiSelection = useIsMultiSelection();

  // Get all node IDs for range selection
  const allNodeIds = useMemo(() => {
    return canvasStore.getAllNodeIds();
  }, [canvasStore]);

  // Get selected components
  const selectedComponents = useMemo(() => {
    return selectedIds
      .map((id) => canvasStore.getComponent(id))
      .filter((node): node is LayoutNode => node !== null);
  }, [selectedIds, canvasStore]);

  // Get primary selected component
  const primarySelectedComponent = useMemo(() => {
    if (!primarySelectedId) return null;
    return canvasStore.getComponent(primarySelectedId);
  }, [primarySelectedId, canvasStore]);

  // Validate selection when canvas changes
  // We track root changes to revalidate when tree structure changes
  const root = canvasStore.root;
  useEffect(() => {
    const validIds = new Set(canvasStore.getAllNodeIds());
    selectionStore.validateSelection(validIds);
  }, [root, canvasStore, selectionStore]);

  // ========================================
  // Action Handlers
  // ========================================

  /**
   * Handle selection with keyboard modifiers
   */
  const handleSelect = useCallback(
    (
      id: string,
      modifiers?: { ctrl?: boolean; shift?: boolean; meta?: boolean }
    ) => {
      const { ctrl = false, shift = false, meta = false } = modifiers ?? {};

      // Mac uses meta (Cmd), Windows uses ctrl
      const isAdditive = ctrl || meta;

      if (shift) {
        // Range selection
        selectionStore.selectRange(id, allNodeIds);
      } else if (isAdditive) {
        // Toggle selection (Ctrl/Cmd + Click)
        selectionStore.toggleSelection(id);
      } else {
        // Simple selection
        selectionStore.select(id);
      }
    },
    [selectionStore, allNodeIds]
  );

  /**
   * Simple select
   */
  const select = useCallback(
    (id: string) => {
      selectionStore.select(id);
    },
    [selectionStore]
  );

  /**
   * Select multiple components
   */
  const selectMultiple = useCallback(
    (ids: string[]) => {
      selectionStore.selectMultiple(ids);
    },
    [selectionStore]
  );

  /**
   * Toggle selection
   */
  const toggleSelection = useCallback(
    (id: string) => {
      selectionStore.toggleSelection(id);
    },
    [selectionStore]
  );

  /**
   * Add to selection
   */
  const addToSelection = useCallback(
    (id: string) => {
      selectionStore.addToSelection(id);
    },
    [selectionStore]
  );

  /**
   * Remove from selection
   */
  const removeFromSelection = useCallback(
    (id: string) => {
      selectionStore.removeFromSelection(id);
    },
    [selectionStore]
  );

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    selectionStore.clearSelection();
  }, [selectionStore]);

  /**
   * Select all components
   */
  const selectAllComponents = useCallback(() => {
    const allIds = canvasStore.getAllNodeIds();
    selectionStore.selectAll(allIds);
  }, [canvasStore, selectionStore]);

  /**
   * Check if component is selected
   */
  const isSelected = useCallback(
    (id: string) => {
      return selectionStore.isSelected(id);
    },
    [selectionStore]
  );

  /**
   * Delete all selected components
   */
  const deleteSelected = useCallback(() => {
    const idsToDelete = [...selectedIds];
    let deletedCount = 0;

    // Delete in reverse order to handle nested components correctly
    // (children should be deleted before parents)
    for (const id of idsToDelete.reverse()) {
      const result = canvasStore.deleteComponent(id);
      if (result.success) {
        deletedCount++;
      }
    }

    // Clear selection after deletion
    selectionStore.clearSelection();

    return {
      success: deletedCount > 0,
      deletedCount,
    };
  }, [selectedIds, canvasStore, selectionStore]);

  /**
   * Get parent of primary selected component
   */
  const getSelectedParent = useCallback(() => {
    if (!primarySelectedId) return null;
    return canvasStore.getParent(primarySelectedId);
  }, [primarySelectedId, canvasStore]);

  // ========================================
  // Return Value
  // ========================================

  return {
    // State
    selectedIds,
    selectedComponents,
    primarySelectedId,
    primarySelectedComponent,
    hasSelection,
    isMultiSelection,
    selectionCount: selectedIds.length,

    // Actions
    handleSelect,
    select,
    selectMultiple,
    toggleSelection,
    addToSelection,
    removeFromSelection,
    clearSelection,
    selectAllComponents,
    isSelected,
    deleteSelected,
    getSelectedParent,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get just the primary selected component
 * Optimized for components that only care about the primary selection
 */
export function usePrimarySelection(): {
  primaryId: string | null;
  primaryComponent: LayoutNode | null;
} {
  const primaryId = usePrimarySelectedId();
  const canvasStore = useCanvasStore();

  const primaryComponent = useMemo(() => {
    if (!primaryId) return null;
    return canvasStore.getComponent(primaryId);
  }, [primaryId, canvasStore]);

  return { primaryId, primaryComponent };
}

/**
 * Hook to check if a specific component is selected
 * More efficient than using the full useComponentSelection hook
 */
export function useIsComponentSelected(id: string): boolean {
  return useSelectionStore((state) => state.selectedIds.includes(id));
}

/**
 * Hook for keyboard-driven selection navigation
 */
export function useSelectionNavigation() {
  const selectionStore = useSelectionStore();
  const canvasStore = useCanvasStore();

  const allNodeIds = useMemo(() => {
    return canvasStore.getAllNodeIds();
  }, [canvasStore]);

  const focusedId = useSelectionStore((state) => state.focusedId);

  const focusNext = useCallback(() => {
    selectionStore.focusNext(allNodeIds);
  }, [selectionStore, allNodeIds]);

  const focusPrevious = useCallback(() => {
    selectionStore.focusPrevious(allNodeIds);
  }, [selectionStore, allNodeIds]);

  const selectFocused = useCallback(() => {
    if (focusedId) {
      selectionStore.select(focusedId);
    }
  }, [selectionStore, focusedId]);

  const toggleFocused = useCallback(() => {
    if (focusedId) {
      selectionStore.toggleSelection(focusedId);
    }
  }, [selectionStore, focusedId]);

  return {
    focusedId,
    focusNext,
    focusPrevious,
    selectFocused,
    toggleFocused,
  };
}

export default useComponentSelection;
