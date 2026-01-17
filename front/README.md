# PDF Builder Frontend

Visual, no-code PDF template builder for creating insurance contracts and documents using a Figma-like interface.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State Management**: Zustand + Immer
- **API Client**: Axios + TanStack React Query
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
NEXT_PUBLIC_ALLOWED_IMAGE_FORMATS=png,jpg,jpeg,webp,svg
NEXT_PUBLIC_DEBUG=true
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Protected routes
│   │   ├── builder/        # Canvas builder
│   │   └── templates/      # Template management
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/             # React components
│   ├── builder/            # Canvas builder components (Phase 3-5)
│   ├── common/             # Common reusable components
│   ├── templates/          # Template management components (Phase 9)
│   ├── monaco/             # Monaco editor components (Phase 5)
│   └── ui/                 # shadcn/ui components
├── config/                 # Configuration files
│   ├── api.ts              # API configuration
│   ├── monaco.ts           # Monaco editor config
│   └── site.ts             # Site metadata
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities and libraries
│   ├── api/                # API client (Axios)
│   └── utils.ts            # Utility functions
├── store/                  # Zustand stores
│   ├── canvas-store.ts     # Canvas state
│   ├── selection-store.ts  # Selection state
│   ├── history-store.ts    # Undo/redo
│   ├── preview-store.ts    # PDF preview state
│   └── template-store.ts   # Template metadata
└── types/                  # TypeScript types
    ├── api.ts              # API types
    ├── canvas.ts           # Canvas types
    ├── component.ts        # Component types (54 types)
    └── template.ts         # Template types
```

## Available Scripts

```bash
# Development
npm run dev           # Start development server

# Build
npm run build         # Build for production
npm run start         # Start production server

# Code Quality
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint errors
npm run format        # Format with Prettier
npm run format:check  # Check formatting
npm run type-check    # TypeScript type checking
```

## Development Phases

This project follows a phased development approach:

- **Phase 0**: ✅ Project Setup (Current)
- **Phase 1**: Component Metadata System
- **Phase 2**: State Management Foundation
- **Phase 3**: Component Palette & Tree
- **Phase 4**: Canvas Core
- **Phase 5**: Properties Panel
- **Phase 6**: Backend Integration
- **Phase 7**: PDF Preview Panel
- **Phase 8**: Advanced Canvas Features
- **Phase 9**: Template Management UI
- **Phase 10**: Data Context & Test Data
- **Phase 11**: Tier 2 & 3 Components
- **Phase 12**: Polish & UX Improvements
- **Phase 13**: Performance Optimization
- **Phase 14**: Testing & Documentation

See [FRONT-DEVELOPMENT-PHASES.md](./docs/FRONT-DEVELOPMENT-PHASES.md) for detailed documentation.

## Backend Integration

The frontend expects a backend API running at `http://localhost:5000` with the following endpoints:

- `POST /api/pdf/generate` - Generate PDF from layout
- `POST /api/validation/validate` - Validate layout
- `GET/POST/PUT/DELETE /api/templates` - Template CRUD

## License

Private - All rights reserved.
