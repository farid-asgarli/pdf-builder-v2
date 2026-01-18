/**
 * ComponentPalette
 * Main sidebar component list with search functionality and categorized components
 * Provides draggable components for the canvas builder
 * Supports filtering based on editing mode (header/footer compatibility)
 */

"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  X,
  GripVertical,
  PanelTop,
  PanelBottom,
  Eye,
  EyeOff,
} from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ComponentCategory } from "./ComponentCategory";
import { ComponentCard } from "./ComponentCard";
import { cn } from "@/lib/utils";
import type {
  ComponentType,
  ComponentCategory as CategoryType,
  ComponentMetadata,
} from "@/types/component";
import type { EditingMode } from "@/types/canvas";

/**
 * Filter mode for header/footer incompatible components
 * - "show": Show all components with warnings for incompatible ones
 * - "hide": Hide incompatible components completely
 */
export type HeaderFooterFilterMode = "show" | "hide";
import {
  COMPONENT_REGISTRY,
  getComponentsByCategory,
} from "@/lib/constants/components";
import { getSortedCategories } from "@/lib/constants/categories";
import { useEditingMode } from "@/store/canvas-store";

export interface ComponentPaletteProps {
  /** Optional class name */
  className?: string;
  /** Callback when a component starts being dragged */
  onDragStart?: (
    componentType: ComponentType,
    metadata: ComponentMetadata
  ) => void;
  /** Callback when a component is dropped */
  onDragEnd?: (
    componentType: ComponentType | null,
    isIncompatible?: boolean
  ) => void;
  /** Default expanded categories */
  defaultExpandedCategories?: CategoryType[];
  /** Whether the palette is collapsed to just icons */
  collapsed?: boolean;
  /** Override editing mode (if not using store) */
  editingModeOverride?: EditingMode;
  /**
   * Default filter mode for header/footer incompatible components
   * "show" = Show all with warnings, "hide" = Hide incompatible components
   * @default "hide"
   */
  defaultFilterMode?: HeaderFooterFilterMode;
}

/**
 * Component Palette - Sidebar containing all available components
 * Features:
 * - Search functionality to filter components by name/description
 * - Collapsible category sections
 * - Draggable component cards using @dnd-kit
 * - Tooltips with component descriptions
 * - Header/footer mode filtering with warnings
 */
export function ComponentPalette({
  className,
  defaultExpandedCategories = ["container", "content"],
  collapsed = false,
  editingModeOverride,
  defaultFilterMode = "hide",
}: ComponentPaletteProps) {
  // Get editing mode from store or use override
  const storeEditingMode = useEditingMode();
  const editingMode = editingModeOverride ?? storeEditingMode;
  const isInHeaderFooterMode =
    editingMode === "header" || editingMode === "footer";

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Filter mode for header/footer incompatible components
  const [filterMode, setFilterMode] =
    useState<HeaderFooterFilterMode>(defaultFilterMode);

  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    defaultExpandedCategories
  );

  // Get sorted category metadata
  const sortedCategories = useMemo(() => getSortedCategories(), []);

  // Filter components based on search query and header/footer mode
  const filteredComponentsByCategory = useMemo(() => {
    const result: Record<CategoryType, ComponentMetadata[]> = {} as Record<
      CategoryType,
      ComponentMetadata[]
    >;

    const normalizedQuery = searchQuery.toLowerCase().trim();
    const shouldFilterIncompatible =
      isInHeaderFooterMode && filterMode === "hide";

    for (const category of sortedCategories) {
      let categoryComponents = getComponentsByCategory(category.id);

      // Filter out incompatible components in header/footer mode when filterMode is "hide"
      if (shouldFilterIncompatible) {
        categoryComponents = categoryComponents.filter(
          (component) => component.headerFooterCompatible !== false
        );
      }

      // Apply search filter
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
  }, [searchQuery, sortedCategories, isInHeaderFooterMode, filterMode]);

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

  // Handle accordion value change
  const handleAccordionChange = useCallback((value: string[]) => {
    setExpandedCategories(value);
  }, []);

  // Toggle filter mode for header/footer incompatible components
  const toggleFilterMode = useCallback(() => {
    setFilterMode((prev) => (prev === "hide" ? "show" : "hide"));
  }, []);

  // Render header/footer mode info banner with filter toggle
  const renderModeInfoBanner = () => {
    if (!isInHeaderFooterMode) return null;

    const modeLabel = editingMode === "header" ? "Header" : "Footer";
    const ModeIcon = editingMode === "header" ? PanelTop : PanelBottom;
    const isHiding = filterMode === "hide";

    return (
      <div className="mx-2 mt-2 space-y-2">
        {/* Mode info */}
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-950/30">
          <ModeIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Editing <strong>{modeLabel}</strong> - Components marked with ⭐ are
            recommended.
            {filterMode === "show" && " Components with ⚠ may cause issues."}
          </p>
        </div>

        {/* Filter toggle */}
        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800/50">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {isHiding ? "Showing compatible only" : "Showing all components"}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={toggleFilterMode}
                aria-label={
                  isHiding
                    ? "Show all components"
                    : "Hide incompatible components"
                }
              >
                {isHiding ? (
                  <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-gray-500" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">
                {isHiding
                  ? "Show all components (with warnings)"
                  : "Hide incompatible components"}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  };

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
          <h2 className="text-foreground text-sm font-semibold">Components</h2>
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

        {/* Header/Footer Mode Info Banner */}
        {renderModeInfoBanner()}

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
    </TooltipProvider>
  );
}

export default ComponentPalette;
