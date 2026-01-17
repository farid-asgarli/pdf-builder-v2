/**
 * Selection Store
 * Manages the currently selected component(s) in the canvas
 *
 * Features:
 * - Single and multi-selection support
 * - Selection change handlers with subscriptions
 * - Range selection for Shift+Click
 * - Primary selection tracking for properties panel
 * - Selection validation
 * - Integration with canvas store
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ============================================================================
// Types
// ============================================================================

/**
 * Selection mode for different interaction patterns
 */
export type SelectionMode = "single" | "multi" | "range";

/**
 * Selection change event for handlers
 */
export interface SelectionChangeEvent {
  previousIds: string[];
  currentIds: string[];
  added: string[];
  removed: string[];
  primaryId: string | null;
}

/**
 * Selection change handler callback
 */
export type SelectionChangeHandler = (event: SelectionChangeEvent) => void;

/**
 * Options for select operations
 */
export interface SelectOptions {
  /** Add to existing selection instead of replacing */
  additive?: boolean;
  /** Toggle if already selected */
  toggle?: boolean;
  /** Perform range selection from anchor to this id */
  range?: boolean;
}

/**
 * Selection state interface
 */
interface SelectionState {
  // ========================================
  // State
  // ========================================

  /** Currently selected component IDs (ordered, first is primary) */
  selectedIds: string[];

  /** Anchor ID for range selection (Shift+Click) */
  anchorId: string | null;

  /** Last focused ID (for keyboard navigation) */
  focusedId: string | null;

  /** Whether selection changes are currently locked */
  isLocked: boolean;

  // ========================================
  // Core Selection Actions
  // ========================================

  /**
   * Select a single component (replaces current selection)
   * @param id - Component ID to select
   */
  select: (id: string) => void;

  /**
   * Select multiple components (replaces current selection)
   * @param ids - Array of component IDs to select
   */
  selectMultiple: (ids: string[]) => void;

  /**
   * Select a component with options (additive, toggle, range)
   * @param id - Component ID to select
   * @param options - Selection options
   */
  selectWithOptions: (id: string, options: SelectOptions) => void;

  /**
   * Toggle selection of a component
   * @param id - Component ID to toggle
   */
  toggleSelection: (id: string) => void;

  /**
   * Add a component to the current selection
   * @param id - Component ID to add
   */
  addToSelection: (id: string) => void;

  /**
   * Add multiple components to the current selection
   * @param ids - Array of component IDs to add
   */
  addMultipleToSelection: (ids: string[]) => void;

  /**
   * Remove a component from the current selection
   * @param id - Component ID to remove
   */
  removeFromSelection: (id: string) => void;

  /**
   * Remove multiple components from the current selection
   * @param ids - Array of component IDs to remove
   */
  removeMultipleFromSelection: (ids: string[]) => void;

  /**
   * Clear all selections
   */
  clearSelection: () => void;

  /**
   * Select all provided IDs (used with canvas store's getAllNodeIds)
   * @param ids - All available component IDs
   */
  selectAll: (ids: string[]) => void;

  // ========================================
  // Range Selection Actions
  // ========================================

  /**
   * Set the anchor point for range selection
   * @param id - Component ID to set as anchor
   */
  setAnchor: (id: string | null) => void;

  /**
   * Perform range selection from anchor to target
   * Requires orderedIds from parent to determine range
   * @param targetId - End of range selection
   * @param orderedIds - Ordered list of all IDs for range calculation
   */
  selectRange: (targetId: string, orderedIds: string[]) => void;

  // ========================================
  // Focus Management
  // ========================================

  /**
   * Set the focused component (for keyboard navigation)
   * @param id - Component ID to focus
   */
  setFocused: (id: string | null) => void;

  /**
   * Move focus to the next component in the list
   * @param orderedIds - Ordered list of all IDs
   */
  focusNext: (orderedIds: string[]) => void;

  /**
   * Move focus to the previous component in the list
   * @param orderedIds - Ordered list of all IDs
   */
  focusPrevious: (orderedIds: string[]) => void;

  // ========================================
  // Lock Management
  // ========================================

  /**
   * Lock selection changes (e.g., during drag operations)
   */
  lock: () => void;

  /**
   * Unlock selection changes
   */
  unlock: () => void;

  // ========================================
  // Query Utilities
  // ========================================

  /**
   * Check if a component is selected
   * @param id - Component ID to check
   */
  isSelected: (id: string) => boolean;

  /**
   * Check if there are any selected components
   */
  hasSelection: () => boolean;

  /**
   * Get the count of selected components
   */
  getSelectedCount: () => number;

  /**
   * Get the primary (first) selected component ID
   */
  getPrimarySelectedId: () => string | null;

  /**
   * Get all selected IDs as a Set for fast lookup
   */
  getSelectedSet: () => Set<string>;

  /**
   * Check if multiple components are selected
   */
  isMultiSelection: () => boolean;

  // ========================================
  // Validation Utilities
  // ========================================

  /**
   * Remove any selected IDs that no longer exist
   * @param validIds - Set of valid component IDs
   */
  validateSelection: (validIds: Set<string>) => void;

  /**
   * Filter selection to only include IDs from the provided set
   * @param allowedIds - Set of allowed component IDs
   */
  filterSelection: (allowedIds: Set<string>) => void;
}

// ============================================================================
// Store Creation with subscribeWithSelector middleware
// ============================================================================

export const useSelectionStore = create<SelectionState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================
    // Initial State
    // ========================================
    selectedIds: [],
    anchorId: null,
    focusedId: null,
    isLocked: false,

    // ========================================
    // Core Selection Actions
    // ========================================

    select: (id) => {
      const state = get();
      if (state.isLocked) return;

      const previousIds = state.selectedIds;
      if (previousIds.length === 1 && previousIds[0] === id) {
        // Already selected, no change needed
        return;
      }

      set({
        selectedIds: [id],
        anchorId: id,
        focusedId: id,
      });
    },

    selectMultiple: (ids) => {
      const state = get();
      if (state.isLocked) return;

      // Remove duplicates while preserving order
      const uniqueIds = [...new Set(ids)];

      set({
        selectedIds: uniqueIds,
        anchorId: uniqueIds[0] ?? null,
        focusedId: uniqueIds[0] ?? null,
      });
    },

    selectWithOptions: (id, options) => {
      const state = get();
      if (state.isLocked) return;

      const { additive = false, toggle = false, range = false } = options;

      if (range && state.anchorId) {
        // Range selection handled separately
        return;
      }

      if (toggle) {
        // Toggle behavior
        if (state.selectedIds.includes(id)) {
          state.removeFromSelection(id);
        } else if (additive) {
          state.addToSelection(id);
        } else {
          state.select(id);
        }
        return;
      }

      if (additive) {
        state.addToSelection(id);
      } else {
        state.select(id);
      }
    },

    toggleSelection: (id) => {
      const state = get();
      if (state.isLocked) return;

      if (state.selectedIds.includes(id)) {
        // If this is the only selection, just clear
        if (state.selectedIds.length === 1) {
          set({ selectedIds: [], anchorId: null, focusedId: null });
        } else {
          // Remove from selection
          const newSelectedIds = state.selectedIds.filter((i) => i !== id);
          set({
            selectedIds: newSelectedIds,
            // Update anchor if we removed the anchor
            anchorId:
              state.anchorId === id
                ? (newSelectedIds[0] ?? null)
                : state.anchorId,
            focusedId:
              state.focusedId === id
                ? (newSelectedIds[0] ?? null)
                : state.focusedId,
          });
        }
      } else {
        // Add to selection
        set({
          selectedIds: [...state.selectedIds, id],
          anchorId: state.anchorId ?? id,
          focusedId: id,
        });
      }
    },

    addToSelection: (id) => {
      const state = get();
      if (state.isLocked) return;

      if (!state.selectedIds.includes(id)) {
        set({
          selectedIds: [...state.selectedIds, id],
          anchorId: state.anchorId ?? id,
          focusedId: id,
        });
      }
    },

    addMultipleToSelection: (ids) => {
      const state = get();
      if (state.isLocked) return;

      const currentSet = new Set(state.selectedIds);
      const newIds = ids.filter((id) => !currentSet.has(id));

      if (newIds.length > 0) {
        set({
          selectedIds: [...state.selectedIds, ...newIds],
          anchorId: state.anchorId ?? newIds[0],
          focusedId: newIds[newIds.length - 1],
        });
      }
    },

    removeFromSelection: (id) => {
      const state = get();
      if (state.isLocked) return;

      if (state.selectedIds.includes(id)) {
        const newSelectedIds = state.selectedIds.filter((i) => i !== id);
        set({
          selectedIds: newSelectedIds,
          // Update anchor if we removed the anchor
          anchorId:
            state.anchorId === id
              ? (newSelectedIds[0] ?? null)
              : state.anchorId,
          focusedId:
            state.focusedId === id
              ? (newSelectedIds[newSelectedIds.length - 1] ?? null)
              : state.focusedId,
        });
      }
    },

    removeMultipleFromSelection: (ids) => {
      const state = get();
      if (state.isLocked) return;

      const removeSet = new Set(ids);
      const newSelectedIds = state.selectedIds.filter(
        (id) => !removeSet.has(id)
      );

      if (newSelectedIds.length !== state.selectedIds.length) {
        set({
          selectedIds: newSelectedIds,
          anchorId:
            state.anchorId && removeSet.has(state.anchorId)
              ? (newSelectedIds[0] ?? null)
              : state.anchorId,
          focusedId:
            state.focusedId && removeSet.has(state.focusedId)
              ? (newSelectedIds[newSelectedIds.length - 1] ?? null)
              : state.focusedId,
        });
      }
    },

    clearSelection: () => {
      const state = get();
      if (state.isLocked) return;

      if (state.selectedIds.length > 0) {
        set({
          selectedIds: [],
          anchorId: null,
          focusedId: null,
        });
      }
    },

    selectAll: (ids) => {
      const state = get();
      if (state.isLocked) return;

      set({
        selectedIds: [...ids],
        anchorId: ids[0] ?? null,
        focusedId: ids[0] ?? null,
      });
    },

    // ========================================
    // Range Selection Actions
    // ========================================

    setAnchor: (id) => {
      set({ anchorId: id });
    },

    selectRange: (targetId, orderedIds) => {
      const state = get();
      if (state.isLocked) return;

      const anchorId = state.anchorId;
      if (!anchorId) {
        // No anchor, just select the target
        state.select(targetId);
        return;
      }

      const anchorIndex = orderedIds.indexOf(anchorId);
      const targetIndex = orderedIds.indexOf(targetId);

      if (anchorIndex === -1 || targetIndex === -1) {
        // One of the IDs not found, just select the target
        state.select(targetId);
        return;
      }

      // Get the range of IDs between anchor and target (inclusive)
      const startIndex = Math.min(anchorIndex, targetIndex);
      const endIndex = Math.max(anchorIndex, targetIndex);
      const rangeIds = orderedIds.slice(startIndex, endIndex + 1);

      set({
        selectedIds: rangeIds,
        // Keep the original anchor
        anchorId: anchorId,
        focusedId: targetId,
      });
    },

    // ========================================
    // Focus Management
    // ========================================

    setFocused: (id) => {
      set({ focusedId: id });
    },

    focusNext: (orderedIds) => {
      const state = get();
      const currentFocused = state.focusedId;

      if (!currentFocused || orderedIds.length === 0) {
        // Focus the first item
        const firstId = orderedIds[0];
        if (firstId) {
          set({ focusedId: firstId });
        }
        return;
      }

      const currentIndex = orderedIds.indexOf(currentFocused);
      if (currentIndex === -1) {
        // Current focus not found, focus first
        set({ focusedId: orderedIds[0] ?? null });
        return;
      }

      // Move to next, wrap around if at end
      const nextIndex = (currentIndex + 1) % orderedIds.length;
      set({ focusedId: orderedIds[nextIndex] ?? null });
    },

    focusPrevious: (orderedIds) => {
      const state = get();
      const currentFocused = state.focusedId;

      if (!currentFocused || orderedIds.length === 0) {
        // Focus the last item
        const lastId = orderedIds[orderedIds.length - 1];
        if (lastId) {
          set({ focusedId: lastId });
        }
        return;
      }

      const currentIndex = orderedIds.indexOf(currentFocused);
      if (currentIndex === -1) {
        // Current focus not found, focus last
        set({ focusedId: orderedIds[orderedIds.length - 1] ?? null });
        return;
      }

      // Move to previous, wrap around if at beginning
      const prevIndex =
        currentIndex === 0 ? orderedIds.length - 1 : currentIndex - 1;
      set({ focusedId: orderedIds[prevIndex] ?? null });
    },

    // ========================================
    // Lock Management
    // ========================================

    lock: () => {
      set({ isLocked: true });
    },

    unlock: () => {
      set({ isLocked: false });
    },

    // ========================================
    // Query Utilities
    // ========================================

    isSelected: (id) => {
      return get().selectedIds.includes(id);
    },

    hasSelection: () => {
      return get().selectedIds.length > 0;
    },

    getSelectedCount: () => {
      return get().selectedIds.length;
    },

    getPrimarySelectedId: () => {
      const ids = get().selectedIds;
      return ids.length > 0 ? ids[0] : null;
    },

    getSelectedSet: () => {
      return new Set(get().selectedIds);
    },

    isMultiSelection: () => {
      return get().selectedIds.length > 1;
    },

    // ========================================
    // Validation Utilities
    // ========================================

    validateSelection: (validIds) => {
      const state = get();
      const newSelectedIds = state.selectedIds.filter((id) => validIds.has(id));

      if (newSelectedIds.length !== state.selectedIds.length) {
        set({
          selectedIds: newSelectedIds,
          anchorId:
            state.anchorId && !validIds.has(state.anchorId)
              ? (newSelectedIds[0] ?? null)
              : state.anchorId,
          focusedId:
            state.focusedId && !validIds.has(state.focusedId)
              ? (newSelectedIds[0] ?? null)
              : state.focusedId,
        });
      }
    },

    filterSelection: (allowedIds) => {
      const state = get();
      const newSelectedIds = state.selectedIds.filter((id) =>
        allowedIds.has(id)
      );

      if (newSelectedIds.length !== state.selectedIds.length) {
        set({
          selectedIds: newSelectedIds,
          anchorId:
            state.anchorId && !allowedIds.has(state.anchorId)
              ? (newSelectedIds[0] ?? null)
              : state.anchorId,
          focusedId:
            state.focusedId && !allowedIds.has(state.focusedId)
              ? (newSelectedIds[0] ?? null)
              : state.focusedId,
        });
      }
    },
  }))
);

// ============================================================================
// Selector Hooks for Optimized Re-renders
// ============================================================================

/**
 * Hook to get the currently selected IDs
 */
export const useSelectedIds = () =>
  useSelectionStore((state) => state.selectedIds);

/**
 * Hook to get the primary (first) selected ID
 */
export const usePrimarySelectedId = () =>
  useSelectionStore((state) =>
    state.selectedIds.length > 0 ? state.selectedIds[0] : null
  );

/**
 * Hook to check if a specific component is selected
 */
export const useIsSelected = (id: string) =>
  useSelectionStore((state) => state.selectedIds.includes(id));

/**
 * Hook to get the selection count
 */
export const useSelectionCount = () =>
  useSelectionStore((state) => state.selectedIds.length);

/**
 * Hook to check if there is any selection
 */
export const useHasSelection = () =>
  useSelectionStore((state) => state.selectedIds.length > 0);

/**
 * Hook to check if it's a multi-selection
 */
export const useIsMultiSelection = () =>
  useSelectionStore((state) => state.selectedIds.length > 1);

/**
 * Hook to get the focused ID
 */
export const useFocusedId = () => useSelectionStore((state) => state.focusedId);

/**
 * Hook to get selection lock state
 */
export const useIsSelectionLocked = () =>
  useSelectionStore((state) => state.isLocked);

// ============================================================================
// Selection Change Subscription Utilities
// ============================================================================

/**
 * Subscribe to selection changes with a handler
 * Returns unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToSelectionChanges((event) => {
 *   console.log('Selection changed:', event);
 * });
 * // Later: unsubscribe();
 * ```
 */
export function subscribeToSelectionChanges(
  handler: SelectionChangeHandler
): () => void {
  let previousIds = useSelectionStore.getState().selectedIds;

  return useSelectionStore.subscribe(
    (state) => state.selectedIds,
    (currentIds) => {
      const previousSet = new Set(previousIds);
      const currentSet = new Set(currentIds);

      const added = currentIds.filter((id) => !previousSet.has(id));
      const removed = previousIds.filter((id) => !currentSet.has(id));

      const event: SelectionChangeEvent = {
        previousIds,
        currentIds,
        added,
        removed,
        primaryId: currentIds.length > 0 ? currentIds[0] : null,
      };

      // Update previous for next comparison
      previousIds = currentIds;

      handler(event);
    }
  );
}

/**
 * Subscribe to primary selection changes only
 * Returns unsubscribe function
 */
export function subscribeToPrimarySelectionChange(
  handler: (primaryId: string | null) => void
): () => void {
  return useSelectionStore.subscribe(
    (state) => (state.selectedIds.length > 0 ? state.selectedIds[0] : null),
    handler
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a selection change event from previous and current state
 */
export function createSelectionChangeEvent(
  previousIds: string[],
  currentIds: string[]
): SelectionChangeEvent {
  const previousSet = new Set(previousIds);
  const currentSet = new Set(currentIds);

  return {
    previousIds,
    currentIds,
    added: currentIds.filter((id) => !previousSet.has(id)),
    removed: previousIds.filter((id) => !currentSet.has(id)),
    primaryId: currentIds.length > 0 ? currentIds[0] : null,
  };
}
