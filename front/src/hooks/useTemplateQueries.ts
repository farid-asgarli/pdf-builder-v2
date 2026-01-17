/**
 * Template Query Hooks
 *
 * React Query hooks for template data fetching with:
 * - Automatic caching and background refetching
 * - Type-safe query keys
 * - Proper loading and error states
 * - Query invalidation helpers
 */
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { templateApi, type TemplateFilterParams } from "@/lib/api/endpoints/templates";
import type {
  TemplateDto,
  TemplateSummaryDto,
  TemplateListResponse,
  TemplateResponse,
} from "@/types/api";

// ============================================================================
// QUERY KEY FACTORY
// Centralized query key management for template queries
// ============================================================================

export const templateKeys = {
  /** Base key for all template queries */
  all: ["templates"] as const,

  /** Key for template list queries with optional filters */
  lists: () => [...templateKeys.all, "list"] as const,

  /** Key for a specific list query with filters */
  list: (filters?: TemplateFilterParams) =>
    [...templateKeys.lists(), filters ?? {}] as const,

  /** Key for template detail queries */
  details: () => [...templateKeys.all, "detail"] as const,

  /** Key for a specific template detail query */
  detail: (id: string) => [...templateKeys.details(), id] as const,

  /** Key for template categories */
  categories: () => [...templateKeys.all, "categories"] as const,

  /** Key for template tags */
  tags: () => [...templateKeys.all, "tags"] as const,
} as const;

// ============================================================================
// QUERY OPTIONS TYPES
// ============================================================================

export interface UseTemplatesOptions {
  /** Filter parameters for the template list */
  filters?: TemplateFilterParams;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 60000) */
  staleTime?: number;
  /** Keep previous data while fetching new data */
  placeholderData?: "keepPrevious";
}

export interface UseTemplateByIdOptions {
  /** Whether the query is enabled (default: true when id is provided) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 60000) */
  staleTime?: number;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch a paginated list of templates with optional filtering
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useTemplates({
 *   filters: { search: "invoice", category: "billing" }
 * });
 *
 * // Access templates
 * data?.templates.map(t => t.name)
 * ```
 */
export function useTemplates(options: UseTemplatesOptions = {}) {
  const { filters, enabled = true, staleTime = 60 * 1000, placeholderData } = options;

  return useQuery({
    queryKey: templateKeys.list(filters),
    queryFn: async (): Promise<TemplateListResponse> => {
      const response = await templateApi.getAll(filters);
      return response;
    },
    enabled,
    staleTime,
    placeholderData: placeholderData === "keepPrevious" ? (prev) => prev : undefined,
  });
}

/**
 * Hook to fetch a single template by ID with full layout data
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useTemplateById(templateId);
 *
 * if (data?.template) {
 *   // Access full template with layout
 *   console.log(data.template.layout);
 * }
 * ```
 */
export function useTemplateById(id: string | null | undefined, options: UseTemplateByIdOptions = {}) {
  const { enabled = true, staleTime = 60 * 1000 } = options;

  return useQuery({
    queryKey: templateKeys.detail(id ?? ""),
    queryFn: async (): Promise<TemplateResponse> => {
      if (!id) {
        throw new Error("Template ID is required");
      }
      const response = await templateApi.getById(id);
      return response;
    },
    enabled: enabled && !!id,
    staleTime,
  });
}

/**
 * Hook to fetch all template categories
 *
 * @example
 * ```tsx
 * const { data: categories } = useTemplateCategories();
 *
 * // Use in a dropdown
 * categories?.map(cat => <Option key={cat}>{cat}</Option>)
 * ```
 */
export function useTemplateCategories(enabled = true) {
  return useQuery({
    queryKey: templateKeys.categories(),
    queryFn: async (): Promise<string[]> => {
      const response = await templateApi.getCategories();
      return response;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Categories change less frequently
  });
}

/**
 * Hook to fetch all template tags
 *
 * @example
 * ```tsx
 * const { data: tags } = useTemplateTags();
 *
 * // Use for tag filtering
 * tags?.map(tag => <Tag key={tag}>{tag}</Tag>)
 * ```
 */
export function useTemplateTags(enabled = true) {
  return useQuery({
    queryKey: templateKeys.tags(),
    queryFn: async (): Promise<string[]> => {
      const response = await templateApi.getTags();
      return response;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // Tags change less frequently
  });
}

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

/**
 * Hook to get prefetch functions for template data
 *
 * @example
 * ```tsx
 * const { prefetchTemplate, prefetchTemplates } = useTemplatePrefetch();
 *
 * // Prefetch on hover
 * <Link onMouseEnter={() => prefetchTemplate(id)}>
 *   View Template
 * </Link>
 * ```
 */
export function useTemplatePrefetch() {
  const queryClient = useQueryClient();

  const prefetchTemplate = async (id: string) => {
    await queryClient.prefetchQuery({
      queryKey: templateKeys.detail(id),
      queryFn: () => templateApi.getById(id),
      staleTime: 60 * 1000,
    });
  };

  const prefetchTemplates = async (filters?: TemplateFilterParams) => {
    await queryClient.prefetchQuery({
      queryKey: templateKeys.list(filters),
      queryFn: () => templateApi.getAll(filters),
      staleTime: 60 * 1000,
    });
  };

  return {
    prefetchTemplate,
    prefetchTemplates,
  };
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Hook to access template data from the cache
 *
 * @example
 * ```tsx
 * const { getTemplateFromCache, setTemplateInCache } = useTemplateCache();
 *
 * // Optimistically update cache
 * setTemplateInCache(updatedTemplate);
 * ```
 */
export function useTemplateCache() {
  const queryClient = useQueryClient();

  /**
   * Get a template from the cache by ID
   */
  const getTemplateFromCache = (id: string): TemplateDto | undefined => {
    const response = queryClient.getQueryData<TemplateResponse>(
      templateKeys.detail(id)
    );
    return response?.template;
  };

  /**
   * Get templates list from the cache
   */
  const getTemplatesFromCache = (
    filters?: TemplateFilterParams
  ): TemplateSummaryDto[] | undefined => {
    const response = queryClient.getQueryData<TemplateListResponse>(
      templateKeys.list(filters)
    );
    return response?.templates;
  };

  /**
   * Set a template in the cache
   */
  const setTemplateInCache = (template: TemplateDto) => {
    queryClient.setQueryData<TemplateResponse>(
      templateKeys.detail(template.id),
      (old) => ({
        ...old,
        success: true,
        template,
      })
    );
  };

  /**
   * Update a template in the list cache
   */
  const updateTemplateInListCache = (
    templateId: string,
    updater: (template: TemplateSummaryDto) => TemplateSummaryDto
  ) => {
    // Get all list queries from cache
    const queries = queryClient.getQueriesData<TemplateListResponse>({
      queryKey: templateKeys.lists(),
    });

    // Update each list that contains this template
    queries.forEach(([queryKey, data]) => {
      if (data?.templates) {
        queryClient.setQueryData<TemplateListResponse>(queryKey, {
          ...data,
          templates: data.templates.map((t) =>
            t.id === templateId ? updater(t) : t
          ),
        });
      }
    });
  };

  /**
   * Remove a template from list caches
   */
  const removeTemplateFromListCache = (templateId: string) => {
    const queries = queryClient.getQueriesData<TemplateListResponse>({
      queryKey: templateKeys.lists(),
    });

    queries.forEach(([queryKey, data]) => {
      if (data?.templates) {
        queryClient.setQueryData<TemplateListResponse>(queryKey, {
          ...data,
          templates: data.templates.filter((t) => t.id !== templateId),
          totalCount: data.totalCount - 1,
        });
      }
    });
  };

  /**
   * Add a template to the beginning of list caches
   */
  const addTemplateToListCache = (template: TemplateSummaryDto) => {
    const queries = queryClient.getQueriesData<TemplateListResponse>({
      queryKey: templateKeys.lists(),
    });

    queries.forEach(([queryKey, data]) => {
      if (data?.templates) {
        queryClient.setQueryData<TemplateListResponse>(queryKey, {
          ...data,
          templates: [template, ...data.templates],
          totalCount: data.totalCount + 1,
        });
      }
    });
  };

  return {
    getTemplateFromCache,
    getTemplatesFromCache,
    setTemplateInCache,
    updateTemplateInListCache,
    removeTemplateFromListCache,
    addTemplateToListCache,
  };
}

// ============================================================================
// INVALIDATION UTILITIES
// ============================================================================

/**
 * Hook to get invalidation functions for template queries
 *
 * @example
 * ```tsx
 * const { invalidateTemplates, invalidateTemplate } = useTemplateInvalidation();
 *
 * // After a successful mutation
 * await invalidateTemplates();
 * ```
 */
export function useTemplateInvalidation() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all template list queries
   */
  const invalidateTemplates = async () => {
    await queryClient.invalidateQueries({
      queryKey: templateKeys.lists(),
    });
  };

  /**
   * Invalidate a specific template detail query
   */
  const invalidateTemplate = async (id: string) => {
    await queryClient.invalidateQueries({
      queryKey: templateKeys.detail(id),
    });
  };

  /**
   * Invalidate all template-related queries
   */
  const invalidateAll = async () => {
    await queryClient.invalidateQueries({
      queryKey: templateKeys.all,
    });
  };

  /**
   * Invalidate categories and tags
   */
  const invalidateMetadata = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: templateKeys.categories() }),
      queryClient.invalidateQueries({ queryKey: templateKeys.tags() }),
    ]);
  };

  /**
   * Remove a template from cache entirely
   */
  const removeTemplate = (id: string) => {
    queryClient.removeQueries({
      queryKey: templateKeys.detail(id),
    });
  };

  return {
    invalidateTemplates,
    invalidateTemplate,
    invalidateAll,
    invalidateMetadata,
    removeTemplate,
  };
}

const templateQueryHooks = {
  useTemplates,
  useTemplateById,
  useTemplateCategories,
  useTemplateTags,
  useTemplatePrefetch,
  useTemplateCache,
  useTemplateInvalidation,
  templateKeys,
};

export default templateQueryHooks;
