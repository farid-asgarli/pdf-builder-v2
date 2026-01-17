"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertiesPanel } from "@/components/builder/PropertiesPanel";

interface BuilderPageProps {
  params: Promise<{
    templateId: string;
  }>;
}

export default function BuilderPage({ params }: BuilderPageProps) {
  const { templateId } = use(params);
  const isNewTemplate = templateId === "new";

  return (
    <div className="flex h-screen flex-col">
      {/* Top Bar */}
      <header className="bg-background flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-sm font-semibold">
              {isNewTemplate ? "New Template" : `Template: ${templateId}`}
            </h1>
            <p className="text-muted-foreground text-xs">
              {isNewTemplate ? "Unsaved" : "Last saved: Never"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </header>

      {/* Main Builder Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Component Palette */}
        <aside className="bg-muted/30 w-64 border-r">
          <div className="p-4">
            <h2 className="mb-4 text-sm font-semibold">Components</h2>
            <p className="text-muted-foreground text-xs">
              Component palette will be implemented in Phase 3.
            </p>
          </div>
        </aside>

        {/* Center - Canvas */}
        <main className="bg-muted/50 flex-1 overflow-auto">
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium">Canvas Area</p>
              <p className="text-muted-foreground text-sm">
                Drag components from the palette to build your PDF template.
              </p>
              <p className="text-muted-foreground mt-4 text-xs">
                Canvas implementation coming in Phase 4.
              </p>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Properties Panel with Two-Way Binding */}
        <PropertiesPanel className="w-80" />
      </div>
    </div>
  );
}
