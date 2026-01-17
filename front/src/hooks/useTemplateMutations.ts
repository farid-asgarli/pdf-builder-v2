/**
 * Template Mutation Hooks
 *
 * React Query mutation hooks for template CRUD operations with:
 * - Optimistic updates for instant UI feedback
 * - Automatic cache invalidation
 * - Error rollback handling
 * - Type-safe mutations
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { templateApi } from "@/lib/api/endpoints/templates";
import { isApiError, getErrorMessage } from "@/lib/api/error-utils";
import {
  templateKeys,
  useTemplateCache,
  useTemplateInvalidation,
} from "./useTemplateQueries";
import type {
  TemplateDto,
  TemplateResponse,
  TemplateListResponse,
  SaveTemplateRequest,
  UpdateTemplateRequest,
  DuplicateTemplateRequest,
} from "@/types/api";

// ============================================================================
// MUTATION OPTIONS TYPES
// ============================================================================

export interface UseCreateTemplateOptions {
  /** Callback on successful creation */
  onSuccess?: (template: TemplateDto) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether to show toast notifications (default: true) */
  showToast?: boolean;
}

export interface UseUpdateTemplateOptions {
  /** Callback on successful update */
  onSuccess?: (template: TemplateDto) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether to show toast notifications (default: true) */
  showToast?: boolean;
  /** Whether to use optimistic updates (default: true) */
  optimisticUpdate?: boolean;
}

export interface UseDeleteTemplateOptions {
  /** Callback on successful deletion */
  onSuccess?: (id: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether to show toast notifications (default: true) */
  showToast?: boolean;
  /** Whether to use optimistic updates (default: true) */
  optimisticUpdate?: boolean;
}

export interface UseDuplicateTemplateOptions {
  /** Callback on successful duplication */
  onSuccess?: (template: TemplateDto) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether to show toast notifications (default: true) */
  showToast?: boolean;
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new template
 *
 * @example
 * ```tsx
 * const { mutate: createTemplate, isPending } = useCreateTemplate({
 *   onSuccess: (template) => {
 *     router.push(`/builder/${template.id}`);
 *   },
 * });
 *
 * createTemplate({
 *   name: "New Invoice",
 *   description: "Invoice template",
 *   layout: { type: "Column", children: [] },
 * });
 * ```
 */
export function useCreateTemplate(options: UseCreateTemplateOptions = {}) {
  const { onSuccess, onError, showToast = true } = options;
  const queryClient = useQueryClient();
  const { invalidateMetadata } = useTemplateInvalidation();

  return useMutation({
    mutationFn: async (request: SaveTemplateRequest): Promise<TemplateResponse> => {
      return templateApi.create(request);
    },

    onSuccess: async (response) => {
      if (response.success && response.template) {
        // Invalidate template lists to refetch with new template
        await queryClient.invalidateQueries({
          queryKey: templateKeys.lists(),
        });

        // Invalidate categories/tags if new ones were added
        await invalidateMetadata();

        // Set the new template in cache
        queryClient.setQueryData<TemplateResponse>(
          templateKeys.detail(response.template.id),
          response
        );

        if (showToast) {
          toast.success("Template created", {
            description: `"${response.template.name}" has been created successfully.`,
          });
        }

        onSuccess?.(response.template);
      } else {
        throw new Error(response.errorMessage || "Failed to create template");
      }
    },

    onError: (error: Error) => {
      const message = isApiError(error)
        ? getErrorMessage(error)
        : error.message;

      if (showToast) {
        toast.error("Failed to create template", {
          description: message,
        });
      }

      onError?.(error);
    },
  });
}

/**
 * Hook to update an existing template with optimistic updates
 *
 * @example
 * ```tsx
 * const { mutate: updateTemplate, isPending } = useUpdateTemplate({
 *   onSuccess: () => {
 *     toast.success("Changes saved");
 *   },
 * });
 *
 * updateTemplate({
 *   id: templateId,
 *   data: { name: "Updated Name" },
 * });
 * ```
 */
export function useUpdateTemplate(options: UseUpdateTemplateOptions = {}) {
  const { onSuccess, onError, showToast = true, optimisticUpdate = true } = options;
  const queryClient = useQueryClient();
  const { updateTemplateInListCache } = useTemplateCache();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTemplateRequest;
    }): Promise<TemplateResponse> => {
      return templateApi.update(id, data);
    },

    onMutate: async ({ id, data }) => {
      if (!optimisticUpdate) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: templateKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: templateKeys.lists() });

      // Snapshot the previous values
      const previousTemplate = queryClient.getQueryData<TemplateResponse>(
        templateKeys.detail(id)
      );
      const previousLists = queryClient.getQueriesData<TemplateListResponse>({
        queryKey: templateKeys.lists(),
      });

      // Optimistically update the detail cache
      if (previousTemplate?.template) {
        queryClient.setQueryData<TemplateResponse>(templateKeys.detail(id), {
          ...previousTemplate,
          template: {
            ...previousTemplate.template,
            ...data,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      // Optimistically update the list caches
      updateTemplateInListCache(id, (template) => ({
        ...template,
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.tags !== undefined && { tags: data.tags }),
        updatedAt: new Date().toISOString(),
      }));

      // Return context with snapshots for rollback
      return { previousTemplate, previousLists };
    },

    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          templateKeys.detail(id),
          context.previousTemplate
        );
      }

      // Rollback list caches
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      const message = isApiError(error)
        ? getErrorMessage(error)
        : error.message;

      if (showToast) {
        toast.error("Failed to update template", {
          description: message,
        });
      }

      onError?.(error);
    },

    onSuccess: async (response, { id }) => {
      if (response.success && response.template) {
        // Update cache with server response
        queryClient.setQueryData<TemplateResponse>(
          templateKeys.detail(id),
          response
        );

        if (showToast) {
          toast.success("Template updated", {
            description: "Your changes have been saved.",
          });
        }

        onSuccess?.(response.template);
      } else {
        throw new Error(response.errorMessage || "Failed to update template");
      }
    },

    onSettled: async (_, __, { id }) => {
      // Always refetch after mutation settles to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: templateKeys.detail(id),
      });
    },
  });
}

/**
 * Hook to partially update a template (PATCH)
 *
 * Similar to useUpdateTemplate but uses PATCH for partial updates
 */
export function usePatchTemplate(options: UseUpdateTemplateOptions = {}) {
  const { onSuccess, onError, showToast = true, optimisticUpdate = true } = options;
  const queryClient = useQueryClient();
  const { updateTemplateInListCache } = useTemplateCache();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<UpdateTemplateRequest>;
    }): Promise<TemplateResponse> => {
      return templateApi.patch(id, data);
    },

    onMutate: async ({ id, data }) => {
      if (!optimisticUpdate) return;

      await queryClient.cancelQueries({ queryKey: templateKeys.detail(id) });

      const previousTemplate = queryClient.getQueryData<TemplateResponse>(
        templateKeys.detail(id)
      );

      if (previousTemplate?.template) {
        queryClient.setQueryData<TemplateResponse>(templateKeys.detail(id), {
          ...previousTemplate,
          template: {
            ...previousTemplate.template,
            ...data,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      // Update list caches for visible fields only
      if (data.name || data.description !== undefined || data.category !== undefined || data.isActive !== undefined) {
        updateTemplateInListCache(id, (template) => ({
          ...template,
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          updatedAt: new Date().toISOString(),
        }));
      }

      return { previousTemplate };
    },

    onError: (error, { id }, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(
          templateKeys.detail(id),
          context.previousTemplate
        );
      }

      const message = isApiError(error)
        ? getErrorMessage(error)
        : error.message;

      if (showToast) {
        toast.error("Failed to update template", {
          description: message,
        });
      }

      onError?.(error);
    },

    onSuccess: (response) => {
      if (response.success && response.template) {
        if (showToast) {
          toast.success("Template updated");
        }
        onSuccess?.(response.template);
      }
    },

    onSettled: async (_, __, { id }) => {
      await queryClient.invalidateQueries({
        queryKey: templateKeys.detail(id),
      });
    },
  });
}

/**
 * Hook to delete a template with optimistic updates
 *
 * @example
 * ```tsx
 * const { mutate: deleteTemplate, isPending } = useDeleteTemplate({
 *   onSuccess: () => {
 *     router.push("/templates");
 *   },
 * });
 *
 * // With confirmation dialog
 * const handleDelete = () => {
 *   if (confirm("Are you sure?")) {
 *     deleteTemplate(templateId);
 *   }
 * };
 * ```
 */
export function useDeleteTemplate(options: UseDeleteTemplateOptions = {}) {
  const { onSuccess, onError, showToast = true, optimisticUpdate = true } = options;
  const queryClient = useQueryClient();
  const { removeTemplateFromListCache } = useTemplateCache();

  return useMutation({
    mutationFn: async (id: string) => {
      return templateApi.delete(id);
    },

    onMutate: async (id) => {
      if (!optimisticUpdate) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: templateKeys.lists() });

      // Snapshot all list caches for potential rollback
      const previousLists = queryClient.getQueriesData<TemplateListResponse>({
        queryKey: templateKeys.lists(),
      });

      // Snapshot the template detail
      const previousTemplate = queryClient.getQueryData<TemplateResponse>(
        templateKeys.detail(id)
      );

      // Optimistically remove from all list caches
      removeTemplateFromListCache(id);

      return { previousLists, previousTemplate, id };
    },

    onError: (error, id, context) => {
      // Rollback list caches
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      const message = isApiError(error)
        ? getErrorMessage(error)
        : error.message;

      if (showToast) {
        toast.error("Failed to delete template", {
          description: message,
        });
      }

      onError?.(error);
    },

    onSuccess: (response, id) => {
      if (response.success) {
        // Remove from cache entirely
        queryClient.removeQueries({
          queryKey: templateKeys.detail(id),
        });

        if (showToast) {
          toast.success("Template deleted", {
            description: "The template has been permanently deleted.",
          });
        }

        onSuccess?.(id);
      } else {
        throw new Error(response.errorMessage || "Failed to delete template");
      }
    },

    onSettled: async () => {
      // Refetch lists to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: templateKeys.lists(),
      });
    },
  });
}

/**
 * Hook to duplicate a template
 *
 * @example
 * ```tsx
 * const { mutate: duplicateTemplate, isPending } = useDuplicateTemplate({
 *   onSuccess: (newTemplate) => {
 *     router.push(`/builder/${newTemplate.id}`);
 *   },
 * });
 *
 * duplicateTemplate({
 *   id: templateId,
 *   options: { newName: "My Template (Copy)" },
 * });
 * ```
 */
export function useDuplicateTemplate(options: UseDuplicateTemplateOptions = {}) {
  const { onSuccess, onError, showToast = true } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      options: dupOptions,
    }: {
      id: string;
      options?: DuplicateTemplateRequest;
    }): Promise<TemplateResponse> => {
      return templateApi.duplicate(id, dupOptions);
    },

    onSuccess: async (response) => {
      if (response.success && response.template) {
        // Invalidate lists to show the new duplicate
        await queryClient.invalidateQueries({
          queryKey: templateKeys.lists(),
        });

        // Set the new template in cache
        queryClient.setQueryData<TemplateResponse>(
          templateKeys.detail(response.template.id),
          response
        );

        if (showToast) {
          toast.success("Template duplicated", {
            description: `"${response.template.name}" has been created.`,
          });
        }

        onSuccess?.(response.template);
      } else {
        throw new Error(response.errorMessage || "Failed to duplicate template");
      }
    },

    onError: (error: Error) => {
      const message = isApiError(error)
        ? getErrorMessage(error)
        : error.message;

      if (showToast) {
        toast.error("Failed to duplicate template", {
          description: message,
        });
      }

      onError?.(error);
    },
  });
}

/**
 * Hook to import a template from JSON
 *
 * @example
 * ```tsx
 * const { mutate: importTemplate, isPending } = useImportTemplate();
 *
 * const handleFileUpload = (file: File) => {
 *   const reader = new FileReader();
 *   reader.onload = (e) => {
 *     const json = JSON.parse(e.target?.result as string);
 *     importTemplate(json);
 *   };
 *   reader.readAsText(file);
 * };
 * ```
 */
export function useImportTemplate(options: UseCreateTemplateOptions = {}) {
  const { onSuccess, onError, showToast = true } = options;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateJson: TemplateDto): Promise<TemplateResponse> => {
      return templateApi.import(templateJson);
    },

    onSuccess: async (response) => {
      if (response.success && response.template) {
        await queryClient.invalidateQueries({
          queryKey: templateKeys.lists(),
        });

        queryClient.setQueryData<TemplateResponse>(
          templateKeys.detail(response.template.id),
          response
        );

        if (showToast) {
          toast.success("Template imported", {
            description: `"${response.template.name}" has been imported successfully.`,
          });
        }

        onSuccess?.(response.template);
      } else {
        throw new Error(response.errorMessage || "Failed to import template");
      }
    },

    onError: (error: Error) => {
      const message = isApiError(error)
        ? getErrorMessage(error)
        : error.message;

      if (showToast) {
        toast.error("Failed to import template", {
          description: message,
        });
      }

      onError?.(error);
    },
  });
}

/**
 * Hook to export a template as JSON file download
 */
export function useExportTemplate() {
  return useMutation({
    mutationFn: async ({
      id,
      filename,
    }: {
      id: string;
      filename?: string;
    }): Promise<void> => {
      await templateApi.exportAndDownload(id, filename);
    },

    onSuccess: () => {
      toast.success("Template exported", {
        description: "The template has been downloaded as a JSON file.",
      });
    },

    onError: (error: Error) => {
      const message = isApiError(error)
        ? getErrorMessage(error)
        : error.message;

      toast.error("Failed to export template", {
        description: message,
      });
    },
  });
}

// ============================================================================
// COMBINED HOOK FOR CONVENIENCE
// ============================================================================

/**
 * Hook that provides all template mutation functions
 *
 * @example
 * ```tsx
 * const {
 *   createTemplate,
 *   updateTemplate,
 *   deleteTemplate,
 *   duplicateTemplate,
 *   isCreating,
 *   isUpdating,
 *   isDeleting,
 * } = useTemplateMutations();
 * ```
 */
export function useTemplateMutations(options: {
  onCreate?: UseCreateTemplateOptions;
  onUpdate?: UseUpdateTemplateOptions;
  onDelete?: UseDeleteTemplateOptions;
  onDuplicate?: UseDuplicateTemplateOptions;
} = {}) {
  const createMutation = useCreateTemplate(options.onCreate);
  const updateMutation = useUpdateTemplate(options.onUpdate);
  const patchMutation = usePatchTemplate(options.onUpdate);
  const deleteMutation = useDeleteTemplate(options.onDelete);
  const duplicateMutation = useDuplicateTemplate(options.onDuplicate);
  const importMutation = useImportTemplate(options.onCreate);
  const exportMutation = useExportTemplate();

  return {
    // Mutation functions
    createTemplate: createMutation.mutate,
    createTemplateAsync: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutate,
    updateTemplateAsync: updateMutation.mutateAsync,
    patchTemplate: patchMutation.mutate,
    patchTemplateAsync: patchMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutate,
    deleteTemplateAsync: deleteMutation.mutateAsync,
    duplicateTemplate: duplicateMutation.mutate,
    duplicateTemplateAsync: duplicateMutation.mutateAsync,
    importTemplate: importMutation.mutate,
    importTemplateAsync: importMutation.mutateAsync,
    exportTemplate: exportMutation.mutate,
    exportTemplateAsync: exportMutation.mutateAsync,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending || patchMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
    isImporting: importMutation.isPending,
    isExporting: exportMutation.isPending,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      patchMutation.isPending ||
      deleteMutation.isPending ||
      duplicateMutation.isPending ||
      importMutation.isPending ||
      exportMutation.isPending,

    // Error states
    createError: createMutation.error,
    updateError: updateMutation.error || patchMutation.error,
    deleteError: deleteMutation.error,
    duplicateError: duplicateMutation.error,
    importError: importMutation.error,
    exportError: exportMutation.error,

    // Reset functions
    resetCreate: createMutation.reset,
    resetUpdate: updateMutation.reset,
    resetPatch: patchMutation.reset,
    resetDelete: deleteMutation.reset,
    resetDuplicate: duplicateMutation.reset,
    resetImport: importMutation.reset,
    resetExport: exportMutation.reset,
  };
}

const templateMutationHooks = {
  useCreateTemplate,
  useUpdateTemplate,
  usePatchTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  useImportTemplate,
  useExportTemplate,
  useTemplateMutations,
};

export default templateMutationHooks;
