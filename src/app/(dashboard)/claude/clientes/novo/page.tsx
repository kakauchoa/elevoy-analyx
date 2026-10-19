import { redirect } from "next/navigation";
import { sessaoAdmin } from "@/lib/claude-relatorios";
import { FICHA_VAZIA } from "@/lib/claude-clientes";
import { FichaClienteForm } from "@/components/claude/FichaClienteForm";

export const dynamic = "force-dynamic";

export default async function NovoClienteClaudePage() {
  if (!(await sessaoAdmin())) redirect("/");
  return <FichaClienteForm inicial={FICHA_VAZIA} />;
}
