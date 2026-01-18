"use client";

import { use, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Eye,
  Download,
  EyeOff,
  Undo2,
  Redo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  Canvas,
  CanvasDropContext,
  ComponentPalette,
  ComponentTree,
  PropertiesPanel,
  PreviewPanel,
  CanvasModeSelector,
  KeyboardShortcutsProvider,
  KeyboardShortcutsDialog,
  ComponentRenderer,
  EmptyCanvasDropZone,
} from "@/components/builder";
import { useCanvasStore } from "@/store/canvas-store";
import { useSelectionStore } from "@/store/selection-store";
import { useHistoryStore } from "@/store/history-store";
import { usePreviewStore } from "@/store/preview-store";

interface BuilderPageProps {
  params: Promise<{
    templateId: string;
  }>;
}

export default function BuilderPage({ params }: BuilderPageProps) {
  const { templateId } = use(params);
  const isNewTemplate = templateId === "new";

  // Canvas store
  const layoutTree = useCanvasStore((state) => state.content);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  // History store for undo/redo
  const { canUndo, canRedo, undo, redo } = useHistoryStore();

  // Preview store
  const { isOpen: showPreview, togglePreview } = usePreviewStore();

  // Handle canvas click (deselect all)
  const handleCanvasClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Handle save
  const handleSave = useCallback(() => {
    // TODO: Implement actual save logic with API
    toast.success("Template saved", {
      description: "Your template has been saved successfully.",
    });
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    // TODO: Implement actual export logic
    toast.info("Export started", {
      description: "Your PDF is being generated...",
    });
  }, []);

  return (
    <KeyboardShortcutsProvider>
      <TooltipProvider>
        <div className="flex h-screen flex-col">
          {/* Top Bar */}
          <header className="bg-background flex h-14 items-center justify-between border-b px-4">
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/templates">
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to Templates</TooltipContent>
              </Tooltip>
              <div>
                <h1 className="text-sm font-semibold">
                  {isNewTemplate ? "New Template" : `Template: ${templateId}`}
                </h1>
                <p className="text-muted-foreground text-xs">
                  {isNewTemplate ? "Unsaved" : "Last saved: Never"}
                </p>
              </div>
              <Separator orientation="vertical" className="h-8" />
              {/* Canvas Mode Selector */}
              <CanvasModeSelector size="sm" showIndicator={false} />
            </div>

            <div className="flex items-center gap-2">
              {/* Undo/Redo */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => undo(layoutTree)}
                      disabled={!canUndo}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => redo(layoutTree)}
                      disabled={!canRedo}
                    >
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="h-8" />

              {/* Keyboard Shortcuts Help */}
              <KeyboardShortcutsDialog enableHotkeyOpen />

              <Separator orientation="vertical" className="h-8" />

              {/* Preview Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={togglePreview}>
                    {showPreview ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Hide Preview
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle PDF Preview (Ctrl+P)</TooltipContent>
              </Tooltip>

              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </header>

          {/* Main Builder Area */}
          <div className="flex flex-1 overflow-hidden">
            <CanvasDropContext>
              {/* Left Sidebar - Component Palette & Tree */}
              <aside className="flex w-72 flex-col border-r">
                {/* Component Palette */}
                <div className="flex-1 overflow-hidden">
                  <ComponentPalette
                    className="h-full"
                    defaultExpandedCategories={["container", "content"]}
                  />
                </div>
                {/* Component Tree */}
                <div className="h-64 border-t">
                  <ComponentTree className="h-full" />
                </div>
              </aside>

              {/* Center - Canvas */}
              <main className="relative flex flex-1 flex-col overflow-hidden">
                <Canvas
                  onCanvasClick={handleCanvasClick}
                  showToolbar={true}
                  toolbarPosition="bottom-left"
                  gridPattern="dots"
                >
                  {/* Render the layout tree */}
                  {layoutTree ? (
                    <ComponentRenderer node={layoutTree} depth={0} />
                  ) : (
                    <EmptyCanvasDropZone />
                  )}
                </Canvas>
              </main>
            </CanvasDropContext>

            {/* Right Side - Properties Panel and Preview */}
            <aside className="flex w-80 flex-col border-l">
              {/* Properties Panel */}
              <div className={showPreview ? "h-1/2 border-b" : "flex-1"}>
                <PropertiesPanel className="h-full" />
              </div>

              {/* Preview Panel (conditional) */}
              {showPreview && (
                <div className="h-1/2">
                  <PreviewPanel
                    className="h-full"
                    autoRefresh={true}
                    debounceDelay={1000}
                    showToolbar={true}
                  />
                </div>
              )}
            </aside>
          </div>
        </div>
      </TooltipProvider>
    </KeyboardShortcutsProvider>
  );
}
