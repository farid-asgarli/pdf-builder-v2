/**
 * FontPicker Component
 * Font family dropdown selector
 *
 * Features:
 * - Dropdown with font family options
 * - Font preview in dropdown items
 * - Search/filter functionality
 * - Expression support ({{ data.fontFamily }})
 * - Custom font support
 */
"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FONT_FAMILIES } from "@/lib/constants/fonts";
import { ChevronDownIcon, CheckIcon, SearchIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Font option type
 */
export interface FontOption {
  label: string;
  value: string;
}

/**
 * Props for FontPicker component
 */
export interface FontPickerProps {
  /** Field label */
  label: string;
  /** Current font family value */
  value: string | undefined;
  /** Callback when value changes */
  onChange: (value: string | undefined) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Whether to allow empty/undefined values */
  allowEmpty?: boolean;
  /** Whether expression syntax is supported ({{ }}) */
  supportsExpression?: boolean;
  /** Whether to show font preview in options */
  showPreview?: boolean;
  /** Whether to show search filter */
  showSearch?: boolean;
  /** Custom font options (overrides default) */
  customFonts?: readonly FontOption[];
  /** Additional CSS classes */
  className?: string;
  /** ID for accessibility */
  id?: string;
  /** Help text shown below the input */
  helpText?: string;
  /** Error message to display */
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

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

// ============================================================================
// Component
// ============================================================================

/**
 * FontPicker - Font family selection dropdown
 */
export function FontPicker({
  label,
  value,
  onChange,
  placeholder = "Select font...",
  disabled = false,
  readOnly = false,
  allowEmpty = true,
  supportsExpression = false,
  showPreview = true,
  showSearch = true,
  customFonts,
  className,
  id,
  helpText,
  error,
}: FontPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Generate unique ID if not provided
  const fieldId =
    id ?? `font-picker-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const listboxId = `${fieldId}-listbox`;

  // Font options to use
  const fontOptions = customFonts ?? FONT_FAMILIES;

  // Check if value is an expression
  const hasExpression =
    supportsExpression && value !== undefined && containsExpression(value);

  // Filter fonts based on search query
  const filteredFonts = fontOptions.filter((font) =>
    font.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected font label
  const selectedFont = fontOptions.find((f) => f.value === value);
  const displayValue = selectedFont?.label ?? value ?? "";

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const highlightedElement = listRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  /**
   * Handle font selection
   */
  const handleSelect = useCallback(
    (fontValue: string) => {
      onChange(fontValue);
      setIsOpen(false);
      setSearchQuery("");
    },
    [onChange]
  );

  /**
   * Handle clear selection
   */
  const handleClear = useCallback(() => {
    if (allowEmpty) {
      onChange(undefined);
    }
    setIsOpen(false);
    setSearchQuery("");
  }, [allowEmpty, onChange]);

  /**
   * Toggle dropdown
   */
  const toggleDropdown = useCallback(() => {
    if (!disabled && !readOnly) {
      setIsOpen((prev) => !prev);
      if (!isOpen) {
        setSearchQuery("");
        setHighlightedIndex(0);
      }
    }
  }, [disabled, readOnly, isOpen]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled || readOnly) return;

      switch (e.key) {
        case "Enter":
          e.preventDefault();
          if (isOpen && filteredFonts[highlightedIndex]) {
            handleSelect(filteredFonts[highlightedIndex].value);
          } else {
            toggleDropdown();
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery("");
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              Math.min(prev + 1, filteredFonts.length - 1)
            );
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          }
          break;
        case "Home":
          if (isOpen) {
            e.preventDefault();
            setHighlightedIndex(0);
          }
          break;
        case "End":
          if (isOpen) {
            e.preventDefault();
            setHighlightedIndex(filteredFonts.length - 1);
          }
          break;
      }
    },
    [
      disabled,
      readOnly,
      isOpen,
      filteredFonts,
      highlightedIndex,
      handleSelect,
      toggleDropdown,
    ]
  );

  return (
    <div ref={containerRef} className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldId} className="text-xs font-medium">
          {label}
        </Label>
        {supportsExpression && hasExpression && (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium">
            Expression
          </span>
        )}
      </div>

      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          id={fieldId}
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          disabled={disabled || readOnly}
          className={cn(
            "border-input flex h-8 w-full items-center justify-between rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm",
            "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-labelledby={fieldId}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${fieldId}-error`
              : helpText
                ? `${fieldId}-help`
                : undefined
          }
        >
          {displayValue ? (
            <span
              className={cn("truncate", hasExpression && "font-mono text-xs")}
              style={
                showPreview && !hasExpression && selectedFont
                  ? { fontFamily: selectedFont.value }
                  : undefined
              }
            >
              {displayValue}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDownIcon
            className={cn(
              "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={cn(
              "bg-popover absolute z-50 mt-1 w-full rounded-md border shadow-md",
              "animate-in fade-in-0 zoom-in-95"
            )}
          >
            {/* Search input */}
            {showSearch && (
              <div className="border-b p-1.5">
                <div className="relative">
                  <SearchIcon className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search fonts..."
                    className="h-7 pl-7 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Font list */}
            <div
              ref={listRef}
              id={listboxId}
              className="max-h-48 overflow-y-auto p-1"
              role="listbox"
            >
              {/* Clear option */}
              {allowEmpty && value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:bg-accent focus-visible:outline-none"
                  )}
                  role="option"
                  aria-selected={false}
                >
                  Clear selection
                </button>
              )}

              {/* Font options */}
              {filteredFonts.length > 0 ? (
                filteredFonts.map((font, index) => (
                  <button
                    key={font.value}
                    type="button"
                    data-index={index}
                    onClick={() => handleSelect(font.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-visible:bg-accent focus-visible:outline-none",
                      highlightedIndex === index && "bg-accent",
                      value === font.value && "font-medium"
                    )}
                    role="option"
                    aria-selected={value === font.value}
                  >
                    <span
                      className="truncate"
                      style={
                        showPreview ? { fontFamily: font.value } : undefined
                      }
                    >
                      {font.label}
                    </span>
                    {value === font.value && (
                      <CheckIcon className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <div className="text-muted-foreground px-2 py-6 text-center text-sm">
                  No fonts found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Help text */}
      {helpText && !error && (
        <p id={`${fieldId}-help`} className="text-muted-foreground text-xs">
          {helpText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p id={`${fieldId}-error`} className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export default FontPicker;
