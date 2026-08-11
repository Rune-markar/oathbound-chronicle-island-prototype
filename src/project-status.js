import { STATUS_CATEGORIES, STATUS_ENTRIES, STATUS_LEDGER_META, summarizeStatusEntries } from "./project-status-data.js";

const elements = {
  auditSummary: document.querySelector("#auditSummary"),
  maintenanceRule: document.querySelector("#maintenanceRule"),
  categoryFilters: document.querySelector("#categoryFilters"),
  search: document.querySelector("#ledgerSearch"),
  overview: document.querySelector("#ledgerOverview"),
  entries: document.querySelector("#ledgerEntries"),
  resultCount: document.querySelector("#resultCount"),
  lastAudit: document.querySelector("#lastAudit"),
};

let activeCategory = "all";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function sourceMarkup(item) {
  const content = `<span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.ref)}</strong><small>${escapeHtml(item.kind)}</small>`;
  return item.href ? `<a href="${escapeHtml(item.href)}" ${/^https?:/.test(item.href) ? 'target="_blank" rel="noreferrer"' : ""}>${content}</a>` : `<div>${content}</div>`;
}

function entryMarkup(item) {
  const category = STATUS_CATEGORIES[item.category];
  return `<article class="ledger-entry is-${escapeHtml(category.tone)}" id="${escapeHtml(item.id)}">
    <header><span>${escapeHtml(item.area)}</span><b>${escapeHtml(category.label)}</b><time datetime="${escapeHtml(item.updatedAt)}">更新 ${escapeHtml(item.updatedAt)}</time></header>
    <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p>
    <details><summary>判定根拠と出典を表示</summary><div class="entry-evidence"><p>${escapeHtml(item.evidence)}</p><div class="source-grid">${item.sources.map(sourceMarkup).join("")}</div></div></details>
  </article>`;
}

function matches(item) {
  if (activeCategory !== "all" && item.category !== activeCategory) return false;
  const query = elements.search.value.trim().toLocaleLowerCase("ja");
  if (!query) return true;
  return [item.area, item.title, item.summary, item.evidence, ...item.sources.flatMap((itemSource) => [itemSource.label, itemSource.ref])].join(" ").toLocaleLowerCase("ja").includes(query);
}

function renderEntries() {
  const filtered = STATUS_ENTRIES.filter(matches);
  elements.entries.innerHTML = filtered.map(entryMarkup).join("") || '<p class="empty-result">条件に一致する項目はありません。</p>';
  elements.resultCount.textContent = `${filtered.length} / ${STATUS_ENTRIES.length}件`;
}

function render() {
  const summary = summarizeStatusEntries();
  elements.auditSummary.innerHTML = `<div><dt>履歴タスク</dt><dd>${STATUS_LEDGER_META.auditScope.codexPrimaryTasks}</dd></div><div><dt>Git</dt><dd>${STATUS_LEDGER_META.auditScope.gitCommits} commits</dd></div><div><dt>作業ツリー</dt><dd>${STATUS_LEDGER_META.auditScope.workingTreeIncluded ? "含む" : "除外"}</dd></div>`;
  elements.maintenanceRule.textContent = STATUS_LEDGER_META.maintenanceRule;
  elements.lastAudit.textContent = STATUS_LEDGER_META.lastAuditedAt;
  elements.categoryFilters.innerHTML = `<button type="button" class="is-active" data-category="all">すべて <b>${STATUS_ENTRIES.length}</b></button>${Object.entries(STATUS_CATEGORIES).map(([id, category]) => `<button type="button" data-category="${escapeHtml(id)}">${escapeHtml(category.label)} <b>${summary[id]}</b></button>`).join("")}`;
  elements.overview.innerHTML = Object.entries(STATUS_CATEGORIES).map(([id, category]) => `<button type="button" class="is-${escapeHtml(category.tone)}" data-category="${escapeHtml(id)}"><small>${escapeHtml(category.label)}</small><strong>${summary[id]}</strong><span>${escapeHtml(category.description)}</span></button>`).join("");
  renderEntries();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll("[data-category]").forEach((candidate) => candidate.classList.toggle("is-active", candidate.dataset.category === activeCategory));
  renderEntries();
});
elements.search.addEventListener("input", renderEntries);
render();
