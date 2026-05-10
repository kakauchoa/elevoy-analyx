"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface SidebarProps {
  isAdmin: boolean;
  userName: string;
  userEmail: string;
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
}

interface NavSection {
  id: string;
  label: string;
  adminOnly?: boolean;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    id: "visaoGeral",
    label: "Visão Geral",
    items: [{ href: "/", label: "Dashboard", icon: <IconGrid /> }],
  },
  {
    id: "clientes",
    label: "Clientes",
    items: [
      { href: "/contas", label: "Contas de Anúncio", icon: <IconStore /> },
      { href: "/acessos", label: "Acessos", icon: <IconEye /> },
    ],
  },
  {
    id: "equipe",
    label: "Equipe",
    adminOnly: true,
    items: [{ href: "/usuarios", label: "Usuários", icon: <IconUsers /> }],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    items: [{ href: "/perfil", label: "Perfil", icon: <IconUser /> }],
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function Sidebar({ isAdmin, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    visaoGeral: true,
    clientes: true,
    equipe: true,
    configuracoes: true,
  });

  function toggleSection(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const initial = userName?.charAt(0).toUpperCase() ?? "?";

  return (
    <aside
      className={`${collapsed ? "w-14" : "w-60"} bg-[#0a0a0a] flex flex-col shrink-0 transition-[width] duration-200 overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-4 border-b border-white/10`}
      >
        {!collapsed && (
          <span className="text-white font-bold text-sm truncate px-1">Elevoy Analyx</span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <IconMenu />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {SECTIONS.map((section) => {
          if (section.adminOnly && !isAdmin) return null;
          const open = openSections[section.id] ?? true;

          return (
            <div key={section.id} className="mb-1">
              {/* Section label — hidden in icon mode */}
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest hover:text-white/50 transition-colors"
                >
                  <span>{section.label}</span>
                  <IconChevron open={open} />
                </button>
              )}

              {/* Items */}
              {(collapsed || open) && (
                <div className="mt-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`mx-2 flex items-center py-2 rounded-lg transition-colors ${
                          collapsed ? "justify-center px-2" : "gap-2.5 px-3"
                        } ${
                          active
                            ? "bg-white text-black"
                            : "text-white/65 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        {!collapsed && (
                          <span className="text-sm font-medium truncate">{item.label}</span>
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
      <div className="border-t border-white/10 p-3">
        {collapsed ? (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="w-full flex justify-center p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <IconLogOut />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-white">{initial}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-white truncate">{userName}</span>
                <span className="text-[10px] text-white/35">{isAdmin ? "Administrador" : "Gestor"}</span>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-left px-3 py-1.5 text-xs text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Sair
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
