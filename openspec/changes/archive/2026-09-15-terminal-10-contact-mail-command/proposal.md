## Why

O formulário de contato da home (450 linhas) some com a troca para o terminal. Recrutadores e clientes ainda precisam de um jeito de escrever sem sair do site — em um terminal, isso é um fluxo de perguntas no próprio prompt.

## What Changes

- Comando `mail` com fluxo interativo (nome → email → empresa opcional → mensagem → confirmação) usando a server action de contato existente.
- Modo interativo no engine: comandos podem assumir o prompt com rótulos próprios; `Ctrl+C`/`Esc` cancelam.
- Validação inline com o mesmo schema do formulário; limite de tentativas; limite local de 1 envio/minuto.
- `contact` ganha a dica `type mail to send a message from here`.
- Respostas do fluxo não entram no histórico.

## Capabilities

### New Capabilities
- `terminal-mail`: envio de mensagem de contato pelo terminal, incluindo validação, cancelamento, feedback e limites.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/lib/terminal/mail-command.tsx`, `use-terminal.ts` (modo interativo `ctx.ask`), `src/app/_actions/contact.ts` (origem `terminal`/honeypot), dicionários.
- Depende de 03 e 06. `contact.tsx` antigo é removido na change 12.
