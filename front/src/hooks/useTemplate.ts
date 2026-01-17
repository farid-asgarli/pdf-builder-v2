/**
 * useTemplate Hook
 * Provides convenient access to template state and operations
 *
 * Features:
 * - Template CRUD operations
 * - Auto-save integration
 * - Save status indicators
 * - Template metadata updates
 */
"use client";

import { useCallback, useEffect } from "react";
import {
  useTemplateStore,
  useTemplate as useTemplateState,
  useTemplateIsDirty,
  useSaveStatus,
  useAutoSaveConfig,
  useIsAutoSaveActive,
  type SaveCallback,
} from "@/store";
import type { Template, TemplateStatus } from "@/types/template";
import type { LayoutNode } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

export interface UseTemplateOptions {
  /** Callback to save template to the API */
  onSave?: SaveCallback;
  /** Whether to enable auto-save (default: true) */
  autoSaveEnabled?: boolean;
  /** Auto-save interval in milliseconds (default: 30000) */
  autoSaveInterval?: number;
}

export interface UseTemplateReturn {
  // State
  template: Template | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
  isAutoSaveActive: boolean;
  autoSaveConfig: { enabled: boolean; intervalMs: number };

  // Template actions
  setTemplate: (template: Template | null) => void;
  updateName: (name: string) => void;
  updateDescription: (description: string) => void;
  updateStatus: (status: TemplateStatus) => void;
  updateCategory: (category: string | undefined) => void;
  updateTags: (tags: string[]) => void;
  updateTestData: (data: Record<string, unknown>) => void;
  updateLayout: (layout: LayoutNode) => void;

  // Save actions
  save: () => Promise<boolean>;
  markDirty: () => void;

  // Auto-save actions
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  setAutoSaveInterval: (intervalMs: number) => void;

  // Cleanup
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing template state and operations
 *
 * @example
 * ```tsx
 * const {
 *   template,
 *   isDirty,
 *   save,
 *   updateName,
 * } = useTemplate({
 *   onSave: async (template) => {
 *     await api.updateTemplate(template.id, template);
 *   },
 * });
 * ```
 */
export function useTemplate(
  options: UseTemplateOptions = {}
): UseTemplateReturn {
  const { onSave, autoSaveEnabled = true, autoSaveInterval = 30000 } = options;

  // Get state from store
  const template = useTemplateState();
  const isDirty = useTemplateIsDirty();
  const saveStatus = useSaveStatus();
  const autoSaveConfig = useAutoSaveConfig();
  const isAutoSaveActive = useIsAutoSaveActive();

  // Get actions from store
  const {
    setTemplate,
    updateTemplateName,
    updateTemplateDescription,
    updateTemplateStatus,
    updateTemplateCategory,
    updateTemplateTags,
    updateTestData,
    updateLayout,
    markDirty,
    save: storeSave,
    setAutoSaveConfig,
    setSaveCallback,
    startAutoSave,
    stopAutoSave,
    reset,
  } = useTemplateStore();

  // Set up save callback
  useEffect(() => {
    if (onSave) {
      setSaveCallback(onSave);
    }
    return () => {
      setSaveCallback(null);
    };
  }, [onSave, setSaveCallback]);

  // Configure auto-save on mount
  useEffect(() => {
    setAutoSaveConfig({
      enabled: autoSaveEnabled,
      intervalMs: autoSaveInterval,
    });
  }, [autoSaveEnabled, autoSaveInterval, setAutoSaveConfig]);

  // Start auto-save when template is loaded
  useEffect(() => {
    if (template && autoSaveEnabled) {
      startAutoSave();
    }
    return () => {
      stopAutoSave();
    };
    // Only re-run when template ID changes or auto-save config changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, autoSaveEnabled, startAutoSave, stopAutoSave]);

  // Wrapped actions
  const updateName = useCallback(
    (name: string) => {
      updateTemplateName(name);
    },
    [updateTemplateName]
  );

  const updateDescription = useCallback(
    (description: string) => {
      updateTemplateDescription(description);
    },
    [updateTemplateDescription]
  );

  const updateStatus = useCallback(
    (status: TemplateStatus) => {
      updateTemplateStatus(status);
    },
    [updateTemplateStatus]
  );

  const updateCategory = useCallback(
    (category: string | undefined) => {
      updateTemplateCategory(category);
    },
    [updateTemplateCategory]
  );

  const updateTags = useCallback(
    (tags: string[]) => {
      updateTemplateTags(tags);
    },
    [updateTemplateTags]
  );

  const updateTestDataCb = useCallback(
    (data: Record<string, unknown>) => {
      updateTestData(data);
    },
    [updateTestData]
  );

  const updateLayoutCb = useCallback(
    (layout: LayoutNode) => {
      updateLayout(layout);
    },
    [updateLayout]
  );

  const save = useCallback(async () => {
    return storeSave();
  }, [storeSave]);

  const enableAutoSave = useCallback(() => {
    setAutoSaveConfig({ enabled: true });
  }, [setAutoSaveConfig]);

  const disableAutoSave = useCallback(() => {
    setAutoSaveConfig({ enabled: false });
  }, [setAutoSaveConfig]);

  const setAutoSaveIntervalCb = useCallback(
    (intervalMs: number) => {
      setAutoSaveConfig({ intervalMs });
    },
    [setAutoSaveConfig]
  );

  return {
    // State
    template,
    isDirty,
    isSaving: saveStatus.isSaving,
    lastSavedAt: saveStatus.lastSavedAt,
    saveError: saveStatus.saveError,
    isAutoSaveActive,
    autoSaveConfig,

    // Template actions
    setTemplate,
    updateName,
    updateDescription,
    updateStatus,
    updateCategory,
    updateTags,
    updateTestData: updateTestDataCb,
    updateLayout: updateLayoutCb,

    // Save actions
    save,
    markDirty,

    // Auto-save actions
    enableAutoSave,
    disableAutoSave,
    setAutoSaveInterval: setAutoSaveIntervalCb,

    // Cleanup
    reset,
  };
}

// ============================================================================
// Additional Utility Hooks
// ============================================================================

/**
 * Hook to get save status with formatted time
 */
export function useSaveStatusWithTime() {
  const { isSaving, lastSavedAt, saveError, isDirty } = useSaveStatus();

  const getStatusText = useCallback(() => {
    if (isSaving) {
      return "Saving...";
    }
    if (saveError) {
      return `Save failed: ${saveError}`;
    }
    if (isDirty) {
      return "Unsaved changes";
    }
    if (lastSavedAt) {
      const now = new Date();
      const diffMs = now.getTime() - lastSavedAt.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);

      if (diffSeconds < 10) {
        return "Saved just now";
      }
      if (diffSeconds < 60) {
        return `Saved ${diffSeconds}s ago`;
      }
      if (diffMinutes < 60) {
        return `Saved ${diffMinutes}m ago`;
      }
      return `Saved at ${lastSavedAt.toLocaleTimeString()}`;
    }
    return "Not saved";
  }, [isSaving, lastSavedAt, saveError, isDirty]);

  return {
    isSaving,
    lastSavedAt,
    saveError,
    isDirty,
    statusText: getStatusText(),
  };
}

/**
 * Hook for keyboard shortcuts related to saving
 */
export function useTemplateSaveShortcut() {
  const { save, isDirty } = useTemplateStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty) {
          save();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [save, isDirty]);
}

/**
 * Hook to warn user about unsaved changes when leaving
 */
export function useUnsavedChangesWarning() {
  const isDirty = useTemplateIsDirty();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);
}

export default useTemplate;
