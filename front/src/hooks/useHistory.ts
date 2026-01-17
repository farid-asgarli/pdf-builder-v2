/**
 * useHistory Hook
 * Provides undo/redo functionality with keyboard shortcuts integration
 *
 * Features:
 * - Connects history store with canvas store
 * - Keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y / Ctrl+Shift+Z for redo)
 * - Action recording helpers for canvas operations
 * - Batch operation support for complex changes
 */
import { useCallback, useEffect, useRef } from "react";
import {
  useHistoryStore,
  useCanUndoRedo,
  useUndoRedoDescriptions,
} from "@/store/history-store";
import { useCanvasStore } from "@/store/canvas-store";

// ============================================================================
// Types
// ============================================================================

export interface UseHistoryOptions {
  /** Whether to enable keyboard shortcuts (default: true) */
  enableKeyboardShortcuts?: boolean;
  /** Custom key bindings */
  keyBindings?: {
    undo?: string[];
    redo?: string[];
  };
  /** Callback when undo is performed */
  onUndo?: () => void;
  /** Callback when redo is performed */
  onRedo?: () => void;
  /** Callback when history changes */
  onHistoryChange?: (undoCount: number, redoCount: number) => void;
}

export interface UseHistoryReturn {
  /** Perform undo operation */
  undo: () => boolean;
  /** Perform redo operation */
  redo: () => boolean;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Description of the action to be undone */
  undoDescription: string | null;
  /** Description of the action to be redone */
  redoDescription: string | null;
  /** Number of undo steps available */
  undoCount: number;
  /** Number of redo steps available */
  redoCount: number;
  /** Record the current state before making a change */
  recordState: (
    action: string,
    componentId?: string,
    componentType?: string
  ) => void;
  /** Begin a batch operation (multiple changes as one undo step) */
  beginBatch: (
    action: string,
    componentId?: string,
    componentType?: string
  ) => void;
  /** End a batch operation */
  endBatch: () => void;
  /** Cancel a batch operation */
  cancelBatch: () => void;
  /** Clear all history */
  clearHistory: () => void;
  /** Check if currently in a batch operation */
  isInBatch: boolean;
}

// ============================================================================
// Default Key Bindings
// ============================================================================

const DEFAULT_UNDO_KEYS = ["z"];
const DEFAULT_REDO_KEYS = ["y", "Z"]; // Z is for Shift+Z

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing undo/redo with keyboard shortcuts
 *
 * @example
 * ```tsx
 * function CanvasToolbar() {
 *   const { undo, redo, canUndo, canRedo, undoDescription } = useHistory();
 *
 *   return (
 *     <div>
 *       <button onClick={undo} disabled={!canUndo} title={`Undo ${undoDescription}`}>
 *         Undo
 *       </button>
 *       <button onClick={redo} disabled={!canRedo}>
 *         Redo
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useHistory(options: UseHistoryOptions = {}): UseHistoryReturn {
  const {
    enableKeyboardShortcuts = true,
    keyBindings = {},
    onUndo,
    onRedo,
    onHistoryChange,
  } = options;

  // Get store actions
  const historyUndo = useHistoryStore((state) => state.undo);
  const historyRedo = useHistoryStore((state) => state.redo);
  const pushState = useHistoryStore((state) => state.pushState);
  const clear = useHistoryStore((state) => state.clear);
  const beginBatchAction = useHistoryStore((state) => state.beginBatch);
  const endBatchAction = useHistoryStore((state) => state.endBatch);
  const cancelBatchAction = useHistoryStore((state) => state.cancelBatch);
  const isPaused = useHistoryStore((state) => state.isPaused);

  // Get canvas store actions
  const getRoot = useCanvasStore((state) => state.root);
  const setRoot = useCanvasStore((state) => state.setRoot);

  // Get computed values
  const { canUndo, canRedo } = useCanUndoRedo();
  const { undoDescription, redoDescription } = useUndoRedoDescriptions();
  const undoCount = useHistoryStore((state) => state.past.length);
  const redoCount = useHistoryStore((state) => state.future.length);

  // Track previous counts for change callback
  const prevCountsRef = useRef({ undoCount: 0, redoCount: 0 });

  // Notify on history change
  useEffect(() => {
    if (onHistoryChange) {
      const { undoCount: prevUndo, redoCount: prevRedo } =
        prevCountsRef.current;
      if (prevUndo !== undoCount || prevRedo !== redoCount) {
        onHistoryChange(undoCount, redoCount);
        prevCountsRef.current = { undoCount, redoCount };
      }
    }
  }, [undoCount, redoCount, onHistoryChange]);

  /**
   * Record the current state before making a change
   * Call this BEFORE modifying the canvas state
   */
  const recordState = useCallback(
    (action: string, componentId?: string, componentType?: string) => {
      if (getRoot) {
        pushState(getRoot, {
          action,
          componentId,
          componentType,
        });
      }
    },
    [getRoot, pushState]
  );

  /**
   * Perform undo operation
   */
  const undo = useCallback((): boolean => {
    if (!canUndo) return false;

    // Pass current state to be saved in future stack
    const previousState = historyUndo(getRoot);

    if (previousState) {
      // Restore the previous state to canvas
      setRoot(previousState);
      onUndo?.();
      return true;
    }

    return false;
  }, [canUndo, historyUndo, getRoot, setRoot, onUndo]);

  /**
   * Perform redo operation
   */
  const redo = useCallback((): boolean => {
    if (!canRedo) return false;

    // Pass current state to be saved in past stack
    const nextState = historyRedo(getRoot);

    if (nextState) {
      // Restore the next state to canvas
      setRoot(nextState);
      onRedo?.();
      return true;
    }

    return false;
  }, [canRedo, historyRedo, getRoot, setRoot, onRedo]);

  /**
   * Begin a batch operation
   */
  const beginBatch = useCallback(
    (action: string, componentId?: string, componentType?: string) => {
      // First, record the current state
      if (getRoot) {
        pushState(getRoot, {
          action,
          componentId,
          componentType,
        });
      }
      // Then pause history recording
      beginBatchAction({
        action,
        componentId,
        componentType,
      });
    },
    [getRoot, pushState, beginBatchAction]
  );

  /**
   * End a batch operation
   */
  const endBatch = useCallback(() => {
    if (getRoot) {
      endBatchAction(getRoot);
    }
  }, [getRoot, endBatchAction]);

  /**
   * Cancel a batch operation
   */
  const cancelBatch = useCallback(() => {
    cancelBatchAction();
  }, [cancelBatchAction]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    clear();
  }, [clear]);

  // ----------------------------------------
  // Keyboard Shortcuts
  // ----------------------------------------
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const undoKeys = keyBindings.undo ?? DEFAULT_UNDO_KEYS;
    const redoKeys = keyBindings.redo ?? DEFAULT_REDO_KEYS;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for modifier key (Ctrl on Windows/Linux, Cmd on Mac)
      const isModifierPressed = event.ctrlKey || event.metaKey;

      if (!isModifierPressed) return;

      // Don't trigger if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key;

      // Check for redo first (Ctrl+Y or Ctrl+Shift+Z)
      if (redoKeys.includes(key) || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
        return;
      }

      // Check for undo (Ctrl+Z without Shift)
      if (undoKeys.includes(key) && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
    };

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enableKeyboardShortcuts, keyBindings, undo, redo]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    undoCount,
    redoCount,
    recordState,
    beginBatch,
    endBatch,
    cancelBatch,
    clearHistory,
    isInBatch: isPaused,
  };
}

// ============================================================================
// Utility Hook: useHistoryKeyboardShortcuts
// ============================================================================

/**
 * Standalone hook for just adding keyboard shortcuts
 * Use this when you want keyboard shortcuts but manage history manually
 */
export function useHistoryKeyboardShortcuts(
  onUndo: () => void,
  onRedo: () => void,
  options: {
    enabled?: boolean;
    undoKeys?: string[];
    redoKeys?: string[];
  } = {}
): void {
  const {
    enabled = true,
    undoKeys = DEFAULT_UNDO_KEYS,
    redoKeys = DEFAULT_REDO_KEYS,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.ctrlKey || event.metaKey;

      if (!isModifierPressed) return;

      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key;

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (redoKeys.includes(key) || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        onRedo();
        return;
      }

      // Undo: Ctrl+Z
      if (undoKeys.includes(key) && !event.shiftKey) {
        event.preventDefault();
        onUndo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, undoKeys, redoKeys, onUndo, onRedo]);
}

// ============================================================================
// Action Descriptions
// ============================================================================

/**
 * Pre-defined action descriptions for consistent UI messaging
 */
export const HistoryActions = {
  // Component operations
  ADD_COMPONENT: (type?: string) => (type ? `Add ${type}` : "Add component"),
  DELETE_COMPONENT: (type?: string) =>
    type ? `Delete ${type}` : "Delete component",
  DUPLICATE_COMPONENT: (type?: string) =>
    type ? `Duplicate ${type}` : "Duplicate component",
  MOVE_COMPONENT: (type?: string) => (type ? `Move ${type}` : "Move component"),

  // Property changes
  UPDATE_PROPERTY: (property?: string) =>
    property ? `Update ${property}` : "Update property",
  UPDATE_PROPERTIES: "Update properties",
  UPDATE_STYLE: "Update style",

  // Layout changes
  REORDER_CHILDREN: "Reorder components",
  RESIZE_COMPONENT: "Resize component",

  // Bulk operations
  PASTE_COMPONENT: "Paste component",
  CUT_COMPONENT: "Cut component",
  CLEAR_CANVAS: "Clear canvas",
  LOAD_TEMPLATE: "Load template",

  // Custom
  CUSTOM: (description: string) => description,
} as const;

export type HistoryActionKey = keyof typeof HistoryActions;
