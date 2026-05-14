import { auth } from '../../../../auth';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@esn/shared-types';
import { missionsApi } from '../../../../lib/api/missions';
import { documentsApi } from '../../../../lib/api/documents';
import { MissionDocspacePanel } from '../../../../components/documents/MissionDocspacePanel';

interface PageProps {
  params: Promise<{ missionId: string }>;
}

export default async function MissionDocspacePage({ params }: PageProps): Promise<JSX.Element> {
  const session = await auth();
  if (!session || session.user.role !== Role.EMPLOYEE) {
    redirect('/dashboard');
  }

  const { missionId } = await params;

  const [mission, documents] = await Promise.all([
    missionsApi.findOne(missionId).catch(() => null),
    documentsApi.list({ missionId }).catch(() => []),
  ]);

  if (!mission) notFound();

  const isEmployeeOnMission =
    mission.employeeId === session.user.id ||
    mission.employees.some((e) => e.id === session.user.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <a
          href="/documents"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Documents
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900 truncate">{mission.title}</h1>
      </div>

      <MissionDocspacePanel
        missionId={missionId}
        missionTitle={mission.title}
        initialDocuments={documents}
        ragEnabled={mission.ragEnabled}
        isEmployeeOnMission={isEmployeeOnMission}
      />
    </div>
  );
}
