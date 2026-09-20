import { isIP } from "node:net";

/**
 * De onde sai o IP do cliente — UM lugar para acertar.
 *
 * ---------------------------------------------------------------------------
 * Por que isto existe fora do throttle de login
 * ---------------------------------------------------------------------------
 * Toda trava por IP (throttle do login, rate limit do `/api/mcp`) vale o que
 * vale a chave. Se a chave sair de um valor que o CLIENTE escolhe, nao existe
 * trava: o atacante manda um `X-Forwarded-For` diferente a cada requisicao,
 * cada uma cai num balde novo, e o limite vira enfeite. Esse defeito ja
 * apareceu duas vezes no repositorio, escrito duas vezes — por isso a logica
 * mora aqui, e nao copiada em cada limitador.
 *
 * ---------------------------------------------------------------------------
 * A regra: ULTIMO SALTO CONFIAVEL, nunca o valor mais a esquerda
 * ---------------------------------------------------------------------------
 * Premissa de topologia (ver `docker-compose.prod.yml`): na EC2 o container da
 * app nao publica porta (`expose: 5050`, sem `ports:`) e so o Traefik v3.6 o
 * alcanca pela rede `web`. Existe EXATAMENTE UM salto confiavel na frente. O
 * Traefik, na configuracao padrao (sem `forwardedHeaders.trustedIPs`),
 * descarta os `X-Forwarded-*` de origem nao confiavel e reescreve o header com
 * o IP de quem abriu a conexao — e, quando configurado para confiar, APENDA
 * esse IP ao fim da cadeia. Nos dois casos o valor escrito pelo salto
 * confiavel e o ULTIMO da lista. O que o atacante injeta fica sempre a
 * esquerda desse ponto e e ignorado.
 *
 * `TRUSTED_PROXY_HOPS` (padrao 1, minimo 1) diz quantos proxies confiaveis
 * existem; com um CDN na frente do Traefik viraria 2 e leriamos o penultimo
 * elemento. Nao ha opcao "0": em NextAuth (e no route handler) nao ha acesso
 * ao IP de conexao do socket, entao o header do proxy e a unica fonte.
 *
 * ---------------------------------------------------------------------------
 * Normalizacao: afrouxar sem reabrir o bypass
 * ---------------------------------------------------------------------------
 * O valor do salto confiavel ainda precisa virar UMA string canonica, porque
 * duas grafias do mesmo endereco seriam dois baldes. E o inverso e pior: uma
 * forma legitima rejeitada cai no balde compartilhado `desconhecido`, onde o
 * dono do site divide contador com o mundo — 10 falhas de qualquer origem
 * trancariam o unico usuario do sistema. Formas aceitas (todas aparecem na
 * pratica): `1.2.3.4`, `1.2.3.4:5050`, `2001:db8::1`, `[2001:db8::1]:5050`,
 * `::ffff:1.2.3.4` (IPv4 mapeado — o que o proprio Node produz em socket
 * dual-stack), `[::ffff:1.2.3.4]:443`, `fe80::1%eth0` (com zona).
 *
 * Afrouxar nao reabre o bypass porque o criterio de ONDE ler nao mudou: segue
 * sendo o ultimo salto confiavel. Normalizar mais formas so reduz o numero de
 * baldes distintos — nunca aumenta. Token que nao e IP continua caindo no
 * balde compartilhado, nunca num balde proprio (um balde novo por requisicao E
 * o bypass).
 */

/** Balde compartilhado de quem nao tem IP utilizavel. */
export const UNKNOWN_IP = "desconhecido";

/** `[::1]:5050` / `1.2.3.4:5050` → sufixo de porta a remover. */
const WITH_PORT = /^(.+):(\d{1,5})$/;

/**
 * IPv4 mapeado em IPv6, nas grafias que aparecem: `::ffff:1.2.3.4` e
 * `0:0:0:0:0:ffff:1.2.3.4` (ja em minusculas quando testado).
 */
const V4_MAPPED = /^(?:0*:)*:?0*ffff:(\d{1,3}(?:\.\d{1,3}){3})$/;

/**
 * Normaliza um elemento da cadeia de proxy para um IP canonico, ou `null` se
 * nao for um IP. Duas grafias do mesmo endereco devolvem a MESMA string: e
 * isso que garante um balde so por origem.
 */
export function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;

  // `[ipv6]` e `[ipv6]:porta` — a unica forma valida de IPv6 com porta.
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    if (end <= 1) return null;
    value = value.slice(1, end);
  }

  // Zona de escopo (`%eth0`, `%25eth0` percent-encoded): mesma maquina, um
  // balde so. Manter a zona daria baldes diferentes para a mesma origem.
  const zone = value.indexOf("%");
  if (zone >= 0) value = value.slice(0, zone);

  // Porta sem colchetes. So tentamos remover quando o valor inteiro NAO e um
  // IP valido: `2001:db8::1:80` e um IPv6 legitimo e continua sendo lido como
  // endereco, nunca como "endereco + porta".
  if (!isIP(value)) {
    const withPort = WITH_PORT.exec(value);
    if (!withPort || !isIP(withPort[1]!)) return null;
    value = withPort[1]!;
  }

  value = value.toLowerCase();

  // `::ffff:1.2.3.4` e `1.2.3.4` sao o MESMO cliente: um balde so.
  const mapped = V4_MAPPED.exec(value);
  return mapped ? mapped[1]! : value;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Quantos proxies confiaveis ha na frente da app. `override` permite que um
 * ponto especifico (o login, historicamente) tenha o proprio env; sem ele,
 * vale a topologia global. Minimo 1: ver cabecalho.
 */
export function trustedProxyHops(overrideEnvName?: string): number {
  const global = intEnv("TRUSTED_PROXY_HOPS", 1);
  const hops = overrideEnvName ? intEnv(overrideEnvName, global) : global;
  return Math.max(1, hops);
}

/**
 * Chave de rate limit: o IP escrito pelo ULTIMO salto confiavel, nunca o valor
 * cru que o cliente manda. Para throttle/rate limit apenas — NUNCA para
 * autorizacao.
 */
export function trustedClientIp(
  request: Request | undefined,
  hops: number = trustedProxyHops()
): string {
  if (!request) return UNKNOWN_IP;
  const trustedHops = Math.max(1, hops);

  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const chain = fwd
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    // Conta a partir do FIM: o fim e o que o proxy escreveu, o comeco e o que
    // o cliente escolheu. Cadeia mais curta que o numero de saltos = cadeia
    // truncada/forjada: nada nela e confiavel.
    const trusted =
      chain.length >= trustedHops ? chain[chain.length - trustedHops] : undefined;
    // Cadeia presente mas inutilizavel: balde compartilhado, nunca um balde
    // novo por requisicao (um balde novo por requisicao E o bypass).
    return normalizeIp(trusted) ?? UNKNOWN_IP;
  }

  // Sem `x-forwarded-for` nao ha proxy na frente (dev local). Em producao o
  // Traefik sempre escreve o header, entao este ramo nao e alcancavel por quem
  // passa pelo proxy.
  return normalizeIp(request.headers.get("x-real-ip")) ?? UNKNOWN_IP;
}
