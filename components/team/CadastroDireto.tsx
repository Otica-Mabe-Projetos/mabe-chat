"use client";
/**
 * Cadastro direto de membro e troca de senha pelo admin — personalização da
 * Ótica Mabe, fora do upstream (ver `lib/schemas/cadastro-direto.ts`).
 */
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/hooks/i18n/useT";
import { useCadastrarMembro, useTrocarSenhaDoMembro } from "@/hooks/team/useCadastroDireto";
import type { TeamMember } from "@/hooks/team/useTeamMembers";
import { cadastroDiretoSchema, trocarSenhaSchema } from "@/lib/schemas/cadastro-direto";
import { ROLES, type Role } from "@/lib/schemas/team";

const NOME_DO_PAPEL: Record<Role, string> = {
  viewer: "Somente leitura",
  agent: "Atendente",
  manager: "Gerente",
  admin: "Administrador",
};

function CamposDeSenha({
  senha,
  confirmacao,
  onSenha,
  onConfirmacao,
}: {
  senha: string;
  confirmacao: string;
  onSenha: (v: string) => void;
  onConfirmacao: (v: string) => void;
}) {
  const t = useT();
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="cadastro-senha">{t("Senha")}</Label>
        <Input
          id="cadastro-senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => onSenha(e.target.value)}
        />
        <PasswordStrength password={senha} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cadastro-senha-confirmacao">{t("Confirmar senha")}</Label>
        <Input
          id="cadastro-senha-confirmacao"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => onConfirmacao(e.target.value)}
        />
      </div>
    </>
  );
}

export function CadastrarMembroButton() {
  const t = useT();
  const cadastrar = useCadastrarMembro();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Role>("agent");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const fechar = () => {
    setAberto(false);
    setNome("");
    setEmail("");
    setPapel("agent");
    setSenha("");
    setConfirmacao("");
    setErro(null);
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    const r = cadastroDiretoSchema.safeParse({
      full_name: nome,
      email,
      role: papel,
      password: senha,
      password_confirm: confirmacao,
    });
    if (!r.success) {
      setErro(t(r.error.issues[0]?.message ?? "Confira os campos."));
      return;
    }
    setErro(null);
    try {
      await cadastrar.mutateAsync(r.data);
      toast.success(t("Membro cadastrado. Já pode entrar com esse e-mail e essa senha."));
      fechar();
    } catch {
      /* showApiError já avisou */
    }
  };

  return (
    <>
      <Button variant="outline" className="shrink-0" onClick={() => setAberto(true)}>
        {t("Cadastrar membro")}
      </Button>
      <Dialog open={aberto} onOpenChange={(o) => (o ? setAberto(true) : fechar())}>
        <DialogContent>
          <form onSubmit={salvar} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("Cadastrar membro")}</DialogTitle>
              <DialogDescription>
                {t(
                  "A conta já nasce pronta: passe o e-mail e a senha para a pessoa. Não precisa de e-mail de convite.",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="cadastro-nome">{t("Nome")}</Label>
              <Input
                id="cadastro-nome"
                autoComplete="off"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cadastro-email">{t("E-mail")}</Label>
              <Input
                id="cadastro-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cadastro-papel">{t("Função")}</Label>
              <Select value={papel} onValueChange={(v) => setPapel(v as Role)}>
                <SelectTrigger id="cadastro-papel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(NOME_DO_PAPEL[r])} ({r})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CamposDeSenha
              senha={senha}
              confirmacao={confirmacao}
              onSenha={setSenha}
              onConfirmacao={setConfirmacao}
            />
            {erro ? (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={fechar}>
                {t("Cancelar")}
              </Button>
              <Button type="submit" disabled={cadastrar.isPending}>
                {cadastrar.isPending ? t("Cadastrando…") : t("Cadastrar")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TrocarSenhaDialog({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const t = useT();
  const trocar = useTrocarSenhaDoMembro();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    const r = trocarSenhaSchema.safeParse({ password: senha, password_confirm: confirmacao });
    if (!r.success) {
      setErro(t(r.error.issues[0]?.message ?? "Confira os campos."));
      return;
    }
    setErro(null);
    try {
      await trocar.mutateAsync({ userId: member.user_id, ...r.data });
      toast.success(t("Senha trocada. Passe a senha nova para a pessoa."));
      onClose();
    } catch {
      /* showApiError já avisou */
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={salvar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("Trocar senha")}</DialogTitle>
            <DialogDescription>
              {member.full_name ?? member.email ?? member.user_id}{" "}
              {t("passa a entrar com a senha nova.")}
            </DialogDescription>
          </DialogHeader>
          <CamposDeSenha
            senha={senha}
            confirmacao={confirmacao}
            onSenha={setSenha}
            onConfirmacao={setConfirmacao}
          />
          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("Cancelar")}
            </Button>
            <Button type="submit" disabled={trocar.isPending}>
              {trocar.isPending ? t("Salvando…") : t("Salvar senha")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
