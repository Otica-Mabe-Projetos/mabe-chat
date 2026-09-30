/**
 * Configurações › Visual Mabe — personalização da Ótica Mabe (fora do upstream).
 * Liga/desliga o visual e a mesa do atendente da Mabe e ajusta os motivos de
 * conclusão. Os dados moram em `organizations.settings.mabe`
 * (components/mabe/ajustes), chave que nenhuma versão oficial toca.
 */
import { redirect } from "next/navigation";

import { lerAjustesMabe } from "@/components/mabe/ajustes/ler";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { FormularioVisualMabe } from "./_form";

export const metadata = { title: "Visual Mabe" };
export const dynamic = "force-dynamic";

export default async function VisualMabePage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");
  if (activeOrg.role !== "admin") redirect("/403");
  const idioma = user.idioma;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{traduzir("Visual Mabe", idioma)}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {traduzir(
            "A aparência e a mesa de atendimento da Ótica Mabe. Vale para toda a empresa e continua igual depois das atualizações do sistema.",
            idioma,
          )}
        </p>
      </header>
      <FormularioVisualMabe gravado={await lerAjustesMabe(activeOrg.orgId)} />
    </div>
  );
}
