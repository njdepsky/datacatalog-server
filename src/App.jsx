import { useState, useEffect, useRef, useCallback } from "react";

const API = "https://datacatalog-server-production.up.railway.app/api/data";

async function loadFromServer() {
  try {
    const res = await fetch(API);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function saveToServer(data) {
  try {
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (e) {
    console.warn("Save failed — is the server running?", e);
  }
}

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
const INITIAL_FOLDERS = [
  { id: "f1", name: "Air Quality", color: "#7eb8d4" },
  { id: "f2", name: "Water Quality", color: "#6bcfb0" },
  { id: "f3", name: "Deforestation", color: "#b8d47e" },
];

const INITIAL_DATASETS = [
  {
    id: "ds1",
    folderId: "f1",
    title: "EPA Air Quality System (AQS)",
    subtitle: "Ambient air pollution monitoring network across the United States",
    description: "",
    attributes: {
      temporalCoverage: "1980 – Present",
      temporalResolution: "Hourly / Daily",
      spatialCoverage: "United States",
      spatialResolution: "Point (monitoring stations)",
    },
    links: [
      { label: "Download Portal", url: "https://www.epa.gov/aqs" },
      { label: "Technical Documentation", url: "https://www.epa.gov/aqs/aqs-manuals-and-guides" },
    ],
    notes: `## Overview\nThe EPA AQS dataset contains measurements from over 4,000 monitoring stations across the US, Puerto Rico, and the Virgin Islands. Data includes criteria pollutants (PM2.5, PM10, O₃, CO, SO₂, NO₂) and air toxics.\n\n## Key Observations\n- Excellent temporal depth going back to the 1980s\n- Station density varies significantly by region\n- Requires careful handling of data gaps and instrument changes\n\n## Preprocessing Notes\nUse the pre-generated annual summary files for faster loading. The raw hourly files are very large (~5 GB/year for PM2.5 alone).`,
    tags: ["PM2.5", "ozone", "NOx", "criteria pollutants", "monitoring"],
    createdAt: "2024-11-10",
    updatedAt: "2025-02-14",
  },
  {
    id: "ds2",
    folderId: "f1",
    title: "OpenAQ Global Air Quality",
    subtitle: "Open-source aggregator of real-time air quality data worldwide",
    description: "",
    attributes: {
      temporalCoverage: "2015 – Present",
      temporalResolution: "Sub-hourly to Daily",
      spatialCoverage: "Global (100+ countries)",
      spatialResolution: "Point (monitoring stations)",
    },
    links: [
      { label: "API Documentation", url: "https://docs.openaq.org" },
      { label: "Explorer", url: "https://explore.openaq.org" },
    ],
    notes: `## Overview\nOpenAQ aggregates data from government air quality monitoring networks worldwide. Free API with generous rate limits.\n\n## Coverage Notes\nCoverage is uneven — very dense in Europe and North America, sparse in Africa and parts of Asia.\n\n## Data Quality\nVariable: data comes directly from national agencies with no harmonization. Units and pollutant definitions can differ across countries.`,
    tags: ["global", "API", "real-time", "PM2.5", "open data"],
    createdAt: "2024-12-01",
    updatedAt: "2025-01-20",
  },
  {
    id: "ds3",
    folderId: "f2",
    title: "USGS National Water Quality Monitoring Council",
    subtitle: "Integrated federal water quality data across US watersheds",
    description: "",
    attributes: {
      temporalCoverage: "1950s – Present",
      temporalResolution: "Daily / Grab samples",
      spatialCoverage: "United States",
      spatialResolution: "Watershed / Stream gauge",
    },
    links: [
      { label: "Water Quality Portal", url: "https://www.waterqualitydata.us" },
      { label: "USGS NWIS", url: "https://waterdata.usgs.gov/nwis" },
    ],
    notes: `## Overview\nComprehensive multi-agency dataset combining USGS, EPA, and state agency water quality measurements.\n\n## Parameters\nPhysical (temp, turbidity, flow), chemical (nutrients, metals, organics), and biological indicators.\n\n## Access\nExcellent REST API via the Water Quality Portal. Can filter by state, HUC, parameter, date range.`,
    tags: ["watershed", "nutrients", "streamflow", "EPA", "USGS"],
    createdAt: "2025-01-15",
    updatedAt: "2025-03-10",
  },
  {
    id: "ds4",
    folderId: "f3",
    title: "Global Forest Watch — Tree Cover Loss",
    subtitle: "Annual global tree cover loss at 30m resolution from Hansen et al.",
    description: "",
    attributes: {
      temporalCoverage: "2000 – 2023",
      temporalResolution: "Annual",
      spatialCoverage: "Global",
      spatialResolution: "30 m (Landsat)",
    },
    links: [
      { label: "GFW Platform", url: "https://www.globalforestwatch.org" },
      { label: "Hansen et al. Paper", url: "https://doi.org/10.1126/science.1244693" },
      { label: "GEE Data Catalog", url: "https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2023_v1_11" },
    ],
    notes: `## Overview\nThe gold-standard dataset for global deforestation monitoring. Uses Landsat imagery to track annual tree cover gain and loss.\n\n## Key Caveats\n- "Tree cover loss" ≠ deforestation: includes plantation harvests, fire, windthrow\n- Definition: ≥30% canopy cover threshold\n- Small patches (<0.09 ha) may be missed\n\n## Recommended Usage\nCombine with land-use data (e.g., PRODES for Brazil, Global Land Cover) to distinguish permanent conversion from temporary disturbance.`,
    tags: ["Landsat", "Hansen", "30m", "annual", "tropics", "carbon"],
    createdAt: "2024-10-05",
    updatedAt: "2025-02-28",
  },
];

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
    folder: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    folderOpen: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/></svg>,
    file: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
    link: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
    chevronRight: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
    chevronDown: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
    tag: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>,
    image: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
    database: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>,
    folderPlus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>,
  };
  return icons[name] || null;
};

// ─── MARKDOWN RENDERER (simple) ───────────────────────────────────────────────
const renderMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/^## (.+)$/gm, '<h2 style="font-family:\'Playfair Display\',serif;font-size:1.1rem;font-weight:700;color:#e8d5b0;margin:1.2rem 0 0.4rem;letter-spacing:0.02em">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-family:\'Playfair Display\',serif;font-size:0.95rem;font-weight:600;color:#c5a96e;margin:1rem 0 0.3rem">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8d5b0">$1</strong>')
    .replace(/`(.+?)`/g, '<code style="font-family:\'IBM Plex Mono\',monospace;background:#1a2535;color:#7eb8d4;padding:0.1em 0.35em;border-radius:3px;font-size:0.85em">$1</code>')
    .replace(/\n/g, '<br/>');
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:ital,wght@0,300;0,400;1,300&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0f1923;
    --surface: #162030;
    --surface2: #1c2b3d;
    --surface3: #243447;
    --border: #2a3f56;
    --accent: #c5a96e;
    --accent2: #7eb8d4;
    --accent3: #6bcfb0;
    --text: #d4c9b5;
    --text-dim: #7a8ea3;
    --text-bright: #f0e6d0;
    --danger: #d47e7e;
  }

  body { background: var(--bg); color: var(--text); font-family: 'Source Serif 4', Georgia, serif; }

  .app { display: flex; height: 100vh; overflow: hidden; }

  /* SIDEBAR */
  .sidebar {
    width: 260px; min-width: 200px; max-width: 340px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .sidebar-header {
    padding: 1.1rem 1rem 0.8rem;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 0.5rem;
  }
  .sidebar-logo {
    font-family: 'Playfair Display', serif;
    font-size: 1rem; font-weight: 700;
    color: var(--accent); letter-spacing: 0.04em;
    flex: 1; text-align: left;
  }
  .sidebar-logo span { color: var(--text-dim); font-weight: 400; font-size: 0.75rem; display: block; letter-spacing: 0.02em; margin-top: 1px; }

  .sidebar-actions {
    display: flex; gap: 4px; padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--border);
  }
  .btn-sm {
    display: flex; align-items: center; gap: 5px;
    padding: 0.3rem 0.6rem;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 5px; color: var(--text-dim);
    font-size: 0.72rem; font-family: 'IBM Plex Mono', monospace;
    cursor: pointer; transition: all 0.15s;
    white-space: nowrap;
  }
  .btn-sm:hover { background: var(--surface3); color: var(--accent); border-color: var(--accent); }

  .sidebar-tree { flex: 1; overflow-y: auto; padding: 0.5rem 0; }
  .sidebar-tree::-webkit-scrollbar { width: 4px; }
  .sidebar-tree::-webkit-scrollbar-track { background: transparent; }
  .sidebar-tree::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .folder-row {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.38rem 0.75rem; cursor: pointer;
    color: var(--text-dim); font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem; transition: all 0.12s;
    user-select: none;
  }
  .folder-row:hover { background: var(--surface2); color: var(--text); }
  .folder-row.selected { color: var(--accent); }
  .folder-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .folder-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
  .folder-count {
    font-size: 0.65rem; background: var(--surface3);
    padding: 1px 5px; border-radius: 10px; color: var(--text-dim);
  }

  .dataset-row {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.32rem 0.75rem 0.32rem 2rem;
    cursor: pointer; color: var(--text-dim);
    font-size: 0.73rem; transition: all 0.12s;
    overflow: hidden;
  }
  .dataset-row:hover { background: var(--surface2); color: var(--text); }
  .dataset-row.active { background: var(--surface3); color: var(--accent2); }
  .dataset-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

  /* MAIN */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  /* SEARCH BAR */
  .search-bar-wrap {
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    position: relative;
  }
  .search-inner {
    display: flex; align-items: center; gap: 0.6rem;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; padding: 0.5rem 0.9rem;
    transition: border-color 0.15s;
  }
  .search-inner:focus-within { border-color: var(--accent2); }
  .search-inner input {
    flex: 1; background: none; border: none; outline: none;
    color: var(--text); font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem;
  }
  .search-inner input::placeholder { color: var(--text-dim); }
  .search-results {
    position: absolute; top: calc(100% - 4px); left: 1.5rem; right: 1.5rem;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 0 0 8px 8px; z-index: 100; overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .search-result-item {
    padding: 0.6rem 1rem; cursor: pointer;
    border-bottom: 1px solid var(--border);
    transition: background 0.1s;
    display: flex; align-items: flex-start; gap: 0.7rem;
  }
  .search-result-item:last-child { border-bottom: none; }
  .search-result-item:hover { background: var(--surface3); }
  .search-result-title { font-size: 0.83rem; color: var(--text-bright); }
  .search-result-meta { font-family: 'IBM Plex Mono', monospace; font-size: 0.67rem; color: var(--text-dim); margin-top: 2px; }
  .search-result-match { font-size: 0.72rem; color: var(--accent2); margin-top: 2px; font-style: italic; }
  .search-empty { padding: 0.8rem 1rem; font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; color: var(--text-dim); }

  /* CONTENT */
  .content { flex: 1; overflow-y: auto; }
  .content::-webkit-scrollbar { width: 6px; }
  .content::-webkit-scrollbar-track { background: transparent; }
  .content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; color: var(--text-dim);
    gap: 1rem; padding: 2rem;
  }
  .empty-state h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: var(--text-dim); font-weight: 400; }
  .empty-state p { font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; text-align: center; max-width: 300px; line-height: 1.6; }

  /* DATASET PAGE */
  .dataset-page { padding: 2.5rem 3rem; max-width: 100%; }

  .page-header { margin-bottom: 2rem; }
  .page-tag {
    font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
    color: var(--accent); letter-spacing: 0.1em; text-transform: uppercase;
    margin-bottom: 0.6rem; display: flex; align-items: center; gap: 0.5rem;
  }

  .editable-field { position: relative; }
  .editable-field:hover .edit-hint { opacity: 1; }
  .edit-hint {
    position: absolute; right: -28px; top: 50%; transform: translateY(-50%);
    opacity: 0; transition: opacity 0.15s; color: var(--text-dim);
    cursor: pointer;
  }

  .page-title {
    font-family: 'Playfair Display', serif; font-size: 2rem;
    font-weight: 700; color: var(--text-bright); line-height: 1.2;
    margin-bottom: 0.4rem;
  }
  .page-title input {
    width: 100%; background: var(--surface2); border: 1px solid var(--accent);
    border-radius: 5px; color: var(--text-bright);
    font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700;
    padding: 0.2rem 0.5rem; outline: none;
  }

  .page-subtitle {
    font-size: 1rem; color: var(--text-dim); font-style: italic;
    font-weight: 300; line-height: 1.4;
  }
  .page-subtitle input {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 5px; color: var(--text-dim);
    font-size: 1rem; font-style: italic; font-weight: 300;
    padding: 0.2rem 0.5rem; outline: none; font-family: 'Source Serif 4', serif;
  }

  .divider { height: 1px; background: var(--border); margin: 1.5rem 0; }

  /* ATTRIBUTES TABLE */
  .section-label {
    font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
    color: var(--accent); letter-spacing: 0.1em; text-transform: uppercase;
    margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem;
  }
  .attrs-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 1px; background: var(--border);
    border: 1px solid var(--border); border-radius: 7px; overflow: hidden;
  }
  .attr-cell {
    background: var(--surface2); padding: 0.7rem 1rem;
  }
  .attr-key {
    font-family: 'IBM Plex Mono', monospace; font-size: 0.65rem;
    color: var(--text-dim); letter-spacing: 0.05em; margin-bottom: 0.25rem;
  }
  .attr-val {
    font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem;
    color: var(--accent2);
  }
  .attr-val input {
    width: 100%; background: var(--surface3); border: 1px solid var(--accent2);
    border-radius: 3px; color: var(--accent2);
    font-family: 'IBM Plex Mono', monospace; font-size: 0.82rem;
    padding: 0.15rem 0.35rem; outline: none;
  }

  /* LINKS */
  .links-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .link-row {
    display: flex; align-items: center; gap: 0.6rem;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 6px; padding: 0.5rem 0.8rem;
    transition: border-color 0.15s;
  }
  .link-row:hover { border-color: var(--accent2); }
  .link-label { font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem; color: var(--text-dim); min-width: 120px; }
  .link-url { color: var(--accent2); font-size: 0.75rem; text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .link-url:hover { text-decoration: underline; }
  .link-edit-row {
    display: flex; gap: 0.5rem; align-items: center;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 6px; padding: 0.5rem 0.8rem;
  }
  .link-input {
    background: none; border: none; outline: none;
    color: var(--text); font-size: 0.75rem; font-family: 'IBM Plex Mono', monospace;
  }
  .link-input.label { color: var(--text-dim); width: 130px; }
  .link-input.url { flex: 1; color: var(--accent2); }
  .add-link-btn {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.7rem;
    background: none; border: 1px dashed var(--border);
    border-radius: 6px; color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem;
    cursor: pointer; transition: all 0.15s;
  }
  .add-link-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* NOTES */
  .notes-area {
    font-size: 0.9rem; line-height: 1.8; color: var(--text);
    min-height: 200px;
  }
  .notes-rendered { cursor: pointer; }
  .notes-rendered:hover { outline: 1px dashed var(--border); border-radius: 5px; padding: 0.5rem; margin: -0.5rem; }
  .notes-textarea {
    width: 100%; min-height: 300px;
    background: var(--surface2); border: 1px solid var(--accent);
    border-radius: 6px; color: var(--text);
    font-size: 0.88rem; line-height: 1.7; font-family: 'Source Serif 4', serif;
    padding: 0.8rem 1rem; outline: none; resize: vertical;
  }
  .notes-hint { font-family: 'IBM Plex Mono', monospace; font-size: 0.67rem; color: var(--text-dim); margin-top: 0.4rem; }

  /* TAGS */
  .tags-row { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
  .tag {
    font-family: 'IBM Plex Mono', monospace; font-size: 0.67rem;
    background: var(--surface3); border: 1px solid var(--border);
    color: var(--text-dim); padding: 0.2rem 0.55rem;
    border-radius: 100px; display: flex; align-items: center; gap: 4px;
  }
  .tag button { background: none; border: none; cursor: pointer; color: var(--text-dim); padding: 0; display: flex; align-items: center; }
  .tag button:hover { color: var(--danger); }
  .tag-input {
    background: none; border: none; outline: none;
    font-family: 'IBM Plex Mono', monospace; font-size: 0.67rem;
    color: var(--text); width: 80px;
  }

  /* SCREENSHOTS */
  .screenshots-grid { display: flex; flex-wrap: wrap; gap: 0.75rem; }
  .screenshot-item {
    width: 160px; height: 110px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 6px; overflow: hidden; position: relative;
    cursor: pointer; transition: border-color 0.15s;
    display: flex; align-items: center; justify-content: center;
  }
  .screenshot-item:hover { border-color: var(--accent2); }
  .screenshot-item img { width: 100%; height: 100%; object-fit: cover; }
  .screenshot-remove {
    position: absolute; top: 4px; right: 4px;
    background: rgba(0,0,0,0.7); border: none; border-radius: 50%;
    width: 20px; height: 20px; cursor: pointer; color: var(--danger);
    display: none; align-items: center; justify-content: center;
  }
  .screenshot-item:hover .screenshot-remove { display: flex; }
  .screenshot-add {
    width: 160px; height: 110px;
    background: var(--surface2); border: 2px dashed var(--border);
    border-radius: 6px; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.3rem; color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
    transition: all 0.15s;
  }
  .screenshot-add:hover { border-color: var(--accent); color: var(--accent); }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; backdrop-filter: blur(3px);
  }
  .modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 1.5rem; width: 340px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }
  .modal h3 { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: var(--text-bright); margin-bottom: 1rem; }
  .modal input, .modal select {
    width: 100%; background: var(--bg); border: 1px solid var(--border);
    border-radius: 6px; color: var(--text);
    font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem;
    padding: 0.5rem 0.75rem; outline: none; margin-bottom: 0.6rem;
  }
  .modal input:focus, .modal select:focus { border-color: var(--accent2); }
  .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
  .btn-primary {
    background: var(--accent); color: var(--bg);
    border: none; border-radius: 6px; padding: 0.45rem 1rem;
    font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; font-weight: 500;
    cursor: pointer; transition: opacity 0.15s;
  }
  .btn-primary:hover { opacity: 0.85; }
  .btn-ghost {
    background: none; color: var(--text-dim);
    border: 1px solid var(--border); border-radius: 6px; padding: 0.45rem 1rem;
    font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem;
    cursor: pointer; transition: all 0.15s;
  }
  .btn-ghost:hover { color: var(--text); border-color: var(--text-dim); }

  .meta-row { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; color: var(--text-dim); display: flex; gap: 1.5rem; margin-top: 1rem; }

  .page-description {
    font-size: 0.9rem; line-height: 1.75; color: var(--text);
    font-weight: 300; margin-top: 1.2rem;
    font-family: 'Source Serif 4', serif;
  }
  .page-description textarea {
    width: 100%; background: var(--surface2); border: 1px solid var(--accent);
    border-radius: 6px; color: var(--text);
    font-size: 0.9rem; line-height: 1.75; font-family: 'Source Serif 4', serif;
    padding: 0.6rem 0.8rem; outline: none; resize: vertical; min-height: 80px;
  }
  .description-placeholder { color: var(--text-dim); font-style: italic; cursor: pointer; }
  
  /* Color swatches for folder */
  .color-swatches { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
  .swatch { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: border-color 0.12s; }
  .swatch.selected { border-color: white; }
`;

const FOLDER_COLORS = ["#7eb8d4","#6bcfb0","#b8d47e","#d4a87e","#c57eb8","#d47e7e","#a87ed4","#7ed4b8"];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [folders, setFolders] = useState(INITIAL_FOLDERS);
  const [datasets, setDatasets] = useState(INITIAL_DATASETS);
  const [activeDatasetId, setActiveDatasetId] = useState(null);
  const [serverStatus, setServerStatus] = useState("connecting"); // "connecting"|"ok"|"error"
  const saveTimer = useRef(null);
  const [expandedFolders, setExpandedFolders] = useState(["f1","f2","f3"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [modal, setModal] = useState(null); // {type: 'folder'|'dataset'}
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [newDsFolderId, setNewDsFolderId] = useState("");
  const [newDsTitle, setNewDsTitle] = useState("");
  const searchRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeDataset = datasets.find(d => d.id === activeDatasetId);
  const activeFolder = activeDataset ? folders.find(f => f.id === activeDataset.folderId) : null;

  // Search
  const searchResults = searchQuery.length > 1 ? datasets.filter(ds => {
    const q = searchQuery.toLowerCase();
    return (
      ds.title.toLowerCase().includes(q) ||
      ds.subtitle.toLowerCase().includes(q) ||
      ds.notes.toLowerCase().includes(q) ||
      ds.tags.some(t => t.toLowerCase().includes(q)) ||
      Object.values(ds.attributes).some(v => v.toLowerCase().includes(q))
    );
  }) : [];

  const toggleFolder = (fid) => {
    setExpandedFolders(prev =>
      prev.includes(fid) ? prev.filter(f => f !== fid) : [...prev, fid]
    );
  };

  const updateDataset = useCallback((id, updater) => {
    setDatasets(prev => prev.map(ds => ds.id === id ? { ...updater(ds), updatedAt: new Date().toISOString().split("T")[0] } : ds));
  }, []);

  const addFolder = () => {
    if (!newFolderName.trim()) return;
    const id = "f" + Date.now();
    setFolders(prev => [...prev, { id, name: newFolderName.trim(), color: newFolderColor }]);
    setExpandedFolders(prev => [...prev, id]);
    setModal(null); setNewFolderName(""); setNewFolderColor(FOLDER_COLORS[0]);
  };

  const addDataset = () => {
    if (!newDsTitle.trim() || !newDsFolderId) return;
    const id = "ds" + Date.now();
    setDatasets(prev => [...prev, {
      id, folderId: newDsFolderId, title: newDsTitle.trim(),
      subtitle: "Add a subtitle...",
      description: "",
      attributes: { temporalCoverage: "", temporalResolution: "", spatialCoverage: "", spatialResolution: "" },
      links: [], notes: "Start writing notes here...", tags: [],
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    }]);
    setActiveDatasetId(id);
    setModal(null); setNewDsTitle(""); setNewDsFolderId("");
  };

  // Load on mount
  useEffect(() => {
    loadFromServer().then(data => {
      if (data && data.folders && data.datasets) {
        setFolders(data.folders);
        setDatasets(data.datasets);
        setExpandedFolders(data.folders.map(f => f.id));
      }
      setServerStatus(data === null ? "error" : "ok");
    });
  }, []);

  // Debounced auto-save (500ms after last change)
  useEffect(() => {
    if (serverStatus === "connecting") return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToServer({ folders, datasets })
        .then(() => setServerStatus("ok"))
        .catch(() => setServerStatus("error"));
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [folders, datasets]);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div>
              <div className="sidebar-logo">
                Data Library
                <span>research dataset registry</span>
              </div>
              <div style={{
                fontFamily:"'IBM Plex Mono',monospace", fontSize:"0.6rem",
                display:"flex", alignItems:"center", gap:"4px",
                color: serverStatus==="ok" ? "var(--accent3)" : serverStatus==="error" ? "var(--danger)" : "var(--text-dim)"
              }}>
                <span style={{
                  width:6, height:6, borderRadius:"50%", display:"inline-block",
                  background: serverStatus==="ok" ? "var(--accent3)" : serverStatus==="error" ? "var(--danger)" : "var(--text-dim)"
                }}/>
                {serverStatus==="ok" ? "saved" : serverStatus==="error" ? "offline" : "…"}
              </div>
            </div>
          </div>
          <div className="sidebar-actions">
            <button className="btn-sm" onClick={() => { setModal("folder"); }}>
              <Icon name="folderPlus" size={12} /> Folder
            </button>
            <button className="btn-sm" onClick={() => { setNewDsFolderId(folders[0]?.id || ""); setModal("dataset"); }}>
              <Icon name="plus" size={12} /> Dataset
            </button>
          </div>
          <div className="sidebar-tree">
            {folders.map(folder => {
              const folderDatasets = datasets.filter(d => d.folderId === folder.id);
              const isOpen = expandedFolders.includes(folder.id);
              return (
                <div key={folder.id}>
                  <div className="folder-row" onClick={() => toggleFolder(folder.id)}>
                    <span style={{ color: folder.color }}>
                      {isOpen ? <Icon name="chevronDown" size={12} /> : <Icon name="chevronRight" size={12} />}
                    </span>
                    <span className="folder-dot" style={{ background: folder.color }} />
                    <span className="folder-name">{folder.name}</span>
                    <span className="folder-count">{folderDatasets.length}</span>
                  </div>
                  {isOpen && folderDatasets.map(ds => (
                    <div
                      key={ds.id}
                      className={`dataset-row ${activeDatasetId === ds.id ? "active" : ""}`}
                      onClick={() => setActiveDatasetId(ds.id)}
                    >
                      <Icon name="database" size={11} />
                      <span className="dataset-row-title">{ds.title}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </aside>

        {/* MAIN */}
        <main className="main">
          {/* SEARCH */}
          <div className="search-bar-wrap" ref={searchRef}>
            <div className="search-inner">
              <Icon name="search" size={15} />
              <input
                placeholder="Search datasets by title, theme, notes, tags..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
              />
              {searchQuery && (
                <button style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-dim)" }} onClick={() => { setSearchQuery(""); setSearchOpen(false); }}>
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
            {searchOpen && searchQuery.length > 1 && (
              <div className="search-results">
                {searchResults.length === 0 ? (
                  <div className="search-empty">No datasets match "{searchQuery}"</div>
                ) : searchResults.map(ds => {
                  const folder = folders.find(f => f.id === ds.folderId);
                  const q = searchQuery.toLowerCase();
                  let matchSnippet = "";
                  if (ds.notes.toLowerCase().includes(q)) {
                    const idx = ds.notes.toLowerCase().indexOf(q);
                    matchSnippet = "…" + ds.notes.slice(Math.max(0,idx-30), idx+50).replace(/\n/g," ") + "…";
                  }
                  return (
                    <div key={ds.id} className="search-result-item" onClick={() => {
                      setActiveDatasetId(ds.id);
                      setExpandedFolders(prev => prev.includes(ds.folderId) ? prev : [...prev, ds.folderId]);
                      setSearchQuery(""); setSearchOpen(false);
                    }}>
                      <div style={{ paddingTop: 2 }}><Icon name="database" size={13} /></div>
                      <div>
                        <div className="search-result-title">{ds.title}</div>
                        <div className="search-result-meta">
                          {folder && <span style={{ color: folder.color }}>● {folder.name}</span>}
                          {" · "}{ds.attributes.spatialCoverage || "—"}
                        </div>
                        {matchSnippet && <div className="search-result-match">{matchSnippet}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CONTENT */}
          <div className="content">
            {!activeDataset ? (
              <div className="empty-state">
                <Icon name="database" size={48} />
                <h2>No dataset selected</h2>
                <p>Select a dataset from the sidebar, search for one above, or create a new entry using the buttons in the sidebar.</p>
              </div>
            ) : (
              <DatasetPage
                key={activeDataset.id}
                dataset={activeDataset}
                folder={activeFolder}
                onChange={(updater) => updateDataset(activeDataset.id, updater)}
                fileInputRef={fileInputRef}
                onDelete={() => {
                  setDatasets(prev => prev.filter(d => d.id !== activeDataset.id));
                  setActiveDatasetId(null);
                }}
              />
            )}
          </div>
        </main>

        {/* MODALS */}
        {modal === "folder" && (
          <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(null); }}>
            <div className="modal">
              <h3>New Folder</h3>
              <input placeholder="Folder name (e.g. Air Quality)" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key==="Enter" && addFolder()} autoFocus />
              <div style={{marginBottom:"0.6rem",fontSize:"0.72rem",fontFamily:"IBM Plex Mono",color:"var(--text-dim)"}}>Color</div>
              <div className="color-swatches">
                {FOLDER_COLORS.map(c => (
                  <div key={c} className={`swatch ${newFolderColor===c?"selected":""}`} style={{background:c}} onClick={() => setNewFolderColor(c)} />
                ))}
              </div>
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn-primary" onClick={addFolder}>Create</button>
              </div>
            </div>
          </div>
        )}
        {modal === "dataset" && (
          <div className="modal-overlay" onClick={e => { if(e.target===e.currentTarget) setModal(null); }}>
            <div className="modal">
              <h3>New Dataset Entry</h3>
              <input placeholder="Dataset title" value={newDsTitle} onChange={e => setNewDsTitle(e.target.value)} autoFocus />
              <select value={newDsFolderId} onChange={e => setNewDsFolderId(e.target.value)}>
                <option value="">— Select folder —</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <div className="modal-actions">
                <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn-primary" onClick={addDataset}>Create</button>
              </div>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} multiple />
      </div>
    </>
  );
}

// ─── DATASET PAGE ─────────────────────────────────────────────────────────────
function DatasetPage({ dataset, folder, onChange, fileInputRef, onDelete }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingAttrs, setEditingAttrs] = useState(false);
  const [editingLinks, setEditingLinks] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newTag, setNewTag] = useState("");
  const [screenshots, setScreenshots] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const attrKeys = [
    { key: "temporalCoverage", label: "Temporal Coverage" },
    { key: "temporalResolution", label: "Temporal Resolution" },
    { key: "spatialCoverage", label: "Spatial Coverage" },
    { key: "spatialResolution", label: "Spatial Resolution" },
  ];

  const addLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    onChange(ds => ({ ...ds, links: [...ds.links, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }] }));
    setNewLinkLabel(""); setNewLinkUrl("");
  };

  const addTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && newTag.trim()) {
      e.preventDefault();
      const t = newTag.trim().replace(/,$/, "");
      if (t && !dataset.tags.includes(t)) onChange(ds => ({ ...ds, tags: [...ds.tags, t] }));
      setNewTag("");
    }
  };

  const handleScreenshotUpload = () => {
    const input = fileInputRef.current;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      files.forEach(f => {
        const reader = new FileReader();
        reader.onload = ev => setScreenshots(prev => [...prev, { id: Date.now() + Math.random(), src: ev.target.result, name: f.name }]);
        reader.readAsDataURL(f);
      });
      input.value = "";
    };
    input.click();
  };

  return (
    <div className="dataset-page">
      {/* HEADER */}
      <div className="page-header">
        <div className="page-tag">
          {folder && <><span style={{ color: folder.color }}>●</span> {folder.name}</>}
          <span style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setConfirmDelete(true)} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-dim)" }} title="Delete dataset">
              <Icon name="trash" size={13} />
            </button>
          </span>
        </div>

        {editingTitle ? (
          <input className="page-title" style={{display:"block"}} value={dataset.title}
            onChange={e => onChange(ds => ({ ...ds, title: e.target.value }))}
            onBlur={() => setEditingTitle(false)} autoFocus />
        ) : (
          <div className="page-title editable-field" style={{cursor:"pointer"}} onClick={() => setEditingTitle(true)}>
            {dataset.title}
          </div>
        )}

        {editingSubtitle ? (
          <input className="page-subtitle" style={{display:"block"}} value={dataset.subtitle}
            onChange={e => onChange(ds => ({ ...ds, subtitle: e.target.value }))}
            onBlur={() => setEditingSubtitle(false)} autoFocus />
        ) : (
          <div className="page-subtitle" style={{cursor:"pointer"}} onClick={() => setEditingSubtitle(true)}>
            {dataset.subtitle}
          </div>
        )}

        <div className="meta-row">
          <span>Created {dataset.createdAt}</span>
          <span>Updated {dataset.updatedAt}</span>
        </div>

        {/* DESCRIPTION */}
        {editingDescription ? (
          <div className="page-description">
            <textarea
              value={dataset.description || ""}
              onChange={e => onChange(ds => ({ ...ds, description: e.target.value }))}
              onBlur={() => setEditingDescription(false)}
              placeholder="Write a short description (100–150 words)..."
              autoFocus
            />
          </div>
        ) : (
          <div className="page-description" onClick={() => setEditingDescription(true)}>
            {dataset.description
              ? dataset.description
              : <span className="description-placeholder">+ Add a short description...</span>
            }
          </div>
        )}
      </div>

      <div className="divider" />

      {/* ATTRIBUTES */}
      <div style={{ marginBottom: "1.8rem" }}>
        <div className="section-label" style={{justifyContent:"space-between"}}>
          <span><Icon name="tag" size={12} /> Attributes</span>
          <button style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-dim)" }} onClick={() => setEditingAttrs(!editingAttrs)}>
            <Icon name={editingAttrs ? "check" : "edit"} size={13} />
          </button>
        </div>
        <div className="attrs-grid">
          {attrKeys.map(({ key, label }) => (
            <div className="attr-cell" key={key}>
              <div className="attr-key">{label}</div>
              {editingAttrs ? (
                <input className="attr-val" value={dataset.attributes[key]}
                  onChange={e => onChange(ds => ({ ...ds, attributes: { ...ds.attributes, [key]: e.target.value } }))} />
              ) : (
                <div className="attr-val">{dataset.attributes[key] || <span style={{color:"var(--text-dim)"}}>—</span>}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* LINKS */}
      <div style={{ marginBottom: "1.8rem" }}>
        <div className="section-label" style={{justifyContent:"space-between"}}>
          <span><Icon name="link" size={12} /> Links</span>
          <button style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-dim)" }} onClick={() => setEditingLinks(!editingLinks)}>
            <Icon name={editingLinks ? "check" : "edit"} size={13} />
          </button>
        </div>
        <div className="links-list">
          {dataset.links.map((link, i) => (
            editingLinks ? (
              <div key={i} className="link-edit-row">
                <input className="link-input label" value={link.label}
                  onChange={e => onChange(ds => {
                    const links = [...ds.links]; links[i] = {...links[i], label: e.target.value};
                    return {...ds, links};
                  })} placeholder="Label" />
                <span style={{color:"var(--border)"}}>|</span>
                <input className="link-input url" value={link.url}
                  onChange={e => onChange(ds => {
                    const links = [...ds.links]; links[i] = {...links[i], url: e.target.value};
                    return {...ds, links};
                  })} placeholder="https://..." />
                <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--danger)"}}
                  onClick={() => onChange(ds => ({ ...ds, links: ds.links.filter((_,j) => j!==i) }))}>
                  <Icon name="x" size={13} />
                </button>
              </div>
            ) : (
              <div key={i} className="link-row">
                <span style={{color:"var(--accent2)"}}><Icon name="link" size={12} /></span>
                <span className="link-label">{link.label}</span>
                <a className="link-url" href={link.url} target="_blank" rel="noopener noreferrer">{link.url}</a>
              </div>
            )
          ))}
          {editingLinks && (
            <div className="link-edit-row">
              <input className="link-input label" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} placeholder="Label" />
              <span style={{color:"var(--border)"}}>|</span>
              <input className="link-input url" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="https://..." onKeyDown={e => e.key==="Enter" && addLink()} />
              <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)"}} onClick={addLink}>
                <Icon name="plus" size={13} />
              </button>
            </div>
          )}
          {!editingLinks && (
            <button className="add-link-btn" onClick={() => setEditingLinks(true)}>
              <Icon name="plus" size={12} /> Add link
            </button>
          )}
        </div>
      </div>

      <div className="divider" />

      {/* TAGS */}
      <div style={{ marginBottom: "1.8rem" }}>
        <div className="section-label"><Icon name="tag" size={12} /> Tags</div>
        <div className="tags-row">
          {dataset.tags.map((t, i) => (
            <span key={i} className="tag">
              {t}
              <button onClick={() => onChange(ds => ({ ...ds, tags: ds.tags.filter((_,j) => j!==i) }))}>
                <Icon name="x" size={9} />
              </button>
            </span>
          ))}
          <input
            className="tag-input" value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={addTag}
            placeholder="Add tag..."
          />
        </div>
      </div>

      <div className="divider" />

      {/* NOTES */}
      <div style={{ marginBottom: "1.8rem" }}>
        <div className="section-label" style={{justifyContent:"space-between"}}>
          <span><Icon name="file" size={12} /> Notes</span>
          <button style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text-dim)" }} onClick={() => setEditingNotes(!editingNotes)}>
            <Icon name={editingNotes ? "check" : "edit"} size={13} />
          </button>
        </div>
        {editingNotes ? (
          <>
            <textarea className="notes-textarea" value={dataset.notes}
              onChange={e => onChange(ds => ({ ...ds, notes: e.target.value }))} />
            <div className="notes-hint">Supports Markdown: ## Heading, **bold**, `code`</div>
          </>
        ) : (
          <div className="notes-area notes-rendered" onClick={() => setEditingNotes(true)}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(dataset.notes) }} />
        )}
      </div>

      <div className="divider" />

      {/* SCREENSHOTS */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div className="section-label"><Icon name="image" size={12} /> Screenshots & Figures</div>
        <div className="screenshots-grid">
          {screenshots.map(s => (
            <div key={s.id} className="screenshot-item">
              <img src={s.src} alt={s.name} />
              <button className="screenshot-remove" onClick={() => setScreenshots(prev => prev.filter(x => x.id !== s.id))}>
                <Icon name="x" size={10} />
              </button>
            </div>
          ))}
          <div className="screenshot-add" onClick={handleScreenshotUpload}>
            <Icon name="image" size={20} />
            <span>Upload image</span>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRM */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Delete this dataset?</h3>
            <p style={{fontFamily:"IBM Plex Mono",fontSize:"0.75rem",color:"var(--text-dim)",marginBottom:"1rem",lineHeight:1.6}}>
              "{dataset.title}" will be permanently removed. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button style={{background:"var(--danger)",color:"white",border:"none",borderRadius:"6px",padding:"0.45rem 1rem",fontFamily:"IBM Plex Mono",fontSize:"0.75rem",cursor:"pointer"}} onClick={onDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
