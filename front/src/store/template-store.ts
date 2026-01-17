/**
 * Template Store
 * Manages current template metadata, save state, and auto-save functionality
 *
 * Features:
 * - Current template metadata management
 * - Dirty state tracking (unsaved changes)
 * - Auto-save timer with configurable interval
 * - Save status and error handling
 * - Integration with canvas store for layout sync
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Template, TemplateStatus } from "@/types/template";
import type { LayoutNode } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

/**
 * Auto-save configuration
 */
export interface AutoSaveConfig {
  enabled: boolean;
  intervalMs: number;
}

/**
 * Save callback function type
 */
export type SaveCallback = (template: Template) => Promise<void>;

/**
 * Template store state and actions
 */
interface TemplateState {
  // Current template
  template: Template | null;

  // Dirty state (has unsaved changes)
  isDirty: boolean;

  // Auto-save configuration
  autoSaveConfig: AutoSaveConfig;
  autoSaveTimerId: ReturnType<typeof setTimeout> | null;

  // Save state
  lastSavedAt: Date | null;
  isSaving: boolean;
  saveError: string | null;

  // Save callback (set by the component that handles actual saving)
  saveCallback: SaveCallback | null;

  // Actions - Template CRUD
  setTemplate: (template: Template | null) => void;
  updateTemplateName: (name: string) => void;
  updateTemplateDescription: (description: string) => void;
  updateTemplateStatus: (status: TemplateStatus) => void;
  updateTemplateCategory: (category: string | undefined) => void;
  updateTemplateTags: (tags: string[]) => void;
  updateTestData: (data: Record<string, unknown>) => void;
  updateLayout: (layout: LayoutNode) => void;
  incrementVersion: () => void;

  // Dirty state
  markDirty: () => void;
  markClean: () => void;

  // Save state
  setSaving: (isSaving: boolean) => void;
  setSaveError: (error: string | null) => void;
  setLastSavedAt: (date: Date) => void;
  setSaveCallback: (callback: SaveCallback | null) => void;

  // Auto-save
  setAutoSaveConfig: (config: Partial<AutoSaveConfig>) => void;
  startAutoSave: () => void;
  stopAutoSave: () => void;
  triggerAutoSave: () => void;

  // Manual save
  save: () => Promise<boolean>;

  // Clear
  reset: () => void;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_AUTO_SAVE_CONFIG: AutoSaveConfig = {
  enabled: true,
  intervalMs: 30000, // 30 seconds
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useTemplateStore = create<TemplateState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    template: null,
    isDirty: false,
    autoSaveConfig: DEFAULT_AUTO_SAVE_CONFIG,
    autoSaveTimerId: null,
    lastSavedAt: null,
    isSaving: false,
    saveError: null,
    saveCallback: null,

    // ========================================================================
    // Template Actions
    // ========================================================================

    setTemplate: (template) => {
      const state = get();
      // Stop existing auto-save when loading new template
      if (state.autoSaveTimerId) {
        clearTimeout(state.autoSaveTimerId);
      }
      set({
        template,
        isDirty: false,
        saveError: null,
        autoSaveTimerId: null,
      });
      // Start auto-save if enabled and template is loaded
      if (template && state.autoSaveConfig.enabled) {
        get().startAutoSave();
      }
    },

    updateTemplateName: (name) => {
      set((state) => ({
        template: state.template
          ? { ...state.template, name, updatedAt: new Date().toISOString() }
          : null,
        isDirty: true,
      }));
      get().triggerAutoSave();
    },

    updateTemplateDescription: (description) => {
      set((state) => ({
        template: state.template
          ? {
              ...state.template,
              description,
              updatedAt: new Date().toISOString(),
            }
          : null,
        isDirty: true,
      }));
      get().triggerAutoSave();
    },

    updateTemplateStatus: (status) => {
      set((state) => ({
        template: state.template
          ? { ...state.template, status, updatedAt: new Date().toISOString() }
          : null,
        isDirty: true,
      }));
      get().triggerAutoSave();
    },

    updateTemplateCategory: (category) => {
      set((state) => ({
        template: state.template
          ? { ...state.template, category, updatedAt: new Date().toISOString() }
          : null,
        isDirty: true,
      }));
      get().triggerAutoSave();
    },

    updateTemplateTags: (tags) => {
      set((state) => ({
        template: state.template
          ? { ...state.template, tags, updatedAt: new Date().toISOString() }
          : null,
        isDirty: true,
      }));
      get().triggerAutoSave();
    },

    updateTestData: (testData) => {
      set((state) => ({
        template: state.template
          ? { ...state.template, testData, updatedAt: new Date().toISOString() }
          : null,
        isDirty: true,
      }));
      get().triggerAutoSave();
    },

    updateLayout: (layout) => {
      set((state) => ({
        template: state.template
          ? { ...state.template, layout, updatedAt: new Date().toISOString() }
          : null,
        isDirty: true,
      }));
      get().triggerAutoSave();
    },

    incrementVersion: () => {
      set((state) => ({
        template: state.template
          ? { ...state.template, version: state.template.version + 1 }
          : null,
      }));
    },

    // ========================================================================
    // Dirty State Actions
    // ========================================================================

    markDirty: () => {
      set({ isDirty: true });
      get().triggerAutoSave();
    },

    markClean: () => set({ isDirty: false }),

    // ========================================================================
    // Save State Actions
    // ========================================================================

    setSaving: (isSaving) => set({ isSaving }),

    setSaveError: (saveError) => set({ saveError, isSaving: false }),

    setLastSavedAt: (lastSavedAt) =>
      set({ lastSavedAt, isDirty: false, isSaving: false, saveError: null }),

    setSaveCallback: (saveCallback) => set({ saveCallback }),

    // ========================================================================
    // Auto-Save Actions
    // ========================================================================

    setAutoSaveConfig: (config) => {
      const currentConfig = get().autoSaveConfig;
      const newConfig = { ...currentConfig, ...config };
      set({ autoSaveConfig: newConfig });

      // Restart auto-save with new config if enabled
      const state = get();
      if (state.autoSaveTimerId) {
        clearTimeout(state.autoSaveTimerId);
        set({ autoSaveTimerId: null });
      }
      if (newConfig.enabled && state.template) {
        get().startAutoSave();
      }
    },

    startAutoSave: () => {
      const state = get();

      // Don't start if already running or disabled
      if (state.autoSaveTimerId || !state.autoSaveConfig.enabled) {
        return;
      }

      // Don't start if no template loaded
      if (!state.template) {
        return;
      }

      const timerId = setInterval(() => {
        const currentState = get();
        if (
          currentState.isDirty &&
          !currentState.isSaving &&
          currentState.template
        ) {
          get().save();
        }
      }, state.autoSaveConfig.intervalMs);

      set({
        autoSaveTimerId: timerId as unknown as ReturnType<typeof setTimeout>,
      });
    },

    stopAutoSave: () => {
      const state = get();
      if (state.autoSaveTimerId) {
        clearInterval(
          state.autoSaveTimerId as unknown as ReturnType<typeof setInterval>
        );
        set({ autoSaveTimerId: null });
      }
    },

    triggerAutoSave: () => {
      // This is called after every change
      // The actual save happens in the interval, but this ensures the timer is running
      const state = get();
      if (
        state.autoSaveConfig.enabled &&
        state.template &&
        !state.autoSaveTimerId
      ) {
        get().startAutoSave();
      }
    },

    // ========================================================================
    // Manual Save
    // ========================================================================

    save: async () => {
      const state = get();

      // Guard: Can't save if no template or already saving
      if (!state.template) {
        return false;
      }

      if (state.isSaving) {
        return false;
      }

      // Guard: Can't save without callback
      if (!state.saveCallback) {
        console.warn("[TemplateStore] No save callback set");
        return false;
      }

      // Start saving
      set({ isSaving: true, saveError: null });

      try {
        await state.saveCallback(state.template);
        set({
          isSaving: false,
          isDirty: false,
          lastSavedAt: new Date(),
          saveError: null,
        });
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save template";
        set({
          isSaving: false,
          saveError: errorMessage,
        });
        console.error("[TemplateStore] Save failed:", error);
        return false;
      }
    },

    // ========================================================================
    // Reset
    // ========================================================================

    reset: () => {
      const state = get();
      // Clean up timer
      if (state.autoSaveTimerId) {
        clearInterval(
          state.autoSaveTimerId as unknown as ReturnType<typeof setInterval>
        );
      }
      set({
        template: null,
        isDirty: false,
        autoSaveConfig: DEFAULT_AUTO_SAVE_CONFIG,
        autoSaveTimerId: null,
        lastSavedAt: null,
        isSaving: false,
        saveError: null,
        saveCallback: null,
      });
    },
  }))
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Hook to get current template
 */
export const useTemplate = () => useTemplateStore((state) => state.template);

/**
 * Hook to get template ID (or null if no template)
 */
export const useTemplateId = () =>
  useTemplateStore((state) => state.template?.id ?? null);

/**
 * Hook to get template name
 */
export const useTemplateName = () =>
  useTemplateStore((state) => state.template?.name ?? "");

/**
 * Hook to check if template has unsaved changes
 */
export const useTemplateIsDirty = () =>
  useTemplateStore((state) => state.isDirty);

/**
 * Hook to get save status
 */
export const useSaveStatus = () =>
  useTemplateStore((state) => ({
    isSaving: state.isSaving,
    lastSavedAt: state.lastSavedAt,
    saveError: state.saveError,
    isDirty: state.isDirty,
  }));

/**
 * Hook to get auto-save config
 */
export const useAutoSaveConfig = () =>
  useTemplateStore((state) => state.autoSaveConfig);

/**
 * Hook to check if auto-save is running
 */
export const useIsAutoSaveActive = () =>
  useTemplateStore((state) => state.autoSaveTimerId !== null);

/**
 * Hook to get template metadata (without layout for lighter re-renders)
 */
export const useTemplateMetadata = () =>
  useTemplateStore((state) =>
    state.template
      ? {
          id: state.template.id,
          name: state.template.name,
          description: state.template.description,
          status: state.template.status,
          category: state.template.category,
          tags: state.template.tags,
          createdAt: state.template.createdAt,
          updatedAt: state.template.updatedAt,
          version: state.template.version,
        }
      : null
  );

/**
 * Hook to get test data
 */
export const useTemplateTestData = () =>
  useTemplateStore((state) => state.template?.testData ?? {});

/**
 * Format relative time since last save
 */
export function formatTimeSinceSave(lastSavedAt: Date | null): string {
  if (!lastSavedAt) {
    return "Never saved";
  }

  const now = new Date();
  const diffMs = now.getTime() - lastSavedAt.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) {
    return "Just now";
  }
  if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  return lastSavedAt.toLocaleDateString();
}

// ============================================================================
// Subscriptions
// ============================================================================

/**
 * Subscribe to template changes
 */
export const subscribeToTemplateChanges = (
  callback: (template: Template | null) => void
) => {
  return useTemplateStore.subscribe((state) => state.template, callback);
};

/**
 * Subscribe to dirty state changes
 */
export const subscribeToDirtyChanges = (
  callback: (isDirty: boolean) => void
) => {
  return useTemplateStore.subscribe((state) => state.isDirty, callback);
};

/**
 * Subscribe to save state changes
 */
export const subscribeToSaveState = (
  callback: (state: { isSaving: boolean; saveError: string | null }) => void
) => {
  return useTemplateStore.subscribe(
    (state) => ({ isSaving: state.isSaving, saveError: state.saveError }),
    callback,
    {
      equalityFn: (a, b) =>
        a.isSaving === b.isSaving && a.saveError === b.saveError,
    }
  );
};
