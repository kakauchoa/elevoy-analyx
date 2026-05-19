import Link from "next/link";

export default function AguardandoAprovacaoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Aguardando aprovação</h1>
        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
          Seu cadastro foi recebido com sucesso. O gestor precisa aprovar seu acesso e
          vincular sua conta antes que você possa entrar no painel.
        </p>
        <p className="text-sm text-gray-400 mt-4">
          Assim que for aprovado, volte aqui e faça login normalmente.
        </p>
        <Link
          href="/crm-cliente/login"
          className="mt-6 inline-block px-6 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Ir para o login
        </Link>
      </div>
    </div>
  );
}
