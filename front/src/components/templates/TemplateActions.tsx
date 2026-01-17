"use client";

import { useRef } from "react";
import { Upload, Download, Trash2, Copy, FileJson } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import type { TemplateDto } from "@/types/api";

export interface TemplateActionsProps {
  /** Template ID for actions */
  templateId?: string;
  /** Callback when import is triggered with parsed JSON */
  onImport?: (templateJson: TemplateDto) => void;
  /** Callback when export is triggered */
  onExport?: (id: string) => void;
  /** Callback when duplicate is triggered */
  onDuplicate?: (id: string) => void;
  /** Callback when delete is triggered */
  onDelete?: (id: string) => void;
  /** Whether actions are disabled */
  disabled?: boolean;
  /** Whether to show only bulk actions (no single template actions) */
  bulkMode?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Template actions component providing import/export and other actions
 */
export function TemplateActions({
  templateId,
  onImport,
  onExport,
  onDuplicate,
  onDelete,
  disabled = false,
  bulkMode = false,
  className,
}: TemplateActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".json")) {
      toast.error("Invalid file type", {
        description: "Please select a JSON file.",
      });
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const json = JSON.parse(text) as TemplateDto;

      // Basic validation
      if (!json.name || !json.layout) {
        toast.error("Invalid template file", {
          description: "The file does not contain a valid template structure.",
        });
        return;
      }

      onImport?.(json);
    } catch (error) {
      toast.error("Failed to parse file", {
        description:
          error instanceof Error ? error.message : "Invalid JSON format",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExport = () => {
    if (templateId) {
      onExport?.(templateId);
    }
  };

  const handleDuplicate = () => {
    if (templateId) {
      onDuplicate?.(templateId);
    }
  };

  const handleDeleteConfirm = () => {
    if (templateId) {
      onDelete?.(templateId);
    }
    setShowDeleteDialog(false);
  };

  // Render import-only button in bulk mode
  if (bulkMode) {
    return (
      <div className={className}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={handleImportClick}
          disabled={disabled || isImporting}
        >
          <Upload className="mr-2 h-4 w-4" />
          {isImporting ? "Importing..." : "Import"}
        </Button>
      </div>
    );
  }

  // Full dropdown menu for single template actions
  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={disabled} className={className}>
            <FileJson className="mr-2 h-4 w-4" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleImportClick}>
            <Upload className="mr-2 h-4 w-4" />
            Import Template
          </DropdownMenuItem>

          {templateId && (
            <>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
