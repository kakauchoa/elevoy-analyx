import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const [usuario, permissoesRows] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { perfil: true },
    }),
    prisma.usuarioPermissao.findMany({
      where: { usuarioId: session.user.id },
      select: { secao: true },
    }),
  ]);

  const isAdmin = usuario?.perfil === "admin";
  const permissoes = permissoesRows.map((p) => p.secao);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        isAdmin={isAdmin}
        userName={session.user.name ?? ""}
        userEmail={session.user.email ?? ""}
        permissoes={permissoes}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
