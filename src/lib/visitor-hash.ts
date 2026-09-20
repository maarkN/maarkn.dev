import { createHmac, randomBytes } from "node:crypto";

/**
 * Pseudonimizacao do identificador do visitante (o IP que o proxy repassa).
 *
 * Por que NAO e um `sha256(ip)` simples: o IPv4 inteiro tem 2^32 entradas —
 * uma tabela completa de hashes se pre-computa em minutos num laptop. Sem sal,
 * `clientKeyHash` e um IP em claro com passos a mais, e o truncamento nao ajuda
 * (so torna a busca reversa ligeiramente ambigua). Com um sal secreto por
 * instalacao, quem le o banco ou um dump nao consegue voltar ao IP sem tambem
 * roubar o sal.
 *
 * Isso e PSEUDONIMIZACAO, nao anonimizacao: quem tem o sal e um IP suspeito
 * confere a correspondencia. O ganho real e que o dado vazado sozinho nao vale.
 *
 * Sal, em ordem:
 *   1. `CHAT_IP_SALT` (>= 16 chars) — o modo suportado em producao: hash
 *      estavel entre reinicios, entao o limitador por visitante sobrevive a
 *      redeploy e o painel agrupa as sessoes do mesmo visitante.
 *   2. Sem a variavel: um sal ALEATORIO por processo, gerado no primeiro uso,
 *      com aviso unico no log. Consequencia deliberada: os hashes deixam de ser
 *      comparaveis entre reinicios (e entre workers), entao o limitador por
 *      visitante reseta junto com o processo — o teto diario global, que nao
 *      depende do hash, continua segurando o gasto. Degradar a contagem e
 *      preferivel a gravar um identificador reversivel.
 */

const SALT_ENV = "CHAT_IP_SALT";
const MIN_SALT_CHARS = 16;

let ephemeralSalt: string | null = null;

function resolveSalt(): string {
  const configured = process.env[SALT_ENV]?.trim();
  if (configured && configured.length >= MIN_SALT_CHARS) return configured;

  if (!ephemeralSalt) {
    ephemeralSalt = randomBytes(32).toString("hex");
    console.warn(
      `[chat-log] ${SALT_ENV} ausente ou menor que ${MIN_SALT_CHARS} chars: ` +
        "usando sal aleatorio deste processo. O IP continua irreversivel, mas a " +
        "contagem por visitante reseta a cada reinicio; defina a variavel em producao."
    );
  }
  return ephemeralSalt;
}

/**
 * `HMAC-SHA256(sal, chave)` truncado em 128 bits — identificador pseudonimo do
 * visitante. O IP cru nunca e gravado, e sem o sal o hash nao volta ao IP.
 */
export function hashKey(key: string): string {
  return createHmac("sha256", resolveSalt()).update(key).digest("hex").slice(0, 32);
}
