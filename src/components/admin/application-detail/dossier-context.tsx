/**
 * O que se sabe em volta da candidatura: a empresa, o projeto e a vaga.
 *
 * São três textos independentes. O da empresa é da EMPRESA (aparece em todas as
 * candidaturas dela), o contexto do projeto é desta candidatura e a descrição é
 * da vaga. As três seções aparecem sempre: a vazia diz o que falta, em vez de
 * sumir e deixar a dúvida se não há texto ou se a tela não o mostra.
 *
 * Só leitura. A edição é das telas novas do backoffice; hoje quem escreve é o
 * MCP.
 */

import { Card, CardContent } from "@/components/ui/card";
import { MarkdownBlock } from "./detail-row";

export interface DossierContextProps {
  company: { name: string; aboutMd: string | null } | null;
  projectInfoMd: string | null;
  job: { descriptionMd: string | null } | null;
}

function Section({
  title,
  value,
  empty,
}: {
  title: string;
  value: string | null | undefined;
  empty: string;
}) {
  return (
    <section>
      <h2 className="pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {value?.trim() ? (
        <MarkdownBlock value={value} className="text-foreground" />
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

export function DossierContext({
  company,
  projectInfoMd,
  job,
}: DossierContextProps) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <Section
          title="Sobre a empresa"
          value={company?.aboutMd}
          empty={
            company
              ? "Ainda não há informação sobre a empresa."
              : "Não há empresa ligada a esta candidatura."
          }
        />
        <Section
          title="Contexto do projeto"
          value={projectInfoMd}
          empty="Ainda não há informação sobre o projeto."
        />
        <Section
          title="Descrição da vaga"
          value={job?.descriptionMd}
          empty={
            job
              ? "A vaga ligada não tem descrição."
              : "Não há vaga ligada a esta candidatura."
          }
        />
      </CardContent>
    </Card>
  );
}
