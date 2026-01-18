"use client";

/**
 * CanvasModeSelector Component
 *
 * Provides tabs for switching between different editing modes:
 * - Main Content: The main document body (flows with pagination)
 * - Header: Document header (repeats on every page)
 * - Footer: Document footer (repeats on every page)
 *
 * The mode selector updates the canvas store's editingMode state,
 * which determines which layout tree is active for editing.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useCanvasStore, useEditingMode } from "@/store/canvas-store";
import type { EditingMode } from "@/types/canvas";
import { ModeTab } from "./ModeTab";
import { ModeIndicator } from "./ModeIndicator";
import { FileText, PanelTop, PanelBottom } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface CanvasModeSelectorProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the mode indicator banner below tabs */
  showIndicator?: boolean;
  /** Orientation of the tabs */
  orientation?: "horizontal" | "vertical";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Callback when mode changes */
  onModeChange?: (mode: EditingMode) => void;
}

// ============================================================================
// Mode Configuration
// ============================================================================

interface ModeConfig {
  id: EditingMode;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  badgeColor: string;
}

const MODES: ModeConfig[] = [
  {
    id: "content",
    label: "Main Content",
    shortLabel: "Content",
    icon: FileText,
    description: "Edit the main document content that flows across pages",
    color: "text-blue-600 dark:text-blue-400",
    badgeColor:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  {
    id: "header",
    label: "Header",
    shortLabel: "Header",
    icon: PanelTop,
    description: "Edit the header that repeats on every page",
    color: "text-emerald-600 dark:text-emerald-400",
    badgeColor:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  {
    id: "footer",
    label: "Footer",
    shortLabel: "Footer",
    icon: PanelBottom,
    description: "Edit the footer that repeats on every page",
    color: "text-purple-600 dark:text-purple-400",
    badgeColor:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  },
];

// ============================================================================
// Component
// ============================================================================

export function CanvasModeSelector({
  className,
  showIndicator = true,
  orientation = "horizontal",
  size = "md",
  onModeChange,
}: CanvasModeSelectorProps) {
  const editingMode = useEditingMode();
  const setEditingMode = useCanvasStore((state) => state.setEditingMode);

  const handleModeChange = React.useCallback(
    (mode: EditingMode) => {
      setEditingMode(mode);
      onModeChange?.(mode);
    },
    [setEditingMode, onModeChange]
  );

  const currentModeConfig = React.useMemo(
    () => MODES.find((m) => m.id === editingMode) ?? MODES[0],
    [editingMode]
  );

  return (
    <div
      className={cn(
        "flex flex-col",
        orientation === "vertical" && "flex-col",
        className
      )}
    >
      {/* Tabs Container */}
      <div
        role="tablist"
        aria-label="Canvas editing mode"
        className={cn(
          "bg-muted/50 flex gap-1 rounded-lg p-1",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          size === "sm" && "text-xs",
          size === "md" && "text-sm",
          size === "lg" && "text-base"
        )}
      >
        {MODES.map((mode) => (
          <ModeTab
            key={mode.id}
            mode={mode.id}
            label={mode.label}
            shortLabel={mode.shortLabel}
            icon={mode.icon}
            description={mode.description}
            isActive={editingMode === mode.id}
            color={mode.color}
            onClick={() => handleModeChange(mode.id)}
            size={size}
          />
        ))}
      </div>

      {/* Mode Indicator Banner */}
      {showIndicator && (
        <ModeIndicator
          mode={editingMode}
          label={currentModeConfig.label}
          icon={currentModeConfig.icon}
          description={currentModeConfig.description}
          badgeColor={currentModeConfig.badgeColor}
          className="mt-2"
        />
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { MODES as MODE_CONFIGS };
export type { ModeConfig };
