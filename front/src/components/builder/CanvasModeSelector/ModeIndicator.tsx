"use client";

/**
 * ModeIndicator Component
 *
 * Visual banner showing the current editing mode.
 * Displays "Editing: Header/Content/Footer" with an icon
 * and helpful context about what the mode means.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { EditingMode } from "@/types/canvas";
import { RefreshCw, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

export interface ModeIndicatorProps {
  /** Current editing mode */
  mode: EditingMode;
  /** Label for the mode */
  label: string;
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Description of the mode */
  description: string;
  /** Badge color classes */
  badgeColor: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ModeIndicator({
  mode,
  label,
  icon: Icon,
  description: _description,
  badgeColor,
  className,
}: ModeIndicatorProps) {
  // Helper text based on mode
  const helperText = React.useMemo(() => {
    switch (mode) {
      case "header":
        return "Changes will appear at the top of every page";
      case "footer":
        return "Changes will appear at the bottom of every page";
      case "content":
      default:
        return "Main document content with automatic pagination";
    }
  }, [mode]);

  // Whether this mode repeats on every page
  const isRepeating = mode === "header" || mode === "footer";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md px-3 py-2",
        "bg-muted/30 border-border/50 border",
        "transition-colors duration-200",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Left side: Mode info */}
      <div className="flex min-w-0 items-center gap-2">
        <Badge
          variant="secondary"
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 font-medium",
            badgeColor
          )}
        >
          <Icon className="h-3 w-3" />
          <span>Editing: {label}</span>
        </Badge>

        {/* Repeating indicator for header/footer */}
        {isRepeating && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">Repeats on every page</span>
            <span className="sm:hidden">Every page</span>
          </span>
        )}

        {/* Content flow indicator */}
        {mode === "content" && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <FileText className="h-3 w-3" />
            <span className="hidden sm:inline">Auto-paginates</span>
          </span>
        )}
      </div>

      {/* Right side: Helper text (hidden on small screens) */}
      <p className="text-muted-foreground hidden truncate text-xs md:block">
        {helperText}
      </p>
    </div>
  );
}

// ============================================================================
// Compact Mode Indicator (for toolbar use)
// ============================================================================

export interface CompactModeIndicatorProps {
  /** Current editing mode */
  mode: EditingMode;
  /** Icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Additional CSS classes */
  className?: string;
}

export function CompactModeIndicator({
  mode,
  icon: Icon,
  className,
}: CompactModeIndicatorProps) {
  const label = mode.charAt(0).toUpperCase() + mode.slice(1);

  const colorClasses = {
    content:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    header:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    footer:
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        colorClasses[mode],
        className
      )}
      role="status"
      aria-label={`Currently editing: ${label}`}
    >
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
  );
}
