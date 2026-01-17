/**
 * ComponentPalette
 * Main sidebar component list with search functionality and categorized components
 * Provides draggable components for the canvas builder
 */

"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import { Search, X, GripVertical } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ComponentCategory } from "./ComponentCategory";
import { ComponentCard, ComponentCardDragOverlay } from "./ComponentCard";
import { cn } from "@/lib/utils";
import type {
  ComponentType,
  ComponentCategory as CategoryType,
  ComponentMetadata,
} from "@/types/component";
import {
  COMPONENT_REGISTRY,
  getComponentsByCategory,
} from "@/lib/constants/components";
import { getSortedCategories } from "@/lib/constants/categories";

export interface ComponentPaletteProps {
  /** Optional class name */
  className?: string;
  /** Callback when a component starts being dragged */
  onDragStart?: (
    componentType: ComponentType,
    metadata: ComponentMetadata
  ) => void;
  /** Callback when a component is dropped */
  onDragEnd?: (componentType: ComponentType | null) => void;
  /** Default expanded categories */
  defaultExpandedCategories?: CategoryType[];
  /** Whether the palette is collapsed to just icons */
  collapsed?: boolean;
}

/**
 * Component Palette - Sidebar containing all available components
 * Features:
 * - Search functionality to filter components by name/description
 * - Collapsible category sections
 * - Draggable component cards using @dnd-kit
 * - Tooltips with component descriptions
 */
export function ComponentPalette({
  className,
  onDragStart,
  onDragEnd,
  defaultExpandedCategories = ["container", "content"],
  collapsed = false,
}: ComponentPaletteProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Track which component is being dragged
  const [activeMetadata, setActiveMetadata] =
    useState<ComponentMetadata | null>(null);

  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    defaultExpandedCategories
  );

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    })
  );

  // Get sorted category metadata
  const sortedCategories = useMemo(() => getSortedCategories(), []);

  // Filter components based on search query
  const filteredComponentsByCategory = useMemo(() => {
    const result: Record<CategoryType, ComponentMetadata[]> = {} as Record<
      CategoryType,
      ComponentMetadata[]
    >;

    const normalizedQuery = searchQuery.toLowerCase().trim();

    for (const category of sortedCategories) {
      const categoryComponents = getComponentsByCategory(category.id);

      if (!normalizedQuery) {
        result[category.id] = categoryComponents;
      } else {
        result[category.id] = categoryComponents.filter((component) => {
          return (
            component.name.toLowerCase().includes(normalizedQuery) ||
            component.description.toLowerCase().includes(normalizedQuery) ||
            component.id.toLowerCase().includes(normalizedQuery)
          );
        });
      }
    }

    return result;
  }, [searchQuery, sortedCategories]);

  // Count total filtered components
  const totalFilteredCount = useMemo(() => {
    return Object.values(filteredComponentsByCategory).reduce(
      (sum, components) => sum + components.length,
      0
    );
  }, [filteredComponentsByCategory]);

  // Handle search input change
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);

      // Expand all categories when searching
      if (event.target.value.trim()) {
        setExpandedCategories(sortedCategories.map((c) => c.id));
      }
    },
    [sortedCategories]
  );

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setExpandedCategories(defaultExpandedCategories);
  }, [defaultExpandedCategories]);

  // Handle drag start
  const handleDragStart = useCallback(
    (event: {
      active: {
        data: {
          current?: {
            metadata?: ComponentMetadata;
            componentType?: ComponentType;
          };
        };
      };
    }) => {
      const { metadata, componentType } = event.active.data.current || {};
      if (metadata && componentType) {
        setActiveMetadata(metadata);
        onDragStart?.(componentType, metadata);
      }
    },
    [onDragStart]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: {
      active: { data: { current?: { componentType?: ComponentType } } };
    }) => {
      const { componentType } = event.active.data.current || {};
      setActiveMetadata(null);
      onDragEnd?.(componentType || null);
    },
    [onDragEnd]
  );

  // Handle accordion value change
  const handleAccordionChange = useCallback((value: string[]) => {
    setExpandedCategories(value);
  }, []);

  // Render search results summary
  const renderSearchSummary = () => {
    if (!searchQuery.trim()) return null;

    return (
      <div className="text-muted-foreground border-border/50 border-b px-3 py-2 text-xs">
        {totalFilteredCount === 0 ? (
          <span>No components found for &ldquo;{searchQuery}&rdquo;</span>
        ) : (
          <span>
            Found {totalFilteredCount} component
            {totalFilteredCount !== 1 ? "s" : ""} matching &ldquo;{searchQuery}
            &rdquo;
          </span>
        )}
      </div>
    );
  };

  if (collapsed) {
    return (
      <TooltipProvider>
        <div
          className={cn(
            "flex flex-col items-center gap-1 py-2",
            "bg-background border-border border-r",
            className
          )}
        >
          <div className="text-muted-foreground p-1.5">
            <GripVertical className="h-4 w-4" />
          </div>
          {/* Collapsed view shows only icons for quick access */}
          {Object.values(COMPONENT_REGISTRY)
            .filter((c) => c.priorityTier === 1)
            .slice(0, 10)
            .map((component) => (
              <ComponentCard
                key={component.id}
                metadata={component}
                className="h-8 w-8 justify-center p-0"
              />
            ))}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className={cn(
            "flex h-full flex-col",
            "bg-background border-border border-r",
            "w-64",
            className
          )}
        >
          {/* Header */}
          <div className="border-border flex items-center justify-between border-b px-3 py-2">
            <h2 className="text-foreground text-sm font-semibold">
              Components
            </h2>
            <span className="text-muted-foreground text-xs">
              {Object.keys(COMPONENT_REGISTRY).length}
            </span>
          </div>

          {/* Search Input */}
          <div className="border-border border-b p-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search components..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="h-8 pr-8 pl-9 text-sm"
                aria-label="Search components"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Search Summary */}
          {renderSearchSummary()}

          {/* Component Categories */}
          <ScrollArea className="flex-1">
            <Accordion
              type="multiple"
              value={expandedCategories}
              onValueChange={handleAccordionChange}
              className="w-full"
            >
              {sortedCategories.map((category) => {
                const components = filteredComponentsByCategory[category.id];

                // Skip empty categories when searching
                if (searchQuery.trim() && components.length === 0) {
                  return null;
                }

                return (
                  <ComponentCategory
                    key={category.id}
                    category={category.id}
                    components={components}
                  />
                );
              })}
            </Accordion>

            {/* Empty state when no results */}
            {searchQuery.trim() && totalFilteredCount === 0 && (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <Search className="text-muted-foreground/50 mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-sm">
                  No components match your search
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleClearSearch}
                  className="mt-1"
                >
                  Clear search
                </Button>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Drag Overlay - Shows the component being dragged */}
        <DragOverlay>
          {activeMetadata && (
            <ComponentCardDragOverlay metadata={activeMetadata} />
          )}
        </DragOverlay>
      </DndContext>
    </TooltipProvider>
  );
}

export default ComponentPalette;
