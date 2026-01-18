/**
 * HeaderFooterEditor Components
 *
 * Provides specialized editing interfaces for document headers and footers.
 * These components repeat on every page of the generated PDF.
 */

export { HeaderEditor, default as HeaderEditorDefault } from "./HeaderEditor";
export type { HeaderEditorProps } from "./HeaderEditor";

export { FooterEditor, default as FooterEditorDefault } from "./FooterEditor";
export type { FooterEditorProps } from "./FooterEditor";

export { PagePreview, default as PagePreviewDefault } from "./PagePreview";
export type {
  PagePreviewProps,
  PageDimensions,
  SectionBounds,
} from "./PagePreview";
