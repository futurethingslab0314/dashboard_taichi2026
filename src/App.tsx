import { useEffect, useMemo, useState } from "react";
import { components as seedComponents, exhibitionPlacements, websitePages } from "./data";
import type { ContentComponent, DraftMap, Language, Placement, ViewMode } from "./types";

type SheetPayload = {
  components: ContentComponent[];
  placements: Placement[];
};

const storageKey = "big-bang-futures-drafts";

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function composePreview(items: ContentComponent[], language: Language) {
  return items.map((item) => item[language]).filter(Boolean).join("\n\n");
}

function splitTagCell(value: string) {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinTagCell(values: string[]) {
  return [...new Set(values)].join(", ");
}

function placementFromSheetRow(row: string[], rowNumber: number): Placement {
  return {
    sheetRow: rowNumber,
    id: row[0] ?? `row-${rowNumber}`,
    number: row[0] ?? "",
    title: row[1] ?? "",
    area: row[2] ?? "",
    refs: splitTagCell(row[3] ?? ""),
    updatedAt: row[4] ?? "",
    floor: row[1] === "5F" || row[1] === "12F" ? (row[1] as "5F" | "12F") : undefined,
  };
}

function componentFromSheetRow(row: string[], rowNumber: number): ContentComponent {
  return {
    sheetRow: rowNumber,
    id: row[0] ?? `row-${rowNumber}`,
    title: row[0] ?? "",
    zh: row[1] ?? "",
    en: row[2] ?? "",
    updatedAt: row[3] ?? "",
    status: "done",
    kind: "sheet",
    scope: "shared",
  };
}

export default function App() {
  const [view, setView] = useState<ViewMode>("components");
  const [language, setLanguage] = useState<Language>("zh");
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [componentRows, setComponentRows] = useState(seedComponents);
  const [placements, setPlacements] = useState(exhibitionPlacements);
  const [selectedComponentId, setSelectedComponentId] = useState(seedComponents[0]?.id ?? "");
  const [selectedPlacementId, setSelectedPlacementId] = useState(exhibitionPlacements[0]?.id ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(exhibitionPlacements[0]?.refs ?? []);
  const [syncStatus, setSyncStatus] = useState<string>("已連接本機資料");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        drafts?: DraftMap;
        components?: ContentComponent[];
        placements?: Placement[];
      };
      if (parsed.drafts) setDrafts(parsed.drafts);
      if (parsed.components) setComponentRows(parsed.components);
      if (parsed.placements) setPlacements(parsed.placements);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ drafts, components: componentRows, placements }));
  }, [drafts, componentRows, placements]);

  useEffect(() => {
    let cancelled = false;
    async function loadFromSheet() {
      try {
        const response = await fetch("/api/sheets");
        if (!response.ok) throw new Error(`load failed: ${response.status}`);
        const payload = (await response.json()) as SheetPayload;
        if (cancelled) return;
        if (payload.components?.length) {
          setComponentRows(payload.components);
          setSelectedComponentId((current) => payload.components.some((item) => item.id === current) ? current : payload.components[0].id);
        }
        if (payload.placements?.length) {
          setPlacements(payload.placements);
          setSelectedPlacementId((current) => payload.placements.some((item) => item.id === current) ? current : payload.placements[0].id);
        }
        setSyncStatus("已同步 Google Sheet");
      } catch {
        if (!cancelled) setSyncStatus("目前使用本機資料，尚未連上 Google Sheet");
      }
    }
    loadFromSheet();
    return () => {
      cancelled = true;
    };
  }, []);

  const componentMap = useMemo(() => new Map(componentRows.map((item) => [item.id, item])), [componentRows]);
  const selectedComponent = componentRows.find((item) => item.id === selectedComponentId) ?? componentRows[0];
  const selectedPlacement = placements.find((item) => item.id === selectedPlacementId) ?? placements[0];
  const selectedPlacementRefs = selectedPlacement ? selectedPlacement.refs.map((id) => componentMap.get(id)).filter(Boolean) as ContentComponent[] : [];
  const sharedComponents = componentRows.filter((item) => item.scope === "shared");
  const exhibitionComponents = componentRows.filter((item) => item.scope !== "website");

  useEffect(() => {
    if (!selectedPlacement) return;
    setSelectedTags(selectedPlacement.refs);
  }, [selectedPlacementId, selectedPlacement?.refs.join("|")]);

  const visibleText = (item: Pick<ContentComponent, "zh" | "en">) => item[language];

  const updateComponentDraft = (id: string, field: "zh" | "en", value: string) => {
    const current = componentMap.get(id);
    if (!current) return;
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { zh: current.zh, en: current.en }),
        [field]: value,
      },
    }));
  };

  const updatePlacementTags = (tag: string) => {
    setSelectedTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  async function saveToSheet(payload: unknown) {
    setIsSaving(true);
    setSyncStatus("儲存中...");
    try {
      const response = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `save failed: ${response.status}`);
      }
      const result = (await response.json()) as SheetPayload;
      if (result.components?.length) setComponentRows(result.components);
      if (result.placements?.length) setPlacements(result.placements);
      setSyncStatus("已寫回 Google Sheet");
      return true;
    } catch (error) {
      console.error(error);
      setSyncStatus("寫回失敗，仍保留本機草稿");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  const saveCurrentComponent = async () => {
    if (!selectedComponent) return;
    const draft = drafts[selectedComponent.id];
    if (!draft) return;
    const updatedAt = nowStamp();
    const nextComponent = { ...selectedComponent, ...draft, updatedAt };
    const ok = await saveToSheet({
      type: "component",
      row: selectedComponent.sheetRow,
      component: nextComponent,
    });
    if (ok) {
      setDrafts((current) => {
        const next = { ...current };
        delete next[selectedComponent.id];
        return next;
      });
    }
  };

  const savePlacement = async () => {
    if (!selectedPlacement) return;
    const updatedAt = nowStamp();
    const preview = selectedTags.map((id) => componentMap.get(id)).filter(Boolean) as ContentComponent[];
    const ok = await saveToSheet({
      type: "placement",
      row: selectedPlacement.sheetRow,
      placement: {
        ...selectedPlacement,
        refs: selectedTags,
        updatedAt,
        preview: composePreview(preview, "zh"),
      },
    });
    if (ok) {
      setPlacements((current) =>
        current.map((item) => (item.id === selectedPlacement.id ? { ...item, refs: selectedTags, updatedAt } : item)),
      );
    }
  };

  const selectedPlacementPreview = selectedTags
    .map((id) => componentMap.get(id))
    .filter(Boolean) as ContentComponent[];

  const selectionDirty = selectedComponent ? Boolean(drafts[selectedComponent.id]) : false;
  const placementDirty = selectedPlacement ? selectedTags.join("|") !== selectedPlacement.refs.join("|") : false;

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Big Bang! Futures</p>
          <h1>文案 dashboard</h1>
        </div>
        <nav className="nav">
          <button className={view === "components" ? "active" : ""} onClick={() => setView("components")}>文案元件</button>
          <button className={view === "exhibition" ? "active" : ""} onClick={() => setView("exhibition")}>展場文案</button>
          <button className={view === "website" ? "active" : ""} onClick={() => setView("website")}>官網文案</button>
        </nav>
        <div className="meta">
          <span>元件 {sharedComponents.length}</span>
          <span>展場 {exhibitionComponents.length}</span>
          <span>頁面 {websitePages.length}</span>
          <span>{syncStatus}</span>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="segmented">
            <button className={language === "zh" ? "active" : ""} onClick={() => setLanguage("zh")}>中文</button>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>英文</button>
          </div>
          <div className="hint">目前只顯示 {language === "zh" ? "中文" : "英文"}。</div>
        </header>

        <section className="grid two-col">
          <section className="panel">
            <h2>{view === "components" ? "文案元件名稱" : view === "exhibition" ? "展場區域" : "官網頁面"}</h2>
            <div className="list">
              {view === "components" &&
                componentRows.map((item) => (
                  <button key={item.id} className={`item ${selectedComponent?.id === item.id ? "selected" : ""}`} onClick={() => setSelectedComponentId(item.id)}>
                    <strong>{item.title}</strong>
                    <span>{item.id}</span>
                    <em>{item.updatedAt ?? "未更新"}</em>
                  </button>
                ))}
              {view === "exhibition" &&
                placements.map((item) => (
                  <button key={item.id} className={`item ${selectedPlacement?.id === item.id ? "selected" : ""}`} onClick={() => setSelectedPlacementId(item.id)}>
                    <strong>{item.number} {item.title}</strong>
                    <span>{item.floor} · {item.area}</span>
                    <em>{item.updatedAt ?? "未更新"}</em>
                  </button>
                ))}
              {view === "website" &&
                websitePages.map((page) => (
                  <button key={page.id} className="item selected" onClick={() => undefined}>
                    <strong>{page.title}</strong>
                    <span>{page.id}</span>
                    <em>{page.refs.length} refs</em>
                  </button>
                ))}
            </div>
          </section>

          <section className="panel editor">
            <div className="editor-head">
              <h2>{view === "components" ? "文案元件編輯" : view === "exhibition" ? "展場文案編輯" : "官網文案預覽"}</h2>
              {view === "components" && <button className="save-button" onClick={saveCurrentComponent} disabled={!selectionDirty || isSaving || !selectedComponent?.sheetRow}>Save</button>}
              {view === "exhibition" && <button className="save-button" onClick={savePlacement} disabled={!placementDirty || isSaving || !selectedPlacement?.sheetRow}>Save</button>}
            </div>

            {view === "components" && selectedComponent && (
              <>
                <div className="editor-header">
                  <div>
                    <h3>{selectedComponent.title}</h3>
                    <p>{selectedComponent.id}</p>
                  </div>
                  <span className="badge">{selectedComponent.updatedAt ?? "未更新"}</span>
                </div>
                <label className="field">
                  <span>中文</span>
                  <textarea className="edit-textarea" value={drafts[selectedComponent.id]?.zh ?? selectedComponent.zh} onChange={(event) => updateComponentDraft(selectedComponent.id, "zh", event.target.value)} />
                </label>
                <label className="field">
                  <span>英文</span>
                  <textarea className="edit-textarea" value={drafts[selectedComponent.id]?.en ?? selectedComponent.en} onChange={(event) => updateComponentDraft(selectedComponent.id, "en", event.target.value)} />
                </label>
              </>
            )}

            {view === "exhibition" && selectedPlacement && (
              <>
                <div className="editor-header">
                  <div>
                    <h3>{selectedPlacement.number} {selectedPlacement.title}</h3>
                    <p>{selectedPlacement.floor} · {selectedPlacement.area}</p>
                  </div>
                  <span className="badge">{selectedPlacement.updatedAt ?? "未更新"}</span>
                </div>
                <div className="tag-box">
                  {componentRows.map((item) => (
                    <button
                      key={item.id}
                      className={`tag ${selectedTags.includes(item.id) ? "active" : ""}`}
                      onClick={() => updatePlacementTags(item.id)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
                <div className="save-note">只能從既有文案元件名稱選擇，多選 tag 會直接存到同一欄。</div>
              </>
            )}

            {view === "website" && (
              <div className="preview-list">
                {websitePages.map((page) => {
                  const refs = page.refs.map((id) => componentMap.get(id)).filter(Boolean) as ContentComponent[];
                  return (
                    <article key={page.id} className="preview-card">
                      <strong>{page.title}</strong>
                      <p>{page.id}</p>
                      <p>{composePreview(refs, language)}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>

        <section className="panel preview-panel">
          <h2>右側總覽</h2>
          {view === "components" && selectedComponent && (
            <article className="preview-card">
              <strong>{selectedComponent.title}</strong>
              <p>{visibleText(drafts[selectedComponent.id] ?? selectedComponent)}</p>
              <p>updatedAt: {selectedComponent.updatedAt ?? "未更新"}</p>
            </article>
          )}
          {view === "exhibition" && selectedPlacement && (
            <article className="preview-card">
              <strong>{selectedPlacement.number} {selectedPlacement.title}</strong>
              <p>{composePreview(selectedPlacementPreview, language)}</p>
              <p>selected tags: {selectedTags.join(", ") || "none"}</p>
            </article>
          )}
          {view === "website" && (
            <div className="preview-list">
              {websitePages.map((page) => (
                <article key={page.id} className="preview-card">
                  <strong>{page.title}</strong>
                  <p>{page.refs.join(" · ")}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
