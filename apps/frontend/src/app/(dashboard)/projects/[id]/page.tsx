import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '../../../../auth';
import { projectsApi } from '../../../../lib/api/projects';
import { ProjectDetailClient } from '../../../../components/projects/ProjectDetailClient';

interface ProjectDetailPageProps {
  params: { id: string };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps): Promise<JSX.Element> {
  const session = await auth();
  if (!session) notFound();

  const [project, comments] = await Promise.all([
    projectsApi.get(params.id).catch(() => null),
    projectsApi.getComments(params.id).catch(() => []),
  ]);

  if (!project) notFound();

  const now = new Date();

  return (
    <div>
      <div className="max-w-4xl mx-auto mb-4">
        <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">
          ← Projets
        </Link>
      </div>
      <ProjectDetailClient
        project={project}
        initialComments={comments}
        userRole={session.user.role}
        currentYear={now.getFullYear()}
        currentMonth={now.getMonth() + 1}
      />
    </div>
  );
}
