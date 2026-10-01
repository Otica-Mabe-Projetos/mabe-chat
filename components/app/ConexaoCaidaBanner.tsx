/**
 * A conexão caiu — e você vê isso na tela em que já está.
 *
 * ─── Por que uma faixa, se o aviso já vai para a Central ───────────────────
 *
 * Porque a Central é uma tela que se ABRE, e ninguém a abre por acaso. A falha
 * que originou este componente não foi a falta do aviso — foi a falta de alguém
 * para lê-lo: a sessão caiu, o estado foi gravado, e a descoberta aconteceu
 * horas depois, quando o dono estranhou o silêncio e foi olhar por conta própria.
 * Um aviso guardado onde ninguém passa repete exatamente esse defeito.
 *
 * Esta faixa aparece em TODA tela de /app — inclusive no inbox, onde a pessoa
 * está justamente quando as mensagens deveriam estar chegando. É o lugar onde a
 * ausência delas é sentida.
 *
 * ─── Por que não é e-mail ──────────────────────────────────────────────────
 *
 * Seria melhor: chega mesmo com o navegador fechado. Mas `RESEND_API_KEY` é
 * opcional e está VAZIA numa instalação real — e um aviso que depende de env
 * opcional é um aviso que não existe justamente em quem instalou sozinho e não
 * configurou nada. A faixa funciona em toda instalação, sem configurar nada.
 * O e-mail é um acréscimo possível depois; a faixa é o que não pode faltar.
 */
"use client";
// Client de propósito, e a razão não é interatividade: a faixa é renderizada
// pelo layout de /app, que é servidor, mas fica DENTRO do `IdiomaProvider`. Um
// componente de servidor não enxerga contexto de client, então ou ele recebia o
// idioma por prop — mudando a assinatura e todo chamador — ou passa a ser
// client e o lê de onde já está. Ele não faz nada de servidor: é Link e prosa.
import { useAuth } from "@/hooks/auth/AuthProvider";
import { ROLE_RANK } from "@/lib/auth/types";
import type { ConexaoCaida } from "@/lib/channels/health";
// Personalização Ótica Mabe: aviso discreto no canto em vez da faixa no topo.
import { AvisoDeConexao } from "@/components/mabe/visual/AvisoDeConexao";

/**
 * `precisaEscanear` muda o texto do botão, não só a cor: reconectar por QR é uma
 * ação concreta ("Escanear"), enquanto um canal em FAILED exige olhar o que
 * aconteceu antes de agir. Mandar "Escanear" para quem precisa investigar faria
 * a pessoa perder tempo numa tela que não resolve o problema dela.
 */
export function ConexaoCaidaBanner({ caidas }: { caidas: ConexaoCaida[] }) {
  const { user, activeOrg } = useAuth();
  if (caidas.length === 0) return null;

  const podeAbrirConexoes = (user.is_platform_admin && !user.support)
    || (activeOrg !== null && ROLE_RANK[activeOrg.role] >= ROLE_RANK.admin);
  const precisaEscanear = caidas.some((c) => c.status === "SCAN_QR_CODE");
  // Personalização Ótica Mabe: versão discreta (components/mabe/visual/AvisoDeConexao.tsx).
  return <AvisoDeConexao caidas={caidas} podeAbrirConexoes={podeAbrirConexoes} precisaEscanear={precisaEscanear} />;
}
