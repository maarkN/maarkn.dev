import { Database, FolderKanban, MessageSquare, Sparkles } from "lucide-react";
import { StatCard } from "@/app/admin/_components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { dbConfigured } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/format";
import { loadPlatformStats } from "./dashboard-data";

/**
 * Resto do backoffice, em segundo plano: portfólio, gerações de IA, chat
 * público e **a base de conhecimento (RAG)**.
 *
 * O cartão "Base de conhecimento" é a leitura do RAG do dashboard anterior e
 * foi preservado de propósito — é o único ponto da UI que mostra se
 * `KnowledgeChunk` foi ingerido e de quantas fontes. Sem ele, uma ingestão que
 * falhou fica invisível até o gerador produzir um CV sem evidência.
 */

const TILES = 4;
const GRID = "grid grid-cols-2 gap-3 md:grid-cols-4";

export function PlatformStatsSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: TILES }, (_, i) => (
        <Card key={`platform-stat-skeleton-${i}`} size="sm">
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export async function PlatformStats() {
  const stats = await loadPlatformStats();

  if (stats.failed) {
    return (
      <Card size="sm">
        <CardContent className="text-destructive">
          {dbConfigured
            ? "Não foi possível carregar os números do restante do backoffice."
            : "DATABASE_URL não configurada — projetos, gerações, chat e base de conhecimento ficam indisponíveis."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={GRID}>
      <StatCard
        label="Projetos"
        value={formatNumber(stats.projects)}
        hint={`${formatNumber(stats.featuredProjects)} em destaque`}
        icon={FolderKanban}
      />
      <StatCard
        label="Gerações"
        value={formatNumber(stats.generations)}
        hint={
          stats.lastGenerationAt
            ? `última em ${formatDateTime(stats.lastGenerationAt)}`
            : "nenhuma ainda"
        }
        icon={Sparkles}
      />
      <StatCard
        label="Chat"
        value={formatNumber(stats.chatTurns)}
        hint={`${formatNumber(stats.chatTurnsToday)} hoje`}
        icon={MessageSquare}
      />
      <StatCard
        label="Base de conhecimento"
        value={formatNumber(stats.knowledgeChunks)}
        hint={`${formatNumber(stats.knowledgeSources)} fonte(s) indexada(s)`}
        icon={Database}
      />
    </div>
  );
}
