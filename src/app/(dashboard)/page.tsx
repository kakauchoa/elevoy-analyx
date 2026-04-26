import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Bem-vindo, {session?.user.name}. Selecione uma conta para visualizar as métricas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">Contas ativas</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">Última sincronização</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">Acessos hoje</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">—</p>
        </div>
      </div>

      <div className="mt-8 bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">
          Adicione uma conta de anúncio em{" "}
          <a href="/contas" className="text-blue-600 hover:underline">
            Contas
          </a>{" "}
          para começar.
        </p>
      </div>
    </div>
  );
}
