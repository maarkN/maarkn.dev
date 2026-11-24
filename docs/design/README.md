# Design do rebranding

Fonte de verdade visual e de comportamento do site e do backoffice novos. As changes `rebrand-*` citam estes arquivos.

| Arquivo | O que define |
|---|---|
| [fundamentos.md](./fundamentos.md) | Princípio, temas, tipografia, movimento, acessibilidade |
| [moldura.md](./moldura.md) | Geometria do holograma: botões, tags, cards, telas |
| [projecao.md](./projecao.md) | Projeção, linha-guia, tags, trilho e desempenho |
| [site.md](./site.md) | Mapa de telas do site, uma a uma, com os textos novos |
| [backoffice.md](./backoffice.md) | Mapa de telas do backoffice |
| [commands.md](./commands.md) | Comandos da Versão CLI |
| [verificacoes.md](./verificacoes.md) | O que o teste de ponta a ponta precisa cobrir |
| [screens/](./screens) | Capturas do protótipo |

As capturas vêm de um protótipo local que não é versionado. Onde a captura e o texto divergirem, **vale o texto**.

## Onde a captura não vale

| Na captura | Vale |
|---|---|
| Caso GO v2 | Os casos são Dermagenix, DoctorX e SenseVox, escolhidos no backoffice |
| Endereços em português (`/projetos`, `/admin/candidaturas`) | Endereços em inglês já existentes ([site.md](./site.md)) |
| Tag não descoberta some do teclado | Sempre alcançável; descobrir é só visual ([projecao.md](./projecao.md)) |
| Backoffice só em português | PT e EN |
| Three.js e Motion | WebGL puro e CSS ([ADR 0001](../adr/0001-projecao-em-webgl-puro.md)) |
| Assistente com respostas prontas | Usa a assistente que já existe |
| Empresas, pessoas e números do backoffice | Fictícios |
