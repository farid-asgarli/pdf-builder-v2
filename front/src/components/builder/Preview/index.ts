/**
 * Preview Components Barrel Export
 *
 * Re-exports all preview-related components for the PDF builder.
 * Note: PdfViewer and PreviewPanel use react-pdf which requires browser APIs,
 * so they are dynamically imported with SSR disabled.
 */
import dynamic from "next/dynamic";

// Dynamically import components that use react-pdf (browser-only)
export const PdfViewer = dynamic(
  () => import("./PdfViewer").then((mod) => mod.PdfViewer),
  { ssr: false }
);

export const PreviewPanel = dynamic(
  () => import("./PreviewPanel").then((mod) => mod.PreviewPanel),
  { ssr: false }
);

export const PreviewToggleButton = dynamic(
  () => import("./PreviewPanel").then((mod) => mod.PreviewToggleButton),
  { ssr: false }
);

// Types can be exported normally
export type { PreviewPanelProps } from "./PreviewPanel";
export type {
  PdfViewerProps,
  PdfDocumentProps,
  PdfPageProps,
} from "./PdfViewer";

// Toolbar component (doesn't use react-pdf, can be exported normally)
export { PreviewToolbar } from "./PreviewToolbar";
export type { PreviewToolbarProps } from "./PreviewToolbar";

// Default export (same as PreviewPanel)
export default PreviewPanel;
