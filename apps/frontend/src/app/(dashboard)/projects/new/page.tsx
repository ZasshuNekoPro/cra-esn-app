import { missionsApi } from '../../../../lib/api/missions';
import { NewProjectForm } from './NewProjectForm';

export default async function NewProjectPage(): Promise<JSX.Element> {
  const missions = await missionsApi.list().catch(() => []);
  const activeMissions = missions.filter((m) => m.isActive);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nouveau projet</h1>
        <p className="text-sm text-gray-500 mt-1">Créez un projet lié à une de vos missions actives.</p>
      </div>
      <NewProjectForm missions={activeMissions} />
    </div>
  );
}
