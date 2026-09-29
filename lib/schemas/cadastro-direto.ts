/**
 * Cadastro direto de membro — personalização da Ótica Mabe, fora do upstream.
 *
 * O admin da empresa cria a conta com nome, e-mail, senha e papel, sem e-mail de
 * convite, e troca a senha de quem esqueceu. É o jeito do VBot, que a equipe já
 * conhece. O convite continua existindo ao lado, sem mudança nenhuma.
 */
import { z } from "zod";

import { ROLES } from "@/lib/schemas/team";

// As mesmas regras do medidor de força (`components/auth/PasswordStrength.tsx`)
// e da troca de senha (`resetPasswordSchema`): quem cadastra não escolhe uma
// senha mais fraca do que a pessoa escolheria sozinha. 72 é o teto do bcrypt do
// GoTrue — acima disso ele recusa.
const senhaForte = z
  .string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .max(72, "Senha deve ter no máximo 72 caracteres")
  .regex(/[A-Za-zÀ-ÿ]/, "Senha deve ter pelo menos uma letra")
  .regex(/[0-9]/, "Senha deve ter pelo menos um número")
  .regex(/[^A-Za-zÀ-ÿ0-9\s]/, "Senha deve ter pelo menos um símbolo");

export const cadastroDiretoSchema = z
  .object({
    full_name: z.string().trim().min(2, "Informe o nome").max(120),
    email: z.string().trim().toLowerCase().email("Email inválido"),
    role: z.enum(ROLES),
    password: senhaForte,
    password_confirm: z.string(),
  })
  .refine((v) => v.password === v.password_confirm, {
    path: ["password_confirm"],
    message: "As senhas não coincidem",
  });

export type CadastroDiretoInput = z.infer<typeof cadastroDiretoSchema>;

export const trocarSenhaSchema = z
  .object({
    password: senhaForte,
    password_confirm: z.string(),
  })
  .refine((v) => v.password === v.password_confirm, {
    path: ["password_confirm"],
    message: "As senhas não coincidem",
  });

export type TrocarSenhaInput = z.infer<typeof trocarSenhaSchema>;
