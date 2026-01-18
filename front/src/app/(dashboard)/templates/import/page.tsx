"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileJson, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useImportTemplate } from "@/hooks/useTemplateMutations";
import type { TemplateDto } from "@/types/api";

export default function ImportTemplatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedTemplate, setParsedTemplate] = useState<TemplateDto | null>(
    null
  );

  const { mutate: importTemplate, isPending } = useImportTemplate({
    onSuccess: (template) => {
      toast.success("Template imported", {
        description: `"${template.name}" has been imported successfully.`,
      });
      router.push("/templates");
    },
    onError: () => {
      setParseError("Failed to import template. Please try again.");
    },
  });

  const processFile = useCallback(async (file: File) => {
    setParseError(null);
    setParsedTemplate(null);

    // Validate file type
    if (!file.name.endsWith(".json")) {
      setParseError("Please select a JSON file.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setParseError("File size must be less than 10MB.");
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text) as TemplateDto;

      // Basic validation
      if (!json.name) {
        setParseError("Template must have a name.");
        return;
      }

      if (!json.layout) {
        setParseError("Template must have a layout definition.");
        return;
      }

      setSelectedFile(file);
      setParsedTemplate(json);
    } catch {
      setParseError("Invalid JSON format. Please check the file content.");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleImport = () => {
    if (parsedTemplate) {
      importTemplate(parsedTemplate);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedTemplate(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/templates">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Link>
      </Button>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Import Template</h1>
        <p className="text-muted-foreground">
          Import a PDF template from a JSON file
        </p>
      </div>

      {/* File upload area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Template File</CardTitle>
          <CardDescription>
            Drop a JSON file here or click to browse. The file should contain a
            valid template export.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />

          {!parsedTemplate ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex min-h-48 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-6 transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
            >
              <div className="bg-muted rounded-full p-3">
                <Upload className="text-muted-foreground h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  Drop your template file here or click to browse
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Supports JSON files up to 10MB
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File info */}
              <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-4">
                <FileJson className="h-8 w-8 text-blue-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{selectedFile?.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {((selectedFile?.size ?? 0) / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Remove
                </Button>
              </div>

              {/* Template preview */}
              <div className="rounded-lg border p-4">
                <h3 className="mb-2 font-medium">Template Details</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name:</dt>
                    <dd className="font-medium">{parsedTemplate.name}</dd>
                  </div>
                  {parsedTemplate.description && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Description:</dt>
                      <dd className="max-w-[60%] truncate text-right">
                        {parsedTemplate.description}
                      </dd>
                    </div>
                  )}
                  {parsedTemplate.category && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Category:</dt>
                      <dd>{parsedTemplate.category}</dd>
                    </div>
                  )}
                  {parsedTemplate.tags && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Tags:</dt>
                      <dd>{parsedTemplate.tags}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Version:</dt>
                    <dd>v{parsedTemplate.version || 1}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Error message */}
          {parseError && (
            <div className="bg-destructive/10 text-destructive mt-4 flex items-center gap-2 rounded-lg p-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/templates">Cancel</Link>
            </Button>
            <Button
              onClick={handleImport}
              disabled={!parsedTemplate || isPending}
            >
              {isPending ? "Importing..." : "Import Template"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
