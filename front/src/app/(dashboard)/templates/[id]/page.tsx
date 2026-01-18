import { notFound } from "next/navigation";

interface TemplateDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TemplateDetailPage({
  params,
}: TemplateDetailPageProps) {
  const { id } = await params;

  // TODO: Fetch template by ID from API in Phase 6
  // For now, just show the ID
  if (!id) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Template: {id}</h1>
      <p className="text-muted-foreground">
        Template details will be displayed here.
      </p>
      {/* TODO: Add template detail/edit view */}
    </div>
  );
}
