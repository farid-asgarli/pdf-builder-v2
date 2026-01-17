/**
 * Store exports
 */

// Canvas Store
export {
  useCanvasStore,
  useCanvasRoot,
  useCanvasIsDirty,
  useCanvasLastModified,
  useComponent,
  generateId,
  createComponentNode,
  type ValidationCheckResult,
  type MutationResult,
} from "./canvas-store";

// Selection Store
export {
  useSelectionStore,
  useSelectedIds,
  usePrimarySelectedId,
  useIsSelected,
  useSelectionCount,
  useHasSelection,
  useIsMultiSelection,
  useFocusedId,
  useIsSelectionLocked,
  subscribeToSelectionChanges,
  subscribeToPrimarySelectionChange,
  createSelectionChangeEvent,
  type SelectionMode,
  type SelectionChangeEvent,
  type SelectionChangeHandler,
  type SelectOptions,
} from "./selection-store";

// History Store
export {
  useHistoryStore,
  useCanUndoRedo,
  useUndoRedoDescriptions,
  useHistoryCounts,
  useIsHistoryPaused,
  type HistoryState,
  type HistoryEntry,
  type HistoryEntryMetadata,
} from "./history-store";

// Preview Store
export { usePreviewStore } from "./preview-store";

// Template Store
export {
  useTemplateStore,
  useTemplate,
  useTemplateId,
  useTemplateName,
  useTemplateIsDirty,
  useSaveStatus,
  useAutoSaveConfig,
  useIsAutoSaveActive,
  useTemplateMetadata,
  useTemplateTestData,
  formatTimeSinceSave,
  subscribeToTemplateChanges,
  subscribeToDirtyChanges,
  subscribeToSaveState,
  type AutoSaveConfig,
  type SaveCallback,
} from "./template-store";

// Canvas View Store (zoom, pan, grid, rulers)
export {
  useCanvasViewStore,
  ZOOM_LEVELS,
  ZOOM_LABELS,
  DEFAULT_ZOOM,
  DEFAULT_PAN,
  selectZoom,
  selectPan,
  selectShowGrid,
  selectShowRulers,
  selectGridSize,
  selectSnapToGrid,
  selectConfig,
} from "./canvas-view-store";

// Interaction Store (resize, rotation, translation)
export {
  useInteractionStore,
  useActiveInteraction,
  useResizeState,
  useRotationState,
  useTranslationState,
  usePaddingAdjustState,
  useSpacingAdjustState,
  useAlignmentGuides,
  useVisualSettings,
  useIsInteracting,
  useInteractingComponentId,
  useIsComponentInteracting,
  useResizeDimensions,
  useRotationAngle,
  useTranslationOffset,
  DEFAULT_VISUAL_SETTINGS,
  DEFAULT_RESIZE_CONSTRAINTS,
  type ResizeHandle,
  type ResizeDirection,
  type ResizeConstraints,
  type ResizeState,
  type RotationState,
  type TranslationState,
  type AlignmentGuide,
  type InteractionVisualSettings,
  type InteractionType,
  type PaddingAdjustState,
  type SpacingAdjustState,
} from "./interaction-store";
