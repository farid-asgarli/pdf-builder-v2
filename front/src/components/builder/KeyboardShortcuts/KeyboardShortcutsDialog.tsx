/**
 * KeyboardShortcutsDialog
 * A dialog component that displays all available keyboard shortcuts
 *
 * NOTE: This component requires the Dialog component from shadcn/ui.
 * If Dialog is not installed, use the KeyboardShortcutsHelp component instead.
 */
"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsProvider";

// ============================================================================
// Types
// ============================================================================

interface KeyboardShortcutsDialogProps {
  /** Trigger element (optional - if not provided, uses default button) */
  trigger?: ReactNode;
  /** Whether to enable the "?" key to open the dialog */
  enableHotkeyOpen?: boolean;
  /** Additional CSS classes for the dialog */
  className?: string;
}

// ============================================================================
// Simple Modal Component (no Dialog dependency)
// ============================================================================

interface SimpleModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

function SimpleModal({ open, onClose, children, className }: SimpleModalProps) {
  // Handle escape key to close
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div
        className={cn(
          "bg-background relative mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg shadow-lg",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dialog component for displaying keyboard shortcuts
 *
 * @example
 * ```tsx
 * // With default trigger
 * <KeyboardShortcutsDialog />
 *
 * // With custom trigger
 * <KeyboardShortcutsDialog trigger={<Button>Shortcuts</Button>} />
 *
 * // With "?" key to open
 * <KeyboardShortcutsDialog enableHotkeyOpen />
 * ```
 */
export function KeyboardShortcutsDialog({
  trigger,
  enableHotkeyOpen = false,
  className,
}: KeyboardShortcutsDialogProps) {
  const [open, setOpen] = useState(false);

  // Handle "?" key to open dialog
  useEffect(() => {
    if (!enableHotkeyOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if "?" is pressed (Shift + /)
      if (event.key === "?" && event.shiftKey) {
        // Don't trigger in input/textarea elements
        const target = event.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        event.preventDefault();
        setOpen(true);
      }

      // Also handle F1 for help
      if (event.key === "F1") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableHotkeyOpen]);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="gap-2">
      <Keyboard className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only sm:inline">Shortcuts</span>
    </Button>
  );

  return (
    <>
      {/* Trigger button */}
      <div onClick={() => setOpen(true)}>{trigger ?? defaultTrigger}</div>

      {/* Modal */}
      <SimpleModal
        open={open}
        onClose={() => setOpen(false)}
        className={className}
      >
        <div className="p-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* Description */}
          <p className="text-muted-foreground mb-4 text-sm">
            Quick actions to speed up your workflow.
          </p>

          {/* Shortcuts list */}
          <KeyboardShortcutsHelp />

          {/* Footer hint */}
          {enableHotkeyOpen && (
            <div className="mt-4 border-t pt-4">
              <p className="text-muted-foreground text-center text-xs">
                Press{" "}
                <kbd className="bg-muted rounded border px-1 py-0.5 font-mono text-xs">
                  ?
                </kbd>{" "}
                or{" "}
                <kbd className="bg-muted rounded border px-1 py-0.5 font-mono text-xs">
                  F1
                </kbd>{" "}
                to open this dialog
              </p>
            </div>
          )}
        </div>
      </SimpleModal>
    </>
  );
}

// ============================================================================
// Export
// ============================================================================

export default KeyboardShortcutsDialog;
