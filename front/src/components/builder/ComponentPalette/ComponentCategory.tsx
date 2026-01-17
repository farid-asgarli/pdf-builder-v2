/**
 * ComponentCategory
 * Collapsible category section containing component cards
 * Uses Radix UI Accordion for expand/collapse functionality
 */

"use client";

import React, { useMemo } from "react";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ComponentCard } from "./ComponentCard";
import { cn } from "@/lib/utils";
import type {
  ComponentCategory as ComponentCategoryType,
  ComponentMetadata,
} from "@/types/component";
import {
  getCategoryMetadata,
  CATEGORY_ICON_MAP,
} from "@/lib/constants/categories";

export interface ComponentCategoryProps {
  /** Category identifier */
  category: ComponentCategoryType;
  /** Components in this category */
  components: ComponentMetadata[];
  /** Optional class name */
  className?: string;
}

/**
 * Collapsible category section in the component palette
 * Displays category header with icon and expandable list of components
 */
export function ComponentCategory({
  category,
  components,
  className,
}: ComponentCategoryProps) {
  const categoryMeta = useMemo(() => getCategoryMetadata(category), [category]);

  // Get the icon component from pre-defined map
  const IconComponent = CATEGORY_ICON_MAP[category];

  if (components.length === 0) {
    return null;
  }

  return (
    <AccordionItem
      value={category}
      className={cn("border-border/50 border-b", className)}
    >
      <AccordionTrigger className="group px-3 py-2.5 hover:no-underline">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ backgroundColor: `${categoryMeta.color}15` }}
          >
            <IconComponent
              className="h-3.5 w-3.5"
              style={{ color: categoryMeta.color }}
              aria-hidden="true"
            />
          </div>
          <span className="text-foreground text-sm font-medium">
            {categoryMeta.label}
          </span>
          <span className="text-muted-foreground mr-2 ml-auto text-xs">
            {components.length}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-2">
        <div className="space-y-0.5">
          {components.map((component) => (
            <ComponentCard key={component.id} metadata={component} />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default ComponentCategory;
