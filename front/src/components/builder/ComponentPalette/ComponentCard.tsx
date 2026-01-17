/**
 * ComponentCard
 * Draggable component card for the component palette
 * Uses @dnd-kit for drag and drop functionality
 */

"use client";

import React, { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ComponentMetadata } from "@/types/component";
import { COMPONENT_ICONS } from "@/lib/constants/icons";
import { getCategoryMetadata } from "@/lib/constants/categories";

export interface ComponentCardProps {
  /** Component metadata */
  metadata: ComponentMetadata;
  /** Optional class name */
  className?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * Draggable component card displayed in the component palette
 * Shows icon, name, and provides drag functionality
 */
export function ComponentCard({
  metadata,
  className,
  disabled = false,
}: ComponentCardProps) {
  const categoryMeta = useMemo(
    () => getCategoryMetadata(metadata.category),
    [metadata.category]
  );

  const IconComponent = COMPONENT_ICONS[metadata.id];

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${metadata.id}`,
      data: {
        type: "palette-component",
        componentType: metadata.id,
        metadata,
      },
      disabled,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={cn(
            "flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 select-none",
            "text-foreground text-sm",
            "transition-colors duration-150",
            "hover:bg-accent hover:text-accent-foreground",
            "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
            "active:cursor-grabbing",
            isDragging && "ring-ring z-50 shadow-lg ring-2",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`Drag ${metadata.name} component`}
          aria-disabled={disabled}
        >
          <IconComponent
            className="h-4 w-4 shrink-0"
            style={{ color: categoryMeta.color }}
            aria-hidden="true"
          />
          <span className="truncate text-xs font-medium">{metadata.name}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-62.5">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{metadata.name}</p>
          <p className="text-muted-foreground text-xs">
            {metadata.description}
          </p>
          {metadata.allowsChildren && (
            <p className="text-primary text-xs">
              {metadata.isWrapper
                ? "Wrapper (single child)"
                : "Container (multiple children)"}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Drag overlay component for showing component being dragged
 */
export function ComponentCardDragOverlay({
  metadata,
}: {
  metadata: ComponentMetadata;
}) {
  const categoryMeta = getCategoryMetadata(metadata.category);
  const IconComponent = COMPONENT_ICONS[metadata.id];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5",
        "text-foreground bg-background text-sm",
        "border-border border shadow-xl",
        "ring-primary ring-2",
        "cursor-grabbing"
      )}
    >
      <IconComponent
        className="h-4 w-4 shrink-0"
        style={{ color: categoryMeta.color }}
        aria-hidden="true"
      />
      <span className="truncate text-xs font-medium">{metadata.name}</span>
    </div>
  );
}

export default ComponentCard;
