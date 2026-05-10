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

  const isAdmin =
    (await prisma.contaAnuncio.count({
      where: { usuarioId: session.user.id, ativo: true },
    })) > 0;

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        isAdmin={isAdmin}
        userName={session.user.name ?? ""}
        userEmail={session.user.email ?? ""}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
