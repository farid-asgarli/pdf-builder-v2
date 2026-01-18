import Link from "next/link";
import {
  FileText,
  Layers,
  Palette,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <FileText className="text-primary h-6 w-6" />
            <span className="text-xl font-bold">PDF Builder</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/templates"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Templates
            </Link>
            <Button asChild>
              <Link href="/builder/new">New Template</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-8 px-4 py-24 text-center sm:px-6 md:py-32 lg:px-8">
          <div className="flex flex-col items-center gap-6">
            <div className="bg-muted/50 inline-flex items-center rounded-full border px-4 py-1.5 text-sm">
              <span className="text-muted-foreground">Powered by QuestPDF</span>
              <ArrowRight className="ml-2 h-3 w-3" />
            </div>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Build PDF Templates
              <br />
              <span className="from-primary to-primary/60 bg-linear-to-r bg-clip-text text-transparent">
                Visually
              </span>
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg md:text-xl">
              Create beautiful insurance contracts and documents with our
              no-code, drag-and-drop PDF template builder. No coding required.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/builder/new">
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/templates">View Templates</Link>
            </Button>
          </div>

          {/* Quick Benefits */}
          <div className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>No coding required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Real-time preview</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span>Export to PDF</span>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-muted/30 border-t py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Powerful Features
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">
                Everything you need to create professional PDF documents
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Layers className="h-8 w-8" />}
                title="Drag & Drop Builder"
                description="Build complex PDF layouts with an intuitive canvas-based editor. No coding required."
              />
              <FeatureCard
                icon={<Palette className="h-8 w-8" />}
                title="54+ Components"
                description="Choose from a rich library of layout, content, styling, and transformation components."
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8" />}
                title="Real-time Preview"
                description="See your changes instantly with live PDF preview powered by QuestPDF."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Create your first PDF template in minutes
            </p>
            <div className="mt-8">
              <Button size="lg" asChild>
                <Link href="/builder/new">
                  Create Your First Template
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row lg:px-8">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span>
              &copy; {new Date().getFullYear()} PDF Builder. All rights
              reserved.
            </span>
          </div>
          <div className="flex gap-6">
            <Link
              href="/docs"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="/api"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
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
    <div className="group bg-background relative overflow-hidden rounded-xl border p-8 shadow-sm transition-all hover:shadow-md">
      <div className="bg-primary/10 text-primary mb-4 inline-flex rounded-lg p-3">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
