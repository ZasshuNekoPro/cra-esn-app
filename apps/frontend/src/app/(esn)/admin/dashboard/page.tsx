export default function AdminDashboardPage(): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Tableau de bord ESN</h1>
      <p className="text-sm text-gray-500 mb-8">Vue d'ensemble de l'activité</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-500">Salariés actifs</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-500">Missions en cours</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-500">CRA en attente de validation</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
        </div>
      </div>
    </div>
  );
}
