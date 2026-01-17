"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Download,
  FileText,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { TemplateCardSkeleton } from "./TemplateCardSkeleton";
import type { TemplateSummaryDto } from "@/types/api";

export interface TemplateCardProps {
  /** Template data */
  template: TemplateSummaryDto;
  /** Callback when duplicate is clicked */
  onDuplicate?: (id: string) => void;
  /** Callback when delete is clicked */
  onDelete?: (id: string) => void;
  /** Callback when export is clicked */
  onExport?: (id: string) => void;
  /** Whether the card is in a loading state */
  isLoading?: boolean;
  /** Whether actions are disabled */
  actionsDisabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Template card component for displaying template information in a grid
 */
export function TemplateCard({
  template,
  onDuplicate,
  onDelete,
  onExport,
  isLoading = false,
  actionsDisabled = false,
  className,
}: TemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Parse tags from comma-separated string
  const tags = template.tags
    ? template.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  // Format dates
  const updatedAt = formatDistanceToNow(new Date(template.updatedAt), {
    addSuffix: true,
  });

  const handleDuplicate = () => {
    onDuplicate?.(template.id);
  };

  const handleExport = () => {
    onExport?.(template.id);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete?.(template.id);
      setShowDeleteDialog(false);
    } catch {
      toast.error("Failed to delete template");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <TemplateCardSkeleton />;
  }

  return (
    <>
      <Card
        className={cn(
          "group relative flex flex-col transition-shadow hover:shadow-md",
          className
        )}
      >
        {/* Preview thumbnail area */}
        <div className="bg-muted relative aspect-4/3 overflow-hidden rounded-t-lg">
          <div className="flex h-full items-center justify-center">
            <FileText className="text-muted-foreground/50 h-12 w-12" />
          </div>
          {/* Hover overlay with quick actions */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/builder/${template.id}`}>
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/templates/${template.id}`}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                View
              </Link>
            </Button>
          </div>
          {/* Status badge */}
          <div className="absolute top-2 right-2">
            <Badge
              variant={template.isActive ? "default" : "secondary"}
              className={cn(
                "text-xs",
                template.isActive && "bg-green-500 hover:bg-green-600"
              )}
            >
              {template.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-base">
                {template.name}
              </CardTitle>
              {template.category && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {template.category}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={actionsDisabled}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Template actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/builder/${template.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/templates/${template.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-2">
          {template.description ? (
            <CardDescription className="line-clamp-2 text-sm">
              {template.description}
            </CardDescription>
          ) : (
            <CardDescription className="text-sm italic">
              No description
            </CardDescription>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-2 pt-0">
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          {/* Metadata */}
          <div className="text-muted-foreground flex w-full items-center justify-between text-xs">
            <span>v{template.version}</span>
            <span>Updated {updatedAt}</span>
          </div>
        </CardFooter>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{template.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { TemplateCardSkeleton };
