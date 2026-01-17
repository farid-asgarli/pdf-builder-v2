# PDF Builder Backend - Complete Architecture Guide

## Table of Contents

1. [Project Overview](#project-overview)
2. [Complete Project Structure](#complete-project-structure)
3. [Component Specifications](#component-specifications)
4. [Development Phases](#development-phases)

---

## Project Overview

**Tech Stack:**

- .NET 8
- QuestPDF for PDF generation
- ASP.NET Core Web API
- FluentValidation
- Expression evaluation (DynamicExpresso or Jint)

**Architecture Pattern:**

- Clean Architecture
- Repository Pattern (for templates)
- Factory Pattern (for renderers)
- Strategy Pattern (component rendering)

---

## Complete Project Structure

```
PDFBuilder.Backend/
├── src/
│   ├── PDFBuilder.API/                          # ASP.NET Core Web API
│   │   ├── Controllers/
│   │   │   ├── PdfController.cs                 # PDF generation endpoints
│   │   │   ├── TemplateController.cs            # Template CRUD operations
│   │   │   └── ValidationController.cs          # Pre-validate layouts
│   │   ├── Middleware/
│   │   │   ├── ExceptionHandlingMiddleware.cs   # Global error handling
│   │   │   └── RequestLoggingMiddleware.cs      # Request/response logging
│   │   ├── Filters/
│   │   │   └── ValidationFilter.cs              # Model validation filter
│   │   ├── Extensions/
│   │   │   └── ServiceCollectionExtensions.cs   # DI registration helpers
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   └── PDFBuilder.API.csproj
│   │
│   ├── PDFBuilder.Contracts/                    # DTOs & API Models
│   │   ├── Requests/
│   │   │   ├── GeneratePdfRequest.cs            # PDF generation request
│   │   │   ├── ValidateLayoutRequest.cs         # Layout validation request
│   │   │   └── SaveTemplateRequest.cs           # Save template request
│   │   ├── Responses/
│   │   │   ├── PdfGenerationResponse.cs         # PDF generation response
│   │   │   ├── ValidationResponse.cs            # Validation results
│   │   │   └── TemplateResponse.cs              # Template data response
│   │   └── DTOs/
│   │       ├── LayoutNodeDto.cs                 # Layout tree structure
│   │       ├── ComponentPropertyDto.cs          # Component properties
│   │       └── TemplateDto.cs                   # Template metadata
│   │
│   ├── PDFBuilder.Core/                         # Domain Models & Business Logic
│   │   ├── Domain/
│   │   │   ├── LayoutNode.cs                    # Core layout node entity
│   │   │   ├── ComponentType.cs                 # Component type enumeration
│   │   │   ├── RenderContext.cs                 # Rendering context with data
│   │   │   ├── StyleProperties.cs               # Style inheritance model
│   │   │   └── Template.cs                      # Template domain entity
│   │   ├── Interfaces/
│   │   │   ├── ILayoutEngine.cs                 # Layout engine contract
│   │   │   ├── IComponentRenderer.cs            # Component renderer contract
│   │   │   ├── IExpressionEvaluator.cs          # Expression evaluation contract
│   │   │   ├── IPdfGenerator.cs                 # PDF generation service contract
│   │   │   └── ITemplateRepository.cs           # Template persistence contract
│   │   ├── Services/
│   │   │   └── PdfGenerationService.cs          # Orchestration service
│   │   └── Exceptions/
│   │       ├── LayoutRenderException.cs         # Layout rendering errors
│   │       ├── InvalidComponentException.cs     # Invalid component errors
│   │       ├── ExpressionEvaluationException.cs # Expression parsing errors
│   │       └── TemplateNotFoundException.cs     # Template not found errors
│   │
│   ├── PDFBuilder.Engine/                       # Layout Engine & Renderers
│   │   ├── LayoutEngine.cs                      # Main layout orchestrator
│   │   ├── Renderers/
│   │   │   ├── Base/
│   │   │   │   ├── IRenderer.cs                 # Renderer interface
│   │   │   │   └── BaseRenderer.cs              # Base renderer with common logic
│   │   │   ├── Containers/                      # Container Components
│   │   │   │   ├── ColumnRenderer.cs            # Vertical stacking
│   │   │   │   ├── RowRenderer.cs               # Horizontal arrangement
│   │   │   │   ├── TableRenderer.cs             # Grid layout
│   │   │   │   ├── LayersRenderer.cs            # Stacked planes
│   │   │   │   ├── DecorationRenderer.cs        # Repeating header/footer
│   │   │   │   ├── InlinedRenderer.cs           # Inline flow layout
│   │   │   │   └── MultiColumnRenderer.cs       # Newspaper columns
│   │   │   ├── Content/                         # Content Components
│   │   │   │   ├── TextRenderer.cs              # Rich text rendering
│   │   │   │   ├── ImageRenderer.cs             # Image rendering
│   │   │   │   ├── LineRenderer.cs              # Divider lines
│   │   │   │   ├── PlaceholderRenderer.cs       # Placeholder boxes
│   │   │   │   ├── HyperlinkRenderer.cs         # Clickable links
│   │   │   │   ├── ListRenderer.cs              # Ordered/unordered lists
│   │   │   │   └── CanvasRenderer.cs            # Custom vector graphics
│   │   │   ├── Styling/                         # Styling Components
│   │   │   │   ├── PaddingRenderer.cs           # Padding wrapper
│   │   │   │   ├── BorderRenderer.cs            # Border wrapper
│   │   │   │   ├── BackgroundRenderer.cs        # Background color
│   │   │   │   ├── RoundedCornersRenderer.cs    # Rounded borders
│   │   │   │   ├── ShadowRenderer.cs            # Drop shadows
│   │   │   │   └── DefaultTextStyleRenderer.cs  # Text style inheritance
│   │   │   ├── Sizing/                          # Sizing Components
│   │   │   │   ├── WidthRenderer.cs             # Width constraints
│   │   │   │   ├── HeightRenderer.cs            # Height constraints
│   │   │   │   ├── AlignmentRenderer.cs         # Content alignment
│   │   │   │   ├── AspectRatioRenderer.cs       # Aspect ratio maintenance
│   │   │   │   ├── ExtendRenderer.cs            # Fill available space
│   │   │   │   ├── ShrinkRenderer.cs            # Minimum size
│   │   │   │   └── UnconstrainedRenderer.cs     # Remove size limits
│   │   │   ├── Transformation/                  # Transformation Components
│   │   │   │   ├── RotateRenderer.cs            # Rotation transform
│   │   │   │   ├── ScaleRenderer.cs             # Scale transform
│   │   │   │   ├── ScaleToFitRenderer.cs        # Auto-scale to fit
│   │   │   │   ├── TranslateRenderer.cs         # Position offset
│   │   │   │   └── FlipRenderer.cs              # Mirror transform
│   │   │   └── FlowControl/                     # Flow Control Components
│   │   │       ├── PageBreakRenderer.cs         # Force new page
│   │   │       ├── EnsureSpaceRenderer.cs       # Minimum space check
│   │   │       ├── ShowEntireRenderer.cs        # Keep together
│   │   │       ├── StopPagingRenderer.cs        # Prevent pagination
│   │   │       ├── SectionRenderer.cs           # Named sections
│   │   │       ├── RepeatRenderer.cs            # Repeat on pages
│   │   │       ├── ShowOnceRenderer.cs          # Show first page only
│   │   │       └── SkipOnceRenderer.cs          # Skip first page
│   │   ├── Services/
│   │   │   ├── ExpressionEvaluator.cs           # Monaco {{ }} expression parsing
│   │   │   ├── StyleResolver.cs                 # Style inheritance resolver
│   │   │   ├── ImageProcessor.cs                # Image loading/caching
│   │   │   └── ComponentRegistry.cs             # Component metadata registry
│   │   ├── Factories/
│   │   │   └── RendererFactory.cs               # Dynamic renderer creation
│   │   └── Extensions/
│   │       └── QuestPdfExtensions.cs            # QuestPDF helper methods
│   │
│   ├── PDFBuilder.Infrastructure/               # Cross-Cutting Concerns
│   │   ├── Configuration/
│   │   │   ├── QuestPdfSettings.cs              # QuestPDF configuration
│   │   │   ├── ExpressionSettings.cs            # Expression evaluator settings
│   │   │   └── StorageSettings.cs               # File storage settings
│   │   ├── Persistence/
│   │   │   ├── ITemplateRepository.cs           # Template repository interface
│   │   │   ├── TemplateRepository.cs            # In-memory/DB template storage
│   │   │   └── TemplateDbContext.cs             # EF Core context (if using DB)
│   │   └── External/
│   │       ├── ImageService.cs                  # External image fetching
│   │       └── FontManager.cs                   # Custom font management
│   │
│   └── PDFBuilder.Validation/                   # Schema & Data Validation
│       ├── Validators/
│       │   ├── LayoutNodeValidator.cs           # Layout tree validation
│       │   ├── ComponentPropertyValidator.cs    # Component property validation
│       │   ├── GeneratePdfRequestValidator.cs   # Request validation
│       │   └── TemplateValidator.cs             # Template validation
│       └── Rules/
│           ├── ValidationRules.cs               # Shared validation rules
│           └── ComponentValidationRules.cs      # Component-specific rules
│
├── tests/
│   ├── PDFBuilder.UnitTests/
│   │   ├── Renderers/
│   │   │   ├── ColumnRendererTests.cs
│   │   │   ├── RowRendererTests.cs
│   │   │   ├── TableRendererTests.cs
│   │   │   └── TextRendererTests.cs
│   │   ├── Services/
│   │   │   ├── ExpressionEvaluatorTests.cs
│   │   │   ├── StyleResolverTests.cs
│   │   │   └── PdfGenerationServiceTests.cs
│   │   ├── Validators/
│   │   │   └── LayoutNodeValidatorTests.cs
│   │   └── PDFBuilder.UnitTests.csproj
│   │
│   ├── PDFBuilder.IntegrationTests/
│   │   ├── API/
│   │   │   ├── PdfControllerTests.cs
│   │   │   └── TemplateControllerTests.cs
│   │   ├── EndToEnd/
│   │   │   └── PdfGenerationEndToEndTests.cs
│   │   └── PDFBuilder.IntegrationTests.csproj
│   │
│   └── PDFBuilder.TestUtilities/                # Shared Test Helpers
│       ├── Builders/
│       │   ├── LayoutNodeBuilder.cs             # Test data builder
│       │   └── RenderContextBuilder.cs          # Context builder
│       ├── Fixtures/
│       │   ├── SampleLayouts.cs                 # Sample layout JSONs
│       │   └── SampleImages.cs                  # Test images
│       └── PDFBuilder.TestUtilities.csproj
│
├── docs/                                        # Documentation
│   ├── ComponentSpecifications.md              # Complete component definitions
│   ├── JsonSchema.md                            # Layout JSON schema spec
│   ├── Architecture.md                          # Architecture overview
│   ├── ExpressionSyntax.md                      # Monaco expression guide
│   └── API.md                                   # API endpoint documentation
│
├── PDFBuilder.sln                               # Solution file
├── .gitignore
├── README.md
├── Directory.Build.props                        # Shared MSBuild properties
└── nuget.config                                 # NuGet package sources
```

---

## Component Specifications

### **Complete Component List (54 Components)**

#### **1. Container/Layout Components (7)**

| Component   | Description                           | QuestPDF API                       |
| ----------- | ------------------------------------- | ---------------------------------- |
| Column      | Vertical stacking with spacing        | `container.Column(col => ...)`     |
| Row         | Horizontal arrangement with spacing   | `container.Row(row => ...)`        |
| Table       | Grid with rows/columns, cell spanning | `container.Table(table => ...)`    |
| Layers      | Stacking planes (background/primary)  | `container.Layers(layers => ...)`  |
| Decoration  | Repeating header/footer with content  | `container.Decoration(dec => ...)` |
| Inlined     | Inline flow (text wrapping)           | `container.Inlined(inline => ...)` |
| MultiColumn | Newspaper-style columns               | `container.Column(col => ...)`     |

#### **2. Content Components (8)**

| Component      | Description                  | QuestPDF API                           |
| -------------- | ---------------------------- | -------------------------------------- |
| Text           | Rich text with styling       | `container.Text("...")`                |
| Image          | Raster and SVG images        | `container.Image(bytes/path)`          |
| Line           | Horizontal/vertical dividers | `container.LineHorizontal(1)`          |
| Placeholder    | Gray box for prototyping     | `container.Placeholder()`              |
| Hyperlink      | Clickable URLs               | `container.Hyperlink("url", c => ...)` |
| List           | Ordered/unordered lists      | Custom implementation                  |
| Canvas         | Custom vector graphics       | `container.Canvas(...)`                |
| QRCode/Barcode | QR/barcode rendering         | Integration component                  |

#### **3. Styling Components (6)**

| Component        | Description                 | QuestPDF API                           |
| ---------------- | --------------------------- | -------------------------------------- |
| Padding          | Spacing around content      | `container.Padding(10)`                |
| Border           | Border with thickness/color | `container.Border(1)`                  |
| Background       | Background color            | `container.Background(color)`          |
| RoundedCorners   | Rounded borders             | `container.Border(1).BorderRadius(5)`  |
| Shadow           | Drop shadow effect          | Custom implementation                  |
| DefaultTextStyle | Text style inheritance      | `container.DefaultTextStyle(x => ...)` |

#### **4. Sizing Components (9)**

| Component              | Description           | QuestPDF API                   |
| ---------------------- | --------------------- | ------------------------------ |
| Width                  | Width constraints     | `container.Width(100)`         |
| Height                 | Height constraints    | `container.Height(50)`         |
| MinWidth               | Minimum width         | `container.MinWidth(100)`      |
| MaxWidth               | Maximum width         | `container.MaxWidth(200)`      |
| MinHeight              | Minimum height        | `container.MinHeight(50)`      |
| MaxHeight              | Maximum height        | `container.MaxHeight(100)`     |
| AlignLeft/Center/Right | Horizontal alignment  | `container.AlignLeft()`        |
| AlignTop/Middle/Bottom | Vertical alignment    | `container.AlignTop()`         |
| AspectRatio            | Maintain aspect ratio | `container.AspectRatio(16/9f)` |
| Extend                 | Fill available space  | `container.Extend()`           |
| Shrink                 | Minimum required size | `container.Shrink()`           |
| Unconstrained          | Remove size limits    | `container.Unconstrained()`    |

#### **5. Transformation Components (5)**

| Component  | Description        | QuestPDF API                  |
| ---------- | ------------------ | ----------------------------- |
| Rotate     | Rotation transform | `container.Rotate(45)`        |
| Scale      | Scale transform    | `container.Scale(1.5f)`       |
| ScaleToFit | Auto-scale to fit  | `container.ScaleToFit()`      |
| Translate  | Position offset    | `container.Translate(10, 20)` |
| Flip       | Mirror transform   | `container.FlipHorizontal()`  |

#### **6. Flow Control Components (8)**

| Component   | Description            | QuestPDF API                 |
| ----------- | ---------------------- | ---------------------------- |
| PageBreak   | Force new page         | `container.PageBreak()`      |
| EnsureSpace | Minimum space check    | `container.EnsureSpace(100)` |
| ShowEntire  | Keep content together  | `container.ShowEntire()`     |
| StopPaging  | Prevent pagination     | `container.StopPaging()`     |
| Section     | Named sections for ToC | `container.Section("name")`  |
| Repeat      | Repeat on every page   | `container.Repeat()`         |
| ShowOnce    | Show first page only   | `container.ShowOnce()`       |
| SkipOnce    | Skip first page        | `container.SkipOnce()`       |

#### **7. Special Components (3)**

| Component        | Description              | QuestPDF API                         |
| ---------------- | ------------------------ | ------------------------------------ |
| ContentDirection | LTR/RTL layout           | `container.ContentFromRightToLeft()` |
| ZIndex           | Layer stacking order     | Custom implementation                |
| DebugArea        | Visual debugging borders | `container.DebugArea("label")`       |

### **Component Implementation Priority**

**Tier 1 - Essential (MVP):**

- Column, Row, Table, Text, Image, Padding, Background, Border, PageBreak

**Tier 2 - Common:**

- Line, Hyperlink, Layers, Decoration, RoundedCorners, AlignLeft/Center/Right, Width, Height

**Tier 3 - Advanced:**

- Shadow, Rotate, Scale, Translate, EnsureSpace, ShowEntire, Section, List, AspectRatio

**Tier 4 - Specialized:**

- MultiColumn, Inlined, Canvas, Flip, StopPaging, Repeat, ShowOnce/SkipOnce, ContentDirection, ZIndex

---

## JSON Schema Example

### **Layout Structure**

```json
{
  "type": "Column",
  "properties": {
    "spacing": 10,
    "visible": "{{ data.showContent }}"
  },
  "children": [
    {
      "type": "Text",
      "properties": {
        "content": "{{ data.title }}",
        "fontSize": 24,
        "fontWeight": "bold",
        "color": "#333333",
        "alignment": "center"
      }
    },
    {
      "type": "Row",
      "properties": {
        "spacing": 20
      },
      "children": [
        {
          "type": "Image",
          "properties": {
            "source": "{{ data.logoUrl }}",
            "width": 100,
            "height": 100
          }
        },
        {
          "type": "Column",
          "properties": {
            "spacing": 5
          },
          "children": [
            {
              "type": "Text",
              "properties": {
                "content": "{{ data.companyName }}",
                "fontSize": 16,
                "fontWeight": "semibold"
              }
            },
            {
              "type": "Text",
              "properties": {
                "content": "{{ data.address }}",
                "fontSize": 12,
                "color": "#666666"
              }
            }
          ]
        }
      ]
    },
    {
      "type": "Table",
      "properties": {
        "columns": [{ "width": 200 }, { "width": 100 }, { "width": 150 }],
        "border": true,
        "borderColor": "#CCCCCC"
      },
      "rows": [
        {
          "cells": [
            {
              "type": "Text",
              "properties": {
                "content": "Coverage Type",
                "fontWeight": "bold"
              }
            },
            {
              "type": "Text",
              "properties": {
                "content": "Limit",
                "fontWeight": "bold"
              }
            },
            {
              "type": "Text",
              "properties": {
                "content": "Premium",
                "fontWeight": "bold"
              }
            }
          ]
        },
        {
          "cells": [
            {
              "type": "Text",
              "properties": {
                "content": "{{ coverage.type }}"
              }
            },
            {
              "type": "Text",
              "properties": {
                "content": "{{ coverage.limit }}"
              }
            },
            {
              "type": "Text",
              "properties": {
                "content": "{{ coverage.premium }}"
              }
            }
          ]
        }
      ]
    },
    {
      "type": "PageBreak"
    },
    {
      "type": "Layers",
      "children": [
        {
          "layer": "background",
          "content": {
            "type": "Text",
            "properties": {
              "content": "Signature: _____________",
              "fontSize": 12
            }
          }
        },
        {
          "layer": "primary",
          "content": {
            "type": "Image",
            "properties": {
              "source": "{{ data.signatureUrl }}",
              "width": 150,
              "height": 50,
              "alignment": "right"
            }
          }
        }
      ]
    }
  ]
}
```

---

## Configuration Files

### **appsettings.json**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "QuestPdf": {
    "DefaultPageSize": "A4",
    "DefaultOrientation": "Portrait",
    "CompressionLevel": "Medium",
    "EnableCaching": true,
    "CacheSizeLimit": 100,
    "MaxImageSize": 10485760
  },
  "Expression": {
    "Evaluator": "DynamicExpresso",
    "MaxComplexity": 100,
    "Timeout": 5000,
    "AllowedFunctions": ["Math.Round", "String.Format", "DateTime.Now"]
  },
  "Storage": {
    "TemplatePath": "./templates",
    "OutputPath": "./output",
    "MaxFileSize": 52428800,
    "AllowedImageFormats": ["png", "jpg", "jpeg", "webp", "svg"]
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001"]
  }
}
```

---

## Next Steps

1. **Set up solution structure** - Create all projects as outlined
2. **Install NuGet packages** - Add dependencies to each project
3. **Document components** - Complete component specifications in `docs/`
4. **Implement Phase 1** - Build layout engine foundation
5. **Create sample layouts** - Build test JSON files
6. **Test end-to-end** - Generate first PDF
7. **Iterate on components** - Add renderers incrementally
8. **Build frontend** - Next.js canvas UI (separate project)

---

## Additional Resources

- [QuestPDF Documentation](./questpdf/)
- [DynamicExpresso](https://github.com/dynamicexpresso/DynamicExpresso)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**This is your complete, production-ready blueprint. Proceed with confidence!**
