"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common";
import { TemplateCard, TemplateCardSkeleton } from "./TemplateCard";
import { TemplatePagination } from "./TemplatePagination";
import type { TemplateSummaryDto } from "@/types/api";
import Link from "next/link";
import { Plus } from "lucide-react";

export interface TemplateListProps {
  /** List of templates to display */
  templates?: TemplateSummaryDto[];
  /** Whether the list is loading */
  isLoading?: boolean;
  /** Error message if loading failed */
  error?: string | null;
  /** Callback when duplicate is clicked */
  onDuplicate?: (id: string) => void;
  /** Callback when delete is clicked */
  onDelete?: (id: string) => void;
  /** Callback when export is clicked */
  onExport?: (id: string) => void;
  /** Whether card actions are disabled */
  actionsDisabled?: boolean;
  /** Pagination info */
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Number of skeleton cards to show while loading */
  skeletonCount?: number;
  /** Grid layout class (default: responsive grid) */
  gridClassName?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Template list component that renders a grid of template cards
 * with loading, empty, and error states
 */
export function TemplateList({
  templates,
  isLoading = false,
  error = null,
  onDuplicate,
  onDelete,
  onExport,
  actionsDisabled = false,
  pagination,
  onPageChange,
  skeletonCount = 6,
  gridClassName,
  className,
}: TemplateListProps) {
  // Error state
  if (error) {
    return (
      <div className={className}>
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Failed to load templates"
          description={error}
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
            gridClassName
          )}
        >
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!templates || templates.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No templates found"
          description="No templates match your current filters. Try adjusting your search or create a new template."
          action={
            <Button asChild>
              <Link href="/builder/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Template grid
  return (
    <div className={cn("space-y-6", className)}>
      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
          gridClassName
        )}
      >
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onExport={onExport}
            actionsDisabled={actionsDisabled}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && onPageChange && (
        <TemplatePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          pageSize={pagination.pageSize}
          hasNextPage={pagination.hasNextPage}
          hasPreviousPage={pagination.hasPreviousPage}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
