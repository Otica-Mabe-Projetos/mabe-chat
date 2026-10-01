import "server-only";

/**
 * Conexão com o ERP da Ótica Mabe (clientes) — personalização Ótica Mabe.
 *
 * A conexão está cadastrada em `external_db_connections` (módulo oficial
 * lib/external-db), com o rótulo `LABEL_DA_CONEXAO`, senha cifrada com
 * AI_CRED_AES_KEY. O usuário do ERP só tem EXECUTE nas funções `mabe_cli_*`.
 *
 * Por que NÃO usamos `abrirAcesso()`: ele recusa quando o módulo oficial
 * `banco_externo` está desligado — e ele fica DESLIGADO de propósito (ligado,
 * mostraria o explorador "Dados externos" a todos). Então montamos as mesmas
 * peças, na mesma ordem: carregar a conexão filtrando a organização →
 * revalidar o destino com a guarda de rede (a mesma checagem que abrirAcesso
 * faz, contra DNS rebinding) → pool → `consultar` (BEGIN READ ONLY + timeouts).
 */
import { carregarConexao } from "@/lib/external-db/credenciais";
import { consultar, obterPool } from "@/lib/external-db/conexao";
import { validarHostDeBanco } from "@/lib/external-db/guardas";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

import type { MotivoErp, ResultadoErp } from "./tipos";

export const LABEL_DA_CONEXAO = "ERP Ótica Mabe (clientes)";

/**
 * Roda `sql` (que devolve uma coluna `r` jsonb) no ERP. `orgId` vem SEMPRE de
 * `resolveActiveOrg` — o admin client ignora RLS, então o filtro por
 * organização aqui é o que impede ler a conexão de outra empresa.
 */
export async function consultarErp<T>(orgId: string, sql: string, params: unknown[]): Promise<ResultadoErp<T>> {
  const admin = createAdminClient();
  const { data: linha, error } = await admin
    .from("external_db_connections")
    .select("id")
    .eq("organization_id", orgId)
    .eq("label", LABEL_DA_CONEXAO)
    .maybeSingle<{ id: string }>();
  if (error) return { ok: false, motivo: "indisponivel" };
  if (!linha) return { ok: false, motivo: "sem_conexao" };

  const leitura = await carregarConexao(admin, orgId, linha.id);
  if (!leitura.ok) {
    const motivo: MotivoErp =
      leitura.motivo === "nao_encontrada"
        ? "sem_conexao"
        : leitura.motivo === "desativada"
          ? "conexao_desativada"
          : leitura.motivo === "cifra_indisponivel"
            ? "cifra_indisponivel"
            : "indisponivel";
    return { ok: false, motivo };
  }

  const alvo = await validarHostDeBanco(leitura.conexao.host);
  if (!alvo.ok) return { ok: false, motivo: "host_bloqueado" };

  try {
    const res = await consultar<{ r: T }>(obterPool(leitura.conexao), sql, params);
    return { ok: true, valor: res.rows[0]?.r as T };
  } catch (err) {
    const code = (err as { code?: string }).code ?? null;
    // Só o código: a mensagem do Postgres pode ecoar o termo buscado (nome/CPF).
    logger.warn("[mabe.erp] consulta falhou", { code });
    if (code === "42501") return { ok: false, motivo: "sem_permissao" };
    if (code === "57014") return { ok: false, motivo: "lento" };
    return { ok: false, motivo: "indisponivel" };
  }
}
