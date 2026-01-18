/**
 * useTemplateLoader Hook
 *
 * Loads templates from the API and converts them to frontend models with:
 * - Automatic testData extraction from metadata
 * - Template store synchronization
 * - Loading and error states
 */
"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useTemplateById } from "./useTemplateQueries";
import { useTemplateStore } from "@/store/template-store";
import { fromTemplateDto } from "@/types/template";
import type { Template } from "@/types/template";

// ============================================================================
// TYPES
// ============================================================================

export interface UseTemplateLoaderOptions {
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
  /** Callback when template is loaded successfully */
  onSuccess?: (template: Template) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether to auto-sync with template store (default: true) */
  autoSync?: boolean;
}

export interface UseTemplateLoaderReturn {
  /** The loaded and converted template */
  template: Template | null;
  /** Whether the template is loading */
  isLoading: boolean;
  /** Whether the template has been loaded */
  isLoaded: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Refresh the template from the API */
  refresh: () => Promise<void>;
  /** Clear the template from the store */
  clear: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook to load a template from the API and sync it with the template store
 *
 * Features:
 * - Loads template by ID using React Query
 * - Converts TemplateDto to frontend Template model
 * - Extracts testData from metadata.testData
 * - Syncs with template store for global access
 *
 * @param templateId - The template ID to load (null/undefined for new templates)
 * @param options - Configuration options
 * @returns Template state and control functions
 *
 * @example
 * ```tsx
 * function BuilderPage({ templateId }: { templateId: string }) {
 *   const {
 *     template,
 *     isLoading,
 *     error,
 *   } = useTemplateLoader(templateId, {
 *     onSuccess: (template) => {
 *       console.log('Template loaded:', template.name);
 *       console.log('Test data:', template.testData);
 *     },
 *   });
 *
 *   if (isLoading) return <LoadingSkeleton />;
 *   if (error) return <ErrorMessage message={error} />;
 *
 *   return <TemplateBuilder template={template} />;
 * }
 * ```
 */
export function useTemplateLoader(
  templateId: string | null | undefined,
  options: UseTemplateLoaderOptions = {}
): UseTemplateLoaderReturn {
  const { enabled = true, onSuccess, onError, autoSync = true } = options;

  // Query for template data
  const {
    data: response,
    isLoading,
    error: queryError,
    refetch,
  } = useTemplateById(templateId, {
    enabled: enabled && !!templateId && templateId !== "new",
  });

  // Template store actions
  const setTemplate = useTemplateStore((state) => state.setTemplate);
  const storeTemplate = useTemplateStore((state) => state.template);
  const reset = useTemplateStore((state) => state.reset);

  // Convert TemplateDto to frontend Template model
  const convertedTemplate = useMemo(() => {
    if (!response?.success || !response.template) {
      return null;
    }
    return fromTemplateDto(response.template);
  }, [response]);

  // Error handling
  const error = useMemo(() => {
    if (queryError) {
      return queryError instanceof Error
        ? queryError.message
        : "Failed to load template";
    }
    if (response && !response.success) {
      return response.errorMessage || "Failed to load template";
    }
    return null;
  }, [queryError, response]);

  // Sync with template store when template is loaded
  useEffect(() => {
    if (!autoSync) return;

    if (convertedTemplate) {
      // Only update store if the template has actually changed
      if (
        !storeTemplate ||
        storeTemplate.id !== convertedTemplate.id ||
        storeTemplate.version !== convertedTemplate.version
      ) {
        setTemplate(convertedTemplate);
        onSuccess?.(convertedTemplate);
      }
    }
  }, [convertedTemplate, autoSync, setTemplate, storeTemplate, onSuccess]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(new Error(error));
    }
  }, [error, onError]);

  // Refresh function
  const refresh = useCallback(async () => {
    const result = await refetch();
    if (result.data?.success && result.data.template) {
      const refreshedTemplate = fromTemplateDto(result.data.template);
      if (autoSync) {
        setTemplate(refreshedTemplate);
      }
    }
  }, [refetch, autoSync, setTemplate]);

  // Clear function
  const clear = useCallback(() => {
    reset();
  }, [reset]);

  // Determine the template to return
  // Prefer store template if synced, otherwise use converted template
  const template = autoSync ? storeTemplate : convertedTemplate;
  const isLoaded = !isLoading && !!template;

  return {
    template,
    isLoading,
    isLoaded,
    error,
    refresh,
    clear,
  };
}

/**
 * Hook to check if template has test data
 */
export function useTemplateHasTestData(): boolean {
  const testData = useTemplateStore((state) => state.template?.testData);
  return !!testData && Object.keys(testData).length > 0;
}

/**
 * Hook to get template test data
 */
export function useTemplateTestDataLoader():
  | Record<string, unknown>
  | undefined {
  return useTemplateStore((state) => state.template?.testData);
}
