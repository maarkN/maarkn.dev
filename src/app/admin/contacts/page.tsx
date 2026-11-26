import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Lock, Mail, Phone } from "lucide-react";
import { deleteContact, deleteProfessionalReference } from "@/app/_actions/contacts";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { OpensRow } from "@/components/admin/listing";
import { PageHeader } from "@/components/admin/page-header";
import { StageLabel } from "@/components/admin/stage";
import { TableStateRow } from "@/components/admin/table-pager";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminDictionary } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { dbConfigured } from "@/lib/db";
import { getAdminFormat, getAdminLabels } from "@/lib/admin/request";
import { clearedHref, currentHref } from "@/lib/admin/sort";
import { counted, fill } from "@/lib/admin/text";
import { EMPTY } from "@/lib/format";
import { CompanyOptionsProvider } from "./company-options";
import { ContactDialog } from "./contact-dialog";
import { ContactsToolbar } from "./contacts-toolbar";
import {
  contactsQueryKey,
  countContactTabs,
  hasAnyContactFilter,
  listCompanyOptions,
  listContactChannels,
  listContacts,
  listReferences,
  parseContactFilters,
  parseContactsPage,
  type ContactFilters,
} from "./contacts-query";
import { ReferenceDialog } from "./reference-dialog";
import { CONTACT_TABS, wordFor } from "./vocabulary";

/**
 * RECRUITERS AND REFERENCES.
 *
 * Everything on this screen is someone else's personal data: name, email, phone
 * and LinkedIn of people who are not Marco. `Contact` and
 * `ProfessionalReference` have a CHECK in the database forcing `visibility =
 * 'private'`; no public surface reads from here, and the actions never take
 * `visibility` as input. The reading module (`./contacts-query`) does not log
 * error payloads, for the same reason.
 *
 * Two tabs, both read by the server (`?tab=`). A record opens in a window: a
 * click on the row presses its edit button, which is also the keyboard's way.
 */

// Session guard + searchParams: this route is never prerendered.
export const dynamic = "force-dynamic";

const PATH = "/admin/contacts";
const COLS = 5;
const WIDE = "hidden md:table-cell";

type Params = Record<string, string | string[] | undefined>;

export default async function ContactsPage({ searchParams }: PageProps<"/admin/contacts">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const params: Params = await searchParams;
  const filters = parseContactFilters(params);
  const page = parseContactsPage(params.page);
  const [counts, channels, companies, labels, { formatNumber }] = await Promise.all([
    countContactTabs(),
    listContactChannels(),
    listCompanyOptions(),
    getAdminLabels(),
    getAdminFormat(),
  ]);
  const { contacts: words, vocab, common } = labels;
  const isContacts = filters.tab === "contacts";

  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      {/* The companies and the words of the dialogs travel ONCE for the page. */}
      <CompanyOptionsProvider
        companies={companies}
        words={{
          contact: words.contact,
          reference: words.reference,
          vocab: { channel: vocab.channel, referenceLanguage: vocab.referenceLanguage },
        }}
      >
        <div className="space-y-6 font-text">
          <PageHeader
            title={words.title}
            description={words.description}
            actions={isContacts ? <ContactDialog /> : <ReferenceDialog />}
          />

          <nav aria-label={words.tabs.label} className="flex flex-wrap items-center gap-2">
            {CONTACT_TABS.map((tab) => (
              <Button key={tab} asChild variant="ghost">
                <Link href={tab === "contacts" ? PATH : `${PATH}?tab=${tab}`} aria-current={filters.tab === tab ? "page" : undefined}>
                  {words.tabs[tab]}
                  <span className="font-label text-sm text-muted-foreground">{formatNumber(counts[tab])}</span>
                </Link>
              </Button>
            ))}
          </nav>

          <div className="space-y-4">
            <ContactsToolbar
              {...filters}
              words={{ filters: words.filters, channel: vocab.channel, clear: common.states.clear }}
              channels={channels}
              companies={companies}
              page={page}
              position="top"
            />

            <Suspense
              key={contactsQueryKey(filters, page)}
              fallback={
                <PeopleTable labels={labels} contacts={isContacts}>
                  <TableStateRow
                    cols={COLS}
                    state="loading"
                    message={isContacts ? words.states.loadingContacts : words.states.loadingReferences}
                  />
                </PeopleTable>
              }
            >
              {isContacts ? (
                <ContactRows params={params} filters={filters} page={page} labels={labels} />
              ) : (
                <ReferenceRows params={params} filters={filters} page={page} labels={labels} />
              )}
            </Suspense>
          </div>

          <p className="flex max-w-[72ch] items-start gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {words.privacy}
          </p>
        </div>
      </CompanyOptionsProvider>
    </AdminShell>
  );
}

/** The state of a list that has no row, for either tab. */
function emptyState(
  result: { failed: boolean },
  filters: ContactFilters,
  params: Params,
  labels: AdminDictionary,
  which: "Contacts" | "References",
) {
  const { contacts: words, common } = labels;
  if (result.failed) {
    return dbConfigured ? (
      <TableStateRow
        cols={COLS}
        state="failed"
        message={words.states[`failed${which}`]}
        action={{ href: currentHref(PATH, params), label: common.retry }}
      />
    ) : (
      <TableStateRow cols={COLS} state="failed" message={common.states.noDatabase} />
    );
  }
  return hasAnyContactFilter(filters) ? (
    <TableStateRow
      cols={COLS}
      state="filtered"
      message={words.states[`filtered${which}`]}
      action={{ href: clearedHref(PATH, filters.tab === "contacts" ? {} : { tab: filters.tab }), label: common.states.clear }}
    />
  ) : (
    <TableStateRow cols={COLS} state="empty" message={words.states[`empty${which}`]} />
  );
}

/* ── tab: contacts ────────────────────────────────────────────────────────── */

async function ContactRows({
  params,
  filters,
  page,
  labels,
}: {
  params: Params;
  filters: ContactFilters;
  page: number;
  labels: AdminDictionary;
}) {
  const { contacts: words, vocab } = labels;
  const [result, { formatNumber }] = await Promise.all([listContacts({ filters, page }), getAdminFormat()]);

  return (
    <>
      <PeopleTable labels={labels} contacts>
        {result.failed || result.rows.length === 0
          ? emptyState(result, filters, params, labels, "Contacts")
          : result.rows.map((row) => (
              <OpensRow key={row.id}>
                <TableCell className="max-w-0">
                  <div className="truncate font-semibold" title={row.name}>
                    {row.name}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">{row.roleTitle || EMPTY}</div>
                </TableCell>

                <TableCell className={`${WIDE} max-w-0`}>
                  <div className="truncate" title={row.company?.name ?? undefined}>
                    {row.company?.name ?? EMPTY}
                  </div>
                  {row.application && (
                    <Link
                      href={`/admin/applications/${row.application.id}`}
                      className="inline-flex min-h-6 max-w-full items-center text-sm hover:underline"
                      title={row.application.folderName}
                    >
                      <StageLabel stage={row.application.stage} words={vocab} />
                    </Link>
                  )}
                </TableCell>

                <TableCell className={`${WIDE} max-w-0`}>
                  <ContactLinks
                    email={row.email}
                    phone={row.phone}
                    linkedinUrl={row.linkedinUrl}
                    linkedin={words.linkedin}
                  />
                </TableCell>

                <TableCell className={WIDE}>
                  <div>{wordFor(vocab.channel, row.channel)}</div>
                  <div className="text-sm text-muted-foreground">
                    {[
                      row.timezone,
                      row._count.events > 0 && counted(words.events, row._count.events, formatNumber(row._count.events)),
                      row._count.interviews > 0 &&
                        counted(words.interviews, row._count.interviews, formatNumber(row._count.interviews)),
                    ]
                      .filter(Boolean)
                      .join(" · ") || EMPTY}
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1.5">
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
                    <ConfirmDelete
                      id={row.id}
                      name={row.name}
                      title={fill(words.contact.delete.title, { name: row.name })}
                      lost={words.contact.delete.lost}
                      confirmLabel={words.contact.delete.confirm}
                      triggerLabel={fill(words.contact.delete.trigger, { name: row.name })}
                      action={deleteContact}
                    />
                  </div>
                </TableCell>
              </OpensRow>
            ))}
      </PeopleTable>

      <ContactsToolbar
        {...filters}
        page={result.page}
        totalPages={result.totalPages}
        total={result.failed ? undefined : result.total}
        position="bottom"
      />
    </>
  );
}

/* ── tab: references ──────────────────────────────────────────────────────── */

async function ReferenceRows({
  params,
  filters,
  page,
  labels,
}: {
  params: Params;
  filters: ContactFilters;
  page: number;
  labels: AdminDictionary;
}) {
  const { contacts: words, vocab } = labels;
  const result = await listReferences({ filters, page });

  return (
    <>
      <PeopleTable labels={labels} contacts={false}>
        {result.failed || result.rows.length === 0
          ? emptyState(result, filters, params, labels, "References")
          : result.rows.map((row) => {
              const where = [row.roleTitle, row.companyName].filter(Boolean).join(" · ");
              return (
                <OpensRow key={row.id}>
                  <TableCell className="max-w-0">
                    <div className="truncate font-semibold" title={row.name}>
                      {row.name}
                    </div>
                    <div className="truncate font-label text-xs text-muted-foreground">{row.slug}</div>
                  </TableCell>

                  <TableCell className={`${WIDE} max-w-0`}>
                    <div className="truncate">{row.relationship || EMPTY}</div>
                    <div className="truncate text-sm text-muted-foreground" title={where || undefined}>
                      {where || EMPTY}
                    </div>
                  </TableCell>

                  <TableCell className={`${WIDE} max-w-0`}>
                    <ContactLinks
                      email={row.email}
                      phone={row.phone}
                      linkedinUrl={row.linkedinUrl}
                      linkedin={words.linkedin}
                    />
                  </TableCell>

                  <TableCell className={WIDE}>
                    {row.canContact ? (
                      <div>{words.canContact}</div>
                    ) : (
                      <div title={words.noConsentHint}>
                        {words.noConsent}
                        <span className="block text-sm text-muted-foreground">{words.noConsentHint}</span>
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">{wordFor(vocab.referenceLanguage, row.language)}</div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5">
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
                      <ConfirmDelete
                        id={row.id}
                        name={row.name}
                        title={fill(words.reference.delete.title, { name: row.name })}
                        lost={words.reference.delete.lost}
                        confirmLabel={words.reference.delete.confirm}
                        triggerLabel={fill(words.reference.delete.trigger, { name: row.name })}
                        action={deleteProfessionalReference}
                      />
                    </div>
                  </TableCell>
                </OpensRow>
              );
            })}
      </PeopleTable>

      <ContactsToolbar
        {...filters}
        page={result.page}
        totalPages={result.totalPages}
        total={result.failed ? undefined : result.total}
        position="bottom"
      />
    </>
  );
}

/** The header of either table, shared by the loading state and the data. */
function PeopleTable({
  labels,
  contacts,
  children,
}: {
  labels: AdminDictionary;
  contacts: boolean;
  children: React.ReactNode;
}) {
  const { columns } = labels.contacts;
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead>{columns.name}</TableHead>
          <TableHead className={WIDE}>{contacts ? columns.company : columns.relationship}</TableHead>
          <TableHead className={`${WIDE} w-64`}>{columns.contact}</TableHead>
          <TableHead className={`${WIDE} w-52`}>{contacts ? columns.channel : columns.consent}</TableHead>
          <TableHead className="w-28 text-right">{columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

/**
 * The ways to reach someone, stacked. Each link is a target of at least 24px
 * (WCAG 2.2, 2.5.8): they are stacked links, not running text.
 */
const CONTACT_LINK = "flex min-h-6 min-w-0 items-center gap-1.5 text-sm text-foreground underline-offset-4 hover:underline";

function ContactLinks({
  email,
  phone,
  linkedinUrl,
  linkedin,
}: {
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  linkedin: string;
}) {
  if (!email && !phone && !linkedinUrl) return <span className="text-muted-foreground">{EMPTY}</span>;
  return (
    <div>
      {email && (
        <a href={`mailto:${email}`} className={CONTACT_LINK} title={email}>
          <Mail aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{email}</span>
        </a>
      )}
      {phone && (
        <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={CONTACT_LINK} title={phone}>
          <Phone aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{phone}</span>
        </a>
      )}
      {/* Schemes in an allowlist: `linkedinUrl` comes from the database (the
          form OR the agent's sync), and an arbitrary scheme in `href` is a
          surface for `javascript:`. Outside the list, no link. */}
      {linkedinUrl && /^https?:\/\//i.test(linkedinUrl) && (
        <a
          href={linkedinUrl}
          target="_blank"
          // `noreferrer` too: the Referer would take the backoffice's URL, with
          // its filters, outside.
          rel="noreferrer"
          className={CONTACT_LINK}
          title={linkedinUrl}
        >
          <ExternalLink aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{linkedin}</span>
        </a>
      )}
    </div>
  );
}
