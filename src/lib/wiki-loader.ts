// src/lib/wiki-loader.ts
// Reads markdown files from the Matrix Brain vault and returns content for system prompts

import { readFile, readdir } from "fs/promises";
import { join } from "path";

const VAULT_PATH = process.env.MATRIX_BRAIN_PATH || "./matrix-brain";

/**
 * Read a single wiki page from the vault
 */
export async function loadWikiPage(relativePath: string): Promise<string> {
  const fullPath = join(VAULT_PATH, "wiki", relativePath);
  try {
    const content = await readFile(fullPath, "utf-8");
    return content;
  } catch (error) {
    console.error(`Failed to load wiki page: ${relativePath}`, error);
    return `[Page not found: ${relativePath}]`;
  }
}

/**
 * Read a skill SKILL.md file from the raw/claude-skills directory
 */
export async function loadSkill(skillPath: string): Promise<string> {
  const fullPath = join(VAULT_PATH, "raw", "claude-skills", skillPath);
  try {
    const content = await readFile(fullPath, "utf-8");
    return content;
  } catch (error) {
    console.error(`Failed to load skill: ${skillPath}`, error);
    return `[Skill not found: ${skillPath}]`;
  }
}

/**
 * List all project pages available in the vault
 */
export async function listProjects(): Promise<string[]> {
  const projectsDir = join(VAULT_PATH, "wiki", "projects");
  try {
    const files = await readdir(projectsDir);
    return files.filter((f) => f.endsWith(".md"));
  } catch (error) {
    console.error("Failed to list projects", error);
    return [];
  }
}

/**
 * Load multiple wiki pages at once and concatenate them
 * Each page is wrapped with a header showing the source file
 */
export async function loadWikiPages(paths: string[]): Promise<string> {
  const pages = await Promise.all(
    paths.map(async (path) => {
      const content = await loadWikiPage(path);
      return `\n--- [wiki/${path}] ---\n${content}`;
    })
  );
  return pages.join("\n");
}

/**
 * Load multiple skills at once and concatenate them
 */
export async function loadSkills(
  skills: { path: string; name: string }[]
): Promise<string> {
  const loaded = await Promise.all(
    skills.map(async (skill) => {
      const content = await loadSkill(skill.path);
      return `\n--- [Skill: ${skill.name}] ---\n${content}`;
    })
  );
  return loaded.join("\n");
}
