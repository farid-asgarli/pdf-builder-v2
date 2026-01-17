/**
 * ResizeModeIndicator Component
 * Shows visual indicators for active resize modes during resize operations
 *
 * Features:
 * - Displays active keyboard modifiers (Shift, Ctrl/Cmd, Alt)
 * - Shows mode names (Aspect Lock, Snap to Grid, Preview)
 * - Appears only during active resize
 * - Positioned in canvas toolbar area
 * - Animated appearance/disappearance
 */
"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Lock, Grid3X3, Eye, Keyboard } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Resize mode information
 */
export interface ResizeMode {
  /** Whether aspect ratio lock is active (Shift) */
  aspectRatioLocked: boolean;
  /** Whether snap to grid is active (Ctrl/Cmd) */
  snapToGrid: boolean;
  /** Whether preview mode is active (Alt) - ignores constraints */
  previewMode: boolean;
}

/**
 * Props for ResizeModeIndicator component
 */
export interface ResizeModeIndicatorProps {
  /** Whether resize is currently active */
  isResizing: boolean;
  /** Current resize modes */
  modes: ResizeMode;
  /** Position of the indicator */
  position?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "top-center";
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Mode Configuration
// ============================================================================

interface ModeConfig {
  id: string;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
  description: string;
  activeColor: string;
}

const MODE_CONFIGS: Record<keyof ResizeMode, ModeConfig> = {
  aspectRatioLocked: {
    id: "aspect",
    label: "Aspect Lock",
    shortcut: "Shift",
    icon: <Lock className="h-3 w-3" />,
    description: "Maintain aspect ratio",
    activeColor: "bg-blue-500",
  },
  snapToGrid: {
    id: "snap",
    label: "Snap",
    shortcut: "Ctrl",
    icon: <Grid3X3 className="h-3 w-3" />,
    description: "Snap to 10px grid",
    activeColor: "bg-green-500",
  },
  previewMode: {
    id: "preview",
    label: "Preview",
    shortcut: "Alt",
    icon: <Eye className="h-3 w-3" />,
    description: "Ignore constraints (preview only)",
    activeColor: "bg-amber-500",
  },
};

// ============================================================================
// Sub-Components
// ============================================================================

interface ModeBadgeProps {
  config: ModeConfig;
  isActive: boolean;
}

function ModeBadge({ config, isActive }: ModeBadgeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all duration-150",
        isActive
          ? `${config.activeColor} text-white shadow-sm`
          : "bg-muted/50 text-muted-foreground"
      )}
      title={config.description}
    >
      <span
        className={cn(
          "transition-opacity",
          isActive ? "opacity-100" : "opacity-50"
        )}
      >
        {config.icon}
      </span>
      <span className="hidden sm:inline">{config.label}</span>
      <kbd
        className={cn(
          "ml-1 rounded px-1 py-0.5 font-mono text-[10px]",
          isActive
            ? "bg-white/20 text-white"
            : "bg-background text-muted-foreground"
        )}
      >
        {config.shortcut}
      </kbd>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Visual indicator showing active resize modes
 */
function ResizeModeIndicatorComponent({
  isResizing,
  modes,
  position = "top-center",
  className,
}: ResizeModeIndicatorProps) {
  // Calculate position classes
  const positionClasses = useMemo(() => {
    const positions: Record<string, string> = {
      "top-left": "top-3 left-3",
      "top-right": "top-3 right-3",
      "bottom-left": "bottom-3 left-3",
      "bottom-right": "bottom-3 right-3",
      "top-center": "top-3 left-1/2 -translate-x-1/2",
    };
    return positions[position];
  }, [position]);

  // Check if any mode is active
  const hasActiveMode =
    modes.aspectRatioLocked || modes.snapToGrid || modes.previewMode;

  // Don't render if not resizing
  if (!isResizing) {
    return null;
  }

  return (
    <div
      className={cn(
        // Base styles
        "pointer-events-none absolute z-50 select-none",
        // Animation
        "animate-in fade-in-0 slide-in-from-top-2 duration-150",
        // Position
        positionClasses,
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Resize modes: ${hasActiveMode ? "active" : "none"}`}
    >
      <div
        className={cn(
          "bg-background/95 supports-backdrop-filter:bg-background/80 rounded-lg border p-2 shadow-lg backdrop-blur",
          "flex items-center gap-2"
        )}
      >
        {/* Keyboard icon indicator */}
        <div className="text-muted-foreground flex items-center gap-1">
          <Keyboard className="h-3.5 w-3.5" />
          <span className="hidden text-xs font-medium sm:inline">Modes:</span>
        </div>

        {/* Mode badges */}
        <div className="flex items-center gap-1.5">
          <ModeBadge
            config={MODE_CONFIGS.aspectRatioLocked}
            isActive={modes.aspectRatioLocked}
          />
          <ModeBadge
            config={MODE_CONFIGS.snapToGrid}
            isActive={modes.snapToGrid}
          />
          <ModeBadge
            config={MODE_CONFIGS.previewMode}
            isActive={modes.previewMode}
          />
        </div>

        {/* Preview mode warning */}
        {modes.previewMode && (
          <div className="ml-2 flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <span className="text-[10px] font-medium">
              Values won&apos;t be saved
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export const ResizeModeIndicator = memo(ResizeModeIndicatorComponent);
ResizeModeIndicator.displayName = "ResizeModeIndicator";

export default ResizeModeIndicator;

// ============================================================================
// Compact Version for Toolbar Integration
// ============================================================================

export interface ResizeModeTooltipProps {
  modes: ResizeMode;
  className?: string;
}

/**
 * Compact version for integration into existing toolbar
 */
function ResizeModeTooltipComponent({
  modes,
  className,
}: ResizeModeTooltipProps) {
  const activeCount = [
    modes.aspectRatioLocked,
    modes.snapToGrid,
    modes.previewMode,
  ].filter(Boolean).length;

  if (activeCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1 text-xs", className)}>
      {modes.aspectRatioLocked && (
        <span
          className="flex items-center gap-0.5 text-blue-500"
          title="Aspect ratio locked (Shift)"
        >
          <Lock className="h-3 w-3" />
        </span>
      )}
      {modes.snapToGrid && (
        <span
          className="flex items-center gap-0.5 text-green-500"
          title="Snap to grid (Ctrl)"
        >
          <Grid3X3 className="h-3 w-3" />
        </span>
      )}
      {modes.previewMode && (
        <span
          className="flex items-center gap-0.5 text-amber-500"
          title="Preview mode (Alt)"
        >
          <Eye className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

export const ResizeModeTooltip = memo(ResizeModeTooltipComponent);
ResizeModeTooltip.displayName = "ResizeModeTooltip";
