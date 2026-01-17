/**
 * Clipboard Store
 * Manages global clipboard state for copy/paste operations
 *
 * Features:
 * - Copy/cut operations with deep cloning
 * - Paste with new ID generation
 * - Multi-node clipboard support
 * - Clipboard history (optional future feature)
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { LayoutNode } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

/**
 * Clipboard operation type
 */
export type ClipboardOperation = "copy" | "cut";

/**
 * Clipboard entry with metadata
 */
export interface ClipboardEntry {
  /** The copied/cut nodes (deep cloned) */
  nodes: LayoutNode[];
  /** The operation type */
  operation: ClipboardOperation;
  /** Timestamp when the operation was performed */
  timestamp: number;
  /** Source IDs of the copied/cut nodes (for cut operation cleanup) */
  sourceIds: string[];
}

/**
 * Clipboard store state and actions
 */
interface ClipboardState {
  // ========================================
  // State
  // ========================================

  /** Current clipboard content */
  clipboard: ClipboardEntry | null;

  /** Whether clipboard content has been pasted (for cut operations) */
  isPasted: boolean;

  // ========================================
  // Actions
  // ========================================

  /**
   * Copy nodes to clipboard
   * @param nodes - Nodes to copy (will be deep cloned)
   */
  copy: (nodes: LayoutNode[]) => void;

  /**
   * Cut nodes to clipboard (marks for deletion after paste)
   * @param nodes - Nodes to cut (will be deep cloned)
   */
  cut: (nodes: LayoutNode[]) => void;

  /**
   * Get clipboard content for pasting (generates new IDs)
   * @returns Cloned nodes with new IDs, or null if clipboard is empty
   */
  getForPaste: () => LayoutNode[] | null;

  /**
   * Mark clipboard as pasted (for cut operation cleanup)
   */
  markAsPasted: () => void;

  /**
   * Get source IDs for cut operation cleanup
   * @returns Source IDs if operation was cut and not yet pasted, or empty array
   */
  getSourceIdsForCut: () => string[];

  /**
   * Clear clipboard
   */
  clear: () => void;

  /**
   * Check if clipboard has content
   */
  hasContent: () => boolean;

  /**
   * Check if current operation is cut
   */
  isCutOperation: () => boolean;

  /**
   * Get clipboard operation type
   */
  getOperation: () => ClipboardOperation | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Deep clone a node
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generate a new unique ID
 */
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Clone a node with new IDs for all nodes in the tree
 */
function cloneWithNewIds(node: LayoutNode): LayoutNode {
  const cloned: LayoutNode = {
    ...deepClone(node),
    id: generateId(),
  };

  if (cloned.children) {
    cloned.children = cloned.children.map(cloneWithNewIds);
  }

  if (cloned.child) {
    cloned.child = cloneWithNewIds(cloned.child);
  }

  return cloned;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useClipboardStore = create<ClipboardState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================
    // Initial State
    // ========================================
    clipboard: null,
    isPasted: false,

    // ========================================
    // Actions
    // ========================================

    copy: (nodes) => {
      if (nodes.length === 0) return;

      set({
        clipboard: {
          nodes: nodes.map(deepClone),
          operation: "copy",
          timestamp: Date.now(),
          sourceIds: nodes.map((n) => n.id),
        },
        isPasted: false,
      });
    },

    cut: (nodes) => {
      if (nodes.length === 0) return;

      set({
        clipboard: {
          nodes: nodes.map(deepClone),
          operation: "cut",
          timestamp: Date.now(),
          sourceIds: nodes.map((n) => n.id),
        },
        isPasted: false,
      });
    },

    getForPaste: () => {
      const { clipboard } = get();
      if (!clipboard || clipboard.nodes.length === 0) return null;

      // Clone with new IDs
      return clipboard.nodes.map(cloneWithNewIds);
    },

    markAsPasted: () => {
      const { clipboard } = get();
      if (!clipboard) return;

      // For cut operations, clear clipboard after paste
      if (clipboard.operation === "cut") {
        set({ isPasted: true });
      }
    },

    getSourceIdsForCut: () => {
      const { clipboard, isPasted } = get();
      if (!clipboard || clipboard.operation !== "cut" || isPasted) return [];
      return clipboard.sourceIds;
    },

    clear: () => {
      set({ clipboard: null, isPasted: false });
    },

    hasContent: () => {
      const { clipboard } = get();
      return clipboard !== null && clipboard.nodes.length > 0;
    },

    isCutOperation: () => {
      const { clipboard } = get();
      return clipboard?.operation === "cut";
    },

    getOperation: () => {
      const { clipboard } = get();
      return clipboard?.operation ?? null;
    },
  }))
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Hook to check if clipboard has content
 */
export const useHasClipboardContent = () =>
  useClipboardStore(
    (state) => state.clipboard !== null && state.clipboard.nodes.length > 0
  );

/**
 * Hook to get clipboard operation type
 */
export const useClipboardOperation = () =>
  useClipboardStore((state) => state.clipboard?.operation ?? null);

/**
 * Hook to get clipboard node count
 */
export const useClipboardNodeCount = () =>
  useClipboardStore((state) => state.clipboard?.nodes.length ?? 0);
