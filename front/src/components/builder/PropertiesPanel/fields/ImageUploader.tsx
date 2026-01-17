/**
 * ImageUploader Component
 * Image upload with file upload and URL input support
 *
 * Features:
 * - File upload via drag-and-drop or file picker
 * - URL input for external images
 * - Image preview with thumbnail
 * - Expression support ({{ data.imageUrl }})
 * - File validation (type, size)
 * - Base64 encoding for embedded images
 * - Clear/remove functionality
 */
"use client";

import {
  useState,
  useCallback,
  useRef,
  useId,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ImageIcon,
  UploadIcon,
  LinkIcon,
  XIcon,
  AlertCircleIcon,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Image source type
 */
export type ImageSourceType = "url" | "file" | "base64" | "expression";

/**
 * Image value with source tracking
 */
export interface ImageValue {
  /** Image source (URL, base64 data, or expression) */
  source: string;
  /** Type of image source */
  type: ImageSourceType;
  /** Original filename (for file uploads) */
  filename?: string;
  /** MIME type */
  mimeType?: string;
}

/**
 * Props for ImageUploader component
 */
export interface ImageUploaderProps {
  /** Field label */
  label: string;
  /** Current image value (URL, base64, or expression) */
  value: string | undefined;
  /** Callback when value changes */
  onChange: (value: string | undefined) => void;
  /** Placeholder text for URL input */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Whether to allow empty/undefined values */
  allowEmpty?: boolean;
  /** Whether expression syntax is supported ({{ }}) */
  supportsExpression?: boolean;
  /** Maximum file size in bytes (default: 5MB) */
  maxFileSize?: number;
  /** Allowed MIME types */
  acceptedTypes?: string[];
  /** Whether to show image preview */
  showPreview?: boolean;
  /** Preview thumbnail size in pixels */
  previewSize?: number;
  /** Whether to convert uploads to base64 */
  useBase64?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ID for accessibility */
  id?: string;
  /** Help text shown below the input */
  helpText?: string;
  /** Error message to display */
  error?: string;
  /** Callback for file upload handling (e.g., upload to server) */
  onFileUpload?: (file: File) => Promise<string>;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];
const DEFAULT_PREVIEW_SIZE = 80;
const EXPRESSION_REGEX = /\{\{[^}]*\}\}/;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a string contains expression syntax
 */
function containsExpression(value: string): boolean {
  return EXPRESSION_REGEX.test(value);
}

/**
 * Check if a string is base64 encoded image data
 */
function isBase64Image(value: string): boolean {
  return value.startsWith("data:image/");
}

/**
 * Get image source type from value
 */
function getSourceType(value: string | undefined): ImageSourceType {
  if (!value) return "url";
  if (containsExpression(value)) return "expression";
  if (isBase64Image(value)) return "base64";
  return "url";
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Convert file to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// Component
// ============================================================================

/**
 * ImageUploader - Image upload and URL input component
 */
export function ImageUploader({
  label,
  value,
  onChange,
  placeholder = "Enter image URL or upload file...",
  disabled = false,
  readOnly = false,
  allowEmpty = true,
  supportsExpression = false,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  showPreview = true,
  previewSize = DEFAULT_PREVIEW_SIZE,
  useBase64 = true,
  className,
  id,
  helpText,
  error,
  onFileUpload,
}: ImageUploaderProps) {
  // Local state
  const [inputMode, setInputMode] = useState<"url" | "upload">("url");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID
  const generatedId = useId();
  const fieldId = id ?? `image-uploader-${generatedId}`;

  // Determine current source type
  const sourceType = getSourceType(value);
  const hasValue = !!value;
  const hasExpression =
    supportsExpression && value !== undefined && containsExpression(value);

  /**
   * Handle URL input change
   */
  const handleUrlChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setUploadError(null);
      setPreviewError(false);

      if (newValue === "" && allowEmpty) {
        onChange(undefined);
      } else {
        onChange(newValue);
      }
    },
    [allowEmpty, onChange]
  );

  /**
   * Validate file
   */
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        return `Invalid file type. Accepted: ${acceptedTypes.join(", ")}`;
      }
      if (file.size > maxFileSize) {
        return `File too large. Maximum size: ${formatFileSize(maxFileSize)}`;
      }
      return null;
    },
    [acceptedTypes, maxFileSize]
  );

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setUploadError(validationError);
        return;
      }

      setUploadError(null);
      setPreviewError(false);
      setIsUploading(true);

      try {
        let imageValue: string;

        if (onFileUpload) {
          // Use custom upload handler (e.g., upload to server)
          imageValue = await onFileUpload(file);
        } else if (useBase64) {
          // Convert to base64
          imageValue = await fileToBase64(file);
        } else {
          // Create object URL (temporary, not recommended for persistence)
          imageValue = URL.createObjectURL(file);
        }

        onChange(imageValue);
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : "Failed to upload file"
        );
      } finally {
        setIsUploading(false);
      }
    },
    [validateFile, onFileUpload, useBase64, onChange]
  );

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input to allow re-selecting same file
      e.target.value = "";
    },
    [handleFileSelect]
  );

  /**
   * Handle drag enter
   */
  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !readOnly) {
        setIsDragging(true);
      }
    },
    [disabled, readOnly]
  );

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  /**
   * Handle drop
   */
  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || readOnly) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, readOnly, handleFileSelect]
  );

  /**
   * Handle clear button click
   */
  const handleClear = useCallback(() => {
    if (disabled || readOnly) return;
    onChange(undefined);
    setUploadError(null);
    setPreviewError(false);
  }, [disabled, readOnly, onChange]);

  /**
   * Handle preview image load error
   */
  const handlePreviewError = useCallback(() => {
    setPreviewError(true);
  }, []);

  /**
   * Open file picker
   */
  const openFilePicker = useCallback(() => {
    if (!disabled && !readOnly) {
      fileInputRef.current?.click();
    }
  }, [disabled, readOnly]);

  // Combined error (prop error or upload error)
  const displayError = error ?? uploadError;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      <Label
        htmlFor={fieldId}
        className={cn(
          "text-sm font-medium",
          disabled && "opacity-50",
          displayError && "text-destructive"
        )}
      >
        {label}
      </Label>

      {/* Mode Toggle */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant={inputMode === "url" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setInputMode("url")}
          disabled={disabled}
          className="h-7 px-2 text-xs"
        >
          <LinkIcon className="mr-1 h-3 w-3" />
          URL
        </Button>
        <Button
          type="button"
          variant={inputMode === "upload" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setInputMode("upload")}
          disabled={disabled}
          className="h-7 px-2 text-xs"
        >
          <UploadIcon className="mr-1 h-3 w-3" />
          Upload
        </Button>
      </div>

      {/* URL Input Mode */}
      {inputMode === "url" && (
        <div className="relative">
          <Input
            id={fieldId}
            type="text"
            value={value ?? ""}
            onChange={handleUrlChange}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={cn(
              "pr-8",
              hasExpression && "font-mono text-xs",
              displayError && "border-destructive"
            )}
          />
          {hasValue && !disabled && !readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 p-0"
            >
              <XIcon className="h-3 w-3" />
              <span className="sr-only">Clear</span>
            </Button>
          )}
        </div>
      )}

      {/* File Upload Mode */}
      {inputMode === "upload" && (
        <>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(",")}
            onChange={handleFileInputChange}
            disabled={disabled || readOnly}
            className="hidden"
            aria-hidden="true"
          />

          {/* Drop zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={openFilePicker}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="Click or drag to upload image"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFilePicker();
              }
            }}
            className={cn(
              "flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-4 transition-colors",
              "hover:border-primary/50 hover:bg-muted/50",
              "focus-visible:ring-ring focus:outline-none focus-visible:ring-2",
              isDragging && "border-primary bg-primary/10",
              disabled && "cursor-not-allowed opacity-50",
              readOnly && "cursor-default",
              displayError && "border-destructive"
            )}
          >
            {isUploading ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2">
                <div className="border-muted-foreground h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
                <span className="text-xs">Uploading...</span>
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center gap-2">
                <UploadIcon className="h-6 w-6" />
                <span className="text-center text-xs">
                  Drop image here or click to browse
                </span>
                <span className="text-xs opacity-60">
                  Max size: {formatFileSize(maxFileSize)}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Image Preview */}
      {showPreview && hasValue && !hasExpression && (
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "bg-muted relative flex items-center justify-center overflow-hidden rounded-md border",
              previewError && "bg-destructive/10"
            )}
            style={{ width: previewSize, height: previewSize }}
          >
            {previewError ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-destructive flex flex-col items-center gap-1">
                    <AlertCircleIcon className="h-5 w-5" />
                    <span className="text-[10px]">Error</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Failed to load image preview</TooltipContent>
              </Tooltip>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Preview"
                onError={handlePreviewError}
                className="h-full w-full object-contain"
              />
            )}
          </div>

          {/* Source type indicator */}
          <div className="text-muted-foreground flex-1 text-xs">
            <div className="flex items-center gap-1">
              {sourceType === "base64" ? (
                <>
                  <ImageIcon className="h-3 w-3" />
                  <span>Embedded image</span>
                </>
              ) : (
                <>
                  <LinkIcon className="h-3 w-3" />
                  <span className="max-w-36 truncate">{value}</span>
                </>
              )}
            </div>
            {hasValue && !disabled && !readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-destructive hover:text-destructive mt-1 h-6 px-2 text-xs"
              >
                <XIcon className="mr-1 h-3 w-3" />
                Remove
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Expression indicator */}
      {hasExpression && (
        <div className="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs">
          <span className="text-muted-foreground font-mono">{value}</span>
        </div>
      )}

      {/* Help Text */}
      {helpText && !displayError && (
        <p className="text-muted-foreground text-xs">{helpText}</p>
      )}

      {/* Expression hint */}
      {supportsExpression && !hasValue && (
        <p className="text-muted-foreground text-xs opacity-60">
          Supports expressions: {"{{ data.imageUrl }}"}
        </p>
      )}

      {/* Error Message */}
      {displayError && (
        <p className="text-destructive text-xs" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}

// Default export for convenience
export default ImageUploader;
