import { useEffect, useMemo, useState } from "react";
import type { Language, NotionContentObject, NotionDashboardData, NotionSectionTemplate, NotionZoneLayout } from "./types";

type ViewMode = "sections" | "zones";

function composeText(items: NotionContentObject[], language: Language) {
  return items.map((item) => item[language]).filter(Boolean).join("\n\n");
}

function objectLabel(item: NotionContentObject) {
  return `${item.title} · ${item.type}`;
}

function previewSection(section: NotionSectionTemplate, lookup: Map<string, NotionContentObject>) {
  const items = section.objectIds.map((id) => lookup.get(id)).filter(Boolean) as NotionContentObject[];
  return items;
}

function previewZone(zone: NotionZoneLayout, sections: NotionSectionTemplate[], lookup: Map<string, NotionContentObject>) {
  return zone.sectionIds
    .map((id) => sections.find((section) => section.id === id))
    .filter(Boolean)
    .flatMap((section) => previewSection(section as NotionSectionTemplate, lookup));
}

function formatVisibility(value: boolean) {
  return value ? "Visible" : "Hidden";
}

export default function App() {
  const [language, setLanguage] = useState<Language>("zh");
  const [view, setView] = useState<ViewMode>("sections");
  const [data, setData] = useState<NotionDashboardData>({ contentObjects: [], sectionTemplates: [], zoneLayouts: [] });
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [loadingState, setLoadingState] = useState("Loading Notion data...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/notion");
        if (!response.ok) throw new Error(`Failed to load: ${response.status}`);
        const payload = (await response.json()) as NotionDashboardData;
        if (cancelled) return;
        setData(payload);
        setSelectedSectionId((current) => payload.sectionTemplates.some((item) => item.id === current) ? current : payload.sectionTemplates[0]?.id ?? "");
        setSelectedZoneId((current) => payload.zoneLayouts.some((item) => item.id === current) ? current : payload.zoneLayouts[0]?.id ?? "");
        setLoadingState("Connected to Notion");
        setError("");
      } catch (err) {
        if (cancelled) return;
        setLoadingState("Offline fallback");
        setError(err instanceof Error ? err.message : "Failed to load Notion data");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const contentLookup = useMemo(() => {
    const map = new Map<string, NotionContentObject>();
    data.contentObjects.forEach((item) => map.set(item.id, item));
    return map;
  }, [data.contentObjects]);

  const selectedSection = data.sectionTemplates.find((item) => item.id === selectedSectionId) ?? null;
  const selectedZone = data.zoneLayouts.find((item) => item.id === selectedZoneId) ?? null;

  const sectionPreviewItems = selectedSection ? previewSection(selectedSection, contentLookup) : [];
  const zonePreviewItems = selectedZone ? previewZone(selectedZone, data.sectionTemplates, contentLookup) : [];
  const selectedSectionContent = sectionPreviewItems.map((item) => item[language]).filter(Boolean).join("\n\n");
  const selectedZoneContent = zonePreviewItems.map((item) => item[language]).filter(Boolean).join("\n\n");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <p className="eyebrow">TAICHI Notion Dashboard</p>
          <h1>Content Browser</h1>
          <p className="brand-copy">即時瀏覽 `Content Objects - Dedup`、`Section Templates`、`Zone Layout`。</p>
        </div>

        <div className="nav-group">
          <button className={view === "sections" ? "nav-button active" : "nav-button"} onClick={() => setView("sections")}>Section Templates</button>
          <button className={view === "zones" ? "nav-button active" : "nav-button"} onClick={() => setView("zones")}>Zone Layout</button>
        </div>

        <div className="meta-grid">
          <div className="meta-card"><span>Content Objects</span><strong>{data.contentObjects.length}</strong></div>
          <div className="meta-card"><span>Section Templates</span><strong>{data.sectionTemplates.length}</strong></div>
          <div className="meta-card"><span>Zone Layout</span><strong>{data.zoneLayouts.length}</strong></div>
          <div className="meta-card"><span>Status</span><strong>{error || loadingState}</strong></div>
        </div>
      </aside>

      <main className="main-pane">
        <header className="topbar">
          <div className="segmented-control">
            <button className={language === "zh" ? "active" : ""} onClick={() => setLanguage("zh")}>中文</button>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>英文</button>
          </div>
          <div className="status-pill">{view === "sections" ? "Browse by Section Template" : "Browse by Zone Layout"}</div>
        </header>

        <section className="workspace-grid">
          <section className="panel list-panel">
            <h2>{view === "sections" ? "Section Templates" : "Zone Layout"}</h2>
            <div className="card-list">
              {view === "sections" &&
                data.sectionTemplates.map((item) => (
                  <button key={item.id} className={`card ${selectedSection?.id === item.id ? "selected" : ""}`} onClick={() => setSelectedSectionId(item.id)}>
                    <strong>{item.title}</strong>
                    <span>{item.sectionType} · {item.layoutStyle}</span>
                    <em>{formatVisibility(item.visible)}</em>
                  </button>
                ))}

              {view === "zones" &&
                data.zoneLayouts.map((item) => (
                  <button key={item.id} className={`card ${selectedZone?.id === item.id ? "selected" : ""}`} onClick={() => setSelectedZoneId(item.id)}>
                    <strong>{item.order}. {item.title}</strong>
                    <span>{item.page}</span>
                    <em>{formatVisibility(item.visible)}</em>
                  </button>
                ))}
            </div>
          </section>

          <section className="panel center-panel">
            {view === "sections" && selectedSection && (
              <div className="stack">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Section Template</p>
                    <h2>{selectedSection.title}</h2>
                    <p>{selectedSection.sectionType} · {selectedSection.layoutStyle}</p>
                  </div>
                  <span className="badge">{selectedSection.visible ? "Visible" : "Hidden"}</span>
                </div>

                <div className="object-list">
                  {sectionPreviewItems.length ? sectionPreviewItems.map((item) => (
                    <article key={item.id} className="object-card">
                      <div className="object-card-head">
                        <strong>{objectLabel(item)}</strong>
                        <span>{item.updatedAt}</span>
                      </div>
                      <p>{item[language] || "（空白）"}</p>
                    </article>
                  )) : <div className="empty-state">這個 section 還沒有連結任何 content object。</div>}
                </div>
              </div>
            )}

            {view === "zones" && selectedZone && (
              <div className="stack">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Zone Layout</p>
                    <h2>{selectedZone.order}. {selectedZone.title}</h2>
                    <p>{selectedZone.page}</p>
                  </div>
                  <span className="badge">{selectedZone.visible ? "Visible" : "Hidden"}</span>
                </div>

                <div className="object-list">
                  {zonePreviewItems.length ? zonePreviewItems.map((item) => (
                    <article key={item.id} className="object-card">
                      <div className="object-card-head">
                        <strong>{objectLabel(item)}</strong>
                        <span>{item.updatedAt}</span>
                      </div>
                      <p>{item[language] || "（空白）"}</p>
                    </article>
                  )) : <div className="empty-state">這個 zone 還沒有對應任何 section template。</div>}
                </div>
              </div>
            )}
          </section>

          <section className="panel preview-panel">
            <h2>完整文案</h2>
            {view === "sections" && selectedSection && (
              <article className="preview-card">
                <strong>{selectedSection.title}</strong>
                <p className="preview-subtitle">Section 內所有文案物件</p>
                <p className="preview-copy">{selectedSectionContent || "（沒有內容）"}</p>
              </article>
            )}

            {view === "zones" && selectedZone && (
              <article className="preview-card">
                <strong>{selectedZone.order}. {selectedZone.title}</strong>
                <p className="preview-subtitle">Zone 內所有 section 的完整文案</p>
                <p className="preview-copy">{selectedZoneContent || "（沒有內容）"}</p>
              </article>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
