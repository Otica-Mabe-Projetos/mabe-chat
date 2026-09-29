import { requireSupportWrite } from "@/lib/impersonate/support";
/**
 * POST /api/v1/team/cadastro-direto — o admin cria o membro já com senha.
 *
 * Personalização da Ótica Mabe, fora do upstream (ver `lib/schemas/cadastro-direto.ts`).
 * O vínculo nasce pelo MESMO caminho do convite aceito (`fn_accept_team_invite`,
 * como em `lib/auth/aplicar-convite.ts`), então papel, interface e as travas do
 * banco valem igual às de quem entra por convite.
 *
 * Guardrails:
 *  - Só admin da organização ativa (requireRole) e nunca sessão de suporte sem escrita.
 *  - E-mail que já tem conta é recusado: senha de conta existente não se troca por aqui.
 *  - Se o vínculo falhar, a conta recém-criada é apagada, para não sobrar conta órfã
 *    prendendo o e-mail.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/api/wrappers";
import { ApiError } from "@/lib/api/types";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { traduzir } from "@/lib/i18n/dicionario";
import { INTERFACE_COMPLETA } from "@/lib/navigation/interface";
import { validateRequest } from "@/lib/schemas";
import { cadastroDiretoSchema } from "@/lib/schemas/cadastro-direto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const { user: authUser, org: activeOrg } = authz;
  const t = (texto: string) => traduzir(texto, authUser.idioma);

  let input;
  try {
    input = await validateRequest(cadastroDiretoSchema, req);
  } catch (err) {
    if (err instanceof ApiError) {
      return fail(err.code, err.message, err.status, {
        details: err.details as Record<string, unknown> | undefined,
        requestId,
      });
    }
    throw err;
  }

  const admin = createAdminClient();
  const { data: criado, error: erroConta } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    // Quem cadastra é o admin, pela tela: não há e-mail a confirmar, e a pessoa
    // entra na hora com o e-mail e a senha que recebeu.
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });
  if (erroConta || !criado?.user) {
    // `email_exists` é o código do GoTrue atual; versões anteriores só diziam 422
    // com "already been registered" (mesma leitura de `lib/auth/provision.ts`).
    const jaExiste =
      erroConta?.code === "email_exists" ||
      (erroConta?.status === 422 && /already (been )?registered/i.test(erroConta.message));
    if (jaExiste) {
      return fail(
        "state_conflict",
        t("Esse e-mail já tem conta. Para colocá-lo na empresa, use “Convidar membros”."),
        409,
        { requestId },
      );
    }
    if (erroConta?.code === "weak_password") {
      return fail(
        "validation_error",
        t("Senha fraca demais. Use 8 ou mais caracteres, com letra, número e símbolo."),
        422,
        { requestId },
      );
    }
    return fail("internal_error", erroConta?.message ?? "createUser sem usuário", 500, { requestId });
  }
  const novoId = criado.user.id;

  const agora = new Date().toISOString();
  const { data: vinculo, error: erroVinculo } = await admin.rpc("fn_accept_team_invite", {
    p_user: novoId,
    p_org: activeOrg.orgId,
    p_role: input.role,
    p_invited_by: authUser.id,
    p_issued_at: agora,
    p_invited_at: agora,
    p_interface_settings: INTERFACE_COMPLETA,
  });
  if (erroVinculo || !vinculo?.id) {
    await admin.auth.admin.deleteUser(novoId);
    return fail("internal_error", erroVinculo?.message ?? "vínculo não criado", 500, { requestId });
  }

  // Um convite pendente para o mesmo e-mail deixa de aparecer como "Pendente" na aba
  // Membros, igual ao fechamento que `aplicarConvite` faz.
  await admin
    .from("team_invites")
    .update({ accepted_at: agora, accepted_by: novoId })
    .eq("organization_id", activeOrg.orgId)
    .eq("email", input.email)
    .is("accepted_at", null)
    .is("revoked_at", null);

  await audit({
    action: "member.accepted",
    actorUserId: authUser.id,
    organizationId: activeOrg.orgId,
    resourceType: "membership",
    resourceId: vinculo.id as string,
    requestId,
    metadata: { via: "cadastro_direto", target_user_id: novoId, role: input.role },
  });

  return ok({ user_id: novoId, membership_id: vinculo.id as string }, { status: 201, requestId });
}
