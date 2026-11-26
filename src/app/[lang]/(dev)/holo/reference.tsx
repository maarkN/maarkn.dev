"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Mail, Plus, Search } from "lucide-react";
import { HoloButton, HoloIconButton } from "@/components/holo/button";
import { HoloCard, HoloScreen } from "@/components/holo/card";
import { HoloDialog } from "@/components/holo/dialog";
import { HoloField } from "@/components/holo/field";
import { BeamLink, HoloLink } from "@/components/holo/link";
import { HoloNotice } from "@/components/holo/notice";
import { HoloSwitch } from "@/components/holo/switch";
import { HoloTabs } from "@/components/holo/tabs";
import { HoloTag } from "@/components/holo/tag";
import { HoloWindow } from "@/components/holo/window";
import { setSiteTheme, useSiteTheme } from "@/components/site-theme";
import { SITE_THEMES } from "@/lib/site-theme";
import styles from "./reference.module.css";

const TOKENS = [
  "bg", "bg-2", "bg-3", "sunk", "ink", "ink-2", "ink-3", "beam", "beam-2", "beam-3",
  "on-beam", "ok", "warn", "bad", "plate", "on-plate", "c1", "c2",
];

/** A made-up screen: no third-party image ever enters the repository. */
function Screen() {
  return (
    <svg viewBox="0 0 640 360" role="img" aria-label="Tela de exemplo: uma agenda com três horários">
      <rect width="640" height="360" fill="#0d1117" />
      <rect x="56" y="64" width="180" height="20" fill="#e8eef4" />
      <rect x="56" y="104" width="250" height="10" fill="#7d8ea1" />
      <rect x="56" y="124" width="214" height="10" fill="#7d8ea1" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(380 ${64 + i * 76})`}>
          <rect width="204" height="60" fill="#1d2733" />
          <rect x="16" y="16" width="46" height="10" fill="#ffcfa8" />
          <rect x="16" y="34" width="120" height="8" fill="#7d8ea1" />
        </g>
      ))}
      <rect x="56" y="248" width="132" height="40" fill="#8ed6f0" />
    </svg>
  );
}

export function Reference({ lang }: { lang: string }) {
  const theme = useSiteTheme();
  const [pressed, setPressed] = useState(true);
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const [notices, setNotices] = useState(["ok", "warn", "bad", "info"] as const as readonly ("ok" | "warn" | "bad" | "info")[]);
  const [stress, setStress] = useState(false);
  const [narrow, setNarrow] = useState(false);

  return (
    <main className={styles.page} lang="pt-BR">
      <h1>Holograma</h1>
      <p className={styles.lead}>
        Referência interna dos primitivos. Só o que é interativo tem moldura; um link dentro de
        texto corrido usa o <BeamLink href="#feixe">feixe</BeamLink>.
      </p>
      <div className={styles.row} style={{ marginTop: 28 }} role="group" aria-label="Tema">
        {SITE_THEMES.map((name) => (
          <HoloButton key={name} size="sm" pressed={theme === name} onClick={() => setSiteTheme(name)} data-theme-choice={name}>
            {name}
          </HoloButton>
        ))}
        <Link href={`/${lang === "en" ? "pt-BR" : "en"}/holo`} data-other-locale="">
          {lang === "en" ? "pt-BR" : "en"}
        </Link>
      </div>

      <section id="tipografia" aria-labelledby="t-tipografia">
        <h2 id="t-tipografia">Tipografia</h2>
        <div className={styles.type}>
          <p style={{ fontFamily: "var(--type-title)", fontStretch: "112%", fontWeight: 560, fontSize: "clamp(2.25rem, 6vw, 4.5rem)", lineHeight: 1.1 }}>
            Do briefing vago ao produto no ar.
          </p>
          <h3>Você conta a dor. Eu devolvo funcionando: ação, coração, avó, português.</h3>
          <p>
            Engenheiro fullstack sênior. Entendo o problema, desenho a solução e construo backend,
            web, mobile e IA, muitas vezes como <strong>único engenheiro</strong>. À noite, çãõéíóú.
          </p>
          <p className={styles.number}>60% · 2.419 ms · 20+</p>
          <p className={styles.label}>jan 2024 a nov 2024 · Goiânia 09:00 UTC-3 · ação</p>
        </div>
      </section>

      <section id="tokens" aria-labelledby="t-tokens">
        <h2 id="t-tokens">Tokens</h2>
        <ul className={styles.swatches}>
          {TOKENS.map((token) => (
            <li key={token}>
              <span style={{ background: `var(--${token})` }} />
              --{token}
            </li>
          ))}
        </ul>
      </section>

      <section id="botoes" aria-labelledby="t-botoes">
        <h2 id="t-botoes">Botão</h2>
        <div className={styles.row}>
          <HoloButton size="lg" variant="primary" data-shot="primary">
            <Mail aria-hidden="true" /> Falar comigo
          </HoloButton>
          <HoloButton size="lg" data-shot="ghost">
            Resumo em 1 minuto <ArrowRight aria-hidden="true" />
          </HoloButton>
          <HoloButton variant="primary">Criar</HoloButton>
          <HoloButton>Copiar link</HoloButton>
          <HoloButton size="sm" variant="primary">Salvar</HoloButton>
          <HoloButton size="sm">Cancelar</HoloButton>
        </div>
        <div className={styles.row}>
          <HoloButton pressed={pressed} onClick={() => setPressed(!pressed)} data-shot="selected">
            Selecionado
          </HoloButton>
          <HoloButton variant="primary" pressed={pressed} onClick={() => setPressed(!pressed)} data-shot="selected-primary">
            Selecionado
          </HoloButton>
          <HoloButton disabled data-shot="disabled">Desligado</HoloButton>
          <HoloButton variant="primary" disabled>Desligado</HoloButton>
          <HoloIconButton label="Buscar">
            <Search aria-hidden="true" />
          </HoloIconButton>
          <HoloIconButton label="Adicionar" size="sm">
            <Plus aria-hidden="true" />
          </HoloIconButton>
        </div>
      </section>

      <section id="links" aria-labelledby="t-links">
        <h2 id="t-links">Link</h2>
        <div className={styles.row}>
          <HoloLink href="#links" data-shot="link">
            Ver carreira <ArrowRight aria-hidden="true" />
          </HoloLink>
          <HoloLink href="#links" variant="primary">Abrir projeto</HoloLink>
          <HoloLink href="#links" aria-current="page">Página atual</HoloLink>
          <HoloLink href="#links" variant="primary" aria-current="page" data-shot="current-primary">Projeto atual</HoloLink>
          <HoloLink href="#links" disabled>Em breve</HoloLink>
        </div>
        <p id="feixe">
          Texto corrido com um <BeamLink href="#feixe" data-shot="beam">link no meio da frase</BeamLink>, que
          engrossa quando o ponteiro chega.
        </p>
      </section>

      <section id="tags" aria-labelledby="t-tags">
        <h2 id="t-tags">Tag</h2>
        <div className={styles.row}>
          <HoloTag href="#tags" place="section" data-shot="tag">Casos de sucesso</HoloTag>
          <HoloTag href="#tags">Sobre mim</HoloTag>
          <HoloTag href="#tags" current>Experiências</HoloTag>
        </div>
      </section>

      <section id="cards" aria-labelledby="t-cards">
        <h2 id="t-cards">Card</h2>
        <div className={styles.grid}>
          <HoloCard title="Dermagenix" href="#cards">
            <p>Da gravação da consulta à prescrição, em várias clínicas.</p>
          </HoloCard>
          <HoloCard title="Abrir a janela" onClick={() => setOpen(true)}>
            <p>Um card que faz algo em vez de levar a outra tela.</p>
          </HoloCard>
          <HoloCard title="SenseVox" href="#cards">
            <p>
              Telefonia própria no lugar de <BeamLink href="#cards">uma ferramenta de terceiros</BeamLink>.
            </p>
            <div className={styles.row} style={{ marginTop: 14 }}>
              <HoloButton size="sm" onClick={() => setPressed(!pressed)}>Copiar link</HoloButton>
            </div>
          </HoloCard>
        </div>
      </section>

      <section id="telas" aria-labelledby="t-telas">
        <h2 id="t-telas">Tela projetada</h2>
        <div className={styles.grid}>
          <HoloScreen title="DoctorX" href="#telas" media={<Screen />}>
            <p>Beta fechado.</p>
          </HoloScreen>
          <HoloScreen title="Bula Digital" href="#telas" media={<Screen />}>
            <p>No ar.</p>
          </HoloScreen>
        </div>
      </section>

      <section id="janela" aria-labelledby="t-janela">
        <h2 id="t-janela">Janela</h2>
        <div className={styles.row}>
          <HoloButton onClick={() => setOpen(true)} data-open-window="">Abrir a janela</HoloButton>
          <HoloButton onClick={() => setLong(true)} data-open-long="">Abrir uma janela longa</HoloButton>
        </div>
        <HoloDialog open={open} onClose={() => setOpen(false)} title="Nectar CRM" closeLabel="Fechar">
          <p>
            Assumi um produto de <BeamLink href="#janela">VoIP próprio</BeamLink> que estava travado e o coloquei em
            produção.
          </p>
          <div style={{ marginTop: 20 }}>
            <HoloField label="E-mail" name="window-email" hint="Só para responder você." defaultValue="sem-arroba" error="Falta o @ no endereço." />
          </div>
          <div className={styles.row} style={{ marginTop: 20 }}>
            <HoloButton onClick={() => setOpen(false)} variant="primary">Entendi</HoloButton>
            <HoloLink href="#janela">Ver carreira</HoloLink>
          </div>
        </HoloDialog>
        <HoloDialog open={long} onClose={() => setLong(false)} title="Só texto" closeLabel="Fechar">
          {Array.from({ length: 60 }, (_, i) => (
            <p key={i}>{`Parágrafo ${i + 1}: texto corrido, mais alto que a tela e sem nenhum controle.`}</p>
          ))}
        </HoloDialog>
        <div style={{ marginTop: 24, maxWidth: 440 }} data-shot="window">
          <HoloWindow title="A página é a janela" heading="h3">
            <p>Sem nada atrás para onde voltar, não tem botão de fechar.</p>
            <div style={{ marginTop: 16 }}>
              <HoloField label="Senha" name="window-password" type="password" autoComplete="off" aria-invalid />
            </div>
          </HoloWindow>
        </div>
      </section>

      <section id="campos" aria-labelledby="t-campos">
        <h2 id="t-campos">Campo</h2>
        <div className={styles.grid}>
          <HoloField label="Nome" name="name" placeholder="Como você se chama" data-shot="field" />
          <HoloField label="E-mail" name="email" type="email" hint="Só para responder você." defaultValue="sem-arroba" error="Falta o @ no endereço. Exemplo: nome@empresa.com" />
          <HoloField label="Usuário" name="user" aria-invalid data-shot="field-invalid" />
          <HoloField label="Empresa" name="company" disabled defaultValue="Desligado" />
          <HoloField label="Mensagem" name="message" multiline rows={4} />
        </div>
      </section>

      <section id="chaves" aria-labelledby="t-chaves">
        <h2 id="t-chaves">Chave</h2>
        <div className={styles.row}>
          <HoloSwitch label="Aberto a vagas" checked={on} onCheckedChange={setOn} data-shot="switch" />
          <HoloSwitch label="Som" checked={off} onCheckedChange={setOff} />
          <HoloSwitch label="Desligada" checked disabled onCheckedChange={() => {}} />
        </div>
      </section>

      <section id="abas" aria-labelledby="t-abas">
        <h2 id="t-abas">Abas</h2>
        <HoloTabs
          label="Próximos passos"
          tabs={[
            { id: "agenda", label: "Agenda", content: <p>Três compromissos nesta semana.</p> },
            { id: "cobrar", label: "Cobrar", content: <p>Duas respostas em atraso.</p> },
            { id: "aconteceu", label: "Aconteceu", content: <p>Uma vaga promovida.</p> },
          ]}
        />
      </section>

      <section id="avisos" aria-labelledby="t-avisos">
        <h2 id="t-avisos">Aviso</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {notices.map((tone) => (
            <HoloNotice
              key={tone}
              tone={tone}
              title={{ ok: "Projeto salvo", warn: "Três casos na home", bad: "Não foi possível salvar", info: "Rascunho aberto" }[tone]}
              dismissLabel="Dispensar"
              onDismiss={() => setNotices(notices.filter((other) => other !== tone))}
            >
              <p>Conteúdo do aviso, com <BeamLink href="#avisos">um link</BeamLink> no texto.</p>
            </HoloNotice>
          ))}
        </div>
      </section>

      <section id="metricas" aria-labelledby="t-metricas">
        <h2 id="t-metricas">O que não é holograma</h2>
        <div className={styles.row} style={{ gap: 48 }}>
          <div>
            <p className={styles.number}>55%</p>
            <p className={styles.label}>taxa de resposta</p>
          </div>
          <div>
            <p className={styles.number}>6+</p>
            <p className={styles.label}>anos construindo</p>
          </div>
        </div>
      </section>

      <section id="cem" aria-labelledby="t-cem">
        <h2 id="t-cem">Cem molduras</h2>
        <div className={styles.row}>
          <HoloButton pressed={stress} onClick={() => setStress(!stress)} data-stress="">Montar 100</HoloButton>
          <HoloButton pressed={narrow} onClick={() => setNarrow(!narrow)} data-stress-resize="">Estreitar</HoloButton>
        </div>
        {stress && (
          <div className={styles.stress} style={{ "--stress-width": narrow ? "62%" : "100%" } as CSSProperties}>
            {Array.from({ length: 100 }, (_, i) => (
              <HoloButton key={i}>{`Peça ${i + 1}`}</HoloButton>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
