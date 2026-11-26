# Roteiro das changes

O OpenSpec não guarda ordem entre changes; ela fica aqui. Cada proposal repete de quais depende e em qual branch vive.

## Trilha A: direto na `main`

| Ordem | Change | Depende de |
|---|---|---|
| 1 | `infra-01-pr-checks` | nenhuma |
| 2 | `portfolio-01-content-in-db` | infra-01 |
| 3 | `dossier-01-fields` | infra-01 |
| 4 | `dossier-02-sent-documents` | dossier-01 |
| 5 | `agenda-01-google-calendar` | dossier-01 |
| 6 | `agent-01-portfolio-drafts` | portfolio-01 |
| 7 | `agent-02-skills-plugin` | dossier-01, dossier-02, agenda-01, agent-01 |

### Correções

Independentes das demais; entram quando aprovadas. Depois de cada merge, trazer a `main` para `feat/rebranding`.

| Change | Depende de |
|---|---|
| `cli-01-language-keeps-look` | infra-01 |
| `infra-02-next-upgrade` | infra-01 |

## Trilha B: `feat/rebranding`

| Ordem | Change | Depende de |
|---|---|---|
| 8 | `rebrand-01-foundation` | infra-01 |
| 9 | `rebrand-02-site-chrome` | rebrand-01 |
| 10 | `rebrand-03-home` | rebrand-02, portfolio-01 |
| 11 | `rebrand-04-projection` (decisão do ADR 0001) | rebrand-03 |
| 12 | `rebrand-05-projects` | rebrand-02, portfolio-01 |
| 13 | `rebrand-06-career-and-pages` | rebrand-03, rebrand-05 |
| 14 | `rebrand-07-tech-icons` | rebrand-05, rebrand-06 |
| 15 | `rebrand-08-admin-shell` | rebrand-02 |
| 16 | `rebrand-09-admin-lists-and-forms` | rebrand-08 |
| 17 | `rebrand-10-admin-overview` | rebrand-08, dossier-01, agenda-01 |
| 18 | `rebrand-11-admin-screens` | rebrand-09 e trilha A de 2 a 6 |
| 19 | `rebrand-12-cutover` | rebrand-01 a rebrand-11 |

Podem andar em paralelo: a trilha A com a B; o site (10 a 14) com o backoffice (15 a 18).

## Arquivar

Arquivar na ordem da tabela, uma por vez, dentro de cada trilha. Como nenhum requisito é alterado por duas changes, a ordem entre as trilhas não conflita, desde que a `main` seja trazida para `feat/rebranding` antes de arquivar uma change que dependa da trilha A.
