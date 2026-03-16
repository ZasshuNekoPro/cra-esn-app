import { auth } from '../../../auth';

export default async function DashboardPage(): Promise<JSX.Element> {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Bonjour, {session?.user.firstName} !
      </h1>
      <p className="text-gray-500">
        Bienvenue sur votre tableau de bord CRA.
      </p>
    </div>
  );
}
