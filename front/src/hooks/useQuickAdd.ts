/**
 * useQuickAdd Hook
 * Manages the Quick Add palette state and keyboard shortcut
 *
 * Features:
 * - Opens palette with Ctrl+/ (Cmd+/ on Mac)
 * - Tracks open/close state
 * - Provides callbacks for component addition
 */
"use client";

import { useState, useCallback, useEffect } from "react";
import type { ComponentType } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

export interface UseQuickAddOptions {
  /** Whether the shortcut is enabled (default: true) */
  enabled?: boolean;
  /** Custom keyboard shortcut key (default: '/') */
  shortcutKey?: string;
  /** Callback when a component is added */
  onComponentAdded?: (componentType: ComponentType) => void;
}

export interface UseQuickAddReturn {
  /** Whether the quick add palette is open */
  isOpen: boolean;
  /** Open the quick add palette */
  open: () => void;
  /** Close the quick add palette */
  close: () => void;
  /** Toggle the quick add palette */
  toggle: () => void;
  /** Handle component added event */
  handleComponentAdded: (componentType: ComponentType) => void;
}

// ============================================================================
// Helper
// ============================================================================

/**
 * Check if target element is an editable element
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

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing the Quick Add palette
 *
 * @example
 * ```tsx
 * function CanvasBuilder() {
 *   const { isOpen, close, handleComponentAdded } = useQuickAdd({
 *     onComponentAdded: (type) => console.log('Added:', type),
 *   });
 *
 *   return (
 *     <>
 *       <QuickAddPalette
 *         isOpen={isOpen}
 *         onClose={close}
 *         onComponentAdded={handleComponentAdded}
 *       />
 *       {children}
 *     </>
 *   );
 * }
 * ```
 */
export function useQuickAdd(
  options: UseQuickAddOptions = {}
): UseQuickAddReturn {
  const { enabled = true, shortcutKey = "/", onComponentAdded } = options;

  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleComponentAdded = useCallback(
    (componentType: ComponentType) => {
      onComponentAdded?.(componentType);
    },
    [onComponentAdded]
  );

  // Keyboard shortcut listener
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger in editable elements
      if (isEditableElement(event.target)) return;

      // Check for Ctrl+/ or Cmd+/
      if ((event.ctrlKey || event.metaKey) && event.key === shortcutKey) {
        event.preventDefault();
        toggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, shortcutKey, toggle]);

  return {
    isOpen,
    open,
    close,
    toggle,
    handleComponentAdded,
  };
}

export default useQuickAdd;
