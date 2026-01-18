/**
 * useAutoSave Hook
 *
 * Provides debounced auto-save functionality for templates with:
 * - Configurable debounce delay
 * - Save status tracking
 * - Error handling with retry
 * - Pause/resume capabilities
 * - Dirty state synchronization
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePatchTemplate } from "./useTemplateMutations";
import {
  useTemplateStore,
  useTemplate as useTemplateState,
  useTemplateIsDirty,
  useSaveStatus,
} from "@/store";
import type { Template } from "@/types/template";
import type { UpdateTemplateRequest } from "@/types/api";
import { toLayoutNodeDto } from "@/types/template";

// ============================================================================
// Types
// ============================================================================

export interface AutoSaveConfig {
  /** Debounce delay in milliseconds (default: 2000) */
  debounceMs?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** Maximum retry attempts on failure (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelayMs?: number;
  /** Whether to show toast notifications (default: false for auto-save) */
  showToast?: boolean;
}

export interface AutoSaveState {
  /** Whether auto-save is currently enabled */
  isEnabled: boolean;
  /** Whether a save is currently in progress */
  isSaving: boolean;
  /** Whether there are pending changes to save */
  hasPendingChanges: boolean;
  /** Time of the last successful save */
  lastSavedAt: Date | null;
  /** Current retry attempt (0 if not retrying) */
  retryAttempt: number;
  /** Last error that occurred during save */
  lastError: string | null;
}

export interface UseAutoSaveOptions extends AutoSaveConfig {
  /** Template ID to auto-save */
  templateId: string | null | undefined;
  /** Callback when save succeeds */
  onSaveSuccess?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
  /** Callback when save starts */
  onSaveStart?: () => void;
}

export interface UseAutoSaveReturn {
  /** Current auto-save state */
  state: AutoSaveState;
  /** Manually trigger a save immediately */
  saveNow: () => Promise<boolean>;
  /** Pause auto-save */
  pause: () => void;
  /** Resume auto-save */
  resume: () => void;
  /** Enable/disable auto-save */
  setEnabled: (enabled: boolean) => void;
  /** Reset error state and retry */
  retry: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_CONFIG: Required<AutoSaveConfig> = {
  debounceMs: 2000,
  enabled: true,
  maxRetries: 3,
  retryDelayMs: 1000,
  showToast: false,
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for debounced auto-save of template changes
 *
 * This hook watches for template changes and automatically saves them
 * to the backend after a debounce period. It integrates with the template
 * store for state management.
 *
 * @example
 * ```tsx
 * const { state, saveNow, pause, resume } = useAutoSave({
 *   templateId,
 *   debounceMs: 3000,
 *   onSaveSuccess: () => console.log('Saved!'),
 * });
 *
 * // Show save indicator
 * {state.isSaving && <Spinner />}
 * {state.lastSavedAt && <span>Saved {formatTime(state.lastSavedAt)}</span>}
 * ```
 */
export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const {
    templateId,
    debounceMs = DEFAULT_CONFIG.debounceMs,
    enabled = DEFAULT_CONFIG.enabled,
    maxRetries = DEFAULT_CONFIG.maxRetries,
    retryDelayMs = DEFAULT_CONFIG.retryDelayMs,
    showToast = DEFAULT_CONFIG.showToast,
    onSaveSuccess,
    onSaveError,
    onSaveStart,
  } = options;

  // Get template state from store
  const template = useTemplateState();
  const isDirty = useTemplateIsDirty();
  const saveStatus = useSaveStatus();
  const { markClean, setLastSavedAt, setSaveError } = useTemplateStore();

  // Mutation hook for saving
  const { mutateAsync: patchTemplate, isPending: isMutating } =
    usePatchTemplate({
      showToast,
      optimisticUpdate: false,
    });

  // Local state for retry tracking (need state because it affects UI)
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);

  // Refs for timers and pending data (don't affect render directly)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTemplateRef = useRef<Template | null>(null);
  // Store latest callbacks in refs to use in setTimeout
  const callbacksRef = useRef({ onSaveSuccess, onSaveError, onSaveStart });
  // Ref to hold stable reference to executeSave for recursive retry calls
  const executeSaveRef = useRef<
    (tmpl: Template, currentRetry?: number) => Promise<boolean>
  >(async () => false);

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = { onSaveSuccess, onSaveError, onSaveStart };
  }, [onSaveSuccess, onSaveError, onSaveStart]);

  // Keep enabled state in sync with prop
  useEffect(() => {
    setIsEnabled(enabled);
  }, [enabled]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // Build update request from template
  const buildUpdateRequest = useCallback(
    (tmpl: Template): UpdateTemplateRequest => {
      // Build metadata object, including testData if present
      const metadata: Record<string, unknown> = {};
      if (tmpl.testData && Object.keys(tmpl.testData).length > 0) {
        metadata.testData = tmpl.testData;
      }

      return {
        name: tmpl.name,
        description: tmpl.description,
        category: tmpl.category,
        tags: tmpl.tags?.join(","),
        layout: toLayoutNodeDto(tmpl.layout),
        isActive: tmpl.status !== "archived",
        // Include metadata with testData if there's any metadata to save
        ...(Object.keys(metadata).length > 0 && { metadata }),
      };
    },
    []
  );

  // Execute save operation
  const executeSave = useCallback(
    async (tmpl: Template, currentRetry = 0): Promise<boolean> => {
      if (!templateId) return false;

      callbacksRef.current.onSaveStart?.();

      try {
        const updateData = buildUpdateRequest(tmpl);
        await patchTemplate({ id: templateId, data: updateData });

        const now = new Date();
        markClean();
        setLastSavedAt(now);
        setRetryAttempt(0);
        pendingTemplateRef.current = null;
        callbacksRef.current.onSaveSuccess?.();

        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Should we retry?
        if (currentRetry < maxRetries) {
          const nextRetry = currentRetry + 1;
          setRetryAttempt(nextRetry);

          // Schedule retry using stable ref
          const templateToRetry = tmpl;
          retryTimerRef.current = setTimeout(() => {
            if (pendingTemplateRef.current) {
              // Use ref to get latest function version
              executeSaveRef.current(templateToRetry, nextRetry);
            }
          }, retryDelayMs);

          return false;
        }

        // Max retries reached
        setRetryAttempt(0);
        setSaveError(err.message);
        callbacksRef.current.onSaveError?.(err);
        return false;
      }
    },
    [
      templateId,
      buildUpdateRequest,
      patchTemplate,
      markClean,
      setLastSavedAt,
      setSaveError,
      maxRetries,
      retryDelayMs,
    ]
  );

  // Keep executeSaveRef in sync
  useEffect(() => {
    executeSaveRef.current = executeSave;
  }, [executeSave]);

  // Schedule debounced save
  const scheduleSave = useCallback(
    (tmpl: Template) => {
      // Store pending template
      pendingTemplateRef.current = tmpl;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Schedule new save
      debounceTimerRef.current = setTimeout(() => {
        const templateToSave = pendingTemplateRef.current;
        if (templateToSave) {
          executeSave(templateToSave, 0);
        }
      }, debounceMs);
    },
    [debounceMs, executeSave]
  );

  // Watch for template changes
  useEffect(() => {
    if (template && isDirty && !saveStatus.isSaving && isEnabled && !isPaused) {
      scheduleSave(template);
    }
  }, [
    template,
    isDirty,
    saveStatus.isSaving,
    isEnabled,
    isPaused,
    scheduleSave,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Reset when template ID changes
  useEffect(() => {
    clearTimers();
    pendingTemplateRef.current = null;
    setIsPaused(false);
    setRetryAttempt(0);
  }, [templateId, clearTimers]);

  // Public methods
  const saveNow = useCallback(async (): Promise<boolean> => {
    const tmpl = pendingTemplateRef.current || template;
    if (!tmpl || !templateId) return false;

    clearTimers();
    setRetryAttempt(0);
    return executeSave(tmpl, 0);
  }, [template, templateId, clearTimers, executeSave]);

  const pause = useCallback(() => {
    setIsPaused(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    // If there are pending changes, reschedule
    const pending = pendingTemplateRef.current;
    if (pending && isDirty) {
      scheduleSave(pending);
    }
  }, [isDirty, scheduleSave]);

  const handleSetEnabled = useCallback(
    (newEnabled: boolean) => {
      setIsEnabled(newEnabled);
      if (!newEnabled) {
        clearTimers();
      }
    },
    [clearTimers]
  );

  const retry = useCallback(() => {
    setRetryAttempt(0);
    const pending = pendingTemplateRef.current;
    if (pending) {
      executeSave(pending, 0);
    } else if (template && isDirty) {
      executeSave(template, 0);
    }
  }, [template, isDirty, executeSave]);

  // Build state from store + local state
  const state: AutoSaveState = {
    isEnabled,
    isSaving: saveStatus.isSaving || isMutating,
    hasPendingChanges: isDirty,
    lastSavedAt: saveStatus.lastSavedAt,
    retryAttempt,
    lastError: saveStatus.saveError,
  };

  return {
    state,
    saveNow,
    pause,
    resume,
    setEnabled: handleSetEnabled,
    retry,
  };
}

// ============================================================================
// Utility Hook: useAutoSaveStatus
// ============================================================================

/**
 * Hook to get auto-save status text for UI display
 */
export function useAutoSaveStatusText(state: AutoSaveState): string {
  if (state.isSaving) {
    return state.retryAttempt > 0
      ? `Saving... (retry ${state.retryAttempt})`
      : "Saving...";
  }

  if (state.lastError) {
    return `Save failed: ${state.lastError}`;
  }

  if (state.hasPendingChanges) {
    return "Unsaved changes";
  }

  if (state.lastSavedAt) {
    return formatTimeAgo(state.lastSavedAt);
  }

  return state.isEnabled ? "Auto-save enabled" : "Auto-save disabled";
}

/**
 * Format time as "X ago" string
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) {
    return "Saved just now";
  }
  if (diffSeconds < 60) {
    return `Saved ${diffSeconds}s ago`;
  }
  if (diffMinutes < 60) {
    return `Saved ${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `Saved ${diffHours}h ago`;
  }

  return `Saved ${date.toLocaleDateString()}`;
}

export default useAutoSave;
