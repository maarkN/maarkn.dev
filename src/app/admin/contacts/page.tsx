import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Lock, Mail, Phone } from "lucide-react";
import {
  deleteContact,
  deleteProfessionalReference,
} from "@/app/_actions/contacts";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageHeader } from "@/components/admin/page-header";
import { FunnelStageBadge } from "@/components/admin/status-badge";
import {
  TableEmptyRow,
  TableSkeletonRows,
} from "@/components/admin/table-pager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { EMPTY } from "@/lib/format";
import { CompanyOptionsProvider } from "./company-options";
import { ContactDialog } from "./contact-dialog";
import { ContactsToolbar } from "./contacts-toolbar";
import {
  contactsQueryKey,
  countContactTabs,
  hasAnyContactFilter,
  listContactChannels,
  listCompanyOptions,
  listContacts,
  listReferences,
  parseContactFilters,
  parseContactsPage,
  type ContactFilters,
} from "./contacts-query";
import { DeletePersonButton } from "./delete-person-button";
import { ReferenceDialog } from "./reference-dialog";
import { channelLabel, referenceLanguageLabel } from "./vocabulary";

/**
 * RECRUTADORES E REFERÊNCIAS.
 *
 * ── Aviso que vale mais que o layout ──────────────────────────────────────
 * Tudo nesta tela é PII de terceiros: nome, e-mail, telefone e LinkedIn de
 * gente que não é o usuário. `Contact` e `ProfessionalReference` têm CHECK no
 * banco forçando `visibility = 'private'` — nenhuma superfície pública lê
 * daqui, e as actions nunca aceitam `visibility` como entrada. O módulo de
 * leitura (`./contacts-query`) também não loga payload de erro, pelo mesmo
 * motivo. Se um dia esta tela virar fonte de algum índice, é aqui que a
 * revisão começa.
 *
 * Duas abas, ambas server-side (`?tab=`): contatos são operacionais (quem
 * respondeu, por onde), referências são um ativo de checagem final — e o
 * `canContact` delas é um gate, não uma preferência.
 */

// Guard de sessão + searchParams: esta rota nunca é pré-renderizada.
export const dynamic = "force-dynamic";

const CONTACT_COLS = 5;
const REFERENCE_COLS = 5;

export default async function ContactsPage({
  searchParams,
}: PageProps<"/admin/contacts">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params = await searchParams;
  const filters = parseContactFilters(params);
  const page = parseContactsPage(params.page);
  const [counts, channels, companies] = await Promise.all([
    countContactTabs(),
    listContactChannels(),
    listCompanyOptions(),
  ]);
  const isContacts = filters.tab === "contacts";

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      {/* A lista de empresas viaja UMA vez para todos os dialogs da página. */}
      <CompanyOptionsProvider companies={companies}>
        <div className="space-y-4">
          <PageHeader
            title="Contatos"
            description="Recrutadores e referências profissionais. Dados pessoais de terceiros — privados por schema, nunca expostos em rota pública."
            actions={isContacts ? <ContactDialog /> : <ReferenceDialog />}
          />

          <Card>
            <CardContent>
              <ContactsToolbar
                {...filters}
                counts={counts}
                channels={channels}
                companies={companies}
                page={page}
                position="top"
              />

              <Suspense
                key={contactsQueryKey(filters, page)}
                fallback={
                  isContacts ? (
                    <ContactsTableFrame>
                      <TableSkeletonRows cols={CONTACT_COLS} />
                    </ContactsTableFrame>
                  ) : (
                    <ReferencesTableFrame>
                      <TableSkeletonRows cols={REFERENCE_COLS} />
                    </ReferencesTableFrame>
                  )
                }
              >
                {isContacts ? (
                  <ContactRows filters={filters} page={page} />
                ) : (
                  <ReferenceRows filters={filters} page={page} />
                )}
              </Suspense>
            </CardContent>
          </Card>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            Esta tela é a única superfície que lê estas tabelas. O canônico dos
            contatos de candidatura continua sendo o MCP (
            <code className="font-mono">upsert_application</code>, bloco{" "}
            <code className="font-mono">contacts</code>).
          </p>
        </div>
      </CompanyOptionsProvider>
    </AdminShell>
  );
}

/* ── aba: contatos ────────────────────────────────────────────────────────── */

async function ContactRows({
  filters,
  page,
}: {
  filters: ContactFilters;
  page: number;
}) {
  const result = await listContacts({ filters, page });
  const filtered = hasAnyContactFilter(filters);

  return (
    <>
      <ContactsTableFrame>
        {result.failed ? (
          <TableEmptyRow
            cols={CONTACT_COLS}
            destructive
            message={
              dbConfigured
                ? "Não foi possível carregar os contatos."
                : "DATABASE_URL não configurada — a lista fica vazia até o Postgres subir."
            }
          />
        ) : result.rows.length === 0 ? (
          <TableEmptyRow
            cols={CONTACT_COLS}
            message={
              filtered
                ? "Nenhum contato corresponde aos filtros."
                : "Nenhum contato registrado ainda."
            }
          />
        ) : (
          result.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-muted-foreground">
                  {row.roleTitle || EMPTY}
                </div>
              </TableCell>

              <TableCell>
                <div className="text-sm">{row.company?.name ?? EMPTY}</div>
                {row.application && (
                  <Link
                    href={`/admin/applications/${row.application.id}`}
                    className="inline-flex items-center gap-1 pt-0.5"
                    title={row.application.folderName}
                  >
                    <FunnelStageBadge status={row.application.stage} />
                    <span className="font-mono text-[11px] text-muted-foreground underline-offset-2 hover:underline">
                      {row.application.folderName}
                    </span>
                  </Link>
                )}
              </TableCell>

              <TableCell>
                <ContactLinks
                  email={row.email}
                  phone={row.phone}
                  linkedinUrl={row.linkedinUrl}
                />
              </TableCell>

              <TableCell>
                <Badge variant="outline" className="font-normal">
                  {channelLabel(row.channel)}
                </Badge>
                <div className="pt-0.5 text-[11px] text-muted-foreground">
                  {row.timezone ?? EMPTY}
                  {row._count.events > 0 && (
                    <span className="tabular-nums">
                      {" "}
                      · {row._count.events} evento(s)
                    </span>
                  )}
                  {row._count.interviews > 0 && (
                    <span className="tabular-nums">
                      {" "}
                      · {row._count.interviews} entrevista(s)
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell className="text-right">
                <div className="inline-flex items-center gap-1">
                  <ContactDialog
                    initial={{
                      id: row.id,
                      name: row.name,
                      roleTitle: row.roleTitle,
                      companyId: row.company?.id ?? null,
                      email: row.email,
                      phone: row.phone,
                      linkedinUrl: row.linkedinUrl,
                      timezone: row.timezone,
                      channel: row.channel,
                      notesMd: row.notesMd,
                    }}
                  />
                  <DeletePersonButton
                    id={row.id}
                    name={row.name}
                    entityLabel="contato"
                    description="Eventos e entrevistas permanecem, apenas sem o contato vinculado."
                    action={deleteContact}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </ContactsTableFrame>

      <ContactsToolbar
        {...filters}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        position="bottom"
      />
    </>
  );
}

function ContactsTableFrame({ children }: { children: React.ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Empresa</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Canal</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

/* ── aba: referências ─────────────────────────────────────────────────────── */

async function ReferenceRows({
  filters,
  page,
}: {
  filters: ContactFilters;
  page: number;
}) {
  const result = await listReferences({ filters, page });
  const filtered = hasAnyContactFilter(filters);

  return (
    <>
      <ReferencesTableFrame>
        {result.failed ? (
          <TableEmptyRow
            cols={REFERENCE_COLS}
            destructive
            message={
              dbConfigured
                ? "Não foi possível carregar as referências."
                : "DATABASE_URL não configurada — a lista fica vazia até o Postgres subir."
            }
          />
        ) : result.rows.length === 0 ? (
          <TableEmptyRow
            cols={REFERENCE_COLS}
            message={
              filtered
                ? "Nenhuma referência corresponde aos filtros."
                : "Nenhuma referência registrada ainda."
            }
          />
        ) : (
          result.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium">{row.name}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {row.slug}
                </div>
              </TableCell>

              <TableCell>
                <div className="text-sm">{row.relationship || EMPTY}</div>
                <div className="text-xs text-muted-foreground">
                  {[row.roleTitle, row.companyName].filter(Boolean).join(" · ") ||
                    EMPTY}
                </div>
              </TableCell>

              <TableCell>
                <ContactLinks
                  email={row.email}
                  phone={row.phone}
                  linkedinUrl={row.linkedinUrl}
                />
              </TableCell>

              <TableCell>
                {row.canContact ? (
                  <Badge className="border-transparent bg-emerald-500/15 text-emerald-300">
                    Autorizada
                  </Badge>
                ) : (
                  <Badge
                    className="border-transparent bg-amber-500/15 text-amber-300"
                    title="Não pode ser passada para um recrutador ainda."
                  >
                    Sem autorização
                  </Badge>
                )}
                <div className="pt-0.5 text-[11px] text-muted-foreground">
                  {referenceLanguageLabel(row.language)}
                </div>
              </TableCell>

              <TableCell className="text-right">
                <div className="inline-flex items-center gap-1">
                  <ReferenceDialog
                    initial={{
                      id: row.id,
                      slug: row.slug,
                      name: row.name,
                      relationship: row.relationship,
                      companyName: row.companyName,
                      roleTitle: row.roleTitle,
                      email: row.email,
                      phone: row.phone,
                      linkedinUrl: row.linkedinUrl,
                      language: row.language,
                      canContact: row.canContact,
                      noteMd: row.noteMd,
                    }}
                  />
                  <DeletePersonButton
                    id={row.id}
                    name={row.name}
                    entityLabel="referência"
                    description="A referência some do painel; nenhuma candidatura é afetada."
                    action={deleteProfessionalReference}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </ReferencesTableFrame>

      <ContactsToolbar
        {...filters}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        position="bottom"
      />
    </>
  );
}

function ReferencesTableFrame({ children }: { children: React.ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Relação</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Autorização</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

/* ── célula de contato, compartilhada pelas duas abas ─────────────────────── */

function ContactLinks({
  email,
  phone,
  linkedinUrl,
}: {
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
}) {
  if (!email && !phone && !linkedinUrl) {
    return <span className="text-muted-foreground">{EMPTY}</span>;
  }
  return (
    <div className="space-y-0.5 text-xs">
      {email && (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <Mail className="size-3.5 shrink-0" />
          <span className="break-all">{email}</span>
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          className="flex items-center gap-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <Phone className="size-3.5 shrink-0" />
          <span className="tabular-nums">{phone}</span>
        </a>
      )}
      {/* Esquema em allowlist, como em `ExternalLinkValue`: `linkedinUrl` vem do
          banco (form do admin OU sincronização MCP) e um `href` de esquema
          arbitrário é superfície de `javascript:`/`data:`. Fora da allowlist o
          link simplesmente não é renderizado. */}
      {linkedinUrl && /^https?:\/\//i.test(linkedinUrl) && (
        <a
          href={linkedinUrl}
          target="_blank"
          // `noreferrer` também: o Referer levaria a URL do backoffice
          // (inclusive os filtros) para fora.
          rel="noreferrer"
          className="flex items-center gap-1 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          <ExternalLink className="size-3.5 shrink-0" />
          LinkedIn
        </a>
      )}
    </div>
  );
}
