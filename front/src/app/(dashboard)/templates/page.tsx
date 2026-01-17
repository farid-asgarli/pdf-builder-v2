"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Upload, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common";
import { TemplateFilters, TemplateList } from "@/components/templates";
import {
  useTemplates,
  useTemplateCategories,
  useTemplateTags,
} from "@/hooks/useTemplateQueries";
import {
  useDeleteTemplate,
  useDuplicateTemplate,
  useExportTemplate,
} from "@/hooks/useTemplateMutations";
import { useDebounce } from "@/hooks/useDebounce";
import type { TemplateFilterParams } from "@/lib/api/endpoints/templates";

const DEFAULT_PAGE_SIZE = 12;

export default function TemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from URL search params
  const [filters, setFilters] = useState<TemplateFilterParams>(() => ({
    search: searchParams.get("search") || undefined,
    category: searchParams.get("category") || undefined,
    tags: searchParams.get("tags") || undefined,
    isActive:
      searchParams.get("status") === "active"
        ? true
        : searchParams.get("status") === "inactive"
          ? false
          : undefined,
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: searchParams.get("sortBy") || "updatedAt",
    sortDescending: searchParams.get("sortOrder") !== "asc",
  }));

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(filters.search, 300);

  // Build query filters with debounced search
  const queryFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [filters, debouncedSearch]
  );

  // Fetch templates with filters
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useTemplates({
    filters: queryFilters,
    placeholderData: "keepPrevious",
  });

  // Fetch categories and tags for filters
  const { data: categories, isLoading: isLoadingCategories } =
    useTemplateCategories();
  const { data: tags, isLoading: isLoadingTags } = useTemplateTags();

  // Mutations
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate({
    onSuccess: () => {
      toast.success("Template deleted");
    },
  });

  const { mutate: duplicateTemplate, isPending: isDuplicating } =
    useDuplicateTemplate({
      onSuccess: (template) => {
        toast.success("Template duplicated", {
          description: `"${template.name}" has been created.`,
        });
      },
    });

  const { mutate: exportTemplate } = useExportTemplate();

  // Update URL when filters change
  const updateUrl = useCallback(
    (newFilters: TemplateFilterParams) => {
      const params = new URLSearchParams();
      if (newFilters.search) params.set("search", newFilters.search);
      if (newFilters.category) params.set("category", newFilters.category);
      if (newFilters.tags) params.set("tags", newFilters.tags);
      if (newFilters.isActive !== undefined) {
        params.set("status", newFilters.isActive ? "active" : "inactive");
      }
      if (newFilters.page && newFilters.page > 1) {
        params.set("page", String(newFilters.page));
      }
      if (newFilters.sortBy && newFilters.sortBy !== "updatedAt") {
        params.set("sortBy", newFilters.sortBy);
      }
      if (newFilters.sortDescending === false) {
        params.set("sortOrder", "asc");
      }

      const queryString = params.toString();
      const url = queryString ? `/templates?${queryString}` : "/templates";
      router.push(url, { scroll: false });
    },
    [router]
  );

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: TemplateFilterParams) => {
      setFilters(newFilters);
      updateUrl(newFilters);
    },
    [updateUrl]
  );

  // Handle page changes
  const handlePageChange = useCallback(
    (page: number) => {
      const newFilters = { ...filters, page };
      setFilters(newFilters);
      updateUrl(newFilters);
    },
    [filters, updateUrl]
  );

  // Handle template actions
  const handleDuplicate = useCallback(
    (id: string) => {
      duplicateTemplate({ id });
    },
    [duplicateTemplate]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteTemplate(id);
    },
    [deleteTemplate]
  );

  const handleExport = useCallback(
    (id: string) => {
      exportTemplate({ id });
    },
    [exportTemplate]
  );

  // Check if this is the first load with no templates at all (not just filtered)
  const isEmptyWorkspace =
    !isLoadingTemplates &&
    templatesData?.totalCount === 0 &&
    !filters.search &&
    !filters.category &&
    !filters.tags &&
    filters.isActive === undefined;

  return (
    <div className="container py-8">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Manage your PDF templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/templates/import">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/builder/new">
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Link>
          </Button>
        </div>
      </div>

      {/* Show empty workspace state if no templates exist */}
      {isEmptyWorkspace ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No templates yet"
          description="Create your first PDF template to get started with the visual builder."
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/templates/import">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Template
                </Link>
              </Button>
              <Button asChild>
                <Link href="/builder/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* Filters */}
          <TemplateFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            categories={categories}
            tags={tags}
            categoriesLoading={isLoadingCategories}
            tagsLoading={isLoadingTags}
            totalCount={templatesData?.totalCount}
            className="mb-6"
          />

          {/* Template list */}
          <TemplateList
            templates={templatesData?.templates}
            isLoading={isLoadingTemplates}
            error={templatesError?.message}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onExport={handleExport}
            actionsDisabled={isDeleting || isDuplicating}
            pagination={
              templatesData
                ? {
                    page: templatesData.page,
                    pageSize: templatesData.pageSize,
                    totalCount: templatesData.totalCount,
                    totalPages: templatesData.totalPages,
                    hasNextPage: templatesData.hasNextPage,
                    hasPreviousPage: templatesData.hasPreviousPage,
                  }
                : undefined
            }
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
