## 1. Pré-condições

- [ ] 1.1 Confirmar que as changes `rebrand-01` a `rebrand-11` estão arquivadas e que `feat/rebranding` está em dia com a `main`

## 2. Identidade

- [ ] 2.1 Ícones, manifest, cor do navegador por tema e título; verificar nos três temas e em instalação no celular
- [ ] 2.2 Imagens de compartilhamento por rota e idioma, com a moldura; verificar em validadores de prévia
- [ ] 2.3 Sitemap, `hreflang`, dados estruturados e endereço canônico, com a Versão CLI fora do sitemap; testes

## 3. Auditoria

- [ ] 3.1 Lighthouse em celular (mediana de três) na home, lista, detalhe e carreira, dentro dos limites da spec; registrar
- [ ] 3.2 axe em todas as rotas públicas e do backoffice, nos três temas e nos dois idiomas, sem violação; registrar
- [ ] 3.3 Procurar texto fixo fora dos dicionários no site e no backoffice; zero ocorrências, ou lista justificada
- [ ] 3.4 `scripts/e2e-site.mjs` completo, com todas as verificações de `docs/design/verificacoes.md`; registrar
- [ ] 3.5 Conferir links antigos (`?cmd=`, âncoras, `/chat`, projetos, carreira, notas); registrar
- [ ] 3.6 Leitor de tela no Safari e no Chrome (adiado de `rebrand-02-site-chrome`): troca de página anuncia o título, item atual, contagem e setas da busca, foco no contato, ida e volta da Versão CLI. Também o backoffice (adiado de `rebrand-08-admin-shell`): menu aberto, recolhido e no celular, grupo como lista nomeada, item atual, "em breve", "Mais", contagem da busca e menu da conta; registrar o que foi anunciado

## 4. Documentação

- [ ] 4.1 READMEs com capturas, comandos, temas e seção "Forking" (marca, conteúdo, CV, domínio, variáveis, o que não pode ser reutilizado)
- [ ] 4.2 `LICENSE` MIT para o código, com a ressalva do conteúdo pessoal que o README já traz
- [ ] 4.3 `AGENTS.md` da raiz sem as regras da branch de integração; `DEPLOY.md` com as variáveis novas

## 5. Corte

- [ ] 5.1 Ensaiar o deploy com cópia do banco, incluindo a volta para a versão anterior; registrar o passo a passo
- [ ] 5.2 Marco revisa no ambiente de ensaio e aprova o merge
- [ ] 5.3 Merge na `main`, deploy e verificação em produção (rotas, formulário, assistente, login, MCP, agenda); registrar o Lighthouse de produção

## 6. Fechamento

- [ ] 6.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
