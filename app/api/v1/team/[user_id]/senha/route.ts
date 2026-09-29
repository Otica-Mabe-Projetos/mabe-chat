import { requireSupportWrite } from "@/lib/impersonate/support";
/**
 * POST /api/v1/team/[user_id]/senha — o admin define uma senha nova para o membro.
 *
 * Personalização da Ótica Mabe, fora do upstream, par do cadastro direto
 * (`app/api/v1/team/cadastro-direto`): sem e-mail configurado, "Esqueci minha
 * senha" não chega em ninguém, e a saída do VBot é o admin trocar.
 *
 * Guardrails:
 *  - Só admin da organização ativa; a própria senha segue em Configurações › Segurança.
 *  - O alvo tem de ser membro ATIVO desta organização.
 *  - Conta que também está em OUTRA organização, ou que é admin da plataforma, fica de
 *    fora: trocar a senha dela daqui seria entrar por uma porta que este admin não
 *    administra.
 *  - As sessões abertas da pessoa continuam (a admin API não derruba sessão por id).
 *    Para tirar o acesso de verdade, o caminho é "Revogar acesso".
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/api/wrappers";
import { ApiError } from "@/lib/api/types";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { traduzir } from "@/lib/i18n/dicionario";
import { validateRequest } from "@/lib/schemas";
import { trocarSenhaSchema } from "@/lib/schemas/cadastro-direto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ user_id: string }> },
): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const { user_id: alvo } = await ctx.params;

  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const { user: authUser, org: activeOrg } = authz;
  const t = (texto: string) => traduzir(texto, authUser.idioma);

  if (alvo === authUser.id) {
    return fail(
      "state_conflict",
      t("Para trocar a sua própria senha, use Configurações › Segurança."),
      409,
      { requestId },
    );
  }

  let input;
  try {
    input = await validateRequest(trocarSenhaSchema, req);
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
  const { data: vinculos, error: erroVinculos } = await admin
    .from("user_organizations")
    .select("id, organization_id, revoked_at")
    .eq("user_id", alvo);
  if (erroVinculos) return fail("internal_error", erroVinculos.message, 500, { requestId });

  const ativos = (vinculos ?? []).filter((v) => !v.revoked_at);
  const aqui = ativos.find((v) => v.organization_id === activeOrg.orgId);
  if (!aqui) return fail("not_found", t("Membro não encontrado."), 404, { requestId });
  if (ativos.some((v) => v.organization_id !== activeOrg.orgId)) {
    return fail(
      "forbidden",
      t("Essa pessoa também participa de outra empresa. A senha dela só pode ser trocada por ela mesma."),
      403,
      { requestId },
    );
  }

  const { data: donoDaPlataforma, error: erroDono } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", alvo)
    .is("revoked_at", null)
    .maybeSingle();
  if (erroDono) return fail("internal_error", erroDono.message, 500, { requestId });
  if (donoDaPlataforma) {
    return fail(
      "forbidden",
      t("A senha de um administrador da plataforma não é trocada por aqui."),
      403,
      { requestId },
    );
  }

  const { error: erroSenha } = await admin.auth.admin.updateUserById(alvo, {
    password: input.password,
  });
  if (erroSenha) {
    if (erroSenha.code === "weak_password") {
      return fail(
        "validation_error",
        t("Senha fraca demais. Use 8 ou mais caracteres, com letra, número e símbolo."),
        422,
        { requestId },
      );
    }
    return fail("internal_error", erroSenha.message, 500, { requestId });
  }

  await audit({
    action: "auth.password_reset_completed",
    actorUserId: authUser.id,
    organizationId: activeOrg.orgId,
    resourceType: "membership",
    resourceId: aqui.id as string,
    requestId,
    metadata: { via: "admin", target_user_id: alvo },
  });

  return ok({ user_id: alvo }, { requestId });
}
