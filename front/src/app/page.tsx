import Link from "next/link";
import { FileText, Layers, Palette, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">PDF Builder</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/templates"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Templates
            </Link>
            <Link
              href="/builder/new"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              New Template
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container flex flex-col items-center justify-center gap-8 py-24 text-center md:py-32">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Build PDF Templates
              <br />
              <span className="text-primary">Visually</span>
            </h1>
            <p className="max-w-150 text-lg text-muted-foreground md:text-xl">
              Create beautiful insurance contracts and documents with our
              no-code, drag-and-drop PDF template builder. No coding required.
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/builder/new"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Start Building
            </Link>
            <Link
              href="/templates"
              className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              View Templates
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-16 md:py-24">
          <div className="container">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">
              Powerful Features
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <FeatureCard
                icon={<Layers className="h-10 w-10" />}
                title="Drag & Drop Builder"
                description="Build complex PDF layouts with an intuitive canvas-based editor. No coding required."
              />
              <FeatureCard
                icon={<Palette className="h-10 w-10" />}
                title="54+ Components"
                description="Choose from a rich library of layout, content, styling, and transformation components."
              />
              <FeatureCard
                icon={<Zap className="h-10 w-10" />}
                title="Real-time Preview"
                description="See your changes instantly with live PDF preview powered by QuestPDF."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PDF Builder. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link
              href="/docs"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Documentation
            </Link>
            <Link
              href="/api"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              API
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border bg-background p-6 text-center shadow-sm">
      <div className="text-primary">{icon}</div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
