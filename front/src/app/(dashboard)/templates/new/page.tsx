import { redirect } from "next/navigation";

export default function NewTemplatePage() {
  // For now, redirect to the builder with a new template ID
  // In Phase 6, this will create a new template via API and redirect
  redirect("/builder/new");
}
