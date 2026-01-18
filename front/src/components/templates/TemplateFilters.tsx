"use client";

import { useMemo } from "react";
import { Search, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TemplateFilterParams } from "@/lib/api/endpoints/templates";

export interface TemplateFiltersProps {
  /** Current filter values */
  filters: TemplateFilterParams;
  /** Callback when filters change */
  onFiltersChange: (filters: TemplateFilterParams) => void;
  /** Available categories */
  categories?: string[];
  /** Available tags */
  tags?: string[];
  /** Whether categories are loading */
  categoriesLoading?: boolean;
  /** Whether tags are loading */
  tagsLoading?: boolean;
  /** Total count of templates matching current filters */
  totalCount?: number;
  /** Additional class names */
  className?: string;
}

/**
 * Template filters component with search, category, and tag filtering
 */
export function TemplateFilters({
  filters,
  onFiltersChange,
  categories = [],
  tags = [],
  categoriesLoading = false,
  tagsLoading = false,
  totalCount,
  className,
}: TemplateFiltersProps) {
  // Parse selected tags from comma-separated string
  const selectedTags = useMemo(() => {
    if (!filters.tags) return [];
    return filters.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [filters.tags]);

  // Check if any filters are active
  const hasActiveFilters = !!(
    filters.search ||
    filters.category ||
    filters.tags ||
    filters.isActive !== undefined
  );

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value || undefined,
      page: 1, // Reset to first page on search
    });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({
      ...filters,
      category: value === "all" ? undefined : value,
      page: 1,
    });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      isActive: value === "all" ? undefined : value === "active" ? true : false,
      page: 1,
    });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = new Set(selectedTags);
    if (currentTags.has(tag)) {
      currentTags.delete(tag);
    } else {
      currentTags.add(tag);
    }
    const newTags = Array.from(currentTags).join(",");
    onFiltersChange({
      ...filters,
      tags: newTags || undefined,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortDescending: filters.sortDescending,
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Search templates..."
            value={filters.search || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filter */}
        <Select
          value={filters.category || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-full sm:w-45">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoriesLoading ? (
              <SelectItem value="__loading__" disabled>
                Loading...
              </SelectItem>
            ) : categories.length > 0 ? (
              categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="__empty__" disabled>
                No categories
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={
            filters.isActive === undefined
              ? "all"
              : filters.isActive
                ? "active"
                : "inactive"
          }
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-full sm:w-35">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tags filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground text-sm">Tags:</span>
          {tagsLoading ? (
            <span className="text-muted-foreground text-sm">Loading...</span>
          ) : (
            tags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="hover:bg-primary/80 cursor-pointer transition-colors"
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </Badge>
            ))
          )}
        </div>
      )}

      {/* Active filters and results count */}
      {(hasActiveFilters || totalCount !== undefined) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {totalCount !== undefined && (
              <span className="text-muted-foreground text-sm">
                {totalCount} {totalCount === 1 ? "template" : "templates"} found
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs"
            >
              <X className="mr-1.5 h-3 w-3" />
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
