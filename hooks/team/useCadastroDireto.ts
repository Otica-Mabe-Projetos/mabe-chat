"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import type { CadastroDiretoInput, TrocarSenhaInput } from "@/lib/schemas/cadastro-direto";

/** Cadastro direto de membro (personalização da Ótica Mabe) — ver `app/api/v1/team/cadastro-direto`. */
export function useCadastrarMembro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CadastroDiretoInput) =>
      apiClient.post<{ data: { user_id: string; membership_id: string } }>(
        "/api/v1/team/cadastro-direto",
        input,
      ),
    onError: (err) => showApiError(err),
    // Membros E convites: um convite pendente do mesmo e-mail fecha junto.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team"] }),
  });
}

/** Troca de senha pelo admin — ver `app/api/v1/team/[user_id]/senha`. */
export function useTrocarSenhaDoMembro() {
  return useMutation({
    mutationFn: ({ userId, ...input }: TrocarSenhaInput & { userId: string }) =>
      apiClient.post<{ data: { user_id: string } }>(`/api/v1/team/${userId}/senha`, input),
    onError: (err) => showApiError(err),
  });
}
