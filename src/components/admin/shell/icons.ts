import {
  Briefcase,
  CalendarDays,
  FileText,
  FolderKanban,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Radar,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { CreateKey, NavKey } from "@/lib/admin/nav";

export const NAV_ICONS: Record<NavKey, LucideIcon> = {
  overview: LayoutDashboard,
  agenda: CalendarDays,
  applications: Briefcase,
  jobs: Radar,
  contacts: Users,
  generator: Sparkles,
  projects: FolderKanban,
  experiences: GraduationCap,
  notes: Newspaper,
  assistant: MessageSquare,
  apiKeys: KeyRound,
  audit: ScrollText,
  settings: Settings,
};

export const CREATE_ICONS: Record<CreateKey, LucideIcon> = {
  application: Briefcase,
  appointment: CalendarDays,
  project: FolderKanban,
  resume: FileText,
};
