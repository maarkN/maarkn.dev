## 1. Chrome

- [x] 1.1 Criar `admin-route-chrome.ts` com a tabela do design.md e teste unitário cobrindo listagem, detalhe com `folderName`, detalhe sem `folderName` (cai para id) e rota desconhecida
- [x] 1.2 Criar `AdminStatusBar` reusando `terminal.module.css`, com `maarkn@dev`, caminho, relógio e `exit`; verificar que nenhum chunk de `/admin/**` importa `theme-provider` (`grep -rn "theme-provider" src/app/admin src/components/admin`)
- [x] 1.3 Criar `AdminChrome` (barra + breadcrumb + `{children}` + `cd ..`) e aplicá-lo uma vez no layout do admin; verificar que as 17 rotas autenticadas mostram caminho e comando corretos

## 2. Navegação

- [x] 2.1 Reescrever `admin-shell.tsx` como árvore com `board` indentado sob `applications/`, ícones em caixa de largura fixa e as 3 entradas `ready: false` como `# em breve`; verificar que os 14 rótulos começam na mesma coluna e que os ícones são `aria-hidden`
- [x] 2.2 Substituir `page-header.tsx` pelo breadcrumb do chrome; verificar que nenhuma tela mostra título duplicado
- [x] 2.3 Menu em 390px: colapsável, sem rolagem horizontal, com o item ativo visível ao abrir

## 3. Login

- [x] 3.1 Reescrever `login-form.tsx` como tty (`maarkn.dev tty1`, `login:`, `password:`), removendo o `bg-grid`; verificar que o erro de credencial aparece como linha de saída e que o throttle de login continua funcionando
- [x] 3.2 Confirmar que `/admin/login` não renderiza barra, árvore nem `cd ..`

## 4. Verificação

- [x] 4.1 Percorrer as 18 rotas comparando caminho e comando com a tabela; `axe` sem violação de nome acessível nos links da árvore e do `cd ..`
- [x] 4.2 `pnpm lint && env -u DATABASE_URL pnpm build && pnpm test` verdes
