import { useEffect, useMemo, useState } from "react";
import { websitePages } from "./data";
import type { ContentComponent, Language, Placement, ViewMode } from "./types";

type SheetPayload = {
  components: ContentComponent[];
  placements: Placement[];
};

function composePreview(items: ContentComponent[], language: Language) {
  return items.map((item) => item[language]).filter(Boolean).join("\n\n");
}

function formatUpdatedAt(value?: string) {
  return value || "未更新";
}

export default function App() {
  const [view, setView] = useState<ViewMode>("components");
  const [language, setLanguage] = useState<Language>("zh");
  const [componentRows, setComponentRows] = useState<ContentComponent[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [selectedPlacementId, setSelectedPlacementId] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState("等待 Google Sheet 資料");

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
          setSelectedComponentId((current) => (payload.components.some((item) => item.id === current) ? current : payload.components[0].id));
        }
        if (payload.placements?.length) {
          setPlacements(payload.placements);
          setSelectedPlacementId((current) => (payload.placements.some((item) => item.id === current) ? current : payload.placements[0].id));
          setSelectedTags((current) => (current.length ? current : payload.placements[0].refs));
        }
        setSyncStatus("已同步 Google Sheet");
      } catch {
        if (!cancelled) setSyncStatus("目前顯示本機資料，尚未連上 Google Sheet");
      }
    }

    loadFromSheet();
    return () => {
      cancelled = true;
    };
  }, []);

  const componentMap = useMemo(() => {
    const map = new Map<string, ContentComponent>();
    componentRows.forEach((item) => {
      map.set(item.id, item);
      map.set(item.title, item);
    });
    return map;
  }, [componentRows]);
  const selectedComponent = componentRows.find((item) => item.id === selectedComponentId) ?? null;
  const selectedPlacement = placements.find((item) => item.id === selectedPlacementId) ?? null;
  const selectedPlacementComponents = selectedTags
    .map((id) => componentMap.get(id))
    .filter(Boolean) as ContentComponent[];
  const availableTags = componentRows;

  useEffect(() => {
    if (!selectedPlacement) return;
    setSelectedTags(selectedPlacement.refs);
  }, [selectedPlacementId, selectedPlacement?.refs.join("|")]);

  const selectedPlacementPreview = selectedPlacementComponents.length ? composePreview(selectedPlacementComponents, language) : "";
  const selectedComponentPreview = selectedComponent ? selectedComponent[language] : "";
  const selectedComponentAlt = selectedComponent ? selectedComponent[language === "zh" ? "en" : "zh"] : "";

  const toggleTag = (tag: string) => {
    const matched = componentRows.find((item) => item.id === tag || item.title === tag);
    if (!matched) return;
    setSelectedTags((current) => (current.includes(matched.id) ? current.filter((item) => item !== matched.id) : [...current, matched.id]));
  };

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
          <span>元件 {componentRows.length}</span>
          <span>展場 {placements.length}</span>
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
          <div className="hint">目前只顯示 {language === "zh" ? "中文" : "英文"}，右側為純閱讀模式。</div>
        </header>

        <section className={`workspace ${view}`}>
          <section className="panel list-panel">
            <h2>{view === "components" ? "文案元件名稱" : view === "exhibition" ? "展場區域" : "官網頁面"}</h2>
            <div className="list">
              {view === "components" &&
                (componentRows.length ? (
                componentRows.map((item) => (
                  <button key={item.id} className={`item ${selectedComponent?.id === item.id ? "selected" : ""}`} onClick={() => setSelectedComponentId(item.id)}>
                    <strong>{item.title}</strong>
                    <span>{item.id}</span>
                    <em>{formatUpdatedAt(item.updatedAt)}</em>
                  </button>
                ))
                ) : (
                  <div className="empty-state">尚未從 Google Sheet 載入文案元件。</div>
                ))}

              {view === "exhibition" &&
                (placements.length ? (
                placements.map((item) => (
                  <button key={item.id} className={`item ${selectedPlacement?.id === item.id ? "selected" : ""}`} onClick={() => setSelectedPlacementId(item.id)}>
                    <strong>
                      {item.number} {item.title}
                    </strong>
                    <span>{item.floor} · {item.area}</span>
                    <em>{formatUpdatedAt(item.updatedAt)}</em>
                  </button>
                ))
                ) : (
                  <div className="empty-state">尚未從 Google Sheet 載入展場區域。</div>
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

          <section className="panel middle-panel">
            {view === "components" && selectedComponent && (
              <div className="stack">
                <div className="editor-header">
                  <div>
                    <p className="eyebrow">Google Sheet 原文</p>
                    <h2>{selectedComponent.title}</h2>
                    <p>{selectedComponent.id}</p>
                  </div>
                  <span className="badge">{formatUpdatedAt(selectedComponent.updatedAt)}</span>
                </div>
                <div className="readonly-block">
                  <div className="readonly-label">中文</div>
                  <div className="readonly-text">{selectedComponent.zh || "（空白）"}</div>
                </div>
                <div className="readonly-block">
                  <div className="readonly-label">英文</div>
                  <div className="readonly-text">{selectedComponent.en || "（empty）"}</div>
                </div>
              </div>
            )}

            {view === "exhibition" && selectedPlacement && (
              <div className="stack">
                <div className="editor-header">
                  <div>
                    <p className="eyebrow">展場區域</p>
                    <h2>
                      {selectedPlacement.number} {selectedPlacement.title}
                    </h2>
                    <p>
                      {selectedPlacement.floor} · {selectedPlacement.area}
                    </p>
                  </div>
                  <span className="badge">{formatUpdatedAt(selectedPlacement.updatedAt)}</span>
                </div>

                <div className="readonly-block">
                  <div className="readonly-label">文案元件 Tag</div>
                  <div className="tag-box">
                    {availableTags.map((item) => {
                      const active = selectedTags.includes(item.id) || selectedTags.includes(item.title);
                      return (
                        <button key={item.id} className={`tag ${active ? "active" : ""}`} onClick={() => toggleTag(item.id)}>
                          {item.title}
                        </button>
                      );
                    })}
                  </div>
                  <div className="save-note">只能從既有文案元件名稱選擇，多選後會在右側組合成完整文案。</div>
                </div>

                <div className="readonly-block">
                  <div className="readonly-label">已選元件</div>
                  <div className="readonly-text">{selectedPlacementComponents.map((item) => item.title).join("、") || "尚未選擇"}</div>
                </div>
              </div>
            )}

            {view === "website" && (
              <div className="stack">
                <div className="editor-header">
                  <div>
                    <p className="eyebrow">官網頁面</p>
                    <h2>頁面文案總覽</h2>
                    <p>目前為純閱讀模式</p>
                  </div>
                </div>
                <div className="preview-list">
                  {websitePages.map((page) => {
                    const refs = page.refs.map((id) => componentMap.get(id)).filter(Boolean) as ContentComponent[];
                    return (
                      <article key={page.id} className="preview-card">
                        <strong>{page.title}</strong>
                        <p>{page.id}</p>
                        <p>{composePreview(refs, language) || "（未對應內容）"}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="panel preview-panel">
            <h2>右側顯示</h2>

            {view === "components" && selectedComponent && (
              <article className="preview-card">
                <strong>{selectedComponent.title}</strong>
                <p className="preview-subtitle">
                  中文 / 英文切換對照
                </p>
                <div className="preview-rows">
                  <div>
                    <span className="readonly-label">中文</span>
                    <p>{selectedComponent.zh || "（空白）"}</p>
                  </div>
                  <div>
                    <span className="readonly-label">英文</span>
                    <p>{selectedComponent.en || "（empty）"}</p>
                  </div>
                  <div>
                    <span className="readonly-label">目前選取語系</span>
                    <p>{selectedComponentPreview || "（空白）"}</p>
                  </div>
                  <div>
                    <span className="readonly-label">另一語系</span>
                    <p>{selectedComponentAlt || "（空白）"}</p>
                  </div>
                </div>
              </article>
            )}

            {view === "exhibition" && selectedPlacement && (
              <article className="preview-card">
                <strong>
                  {selectedPlacement.number} {selectedPlacement.title}
                </strong>
                <p className="preview-subtitle">完整展場文案預覽</p>
                <p className="preview-copy">{selectedPlacementPreview || "請先勾選上方文案元件 tag"}</p>
                <p className="save-note">版位編號：{selectedPlacement.number} · 區域：{selectedPlacement.floor} · {selectedPlacement.area}</p>
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
        </section>
      </main>
    </div>
  );
}
