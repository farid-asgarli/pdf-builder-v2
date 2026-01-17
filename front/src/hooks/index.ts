/**
 * Hooks exports
 */

// Toast Hook
export { toast } from "sonner";

// Component Selection Hook
export {
  useComponentSelection,
  usePrimarySelection,
  useIsComponentSelected,
  useSelectionNavigation,
  type ComponentSelectionState,
  type ComponentSelectionActions,
  type UseComponentSelectionReturn,
} from "./useComponentSelection";

// History Hook
export {
  useHistory,
  useHistoryKeyboardShortcuts,
  HistoryActions,
  type UseHistoryOptions,
  type UseHistoryReturn,
  type HistoryActionKey,
} from "./useHistory";

// Template Hook
export {
  useTemplate,
  useSaveStatusWithTime,
  useTemplateSaveShortcut,
  useUnsavedChangesWarning,
  type UseTemplateOptions,
  type UseTemplateReturn,
} from "./useTemplate";

// Canvas Zoom Hook
export {
  useCanvasZoom,
  type UseCanvasZoomOptions,
  type UseCanvasZoomReturn,
} from "./useCanvasZoom";

// Canvas Pan Hook
export {
  useCanvasPan,
  type UseCanvasPanOptions,
  type UseCanvasPanReturn,
} from "./useCanvasPan";

// Drop Zone Hook
export {
  useDropZone,
  useIsValidDropTarget,
  useValidDropPositions,
  type UseDropZoneOptions,
  type UseDropZoneReturn,
} from "./useDropZone";

// Resize Hook
export {
  useResize,
  type ResizeState,
  type ConstraintLimitStatus,
  type UseResizeOptions,
  type UseResizeReturn,
} from "./useResize";

// Sync Resize with Properties Hook (Two-Way Binding)
export {
  useSyncResizeWithProperties,
  type ComponentSizing,
  type ResizeSyncState,
  type FlowLayoutContext,
  type ResizeDirection,
  type UseSyncResizeWithPropertiesOptions,
  type UseSyncResizeWithPropertiesReturn,
} from "./useSyncResizeWithProperties";

// Template Query Hooks (React Query)
export {
  useTemplates,
  useTemplateById,
  useTemplateCategories,
  useTemplateTags,
  useTemplatePrefetch,
  useTemplateCache,
  useTemplateInvalidation,
  templateKeys,
  type UseTemplatesOptions,
  type UseTemplateByIdOptions,
} from "./useTemplateQueries";

// Template Mutation Hooks (React Query)
export {
  useCreateTemplate,
  useUpdateTemplate,
  usePatchTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  useImportTemplate,
  useExportTemplate,
  useTemplateMutations,
  type UseCreateTemplateOptions,
  type UseUpdateTemplateOptions,
  type UseDeleteTemplateOptions,
  type UseDuplicateTemplateOptions,
} from "./useTemplateMutations";
