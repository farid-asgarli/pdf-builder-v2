/**
 * CanvasToolbar Component
 * Toolbar with zoom controls and view options for the canvas
 *
 * Features:
 * - Zoom level selector (25%, 50%, 75%, 100%, 125%, 150%, 200%)
 * - Zoom in/out buttons
 * - Zoom to fit button
 * - Reset view button
 * - Grid toggle
 * - Ruler toggle
 * - Undo/redo buttons (future)
 */
"use client";

import { memo, useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Grid3X3,
  Ruler,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { ZOOM_LEVELS, ZOOM_LABELS } from "@/store/canvas-view-store";
import type { ZoomLevel } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

export interface CanvasToolbarProps {
  /** Current zoom level */
  zoom: ZoomLevel;
  /** Zoom in handler */
  onZoomIn: () => void;
  /** Zoom out handler */
  onZoomOut: () => void;
  /** Set zoom handler */
  onSetZoom: (level: ZoomLevel) => void;
  /** Reset zoom handler */
  onResetZoom: () => void;
  /** Zoom to fit handler */
  onZoomToFit?: () => void;
  /** Whether can zoom in */
  canZoomIn: boolean;
  /** Whether can zoom out */
  canZoomOut: boolean;
  /** Whether grid is visible */
  showGrid: boolean;
  /** Toggle grid handler */
  onToggleGrid: () => void;
  /** Whether rulers are visible */
  showRulers: boolean;
  /** Toggle rulers handler */
  onToggleRulers: () => void;
  /** Position of toolbar */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Zoom Dropdown Component
// ============================================================================

interface ZoomDropdownProps {
  zoom: ZoomLevel;
  onSetZoom: (level: ZoomLevel) => void;
}

function ZoomDropdown({ zoom, onSetZoom }: ZoomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (level: ZoomLevel) => {
      onSetZoom(level);
      setIsOpen(false);
    },
    [onSetZoom]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-17.5 justify-between font-mono text-xs"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {ZOOM_LABELS[zoom]}
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>

      {isOpen && (
        <div
          className="bg-popover absolute top-full left-0 z-50 mt-1 min-w-25 rounded-md border p-1 shadow-md"
          role="listbox"
        >
          {ZOOM_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => handleSelect(level)}
              className={cn(
                "relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-xs transition-colors outline-none select-none",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                level === zoom && "bg-accent/50"
              )}
              role="option"
              aria-selected={level === zoom}
            >
              <span className="flex-1 text-left font-mono">
                {ZOOM_LABELS[level]}
              </span>
              {level === zoom && <Check className="ml-2 h-3 w-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Toolbar Button Component
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  shortcut?: string;
}

function ToolbarButton({
  icon,
  tooltip,
  onClick,
  disabled = false,
  active = false,
  shortcut,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "secondary" : "ghost"}
          size="icon"
          onClick={onClick}
          disabled={disabled}
          className="h-8 w-8"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>
          {tooltip}
          {shortcut && (
            <span className="text-muted-foreground ml-2 text-[10px]">
              {shortcut}
            </span>
          )}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Separator Component
// ============================================================================

function ToolbarSeparator() {
  return <div className="bg-border mx-1 h-4 w-px" />;
}

// ============================================================================
// Main Toolbar Component
// ============================================================================

/**
 * Canvas toolbar with zoom controls and view options
 */
function CanvasToolbarComponent({
  zoom,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onResetZoom,
  onZoomToFit,
  canZoomIn,
  canZoomOut,
  showGrid,
  onToggleGrid,
  showRulers,
  onToggleRulers,
  position = "bottom-left",
  className,
}: CanvasToolbarProps) {
  // Position classes
  const positionClasses = {
    "top-left": "top-3 left-3",
    "top-right": "top-3 right-3",
    "bottom-left": "bottom-3 left-3",
    "bottom-right": "bottom-3 right-3",
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "bg-background/95 supports-backdrop-filter:bg-background/80 absolute z-30 flex items-center gap-1 rounded-lg border p-1 shadow-lg backdrop-blur",
          positionClasses[position],
          className
        )}
      >
        {/* Zoom controls */}
        <ToolbarButton
          icon={<ZoomOut className="h-4 w-4" />}
          tooltip="Zoom Out"
          shortcut="Ctrl+-"
          onClick={onZoomOut}
          disabled={!canZoomOut}
        />

        <ZoomDropdown zoom={zoom} onSetZoom={onSetZoom} />

        <ToolbarButton
          icon={<ZoomIn className="h-4 w-4" />}
          tooltip="Zoom In"
          shortcut="Ctrl++"
          onClick={onZoomIn}
          disabled={!canZoomIn}
        />

        <ToolbarSeparator />

        {/* View options */}
        {onZoomToFit && (
          <ToolbarButton
            icon={<Maximize2 className="h-4 w-4" />}
            tooltip="Zoom to Fit"
            onClick={onZoomToFit}
          />
        )}

        <ToolbarButton
          icon={<RotateCcw className="h-4 w-4" />}
          tooltip="Reset View"
          shortcut="Ctrl+0"
          onClick={onResetZoom}
        />

        <ToolbarSeparator />

        {/* Toggle options */}
        <ToolbarButton
          icon={<Grid3X3 className="h-4 w-4" />}
          tooltip="Toggle Grid"
          onClick={onToggleGrid}
          active={showGrid}
        />

        <ToolbarButton
          icon={<Ruler className="h-4 w-4" />}
          tooltip="Toggle Rulers"
          onClick={onToggleRulers}
          active={showRulers}
        />
      </div>
    </TooltipProvider>
  );
}

export const CanvasToolbar = memo(CanvasToolbarComponent);
CanvasToolbar.displayName = "CanvasToolbar";

export default CanvasToolbar;
