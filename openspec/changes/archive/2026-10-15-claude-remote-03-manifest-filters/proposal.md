## Why

Ao trocar de canal no app Claude Remote, um update baixado do outro canal pode ser mais novo que o último do canal escolhido, e o `expo-updates` continuaria nele. (Issue #9)

## What Changes

- As respostas do manifest (`200` e `204`) passam a levar `expo-manifest-filters: channel="<canal>"`. O app descarta os updates guardados cujo `metadata.channel` (assinado pelo publicador) seja diferente; updates sem a chave continuam valendo.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `claude-remote-updates`: filtros de manifest por canal.

## Impact

`src/lib/claude-remote-updates/protocol.ts` e a rota `manifest`.
