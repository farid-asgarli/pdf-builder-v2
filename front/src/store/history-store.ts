/**
 * History Store
 * Manages undo/redo functionality for canvas operations
 *
 * Features:
 * - Undo/redo stack with configurable max size
 * - State snapshot system with deep cloning
 * - Action grouping for batch operations
 * - History metadata for UI display
 * - Memory-efficient state storage
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { LayoutNode } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

/**
 * Metadata for a history entry
 */
export interface HistoryEntryMetadata {
  /** Action description for UI display */
  action: string;
  /** Timestamp when the action was performed */
  timestamp: number;
  /** Component ID affected (if applicable) */
  componentId?: string;
  /** Component type affected (if applicable) */
  componentType?: string;
}

/**
 * A single entry in the history stack
 */
export interface HistoryEntry {
  /** The state snapshot */
  state: LayoutNode;
  /** Metadata about this entry */
  metadata: HistoryEntryMetadata;
}

/**
 * History store state and actions
 */
export interface HistoryState {
  // ============================================
  // State
  // ============================================

  /** Stack of past states (for undo) */
  past: HistoryEntry[];

  /** Stack of future states (for redo) */
  future: HistoryEntry[];

  /** Maximum number of history entries to keep */
  maxHistorySize: number;

  /** Whether we're currently in an undo/redo operation */
  isUndoRedoInProgress: boolean;

  /** Whether history recording is paused (for batch operations) */
  isPaused: boolean;

  /** Batch operation metadata (when paused) */
  batchMetadata: HistoryEntryMetadata | null;

  // ============================================
  // Actions
  // ============================================

  /**
   * Push a new state to the history stack
   * Call this BEFORE making changes to preserve the current state
   * @param state The current state before the change
   * @param metadata Description of the action being performed
   */
  pushState: (
    state: LayoutNode,
    metadata?: Partial<HistoryEntryMetadata>
  ) => void;

  /**
   * Undo the last action
   * @param currentState The current state (to push to future stack)
   * @returns The state to restore, or null if nothing to undo
   */
  undo: (currentState: LayoutNode | null) => LayoutNode | null;

  /**
   * Redo the last undone action
   * @param currentState The current state (to push to past stack)
   * @returns The state to restore, or null if nothing to redo
   */
  redo: (currentState: LayoutNode | null) => LayoutNode | null;

  /**
   * Clear all history
   */
  clear: () => void;

  /**
   * Begin a batch operation (multiple changes as one undo step)
   * @param metadata Description of the batch operation
   */
  beginBatch: (metadata: Partial<HistoryEntryMetadata>) => void;

  /**
   * End a batch operation
   * @param finalState The final state after all batch changes
   */
  endBatch: (finalState: LayoutNode) => void;

  /**
   * Cancel a batch operation without saving
   */
  cancelBatch: () => void;

  /**
   * Temporarily pause history recording
   */
  pause: () => void;

  /**
   * Resume history recording
   */
  resume: () => void;

  /**
   * Set the maximum history size
   */
  setMaxHistorySize: (size: number) => void;

  // ============================================
  // Utilities
  // ============================================

  /** Check if undo is possible */
  canUndo: () => boolean;

  /** Check if redo is possible */
  canRedo: () => boolean;

  /** Get the number of undo steps available */
  getUndoCount: () => number;

  /** Get the number of redo steps available */
  getRedoCount: () => number;

  /** Get the description of the last undoable action */
  getUndoDescription: () => string | null;

  /** Get the description of the next redoable action */
  getRedoDescription: () => string | null;

  /** Get all history entries for display (past + current position + future) */
  getHistoryList: () => { entries: HistoryEntry[]; currentIndex: number };

  /** Reset the store to initial state */
  reset: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep clone a LayoutNode to prevent mutations
 */
function deepCloneState(state: LayoutNode): LayoutNode {
  // Use structured clone for deep copying
  // This handles nested objects and arrays properly
  try {
    return structuredClone(state);
  } catch {
    // Fallback to JSON parse/stringify if structuredClone fails
    return JSON.parse(JSON.stringify(state));
  }
}

/**
 * Create default metadata for a history entry
 */
function createDefaultMetadata(
  partial?: Partial<HistoryEntryMetadata>
): HistoryEntryMetadata {
  return {
    action: partial?.action ?? "Unknown action",
    timestamp: partial?.timestamp ?? Date.now(),
    componentId: partial?.componentId,
    componentType: partial?.componentType,
  };
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  past: [] as HistoryEntry[],
  future: [] as HistoryEntry[],
  maxHistorySize: 50,
  isUndoRedoInProgress: false,
  isPaused: false,
  batchMetadata: null as HistoryEntryMetadata | null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useHistoryStore = create<HistoryState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ----------------------------------------
    // Push State
    // ----------------------------------------
    pushState: (state, metadata) => {
      const { isPaused, maxHistorySize, isUndoRedoInProgress } = get();

      // Don't record if paused (batch operation) or during undo/redo
      if (isPaused || isUndoRedoInProgress) return;

      const entry: HistoryEntry = {
        state: deepCloneState(state),
        metadata: createDefaultMetadata(metadata),
      };

      set((current) => {
        const newPast = [...current.past, entry];

        // Limit history size by removing oldest entries
        while (newPast.length > maxHistorySize) {
          newPast.shift();
        }

        return {
          past: newPast,
          // Clear future when new action is taken (branching history)
          future: [],
        };
      });
    },

    // ----------------------------------------
    // Undo
    // ----------------------------------------
    undo: (currentState) => {
      const { past, canUndo } = get();

      if (!canUndo()) return null;

      // Get the last state from past
      const previousEntry = past[past.length - 1];
      const newPast = past.slice(0, -1);

      // Mark that we're in undo/redo to prevent recursive history recording
      set({ isUndoRedoInProgress: true });

      // If we have a current state, push it to future for redo
      set((current) => {
        const newFuture = currentState
          ? [
              {
                state: deepCloneState(currentState),
                metadata: createDefaultMetadata({
                  action: previousEntry.metadata.action,
                  componentId: previousEntry.metadata.componentId,
                  componentType: previousEntry.metadata.componentType,
                }),
              },
              ...current.future,
            ]
          : current.future;

        return {
          past: newPast,
          future: newFuture,
        };
      });

      // Clear the undo/redo flag
      set({ isUndoRedoInProgress: false });

      // Return a deep clone to prevent mutations
      return deepCloneState(previousEntry.state);
    },

    // ----------------------------------------
    // Redo
    // ----------------------------------------
    redo: (currentState) => {
      const { future, canRedo } = get();

      if (!canRedo()) return null;

      // Get the next state from future
      const nextEntry = future[0];
      const newFuture = future.slice(1);

      // Mark that we're in undo/redo
      set({ isUndoRedoInProgress: true });

      // Push current state to past for undo
      set((current) => {
        const newPast = currentState
          ? [
              ...current.past,
              {
                state: deepCloneState(currentState),
                metadata: createDefaultMetadata({
                  action: nextEntry.metadata.action,
                  componentId: nextEntry.metadata.componentId,
                  componentType: nextEntry.metadata.componentType,
                }),
              },
            ]
          : current.past;

        return {
          past: newPast,
          future: newFuture,
        };
      });

      // Clear the undo/redo flag
      set({ isUndoRedoInProgress: false });

      // Return a deep clone to prevent mutations
      return deepCloneState(nextEntry.state);
    },

    // ----------------------------------------
    // Clear
    // ----------------------------------------
    clear: () => {
      set({ past: [], future: [] });
    },

    // ----------------------------------------
    // Batch Operations
    // ----------------------------------------
    beginBatch: (metadata) => {
      set({
        isPaused: true,
        batchMetadata: createDefaultMetadata(metadata),
      });
    },

    endBatch: (finalState) => {
      const { batchMetadata } = get();

      if (!batchMetadata) {
        set({ isPaused: false });
        return;
      }

      // Resume recording
      set({ isPaused: false, batchMetadata: null });

      // Push the final state with batch metadata
      get().pushState(finalState, batchMetadata);
    },

    cancelBatch: () => {
      set({
        isPaused: false,
        batchMetadata: null,
      });
    },

    // ----------------------------------------
    // Pause/Resume
    // ----------------------------------------
    pause: () => {
      set({ isPaused: true });
    },

    resume: () => {
      set({ isPaused: false });
    },

    // ----------------------------------------
    // Configuration
    // ----------------------------------------
    setMaxHistorySize: (size) => {
      set((current) => {
        const newPast = current.past.slice(-size);
        return {
          maxHistorySize: size,
          past: newPast,
        };
      });
    },

    // ----------------------------------------
    // Utilities
    // ----------------------------------------
    canUndo: () => {
      return get().past.length > 0;
    },

    canRedo: () => {
      return get().future.length > 0;
    },

    getUndoCount: () => {
      return get().past.length;
    },

    getRedoCount: () => {
      return get().future.length;
    },

    getUndoDescription: () => {
      const { past } = get();
      if (past.length === 0) return null;
      return past[past.length - 1].metadata.action;
    },

    getRedoDescription: () => {
      const { future } = get();
      if (future.length === 0) return null;
      return future[0].metadata.action;
    },

    getHistoryList: () => {
      const { past, future } = get();
      return {
        entries: [...past, ...future],
        currentIndex: past.length,
      };
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// ============================================================================
// Selector Hooks for Common Use Cases
// ============================================================================

/**
 * Hook to get undo/redo availability
 */
export const useCanUndoRedo = () => {
  const canUndo = useHistoryStore((state) => state.past.length > 0);
  const canRedo = useHistoryStore((state) => state.future.length > 0);
  return { canUndo, canRedo };
};

/**
 * Hook to get undo/redo descriptions
 */
export const useUndoRedoDescriptions = () => {
  const undoDescription = useHistoryStore((state) =>
    state.past.length > 0
      ? state.past[state.past.length - 1].metadata.action
      : null
  );
  const redoDescription = useHistoryStore((state) =>
    state.future.length > 0 ? state.future[0].metadata.action : null
  );
  return { undoDescription, redoDescription };
};

/**
 * Hook to get history counts
 */
export const useHistoryCounts = () => {
  const undoCount = useHistoryStore((state) => state.past.length);
  const redoCount = useHistoryStore((state) => state.future.length);
  return { undoCount, redoCount };
};

/**
 * Hook to check if history is currently paused
 */
export const useIsHistoryPaused = () => {
  return useHistoryStore((state) => state.isPaused);
};
