# PDF Builder Backend - Development Phases

## Overview

This document outlines the complete development roadmap for the PDF Builder backend, broken down into actionable phases with clear deliverables.

---

## Phase 0: Project Setup & Infrastructure (Week 1, Days 1-2)

### Goals

- Set up the complete solution structure
- Configure all projects with proper references
- Establish database and development environment

### Tasks

- [ ] Create solution and all projects
- [ ] Add all configuration files (Directory.Build.props, Directory.Packages.props, etc.)
- [ ] Configure database connection (SQL Server)
- [ ] Set up EF Core migrations
- [ ] Create initial database schema for Templates
- [ ] Configure Serilog logging
- [ ] Set up CORS for frontend
- [ ] Verify solution builds successfully

### Deliverables

- ✅ Complete solution structure
- ✅ All projects compile
- ✅ Database connection working
- ✅ Basic logging configured

---

## Phase 1: Core Domain & Foundation (Week 1, Days 3-5)

### Goals

- Define core domain models
- Implement basic interfaces
- Create foundational infrastructure

### Tasks

#### Domain Models (PDFBuilder.Core)

- [ ] Create `LayoutNode.cs` - Core layout tree structure
- [ ] Create `ComponentType.cs` - Enum for all 54 component types
- [ ] Create `RenderContext.cs` - Runtime data container for expressions
- [ ] Create `StyleProperties.cs` - Style inheritance model
- [ ] Create `Template.cs` - Template entity

#### Interfaces (PDFBuilder.Core)

- [ ] Define `ILayoutEngine.cs`
- [ ] Define `IComponentRenderer.cs`
- [ ] Define `IExpressionEvaluator.cs`
- [ ] Define `IPdfGenerator.cs`
- [ ] Define `ITemplateRepository.cs`

#### DTOs (PDFBuilder.Contracts)

- [ ] Create `LayoutNodeDto.cs` - JSON schema model
- [ ] Create `GeneratePdfRequest.cs`
- [ ] Create `PdfGenerationResponse.cs`
- [ ] Create AutoMapper profiles for DTO mapping

#### Database (PDFBuilder.Infrastructure)

- [ ] Create `TemplateDbContext.cs`
- [ ] Implement `TemplateRepository.cs`
- [ ] Create initial EF Core migration
- [ ] Seed sample templates (optional)

### Deliverables

- ✅ Complete domain model
- ✅ All core interfaces defined
- ✅ Database schema created
- ✅ DTO models ready

---

## Phase 2: Expression Evaluation System (Week 1, Days 6-7)

### Goals

- Implement Monaco `{{ }}` expression parsing
- Build expression evaluation with DynamicExpresso
- Handle expression errors gracefully

### Tasks

#### Expression Evaluator (PDFBuilder.Engine/Services)

- [ ] Create `ExpressionEvaluator.cs`
- [ ] Implement regex-based `{{ expression }}` pattern extraction
- [ ] Integrate DynamicExpresso for C# expression evaluation
- [ ] Support nested object access: `{{ data.customer.name }}`
- [ ] Support method calls: `{{ data.price.ToString("C") }}`
- [ ] Support conditionals: `{{ data.isActive ? "Yes" : "No" }}`
- [ ] Support math: `{{ data.price * 1.15 }}`
- [ ] Implement expression caching for performance
- [ ] Add comprehensive error handling with helpful messages

#### Validation

- [ ] Create `ExpressionValidator.cs` - Validate expression syntax
- [ ] Prevent unsafe operations (reflection, file system access)
- [ ] Implement expression complexity limits
- [ ] Add timeout protection

#### Testing

- [ ] Unit tests for basic expressions
- [ ] Unit tests for complex nested expressions
- [ ] Unit tests for error cases
- [ ] Performance tests for expression caching

### Deliverables

- ✅ Working expression evaluator
- ✅ Support for all common expression patterns
- ✅ Comprehensive error handling
- ✅ 95%+ test coverage

---

## Phase 3: Layout Engine Core (Week 2, Days 1-3)

### Goals

- Build the layout engine orchestrator
- Implement renderer factory pattern
- Create base renderer infrastructure

### Tasks

#### Layout Engine (PDFBuilder.Engine)

- [ ] Create `LayoutEngine.cs` - Main orchestrator
- [ ] Implement component routing logic (switch/factory pattern)
- [ ] Handle nested component rendering recursively
- [ ] Integrate expression evaluation for all properties
- [ ] Implement style inheritance resolution
- [ ] Add comprehensive logging at each rendering step

#### Renderer Infrastructure (PDFBuilder.Engine/Renderers/Base)

- [ ] Create `IRenderer.cs` interface
- [ ] Create `BaseRenderer.cs` abstract class
  - Common expression evaluation
  - Style resolution
  - Error handling wrapper
  - Logging integration

#### Renderer Factory (PDFBuilder.Engine/Factories)

- [ ] Create `RendererFactory.cs`
- [ ] Implement component type → renderer mapping
- [ ] Use DI to resolve renderer instances
- [ ] Handle unknown component types gracefully

#### Component Registry (PDFBuilder.Engine/Services)

- [ ] Create `ComponentRegistry.cs`
- [ ] Store metadata for all 54 components
- [ ] Provide component validation rules
- [ ] Document required/optional properties

### Deliverables

- ✅ Working layout engine
- ✅ Renderer factory pattern
- ✅ Base infrastructure for all renderers
- ✅ Component registry with metadata

---

## Phase 4: Tier 1 Components - MVP (Week 2, Days 4-7)

### Goals

- Implement essential components for basic PDFs
- Prove end-to-end pipeline works
- Generate first working PDF

### Components to Implement

#### Container Renderers (PDFBuilder.Engine/Renderers/Containers)

- [ ] `ColumnRenderer.cs` - Vertical stacking with spacing
- [ ] `RowRenderer.cs` - Horizontal arrangement with spacing
- [ ] `TableRenderer.cs` - Basic grid layout (no spanning yet)

#### Content Renderers (PDFBuilder.Engine/Renderers/Content)

- [ ] `TextRenderer.cs` - Rich text with font, size, color, alignment
  - Support expression evaluation in content
  - Handle font family, size, weight, style
  - Text alignment (left, center, right, justify)
- [ ] `ImageRenderer.cs` - Raster image rendering
  - Support URL loading (HTTP/HTTPS)
  - Support base64 data URIs
  - Handle image caching
  - Aspect ratio preservation

#### Styling Renderers (PDFBuilder.Engine/Renderers/Styling)

- [ ] `PaddingRenderer.cs` - Uniform and per-side padding
- [ ] `BorderRenderer.cs` - Border with color and thickness
- [ ] `BackgroundRenderer.cs` - Background color fill

#### Flow Control Renderers (PDFBuilder.Engine/Renderers/FlowControl)

- [ ] `PageBreakRenderer.cs` - Force new page

### PDF Generation Service (PDFBuilder.Core/Services)

- [ ] Create `PdfGenerationService.cs`
- [ ] Orchestrate layout → rendering → PDF bytes
- [ ] Handle QuestPDF document configuration
- [ ] Return PDF as byte array or stream

### API Controller (PDFBuilder.API/Controllers)

- [ ] Create `PdfController.cs`
- [ ] Implement `POST /api/pdf/generate` endpoint
- [ ] Accept JSON layout + data
- [ ] Return PDF file

### Testing

- [ ] Integration test: Simple column with text
- [ ] Integration test: Row with images
- [ ] Integration test: Table with data
- [ ] Integration test: Expression evaluation in text
- [ ] End-to-end test: Complete PDF generation

### Deliverables

- ✅ 9 core components working
- ✅ First PDF generated successfully
- ✅ API endpoint functional
- ✅ End-to-end pipeline proven

---

## Phase 5: Tier 2 Components - Common Features (Week 3, Days 1-3)

### Goals

- Add commonly used components
- Enhance layout capabilities
- Improve document structure

### Components to Implement

#### Content Renderers

- [ ] `LineRenderer.cs` - Horizontal/vertical dividers
- [ ] `HyperlinkRenderer.cs` - Clickable links
- [ ] `PlaceholderRenderer.cs` - Prototyping placeholders

#### Container Renderers

- [ ] `LayersRenderer.cs` - Stacked planes (watermarks, overlays)
- [ ] `DecorationRenderer.cs` - Repeating headers/footers

#### Styling Renderers

- [ ] `RoundedCornersRenderer.cs` - Rounded borders
- [ ] `DefaultTextStyleRenderer.cs` - Text style inheritance

#### Sizing Renderers (PDFBuilder.Engine/Renderers/Sizing)

- [ ] `WidthRenderer.cs` - Width constraints (fixed, min, max)
- [ ] `HeightRenderer.cs` - Height constraints
- [ ] `AlignmentRenderer.cs` - Content alignment (9 positions)
  - AlignLeft, AlignCenter, AlignRight
  - AlignTop, AlignMiddle, AlignBottom
  - Corner alignments

### Enhanced Table Renderer

- [ ] Add cell spanning (rowspan, colspan)
- [ ] Implement repeating table headers on page breaks
- [ ] Add table footer support

### Deliverables

- ✅ 11 additional components
- ✅ Enhanced table functionality
- ✅ Style inheritance working
- ✅ Complex layouts supported

---

## Phase 6: Validation & Error Handling (Week 3, Days 4-5)

### Goals

- Implement comprehensive validation
- Provide helpful error messages
- Pre-validate layouts before generation

### Tasks

#### Validators (PDFBuilder.Validation/Validators)

- [ ] Create `LayoutNodeValidator.cs`
  - Validate component types exist
  - Validate required properties present
  - Validate property types correct
  - Validate nested structure
- [ ] Create `ComponentPropertyValidator.cs`
  - Component-specific property validation
  - Value range validation (e.g., width > 0)
- [ ] Create `GeneratePdfRequestValidator.cs`
  - Validate request structure
  - Validate data object structure

#### API Endpoints

- [ ] Create `ValidationController.cs`
- [ ] Implement `POST /api/validation/validate` endpoint
- [ ] Return detailed validation errors with paths

#### Error Handling

- [ ] Create custom exceptions for all error types
- [ ] Implement `ExceptionHandlingMiddleware.cs`
- [ ] Return consistent error responses
- [ ] Log errors with correlation IDs

### Deliverables

- ✅ Validation system working
- ✅ Pre-validation endpoint
- ✅ Helpful error messages
- ✅ Global error handling

---

## Phase 7: Template Management (Week 3, Days 6-7)

### Goals

- CRUD operations for templates
- Template versioning (optional)
- Search and filter templates

### Tasks

#### API Controller (PDFBuilder.API/Controllers)

- [x] Create `TemplateController.cs`
- [x] `GET /api/templates` - List all templates
- [x] `GET /api/templates/{id}` - Get template by ID
- [x] `POST /api/templates` - Create template
- [x] `PUT /api/templates/{id}` - Update template
- [x] `DELETE /api/templates/{id}` - Delete template
- [x] `POST /api/templates/{id}/duplicate` - Duplicate template

#### Repository Implementation

- [x] Complete `TemplateRepository.cs` with all CRUD operations
- [x] Add search/filter capabilities
- [x] Implement soft delete (optional)
- [x] Add template categories/tags (optional)

#### DTOs

- [x] Create `SaveTemplateRequest.cs`
- [x] Create `TemplateResponse.cs`
- [x] Create `TemplateDto.cs`

### Deliverables

- ✅ Complete template CRUD
- ✅ Template persistence to database
- ✅ API endpoints tested

---

## Phase 8: Image Processing & Caching (Week 4, Days 1-2)

### Goals

- Optimize image handling
- Implement caching layer
- Support various image sources

### Tasks

#### Image Service (PDFBuilder.Engine/Services)

- [ ] Enhance `ImageProcessor.cs`
- [ ] Support HTTP/HTTPS URLs
- [ ] Support local file paths
- [ ] Support base64 data URIs
- [ ] Implement image caching (in-memory)
- [ ] Add image format validation
- [ ] Add image size limits
- [ ] Resize/compress images if needed (using ImageSharp)

#### Font Management (PDFBuilder.Infrastructure/External)

- [ ] Create `FontManager.cs`
- [ ] Support custom font loading
- [ ] Font caching
- [ ] Fallback font handling

### Deliverables

- ✅ Optimized image loading
- ✅ Image caching working
- ✅ Support for all image sources
- ✅ Custom fonts supported

---

## Phase 9: Tier 3 Components - Advanced Features (Week 4, Days 3-5)

### Goals

- Add advanced layout capabilities
- Implement transformation components
- Add specialized content types

### Components to Implement

#### Content Renderers

- [ ] `ListRenderer.cs` - Ordered/unordered lists with nesting
- [ ] `QRCodeRenderer.cs` - QR code generation (using QRCoder)
- [ ] `BarcodeRenderer.cs` - Barcode generation (using ZXing.Net)

#### Sizing Renderers

- [ ] `AspectRatioRenderer.cs` - Maintain aspect ratio
- [ ] `ExtendRenderer.cs` - Fill available space
- [ ] `ShrinkRenderer.cs` - Minimum size
- [ ] `UnconstrainedRenderer.cs` - Remove size limits

#### Transformation Renderers (PDFBuilder.Engine/Renderers/Transformation)

- [ ] `RotateRenderer.cs` - Rotation (90° increments and arbitrary angles)
- [ ] `ScaleRenderer.cs` - Proportional scaling
- [ ] `ScaleToFitRenderer.cs` - Auto-scale to fit
- [ ] `TranslateRenderer.cs` - Position offset
- [ ] `FlipRenderer.cs` - Mirror horizontally/vertically

#### Flow Control Renderers

- [ ] `EnsureSpaceRenderer.cs` - Minimum space or new page
- [ ] `ShowEntireRenderer.cs` - Keep content together
- [ ] `SectionRenderer.cs` - Named sections for ToC

#### Styling Renderers

- [ ] `ShadowRenderer.cs` - Drop shadow effect

### Deliverables

- ✅ 15 advanced components
- ✅ QR codes and barcodes working
- ✅ Transformations functional
- ✅ Advanced flow control

---

## Phase 10: Tier 4 Components - Specialized (Week 5, Days 1-2)

### Goals

- Complete the component library
- Add niche/specialized features

### Components to Implement

#### Container Renderers

- [ ] `InlinedRenderer.cs` - Inline flow layout
- [ ] `MultiColumnRenderer.cs` - Newspaper-style columns

#### Content Renderers

- [ ] `CanvasRenderer.cs` - Custom vector graphics

#### Flow Control Renderers

- [ ] `StopPagingRenderer.cs` - Prevent pagination
- [ ] `RepeatRenderer.cs` - Repeat on every page
- [ ] `ShowOnceRenderer.cs` - Show first page only
- [ ] `SkipOnceRenderer.cs` - Skip first page

#### Special Components

- [ ] `ContentDirectionRenderer.cs` - LTR/RTL layout
- [ ] `ZIndexRenderer.cs` - Layer stacking order (custom implementation)
- [ ] `DebugAreaRenderer.cs` - Visual debugging

### Deliverables

- ✅ All 54 components implemented
- ✅ Complete component library
- ✅ Specialized features working

---

## Phase 11: Performance Optimization (Week 5, Days 3-4)

### Goals

- Optimize PDF generation speed
- Reduce memory usage
- Improve caching strategies

### Tasks

#### Performance

- [ ] Profile PDF generation with large documents
- [ ] Optimize expression evaluation caching
- [ ] Optimize image caching strategy
- [ ] Implement lazy loading for large tables
- [ ] Add streaming support for large PDFs
- [ ] Benchmark component rendering times

#### Caching

- [ ] Implement distributed caching (Redis - optional)
- [ ] Cache compiled expressions
- [ ] Cache processed images
- [ ] Cache font data

#### Memory Management

- [ ] Profile memory usage
- [ ] Implement object pooling where beneficial
- [ ] Dispose resources properly
- [ ] Handle large document generation

### Deliverables

- ✅ 50%+ performance improvement
- ✅ Reduced memory footprint
- ✅ Production-ready performance

---

## Phase 12: Testing & Documentation (Week 5, Days 5-7)

### Goals

- Achieve high test coverage
- Complete API documentation
- Write usage guides

### Tasks

#### Unit Tests

- [ ] Test all 54 component renderers
- [ ] Test expression evaluator thoroughly
- [ ] Test validation rules
- [ ] Test error handling
- [ ] Target: 80%+ code coverage

#### Integration Tests

- [ ] Test all API endpoints
- [ ] Test database operations
- [ ] Test PDF generation end-to-end
- [ ] Test with various data scenarios

#### Documentation

- [ ] Complete API documentation (Swagger)
- [ ] Write component usage guide
- [ ] Document expression syntax
- [ ] Create example templates
- [ ] Write deployment guide
- [ ] Document configuration options

#### Sample Templates

- [ ] Create insurance contract template
- [ ] Create invoice template
- [ ] Create report template
- [ ] Create certificate template

### Deliverables

- ✅ 80%+ test coverage
- ✅ Complete documentation
- ✅ Sample templates
- ✅ Deployment guide

---

## Phase 13: Production Readiness (Week 6, Days 1-2)

### Goals

- Prepare for production deployment
- Security hardening
- Performance tuning

### Tasks

#### Security

- [ ] Add authentication/authorization (if needed)
- [ ] Implement rate limiting
- [ ] Add request size limits
- [ ] Sanitize file uploads
- [ ] Security headers configuration
- [ ] SQL injection prevention verification
- [ ] XSS prevention verification

#### Monitoring

- [ ] Configure Application Insights (or similar)
- [ ] Set up health check endpoints
- [ ] Add performance metrics
- [ ] Configure log aggregation
- [ ] Set up alerts for errors

#### Deployment

- [ ] Create Docker container
- [ ] Write docker-compose configuration
- [ ] Create Kubernetes manifests (optional)
- [ ] CI/CD pipeline setup
- [ ] Environment configuration management
- [ ] Database migration strategy

### Deliverables

- ✅ Production-ready application
- ✅ Security hardened
- ✅ Monitoring configured
- ✅ Deployment automation

---

## Phase 14: Frontend Integration Support (Week 6, Days 3-5)

### Goals

- Support Next.js frontend integration
- WebSocket support for real-time preview (optional)
- File upload handling

### Tasks

#### API Enhancements

- [ ] Add CORS configuration for frontend
- [ ] Support file upload for images
- [ ] Add progress reporting for long operations
- [ ] Add WebSocket endpoint for real-time preview (optional)

#### Frontend Support

- [ ] Create TypeScript types for DTOs
- [ ] Generate OpenAPI client for frontend
- [ ] Document frontend integration patterns
- [ ] Create example frontend code

### Deliverables

- ✅ Frontend-ready API
- ✅ TypeScript types
- ✅ Integration examples

---

## Ongoing: Maintenance & Enhancements

### Continuous Tasks

- [ ] Monitor production errors
- [ ] Performance optimization based on usage
- [ ] Add new components as needed
- [ ] Update dependencies regularly
- [ ] Respond to user feedback
- [ ] Security patches

---

## Summary Timeline

| Phase                  | Duration | Key Deliverable              |
| ---------------------- | -------- | ---------------------------- |
| Phase 0: Setup         | 2 days   | Solution structure ready     |
| Phase 1: Foundation    | 3 days   | Core domain models           |
| Phase 2: Expressions   | 2 days   | Expression evaluator working |
| Phase 3: Layout Engine | 3 days   | Engine core complete         |
| Phase 4: Tier 1 (MVP)  | 4 days   | First PDF generated          |
| Phase 5: Tier 2        | 3 days   | Common components            |
| Phase 6: Validation    | 2 days   | Validation system            |
| Phase 7: Templates     | 2 days   | Template management          |
| Phase 8: Images        | 2 days   | Image optimization           |
| Phase 9: Tier 3        | 3 days   | Advanced components          |
| Phase 10: Tier 4       | 2 days   | All components done          |
| Phase 11: Performance  | 2 days   | Optimized for production     |
| Phase 12: Testing      | 3 days   | Comprehensive tests          |
| Phase 13: Production   | 2 days   | Production ready             |
| Phase 14: Frontend     | 3 days   | Frontend integration         |

**Total: ~6 weeks**

---

## Critical Success Factors

1. **Complete Phase 2 (Expressions) early** - Everything depends on this
2. **Prove end-to-end pipeline in Phase 4** - Validates architecture
3. **Don't skip validation** - Saves debugging time later
4. **Test incrementally** - Don't wait until the end
5. **Document as you go** - Much easier than retrofitting

---

## Risk Mitigation

- **Expression complexity** - Start simple, add features incrementally
- **QuestPDF learning curve** - Build simple examples first
- **Performance issues** - Profile early, optimize as needed
- **Scope creep** - Stick to 54 defined components, resist additions
- **Integration challenges** - Design clear API contract upfront

---

**This is your execution roadmap. Follow it sequentially for best results.**
