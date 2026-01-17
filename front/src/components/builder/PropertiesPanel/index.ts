/**
 * PropertiesPanel Barrel Export
 * Re-exports all properties panel components
 */

// Main panel component
export {
  PropertiesPanel,
  default as PropertiesPanelDefault,
} from "./PropertiesPanel";
export type { PropertiesPanelProps } from "./PropertiesPanel";

// Property section component
export {
  PropertySection,
  default as PropertySectionDefault,
} from "./PropertySection";
export type { PropertySectionProps } from "./PropertySection";

// Property section configuration
export {
  getPropertySections,
  getPropertiesBySection,
  getSectionsByCategory,
  hasVisibleProperties,
} from "./property-section-config";
export type {
  PropertySectionId,
  PropertySectionConfig,
} from "./property-section-config";

// Property groups
export {
  SizingProperties,
  default as SizingPropertiesDefault,
} from "./PropertyGroups/SizingProperties";
export type { SizingPropertiesProps } from "./PropertyGroups/SizingProperties";

// Field components
export {
  NumberField,
  default as NumberFieldDefault,
} from "./fields/NumberField";
export type { NumberFieldProps, SizeUnit } from "./fields/NumberField";

export { TextField, default as TextFieldDefault } from "./fields/TextField";
export type { TextFieldProps } from "./fields/TextField";

export {
  ColorPicker,
  default as ColorPickerDefault,
} from "./fields/ColorPicker";
export type { ColorPickerProps } from "./fields/ColorPicker";

export { FontPicker, default as FontPickerDefault } from "./fields/FontPicker";
export type { FontPickerProps, FontOption } from "./fields/FontPicker";

export {
  AlignmentPicker,
  default as AlignmentPickerDefault,
} from "./fields/AlignmentPicker";
export type {
  AlignmentPickerProps,
  AlignmentValue,
  AlignmentMode,
} from "./fields/AlignmentPicker";

export {
  ImageUploader,
  default as ImageUploaderDefault,
} from "./fields/ImageUploader";
export type {
  ImageUploaderProps,
  ImageValue,
  ImageSourceType,
} from "./fields/ImageUploader";

export {
  SelectField,
  default as SelectFieldDefault,
} from "./fields/SelectField";
export type { SelectFieldProps, SelectOption } from "./fields/SelectField";

export {
  SliderField,
  default as SliderFieldDefault,
} from "./fields/SliderField";
export type { SliderFieldProps } from "./fields/SliderField";

export {
  ToggleField,
  default as ToggleFieldDefault,
} from "./fields/ToggleField";
export type { ToggleFieldProps } from "./fields/ToggleField";
