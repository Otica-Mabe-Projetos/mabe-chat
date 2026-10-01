# Especificação — "Clientes da ótica" (CRM com a base do ERP) no Mabe Chat

Personalização Ótica Mabe, 01/10/2026. Decisões do Paulo: **todos os membros veem todos os clientes**;
**CPF e valores completos**. O André autorizou a leitura.

## 1. De onde vêm os dados (já pronto, NÃO mexer)

- O ERP (outro Supabase) tem funções só-leitura `public.mabe_cli_*`. O Mabe Chat se conecta com o
  usuário `mabe_chat_leitura`, que **só** tem EXECUTE nessas 4 funções (ler tabela = erro 42501).
- A conexão está gravada em `public.external_db_connections` (módulo oficial `lib/external-db`), label
  **`ERP Ótica Mabe (clientes)`**, org única, senha cifrada com `AI_CRED_AES_KEY`. Host = pooler do
  Supabase (o endereço direto é só IPv6 e o servidor não alcança).
- O módulo oficial `banco_externo` fica **DESLIGADO de propósito** (ligar mostraria o explorador "Dados
  externos" a todos). Por isso NÃO use `abrirAcesso()` (ele recusa com módulo desligado). Use as peças:
  `carregarConexao(admin, orgId, id)` (lib/external-db/credenciais.ts) → `validarHostDeBanco` (guardas.ts,
  mesma checagem que abrirAcesso faz) → `obterPool(conexao)` → `consultar(pool, sql, params)`
  (conexao.ts: BEGIN READ ONLY + timeouts). Ache o `id` por `organization_id` + label. Comente o porquê.
- A lista/painel vêm de uma view materializada recalculada de hora em hora (campo `atualizado_em`);
  a ficha é ao vivo.

## 2. Contrato das funções (todas devolvem `jsonb`)

### `select public.mabe_cli_painel() as r`
```
{ atualizado_em: timestamptz, total: int,
  lojas: [{ loja: "L01".."L15" | null (=sem loja), clientes, compradores, ativos_12m, sem_compra_12m,
            novos_30d, os_abertas, os_prontas, aniversariantes_mes, total_gasto, ticket_medio }] }
```
É a consulta mais pesada (~0,3 s no banco, alguns segundos pela rede fria): cache de processo de 5 min.

### `select public.mabe_cli_buscar($1,$2,$3,$4,$5,$6) as r`
Parâmetros: termo (nome, ou ≥3 dígitos = CPF/telefone; null = todos), loja (`L01`..`L15`,
`sem_loja`, ou null), filtro (`todos|os_abertas|prontas|aniversariantes|sem_compra_12m|ativos_12m|novos_30d|sem_compra`),
ordem (`recentes|gasto|nome|compras`), limite (1..200), offset.
```
{ total, limite, offset,
  itens: [{ cpf, nome, telefone1, telefone2, telefone3, bairro, cidade, estado, data_nascimento (date),
            loja_original (código do sistema antigo), cadastrado (bool: está no cadastro de clientes),
            loja ("L01".. | null), compras, total_gasto, primeira_compra, ultima_compra, os_abertas,
            os_prontas, gerado_em }] }
```

### `select public.mabe_cli_por_telefone($1) as r`
Telefone em qualquer formato. Devolve **array** de itens no mesmo formato acima (pode ter >1 CPF no
mesmo telefone: família). `[]` se ninguém.

### `select public.mabe_cli_ficha($1) as r`  (CPF com ou sem máscara; null se vazio)
```
{ cadastro: { cpf, nome, telefone1..3, endereco, bairro, cidade, estado, cep, data_nascimento,
              loja_original, observacao, origem, created_at } | null,   // null = só existe nas OS
  resumo: (mesmo formato de item da busca) | null,
  compras_antigas: [{ data, loja, loja_codigo_antigo, valor, codigo, observacao, cancelada }],
  os: [{ numero, loja, loja_nome, entrada, previsao, status_index (0..4), status_em, cancelado,
         valor_total, valor_entrada, servico, tipo_lente, nome_lente, faixa_lente, laboratorio, tecnico,
         pendencia, meio_contato, indicacao_otica, armacao_origem, eh_garantia,
         garantia: {origem,setor,descricao,comentario,armacao}|null, ocorrencia_aberta,
         pos_venda: {status, nota, contato_4d, nota_4d, contato_30d, nota_30d},
         renegociacao: {status, nota, proximo_contato}|null,
         armacao: {marca, modelo, referencia, cor, categoria}|null,
         receita: { od_esf_longe, od_cilindrico, od_eixo, od_adicao, od_esf_perto, od_prisma, od_prisma_valor,
                    od_prisma_base, oe_esf_longe, oe_cilindrico, oe_eixo, oe_adicao, oe_esf_perto, oe_prisma,
                    oe_prisma_valor, oe_prisma_base, dnp_od, dnp_oe, altura_od, altura_oe, created_at } | null,
         produtos: [{nome, valor}], pagamentos: [{data, forma, parcelas, valor}],
         historico: [{status_index, em, nota}], ocorrencias: [{motivo, descricao, resolvida, em}],
         contatos_pos_venda: [{tipo, status, nota, em}], nps: {nota, motivos, comentario, em}|null }],
  contatos_crm: [{ status, nota, proximo_contato, em }],
  orcamentos: [{ em, loja, descricao, valor_estimado, validade, status, motivo_perda, convertido_em }],
  indicacoes_feitas: [{ em, loja, recompensa, pago, pago_em }] }
```
Rótulos do ERP (copiar para um arquivo nosso):
- status da OS (índice): 0 Recebido · 1 Aguardando lente · 2 Em montagem · 3 Pronta para retirada · 4 Entregue
- `pos_venda.status`: ligado=Ligado, sem_resposta=Sem resposta, confirmado=Confirmado
- `renegociacao.status`: contatado, renegociado, sem_resposta
- `contatos_crm.status`: contatado, nao_atendeu=Não atendeu, numero_incorreto=Número incorreto,
  nao_quer_contato=Não quer contato, respondeu, objecao=Objeção, agendado, convertido
- formas de pagamento: pix, cartao_credito, cartao_debito, dinheiro, ume (crediário UME), link
- Lojas: usar `lojaPorCodigo`/`rotuloDaLoja` de `components/mabe/lojas/lojas.ts` (L01..L15 já cadastradas).

## 3. O que construir (tudo em arquivos nossos)

1. `lib/mabe/erp/` — conexão (item 1) + wrappers tipados `painelDeClientes()`, `buscarClientes()`,
   `clientesPorTelefone()`, `fichaDoCliente()`; entradas validadas com Zod; erros viram resultado
   `{ ok:false, motivo }` (nunca 500 cru na tela). `server-only`. Só membros autenticados da org
   ativa (mesma resolução de org/sessão que as telas oficiais usam — `getUser()`, nunca `getSession()`).
2. Auditoria (LGPD): abrir a ficha registra 1 linha no audit log oficial (procure o helper em `lib/audit`),
   ação nova tipo `mabe.cliente_erp.ficha`, alvo = CPF. Sem dado do cliente no payload além do CPF.
3. Tela **Clientes da ótica** `app/app/clientes-otica/page.tsx` (+ `_client.tsx` se precisar):
   - topo: total, compradores, ativos 12 meses, OS em andamento, prontas para retirada, aniversariantes do
     mês, e "atualizado às HH:MM";
   - grade de lojas (cartão por L01..L15 + "Sem loja") com clientes, ativos 12m, OS abertas, prontas,
     ticket médio, total gasto — clicar filtra a lista;
   - busca única (nome, CPF ou telefone), chips de filtro (os valores do item 2), ordem, paginação;
   - estado na URL (`?q=&loja=&filtro=&ordem=&pagina=`), para dar F5/compartilhar;
   - tabela: nome, CPF formatado, telefone, loja (rótulo L##), cidade, compras, total gasto, última compra
     (data + "há X meses"), badges OS abertas / pronta p/ retirada / aniversário no mês; clique → ficha.
4. **Ficha** `app/app/clientes-otica/[cpf]/page.tsx`: cabeçalho (nome, CPF, telefones com botão
   "Conversar" que abre a nova conversa oficial com o número — veja `components/inbox/NovaConversa.tsx`
   e como a mesa abre conversa por número; se não houver jeito limpo, link `/app/inbox?...` documentado),
   endereço, nascimento + idade, loja, cliente desde, nº de compras, total gasto, ticket; seções:
   OS (linha do tempo de status 0→4, valores, entrada, saldo, lente, armação, laboratório, previsão,
   pagamentos, histórico, pós-venda 4d/30d, NPS, ocorrências, garantia, renegociação, produtos),
   **Receita** (a mais recente em destaque: tabela OD/OE esférico/cilíndrico/eixo/adição + DNP/altura,
   com data; anteriores recolhidas), compras antigas (tabela), orçamentos, contatos de CRM, indicações.
   Estados vazio/erro/carregando caprichados. Moeda pt-BR, datas dd/mm/aaaa.
5. **Cartão na conversa**: em `components/mabe/atendimento/PainelDoCliente.tsx` (painel direito da
   mesa), seção "Cliente da ótica": rota nossa `app/api/v1/mabe/clientes/por-conversa/route.ts` recebe
   o id da conversa, lê a conversa/contato **com a sessão do usuário** (RLS e trava por loja valem),
   pega o telefone do contato e chama `clientesPorTelefone`. Mostra: nome no ERP, loja, cliente desde,
   compras, total gasto, última compra, OS abertas / pronta para retirada, e link "Ver ficha". Se não
   achar: "Não encontrado na base da ótica". Carregamento não pode travar o painel.
6. Navegação: entrada "Clientes da ótica" no catálogo (`lib/navigation/catalogo.ts`, grupo de
   atendimento/CRM, marcado "Personalização Ótica Mabe"); o teste `interface-por-empresa` conta itens:
   ajuste a contagem como já fizemos antes.

## 4. Regras
- Português do Brasil; textos via `t()` se o arquivo vizinho usa.
- Fork PÚBLICO: nenhum dado real, CPF, senha ou host com credencial em código/teste/commit.
- Código nosso isolado; arquivo oficial só com edição mínima marcada "Personalização Ótica Mabe".
- Antes de commitar: `npm run typecheck`, `npx eslint` dos arquivos, testes unitários dos helpers puros
  (formatadores, rótulos, idade, "há X meses", validação de entrada) e **`npx next build`** (typecheck e
  testes não pegam hook em arquivo importado pelo servidor — já quebrou um build).
- Não fazer push nem deploy.
