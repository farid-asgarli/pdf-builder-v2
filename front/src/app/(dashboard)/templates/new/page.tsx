"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTemplate } from "@/hooks/useTemplateMutations";
import { useTemplateCategories } from "@/hooks/useTemplateQueries";
import type { LayoutNodeDto } from "@/types/dto";

/**
 * Create a default empty layout for a new template
 */
function createDefaultLayout(): LayoutNodeDto {
  return {
    id: crypto.randomUUID(),
    type: "Column",
    properties: {
      spacing: 10,
    },
    children: [],
  };
}

export default function NewTemplatePage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tags, setTags] = useState("");

  // Fetch categories for dropdown
  const { data: categories, isLoading: isLoadingCategories } =
    useTemplateCategories();

  // Create template mutation
  const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate({
    onSuccess: (template) => {
      toast.success("Template created", {
        description: `"${template.name}" has been created. Opening builder...`,
      });
      // Redirect to the builder with the new template
      router.push(`/builder/${template.id}`);
    },
    onError: (error) => {
      toast.error("Failed to create template", {
        description: error.message,
      });
    },
    showToast: false, // We handle toasts manually
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required", {
        description: "Please enter a name for your template.",
      });
      return;
    }

    createTemplate({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category || undefined,
      tags: tags.trim() || undefined,
      layout: createDefaultLayout(),
    });
  };

  // Handle quick start (create template with minimal info)
  const handleQuickStart = () => {
    const quickName = `Untitled Template ${new Date().toLocaleDateString()}`;
    createTemplate({
      name: quickName,
      layout: createDefaultLayout(),
    });
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
        <h1 className="text-3xl font-bold tracking-tight">Create Template</h1>
        <p className="text-muted-foreground">
          Create a new PDF template from scratch
        </p>
      </div>

      {/* Quick start card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Start</CardTitle>
          <CardDescription>
            Jump straight into the builder with default settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleQuickStart}
            disabled={isCreating}
            className="w-full"
            variant="secondary"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Create & Open Builder
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Detailed form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template Details</CardTitle>
          <CardDescription>
            Provide more details for your template (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter template name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                A descriptive name for your template
              </p>
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this template is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreating}
                rows={3}
              />
            </div>

            {/* Category field */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category || "__none__"}
                onValueChange={(val) =>
                  setCategory(val === "__none__" ? "" : val)
                }
                disabled={isCreating || isLoadingCategories}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No category</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  {/* Common default categories if none exist */}
                  {(!categories || categories.length === 0) && (
                    <>
                      <SelectItem value="Invoice">Invoice</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Report">Report</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                      <SelectItem value="Certificate">Certificate</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Tags field */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="e.g., insurance, billing, customer"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isCreating}
              />
              <p className="text-muted-foreground text-xs">
                Comma-separated tags to help organize templates
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button variant="outline" asChild disabled={isCreating}>
                <Link href="/templates">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isCreating || !name.trim()}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Template"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
