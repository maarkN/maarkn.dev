/**
 * The fake filesystem behind `ls` and `cat <file>`: each file name maps to
 * the command that prints it. UI metadata, not content — the only fixed map
 * in the terminal module. Names stay in English in every locale.
 */
export const FILES: Readonly<Record<string, string>> = {
  "whoami.txt": "whoami",
  "experience.log": "experience",
  "skills.sys": "skills",
  "projects.db": "projects",
  "writing.md": "writing",
  "contact.sh": "contact",
  "cv.pdf": "cv",
};

/** File names in `ls` order (also the Tab completion pool after `cat `). */
export const FILE_NAMES: readonly string[] = Object.keys(FILES);
