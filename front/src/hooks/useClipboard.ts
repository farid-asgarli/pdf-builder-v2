/**
 * useClipboard Hook
 * Provides clipboard operations for copy/paste/cut/duplicate of components
 *
 * Features:
 * - Copy component(s) to clipboard
 * - Cut component(s) to clipboard
 * - Paste from clipboard to target
 * - Duplicate component(s) in place
 * - Integration with history for undo/redo
 */
"use client";

import { useCallback, useMemo } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { useSelectionStore, useSelectedIds } from "@/store/selection-store";
import { useClipboardStore } from "@/store/clipboard-store";
import { useHistoryStore } from "@/store/history-store";
import { isContainerComponent, isWrapperComponent } from "@/types/component";
import type { LayoutNode, ComponentType } from "@/types/component";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

/**
 * Paste target options
 */
export type PasteTarget =
  | "inside" // Paste as children of selected component
  | "after" // Paste as sibling after selected component
  | "before"; // Paste as sibling before selected component

/**
 * Move direction for reordering
 */
export type MoveDirection = "up" | "down" | "first" | "last";

/**
 * Options for paste operation
 */
export interface PasteOptions {
  /** Target for paste operation (default: 'inside') */
  target?: PasteTarget;
  /** Specific target component ID (default: first selected) */
  targetId?: string;
  /** Show toast notification (default: true) */
  showToast?: boolean;
}

/**
 * Options for copy/cut/duplicate operations
 */
export interface ClipboardOperationOptions {
  /** Show toast notification (default: true) */
  showToast?: boolean;
}

/**
 * Return type for useClipboard hook
 */
export interface UseClipboardReturn {
  // Operations
  /** Copy selected component(s) to clipboard */
  copy: (options?: ClipboardOperationOptions) => boolean;
  /** Copy specific component by ID */
  copyById: (id: string, options?: ClipboardOperationOptions) => boolean;
  /** Cut selected component(s) to clipboard */
  cut: (options?: ClipboardOperationOptions) => boolean;
  /** Cut specific component by ID */
  cutById: (id: string, options?: ClipboardOperationOptions) => boolean;
  /** Paste from clipboard */
  paste: (options?: PasteOptions) => boolean;
  /** Paste to specific target */
  pasteToTarget: (targetId: string, options?: PasteOptions) => boolean;
  /** Duplicate selected component(s) */
  duplicate: (options?: ClipboardOperationOptions) => boolean;
  /** Duplicate specific component by ID */
  duplicateById: (id: string, options?: ClipboardOperationOptions) => boolean;

  // Move operations
  /** Move selected component(s) in specified direction */
  move: (direction: MoveDirection) => boolean;
  /** Move component by ID to a new parent */
  moveToParent: (
    componentId: string,
    newParentId: string,
    index?: number
  ) => boolean;
  /** Reorder component within its parent */
  reorder: (componentId: string, newIndex: number) => boolean;

  // State
  /** Whether copy is available (has selection) */
  canCopy: boolean;
  /** Whether cut is available (has selection, not root) */
  canCut: boolean;
  /** Whether paste is available (has clipboard content) */
  canPaste: boolean;
  /** Whether duplicate is available (has selection, not root) */
  canDuplicate: boolean;
  /** Whether move up is available */
  canMoveUp: boolean;
  /** Whether move down is available */
  canMoveDown: boolean;
  /** Number of items in clipboard */
  clipboardCount: number;
  /** Current clipboard operation type */
  clipboardOperation: "copy" | "cut" | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for clipboard operations on canvas components
 *
 * @example
 * ```tsx
 * function Toolbar() {
 *   const {
 *     copy,
 *     paste,
 *     cut,
 *     duplicate,
 *     canCopy,
 *     canPaste,
 *   } = useClipboard();
 *
 *   return (
 *     <div>
 *       <button onClick={() => copy()} disabled={!canCopy}>Copy</button>
 *       <button onClick={() => paste()} disabled={!canPaste}>Paste</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useClipboard(): UseClipboardReturn {
  // Stores
  const selectedIds = useSelectedIds();
  const { select, selectMultiple } = useSelectionStore();
  const {
    root,
    getComponent,
    getParent,
    addComponent,
    deleteComponent,
    duplicateComponent,
    moveComponent,
    reorderComponent,
  } = useCanvasStore();
  const {
    copy: clipboardCopy,
    cut: clipboardCut,
    getForPaste,
    markAsPasted,
    getSourceIdsForCut,
    hasContent: hasClipboardContent,
    getOperation,
  } = useClipboardStore();
  const { pushState } = useHistoryStore();

  // ========================================
  // Computed State
  // ========================================

  const canCopy = selectedIds.length > 0;

  const canCut = useMemo(() => {
    if (selectedIds.length === 0) return false;
    // Can't cut root
    if (root && selectedIds.includes(root.id)) return false;
    return true;
  }, [selectedIds, root]);

  const canPaste = hasClipboardContent();

  const canDuplicate = useMemo(() => {
    if (selectedIds.length === 0) return false;
    // Can't duplicate root
    if (root && selectedIds.includes(root.id)) return false;
    return true;
  }, [selectedIds, root]);

  // Check if can move up (first selected is not first child)
  const canMoveUp = useMemo(() => {
    if (selectedIds.length === 0 || !root) return false;
    const firstId = selectedIds[0];
    if (firstId === root.id) return false;

    const parent = getParent(firstId);
    if (!parent?.children) return false;

    const index = parent.children.findIndex((c) => c.id === firstId);
    return index > 0;
  }, [selectedIds, root, getParent]);

  // Check if can move down (last selected is not last child)
  const canMoveDown = useMemo(() => {
    if (selectedIds.length === 0 || !root) return false;
    const lastId = selectedIds[selectedIds.length - 1];
    if (lastId === root.id) return false;

    const parent = getParent(lastId);
    if (!parent?.children) return false;

    const index = parent.children.findIndex((c) => c.id === lastId);
    return index < parent.children.length - 1;
  }, [selectedIds, root, getParent]);

  const clipboardCount = useClipboardStore(
    (state) => state.clipboard?.nodes.length ?? 0
  );

  const clipboardOperation = getOperation();

  // ========================================
  // Copy Operations
  // ========================================

  /**
   * Copy component by ID
   */
  const copyById = useCallback(
    (id: string, options: ClipboardOperationOptions = {}): boolean => {
      const { showToast = true } = options;

      const node = getComponent(id);
      if (!node) {
        if (showToast) toast.error("Component not found");
        return false;
      }

      clipboardCopy([node]);
      if (showToast) toast.success("Component copied");
      return true;
    },
    [getComponent, clipboardCopy]
  );

  /**
   * Copy selected components
   */
  const copy = useCallback(
    (options: ClipboardOperationOptions = {}): boolean => {
      const { showToast = true } = options;

      if (selectedIds.length === 0) {
        if (showToast) toast.error("No component selected");
        return false;
      }

      const nodes = selectedIds
        .map((id) => getComponent(id))
        .filter((n): n is LayoutNode => n !== null);

      if (nodes.length === 0) {
        if (showToast) toast.error("No valid components to copy");
        return false;
      }

      clipboardCopy(nodes);

      if (showToast) {
        const message =
          nodes.length === 1
            ? "Component copied"
            : `${nodes.length} components copied`;
        toast.success(message);
      }

      return true;
    },
    [selectedIds, getComponent, clipboardCopy]
  );

  // ========================================
  // Cut Operations
  // ========================================

  /**
   * Cut component by ID
   */
  const cutById = useCallback(
    (id: string, options: ClipboardOperationOptions = {}): boolean => {
      const { showToast = true } = options;

      // Can't cut root
      if (root && id === root.id) {
        if (showToast) toast.error("Cannot cut root component");
        return false;
      }

      const node = getComponent(id);
      if (!node) {
        if (showToast) toast.error("Component not found");
        return false;
      }

      clipboardCut([node]);
      if (showToast) toast.success("Component cut");
      return true;
    },
    [root, getComponent, clipboardCut]
  );

  /**
   * Cut selected components
   */
  const cut = useCallback(
    (options: ClipboardOperationOptions = {}): boolean => {
      const { showToast = true } = options;

      if (selectedIds.length === 0) {
        if (showToast) toast.error("No component selected");
        return false;
      }

      // Filter out root if included
      const idsToUse = root
        ? selectedIds.filter((id) => id !== root.id)
        : selectedIds;

      if (idsToUse.length === 0) {
        if (showToast) toast.error("Cannot cut root component");
        return false;
      }

      const nodes = idsToUse
        .map((id) => getComponent(id))
        .filter((n): n is LayoutNode => n !== null);

      if (nodes.length === 0) {
        if (showToast) toast.error("No valid components to cut");
        return false;
      }

      clipboardCut(nodes);

      if (showToast) {
        const message =
          nodes.length === 1
            ? "Component cut"
            : `${nodes.length} components cut`;
        toast.success(message);
      }

      return true;
    },
    [selectedIds, root, getComponent, clipboardCut]
  );

  // ========================================
  // Paste Operations
  // ========================================

  /**
   * Paste to specific target
   */
  const pasteToTarget = useCallback(
    (targetId: string, options: PasteOptions = {}): boolean => {
      const { target = "inside", showToast = true } = options;

      const nodesToPaste = getForPaste();
      if (!nodesToPaste || nodesToPaste.length === 0) {
        if (showToast) toast.error("Nothing to paste");
        return false;
      }

      const targetNode = getComponent(targetId);
      if (!targetNode) {
        if (showToast) toast.error("Paste target not found");
        return false;
      }

      // Record state for undo
      if (root) {
        pushState(root, {
          action:
            nodesToPaste.length === 1
              ? "Paste component"
              : `Paste ${nodesToPaste.length} components`,
        });
      }

      // Handle cut operation - delete source nodes first
      const sourceIds = getSourceIdsForCut();
      if (sourceIds.length > 0) {
        for (const sourceId of sourceIds) {
          deleteComponent(sourceId);
        }
        markAsPasted();
      }

      // Determine paste location
      let parentId: string;
      let insertIndex: number | undefined;

      if (target === "inside") {
        // Paste inside the target (as children)
        const isContainer = isContainerComponent(
          targetNode.type as ComponentType
        );
        const isWrapper = isWrapperComponent(targetNode.type as ComponentType);

        if (!isContainer && !isWrapper) {
          // If target can't have children, paste as sibling after it
          const parent = getParent(targetId);
          if (!parent) {
            if (showToast) toast.error("Cannot paste here");
            return false;
          }
          parentId = parent.id;
          if (parent.children) {
            const idx = parent.children.findIndex((c) => c.id === targetId);
            insertIndex = idx >= 0 ? idx + 1 : undefined;
          }
        } else {
          parentId = targetId;
          // For wrappers with existing child, paste after; for containers, append
          if (isWrapper && targetNode.child) {
            // Wrapper already has child, can't paste inside
            if (showToast) toast.error("This component already has a child");
            return false;
          }
        }
      } else {
        // Paste as sibling before/after
        const parent = getParent(targetId);
        if (!parent) {
          if (showToast) toast.error("Cannot paste here");
          return false;
        }
        parentId = parent.id;
        if (parent.children) {
          const idx = parent.children.findIndex((c) => c.id === targetId);
          insertIndex = target === "before" ? idx : idx + 1;
        }
      }

      // Paste each node
      const pastedIds: string[] = [];
      for (let i = 0; i < nodesToPaste.length; i++) {
        const node = nodesToPaste[i];
        const index = insertIndex !== undefined ? insertIndex + i : undefined;
        const result = addComponent(parentId, node, index);
        if (result.success && result.nodeId) {
          pastedIds.push(result.nodeId);
        }
      }

      if (pastedIds.length > 0) {
        // Select pasted nodes
        if (pastedIds.length === 1) {
          select(pastedIds[0]);
        } else {
          selectMultiple(pastedIds);
        }

        if (showToast) {
          const message =
            pastedIds.length === 1
              ? "Component pasted"
              : `${pastedIds.length} components pasted`;
          toast.success(message);
        }
        return true;
      } else {
        if (showToast) toast.error("Failed to paste components");
        return false;
      }
    },
    [
      getForPaste,
      getComponent,
      root,
      pushState,
      getSourceIdsForCut,
      deleteComponent,
      markAsPasted,
      getParent,
      addComponent,
      select,
      selectMultiple,
    ]
  );

  /**
   * Paste to current selection
   */
  const paste = useCallback(
    (options: PasteOptions = {}): boolean => {
      const { targetId, ...rest } = options;

      // Determine target
      let target = targetId;
      if (!target && selectedIds.length > 0) {
        target = selectedIds[0];
      } else if (!target && root) {
        target = root.id;
      }

      if (!target) {
        toast.error("No paste target");
        return false;
      }

      return pasteToTarget(target, rest);
    },
    [selectedIds, root, pasteToTarget]
  );

  // ========================================
  // Duplicate Operations
  // ========================================

  /**
   * Duplicate component by ID
   */
  const duplicateById = useCallback(
    (id: string, options: ClipboardOperationOptions = {}): boolean => {
      const { showToast = true } = options;

      // Can't duplicate root
      if (root && id === root.id) {
        if (showToast) toast.error("Cannot duplicate root component");
        return false;
      }

      // Record state for undo
      if (root) {
        pushState(root, { action: "Duplicate component" });
      }

      const result = duplicateComponent(id);

      if (result.success && result.nodeId) {
        select(result.nodeId);
        if (showToast) toast.success("Component duplicated");
        return true;
      } else {
        if (showToast) toast.error(result.error || "Failed to duplicate");
        return false;
      }
    },
    [root, pushState, duplicateComponent, select]
  );

  /**
   * Duplicate selected components
   */
  const duplicate = useCallback(
    (options: ClipboardOperationOptions = {}): boolean => {
      const { showToast = true } = options;

      if (selectedIds.length === 0) {
        if (showToast) toast.error("No component selected");
        return false;
      }

      // Filter out root
      const idsToUse = root
        ? selectedIds.filter((id) => id !== root.id)
        : selectedIds;

      if (idsToUse.length === 0) {
        if (showToast) toast.error("Cannot duplicate root component");
        return false;
      }

      // Record state for undo
      if (root) {
        pushState(root, {
          action:
            idsToUse.length === 1
              ? "Duplicate component"
              : `Duplicate ${idsToUse.length} components`,
        });
      }

      const duplicatedIds: string[] = [];
      for (const id of idsToUse) {
        const result = duplicateComponent(id);
        if (result.success && result.nodeId) {
          duplicatedIds.push(result.nodeId);
        }
      }

      if (duplicatedIds.length > 0) {
        selectMultiple(duplicatedIds);
        if (showToast) {
          const message =
            duplicatedIds.length === 1
              ? "Component duplicated"
              : `${duplicatedIds.length} components duplicated`;
          toast.success(message);
        }
        return true;
      } else {
        if (showToast) toast.error("Failed to duplicate");
        return false;
      }
    },
    [selectedIds, root, pushState, duplicateComponent, selectMultiple]
  );

  // ========================================
  // Move Operations
  // ========================================

  /**
   * Move component to a new parent
   */
  const moveToParent = useCallback(
    (componentId: string, newParentId: string, index?: number): boolean => {
      if (!root) return false;

      // Record state for undo
      pushState(root, { action: "Move component" });

      const result = moveComponent(componentId, newParentId, index ?? 0);

      if (result.success) {
        toast.success("Component moved");
        return true;
      } else {
        toast.error(result.error || "Failed to move");
        return false;
      }
    },
    [root, pushState, moveComponent]
  );

  /**
   * Reorder component within its parent
   */
  const reorder = useCallback(
    (componentId: string, newIndex: number): boolean => {
      if (!root) return false;

      // Record state for undo
      pushState(root, { action: "Reorder component" });

      const result = reorderComponent(componentId, newIndex);

      if (result.success) {
        return true;
      } else {
        toast.error(result.error || "Failed to reorder");
        return false;
      }
    },
    [root, pushState, reorderComponent]
  );

  /**
   * Move selected component(s) in direction
   */
  const move = useCallback(
    (direction: MoveDirection): boolean => {
      if (selectedIds.length === 0 || !root) return false;

      const id = selectedIds[0];
      if (id === root.id) {
        toast.error("Cannot move root component");
        return false;
      }

      const parent = getParent(id);
      if (!parent?.children) {
        toast.error("Cannot move this component");
        return false;
      }

      const currentIndex = parent.children.findIndex((c) => c.id === id);
      if (currentIndex === -1) return false;

      let newIndex: number;
      switch (direction) {
        case "up":
          newIndex = Math.max(0, currentIndex - 1);
          break;
        case "down":
          newIndex = Math.min(parent.children.length - 1, currentIndex + 1);
          break;
        case "first":
          newIndex = 0;
          break;
        case "last":
          newIndex = parent.children.length - 1;
          break;
      }

      if (newIndex === currentIndex) return false;

      return reorder(id, newIndex);
    },
    [selectedIds, root, getParent, reorder]
  );

  // ========================================
  // Return
  // ========================================

  return {
    // Operations
    copy,
    copyById,
    cut,
    cutById,
    paste,
    pasteToTarget,
    duplicate,
    duplicateById,

    // Move operations
    move,
    moveToParent,
    reorder,

    // State
    canCopy,
    canCut,
    canPaste,
    canDuplicate,
    canMoveUp,
    canMoveDown,
    clipboardCount,
    clipboardOperation,
  };
}

export default useClipboard;
