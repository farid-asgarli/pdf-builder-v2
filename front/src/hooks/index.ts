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

// Multi-Resize Hook (Proportional Multi-Component Resize)
export {
  useMultiResize,
  calculateCombinedBoundingBox,
  calculateRelativePosition,
  calculateRelativeSize,
  type ComponentBounds as MultiResizeComponentBounds,
  type MultiResizeState,
  type UseMultiResizeOptions,
  type UseMultiResizeReturn,
} from "./useMultiResize";

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

// Auto-Save Hook (Debounced)
export {
  useAutoSave,
  useAutoSaveStatusText,
  type AutoSaveConfig,
  type AutoSaveState,
  type UseAutoSaveOptions,
  type UseAutoSaveReturn,
} from "./useAutoSave";

// PDF Generation Hook (React Query)
export {
  usePdfGeneration,
  useCanGeneratePdf,
  usePdfGenerationStatus,
  pdfGenerationKeys,
  type PdfGenerationOptions,
  type BuildPayloadResult,
  type UsePdfGenerationReturn,
} from "./usePdfGeneration";

// Validation Hook (React Query)
export {
  useValidation,
  useHasValidationErrors,
  useHasValidationWarnings,
  useValidationSummary,
  useNodeValidation,
  validationKeys,
  type ValidationOptions,
  type ValidationResult,
  type UseValidationReturn,
} from "./useValidation";

// Debounce Hook
export {
  useDebounce,
  useDebouncedCallback,
  useDebounceWithOptions,
} from "./useDebounce";

// Preview Refresh Hook
export {
  usePreviewRefresh,
  usePreviewVisibility,
  usePreviewLoading,
  usePreviewPagination,
  usePreviewZoom,
  type UsePreviewRefreshOptions,
  type UsePreviewRefreshReturn,
} from "./usePreviewRefresh";

// Keyboard Shortcuts Hook
export {
  useKeyboardShortcuts,
  getShortcutDisplayString,
  useShortcutDisplay,
  type KeyboardShortcut,
  type UseKeyboardShortcutsOptions,
  type UseKeyboardShortcutsReturn,
} from "./useKeyboardShortcuts";

// Clipboard Hook
export {
  useClipboard,
  type PasteTarget,
  type MoveDirection,
  type PasteOptions,
  type ClipboardOperationOptions,
  type UseClipboardReturn,
} from "./useClipboard";

// Alignment Hook
export {
  useAlignment,
  useAlignmentGuidesFromStore,
  useAlignmentGuidesEnabled,
  useAlignmentThreshold,
  type ComponentBounds,
  type AlignmentMatch,
  type SpacingMatch,
  type AlignmentResult,
  type AlignmentOptions,
  type UseAlignmentReturn,
} from "./useAlignment";

// Transform Hook (Rotation, Scale, Translation)
export {
  useTransform,
  useRotationState,
  useTranslationState,
  useIsTransforming,
  useActiveTransformType,
  DEFAULT_ROTATION_OPTIONS,
  DEFAULT_SCALE_OPTIONS,
  DEFAULT_TRANSLATION_OPTIONS,
  type TransformType,
  type RotationInteractionState,
  type ScaleInteractionState,
  type TranslationInteractionState,
  type TransformState,
  type RotationOptions,
  type ScaleOptions,
  type TranslationOptions,
  type UseTransformOptions,
  type UseTransformReturn,
} from "./useTransform";

// Scale Hook (Dedicated Scale State Management)
export {
  useScale,
  useScaleState,
  formatScaleAsPercentage,
  type ScaleInteractionState as DedicatedScaleInteractionState,
  type ScaleOptions as DedicatedScaleOptions,
  type UseScaleOptions,
  type UseScaleReturn,
} from "./useScale";

// Spacing Hook (Column/Row Gap Adjustment)
export {
  useSpacing,
  type SpacingState,
  type UseSpacingOptions,
  type UseSpacingReturn,
} from "./useSpacing";

// Table Column Resize Hook
export {
  useTableColumnResize,
  type ColumnResizeState,
  type UseTableColumnResizeOptions,
  type UseTableColumnResizeReturn,
} from "./useTableColumnResize";
