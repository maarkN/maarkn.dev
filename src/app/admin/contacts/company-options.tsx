"use client";

/**
 * A lista de empresas do `<Select>` dos formulários, entregue UMA vez.
 *
 * Por que um contexto e não uma prop: o dialog de edição é renderizado dentro
 * do `rows.map()`, e a base tem ~108 empresas. Passar a lista por prop em cada
 * linha copiaria as mesmas 108 opções 20 vezes no payload RSC de cada página —
 * centenas de KB para uma tabela de 20 linhas. O provider embrulha a tela
 * inteira, a lista viaja uma vez, e cada dialog lê do contexto.
 *
 * O provider aceita `children` vindos de Server Components: eles chegam já
 * renderizados e o contexto atravessa a árvore normalmente.
 */

import { createContext, useContext } from "react";
import type { CompanyOption } from "./contacts-query";

const CompanyOptionsContext = createContext<CompanyOption[]>([]);

export function CompanyOptionsProvider({
  companies,
  children,
}: {
  companies: CompanyOption[];
  children: React.ReactNode;
}) {
  return (
    <CompanyOptionsContext value={companies}>{children}</CompanyOptionsContext>
  );
}

export function useCompanyOptions(): CompanyOption[] {
  return useContext(CompanyOptionsContext);
}
