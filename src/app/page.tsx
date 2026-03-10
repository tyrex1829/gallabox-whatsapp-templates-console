import TemplateDashboard from '@/components/template-dashboard';
import { fetchTemplates } from '@/lib/gallabox';

export default async function Home() {
  const templates = await fetchTemplates();

  return (
    <main>
      <TemplateDashboard templates={templates} />
    </main>
  );
}
