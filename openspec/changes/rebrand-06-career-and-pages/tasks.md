## 1. Pré-condições

- [ ] 1.1 Ler o guia de rotas interceptadas e paralelas em `node_modules/next/dist/docs/` e anotar no PR o que difere do conhecido
- [ ] 1.2 Guardar o texto renderizado de carreira, notas e links, nos dois idiomas

## 2. Carreira

- [ ] 2.1 Barras no tempo com sobreposição e lista, ligadas entre si, operáveis por teclado e com alternativa em texto; testes de período em aberto e de sobreposição
- [ ] 2.2 Janela ao clicar e página ao abrir direto, com o mesmo conteúdo; setas entre experiências, voltar do navegador e recarregar; testes
- [ ] 2.3 Âncoras `#<slug>` continuam; teste

## 3. Resumo

- [ ] 3.1 Página com fatos, entregas, experiências e casos, a partir das fontes; copiar em texto puro com aviso de falha; testes
- [ ] 3.2 Versão para impressão; verificar em PDF, uma página

## 4. Notas e links

- [ ] 4.1 Lista e leitura com tipografia legível, código, citação, lista e imagem, e o idioma do texto marcado; testes com o CMS fora do ar
- [ ] 4.2 Links com disponibilidade; verificar em 390 px

## 5. Aposentar

- [ ] 5.1 Remover os componentes e estilos de página do terminal sem uso; `pnpm exec knip` sem novos órfãos
- [ ] 5.2 Comparar o texto com o guardado em 1.2 e auditar com axe nos três temas

## 6. Fechamento

- [ ] 6.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
