/**
 * GET /api/v1/mabe/clientes/por-conversa?conversa=<uuid> — personalização Ótica Mabe.
 *
 * O cartão "Cliente da ótica" do painel da mesa: quem é, na base do ERP, o dono
 * do telefone desta conversa. A conversa e o contato são lidos com a SESSÃO de
 * quem pede (RLS e a trava por loja de supabase/mabe/lojas.sql valem: conversa
 * que a pessoa não vê é 404). Só leitura — sem requireSupportWrite.
 */
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { lerLojas } from "@/components/mabe/lojas/ler";
import { lojaPorCodigo, rotuloDaLoja } from "@/components/mabe/lojas/lojas";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { clientesPorTelefone } from "@/lib/mabe/erp/clientes";
import { mensagemDoMotivo, type ClienteDaConversa } from "@/lib/mabe/erp/tipos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Contato = { phone_number: string | null; is_anonymized: boolean | null };

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "cliente_erp" });
  if (!authz.ok) return authz.response;

  const id = z.string().uuid().safeParse(req.nextUrl.searchParams.get("conversa"));
  if (!id.success) return fail("validation_error", "Conversa inválida.", 422, { requestId });

  const db = await createClient();
  const { data, error } = await db
    .from("conversations")
    .select("id, is_group, contacts:contact_id (phone_number, is_anonymized)")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id.data)
    .maybeSingle();
  if (error) return fail("internal_error", "Não consegui ler a conversa.", 500, { requestId });
  if (!data) return fail("not_found", "Conversa não encontrada.", 404, { requestId });

  const bruto = (data as { contacts: Contato | Contato[] | null }).contacts;
  const contato = Array.isArray(bruto) ? (bruto[0] ?? null) : bruto;
  // Grupo e contato anonimizado (LGPD) não são procurados na base da ótica.
  if (data.is_group || contato?.is_anonymized || !contato?.phone_number) {
    return ok({ clientes: [] as ClienteDaConversa[] }, { requestId });
  }

  const [r, cfg] = await Promise.all([clientesPorTelefone(contato.phone_number), lerLojas(authz.org.orgId)]);
  if (!r.ok) {
    if (r.motivo === "entrada_invalida") return ok({ clientes: [] as ClienteDaConversa[] }, { requestId });
    return fail("upstream_unavailable", mensagemDoMotivo(r.motivo), 503, { requestId });
  }

  const clientes: ClienteDaConversa[] = r.valor.map((c) => {
    const loja = lojaPorCodigo(cfg, c.loja);
    return { ...c, loja_rotulo: loja ? rotuloDaLoja(loja) : c.loja };
  });
  return ok({ clientes }, { requestId });
}
