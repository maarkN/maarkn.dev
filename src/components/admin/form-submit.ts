"use client";

/**
 * Submeter um formulário do painel SEM perder o que o usuário digitou.
 *
 * ── O problema, medido ─────────────────────────────────────────────────────
 * O React 19 RESETA o formulário assim que a função de `action` termina — e
 * faz isso com qualquer função, não só com Server Action passada direto ao
 * `<form>`. O comentário que este projeto repetia ("`action` recebe uma função
 * do cliente: o React entrega o FormData e NÃO reseta o form sozinho") estava
 * errado, e o preço aparecia exatamente no caminho de ERRO:
 *
 *   `scripts/smoke-admin-write.mjs`, contato com e-mail inválido —
 *   depois do toast `stderr: E-mail inválido.`, TODOS os campos não
 *   controlados do diálogo voltavam vazios:
 *     ["name=\"\"","roleTitle=\"\"","email=\"\"","phone=\"\"", …]
 *
 * Ou seja: a tela dizia "Confira os campos destacados" sobre campos que ela
 * mesma tinha acabado de apagar. Quem digitou oito campos e errou uma letra no
 * e-mail digitava os oito de novo. Pior: com o campo obrigatório zerado, o
 * segundo clique em `[ salvar ]` nem chegava a submeter — a validação nativa
 * do navegador barrava, sem toast e sem explicação.
 *
 * ── A correção ────────────────────────────────────────────────────────────
 * Trocar `action={fn}` por `onSubmit={(event) => submitKeepingValues(event, fn)}`. O
 * `preventDefault()` tira o formulário do fluxo de ação do React — e é o
 * reset automático desse fluxo que estamos evitando. O handler recebe o mesmo
 * `FormData` de antes, então o corpo da função de submit não muda.
 *
 * Não se perde realce progressivo: uma função DE CLIENTE não roda sem JS, de
 * modo que estes formulários já dependiam de JS. Os formulários que passam uma
 * Server Action (o de candidatura, via `useActionState`, e o de login)
 * continuam com `action=` justamente por isso — lá o reset é o comportamento
 * documentado do React, e mudar aquilo é mexer no contrato do servidor.
 *
 * Quem QUER limpar o formulário depois de um sucesso (a troca de senha, por
 * exemplo) chama `form.reset()` — agora essa chamada é a única que reseta, e
 * não uma redundância ao lado de um reset invisível.
 */

import type { FormEvent } from "react";

/**
 * Recebe o evento e devolve ao chamador o mesmo `FormData` que o `action=`
 * entregaria.
 *
 * É `(event, handler)` e não uma fábrica `handler => onSubmit`: a fábrica
 * seria CHAMADA durante a renderização, e o lint do React Compiler reprova
 * (`Cannot access refs during render`) qualquer função criada assim que possa
 * tocar num `ref` — é o caso da troca de senha, que chama `form.reset()`.
 * Com esta forma, o call site escreve
 * `onSubmit={(event) => submitKeepingValues(event, onSubmit)}`: a closure é
 * criada, não executada.
 */
export function submitKeepingValues(
  event: FormEvent<HTMLFormElement>,
  handler: (data: FormData) => void,
) {
  event.preventDefault();
  // `new FormData(form)` sem `submitter`: nenhum botão de submit do painel
  // carrega `name`/`value` (todos são `[ salvar ]`, `[ criar … ]`). Se algum
  // passar a carregar, é aqui que o `submitter` entra.
  handler(new FormData(event.currentTarget));
}
