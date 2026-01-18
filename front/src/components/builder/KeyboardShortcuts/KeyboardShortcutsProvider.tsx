/**
 * KeyboardShortcutsProvider
 * Provider component that enables global keyboard shortcuts for the canvas builder
 *
 * Features:
 * - Global keyboard shortcuts for copy, paste, delete, duplicate, select all, save
 * - Context for accessing shortcut actions and state
 * - Keyboard shortcuts help dialog
 */
"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useKeyboardShortcuts,
  useShortcutDisplay,
  type UseKeyboardShortcutsOptions,
  type UseKeyboardShortcutsReturn,
} from "@/hooks/useKeyboardShortcuts";

// ============================================================================
// Context
// ============================================================================

interface KeyboardShortcutsContextValue extends UseKeyboardShortcutsReturn {
  /** Shortcut display strings */
  display: ReturnType<typeof useShortcutDisplay>;
}

const KeyboardShortcutsContext =
  createContext<KeyboardShortcutsContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface KeyboardShortcutsProviderProps extends UseKeyboardShortcutsOptions {
  children: ReactNode;
}

/**
 * Provider component that enables global keyboard shortcuts
 *
 * @example
 * ```tsx
 * function BuilderLayout({ children }) {
 *   return (
 *     <KeyboardShortcutsProvider
 *       onCopy={() => console.log('Copied!')}
 *       onSave={() => console.log('Saved!')}
 *     >
 *       {children}
 *     </KeyboardShortcutsProvider>
 *   );
 * }
 * ```
 */
export function KeyboardShortcutsProvider({
  children,
  ...options
}: KeyboardShortcutsProviderProps) {
  const shortcuts = useKeyboardShortcuts(options);
  const display = useShortcutDisplay();

  const contextValue: KeyboardShortcutsContextValue = {
    ...shortcuts,
    display,
  };

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access keyboard shortcuts context
 *
 * @example
 * ```tsx
 * function ToolbarActions() {
 *   const { copy, paste, canCopy, canPaste, display } = useKeyboardShortcutsContext();
 *
 *   return (
 *     <div>
 *       <Button onClick={copy} disabled={!canCopy}>
 *         Copy ({display.copy})
 *       </Button>
 *       <Button onClick={paste} disabled={!canPaste}>
 *         Paste ({display.paste})
 *       </Button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useKeyboardShortcutsContext(): KeyboardShortcutsContextValue {
  const context = useContext(KeyboardShortcutsContext);

  if (!context) {
    throw new Error(
      "useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider"
    );
  }

  return context;
}

/**
 * Hook to check if keyboard shortcuts context is available
 */
export function useHasKeyboardShortcutsContext(): boolean {
  const context = useContext(KeyboardShortcutsContext);
  return context !== null;
}

// ============================================================================
// Keyboard Shortcuts Help Component
// ============================================================================

interface ShortcutItemProps {
  label: string;
  shortcut: string;
}

function ShortcutItem({ label, shortcut }: ShortcutItemProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <kbd className="bg-muted rounded border px-2 py-1 font-mono text-xs">
        {shortcut}
      </kbd>
    </div>
  );
}

/**
 * Component displaying all available keyboard shortcuts
 */
export function KeyboardShortcutsHelp() {
  const display = useShortcutDisplay();
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  const cmdOrCtrl = isMac ? "⌘" : "Ctrl";

  const componentShortcuts = [
    { label: "Copy", shortcut: display.copy },
    { label: "Cut", shortcut: display.cut },
    { label: "Paste", shortcut: display.paste },
    { label: "Delete", shortcut: display.delete },
    { label: "Duplicate", shortcut: display.duplicate },
    { label: "Select All", shortcut: display.selectAll },
  ];

  const generalShortcuts = [
    { label: "Save", shortcut: display.save },
    { label: "Undo", shortcut: display.undo },
    { label: "Redo", shortcut: display.redo },
  ];

  const quickAddShortcuts = [
    { label: "Quick Add Component", shortcut: `${cmdOrCtrl}+/` },
    { label: "Add Column", shortcut: "c" },
    { label: "Add Row", shortcut: "r" },
    { label: "Add Text", shortcut: "t" },
    { label: "Add Image", shortcut: "i" },
    { label: "Add Table", shortcut: "b" },
  ];

  const navigationShortcuts = [
    { label: "Show Shortcuts", shortcut: "?" },
    { label: "Generate Preview", shortcut: `${cmdOrCtrl}+P` },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Component Operations</h4>
        <div className="divide-y">
          {componentShortcuts.map((s) => (
            <ShortcutItem key={s.label} {...s} />
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Quick Add Components</h4>
        <p className="text-muted-foreground mb-1 text-xs">
          Use these shortcuts in the Quick Add palette
        </p>
        <div className="divide-y">
          {quickAddShortcuts.map((s) => (
            <ShortcutItem key={s.label} {...s} />
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium">General</h4>
        <div className="divide-y">
          {generalShortcuts.map((s) => (
            <ShortcutItem key={s.label} {...s} />
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Navigation</h4>
        <div className="divide-y">
          {navigationShortcuts.map((s) => (
            <ShortcutItem key={s.label} {...s} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Action Buttons Component
// ============================================================================

interface KeyboardShortcutsActionsProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show labels */
  showLabels?: boolean;
  /** Whether to show shortcuts in tooltips */
  showShortcuts?: boolean;
}

/**
 * Ready-to-use action buttons with keyboard shortcut support
 *
 * @example
 * ```tsx
 * function Toolbar() {
 *   return (
 *     <KeyboardShortcutsActions
 *       showLabels={false}
 *       showShortcuts={true}
 *     />
 *   );
 * }
 * ```
 */
export function KeyboardShortcutsActions({
  className,
  showLabels = true,
  showShortcuts = true,
}: KeyboardShortcutsActionsProps) {
  const {
    copy,
    cut,
    paste,
    deleteSelected,
    duplicate,
    selectAll: _selectAll,
    save,
    canCopy,
    canPaste,
    canDelete,
    canDuplicate,
    canSave,
    display,
  } = useKeyboardShortcutsContext();

  const actions = [
    {
      label: "Copy",
      shortcut: display.copy,
      action: copy,
      disabled: !canCopy,
      icon: "📋",
    },
    {
      label: "Cut",
      shortcut: display.cut,
      action: cut,
      disabled: !canCopy,
      icon: "✂️",
    },
    {
      label: "Paste",
      shortcut: display.paste,
      action: paste,
      disabled: !canPaste,
      icon: "📄",
    },
    {
      label: "Duplicate",
      shortcut: display.duplicate,
      action: duplicate,
      disabled: !canDuplicate,
      icon: "🔄",
    },
    {
      label: "Delete",
      shortcut: display.delete,
      action: deleteSelected,
      disabled: !canDelete,
      icon: "🗑️",
    },
    {
      label: "Save",
      shortcut: display.save,
      action: save,
      disabled: !canSave,
      icon: "💾",
    },
  ];

  return (
    <div className={className}>
      {actions.map(({ label, shortcut, action, disabled, icon }) => (
        <button
          key={label}
          onClick={action}
          disabled={disabled}
          className="hover:bg-accent inline-flex items-center gap-1 rounded px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          title={showShortcuts ? `${label} (${shortcut})` : label}
        >
          <span>{icon}</span>
          {showLabels && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}
