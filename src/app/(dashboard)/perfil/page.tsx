"use client";

import { useEffect, useRef, useState } from "react";
import { Suspense } from "react";

interface StatusGoogle {
  conectado: boolean;
  desde: string | null;
  configurado: boolean;
}

function PerfilContent() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const [statusGoogle, setStatusGoogle] = useState<StatusGoogle | null>(null);
  const [desconectando, setDesconectando] = useState(false);
  const [googleConfigurado, setGoogleConfigurado] = useState<boolean | null>(null);
  const [googleMsg, setGoogleMsg] = useState<"conectado" | "erro" | null>(null);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    void carregarStatusGoogle();
  }, []);

  // Escuta mensagem do popup OAuth do Google
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data.google !== "string") return;
      const status = e.data.google as "conectado" | "erro";
      setGoogleMsg(status);
      popupRef.current = null;
      if (status === "conectado") void carregarStatusGoogle();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function carregarStatusGoogle() {
    const res = await fetch("/api/google/status");
    if (res.ok) {
      const data = (await res.json()) as StatusGoogle;
      setStatusGoogle(data);
      setGoogleConfigurado(data.configurado);
    }
  }

  function conectarGoogle() {
    const largura = 500;
    const altura = 620;
    const left = window.screenX + (window.outerWidth - largura) / 2;
    const top = window.screenY + (window.outerHeight - altura) / 2;
    const popup = window.open(
      "/api/google/auth?popup=1",
      "google-oauth",
      `width=${largura},height=${altura},left=${left},top=${top},scrollbars=yes`
    );
    popupRef.current = popup;
  }

  async function salvar() {
    setErro("");
    setSucesso(false);

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setErro("Todos os campos são obrigatórios.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/usuarios/senha", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha, confirmarSenha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro ao alterar a senha.");
        return;
      }
      setSucesso(true);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } finally {
      setSalvando(false);
    }
  }

  async function desconectarGoogle() {
    setDesconectando(true);
    try {
      await fetch("/api/google/disconnect", { method: "POST" });
      setStatusGoogle((prev) => prev ? { ...prev, conectado: false, desde: null } : null);
    } finally {
      setDesconectando(false);
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configurações da sua conta</p>
      </div>

      {/* Google Calendar */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.5 22h-15A2.5 2.5 0 012 19.5v-12A2.5 2.5 0 014.5 5H6V3.5a.5.5 0 011 0V5h10V3.5a.5.5 0 011 0V5h1.5A2.5 2.5 0 0122 7.5v12a2.5 2.5 0 01-2.5 2.5zM3 10v9.5A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5V10H3z" />
          </svg>
          <h2 className="text-base font-semibold text-gray-900">Google Calendar</h2>
        </div>

        {googleMsg === "conectado" && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Google Calendar conectado com sucesso!
          </p>
        )}
        {googleMsg === "erro" && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            Erro ao conectar com o Google. Tente novamente.
          </p>
        )}

        {googleConfigurado === null ? (
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        ) : !googleConfigurado ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Para ativar, adicione as variáveis de ambiente no EasyPanel:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700 space-y-1">
              <p>GOOGLE_CLIENT_ID=seu-client-id</p>
              <p>GOOGLE_CLIENT_SECRET=seu-client-secret</p>
            </div>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              Criar credenciais no Google Cloud Console
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        ) : statusGoogle?.conectado ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <p className="text-sm text-gray-700">
                Conectado
                {statusGoogle.desde && (
                  <span className="text-gray-400 ml-1">
                    desde {new Date(statusGoogle.desde).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Leads com data de follow-up serão criados automaticamente no seu Google Calendar com lembrete de 30 minutos.
            </p>
            <button
              onClick={() => void desconectarGoogle()}
              disabled={desconectando}
              className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {desconectando ? "Desconectando..." : "Desconectar Google Calendar"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Conecte sua conta Google para criar eventos de follow-up automaticamente no Calendar quando você definir datas nos leads do CRM.
            </p>
            <button
              onClick={conectarGoogle}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e5e5e5] rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Conectar com Google Calendar
            </button>
          </div>
        )}
      </div>

      {/* Alterar senha */}
      <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Alterar senha</h2>

        {erro && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {erro}
          </p>
        )}
        {sucesso && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Senha alterada com sucesso.
          </p>
        )}

        <div className="space-y-3">
          {[
            { label: "Senha atual", value: senhaAtual, setter: setSenhaAtual, placeholder: "" },
            { label: "Nova senha", value: novaSenha, setter: setNovaSenha, placeholder: "Mínimo 6 caracteres" },
            { label: "Confirmar nova senha", value: confirmarSenha, setter: setConfirmarSenha, placeholder: "" },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-[#e5e5e5] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          ))}
        </div>

        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
        >
          {salvando ? "Salvando..." : "Alterar senha"}
        </button>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense>
      <PerfilContent />
    </Suspense>
  );
}
