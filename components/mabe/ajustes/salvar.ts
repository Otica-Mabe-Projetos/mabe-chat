"use server";
/**
 * Grava os ajustes da Mabe — só admin da organização ativa.
 *
 * Mesmo caminho de `definirExigenciaDeMfa` (app/actions/auth/politicaDeMfa.ts):
 * `settings` é jsonb compartilhado com o sistema, então é ler, mesclar só a chave
 * `mabe` e gravar — o resto (IA, marca, visibilidade…) fica intacto.
 */
import { revalidatePath } from "next/cache";

import { audit } from "@/lib/audit";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { supportWriteError } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { ajustesMabeSchema } from "./ajustes";

export type RespostaAjustesMabe = { ok: true } | { ok: false; erro: string };

export async function salvarAjustesMabe(entrada: unknown): Promise<RespostaAjustesMabe> {
  // Server Action é endpoint público: o tipo do parâmetro não chega ao servidor.
  const ajustes = ajustesMabeSchema.safeParse(entrada);
  if (!ajustes.success) return { ok: false, erro: "Confira os campos: algum motivo está vazio ou longo demais." };

  const user = await loadAuthUser();
  if (!user) return { ok: false, erro: "Sua sessão expirou. Entre de novo." };
  if (supportWriteError(user.support)) return { ok: false, erro: "Acompanhamento somente leitura ou encerrado." };
  const org = await resolveActiveOrg(user);
  if (!org) return { ok: false, erro: "Nenhuma empresa ativa." };
  if (org.role !== "admin") return { ok: false, erro: "Só um administrador pode mudar esses ajustes." };

  const admin = createAdminClient();
  const { data: atual, error: erroLeitura } = await admin
    .from("organizations")
    .select("settings")
    .eq("id", org.orgId)
    .maybeSingle();
  if (erroLeitura) return { ok: false, erro: "Não consegui ler a configuração agora." };

  const settings = (atual?.settings ?? {}) as Record<string, unknown>;
  const motivos = [...new Set(ajustes.data.motivos)];
  const novo = { ...settings, mabe: { ...ajustes.data, motivos } };
  const { error } = await admin.from("organizations").update({ settings: novo }).eq("id", org.orgId);
  if (error) return { ok: false, erro: "Não consegui salvar agora." };

  await audit({
    action: "org.branding_updated",
    actorUserId: user.id,
    organizationId: org.orgId,
    resourceType: "organization",
    resourceId: org.orgId,
    metadata: { personalizacao: "visual_mabe", ...novo.mabe },
  });

  // Cores e mesa são decididas no servidor (layout e Inbox).
  revalidatePath("/app", "layout");
  return { ok: true };
}
