"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface SidebarProps {
  isAdmin: boolean;
  userName: string;
  userEmail: string;
  permissoes: string[];
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconCheckSquare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function IconStore() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1-5h16l1 5" /><path d="M21 9v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9" />
      <path d="M9 21V9m6 0v12" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLogOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconKanban() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="12" rx="1" />
      <rect x="17" y="3" width="5" height="15" rx="1" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
    </svg>
  );
}

function IconLayout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function IconTrendingUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Section config ─────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  exact?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  adminOnly?: boolean;
  permission?: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    id: "visaoGeral",
    label: "Visão Geral",
    items: [
      { href: "/", label: "Dashboard", icon: <IconGrid />, exact: true },
      { href: "/tarefas", label: "Painel de Tarefas", icon: <IconCheckSquare /> },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    permission: "Clientes",
    items: [
      { href: "/contas", label: "Contas de Anúncio", icon: <IconStore /> },
      { href: "/acessos", label: "Acessos", icon: <IconEye /> },
    ],
  },
  {
    id: "vendas",
    label: "Vendas",
    permission: "Vendas",
    items: [
      { href: "/vendas/pendencias", label: "Pendências", icon: <IconAlert /> },
      { href: "/vendas/crm", label: "CRM", icon: <IconKanban /> },
      { href: "/vendas/prospeccao", label: "Prospecção GMN", icon: <IconSearch /> },
    ],
  },
  {
    id: "equipe",
    label: "Equipe",
    adminOnly: true,
    items: [{ href: "/usuarios", label: "Usuários", icon: <IconUsers /> }],
  },
  {
    id: "ferramentas",
    label: "Ferramentas",
    adminOnly: true,
    items: [
      { href: "/ferramentas", label: "Verificação de Saldo", icon: <IconShield />, exact: true },
      { href: "/ferramentas/rastreamento-whatsapp", label: "Rastreamento WhatsApp", icon: <IconWhatsApp /> },
      { href: "/ferramentas/construtor-dashboard", label: "Construtor de Dashboard", icon: <IconLayout /> },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo",
    adminOnly: true,
    items: [
      { href: "/administrativo/mapa-cliente", label: "Mapa do Cliente", icon: <IconMapPin /> },
      { href: "/administrativo/mapa-evolucao", label: "Mapa de Evolução", icon: <IconTrendingUp /> },
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function Sidebar({ isAdmin, userName, permissoes }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    visaoGeral: false,
    clientes: false,
    vendas: false,
    equipe: false,
    ferramentas: false,
    administrativo: false,
  });
  const [popupAberto, setPopupAberto] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopupAberto(false);
      }
    }
    if (popupAberto) document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [popupAberto]);

  function toggleSection(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(href: string, exact?: boolean) {
    if (exact || href === "/") return pathname === href;
    return pathname.startsWith(href);
  }

  function sectionVisible(section: NavSection): boolean {
    if (isAdmin) return true;
    if (section.adminOnly) return false;
    if (section.permission) return permissoes.includes(section.permission);
    return true;
  }

  const initial = userName?.charAt(0).toUpperCase() ?? "?";

  const [pendenciasCount, setPendenciasCount] = useState(0);

  useEffect(() => {
    fetch("/api/crm/pendencias")
      .then((r) => r.json())
      .then((data: unknown) => {
        const count = Array.isArray(data) ? data.length : 0;
        setPendenciasCount(count);

        if (count === 0) return;
        if (typeof window === "undefined" || !("Notification" in window)) return;
        if (sessionStorage.getItem("notif-pendencias-enviada")) return;

        const mostrar = () => {
          sessionStorage.setItem("notif-pendencias-enviada", "1");
          new Notification("Pendências · Elevoy Analyx", {
            body: `${count} lead${count !== 1 ? "s" : ""} com follow-up atrasado`,
            icon: "/favicon.ico",
          });
        };

        if (Notification.permission === "granted") {
          mostrar();
        } else if (Notification.permission !== "denied") {
          void Notification.requestPermission().then((perm) => {
            if (perm === "granted") mostrar();
          });
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <aside
      className={`${collapsed ? "w-14" : "w-60"} flex flex-col shrink-0 transition-[width] duration-200 overflow-hidden`}
      style={{ backgroundColor: "#e85a23" }}
    >
      {/* Header */}
      <div
        className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-4 border-b border-white/20`}
      >
        {!collapsed && (
          <span className="text-white font-bold text-sm truncate px-1">Elevoy Analyx</span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/15 rounded-lg transition-colors shrink-0"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <IconMenu />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {SECTIONS.map((section) => {
          if (!sectionVisible(section)) return null;
          const open = openSections[section.id] ?? true;
          const visibleItems = section.items.filter(
            (item) => !item.adminOnly || isAdmin
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.id} className="mb-1">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-1 text-[10px] font-semibold text-white/50 uppercase tracking-widest hover:text-white/80 transition-colors"
                >
                  <span>{section.label}</span>
                  <IconChevron open={open} />
                </button>
              )}

              {(collapsed || open) && (
                <div className="mt-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href, item.exact);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`mx-2 flex items-center py-2 rounded-lg transition-colors ${
                          collapsed ? "justify-center px-2" : "gap-2.5 px-3"
                        } ${
                          active
                            ? "bg-white text-[#e85a23]"
                            : "text-white/80 hover:bg-white/15 hover:text-white"
                        }`}
                      >
                        <span className="shrink-0 relative">
                          {item.icon}
                          {item.href === "/vendas/pendencias" && pendenciasCount > 0 && collapsed && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full text-[8px] font-bold text-[#e85a23] flex items-center justify-center leading-none">
                              {pendenciasCount > 9 ? "9+" : pendenciasCount}
                            </span>
                          )}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                            {item.href === "/vendas/pendencias" && pendenciasCount > 0 && (
                              <span className="ml-auto shrink-0 text-[10px] font-bold bg-white text-[#e85a23] rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none">
                                {pendenciasCount}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div ref={popupRef} className="relative border-t border-white/20 p-3">
        {/* Popup de configurações */}
        {popupAberto && !collapsed && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
            <Link
              href="/perfil"
              onClick={() => setPopupAberto(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <IconUser />
              <span>Perfil</span>
            </Link>
            <Link
              href="/configuracoes/meta"
              onClick={() => setPopupAberto(false)}
              className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <IconKey />
              <span>Tokens</span>
            </Link>
            {isAdmin && (
              <Link
                href="/usuarios"
                onClick={() => setPopupAberto(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <IconUsers />
                <span>Usuários</span>
              </Link>
            )}
            <div className="border-t border-gray-100" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <IconLogOut />
              <span>Sair</span>
            </button>
          </div>
        )}

        {collapsed ? (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="w-full flex justify-center p-2 text-white/50 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
          >
            <IconLogOut />
          </button>
        ) : (
          <button
            onClick={() => setPopupAberto((v) => !v)}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/15 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-white">{initial}</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1 text-left">
              <span className="text-xs font-medium text-white truncate">{userName}</span>
              <span className="text-[10px] text-white/60">{isAdmin ? "Administrador" : "Gestor"}</span>
            </div>
            <IconChevron open={popupAberto} />
          </button>
        )}
      </div>
    </aside>
  );
}
