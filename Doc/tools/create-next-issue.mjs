#!/usr/bin/env node
/**
 * Crée LA PROCHAINE issue du backlog (une seule par exécution).
 *
 * Pourquoi : GitHub ne permet pas de modifier la date de création d'une issue
 * (`created_at` est généré par le serveur). Pour que les issues n'aient pas
 * toutes la même heure de publication, on les crée une par une, au fil des
 * séances, à partir de ce backlog.
 *
 * Usage :
 *   GITHUB_TOKEN=xxx node DOC/tools/create-next-issue.mjs            # crée la prochaine
 *   GITHUB_TOKEN=xxx node DOC/tools/create-next-issue.mjs --dry-run  # affiche sans créer
 *
 * L'issue créée est retirée de backlog.json, la suivante devient la première.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const REPO = "Gianmarco-Ruberti/cicd-todo-app";
const DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKLOG = path.join(DIR, "backlog.json");

const token = process.env.GITHUB_TOKEN;
const dryRun = process.argv.includes("--dry-run");

if (!token) {
  console.error("GITHUB_TOKEN manquant (variable d'environnement).");
  process.exit(1);
}

const backlog = JSON.parse(await readFile(BACKLOG, "utf8"));

if (backlog.length === 0) {
  console.log("Backlog vide : toutes les issues ont déjà été créées.");
  process.exit(0);
}

const issue = backlog[0];
console.log(`Prochaine issue : ${issue.title}`);
console.log(`Labels          : ${issue.labels.join(", ")}`);

if (dryRun) {
  console.log("--dry-run : aucune issue créée, backlog.json inchangé.");
  process.exit(0);
}

const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "cicd-todo-app-backlog",
  },
  body: JSON.stringify({
    title: issue.title,
    body: issue.body,
    labels: issue.labels,
  }),
});

if (!res.ok) {
  console.error(`Échec ${res.status} : ${await res.text()}`);
  process.exit(1);
}

const created = await res.json();
await writeFile(BACKLOG, JSON.stringify(backlog.slice(1), null, 2) + "\n");

console.log(`Créée : #${created.number} ${created.html_url}`);
console.log(`Issues restantes dans le backlog : ${backlog.length - 1}`);
