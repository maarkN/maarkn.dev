## 1. Pré-condições

- [ ] 1.1 Criar `feat/rebranding` a partir da `main` e proteger contra push direto; verificar no GitHub
- [ ] 1.2 Ler `docs/design/fundamentos.md` e `docs/design/moldura.md` e o guia de fontes e CSS em `node_modules/next/dist/docs/`; listar no PR o que difere

## 2. Temas

- [ ] 2.1 Declarar os tokens dos três temas, isolados dos tokens da Versão CLI; teste que compara com a tabela de `fundamentos.md`
- [ ] 2.2 Aplicar o tema antes da primeira pintura, com a preferência do sistema como padrão e chave própria; testes de primeira visita, preferência salva, valor inválido e armazenamento bloqueado
- [ ] 2.3 Garantir que trocar o tema do site não altera a Versão CLI e vice-versa; teste
- [ ] 2.4 Medir o contraste de todos os pares e o par de séries de gráfico; script que falha abaixo do mínimo
- [ ] 2.5 Fontes locais com substituta de métrica próxima; verificar CLS 0 na troca

## 3. Moldura

- [ ] 3.1 Função pura que, de largura, altura e semente, devolve contorno, trechos externos, internos e pontes; testes de paralelismo (desvio de até 0,2°), canto inferior esquerdo inteiro, lado direito assimétrico e mesmo resultado para a mesma semente
- [ ] 3.2 Componente que redesenha ao mudar de tamanho, sem recalcular em repouso; verificar em 100 instâncias sem tarefa longa

## 4. Primitivos

- [ ] 4.1 Botão, link, card, tag, tela projetada, janela, campo, chave, abas e aviso, com todos os estados da tabela; testes de teclado e de nome acessível
- [ ] 4.2 Luz, inclinação e pulso com um ouvinte só e sem efeito sob movimento reduzido; teste
- [ ] 4.3 Página de referência fora de produção; capturas nos três temas, em 1x e 2x, anexadas ao PR

## 5. Fechamento

- [ ] 5.1 Registrar os primitivos no `AGENTS.md` da raiz; verificar pela leitura
- [ ] 5.2 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
