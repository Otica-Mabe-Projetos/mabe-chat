# Agente de atualização do Mabe Chat no EasyPanel — ver docs/ATUALIZACAO-MABE-CHAT.md.
# docker:27-cli já traz o Docker Compose v2 (o agente comanda os contêineres pelo
# socket do host, igual ao hostgator-setup-kit/agent.sh faz rodando no host).
FROM docker:27-cli
RUN apk add --no-cache bash curl jq gawk coreutils tzdata
COPY atualizador.sh /usr/local/bin/atualizador.sh
ENTRYPOINT ["bash", "/usr/local/bin/atualizador.sh"]
CMD ["loop"]
