/**
 * useKeyboardShortcuts Hook
 * Provides global keyboard shortcuts for the canvas builder
 *
 * Features:
 * - Copy (Ctrl+C) - Copy selected component(s)
 * - Paste (Ctrl+V) - Paste from clipboard
 * - Cut (Ctrl+X) - Cut selected component(s)
 * - Delete (Delete/Backspace) - Delete selected component(s)
 * - Duplicate (Ctrl+D) - Duplicate selected component(s)
 * - Select All (Ctrl+A) - Select all components
 * - Save (Ctrl+S) - Save template
 * - Undo (Ctrl+Z) - Undo last action
 * - Redo (Ctrl+Y / Ctrl+Shift+Z) - Redo last action
 */
"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useCanvasStore, useSelectedIds, useSelectionStore } from "@/store";
import { useClipboardStore } from "@/store/clipboard-store";
import { useHistoryStore } from "@/store/history-store";
import { useTemplateStore } from "@/store/template-store";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Key code (e.g., 'c', 'v', 'Delete') */
  key: string | string[];
  /** Whether Ctrl/Cmd is required */
  ctrl?: boolean;
  /** Whether Shift is required */
  shift?: boolean;
  /** Whether Alt is required */
  alt?: boolean;
  /** Action to perform */
  action: () => void;
  /** Description of the action */
  description: string;
  /** Whether the shortcut is enabled */
  enabled?: boolean;
}

/**
 * Keyboard shortcuts configuration options
 */
export interface UseKeyboardShortcutsOptions {
  /** Whether keyboard shortcuts are enabled (default: true) */
  enabled?: boolean;
  /** Whether to prevent default browser behavior (default: true) */
  preventDefault?: boolean;
  /** Element to scope the shortcuts to (default: window) */
  scope?: HTMLElement | null;
  /** Callback when any shortcut is triggered */
  onShortcutTriggered?: (shortcut: string) => void;
  /** Callback when copy is performed */
  onCopy?: () => void;
  /** Callback when paste is performed */
  onPaste?: () => void;
  /** Callback when delete is performed */
  onDelete?: () => void;
  /** Callback when duplicate is performed */
  onDuplicate?: () => void;
  /** Callback when select all is performed */
  onSelectAll?: () => void;
  /** Callback when save is performed */
  onSave?: () => void;
}

/**
 * Return type for useKeyboardShortcuts hook
 */
export interface UseKeyboardShortcutsReturn {
  /** Copy selected component(s) */
  copy: () => void;
  /** Paste from clipboard */
  paste: () => void;
  /** Cut selected component(s) */
  cut: () => void;
  /** Delete selected component(s) */
  deleteSelected: () => void;
  /** Duplicate selected component(s) */
  duplicate: () => void;
  /** Select all components */
  selectAll: () => void;
  /** Save template */
  save: () => Promise<void>;
  /** Whether copy is available */
  canCopy: boolean;
  /** Whether paste is available */
  canPaste: boolean;
  /** Whether delete is available */
  canDelete: boolean;
  /** Whether duplicate is available */
  canDuplicate: boolean;
  /** Whether save is available */
  canSave: boolean;
  /** List of all registered shortcuts */
  shortcuts: KeyboardShortcut[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if target element is an editable element (input, textarea, contenteditable)
 */
function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea") return true;
  if (target.isContentEditable) return true;
  if (target.closest('[contenteditable="true"]')) return true;
  if (target.closest(".monaco-editor")) return true;

  return false;
}

/**
 * Check if a key matches the shortcut key
 */
function keyMatches(eventKey: string, shortcutKey: string | string[]): boolean {
  const keys = Array.isArray(shortcutKey) ? shortcutKey : [shortcutKey];
  return keys.some((k) => eventKey.toLowerCase() === k.toLowerCase());
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing global keyboard shortcuts in the canvas builder
 *
 * @example
 * ```tsx
 * function CanvasBuilder() {
 *   const {
 *     copy,
 *     paste,
 *     deleteSelected,
 *     canCopy,
 *     canPaste,
 *   } = useKeyboardShortcuts({
 *     onCopy: () => toast.success('Copied!'),
 *     onDelete: () => toast.success('Deleted!'),
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={copy} disabled={!canCopy}>Copy</button>
 *       <button onClick={paste} disabled={!canPaste}>Paste</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {}
): UseKeyboardShortcutsReturn {
  const {
    enabled = true,
    preventDefault = true,
    scope = null,
    onShortcutTriggered,
    onCopy,
    onPaste,
    onDelete,
    onDuplicate,
    onSelectAll,
    onSave,
  } = options;

  // Store hooks
  const selectedIds = useSelectedIds();
  const { selectAll: selectAllComponents, clearSelection } =
    useSelectionStore();
  const {
    root,
    getComponent,
    deleteComponent,
    duplicateComponent,
    addComponent,
    getAllNodeIds,
  } = useCanvasStore();
  const {
    copy: clipboardCopy,
    cut: clipboardCut,
    getForPaste,
    markAsPasted,
    getSourceIdsForCut,
    hasContent: hasClipboardContent,
  } = useClipboardStore();
  const { pushState, undo: historyUndo, redo: historyRedo } = useHistoryStore();
  const { save: templateSave, isDirty, isSaving } = useTemplateStore();

  // ========================================
  // Computed Values
  // ========================================

  const canCopy = selectedIds.length > 0;
  const canPaste = hasClipboardContent();
  const canDelete = selectedIds.length > 0;
  const canDuplicate = selectedIds.length > 0;
  const canSave = isDirty && !isSaving;

  // ========================================
  // Action Handlers
  // ========================================

  /**
   * Copy selected components to clipboard
   */
  const copy = useCallback(() => {
    if (selectedIds.length === 0) return;

    const nodes = selectedIds
      .map((id) => getComponent(id))
      .filter((node): node is NonNullable<typeof node> => node !== null);

    if (nodes.length === 0) return;

    clipboardCopy(nodes);

    const message =
      nodes.length === 1
        ? "Component copied"
        : `${nodes.length} components copied`;
    toast.success(message);

    onCopy?.();
    onShortcutTriggered?.("copy");
  }, [selectedIds, getComponent, clipboardCopy, onCopy, onShortcutTriggered]);

  /**
   * Cut selected components to clipboard
   */
  const cut = useCallback(() => {
    if (selectedIds.length === 0) return;

    const nodes = selectedIds
      .map((id) => getComponent(id))
      .filter((node): node is NonNullable<typeof node> => node !== null);

    if (nodes.length === 0) return;

    clipboardCut(nodes);

    const message =
      nodes.length === 1 ? "Component cut" : `${nodes.length} components cut`;
    toast.success(message);

    onShortcutTriggered?.("cut");
  }, [selectedIds, getComponent, clipboardCut, onShortcutTriggered]);

  /**
   * Paste from clipboard
   */
  const paste = useCallback(() => {
    const nodesToPaste = getForPaste();
    if (!nodesToPaste || nodesToPaste.length === 0) {
      toast.error("Nothing to paste");
      return;
    }

    // Determine the paste target
    // If a component is selected, paste as sibling or child depending on type
    // Otherwise, paste to root
    let targetId: string | null = null;

    if (selectedIds.length > 0) {
      targetId = selectedIds[0];
    } else if (root) {
      targetId = root.id;
    }

    if (!targetId || !root) {
      toast.error("No target for paste operation");
      return;
    }

    // Record state for undo
    pushState(root, {
      action:
        nodesToPaste.length === 1
          ? "Paste component"
          : `Paste ${nodesToPaste.length} components`,
    });

    // Handle cut operation - delete source nodes
    const sourceIds = getSourceIdsForCut();
    if (sourceIds.length > 0) {
      for (const sourceId of sourceIds) {
        deleteComponent(sourceId);
      }
      markAsPasted();
    }

    // Paste each node
    const pastedIds: string[] = [];
    for (const node of nodesToPaste) {
      const result = addComponent(targetId, node);
      if (result.success && result.nodeId) {
        pastedIds.push(result.nodeId);
      }
    }

    if (pastedIds.length > 0) {
      // Select the first pasted node
      const { select } = useSelectionStore.getState();
      select(pastedIds[0]);

      const message =
        pastedIds.length === 1
          ? "Component pasted"
          : `${pastedIds.length} components pasted`;
      toast.success(message);

      onPaste?.();
    } else {
      toast.error("Failed to paste components");
    }

    onShortcutTriggered?.("paste");
  }, [
    getForPaste,
    selectedIds,
    root,
    pushState,
    getSourceIdsForCut,
    deleteComponent,
    markAsPasted,
    addComponent,
    onPaste,
    onShortcutTriggered,
  ]);

  /**
   * Delete selected components
   */
  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (!root) return;

    // Don't allow deleting root
    if (selectedIds.includes(root.id) && selectedIds.length === 1) {
      toast.error("Cannot delete root component");
      return;
    }

    // Filter out root if included
    const idsToDelete = selectedIds.filter((id) => id !== root.id);
    if (idsToDelete.length === 0) return;

    // Record state for undo
    pushState(root, {
      action:
        idsToDelete.length === 1
          ? "Delete component"
          : `Delete ${idsToDelete.length} components`,
    });

    // Delete each selected component
    let deletedCount = 0;
    for (const id of idsToDelete) {
      const result = deleteComponent(id);
      if (result.success) {
        deletedCount++;
      }
    }

    // Clear selection after delete
    clearSelection();

    if (deletedCount > 0) {
      const message =
        deletedCount === 1
          ? "Component deleted"
          : `${deletedCount} components deleted`;
      toast.success(message);

      onDelete?.();
    }

    onShortcutTriggered?.("delete");
  }, [
    selectedIds,
    root,
    pushState,
    deleteComponent,
    clearSelection,
    onDelete,
    onShortcutTriggered,
  ]);

  /**
   * Duplicate selected components
   */
  const duplicate = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (!root) return;

    // Don't allow duplicating root
    if (selectedIds.includes(root.id)) {
      toast.error("Cannot duplicate root component");
      return;
    }

    // Record state for undo
    pushState(root, {
      action:
        selectedIds.length === 1
          ? "Duplicate component"
          : `Duplicate ${selectedIds.length} components`,
    });

    // Duplicate each selected component
    const duplicatedIds: string[] = [];
    for (const id of selectedIds) {
      const result = duplicateComponent(id);
      if (result.success && result.nodeId) {
        duplicatedIds.push(result.nodeId);
      }
    }

    if (duplicatedIds.length > 0) {
      // Select the duplicated components
      const { selectMultiple } = useSelectionStore.getState();
      selectMultiple(duplicatedIds);

      const message =
        duplicatedIds.length === 1
          ? "Component duplicated"
          : `${duplicatedIds.length} components duplicated`;
      toast.success(message);

      onDuplicate?.();
    }

    onShortcutTriggered?.("duplicate");
  }, [
    selectedIds,
    root,
    pushState,
    duplicateComponent,
    onDuplicate,
    onShortcutTriggered,
  ]);

  /**
   * Select all components
   */
  const selectAll = useCallback(() => {
    const allIds = getAllNodeIds();
    if (allIds.length === 0) return;

    selectAllComponents(allIds);

    toast.success(`${allIds.length} components selected`);
    onSelectAll?.();
    onShortcutTriggered?.("selectAll");
  }, [getAllNodeIds, selectAllComponents, onSelectAll, onShortcutTriggered]);

  /**
   * Save template
   */
  const save = useCallback(async () => {
    if (!canSave) return;

    try {
      const success = await templateSave();
      if (success) {
        toast.success("Template saved");
        onSave?.();
      } else {
        toast.error("Failed to save template");
      }
    } catch {
      toast.error("Failed to save template");
    }

    onShortcutTriggered?.("save");
  }, [canSave, templateSave, onSave, onShortcutTriggered]);

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    const restored = historyUndo(root);
    if (restored) {
      useCanvasStore.getState().setRoot(restored);
      toast.success("Undo");
    }
    onShortcutTriggered?.("undo");
  }, [root, historyUndo, onShortcutTriggered]);

  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    const restored = historyRedo(root);
    if (restored) {
      useCanvasStore.getState().setRoot(restored);
      toast.success("Redo");
    }
    onShortcutTriggered?.("redo");
  }, [root, historyRedo, onShortcutTriggered]);

  // ========================================
  // Shortcuts Definition
  // ========================================

  const shortcuts: KeyboardShortcut[] = useMemo(
    () => [
      {
        key: "c",
        ctrl: true,
        action: copy,
        description: "Copy selected component(s)",
        enabled: canCopy,
      },
      {
        key: "x",
        ctrl: true,
        action: cut,
        description: "Cut selected component(s)",
        enabled: canCopy,
      },
      {
        key: "v",
        ctrl: true,
        action: paste,
        description: "Paste from clipboard",
        enabled: canPaste,
      },
      {
        key: ["Delete", "Backspace"],
        action: deleteSelected,
        description: "Delete selected component(s)",
        enabled: canDelete,
      },
      {
        key: "d",
        ctrl: true,
        action: duplicate,
        description: "Duplicate selected component(s)",
        enabled: canDuplicate,
      },
      {
        key: "a",
        ctrl: true,
        action: selectAll,
        description: "Select all components",
        enabled: true,
      },
      {
        key: "s",
        ctrl: true,
        action: save,
        description: "Save template",
        enabled: canSave,
      },
      {
        key: "z",
        ctrl: true,
        action: undo,
        description: "Undo last action",
        enabled: true,
      },
      {
        key: ["y", "z"],
        ctrl: true,
        shift: true,
        action: redo,
        description: "Redo last action",
        enabled: true,
      },
    ],
    [
      copy,
      cut,
      paste,
      deleteSelected,
      duplicate,
      selectAll,
      save,
      undo,
      redo,
      canCopy,
      canPaste,
      canDelete,
      canDuplicate,
      canSave,
    ]
  );

  // ========================================
  // Event Listener
  // ========================================

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if in editable element (unless it's a global action like save)
      const isEditable = isEditableElement(event.target);

      // Check for modifier keys
      const isCtrl = event.ctrlKey || event.metaKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        // Check if key matches
        if (!keyMatches(event.key, shortcut.key)) continue;

        // Check modifier keys
        if (shortcut.ctrl && !isCtrl) continue;
        if (
          !shortcut.ctrl &&
          isCtrl &&
          !["Delete", "Backspace"].includes(event.key)
        )
          continue;

        // For redo with Shift+Z, we need shift
        if (shortcut.shift && !isShift) continue;

        // For undo (z without shift), skip if shift is pressed
        if (shortcut.key === "z" && !shortcut.shift && isShift) continue;

        if (shortcut.alt && !isAlt) continue;

        // Skip editable elements for non-global shortcuts
        // Allow Ctrl+S (save) and Ctrl+A (select all) even in editable elements
        const globalShortcuts = ["s", "a"];
        if (isEditable && shortcut.ctrl) {
          if (
            !globalShortcuts.includes(
              Array.isArray(shortcut.key) ? shortcut.key[0] : shortcut.key
            )
          ) {
            continue;
          }
          // For select all in editable, don't interfere with browser default
          if (shortcut.key === "a" && isCtrl) {
            continue;
          }
        }

        // Skip delete/backspace in editable elements
        if (isEditable && ["Delete", "Backspace"].includes(event.key)) {
          continue;
        }

        // Prevent default if enabled
        if (preventDefault) {
          event.preventDefault();
        }

        // Execute action
        shortcut.action();
        return;
      }
    };

    const target = scope ?? window;
    target.addEventListener("keydown", handleKeyDown as EventListener);

    return () => {
      target.removeEventListener("keydown", handleKeyDown as EventListener);
    };
  }, [enabled, preventDefault, scope, shortcuts]);

  // ========================================
  // Return Value
  // ========================================

  return {
    copy,
    paste,
    cut,
    deleteSelected,
    duplicate,
    selectAll,
    save,
    canCopy,
    canPaste,
    canDelete,
    canDuplicate,
    canSave,
    shortcuts,
  };
}

// ============================================================================
// Utility Hook for Shortcut Display
// ============================================================================

/**
 * Get the display string for a keyboard shortcut
 */
export function getShortcutDisplayString(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) {
    // Use Cmd on Mac, Ctrl elsewhere
    const isMac =
      typeof navigator !== "undefined" &&
      /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    parts.push(isMac ? "⌘" : "Ctrl");
  }

  if (shortcut.shift) parts.push("Shift");
  if (shortcut.alt) parts.push("Alt");

  const key = Array.isArray(shortcut.key) ? shortcut.key[0] : shortcut.key;
  const displayKey = key.length === 1 ? key.toUpperCase() : key;
  parts.push(displayKey);

  return parts.join("+");
}

/**
 * Hook to get shortcut display information
 */
export function useShortcutDisplay() {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return {
    modifier: isMac ? "⌘" : "Ctrl",
    copy: isMac ? "⌘C" : "Ctrl+C",
    paste: isMac ? "⌘V" : "Ctrl+V",
    cut: isMac ? "⌘X" : "Ctrl+X",
    delete: "Delete",
    duplicate: isMac ? "⌘D" : "Ctrl+D",
    selectAll: isMac ? "⌘A" : "Ctrl+A",
    save: isMac ? "⌘S" : "Ctrl+S",
    undo: isMac ? "⌘Z" : "Ctrl+Z",
    redo: isMac ? "⌘⇧Z" : "Ctrl+Y",
  };
}
