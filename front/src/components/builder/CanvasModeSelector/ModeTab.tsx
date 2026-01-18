"use client";

/**
 * ModeTab Component
 *
 * Individual tab for the canvas mode selector.
 * Represents one editing mode (Content, Header, or Footer).
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import type { EditingMode } from "@/types/canvas";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Types
// ============================================================================

export interface ModeTabProps {
  /** The editing mode this tab represents */
  mode: EditingMode;
  /** Full label for the tab */
  label: string;
  /** Short label for compact display */
  shortLabel: string;
  /** Icon component to display */
  icon: React.ComponentType<{ className?: string }>;
  /** Description shown in tooltip */
  description: string;
  /** Whether this tab is currently active */
  isActive: boolean;
  /** Color class for the active state */
  color: string;
  /** Click handler */
  onClick: () => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

// ============================================================================
// Component
// ============================================================================

export function ModeTab({
  mode,
  label,
  shortLabel,
  icon: Icon,
  description,
  isActive,
  color,
  onClick,
  size = "md",
}: ModeTabProps) {
  // Size-based classes
  const sizeClasses = {
    sm: {
      tab: "px-2 py-1 text-xs gap-1",
      icon: "h-3 w-3",
    },
    md: {
      tab: "px-3 py-1.5 text-sm gap-1.5",
      icon: "h-4 w-4",
    },
    lg: {
      tab: "px-4 py-2 text-base gap-2",
      icon: "h-5 w-5",
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${mode}`}
            id={`tab-${mode}`}
            onClick={onClick}
            className={cn(
              // Base styles
              "flex items-center justify-center rounded-md font-medium transition-all",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              currentSize.tab,
              // Active state
              isActive && ["bg-background shadow-sm", color],
              // Inactive state
              !isActive && [
                "text-muted-foreground hover:text-foreground hover:bg-muted/80",
              ]
            )}
          >
            <Icon
              className={cn(currentSize.icon, "shrink-0", isActive && color)}
            />
            {/* Show full label on medium+ screens, short label on small */}
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel}</span>

            {/* Visual indicator dot for active state */}
            {isActive && (
              <span
                className={cn(
                  "absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                  mode === "content" && "bg-blue-500",
                  mode === "header" && "bg-emerald-500",
                  mode === "footer" && "bg-purple-500"
                )}
                aria-hidden="true"
              />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium">{label}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
