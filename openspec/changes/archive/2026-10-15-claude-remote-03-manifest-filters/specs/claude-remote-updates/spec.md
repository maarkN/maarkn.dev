## ADDED Requirements

### Requirement: Filtros por canal
Toda resposta do manifest (`200` ou `204`) SHALL levar `expo-manifest-filters: channel="<canal>"`, para o app deixar de lado updates guardados de outro canal (pelo `metadata.channel` assinado).

#### Scenario: Volta para produção
- **WHEN** o app que rodava um update de `development` pede o manifest de `production`
- **THEN** a resposta traz `expo-manifest-filters: channel="production"` e o app aplica o update de produção mesmo sendo mais antigo
