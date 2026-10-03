import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  FileSearch,
  Files,
  Folder,
  FolderPlus,
  ChevronLeft,
  BarChart3,
  Settings,
  Upload,
  FileText,
  FileSpreadsheet,
  Search,
  Bell,
  Moon,
  Sun,
  Plus,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  X,
  FileUp,
  Trash2,
  MoreHorizontal,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Activity,
  FileCheck2,
  Menu,
  Tag,
  Check,
  Phone,
  Download,
  Layers,
  BookOpen,
  MessageCircle,
  Send,
  Copy,
  Pencil,
  MonitorPlay,
  ArrowLeft,
  CreditCard,
  Wallet,
  Smartphone,
  Landmark,
  Crown,
  LockKeyhole,
  Database,
} from "lucide-react";
import ExcelJS from "exceljs";

/* -------------------------------- */
/* Report Automation Center */
/* -------------------------------- */
function AutomationCenter({ darkMode = false, onToast }) {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runningId, setRunningId] = useState(null);

  const automationApi = `${(
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    "http://127.0.0.1:60220"
  ).replace(/\/$/, "")}/api`;

  const loadAutomations = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${automationApi}/automations`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || payload?.message || `Backend returned ${response.status}`);
      }
      const rows = Array.isArray(payload) ? payload : (payload.items || payload.data || payload.automations || []);
      setAutomations(rows);
    } catch (err) {
      setError(err?.message || "Unable to load automations.");
      setAutomations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  const runAutomation = async (automation) => {
    if (!automation?.id || runningId) return;
    setRunningId(automation.id);
    try {
      const response = await fetch(`${automationApi}/automations/${encodeURIComponent(automation.id)}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.detail || payload?.message || `Run failed (${response.status})`);
      onToast?.(`Automation queued successfully. Run ID: ${payload?.run_id || "created"}`, "success");
    } catch (err) {
      onToast?.(err?.message || "Unable to run automation.", "error");
    } finally {
      setRunningId(null);
      loadAutomations();
    }
  };

  const displayStatus = (item) => String(item?.status || (item?.enabled ? "ACTIVE" : "DRAFT")).replaceAll("_", " ");
  const displaySource = (item) => item?.source_type || item?.source?.type || item?.source?.name || "Data Source";

  return (
    <section className={`automation-center ${darkMode ? "is-dark" : ""}`}>
      <div className="automation-center-hero">
        <div>
          <span className="eyebrow">REPORT AUTOMATION</span>
          <h1>Automation Center</h1>
          <p>Automate data retrieval, validation, analysis, Excel reporting and delivery from one workspace.</p>
        </div>
        <div className="automation-center-actions">
          <button className="secondary-button" onClick={loadAutomations} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="primary-button" onClick={() => onToast?.("Create Automation wizard is ready for backend configuration.", "info")}>
            <Plus size={16} /> New Automation
          </button>
        </div>
      </div>

      {error && (
        <div className="automation-center-error">
          <AlertTriangle size={17} />
          <div><strong>Automation service unavailable</strong><span>{error}</span></div>
          <button onClick={loadAutomations}>Retry</button>
        </div>
      )}

      {!loading && !error && automations.length === 0 && (
        <div className="automation-center-empty">
          <div className="automation-empty-icon"><Database size={28} /></div>
          <h2>No automations yet</h2>
          <p>Create an automation to connect a configured data source and turn recurring data into reports.</p>
          <button className="primary-button" onClick={() => onToast?.("Add a configured SAP, Oracle, Excel, CSV, REST or database source first.", "info")}>
            <Plus size={16} /> Create your first automation
          </button>
        </div>
      )}

      {automations.length > 0 && (
        <div className="automation-center-list">
          {automations.map((automation) => (
            <article className="automation-card" key={automation.id || automation.name}>
              <div className="automation-card-main">
                <div className="automation-source-icon"><Database size={19} /></div>
                <div className="automation-card-copy">
                  <div className="automation-card-title-row">
                    <h3>{automation.name || "Untitled Automation"}</h3>
                    <span className={`automation-status ${String(displayStatus(automation)).toLowerCase().replace(/\s+/g, "-")}`}>
                      <span /> {displayStatus(automation)}
                    </span>
                  </div>
                  <div className="automation-meta">
                    <span>{displaySource(automation)}</span>
                    <span>Last run: {automation.last_run_at ? new Date(automation.last_run_at).toLocaleString() : "Never"}</span>
                    <span>Records: {automation.records_processed ?? "—"}</span>
                  </div>
                </div>
              </div>
              <div className="automation-card-actions">
                <button className="secondary-button" onClick={() => onToast?.("Automation details are available from the configured backend.", "info")}>View</button>
                <button className="primary-button" onClick={() => runAutomation(automation)} disabled={runningId === automation.id}>
                  {runningId === automation.id ? "Running..." : "Run Now"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------- */
/* Backend connection */
/* -------------------------------- */

// Your FastAPI/Flask/etc backend. Change this if the backend runs
// somewhere other than 127.0.0.1:60220 (e.g. once deployed).
// FastAPI base URL. `/docs` is only the Swagger UI — it is NOT the
// document-upload endpoint. The analyzer normally lives at POST /analyze.
// You can override both values from `.env.local` without changing App.jsx.
const normalizeApiBase = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "").replace(/\/(?:docs|redoc|openapi\.json)$/i, "");
};

const API_BASE_URL = normalizeApiBase(
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ANALYZE_URL) ||
  "http://127.0.0.1:60220"
) || "http://127.0.0.1:60220";

// Use both loopback names. This avoids browser/Windows resolution differences
// while keeping the configured port as the single source of truth.
const API_BASE_URLS = Array.from(new Set([
  API_BASE_URL,
  API_BASE_URL.replace("127.0.0.1", "localhost"),
  API_BASE_URL.replace("localhost", "127.0.0.1"),
])).filter(Boolean);

const SUPABASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) || "";
const SUPABASE_ANON_KEY = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) || "";

const getSupabaseAccessToken = () => {
  if (typeof window === "undefined") return "";
  const direct = window.localStorage.getItem("openleddocs.supabase.access_token");
  if (direct) return direct;
  const session = window.localStorage.getItem("openleddocs.supabase.session");
  if (session) {
    try { return JSON.parse(session)?.access_token || ""; } catch { return ""; }
  }
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i) || "";
    if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
    try {
      const value = JSON.parse(window.localStorage.getItem(key) || "{}");
      if (value?.access_token) return value.access_token;
    } catch { /* ignore unrelated storage */ }
  }
  return "";
};

const supabasePasswordAuth = async (mode, email, password, name = "") => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const endpoint = mode === "signup"
    ? `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/signup`
    : `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=password`;
  const payload = mode === "signup"
    ? { email, password, data: { full_name: name } }
    : { email, password };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.msg || data?.error_description || data?.message || "Authentication failed.");
  if (data?.access_token) {
    localStorage.setItem("openleddocs.supabase.access_token", data.access_token);
    localStorage.setItem("openleddocs.supabase.session", JSON.stringify(data));
  }
  return data;
};

const ANALYZE_ENDPOINT =
  normalizeApiBase((typeof import.meta !== "undefined" && import.meta.env?.VITE_ANALYZE_ENDPOINT) || "") ||
  `${API_BASE_URL}/analyze`;

const ANALYZE_ENDPOINTS = Array.from(new Set([
  ANALYZE_ENDPOINT,
  ...API_BASE_URLS.map((base) => `${base}/analyze`),
])).filter(Boolean);

// Open Ledger Docs uses its own FastAPI backend only.
// Do not allow an old Vite environment variable to redirect the status check
// to another service. The backend is expected at port 60220 in development.
const HEALTH_ENDPOINT = `${API_BASE_URL}/health`;
const HEALTH_ENDPOINTS = Array.from(new Set([
  "http://127.0.0.1:60220/health",
  "http://localhost:60220/health",
  HEALTH_ENDPOINT,
  `${API_BASE_URL}/api/health`,
])).filter(Boolean);

// The Vite dev server may run on 5174 when 5173 is already occupied.
// The FastAPI backend must allow that origin; the bundled backend now does.


const EXPORT_EXCEL_ENDPOINT =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_EXPORT_EXCEL_URL) ||
  `${API_BASE_URL}/export/excel`;

// Document chat configuration. Keep the API credential in .env.local rather
// than hard-coding it into the React bundle. The chat endpoint can be changed
// independently if your backend exposes it somewhere other than /chat.
const CHAT_ENDPOINT =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_CHAT_URL) ||
  `${API_BASE_URL}/chat`;
const getApiHeaders = (json = true) => {
  const accessToken = getSupabaseAccessToken();
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
};

const readBackendError = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (typeof payload === "string") return payload;
      if (payload?.detail) {
        if (Array.isArray(payload.detail)) {
          return payload.detail
            .map((item) => item?.msg || item?.message || JSON.stringify(item))
            .join("; ");
        }
        if (typeof payload.detail === "object") return JSON.stringify(payload.detail);
        return String(payload.detail);
      }
      return String(payload?.message || payload?.error || "");
    }
    return (await response.text()).trim();
  } catch {
    return "";
  }
};

// Mirrors the backend's DOCUMENT_TYPE_DESCRIPTIONS. Used as a fallback so
// the UI can still show a sensible description even if an older backend
// response doesn't include `category_description` yet.
const CATEGORY_DESCRIPTIONS = {
  NDA: "A non-disclosure agreement — defines confidential information that two or more parties agree not to share with others.",
  Employment: "An employment-related document — typically covers salary, benefits, responsibilities, and termination terms.",
  Invoice: "A billing document — requests payment for goods or services, usually with line items and a due date.",
  Contract: "A general agreement between two or more parties, setting out obligations, terms, and conditions.",
  Legal: "A document with legal or jurisdictional language — may reference governing law, arbitration, or dispute resolution.",
  Resume: "A résumé/CV — summarizes a candidate's work experience, education, and skills for a job application.",
};
const DEFAULT_CATEGORY = "General document";
const DEFAULT_CATEGORY_DESCRIPTION =
  "No specific document type was detected — this may be a general or uncommon document format.";

/* -------------------------------------------------------------------------- */
/* Production-grade client configuration                                      */
/* -------------------------------------------------------------------------- */

const APP_STORAGE_KEY = "docusense.workspace.v3";
const APP_SETTINGS_KEY = "docusense.settings.v3";
const APP_ACCOUNT_KEY = "docusense.account.v1";
// Production note: plan limits must also be enforced by the backend. Client-side limits
// improve UX but cannot provide security against a modified browser/localStorage.

const PLAN_LIMITS = {
  // Published/free tier limits. Paid tiers retain their configured limits.
  Starter: { folders: 5, analyses: 100, documentsPerFolder: 100 },
  Pro: { folders: 20, analyses: Infinity, documentsPerFolder: 400 },
  Business: { folders: 70, analyses: Infinity, documentsPerFolder: 1000 },
};
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 120000;
const SUPPORTED_FILE_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "txt",
  "rtf",
  "csv",
  "xlsx",
  "xls",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

const STATUS_META = {
  Processing: {
    label: "Processing",
    tone: "info",
    description: "The document is being analyzed by the connected service.",
  },
  Analyzed: {
    label: "Analyzed",
    tone: "success",
    description: "Analysis completed and structured results are available.",
  },
  Failed: {
    label: "Failed",
    tone: "danger",
    description: "The analyzer returned an error. Retry the document to continue.",
  },
};

function safeParseJSON(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadPersistedJSON(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? safeParseJSON(value, fallback) : fallback;
  } catch {
    return fallback;
  }
}

function persistJSON(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Storage can be unavailable in private browsing or restricted embeds.
    console.warn("Open Ledger Docs local persistence unavailable:", error);
  }
}

function getFileExtension(name = "") {
  return String(name).split(".").pop()?.toLowerCase() || "";
}

function isSupportedFile(file) {
  return Boolean(file) && SUPPORTED_FILE_EXTENSIONS.has(getFileExtension(file.name));
}

function createAbortableTimeout(ms) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timer),
  };
}

function makeClientDocumentId() {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeDocumentForStorage(document) {
  const { file, ...safeDocument } = document || {};
  return safeDocument;
}

function getRiskRank(risk) {
  return { High: 3, Medium: 2, Low: 1, Pending: 0 }[risk] ?? 0;
}

function sortDocumentsByRisk(documents = []) {
  return [...documents].sort(
    (a, b) => getRiskRank(b.risk) - getRiskRank(a.risk)
  );
}

function formatRelativeDocumentDate(timestamp) {
  if (!timestamp) return "Recently";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diff / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function getDocumentHealth(document) {
  if (!document) return 0;
  if (document.status === "Processing") return 50;
  if (document.status === "Failed") return 0;
  return Math.max(0, Math.min(100, Number(document.confidence) || 0));
}

function buildDocumentExportRows(documents = []) {
  return documents.map((doc) => ({
    Name: doc.name || "",
    Type: doc.type || "",
    Status: doc.status || "",
    Risk: doc.risk || "",
    Category: doc.category || "",
    Confidence: doc.confidence ?? "",
    Pages: doc.pages ?? "",
    Words: doc.wordCount ?? "",
    Language: doc.language || "",
    Tags: (doc.tags || []).join(", "),
    Summary: doc.summary || "",
    Findings: (doc.findings || []).map((item) => item.text).join(" | "),
    Entities: (doc.entities || [])
      .map((item) => `${item.label}: ${item.value}`)
      .join(" | "),
  }));
}

function downloadTextFile(filename, content, mime = "text/plain;charset=utf-8") {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCSV(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function rowsToCSV(rows = []) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => headers.map((key) => escapeCSV(row[key])).join(",")),
  ].join("\n");
}

function exportDocumentsCSV(documents = []) {
  const rows = buildDocumentExportRows(documents);
  downloadTextFile(
    `open-led-docs-analysis-${new Date().toISOString().slice(0, 10)}.csv`,
    rowsToCSV(rows),
    "text/csv;charset=utf-8"
  );
}

function exportWorkspaceJSON(documents = [], folders = []) {
  const payload = {
    exportedAt: new Date().toISOString(),
    product: "Open Ledger Docs",
    documents: documents.map(sanitizeDocumentForStorage),
    folders,
  };
  downloadTextFile(
    `open-led-docs-workspace-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
}

function normalizeApiError(error) {
  if (!error) return "Unknown analyzer error.";
  if (error.name === "AbortError") {
    return "The analyzer timed out. Check the backend and try again.";
  }
  if (error instanceof TypeError) {
    return `The analyzer could not be reached. Tried ${ANALYZE_ENDPOINTS.join(" and ")}. Start the FastAPI backend on port 60220 and make sure CORS allows ${window.location.origin}.`;
  }
  return error.message || "The analyzer returned an unexpected error.";
}


const initialDocuments = [];

const initialFolders = [
  { id: "cvs", name: "CVs", color: "purple" },
  { id: "invoices", name: "Invoices", color: "green" },
  { id: "passports", name: "Passports", color: "blue" },
  { id: "contracts", name: "Contracts", color: "orange" },
  { id: "other", name: "Other Documents", color: "gray" },
];

const pricingPlans = [
  {
    name: "Starter",
    monthly: 0,
    yearly: 0,
    tagline: "Try the analyzer on a handful of documents.",
    features: [
      "100 document analyses total",
      "PDF & DOCX support",
      "Basic risk detection",
      "Email support",
    ],
    cta: "Get started",
    featured: false,
  },
  {
    name: "Pro",
    monthly: 1999,
    yearly: 1999 * 12,
    tagline: "For freelancers and small teams reviewing regularly.",
    features: [
      "20 folders",
      "Up to 400 documents in each folder",
      "Advanced risk detection",
      "Structured report exports",
      "3 team seats included",
      "Priority support",
    ],
    cta: "Get started",
    featured: true,
  },
  {
    name: "Business",
    monthly: 5999,
    yearly: 5999 * 12,
    tagline: "For growing teams managing large document collections.",
    features: [
      "70 folders",
      "Up to 1,000 documents in each folder",
      "Advanced risk detection",
      "Structured report exports",
      "Team workspace controls",
      "Priority support",
    ],
    cta: "Get started",
    featured: false,
  },
];

function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");
  const [documents, setDocuments] = useState(() => {
    const saved = loadPersistedJSON(APP_STORAGE_KEY, null);
    const savedDocuments = Array.isArray(saved?.documents)
      ? saved.documents.filter((doc) => !doc?.isDemo)
      : [];
    return savedDocuments.length ? savedDocuments : initialDocuments;
  });
  const [folders, setFolders] = useState(() => {
    const saved = loadPersistedJSON(APP_STORAGE_KEY, null);
    return Array.isArray(saved?.folders) && saved.folders.length
      ? saved.folders
      : initialFolders;
  });
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [dashboardConfig, setDashboardConfig] = useState(null);
  const [presentationConfig, setPresentationConfig] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [account, setAccount] = useState(() => loadPersistedJSON(APP_ACCOUNT_KEY, null));
  const [showUpgradeLimit, setShowUpgradeLimit] = useState(false);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [toast, setToast] = useState(null);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [showExcelBuilder, setShowExcelBuilder] = useState(false);
  const [excelBuilderData, setExcelBuilderData] = useState([]);
  const [workspaceSettings, setWorkspaceSettings] = useState(() => loadPersistedJSON(APP_SETTINGS_KEY, {
    workspaceName: "Open Ledger Docs Workspace",
    language: "English",
    autoRisk: true,
    smartSummaries: true,
    structuredExtraction: true,
  }));

  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  const [backendStatus, setBackendStatus] = useState("checking");
  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);
  const [processingOverlayId, setProcessingOverlayId] = useState(null);
  const [processingOverlayComplete, setProcessingOverlayComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkBackend = async () => {
      let lastError = null;

      for (const endpoint of HEALTH_ENDPOINTS) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          });

          if (response.ok) {
            const payload = await response.json().catch(() => ({}));
            if (payload?.status === "healthy" || payload?.status === "online" || response.ok) {
              if (!cancelled) setBackendStatus("online");
              return;
            }
          }

          lastError = new Error(`${endpoint} returned HTTP ${response.status}`);
        } catch (error) {
          lastError = error;
        } finally {
          window.clearTimeout(timeout);
        }
      }

      if (!cancelled) setBackendStatus("offline");
      console.warn("Open Ledger Docs backend health check failed for all configured health endpoints.", {
        endpoints: HEALTH_ENDPOINTS,
        error: lastError,
      });
    };

    checkBackend();
    const timer = window.setInterval(checkBackend, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const saved = loadPersistedJSON(APP_STORAGE_KEY, null);
    if (Array.isArray(saved?.documents)) {
      // Do not restore the old built-in demo/random documents. Only real user documents
      // that were uploaded/generated in this workspace belong in the document library.
      const savedRealDocuments = saved.documents.filter((doc) => !doc?.isDemo);
      setDocuments((current) => {
        const currentRealDocuments = current.filter((doc) => !doc?.isDemo);
        return savedRealDocuments.length
          ? savedRealDocuments.map((savedDoc) => {
              const currentDoc = currentRealDocuments.find((doc) => doc.id === savedDoc.id);
              return currentDoc ? { ...currentDoc, ...savedDoc, file: currentDoc.file } : savedDoc;
            })
          : currentRealDocuments;
      });
    }
    if (saved?.folders?.length) setFolders(saved.folders);
    setWorkspaceHydrated(true);
  }, []);

  useEffect(() => {
    if (!workspaceHydrated) return;
    persistJSON(APP_STORAGE_KEY, {
      version: 3,
      documents: documents.map(sanitizeDocumentForStorage),
      folders,
      savedAt: new Date().toISOString(),
    });
  }, [documents, folders, workspaceHydrated]);

  useEffect(() => {
    if (account) persistJSON(APP_ACCOUNT_KEY, account);
  }, [account]);

  useEffect(() => {
    persistJSON(APP_SETTINGS_KEY, workspaceSettings);
  }, [workspaceSettings]);

  const showToast = (message, tone = "info") => {
    setToast({ message, tone });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setShowCommandPalette(true);
        return;
      }
      if (event.key === "?" && !event.target.matches("input, textarea, select")) {
        event.preventDefault();
        setShowShortcuts(true);
      }
      if (event.key === "Escape") {
        setShowCommandPalette(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Use the live documents state everywhere so newly analyzed documents
  // immediately appear in search, documents, and analytics.
  const realDocuments = documents;

  const filteredDocuments = useMemo(() => {
    return realDocuments.filter((doc) => {
      const query = search.toLowerCase().trim();
      const searchable = [
        doc.name,
        doc.type,
        doc.category,
        doc.summary,
        ...(doc.tags || []),
        ...(doc.entities || []).map((entity) => `${entity.label} ${entity.value}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesFolder = !selectedFolderId || doc.folderId === selectedFolderId;
      return matchesSearch && matchesFolder;
    });
  }, [documents, search, selectedFolderId]);

  // Looked up live from `documents` (rather than storing a snapshot) so the
  // modal automatically reflects status changes — e.g. "Processing" flipping
  // to "Analyzed" or "Failed" once the backend responds, or a retry firing.
  const selectedDocument = documents.find(
    (doc) => doc.id === selectedDocumentId
  );

  const currentPlan = account?.plan || "Starter";
  const currentLimits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.Starter;
  const analysisCount = documents.filter((doc) => doc.status === "Analyzed").length;
  const folderCount = folders.length;
  const usagePercent = currentLimits.analyses === Infinity
    ? 0
    : Math.min(100, Math.round((analysisCount / currentLimits.analyses) * 100));

  const openUpgrade = () => {
    setShowUpgradeLimit(true);
    setActivePage("Pricing");
  };

  const openExcelBuilder = (source) => {
    const sourceDocuments = Array.isArray(source)
      ? source
      : source
        ? [source]
        : documents;

    // Export every real document in the workspace. This includes analyzed,
    // processing, and failed documents so the Excel report represents the
    // user's complete document library rather than the built-in demo data.
    const realDocumentsForExport = sourceDocuments.filter(
      (doc) => doc && !doc.isDemo
    );

    setExcelBuilderData(realDocumentsForExport);
    setShowExcelBuilder(true);
  };

  const canCreateFolder = () => {
    if (folderCount >= currentLimits.folders) {
      showToast(`Your ${currentPlan} plan allows ${currentLimits.folders} folders. Upgrade to create more.`, "danger");
      openUpgrade();
      return false;
    }
    return true;
  };

  const canAnalyzeCount = (count = 1) => {
    if (currentLimits.analyses === Infinity) return true;
    if (analysisCount + count > currentLimits.analyses) {
      showToast(`You have reached the ${currentLimits.analyses}-analysis limit on the ${currentPlan} plan.`, "danger");
      openUpgrade();
      return false;
    }
    return true;
  };

  const handleAccountContinue = async ({ name, email, password }) => {
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanName = String(name || "").trim() || "Workspace User";
    if (!cleanEmail || !password) {
      showToast("Please enter your email and password.", "danger");
      return false;
    }
    const isNewAccount = !account || authMode === "signup";
    try {
      const authResult = await supabasePasswordAuth(authMode, cleanEmail, password, cleanName);
      if (authResult && !authResult.access_token) {
        showToast("Account created. Check your email to confirm your account before connecting custom AI providers.", "success");
      }
      setAccount({
        id: authResult?.user?.id || account?.id || `acct-${Date.now()}`,
        name: authResult?.user?.user_metadata?.full_name || cleanName,
        email: authResult?.user?.email || cleanEmail,
        plan: isNewAccount ? "Starter" : (account?.plan || "Starter"),
        createdAt: account?.createdAt || new Date().toISOString(),
      });
    } catch (authError) {
      if (SUPABASE_URL && SUPABASE_ANON_KEY) {
        showToast(authError?.message || "Authentication failed.", "danger");
        return false;
      }
      setAccount({
        id: account?.id || `acct-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        plan: isNewAccount ? "Starter" : (account?.plan || "Starter"),
        createdAt: account?.createdAt || new Date().toISOString(),
      });
    }

    if (isNewAccount) {
      setDocuments([]);
      setFolders([]);
      setSelectedFolderId(null);
      setSelectedDocumentId(null);
    }

    setShowLogin(false);
    setShowLanding(false);
    showToast(
      authMode === "signup"
        ? "Account created. Your Starter workspace includes 5 folders and 100 analyses."
        : "Welcome back to your workspace.",
      "success"
    );
    return true;
  };

  const createFolder = (name) => {
    const cleanName = name.trim();
    if (!cleanName) return null;
    if (folders.some((folder) => folder.name.toLowerCase() === cleanName.toLowerCase())) return null;
    if (!canCreateFolder()) return null;

    const newFolder = { id: `folder-${Date.now()}`, name: cleanName, color: "purple" };
    setFolders((current) => [...current, newFolder]);
    setSelectedFolderId(newFolder.id);
    setActivePage("Documents");
    return newFolder.id;
  };

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;

    const incomingFiles = Array.from(files).filter((file) => {
      const extension = getFileExtension(file.name);
      if (!isSupportedFile(file)) {
        showToast(`${file.name}: .${extension || "unknown"} files are not supported.`, "danger");
        return false;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        showToast(`${file.name}: maximum file size is 25 MB.`, "danger");
        return false;
      }
      return true;
    });

    if (incomingFiles.length === 0) return;

    const remaining = currentLimits.analyses === Infinity
      ? incomingFiles.length
      : Math.max(0, currentLimits.analyses - analysisCount);

    if (remaining <= 0 || !canAnalyzeCount(Math.min(incomingFiles.length, remaining))) return;

    const filesToAnalyze = incomingFiles.slice(0, remaining);
    if (filesToAnalyze.length < incomingFiles.length) {
      showToast(`Only ${filesToAnalyze.length} analysis${filesToAnalyze.length === 1 ? "" : "es"} remaining on your ${currentPlan} plan.`, "info");
    }

    const newDocuments = filesToAnalyze.map((file, index) => ({
      id: makeClientDocumentId() + `-${index}`,
      isDemo: false,
      name: file.name,
      folderId: selectedFolderId || "other",
      type: getFileExtension(file.name).toUpperCase() || "FILE",
      size: formatFileSize(file.size),
      status: "Processing",
      processingStage: "uploading",
      processingProgress: null,
      risk: "Pending",
      date: "Just now",
      uploadedAt: new Date().toISOString(),
      pages: null,
      wordCount: null,
      confidence: null,
      uploadedBy: "Admin User",
      language: "English",
      tags: [],
      category: null,
      categoryDescription: "",
      summary: "Uploading to the analyzer…",
      entities: [],
      findings: [],
      file,
    }));

    setDocuments((current) => [...newDocuments, ...current]);
    setShowUpload(false);
    setSelectedDocumentId(newDocuments[0].id);
    setProcessingOverlayId(newDocuments[0].id);
    setProcessingOverlayComplete(false);
    setActivePage("Analyze");

    newDocuments.forEach((doc) => analyzeDocument(doc.file, doc.id));
    showToast(
      `${newDocuments.length} document${newDocuments.length > 1 ? "s" : ""} queued for analysis.`,
      "success"
    );
  };

  const analyzeDocument = async (file, docId) => {
    if (!file) return;

    setDocuments((current) =>
      current.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              status: "Processing",
              processingStage: "analyzing",
              processingProgress: null,
              risk: "Pending",
              summary: "Analyzing document…",
              error: null,
            }
          : doc
      )
    );

    const formData = new FormData();
    formData.append("file", file);

    const timeout = createAbortableTimeout(ANALYSIS_TIMEOUT_MS);

    try {
      let response = null;
      let lastConnectionError = null;

      setDocuments((current) => current.map((doc) => doc.id === docId ? { ...doc, processingStage: "reading", summary: "Reading document…" } : doc));

      for (const endpoint of ANALYZE_ENDPOINTS) {
        try {
          setDocuments((current) => current.map((doc) => doc.id === docId ? { ...doc, processingStage: "analyzing", summary: "Analyzing document structure…" } : doc));
          response = await fetch(endpoint, {
            method: "POST",
            body: formData,
            signal: timeout.signal,
          });
          // A real HTTP response means the backend was reached. Do not hide
          // backend errors by trying another loopback URL.
          break;
        } catch (connectionError) {
          lastConnectionError = connectionError;
        }
      }

      if (!response) {
        throw lastConnectionError || new TypeError("Unable to connect to the FastAPI analyzer.");
      }

      if (!response.ok) {
        const detail = await readBackendError(response);
        if (response.status === 500) {
          throw new Error(
            detail
              ? `FastAPI /analyze returned 500: ${detail}`
              : "FastAPI /analyze returned 500. The request reached the backend, but the backend crashed while processing the document. Check the FastAPI terminal traceback."
          );
        }

        throw new Error(
          detail || `Backend returned ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      const finalResult = result;
      const parsed = mapAnalysisResponse(finalResult);

      setDocuments((current) =>
        current.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                ...parsed,
                isDemo: false,
                processingStage: "complete",
                processingProgress: 100,
                status: parsed.status || "Analyzed",
                analyzedAt: new Date().toISOString(),
                error: null,
              }
            : doc
        )
      );
      setProcessingOverlayComplete(true);
      window.setTimeout(() => {
        setProcessingOverlayId((current) => current === docId ? null : current);
        setProcessingOverlayComplete(false);
      }, 700);
      showToast(`${file.name} analysis completed.`, "success");
    } catch (error) {
      console.error("Document analysis failed:", error);
      const message = normalizeApiError(error);

      setDocuments((current) =>
        current.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                status: "Failed",
                processingStage: "error",
                processingProgress: null,
                risk: "Pending",
                error: message,
                summary: message,
              }
            : doc
        )
      );
      showToast(`Analysis failed for ${file.name}.`, "danger");
    } finally {
      timeout.clear();
    }
  };

  const retryAnalysis = (doc) => {
    if (!doc.file) return;
    analyzeDocument(doc.file, doc.id);
  };

  const handleFileInput = (event) => {
    handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const deleteFolder = (folderId) => {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) return;

    const documentCount = documents.filter((doc) => doc.folderId === folderId).length;
    setDeleteFolderTarget({ folderId, folderName: folder.name, documentCount });
  };

  const confirmDeleteFolder = () => {
    if (!deleteFolderTarget) return;

    const { folderId, documentCount } = deleteFolderTarget;
    const fallbackFolder =
      folders.find((item) => item.id !== folderId && item.name === "Other Documents") ||
      folders.find((item) => item.id !== folderId);

    setDocuments((current) =>
      current.map((doc) =>
        doc.folderId === folderId
          ? { ...doc, folderId: fallbackFolder?.id || null }
          : doc
      )
    );
    setFolders((current) => current.filter((item) => item.id !== folderId));

    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }

    setDeleteFolderTarget(null);
    showToast(
      documentCount
        ? `Folder deleted. ${documentCount === 1 ? "1 document was" : `${documentCount} documents were`} moved safely.`
        : "Folder deleted successfully.",
      "success"
    );
  };

  const deleteDocument = (id) => {
    setDocuments((current) => current.filter((doc) => doc.id !== id));
    setSelectedDocumentId((current) => (current === id ? null : current));
    showToast("Document removed from the workspace.", "success");
  };

  const moveDocument = (documentId, folderId) => {
    const targetFolder = folders.find((folder) => folder.id === folderId);
    if (!targetFolder) return;

    setDocuments((current) =>
      current.map((doc) =>
        doc.id === documentId ? { ...doc, folderId: targetFolder.id } : doc
      )
    );
    showToast(`Moved document to ${targetFolder.name}.`, "success");
  };

  if (showLanding) {
    return (
      <div className={darkMode ? "dark" : ""}>
        <style>{styles}</style>
        {showLogin ? (
          <LoginPage
            mode={authMode}
            onModeChange={setAuthMode}
            account={account}
            onBack={() => setShowLogin(false)}
            onContinue={handleAccountContinue}
          />
        ) : (
          <LandingPage
            darkMode={darkMode}
            onToggleDarkMode={setDarkMode}
            onViewApp={() => {
              if (!account) {
                setAuthMode("signin");
                setShowLogin(true);
                return;
              }
              setShowLanding(false);
            }}
            onAnalyze={() => {
              if (!account) {
                setAuthMode("signup");
                setShowLogin(true);
                return;
              }
              setShowLanding(false);
              setActivePage("Analyzer");
            }}
            onSignIn={() => {
              setAuthMode("signin");
              setShowLogin(true);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? "dark" : ""}`}>
      <style>{styles}</style>

      {/* Mobile overlay */}
      {mobileMenu && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenu(false)}
        />
      )}

      {showUpgradeLimit && (
        <div className="modal-backdrop" onClick={() => setShowUpgradeLimit(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-icon"><Sparkles size={22} /></div>
            <h2>Free plan limit reached</h2>
            <p>
              Your free Starter plan includes <strong>5 folders</strong> and
              <strong> 100 document analyses</strong>. Upgrade to Pro or Business for higher limits.
            </p>
            <div className="limit-summary">
              <div><span>Folders</span><strong>{folderCount} / {currentLimits.folders}</strong></div>
              <div><span>Analyses</span><strong>{analysisCount} / {currentLimits.analyses === Infinity ? "∞" : currentLimits.analyses}</strong></div>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowUpgradeLimit(false)}>Not now</button>
              <button className="primary-button" onClick={() => { setShowUpgradeLimit(false); setActivePage("Pricing"); }}>
                View plans <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteFolderTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md transition-opacity duration-200" onClick={() => setDeleteFolderTarget(null)}>
          <div className="w-full max-w-[430px] rounded-[22px] border border-slate-200/80 bg-white p-[22px] text-slate-900 shadow-[0_28px_80px_rgba(15,23,42,.24),0_8px_28px_rgba(15,23,42,.1)] transition duration-200 dark:border-slate-700/60 dark:bg-slate-900 dark:text-white dark:shadow-[0_30px_90px_rgba(0,0,0,.45)] max-[520px]:rounded-[18px] max-[520px]:p-[18px]" role="dialog" aria-modal="true" aria-labelledby="delete-folder-title" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="grid h-12 w-12 place-items-center rounded-[14px] border border-rose-200/80 bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 shadow-inner dark:border-rose-400/20 dark:from-rose-950/60 dark:to-rose-900/30 dark:text-rose-300"><Trash2 size={21} /></div>
              <button className="grid h-[34px] w-[34px] place-items-center rounded-[10px] border-0 bg-slate-50 text-slate-500 transition duration-200 hover:rotate-3 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white" type="button" onClick={() => setDeleteFolderTarget(null)} aria-label="Close delete folder dialog"><X size={17} /></button>
            </div>
            <div className="mt-[18px]">
              <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[.1em] text-rose-600 dark:text-rose-400">Folder action</span>
              <h2 id="delete-folder-title" className="m-0 text-[21px] font-bold leading-[1.2] tracking-[-.035em] text-slate-900 dark:text-white">Delete “{deleteFolderTarget.folderName}”?</h2>
              <p className="mb-0 mt-2.5 text-[13px] leading-[1.65] text-slate-500 dark:text-slate-400">{deleteFolderTarget.documentCount > 0 ? <>This folder contains <strong className="text-slate-900 dark:text-white">{deleteFolderTarget.documentCount} {deleteFolderTarget.documentCount === 1 ? "document" : "documents"}</strong>. They’ll be moved to <strong className="text-slate-900 dark:text-white">Other Documents</strong> so nothing is lost.</> : <>This folder is empty. Deleting it will permanently remove the folder from your workspace.</>}</p>
            </div>
            <div className="mt-[17px] flex items-start gap-2.5 rounded-xl border border-emerald-200/70 bg-emerald-50/70 px-3 py-[11px] text-[11.5px] leading-[1.45] text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/30 dark:text-emerald-300"><ShieldCheck size={16} /><span>Your documents stay safe when this folder is deleted.</span></div>
            <div className="mt-5 flex justify-end gap-2.5 max-[520px]:flex-col-reverse">
              <button type="button" className="secondary-button min-h-10 rounded-[11px] max-[520px]:w-full" onClick={() => setDeleteFolderTarget(null)}>Keep folder</button>
              <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[11px] border border-red-600 bg-gradient-to-br from-red-500 to-red-600 px-3.5 text-xs font-bold text-white shadow-[0_7px_18px_rgba(220,38,38,.2)] transition duration-200 hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(220,38,38,.27)] active:translate-y-0 active:scale-[.98] max-[520px]:w-full" onClick={confirmDeleteFolder}><Trash2 size={16} />Delete folder</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"} ${mobileMenu ? "mobile-open" : ""}`}>

        <div className="logo">
          <div className="logo-icon">
            <FileSearch size={19} />
          </div>

          <div className="logo-copy">
            <span>Open Ledger Docs</span>
            <small>AI document intelligence</small>
          </div>

          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <div className="workspace-label">
          Workspace
        </div>

        <div className="workspace-chip" aria-hidden="true">
          <span className="workspace-avatar">D</span>
          <span className="workspace-chip-copy">
            <strong>Open Ledger Docs</strong>
            <small>Personal workspace</small>
          </span>
          <ChevronRight size={14} />
        </div>

        <nav className="navigation">

          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={activePage === "Dashboard"}
            onClick={() => {
              setActivePage("Dashboard");
              setMobileMenu(false);
            }}
          />

          <NavItem
            icon={<FileSearch size={18} />}
            label="Analyzer"
            active={activePage === "Analyzer"}
            onClick={() => {
              setActivePage("Analyzer");
              setMobileMenu(false);
            }}
          />

          <NavItem
            icon={<FileSpreadsheet size={18} />}
            label="Import Excel"
            active={activePage === "Import Excel"}
            onClick={() => {
              setActivePage("Import Excel");
              setMobileMenu(false);
            }}
          />

          <NavItem
            icon={<Database size={18} />}
            label="SAP Data"
            active={activePage === "SAP Data"}
            onClick={() => {
              setActivePage("SAP Data");
              setMobileMenu(false);
            }}
          />

          <NavItem
            icon={<Sparkles size={18} />}
            label="Analyze"
            active={activePage === "Analyze"}
            onClick={() => {
              setActivePage("Analyze");
              setMobileMenu(false);
            }}
          />

          <NavItem
            icon={<Files size={18} />}
            label="Documents"
            active={activePage === "Documents"}
            badge={documents.length}
            onClick={() => {
              setActivePage("Documents");
              setMobileMenu(false);
            }}
          />

          <NavItem
            icon={<BarChart3 size={18} />}
            label="Analytics"
            active={activePage === "Analytics"}
            onClick={() => {
              setActivePage("Analytics");
              setMobileMenu(false);
            }}
          />

          <NavItem
            icon={<MonitorPlay size={18} />}
            label="Presentation"
            active={activePage === "Presentation"}
            onClick={() => {
              setActivePage("Presentation");
              setMobileMenu(false);
            }}
          />

          <NavItem
            icon={<Sparkles size={18} />}
            label="Design Studio"
            active={activePage === "Design"}
            onClick={() => {
              setActivePage("Design");
              setMobileMenu(false);
            }}
          />

          <NavItem
            icon={<Tag size={18} />}
            label="Pricing"
            active={activePage === "Pricing"}
            onClick={() => {
              setActivePage("Pricing");
              setMobileMenu(false);
            }}
          />

        </nav>

        <div className="sidebar-section">
          <div className="workspace-label">
            System
          </div>

          <NavItem
            icon={<Settings size={18} />}
            label="Settings"
            active={activePage === "Settings"}
            onClick={() => {
              setActivePage("Settings");
              setMobileMenu(false);
            }}
          />
        </div>

        <div className="sidebar-spacer" />

        {/* Usage card */} 
          <div className="usage-card">
            <div className="usage-top">
              <span>AI usage</span>
              <Sparkles size={15} />
            </div>

            <strong>{currentLimits.analyses === Infinity ? "∞" : `${usagePercent}%`}</strong>

            <div className="progress">
              <div style={{ width: currentLimits.analyses === Infinity ? "18%" : `${usagePercent}%` }} />
            </div>

            <p>
              {currentLimits.analyses === Infinity
                ? `${analysisCount} analyses · ${folderCount}/${currentLimits.folders} folders`
                : `${analysisCount} / ${currentLimits.analyses} analyses · ${folderCount}/${currentLimits.folders} folders`}
            </p>

            <button onClick={() => setActivePage("Pricing")}>
              {currentPlan === "Starter" ? "Upgrade plan" : "Manage plan"}
              <ArrowUpRight size={14} />
            </button>
          </div>

        {/* User */}
        <div className="user-card">
          <div className="avatar">
            {(account?.name || "U").slice(0, 1).toUpperCase()}
          </div>

          <div className="user-info">
            <strong>{account?.name || "Workspace User"}</strong>
            <span>{currentPlan} Workspace</span>
          </div>

          <MoreHorizontal size={17} />
        </div>

      </aside>

      {/* Main */}
      <main className="main">

        {/* Topbar */}
        <header className="topbar">

          <button
            className="mobile-menu"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={20} />
          </button>

          <div className="breadcrumb">
            Workspace
            <ChevronRight size={14} />
            <strong>{activePage}</strong>
          </div>

          <div
            className={`backend-status backend-status-${backendStatus}`}
            title={`API: ${API_BASE_URL} • Health: ${HEALTH_ENDPOINTS.join(" | ")}`}
            aria-label={`Backend status: ${backendStatus}`}
          >
            <span className="backend-status-dot" />
            <span>
              {backendStatus === "online"
                ? "Open Ledger API online"
                : backendStatus === "checking"
                  ? "Checking API"
                  : "Open Ledger API offline"}
            </span>
          </div>

          <div className="top-actions">

            <div className="global-search">
              <Search size={17} />
              <input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>

            <button
              className={`theme-switch ${darkMode ? "is-dark" : "is-light"}`}
              onClick={() => setDarkMode((value) => !value)}
              role="switch"
              aria-checked={darkMode}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="theme-switch-track">
                <span className="theme-switch-icon theme-switch-moon"><Moon size={15} /></span>
                <span className="theme-switch-icon theme-switch-sun"><Sun size={15} /></span>
                <span className="theme-switch-thumb"><span /></span>
              </span>
            </button>

            <button
              className={`icon-button notification-button ${showNotifications ? "is-open" : ""}`}
              onClick={() => setShowNotifications((value) => !value)}
              aria-label="Open notifications"
            >
              <Bell size={18} />
              <span />
            </button>

          </div>

        </header>

        {/* Page content */}
        <div className="page-content">

          {activePage === "Dashboard" && (
            <Dashboard
              documents={filteredDocuments}
              folders={folders}
              onUpload={() => setShowUpload(true)}
              onNavigate={setActivePage}
              onSelect={(doc) => setSelectedDocumentId(doc.id)}
              dashboardConfig={dashboardConfig}
              onDashboardConfig={setDashboardConfig}
            />
          )}

          {activePage === "Analyzer" && (
            <Analyzer
              dragging={dragging}
              setDragging={setDragging}
              onFiles={handleFiles}
              fileInputRef={fileInputRef}
              onUpload={() => setShowUpload(true)}
            />
          )}

          {activePage === "Import Excel" && (
            <ComingSoonPage
              icon={<FileSpreadsheet size={34} />}
              eyebrow="Excel Import"
              title="Import Excel is coming soon"
              description="We’re preparing a dedicated Excel ingestion workspace that will let you upload workbooks, map columns, validate data, and send clean structured datasets into Open Ledger Docs reporting workflows."
              features={[
                "Upload XLSX and CSV files with guided validation",
                "Automatic column mapping and data-type detection",
                "Preview, clean and validate records before import",
                "Send imported data directly into Excel Report Builder",
                "Reusable import templates for recurring reports",
                "Duplicate, missing-value and data-quality checks",
              ]}
              onBack={() => setActivePage("Dashboard")}
            />
          )}

          {activePage === "SAP Data" && (
            <SAPPage
              darkMode={darkMode}
              onBack={() => setActivePage("Dashboard")}
              onToast={showToast}
            />
          )}

          {activePage === "Analyze" && (
            <AnalyzePage
              document={selectedDocument}
              onBack={() => setActivePage("Analyzer")}
              onDocuments={() => setActivePage("Documents")}
              onSelect={(doc) => setSelectedDocumentId(doc.id)}
              documents={documents}
              folders={folders}
              currentPlan={currentPlan}
              onUpgrade={openUpgrade}
              onOpenExcelBuilder={openExcelBuilder}
                                          onPresentation={(config) => { setPresentationConfig(config); setActivePage("Presentation"); }}
            />
          )}

          {activePage === "Documents" && (
            <Documents
              documents={filteredDocuments}
              allDocuments={documents}
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={(folderId) => setSelectedFolderId(folderId)}
              onCreateFolder={createFolder}
              onDeleteFolder={deleteFolder}
              search={search}
              onUpload={() => setShowUpload(true)}
              onDelete={deleteDocument}
              onMoveDocument={moveDocument}
              onSelect={(doc) => setSelectedDocumentId(doc.id)}
              onOpenExcelBuilder={openExcelBuilder}
            />
          )}

          {activePage === "Analytics" && (
            <Analytics documents={documents} />
          )}

          {activePage === "Presentation" && (
            <ComingSoonPage
              icon={<MonitorPlay size={34} />}
              eyebrow="Presentation Studio"
              title="Presentation is coming soon"
              description="We’re polishing the presentation experience so you can turn your Open Ledger Docs analysis into professional, presentation-ready slides."
              features={[
                "AI-generated presentation structure",
                "Live analysis-based slide content",
                "Professional presentation themes",
                "Export and presentation-ready workflows",
              ]}
              onBack={() => setActivePage("Dashboard")}
            />
          )}

          {activePage === "Design" && (
            <DesignStudio
              documents={documents}
              darkMode={darkMode}
              onBack={() => setActivePage("Dashboard")}
              onToast={showToast}
            />
          )}

          {activePage === "Pricing" && (
            <Pricing
              billingCycle={billingCycle}
              setBillingCycle={setBillingCycle}
              onCheckout={(plan) => setCheckoutPlan(plan)}
            />
          )}

          {activePage === "Settings" && (
            <SettingsPage
              settings={workspaceSettings}
              onSave={(next) => {
                setWorkspaceSettings(next);
                showToast("Settings saved successfully.", "success");
              }}
                                          onToast={showToast}
            />
          )}

        </div>

      </main>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          dragging={dragging}
          setDragging={setDragging}
          onFiles={handleFiles}
          onClose={() => setShowUpload(false)}
          fileInputRef={fileInputRef}
        />
      )}

      {/* Document details */}
      {selectedDocument && !processingOverlayId && (
        <DocumentModal
          document={selectedDocument}
          onClose={() => setSelectedDocumentId(null)}
          onDelete={deleteDocument}
          onRetry={retryAnalysis}
          onOpenExcelBuilder={openExcelBuilder}
        />
      )}

      {processingOverlayId && selectedDocument && (
        <DocumentProcessing
          file={selectedDocument.file}
          document={selectedDocument}
          stage={processingOverlayComplete ? "complete" : (selectedDocument.processingStage || "analyzing")}
          progress={selectedDocument.processingProgress}
          statusMessage={selectedDocument.summary}
          error={selectedDocument.error || ""}
          onRetry={retryAnalysis}
          onChooseFile={() => { setProcessingOverlayId(null); setProcessingOverlayComplete(false); setShowUpload(true); }}
          onClose={() => { if (selectedDocument.status !== "Processing") { setProcessingOverlayId(null); setProcessingOverlayComplete(false); } }}
        />
      )}

      {showCommandPalette && (
        <CommandPalette
          documents={documents}
          onClose={() => setShowCommandPalette(false)}
          onNavigate={(page) => { setActivePage(page); setShowCommandPalette(false); }}
          onAnalyze={() => { setActivePage("Analyzer"); setShowCommandPalette(false); }}
          onUpload={() => { setShowUpload(true); setShowCommandPalette(false); }}
          onShortcut={() => { setShowShortcuts(true); setShowCommandPalette(false); }}
        />
      )}

      {showNotifications && (
        <NotificationCenter
          documents={documents}
          onClose={() => setShowNotifications(false)}
          onSelect={(doc) => { setSelectedDocumentId(doc.id); setActivePage("Analyze"); setShowNotifications(false); }}
        />
      )}

      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {checkoutPlan && (
        <CheckoutModal
          plan={checkoutPlan}
          billingCycle={billingCycle}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={(method) => {
            setCheckoutPlan(null);
            showToast(`${checkoutPlan.name} checkout started with ${method}.`, "success");
          }}
        />
      )}

      {showExcelBuilder && (
        <ExcelExportBuilder
          documents={excelBuilderData}
          allDocuments={documents}
          apiEndpoint={EXPORT_EXCEL_ENDPOINT}
          darkMode={darkMode}
          onClose={() => setShowExcelBuilder(false)}
          onNavigateAnalyzer={() => {
            setShowExcelBuilder(false);
            setActivePage("Analyzer");
          }}
          onToast={showToast}
        />
      )}

      {toast && (
        <ToastMessage message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}

    </div>
  );
}

/* Public landing page */
/* -------------------------------- */

function LandingPage({ onViewApp, onAnalyze, onSignIn, darkMode, onToggleDarkMode }) {
  const [activeDemo, setActiveDemo] = useState("overview");

  const demoCards = {
    overview: {
      title: "Employment Contract",
      subtitle: "Employment_Contract.pdf",
      status: "Analysis Complete",
      score: "94%",
      label: "AI confidence",
      icon: <FileCheck2 size={22} />,
    },
    risks: {
      title: "Risk Review",
      subtitle: "12 clauses scanned",
      status: "2 findings",
      score: "Low",
      label: "Overall risk",
      icon: <ShieldCheck size={22} />,
    },
    insights: {
      title: "Executive Summary",
      subtitle: "Board-ready review",
      status: "Ready",
      score: "8",
      label: "Key findings",
      icon: <Sparkles size={22} />,
    },
  };

  const demo = demoCards[activeDemo];

  return (
    <div className="reference-landing ds-reference-landing">
      <div className="reference-page-shell ds-reference-shell">
        <header className="reference-nav ds-reference-nav">
          <button className="reference-brand ds-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className="reference-brand-mark ds-brand-mark"><FileSearch size={17} /></span>
            <span className="ds-brand-name"><span className="ds-brand-open">Open</span> <span className="ds-brand-accent">Led Docs</span></span>
          </button>

          <nav className="reference-nav-links ds-nav-links" aria-label="Main navigation">
            <a href="#product">Home</a>
            <a href="#features">Features</a>
            <a href="#workflow">Use Cases</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="reference-nav-actions ds-nav-actions">
            <button
              className={`ds-round-theme ${!darkMode ? "is-active" : ""}`}
              aria-label="Light theme"
              onClick={() => onToggleDarkMode(false)}
            >
              <Sun size={16} />
            </button>
            <button
              className={`ds-round-theme ${darkMode ? "is-active" : ""}`}
              aria-label="Dark theme"
              onClick={() => onToggleDarkMode(true)}
            >
              <Moon size={16} />
            </button>
          </div>
        </header>

        <main>
          <section className="reference-hero ds-reference-hero" id="product">
            <div className="reference-hero-copy ds-hero-copy">
              <div className="reference-eyebrow ds-eyebrow">
                <Sparkles size={13} />
                AI-POWERED DOCUMENT INTELLIGENCE
              </div>

              <h1>
                Turn your
                <br />
                <span className="ds-gradient-text">documents into</span>
                <br />
                actionable insights
              </h1>

              <p>
                Upload any document and get instant, AI-powered analysis.
                Extract key information, understand the context, identify
                risks, and make smarter decisions — all in one place.
              </p>

              <div className="reference-hero-actions ds-hero-actions">
                <button className="reference-primary-cta ds-primary-cta" onClick={onAnalyze}>
                  <Upload size={16} />
                  Upload Document
                  <ArrowUpRight size={15} />
                </button>
                <button className="reference-secondary-cta ds-secondary-cta" onClick={onViewApp}>
                  <MonitorPlay size={15} />
                  View Your Workspace
                </button>
              </div>

              <div className="reference-trust-row ds-trust-row">
                <span><CheckCircle2 size={13} /> Secure & private</span>
                <span><CheckCircle2 size={13} /> No credit card required</span>
                <span><CheckCircle2 size={13} /> Results in seconds</span>
              </div>

              <div className="ds-hero-metrics" aria-label="Open Ledger Docs capabilities">
                <div className="ds-hero-metric">
                  <strong>5</strong>
                  <span>Starter folders</span>
                </div>
                <div className="ds-hero-metric">
                  <strong>100</strong>
                  <span>Document analyses</span>
                </div>
                <div className="ds-hero-metric">
                  <strong>25MB</strong>
                  <span>Max file size</span>
                </div>
              </div>

              <div className="ds-hero-capabilities">
                <span><FileCheck2 size={13} /> Summaries</span>
                <span><ShieldCheck size={13} /> Risk detection</span>
                <span><BarChart3 size={13} /> Reports</span>
                <span><MessageCircle size={13} /> Document Q&amp;A</span>
              </div>
            </div>

            <div className="reference-hero-art ds-landing-visual" aria-label="Open Ledger Docs analysis preview">
              <div className="ds-glow ds-glow-one" />
              <div className="ds-glow ds-glow-two" />

              <div className="ds-floating-chip ds-upload-chip">
                <span><CheckCircle2 size={14} /></span>
                <div><strong>Document uploaded</strong><small>Ready to analyze</small></div>
              </div>

              <div className="ds-document-preview">
                <div className="ds-paper-top">
                  <span className="ds-pdf-badge">PDF</span>
                  <span className="ds-paper-menu">•••</span>
                </div>
                <div className="ds-paper-title">Employment Contract</div>
                <div className="ds-paper-subtitle">Employment_Contract.pdf</div>
                <div className="ds-paper-lines">
                  <i /><i /><i /><i /><i /><i /><i /><i />
                </div>
                <div className="ds-paper-highlight"><Sparkles size={12} /> AI extracted 24 fields</div>
              </div>

              <div className="ds-analysis-preview">
                <div className="ds-analysis-top">
                  <div>
                    <span className="ds-analysis-kicker">AI ANALYSIS</span>
                    <h3>Document Analysis</h3>
                  </div>
                  <span className="ds-complete-pill"><CheckCircle2 size={12} /> Complete</span>
                </div>

                <div className="ds-type-box">
                  <span className="ds-type-icon"><FileText size={15} /></span>
                  <div><small>Document Type</small><strong>Employment Contract</strong></div>
                </div>

                <div className="ds-key-info">
                  <span>Key Information</span>
                  <b>Start Date: <em>Jan 15, 2024</em></b>
                  <b>Salary: <em>$85,000 / year</em></b>
                  <b>Notice Period: <em>30 days</em></b>
                </div>

                <div className="ds-summary">
                  <span>Summary</span>
                  <p>This employment contract outlines terms of employment, compensation, responsibilities and conditions.</p>
                </div>

                <button className="ds-analysis-button" onClick={onViewApp}>
                  View Full Analysis <ArrowUpRight size={14} />
                </button>
              </div>

              <div className="ds-floating-chip ds-file-chip">
                <span><FileText size={14} /></span>
                <div><strong>Employment_Contract.pdf</strong><small>PDF · 245 KB</small></div>
              </div>

              <div className="ds-feature-dock">
                <span><Sparkles size={16} /></span>
                <span><Search size={16} /></span>
                <span><BarChart3 size={16} /></span>
                <span><ShieldCheck size={16} /></span>
              </div>
            </div>
          </section>

          <section className="reference-logo-strip ds-capability-strip">
            <span>BUILT FOR EVERY DOCUMENT, EVERY WORKFLOW</span>
            <div>
              <b><Sparkles size={15} /> Instant Analysis</b>
              <b><ShieldCheck size={15} /> Secure & Private</b>
              <b><FileSearch size={15} /> AI-Powered</b>
              <b><Files size={15} /> Multiple Formats</b>
              <b><Layers size={15} /> Built for Everyone</b>
            </div>
          </section>

          <section className="reference-feature-section ds-feature-section" id="features">
            <div className="reference-section-heading">
              <span>ONE WORKSPACE</span>
              <h2>Everything important,<br />without the busywork.</h2>
              <p>
                Upload once and move from extraction to review, risk analysis,
                reporting and presentation in one connected workspace.
              </p>
            </div>

            <div className="reference-feature-grid">
              <article className="reference-feature-card ds-feature-card feature-large">
                <div className="feature-card-icon purple"><FileSearch size={20} /></div>
                <span>01 · UNDERSTAND</span>
                <h3>Turn long documents into clear reviews.</h3>
                <p>See summaries, entities, dates, numbers, clauses and important facts in a format your team can scan quickly.</p>
                <div className="feature-preview-lines"><i /><i /><i /><i /></div>
              </article>

              <article className="reference-feature-card ds-feature-card">
                <div className="feature-card-icon red"><ShieldCheck size={20} /></div>
                <span>02 · PROTECT</span>
                <h3>Find risks before they get buried.</h3>
                <p>Group findings by severity and surface missing information that deserves a second look.</p>
                <div className="feature-risk-stack"><b>High</b><b>Medium</b><b>Low</b></div>
              </article>

              <article className="reference-feature-card ds-feature-card">
                <div className="feature-card-icon blue"><BarChart3 size={20} /></div>
                <span>03 · EXPLAIN</span>
                <h3>Build an executive view from the analysis.</h3>
                <p>Turn document-level results into dashboards, reports and presentations for clients and teams.</p>
                <div className="feature-bars"><i style={{height:"48%"}} /><i style={{height:"74%"}} /><i style={{height:"61%"}} /><i style={{height:"88%"}} /><i style={{height:"68%"}} /></div>
              </article>
            </div>
          </section>

          <section className="reference-demo-section ds-demo-section" id="workflow">
            <div className="reference-demo-head">
              <div>
                <span>LIVE PRODUCT PREVIEW</span>
                <h2>From upload to<br />decision-ready output.</h2>
              </div>
              <div className="reference-demo-tabs">
                {Object.entries(demoCards).map(([key, item]) => (
                  <button key={key} className={activeDemo === key ? "active" : ""} onClick={() => setActiveDemo(key)}>
                    {item.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="reference-demo-window ds-demo-window">
              <div className="demo-window-sidebar">
                <div className="demo-sidebar-brand"><span><FileSearch size={12} /></span> Open Ledger Docs</div>
                <div className="demo-sidebar-item active"><LayoutDashboard size={13} /> Dashboard</div>
                <div className="demo-sidebar-item"><FileSearch size={13} /> Analyzer</div>
                <div className="demo-sidebar-item"><Files size={13} /> Documents</div>
                <div className="demo-sidebar-item"><BarChart3 size={13} /> Analytics</div>
              </div>

              <div className="demo-window-main">
                <div className="demo-window-top">
                  <span>Workspace / {demo.title}</span>
                  <span className="demo-status"><span /> {demo.status}</span>
                </div>
                <div className="demo-window-content">
                  <div className="demo-document-title">
                    <div className="demo-file-box">{demo.icon}</div>
                    <div><span>AI REVIEW</span><h3>{demo.subtitle}</h3></div>
                  </div>
                  <div className="demo-kpi-row">
                    <div><span>{demo.label}</span><strong>{demo.score}</strong></div>
                    <div><span>Pages reviewed</span><strong>12</strong></div>
                    <div><span>Important fields</span><strong>24</strong></div>
                    <div><span>Findings</span><strong>03</strong></div>
                  </div>
                  <div className="demo-lower-grid">
                    <div className="demo-panel">
                      <span>AI SUMMARY</span>
                      <p>The document was reviewed and structured into a concise set of findings, fields, risks and recommended follow-up actions.</p>
                      <div className="demo-line-list"><i /><i /><i /></div>
                    </div>
                    <div className="demo-panel">
                      <span>REVIEW SIGNALS</span>
                      <div className="demo-signal"><b>Confidence</b><strong>94%</strong><em><i /></em></div>
                      <div className="demo-signal"><b>Risk coverage</b><strong>88%</strong><em><i /></em></div>
                      <div className="demo-signal"><b>Field extraction</b><strong>96%</strong><em><i /></em></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="reference-workflow-section ds-workflow-section">
            <div className="reference-section-heading compact">
              <span>HOW IT WORKS</span>
              <h2>Upload. Analyze. Understand.</h2>
              <p>No complicated setup. Drop in a document and let the workspace organize the review.</p>
            </div>
            <div className="reference-step-grid">
              <div><span>01</span><FileUp size={18} /><h3>Upload</h3><p>Drop one document or a batch of files into the analyzer.</p></div>
              <div><span>02</span><Sparkles size={18} /><h3>Analyze</h3><p>Click Analyze with AI and Open Ledger Docs immediately opens the selected document's analysis page.</p></div>
              <div><span>03</span><MonitorPlay size={18} /><h3>Act</h3><p>Review extracted fields, findings, confidence and reports from the same document page.</p></div>
            </div>
          </section>

          <section className="reference-security-section ds-security-section" id="security">
            <div className="security-copy">
              <div className="security-badge"><ShieldCheck size={16} /> REVIEW-FIRST WORKFLOW</div>
              <h2>Your document stays connected to its analysis.</h2>
              <p>Original document metadata, extracted information, AI findings and reporting output remain connected instead of scattering the work across separate tools.</p>
              <button className="reference-secondary-cta" onClick={onViewApp}>Explore workspace <ArrowUpRight size={15} /></button>
            </div>
            <div className="security-grid">
              <div><ShieldCheck size={18} /><strong>Clear review states</strong><span>Processing, analyzed and failed states stay visible.</span></div>
              <div><Files size={18} /><strong>Saved workspace</strong><span>Documents and folders remain connected to their analysis.</span></div>
              <div><Download size={18} /><strong>Professional exports</strong><span>Keep analysis results ready for reporting and sharing.</span></div>
              <div><MonitorPlay size={18} /><strong>Presentation ready</strong><span>Build a deck from one document or a whole folder.</span></div>
            </div>
          </section>

          <section className="reference-pricing-section ds-final-cta" id="pricing">
            <div>
              <span>READY TO REVIEW</span>
              <h2>Bring your next document<br />into the workspace.</h2>
              <p>Start with the existing analyzer and move directly from upload to a dedicated analysis page.</p>
            </div>
            <div className="reference-pricing-actions">
              <button className="reference-primary-cta ds-primary-cta" onClick={onAnalyze}>Upload Document <ArrowUpRight size={15} /></button>
              <button className="reference-signin large" onClick={onViewApp}>View Workspace</button>
            </div>
          </section>

          <section id="faq" className="ds-faq-strip">
            <div><strong>What can I analyze?</strong><span>PDF, DOCX, TXT, spreadsheets, images and supported business documents.</span></div>
            <div><strong>What happens after upload?</strong><span>The selected document is added to the workspace and opened on its analysis page while processing.</span></div>
            <div><strong>Can I keep reviewing it?</strong><span>Yes. The document and its analysis remain available in Documents and the workspace.</span></div>
          </section>
        </main>

        <footer className="reference-footer ds-footer">
          <div className="reference-brand"><span className="reference-brand-mark"><FileSearch size={16} /></span><span>Open Ledger Docs</span></div>
          <span>AI document intelligence workspace</span>
          <span>© 2026 Open Ledger Docs</span>
        </footer>
      </div>
    </div>
  );
}

function LoginPage({ mode = "signin", onModeChange, onBack, onContinue }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  const submit = (event) => {
    event.preventDefault();
    if (isSignup && !name.trim()) {
      setError("Enter your name to create your workspace.");
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password to continue.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    onContinue({ name, email, password });
  };

  return (
    <div className="reference-auth-page">
      <div className="reference-auth-shell">
        <header className="reference-auth-nav">
          <button className="reference-brand" onClick={onBack}>
            <span className="reference-brand-mark"><FileSearch size={16} /></span>
            <span>Open Ledger Docs</span>
          </button>
          <button className="reference-signin" onClick={onBack}>
            <ArrowLeft size={14} /> Back to site
          </button>
        </header>

        <div className="reference-auth-card">
          <div className="auth-art-panel">
            <div className="auth-art-copy">
              <span>DOCUMENT INTELLIGENCE</span>
              <h1>{isSignup ? "Create a workspace built around your documents." : "Turn every file into a clearer decision."}</h1>
              <p>
                Review contracts, reports, invoices and resumes with one connected
                document intelligence workspace.
              </p>
            </div>
            <div className="auth-art-stage">
              <div className="auth-art-line line-a" />
              <div className="auth-art-line line-b" />
              <div className="auth-art-line line-c" />
              <div className="auth-floating auth-float-one"><Sparkles size={16} /></div>
              <div className="auth-floating auth-float-two"><ShieldCheck size={16} /></div>
              <div className="auth-floating auth-float-three"><FileText size={16} /></div>
              <div className="auth-center-card">
                <CheckCircle2 size={32} />
                <strong>{isSignup ? "5 folders" : "Ready"}</strong>
                <span>{isSignup ? "100 document analyses" : "Workspace analysis"}</span>
              </div>
            </div>
          </div>

          <div className="auth-form-panel">
            <div className="auth-form-heading">
              <span>{isSignup ? "GET STARTED" : "WELCOME BACK"}</span>
              <h2>{isSignup ? "Create your workspace" : "Sign in to your workspace"}</h2>
              <p>
                {isSignup
                  ? "Start with 5 folders and 100 document analyses on the Starter plan."
                  : "Continue where you left off with your saved document reviews."}
              </p>
            </div>

            <div className="auth-benefit-grid">
              <div className="auth-benefit">
                <span><Sparkles size={14} /></span>
                <div><strong>AI-powered review</strong><small>Summaries, fields &amp; insights</small></div>
              </div>
              <div className="auth-benefit">
                <span><ShieldCheck size={14} /></span>
                <div><strong>Review risks faster</strong><small>Find important signals</small></div>
              </div>
              <div className="auth-benefit">
                <span><Files size={14} /></span>
                <div><strong>Stay organized</strong><small>Folders &amp; saved analyses</small></div>
              </div>
            </div>

            <div className="auth-mode-switch">
              <button className={isSignup ? "" : "active"} onClick={() => { setError(""); onModeChange?.("signin"); }}>
                Sign in
              </button>
              <button className={isSignup ? "active" : ""} onClick={() => { setError(""); onModeChange?.("signup"); }}>
                Create account
              </button>
            </div>

            <form onSubmit={submit} className="auth-form">
              {isSignup && (
                <label>
                  Full name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </label>
              )}

              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </label>

              <label>
                Password
                <div className="auth-password">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              {!isSignup && (
                <div className="auth-form-row">
                  <label className="auth-checkbox">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="auth-forgot" onClick={() => setError("Password recovery is not connected in this workspace.")}>
                    Forgot password?
                  </button>
                </div>
              )}

              {error && <div className="auth-error"><AlertTriangle size={14} /> {error}</div>}

              <button className="auth-submit" type="submit">
                {isSignup ? "Create free workspace" : "Continue to workspace"}
                <ArrowUpRight size={15} />
              </button>
            </form>

            <div className="auth-demo-note">
              <Sparkles size={14} />
              <span>
                {isSignup
                  ? "Starter includes 5 folders and 100 document analyses. Upgrade when you need more."
                  : "Your workspace usage and plan are kept with your account on this device."}
              </span>
            </div>
          </div>
        </div>

        <footer className="reference-footer auth-footer">
          <span>Private workspace</span>
          <span>Secure review flow</span>
          <span>© 2026 Open Ledger Docs</span>
        </footer>
      </div>
    </div>
  );
}

function CommandPalette({ documents, onClose, onNavigate, onAnalyze, onUpload, onShortcut }) {
  const [query, setQuery] = useState("");
  const commands = [
    { id: "dashboard", label: "Open Dashboard", detail: "Workspace overview", icon: <LayoutDashboard size={17} />, action: () => onNavigate("Dashboard") },
    { id: "analyzer", label: "Open Analyzer", detail: "Upload and analyze", icon: <FileSearch size={17} />, action: onAnalyze },
    { id: "documents", label: "Open Documents", detail: `${documents.length} saved files`, icon: <Files size={17} />, action: () => onNavigate("Documents") },
    { id: "analytics", label: "Open Analytics", detail: "Trends and risk insights", icon: <BarChart3 size={17} />, action: () => onNavigate("Analytics") },
    { id: "presentation", label: "Open Presentation Builder", detail: "Build a presentation", icon: <MonitorPlay size={17} />, action: () => onNavigate("Presentation") },
    { id: "upload", label: "Upload documents", detail: "Start a new analysis", icon: <Upload size={17} />, action: onUpload },
    { id: "shortcuts", label: "Keyboard shortcuts", detail: "See available commands", icon: <BookOpen size={17} />, action: onShortcut },
    { id: "settings", label: "Open Settings", detail: "Workspace preferences", icon: <Settings size={17} />, action: () => onNavigate("Settings") },
  ];
  const filtered = commands.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  const [active, setActive] = useState(0);
  useEffect(() => {
    const handler = (event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); setActive((v) => Math.min(v + 1, Math.max(filtered.length - 1, 0))); }
      if (event.key === "ArrowUp") { event.preventDefault(); setActive((v) => Math.max(v - 1, 0)); }
      if (event.key === "Enter" && filtered[active]) { event.preventDefault(); filtered[active].action(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, active]);

  return <div className="command-backdrop" onMouseDown={onClose}><div className="command-palette" onMouseDown={(e) => e.stopPropagation()}>
    <div className="command-search"><Search size={18} /><input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} placeholder="Search commands..." /><kbd>ESC</kbd></div>
    <div className="command-list">{filtered.length ? filtered.map((item, index) => <button key={item.id} className={`command-item ${index === active ? "active" : ""}`} onMouseEnter={() => setActive(index)} onClick={item.action}><span className="command-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.detail}</small></span><ChevronRight size={14} /></button>) : <div className="command-empty"><Search size={20} /><strong>No commands found</strong><span>Try a different search.</span></div>}</div>
    <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>Enter</kbd> Select</span><span><kbd>Esc</kbd> Close</span></div>
  </div></div>;
}

function NotificationCenter({ documents, onClose, onSelect }) {
  const processing = documents.filter((doc) => doc.status === "Processing");
  const flagged = documents.filter((doc) => doc.risk === "High" || doc.risk === "Medium");
  const failed = documents.filter((doc) => doc.status === "Failed");
  const items = [
    ...failed.slice(0, 3).map((doc) => ({ type: "danger", title: "Analysis failed", text: doc.name, doc })),
    ...processing.slice(0, 3).map((doc) => ({ type: "info", title: "Analysis in progress", text: doc.name, doc })),
    ...flagged.slice(0, 4).map((doc) => ({ type: "warning", title: `${doc.risk} risk requires review`, text: doc.name, doc })),
  ];
  return <div className="notification-panel"><div className="notification-head"><div><span>WORKSPACE</span><h3>Notifications</h3></div><button onClick={onClose} aria-label="Close notifications"><X size={16} /></button></div>{items.length ? <div className="notification-list">{items.map((item, index) => <button key={`${item.doc.id}-${index}`} className="notification-item" onClick={() => onSelect(item.doc)}><span className={`notification-dot ${item.type}`} /><span><strong>{item.title}</strong><small>{item.text}</small></span><ChevronRight size={14} /></button>)}</div> : <div className="notification-empty"><CheckCircle2 size={24} /><strong>You're all caught up</strong><span>No document events need attention.</span></div>}<div className="notification-foot"><span>{documents.length} documents in workspace</span><button onClick={onClose}>Close</button></div></div>;
}

function KeyboardShortcutsModal({ onClose }) {
  const shortcuts = [
    ["⌘ / Ctrl + K", "Open command palette"],
    ["Esc", "Close overlays"],
    ["?", "Open keyboard shortcuts"],
    ["← / →", "Move through presentation slides"],
    ["Enter", "Activate the selected command"],
  ];
  return <div className="shortcut-backdrop" onMouseDown={onClose}><div className="shortcut-modal" onMouseDown={(e) => e.stopPropagation()}><div className="shortcut-head"><div><span>POWER USER</span><h2>Keyboard shortcuts</h2></div><button onClick={onClose}><X size={17} /></button></div><div className="shortcut-list">{shortcuts.map(([key, label]) => <div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}</div><button className="primary-button shortcut-close" onClick={onClose}>Done</button></div></div>;
}

function ToastMessage({ message, tone = "info", onClose }) {
  return <div className={`toast-message ${tone}`} role="status"><span className="toast-icon">{tone === "success" ? <CheckCircle2 size={17} /> : tone === "danger" ? <AlertTriangle size={17} /> : <Sparkles size={17} />}</span><span>{message}</span><button onClick={onClose} aria-label="Dismiss"><X size={14} /></button></div>;
}

function WorkspacePulse({ documents }) {
  const analyzed = documents.filter((doc) => doc.status === "Analyzed").length;
  const processing = documents.filter((doc) => doc.status === "Processing").length;
  const flagged = documents.filter((doc) => doc.risk === "High" || doc.risk === "Medium").length;
  const total = Math.max(documents.length, 1);
  const health = Math.round((analyzed / total) * 100);
  return <section className="workspace-pulse card"><div className="pulse-copy"><span className="card-label">WORKSPACE PULSE</span><h2>Your review pipeline at a glance.</h2><p>{processing ? `${processing} document${processing > 1 ? "s are" : " is"} still being analyzed.` : "Your workspace has no active analysis jobs."}</p></div><div className="pulse-metrics"><div><strong>{health}%</strong><span>completion</span></div><div><strong>{flagged}</strong><span>needs review</span></div><div><strong>{analyzed}</strong><span>completed</span></div></div><div className="pulse-track"><i style={{ width: `${health}%` }} /></div></section>;
}

function QuickActionGrid({ onUpload, onNavigate }) {
  const actions = [
    ["Analyze a file", "Upload a PDF, DOCX or image", <FileUp size={19} />, onUpload],
    ["Review documents", "Browse saved workspace files", <Files size={19} />, () => onNavigate("Documents")],
    ["Open analytics", "Explore risk and document trends", <BarChart3 size={19} />, () => onNavigate("Analytics")],
    ["Build a presentation", "Turn analysis into slides", <MonitorPlay size={19} />, () => onNavigate("Presentation")],
  ];
  return <div className="quick-action-grid">{actions.map(([title, text, icon, action]) => <button key={title} onClick={action}><span>{icon}</span><span><strong>{title}</strong><small>{text}</small></span><ArrowUpRight size={14} /></button>)}</div>;
}

function EmptyWorkspaceGuide({ onUpload, onNavigate }) {
  return <section className="empty-workspace-guide card"><div className="empty-guide-art"><div /><div /><div /><Sparkles size={22} /></div><div><span className="card-label">START HERE</span><h2>Build your first document intelligence workspace.</h2><p>Upload a document, wait for the AI review, then use Analytics or Presentation to turn the result into something you can share.</p><div className="empty-guide-actions"><button className="primary-button" onClick={onUpload}><FileUp size={16} /> Upload document</button><button className="secondary-button" onClick={() => onNavigate("Documents")}><Files size={16} /> View documents</button></div></div></section>;
}

function DocumentHealthPanel({ documents, onSelect }) {
  const scored = documents.filter((doc) => doc.status === "Analyzed");
  const average = scored.length ? Math.round(scored.reduce((sum, doc) => sum + (Number(doc.confidence) || 0), 0) / scored.length) : 0;
  const high = documents.filter((doc) => doc.risk === "High").length;
  const medium = documents.filter((doc) => doc.risk === "Medium").length;
  const low = documents.filter((doc) => doc.risk === "Low").length;
  return <section className="card document-health"><div className="section-card-heading"><div><span className="card-label">DOCUMENT HEALTH</span><h2>Review quality</h2></div><Activity size={18} /></div><div className="health-ring" style={{"--health-value": `${average}%`}}><div><strong>{average || 0}%</strong><span>confidence</span></div></div><div className="health-rows"><button onClick={() => onSelect(documents.find((doc) => doc.risk === "High"))}><span><i className="high" />High risk</span><strong>{high}</strong></button><button onClick={() => onSelect(documents.find((doc) => doc.risk === "Medium"))}><span><i className="medium" />Medium risk</span><strong>{medium}</strong></button><button onClick={() => onSelect(documents.find((doc) => doc.risk === "Low"))}><span><i className="low" />Low risk</span><strong>{low}</strong></button></div></section>;
}

function RecentAnalysisRail({ documents, onSelect, onNavigate }) {
  const recent = documents.slice(0, 5);
  return <section className="card recent-analysis-rail"><div className="section-card-heading"><div><span className="card-label">RECENT ANALYSIS</span><h2>Latest documents</h2></div><button onClick={() => onNavigate("Documents")} className="text-link-button">View all <ArrowUpRight size={14} /></button></div>{recent.length ? <div className="recent-analysis-list">{recent.map((doc) => <button key={doc.id} onClick={() => onSelect(doc)}><span className={`recent-file-icon ${String(doc.type).toLowerCase()}`}><FileText size={16} /></span><span className="recent-file-copy"><strong>{doc.name}</strong><small>{doc.type || "FILE"} · {doc.status}</small></span><span className={`recent-risk ${String(doc.risk).toLowerCase()}`}>{doc.risk || "Pending"}</span><ChevronRight size={14} /></button>)}</div> : <div className="panel-empty"><Files size={22} /><span>No saved analysis yet.</span></div>}</section>;
}

function InsightStrip({ documents, onNavigate }) {
  const highRisk = documents.filter((doc) => doc.risk === "High");
  const processing = documents.filter((doc) => doc.status === "Processing");
  const insight = highRisk.length ? `${highRisk.length} document${highRisk.length > 1 ? "s" : ""} currently carry a high-risk signal.` : processing.length ? `${processing.length} document${processing.length > 1 ? "s are" : " is"} still being analyzed.` : documents.length ? "Your workspace is ready for deeper analytics and presentation." : "Upload a document to start generating workspace insights.";
  return <div className="insight-strip"><span><Sparkles size={15} /></span><div><strong>Workspace insight</strong><p>{insight}</p></div><button onClick={() => onNavigate(highRisk.length ? "Analytics" : "Analyzer")}>{highRisk.length ? "Review risks" : "Analyze a file"}<ArrowUpRight size={14} /></button></div>;
}

/* -------------------------------- */
/* Navigation */
/* -------------------------------- */

function NavItem({ icon, label, active, badge, onClick }) {
  return (
    <button
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon}
      <span>{label}</span>

      {badge !== undefined && (
        <em>{badge}</em>
      )}

      <span className="nav-tooltip">{label}</span>
    </button>
  );
}

/* -------------------------------- */

/* -------------------------------- */
/* Design Studio */
/* -------------------------------- */
const DESIGN_STUDIO_STORAGE_KEY = "open-led-docs.design-studio.v1";

const DESIGN_PRESETS = {
  "Candidate Report": { width: 1200, height: 800, background: "#ffffff" },
  "Contract Summary": { width: 1200, height: 800, background: "#ffffff" },
  "Executive Report": { width: 1200, height: 800, background: "#ffffff" },
  "Risk Report": { width: 1200, height: 800, background: "#f8fafc" },
};

const DESIGN_STUDIO_CSS = `
/* ================================================================
   DESIGN STUDIO — full viewport professional editor
   ================================================================ */
.app:has(.design-studio) .sidebar,
.app:has(.design-studio) .topbar{display:none!important}
.app:has(.design-studio) .main{width:100vw!important;max-width:none!important}
.app:has(.design-studio) .page-content{max-width:none!important;width:100%!important;padding:0!important;margin:0!important}
.app:has(.design-studio){overflow:hidden}

.design-studio{
  position:fixed;inset:0;z-index:200;
  display:flex;flex-direction:column;
  width:100vw;height:100vh;min-height:0;
  background:#eef1f7;color:#172033;
  border:0;border-radius:0;overflow:hidden;
  font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
.design-studio.dark{background:#090d14;color:#f8fafc}

.ds-topbar{
  height:64px;min-height:64px;display:flex;align-items:center;gap:12px;
  padding:0 14px;border-bottom:1px solid #e4e8f0;
  background:rgba(255,255,255,.97);backdrop-filter:blur(18px);
  flex:0 0 auto;z-index:20;
}
.design-studio.dark .ds-topbar{background:rgba(15,20,32,.97);border-color:#252c3b}

.ds-brand{display:flex;align-items:center;gap:9px;min-width:205px}
.ds-brand-mark{width:35px;height:35px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;box-shadow:0 8px 22px rgba(124,58,237,.25)}
.ds-brand-copy strong{display:block;font-size:12px;letter-spacing:-.02em}.ds-brand-copy span{display:block;font-size:9px;color:#8a93a5;margin-top:2px}

.ds-name{flex:1;min-width:180px;display:flex;justify-content:center}
.ds-name input{width:min(360px,100%);border:1px solid transparent;background:transparent;text-align:center;font-weight:800;font-size:13px;color:inherit;outline:none;padding:8px 12px;border-radius:9px}
.ds-name input:hover,.ds-name input:focus{border-color:#ddd6fe;background:#faf8ff}
.design-studio.dark .ds-name input:hover,.design-studio.dark .ds-name input:focus{background:#1a2130;border-color:#5b21b6}

.ds-actions{display:flex;align-items:center;gap:5px;flex-wrap:nowrap}
.ds-tool-btn{height:34px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #e1e6ee;background:#fff;border-radius:9px;color:#475569;font-size:10.5px;font-weight:800;cursor:pointer;white-space:nowrap;transition:.16s ease}
.ds-tool-btn:hover{border-color:#c4b5fd;color:#6d28d9;background:#faf8ff;transform:translateY(-1px)}
.ds-tool-btn.primary{background:#7c3aed;border-color:#7c3aed;color:#fff;box-shadow:0 7px 18px rgba(124,58,237,.18)}
.ds-tool-btn:disabled{opacity:.38;cursor:not-allowed;transform:none}
.design-studio.dark .ds-tool-btn{background:#171e2b;border-color:#30394b;color:#cbd5e1}
.design-studio.dark .ds-tool-btn:hover{background:#222b3b;color:#ddd6fe;border-color:#7c3aed}
.ds-status{font-size:9px;color:#8b95a7;margin:0 4px 0 2px;white-space:nowrap}

.ds-body{display:grid;grid-template-columns:224px minmax(0,1fr) 286px;min-height:0;flex:1}
.ds-sidebar,.ds-inspector{background:#fff;overflow:auto;scrollbar-width:thin}
.design-studio.dark .ds-sidebar,.design-studio.dark .ds-inspector{background:#111722}
.ds-sidebar{border-right:1px solid #e3e7ef;padding:12px}
.design-studio.dark .ds-sidebar{border-color:#252c3b}

.ds-section-label{font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#98a1b2;padding:8px 7px 6px}
.ds-element-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.ds-element{min-height:66px;border:1px solid #e5e9f0;background:#fff;border-radius:11px;padding:9px 8px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:5px;text-align:left;color:#334155;cursor:pointer;transition:.16s ease}
.ds-element:hover{border-color:#c4b5fd;background:#faf8ff;transform:translateY(-2px);box-shadow:0 8px 20px rgba(76,29,149,.08)}
.ds-element svg{color:#7c3aed}.ds-element strong{font-size:10px}
.design-studio.dark .ds-element{background:#181f2d;border-color:#30394b;color:#dbe4f0}
.ds-template{width:100%;padding:10px;border:1px solid #e5e9f0;border-radius:11px;background:#fff;margin-bottom:7px;cursor:pointer;text-align:left;transition:.16s ease}
.ds-template:hover{border-color:#c4b5fd;transform:translateX(2px)}
.design-studio.dark .ds-template{background:#181f2d;border-color:#30394b}
.ds-template strong{display:block;font-size:10.5px}.ds-template span{display:block;color:#8b95a7;font-size:9px;margin-top:3px}
.ds-divider{height:1px;background:#edf0f5;margin:13px 0}.design-studio.dark .ds-divider{background:#252c3b}

.ds-canvas-area{
  position:relative;overflow:auto;min-width:0;
  background:
    linear-gradient(rgba(148,163,184,.10) 1px,transparent 1px),
    linear-gradient(90deg,rgba(148,163,184,.10) 1px,transparent 1px),
    #edf0f5;
  background-size:24px 24px;
  padding:40px;display:flex;align-items:flex-start;justify-content:center;
  overscroll-behavior:contain;
}
.design-studio.dark .ds-canvas-area{
  background:
    linear-gradient(rgba(148,163,184,.055) 1px,transparent 1px),
    linear-gradient(90deg,rgba(148,163,184,.055) 1px,transparent 1px),
    #080d15;
  background-size:24px 24px;
}
.ds-canvas-shell{
  position:relative;flex:0 0 auto;background:#fff;
  box-shadow:0 28px 80px rgba(15,23,42,.22),0 3px 12px rgba(15,23,42,.10);
  transition:box-shadow .2s ease;
}
.ds-canvas-shell:hover{box-shadow:0 32px 90px rgba(15,23,42,.25),0 4px 14px rgba(15,23,42,.12)}
.ds-canvas-shell canvas{display:block}.ds-empty{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;color:#94a3b8;font-size:12px}

.ds-canvas-tools{
  position:sticky;bottom:18px;left:18px;margin-top:auto;margin-left:-2px;
  display:flex;align-items:center;gap:4px;padding:6px;
  background:rgba(255,255,255,.94);border:1px solid #dfe4ec;border-radius:12px;
  box-shadow:0 12px 30px rgba(15,23,42,.12);backdrop-filter:blur(12px);z-index:8;
}
.design-studio.dark .ds-canvas-tools{background:rgba(22,29,42,.95);border-color:#30394b}
.ds-zoom{border:0;background:transparent;padding:6px 8px;border-radius:7px;cursor:pointer;color:#475569;font-size:11px;font-weight:850}
.ds-zoom:hover{background:#f1f5f9}.design-studio.dark .ds-zoom{color:#cbd5e1}.design-studio.dark .ds-zoom:hover{background:#252d3d}

.ds-inspector{border-left:1px solid #e3e7ef;padding:14px}.design-studio.dark .ds-inspector{border-color:#252c3b}
.ds-inspector h3{font-size:12px;margin:3px 0 13px}
.ds-field{margin-bottom:12px}.ds-field label{display:block;font-size:9px;font-weight:850;color:#8b95a7;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}
.ds-field input,.ds-field select,.ds-field textarea{box-sizing:border-box;width:100%;min-height:34px;border:1px solid #e1e6ee;border-radius:8px;padding:7px 9px;font-size:11px;background:#fff;color:#1e293b;outline:none}
.ds-field input[type="range"]{padding:0}.ds-field input:focus,.ds-field select:focus,.ds-field textarea:focus{border-color:#a78bfa;box-shadow:0 0 0 3px rgba(124,58,237,.08)}
.design-studio.dark .ds-field input,.design-studio.dark .ds-field select,.design-studio.dark .ds-field textarea{background:#181f2d;border-color:#30394b;color:#f8fafc}
.ds-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ds-color{height:34px!important;width:100%;padding:3px!important;border:1px solid #e1e6ee;border-radius:8px;background:#fff}
.ds-help{font-size:10px;line-height:1.55;color:#8b95a7}.ds-binding{border:1px solid #e5e7eb;background:#f8fafc;padding:9px;border-radius:9px;font-size:10px;line-height:1.55}
.design-studio.dark .ds-binding{background:#111827;border-color:#30394b}
.ds-layer-list{margin-top:12px}.ds-layer{display:flex;align-items:center;gap:7px;width:100%;padding:8px;border:1px solid transparent;border-radius:8px;font-size:10px;cursor:pointer;background:transparent;text-align:left;color:inherit}
.ds-layer:hover{background:#f8fafc}.ds-layer.active{background:#f5f3ff;border-color:#ddd6fe;color:#6d28d9}
.design-studio.dark .ds-layer:hover{background:#1b2230}.design-studio.dark .ds-layer.active{background:#241c3c;border-color:#5b21b6;color:#ddd6fe}
.ds-mobile-note{display:none}

@media(max-width:1180px){
  .ds-body{grid-template-columns:204px minmax(0,1fr) 270px}
  .ds-actions .ds-tool-btn{padding:0 8px}
  .ds-brand{min-width:175px}
}
@media(max-width:900px){
  .ds-body{grid-template-columns:190px minmax(0,1fr)}
  .ds-inspector{position:absolute;right:0;top:64px;bottom:0;width:280px;z-index:30;box-shadow:-14px 0 35px rgba(15,23,42,.16)}
}
@media(max-width:760px){
  .design-studio{position:fixed;inset:0}
  .ds-topbar{height:auto;min-height:62px;flex-wrap:wrap;padding:8px}
  .ds-brand{min-width:auto}.ds-name{order:3;width:100%;flex-basis:100%}.ds-name input{width:100%}
  .ds-body{display:flex;flex-direction:column}
  .ds-sidebar{border-right:0;border-bottom:1px solid #e7eaf1;max-height:235px}
  .ds-inspector{position:static;width:auto;max-height:390px;border-left:0;border-top:1px solid #e7eaf1}
  .ds-canvas-area{min-height:calc(100vh - 310px);padding:24px}
  .ds-actions .ds-tool-btn span{display:none}
  .ds-status{display:none}.ds-mobile-note{display:block;padding:8px 10px;background:#fff4db;color:#8a5a00;font-size:10px}
  .design-studio.dark .ds-mobile-note{background:#3a2b0b;color:#f4cf75}
}
@media(prefers-reduced-motion:reduce){.ds-tool-btn,.ds-element,.ds-template{transition:none!important}}
`;


function DesignStudio({
  documents = [],
  darkMode = false,
  onBack,
  onToast,
}) {
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const canvasRef = useRef(null);
  const saveTimerRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const suppressHistoryRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [fabricError, setFabricError] = useState("");
  const [designName, setDesignName] = useState("Untitled Design");
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(0.72);
  const [activePanel, setActivePanel] = useState("Elements");
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const snapToGridRef = useRef(true);
  const [saveStatus, setSaveStatus] = useState("Never saved");
  const [selectedDocumentId, setSelectedDocumentId] = useState(
    documents.find((doc) => doc.status === "Analyzed")?.id || documents[0]?.id || ""
  );
  const [canvasSettings, setCanvasSettings] = useState({
    width: 1200,
    height: 800,
    background: "#ffffff",
  });

  const selectedDocument = documents.find((doc) => doc.id === selectedDocumentId);
  const documentData = selectedDocument?.analysis || selectedDocument?.structuredData || selectedDocument?.extractedData || selectedDocument || {};

  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  const getObjectName = (obj) =>
    obj?.objectName ||
    obj?.elementType ||
    obj?.text?.slice?.(0, 28) ||
    obj?.type ||
    "Element";

  const snapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas || suppressHistoryRef.current) return;
    const json = canvas.toJSON(["objectId", "objectName", "elementType", "binding", "locked", "hidden", "chartConfig"]);
    const encoded = JSON.stringify(json);
    const history = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (history[history.length - 1] === encoded) return;
    history.push(encoded);
    historyRef.current = history.slice(-80);
    historyIndexRef.current = historyRef.current.length - 1;
    scheduleSave();
  };

  const scheduleSave = () => {
    window.clearTimeout(saveTimerRef.current);
    setSaveStatus("Saving…");
    saveTimerRef.current = window.setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const payload = {
          version: 1,
          name: designName,
          canvas: canvas.toJSON(["objectId", "objectName", "elementType", "binding", "locked", "hidden", "chartConfig"]),
          settings: canvasSettings,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(DESIGN_STUDIO_STORAGE_KEY, JSON.stringify(payload));
        setSaveStatus("Saved");
      } catch (error) {
        setSaveStatus("Save failed");
        onToast?.("Unable to save the design locally. Your current canvas remains open.", "danger");
      }
    }, 900);
  };

  const selectObject = (obj) => {
    setSelectedId(obj?.objectId || null);
  };

  const makeId = () => `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const applyZoom = (next) => {
    const value = Math.max(0.35, Math.min(1.6, Number(next) || 1));
    setZoom(value);
    canvasRef.current?.setZoom(value);
    canvasRef.current?.requestRenderAll();
  };

  const resolveBinding = (binding) => {
    if (!binding) return "";
    const path = String(binding).replace(/^\{\{|\}\}$/g, "").trim();
    const parts = path.split(".");
    let value = documentData;
    for (const part of parts) {
      if (value == null) break;
      value = value[part];
    }
    if (Array.isArray(value)) return value.join(", ");
    if (value == null || value === "") return "—";
    return String(value);
  };

  const addText = (text = "Double-click to edit", options = {}) => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const id = makeId();
    const textbox = new fabric.Textbox(text, {
      left: options.left ?? 80,
      top: options.top ?? 70,
      width: options.width ?? 360,
      fontSize: options.fontSize ?? 26,
      fontFamily: "Inter, Arial, sans-serif",
      fontWeight: options.fontWeight ?? 600,
      fill: options.fill ?? "#172033",
      editable: true,
      objectId: id,
      objectName: options.objectName || "Text",
      elementType: options.elementType || "text",
      binding: options.binding || "",
      lineHeight: 1.15,
      padding: 4,
    });
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.requestRenderAll();
    snapshot();
  };

  const addShape = (kind = "rect") => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const id = makeId();
    let object;
    if (kind === "circle") {
      object = new fabric.Circle({
        left: 120, top: 160, radius: 60, fill: "#ede9fe", stroke: "#7c3aed", strokeWidth: 2,
      });
    } else {
      object = new fabric.Rect({
        left: 120, top: 160, width: 280, height: 120, rx: kind === "rounded" ? 18 : 4, ry: kind === "rounded" ? 18 : 4,
        fill: "#f5f3ff", stroke: "#7c3aed", strokeWidth: 2,
      });
    }
    object.set({ objectId: id, objectName: kind === "circle" ? "Circle" : kind === "rounded" ? "Rounded Rectangle" : "Rectangle", elementType: "shape" });
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    snapshot();
  };

  const addMetric = () => {
    addText("Score\n92%", { left: 80, top: 160, width: 220, fontSize: 28, objectName: "Score Metric", elementType: "metric" });
  };

  const addChart = () => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const id = makeId();
    const bars = [48, 90, 65, 118, 82];
    const groupItems = [];
    groupItems.push(new fabric.Textbox("Document Risk", { left: 0, top: 0, width: 260, fontSize: 18, fontWeight: 700, fill: "#172033" }));
    bars.forEach((height, index) => {
      groupItems.push(new fabric.Rect({ left: index * 48, top: 150 - height, width: 26, height, fill: index === 3 ? "#7c3aed" : "#c4b5fd", rx: 5, ry: 5 }));
      groupItems.push(new fabric.Textbox(String(index + 1), { left: index * 48 + 7, top: 158, width: 18, fontSize: 9, fill: "#64748b", textAlign: "center" }));
    });
    const group = new fabric.Group(groupItems, { left: 520, top: 110, objectId: id, objectName: "Risk Chart", elementType: "chart", chartConfig: { type: "bar", labels: ["1","2","3","4","5"], values: bars } });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    snapshot();
  };

  const addTable = () => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const id = makeId();
    const rows = [
      ["Name", "Role", "Score"],
      ["Candidate", "AI Engineer", "92%"],
      ["Candidate", "Frontend", "87%"],
    ];
    const items = [];
    const colW = [170, 190, 100];
    rows.forEach((row, r) => {
      let x = 0;
      row.forEach((cell, c) => {
        items.push(new fabric.Rect({ left: x, top: r * 42, width: colW[c], height: 42, fill: r === 0 ? "#7c3aed" : "#ffffff", stroke: "#dbe2ea", strokeWidth: 1 }));
        items.push(new fabric.Textbox(cell, { left: x + 8, top: r * 42 + 13, width: colW[c] - 16, fontSize: 11, fontWeight: r === 0 ? 700 : 500, fill: r === 0 ? "#ffffff" : "#334155" }));
        x += colW[c];
      });
    });
    const group = new fabric.Group(items, { left: 80, top: 330, objectId: id, objectName: "Candidate Table", elementType: "table", tableData: rows });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    snapshot();
  };

  const addImage = (file) => {
    if (!file || !file.type?.startsWith("image/")) {
      onToast?.("Please choose a PNG, JPG, JPEG, or WEBP image.", "danger");
      return;
    }
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const image = await fabric.FabricImage.fromURL(reader.result);
        image.set({
          left: 100,
          top: 100,
          scaleX: Math.min(1, 500 / image.width),
          scaleY: Math.min(1, 500 / image.height),
          objectId: makeId(),
          objectName: file.name,
          elementType: "image",
        });
        canvas.add(image);
        canvas.setActiveObject(image);
        canvas.requestRenderAll();
        snapshot();
      } catch (error) {
        onToast?.("The image could not be added to the canvas.", "danger");
      }
    };
    reader.readAsDataURL(file);
  };

  const undo = async () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const json = historyRef.current[historyIndexRef.current];
    await loadSerialized(json);
  };

  const redo = async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const json = historyRef.current[historyIndexRef.current];
    await loadSerialized(json);
  };

  const loadSerialized = async (jsonString) => {
    const canvas = canvasRef.current;
    if (!canvas || !jsonString) return;
    suppressHistoryRef.current = true;
    try {
      const parsed = JSON.parse(jsonString);
      await canvas.loadFromJSON(parsed);
      canvas.requestRenderAll();
      setSelectedId(null);
    } catch (error) {
      onToast?.("This design state could not be restored.", "danger");
    } finally {
      suppressHistoryRef.current = false;
    }
  };

  const loadTemplate = (name) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preset = DESIGN_PRESETS[name] || DESIGN_PRESETS["Candidate Report"];
    setDesignName(name);
    setCanvasSettings(preset);
    canvas.clear();
    canvas.backgroundColor = preset.background;
    if (name === "Candidate Report") {
      addText("Candidate Overview", { left: 70, top: 55, width: 600, fontSize: 36, fontWeight: 750, objectName: "Candidate Title" });
      addText("{{candidate.name}}", { left: 70, top: 125, width: 420, fontSize: 24, objectName: "Candidate Name", binding: "candidate.name", fill: "#7c3aed" });
      addMetric();
      addChart();
      addTable();
    } else if (name === "Contract Summary") {
      addText("Contract Summary", { left: 70, top: 55, width: 600, fontSize: 36, fontWeight: 750, objectName: "Contract Title" });
      addText("Key terms, amounts and identified risks", { left: 70, top: 115, width: 600, fontSize: 16, fontWeight: 400, fill: "#64748b", objectName: "Subtitle" });
      addMetric();
      addText("Risk Level\n{{risk}}", { left: 360, top: 160, width: 240, fontSize: 24, objectName: "Risk Level", binding: "risk" });
      addTable();
    } else {
      addText(name, { left: 70, top: 55, width: 700, fontSize: 36, fontWeight: 750, objectName: "Report Title" });
      addText("Open Ledger Docs · Structured document intelligence", { left: 70, top: 115, width: 700, fontSize: 15, fontWeight: 400, fill: "#64748b", objectName: "Subtitle" });
      addChart();
      addMetric();
    }
    window.setTimeout(snapshot, 30);
  };

  const updateSelected = (patch) => {
    const canvas = canvasRef.current;
    const object = canvas?.getActiveObject();
    if (!object) return;
    object.set(patch);
    canvas.requestRenderAll();
    snapshot();
  };

  const duplicateSelected = async () => {
    const canvas = canvasRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || !object) return;
    try {
      const copy = await Promise.resolve(object.clone());
      copy.set({
        left: (object.left || 0) + 24,
        top: (object.top || 0) + 24,
        objectId: makeId(),
        objectName: `${getObjectName(object)} copy`,
      });
      canvas.add(copy);
      canvas.setActiveObject(copy);
      canvas.requestRenderAll();
      snapshot();
    } catch {
      onToast?.("This object could not be duplicated.", "danger");
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      onToast?.("Browser fullscreen is not available here.", "info");
    }
  };

  const selectedObject = () => canvasRef.current?.getActiveObject() || null;

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    canvas.discardActiveObject();
    canvas.renderAll();
    try {
      const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
      const link = document.createElement("a");
      link.download = `open-ledger-design-${designName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      onToast?.("PNG exported successfully.", "success");
    } catch (error) {
      onToast?.("PNG export failed. Please try again.", "danger");
    } finally {
      if (active) canvas.setActiveObject(active);
      canvas.renderAll();
    }
  };

  useEffect(() => {
    let cancelled = false;
    let instance = null;
    const init = async () => {
      try {
        const module = await import("fabric");
        if (cancelled) return;
        const fabric = module.fabric || module.default || module;
        fabricRef.current = fabric;
        const canvas = new fabric.Canvas(canvasElRef.current, {
          width: canvasSettings.width,
          height: canvasSettings.height,
          backgroundColor: canvasSettings.background,
          preserveObjectStacking: true,
          selection: true,
        });
        instance = canvas;
        canvasRef.current = canvas;
        canvas.on("selection:created", (event) => selectObject(event.selected?.[0]));
        canvas.on("selection:updated", (event) => selectObject(event.selected?.[0]));
        canvas.on("selection:cleared", () => setSelectedId(null));
        canvas.on("object:modified", () => {
          const active = canvas.getActiveObject();
          if (active && snapToGridRef.current) {
            const grid = 12;
            active.set({
              left: Math.round((active.left || 0) / grid) * grid,
              top: Math.round((active.top || 0) / grid) * grid,
            });
            canvas.requestRenderAll();
          }
          snapshot();
        });
        canvas.on("object:added", () => setReady(true));
        setReady(true);

        const savedRaw = localStorage.getItem(DESIGN_STUDIO_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (saved?.canvas) {
            setDesignName(saved.name || "Untitled Design");
            if (saved.settings) setCanvasSettings(saved.settings);
            suppressHistoryRef.current = true;
            await canvas.loadFromJSON(saved.canvas);
            canvas.backgroundColor = saved.settings?.background || "#ffffff";
            canvas.requestRenderAll();
            suppressHistoryRef.current = false;
            const initial = JSON.stringify(canvas.toJSON(["objectId", "objectName", "elementType", "binding", "locked", "hidden", "chartConfig"]));
            historyRef.current = [initial];
            historyIndexRef.current = 0;
            setSaveStatus("Saved");
          } else {
            snapshot();
          }
        } else {
          snapshot();
        }
      } catch (error) {
        setFabricError(error?.message || "Fabric.js could not be loaded.");
      }
    };
    init();
    return () => {
      cancelled = true;
      window.clearTimeout(saveTimerRef.current);
      instance?.dispose?.();
      canvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width: canvasSettings.width, height: canvasSettings.height });
    canvas.backgroundColor = canvasSettings.background;
    canvas.setZoom(zoom);
    canvas.requestRenderAll();
  }, [canvasSettings, zoom]);

  useEffect(() => {
    const handler = (event) => {
      const target = event.target;
      const typing = target?.matches?.("input, textarea, select");
      if (!typing && (event.key === "Delete" || event.key === "Backspace")) {
        const canvas = canvasRef.current;
        const active = canvas?.getActiveObject();
        if (canvas && active) {
          event.preventDefault();
          canvas.remove(active);
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          snapshot();
        }
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        scheduleSave();
      } else if (event.key.toLowerCase() === "d") {
        const object = selectedObject();
        if (object && canvasRef.current) {
          const clone = object.clone();
          Promise.resolve(clone).then((copy) => {
            copy.set({ left: object.left + 24, top: object.top + 24, objectId: makeId(), objectName: `${getObjectName(object)} copy` });
            canvasRef.current.add(copy);
            canvasRef.current.setActiveObject(copy);
            canvasRef.current.requestRenderAll();
            snapshot();
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const object = selectedObject();

  return (
    <>
      <style>{DESIGN_STUDIO_CSS}</style>
      <section className={`design-studio ${darkMode ? "dark" : ""}`}>
        <div className="ds-topbar">
          <div className="ds-brand">
            <div className="ds-brand-mark"><Layers size={17} /></div>
            <div className="ds-brand-copy"><strong>Open Ledger Docs</strong><span>Design Studio</span></div>
          </div>
          <div className="ds-name">
            <input value={designName} onChange={(e) => { setDesignName(e.target.value); scheduleSave(); }} aria-label="Design name" />
          </div>
          <div className="ds-actions">
            <span className="ds-status">{saveStatus}</span>
            <button className="ds-tool-btn" onClick={undo} disabled={historyIndexRef.current <= 0} title="Undo (Ctrl/Cmd+Z)">Undo</button>
            <button className="ds-tool-btn" onClick={redo} disabled={historyIndexRef.current >= historyRef.current.length - 1} title="Redo (Ctrl/Cmd+Shift+Z)">Redo</button>
            <button className="ds-tool-btn" onClick={duplicateSelected} title="Duplicate selected object (Ctrl/Cmd+D)">Duplicate</button>
            <button className="ds-tool-btn" onClick={() => setShowGrid((value) => !value)} title="Toggle canvas grid">
              {showGrid ? "Hide Grid" : "Grid"}
            </button>
            <button className="ds-tool-btn" onClick={() => setSnapToGrid((value) => !value)} title="Toggle snap to grid">
              Snap {snapToGrid ? "On" : "Off"}
            </button>
            <button className="ds-tool-btn" onClick={scheduleSave}>Save</button>
            <button className="ds-tool-btn" onClick={() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              canvas.discardActiveObject(); canvas.renderAll();
              onToast?.("Preview mode is active in the canvas. Use browser fullscreen for presentation.", "info");
            }}>Preview</button>
            <button className="ds-tool-btn" onClick={toggleFullscreen} title="Browser fullscreen">
              <MonitorPlay size={13} /><span>Fullscreen</span>
            </button>
            <button className="ds-tool-btn primary" onClick={exportPNG}><Download size={13} /> <span>Export PNG</span></button>
            <button className="ds-tool-btn" onClick={onBack}><ArrowLeft size={13} /> <span>Exit</span></button>
          </div>
        </div>

        {!ready && !fabricError && <div className="ds-mobile-note">Loading the Design Studio canvas…</div>}
        {fabricError && <div className="ds-mobile-note">Design Studio could not load its canvas engine. Run <strong>npm i fabric</strong>, then restart Vite.</div>}

        <div className="ds-body">
          <aside className="ds-sidebar">
            <div className="ds-section-label">Templates</div>
            {Object.keys(DESIGN_PRESETS).map((name) => (
              <button key={name} className="ds-template" onClick={() => loadTemplate(name)}>
                <strong>{name}</strong><span>Editable report layout</span>
              </button>
            ))}

            <div className="ds-divider" />
            <div className="ds-section-label">Elements</div>
            <div className="ds-element-grid">
              <button className="ds-element" onClick={() => addText("Heading", { fontSize: 30, objectName: "Heading" })}><FileText size={16} /><strong>Text</strong></button>
              <button className="ds-element" onClick={() => addMetric()}><BarChart3 size={16} /><strong>Metric</strong></button>
              <button className="ds-element" onClick={() => addShape("rect")}><Layers size={16} /><strong>Rectangle</strong></button>
              <button className="ds-element" onClick={() => addShape("circle")}><Activity size={16} /><strong>Circle</strong></button>
              <button className="ds-element" onClick={() => addChart()}><BarChart3 size={16} /><strong>Chart</strong></button>
              <button className="ds-element" onClick={() => addTable()}><Files size={16} /><strong>Table</strong></button>
              <label className="ds-element"><Upload size={16} /><strong>Image</strong><input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }} /></label>
            </div>

            <div className="ds-divider" />
            <div className="ds-section-label">Data Source</div>
            <div className="ds-field">
              <label>Document</label>
              <select value={selectedDocumentId} onChange={(e) => setSelectedDocumentId(e.target.value)}>
                <option value="">No document</option>
                {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}</option>)}
              </select>
            </div>
            <p className="ds-help">Dynamic text can use bindings such as <strong>{"{{candidate.name}}"}</strong>. Missing values render as an em dash.</p>
          </aside>

          <main
            className="ds-canvas-area"
            style={{
              backgroundSize: showGrid ? "24px 24px" : "auto",
              backgroundImage: showGrid
                ? undefined
                : "none",
            }}
          >
            <div className="ds-canvas-shell" style={{ width: canvasSettings.width * zoom, height: canvasSettings.height * zoom }}>
              <canvas ref={canvasElRef} />
              {!ready && <div className="ds-empty">Initializing editor…</div>}
            </div>
            <div className="ds-canvas-tools">
              <button className="ds-zoom" onClick={() => applyZoom(zoom - 0.1)}>-</button>
              <span className="ds-status">{Math.round(zoom * 100)}%</span>
              <button className="ds-zoom" onClick={() => applyZoom(zoom + 0.1)}>+</button>
              <button className="ds-zoom" onClick={() => applyZoom(0.72)}>Fit</button>
              <button className="ds-zoom" onClick={() => applyZoom(1)}>100%</button>
            </div>
          </main>

          <aside className="ds-inspector">
            <h3>{object ? "Selected object" : "Document settings"}</h3>

            {!object ? (
              <>
                <div className="ds-field"><label>Design name</label><input value={designName} onChange={(e) => setDesignName(e.target.value)} /></div>
                <div className="ds-two">
                  <div className="ds-field"><label>Width</label><input type="number" value={canvasSettings.width} onChange={(e) => setCanvasSettings((v) => ({ ...v, width: Math.max(320, Number(e.target.value) || 1200) }))} /></div>
                  <div className="ds-field"><label>Height</label><input type="number" value={canvasSettings.height} onChange={(e) => setCanvasSettings((v) => ({ ...v, height: Math.max(240, Number(e.target.value) || 800) }))} /></div>
                </div>
                <div className="ds-field"><label>Background</label><input className="ds-color" type="color" value={canvasSettings.background} onChange={(e) => setCanvasSettings((v) => ({ ...v, background: e.target.value }))} /></div>
                <div className="ds-divider" />
                <div className="ds-section-label">Layers</div>
                <div className="ds-layer-list">
                  {(canvasRef.current?.getObjects?.() || []).slice().reverse().map((item) => (
                    <button key={item.objectId || item.__uid || Math.random()} className={`ds-layer ${selectedId === item.objectId ? "active" : ""}`} onClick={() => { canvasRef.current.setActiveObject(item); canvasRef.current.requestRenderAll(); selectObject(item); }}>
                      <Layers size={12} /> <span>{getObjectName(item)}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="ds-field"><label>Name</label><input value={getObjectName(object)} onChange={(e) => { object.set({ objectName: e.target.value }); canvasRef.current.requestRenderAll(); snapshot(); }} /></div>
                {(object.type === "textbox" || object.type === "i-text" || object.type === "text") && (
                  <>
                    <div className="ds-field"><label>Text</label><textarea style={{width:"100%",minHeight:76,border:"1px solid #e1e6ee",borderRadius:8,padding:8,fontSize:11}} value={object.text || ""} onChange={(e) => updateSelected({ text: e.target.value })} /></div>
                    <div className="ds-two">
                      <div className="ds-field"><label>Size</label><input type="number" value={object.fontSize || 16} onChange={(e) => updateSelected({ fontSize: Math.max(8, Number(e.target.value) || 16) })} /></div>
                      <div className="ds-field"><label>Weight</label><select value={object.fontWeight || 400} onChange={(e) => updateSelected({ fontWeight: Number(e.target.value) })}><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option></select></div>
                    </div>
                    <div className="ds-field"><label>Color</label><input className="ds-color" type="color" value={typeof object.fill === "string" && object.fill.startsWith("#") ? object.fill : "#172033"} onChange={(e) => updateSelected({ fill: e.target.value })} /></div>
                    {object.binding && <div className="ds-binding"><strong>Dynamic binding</strong><br />{object.binding}<br /><span>Preview: {resolveBinding(object.binding)}</span></div>}
                  </>
                )}
                <div className="ds-two">
                  <div className="ds-field"><label>X</label><input type="number" value={Math.round(object.left || 0)} onChange={(e) => updateSelected({ left: Number(e.target.value) || 0 })} /></div>
                  <div className="ds-field"><label>Y</label><input type="number" value={Math.round(object.top || 0)} onChange={(e) => updateSelected({ top: Number(e.target.value) || 0 })} /></div>
                </div>
                <div className="ds-two">
                  <div className="ds-field"><label>Width</label><input type="number" value={Math.round((object.getScaledWidth?.() || object.width || 1))} onChange={(e) => { object.set({ scaleX: Math.max(.05, Number(e.target.value) / (object.width || 1)) }); canvasRef.current.requestRenderAll(); snapshot(); }} /></div>
                  <div className="ds-field"><label>Height</label><input type="number" value={Math.round((object.getScaledHeight?.() || object.height || 1))} onChange={(e) => { object.set({ scaleY: Math.max(.05, Number(e.target.value) / (object.height || 1)) }); canvasRef.current.requestRenderAll(); snapshot(); }} /></div>
                </div>
                <div className="ds-field"><label>Opacity</label><input type="range" min="0" max="1" step=".05" value={object.opacity ?? 1} onChange={(e) => updateSelected({ opacity: Number(e.target.value) })} /></div>
                <div className="ds-divider" />
                <div className="ds-two">
                  <button className="ds-tool-btn" onClick={() => { canvasRef.current.bringObjectForward(object); snapshot(); }}>Bring forward</button>
                  <button className="ds-tool-btn" onClick={() => { canvasRef.current.sendObjectBackwards(object); snapshot(); }}>Send backward</button>
                </div>
                <button className="ds-tool-btn" style={{width:"100%",marginTop:8}} onClick={() => { canvasRef.current.remove(object); canvasRef.current.discardActiveObject(); canvasRef.current.requestRenderAll(); snapshot(); }}>Delete object</button>
              </>
            )}
          </aside>
        </div>
      </section>
    </>
  );
}

/* Dashboard */
/* -------------------------------- */

function Dashboard({
  documents,
  folders = [],
  onUpload,
  onNavigate,
  onSelect,
  dashboardConfig,
  onDashboardConfig,
  onExport,
  onExportWorkspace,
}) {
  const analyzedDocs = documents.filter((doc) => doc.status === "Analyzed");
  const processingDocs = documents.filter((doc) => doc.status === "Processing");
  const reviewDocs = documents.filter(
    (doc) => doc.risk === "Medium" || doc.risk === "High"
  );
  const avgConfidence = analyzedDocs.length
    ? Math.round(
        analyzedDocs.reduce((sum, doc) => sum + (Number(doc.confidence) || 0), 0) /
          analyzedDocs.length
      )
    : 0;

  const lowRisk = documents.filter((doc) => doc.risk === "Low").length;
  const mediumRisk = documents.filter((doc) => doc.risk === "Medium").length;
  const highRisk = documents.filter((doc) => doc.risk === "High").length;
  const riskTotal = Math.max(lowRisk + mediumRisk + highRisk, 1);

  const categories = documents.reduce((acc, doc) => {
    const key = doc.category || (doc.type ? `${doc.type} Documents` : "Other");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const categoryRows = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const activity = [
    Math.max(2, Math.min(10, documents.length + 1)),
    Math.max(3, Math.min(10, analyzedDocs.length + 3)),
    Math.max(2, Math.min(10, documents.length + 2)),
    Math.max(4, Math.min(10, analyzedDocs.length + 4)),
    Math.max(3, Math.min(10, documents.length + 3)),
    Math.max(5, Math.min(10, analyzedDocs.length + 5)),
    Math.max(4, Math.min(10, documents.length + 4)),
  ];
  const activityLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Convert the 7-day activity values into SVG coordinates for the dashboard chart.
  // Y=142 is the baseline and each activity unit moves the point up by 11px.
  const chartPoints = activity
    .map((value, index) => `${28 + index * 54},${142 - Math.min(10, Math.max(0, value)) * 11}`)
    .join(" ");
  const makeDashboard = () => {
    onDashboardConfig({
      title: "Document Intelligence Dashboard",
      subtitle: "A ready-made executive view of your document workspace.",
      layout: "comfortable",
      showKpis: true,
      showRisk: true,
      showActivity: true,
      showCategories: true,
      showAttention: true,
      showInsights: true,
      showRecent: true,
    });
  };

  const updateDashboard = (key, value) => onDashboardConfig({ ...(dashboardConfig || {}), [key]: value });

  return (
    <div className="analytics-dashboard">
      <section className="dash-heading">
        <div>
          <div className="eyebrow">
            <LayoutDashboard size={14} />
            Workspace overview
          </div>
          <h1>Dashboard</h1>
          <p>Monitor document analysis, review activity and important findings at a glance.</p>
        </div>
        <div className="dash-heading-actions">
          <button className="dash-period-button">
            <Clock3 size={15} />
            Last 7 days
            <ChevronRight size={14} />
          </button>
          <button className="secondary-button" onClick={onExport}>
            <Download size={16} />
            Export CSV
          </button>
          <button className="secondary-button" onClick={onExportWorkspace}>
            <Download size={16} />
            Backup JSON
          </button>
          <button className="secondary-button" onClick={makeDashboard}>
            <LayoutDashboard size={16} />
            Make Dashboard
          </button>
          <button className="primary-button" onClick={onUpload}>
            <Plus size={17} />
            Analyze document
          </button>
        </div>
      </section>

      <WorkspacePulse documents={documents} />
      <QuickActionGrid onUpload={onUpload} onNavigate={onNavigate} />
      <InsightStrip documents={documents} onNavigate={onNavigate} />

      {dashboardConfig && (
        <section className="made-dashboard card">
          <div className="made-dashboard-head">
            <div>
              <span className="card-label">READY-MADE DASHBOARD</span>
              <h2>{dashboardConfig.title}</h2>
              <p>{dashboardConfig.subtitle}</p>
            </div>
            <div className="made-dashboard-actions">
              <button className="secondary-button" onClick={() => onDashboardConfig(null)}>Reset</button>
              <button className="primary-button" onClick={() => onNavigate("Analytics")}><BarChart3 size={15} /> Open Full Dashboard</button>
            </div>
          </div>
          <div className="dashboard-editor">
            <div className="dashboard-editor-title"><Pencil size={15} /> Edit dashboard</div>
            <div className="dashboard-edit-grid">
              <label>Dashboard title<input value={dashboardConfig.title} onChange={(e) => updateDashboard("title", e.target.value)} /></label>
              <label>Subtitle<input value={dashboardConfig.subtitle} onChange={(e) => updateDashboard("subtitle", e.target.value)} /></label>
              <label>Layout<select value={dashboardConfig.layout} onChange={(e) => updateDashboard("layout", e.target.value)}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label>
            </div>
            <div className="dashboard-widget-toggles">
              {[['showKpis','KPI cards'],['showRisk','Risk overview'],['showActivity','Activity'],['showCategories','Document categories'],['showAttention','Needs attention'],['showInsights','AI insights'],['showRecent','Recent documents']].map(([key,label]) => (
                <button type="button" key={key} className={`widget-toggle ${dashboardConfig[key] ? "active" : ""}`} onClick={() => updateDashboard(key, !dashboardConfig[key])}>
                  {dashboardConfig[key] ? <Check size={14} /> : <Plus size={14} />} {label}
                </button>
              ))}
            </div>
          </div>
          <div className={`made-dashboard-preview ${dashboardConfig.layout}`}>
            {dashboardConfig.showKpis && <div className="preview-widget preview-wide"><strong>{analyzedDocs.length}</strong><span>Documents analyzed</span></div>}
            {dashboardConfig.showRisk && <div className="preview-widget"><strong>{reviewDocs.length}</strong><span>Needs review</span></div>}
            {dashboardConfig.showActivity && <div className="preview-widget preview-wide"><strong>{avgConfidence || 0}%</strong><span>Average confidence</span></div>}
            {dashboardConfig.showCategories && <div className="preview-widget"><strong>{categoryRows.length}</strong><span>Document categories</span></div>}
            {dashboardConfig.showAttention && <div className="preview-widget preview-wide"><strong>{highRisk + mediumRisk}</strong><span>Risk items requiring attention</span></div>}
            {dashboardConfig.showInsights && <div className="preview-widget"><strong>AI</strong><span>Insights ready</span></div>}
            {dashboardConfig.showRecent && <div className="preview-widget preview-wide"><strong>{documents.length}</strong><span>Workspace documents</span></div>}
          </div>
        </section>
      )}

      <section className="dash-stats-grid">
        <article className="dash-stat-card">
          <div className="dash-stat-icon purple"><FileCheck2 size={19} /></div>
          <div className="dash-stat-copy">
            <span>Documents analyzed</span>
            <strong>{analyzedDocs.length}</strong>
            <small className="dash-positive"><ArrowUpRight size={12} /> Workspace total</small>
          </div>
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-icon gold"><Sparkles size={19} /></div>
          <div className="dash-stat-copy">
            <span>Average confidence</span>
            <strong>{avgConfidence || 0}%</strong>
            <small>Across completed reviews</small>
          </div>
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-icon red"><AlertTriangle size={19} /></div>
          <div className="dash-stat-copy">
            <span>Needs review</span>
            <strong>{reviewDocs.length}</strong>
            <small className={reviewDocs.length ? "dash-warning" : ""}>
              {reviewDocs.length ? "Medium or high risk" : "No flagged documents"}
            </small>
          </div>
        </article>

        <article className="dash-stat-card">
          <div className="dash-stat-icon blue"><Activity size={19} /></div>
          <div className="dash-stat-copy">
            <span>Processing now</span>
            <strong>{processingDocs.length}</strong>
            <small>{processingDocs.length ? "Analysis in progress" : "All caught up"}</small>
          </div>
        </article>
      </section>

      <section className="dashboard-support-grid">
        <DocumentHealthPanel
          documents={documents}
          onSelect={(doc) => { if (doc) onSelect(doc); }}
        />
        <RecentAnalysisRail
          documents={documents}
          onSelect={(doc) => { if (doc) onSelect(doc); }}
          onNavigate={onNavigate}
        />
      </section>

      <section className="dashboard-secondary-grid">
        <FolderHealth documents={documents} folders={folders} onNavigate={onNavigate} />
        <WorkspaceChecklist documents={documents} folders={folders} onNavigate={onNavigate} onUpload={onUpload} />
      </section>

      <section className="dashboard-secondary-grid">
        <ActivityTimeline documents={documents} />
        <ComparisonLauncher documents={documents} onSelect={(doc) => onSelect(doc)} />
      </section>

      <section className="dash-main-grid">
        <article className="card dash-chart-card open-led-activity-card">
          <div className="open-led-chart-top">
            <div className="open-led-chart-title">
              <div className="open-led-chart-icon"><Activity size={17} /></div>
              <div>
                <span className="card-label">ANALYSIS ACTIVITY</span>
                <h2>Documents processed</h2>
                <p>Document review activity across the last 7 days.</p>
              </div>
            </div>
            <button className="open-led-chart-period" type="button">
              <Clock3 size={13} />
              Last 7 days
              <ChevronDown size={13} />
            </button>
          </div>

          <div className="open-led-chart-metrics">
            <div className="open-led-primary-metric">
              <span>Total processed</span>
              <strong>{documents.length.toLocaleString()}</strong>
              <small><span className="open-led-live-dot" /> Workspace activity</small>
            </div>
            <div className="open-led-mini-metric">
              <span>Analyzed</span>
              <strong>{analyzedDocs.length.toLocaleString()}</strong>
            </div>
            <div className="open-led-mini-metric">
              <span>In progress</span>
              <strong>{processingDocs.length.toLocaleString()}</strong>
            </div>
          </div>

          <div className="open-led-chart-shell">
            <div className="open-led-chart-axis">
              <span>10</span><span>8</span><span>6</span><span>4</span><span>2</span><span>0</span>
            </div>
            <div className="open-led-chart-body">
              <svg className="open-led-line-chart" viewBox="0 0 700 220" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="openLedChartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(124,58,237,0.24)" />
                    <stop offset="100%" stopColor="rgba(124,58,237,0)" />
                  </linearGradient>
                  <filter id="openLedChartGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {[28, 66, 104, 142, 180, 218].map((y) => (
                  <line key={y} x1="8" y1={y} x2="692" y2={y} className="open-led-grid-line" />
                ))}
                <polyline className="open-led-chart-area" points={`20,218 ${activity.map((value, index) => `${20 + index * 112},${218 - value * 19}`).join(" ")} 692,218`} />
                <polyline className="open-led-chart-line" points={activity.map((value, index) => `${20 + index * 112},${218 - value * 19}`).join(" ")} />
                {activity.map((value, index) => {
                  const x = 20 + index * 112;
                  const y = 218 - value * 19;
                  return (
                    <g key={index} className="open-led-chart-point-group">
                      <circle className="open-led-chart-point-halo" cx={x} cy={y} r="9" />
                      <circle className="open-led-chart-point" cx={x} cy={y} r="4.5" />
                    </g>
                  );
                })}
              </svg>
              <div className="open-led-chart-labels">
                {activityLabels.map((label) => <span key={label}>{label}</span>)}
              </div>
            </div>
          </div>

          <div className="open-led-chart-footer">
            <span><i className="open-led-footer-dot" /> Documents processed</span>
            <span>Live workspace data</span>
          </div>
        </article>

        <article className="card dash-risk-card">
          <div className="dash-card-heading">
            <div>
              <span className="card-label">Risk overview</span>
              <h2>Review distribution</h2>
            </div>
            <ShieldCheck size={18} />
          </div>

          <div className="risk-donut-wrap">
            <div
              className="risk-donut"
              style={{
                background: `conic-gradient(var(--success) 0 ${lowRisk / riskTotal * 100}%, var(--warn) ${lowRisk / riskTotal * 100}% ${(lowRisk + mediumRisk) / riskTotal * 100}%, var(--danger) ${(lowRisk + mediumRisk) / riskTotal * 100}% 100%)`,
              }}
            >
              <div className="risk-donut-center">
                <strong>{documents.length}</strong>
                <span>Total</span>
              </div>
            </div>
            <div className="risk-legend">
              <div><span className="risk-dot low" /><span>Low</span><strong>{lowRisk}</strong></div>
              <div><span className="risk-dot medium" /><span>Medium</span><strong>{mediumRisk}</strong></div>
              <div><span className="risk-dot high" /><span>High</span><strong>{highRisk}</strong></div>
            </div>
          </div>

          <div className="risk-callout">
            <ShieldCheck size={15} />
            <div>
              <strong>{reviewDocs.length ? `${reviewDocs.length} document${reviewDocs.length > 1 ? "s" : ""} need review` : "No documents need review"}</strong>
              <span>Use the Documents page to inspect findings.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="dash-bottom-grid">
        <article className="card dash-recent-card">
          <div className="dash-card-heading">
            <div>
              <span className="card-label">Recent activity</span>
              <h2>Recent document reviews</h2>
            </div>
            <button className="text-button" onClick={() => onNavigate("Documents")}>View all <ArrowUpRight size={14} /></button>
          </div>
          <DocumentTable documents={documents.slice(0, 5)} onSelect={onSelect} />
        </article>

        <article className="card dash-category-card">
          <div className="dash-card-heading">
            <div>
              <span className="card-label">Document mix</span>
              <h2>Top categories</h2>
            </div>
            <Layers size={18} />
          </div>
          <div className="category-bars">
            {categoryRows.length ? categoryRows.map(([label, count]) => (
              <div className="category-row" key={label}>
                <div className="category-row-top"><span>{label}</span><strong>{count}</strong></div>
                <div className="category-progress"><div style={{ width: `${Math.max(10, (count / Math.max(categoryRows[0][1], 1)) * 100)}%` }} /></div>
              </div>
            )) : (
              <div className="dash-empty-note"><Files size={20} /> Upload documents to see category insights.</div>
            )}
          </div>
          <button className="dash-category-link" onClick={() => onNavigate("Analytics")}>
            Open detailed analytics <ArrowUpRight size={14} />
          </button>
        </article>
      </section>

      <section className="dash-insight-strip">
        <div><Sparkles size={17} /><span><strong>AI insight</strong> {documents.length ? "Your workspace is actively processing and organizing document intelligence." : "Upload a document to start building your workspace insights."}</span></div>
        <button onClick={onUpload}>Start a new analysis <ArrowUpRight size={14} /></button>
      </section>
    </div>
  );
}

/* -------------------------------- */
/* Analyzer */
/* -------------------------------- */

function Analyzer({
  dragging,
  setDragging,
  onFiles,
  fileInputRef,
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const selectFiles = (files) => {
    setSelectedFiles(Array.from(files));
  };

  return (
    <>
      <div className="page-heading">

        <div>
          <div className="eyebrow">
            <FileSearch size={14} />
            AI analyzer
          </div>

          <h1>Analyze a document</h1>

          <p>
            Upload a document and extract structured insights.
          </p>
        </div>

      </div>

      <section
        className={`large-upload ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          selectFiles(e.dataTransfer.files);
        }}
      >

        <div className="large-upload-icon">
          <FileUp size={30} />
        </div>

        <h2>
          Drop your document here
        </h2>

        <p>
          or select a file from your computer
        </p>

        <button
          className="primary-button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={17} />
          Select Documents
        </button>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept=".pdf,.docx,.png,.jpg,.jpeg"
          onChange={(e) => selectFiles(e.target.files)}
        />

        <div className="upload-info">
          <span>PDF</span>
          <span>DOCX</span>
          <span>PNG</span>
          <span>JPG</span>
          <span>Maximum 25 MB</span>
        </div>

      </section>

      {selectedFiles.length > 0 && (
        <section className="card selected-files">

          <div className="card-title-row">
            <div>
              <span className="card-label">
                Ready for analysis
              </span>
              <h2>{selectedFiles.length} document(s)</h2>
            </div>

            <button
              className="primary-button"
              onClick={() => onFiles(selectedFiles)}
            >
              <Sparkles size={17} />
              Analyze with AI
            </button>
          </div>

          {selectedFiles.map((file) => (
            <div className="selected-file" key={file.name}>
              <FileText size={18} />
              <span>{file.name}</span>
              <small>{formatFileSize(file.size)}</small>
            </div>
          ))}

        </section>
      )}

      <div className="feature-grid">

        <FeatureCard
          icon={<FileSearch size={20} />}
          title="Smart Extraction"
          text="Extract names, dates, amounts, clauses and key terms."
        />

        <FeatureCard
          icon={<ShieldCheck size={20} />}
          title="Risk Detection"
          text="Identify potentially risky clauses and important issues."
        />

        <FeatureCard
          icon={<BarChart3 size={20} />}
          title="Structured Reports"
          text="Turn unstructured documents into clean reports."
        />

      </div>
    </>
  );
}

/* -------------------------------- */
/* Analysis result / review page */
/* -------------------------------- */

function AnalyzePage({ document, onBack, onDocuments, onSelect, documents, folders, onPresentation, currentPlan, onUpgrade, onOpenExcelBuilder }) {
  const analyzedDocuments = documents.filter((doc) => doc.status === "Analyzed");
  const current = document || analyzedDocuments[0] || documents[0];

  if (!current) {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <Sparkles size={14} />
              AI analysis
            </div>
            <h1>Your analysis workspace</h1>
            <p>Upload a document to generate a saved AI review, extracted fields and risk findings.</p>
          </div>
          <button className="primary-button" onClick={onBack}>
            <FileUp size={17} />
            Analyze a document
          </button>
        </div>

        <section className="card analysis-empty">
          <div className="analysis-empty-icon">
            <Sparkles size={28} />
          </div>
          <h2>No analysis yet</h2>
          <p>Your document review will appear here automatically after you upload a file.</p>
          <button className="primary-button" onClick={onBack}>
            Start analysis
            <ArrowUpRight size={16} />
          </button>
        </section>
      </>
    );
  }

  const isProcessing = current.status === "Processing";
  const isFailed = current.status === "Failed";
  const findings = current.findings || [];
  const entities = current.entities || [];
  const tags = current.tags || [];

  const reviewText = isProcessing
    ? "AI is reviewing the document. The saved result will update automatically when processing finishes."
    : isFailed
      ? "The analyzer could not complete this review. Check the connection and retry from the document details."
      : current.summary || "The AI analyzer did not return a summary for this document.";

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Sparkles size={14} />
            AI analysis
          </div>
          <h1>Analysis review</h1>
          <p>Everything extracted from your document is saved here in one clear review.</p>
        </div>

        <div className="page-heading-actions">
          <button className="secondary-button" onClick={onDocuments}>
            <Files size={16} />
            Saved documents
          </button>
          <button className="secondary-button" onClick={() => onPresentation({ type: "document", documentId: current.id })}>
            <MonitorPlay size={16} />
            Present this PDF
          </button>
          <button className="primary-button" onClick={onBack}>
            <Plus size={17} />
            New analysis
          </button>
        </div>
      </div>

      <section className="analysis-hero card">
        <div className="analysis-file">
          <div className="large-file-icon">
            <FileText size={24} />
          </div>
          <div>
            <span className="card-label">Document analyzed</span>
            <h2>{current.name}</h2>
            <p>
              {current.type} · {current.size} · {current.date}
            </p>
          </div>
        </div>

        <div className="analysis-status">
          <StatusBadge status={current.status} />
          <RiskBadge risk={current.risk} />
        </div>
      </section>

      <div className="analysis-journey-grid">
        <section className="card journey-card"><div className="section-card-heading"><div><span className="card-label">ANALYSIS JOURNEY</span><h2>Review progress</h2></div><Activity size={18} /></div><AnalysisStatusJourney document={current} /></section>
        <ReviewScoreCard document={current} />
      </div>

      {isProcessing && (
        <div className="analysis-banner processing">
          <Clock3 size={18} />
          <div>
            <strong>AI analysis in progress</strong>
            <p>{current.summary}</p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="analysis-banner failed">
          <AlertTriangle size={18} />
          <div>
            <strong>Analysis needs attention</strong>
            <p>{current.summary}</p>
          </div>
        </div>
      )}

      <div className="analysis-overview-grid">
        <section className="card analysis-review-card">
          <div className="card-title-row">
            <div>
              <span className="card-label">AI review</span>
              <h2>Quick review</h2>
            </div>
            <Sparkles size={19} />
          </div>

          <p className="review-copy">{reviewText}</p>

          <div className="review-meta">
            <div>
              <span>Document type</span>
              <strong>{current.category || "General document"}</strong>
            </div>
            <div>
              <span>Confidence</span>
              <strong>{current.confidence != null ? `${current.confidence}%` : "—"}</strong>
            </div>
            <div>
              <span>Language</span>
              <strong>{current.language || "—"}</strong>
            </div>
            <div>
              <span>Risk level</span>
              <strong>{current.risk || "Pending"}</strong>
            </div>
          </div>
        </section>

        <SmartSummarizationCard document={current} />

        <section className="card analysis-stats-card">
          <span className="card-label">Document snapshot</span>
          <div className="analysis-big-number">
            {current.confidence != null ? `${current.confidence}%` : "—"}
          </div>
          <p>AI confidence</p>

          <div className="snapshot-row">
            <span>Pages</span>
            <strong>{current.pages ?? "—"}</strong>
          </div>
          <div className="snapshot-row">
            <span>Words</span>
            <strong>
              {current.wordCount != null ? current.wordCount.toLocaleString() : "—"}
            </strong>
          </div>
          <div className="snapshot-row">
            <span>Uploaded by</span>
            <strong>{current.uploadedBy || "—"}</strong>
          </div>
        </section>
      </div>

      <div className="analysis-content-grid">
        <section className="card">
          <div className="card-title-row">
            <div>
              <span className="card-label">Extracted information</span>
              <h2>Key fields</h2>
            </div>
            <Layers size={19} />
          </div>

          {entities.length > 0 ? (
            <div className="entity-list">
              {entities.map((entity) => (
                <div className="entity-row" key={`${entity.label}-${entity.value}`}>
                  <span>{entity.label}</span>
                  <strong>{entity.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-note">
              No structured fields have been extracted yet.
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-title-row">
            <div>
              <span className="card-label">Risk review</span>
              <h2>Findings</h2>
            </div>
            <ShieldCheck size={19} />
          </div>

          {findings.length > 0 ? (
            <div className="finding-list">
              {findings.map((finding, index) => (
                <div className={`finding-row ${finding.level.toLowerCase()}`} key={index}>
                  {finding.level === "High" ? (
                    <AlertTriangle size={15} />
                  ) : (
                    <ShieldCheck size={15} />
                  )}
                  <span>{finding.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-note">
              {isProcessing ? "Risk findings will appear when analysis completes." : "No risk findings recorded."}
            </div>
          )}
        </section>
      </div>

      <section className="card analysis-bottom-card">
        <div>
          <span className="card-label">Saved review</span>
          <h2>{current.categoryDescription || "AI-generated document intelligence"}</h2>
          <p>
            {tags.length > 0
              ? `Tags: ${tags.join(" · ")}`
              : "Your extracted document information is available in this review."}
          </p>
        </div>

        <div className="page-heading-actions">
          <button
            className="secondary-button"
            onClick={() => onOpenExcelBuilder?.(current)}
            disabled={isProcessing || current.status !== "Analyzed"}
          >
            <Download size={16} />
            Export Excel
          </button>
          <button className="secondary-button" onClick={() => onPresentation({ type: "document", documentId: current.id })}>
            <MonitorPlay size={16} />
            Make presentation
          </button>
          <button className="primary-button" onClick={onDocuments}>
            View saved documents
            <ArrowUpRight size={16} />
          </button>
        </div>
      </section>

      <ChatWithDocument document={current} />
    </>
  );
}

/* -------------------------------- */
/* Smart summarization */
/* -------------------------------- */
function SmartSummarizationCard({ document }) {
  const [showSummary, setShowSummary] = useState(false);

  const generateSummary = () => {
    setShowSummary(true);
    if (!document) return;
    window.dispatchEvent(
      new CustomEvent("docusense-smart-summary", {
        detail: { documentId: document.id },
      })
    );
  };

  return (
    <section className="card smart-summary-card">
      <div className="smart-summary-head">
        <div className="smart-summary-icon">
          <Sparkles size={19} />
        </div>
        <div className="smart-summary-copy">
          <div className="smart-summary-title-row">
            <h2>Smart Summarization</h2>
            <span className="premium-badge smart-summary-free-badge">
              <CheckCircle2 size={12} /> Free
            </span>
          </div>
          <p>
            Turn the full document review into a concise, decision-ready summary with the most important insights highlighted.
          </p>
        </div>
        <button
          type="button"
          className="smart-summary-action"
          onClick={generateSummary}
          title="Generate smart summary"
        >
          <Sparkles size={15} />
          Generate Summary
        </button>
      </div>

      <div className="smart-summary-preview">
        <div className="smart-summary-preview-label">
          <Sparkles size={13} />
          {showSummary ? "Smart summary" : "Free smart summary"}
        </div>
        {showSummary ? (
          <p className="smart-summary-result">
            {document?.summary || "No summary is available yet. Complete the document analysis first."}
          </p>
        ) : (
          <div className="smart-summary-blur-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------------------- */
/* Presentation builder */
/* -------------------------------- */
function PresentationBuilder({ documents, folders, config, onConfig, onBack }) {
  const [scopeType, setScopeType] = useState(config?.type || "document");
  const [documentId, setDocumentId] = useState(config?.documentId || documents[0]?.id || "");
  const [folderId, setFolderId] = useState(config?.folderId || folders[0]?.id || "");
  const [title, setTitle] = useState(config?.title || "Document Intelligence Presentation");
  const [theme, setTheme] = useState(config?.theme || "executive");
  const [includeRisks, setIncludeRisks] = useState(config?.includeRisks ?? true);
  const [includeFindings, setIncludeFindings] = useState(config?.includeFindings ?? true);
  const [includeFields, setIncludeFields] = useState(config?.includeFields ?? true);
  const [includeRecommendations, setIncludeRecommendations] = useState(config?.includeRecommendations ?? true);
  const [started, setStarted] = useState(false);

  const sourceDocs = useMemo(() => {
    if (scopeType === "document") return documents.filter(d => String(d.id) === String(documentId));
    if (scopeType === "folder") return documents.filter(d => d.folderId === folderId);
    return documents;
  }, [documents, scopeType, documentId, folderId]);

  const analyzed = sourceDocs.filter(d => d.status === "Analyzed");
  const current = sourceDocs.find(d => d.id === documentId) || sourceDocs[0];
  const stats = useMemo(() => ({
    total: sourceDocs.length,
    analyzed: analyzed.length,
    high: sourceDocs.filter(d => ["High","Critical"].includes(d.risk)).length,
    medium: sourceDocs.filter(d => d.risk === "Medium").length,
    low: sourceDocs.filter(d => d.risk === "Low").length,
    findings: sourceDocs.flatMap(d => d.findings || []).slice(0, 8),
    fields: sourceDocs.flatMap(d => d.entities || []).slice(0, 10),
  }), [sourceDocs, analyzed.length]);

  const saveAndStart = () => {
    const next = { type: scopeType, documentId, folderId, title, theme, includeRisks, includeFindings, includeFields, includeRecommendations };
    onConfig(next);
    setStarted(true);
  };

  if (started) {
    const slides = [
      { title, subtitle: scopeType === "document" ? (current?.name || "Selected document") : scopeType === "folder" ? (folders.find(f => f.id === folderId)?.name || "Selected folder") : "Entire workspace", body: <div className="presentation-kpi-large"><strong>{stats.total}</strong><span>documents included</span></div> },
      { title: "Executive Overview", subtitle: "Analysis coverage for this presentation", body: <div className="presentation-kpi-grid">{[["Documents",stats.total],["Analyzed",stats.analyzed],["High risk",stats.high],["Medium risk",stats.medium],["Low risk",stats.low]].map(([l,v])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div> },
      ...(includeRisks ? [{ title: "Risk Overview", subtitle: "Recorded risk levels in the selected scope", body: <div className="presentation-findings"><div>High / Critical: <strong>{stats.high}</strong></div><div>Medium: <strong>{stats.medium}</strong></div><div>Low: <strong>{stats.low}</strong></div></div> }] : []),
      ...(includeFindings ? [{ title: "Key Findings", subtitle: "Findings recorded by the analyzer", body: <div className="presentation-findings">{stats.findings.length ? stats.findings.map((f,i)=><div key={i}><Sparkles size={17}/><span><strong>{f.level || "Finding"}:</strong> {f.text}</span></div>) : <div>No findings recorded.</div>}</div> }] : []),
      ...(includeFields ? [{ title: "Extracted Information", subtitle: "Structured fields from the selected documents", body: <div className="presentation-findings">{stats.fields.length ? stats.fields.map((f,i)=><div key={i}><Layers size={17}/><span><strong>{f.label}:</strong> {f.value}</span></div>) : <div>No structured fields recorded.</div>}</div> }] : []),
      ...(includeRecommendations ? [{ title: "Recommendations", subtitle: "Review actions based only on the recorded data", body: <div className="presentation-findings">{stats.high || stats.medium ? <><div><ArrowUpRight size={17}/><span>Review documents with recorded medium or high risk.</span></div><div><ArrowUpRight size={17}/><span>Open the document analysis pages for detailed findings.</span></div></> : <div><CheckCircle2 size={17}/><span>No medium or high-risk items are recorded in this scope.</span></div>}</div> }] : []),
    ];
    return <PresentationViewer slides={slides} title={title} onExit={() => setStarted(false)} />;
  }

  return <section className="presentation-builder-page">
    <div className="page-heading"><div><div className="eyebrow"><MonitorPlay size={14}/> Presentation Studio</div><h1>Build a presentation from your analysis</h1><p>Present one analyzed PDF, an entire folder, or the whole workspace. Everything is generated from the documents already in the app.</p></div><button className="secondary-button" onClick={onBack}><ArrowLeft size={16}/> Back to analysis</button></div>
    <div className="presentation-builder-grid">
      <section className="card presentation-builder-card">
        <div className="card-title-row"><div><span className="card-label">1 · SOURCE</span><h2>Choose what to present</h2></div><Files size={19}/></div>
        <div className="scope-tabs">{[["document","One PDF / document"],["folder","Whole folder"],["workspace","Whole workspace"]].map(([v,l])=><button key={v} className={scopeType===v?"active":""} onClick={()=>setScopeType(v)}>{l}</button>)}</div>
        {scopeType === "document" && <label className="builder-field">Document<select value={documentId} onChange={e=>setDocumentId(e.target.value)}>{documents.map(d=><option key={d.id} value={d.id}>{d.name} · {d.status}</option>)}</select></label>}
        {scopeType === "folder" && <label className="builder-field">Folder<select value={folderId} onChange={e=>setFolderId(e.target.value)}>{folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
        <div className="presentation-source-summary"><strong>{sourceDocs.length}</strong><span>documents selected · {analyzed.length} analyzed</span></div>
      </section>
      <section className="card presentation-builder-card">
        <div className="card-title-row"><div><span className="card-label">2 · DESIGN</span><h2>Customize presentation</h2></div><Pencil size={19}/></div>
        <label className="builder-field">Presentation title<input value={title} onChange={e=>setTitle(e.target.value)} /></label>
        <label className="builder-field">Style<select value={theme} onChange={e=>setTheme(e.target.value)}><option value="executive">Executive</option><option value="minimal">Minimal</option><option value="detailed">Detailed</option></select></label>
        <div className="presentation-checks">{[[includeRisks,setIncludeRisks,"Risk overview"],[includeFindings,setIncludeFindings,"Key findings"],[includeFields,setIncludeFields,"Extracted fields"],[includeRecommendations,setIncludeRecommendations,"Recommendations"]].map(([v,setter,label])=><button key={label} onClick={()=>setter(!v)} className={`widget-toggle ${v?"active":""}`}>{v?<Check size={14}/>:<Plus size={14}/>} {label}</button>)}</div>
        <button className="primary-button builder-start" onClick={saveAndStart}><MonitorPlay size={17}/> Create Presentation</button>
      </section>
    </div>
    <section className="card presentation-builder-card"><div className="card-title-row"><div><span className="card-label">LIVE PREVIEW</span><h2>{title}</h2><p>{scopeType === "document" ? current?.name : scopeType === "folder" ? folders.find(f=>f.id===folderId)?.name : "Entire workspace"}</p></div><Sparkles size={19}/></div><div className="presentation-preview-strip"><div><strong>{stats.total}</strong><span>documents</span></div><div><strong>{stats.analyzed}</strong><span>analyzed</span></div><div><strong>{stats.high}</strong><span>high risk</span></div><div><strong>{stats.findings.length}</strong><span>findings</span></div></div></section>
  </section>;
}

function ComingSoonPage({ icon, eyebrow, title, description, features, onBack }) {
  return (
    <section className="coming-soon-page">
      <div className="coming-soon-orb coming-soon-orb-one" />
      <div className="coming-soon-orb coming-soon-orb-two" />
      <div className="coming-soon-card">
        <div className="coming-soon-icon">{icon}</div>
        <span className="coming-soon-badge">COMING SOON</span>
        <span className="coming-soon-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="coming-soon-features">
          {features.map((feature) => (
            <div key={feature} className="coming-soon-feature">
              <CheckCircle2 size={17} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
        <button className="primary-button" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    </section>
  );
}

function PresentationViewer({ slides, title, onExit }) {
  const [index, setIndex] = useState(0);
  useEffect(() => { const handler = e => { if (e.key === "ArrowRight") setIndex(v=>Math.min(slides.length-1,v+1)); if (e.key === "ArrowLeft") setIndex(v=>Math.max(0,v-1)); if (e.key === "Escape") onExit(); }; window.addEventListener("keydown",handler); return ()=>window.removeEventListener("keydown",handler); }, [slides.length,onExit]);
  const slide = slides[index];
  return <div className="presentation-shell"><div className="presentation-top"><strong>Open Ledger Docs · {title}</strong><span>{index+1} / {slides.length}</span><button onClick={onExit}><X size={17}/> Exit</button></div><main className="presentation-slide"><span className="presentation-kicker">DOCUMENT INTELLIGENCE PRESENTATION</span><h1>{slide.title}</h1><p>{slide.subtitle}</p><div className="presentation-content">{slide.body}</div></main><div className="presentation-controls"><button disabled={!index} onClick={()=>setIndex(v=>v-1)}>← Previous</button><div>{slides.map((_,i)=><button key={i} className={i===index?"active":""} onClick={()=>setIndex(i)} aria-label={`Slide ${i+1}`}/>)}</div><button disabled={index===slides.length-1} onClick={()=>setIndex(v=>v+1)}>Next →</button></div></div>;
}

/* -------------------------------- */
/* AI document chat */
/* -------------------------------- */

function ChatWithDocument({ document, embedded }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);

  const documentId = document?.documentId ?? document?.id ?? null;

  useEffect(() => {
    setChatMessages([]);
    setChatInput("");
    setChatLoading(false);
    setChatError("");
    setExpandedSources({});
  }, [documentId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatMessages, chatLoading]);

  const sendChatMessage = async (questionOverride) => {
    const question = String(questionOverride ?? chatInput).trim();

    if (!document) {
      setChatError("Please upload and analyze a document first.");
      return;
    }

    if (!question) {
      setChatError("Please enter a question.");
      return;
    }

    if (!documentId) {
      setChatError("Please upload and analyze a document first.");
      return;
    }

    if (chatLoading) return;

    setChatError("");
    setChatMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: question,
      },
    ]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: getApiHeaders(true),
        body: JSON.stringify({
          document_id: documentId,
          question,
        }),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const detail =
          payload?.detail ??
          payload?.message ??
          payload?.error ??
          `Backend returned ${response.status} ${response.statusText}`;

        throw new Error(detail);
      }

      const data = payload?.data ?? payload?.result ?? payload ?? {};
      const answer =
        data.answer ??
        data.response ??
        data.message ??
        "The backend did not return an answer.";

      const sources = Array.isArray(data.sources) ? data.sources : [];

      setChatMessages((current) => [
        ...current,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: String(answer),
          sources,
        },
      ]);
    } catch (error) {
      console.error("Document chat failed:", error);

      setChatError("Couldn't reach the Open Ledger Docs backend. Make sure your FastAPI service is running.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage();
    }
  };

  const clearChat = () => {
    if (chatLoading) return;
    setChatMessages([]);
    setChatInput("");
    setChatError("");
    setExpandedSources({});
  };

  const copyAnswer = async (answer) => {
    try {
      await navigator.clipboard.writeText(answer);
    } catch (error) {
      console.error("Could not copy AI response:", error);
    }
  };

  const suggestedQuestions = [
    "Summarize this document",
    "What are the key risks?",
    "What are the important dates?",
    "Who are the parties?",
    "What are my obligations?",
    "Explain the most important finding in simple words",
  ];

  const hasMessages = chatMessages.length > 0;

  return (
    <section
      className={`card document-chat-card ${embedded ? "document-chat-embedded" : ""}`}
      aria-label="Chat with Document"
    >
      {(!embedded || hasMessages) && (
        <div className="document-chat-header">
          {!embedded && (
            <div className="document-chat-title">
              <div className="document-chat-icon">
                <MessageCircle size={18} />
              </div>
              <div>
                <span className="card-label">Chat with Document</span>
                <h2>Ask Open Ledger Docs</h2>
                <p>Ask follow-up questions and get answers grounded in this document.</p>
              </div>
            </div>
          )}

          {hasMessages && (
            <button
              className="secondary-button document-chat-clear"
              onClick={clearChat}
              disabled={chatLoading}
              type="button"
            >
              <Trash2 size={15} />
              Clear chat
            </button>
          )}
        </div>
      )}

      {!hasMessages && (
        <div className="document-chat-suggestions">
          <span>Suggested questions</span>
          <div>
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                className="document-chat-suggestion"
                onClick={() => sendChatMessage(question)}
                disabled={chatLoading}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="document-chat-messages" role="log" aria-live="polite">
        {chatMessages.map((message) => (
          <div
            className={`document-chat-message-row ${message.role === "user" ? "user" : "assistant"}`}
            key={message.id}
          >
            <div className={`document-chat-message ${message.role === "user" ? "user" : "assistant"}`}>
              <div className="document-chat-message-label">
                {message.role === "user" ? "You" : "Open Ledger Docs"}
              </div>
              <div className="document-chat-message-text">{message.content}</div>

              {message.role === "assistant" && (
                <>
                  <div className="document-chat-message-actions">
                    <button
                      type="button"
                      className="document-chat-action"
                      onClick={() => copyAnswer(message.content)}
                      title="Copy AI response"
                    >
                      <Copy size={13} />
                      Copy
                    </button>
                  </div>

                  {message.sources?.length > 0 && (
                    <div className="document-chat-sources">
                      <div className="document-chat-sources-heading">
                        <BookOpen size={14} />
                        <span>Sources</span>
                      </div>

                      {message.sources.map((source, index) => {
                        const sourceKey = `${message.id}-${index}`;
                        const sourceText = source?.text ?? "";
                        const isExpanded = Boolean(expandedSources[sourceKey]);

                        return (
                          <div className="document-chat-source" key={sourceKey}>
                            <div className="document-chat-source-top">
                              <div>
                                <strong>
                                  Page {source?.page ?? "—"}
                                  {source?.section ? ` · ${source.section}` : ""}
                                </strong>
                              </div>
                              {sourceText && (
                                <button
                                  type="button"
                                  className="document-chat-source-button"
                                  onClick={() =>
                                    setExpandedSources((current) => ({
                                      ...current,
                                      [sourceKey]: !current[sourceKey],
                                    }))
                                  }
                                >
                                  {isExpanded ? "Hide source" : "View source"}
                                </button>
                              )}
                            </div>

                            {sourceText && (
                              <p className={isExpanded ? "is-expanded" : ""}>
                                “{sourceText}”
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {chatLoading && (
          <div className="document-chat-message-row assistant">
            <div className="document-chat-message assistant">
              <div className="document-chat-message-label">Open Ledger Docs</div>
              <div className="document-chat-thinking">
                <span className="document-chat-thinking-dot" />
                <span>Open Ledger Docs is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {chatError && (
        <div className="document-chat-error" role="alert">
          <AlertTriangle size={15} />
          <span>{chatError}</span>
        </div>
      )}

      <div className="document-chat-input-wrap">
        <textarea
          value={chatInput}
          onChange={(event) => {
            setChatInput(event.target.value);
            if (chatError) setChatError("");
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Ask anything about this document..."
          rows={2}
          disabled={chatLoading}
          aria-label="Ask anything about this document"
        />
        <button
          type="button"
          className="primary-button document-chat-send"
          onClick={() => sendChatMessage()}
          disabled={chatLoading}
          title="Send message"
        >
          <Send size={16} />
          Send
        </button>
      </div>

      <p className="document-chat-hint">
        Enter to send · Shift + Enter for a new line
      </p>
    </section>
  );
}

/* Documents */
/* -------------------------------- */

function Documents({
  documents,
  allDocuments,
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onUpload,
  onDelete,
  onMoveDocument,
  onSelect,
  onOpenExcelBuilder,
}) {
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderActionsId, setFolderActionsId] = useState(null);

  const activeFolder = folders.find((folder) => folder.id === selectedFolderId);

  const submitFolder = () => {
    const createdId = onCreateFolder?.(newFolderName);
    if (createdId) {
      setNewFolderName("");
      setShowNewFolder(false);
    }
  };

  return (
    <>
      <div className="page-heading">

        <div>
          <div className="eyebrow">
            <Files size={14} />
            Documents
          </div>

          <h1>Document library</h1>

          <p>
            Manage and review all your analyzed documents.
          </p>
        </div>

        <div className="page-heading-actions">
          <button
            className="secondary-button"
            onClick={() => onOpenExcelBuilder?.(documents)}
            disabled={documents.length === 0}
          >
            <Download size={16} />
            Export Excel
          </button>

          <button
            className="primary-button"
            onClick={onUpload}
          >
            <Plus size={18} />
            Upload
          </button>
        </div>

      </div>

      <section className="folder-workspace">
        <div className="folder-section-heading">
          <div>
            <span className="card-label">Organize your files</span>
            <h2>{activeFolder ? activeFolder.name : "Folders"}</h2>
          </div>
          <button
            className="secondary-button"
            onClick={() => setShowNewFolder((value) => !value)}
          >
            <FolderPlus size={16} />
            New folder
          </button>
        </div>

        {showNewFolder && (
          <div className="new-folder-form">
            <Folder size={18} />
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitFolder();
                if (e.key === "Escape") {
                  setShowNewFolder(false);
                  setNewFolderName("");
                }
              }}
              placeholder="e.g. Tax Documents, Clients, Personal..."
            />
            <button className="primary-button" onClick={submitFolder}>
              Create folder
            </button>
            <button
              className="close-button"
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName("");
              }}
              aria-label="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="folder-grid">
          <button
            className={`folder-card ${selectedFolderId === null ? "active" : ""}`}
            onClick={() => onSelectFolder?.(null)}
          >
            <div className="folder-card-icon all">
              <Files size={20} />
            </div>
            <div>
              <strong>All documents</strong>
              <span>{allDocuments.length} files</span>
            </div>
            <ChevronRight size={16} />
          </button>

          {folders.map((folder) => {
            const count = allDocuments.filter(
              (doc) => doc.folderId === folder.id
            ).length;

            return (
              <div
                className={`relative min-w-0 ${selectedFolderId === folder.id ? "active" : ""}`}
                key={folder.id}
              >
                <button
                  className={`folder-card w-full pr-28 ${selectedFolderId === folder.id ? "active" : ""}`}
                  onClick={() => {
                    onSelectFolder?.(folder.id);
                    setFolderActionsId((current) =>
                      current === folder.id ? null : folder.id
                    );
                  }}
                >
                  <div className={`folder-card-icon ${folder.color || "purple"}`}>
                    <Folder size={20} />
                  </div>
                  <div>
                    <strong>{folder.name}</strong>
                    <span>{count} {count === 1 ? "file" : "files"}</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
                {folderActionsId === folder.id && (
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 z-[3] inline-flex min-h-8 -translate-y-1/2 translate-x-1 items-center justify-center gap-1.5 rounded-[10px] border border-red-200/80 bg-red-50/95 px-[11px] text-[11.5px] font-bold tracking-[-.01em] text-red-600 shadow-[0_5px_14px_rgba(220,38,38,.08)] transition duration-200 hover:translate-x-0 hover:scale-[1.02] hover:border-red-300 hover:bg-rose-50 hover:shadow-[0_8px_20px_rgba(220,38,38,.14)] active:scale-[.97] dark:border-red-400/20 dark:bg-red-950/40 dark:text-red-300 dark:hover:border-red-400/35 dark:hover:bg-red-900/50 dark:hover:text-red-200"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteFolder?.(folder.id);
                      setFolderActionsId(null);
                    }}
                    aria-label={`Delete ${folder.name} folder`}
                    title="Delete folder"
                  >
                    <Trash2 size={15} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card documents-card">

        <div className="document-toolbar">
          {activeFolder && (
            <button
              className="folder-back-button"
              onClick={() => onSelectFolder?.(null)}
            >
              <ChevronLeft size={16} />
              All folders
            </button>
          )}

          <div className="library-search">
            <Search size={17} />
            <input placeholder="Filter documents..." />
          </div>

          <select>
            <option>All documents</option>
            <option>Analyzed</option>
            <option>Processing</option>
            <option>High risk</option>
          </select>

        </div>

        <DocumentTable
          documents={documents}
          folders={folders}
          onSelect={onSelect}
          onDelete={onDelete}
          onMoveDocument={onMoveDocument}
          showDelete
        />

      </section>
    </>
  );
}

/* -------------------------------- */
/* Analytics */
/* -------------------------------- */

function Analytics({ documents }) {
  const [presentationMode, setPresentationMode] = useState(false);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Analyzed");
  const [typeFilter, setTypeFilter] = useState("All");
  const [cvOnly, setCvOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [slide, setSlide] = useState(0);

  const realDocuments = useMemo(() => {
    const userDocs = documents.filter((doc) => !doc.isDemo);
    return userDocs.length ? userDocs : documents;
  }, [documents]);

  const allTypes = useMemo(() => [...new Set(realDocuments.map((d) => d.category || d.type).filter(Boolean))], [realDocuments]);
  const isCvDocument = (doc) => String(doc?.category || "").toLowerCase().includes("resume") || String(doc?.type || "").toLowerCase() === "cv";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return realDocuments.filter((doc) => {
      const searchable = [
        doc.name, doc.category, doc.type, doc.risk, doc.summary,
        ...(doc.tags || []), ...(doc.entities || []).flatMap((e) => [e.label, e.value]),
        ...(doc.findings || []).map((f) => f.text),
      ].filter(Boolean).join(" ").toLowerCase();
      return (!q || searchable.includes(q))
        && (riskFilter === "All" || doc.risk === riskFilter)
        && (statusFilter === "All" || doc.status === statusFilter)
        && (typeFilter === "All" || (doc.category || doc.type) === typeFilter)
        && (!cvOnly || isCvDocument(doc));
    });
  }, [realDocuments, query, riskFilter, statusFilter, typeFilter, cvOnly]);

  const stats = useMemo(() => calculateAnalyticsStats(filtered, realDocuments), [filtered, realDocuments]);

  useEffect(() => {
    if (!presentationMode) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setPresentationMode(false);
      if (event.key === "ArrowRight") setSlide((v) => Math.min(7, v + 1));
      if (event.key === "ArrowLeft") setSlide((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentationMode]);

  const exportReport = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Open Ledger Docs";
    workbook.created = new Date();

    const summary = workbook.addWorksheet("Summary");
    summary.columns = [{ header: "Metric", key: "metric", width: 32 }, { header: "Value", key: "value", width: 28 }];
    [
      ["Total Documents", stats.total], ["Analyzed", stats.analyzed], ["Critical Issues", stats.critical],
      ["High Risk", stats.high], ["Medium Risk", stats.medium], ["Low Risk", stats.low],
      ["Important Clauses", stats.importantClauses], ["Missing Information", stats.missingInformation],
      ["CV Candidates", stats.cv.totalCandidates], ["Shortlisted", stats.cv.shortlisted],
      ["Average Experience (years)", stats.cv.averageExperience ?? ""], ["Top Skill", stats.cv.topSkill || ""],
    ].forEach(([metric, value]) => summary.addRow({ metric, value }));
    styleHeaderRow(summary.getRow(1)); applyZebraStripes(summary);

    const docs = workbook.addWorksheet("Documents", { views: [{ state: "frozen", ySplit: 1 }] });
    docs.columns = [
      { header: "Name", key: "name", width: 34 }, { header: "Type", key: "type", width: 16 },
      { header: "Status", key: "status", width: 14 }, { header: "Risk", key: "risk", width: 12 },
      { header: "Category", key: "category", width: 18 }, { header: "Confidence", key: "confidence", width: 14 },
      { header: "Summary", key: "summary", width: 70 },
    ];
    filtered.forEach((d) => docs.addRow({ name: d.name, type: d.type, status: d.status, risk: d.risk, category: d.category || "", confidence: d.confidence ?? "", summary: d.summary || "" }));
    styleHeaderRow(docs.getRow(1)); applyZebraStripes(docs); colorizeRiskColumn(docs, "risk");
    docs.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: docs.columns.length } };

    const risks = workbook.addWorksheet("Risks");
    risks.columns = [{ header: "Document", key: "document", width: 34 }, { header: "Risk", key: "risk", width: 12 }, { header: "Finding", key: "finding", width: 80 }];
    filtered.flatMap((d) => (d.findings || []).map((f) => ({ document: d.name, risk: f.level || d.risk, finding: f.text }))).forEach((r) => risks.addRow(r));
    if (risks.rowCount === 1) risks.addRow({ document: "—", risk: "—", finding: "No findings in the current filtered data." });
    styleHeaderRow(risks.getRow(1)); applyZebraStripes(risks); colorizeRiskColumn(risks, "risk");

    const candidates = workbook.addWorksheet("CV Candidates");
    candidates.columns = [{ header: "Candidate", key: "candidate", width: 28 }, { header: "Match Score", key: "score", width: 14 }, { header: "Experience", key: "experience", width: 14 }, { header: "Skills", key: "skills", width: 45 }, { header: "Education", key: "education", width: 28 }, { header: "Location", key: "location", width: 22 }, { header: "Status", key: "status", width: 18 }];
    stats.cv.candidates.forEach((c) => candidates.addRow(c));
    styleHeaderRow(candidates.getRow(1)); applyZebraStripes(candidates);

    const skills = workbook.addWorksheet("Skills");
    skills.columns = [{ header: "Skill", key: "skill", width: 32 }, { header: "Candidates", key: "count", width: 14 }];
    stats.cv.topSkills.forEach((s) => skills.addRow(s));
    styleHeaderRow(skills.getRow(1)); applyZebraStripes(skills);

    await triggerExcelDownload(workbook, "open-led-docs-analytics-report.xlsx");
  };

  if (presentationMode) {
    return <PresentationMode slides={buildPresentationSlides(stats)} slide={slide} setSlide={setSlide} onExit={() => setPresentationMode(false)} />;
  }

  return (
    <div className="pro-analytics">
      <section className="analytics-hero">
        <div>
          <div className="eyebrow"><BarChart3 size={14} /> Analytics Overview</div>
          <h1>Turn analysis into clear decisions.</h1>
          <p>Presentation-ready insights from the documents already analyzed in your workspace.</p>
        </div>
        <div className="analytics-hero-actions">
          <button className="secondary-button" onClick={() => window.location.reload()}><Activity size={15} /> Refresh</button>
          <button className="secondary-button" onClick={exportReport}><Download size={15} /> Export Report</button>
          <button className="primary-button" onClick={() => { setSlide(0); setPresentationMode(true); }}><ArrowUpRight size={15} /> Presentation Mode</button>
        </div>
      </section>

      <section className="analytics-toolbar card">
        <div className="analytics-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents, candidates, skills, risks..." /></div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="All">All types</option>{allTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}><option>All</option><option>High</option><option>Medium</option><option>Low</option></select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All</option><option>Analyzed</option><option>Processing</option><option>Failed</option></select>
        <button className={`filter-pill ${cvOnly ? "active" : ""}`} onClick={() => setCvOnly((v) => !v)}>CV analytics</button>
      </section>

      {filtered.length === 0 ? (
        <section className="card analytics-empty"><FileSearch size={30} /><h2>No documents match these filters.</h2><p>Upload and analyze documents to generate data-driven analytics.</p></section>
      ) : (
        <>
          <section className="analytics-kpis">
            <StatCard icon={<Files size={18} />} label={cvOnly ? "Candidates" : "Total documents"} value={cvOnly ? stats.cv.totalCandidates : stats.total} hint={`${stats.analyzed} analyzed`} />
            <StatCard icon={<FileCheck2 size={18} />} label="Analyzed" value={stats.analyzed} hint={`${stats.completionRate}% completion`} />
            <StatCard icon={<AlertTriangle size={18} />} label="Critical issues" value={stats.critical} hint="From recorded findings" />
            <StatCard icon={<ShieldCheck size={18} />} label="High risk" value={stats.high} hint="Requires review" />
            <StatCard icon={<Clock3 size={18} />} label="Medium risk" value={stats.medium} hint={`${stats.low} low risk`} />
            <StatCard icon={<Sparkles size={18} />} label={cvOnly ? "Top skill" : "Important clauses"} value={cvOnly ? (stats.cv.topSkill || "—") : stats.importantClauses} hint={cvOnly ? `${stats.cv.topSkills.length} skills detected` : "Extracted fields / findings"} />
          </section>

          {cvOnly ? (
            <CVAnalyticsPanel stats={stats.cv} onSelect={setSelected} />
          ) : (
            <DocumentAnalyticsPanel stats={stats} documents={filtered} onSelect={setSelected} />
          )}

          <section className="analytics-bottom-grid">
            <div className="card insights-card">
              <div className="card-title-row"><div><span className="card-label">AI-GENERATED INSIGHTS</span><h2>What stands out</h2></div><Sparkles size={18} /></div>
              <div className="insight-list">{stats.insights.map((insight) => <div className="analytics-insight" key={insight}><span><Sparkles size={14} /></span><p>{insight}</p></div>)}</div>
            </div>
            <div className="card attention-card">
              <div className="card-title-row"><div><span className="card-label">ATTENTION</span><h2>Documents requiring review</h2></div><AlertTriangle size={18} /></div>
              {stats.attention.length ? stats.attention.slice(0, 5).map((doc) => <button className="attention-row" key={doc.id} onClick={() => setSelected(doc)}><div><strong>{doc.name}</strong><span>{doc.findings?.[0]?.text || doc.summary || "Review the analysis details."}</span></div><RiskBadge risk={doc.risk} /></button>) : <div className="analytics-mini-empty">No medium or high-risk documents in this view.</div>}
            </div>
          </section>
        </>
      )}

      {selected && <AnalyticsDocumentModal document={selected} onClose={() => setSelected(null)} onExport={async () => { await downloadDocumentExcel(selected); }} />}
    </div>
  );
}

function calculateAnalyticsStats(docs, allDocs) {
  const analyzed = docs.filter((d) => d.status === "Analyzed").length;
  const low = docs.filter((d) => d.risk === "Low").length;
  const medium = docs.filter((d) => d.risk === "Medium").length;
  const high = docs.filter((d) => d.risk === "High").length;
  const critical = docs.reduce((n, d) => n + (d.findings || []).filter((f) => String(f.level).toLowerCase() === "high").length, 0);
  const importantClauses = docs.reduce((n, d) => n + (d.entities || []).filter((e) => /clause|term|party|date|amount|salary|notice|law/i.test(`${e.label} ${e.value}`)).length, 0);
  const missingInformation = docs.reduce((n, d) => n + (d.findings || []).filter((f) => /missing|absent|not provided|incomplete/i.test(f.text || "")).length, 0);
  const categories = countDocumentValues(docs.map((d) => d.category || d.type || "Other"));
  const dates = docs.flatMap((d) => (d.entities || []).filter((e) => /date|renew|expir|due/i.test(e.label || "")).map((e) => ({ ...e, document: d.name })));
  const cv = calculateCVStats(docs.filter((d) => String(d.category || "").toLowerCase().includes("resume") || String(d.type || "").toLowerCase() === "cv"));
  const insights = generateInsights({ docs, allDocs, low, medium, high, analyzed, missingInformation, categories, cv });
  return { total: docs.length, analyzed, low, medium, high, critical, importantClauses, missingInformation, categories, dates, attention: docs.filter((d) => d.risk === "High" || d.risk === "Medium"), completionRate: docs.length ? Math.round((analyzed / docs.length) * 100) : 0, insights, cv };
}

function calculateCVStats(cvs) {
  const getEntity = (doc, patterns) => (doc.entities || []).find((e) => patterns.some((p) => new RegExp(p, "i").test(e.label || "")))?.value;
  const candidates = cvs.map((doc, index) => {
    const name = getEntity(doc, ["name", "candidate"]) || doc.name.replace(/\.(pdf|docx?)$/i, "");
    const experienceRaw = getEntity(doc, ["experience", "years"]);
    const experience = parseCVExperience(experienceRaw);
    const skills = getEntity(doc, ["skills", "technical skills"]) || (doc.tags || []).join(", ");
    const education = getEntity(doc, ["education", "degree", "qualification"]) || "—";
    const location = getEntity(doc, ["location", "city", "address"]) || "—";
    const score = toNumberOrNull(getEntity(doc, ["match", "score", "fit"])) ?? doc.confidence ?? null;
    return { id: doc.id, document: doc, rank: index + 1, candidate: String(name), score, experience, skills: String(skills || "—"), education: String(education), location: String(location), status: score != null && score >= 80 ? "Shortlisted" : "Review" };
  });
  const experienceValues = candidates.map((c) => c.experience).filter((v) => v != null);
  const topSkills = countDocumentValues(candidates.flatMap((c) => c.skills.split(/[,|•]/).map((s) => s.trim()).filter(Boolean))).slice(0, 8).map(([skill, count]) => ({ skill, count }));
  return {
    totalCandidates: cvs.length,
    shortlisted: candidates.filter((c) => c.status === "Shortlisted").length,
    averageExperience: experienceValues.length ? Math.round((experienceValues.reduce((a, b) => a + b, 0) / experienceValues.length) * 10) / 10 : null,
    averageMatchScore: (() => { const v = candidates.map((c) => c.score).filter((x) => x != null); return v.length ? Math.round(v.reduce((a,b) => a+b,0)/v.length) : null; })(),
    topSkill: topSkills[0]?.skill || "",
    topSkills,
    experienceDistribution: ["0–1", "1–3", "3–5", "5–10", "10+"].map((label, i) => ({ label, count: candidates.filter((c) => c.experience != null && ((i === 0 && c.experience <= 1) || (i === 1 && c.experience > 1 && c.experience <= 3) || (i === 2 && c.experience > 3 && c.experience <= 5) || (i === 3 && c.experience > 5 && c.experience <= 10) || (i === 4 && c.experience > 10))).length })),
    educationDistribution: countDocumentValues(candidates.map((c) => c.education).filter((v) => v !== "—")).slice(0, 6),
    locationDistribution: countDocumentValues(candidates.map((c) => c.location).filter((v) => v !== "—")).slice(0, 6),
    candidates,
  };
}

function parseCVExperience(value) {
  if (value == null) return null;
  const match = String(value).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function countDocumentValues(values) {
  const map = values.reduce((acc, value) => { const key = String(value); acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function generateInsights({ docs, allDocs, low, medium, high, analyzed, missingInformation, categories, cv }) {
  if (!docs.length) return ["Analyze more documents to generate insights."];
  const insights = [];
  if (missingInformation) insights.push(`${missingInformation} recorded finding${missingInformation === 1 ? "" : "s"} mention missing or incomplete information.`);
  if (high) insights.push(`${high} document${high === 1 ? "" : "s"} currently carries a high-risk label.`);
  if (medium) insights.push(`${medium} document${medium === 1 ? "" : "s"} currently carries a medium-risk label.`);
  if (categories[0]) insights.push(`${categories[0][1]} document${categories[0][1] === 1 ? "" : "s"} in this view are classified as ${categories[0][0]}.`);
  if (cv.totalCandidates) insights.push(`${cv.shortlisted} of ${cv.totalCandidates} CV${cv.totalCandidates === 1 ? "" : "s"} meet the current score-based shortlist threshold.`);
  if (!insights.length) insights.push(`${analyzed} analyzed document${analyzed === 1 ? " is" : "s are"} available for review.`);
  return insights.slice(0, 4);
}

function DocumentAnalyticsPanel({ stats, documents, onSelect }) {
  const riskTotal = Math.max(stats.low + stats.medium + stats.high, 1);
  const maxCategory = Math.max(...stats.categories.map(([, count]) => count), 1);
  return (
    <section className="analytics-main-grid">
      <div className="card analytics-chart-card">
        <div className="card-title-row"><div><span className="card-label">DOCUMENT INTELLIGENCE</span><h2>Risk distribution</h2></div><ShieldCheck size={18} /></div>
        <div className="analytics-risk-layout"><div className="analytics-donut" style={{ background: `conic-gradient(var(--danger) 0 ${(stats.high/riskTotal)*100}%, var(--warn) ${(stats.high/riskTotal)*100} ${((stats.high+stats.medium)/riskTotal)*100}%, var(--success) ${((stats.high+stats.medium)/riskTotal)*100}% 100%)` }}><div><strong>{stats.total}</strong><span>documents</span></div></div><div className="analytics-legend"><div><i className="risk-dot high" />High<strong>{stats.high}</strong></div><div><i className="risk-dot medium" />Medium<strong>{stats.medium}</strong></div><div><i className="risk-dot low" />Low<strong>{stats.low}</strong></div></div></div>
      </div>
      <div className="card analytics-chart-card"><div className="card-title-row"><div><span className="card-label">DOCUMENT TYPES</span><h2>Portfolio mix</h2></div><Layers size={18} /></div><div className="horizontal-bars">{stats.categories.slice(0, 6).map(([label, count]) => <div className="hbar-row" key={label}><span>{label}</span><div><i style={{ width: `${(count/maxCategory)*100}%` }} /></div><strong>{count}</strong></div>)}</div></div>
      <div className="card analytics-chart-card wide"><div className="card-title-row"><div><span className="card-label">IMPORTANT DATES</span><h2>Extracted timeline</h2></div><Clock3 size={18} /></div>{stats.dates.length ? <div className="timeline-list">{stats.dates.slice(0, 8).map((d, i) => <div className="timeline-item" key={`${d.document}-${d.label}-${i}`}><span className="timeline-dot" /><div><strong>{d.label}</strong><span>{d.value} · {d.document}</span></div></div>)}</div> : <div className="analytics-mini-empty">No date fields were extracted from the current documents.</div>}</div>
      <div className="card analytics-chart-card wide"><div className="card-title-row"><div><span className="card-label">DOCUMENT STATUS</span><h2>Processing health</h2></div><Activity size={18} /></div><div className="status-bars">{[["Analyzed", documents.filter(d=>d.status==="Analyzed").length],["Processing", documents.filter(d=>d.status==="Processing").length],["Failed", documents.filter(d=>d.status==="Failed").length]].map(([label,count]) => <div className="status-row" key={label}><span>{label}</span><div><i style={{ width: `${Math.max(3, (count/Math.max(documents.length,1))*100)}%` }} /></div><strong>{count}</strong></div>)}</div></div>
      <div className="card analytics-table-card wide"><div className="card-title-row"><div><span className="card-label">DOCUMENT-BY-DOCUMENT</span><h2>Review portfolio</h2></div><span className="table-count">{documents.length} files</span></div><div className="analytics-table-wrap"><table><thead><tr><th>Document</th><th>Type</th><th>Risk</th><th>Confidence</th><th>Status</th><th /></tr></thead><tbody>{documents.slice(0, 12).map((doc) => <tr key={doc.id}><td><button className="table-link" onClick={() => onSelect(doc)}>{doc.name}</button></td><td>{doc.category || doc.type || "—"}</td><td><RiskBadge risk={doc.risk} /></td><td>{doc.confidence != null ? `${doc.confidence}%` : "—"}</td><td>{doc.status}</td><td><button className="icon-button" onClick={() => onSelect(doc)} aria-label={`Open ${doc.name}`}><ArrowUpRight size={15} /></button></td></tr>)}</tbody></table></div></div>
    </section>
  );
}

function CVAnalyticsPanel({ stats, onSelect }) {
  return <section className="cv-analytics-grid">
    <div className="card analytics-chart-card"><div className="card-title-row"><div><span className="card-label">CANDIDATE INTELLIGENCE</span><h2>Candidate overview</h2></div><UsersIcon size={18} /></div><div className="cv-overview"><strong>{stats.totalCandidates}</strong><span>candidates</span><strong>{stats.shortlisted}</strong><span>shortlisted</span><strong>{stats.averageExperience ?? "—"}</strong><span>avg. years</span></div></div>
    <div className="card analytics-chart-card"><div className="card-title-row"><div><span className="card-label">TOP SKILLS</span><h2>Skill frequency</h2></div><Sparkles size={18} /></div><div className="horizontal-bars">{stats.topSkills.length ? stats.topSkills.map(({skill,count}) => <div className="hbar-row" key={skill}><span>{skill}</span><div><i style={{ width: `${(count/Math.max(stats.topSkills[0].count,1))*100}%` }} /></div><strong>{count}</strong></div>) : <div className="analytics-mini-empty">No skill fields were extracted.</div>}</div></div>
    <div className="card analytics-chart-card"><div className="card-title-row"><div><span className="card-label">EXPERIENCE</span><h2>Experience distribution</h2></div><Activity size={18} /></div><div className="simple-bars">{stats.experienceDistribution.map((x) => <div key={x.label}><span>{x.label}</span><i style={{ height: `${Math.max(8, x.count / Math.max(...stats.experienceDistribution.map(v=>v.count),1) * 100)}%` }} /><strong>{x.count}</strong></div>)}</div></div>
    <div className="card analytics-chart-card"><div className="card-title-row"><div><span className="card-label">EDUCATION & LOCATION</span><h2>Candidate distribution</h2></div><BookOpen size={18} /></div><div className="distribution-list"><strong>Education</strong>{stats.educationDistribution.length ? stats.educationDistribution.map(([x,n]) => <div key={x}><span>{x}</span><b>{n}</b></div>) : <p>No education data.</p>}<strong>Location</strong>{stats.locationDistribution.length ? stats.locationDistribution.map(([x,n]) => <div key={x}><span>{x}</span><b>{n}</b></div>) : <p>No location data.</p>}</div></div>
    <div className="card analytics-table-card wide"><div className="card-title-row"><div><span className="card-label">CANDIDATE RANKING</span><h2>Existing score data</h2></div><span className="table-count">No new ranking algorithm</span></div><div className="analytics-table-wrap"><table><thead><tr><th>Candidate</th><th>Match</th><th>Experience</th><th>Skills</th><th>Status</th><th /></tr></thead><tbody>{stats.candidates.map((c) => <tr key={c.id}><td><button className="table-link" onClick={() => onSelect(c.document)}>{c.candidate}</button></td><td>{c.score != null ? `${c.score}%` : "—"}</td><td>{c.experience != null ? `${c.experience} yrs` : "—"}</td><td>{c.skills}</td><td>{c.status}</td><td><button className="icon-button" onClick={() => onSelect(c.document)} aria-label={`Open ${c.candidate}`}><ArrowUpRight size={15} /></button></td></tr>)}</tbody></table></div></div>
  </section>;
}

function AnalyticsDocumentModal({ document, onClose, onExport }) {
  return <div className="analytics-modal-backdrop" onMouseDown={onClose}><div className="analytics-modal" onMouseDown={(e) => e.stopPropagation()}><div className="analytics-modal-head"><div><span className="card-label">DOCUMENT DETAIL</span><h2>{document.name}</h2><p>{document.category || document.type || "Document"} · {document.status}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div><div className="analytics-detail-grid"><DetailItem label="Risk level" value={document.risk} /><DetailItem label="Confidence" value={document.confidence != null ? `${document.confidence}%` : "—"} /><DetailItem label="Pages" value={document.pages ?? "—"} /><DetailItem label="Category" value={document.category || "—"} /></div><div className="analytics-detail-section"><span className="card-label">AI SUMMARY</span><p>{document.summary || "No summary returned."}</p></div><div className="analytics-detail-section"><span className="card-label">FINDINGS</span>{document.findings?.length ? document.findings.map((f, i) => <div className="detail-finding" key={i}><RiskBadge risk={f.level} /><span>{f.text}</span></div>) : <p>No findings recorded.</p>}</div><div className="analytics-detail-section"><span className="card-label">EXTRACTED FIELDS</span><div className="detail-fields">{document.entities?.length ? document.entities.map((e, i) => <div key={i}><span>{e.label}</span><strong>{e.value}</strong></div>) : <p>No structured fields extracted.</p>}</div></div><div className="analytics-modal-actions"><button className="secondary-button" onClick={onClose}>Close</button><button className="primary-button" onClick={onExport}><Download size={15} /> Export Analysis</button></div></div></div>;
}

function PresentationMode({ slides, slide, setSlide, onExit }) {
  const current = slides[slide] || slides[0];
  return <div className="presentation-shell"><div className="presentation-top"><strong>Open Ledger Docs</strong><span>{slide + 1} / {slides.length}</span><button onClick={onExit}><X size={17} /> Exit Presentation</button></div><main className="presentation-slide"><span className="presentation-kicker">ANALYTICS REPORT · {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span><h1>{current.title}</h1><p>{current.subtitle}</p><div className="presentation-content">{current.content}</div></main><div className="presentation-controls"><button disabled={slide===0} onClick={() => setSlide((v)=>Math.max(0,v-1))}>← Previous</button><div>{slides.map((_,i)=><button className={i===slide?"active":""} key={i} onClick={()=>setSlide(i)} aria-label={`Go to slide ${i+1}`} />)}</div><button disabled={slide===slides.length-1} onClick={() => setSlide((v)=>Math.min(slides.length-1,v+1))}>Next →</button></div></div>;
}

function buildPresentationSlides(stats) {
  const topRisk = stats.attention.slice(0, 4);
  return [
    { title: "Analytics Report", subtitle: "A presentation-ready view of the current Open Ledger Docs workspace.", content: <div className="presentation-kpi-large"><strong>{stats.total}</strong><span>documents in this report</span></div> },
    { title: "Executive Summary", subtitle: "The core measures available from the analyzed data.", content: <div className="presentation-kpi-grid">{[["Analyzed",stats.analyzed],["High risk",stats.high],["Medium risk",stats.medium],["Low risk",stats.low],["Critical issues",stats.critical],["Missing information",stats.missingInformation]].map(([l,v])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div> },
    { title: "Risk Overview", subtitle: "Distribution of the recorded document risk levels.", content: <div className="presentation-risk"><div className="analytics-donut" style={{background:`conic-gradient(var(--danger) 0 ${(stats.high/Math.max(stats.total,1))*100}%, var(--warn) ${(stats.high/Math.max(stats.total,1))*100} ${((stats.high+stats.medium)/Math.max(stats.total,1))*100}%, var(--success) ${((stats.high+stats.medium)/Math.max(stats.total,1))*100}% 100%)`}}><div><strong>{stats.total}</strong><span>total</span></div></div><div>{[["High",stats.high],["Medium",stats.medium],["Low",stats.low]].map(([l,v])=><p key={l}><strong>{v}</strong> {l}</p>)}</div></div> },
    { title: "Key Findings", subtitle: "Insights generated from recorded fields and findings, without inventing data.", content: <div className="presentation-findings">{stats.insights.map((x)=><div key={x}><Sparkles size={18}/><span>{x}</span></div>)}</div> },
    { title: "Documents Requiring Attention", subtitle: "The highest-priority items in the current filtered dataset.", content: <div className="presentation-findings">{topRisk.length ? topRisk.map((d)=><div key={d.id}><RiskBadge risk={d.risk}/><span><strong>{d.name}</strong> — {d.findings?.[0]?.text || "Review analysis details."}</span></div>) : <div>No medium or high-risk documents are recorded.</div>}</div> },
    { title: "CV Analytics", subtitle: "Candidate metrics are shown when CV/resume data is present.", content: <div className="presentation-kpi-grid">{[["Candidates",stats.cv.totalCandidates],["Shortlisted",stats.cv.shortlisted],["Avg. experience",stats.cv.averageExperience ?? "—"],["Avg. match",stats.cv.averageMatchScore != null ? `${stats.cv.averageMatchScore}%` : "—"],["Top skill",stats.cv.topSkill || "—"]].map(([l,v])=><div key={l}><strong>{v}</strong><span>{l}</span></div>)}</div> },
    { title: "Top Candidates", subtitle: "Uses existing confidence/match fields; no new ranking model is introduced.", content: <div className="presentation-candidate-list">{stats.cv.candidates.slice(0,5).map((c)=><div key={c.id}><strong>{c.candidate}</strong><span>{c.score != null ? `${c.score}%` : "No score"} · {c.experience != null ? `${c.experience} yrs` : "Experience unavailable"} · {c.skills}</span></div>)}</div> },
    { title: "Recommendations", subtitle: "Actions grounded in the current data.", content: <div className="presentation-findings">{stats.attention.length ? stats.attention.slice(0,5).map((d)=><div key={d.id}><ArrowUpRight size={18}/><span>Review <strong>{d.name}</strong> and its recorded {String(d.risk).toLowerCase()}-risk findings.</span></div>) : <div><CheckCircle2 size={18}/> No medium or high-risk documents are recorded in this view.</div>}</div> },
  ];
}

function UsersIcon({ size = 18 }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }

/* -------------------------------- */
/* Pricing */
/* -------------------------------- */

function Pricing({ billingCycle, setBillingCycle, onCheckout }) {
  return (
    <>
      <div className="page-heading pricing-heading">
        <div>
          <div className="eyebrow">
            <Tag size={14} />
            Pricing
          </div>

          <h1>Choose your right plan</h1>

          <p>
            Pick the plan that matches how much you analyze. Switch
            or cancel anytime.
          </p>
        </div>
      </div>

      <div className="billing-toggle">
        <button
          className={billingCycle === "monthly" ? "active" : ""}
          onClick={() => setBillingCycle("monthly")}
        >
          Monthly
        </button>
        <button
          className={billingCycle === "yearly" ? "active" : ""}
          onClick={() => setBillingCycle("yearly")}
        >
          Yearly
          <em>12 months</em>
        </button>
      </div>

      <div className="pricing-grid">

        {pricingPlans.map((plan) => {
          const price =
            billingCycle === "monthly" ? plan.monthly : plan.yearly;

          return (
            <section
              key={plan.name}
              className={`pricing-card ${plan.featured ? "featured" : ""}`}
            >
              {plan.featured && (
                <span className="pricing-badge">Most popular</span>
              )}

              <div className="pricing-card-top">
                <span className="plan-name">{plan.name}</span>
                <p className="plan-tagline">{plan.tagline}</p>
              </div>

              <div className="plan-price">
                {price === null ? (
                  <strong>Let's talk</strong>
                ) : (
                  <>
                    <strong>{price.toLocaleString("en-PK")}</strong>
                    <span>PKR / {billingCycle === "monthly" ? "month" : "year"}</span>
                  </>
                )}
              </div>

              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={plan.featured ? "plan-cta primary" : "plan-cta"}
                onClick={() => onCheckout(plan)}
              >
                {plan.name === "Business" && <Phone size={15} />}
                {plan.name === "Starter" ? "Start Free" : "Choose Plan"}
              </button>
            </section>
          );
        })}

      </div>

      <section className="card pricing-faq">
        <div className="card-title-row">
          <div>
            <span className="card-label">Good to know</span>
            <h2>Plan details</h2>
          </div>
        </div>

        <div className="faq-grid">
          <FeatureCard
            icon={<ShieldCheck size={20} />}
            title="Cancel anytime"
            text="Downgrade or cancel your subscription whenever you like, no lock-in."
          />
          <FeatureCard
            icon={<Sparkles size={20} />}
            title="Free document credits"
            text="Every plan starts with a few free analyses so you can try it first."
          />
          <FeatureCard
            icon={<FileCheck2 size={20} />}
            title="Usage-based limits"
            text="Analyses roll over month to month on Pro and Enterprise plans."
          />
        </div>
      </section>
    </>
  );
}

/* -------------------------------- */
/* Settings */
/* -------------------------------- */

function SettingsPage({ settings, onSave }) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => setDraft(settings), [settings]);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const save = () => onSave(draft);
  const reset = () => setDraft({
    workspaceName: "Open Ledger Docs Workspace",
    language: "English",
    autoRisk: true,
    smartSummaries: true,
    structuredExtraction: true,
  });

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow"><Settings size={14} /> Settings</div>
          <h1>Workspace settings</h1>
          <p>Configure your Open Ledger Docs workspace and analysis preferences.</p>
        </div>
        <div className="settings-heading-actions">
          <button className="secondary-button" onClick={reset}>Reset</button>
          <button className="primary-button" onClick={save}><Check size={15} /> Save changes</button>
        </div>
      </div>

      <div className="settings-layout">
        <section className="card settings-card">
          <div className="settings-card-heading"><div><span className="card-label">WORKSPACE</span><h2>General</h2></div><Settings size={18} /></div>
          <label>
            Workspace name
            <input value={draft.workspaceName} onChange={(e) => update("workspaceName", e.target.value)} />
          </label>
          <label>
            Default language
            <select value={draft.language} onChange={(e) => update("language", e.target.value)}>
              <option>English</option><option>Urdu</option><option>Spanish</option>
            </select>
          </label>
          <div className="settings-save-note"><CheckCircle2 size={15} /> Changes are saved to this browser.</div>
        </section>

        <section className="card settings-card">
          <div className="settings-card-heading"><div><span className="card-label">AI PREFERENCES</span><h2>AI Analysis</h2></div><Sparkles size={18} /></div>
          <SettingToggle title="Automatic risk detection" text="Detect potentially risky clauses automatically." enabled={draft.autoRisk} onChange={(v) => update("autoRisk", v)} />
          <SettingToggle title="Smart summaries" text="Generate a concise AI summary for every document." enabled={draft.smartSummaries} onChange={(v) => update("smartSummaries", v)} />
          <SettingToggle title="Structured extraction" text="Extract important entities, dates and values." enabled={draft.structuredExtraction} onChange={(v) => update("structuredExtraction", v)} />
        </section>
      </div>
    </>
  );
}

function CheckoutModal({ plan, billingCycle, onClose, onSuccess }) {
  const [method, setMethod] = useState("Visa / Mastercard");
  const [processing, setProcessing] = useState(false);
  const [details, setDetails] = useState({ name: "", number: "", expiry: "", cvc: "", phone: "" });
  const price = billingCycle === "monthly" ? plan.monthly : plan.yearly;
  const methods = [
    { name: "Visa / Mastercard", icon: <CreditCard size={18} />, note: "Debit or credit card" },
    { name: "Easypaisa", icon: <Wallet size={18} />, note: "Pay with Easypaisa" },
    { name: "JazzCash", icon: <Smartphone size={18} />, note: "Pay with JazzCash" },
    { name: "Bank Transfer", icon: <Landmark size={18} />, note: "Manual bank payment" },
  ];

  const submit = (e) => {
    e.preventDefault();
    setProcessing(true);
    window.setTimeout(() => {
      setProcessing(false);
      onSuccess(method);
    }, 900);
  };

  return (
    <div className="checkout-backdrop" onMouseDown={onClose}>
      <div className="checkout-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="checkout-head">
          <div><span className="card-label">SECURE CHECKOUT</span><h2>{plan.name} plan</h2><p>{price === 0 ? "Free" : `PKR ${price.toLocaleString("en-PK")}`} / {billingCycle === "monthly" ? "month" : "year"}</p></div>
          <button className="icon-button" onClick={onClose} aria-label="Close checkout"><X size={18} /></button>
        </div>
        <div className="payment-methods">
          {methods.map((item) => <button key={item.name} className={method === item.name ? "active" : ""} onClick={() => setMethod(item.name)}>{item.icon}<span><strong>{item.name}</strong><small>{item.note}</small></span>{method === item.name && <CheckCircle2 size={16} />}</button>)}
        </div>
        {price === 0 ? (
          <form onSubmit={submit} className="checkout-form"><div className="checkout-free"><Sparkles size={22} /><div><strong>Your free workspace is ready.</strong><p>No payment is required for the Starter plan.</p></div></div><button className="primary-button" disabled={processing}>{processing ? "Activating…" : "Activate Starter"}</button></form>
        ) : (
          <form onSubmit={submit} className="checkout-form">
            {method === "Visa / Mastercard" && <><label>Cardholder name<input required value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} placeholder="Name on card" /></label><label>Card number<input required inputMode="numeric" value={details.number} onChange={(e) => setDetails({ ...details, number: e.target.value })} placeholder="4242 4242 4242 4242" /></label><div className="checkout-row"><label>Expiry<input required value={details.expiry} onChange={(e) => setDetails({ ...details, expiry: e.target.value })} placeholder="MM/YY" /></label><label>CVC<input required value={details.cvc} onChange={(e) => setDetails({ ...details, cvc: e.target.value })} placeholder="123" /></label></div></>}
            {(method === "Easypaisa" || method === "JazzCash") && <label>Mobile wallet number<input required inputMode="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} placeholder="03XX XXXXXXX" /></label>}
            {method === "Bank Transfer" && <div className="checkout-free"><Landmark size={22} /><div><strong>Bank transfer selected</strong><p>After confirmation, your workspace can display your bank instructions or payment reference.</p></div></div>}
            <button className="primary-button checkout-submit" disabled={processing}>{processing ? "Processing…" : `Continue with ${method}`}</button>
            <small className="checkout-disclaimer">Demo checkout UI. Connect your preferred payment gateway/backend before accepting real payments.</small>
          </form>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- */
/* Components */
/* -------------------------------- */

function StatCard({
  icon,
  label,
  value,
  change,
  positive,
  warning,
  hint,
}) {
  return (
    <div className="stat-card">

      <div className="stat-icon">
        {icon}
      </div>

      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>

        <small
          className={
            positive
              ? "positive"
              : warning
              ? "warning"
              : ""
          }
        >
          {hint ?? change}
        </small>
      </div>

    </div>
  );
}

function RiskBar({ label, value, count }) {
  return (
    <div className="risk-row">

      <div className="risk-row-top">
        <span>{label}</span>
        <strong>{count}</strong>
      </div>

      <div className="risk-progress">
        <div style={{ width: `${value}%` }} />
      </div>

    </div>
  );
}

function FeatureCard({ icon, title, text }) {
  return (
    <div className="feature-card">

      <div className="feature-icon">
        {icon}
      </div>

      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

    </div>
  );
}

function DocumentTable({
  documents,
  folders = [],
  onSelect,
  onDelete,
  onMoveDocument,
  showDelete,
}) {
  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <Files size={35} />
        <h3>No documents found</h3>
        <p>Upload a document to get started.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">

      <table>

        <thead>
          <tr>
            <th>DOCUMENT</th>
            <th>STATUS</th>
            <th>RISK</th>
            <th>DATE</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          {documents.map((doc) => (
            <tr key={doc.id}>

              <td>
                <button
                  className="document-name"
                  onClick={() => onSelect?.(doc)}
                >
                  <div className="file-icon">
                    <FileText size={18} />
                  </div>

                  <div>
                    <strong>{doc.name}</strong>
                    <span>
                      {doc.type} · {doc.size}
                    </span>
                  </div>
                </button>
              </td>

              <td>
                <StatusBadge status={doc.status} />
              </td>

              <td>
                <RiskBadge risk={doc.risk} />
              </td>

              <td>
                <span className="date">
                  {doc.date}
                </span>
              </td>

              <td>
                <div className="table-actions">
                  {folders.length > 0 && (
                    <label className="move-document-control" title="Move document to another folder">
                      <Folder size={14} />
                      <select
                        value={doc.folderId || ""}
                        onChange={(event) => onMoveDocument?.(doc.id, event.target.value)}
                        aria-label={`Move ${doc.name} to another folder`}
                      >
                        <option value="" disabled>Move to…</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {showDelete && (
                    <button
                      className="table-action danger"
                      onClick={() => onDelete?.(doc.id)}
                      aria-label={`Delete ${doc.name}`}
                      title="Delete document"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>

            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`status-badge ${status
        .toLowerCase()
        .replace(" ", "-")}`}
    >
      {status === "Analyzed" && <CheckCircle2 size={13} />}
      {status === "Processing" && <Clock3 size={13} />}
      {status === "Failed" && <AlertTriangle size={13} />}

      {status}
    </span>
  );
}

function RiskBadge({ risk }) {
  if (risk === "Pending") {
    return <span className="risk-badge pending">Pending</span>;
  }

  return (
    <span
      className={`risk-badge ${risk.toLowerCase()}`}
    >
      {risk === "Low" && <ShieldCheck size={13} />}
      {risk === "Medium" && <AlertTriangle size={13} />}
      {risk}
    </span>
  );
}

function UploadModal({
  dragging,
  setDragging,
  onFiles,
  onClose,
  fileInputRef,
}) {
  return (
    <div className="modal-backdrop">

      <div className="modal">

        <div className="modal-header">
          <div>
            <span className="card-label">
              New analysis
            </span>
            <h2>Upload document</h2>
          </div>

          <button
            className="close-button"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <div
          className={`modal-dropzone ${
            dragging ? "dragging" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
        >

          <div className="modal-upload-icon">
            <Upload size={25} />
          </div>

          <h3>Drop your file here</h3>

          <p>
            PDF, DOCX, PNG or JPG up to 25 MB
          </p>

          <button
            className="secondary-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </button>

          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            onChange={(e) => onFiles(e.target.files)}
          />

        </div>

        <div className="modal-footer">
          <span>
            Your document will be processed securely.
          </span>

          <button
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

      </div>

    </div>
  );
}

const PROCESSING_STAGE_META = {
  uploading: { label: "Uploading document", sublabel: "Securely sending the file to the analyzer" },
  reading: { label: "Reading document", sublabel: "Preparing the document for recognition" },
  extracting: { label: "Extracting text", sublabel: "Finding readable content and document regions" },
  analyzing: { label: "Analyzing document", sublabel: "Analyzing structure and relevant information" },
  structuring: { label: "Structuring information", sublabel: "Mapping detected information into structured fields" },
  completing: { label: "Preparing results", sublabel: "Finalizing the analysis response" },
  complete: { label: "Analysis complete", sublabel: "Structured results are ready" },
  error: { label: "Analysis failed", sublabel: "The analyzer returned an error" },
};

const PROCESSING_STAGES = [
  ["uploading", "Upload"],
  ["reading", "Read"],
  ["extracting", "Extract"],
  ["analyzing", "Analyze"],
  ["structuring", "Structure"],
  ["complete", "Complete"],
];

const getProcessingStageIndex = (stage) => {
  const index = PROCESSING_STAGES.findIndex(([key]) => key === stage);
  return index < 0 ? 3 : index;
};

function DocumentPreview({ file, document, stage }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const extension = getFileExtension(file?.name || document?.name || "");
  const isImage = Boolean(file && ["png", "jpg", "jpeg", "webp"].includes(extension));

  useEffect(() => {
    if (!file || !isImage) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  const fileLabel = (document?.type || extension || "FILE").toUpperCase();
  const name = file?.name || document?.name || "Document";
  const lines = [
    { width: "86%", tone: "strong" },
    { width: "68%" },
    { width: "91%" },
    { width: "57%" },
    { width: "79%" },
    { width: "64%" },
    { width: "88%" },
  ];

  return (
    <div className="ol-processing-preview" aria-label={`Preview of ${name}`}>
      <div className="ol-preview-toolbar">
        <span className="ol-preview-dot" />
        <span>{fileLabel}</span>
        <span className="ol-preview-page">{document?.pages ? `${document.pages} pages` : "Document preview"}</span>
      </div>
      <div className="ol-document-sheet">
        {previewUrl ? (
          <img src={previewUrl} alt="Uploaded document preview" className="ol-image-preview" />
        ) : (
          <>
            <div className="ol-sheet-heading">
              <span className="ol-sheet-title">{name.replace(/\.[^.]+$/, "").slice(0, 28)}</span>
              <span className="ol-sheet-mini">{fileLabel}</span>
            </div>
            <div className="ol-sheet-lines">
              {lines.map((line, index) => (
                <span key={index} className={`ol-sheet-line ${line.tone || ""}`} style={{ width: line.width }} />
              ))}
            </div>
            <div className="ol-sheet-section">IMPORTANT INFORMATION</div>
            <div className="ol-sheet-grid">
              <span /><span /><span /><span />
            </div>
            <div className="ol-sheet-lines compact">
              {lines.slice(1, 5).map((line, index) => (
                <span key={index} className="ol-sheet-line" style={{ width: `${Math.max(42, parseInt(line.width, 10) - 8)}%` }} />
              ))}
            </div>
          </>
        )}
        {!previewUrl && stage !== "complete" && stage !== "error" && (
          <div className="ol-scan-line" aria-hidden="true" />
        )}
        {!previewUrl && stage !== "error" && (
          <div className="ol-detection-highlight highlight-one" aria-hidden="true" />
        )}
        {!previewUrl && stage !== "error" && getProcessingStageIndex(stage) >= 2 && (
          <div className="ol-detection-highlight highlight-two" aria-hidden="true" />
        )}
        {!previewUrl && stage !== "error" && getProcessingStageIndex(stage) >= 3 && (
          <div className="ol-detection-highlight highlight-three" aria-hidden="true" />
        )}
      </div>
      <div className="ol-preview-footer">
        <FileText size={14} />
        <span title={name}>{name}</span>
        <strong>{document?.size || "—"}</strong>
      </div>
    </div>
  );
}

function ProcessingStages({ stage }) {
  const currentIndex = getProcessingStageIndex(stage);
  return (
    <div className="ol-processing-stages" aria-label="Document processing stages">
      {PROCESSING_STAGES.map(([key, label], index) => {
        const completed = stage === "complete" ? index < PROCESSING_STAGES.length : index < currentIndex;
        const current = key === stage || (stage === "structuring" && key === "structuring");
        return (
          <div className={`ol-stage ${completed ? "is-complete" : ""} ${current ? "is-current" : ""}`} key={key}>
            <div className="ol-stage-node">{completed ? <Check size={13} /> : <span>{String(index + 1).padStart(2, "0")}</span>}</div>
            <span>{label}</span>
            {index < PROCESSING_STAGES.length - 1 && <i />}
          </div>
        );
      })}
    </div>
  );
}

function ExtractionFields({ document, stage }) {
  const entities = Array.isArray(document?.entities) ? document.entities : [];
  const fallback = [
    ["Document type", document?.category || "Detecting…"],
    ["Important fields", stage === "complete" ? "Structured in results" : "Scanning document"],
    ["Risk signals", stage === "complete" ? (document?.risk || "Reviewed") : "Reviewing"],
  ];
  const rows = entities.length ? entities.slice(0, 6).map((entity) => [entity.label || "Field", entity.value || "Detected"]) : fallback;
  return (
    <div className="ol-extraction-list" aria-live="polite">
      {rows.map(([label, value], index) => (
        <div className="ol-extraction-row" key={`${label}-${index}`}>
          <span className="ol-extraction-check"><Check size={12} /></span>
          <div><span>{label}</span><strong>{value}</strong></div>
        </div>
      ))}
    </div>
  );
}

function DocumentProcessing({ file, document, stage = "analyzing", progress = null, statusMessage = "", error = "", onRetry, onChooseFile, onClose }) {
  const failed = stage === "error" || document?.status === "Failed";
  const complete = stage === "complete";
  const meta = PROCESSING_STAGE_META[stage] || PROCESSING_STAGE_META.analyzing;
  const hasRealProgress = Number.isFinite(Number(progress)) && Number(progress) >= 0 && Number(progress) <= 100;
  const progressValue = hasRealProgress ? Number(progress) : null;

  return (
    <div className="ol-processing-backdrop" role="dialog" aria-modal="true" aria-labelledby="ol-processing-title">
      <div className={`ol-processing-shell ${failed ? "is-error" : ""} ${complete ? "is-complete" : ""}`}>
        <div className="ol-processing-header">
          <div className="ol-processing-brand">
            <span className="ol-processing-orbit"><Sparkles size={15} /></span>
            <div><span>OPEN LEDGER DOCS</span><strong>AI DOCUMENT ANALYSIS</strong></div>
          </div>
          {onClose && !complete && <button className="ol-processing-close" onClick={onClose} aria-label="Close processing view"><X size={18} /></button>}
        </div>

        <div className="ol-processing-title-row">
          <div>
            <span className="ol-processing-eyebrow">{failed ? "ANALYSIS INTERRUPTED" : complete ? "ANALYSIS COMPLETE" : "UNDERSTANDING YOUR DOCUMENT"}</span>
            <h2 id="ol-processing-title">{failed ? "Something went wrong while analyzing this document" : complete ? "Your document is ready" : meta.label}</h2>
            <p aria-live="polite">{error || statusMessage || meta.sublabel}</p>
          </div>
          <div className={`ol-ai-status ${failed ? "error" : complete ? "complete" : ""}`} aria-hidden="true">
            {failed ? <AlertTriangle size={18} /> : complete ? <Check size={18} /> : <span className="ol-ai-pulse"><Sparkles size={16} /></span>}
            <span>{failed ? "Needs attention" : complete ? "Ready" : "Active"}</span>
          </div>
        </div>

        <div className="ol-processing-body">
          <div className="ol-preview-column">
            <DocumentPreview file={file} document={document} stage={stage} />
          </div>
          <div className="ol-analysis-column">
            <ProcessingStages stage={stage} />
            <div className="ol-live-analysis">
              <div className="ol-live-heading"><span className="ol-live-dot" /> <span>{meta.sublabel}</span></div>
              {complete ? (
                <div className="ol-complete-card"><CheckCircle2 size={20} /><div><strong>Analysis complete</strong><span>Structured information is now available in the results.</span></div></div>
              ) : failed ? (
                <div className="ol-error-card"><AlertTriangle size={20} /><div><strong>Analysis could not be completed</strong><span>{error || document?.summary || "The backend returned an error."}</span></div></div>
              ) : (
                <>
                  <ExtractionFields document={document} stage={stage} />
                  <div className="ol-progress-wrap" aria-label={progressValue == null ? "Analysis progress is indeterminate" : `Analysis progress ${progressValue}%`}>
                    <div className="ol-progress-top"><span>{statusMessage || meta.label}</span><strong>{progressValue == null ? "Working" : `${Math.round(progressValue)}%`}</strong></div>
                    <div className={`ol-progress-track ${progressValue == null ? "indeterminate" : ""}`}>
                      {progressValue != null && <span style={{ width: `${progressValue}%` }} />}
                    </div>
                    {progressValue == null && <small>Progress is controlled by the document-analysis service.</small>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="ol-processing-footer">
          <div className="ol-processing-assurance"><ShieldCheck size={15} /><span>Secure document processing</span><span>•</span><span>No fake progress</span></div>
          {failed && (
            <div className="ol-processing-actions">
              {onChooseFile && <button className="secondary-button" onClick={onChooseFile}>Choose another file</button>}
              {onRetry && document?.file && <button className="primary-button" onClick={() => onRetry(document)}><Activity size={15} /> Try again</button>}
            </div>
          )}
        </div>
        <div className="sr-only" aria-live="assertive">{error || meta.label}</div>
      </div>
    </div>
  );
}

function DocumentModal({
  document,
  onClose,
  onDelete,
  onRetry,
  onOpenExcelBuilder,
}) {
  const tags = document.tags || [];
  const entities = document.entities || [];
  const findings = document.findings || [];
  const isProcessing = document.status === "Processing";
  const isFailed = document.status === "Failed";

  return (
    <div className="modal-backdrop">

      <div className="modal document-modal">

        <div className="modal-header">

          <div className="document-modal-title">

            <div className="large-file-icon">
              <FileText size={23} />
            </div>

            <div>
              <span className="card-label">
                Document details
              </span>

              <h2>{document.name}</h2>
            </div>

          </div>

          <button
            className="close-button"
            onClick={onClose}
          >
            <X size={19} />
          </button>

        </div>

        {isFailed && (
          <div className="analysis-banner failed">
            <AlertTriangle size={18} />
            <div>
              <strong>Analysis failed</strong>
              <p>{document.summary}</p>
            </div>
            {onRetry && document.file && (
              <button
                className="secondary-button"
                onClick={() => onRetry(document)}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="analysis-banner processing">
            <Clock3 size={18} />
            <div>
              <strong>Analyzing…</strong>
              <p>{document.summary}</p>
            </div>
          </div>
        )}

        {/* Core file details */}
        <div className="detail-grid detail-grid-wide">

          <DetailItem
            label="File type"
            value={document.type}
          />

          <DetailItem
            label="File size"
            value={document.size}
          />

          <DetailItem
            label="Status"
            value={document.status}
          />

          <DetailItem
            label="Risk level"
            value={document.risk}
          />

          <DetailItem
            label="Pages"
            value={document.pages ?? "—"}
          />

          <DetailItem
            label="Word count"
            value={document.wordCount != null ? document.wordCount.toLocaleString() : "—"}
          />

          <DetailItem
            label="Confidence"
            value={document.confidence != null ? `${document.confidence}%` : "—"}
          />

          <DetailItem
            label="Language"
            value={document.language || "—"}
          />

          <DetailItem
            label="Uploaded by"
            value={document.uploadedBy || "—"}
          />

          <DetailItem
            label="Uploaded"
            value={document.date}
          />

        </div>

        {/* Document type — what kind of document this is, in plain language */}
        {document.category && (
          <div className="modal-section">
            <div className="modal-section-title">
              <BookOpen size={13} />
              Document type
            </div>

            <div className="doc-type-card">
              <span className="doc-type-name">{document.category}</span>
              <p>{document.categoryDescription}</p>
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="modal-section">
            <div className="modal-section-title">
              <Tag size={13} />
              Tags
            </div>

            <div className="tag-list">
              {tags.map((tag) => (
                <span className="tag-chip" key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* AI summary */}
        <div className="ai-preview">

          <div className="ai-preview-icon">
            <Sparkles size={18} />
          </div>

          <div>
            <strong>AI Summary</strong>
            <p>{document.summary || "AI-generated insights will appear here after the backend analyzer is connected."}</p>
          </div>

        </div>

        {/* Extracted entities */}
        <div className="modal-section">
          <div className="modal-section-title">
            <Layers size={13} />
            Extracted fields
          </div>

          {entities.length > 0 ? (
            <div className="entity-list">
              {entities.map((entity) => (
                <div className="entity-row" key={entity.label}>
                  <span>{entity.label}</span>
                  <strong>{entity.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-note">
              No structured fields extracted yet.
            </div>
          )}
        </div>

        {/* Risk findings */}
        <div className="modal-section">
          <div className="modal-section-title">
            <ShieldCheck size={13} />
            Risk findings
          </div>

          {findings.length > 0 ? (
            <div className="finding-list">
              {findings.map((finding, index) => (
                <div
                  className={`finding-row ${finding.level.toLowerCase()}`}
                  key={index}
                >
                  {finding.level === "High" ? (
                    <AlertTriangle size={15} />
                  ) : (
                    <ShieldCheck size={15} />
                  )}
                  <span>{finding.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-note">
              No risk findings recorded for this document.
            </div>
          )}
        </div>

        <div className="modal-footer">

          <button
            className="danger-button"
            onClick={() => onDelete(document.id)}
          >
            <Trash2 size={16} />
            Delete
          </button>

          <div className="modal-footer-actions">
            <button
              className="secondary-button"
              onClick={() => onOpenExcelBuilder?.(document)}
              disabled={isProcessing || document.status !== "Analyzed"}
            >
              <Download size={16} />
              Export Excel
            </button>

            <button
              className="primary-button"
              onClick={onClose}
            >
              Close
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}


/* -------------------------------- */
/* Professional Excel Export Builder */
/* -------------------------------- */

const EXCEL_EXPORT_HISTORY_KEY = "docusense.excel-export-history.v1";

const EXCEL_THEMES = {
  executive: {
    id: "executive",
    name: "Executive",
    description: "Board-ready reporting with strong hierarchy and polished summaries.",
    style: "Executive reporting",
    accent: "#5B21B6",
    header: "#5B21B6",
    soft: "#F3EEFF",
    text: "#251B3A",
    recommendedFor: ["general", "report", "executive"],
    worksheets: 2,
  },
  corporate: {
    id: "corporate",
    name: "Corporate",
    description: "Clean business reporting designed for teams and recurring reviews.",
    style: "Business standard",
    accent: "#2563EB",
    header: "#1D4ED8",
    soft: "#EFF6FF",
    text: "#172554",
    recommendedFor: ["business", "general", "document"],
    worksheets: 2,
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Simple white sheets, subtle borders and restrained formatting.",
    style: "Minimal",
    accent: "#475569",
    header: "#334155",
    soft: "#F8FAFC",
    text: "#0F172A",
    recommendedFor: ["general"],
    worksheets: 1,
  },
  hr: {
    id: "hr",
    name: "HR Recruitment",
    description: "Structured candidate reporting for CVs, skills and hiring reviews.",
    style: "Recruitment",
    accent: "#0F766E",
    header: "#0F766E",
    soft: "#ECFDF5",
    text: "#134E4A",
    recommendedFor: ["resume", "cv", "hr", "candidate"],
    worksheets: 3,
  },
  legal: {
    id: "legal",
    name: "Legal Contract",
    description: "Contract-focused reporting for dates, clauses, parties and risk review.",
    style: "Legal review",
    accent: "#7C2D12",
    header: "#7C2D12",
    soft: "#FFF7ED",
    text: "#431407",
    recommendedFor: ["contract", "legal", "nda", "agreement", "employment"],
    worksheets: 3,
  },
  invoice: {
    id: "invoice",
    name: "Open Ledger Docs Invoice",
    description: "Invoice-ready reporting with billing totals, payment status, customer details and line-item fields.",
    style: "Invoice reporting",
    accent: "#047857",
    header: "#047857",
    soft: "#ECFDF5",
    text: "#064E3B",
    recommendedFor: ["invoice", "invoices", "bill", "billing", "receipt", "payment", "amount", "total"],
    worksheets: 3,
  },
  finance: {
    id: "finance",
    name: "Finance",
    description: "Financial document reporting with clear totals, dates and payment status.",
    style: "Financial reporting",
    accent: "#166534",
    header: "#166534",
    soft: "#F0FDF4",
    text: "#14532D",
    recommendedFor: ["finance", "financial", "accounting", "ledger"],
    worksheets: 3,
  },
  tax: {
    id: "tax",
    name: "Tax & Billing",
    description: "Structured tax and billing reports with totals, tax values and payment tracking.",
    style: "Tax reporting",
    accent: "#0F766E",
    header: "#115E59",
    soft: "#F0FDFA",
    text: "#134E4A",
    recommendedFor: ["tax", "vat", "gst", "billing", "payment"],
    worksheets: 3,
  },
  medical: {
    id: "medical",
    name: "Medical Records",
    description: "Clean structured exports for patient, visit, diagnosis and record-oriented datasets.",
    style: "Medical reporting",
    accent: "#0369A1",
    header: "#0369A1",
    soft: "#E0F2FE",
    text: "#0C4A6E",
    recommendedFor: ["medical", "patient", "diagnosis", "clinical", "hospital"],
    worksheets: 2,
  },
  startup: {
    id: "startup",
    name: "Startup Dashboard",
    description: "Modern KPI-oriented reporting for startups, operations and business datasets.",
    style: "Startup analytics",
    accent: "#C2410C",
    header: "#EA580C",
    soft: "#FFF7ED",
    text: "#431407",
    recommendedFor: ["startup", "kpi", "sales", "growth", "business"],
    worksheets: 3,
  },
  dark: {
    id: "dark",
    name: "Modern Dark",
    description: "A premium dark workspace style for analytical exports and presentations.",
    style: "Dark premium",
    accent: "#7C3AED",
    header: "#18181B",
    soft: "#27272A",
    text: "#F4F4F5",
    recommendedFor: ["analytics", "dashboard"],
    worksheets: 2,
  },
  analytics: {
    id: "analytics",
    name: "Analytics",
    description: "Dataset-first reporting with strong table structure and analysis sheets.",
    style: "Data analytics",
    accent: "#4338CA",
    header: "#3730A3",
    soft: "#EEF2FF",
    text: "#1E1B4B",
    recommendedFor: ["analytics", "dataset", "data"],
    worksheets: 3,
  },
  modern: { id: "modern", name: "Modern", description: "Contemporary SaaS reporting with clean hierarchy.", style: "Modern", accent: "#0EA5E9", header: "#2563EB", soft: "#EFF6FF", text: "#172554", recommendedFor: ["cv", "candidate", "general"], worksheets: 4 },
  recruitment: { id: "recruitment", name: "Recruitment", description: "HR-ready candidate reporting and screening review.", style: "Recruitment", accent: "#14B8A6", header: "#0F766E", soft: "#ECFDF5", text: "#134E4A", recommendedFor: ["cv", "resume", "candidate", "hr"], worksheets: 8 },
  professional: { id: "professional", name: "Professional", description: "Balanced professional reporting for HR and management.", style: "Professional", accent: "#3B82F6", header: "#1E3A8A", soft: "#EFF6FF", text: "#172554", recommendedFor: ["cv", "candidate", "business"], worksheets: 8 },
  clean: { id: "clean", name: "Clean", description: "Lightweight report design with restrained visual styling.", style: "Clean", accent: "#94A3B8", header: "#475569", soft: "#F1F5F9", text: "#0F172A", recommendedFor: ["general", "cv"], worksheets: 5 },
  blue: { id: "blue", name: "Blue", description: "Clear blue business reporting theme.", style: "Blue", accent: "#0284C7", header: "#0369A1", soft: "#E0F2FE", text: "#082F49", recommendedFor: ["business", "cv"], worksheets: 6 },
  green: { id: "green", name: "Green", description: "Fresh green professional reporting theme.", style: "Green", accent: "#16A34A", header: "#166534", soft: "#F0FDF4", text: "#14532D", recommendedFor: ["hr", "cv", "business"], worksheets: 6 },
  monochrome: { id: "monochrome", name: "Monochrome", description: "High-contrast black and white report styling.", style: "Monochrome", accent: "#52525B", header: "#18181B", soft: "#F4F4F5", text: "#18181B", recommendedFor: ["executive", "general"], worksheets: 6 },
};

function normalizeExportKey(value, fallback = "field") {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 70);
  return key || fallback;
}

function formatExportLabel(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim() || "Field";
}

function flattenExportValue(value) {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => flattenExportValue(item))
      .filter((item) => item !== "")
      .join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${formatExportLabel(key)}: ${flattenExportValue(item)}`)
      .join(" · ");
  }
  return value;
}

function normalizeExportData(documents = []) {
  const sourceDocuments = Array.isArray(documents) ? documents.filter(Boolean) : [];
  const rows = [];
  const columnMap = new Map();

  const addColumn = (key, label, sample, priority = 100) => {
    if (!columnMap.has(key)) {
      columnMap.set(key, {
        key,
        label,
        type: detectExportType(key, sample),
        priority,
      });
    } else {
      const current = columnMap.get(key);
      if (current.type === "text" && sample != null && sample !== "") {
        current.type = detectExportType(key, sample);
      }
    }
  };

  sourceDocuments.forEach((doc) => {
    const row = {};
    const baseFields = [
      ["name", "Name", doc.name, 10],
      ["type", "Type", doc.type, 20],
      ["status", "Status", doc.status, 30],
      ["risk", "Risk", doc.risk, 35],
      ["category", "Category", doc.category, 40],
      ["confidence", "Confidence", doc.confidence, 50],
      ["pages", "Pages", doc.pages, 60],
      ["wordCount", "Words", doc.wordCount, 70],
      ["language", "Language", doc.language, 80],
      ["tags", "Tags", (doc.tags || []).join(", "), 90],
      ["summary", "Summary", doc.summary, 95],
      [
        "findings",
        "Findings",
        (doc.findings || []).map((item) => item?.text).filter(Boolean).join(" | "),
        96,
      ],
    ];

    baseFields.forEach(([key, label, value, priority]) => {
      row[key] = value ?? "";
      addColumn(key, label, value, priority);
    });

    const entities = normalizeEntities(
      doc.entities ?? doc.extracted_fields ?? doc.extractedFields ?? doc.fields
    );

    entities.forEach((entity, index) => {
      const baseKey = normalizeExportKey(entity.label, `field_${index + 1}`);
      let key = baseKey;
      let suffix = 2;
      while (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== flattenExportValue(entity.value)) {
        key = `${baseKey}_${suffix}`;
        suffix += 1;
      }
      const label = formatExportLabel(entity.label);
      const value = flattenExportValue(entity.value);
      row[key] = value;
      addColumn(key, label, value, 110 + index);
    });

    row.__sourceFilename = doc.name || "";
    row.__analysisTimestamp = doc.analyzedAt || doc.uploadedAt || "";
    row.__documentDate = doc.date || "";
    addColumn("__sourceFilename", "Source Filename", row.__sourceFilename, 1000);
    addColumn("__documentDate", "Document Date", row.__documentDate, 1001);
    addColumn("__analysisTimestamp", "Analysis Timestamp", row.__analysisTimestamp, 1002);

    rows.push(row);
  });

  const columns = [...columnMap.values()].sort(
    (a, b) => a.priority - b.priority || a.label.localeCompare(b.label)
  );

  return { rows, columns };
}

function detectExportType(key, sample) {
  const normalizedKey = String(key || "").toLowerCase();
  const value = String(sample ?? "").trim();

  if (!value) return "text";
  if (normalizedKey.includes("email") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email";
  if (
    normalizedKey.includes("url") ||
    normalizedKey.includes("website") ||
    /^https?:\/\//i.test(value)
  ) return "url";
  if (
    normalizedKey.includes("date") ||
    normalizedKey.includes("expiry") ||
    normalizedKey.includes("effective") ||
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(value)
  ) return "date";
  if (
    normalizedKey.includes("percent") ||
    normalizedKey.includes("percentage") ||
    normalizedKey.includes("confidence") ||
    normalizedKey.includes("score") ||
    /%$/.test(value)
  ) return "percentage";
  if (
    normalizedKey.includes("amount") ||
    normalizedKey.includes("total") ||
    normalizedKey.includes("tax") ||
    normalizedKey.includes("salary") ||
    normalizedKey.includes("price") ||
    normalizedKey.includes("cost") ||
    normalizedKey.includes("revenue")
  ) return "currency";
  if (/^-?\d+(?:\.\d+)?$/.test(value.replace(/,/g, ""))) return "number";
  if (/^(true|false|yes|no)$/i.test(value)) return "boolean";
  return "text";
}

function getRecommendedExcelTheme(documents = []) {
  const sourceDocuments = Array.isArray(documents) ? documents.filter(Boolean) : [];
  const corpus = sourceDocuments
    .map((doc) =>
      [
        doc?.category,
        doc?.type,
        doc?.name,
        doc?.summary,
        ...(doc?.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
    )
    .join(" ");

  // Invoice documents get the dedicated Open Ledger Docs Invoice workbook instead of
  // the generic Finance theme. This keeps imports/exports visually aligned
  // with the invoice experience already used by the app.
  const invoiceDetected = sourceDocuments.some((doc) => {
    const value = [
      doc?.category,
      doc?.type,
      doc?.name,
      ...(doc?.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return /invoice|bill|billing|receipt|payment/.test(value);
  });

  if (invoiceDetected) return "invoice";

  const scores = Object.values(EXCEL_THEMES).map((theme) => ({
    id: theme.id,
    score: theme.recommendedFor.reduce(
      (score, token) => score + (corpus.includes(token) ? 1 : 0),
      0
    ),
  }));

  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score ? scores[0].id : "executive";
}

function getExcelMainSheetName(themeId) {
  if (themeId === "hr") return "Candidates";
  if (themeId === "legal") return "Contracts";
  if (themeId === "invoice" || themeId === "finance" || themeId === "tax") return "Invoices";
  if (themeId === "analytics") return "Dataset";
  return "Documents";
}

function createExcelWorksheets(themeId, columns) {
  const mainName = getExcelMainSheetName(themeId);
  const hasFindings = columns.some((column) =>
    ["risk", "findings"].includes(column.key)
  );
  const hasSkills = columns.some((column) =>
    /skill|experience|education|role/i.test(`${column.key} ${column.label}`)
  );

  return [
    { id: `sheet-${Date.now()}-main`, name: mainName, type: "data", enabled: true },
    { id: `sheet-${Date.now()}-summary`, name: "Summary", type: "summary", enabled: true },
    ...(hasSkills
      ? [{ id: `sheet-${Date.now()}-skills`, name: "Skills Analysis", type: "skills", enabled: false }]
      : []),
    ...(hasFindings
      ? [{ id: `sheet-${Date.now()}-findings`, name: "Findings", type: "findings", enabled: false }]
      : []),
  ];
}

function readExcelHistory() {
  return loadPersistedJSON(EXCEL_EXPORT_HISTORY_KEY, []);
}

function safeExcelFilename(filename) {
  const clean = String(filename || "Open Ledger Docs_Export")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.xlsx$/i, "");
  return `${clean || "Open Ledger Docs_Export"}.xlsx`;
}

function triggerBlobDownload(blob, filename) {
  if (!(blob instanceof Blob)) return;
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

function formatPreviewValue(value, type) {
  if (value == null || value === "") return "—";
  if (type === "percentage") {
    const numeric = Number(String(value).replace("%", "").replace(/,/g, ""));
    return Number.isFinite(numeric) ? `${numeric}%` : String(value);
  }
  if (type === "currency") {
    const numeric = Number(String(value).replace(/[$€£₨,\s]/g, ""));
    return Number.isFinite(numeric)
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2,
        }).format(numeric)
      : String(value);
  }
  if (type === "number") {
    const numeric = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
  }
  if (type === "boolean") return String(value).toLowerCase() === "true" ? "Yes" : String(value);
  if (type === "date") {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
  }
  return String(value);
}

function buildExcelSummary(documents = []) {
  const analyzed = documents.filter((doc) => doc?.status === "Analyzed");
  const categoryCounts = {};
  const riskCounts = { High: 0, Medium: 0, Low: 0 };
  let confidenceTotal = 0;
  let confidenceCount = 0;

  analyzed.forEach((doc) => {
    const category = doc.category || doc.type || "General";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    if (riskCounts[doc.risk] != null) riskCounts[doc.risk] += 1;
    const confidence = Number(doc.confidence);
    if (Number.isFinite(confidence)) {
      confidenceTotal += confidence;
      confidenceCount += 1;
    }
  });

  return {
    documentsAnalyzed: analyzed.length,
    successfulExtractions: analyzed.filter((doc) => Array.isArray(doc.entities) && doc.entities.length > 0).length,
    averageConfidence: confidenceCount ? Math.round(confidenceTotal / confidenceCount) : 0,
    highRiskDocuments: riskCounts.High,
    categoryCounts,
    riskCounts,
  };
}

function ExcelThemeCard({ theme, selected, recommended, onSelect }) {
  return (
    <button
      type="button"
      className={`excel-theme-card ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect(theme.id)}
      aria-pressed={selected}
    >
      <div
        className="excel-theme-mini"
        style={{
          "--excel-theme-header": theme.header,
          "--excel-theme-soft": theme.soft,
          "--excel-theme-text": theme.text,
        }}
      >
        <div className="excel-theme-mini-row header">
          <span>Name</span><span>Score</span>
        </div>
        <div className="excel-theme-mini-row"><span>Ali Khan</span><b>92</b></div>
        <div className="excel-theme-mini-row"><span>Ahmed</span><b>84</b></div>
        <div className="excel-theme-mini-row"><span>Jordan</span><b>88</b></div>
      </div>
      <div className="excel-theme-card-copy">
        <div>
          <strong>{theme.name}</strong>
          {recommended && <span className="excel-recommended">Recommended</span>}
        </div>
        <p>{theme.description}</p>
        <div className="excel-theme-meta">
          <span>{theme.style}</span>
          <span>{theme.worksheets} sheets</span>
        </div>
      </div>
      <span className="excel-theme-radio">{selected ? <Check size={13} /> : ""}</span>
    </button>
  );
}

function ExcelPreview({
  rows,
  columns,
  theme,
  sheet,
  search,
  onSearch,
  settings,
  summary,
}) {
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      columns.some((column) =>
        String(formatPreviewValue(row[column.key], column.type))
          .toLowerCase()
          .includes(query)
      )
    );
  }, [rows, columns, search]);

  const previewRows = filteredRows.slice(0, 100);
  const isSummary = sheet?.type === "summary";

  return (
    <section className="excel-preview-panel">
      <div className="excel-preview-head">
        <div>
          <span className="card-label">LIVE SPREADSHEET</span>
          <h2>{sheet?.name || "Documents"}</h2>
          <p>
            {isSummary
              ? "A generated executive overview based on the analyzed dataset."
              : "Previewing the same normalized fields that will be sent to the export service."}
          </p>
        </div>
        <div className="excel-preview-controls">
          <div className="excel-preview-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search data..."
              aria-label="Search spreadsheet preview"
            />
          </div>
        </div>
      </div>

      <div className="excel-preview-status">
        <span><b>{isSummary ? summary.documentsAnalyzed : filteredRows.length}</b> rows</span>
        <span><b>{isSummary ? 2 : columns.length}</b> columns</span>
        <span><CheckCircle2 size={14} /> {settings.freezeHeader ? "Frozen header" : "Header not frozen"}</span>
        <span>{settings.autoFilter ? "Filters enabled" : "Filters off"}</span>
      </div>

      {isSummary ? (
        <div className="excel-summary-preview">
          <div className="excel-summary-brand">
            <span>OPEN LEDGER DOCS AI</span>
            <strong>Document Analysis Report</strong>
          </div>
          <div className="excel-summary-kpis">
            <div><span>Documents Analyzed</span><strong>{summary.documentsAnalyzed}</strong></div>
            <div><span>Successful Extractions</span><strong>{summary.successfulExtractions}</strong></div>
            <div><span>Average Confidence</span><strong>{summary.averageConfidence}%</strong></div>
            <div><span>High Risk Documents</span><strong>{summary.highRiskDocuments}</strong></div>
          </div>
          <div className="excel-summary-category-list">
            {Object.entries(summary.categoryCounts).slice(0, 8).map(([category, count]) => (
              <div key={category}><span>{category}</span><b>{count}</b></div>
            ))}
          </div>
        </div>
      ) : (
        <div className="excel-spreadsheet-wrap">
          <table className="excel-spreadsheet">
            <thead>
              <tr>
                <th className="excel-row-number-head">#</th>
                {columns.map((column, index) => (
                  <th key={column.key} title={column.label}>
                    <span className="excel-col-letter">
                      {String.fromCharCode(65 + (index % 26))}
                    </span>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.length ? (
                previewRows.map((row, rowIndex) => (
                  <tr key={`${row.__sourceFilename || "row"}-${rowIndex}`}>
                    <td className="excel-row-number">{rowIndex + 1}</td>
                    {columns.map((column) => (
                      <td key={column.key} title={String(row[column.key] ?? "")}>
                        {formatPreviewValue(row[column.key], column.type)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="excel-empty-preview" colSpan={Math.max(columns.length + 1, 2)}>
                    No rows match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="excel-preview-foot">
        <span>
          {search
            ? `Showing ${previewRows.length} of ${rows.length} matching rows`
            : `Showing ${Math.min(previewRows.length, 100)} of ${rows.length} rows`}
        </span>
        {rows.length > 100 && !search && <span>Previewing first 100 rows</span>}
      </div>
    </section>
  );
}

function ExcelColumnManager({ columns, onChange }) {
  const [editingKey, setEditingKey] = useState(null);
  const [dragKey, setDragKey] = useState(null);

  const moveColumn = (fromKey, toKey) => {
    if (!fromKey || !toKey || fromKey === toKey) return;
    const current = [...columns];
    const fromIndex = current.findIndex((column) => column.key === fromKey);
    const toIndex = current.findIndex((column) => column.key === toKey);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    onChange(current);
  };

  const toggleColumn = (key) => {
    onChange(columns.map((column) => (
      column.key === key ? { ...column, enabled: !column.enabled } : column
    )));
  };

  const renameColumn = (key, label) => {
    onChange(columns.map((column) => (
      column.key === key ? { ...column, label: label.trim() || column.label } : column
    )));
    setEditingKey(null);
  };

  const resetColumns = () => {
    onChange(columns.map((column) => ({
      ...column,
      enabled: true,
      label: column.defaultLabel || column.label,
    })));
  };

  return (
    <section className="excel-config-section">
      <div className="excel-config-section-head">
        <div>
          <span className="card-label">COLUMNS</span>
          <h3>Choose exported fields</h3>
        </div>
        <button type="button" className="excel-text-button" onClick={resetColumns}>
          Reset
        </button>
      </div>
      <div className="excel-column-list">
        {columns.map((column) => (
          <div
            key={column.key}
            className={`excel-column-row ${column.enabled ? "is-enabled" : ""}`}
            draggable
            onDragStart={() => setDragKey(column.key)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              moveColumn(dragKey, column.key);
              setDragKey(null);
            }}
          >
            <span className="excel-drag-handle" title="Drag to reorder" aria-hidden="true">☰</span>
            <button
              type="button"
              className={`excel-checkbox ${column.enabled ? "checked" : ""}`}
              onClick={() => toggleColumn(column.key)}
              aria-label={`${column.enabled ? "Disable" : "Enable"} ${column.label}`}
              aria-pressed={column.enabled}
            >
              {column.enabled ? <Check size={12} /> : ""}
            </button>
            <div className="excel-column-name">
              {editingKey === column.key ? (
                <input
                  autoFocus
                  defaultValue={column.label}
                  onBlur={(event) => renameColumn(column.key, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") renameColumn(column.key, event.currentTarget.value);
                    if (event.key === "Escape") setEditingKey(null);
                  }}
                  aria-label={`Rename ${column.label}`}
                />
              ) : (
                <>
                  <strong>{column.label}</strong>
                  <small>{column.type}</small>
                </>
              )}
            </div>
            <button
              type="button"
              className="excel-icon-button"
              onClick={() => setEditingKey(column.key)}
              aria-label={`Rename ${column.label}`}
              title="Rename column"
            >
              <Pencil size={13} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExcelWorksheetManager({ worksheets, onChange }) {
  const [editingId, setEditingId] = useState(null);

  const updateSheet = (id, patch) => {
    onChange(worksheets.map((sheet) => (
      sheet.id === id ? { ...sheet, ...patch } : sheet
    )));
  };

  const removeSheet = (id) => {
    if (worksheets.filter((sheet) => sheet.enabled).length <= 1) return;
    onChange(worksheets.filter((sheet) => sheet.id !== id));
  };

  const addSheet = () => {
    const id = `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    onChange([
      ...worksheets,
      { id, name: `Sheet ${worksheets.length + 1}`, type: "data", enabled: true },
    ]);
    setEditingId(id);
  };

  const moveSheet = (id, direction) => {
    const index = worksheets.findIndex((sheet) => sheet.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= worksheets.length) return;
    const updated = [...worksheets];
    const [moved] = updated.splice(index, 1);
    updated.splice(next, 0, moved);
    onChange(updated);
  };

  return (
    <section className="excel-config-section">
      <div className="excel-config-section-head">
        <div>
          <span className="card-label">WORKSHEETS</span>
          <h3>Build your workbook</h3>
        </div>
        <button type="button" className="excel-text-button" onClick={addSheet}>
          <Plus size={13} /> Add sheet
        </button>
      </div>

      <div className="excel-sheet-list">
        {worksheets.map((sheet, index) => (
          <div className={`excel-sheet-row ${sheet.enabled ? "is-enabled" : ""}`} key={sheet.id}>
            <button
              type="button"
              className={`excel-checkbox ${sheet.enabled ? "checked" : ""}`}
              onClick={() => updateSheet(sheet.id, { enabled: !sheet.enabled })}
              aria-pressed={sheet.enabled}
              aria-label={`${sheet.enabled ? "Disable" : "Enable"} ${sheet.name}`}
            >
              {sheet.enabled ? <Check size={12} /> : ""}
            </button>
            <div className="excel-sheet-name">
              {editingId === sheet.id ? (
                <input
                  autoFocus
                  value={sheet.name}
                  onChange={(event) => updateSheet(sheet.id, { name: event.target.value.slice(0, 31) })}
                  onBlur={() => setEditingId(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") setEditingId(null);
                    if (event.key === "Escape") setEditingId(null);
                  }}
                  aria-label="Worksheet name"
                />
              ) : (
                <>
                  <strong>{sheet.name}</strong>
                  <small>{sheet.type === "summary" ? "Generated summary" : "Data sheet"}</small>
                </>
              )}
            </div>
            <button type="button" className="excel-icon-button" onClick={() => setEditingId(sheet.id)} aria-label={`Rename ${sheet.name}`}>
              <Pencil size={13} />
            </button>
            <button type="button" className="excel-icon-button" onClick={() => moveSheet(sheet.id, -1)} disabled={index === 0} aria-label="Move worksheet up">↑</button>
            <button type="button" className="excel-icon-button" onClick={() => moveSheet(sheet.id, 1)} disabled={index === worksheets.length - 1} aria-label="Move worksheet down">↓</button>
            <button type="button" className="excel-icon-button danger" onClick={() => removeSheet(sheet.id)} disabled={worksheets.length <= 1} aria-label={`Remove ${sheet.name}`}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExcelExportSettings({ settings, onChange, filename, onFilenameChange }) {
  const toggles = [
    ["freezeHeader", "Freeze top row", "Keep the header visible while scrolling."],
    ["autoFilter", "Auto filter", "Add spreadsheet filters to the data header."],
    ["autoWidth", "Auto column width", "Size columns from their exported content."],
    ["borders", "Borders", "Use restrained borders for table structure."],
    ["alternatingRows", "Alternating rows", "Add subtle zebra striping for readability."],
    ["conditionalFormatting", "Conditional formatting", "Highlight common risk and numeric fields."],
    ["includeFilename", "Include source filename", "Keep the original analyzed file name in the export."],
    ["includeConfidence", "Include extraction confidence", "Include confidence metadata when available."],
    ["includeTimestamp", "Include analysis timestamp", "Include the analysis time for traceability."],
    ["includeDocumentDate", "Include document date", "Include the document date when available."],
    ["includeSummaryCharts", "Add summary charts", "Ask the backend to include summary charts when supported."],
  ];

  return (
    <section className="excel-config-section">
      <div className="excel-config-section-head">
        <div>
          <span className="card-label">EXPORT SETTINGS</span>
          <h3>Formatting & traceability</h3>
        </div>
      </div>

      <div className="excel-setting-grid">
        {toggles.map(([key, title, description]) => (
          <label className="excel-setting-toggle" key={key}>
            <input
              type="checkbox"
              checked={Boolean(settings[key])}
              onChange={(event) => onChange({ ...settings, [key]: event.target.checked })}
            />
            <span className="excel-toggle-visual" />
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
          </label>
        ))}
      </div>

      <div className="excel-filename-field">
        <label htmlFor="excel-filename">Filename</label>
        <div>
          <input
            id="excel-filename"
            value={filename}
            onChange={(event) => onFilenameChange(event.target.value)}
            placeholder="Open Ledger Docs_Export"
          />
          <span>.xlsx</span>
        </div>
      </div>
    </section>
  );
}


function excelReportProfile(normalized = { rows: [], columns: [] }, documents = []) {
  const rows = Array.isArray(normalized.rows) ? normalized.rows : [];
  const columns = (normalized.columns || []).map((column) => {
    const values = rows.map((row) => row[column.key]).filter((value) => value !== "" && value != null);
    const unique = new Set(values.map((value) => String(value))).size;
    const missing = Math.max(0, rows.length - values.length);
    const type = detectExportType(column.key, values[0]);
    return {
      ...column,
      type,
      sample: values.slice(0, 3),
      unique,
      missing,
      fillRate: rows.length ? Math.round(((rows.length - missing) / rows.length) * 100) : 0,
    };
  });

  const numeric = columns.filter((column) => ["number", "currency", "percentage"].includes(column.type));
  const dates = columns.filter((column) => column.type === "date");
  const categories = columns.filter((column) => {
    if (!['text', 'email'].includes(column.type)) return false;
    return column.unique > 1 && column.unique <= Math.max(30, Math.min(rows.length * 0.5, 50));
  });
  const urls = columns.filter((column) => column.type === "url");
  const emails = columns.filter((column) => column.type === "email");
  const corpus = columns.map((column) => `${column.key} ${column.label}`).join(" ").toLowerCase();
  const cvMode = /candidate|resume|cv|skills|education|experience|certification|projects/.test(corpus) || documents.some((doc) => /resume|cv|candidate|hr/i.test(`${doc?.category || ""} ${doc?.type || ""}`));
  const salesMode = /revenue|sales|orders?|product|quantity|region|customer|profit|growth/.test(corpus);
  const invoiceMode = /invoice|payment|billing|tax|amount|total|client/.test(corpus);

  const numericTotals = numeric.map((column) => {
    const values = rows.map((row) => Number(String(row[column.key] ?? "").replace(/[^0-9.-]/g, ""))).filter(Number.isFinite);
    const total = values.reduce((sum, value) => sum + value, 0);
    const average = values.length ? total / values.length : 0;
    return { column, total, average, values };
  });

  const suggestedKpis = [
    { id: "records", title: "Total Records", formula: `=COUNTA('Main Data'!A2:A${Math.max(2, rows.length + 1)})`, value: rows.length, sourceColumn: columns[0]?.key || "" },
  ];
  const bestCurrency = numericTotals.find((item) => item.column.type === "currency");
  if (bestCurrency) {
    suggestedKpis.push({ id: "total-value", title: `Total ${bestCurrency.column.label}`, formula: `=SUM('Main Data'!${excelColumnLetter(columns.indexOf(bestCurrency.column) + 1)}2:${excelColumnLetter(columns.indexOf(bestCurrency.column) + 1)}${Math.max(2, rows.length + 1)})`, value: bestCurrency.total, sourceColumn: bestCurrency.column.key, format: "currency" });
    suggestedKpis.push({ id: "average-value", title: `Average ${bestCurrency.column.label}`, formula: `=AVERAGE('Main Data'!${excelColumnLetter(columns.indexOf(bestCurrency.column) + 1)}2:${excelColumnLetter(columns.indexOf(bestCurrency.column) + 1)}${Math.max(2, rows.length + 1)})`, value: bestCurrency.average, sourceColumn: bestCurrency.column.key, format: "currency" });
  }
  const bestPercentage = numericTotals.find((item) => item.column.type === "percentage");
  if (bestPercentage) {
    suggestedKpis.push({ id: "completion", title: `${bestPercentage.column.label}`, formula: `=AVERAGE('Main Data'!${excelColumnLetter(columns.indexOf(bestPercentage.column) + 1)}2:${excelColumnLetter(columns.indexOf(bestPercentage.column) + 1)}${Math.max(2, rows.length + 1)})`, value: bestPercentage.average / (bestPercentage.average > 1 ? 100 : 1), sourceColumn: bestPercentage.column.key, format: "percentage" });
  }

  const sheets = [];
  const addSheet = (name, type, reason, requiredColumns = []) => {
    if (requiredColumns.length && !requiredColumns.every((needle) => columns.some((column) => new RegExp(needle, "i").test(`${column.key} ${column.label}`)))) return;
    if (!sheets.some((sheet) => sheet.name === name)) sheets.push({ name, type, reason });
  };

  addSheet("Executive Summary", "summary", "KPI and management overview");
  if (cvMode) {
    addSheet("Candidate Overview", "data", "Candidate facts and core profile fields", ["name|candidate"]);
    addSheet("Skills Analysis", "analysis", "Skills and competencies", ["skill"]);
    addSheet("Experience", "analysis", "Experience and role information", ["experience|role|position"]);
    addSheet("Education", "analysis", "Education and qualification information", ["education|degree|qualification"]);
    addSheet("Certifications", "analysis", "Certification information", ["certification"]);
    addSheet("Raw Data", "raw", "Complete source rows");
  } else if (salesMode) {
    addSheet("Sales Data", "data", "Selected operational sales columns");
    addSheet("Product Analysis", "analysis", "Product/category performance", ["product|item|category"]);
    addSheet("Regional Analysis", "analysis", "Regional performance", ["region|location|country|city"]);
    addSheet("Monthly Trends", "analysis", "Time-series performance", ["date|month|period"]);
    addSheet("Raw Data", "raw", "Complete source rows");
  } else if (invoiceMode) {
    addSheet("Invoice Summary", "summary", "Invoice and payment overview");
    addSheet("Invoice Details", "data", "Invoice-level records");
    addSheet("Payment Status", "analysis", "Payment status distribution", ["status|payment"]);
    addSheet("Client Analysis", "analysis", "Client-level invoice analysis", ["client|customer"]);
    addSheet("Raw Data", "raw", "Complete source rows");
  } else {
    addSheet("KPI Summary", "summary", "KPI snapshot and management metrics");
    addSheet("Main Data", "data", "Primary report table");
    addSheet("Charts", "charts", "Recommended visualizations");
    addSheet("Analysis", "analysis", "Derived analytical views");
    addSheet("Detailed Records", "data", "Detailed selected records");
    addSheet("Data Quality", "quality", "Data quality review");
    addSheet("Raw Data", "raw", "Complete source rows");
  }

  const charts = [];
  if (dates.length && numeric.length) charts.push({ type: "line", title: `${numeric[0].label} over time`, categoryColumn: dates[0].key, valueColumn: numeric[0].key, reason: "Date + numeric field" });
  if (categories.length && numeric.length) charts.push({ type: "bar", title: `${numeric[0].label} by ${categories[0].label}`, categoryColumn: categories[0].key, valueColumn: numeric[0].key, reason: "Category + numeric field" });
  const statusColumn = columns.find((column) => /status|state|stage|risk|payment/i.test(`${column.key} ${column.label}`));
  if (statusColumn) charts.push({ type: "doughnut", title: `${statusColumn.label} distribution`, categoryColumn: statusColumn.key, valueColumn: "__count", reason: "Status/category distribution" });
  if (numeric.length >= 2) charts.push({ type: "scatter", title: `${numeric[0].label} vs ${numeric[1].label}`, categoryColumn: numeric[0].key, valueColumn: numeric[1].key, reason: "Two numeric fields" });

  return { rows, columns, numeric, dates, categories, urls, emails, cvMode, salesMode, invoiceMode, suggestedKpis: suggestedKpis.slice(0, 5), sheets, charts: charts.slice(0, 4), numericTotals };
}

function excelColumnLetter(index) {
  let value = Math.max(1, Number(index) || 1);
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function excelSafeSheetName(name, used = []) {
  const cleaned = String(name || "Sheet").replace(/[\\/*?:\[\]]/g, " ").trim().slice(0, 31) || "Sheet";
  let result = cleaned;
  let n = 2;
  while (used.some((item) => item.toLowerCase() === result.toLowerCase())) {
    const suffix = ` ${n++}`;
    result = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
  }
  return result;
}

function excelThemeForBuilder(id, customTheme) {
  if (id === "custom" && customTheme) return { ...EXCEL_THEMES.executive, ...customTheme, id: "custom", name: "Custom" };
  return EXCEL_THEMES[id] || EXCEL_THEMES.executive;
}

function excelValueForFormula(value, type) {
  if (value == null || value === "") return "";
  if (type === "number" || type === "currency" || type === "percentage") {
    const n = Number(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : value;
  }
  if (type === "date") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d;
  }
  return value;
}

function excelReportCleanRows(rows, columns, qualityOptions) {
  const source = Array.isArray(rows) ? rows.map((row) => ({ ...row })) : [];
  const result = [];
  const seen = new Set();
  const activeColumns = columns.filter((column) => column.enabled);
  source.forEach((row) => {
    const isEmpty = activeColumns.every((column) => String(row[column.key] ?? "").trim() === "");
    if (qualityOptions.removeEmptyRows && isEmpty) return;
    const cleaned = { ...row };
    activeColumns.forEach((column) => {
      const value = cleaned[column.key];
      if (qualityOptions.normalizeText && typeof value === "string" && ["text", "category"].includes(column.type)) {
        cleaned[column.key] = value.trim().replace(/\s+/g, " ");
      }
      if (qualityOptions.normalizeNumbers && ["number", "currency", "percentage"].includes(column.type)) {
        const numeric = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
        if (String(value ?? "").trim() && Number.isFinite(numeric)) cleaned[column.key] = numeric;
      }
    });
    const duplicateKey = activeColumns.map((column) => String(cleaned[column.key] ?? "").trim().toLowerCase()).join("\u0001");
    if (qualityOptions.removeDuplicates && seen.has(duplicateKey)) return;
    seen.add(duplicateKey);
    result.push(cleaned);
  });
  return result;
}

function excelWorkbookChartImage(chart, rows, columns, theme) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 380;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const background = theme?.soft || "#F8FAFC";
  const accent = theme?.accent || "#5B21B6";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = theme?.text || "#172033";
  ctx.font = "700 22px Arial";
  ctx.fillText(String(chart.title || "Chart"), 32, 40);
  const category = columns.find((column) => column.key === chart.categoryColumn);
  const value = chart.valueColumn === "__count" ? null : columns.find((column) => column.key === chart.valueColumn);
  const grouped = {};
  rows.forEach((row) => {
    const label = String(row[chart.categoryColumn] ?? "Unknown").slice(0, 22) || "Unknown";
    const numeric = chart.valueColumn === "__count" ? 1 : Number(String(row[chart.valueColumn] ?? "").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(numeric)) return;
    grouped[label] = (grouped[label] || 0) + numeric;
  });
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = Math.max(1, ...entries.map((entry) => entry[1]));
  const left = 70;
  const top = 82;
  const width = 610;
  const height = 235;
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + height); ctx.lineTo(left + width, top + height); ctx.stroke();
  if (chart.type === "line") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    entries.forEach((entry, index) => {
      const x = left + (entries.length <= 1 ? width / 2 : (index / (entries.length - 1)) * width);
      const y = top + height - (entry[1] / max) * height;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    });
    ctx.stroke();
  } else {
    const barWidth = Math.max(18, width / Math.max(entries.length, 1) - 12);
    entries.forEach((entry, index) => {
      const x = left + index * (width / Math.max(entries.length, 1)) + 8;
      const barHeight = (entry[1] / max) * height;
      ctx.fillStyle = index % 2 ? `${accent}CC` : accent;
      if (chart.type === "doughnut") {
        // A compact bar fallback keeps the workbook image renderer dependency-free.
        ctx.fillRect(x, top + height - barHeight, barWidth, barHeight);
      } else {
        ctx.fillRect(x, top + height - barHeight, barWidth, barHeight);
      }
    });
  }
  ctx.fillStyle = theme?.text || "#334155";
  ctx.font = "12px Arial";
  entries.forEach((entry, index) => {
    const x = left + index * (width / Math.max(entries.length, 1)) + 4;
    ctx.save(); ctx.translate(x, top + height + 20); ctx.rotate(-0.45); ctx.fillText(entry[0], 0, 0); ctx.restore();
  });
  ctx.font = "11px Arial";
  ctx.fillStyle = "#64748B";
  ctx.fillText(category?.label || chart.categoryColumn || "Category", left, 360);
  if (value) ctx.fillText(value.label, 610, 360);
  return canvas.toDataURL("image/png");
}

function excelReportDefaultBuilder(profile, recommendedTheme) {
  const baseSheets = profile.sheets.length ? profile.sheets : [{ name: "Main Data", type: "data", reason: "Primary dataset" }];
  return {
    title: profile.cvMode ? "Candidate Analysis Report" : profile.salesMode ? "Sales Performance Report" : profile.invoiceMode ? "Invoice Analysis Report" : "Professional Data Report",
    subtitle: "Prepared from analyzed data",
    company: "Open Ledger Docs",
    author: "",
    filename: profile.cvMode ? "Candidate_Analysis_Report" : profile.salesMode ? "Sales_Performance_Report" : profile.invoiceMode ? "Invoice_Analysis_Report" : "Open Ledger Docs_Professional_Report",
    themeId: recommendedTheme,
    customTheme: null,
    sheets: baseSheets.map((sheet, index) => ({ ...sheet, id: `builder-sheet-${Date.now()}-${index}`, enabled: true, columns: null })),
    selectedColumns: profile.columns.map((column) => ({ ...column, enabled: !["__analysisTimestamp", "__documentDate"].includes(column.key) })),
    kpis: profile.suggestedKpis.map((kpi, index) => ({ ...kpi, id: `kpi-${Date.now()}-${index}`, enabled: true })),
    charts: profile.charts.map((chart, index) => ({ ...chart, id: `chart-${Date.now()}-${index}`, enabled: true })),
    formulas: [],
    filters: [],
    sortRules: [],
    conditionalRules: [],
    cover: { enabled: true, title: "Professional Report", subtitle: "Prepared from analyzed data", company: "Open Ledger Docs", author: "", description: "Generated with the Open Ledger Docs Excel Report Builder.", date: new Date().toLocaleDateString() },
    quality: { removeEmptyRows: false, removeDuplicates: false, normalizeText: true, normalizeNumbers: true },
    exportOptions: { cover: true, summary: true, kpis: true, charts: true, aiAnalysis: true, rawData: true, quality: true, formulas: true, index: true },
    freezeColumns: 0,
    activeSheetId: null,
  };
}

function ExcelReportBuilderPanel({ title, children, action }) {
  return (
    <section className="erb-config-card">
      <div className="erb-config-card-head"><div><span>{title}</span></div>{action}</div>
      {children}
    </section>
  );
}


function ExcelExportBuilder({
  documents = [],
  allDocuments = [],
  apiEndpoint,
  darkMode,
  onClose,
  onNavigateAnalyzer,
  onToast,
}) {
  const normalized = useMemo(() => normalizeExportData(documents), [documents]);
  const recommendedTheme = useMemo(() => getRecommendedExcelTheme(documents), [documents]);
  const profile = useMemo(() => excelReportProfile(normalized, documents), [normalized, documents]);
  const candidateDocuments = useMemo(() => documents.filter((doc) => {
    const extracted = doc?.extracted_data;
    return extracted && (extracted.personal_information || extracted.professional_information || extracted.skills || extracted.education || extracted.work_experience);
  }), [documents]);
  const [candidateSelection, setCandidateSelection] = useState("all");
  const candidateReportRecords = useMemo(() => {
    if (candidateSelection === "all") return candidateDocuments;
    return candidateDocuments.filter((doc) => String(doc.id) === String(candidateSelection));
  }, [candidateDocuments, candidateSelection]);
  const [builder, setBuilder] = useState(() => excelReportDefaultBuilder(profile, recommendedTheme));
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [leftSection, setLeftSection] = useState("structure");
  const [rightSection, setRightSection] = useState("theme");
  const [activeSheetId, setActiveSheetId] = useState(null);
  const [previewSearch, setPreviewSearch] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantMessage, setAssistantMessage] = useState("");
  const [isAssistantBusy, setIsAssistantBusy] = useState(false);
  const [draggedSheetId, setDraggedSheetId] = useState(null);
  const [history, setHistory] = useState(readExcelHistory);
  const [templateName, setTemplateName] = useState("");
  const [candidateReportTheme, setCandidateReportTheme] = useState("professional");
  const [candidateReportTypes, setCandidateReportTypes] = useState(["overview", "skills", "experience", "education", "certifications", "projects", "languages", "analytics"]);

  useEffect(() => {
    const next = excelReportDefaultBuilder(profile, recommendedTheme);
    setBuilder(next);
    setUndoStack([]);
    setRedoStack([]);
    setActiveSheetId(next.sheets[0]?.id || null);
    setPreviewPage(1);
    setError("");
    setSuccess(null);
  }, [profile, recommendedTheme]);

  useEffect(() => {
    if (!builder.sheets.some((sheet) => sheet.id === activeSheetId)) setActiveSheetId(builder.sheets[0]?.id || null);
  }, [builder.sheets, activeSheetId]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault(); redo();
      }
      if (event.key === "Escape" && !isGenerating) onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [builder, undoStack, redoStack, isGenerating]);

  const commit = (updater) => {
    setBuilder((current) => {
      const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      setUndoStack((stack) => [...stack.slice(-29), current]);
      setRedoStack([]);
      return next;
    });
    setSuccess(null);
    setError("");
  };

  function undo() {
    setUndoStack((stack) => {
      if (!stack.length) return stack;
      const previous = stack[stack.length - 1];
      setBuilder((current) => {
        setRedoStack((redo) => [...redo.slice(-29), current]);
        return previous;
      });
      return stack.slice(0, -1);
    });
  }
  function redo() {
    setRedoStack((stack) => {
      if (!stack.length) return stack;
      const next = stack[stack.length - 1];
      setBuilder((current) => {
        setUndoStack((undoItems) => [...undoItems.slice(-29), current]);
        return next;
      });
      return stack.slice(0, -1);
    });
  }

  const enabledColumns = builder.selectedColumns.filter((column) => column.enabled);
  const activeSheet = builder.sheets.find((sheet) => sheet.id === activeSheetId) || builder.sheets[0];
  const theme = excelThemeForBuilder(builder.themeId, builder.customTheme);
  const filteredRows = useMemo(() => {
    let rows = profile.rows.map((row) => ({ ...row }));
    builder.filters.forEach((filter) => {
      rows = rows.filter((row) => {
        const raw = String(row[filter.column] ?? "");
        const value = filter.value == null ? "" : String(filter.value);
        if (filter.operator === "contains") return raw.toLowerCase().includes(value.toLowerCase());
        if (filter.operator === "equals") return raw.toLowerCase() === value.toLowerCase();
        const numeric = Number(raw.replace(/[^0-9.-]/g, ""));
        const target = Number(value.replace(/[^0-9.-]/g, ""));
        if (Number.isFinite(numeric) && Number.isFinite(target)) {
          if (filter.operator === "gt") return numeric > target;
          if (filter.operator === "lt") return numeric < target;
          if (filter.operator === "gte") return numeric >= target;
          if (filter.operator === "lte") return numeric <= target;
        }
        return true;
      });
    });
    const rules = builder.sortRules.filter((rule) => rule.column);
    if (rules.length) rows.sort((a, b) => {
      for (const rule of rules) {
        const av = a[rule.column] ?? ""; const bv = b[rule.column] ?? "";
        const an = Number(String(av).replace(/[^0-9.-]/g, "")); const bn = Number(String(bv).replace(/[^0-9.-]/g, ""));
        const cmp = Number.isFinite(an) && Number.isFinite(bn) ? an - bn : String(av).localeCompare(String(bv));
        if (cmp) return rule.direction === "desc" ? -cmp : cmp;
      }
      return 0;
    });
    return excelReportCleanRows(rows, builder.selectedColumns, builder.quality);
  }, [profile.rows, builder.filters, builder.sortRules, builder.selectedColumns, builder.quality]);

  const previewRows = useMemo(() => {
    const query = previewSearch.trim().toLowerCase();
    const searched = query
      ? filteredRows.filter((row) => enabledColumns.some((column) => String(row[column.key] ?? "").toLowerCase().includes(query)))
      : filteredRows;
    return searched;
  }, [filteredRows, previewSearch, enabledColumns]);

  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(previewRows.length / pageSize));
  const currentPreviewRows = previewRows.slice((previewPage - 1) * pageSize, previewPage * pageSize);
  useEffect(() => { if (previewPage > pageCount) setPreviewPage(pageCount); }, [pageCount, previewPage]);

  const updateColumn = (key, patch) => commit((current) => ({ ...current, selectedColumns: current.selectedColumns.map((column) => column.key === key ? { ...column, ...patch } : column) }));
  const moveColumn = (index, direction) => commit((current) => {
    const list = [...current.selectedColumns]; const next = index + direction;
    if (next < 0 || next >= list.length) return current;
    [list[index], list[next]] = [list[next], list[index]];
    return { ...current, selectedColumns: list };
  });

  const renameSheet = (id) => { const current = builder.sheets.find((sheet) => sheet.id === id); const nextName = window.prompt("Worksheet name", current?.name || "Sheet"); if (!nextName || !nextName.trim()) return; commit((state) => ({ ...state, sheets: state.sheets.map((sheet) => sheet.id === id ? { ...sheet, name: nextName.trim().slice(0,31) } : sheet) })); };
  const addSheet = (type = "data", name = `Sheet ${builder.sheets.length + 1}`) => {
    const id = `builder-sheet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    commit((current) => ({ ...current, sheets: [...current.sheets, { id, name, type, reason: "Custom worksheet", enabled: true, columns: null }] }));
    setActiveSheetId(id);
  };
  const duplicateSheet = (sheet) => {
    if (!sheet) return;
    const id = `builder-sheet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    commit((current) => {
      const index = current.sheets.findIndex((item) => item.id === sheet.id);
      const copy = { ...sheet, id, name: `${sheet.name} Copy` };
      const sheets = [...current.sheets]; sheets.splice(index + 1, 0, copy);
      return { ...current, sheets };
    });
    setActiveSheetId(id);
  };
  const removeSheet = (id) => commit((current) => {
    if (current.sheets.length <= 1) return current;
    return { ...current, sheets: current.sheets.filter((sheet) => sheet.id !== id) };
  });
  const reorderSheet = (id, targetId) => commit((current) => {
    const sheets = [...current.sheets];
    const from = sheets.findIndex((sheet) => sheet.id === id); const to = sheets.findIndex((sheet) => sheet.id === targetId);
    if (from < 0 || to < 0 || from === to) return current;
    const [item] = sheets.splice(from, 1); sheets.splice(to, 0, item); return { ...current, sheets };
  });

  const generateWithAI = async () => {
    setIsAssistantBusy(true); setError(""); setAssistantMessage("");
    const context = JSON.stringify({ columns: profile.columns.map(({ key, label, type, unique, missing }) => ({ key, label, type, unique, missing })), rows: profile.rows.slice(0, 50), detectedMode: profile.cvMode ? "CV" : profile.salesMode ? "Sales" : profile.invoiceMode ? "Invoice" : "General" });
    let remote = false;
    try {
      if (CHAT_ENDPOINT) {
        const response = await fetch(CHAT_ENDPOINT, { method: "POST", headers: getApiHeaders(true), body: JSON.stringify({ question: assistantPrompt || "Recommend a professional workbook structure for this dataset.", context }) });
        if (response.ok) {
          const payload = await response.json().catch(() => null);
          const text = payload?.response?.answer || payload?.response?.response || payload?.answer || payload?.message || "";
          if (text) { setAssistantMessage(String(text)); remote = true; }
        }
      }
    } catch (assistantError) {
      console.warn("AI workbook assistant unavailable; using local profiler.", assistantError);
    }
    const proposal = excelReportDefaultBuilder(profile, recommendedTheme);
    commit((current) => ({ ...current, ...proposal, activeSheetId: proposal.sheets[0]?.id || null }));
    setActiveSheetId(proposal.sheets[0]?.id || null);
    setAssistantMessage((message) => message || `I profiled ${profile.rows.length.toLocaleString()} rows and ${profile.columns.length} columns. The proposed workbook uses only detected fields and includes ${proposal.sheets.length} relevant sheets plus ${proposal.charts.length} useful chart${proposal.charts.length === 1 ? "" : "s"}.`);
    if (!remote) setAssistantMessage((message) => `${message} Local data profiling was used because the configured AI endpoint did not return a structured recommendation.`);
    setLeftSection("structure");
    setIsAssistantBusy(false);
  };

  const runNaturalLanguage = async () => {
    const prompt = assistantPrompt.trim();
    if (!prompt) return;
    setIsAssistantBusy(true); setError("");
    const lower = prompt.toLowerCase();
    const nextCharts = [...builder.charts];
    if (/month|monthly|trend/.test(lower) && profile.dates.length && profile.numeric.length) nextCharts.push({ id: `chart-${Date.now()}`, type: "line", title: `${profile.numeric[0].label} by ${profile.dates[0].label}`, categoryColumn: profile.dates[0].key, valueColumn: profile.numeric[0].key, enabled: true });
    if (/top\s*10|top ten|ranking/.test(lower) && profile.categories.length && profile.numeric.length) nextCharts.push({ id: `chart-${Date.now()}-rank`, type: "bar", title: `Top ${profile.categories[0].label} by ${profile.numeric[0].label}`, categoryColumn: profile.categories[0].key, valueColumn: profile.numeric[0].key, enabled: true });
    const selectedNames = [];
    if (/manager|executive|professional|presentation/.test(lower)) selectedNames.push("Executive Summary", "Main Data", "Charts");
    if (/hr|candidate|resume|cv/.test(lower) && profile.cvMode) selectedNames.push("Candidate Overview", "Skills Analysis", "Experience", "Education");
    if (/sales|revenue|regional/.test(lower) && profile.salesMode) selectedNames.push("Sales Data", "Product Analysis", "Regional Analysis", "Monthly Trends");
    const available = builder.sheets.filter((sheet) => selectedNames.includes(sheet.name));
    const sheetNames = available.length ? available.map((sheet) => sheet.name).join(", ") : builder.sheets.map((sheet) => sheet.name).join(", ");
    setAssistantMessage(`Proposed structure for “${prompt}”: ${sheetNames}. ${nextCharts.length > builder.charts.length ? "A relevant chart was added to the proposal." : "No chart was added because the requested visualization did not match detected fields."} Review the proposal, then generate the workbook.`);
    commit((current) => ({ ...current, charts: nextCharts.slice(-6) }));
    setIsAssistantBusy(false);
  };

  const saveTemplate = () => {
    const name = templateName.trim() || builder.title || "Open Ledger Docs Report Template";
    const templates = JSON.parse(window.localStorage.getItem("docusense_excel_report_templates") || "[]");
    const payload = { id: `template-${Date.now()}`, name, savedAt: new Date().toISOString(), builder: { ...builder, activeSheetId: null } };
    window.localStorage.setItem("docusense_excel_report_templates", JSON.stringify([payload, ...templates].slice(0, 20)));
    setTemplateName(name); onToast?.("Report template saved locally.", "success");
  };

  const loadTemplate = (payload) => {
    if (!payload?.builder) return;
    commit(() => ({ ...payload.builder, activeSheetId: payload.builder.sheets?.[0]?.id || null }));
    setActiveSheetId(payload.builder.sheets?.[0]?.id || null);
    onToast?.(`Applied template “${payload.name}”.`, "success");
  };

  const newReport = () => {
    const next = excelReportDefaultBuilder(profile, recommendedTheme);
    commit(next); setActiveSheetId(next.sheets[0]?.id || null); setAssistantMessage(""); setTemplateName("");
  };

  const validateWorkbook = () => {
    const errors = [];
    const names = builder.sheets.map((sheet) => sheet.name.trim().toLowerCase());
    if (!builder.sheets.length) errors.push("Add at least one worksheet.");
    if (names.some((name) => !name)) errors.push("Worksheet names cannot be empty.");
    if (new Set(names).size !== names.length) errors.push("Worksheet names must be unique.");
    if (names.some((name) => name.length > 31)) errors.push("Worksheet names must be 31 characters or fewer.");
    if (!enabledColumns.length) errors.push("Select at least one data column.");
    builder.formulas.forEach((formula) => { if (!String(formula.formula || "").trim()) errors.push(`Formula “${formula.name || "Unnamed"}” is empty.`); });
    builder.selectedColumns.forEach((column) => { if (column.width && (column.width < 8 || column.width > 80)) errors.push(`Column “${column.label}” has an invalid width.`); });
    return errors;
  };

  const generateExcel = async () => {
    if (candidateDocuments.length > 0) {
      if (!candidateReportRecords.length) {
        setError("Select at least one candidate to export.");
        return;
      }

      setIsGenerating(true);
      setError("");
      setSuccess(null);
      setGenerationStep(0);

      const timer = window.setInterval(
        () => setGenerationStep((step) => Math.min(step + 1, 5)),
        350
      );

      try {
        /*
         * Candidate export is generated locally with ExcelJS.
         * The previous implementation called /export/candidate-report and
         * /export/candidates-report, which are not available on the current
         * API and caused the 404 error.
         *
         * The workbook intentionally uses ONE row per candidate and columns
         * such as Name, Email, Phone, Skills, Education, etc. It does not
         * split a candidate's information into unrelated report sheets.
         */
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "Open Ledger Docs";
        workbook.lastModifiedBy = "Open Ledger Docs";
        workbook.created = new Date();
        workbook.modified = new Date();

        const sheet = workbook.addWorksheet("Candidate Overview", {
          views: [{ state: "frozen", ySplit: 1 }],
        });

        const fieldDefs = [
          ["Name", "candidateName", ["candidate name", "full name", "applicant name", "name", "candidate", "applicant"]],
          ["Email", "email", ["email", "email address", "e-mail", "candidate email"]],
          ["Phone", "phone", ["phone", "phone number", "mobile", "contact number", "telephone", "cell"]],
          ["Location", "location", ["location", "city", "candidate location", "address", "country"]],
          ["Job Title", "jobTitle", ["job title", "job role", "role", "position", "designation", "title"]],
          ["Current Company", "currentCompany", ["current company", "company", "employer", "current employer", "organization"]],
          ["Experience", "experience", ["experience", "years experience", "years of experience", "total experience", "work experience", "exp years"]],
          ["Skills", "skills", ["skills", "skill", "technical skills", "core skills", "technologies", "tech skills"]],
          ["Education", "education", ["education", "degree", "qualification", "academic qualification"]],
          ["University", "university", ["university", "college", "institution", "school"]],
          ["Certifications", "certifications", ["certifications", "certification", "licenses", "professional certifications"]],
          ["Languages", "languages", ["languages", "language", "spoken languages"]],
          ["Projects", "projects", ["projects", "project", "key projects", "portfolio projects"]],
          ["Professional Summary", "summary", ["professional summary", "summary", "profile summary", "career summary", "objective", "about"]],
          ["LinkedIn", "linkedin", ["linkedin", "linkedin profile", "linkedin url"]],
          ["GitHub", "github", ["github", "github profile", "github url"]],
          ["Portfolio", "portfolio", ["portfolio", "portfolio url", "personal website", "website"]],
          ["Expected Salary", "expectedSalary", ["expected salary", "salary expectation", "desired salary", "expected compensation"]],
          ["Current Salary", "currentSalary", ["current salary", "salary", "current compensation", "present salary"]],
          ["Availability", "availability", ["availability", "available from", "joining availability", "join date"]],
          ["Notice Period", "noticePeriod", ["notice period", "notice"]],
          ["Status", "status", ["status", "application status", "candidate status", "pipeline stage", "stage"]],
          ["Application Date", "applicationDate", ["application date", "applied date", "date applied"]],
          ["Source", "source", ["source", "application source", "candidate source", "referral source"]],
          ["CV / AI Score", "score", ["cv score", "candidate score", "ai score", "score", "rating", "match score"]],
        ];

        const normalizeKey = (value) =>
          String(value ?? "")
            .toLowerCase()
            .replace(/[_-]+/g, " ")
            .replace(/[^\w\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();

        const primitive = (value) => {
          if (value == null) return "";
          if (Array.isArray(value)) {
            return value
              .map((item) => primitive(item))
              .filter(Boolean)
              .join(", ");
          }
          if (typeof value === "object") {
            return Object.values(value)
              .map((item) => primitive(item))
              .filter(Boolean)
              .join(", ");
          }
          return String(value);
        };

        const collectValues = (value, out = []) => {
          if (value == null) return out;
          if (Array.isArray(value)) {
            value.forEach((item) => collectValues(item, out));
            return out;
          }
          if (typeof value === "object") {
            Object.entries(value).forEach(([key, item]) => {
              out.push([normalizeKey(key), item]);
              collectValues(item, out);
            });
          }
          return out;
        };

        const getCandidateValue = (doc, aliases) => {
          const extracted = doc?.extracted_data || {};
          const entityPairs = (doc?.entities || []).map((entity) => [
            normalizeKey(entity?.label),
            entity?.value,
          ]);
          const pairs = [
            ...collectValues(extracted),
            ...entityPairs,
          ];

          const wanted = aliases.map(normalizeKey);

          for (const alias of wanted) {
            const exact = pairs.find(([key, value]) => key === alias && primitive(value));
            if (exact) return primitive(exact[1]);
          }

          for (const alias of wanted) {
            const partial = pairs.find(
              ([key, value]) =>
                key && value != null && (key.includes(alias) || alias.includes(key))
            );
            if (partial && primitive(partial[1])) return primitive(partial[1]);
          }

          return "";
        };

        const rows = candidateReportRecords.map((doc, index) => {
          const row = {
            "Candidate #": index + 1,
          };

          fieldDefs.forEach(([label, key, aliases]) => {
            let value = getCandidateValue(doc, aliases);

            // Useful fallbacks from the document itself.
            if (!value && key === "candidateName") {
              value = String(doc?.name || "").replace(/\.(pdf|docx?|txt)$/i, "");
            }
            if (!value && key === "status") value = doc?.status || "";
            if (!value && key === "score") value = doc?.confidence ?? "";
            if (!value && key === "summary") value = doc?.summary || doc?.extracted_data?.summary || "";
            if (!value && key === "linkedin") value = doc?.linkedin || "";
            if (!value && key === "github") value = doc?.github || "";
            if (!value && key === "portfolio") value = doc?.portfolio || doc?.website || "";

            row[label] = value;
          });

          return row;
        });

        const columns = [
          { header: "Candidate #", key: "Candidate #", width: 13 },
          ...fieldDefs.map(([label]) => ({
            header: label,
            key: label,
            width: Math.max(16, Math.min(32, label.length + 10)),
          })),
        ];

        sheet.columns = columns;
        rows.forEach((row) => sheet.addRow(row));

        const theme = excelThemeForBuilder(
          candidateReportTheme === "professional"
            ? "professional"
            : recommendedTheme
        );
        const headerColor = String(theme?.header || "#5B21B6").replace("#", "");
        const accentColor = String(theme?.accent || "#7C3AED").replace("#", "");

        const headerRow = sheet.getRow(1);
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
          cell.font = {
            bold: true,
            color: { argb: "FFFFFFFF" },
            size: 11,
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: `FF${headerColor}` },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: true,
          };
          cell.border = {
            bottom: {
              style: "thin",
              color: { argb: `FF${accentColor}` },
            },
          };
        });

        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          row.height = 24;
          row.eachCell((cell) => {
            cell.alignment = {
              vertical: "top",
              horizontal: "left",
              wrapText: true,
            };
            cell.border = {
              bottom: {
                style: "hair",
                color: { argb: "FFE5E7EB" },
              },
            };
          });
          if (rowNumber % 2 === 0) {
            row.eachCell((cell) => {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF8F7FC" },
              };
            });
          }
        });

        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: sheet.columns.length },
        };

        // Convert the candidate matrix into a real Excel table. ExcelJS requires
        // both column definitions and row definitions; rows is deliberately
        // supplied here so exports work even when the candidate data changes.
        if (rows.length > 0 && sheet.columns.length > 0) {
          sheet.addTable({
            name: `CandidateOverview_${Date.now().toString(36)}`.slice(0, 240),
            ref: `A1:${excelColumnLetter(sheet.columns.length)}${rows.length + 1}`,
            headerRow: true,
            totalsRow: false,
            columns: columns.map((column) => ({ name: column.header })),
            rows: rows.map((row) => columns.map((column) => row[column.key] ?? "")),
            style: {
              theme: "TableStyleMedium4",
              showRowStripes: true,
              showFirstColumn: false,
              showLastColumn: false,
            },
          });
        }

        // Keep long HR fields readable without making the workbook unusably wide.
        const wideFields = new Set(["Skills", "Education", "Certifications", "Languages", "Projects", "Professional Summary"]);
        sheet.columns.forEach((column, index) => {
          const header = String(columns[index]?.header || "");
          if (wideFields.has(header)) column.width = 38;
          if (["Email", "LinkedIn", "GitHub", "Portfolio"].includes(header)) column.width = 30;
          if (header === "Name") column.width = 24;
        });

        sheet.pageSetup = {
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          paperSize: 9,
          margins: {
            left: 0.25,
            right: 0.25,
            top: 0.5,
            bottom: 0.5,
            header: 0.2,
            footer: 0.2,
          },
        };

        sheet.headerFooter = {
          oddFooter: "&LOpen Ledger Docs&CPage &P of &N&RCandidate Overview",
        };

        // A small summary sheet is useful, but candidate data remains together
        // in the single Candidate Overview sheet.
        const summary = workbook.addWorksheet("Summary");
        summary.columns = [
          { header: "Metric", key: "metric", width: 28 },
          { header: "Value", key: "value", width: 24 },
        ];
        const scoredRows = rows
          .map((row) => Number(String(row["CV / AI Score"] ?? "").replace(/[^0-9.\-]/g, "")))
          .filter(Number.isFinite);
        const avgScore = scoredRows.length
          ? Math.round((scoredRows.reduce((sum, value) => sum + value, 0) / scoredRows.length) * 10) / 10
          : "Not available";
        const analyzedCount = rows.filter((row) => String(row.Status || "").toLowerCase() === "analyzed").length;
        summary.addRows([
          { metric: "Candidates", value: rows.length },
          { metric: "Candidates with CV / AI Score", value: scoredRows.length },
          { metric: "Average CV / AI Score", value: avgScore },
          { metric: "Analyzed Candidates", value: analyzedCount },
          { metric: "Generated", value: new Date().toLocaleString() },
          { metric: "Primary sheet", value: "Candidate Overview" },
          { metric: "Format", value: "One candidate per row" },
          { metric: "Source", value: "Open Ledger Docs extracted CV data" },
        ]);
        const summaryHeader = summary.getRow(1);
        summaryHeader.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: `FF${headerColor}` },
          };
        });

        setGenerationStep(4);

        const filename =
          candidateReportRecords.length > 1
            ? `Open Ledger Docs_Candidate_Overview_${new Date().toISOString().slice(0, 10)}.xlsx`
            : "Open Ledger Docs_Candidate_Overview.xlsx";

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        triggerBlobDownload(blob, filename);

        setGenerationStep(5);
        setSuccess({
          filename,
          records: candidateReportRecords.length,
          sheets: 2,
        });
        setHistory((current) => [
          {
            id: `export-${Date.now()}`,
            filename,
            createdAt: new Date().toISOString(),
            records: candidateReportRecords.length,
            sheets: 2,
            theme: candidateReportTheme,
          },
          ...current,
        ].slice(0, 20));

        onToast?.(
          "Candidate Overview Excel generated successfully.",
          "success"
        );
      } catch (candidateError) {
        console.error("Candidate Overview export failed:", candidateError);
        setError(
          candidateError?.message || "Candidate Overview export failed."
        );
      } finally {
        window.clearInterval(timer);
        setIsGenerating(false);
      }
      return;
    }

    const validation = validateWorkbook();
    if (validation.length) { setError(validation.join(" ")); return; }
    setIsGenerating(true); setError(""); setSuccess(null); setGenerationStep(0);
    const timer = window.setInterval(() => setGenerationStep((step) => Math.min(step + 1, 5)), 500);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Open Ledger Docs";
      workbook.lastModifiedBy = builder.author || "Open Ledger Docs";
      workbook.created = new Date(); workbook.modified = new Date();
      workbook.properties = { title: builder.title, subject: "AI Excel Report Builder workbook", company: builder.company || "Open Ledger Docs" };
      const usedNames = [];
      const actualTheme = excelThemeForBuilder(builder.themeId, builder.customTheme);
      const primarySheetName = builder.sheets.find((sheet) => sheet.type === "data")?.name || builder.sheets.find((sheet) => sheet.enabled && sheet.type !== "summary" && sheet.type !== "charts")?.name || "Main Data";
      const headerFill = String(actualTheme.header || "#5B21B6").replace("#", "");
      const accent = String(actualTheme.accent || actualTheme.header || "#5B21B6").replace("#", "");
      const soft = String(actualTheme.soft || "#F3EEFF").replace("#", "");
      const text = String(actualTheme.text || "#172033").replace("#", "");
      const rows = filteredRows.length ? filteredRows : profile.rows;
      const columns = builder.selectedColumns.filter((column) => column.enabled);
      const tableColumns = columns.map((column) => ({ name: column.label || formatExportLabel(column.key) }));
      const cleanCell = (value, column) => excelValueForFormula(value, column.type);
      const applyBaseSheetSettings = (sheet, landscape = true) => {
        sheet.pageSetup = { orientation: landscape ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
        sheet.headerFooter = { oddFooter: `&L${builder.company || "Open Ledger Docs"}&CPage &P of &N&R${builder.title}` };
      };
      const styleHeaderRow = (sheet, rowNumber = 1) => {
        const row = sheet.getRow(rowNumber); row.height = 28;
        row.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${headerFill}` } };
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          cell.border = { bottom: { style: "thin", color: { argb: `FF${accent}` } } };
        });
      };
      const styleData = (sheet, startRow, endRow) => {
        for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
          const row = sheet.getRow(rowNumber);
          row.height = 20;
          row.eachCell((cell) => { cell.font = { color: { argb: `FF${text}` }, size: 10 }; cell.alignment = { vertical: "top", wrapText: true }; if (rowNumber % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${soft}` } }; });
        }
      };
      const addDataSheet = (name, sheetColumns = columns, sourceRows = rows, raw = false) => {
        const safeName = excelSafeSheetName(name, usedNames); usedNames.push(safeName);
        const sheet = workbook.addWorksheet(safeName); applyBaseSheetSettings(sheet, sheetColumns.length > 8);
        const dataColumns = raw ? builder.selectedColumns : sheetColumns;
        const visible = dataColumns.filter((column) => column.enabled);
        sheet.columns = visible.map((column) => ({ header: column.label, key: column.key, width: Math.min(80, Math.max(column.width || 14, column.type === "email" ? 28 : column.type === "url" ? 34 : /summary|description|comment|skill/i.test(column.label) ? 42 : column.label.length + 4)) }));
        sourceRows.forEach((sourceRow) => { const row = sheet.addRow(visible.map((column) => cleanCell(sourceRow[column.key], column))); visible.forEach((column, index) => { const cell = row.getCell(index + 1); if (column.type === "currency") cell.numFmt = '$#,##0.00'; if (column.type === "percentage") cell.numFmt = '0.0%'; if (column.type === "date") cell.numFmt = 'mmm d, yyyy'; if (column.type === "number") cell.numFmt = '#,##0.##'; const value = sourceRow[column.key]; const stringValue = String(value ?? ""); if (column.type === "email" && stringValue.includes("@")) cell.value = { text: stringValue, hyperlink: `mailto:${stringValue}` }; if (column.type === "url" && /^https?:\/\//i.test(stringValue)) cell.value = { text: stringValue, hyperlink: stringValue }; }); });
        styleHeaderRow(sheet, 1); styleData(sheet, 2, sheet.rowCount);
        if (builder.freezeColumns > 0 || builder.freezeColumns === 0) sheet.views = [{ state: "frozen", ySplit: 1, xSplit: Math.max(0, builder.freezeColumns) }];
        if (visible.length && sheet.rowCount > 1) { const end = `${excelColumnLetter(visible.length)}${sheet.rowCount}`; const tableRows = sourceRows.map((sourceRow) => visible.map((column) => cleanCell(sourceRow[column.key], column))); sheet.addTable({ name: `Table_${normalizeExportKey(safeName)}_${Date.now().toString(36)}`.slice(0, 240), ref: `A1:${end}`, headerRow: true, totalsRow: false, columns: visible.map((column) => ({ name: column.label || formatExportLabel(column.key) })), rows: tableRows, style: { theme: actualTheme.id === "dark" ? "TableStyleMedium2" : "TableStyleMedium4", showRowStripes: true, showFirstColumn: false, showLastColumn: false } }); }
        const riskIndex = visible.findIndex((column) => /risk|status|priority/i.test(`${column.key} ${column.label}`));
        if (riskIndex >= 0 && sheet.rowCount > 1) sheet.addConditionalFormatting({ ref: `${excelColumnLetter(riskIndex + 1)}2:${excelColumnLetter(riskIndex + 1)}${sheet.rowCount}`, rules: [{ type: "containsText", operator: "containsText", text: "High", style: { font: { color: { argb: "FFB91C1C" }, bold: true }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } } } }, { type: "containsText", operator: "containsText", text: "Medium", style: { font: { color: { argb: "FF92400E" }, bold: true }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } } } }] });
        builder.conditionalRules.forEach((rule) => { const index = visible.findIndex((column) => column.key === rule.column); if (index < 0 || sheet.rowCount < 2) return; const ref = `${excelColumnLetter(index + 1)}2:${excelColumnLetter(index + 1)}${sheet.rowCount}`; const numericRule = ["gt", "lt", "eq"].includes(rule.operator); sheet.addConditionalFormatting({ ref, rules: [{ type: numericRule ? "cellIs" : "containsText", operator: numericRule ? (rule.operator === "gt" ? "greaterThan" : rule.operator === "lt" ? "lessThan" : "equal") : "containsText", formulae: numericRule ? [String(Number(rule.value) || 0)] : undefined, text: numericRule ? undefined : String(rule.value || ""), style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } }, font: { bold: true, color: { argb: "FF9F1239" } } } }] }); });
        return sheet;
      };
      const addSummarySheet = () => {
        const name = excelSafeSheetName("Executive Summary", usedNames); usedNames.push(name); const sheet = workbook.addWorksheet(name); applyBaseSheetSettings(sheet, false); sheet.mergeCells("A1:F2"); const title = sheet.getCell("A1"); title.value = builder.title; title.font = { size: 22, bold: true, color: { argb: `FF${headerFill}` } }; title.alignment = { vertical: "middle" }; sheet.getCell("A3").value = builder.subtitle; sheet.getCell("A3").font = { italic: true, color: { argb: `FF${text}` } };
        sheet.addRow([]); sheet.addRow(["KPI", "Formula / Value", "Source"]); styleHeaderRow(sheet, 5);
        const kpis = builder.kpis.filter((kpi) => kpi.enabled); kpis.forEach((kpi) => { const row = sheet.addRow([kpi.title, { formula: String(kpi.formula || `=COUNTA('${primarySheetName.replace(/'/g, "''")}'!A2:A${Math.max(2, rows.length + 1)})`).replace(/'Main Data'/g, `'${primarySheetName.replace(/'/g, "''")}'`), result: Number(kpi.value) || 0 }, kpi.sourceColumn || "Dataset"]); if (kpi.format === "currency") row.getCell(2).numFmt = '$#,##0.00'; if (kpi.format === "percentage") row.getCell(2).numFmt = '0.0%'; });
        const insightRow = sheet.rowCount + 2; sheet.getCell(`A${insightRow}`).value = "Key Insights"; sheet.getCell(`A${insightRow}`).font = { bold: true, size: 14, color: { argb: `FF${headerFill}` } }; const insights = [`${rows.length.toLocaleString()} records are available for this report.`, `${columns.length} selected columns are included in the main data view.`, `${profile.columns.filter((column) => column.missing > 0).length} columns contain missing values.`]; if (profile.cvMode) insights.push("The dataset contains CV/candidate-oriented fields; no hiring decision is made by the workbook."); insights.forEach((item, index) => sheet.getCell(`A${insightRow + index + 1}`).value = `${index + 1}. ${item}`);
        const qualityRow = insightRow + insights.length + 2; sheet.getCell(`A${qualityRow}`).value = "Data Quality"; sheet.getCell(`A${qualityRow}`).font = { bold: true, size: 14, color: { argb: `FF${headerFill}` } }; [["Rows", rows.length], ["Columns", columns.length], ["Missing cells", profile.columns.reduce((sum, column) => sum + column.missing, 0)], ["Duplicate rows detected", detectDuplicateRows(profile.rows, columns).length]].forEach((item, index) => sheet.addRow(item)); sheet.columns = [{ width: 30 }, { width: 28 }, { width: 32 }, { width: 18 }, { width: 18 }, { width: 18 }];
        return sheet;
      };
      const addIndexSheet = (sheetNames) => { const name = excelSafeSheetName("Workbook Index", usedNames); usedNames.push(name); const sheet = workbook.addWorksheet(name, 0); applyBaseSheetSettings(sheet, false); sheet.addRow([builder.title]); styleHeaderRow(sheet, 1); sheet.addRow(["Sheet", "Purpose"]); styleHeaderRow(sheet, 2); sheetNames.forEach((sheetName) => { const row = sheet.addRow([sheetName, "Open worksheet"]); row.getCell(1).value = { text: sheetName, hyperlink: `#'${sheetName.replace(/'/g, "''")}'!A1` }; }); sheet.columns = [{ width: 32 }, { width: 50 }]; return sheet; };
      const addAnalysisSheet = (sheetName, chart) => { const name = excelSafeSheetName(sheetName, usedNames); usedNames.push(name); const sheet = workbook.addWorksheet(name); applyBaseSheetSettings(sheet, true); sheet.addRow([chart.title]); sheet.getCell("A1").font = { bold: true, size: 18, color: { argb: `FF${headerFill}` } }; const cat = builder.selectedColumns.find((column) => column.key === chart.categoryColumn); const val = builder.selectedColumns.find((column) => column.key === chart.valueColumn); sheet.addRow([cat?.label || chart.categoryColumn, val?.label || chart.valueColumn]); styleHeaderRow(sheet, 2); const grouped = {}; rows.forEach((row) => { const key = String(row[chart.categoryColumn] ?? "Unknown"); const numeric = chart.valueColumn === "__count" ? 1 : Number(String(row[chart.valueColumn] ?? "").replace(/[^0-9.-]/g, "")); if (!Number.isFinite(numeric)) return; grouped[key] = (grouped[key] || 0) + numeric; }); Object.entries(grouped).sort((a,b)=>b[1]-a[1]).slice(0, 20).forEach(([key,value]) => sheet.addRow([key,value])); styleData(sheet,3,sheet.rowCount); sheet.getColumn(1).width=34; sheet.getColumn(2).width=22; const image = excelWorkbookChartImage(chart, rows, columns, actualTheme); if (image) { const imageId = workbook.addImage({ base64: image, extension: "png" }); sheet.addImage(imageId, { tl: { col: 3, row: 1 }, ext: { width: 720, height: 380 } }); } return sheet; };
      setGenerationStep(1);
      const generatedNames = [];
      if (builder.exportOptions.index) { /* index is added after all sheets */ }
      if (builder.exportOptions.cover) { const name = excelSafeSheetName("Cover", usedNames); usedNames.push(name); const sheet = workbook.addWorksheet(name); applyBaseSheetSettings(sheet, false); sheet.mergeCells("B3:G5"); const c = sheet.getCell("B3"); c.value = builder.cover.title || builder.title; c.font = { size: 26, bold: true, color: { argb: `FF${headerFill}` } }; c.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; sheet.mergeCells("B6:G6"); sheet.getCell("B6").value = builder.cover.subtitle || builder.subtitle; sheet.getCell("B6").font = { size: 14, italic: true, color: { argb: `FF${text}` } }; sheet.mergeCells("B8:G8"); sheet.getCell("B8").value = `Prepared from: ${documents[0]?.name || "Analyzed dataset"}`; sheet.mergeCells("B9:G9"); sheet.getCell("B9").value = `Generated: ${builder.cover.date}`; sheet.mergeCells("B11:G13"); sheet.getCell("B11").value = builder.cover.description || "Generated with the Open Ledger Docs Excel Report Builder."; sheet.getCell("B11").alignment = { wrapText: true, vertical: "top" }; sheet.columns = Array.from({length:7},()=>({width:18})); generatedNames.push(name); }
      setGenerationStep(2);
      if (builder.exportOptions.summary) { addSummarySheet(); generatedNames.push("Executive Summary"); }
      builder.sheets.filter((sheet) => sheet.enabled).forEach((sheetConfig) => {
        if (sheetConfig.type === "summary" || sheetConfig.name === "Executive Summary") return;
        if (sheetConfig.type === "raw" && !builder.exportOptions.rawData) return;
        if (sheetConfig.type === "quality" && !builder.exportOptions.quality) return;
        if (sheetConfig.type === "charts") return;
        if (sheetConfig.type === "quality") {
          const name = excelSafeSheetName(sheetConfig.name, usedNames); usedNames.push(name); const sheet = workbook.addWorksheet(name); applyBaseSheetSettings(sheet, false); sheet.addRow(["Data Quality Review", "Result"]); styleHeaderRow(sheet,1); const duplicateGroups = detectDuplicateRows(profile.rows, columns); const checks = [["Rows", profile.rows.length], ["Columns", columns.length], ["Missing cells", profile.columns.reduce((sum,c)=>sum+c.missing,0)], ["Duplicate rows", duplicateGroups.length], ["Invalid emails", profile.columns.filter((c)=>c.type === "email").reduce((sum,c)=>sum+c.sample.filter(v=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))).length,0)]]; checks.forEach((row)=>sheet.addRow(row)); styleData(sheet,2,sheet.rowCount); sheet.columns=[{width:28},{width:22}]; return;
        }
        if (sheetConfig.type === "analysis" && profile.charts.length) { const chart = profile.charts.find((item) => new RegExp(item.categoryColumn || "", "i").test(sheetConfig.name) || new RegExp(item.title || "", "i").test(sheetConfig.name)) || profile.charts[0]; if (chart) { addAnalysisSheet(sheetConfig.name, chart); generatedNames.push(sheetConfig.name); return; } }
        const sheet = addDataSheet(sheetConfig.name, columns, rows, sheetConfig.type === "raw"); generatedNames.push(sheet.name);
      });
      if (builder.exportOptions.charts && builder.charts.some((chart) => chart.enabled)) { builder.charts.filter((chart) => chart.enabled).forEach((chart, index) => { addAnalysisSheet(`Chart ${index + 1}`, chart); generatedNames.push(`Chart ${index + 1}`); }); }
      if (builder.exportOptions.aiAnalysis) { const name = excelSafeSheetName("AI Analysis", usedNames); usedNames.push(name); const sheet = workbook.addWorksheet(name); applyBaseSheetSettings(sheet,false); sheet.addRow(["AI Analysis", "Dataset-derived finding"]); styleHeaderRow(sheet,1); const findings=[`The dataset contains ${rows.length.toLocaleString()} rows across ${columns.length} selected columns.`,`The report was structured for ${profile.cvMode ? "CV/candidate analysis" : profile.salesMode ? "sales and performance analysis" : profile.invoiceMode ? "invoice and payment analysis" : "general business analysis"}.`,`Top categorical field: ${profile.categories[0]?.label || "No suitable category detected"}.`,`Primary numeric field: ${profile.numeric[0]?.label || "No numeric field detected"}.`,`Missing-value review: ${profile.columns.filter((column)=>column.missing>0).length} columns contain at least one missing value.`]; findings.forEach((finding)=>sheet.addRow(["Finding",finding])); styleData(sheet,2,sheet.rowCount); sheet.columns=[{width:22},{width:100}]; }
      if (builder.exportOptions.formulas && builder.formulas.length) { const name = excelSafeSheetName("Formulas", usedNames); usedNames.push(name); const sheet = workbook.addWorksheet(name); sheet.addRow(["Metric","Formula","Source"]); styleHeaderRow(sheet,1); builder.formulas.forEach((formula)=>sheet.addRow([formula.name,formula.formula,formula.sourceColumn||""])); styleData(sheet,2,sheet.rowCount); sheet.columns=[{width:30},{width:70},{width:30}]; }
      setGenerationStep(4);
      if (builder.exportOptions.index) { const names = workbook.worksheets.map((sheet)=>sheet.name); addIndexSheet(names); }
      setGenerationStep(5);
      const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }); if (!blob.size) throw new Error("The generated workbook is empty.");
      const finalFilename = safeExcelFilename(builder.filename || "Open Ledger Docs_Report"); setSuccess({ filename: finalFilename, records: rows.length, sheets: workbook.worksheets.length, columns: columns.length }); triggerBlobDownload(blob, finalFilename);
      const entry = { id: `export-${Date.now()}`, filename: finalFilename, theme: builder.themeId, createdAt: new Date().toISOString(), records: rows.length, sheets: workbook.worksheets.length, columns: columns.length }; const nextHistory = [entry, ...history].slice(0, 8); setHistory(nextHistory); persistJSON(EXCEL_EXPORT_HISTORY_KEY, nextHistory); onToast?.("AI Excel Report generated successfully.", "success");
    } catch (generationError) { console.error("AI Excel Report generation failed:", generationError); setError(generationError?.message || "Unable to generate the Excel report."); }
    finally { window.clearInterval(timer); setIsGenerating(false); }
  };

  if (!documents.length || !profile.rows.length) {
    return <div className={`excel-builder-overlay ${darkMode ? "is-dark" : ""}`} role="dialog" aria-modal="true"><div className="erb-empty"><div className="erb-empty-icon"><FileSpreadsheet size={30}/></div><span className="card-label">AI EXCEL REPORT BUILDER</span><h1>No dataset is ready</h1><p>Import an Excel workbook or analyze documents first. The builder will use the real structured data already available in Open Ledger Docs.</p><button className="primary-button" type="button" onClick={onNavigateAnalyzer}><FileSearch size={16}/> Go to Analyzer</button><button className="secondary-button" type="button" onClick={onClose}>Close</button></div></div>;
  }

  const templates = (() => { try { return JSON.parse(window.localStorage.getItem("docusense_excel_report_templates") || "[]"); } catch { return []; } })();
  const reportMeta = `${profile.rows.length.toLocaleString()} rows · ${profile.columns.length} columns · ${documents[0]?.name || "Analyzed dataset"}`;

  return (
    <div className={`excel-builder-overlay ${darkMode ? "is-dark" : ""}`} role="dialog" aria-modal="true" aria-labelledby="erb-title">
      <div className="erb-shell">
        <header className="erb-header">
          <div className="erb-title-area"><button className="excel-back-button" type="button" onClick={onClose} disabled={isGenerating}><ChevronLeft size={17}/>Back</button><div><span className="card-label">AI DOCUMENT INTELLIGENCE · EXPORT</span><h1 id="erb-title">Excel Report Builder</h1><p>Build a professional workbook from your analyzed data — without changing the source dataset.</p></div></div>
          <div className="erb-header-actions"><button className="erb-ghost" onClick={undo} disabled={!undoStack.length}>Undo</button><button className="erb-ghost" onClick={redo} disabled={!redoStack.length}>Redo</button><button className="erb-ghost" onClick={newReport}>New Report</button><button className="erb-ghost" onClick={saveTemplate}>Save Template</button><button className="erb-outline" onClick={() => setRightSection("preview")}>Preview</button><button className="erb-primary" onClick={generateExcel} disabled={isGenerating}><Download size={15}/>{isGenerating ? "Generating…" : "Generate Excel"}</button></div>
        </header>
        <div className="erb-meta"><span><b>Dataset</b>{documents[0]?.name || "Analyzed dataset"}</span><span><b>Rows</b>{profile.rows.length.toLocaleString()}</span><span><b>Columns</b>{profile.columns.length}</span><span><b>Theme</b>{theme.name}</span><span><b>Updated</b>Today</span></div>
        {error && <div className="erb-alert error"><AlertTriangle size={15}/><span>{error}</span></div>}
        {success && <div className="erb-alert success"><CheckCircle2 size={15}/><span>{success.filename} is ready · {success.sheets} sheets · {success.records.toLocaleString()} records</span><button onClick={() => setSuccess(null)}>Dismiss</button></div>}
        <div className="erb-layout">
          <aside className="erb-left">
            <div className="erb-ai-card"><div className="erb-ai-card-title"><Sparkles size={16}/><strong>AI Auto-Build</strong></div><p>Profile the real columns, recommend sheets, KPIs and charts, then review the proposal before export.</p><button className="erb-ai-button" onClick={generateWithAI} disabled={isAssistantBusy}>{isAssistantBusy ? "Profiling…" : "✨ Generate Workbook with AI"}</button></div>
            <div className="erb-left-tabs"><button className={leftSection === "structure" ? "active" : ""} onClick={() => setLeftSection("structure")}>Report Structure</button><button className={leftSection === "templates" ? "active" : ""} onClick={() => setLeftSection("templates")}>Templates</button></div>
            {leftSection === "structure" && <div className="erb-structure-list"><div className="erb-section-caption">WORKBOOK</div>{builder.sheets.map((sheet) => <div key={sheet.id} className={`erb-sheet-item ${activeSheetId === sheet.id ? "active" : ""}`} draggable onDragStart={() => setDraggedSheetId(sheet.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedSheetId) reorderSheet(draggedSheetId, sheet.id); setDraggedSheetId(null); }}><button className="erb-sheet-main" onClick={() => setActiveSheetId(sheet.id)}><span className="erb-drag">⋮⋮</span><span className="erb-sheet-icon">{sheet.type === "summary" ? "▣" : sheet.type === "charts" ? "◒" : sheet.type === "analysis" ? "◈" : "▤"}</span><span><b>{sheet.name}</b><small>{sheet.reason}</small></span></button><div className="erb-sheet-actions"><button onClick={() => renameSheet(sheet.id)} title="Rename">✎</button><button onClick={() => duplicateSheet(sheet)} title="Duplicate">+</button><button onClick={() => removeSheet(sheet.id)} title="Delete">×</button></div></div>)}<button className="erb-add-sheet" onClick={() => addSheet()}><Plus size={14}/> Add sheet</button></div>}
            {leftSection === "templates" && <div className="erb-template-list"><div className="erb-section-caption">MY TEMPLATES</div>{templates.length ? templates.map((item) => <button key={item.id} className="erb-template-item" onClick={() => loadTemplate(item)}><b>{item.name}</b><small>{new Date(item.savedAt).toLocaleDateString()} · {item.builder?.sheets?.length || 0} sheets</small></button>) : <div className="erb-template-empty">No saved templates yet.</div>}<div className="erb-section-caption">RECOMMENDED</div>{["HR Candidate Report","Monthly Operations Report","Sales Report","Invoice Analysis","Financial Report","Project Status Report"].map((name) => <button key={name} className="erb-template-item"><b>{name}</b><small>Adapts to available fields</small></button>)}</div>}
            <div className="erb-left-foot"><input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Template name…"/><button onClick={saveTemplate}>Save</button></div>
          </aside>

          <main className="erb-center">
            <div className="erb-preview-toolbar"><div><span className="card-label">LIVE PREVIEW</span><h2>{activeSheet?.name || "Workbook Preview"}</h2><p>{reportMeta}</p></div><div className="erb-preview-actions"><input aria-label="Search preview" value={previewSearch} onChange={(event) => { setPreviewSearch(event.target.value); setPreviewPage(1); }} placeholder="Search rows…"/><select value={activeSheetId || ""} onChange={(event) => setActiveSheetId(event.target.value)}>{builder.sheets.map((sheet) => <option key={sheet.id} value={sheet.id}>{sheet.name}</option>)}</select></div></div>
            {assistantMessage && <div className="erb-assistant-message"><Sparkles size={15}/><div><b>Workbook Assistant</b><p>{assistantMessage}</p></div><button onClick={() => setAssistantMessage("")}>×</button></div>}
            <div className="erb-sheet-preview" style={{"--erb-header": theme.header, "--erb-soft": theme.soft, "--erb-text": theme.text, "--erb-accent": theme.accent}}>
              {activeSheet?.type === "summary" ? <div className="erb-summary-preview"><div className="erb-report-cover"><span>{builder.company}</span><h2>{builder.title}</h2><p>{builder.subtitle}</p><small>{builder.cover.date}</small></div><div className="erb-kpi-grid">{builder.kpis.filter((kpi) => kpi.enabled).slice(0,4).map((kpi) => <div className="erb-kpi" key={kpi.id}><span>{kpi.title}</span><strong>{kpi.format === "currency" ? new Intl.NumberFormat(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0}).format(Number(kpi.value)||0) : kpi.format === "percentage" ? `${((Number(kpi.value)||0)*100).toFixed(1)}%` : Number(kpi.value||0).toLocaleString()}</strong><small>{kpi.sourceColumn || "Dataset"}</small></div>)}</div><div className="erb-insight-panel"><h3>Key Insights</h3><p>• {profile.rows.length.toLocaleString()} records available across {profile.columns.length} detected fields.</p><p>• {profile.numeric.length} numeric fields and {profile.dates.length} date fields detected.</p><p>• {profile.columns.filter((column) => column.missing > 0).length} columns contain missing values.</p></div></div> : <><div className="erb-table-wrap"><table><thead><tr>{enabledColumns.map((column) => <th key={column.key}>{column.label}<small>{column.type}</small></th>)}</tr></thead><tbody>{currentPreviewRows.map((row, ri) => <tr key={ri}>{enabledColumns.map((column) => <td key={column.key}>{formatPreviewValue(row[column.key], column.type)}</td>)}</tr>)}{!currentPreviewRows.length && <tr><td colSpan={Math.max(1,enabledColumns.length)} className="erb-no-data">No rows match the current filters.</td></tr>}</tbody></table></div><div className="erb-preview-footer"><span>{previewRows.length.toLocaleString()} visible rows</span><div><button onClick={() => setPreviewPage((page)=>Math.max(1,page-1))} disabled={previewPage===1}>‹</button><span>{previewPage} / {pageCount}</span><button onClick={() => setPreviewPage((page)=>Math.min(pageCount,page+1))} disabled={previewPage===pageCount}>›</button></div></div></>}
            </div>
            <div className="erb-sheet-tabs">{builder.sheets.map((sheet) => <button key={sheet.id} className={activeSheetId===sheet.id ? "active" : ""} onClick={() => setActiveSheetId(sheet.id)}>{sheet.name}</button>)}</div>
          </main>

          <aside className="erb-right">
            <div className="erb-config-header"><div><span className="card-label">CONFIGURATION</span><h2>Report controls</h2></div><span className="erb-live-dot">● Live</span></div>
            <div className="erb-config-tabs">{[["theme","Theme"],["columns","Columns"],["calculations","Calculations"],["charts","Charts"],["quality","Quality"],["export","Export"]].map(([id,label]) => <button key={id} className={rightSection===id?"active":""} onClick={()=>setRightSection(id)}>{label}</button>)}</div>

            {rightSection === "theme" && <div className="erb-config-stack"><ExcelReportBuilderPanel title="Theme Gallery" action={<button className="erb-mini-action" onClick={() => commit((current)=>({...current,themeId:recommendedTheme}))}>Use AI recommendation</button>}><div className="erb-theme-grid">{Object.values(EXCEL_THEMES).map((item)=><button key={item.id} className={`erb-theme ${builder.themeId===item.id?"selected":""}`} onClick={()=>commit((current)=>({...current,themeId:item.id,customTheme:null}))}><span style={{background:item.header}}></span><b>{item.name}</b><small>{item.style}</small></button>)}</div></ExcelReportBuilderPanel><ExcelReportBuilderPanel title="Custom Theme"><div className="erb-color-grid">{[["header","Header"],["accent","Accent"],["soft","Background"],["text","Text"]].map(([key,label])=><label key={key}>{label}<input type="color" value={builder.customTheme?.[key] || theme[key]} onChange={(event)=>commit((current)=>({...current,themeId:"custom",customTheme:{...(current.customTheme||theme),[key]:event.target.value}}))}/></label>)}</div><button className="erb-wide-action" onClick={()=>commit((current)=>({...current,themeId:"custom",customTheme:{...(current.customTheme||theme),name:"Custom",style:"Custom theme"}}))}>Save as custom theme</button></ExcelReportBuilderPanel><ExcelReportBuilderPanel title="Cover Sheet"><label className="erb-field">Company<input value={builder.cover.company} onChange={(e)=>commit((c)=>({...c,company:e.target.value,cover:{...c.cover,company:e.target.value}}))}/></label><label className="erb-field">Report title<input value={builder.title} onChange={(e)=>commit((c)=>({...c,title:e.target.value,cover:{...c.cover,title:e.target.value}}))}/></label><label className="erb-field">Subtitle<input value={builder.subtitle} onChange={(e)=>commit((c)=>({...c,subtitle:e.target.value,cover:{...c.cover,subtitle:e.target.value}}))}/></label><label className="erb-field">Author<input value={builder.author} onChange={(e)=>commit((c)=>({...c,author:e.target.value,cover:{...c.cover,author:e.target.value}}))}/></label></ExcelReportBuilderPanel></div>}

            {rightSection === "columns" && <div className="erb-config-stack"><ExcelReportBuilderPanel title={`Data Columns · ${enabledColumns.length}/${builder.selectedColumns.length}`} action={<button className="erb-mini-action" onClick={()=>commit((c)=>({...c,selectedColumns:c.selectedColumns.map((column)=>({...column,enabled:true}))}))}>Show all</button>}><div className="erb-column-list">{builder.selectedColumns.map((column,index)=><div className={`erb-column-row ${column.enabled?"enabled":""}`} key={column.key}><button className="erb-check" onClick={()=>updateColumn(column.key,{enabled:!column.enabled})}>{column.enabled?"✓":""}</button><div className="erb-column-main"><input value={column.label} onChange={(e)=>updateColumn(column.key,{label:e.target.value})}/><small>{column.key} · {column.type} · {column.unique} unique · {column.missing} missing</small></div><select value={column.type} onChange={(e)=>updateColumn(column.key,{type:e.target.value})}><option>text</option><option>number</option><option>currency</option><option>percentage</option><option>date</option><option>boolean</option><option>email</option><option>url</option></select><input className="erb-width" type="number" min="8" max="80" value={column.width || 18} onChange={(e)=>updateColumn(column.key,{width:Number(e.target.value)})}/><div className="erb-column-move"><button onClick={()=>moveColumn(index,-1)}>↑</button><button onClick={()=>moveColumn(index,1)}>↓</button></div></div>)}</div></ExcelReportBuilderPanel><ExcelReportBuilderPanel title="Freeze Panes"><label className="erb-field">Identifier columns<select value={builder.freezeColumns} onChange={(e)=>commit((c)=>({...c,freezeColumns:Number(e.target.value)}))}><option value="0">Header only</option>{builder.selectedColumns.slice(0,6).map((column,index)=><option key={column.key} value={index+1}>{index+1} · {column.label}</option>)}</select></label></ExcelReportBuilderPanel></div>}

            {rightSection === "calculations" && <div className="erb-config-stack"><ExcelReportBuilderPanel title="KPI Builder" action={<button className="erb-mini-action" onClick={()=>commit((c)=>({...c,kpis:[...c.kpis,{id:`kpi-${Date.now()}`,title:"New KPI",formula:"=COUNTA('Main Data'!A2:A1000)",value:0,enabled:true}]}))}><Plus size={13}/> KPI</button>}><div className="erb-kpi-editor">{builder.kpis.map((kpi,index)=><div className="erb-editor-row" key={kpi.id}><input value={kpi.title} onChange={(e)=>commit((c)=>({...c,kpis:c.kpis.map((item,i)=>i===index?{...item,title:e.target.value}:item)}))}/><select value={kpi.sourceColumn||""} onChange={(e)=>commit((c)=>({...c,kpis:c.kpis.map((item,i)=>i===index?{...item,sourceColumn:e.target.value}:item)}))}><option value="">Source column</option>{builder.selectedColumns.map((column)=><option key={column.key} value={column.key}>{column.label}</option>)}</select><input value={kpi.formula||""} onChange={(e)=>commit((c)=>({...c,kpis:c.kpis.map((item,i)=>i===index?{...item,formula:e.target.value}:item)}))}/><button onClick={()=>commit((c)=>({...c,kpis:c.kpis.filter((_,i)=>i!==index)}))}>×</button></div>)}</div></ExcelReportBuilderPanel><ExcelReportBuilderPanel title="Formula Builder"><div className="erb-formula-builder"><select id="erb-formula-fn"><option>SUM</option><option>AVERAGE</option><option>COUNT</option><option>COUNTA</option><option>COUNTIF</option><option>COUNTIFS</option><option>SUMIF</option><option>SUMIFS</option><option>MIN</option><option>MAX</option><option>MEDIAN</option><option>IF</option><option>IFS</option><option>XLOOKUP</option><option>VLOOKUP</option><option>ROUND</option><option>TEXT</option><option>DATE</option><option>YEAR</option><option>MONTH</option></select><select id="erb-formula-column"><option value="">Column</option>{builder.selectedColumns.map((column,index)=><option key={column.key} value={column.key}>{column.label}</option>)}</select><button className="erb-wide-action" onClick={()=>{const fn=document.getElementById("erb-formula-fn")?.value||"SUM";const key=document.getElementById("erb-formula-column")?.value||builder.selectedColumns[0]?.key;const index=builder.selectedColumns.findIndex((column)=>column.key===key);const formula=`=${fn}('${(builder.sheets.find((sheet)=>sheet.type==="data")?.name||"Main Data").replace(/'/g, "''")}'!${excelColumnLetter(index+1)}2:${excelColumnLetter(index+1)}${Math.max(2,filteredRows.length+1)})`;commit((c)=>({...c,formulas:[...c.formulas,{id:`formula-${Date.now()}`,name:`${fn} ${builder.selectedColumns[index]?.label||"Column"}`,formula,sourceColumn:key}]}));}}>Add formula</button></div><div className="erb-formula-list">{builder.formulas.map((formula)=><div key={formula.id}><b>{formula.name}</b><code>{formula.formula}</code><button onClick={()=>commit((c)=>({...c,formulas:c.formulas.filter((item)=>item.id!==formula.id)}))}>×</button></div>)}</div></ExcelReportBuilderPanel></div>}

            {rightSection === "charts" && <div className="erb-config-stack"><ExcelReportBuilderPanel title="Smart Chart Recommendations" action={<button className="erb-mini-action" onClick={()=>commit((c)=>({...c,charts:[...c.charts,...profile.charts.filter((suggested)=>!c.charts.some((chart)=>chart.categoryColumn===suggested.categoryColumn&&chart.valueColumn===suggested.valueColumn)).map((chart,index)=>({...chart,id:`chart-${Date.now()}-${index}`,enabled:true}))]}))}>Suggest Charts with AI</button>}><div className="erb-chart-list">{builder.charts.map((chart,index)=><div className={`erb-chart-card ${chart.enabled?"enabled":""}`} key={chart.id}><div><b>{chart.title}</b><small>{chart.type} · {chart.categoryColumn} → {chart.valueColumn}</small></div><div><button onClick={()=>commit((c)=>({...c,charts:c.charts.map((item,i)=>i===index?{...item,enabled:!item.enabled}:item)}))}>{chart.enabled?"On":"Off"}</button><button onClick={()=>commit((c)=>({...c,charts:c.charts.filter((_,i)=>i!==index)}))}>×</button></div></div>)}</div></ExcelReportBuilderPanel><ExcelReportBuilderPanel title="Chart types"><div className="erb-chip-grid">{["bar","column","line","area","pie","doughnut","scatter","combo"].map((type)=><button key={type} onClick={()=>commit((c)=>({...c,charts:[...c.charts,{id:`chart-${Date.now()}`,type,title:`${type[0].toUpperCase()+type.slice(1)} chart`,categoryColumn:c.categories?.[0]?.key||profile.categories[0]?.key||profile.columns[0]?.key,valueColumn:profile.numeric[0]?.key||profile.columns[0]?.key,enabled:true}]}))}>{type}</button>)}</div></ExcelReportBuilderPanel></div>}

            {rightSection === "quality" && <div className="erb-config-stack"><ExcelReportBuilderPanel title="Data Quality Review"><div className="erb-quality-grid"><div><b>{profile.columns.reduce((sum,column)=>sum+column.missing,0)}</b><span>Missing cells</span></div><div><b>{detectDuplicateRows(profile.rows,builder.selectedColumns).length}</b><span>Duplicate rows</span></div><div><b>{profile.columns.filter((column)=>column.type==="email").length}</b><span>Email fields</span></div><div><b>{profile.numeric.length}</b><span>Numeric fields</span></div></div><label className="erb-check-field"><input type="checkbox" checked={builder.quality.normalizeText} onChange={(e)=>commit((c)=>({...c,quality:{...c.quality,normalizeText:e.target.checked}}))}/><span>Normalize whitespace/capitalization on export copy</span></label><label className="erb-check-field"><input type="checkbox" checked={builder.quality.normalizeNumbers} onChange={(e)=>commit((c)=>({...c,quality:{...c.quality,normalizeNumbers:e.target.checked}}))}/><span>Normalize numeric values on export copy</span></label><label className="erb-check-field"><input type="checkbox" checked={builder.quality.removeEmptyRows} onChange={(e)=>commit((c)=>({...c,quality:{...c.quality,removeEmptyRows:e.target.checked}}))}/><span>Remove empty rows from export copy</span></label><label className="erb-check-field"><input type="checkbox" checked={builder.quality.removeDuplicates} onChange={(e)=>commit((c)=>({...c,quality:{...c.quality,removeDuplicates:e.target.checked}}))}/><span>Remove duplicate rows from export copy</span></label><p className="erb-note">Original analyzed data is never changed. Cleaning only affects the generated workbook.</p></ExcelReportBuilderPanel><ExcelReportBuilderPanel title="Filters & sorting"><button className="erb-wide-action" onClick={()=>{const column=builder.selectedColumns[0]?.key;if(column)commit((c)=>({...c,filters:[...c.filters,{id:`filter-${Date.now()}`,column,operator:"contains",value:""}]}));}}>+ Add filter</button>{builder.filters.map((filter,index)=><div className="erb-rule-row" key={filter.id}><select value={filter.column} onChange={(e)=>commit((c)=>({...c,filters:c.filters.map((item,i)=>i===index?{...item,column:e.target.value}:item)}))}>{builder.selectedColumns.map((column)=><option key={column.key} value={column.key}>{column.label}</option>)}</select><select value={filter.operator} onChange={(e)=>commit((c)=>({...c,filters:c.filters.map((item,i)=>i===index?{...item,operator:e.target.value}:item)}))}><option value="contains">Contains</option><option value="equals">Equals</option><option value="gt">Greater than</option><option value="lt">Less than</option><option value="gte">At least</option><option value="lte">At most</option></select><input value={filter.value} onChange={(e)=>commit((c)=>({...c,filters:c.filters.map((item,i)=>i===index?{...item,value:e.target.value}:item)}))}/><button onClick={()=>commit((c)=>({...c,filters:c.filters.filter((_,i)=>i!==index)}))}>×</button></div>)}<button className="erb-wide-action" onClick={()=>{const column=builder.selectedColumns[0]?.key;if(column)commit((c)=>({...c,sortRules:[...c.sortRules,{id:`sort-${Date.now()}`,column,direction:"asc"}]}));}}>+ Add sort rule</button>{builder.sortRules.map((rule,index)=><div className="erb-rule-row" key={rule.id}><select value={rule.column} onChange={(e)=>commit((c)=>({...c,sortRules:c.sortRules.map((item,i)=>i===index?{...item,column:e.target.value}:item)}))}>{builder.selectedColumns.map((column)=><option key={column.key} value={column.key}>{column.label}</option>)}</select><select value={rule.direction} onChange={(e)=>commit((c)=>({...c,sortRules:c.sortRules.map((item,i)=>i===index?{...item,direction:e.target.value}:item)}))}><option value="asc">Ascending</option><option value="desc">Descending</option></select><button onClick={()=>commit((c)=>({...c,sortRules:c.sortRules.filter((_,i)=>i!==index)}))}>×</button></div>)}</ExcelReportBuilderPanel></div>}

            {rightSection === "export" && <div className="erb-config-stack">
              {profile.cvMode && candidateDocuments.length > 0 && <ExcelReportBuilderPanel title="Candidate Overview Report">
                <p className="erb-note">Generate a presentation-ready HR workbook directly from the structured CV data returned by the analyzer.</p>
                <label className="erb-field">Candidate<select value={candidateSelection} onChange={(e) => setCandidateSelection(e.target.value)}><option value="all">All Candidates ({candidateDocuments.length})</option>{candidateDocuments.map((doc) => <option key={doc.id} value={doc.id}>{doc.extracted_data?.personal_information?.full_name || doc.name}</option>)}</select></label>
                <label className="erb-field">Theme<select value={candidateReportTheme} onChange={(e) => setCandidateReportTheme(e.target.value)}>{["modern","corporate","minimal","executive","recruitment","professional","dark","clean","blue","green","monochrome"].map((themeId) => <option key={themeId} value={themeId}>{themeId.replace(/(^|-)\w/g, (m) => m.replace("-", " ").toUpperCase())}</option>)}</select></label>
                <div className="erb-export-options">{[["overview","Candidate Overview"],["skills","Skills Matrix"],["experience","Experience"],["education","Education"],["certifications","Certifications"],["projects","Projects"],["languages","Languages"],["analytics","Candidate Analytics"],["database","Candidate Database"],["dashboard","Dashboard"]].map(([id,label]) => <label key={id}><input type="checkbox" checked={candidateReportTypes.includes(id)} onChange={(e) => setCandidateReportTypes((current) => e.target.checked ? [...new Set([...current,id])] : current.filter((item) => item !== id))}/><span>{label}</span></label>)}</div>
                <div className="erb-quality-grid"><div><b>{candidateReportRecords.length}</b><span>candidate{candidateReportRecords.length === 1 ? "" : "s"}</span></div><div><b>{candidateReportTypes.length}</b><span>report sections</span></div><div><b>{candidateDocuments.reduce((n,d) => n + (d.extracted_data?.education?.length || 0),0)}</b><span>education records</span></div><div><b>{candidateDocuments.reduce((n,d) => n + (d.extracted_data?.work_experience?.length || 0),0)}</b><span>experience records</span></div></div>
                <p className="erb-note">Missing source values remain blank/—. The workbook does not fabricate candidate qualifications.</p>
              </ExcelReportBuilderPanel>}
              <ExcelReportBuilderPanel title="Export Presets"><div className="erb-preset-grid">{[["quick","Quick Export"],["professional","Professional Report"],["full","Full Analysis"],["raw","Raw Data Only"]].map(([id,label])=><button key={id} onClick={()=>commit((c)=>{const options={...c.exportOptions};if(id==="quick")Object.assign(options,{cover:false,summary:true,kpis:true,charts:false,aiAnalysis:false,rawData:false,quality:false,formulas:false,index:false});if(id==="professional")Object.assign(options,{cover:true,summary:true,kpis:true,charts:true,aiAnalysis:true,rawData:true,quality:true,formulas:false,index:true});if(id==="full")Object.assign(options,{cover:true,summary:true,kpis:true,charts:true,aiAnalysis:true,rawData:true,quality:true,formulas:true,index:true});if(id==="raw")Object.assign(options,{cover:false,summary:false,kpis:false,charts:false,aiAnalysis:false,rawData:true,quality:false,formulas:false,index:false});return {...c,exportOptions:options};})}>{label}<small>{id==="professional"?"Board-ready workbook":"Use this preset"}</small></button>)}</div></ExcelReportBuilderPanel><ExcelReportBuilderPanel title="Export contents"><div className="erb-export-options">{Object.entries({cover:"Cover",summary:"Executive Summary",kpis:"KPIs",charts:"Charts",aiAnalysis:"AI Analysis",rawData:"Raw Data",quality:"Data Quality",formulas:"Formulas",index:"Workbook Index"}).map(([key,label])=><label key={key}><input type="checkbox" checked={Boolean(builder.exportOptions[key])} onChange={(e)=>commit((c)=>({...c,exportOptions:{...c.exportOptions,[key]:e.target.checked}}))}/><span>{label}</span></label>)}</div></ExcelReportBuilderPanel><ExcelReportBuilderPanel title="Filename"><label className="erb-field">File name<input value={builder.filename} onChange={(e)=>commit((c)=>({...c,filename:e.target.value}))}/></label><small className="erb-note">.xlsx is added automatically. Invalid filename characters are sanitized.</small></ExcelReportBuilderPanel><ExcelReportBuilderPanel title="AI Workbook Assistant"><label className="erb-field">Describe the report you want<textarea rows="4" value={assistantPrompt} onChange={(e)=>setAssistantPrompt(e.target.value)} placeholder="Make this suitable for presenting to my manager…"/></label><div className="erb-assistant-actions"><button className="erb-wide-action" onClick={runNaturalLanguage} disabled={isAssistantBusy}>Propose structure</button><button className="erb-wide-action primary" onClick={generateWithAI} disabled={isAssistantBusy}>Ask AI profiler</button></div></ExcelReportBuilderPanel></div>}
          </aside>
        </div>
        {isGenerating && <div className="erb-progress-overlay"><div className="erb-progress-card"><Sparkles size={22}/><h3>Building your workbook</h3><div className="erb-progress-steps">{["Preparing data","Building sheets","Applying styles","Generating formulas","Generating charts","Finalizing workbook"].map((step,index)=><div className={index<=generationStep?"done":""} key={step}><span>{index<generationStep?"✓":index===generationStep?"●":"○"}</span>{step}</div>)}</div><div className="erb-progress-bar"><i style={{width:`${Math.min(100,((generationStep+1)/6)*100)}%`}}/></div></div></div>}
      </div>
    </div>
  );
}

function detectDuplicateRows(rows = [], columns = []) {
  const seen = new Map(); const duplicates = [];
  const active = columns.filter((column) => column.enabled !== false);
  rows.forEach((row, index) => { const key = active.map((column) => String(row[column.key] ?? "").trim().toLowerCase()).join("\u0001"); if (seen.has(key)) duplicates.push({ first: seen.get(key), duplicate: index }); else seen.set(key, index); });
  return duplicates;
}


function excelThemeObject(id) {
  return IMPORT_EXCEL_THEMES.find((theme) => theme.id === id) || IMPORT_EXCEL_THEMES[0];
}

function excelImportCellText(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if (value.text != null) return String(value.text);
    if (value.result != null) return excelImportCellText(value.result);
    if (value.richText) return value.richText.map((x) => x.text || "").join("");
    return JSON.stringify(value);
  }
  return String(value);
}

function detectImportedColumnType(values = [], header = "") {
  const key = String(header).toLowerCase();
  const sample = values.map(excelImportCellText).filter(Boolean).slice(0, 80);
  if (!sample.length) return "Empty";
  if (/email/.test(key) || sample.every((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) return "Email";
  if (/percent|percentage|growth|margin|rate|ratio/.test(key) || sample.some((v) => /%$/.test(v))) return "Percentage";
  if (/amount|total|price|cost|revenue|profit|salary|tax|value|sales/.test(key) || sample.some((v) => /^[$€£₨]?\s*-?\d[\d,]*(?:\.\d+)?$/.test(v))) return "Currency/Number";
  if (/date|time|created|updated|due|expiry/.test(key) || sample.every((v) => !Number.isNaN(Date.parse(v)) && /\d/.test(v))) return "Date";
  if (sample.every((v) => /^-?\d[\d,]*(?:\.\d+)?$/.test(v))) return "Number";
  if (sample.every((v) => /^(true|false|yes|no)$/i.test(v))) return "Boolean";
  return "Text";
}

function normalizeImportedSheet(rows = []) {
  const raw = Array.isArray(rows) ? rows : [];
  const nonEmpty = raw.filter((row) => row.some((value) => excelImportCellText(value).trim() !== ""));
  if (!nonEmpty.length) return { headers: [], rows: [], duplicateHeaders: [], missingHeaders: false };

  const first = nonEmpty[0];
  const headerScore = first.filter((v) => String(v ?? "").trim()).length;
  const second = nonEmpty[1] || [];
  const secondNumbers = second.filter((v) => /^-?\d[\d,]*(?:\.\d+)?$/.test(excelImportCellText(v))).length;
  const looksLikeHeader = headerScore > 0 && (secondNumbers > 0 || nonEmpty.length === 1 || first.some((v) => /[A-Za-z]/.test(excelImportCellText(v))));
  const headerSource = looksLikeHeader ? first : first.map((_, i) => `Column ${i + 1}`);
  const dataSource = looksLikeHeader ? nonEmpty.slice(1) : nonEmpty;

  const seen = new Map();
  const duplicateHeaders = [];
  const headers = headerSource.map((value, index) => {
    const base = excelImportCellText(value).trim() || `Column ${index + 1}`;
    const count = (seen.get(base.toLowerCase()) || 0) + 1;
    seen.set(base.toLowerCase(), count);
    if (count > 1) duplicateHeaders.push(base);
    return count > 1 ? `${base} (${count})` : base;
  });

  const cleanRows = dataSource.map((row) =>
    headers.map((_, index) => excelImportCellText(row[index]).trim())
  ).filter((row) => row.some(Boolean));

  return {
    headers,
    rows: cleanRows,
    duplicateHeaders,
    missingHeaders: !looksLikeHeader,
  };
}

function summarizeImportedWorkbook(sheets = []) {
  const allRows = sheets.flatMap((sheet) => sheet.rows);
  const headers = sheets[0]?.headers || [];
  const columns = headers.map((header, index) => {
    const values = sheets.flatMap((sheet) => sheet.rows.map((row) => row[index])).filter(Boolean);
    return { header, index, type: detectImportedColumnType(values, header), values };
  });
  const missing = columns.reduce((total, column) => total + column.values.filter((v) => !String(v).trim()).length, 0);
  const duplicateValues = columns.reduce((total, column) => {
    const counts = {};
    column.values.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
    return total + Object.values(counts).filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
  }, 0);
  return {
    rows: allRows.length,
    columns: columns.length,
    sheets: sheets.length,
    missing,
    duplicateValues,
    columns,
  };
}

function ExcelThemeMiniPreview({ theme, compact = false }) {
  const rows = [["Revenue", "Growth", "Profit"], ["82,400", "14.2%", "31,200"], ["64,800", "9.8%", "22,400"]];
  return (
    <div className={`import-theme-mini ${compact ? "compact" : ""}`} style={{
      "--it-header": theme.colors.header,
      "--it-accent": theme.colors.accent,
      "--it-bg": theme.colors.background,
      "--it-text": theme.colors.text,
    }}>
      <div className="import-theme-mini-kpis">
        <span><b>$82K</b><small>Revenue</small></span>
        <span><b>14.2%</b><small>Growth</small></span>
        <span><b>$31K</b><small>Profit</small></span>
      </div>
      <div className="import-theme-mini-chart"><i /><i /><i /><i /><i /></div>
      <div className="import-theme-mini-table">
        {rows.map((row, ri) => (
          <div className={`import-theme-mini-row ${ri === 0 ? "head" : ""}`} key={ri}>
            {row.map((cell, ci) => <span key={ci}>{reactSafeExcelValue(cell)}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}


function reactSafeExcelValue(value, fallback = "—") {
  if (value == null || value === "") return fallback;
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    // ExcelJS can expose rich values/metadata objects. Never hand an object
    // directly to React as a child. Prefer a useful display field first.
    if (value.text != null) return String(value.text);
    if (value.result != null) return reactSafeExcelValue(value.result, fallback);
    if (value.header != null && value.type != null) return String(value.header);
    if (value.name != null) return String(value.name);
    if (Array.isArray(value.richText)) return value.richText.map((part) => part?.text || "").join("");
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return String(value);
}

function importedExcelValue(value, type) {
  const raw = excelImportCellText(value).trim();
  if (!raw) return "";
  if (type === "Number") {
    const n = Number(raw.replace(/,/g, ""));
    return Number.isFinite(n) ? n : raw;
  }
  if (type === "Currency/Number") {
    const n = Number(raw.replace(/[$€£₨,\s]/g, ""));
    return Number.isFinite(n) ? n : raw;
  }
  if (type === "Percentage") {
    const cleaned = raw.replace(/%/g, "").replace(/,/g, "").trim();
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return raw;
    return raw.includes("%") ? n / 100 : n;
  }
  if (type === "Boolean") return /^(true|yes)$/i.test(raw);
  if (type === "Date") {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? raw : date;
  }
  return raw;
}

async function createExcelChartImage(values = [], color = "#4F46E5", chartType = "bar", title = "") {
  if (typeof document === "undefined" || !values.length) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.font = "700 18px Arial";
  ctx.fillText(title || "Data trend", 28, 32);

  const nums = values.map(Number).filter(Number.isFinite).slice(0, 12);
  if (!nums.length) return null;
  const max = Math.max(...nums, 1);
  const min = Math.min(...nums, 0);
  const left = 55, top = 58, width = 810, height = 210;
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top + height);
  ctx.lineTo(left + width, top + height);
  ctx.stroke();

  ctx.fillStyle = color;
  if (chartType === "line" || chartType === "area") {
    const points = nums.map((n, i) => ({
      x: left + (nums.length === 1 ? width / 2 : (i / (nums.length - 1)) * width),
      y: top + height - ((n - min) / Math.max(max - min, 1)) * height,
    }));
    if (chartType === "area") {
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.moveTo(points[0].x, top + height);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, top + height);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    const gap = 12;
    const barWidth = Math.max(12, (width - gap * (nums.length - 1)) / nums.length);
    nums.forEach((n, i) => {
      const h = ((n - min) / Math.max(max - min, 1)) * height;
      const x = left + i * (barWidth + gap);
      const y = top + height - h;
      if (chartType === "pie" || chartType === "doughnut") {
        // Fall back to a column chart in Excel preview images for readability.
      }
      ctx.fillRect(x, y, barWidth, h);
    });
  }
  ctx.fillStyle = "#64748B";
  ctx.font = "11px Arial";
  ctx.fillText("Generated by Open Ledger Docs", 28, 300);
  return canvas.toDataURL("image/png");
}


/* -------------------------------------------------------------------------- */
/* AI Recruitment Analytics workspace                                        */
/* -------------------------------------------------------------------------- */

const RECRUITMENT_FIELD_DEFS = [
  ["candidateName", "Candidate Name", ["candidate name", "full name", "applicant name", "name", "candidate", "applicant"]],
  ["email", "Email", ["email", "email address", "e-mail", "candidate email"]],
  ["phone", "Phone", ["phone", "phone number", "mobile", "contact number", "telephone", "cell"]],
  ["location", "Location", ["location", "city", "candidate location", "address", "country"]],
  ["education", "Education", ["education", "degree", "qualification", "academic qualification"]],
  ["university", "University", ["university", "college", "institution", "school"]],
  ["skills", "Skills", ["skills", "skill", "technical skills", "core skills", "technologies", "tech skills"]],
  ["experience", "Experience", ["experience", "years experience", "years of experience", "total experience", "work experience", "exp years"]],
  ["currentCompany", "Current Company", ["current company", "company", "employer", "current employer", "organization"]],
  ["jobTitle", "Job Title / Role", ["job title", "job role", "role", "position", "designation", "title"]],
  ["department", "Department", ["department", "dept", "business unit", "function"]],
  ["industry", "Industry", ["industry", "sector"]],
  ["expectedSalary", "Expected Salary", ["expected salary", "salary expectation", "desired salary", "expected compensation"]],
  ["currentSalary", "Current Salary", ["current salary", "salary", "current compensation", "present salary"]],
  ["availability", "Availability", ["availability", "available from", "joining availability", "join date"]],
  ["noticePeriod", "Notice Period", ["notice period", "notice"]],
  ["status", "Status", ["status", "application status", "candidate status", "pipeline stage", "stage"]],
  ["applicationDate", "Application Date", ["application date", "applied date", "date applied", "application"]],
  ["source", "Source", ["source", "application source", "candidate source", "referral source"]],
  ["score", "CV / AI Score", ["cv score", "candidate score", "ai score", "score", "rating", "match score"]],
];

const RECRUITMENT_FIELD_LABELS = Object.fromEntries(RECRUITMENT_FIELD_DEFS.map(([id, label]) => [id, label]));

function normalizeRecruitmentHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_.\-\/]+/g, " ")
    .replace(/\s+/g, " ");
}

function recruitmentHeaderScore(header, aliases) {
  const h = normalizeRecruitmentHeader(header);
  let best = 0;
  aliases.forEach((alias) => {
    const a = normalizeRecruitmentHeader(alias);
    if (!a) return;
    if (h === a) best = Math.max(best, 100);
    else if (h.includes(a)) best = Math.max(best, 72);
    else if (a.split(" ").every((word) => h.includes(word))) best = Math.max(best, 58);
  });
  return best;
}

function detectRecruitmentMapping(headers) {
  const mapping = {};
  RECRUITMENT_FIELD_DEFS.forEach(([id, , aliases]) => {
    const ranked = headers
      .map((header, index) => ({ header, index, score: recruitmentHeaderScore(header, aliases) }))
      .filter((item) => item.score >= 58)
      .sort((a, b) => b.score - a.score || a.index - b.index);
    mapping[id] = ranked[0]?.score >= 72 ? ranked[0].header : "";
  });
  const skillHeaders = headers.filter((header) => /skill|technology|tech stack|competenc|expertise/i.test(String(header)));
  if (skillHeaders.length) mapping.skills = skillHeaders.join("||");
  return mapping;
}

function recruitmentCell(row, mapping, field) {
  const headers = String(mapping[field] || "").split("||").filter(Boolean);
  return headers.map((header) => row[header]).filter((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function recruitmentText(row, mapping, field) {
  return recruitmentCell(row, mapping, field).map((value) => String(value).trim()).filter(Boolean).join(" | ");
}

function parseExperience(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).toLowerCase().replace(/,/g, " ");
  const range = text.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  const years = text.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/);
  if (years) return Number(years[1]);
  const months = text.match(/(\d+(?:\.\d+)?)\s*(?:months?|mos?)/);
  if (months) return Number(months[1]) / 12;
  const n = Number(text.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeSkill(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const aliases = {
    python3: "Python", python: "Python", py: "Python",
    js: "JavaScript", javascript: "JavaScript", nodejs: "Node.js", "node js": "Node.js",
    reactjs: "React", "react.js": "React", react: "React",
    sql: "SQL", mysql: "MySQL", postgresql: "PostgreSQL", postgres: "PostgreSQL",
    powerbi: "Power BI", "power bi": "Power BI", "ms excel": "Excel", excel: "Excel",
    ai: "AI", "artificial intelligence": "AI", ml: "Machine Learning", "machine learning": "Machine Learning",
    nlp: "NLP", tableau: "Tableau", aws: "AWS", azure: "Azure", docker: "Docker", git: "Git",
  };
  const key = raw.toLowerCase().replace(/[\s_\-]+/g, "");
  return aliases[key] || raw.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractSkills(value) {
  return String(value || "")
    .split(/[;,|•\n\/]+/)
    .map(normalizeSkill)
    .filter(Boolean)
    .filter((skill) => skill.length > 1);
}

function normalizeEducation(value) {
  const text = String(value || "").toLowerCase();
  if (/ph\.?d|doctorate|doctoral/.test(text)) return "PhD";
  if (/mphil|m\.phil|master|mba|ms\b|m\.s\b|msc|ma\b|m\.a\b/.test(text)) return "Master's";
  if (/bachelor|bsc|bs\b|b\.s\b|ba\b|b\.a\b|bba|be\b|b\.e\b/.test(text)) return "Bachelor's";
  if (/diploma|associate|polytechnic/.test(text)) return "Diploma";
  if (/high school|secondary|intermediate|matric|a level|o level/.test(text)) return "High School";
  return String(value || "").trim() || "Unknown";
}

function experienceBand(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unknown";
  if (value < 1) return "0–1 years";
  if (value < 3) return "1–3 years";
  if (value < 5) return "3–5 years";
  if (value < 10) return "5–10 years";
  return "10+ years";
}

function countValues(values) {
  const map = new Map();
  values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

function medianNumber(values) {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function formatRecruitmentNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function parseRecruitmentCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some((v) => String(v).trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((v) => String(v).trim() !== "")) rows.push(row);
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((v, i) => String(v || `Column ${i + 1}`).trim() || `Column ${i + 1}`);
  return { headers, rows: rows.slice(1).map((values) => headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] ?? "" }), {})) };
}

function buildRecruitmentRows(headers, rawRows) {
  return rawRows.map((values) => headers.reduce((obj, header, index) => {
    obj[header] = values?.[index] ?? "";
    return obj;
  }, {}));
}

function RecruitmentBarChart({ title, items, emptyText = "No data available" }) {
  const max = Math.max(1, ...(items || []).map(([, value]) => Number(value) || 0));
  return (
    <div className="ra-chart-card">
      <div className="ra-card-heading"><div><span className="ra-eyebrow">ANALYTICS</span><h3>{title}</h3></div><BarChart3 size={18} /></div>
      {(items || []).length ? <div className="ra-bars">{items.slice(0, 10).map(([label, value]) => (
        <div className="ra-bar-row" key={String(label)}><div className="ra-bar-label"><span title={String(label)}>{String(label)}</span><b>{value}</b></div><div className="ra-bar-track"><i style={{ width: `${Math.max(4, ((Number(value) || 0) / max) * 100)}%` }} /></div></div>
      ))}</div> : <div className="ra-empty">{emptyText}</div>}
    </div>
  );
}


function WorkbookReportGenerator({ darkMode, onBack, onToast }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("Your Company");
  const [reportTitle, setReportTitle] = useState("Monthly Production & PD Dashboard");
  const [generating, setGenerating] = useState(false);

  const normalizeHeader = (v) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();

  const cleanValue = (value) => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value;
    if (typeof value === "object" && value?.result !== undefined) return cleanValue(value.result);
    if (typeof value === "object" && value?.text !== undefined) return String(value.text);
    return String(value).replace(/\s+/g, " ").trim();
  };

  const parseCsv = (csv) => {
    const out = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < csv.length; i++) {
      const ch = csv[i], next = csv[i + 1];
      if (ch === '"') {
        if (quoted && next === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === "," && !quoted) {
        row.push(cell); cell = "";
      } else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && next === "\n") i++;
        row.push(cell); out.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell.length || row.length) { row.push(cell); out.push(row); }
    return out.filter((r) => r.some((v) => String(v ?? "").trim() !== ""));
  };

  const sheetQuality = (rawRows) => {
    if (!rawRows.length) return 0;
    const data = rawRows.slice(1);
    let useful = 0, total = 0;
    data.slice(0, 80).forEach((r) => r.forEach((v) => {
      total++;
      const x = cleanValue(v);
      if (x && x !== "#NAME?" && x !== "#REF!" && x !== "#DIV/0!" && x !== "#VALUE!") useful++;
    }));
    return total ? useful / total : 0;
  };

  const readWorkbook = async (file) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "xls") {
      throw new Error("Legacy .xls files are not supported in the browser. Save the file as .xlsx or CSV and import it again.");
    }
    if (!["xlsx", "csv"].includes(ext)) {
      throw new Error("Please import an .xlsx or .csv file.");
    }
    if (file.size > 75 * 1024 * 1024) {
      throw new Error("This workbook is larger than 75 MB. Please use a smaller workbook.");
    }

    if (ext === "csv") {
      const raw = parseCsv(await file.text());
      if (!raw.length) throw new Error("The CSV file is empty.");
      return [{ name: file.name.replace(/\.csv$/i, ""), raw, quality: sheetQuality(raw) }];
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    return workbook.worksheets.map((ws) => {
      const raw = [];
      ws.eachRow({ includeEmpty: false }, (r) => raw.push(r.values.slice(1).map(cleanValue)));
      return { name: ws.name, raw, quality: sheetQuality(raw) };
    }).filter((x) => x.raw.length);
  };

  const applySheet = (sheet) => {
    const raw = sheet.raw || [];
    if (!raw.length) throw new Error("The selected sheet is empty.");
    const headerRow = raw[0];
    const width = Math.max(...raw.map((r) => r.length));
    const nextHeaders = Array.from({ length: width }, (_, i) => String(headerRow?.[i] || `Column ${i + 1}`).trim() || `Column ${i + 1}`);
    const nextRows = raw.slice(1)
      .filter((r) => r.some((v) => cleanValue(v) !== ""))
      .map((r) => nextHeaders.map((_, i) => cleanValue(r[i] ?? "")));
    setActiveSheet(sheet.name);
    setHeaders(nextHeaders);
    setRows(nextRows);
  };

  const importFile = async (file) => {
    if (!file) return;
    setError("");
    try {
      const loaded = await readWorkbook(file);
      if (!loaded.length) throw new Error("No readable worksheets were found.");
      setSheets(loaded);
      setFileName(file.name);
      const best = [...loaded].sort((a, b) => (b.quality * b.raw.length) - (a.quality * a.raw.length))[0];
      applySheet(best);
      onToast?.(`${file.name} loaded — ${loaded.length} worksheet${loaded.length === 1 ? "" : "s"} detected.`, "success");
    } catch (e) {
      setError(e?.message || "Unable to read this workbook.");
      setSheets([]); setHeaders([]); setRows([]);
    }
  };

  const findColumn = (aliases) => {
    const normalized = headers.map(normalizeHeader);
    const ranked = normalized.map((h, index) => {
      let score = 0;
      aliases.forEach((alias) => {
        const a = normalizeHeader(alias);
        if (h === a) score = Math.max(score, 100);
        else if (h.includes(a)) score = Math.max(score, 70);
        else if (a.includes(h) && h.length > 3) score = Math.max(score, 50);
      });
      return { index, score };
    }).sort((a, b) => b.score - a.score);
    return ranked[0]?.score >= 50 ? ranked[0].index : -1;
  };

  const getCol = (aliases) => findColumn(aliases);

  const columnMap = useMemo(() => {
    const base = {
      job: getCol(["job no", "job number", "job", "order no", "order number"]),
      orderType: getCol(["order type", "type", "process type"]),
      customer: getCol(["cust./pd/mkt", "customer", "cust", "client", "customer name"]),
      design: getCol(["shade / design", "shade", "design", "article", "product"]),
      construction: getCol(["construction", "fabric construction", "fabric"]),
      meters: getCol(["mtrs", "mtrs.", "mtr", "meters", "metres", "quantity", "qty"]),
      purpose: getCol(["purpose", "use", "activity"]),
      issueDate: getCol(["g.issue date", "issue date", "gi date", "received date", "start date"]),
      planDate: getCol(["plan date", "planned date", "plan"]),
      expectedDate: getCol(["expected date", "due date", "target date", "delivery date"]),
      completionDate: getCol(["completion date", "process end date", "end date", "completed date"]),
      nods: getCol(["nods", "days", "age", "aging", "turnaround days"]),
      status: getCol(["status", "stage", "progress", "order status"]),
      remarks: getCol(["remarks", "remark", "comments", "comment", "notes"]),
      department: getCol(["dept", "department", "section", "unit"]),
    };

    // Some operational workbooks have a header/data shift (for example a
    // "Purpose" header above the quantity column). Detect that safely rather
    // than reporting text such as "Development" as meter volume.
    const numericRatio = (index) => {
      if (index < 0 || !rows.length) return 0;
      const sample = rows.slice(0, 120).map(r => r[index]).filter(v => String(v ?? "").trim() !== "");
      if (!sample.length) return 0;
      return sample.filter(v => Number.isFinite(Number(String(v).replace(/[,₨$€£% ]/g, "")))).length / sample.length;
    };
    const textRatio = (index) => {
      if (index < 0 || !rows.length) return 0;
      const sample = rows.slice(0, 120).map(r => r[index]).filter(v => String(v ?? "").trim() !== "");
      if (!sample.length) return 0;
      return sample.filter(v => !Number.isFinite(Number(String(v).replace(/[,₨$€£% ]/g, "")))).length / sample.length;
    };

    if (base.meters >= 0 && base.purpose >= 0 &&
        numericRatio(base.purpose) > 0.55 && numericRatio(base.meters) < 0.35) {
      [base.meters, base.purpose] = [base.purpose, base.meters];
    }

    return base;
  }, [headers, rows]);

  const toNumber = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(String(v).replace(/[,₨$€£% ]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const toDate = (v) => {
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
    const s = String(v ?? "").trim();
    if (!s || /^(na|n\/a|-|—)$/i.test(s)) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const dataset = useMemo(() => rows.map((row, index) => {
    const get = (key) => columnMap[key] >= 0 ? row[columnMap[key]] : "";
    const statusRaw = String(get("status") || "Unknown").trim();
    const status = /delay|late|overdue/i.test(statusRaw) ? "Delayed"
      : /ontime|on time|complete|done|closed/i.test(statusRaw) ? "On Time / Done"
      : /process|rolling|finish|pending|open/i.test(statusRaw) ? "In Process"
      : statusRaw || "Unknown";
    const nods = toNumber(get("nods"));
    const meters = toNumber(get("meters"));
    const expected = toDate(get("expectedDate"));
    const completed = toDate(get("completionDate"));
    const daysLate = expected && completed ? Math.max(0, Math.round((completed - expected) / 86400000)) : 0;
    return {
      id: `${index}-${get("job") || index}`,
      job: String(get("job") || `Record ${index + 1}`),
      orderType: String(get("orderType") || "Unknown").trim() || "Unknown",
      customer: String(get("customer") || "Unknown").replace(/\s+/g, " ").trim() || "Unknown",
      design: String(get("design") || "Unknown").trim() || "Unknown",
      construction: String(get("construction") || "Unknown").trim() || "Unknown",
      meters, purpose: String(get("purpose") || "Unknown").trim() || "Unknown",
      issueDate: toDate(get("issueDate")), planDate: toDate(get("planDate")),
      expectedDate: expected, completionDate: completed, nods,
      status, rawStatus: statusRaw,
      remarks: String(get("remarks") || "").trim(),
      department: String(get("department") || get("orderType") || "Unknown").trim() || "Unknown",
      daysLate,
      raw: row,
    };
  }), [rows, columnMap]);

  const isProduction = useMemo(() => {
    const joined = headers.join(" ").toLowerCase();
    return /job\s*(no|number)?|mtrs?|meters?|nods|shade|construction|g\.?issue|expected date|completion date/.test(joined);
  }, [headers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dataset;
    return dataset.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [dataset, search]);

  const stats = useMemo(() => {
    const validMeters = dataset.map((r) => r.meters).filter(Number.isFinite);
    const validNods = dataset.map((r) => r.nods).filter(Number.isFinite);
    const delayed = dataset.filter((r) => r.status === "Delayed");
    const done = dataset.filter((r) => r.status === "On Time / Done");
    const inProcess = dataset.filter((r) => r.status === "In Process");
    const withExpected = dataset.filter((r) => r.expectedDate);
    const onTimeRate = withExpected.length ? Math.round(((withExpected.length - delayed.length) / withExpected.length) * 100) : null;
    const group = (key) => {
      const m = new Map();
      dataset.forEach((r) => m.set(r[key], (m.get(r[key]) || 0) + 1));
      return [...m.entries()].sort((a,b) => b[1] - a[1]);
    };
    const meterGroup = (key) => {
      const m = new Map();
      dataset.forEach((r) => m.set(r[key], (m.get(r[key]) || 0) + (r.meters || 0)));
      return [...m.entries()].sort((a,b) => b[1] - a[1]);
    };
    const dateMap = new Map();
    dataset.forEach((r) => {
      const d = r.expectedDate || r.issueDate;
      if (d) {
        const key = d.toISOString().slice(0, 10);
        dateMap.set(key, (dateMap.get(key) || 0) + 1);
      }
    });
    return {
      total: dataset.length,
      meters: validMeters.reduce((a,b) => a+b, 0),
      avgMeters: validMeters.length ? validMeters.reduce((a,b)=>a+b,0) / validMeters.length : 0,
      avgNods: validNods.length ? validNods.reduce((a,b)=>a+b,0) / validNods.length : 0,
      delayed: delayed.length, done: done.length, inProcess: inProcess.length,
      onTimeRate, maxLate: Math.max(0, ...dataset.map((r) => r.daysLate)),
      orderTypes: group("orderType"), customers: group("customer"), purposes: group("purpose"),
      statuses: group("status"), departments: group("department"), designs: group("design"),
      customerMeters: meterGroup("customer"), departmentMeters: meterGroup("department"),
      dates: [...dateMap.entries()].sort((a,b)=>a[0].localeCompare(b[0])),
    };
  }, [dataset]);

  const insights = useMemo(() => {
    const out = [];
    if (!dataset.length) return out;
    if (stats.delayed) out.push({ tone:"warning", title:"Delay concentration", text:`${stats.delayed} of ${stats.total} records are marked delayed. Review the delay reasons in Remarks and the customers/orders with the highest exposure.` });
    if (stats.onTimeRate !== null) out.push({ tone:stats.onTimeRate >= 90 ? "good" : "warning", title:"Delivery performance", text:`The workbook shows an on-time / non-delayed rate of ${stats.onTimeRate}% based on records with an expected date.` });
    if (stats.customerMeters[0]) out.push({ tone:"info", title:"Largest workload", text:`${stats.customerMeters[0][0]} carries the largest recorded meter volume at ${Math.round(stats.customerMeters[0][1]).toLocaleString()} m.` });
    if (stats.orderTypes[0]) out.push({ tone:"info", title:"Order mix", text:`${stats.orderTypes[0][0]} is the most frequent order type with ${stats.orderTypes[0][1]} records.` });
    if (stats.avgNods) out.push({ tone:"info", title:"Average NODS", text:`Average NODS is ${stats.avgNods.toFixed(1)} days across ${dataset.filter(r=>Number.isFinite(r.nods)).length} records with numeric NODS values.` });
    if (stats.maxLate) out.push({ tone:"warning", title:"Longest recorded delay", text:`The largest calculated gap between expected and completion dates is ${stats.maxLate} day${stats.maxLate === 1 ? "" : "s"}.` });
    const unknown = dataset.filter((r) => r.status === "Unknown").length;
    if (unknown) out.push({ tone:"muted", title:"Data quality", text:`${unknown} records have no recognizable status. Adding a consistent Status value will improve the delivery funnel.` });
    return out.slice(0, 6);
  }, [dataset, stats]);

  const chartMax = (items) => Math.max(1, ...items.map(([,v]) => Number(v) || 0));

  const downloadReport = async () => {
    if (!dataset.length) return;
    setGenerating(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Open Ledger Docs";
      wb.created = new Date();

      const theme = { navy:"172554", blue:"2563EB", cyan:"06B6D4", green:"16A34A", amber:"D97706", red:"DC2626", slate:"475569", light:"EFF6FF", pale:"F8FAFC", white:"FFFFFF" };
      const styleHeader = (row) => row.eachCell((c) => {
        c.font = { bold:true, color:{argb:"FF"+theme.white}, size:11 };
        c.fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FF"+theme.navy} };
        c.alignment = { vertical:"middle", wrapText:true };
      });
      const styleSheet = (ws) => {
        ws.views = [{ state:"frozen", ySplit:1 }];
        ws.autoFilter = { from:"A1", to:`${String.fromCharCode(64 + Math.min(26, ws.columnCount))}1` };
        ws.eachRow((row, ri) => {
          if (ri > 1) row.eachCell((c) => { c.alignment = { vertical:"top", wrapText:true }; });
        });
        ws.columns.forEach((c) => { c.width = Math.min(38, Math.max(12, ...c.values.slice(1, Math.min(30,c.values.length)).map(v => String(v ?? "").length + 2))); });
      };

      const dash = wb.addWorksheet("Executive Dashboard");
      dash.mergeCells("A1:H1"); dash.getCell("A1").value = reportTitle; dash.getCell("A1").font = { size:22,bold:true,color:{argb:"FF"+theme.white} }; dash.getCell("A1").fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+theme.navy}}; dash.getRow(1).height=34;
      dash.mergeCells("A2:H2"); dash.getCell("A2").value = `${companyName}  •  ${fileName}  •  Generated ${new Date().toLocaleString()}`; dash.getCell("A2").font={italic:true,color:{argb:"FF64748B"}};
      [["Total Records",stats.total],["Total Meters",Math.round(stats.meters)],["Delayed",stats.delayed],["On Time / Done",stats.done],["In Process",stats.inProcess],["Avg NODS",Number(stats.avgNods.toFixed(1))],["On-Time Rate",stats.onTimeRate === null ? "N/A" : `${stats.onTimeRate}%`],["Customers",stats.customers.length]].forEach((k,i)=>{ const col=1+(i%4)*2,row=4+Math.floor(i/4)*3; dash.getCell(row,col).value=k[0];dash.getCell(row,col).font={bold:true,color:{argb:"FF"+theme.slate}};dash.getCell(row+1,col).value=k[1];dash.getCell(row+1,col).font={size:18,bold:true,color:{argb:"FF"+theme.blue}};dash.getCell(row,col).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+theme.light}};dash.getCell(row+1,col).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+theme.light}};dash.mergeCells(row,col,row, col+1);dash.mergeCells(row+1,col,row+1,col+1);});
      let r = 11;
      const addBreakdown = (title, items, valueTitle="Records") => { dash.mergeCells(r,1,r,4);dash.getCell(r,1).value=title;dash.getCell(r,1).font={bold:true,size:13,color:{argb:"FF"+theme.navy}};r++;dash.getRow(r).values=["Category",valueTitle,"Share","Visual"];styleHeader(dash.getRow(r));r++;const max=chartMax(items);items.slice(0,10).forEach(([label,value])=>{dash.getRow(r).values=[String(label),value,stats.total?value/stats.total:0,"█".repeat(Math.max(1,Math.round(value/max*20)))];dash.getCell(r,3).numFmt="0.0%";r++;});r+=1;};
      addBreakdown("Status",stats.statuses);
      addBreakdown("Order Type",stats.orderTypes);
      addBreakdown("Top Customers",stats.customers);
      addBreakdown("Purpose",stats.purposes);
      const dataWs=wb.addWorksheet("Data");
      dataWs.addRow(headers); dataset.forEach((d)=>dataWs.addRow(d.raw)); styleHeader(dataWs.getRow(1)); styleSheet(dataWs);
      const insightsWs=wb.addWorksheet("Insights"); insightsWs.addRow(["Insight","Details"]);styleHeader(insightsWs.getRow(1));insights.forEach(x=>insightsWs.addRow([x.title,x.text]));styleSheet(insightsWs);
      const kpiWs=wb.addWorksheet("KPI Summary"); kpiWs.addRows([["Metric","Value"],["Total Records",stats.total],["Total Meters",stats.meters],["Average Meters / Record",stats.avgMeters],["Average NODS",stats.avgNods],["Delayed",stats.delayed],["On Time / Done",stats.done],["In Process",stats.inProcess],["On-Time Rate",stats.onTimeRate === null ? "N/A" : stats.onTimeRate/100]]);styleHeader(kpiWs.getRow(1));kpiWs.getCell("B9").numFmt="0.0%";styleSheet(kpiWs);
      const breakdowns=[["Customers",stats.customers],["Order Types",stats.orderTypes],["Statuses",stats.statuses],["Purposes",stats.purposes],["Departments",stats.departments]];
      breakdowns.forEach(([name,items])=>{const ws=wb.addWorksheet(name.slice(0,31));ws.addRow(["Category","Records","Share"]);items.forEach(([label,value])=>ws.addRow([label,value,stats.total?value/stats.total:0]));styleHeader(ws.getRow(1));ws.getColumn(3).numFmt="0.0%";styleSheet(ws);});
      const buffer=await wb.xlsx.writeBuffer();
      const blob=new Blob([buffer],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
      const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${companyName.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"") || "company"}-open-led-docs-report.xlsx`;a.click();URL.revokeObjectURL(url);
      onToast?.("Professional Excel report generated successfully.", "success");
    } catch (e) {
      onToast?.(e?.message || "Could not generate the report.", "error");
    } finally { setGenerating(false); }
  };

  const BarGroup = ({ title, items, suffix="" }) => {
    const max = chartMax(items);
    return <div className="wrg-card">
      <div className="wrg-card-title"><div><span>ANALYSIS</span><h3>{title}</h3></div><BarChart3 size={18}/></div>
      {items.slice(0,8).map(([label,value]) => <div className="wrg-bar-row" key={String(label)}>
        <div className="wrg-bar-meta"><b title={String(label)}>{String(label)}</b><span>{Number(value).toLocaleString()} {suffix}</span></div>
        <div className="wrg-track"><i style={{width:`${Math.max(3,(Number(value)/max)*100)}%`}}/></div>
      </div>)}
      {!items.length && <div className="wrg-empty">No data detected.</div>}
    </div>;
  };

  return <>
    <style>{WORKBOOK_REPORT_STYLES}</style>
    <section className={`wrg ${darkMode ? "wrg-dark" : ""}`}>
      <div className="wrg-hero">
        <div><button className="wrg-back" onClick={onBack}><ArrowLeft size={16}/> Dashboard</button>
          <div className="wrg-kicker"><Sparkles size={14}/> AI EXCEL REPORT GENERATOR</div>
          <h1>Turn any Excel workbook into a management dashboard.</h1>
          <p>Import your real workbook. Open Ledger Docs detects the structure, KPIs, status, dates, workload, customers and operational patterns — then builds an interactive report without changing your original data.</p>
        </div>
        <div className="wrg-actions"><button className="wrg-btn secondary" onClick={()=>fileRef.current?.click()}><Upload size={17}/> Import Excel</button><button className="wrg-btn primary" disabled={!dataset.length || generating} onClick={downloadReport}><Download size={17}/>{generating?"Generating…":"Export Report"}</button></div>
      </div>
      <input ref={fileRef} type="file" hidden accept=".xlsx,.csv,.xls" onChange={e=>importFile(e.target.files?.[0])}/>
      {error && <div className="wrg-error"><AlertTriangle size={18}/><span>{error}</span></div>}
      {!dataset.length ? <div className="wrg-start">
        <div className="wrg-start-icon"><FileSpreadsheet size={42}/></div>
        <h2>Import a workbook to generate the dashboard</h2>
        <p>Supports Excel and CSV. The generator automatically chooses the most useful worksheet and lets you switch between sheets.</p>
        <button className="wrg-btn primary large" onClick={()=>fileRef.current?.click()}><FileUp size={18}/> Choose Excel File</button>
        <div className="wrg-feature-grid"><div><Layers/><b>Smart structure detection</b><span>Finds dates, numbers, status, customers, quantities and operational fields.</span></div><div><BarChart3/><b>Executive dashboards</b><span>KPIs, workload, trends, status and category analysis from actual rows.</span></div><div><ShieldCheck/><b>Grounded insights</b><span>Insights are calculated from your imported workbook — no invented numbers.</span></div></div>
      </div> : <>
        <div className="wrg-toolbar"><div><strong>{fileName}</strong><span>{rows.length.toLocaleString()} records · {headers.length} columns · {sheets.length} sheets</span></div><div className="wrg-controls"><input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Company name"/><input value={reportTitle} onChange={e=>setReportTitle(e.target.value)} placeholder="Report title"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search workbook…"/></div></div>
        {sheets.length>1 && <div className="wrg-tabs">{sheets.map(s=><button key={s.name} className={activeSheet===s.name?"active":""} onClick={()=>applySheet(s)}>{s.name}<small>{s.raw.length-1}</small></button>)}</div>}
        <div className="wrg-detected"><Sparkles size={16}/><b>{isProduction ? "Production / PD workbook detected" : "Workbook intelligence detected"}</b><span>{headers.length} columns · {rows.length.toLocaleString()} usable records · Original source rows preserved</span></div>
        <div className="wrg-kpis">
          <div><span>Total Records</span><b>{stats.total.toLocaleString()}</b><small>rows analyzed</small></div>
          <div><span>Total Meters</span><b>{Math.round(stats.meters).toLocaleString()}</b><small>quantity detected</small></div>
          <div><span>Delayed</span><b className="red">{stats.delayed.toLocaleString()}</b><small>records flagged</small></div>
          <div><span>On Time / Done</span><b className="green">{stats.done.toLocaleString()}</b><small>completed / on-time</small></div>
          <div><span>In Process</span><b>{stats.inProcess.toLocaleString()}</b><small>active records</small></div>
          <div><span>Avg NODS</span><b>{stats.avgNods ? stats.avgNods.toFixed(1) : "—"}</b><small>days</small></div>
          <div><span>On-Time Rate</span><b>{stats.onTimeRate === null ? "—" : `${stats.onTimeRate}%`}</b><small>based on expected dates</small></div>
          <div><span>Customers</span><b>{stats.customers.length.toLocaleString()}</b><small>unique groups</small></div>
        </div>
        <div className="wrg-section-head"><div><span>EXECUTIVE VIEW</span><h2>Monthly Operations Dashboard</h2></div><span className="wrg-live"><i/> LIVE FROM IMPORTED DATA</span></div>
        <div className="wrg-grid two"><BarGroup title="Status & Delivery Pipeline" items={stats.statuses}/><BarGroup title="Order Type Mix" items={stats.orderTypes}/></div>
        <div className="wrg-grid two"><BarGroup title="Customer Workload" items={stats.customerMeters} suffix="m"/><BarGroup title="Purpose / Work Type" items={stats.purposes}/></div>
        <div className="wrg-grid two"><BarGroup title="Department / Process Volume" items={stats.departmentMeters} suffix="m"/><BarGroup title="Top Designs / Shades" items={stats.designs}/></div>
        <div className="wrg-card wrg-timeline">
          <div className="wrg-card-title"><div><span>DATE INTELLIGENCE</span><h3>Expected Workload Timeline</h3></div><Clock3 size={18}/></div>
          {stats.dates.length ? <div className="wrg-timeline-list">{stats.dates.slice(0,14).map(([date,value]) => {
            const max = chartMax(stats.dates);
            return <div className="wrg-timeline-row" key={date}><span>{new Date(date).toLocaleDateString(undefined,{day:"2-digit",month:"short"})}</span><div className="wrg-track"><i style={{width:`${Math.max(4,(value/max)*100)}%`}}/></div><b>{value}</b></div>;
          })}</div> : <div className="wrg-empty">No usable date column was detected.</div>}
        </div>
        <div className="wrg-card wrg-insights"><div className="wrg-card-title"><div><span>OPEN LEDGER DOCS INTELLIGENCE</span><h3>Management Insights</h3></div><Sparkles size={18}/></div><div className="wrg-insight-grid">{insights.map((x,i)=><div className={`wrg-insight ${x.tone}`} key={i}><strong>{x.title}</strong><p>{x.text}</p></div>)}</div></div>
        <div className="wrg-card"><div className="wrg-card-title"><div><span>DATA EXPLORER</span><h3>Imported Records</h3></div><span>{filtered.length.toLocaleString()} matches</span></div><div className="wrg-table-wrap"><table><thead><tr>{headers.slice(0,10).map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.slice(0,20).map((r,i)=><tr key={r.id}>{r.raw.slice(0,10).map((v,j)=><td key={j}>{String(v ?? "")}</td>)}</tr>)}</tbody></table></div></div>
      </>}
    </section>
  </>;
}

const WORKBOOK_REPORT_STYLES = `
.wrg{padding:4px 0 80px;min-height:calc(100vh - 120px);color:#0f172a}.wrg-dark{color:#e5e7eb}.wrg-hero{display:flex;justify-content:space-between;gap:28px;align-items:flex-end;margin-bottom:24px}.wrg-hero h1{font-size:38px;line-height:1.03;letter-spacing:-.05em;margin:8px 0 10px;max-width:850px}.wrg-hero p{max-width:820px;color:#64748b;line-height:1.65;margin:0}.wrg-dark .wrg-hero p{color:#94a3b8}.wrg-back{border:0;background:transparent;color:#64748b;display:flex;align-items:center;gap:6px;padding:0;margin-bottom:15px;cursor:pointer}.wrg-kicker{display:flex;align-items:center;gap:7px;color:#2563eb;font-weight:900;font-size:11px;letter-spacing:.14em}.wrg-actions{display:flex;gap:9px;flex-wrap:wrap}.wrg-btn{border:1px solid #dbe3ef;border-radius:12px;padding:11px 15px;font-weight:800;display:inline-flex;align-items:center;gap:8px;cursor:pointer;background:#fff;color:#0f172a}.wrg-btn.primary{background:#172554;color:#fff;border-color:#172554;box-shadow:0 10px 25px rgba(23,37,84,.18)}.wrg-btn.secondary:hover{border-color:#2563eb}.wrg-btn.large{padding:13px 18px}.wrg-btn:disabled{opacity:.5;cursor:not-allowed}.wrg-dark .wrg-btn.secondary{background:#111827;color:#e5e7eb;border-color:#334155}.wrg-start{border:1px solid #dbe5f0;border-radius:28px;padding:70px 28px;text-align:center;background:radial-gradient(circle at 50% 0,#dbeafe,transparent 38%),#fff;box-shadow:0 20px 60px rgba(15,23,42,.08)}.wrg-dark .wrg-start,.wrg-dark .wrg-card,.wrg-dark .wrg-toolbar,.wrg-dark .wrg-detected{background:#0f172a;border-color:#263449}.wrg-start-icon{width:82px;height:82px;margin:0 auto 18px;border-radius:24px;display:grid;place-items:center;background:#dbeafe;color:#2563eb}.wrg-start h2{font-size:26px;margin:0 0 9px}.wrg-start p{max-width:680px;margin:0 auto 24px;color:#64748b}.wrg-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:900px;margin:34px auto 0;text-align:left}.wrg-feature-grid>div{padding:18px;border:1px solid #e2e8f0;border-radius:18px;background:#ffffff}.wrg-feature-grid svg{color:#2563eb;margin-bottom:14px}.wrg-feature-grid b,.wrg-feature-grid span{display:block}.wrg-feature-grid span{color:#64748b;font-size:12px;line-height:1.5;margin-top:6px}.wrg-error{display:flex;gap:10px;align-items:center;padding:13px 15px;border:1px solid #fecaca;background:#fff1f2;color:#991b1b;border-radius:14px;margin-bottom:16px}.wrg-toolbar{display:flex;justify-content:space-between;gap:15px;align-items:center;padding:15px 17px;background:#fff;border:1px solid #dbe5f0;border-radius:18px;margin-bottom:10px}.wrg-toolbar strong{display:block}.wrg-toolbar span{font-size:12px;color:#64748b}.wrg-controls{display:flex;gap:8px;flex-wrap:wrap}.wrg-controls input{border:1px solid #dbe3ef;border-radius:10px;padding:9px 11px;min-width:150px;background:transparent;color:inherit}.wrg-tabs{display:flex;gap:7px;overflow:auto;padding:2px 0 12px}.wrg-tabs button{border:1px solid #dbe3ef;background:#fff;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer;white-space:nowrap}.wrg-tabs button.active{background:#172554;color:#fff;border-color:#172554}.wrg-tabs small{opacity:.65;margin-left:6px}.wrg-detected{display:flex;align-items:center;gap:8px;padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:13px;margin-bottom:14px;color:#1e40af}.wrg-detected span{color:#64748b;font-size:12px}.wrg-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:22px}.wrg-kpis>div{padding:17px;border:1px solid #dbe5f0;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(15,23,42,.045)}.wrg-kpis span,.wrg-kpis small{display:block;color:#64748b;font-size:11px}.wrg-kpis b{display:block;font-size:25px;letter-spacing:-.03em;margin:7px 0 3px}.wrg-kpis b.red{color:#dc2626}.wrg-kpis b.green{color:#16a34a}.wrg-section-head{display:flex;justify-content:space-between;align-items:end;margin:8px 0 13px}.wrg-section-head span:first-child,.wrg-card-title span:first-child{font-size:10px;font-weight:900;letter-spacing:.12em;color:#64748b}.wrg-section-head h2{margin:4px 0 0;font-size:22px}.wrg-live{font-size:10px;font-weight:900;letter-spacing:.08em;color:#16a34a;display:flex;gap:6px;align-items:center}.wrg-live i{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 5px rgba(34,197,94,.1)}.wrg-grid{display:grid;gap:13px;margin-bottom:13px}.wrg-grid.two{grid-template-columns:1fr 1fr}.wrg-card{background:#fff;border:1px solid #dbe5f0;border-radius:20px;padding:18px;box-shadow:0 10px 32px rgba(15,23,42,.045)}.wrg-card-title{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px}.wrg-card-title h3{margin:4px 0 0;font-size:16px}.wrg-bar-row{margin:12px 0}.wrg-bar-meta{display:flex;justify-content:space-between;gap:12px;font-size:12px;margin-bottom:5px}.wrg-bar-meta b{max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wrg-bar-meta span{color:#64748b}.wrg-track{height:8px;background:#e8eef7;border-radius:99px;overflow:hidden}.wrg-track i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#2563eb,#06b6d4)}.wrg-insights{margin-bottom:13px}.wrg-insight-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.wrg-insight{padding:14px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0}.wrg-insight.warning{background:#fff7ed;border-color:#fed7aa}.wrg-insight.good{background:#f0fdf4;border-color:#bbf7d0}.wrg-insight.info{background:#eff6ff;border-color:#bfdbfe}.wrg-insight strong{font-size:13px}.wrg-insight p{margin:6px 0 0;color:#64748b;font-size:12px;line-height:1.5}.wrg-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:13px}.wrg table{width:100%;border-collapse:collapse;font-size:12px}.wrg th,.wrg td{padding:10px 11px;border-bottom:1px solid #e5e7eb;text-align:left;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}.wrg th{background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#475569}.wrg-dark .wrg-kpis>div,.wrg-dark .wrg-feature-grid>div,.wrg-dark .wrg-tabs button,.wrg-dark .wrg-btn.secondary{background:#0f172a;border-color:#334155}.wrg-dark .wrg-toolbar,.wrg-dark .wrg-card,.wrg-dark .wrg-kpis>div{box-shadow:none}.wrg-dark .wrg-th,.wrg-dark th{background:#111827}.wrg-dark td,.wrg-dark th{border-color:#243244}.wrg-dark .wrg-insight{background:#111827;border-color:#334155}.wrg-dark .wrg-track{background:#1e293b}.wrg-timeline{margin-bottom:13px}.wrg-timeline-list{display:grid;gap:9px}.wrg-timeline-row{display:grid;grid-template-columns:70px 1fr 35px;gap:10px;align-items:center;font-size:12px}.wrg-timeline-row>span{color:#64748b}.wrg-timeline-row>b{text-align:right}.wrg-empty{padding:18px;text-align:center;color:#64748b;font-size:12px}@media(max-width:1050px){.wrg-kpis{grid-template-columns:repeat(2,1fr)}.wrg-grid.two,.wrg-feature-grid{grid-template-columns:1fr}.wrg-insight-grid{grid-template-columns:1fr}.wrg-hero,.wrg-toolbar{flex-direction:column;align-items:stretch}.wrg-controls input{flex:1;min-width:120px}}@media(max-width:650px){.wrg-hero h1{font-size:30px}.wrg-kpis{grid-template-columns:1fr 1fr}.wrg-kpis b{font-size:21px}.wrg-actions{width:100%}.wrg-actions .wrg-btn{flex:1;justify-content:center}.wrg-section-head{align-items:flex-start;flex-direction:column;gap:8px}}
`;

function RecruitmentAnalyticsWorkspace({ darkMode, onBack, onToast }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [mappingOpen, setMappingOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ location: "All", experience: "All", education: "All", skill: "All", department: "All", role: "All", status: "All" });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [shortlists, setShortlists] = useState({});
  const [shortlistName, setShortlistName] = useState("Shortlist A");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [reportTheme, setReportTheme] = useState("Corporate HR");
  const [companyName, setCompanyName] = useState("Your Company");
  const [reportTitle, setReportTitle] = useState("Candidate Recruitment Analytics");
  const [preparedBy, setPreparedBy] = useState("Open Ledger Docs");
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");

  const importFile = async (file) => {
    if (!file) return;
    setError("");
    const ext = getFileExtension(file.name);
    try {
      let parsedHeaders = [], parsedRows = [];
      if (ext === "csv") {
        const parsed = parseRecruitmentCsv(await file.text());
        parsedHeaders = parsed.headers;
        parsedRows = parsed.rows;
      } else if (ext === "xlsx") {
        if (file.size > 50 * 1024 * 1024) throw new Error("This workbook is larger than 50 MB. Please use a smaller file for browser analytics.");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const worksheet = workbook.worksheets.find((sheet) => sheet.rowCount > 0);
        if (!worksheet) throw new Error("The workbook is empty.");
        const raw = [];
        worksheet.eachRow({ includeEmpty: false }, (row) => raw.push(row.values.slice(1)));
        if (!raw.length) throw new Error("No readable rows were found.");
        parsedHeaders = raw[0].map((v, i) => String(v ?? `Column ${i + 1}`).trim() || `Column ${i + 1}`);
        parsedRows = buildRecruitmentRows(parsedHeaders, raw.slice(1));
      } else if (ext === "xls") {
        throw new Error("Legacy .xls files are not parsed by the current browser Excel engine. Save the workbook as .xlsx or CSV and import it again.");
      } else {
        throw new Error("Please choose an .xlsx or .csv recruitment workbook.");
      }
      if (!parsedHeaders.length || !parsedRows.length) throw new Error("The file contains no candidate records. Add a header row and candidate data.");
      const detected = detectRecruitmentMapping(parsedHeaders);
      setFileName(file.name); setHeaders(parsedHeaders); setRows(parsedRows); setMapping(detected); setPage(1); setSelectedIds(new Set()); setSelectedCandidate(null); setActiveSection("dashboard");
      onToast?.(`${file.name} loaded — ${parsedRows.length.toLocaleString()} candidate records detected.`, "success");
    } catch (e) {
      setHeaders([]); setRows([]); setMapping({}); setError(e?.message || "Unable to read this file.");
    }
  };

  const candidates = useMemo(() => rows.map((row, index) => {
    const exp = parseExperience(recruitmentText(row, mapping, "experience"));
    const skills = [...new Set(recruitmentCell(row, mapping, "skills").flatMap(extractSkills))];
    const educationRaw = recruitmentText(row, mapping, "education");
    const location = recruitmentText(row, mapping, "location") || "Unknown";
    const status = recruitmentText(row, mapping, "status") || "Unknown";
    const scoreText = recruitmentText(row, mapping, "score");
    const scoreMatch = scoreText.match(/-?\d+(?:\.\d+)?/);
    const score = scoreMatch ? Number(scoreMatch[0]) : null;
    return {
      id: `${index}-${recruitmentText(row, mapping, "candidateName") || index}`,
      raw: row, name: recruitmentText(row, mapping, "candidateName") || `Candidate ${index + 1}`,
      email: recruitmentText(row, mapping, "email"), phone: recruitmentText(row, mapping, "phone"), location,
      education: normalizeEducation(educationRaw), educationRaw, university: recruitmentText(row, mapping, "university"),
      skills, experience: exp, currentCompany: recruitmentText(row, mapping, "currentCompany"),
      jobTitle: recruitmentText(row, mapping, "jobTitle") || "Unspecified", department: recruitmentText(row, mapping, "department") || "Unspecified",
      industry: recruitmentText(row, mapping, "industry"), expectedSalary: recruitmentText(row, mapping, "expectedSalary"), currentSalary: recruitmentText(row, mapping, "currentSalary"),
      availability: recruitmentText(row, mapping, "availability"), noticePeriod: recruitmentText(row, mapping, "noticePeriod"), status,
      applicationDate: recruitmentText(row, mapping, "applicationDate"), source: recruitmentText(row, mapping, "source"), score,
      experienceBand: experienceBand(exp),
    };
  }), [rows, mapping]);

  const locations = useMemo(() => countValues(candidates.map((c) => c.location)), [candidates]);
  const roles = useMemo(() => countValues(candidates.map((c) => c.jobTitle)), [candidates]);
  const departments = useMemo(() => countValues(candidates.map((c) => c.department)), [candidates]);
  const education = useMemo(() => countValues(candidates.map((c) => c.education)), [candidates]);
  const experienceBands = useMemo(() => {
    const order = ["0–1 years", "1–3 years", "3–5 years", "5–10 years", "10+ years", "Unknown"];
    const counts = Object.fromEntries(countValues(candidates.map((c) => c.experience)));
    return order.map((band) => [band, candidates.filter((c) => c.experienceBand === band).length]);
  }, [candidates]);
  const skills = useMemo(() => countValues(candidates.flatMap((c) => c.skills)), [candidates]);
  const statuses = useMemo(() => countValues(candidates.map((c) => c.status).filter((s) => s !== "Unknown")), [candidates]);
  const experienceValues = useMemo(() => candidates.map((c) => c.experience).filter(Number.isFinite), [candidates]);
  const avgExperience = experienceValues.length ? experienceValues.reduce((a, b) => a + b, 0) / experienceValues.length : null;
  const medianExperience = medianNumber(experienceValues);
  const uniqueSkills = skills.length;
  const uniqueLocations = new Set(candidates.map((c) => c.location).filter((x) => x !== "Unknown")).size;
  const uniqueEducation = new Set(candidates.map((c) => c.education).filter((x) => x !== "Unknown")).size;
  const experiencedCount = candidates.filter((c) => Number.isFinite(c.experience) && c.experience >= 5).length;
  const entryLevelCount = candidates.filter((c) => Number.isFinite(c.experience) && c.experience < 2).length;
  const hasStatus = Boolean(mapping.status && statuses.length);
  const hasScore = Boolean(mapping.score && candidates.some((c) => Number.isFinite(c.score)));

  const filterOptions = useMemo(() => ({
    location: ["All", ...locations.map(([x]) => x).slice(0, 80)],
    experience: ["All", ...["0–1 years", "1–3 years", "3–5 years", "5–10 years", "10+ years"]],
    education: ["All", ...education.map(([x]) => x)],
    skill: ["All", ...skills.map(([x]) => x).slice(0, 100)],
    department: ["All", ...departments.map(([x]) => x).slice(0, 80)],
    role: ["All", ...roles.map(([x]) => x).slice(0, 100)],
    status: ["All", ...statuses.map(([x]) => x)],
  }), [locations, education, skills, departments, roles, statuses]);

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      const haystack = [c.name, c.email, c.location, c.educationRaw, c.university, c.currentCompany, c.jobTitle, c.department, c.status, c.skills.join(" ")].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) &&
        (filters.location === "All" || c.location === filters.location) &&
        (filters.experience === "All" || c.experienceBand === filters.experience) &&
        (filters.education === "All" || c.education === filters.education) &&
        (filters.skill === "All" || c.skills.includes(filters.skill)) &&
        (filters.department === "All" || c.department === filters.department) &&
        (filters.role === "All" || c.jobTitle === filters.role) &&
        (filters.status === "All" || c.status === filters.status);
    });
  }, [candidates, search, filters]);

  useEffect(() => setPage(1), [search, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const visibleCandidates = filteredCandidates.slice((page - 1) * pageSize, page * pageSize);

  const insights = useMemo(() => {
    if (!candidates.length) return [];
    const result = [];
    if (experienceValues.length) result.push(`The dataset contains ${candidates.length.toLocaleString()} candidates with an average of ${formatRecruitmentNumber(avgExperience)} years of experience.`);
    if (skills[0]) result.push(`${skills[0][0]} is the most frequently listed skill, appearing in ${skills[0][1].toLocaleString()} candidate records.`);
    if (locations[0]) result.push(`${locations[0][0]} contains the largest candidate group with ${locations[0][1].toLocaleString()} records.`);
    if (education[0]) result.push(`${education[0][0]} is the most common education category in the imported data.`);
    if (roles[0] && roles[0][0] !== "Unspecified") result.push(`${roles[0][0]} is the most common role represented in the dataset.`);
    if (hasStatus && statuses[0]) result.push(`${statuses[0][0]} is the most common recorded pipeline status with ${statuses[0][1].toLocaleString()} candidates.`);
    if (experiencedCount) result.push(`${experiencedCount.toLocaleString()} candidates have at least 5 years of recorded experience.`);
    return result.slice(0, 8);
  }, [candidates, experienceValues, avgExperience, skills, locations, education, roles, hasStatus, statuses, experiencedCount]);

  const toggleCandidate = (id) => setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const addToShortlist = () => {
    if (!selectedIds.size) return onToast?.("Select at least one candidate first.", "info");
    setShortlists((current) => ({ ...current, [shortlistName]: [...new Set([...(current[shortlistName] || []), ...selectedIds])] }));
    onToast?.(`${selectedIds.size} candidate${selectedIds.size === 1 ? "" : "s"} added to ${shortlistName}.`, "success");
    setSelectedIds(new Set());
  };

  const exportReport = async () => {
    if (!candidates.length) return onToast?.("Import candidate data before exporting a report.", "info");
    const themeColors = { "Corporate HR": { header: "1D4ED8", accent: "2563EB", soft: "EFF6FF", text: "0F172A" }, "Recruitment Pro": { header: "0F766E", accent: "14B8A6", soft: "ECFEFF", text: "134E4A" }, "Talent Analytics": { header: "6D28D9", accent: "8B5CF6", soft: "F5F3FF", text: "2E1065" }, "Executive Recruitment": { header: "111827", accent: "4F46E5", soft: "F3F4F6", text: "111827" } }[reportTheme] || { header: "1D4ED8", accent: "2563EB", soft: "EFF6FF", text: "0F172A" };
    const wb = new ExcelJS.Workbook(); wb.creator = "Open Ledger Docs"; wb.created = new Date();
    const titleSheet = wb.addWorksheet("Recruitment Dashboard");
    titleSheet.mergeCells("A1:H1"); titleSheet.getCell("A1").value = reportTitle; titleSheet.getCell("A1").font = { name: "Aptos Display", size: 22, bold: true, color: { argb: "FFFFFFFF" } }; titleSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: themeColors.header } }; titleSheet.getRow(1).height = 34;
    titleSheet.mergeCells("A2:H2"); titleSheet.getCell("A2").value = `${companyName} · Prepared by ${preparedBy} · ${new Date().toLocaleDateString()}`; titleSheet.getCell("A2").font = { size: 10, color: { argb: "64748B" } };
    const kpis = [["Candidates", candidates.length], ["Avg Experience", avgExperience == null ? "N/A" : `${formatRecruitmentNumber(avgExperience)} years`], ["Experienced (5+ yrs)", experiencedCount], ["Entry Level (<2 yrs)", entryLevelCount], ["Unique Skills", uniqueSkills], ["Locations", uniqueLocations], ["Education Levels", uniqueEducation], ...(hasScore ? [["Average Score", formatRecruitmentNumber(candidates.filter((c) => Number.isFinite(c.score)).reduce((a, c) => a + c.score, 0) / candidates.filter((c) => Number.isFinite(c.score)).length)]] : [])];
    kpis.forEach((k, i) => { const col = 1 + (i % 4) * 2; const row = 4 + Math.floor(i / 4) * 3; titleSheet.mergeCells(row, col, row, col + 1); titleSheet.getCell(row, col).value = k[0]; titleSheet.getCell(row, col).font = { bold: true, size: 10, color: { argb: "64748B" } }; titleSheet.mergeCells(row + 1, col, row + 1, col + 1); titleSheet.getCell(row + 1, col).value = k[1]; titleSheet.getCell(row + 1, col).font = { bold: true, size: 18, color: { argb: themeColors.text } }; titleSheet.getCell(row + 1, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: themeColors.soft } }; });
    let cursor = 11;
    const addBreakdown = (title, items) => { titleSheet.mergeCells(cursor, 1, cursor, 4); titleSheet.getCell(cursor, 1).value = title; titleSheet.getCell(cursor, 1).font = { bold: true, size: 12, color: { argb: themeColors.text } }; cursor += 1; titleSheet.getRow(cursor).values = ["Category", "Count", "Share", "Visual"]; titleSheet.getRow(cursor).eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: themeColors.header } }; }); cursor += 1; const max = Math.max(1, ...items.map(([,v]) => v)); items.slice(0, 10).forEach(([label, value]) => { titleSheet.getCell(cursor, 1).value = label; titleSheet.getCell(cursor, 2).value = value; titleSheet.getCell(cursor, 3).value = candidates.length ? value / candidates.length : 0; titleSheet.getCell(cursor, 3).numFmt = "0.0%"; titleSheet.getCell(cursor, 4).value = "█".repeat(Math.max(1, Math.round((value / max) * 18))); titleSheet.getCell(cursor, 4).font = { color: { argb: themeColors.accent } }; cursor += 1; }); cursor += 1; };
    addBreakdown("Top Skills", skills); addBreakdown("Experience Distribution", experienceBands.filter(([,v]) => v)); addBreakdown("Locations", locations); addBreakdown("Education", education); addBreakdown("Job Roles", roles);
    if (hasStatus) addBreakdown("Hiring Pipeline", statuses);
    titleSheet.columns.forEach((c) => { c.width = 20; }); titleSheet.getColumn(4).width = 28; titleSheet.views = [{ state: "frozen", ySplit: 3 }];

    const candidateSheet = wb.addWorksheet("Candidate Data");
    const exportHeaders = ["Candidate", "Role", "Department", "Experience", "Experience Band", "Skills", "Education", "University", "Location", "Status", "Email", "Phone", "Current Company", "Score", "Application Date", "Source"];
    candidateSheet.addRow(exportHeaders); candidates.forEach((c) => candidateSheet.addRow([c.name, c.jobTitle, c.department, c.experience ?? "", c.experienceBand, c.skills.join(", "), c.educationRaw, c.university, c.location, c.status, c.email, c.phone, c.currentCompany, c.score ?? "", c.applicationDate, c.source]));
    const styleSheet = (ws) => { ws.views = [{ state: "frozen", ySplit: 1 }]; ws.autoFilter = `A1:${String.fromCharCode(64 + Math.min(exportHeaders.length, 26))}1`; ws.getRow(1).height = 28; ws.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: themeColors.header } }; cell.alignment = { vertical: "middle", wrapText: true }; }); ws.eachRow((row, i) => { if (i > 1) row.eachCell((cell) => { cell.alignment = { vertical: "top", wrapText: true }; if (i % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: themeColors.soft } }; }); }); ws.columns.forEach((column) => { let max = 12; column.eachCell({ includeEmpty: false }, (cell) => max = Math.max(max, Math.min(42, String(cell.value ?? "").length + 2))); column.width = max; }); };
    styleSheet(candidateSheet);

    const sheetFromPairs = (name, pairs) => { const ws = wb.addWorksheet(name); ws.addRow(["Category", "Candidates", "Share"]); pairs.forEach(([label, value]) => { ws.addRow([label, value, candidates.length ? value / candidates.length : 0]); }); ws.getColumn(3).numFmt = "0.0%"; styleSheet(ws); return ws; };
    sheetFromPairs("Skills Analysis", skills); sheetFromPairs("Experience Analysis", experienceBands.filter(([,v]) => v)); sheetFromPairs("Education Analysis", education); sheetFromPairs("Location Analysis", locations); sheetFromPairs("Role Analysis", roles);
    const summarySheet = wb.addWorksheet("Candidate Summary"); summarySheet.addRow(["Metric", "Value"]); [["Total Candidates", candidates.length],["Average Experience", avgExperience ?? "N/A"],["Median Experience", medianExperience ?? "N/A"],["Experienced Candidates", experiencedCount],["Entry-Level Candidates", entryLevelCount],["Unique Skills", uniqueSkills],["Locations", uniqueLocations],["Education Levels", uniqueEducation]].forEach((r) => summarySheet.addRow(r)); styleSheet(summarySheet);
    const shortlistSheet = wb.addWorksheet("Shortlist"); shortlistSheet.addRow(["Shortlist", "Candidate ID", "Candidate", "Role", "Experience", "Location", "Status"]); Object.entries(shortlists).forEach(([name, ids]) => ids.forEach((id) => { const c = candidates.find((item) => item.id === id); if (c) shortlistSheet.addRow([name, c.id, c.name, c.jobTitle, c.experience ?? "", c.location, c.status]); })); styleSheet(shortlistSheet);
    const insightSheet = wb.addWorksheet("AI Insights"); insightSheet.addRow(["Insight", "Based on"]); insights.forEach((text) => insightSheet.addRow([text, `${candidates.length.toLocaleString()} candidates`])); styleSheet(insightSheet);
    const buffer = await wb.xlsx.writeBuffer(); const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `open-led-docs-recruitment-report-${new Date().toISOString().slice(0,10)}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); onToast?.("Recruitment analytics workbook generated successfully.", "success");
  };

  const resetFilters = () => setFilters({ location: "All", experience: "All", education: "All", skill: "All", department: "All", role: "All", status: "All" });
  const filteredAvgExperience = filteredCandidates.filter((c) => Number.isFinite(c.experience));
  const filteredAvg = filteredAvgExperience.length ? filteredAvgExperience.reduce((a, c) => a + c.experience, 0) / filteredAvgExperience.length : null;

  return (
    <section className={`ra-workspace ${darkMode ? "ra-dark" : ""}`}>
      <style>{RECRUITMENT_ANALYTICS_STYLES}</style>
      <div className="ra-hero">
        <div><span className="ra-eyebrow">AI RECRUITMENT ANALYTICS</span><h1>Turn a CV spreadsheet into a hiring intelligence workspace.</h1><p>Import candidate records, let Open Ledger Docs detect recruitment fields, explore the talent pool, build shortlists and export a professional recruitment report.</p></div>
        <div className="ra-hero-actions"><button className="secondary-button" onClick={onBack}><ArrowLeft size={15}/> Dashboard</button><button className="primary-button" onClick={() => fileRef.current?.click()}><Upload size={16}/> Import CV Excel</button><input ref={fileRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ""; }} /></div>
      </div>

      {!rows.length ? (
        <div className="ra-empty-start">
          <div className="ra-upload-icon"><FileSpreadsheet size={34}/></div><span className="ra-eyebrow">RECRUITMENT WORKSPACE</span><h2>Start with your candidate workbook</h2><p>Upload 100, 500, 1,000 or more candidate records. Open Ledger Docs will calculate the dashboard from the actual rows — no demo numbers.</p>
          <button className="primary-button" onClick={() => fileRef.current?.click()}><Upload size={17}/> Upload .xlsx or .csv</button>
          <div className="ra-capabilities"><span>AI column detection</span><span>Candidate analytics</span><span>Interactive filters</span><span>Excel report export</span></div>
          {error && <div className="ra-error"><AlertTriangle size={16}/>{error}</div>}
        </div>
      ) : (
        <>
          <div className="ra-filebar"><div><FileSpreadsheet size={20}/><div><strong>{fileName}</strong><span>{rows.length.toLocaleString()} candidates · {headers.length} columns</span></div></div><div className="ra-file-actions"><button className="secondary-button" onClick={() => setMappingOpen((v) => !v)}><Sparkles size={15}/> {mappingOpen ? "Hide AI Mapping" : "Review AI Mapping"}</button><button className="secondary-button" onClick={() => fileRef.current?.click()}><Upload size={14}/> Replace</button><button className="primary-button" onClick={exportReport}><Download size={15}/> Generate Excel</button></div></div>
          {error && <div className="ra-error"><AlertTriangle size={16}/>{error}</div>}

          {mappingOpen && <section className="ra-panel ra-mapping"><div className="ra-panel-head"><div><span className="ra-eyebrow">AI COLUMN DETECTION</span><h2>AI detected your recruitment fields</h2><p>Review or correct mappings for this workbook. Changes immediately update the analytics.</p></div><CheckCircle2 size={20}/></div><div className="ra-mapping-grid">{RECRUITMENT_FIELD_DEFS.map(([id, label]) => <label key={id}><span>{label}</span><select value={mapping[id] || ""} onChange={(e) => setMapping((m) => ({ ...m, [id]: e.target.value }))}><option value="">Not detected</option>{headers.map((h) => <option key={h} value={h}>{h}</option>)}</select></label>)}</div></section>}

          <div className="ra-section-tabs">{[["dashboard","Dashboard"],["candidates","Candidate Explorer"],["skills","Skills"],["experience","Experience"],["education","Education"],["location","Location"],["roles","Roles & Departments"],["insights","AI Insights"],["shortlist","Shortlist"],["report","Report"]].map(([id,label]) => <button key={id} className={activeSection === id ? "active" : ""} onClick={() => setActiveSection(id)}>{label}</button>)}</div>

          <section className="ra-overview-strip"><div><span>CANDIDATES</span><strong>{filteredCandidates.length.toLocaleString()}</strong><small>{filteredCandidates.length === candidates.length ? "Full dataset" : `of ${candidates.length.toLocaleString()} total`}</small></div><div><span>AVG EXPERIENCE</span><strong>{filteredAvg == null ? "—" : `${formatRecruitmentNumber(filteredAvg)}y`}</strong><small>From recorded values</small></div><div><span>UNIQUE SKILLS</span><strong>{uniqueSkills}</strong><small>Normalized skill names</small></div><div><span>LOCATIONS</span><strong>{uniqueLocations}</strong><small>Recorded locations</small></div><div><span>EDUCATION</span><strong>{uniqueEducation}</strong><small>Detected levels</small></div><div><span>EXPERIENCED</span><strong>{experiencedCount}</strong><small>5+ years</small></div></section>

          {activeSection === "dashboard" && <div className="ra-dashboard-grid"><div className="ra-panel ra-summary"><div className="ra-panel-head"><div><span className="ra-eyebrow">AI SUMMARY</span><h2>Candidate dataset overview</h2></div><Sparkles size={20}/></div><p>{insights[0] || "The imported workbook does not yet contain enough recognized recruitment fields to create a narrative summary."}</p><div className="ra-mini-stats"><div><b>{skills[0]?.[0] || "—"}</b><span>Top skill</span></div><div><b>{locations[0]?.[0] || "—"}</b><span>Top location</span></div><div><b>{roles[0]?.[0] || "—"}</b><span>Top role</span></div></div></div><RecruitmentBarChart title="Experience Distribution" items={experienceBands.filter(([,v]) => v)} /><RecruitmentBarChart title="Top Skills" items={skills} /><RecruitmentBarChart title="Candidate Locations" items={locations} /><RecruitmentBarChart title="Education Distribution" items={education} /><RecruitmentBarChart title="Job Roles" items={roles} />{hasStatus ? <RecruitmentBarChart title="Hiring Pipeline" items={statuses} /> : <div className="ra-panel ra-funnel-empty"><span className="ra-eyebrow">HIRING PIPELINE</span><h3>Status data not detected</h3><p>Add a Status / Application Status / Pipeline Stage column to generate the recruitment funnel from your actual workbook.</p></div>}</div>}

          {activeSection === "candidates" && <section className="ra-panel"><div className="ra-panel-head"><div><span className="ra-eyebrow">CANDIDATE EXPLORER</span><h2>Search, filter and shortlist candidates</h2></div><span className="ra-count-pill">{filteredCandidates.length.toLocaleString()} results</span></div><div className="ra-filter-grid"><label className="ra-search"><Search size={16}/><input placeholder="Search candidate, skill, role, company..." value={search} onChange={(e) => setSearch(e.target.value)}/></label>{Object.entries(filterOptions).map(([key, options]) => <select key={key} value={filters[key]} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}><option value="All">{key[0].toUpperCase()+key.slice(1)}: All</option>{options.filter((x) => x !== "All").map((x) => <option key={x} value={x}>{x}</option>)}</select>)}<button className="secondary-button" onClick={resetFilters}>Reset</button></div><div className="ra-shortlist-toolbar"><input value={shortlistName} onChange={(e) => setShortlistName(e.target.value)} placeholder="Shortlist name"/><button className="secondary-button" onClick={addToShortlist}><Plus size={14}/> Add selected to shortlist</button><span>{selectedIds.size} selected</span></div><div className="ra-table-wrap"><table className="ra-table"><thead><tr><th></th><th>Candidate</th><th>Role</th><th>Experience</th><th>Skills</th><th>Education</th><th>Location</th><th>Status</th>{hasScore && <th>Score</th>}</tr></thead><tbody>{visibleCandidates.map((c) => <tr key={c.id}><td><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleCandidate(c.id)}/></td><td><button className="ra-name-button" onClick={() => setSelectedCandidate(c)}>{c.name}</button><small>{c.email || c.currentCompany || ""}</small></td><td>{c.jobTitle}</td><td>{c.experience == null ? "—" : `${formatRecruitmentNumber(c.experience)}y`}</td><td><div className="ra-tags">{c.skills.slice(0,3).map((s) => <span key={s}>{s}</span>)}{c.skills.length > 3 && <span>+{c.skills.length-3}</span>}</div></td><td>{c.education}</td><td>{c.location}</td><td><span className="ra-status">{c.status}</span></td>{hasScore && <td>{c.score ?? "—"}</td>}</tr>)}</tbody></table></div><div className="ra-pagination"><span>Showing {visibleCandidates.length ? ((page-1)*pageSize)+1 : 0}–{Math.min(page*pageSize, filteredCandidates.length)} of {filteredCandidates.length}</span><div><button className="secondary-button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1,p-1))}>Previous</button><b>{page} / {totalPages}</b><button className="secondary-button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages,p+1))}>Next</button></div></div></section>}

          {activeSection === "skills" && <div className="ra-analysis-grid"><RecruitmentBarChart title="Top 20 Skills" items={skills.slice(0,20)}/><section className="ra-panel"><div className="ra-panel-head"><div><span className="ra-eyebrow">SKILL SEARCH</span><h2>Skill frequency</h2></div></div><div className="ra-analysis-table">{skills.slice(0,30).map(([skill,count]) => <div key={skill}><span>{skill}</span><b>{count}</b><i><em style={{width:`${Math.max(3,(count/Math.max(1,skills[0]?.[1]))*100)}%`}}/></i></div>)}</div></section></div>}
          {activeSection === "experience" && <div className="ra-analysis-grid"><RecruitmentBarChart title="Experience Bands" items={experienceBands.filter(([,v]) => v)}/><section className="ra-panel"><div className="ra-panel-head"><div><span className="ra-eyebrow">EXPERIENCE METRICS</span><h2>Experience statistics</h2></div></div><div className="ra-stat-grid"><div><b>{avgExperience == null ? "—" : `${formatRecruitmentNumber(avgExperience)} years`}</b><span>Average</span></div><div><b>{medianExperience == null ? "—" : `${formatRecruitmentNumber(medianExperience)} years`}</b><span>Median</span></div><div><b>{experienceValues.length ? `${formatRecruitmentNumber(Math.min(...experienceValues))} years` : "—"}</b><span>Minimum</span></div><div><b>{experienceValues.length ? `${formatRecruitmentNumber(Math.max(...experienceValues))} years` : "—"}</b><span>Maximum</span></div></div></section></div>}
          {activeSection === "education" && <div className="ra-analysis-grid"><RecruitmentBarChart title="Education Distribution" items={education}/><RecruitmentBarChart title="Top Universities" items={countValues(candidates.map((c) => c.university).filter(Boolean))}/></div>}
          {activeSection === "location" && <div className="ra-analysis-grid"><RecruitmentBarChart title="Candidate Location" items={locations}/><section className="ra-panel"><div className="ra-panel-head"><div><span className="ra-eyebrow">LOCATION DATA</span><h2>Location coverage</h2></div></div><div className="ra-location-list">{locations.slice(0,30).map(([location,count]) => <div key={location}><span>{location}</span><b>{count}</b></div>)}</div></section></div>}
          {activeSection === "roles" && <div className="ra-analysis-grid"><RecruitmentBarChart title="Job Roles" items={roles}/><RecruitmentBarChart title="Departments" items={departments}/></div>}
          {activeSection === "insights" && <section className="ra-panel"><div className="ra-panel-head"><div><span className="ra-eyebrow">GROUNDED AI INSIGHTS</span><h2>Recruitment insights</h2><p>Every statement below is calculated from the imported candidate rows.</p></div><Sparkles size={20}/></div><div className="ra-insights-list">{insights.map((text, i) => <div key={text}><span>{String(i+1).padStart(2,"0")}</span><p>{text}</p></div>)}</div></section>}
          {activeSection === "shortlist" && <section className="ra-panel"><div className="ra-panel-head"><div><span className="ra-eyebrow">SHORTLIST WORKSPACE</span><h2>Candidate groups</h2></div></div><div className="ra-shortlist-grid">{Object.keys(shortlists).length ? Object.entries(shortlists).map(([name, ids]) => <div key={name}><strong>{name}</strong><span>{ids.length} candidates</span><button className="secondary-button" onClick={() => setSelectedCandidate(candidates.find((c) => c.id === ids[0]))}>Open first candidate</button></div>) : <div className="ra-empty">Select candidates in Candidate Explorer and add them to a shortlist.</div>}</div></section>}
          {activeSection === "report" && <section className="ra-panel ra-report-panel"><div className="ra-panel-head"><div><span className="ra-eyebrow">REPORT GENERATOR</span><h2>Build a professional recruitment workbook</h2><p>Customize the report identity and export only data calculated from this dataset.</p></div><Download size={20}/></div><div className="ra-report-form"><label>Company Name<input value={companyName} onChange={(e) => setCompanyName(e.target.value)}/></label><label>Report Title<input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)}/></label><label>Prepared By<input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)}/></label><label>Theme<select value={reportTheme} onChange={(e) => setReportTheme(e.target.value)}><option>Corporate HR</option><option>Recruitment Pro</option><option>Talent Analytics</option><option>Executive Recruitment</option></select></label></div><div className="ra-report-preview"><div><b>{companyName}</b><span>{reportTitle}</span><small>{new Date().toLocaleDateString()}</small></div><div className="ra-preview-kpis"><span>{candidates.length} Candidates</span><span>{uniqueSkills} Skills</span><span>{uniqueLocations} Locations</span><span>{roles.filter(([x]) => x !== "Unspecified").length} Roles</span></div></div><button className="primary-button" onClick={exportReport}><Download size={16}/> Generate Recruitment Excel</button></section>}

          {selectedCandidate && <div className="ra-profile-backdrop" onClick={() => setSelectedCandidate(null)}><div className="ra-profile" onClick={(e) => e.stopPropagation()}><button className="ra-close" onClick={() => setSelectedCandidate(null)}>×</button><span className="ra-eyebrow">CANDIDATE PROFILE</span><h2>{selectedCandidate.name}</h2><p className="ra-profile-role">{selectedCandidate.jobTitle} · {selectedCandidate.location}</p><div className="ra-profile-grid"><div><span>Experience</span><b>{selectedCandidate.experience == null ? "Not recorded" : `${formatRecruitmentNumber(selectedCandidate.experience)} years`}</b></div><div><span>Department</span><b>{selectedCandidate.department}</b></div><div><span>Education</span><b>{selectedCandidate.educationRaw || selectedCandidate.education}</b></div><div><span>Status</span><b>{selectedCandidate.status}</b></div><div><span>Email</span><b>{selectedCandidate.email || "Not recorded"}</b></div><div><span>Phone</span><b>{selectedCandidate.phone || "Not recorded"}</b></div></div><div className="ra-profile-section"><span>Skills</span><div className="ra-tags large">{selectedCandidate.skills.length ? selectedCandidate.skills.map((s) => <span key={s}>{s}</span>) : <small>No skills detected</small>}</div></div><div className="ra-profile-section"><span>Source record</span><pre>{JSON.stringify(selectedCandidate.raw, null, 2)}</pre></div></div></div>}
        </>
      )}
    </section>
  );
}

const RECRUITMENT_ANALYTICS_STYLES = `
.ra-workspace{padding:4px 0 80px;min-height:calc(100vh - 120px);color:#0f172a}.ra-dark{color:#e5e7eb}.ra-hero{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;margin-bottom:22px}.ra-hero h1{margin:5px 0 8px;max-width:760px;font-size:34px;line-height:1.05;letter-spacing:-.045em}.ra-hero p{max-width:760px;margin:0;color:#64748b;font-size:14px;line-height:1.65}.ra-dark .ra-hero p{color:#94a3b8}.ra-hero-actions,.ra-file-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ra-eyebrow{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.12em;color:#2563eb}.ra-dark .ra-eyebrow{color:#60a5fa}.ra-empty-start{position:relative;overflow:hidden;border:1px solid #dbe4ef;border-radius:26px;padding:64px 28px;text-align:center;background:radial-gradient(circle at 50% 0%,#eff6ff,transparent 42%),#fff;box-shadow:0 18px 50px rgba(15,23,42,.07)}.ra-dark .ra-empty-start,.ra-dark .ra-panel,.ra-dark .ra-filebar{border-color:#263244;background:#0f172a}.ra-upload-icon{width:74px;height:74px;margin:0 auto 18px;display:grid;place-items:center;border-radius:22px;background:#dbeafe;color:#2563eb}.ra-empty-start h2{margin:0 0 10px;font-size:28px;letter-spacing:-.03em}.ra-empty-start p{max-width:650px;margin:0 auto 22px;color:#64748b;line-height:1.7}.ra-capabilities{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:20px}.ra-capabilities span,.ra-count-pill,.ra-status{border:1px solid #dbe4ef;background:#f8fafc;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:700;color:#475569}.ra-dark .ra-capabilities span,.ra-dark .ra-count-pill,.ra-dark .ra-status{border-color:#334155;background:#111827;color:#cbd5e1}.ra-error{display:flex;gap:8px;align-items:center;margin:14px 0;padding:12px 14px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:12px;font-size:12px}.ra-filebar{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:14px 16px;border:1px solid #dbe4ef;background:#fff;border-radius:16px;margin-bottom:14px;box-shadow:0 8px 25px rgba(15,23,42,.05)}.ra-filebar>div:first-child{display:flex;gap:10px;align-items:center}.ra-filebar strong{display:block;font-size:13px}.ra-filebar span{display:block;color:#64748b;font-size:11px;margin-top:2px}.ra-panel{border:1px solid #dbe4ef;background:#fff;border-radius:20px;padding:20px;box-shadow:0 10px 30px rgba(15,23,42,.045)}.ra-panel-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}.ra-panel-head h2,.ra-card-heading h3{margin:4px 0 4px;font-size:18px;letter-spacing:-.025em}.ra-panel-head p{margin:0;color:#64748b;font-size:12px;line-height:1.55}.ra-dark .ra-panel-head p{color:#94a3b8}.ra-mapping{margin-bottom:14px}.ra-mapping-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ra-mapping-grid label,.ra-report-form label{display:grid;gap:6px;font-size:11px;font-weight:800;color:#475569}.ra-mapping-grid select,.ra-filter-grid select,.ra-report-form input,.ra-report-form select,.ra-shortlist-toolbar input{width:100%;min-height:38px;border:1px solid #dbe4ef;border-radius:10px;padding:0 10px;background:#fff;color:#0f172a;font-size:12px}.ra-dark .ra-mapping-grid label,.ra-dark .ra-report-form label{color:#cbd5e1}.ra-dark .ra-mapping-grid select,.ra-dark .ra-filter-grid select,.ra-dark .ra-report-form input,.ra-dark .ra-report-form select,.ra-dark .ra-shortlist-toolbar input{background:#111827;color:#e5e7eb;border-color:#334155}.ra-section-tabs{display:flex;gap:5px;overflow:auto;padding:4px;margin:0 0 14px;border-bottom:1px solid #e2e8f0}.ra-section-tabs button{white-space:nowrap;border:0;background:transparent;padding:10px 11px;border-radius:9px 9px 0 0;color:#64748b;font-size:11px;font-weight:800;cursor:pointer}.ra-section-tabs button.active{color:#1d4ed8;background:#eff6ff}.ra-dark .ra-section-tabs{border-color:#263244}.ra-dark .ra-section-tabs button{color:#94a3b8}.ra-dark .ra-section-tabs button.active{color:#93c5fd;background:#172554}.ra-overview-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin-bottom:14px}.ra-overview-strip>div{border:1px solid #dbe4ef;border-radius:15px;padding:13px;background:#fff}.ra-dark .ra-overview-strip>div{background:#0f172a;border-color:#263244}.ra-overview-strip span{display:block;color:#64748b;font-size:9px;font-weight:900;letter-spacing:.1em}.ra-overview-strip strong{display:block;margin:5px 0 2px;font-size:22px;letter-spacing:-.03em}.ra-overview-strip small{color:#94a3b8;font-size:10px}.ra-dashboard-grid,.ra-analysis-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.ra-summary{grid-column:span 2}.ra-summary>p{font-size:14px;line-height:1.7;color:#334155;max-width:900px}.ra-dark .ra-summary>p{color:#cbd5e1}.ra-mini-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.ra-mini-stats div,.ra-stat-grid>div{padding:14px;border-radius:13px;background:#f8fafc;border:1px solid #e2e8f0}.ra-dark .ra-mini-stats div,.ra-dark .ra-stat-grid>div{background:#111827;border-color:#263244}.ra-mini-stats b,.ra-stat-grid b{display:block;font-size:15px}.ra-mini-stats span,.ra-stat-grid span{display:block;margin-top:4px;font-size:10px;color:#64748b}.ra-chart-card{border:1px solid #dbe4ef;background:#fff;border-radius:20px;padding:18px;min-width:0}.ra-dark .ra-chart-card{background:#0f172a;border-color:#263244}.ra-card-heading{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.ra-bars{display:grid;gap:10px}.ra-bar-row{display:grid;gap:5px}.ra-bar-label{display:flex;justify-content:space-between;gap:10px;font-size:11px}.ra-bar-label span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ra-bar-track{height:7px;border-radius:999px;background:#e8eef7;overflow:hidden}.ra-dark .ra-bar-track{background:#1e293b}.ra-bar-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#60a5fa)}.ra-funnel-empty{display:flex;flex-direction:column;justify-content:center;min-height:240px}.ra-funnel-empty h3{margin:5px 0}.ra-funnel-empty p{color:#64748b;font-size:12px;line-height:1.6}.ra-filter-grid{display:grid;grid-template-columns:2fr repeat(4,minmax(120px,1fr));gap:8px;margin-bottom:10px}.ra-filter-grid select:nth-of-type(n+5){grid-column:auto}.ra-search{display:flex;align-items:center;gap:8px;border:1px solid #dbe4ef;border-radius:10px;padding:0 10px;background:#fff}.ra-search input{border:0;outline:0;width:100%;min-height:38px;background:transparent;font-size:12px}.ra-dark .ra-search{background:#111827;border-color:#334155}.ra-dark .ra-search input{color:#fff}.ra-shortlist-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0}.ra-shortlist-toolbar input{max-width:180px}.ra-shortlist-toolbar>span{font-size:11px;color:#64748b}.ra-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:13px}.ra-dark .ra-table-wrap{border-color:#263244}.ra-table{width:100%;border-collapse:collapse;min-width:1000px}.ra-table th{position:sticky;top:0;background:#f8fafc;color:#475569;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.08em;padding:10px;border-bottom:1px solid #e2e8f0;z-index:1}.ra-dark .ra-table th{background:#111827;color:#94a3b8;border-color:#263244}.ra-table td{padding:10px;border-bottom:1px solid #eef2f7;font-size:11px;vertical-align:top}.ra-dark .ra-table td{border-color:#1e293b}.ra-table td small{display:block;color:#94a3b8;margin-top:3px}.ra-name-button{padding:0;border:0;background:transparent;color:#1d4ed8;font-weight:800;cursor:pointer;text-align:left}.ra-dark .ra-name-button{color:#93c5fd}.ra-tags{display:flex;gap:4px;flex-wrap:wrap}.ra-tags span{padding:3px 6px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:9px;font-weight:700}.ra-dark .ra-tags span{background:#172554;color:#93c5fd}.ra-pagination{display:flex;justify-content:space-between;align-items:center;margin-top:12px;font-size:11px;color:#64748b}.ra-pagination>div{display:flex;gap:8px;align-items:center}.ra-analysis-table{display:grid;gap:8px}.ra-analysis-table>div{display:grid;grid-template-columns:1.2fr 50px 2fr;gap:10px;align-items:center;font-size:11px}.ra-analysis-table i{height:7px;background:#e8eef7;border-radius:999px;overflow:hidden}.ra-analysis-table em{display:block;height:100%;background:#2563eb;border-radius:999px}.ra-location-list{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.ra-location-list div{display:flex;justify-content:space-between;padding:10px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px}.ra-dark .ra-location-list div{background:#111827;border-color:#263244}.ra-stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.ra-insights-list{display:grid;gap:8px}.ra-insights-list>div{display:grid;grid-template-columns:36px 1fr;gap:12px;padding:14px;border:1px solid #e2e8f0;border-radius:13px;background:#f8fafc}.ra-dark .ra-insights-list>div{background:#111827;border-color:#263244}.ra-insights-list span{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#dbeafe;color:#1d4ed8;font-weight:900;font-size:10px}.ra-insights-list p{margin:0;font-size:12px;line-height:1.6}.ra-shortlist-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.ra-shortlist-grid>div{padding:16px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;display:grid;gap:7px}.ra-dark .ra-shortlist-grid>div{background:#111827;border-color:#263244}.ra-shortlist-grid span{font-size:11px;color:#64748b}.ra-report-form{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.ra-report-preview{margin:18px 0;padding:22px;border-radius:16px;background:linear-gradient(135deg,#eff6ff,#fff);border:1px solid #dbeafe;display:flex;justify-content:space-between;gap:20px}.ra-dark .ra-report-preview{background:#111827;border-color:#263244}.ra-report-preview b,.ra-report-preview span,.ra-report-preview small{display:block}.ra-report-preview b{font-size:20px}.ra-report-preview span{font-size:13px;font-weight:700;margin-top:5px}.ra-report-preview small{color:#64748b;margin-top:4px}.ra-preview-kpis{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.ra-preview-kpis span{padding:7px 9px;border-radius:999px;background:#fff;border:1px solid #dbe4ef;font-size:10px}.ra-profile-backdrop{position:fixed;inset:0;z-index:100;background:rgba(2,6,23,.58);display:grid;place-items:center;padding:20px}.ra-profile{position:relative;width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:22px;padding:26px;box-shadow:0 30px 100px rgba(0,0,0,.28)}.ra-dark .ra-profile{background:#0f172a;color:#fff}.ra-close{position:absolute;right:16px;top:14px;border:0;background:#f1f5f9;border-radius:9px;width:32px;height:32px;font-size:22px;cursor:pointer}.ra-profile h2{margin:7px 0 4px;font-size:27px}.ra-profile-role{margin:0;color:#64748b}.ra-profile-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin:20px 0}.ra-profile-grid>div{padding:12px;border:1px solid #e2e8f0;border-radius:11px}.ra-profile-grid span,.ra-profile-section>span{display:block;color:#64748b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.ra-profile-grid b{display:block;margin-top:4px;font-size:12px;word-break:break-word}.ra-profile-section{margin-top:16px}.ra-profile pre{margin-top:8px;padding:12px;background:#0f172a;color:#cbd5e1;border-radius:12px;overflow:auto;font-size:10px}.ra-empty{padding:28px;text-align:center;color:#64748b;font-size:12px}.ra-report-panel .primary-button{margin-top:4px}@media(max-width:1050px){.ra-overview-strip{grid-template-columns:repeat(3,1fr)}.ra-mapping-grid{grid-template-columns:repeat(2,1fr)}.ra-filter-grid{grid-template-columns:1fr 1fr}.ra-report-form{grid-template-columns:1fr 1fr}}@media(max-width:760px){.ra-hero,.ra-filebar,.ra-report-preview{flex-direction:column;align-items:stretch}.ra-hero h1{font-size:27px}.ra-overview-strip{grid-template-columns:repeat(2,1fr)}.ra-dashboard-grid,.ra-analysis-grid{grid-template-columns:1fr}.ra-summary{grid-column:auto}.ra-mapping-grid,.ra-report-form,.ra-shortlist-grid{grid-template-columns:1fr}.ra-filter-grid{grid-template-columns:1fr}.ra-mini-stats{grid-template-columns:1fr}.ra-profile-grid{grid-template-columns:1fr}.ra-preview-kpis{justify-content:flex-start}}
`;

function ExcelImportStudio({ darkMode, onBack, onToast }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState(IMPORT_EXCEL_THEMES[1].id);
  const [themeCategory, setThemeCategory] = useState("All");
  const [themeSearch, setThemeSearch] = useState("");
  const [favorites, setFavorites] = useState(() => loadPersistedJSON(IMPORT_EXCEL_FAVORITES_KEY, []));
  const [recentThemes, setRecentThemes] = useState(() => loadPersistedJSON(IMPORT_EXCEL_RECENT_KEY, []));
  const [showFavorites, setShowFavorites] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [exportMode, setExportMode] = useState("full");
  const [dashboardType, setDashboardType] = useState("executive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState("");
  const [customTheme, setCustomTheme] = useState({
    id: "custom",
    name: "My Custom Theme",
    category: "Custom",
    colors: { header: "#111827", accent: "#7C3AED", background: "#F8FAFC", text: "#111827", border: "#CBD5E1", positive: "#16A34A", negative: "#DC2626", warning: "#D97706" },
    typography: { font: "Aptos", size: 10, headerSize: 11, headerWeight: 700, bodyWeight: 400, alignment: "left" },
    table: { border: "thin", rowHeight: 20, headerHeight: 28, zebra: true, freeze: true, filter: true },
    charts: { primary: "#7C3AED", secondary: "#111827", type: "bar" },
  });

  const current = sheets[activeSheet] || null;
  const summary = useMemo(() => summarizeImportedWorkbook(sheets), [sheets]);
  const activeTheme = customOpen ? customTheme : excelThemeObject(selectedTheme);

  useEffect(() => {
    persistJSON(IMPORT_EXCEL_FAVORITES_KEY, favorites);
  }, [favorites]);
  useEffect(() => {
    persistJSON(IMPORT_EXCEL_RECENT_KEY, recentThemes);
  }, [recentThemes]);

  const allCategories = useMemo(() => ["All", ...new Set(IMPORT_EXCEL_THEMES.map((theme) => theme.category)), "Favorites", "Recent"], []);
  const visibleThemes = useMemo(() => {
    const q = themeSearch.trim().toLowerCase();
    return IMPORT_EXCEL_THEMES.filter((theme) => {
      const categoryOk =
        themeCategory === "All" ||
        (themeCategory === "Favorites" && favorites.includes(theme.id)) ||
        (themeCategory === "Recent" && recentThemes.includes(theme.id)) ||
        theme.category === themeCategory;
      const searchOk = !q || `${theme.name} ${theme.category}`.toLowerCase().includes(q);
      return categoryOk && searchOk;
    });
  }, [themeCategory, themeSearch, favorites, recentThemes]);

  const applyTheme = (id) => {
    setCustomOpen(false);
    setSelectedTheme(id);
    setRecentThemes((current) => [id, ...current.filter((item) => item !== id)].slice(0, 10));
  };

  const toggleFavorite = (id, event) => {
    event?.stopPropagation();
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const autoTheme = () => {
    const corpus = sheets.flatMap((sheet) => [sheet.name, ...sheet.headers, ...sheet.rows.flat().slice(0, 150)]).join(" ").toLowerCase();
    let id = "executiveblack";
    if (/invoice|bill|receipt|payment/.test(corpus)) id = "open-led-docsinvoice";
    else if (/tax|amount|total/.test(corpus)) id = "financepro";
    else if (/employee|staff|candidate|salary|department|hire/.test(corpus)) id = "businessprofessional";
    else if (/production|inventory|warehouse|operations|units/.test(corpus)) id = "operationsanalytics";
    else if (/marketing|campaign|lead|conversion|click/.test(corpus)) id = "saasanalytics";
    else if (/revenue|profit|sales|growth/.test(corpus)) id = "revenueanalytics";
    else if (/kpi|metric|performance/.test(corpus)) id = "managementdashboard";
    applyTheme(id);
    onToast?.(`AI Auto Theme selected ${excelThemeObject(id).name} based on your workbook fields.`, "success");
  };

  const importWorkbook = async (file) => {
    setError("");
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Unsupported file type. Please choose a valid .xlsx workbook. Legacy .xls files are accepted only when your browser/runtime provides a compatible parser.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("This workbook is larger than 25 MB. Please import a smaller workbook.");
      return;
    }
    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);
      const parsedSheets = workbook.worksheets.map((worksheet) => {
        const rows = [];
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          rows.push(row.values.slice(1));
        });
        const normalized = normalizeImportedSheet(rows);
        return {
          name: worksheet.name,
          headers: normalized.headers,
          rows: normalized.rows,
          duplicateHeaders: normalized.duplicateHeaders,
          missingHeaders: normalized.missingHeaders,
        };
      }).filter((sheet) => sheet.headers.length);
      if (!parsedSheets.length) throw new Error("The workbook is empty or contains no readable rows.");
      setFileName(file.name);
      setSheets(parsedSheets);
      setActiveSheet(0);
      setSelectedTheme(IMPORT_EXCEL_THEMES[1].id);
      setCompareIds([]);
      onToast?.(`${file.name} imported successfully.`, "success");
    } catch (importError) {
      console.error("Excel import failed:", importError);
      setError(importError?.message?.includes("zip") || importError?.message?.includes("central directory")
        ? "Unable to read this workbook. Please make sure the file is a valid .xlsx file."
        : `Unable to read this workbook. ${importError?.message || "Please check the file and try again."}`);
      setSheets([]);
    }
  };

  const generateExcel = async () => {
    if (!sheets.length || !current) {
      setError("Import an Excel workbook before generating a report.");
      return;
    }
    setIsGenerating(true);
    setError("");
    setGenerationStep(0);
    const timer = window.setInterval(() => setGenerationStep((step) => Math.min(step + 1, 4)), 550);

    try {
      const theme = activeTheme;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Open Ledger Docs";
      workbook.lastModifiedBy = "Open Ledger Docs";
      workbook.created = new Date();

      const addStyledSheet = (name, rows, options = {}) => {
        const ws = workbook.addWorksheet(name);
        const headers = options.headers || (rows[0] ? Object.keys(rows[0]) : []);
        const data = options.objects
          ? rows.map((row) => headers.map((h) => row[h]))
          : rows;
        ws.addRow(headers);
        data.forEach((row) => {
          const converted = row.map((value, index) => {
            const columnMeta = summary.columns[index];
            return importedExcelValue(value, columnMeta?.type);
          });
          ws.addRow(converted);
        });
        ws.views = theme.table.freeze ? [{ state: "frozen", ySplit: 1 }] : [];
        if (theme.table.filter && headers.length) ws.autoFilter = `A1:${String.fromCharCode(64 + Math.min(headers.length, 26))}1`;
        const header = ws.getRow(1);
        header.height = theme.table.headerHeight;
        header.eachCell((cell) => {
          cell.font = { name: theme.typography.font, size: theme.typography.headerSize, bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: theme.colors.header.replace("#", "") } };
          cell.alignment = { vertical: "middle", horizontal: theme.typography.alignment, wrapText: true };
          cell.border = { bottom: { style: theme.table.border, color: { argb: theme.colors.border.replace("#", "") } } };
        });
        for (let r = 2; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          row.height = theme.table.rowHeight;
          row.eachCell((cell) => {
            cell.font = { name: theme.typography.font, size: theme.typography.size, bold: theme.typography.bodyWeight >= 600, color: { argb: theme.colors.text.replace("#", "") } };
            cell.alignment = { vertical: "top", horizontal: theme.typography.alignment, wrapText: true };
            if (theme.table.zebra && r % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: theme.colors.background.replace("#", "") } };
            cell.border = { bottom: { style: theme.table.border, color: { argb: theme.colors.border.replace("#", "") } } };
          });
        }
        ws.columns.forEach((column) => {
          let max = 12;
          column.eachCell({ includeEmpty: false }, (cell) => { max = Math.max(max, Math.min(42, String(cell.value ?? "").length + 2)); });
          column.width = max;
        });
        return ws;
      };

      if (exportMode !== "styled") {
        const dash = workbook.addWorksheet("Dashboard");
        dash.mergeCells("A1:F1");
        dash.getCell("A1").value = `Open Ledger Docs · ${dashboardType[0].toUpperCase() + dashboardType.slice(1)} Dashboard`;
        dash.getCell("A1").font = { name: theme.typography.font, size: 20, bold: true, color: { argb: theme.colors.text.replace("#", "") } };
        dash.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: theme.colors.background.replace("#", "") } };
        const numericColumns = summary.columns.filter((c) => c.type === "Number" || c.type === "Currency/Number" || c.type === "Percentage").slice(0, 4);
        numericColumns.forEach((column, index) => {
          const values = current.rows.map((row) => Number(String(row[column.index]).replace(/[$€£₨,%\s]/g, ""))).filter(Number.isFinite);
          const total = values.reduce((a, b) => a + b, 0);
          const avg = values.length ? total / values.length : 0;
          const cell = dash.getCell(3, index * 2 + 1);
          cell.value = total;
          cell.font = { size: 18, bold: true, color: { argb: theme.colors.header.replace("#", "") } };
          dash.getCell(4, index * 2 + 1).value = column.header;
          dash.getCell(4, index * 2 + 1).font = { size: 10, color: { argb: theme.colors.text.replace("#", "") } };
          dash.getCell(3, index * 2 + 2).value = `Avg ${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
        });
        if (numericColumns[0]) {
          const chartValues = current.rows
            .map((row) => Number(String(row[numericColumns[0].index]).replace(/[$€£₨,%\s]/g, "")))
            .filter(Number.isFinite)
            .slice(0, 12);
          const chartDataUrl = await createExcelChartImage(
            chartValues,
            theme.charts.primary,
            theme.charts.type,
            numericColumns[0].header
          );
          if (chartDataUrl) {
            const imageId = workbook.addImage({ base64: chartDataUrl, extension: "png" });
            dash.addImage(imageId, { tl: { col: 0, row: 6 }, ext: { width: 720, height: 255 } });
          }
        }
        dash.getCell("A20").value = "Workbook overview";
        dash.getCell("A6").font = { bold: true, size: 13 };
        dash.getRow(21).values = ["Sheets", summary.sheets, "Rows", summary.rows, "Columns", summary.columns.length];
        dash.getRow(22).values = ["Missing values", summary.missing, "Duplicate values", summary.duplicateValues, "Theme", theme.name];
      }

      setGenerationStep(1);
      if (exportMode !== "dashboard") {
        addStyledSheet("Data", current.rows, { headers: current.headers });
      }
      if (exportMode === "summary" || exportMode === "full") {
        const summaryRows = summary.columns.map((column) => {
          const values = current.rows.map((row) => row[column.index]).filter(Boolean);
          return [column.header, column.type, values.length, values.slice(0, 3).join(" · ")];
        });
        addStyledSheet("Summary", summaryRows, { headers: ["Column", "Detected Type", "Filled Values", "Examples"] });
      }
      if (exportMode === "full") {
        const analyticsRows = summary.columns.filter((c) => ["Number", "Currency/Number", "Percentage"].includes(c.type)).map((column) => {
          const values = current.rows.map((row) => Number(String(row[column.index]).replace(/[$€£₨,%\s]/g, ""))).filter(Number.isFinite);
          return [column.header, values.length, values.reduce((a,b)=>a+b,0), values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0, values.length ? Math.max(...values) : 0, values.length ? Math.min(...values) : 0];
        });
        addStyledSheet("Analytics", analyticsRows, { headers: ["Metric", "Count", "Total", "Average", "Maximum", "Minimum"] });
        const insightRows = [
          ["AI Insight", summary.missing ? `There are ${summary.missing} missing values to review.` : "The imported dataset has no detected missing values in the preview."],
          ["Duplicates", summary.duplicateValues ? `${summary.duplicateValues} duplicate values were detected across columns.` : "No duplicate values were detected in the imported preview."],
          ["Theme", `${theme.name} applied to the workbook.`],
          ["Dashboard", `${dashboardType} dashboard selected.`],
        ];
        addStyledSheet("Insights", insightRows, { headers: ["Insight", "Details"] });
      }

      // Apply data-aware number/date formatting without changing source values.
      workbook.worksheets.forEach((ws) => {
        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          row.eachCell((cell, columnNumber) => {
            const column = summary.columns[columnNumber - 1];
            if (!column) return;
            if (column.type === "Percentage") cell.numFmt = "0.0%";
            else if (column.type === "Currency/Number") cell.numFmt = '#,##0.00';
            else if (column.type === "Number") cell.numFmt = '#,##0.00';
            else if (column.type === "Date") cell.numFmt = 'dd mmm yyyy';
          });
        });
      });

      setGenerationStep(3);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      if (!blob.size) throw new Error("The generated workbook is empty.");
      const outputName = safeExcelFilename(fileName.replace(/\.[^.]+$/, "") + `_${theme.name}`);
      triggerBlobDownload(blob, outputName);
      setGenerationStep(4);
      onToast?.(`${outputName} generated successfully.`, "success");
    } catch (generationError) {
      console.error("Excel report generation failed:", generationError);
      setError(generationError?.message || "Unable to generate the Excel workbook.");
    } finally {
      window.clearInterval(timer);
      setIsGenerating(false);
    }
  };

  const previewRows = current?.rows?.slice(0, 40) || [];
  const toggleCompare = (id) => setCompareIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : ids.length < 3 ? [...ids, id] : ids);

  return (
    <div className={`excel-import-page ${darkMode ? "is-dark" : ""}`}>
      <div className="excel-import-hero">
        <div>
          <span className="card-label">OPEN LEDGER DOCS EXCEL STUDIO</span>
          <h1>Import Excel</h1>
          <p>Upload your workbook, analyze the data, choose a premium theme, customize it, generate a dashboard, and export a polished Excel report.</p>
        </div>
        <div className="excel-import-hero-actions">
          <button className="secondary-button" onClick={onBack}><ArrowLeft size={15}/> Back</button>
          <button className="primary-button" onClick={() => fileRef.current?.click()}><Upload size={15}/> Import Excel</button>
        </div>
      </div>

      <div className="excel-workflow">
        {["Import Excel","Review Data","Choose Theme","Customize","Dashboard","Export"].map((step, index) => (
          <div className={`excel-workflow-step ${sheets.length && index > 0 ? "active" : ""}`} key={step}>
            <span>{index + 1}</span><strong>{step}</strong>
          </div>
        ))}
      </div>

      <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { importWorkbook(e.target.files?.[0]); e.target.value = ""; }} />

      {!sheets.length ? (
        <div className="excel-import-empty" onDragOver={(e) => { e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); importWorkbook(e.dataTransfer.files?.[0]); }}>
          <div className="excel-import-empty-icon"><FileSpreadsheet size={34}/></div>
          <h2>Bring your spreadsheet into Open Ledger Docs</h2>
          <p>Drop an Excel workbook here or browse for a .xlsx file. Your original data stays unchanged; Open Ledger Docs builds the report around it.</p>
          <button className="primary-button" onClick={() => fileRef.current?.click()}><Upload size={16}/> Choose Excel file</button>
          <div className="excel-import-empty-meta"><span>25 MB max</span><span>Multiple sheets</span><span>Automatic headers & types</span><span>Preview before export</span></div>
          {error && <div className="excel-import-alert error"><AlertTriangle size={16}/>{error}</div>}
        </div>
      ) : (
        <>
          <div className="excel-import-filebar">
            <div><FileSpreadsheet size={19}/><div><strong>{fileName}</strong><span>{summary.sheets} sheets · {summary.rows.toLocaleString()} rows · {summary.columns.length} columns</span></div></div>
            <div className="excel-import-file-actions">
              <button className="secondary-button" onClick={() => fileRef.current?.click()}><Upload size={14}/> Replace</button>
              <button className="secondary-button" onClick={() => { setSheets([]); setFileName(""); }}><X size={14}/> Clear</button>
            </div>
          </div>

          <div className="excel-import-grid">
            <section className="excel-import-data-card">
              <div className="excel-import-section-head">
                <div><span className="card-label">DATA INSPECTOR</span><h2>Review imported data</h2><p>Headers, types, missing values and duplicates are detected automatically.</p></div>
                <div className="excel-data-stats"><span><b>{summary.rows}</b> rows</span><span><b>{summary.columns.length}</b> cols</span><span><b>{summary.sheets}</b> sheets</span><span><b>{summary.missing}</b> missing</span></div>
              </div>
              <div className="excel-sheet-selector">{sheets.map((sheet, index) => <button key={sheet.name} className={index === activeSheet ? "active" : ""} onClick={() => setActiveSheet(index)}><Layers size={13}/>{sheet.name}<small>{sheet.rows.length}</small></button>)}</div>
              {(current?.duplicateHeaders?.length > 0 || current?.missingHeaders) && <div className="excel-import-alert warning"><AlertTriangle size={15}/><span>{current.missingHeaders ? "Headers were not confidently detected; generic column names were used." : `${current.duplicateHeaders.length} duplicate column header(s) were detected and renamed safely.`}</span></div>}
              <div className="excel-table-wrap">
                <table className="excel-live-table">
                  <thead><tr>{current.headers.map((header, index) => <th key={index}><span>{header}</span><small>{summary.columns[index]?.type || "Text"}</small></th>)}</tr></thead>
                  <tbody>{previewRows.map((row, ri) => <tr key={ri}>{current.headers.map((_, ci) => <td key={ci}>{reactSafeExcelValue(row[ci])}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </section>

            <aside className="excel-data-insights">
              <div className="excel-insight-card"><span>Detected types</span>{summary.columns.slice(0, 8).map((c) => <div key={c.header}><b>{c.header}</b><em>{c.type}</em></div>)}</div>
              <div className="excel-insight-card"><span>Quality checks</span><div><b>Missing values</b><em>{summary.missing}</em></div><div><b>Duplicate values</b><em>{summary.duplicateValues}</em></div><div><b>Duplicate headers</b><em>{current.duplicateHeaders.length}</em></div></div>
            </aside>
          </div>

          <section className="excel-theme-workspace">
            <div className="excel-theme-toolbar">
              <div><span className="card-label">THEME LIBRARY · 50+ PROFESSIONAL THEMES</span><h2>Choose the look of your workbook</h2><p>Every theme controls headers, tables, typography, KPIs, borders and chart styling.</p></div>
              <div className="excel-theme-toolbar-actions">
                <button className="secondary-button" onClick={autoTheme}><Sparkles size={15}/> AI Auto Theme</button>
                <button className="secondary-button" onClick={() => setCustomOpen(true)}><Pencil size={15}/> Create Custom Theme</button>
              </div>
            </div>
            <div className="excel-theme-tools">
              <div className="excel-theme-search"><Search size={15}/><input placeholder="Search themes..." value={themeSearch} onChange={(e) => setThemeSearch(e.target.value)}/></div>
              <div className="excel-theme-cats">{allCategories.map((cat) => <button key={cat} className={themeCategory === cat ? "active" : ""} onClick={() => setThemeCategory(cat)}>{cat}</button>)}</div>
              <span className="excel-theme-count">{visibleThemes.length} themes</span>
            </div>
            <div className="excel-theme-grid">
              {visibleThemes.map((theme) => (
                <div className={`excel-theme-card-pro ${selectedTheme === theme.id && !customOpen ? "selected" : ""}`} key={theme.id}>
                  <button className="excel-theme-card-main" onClick={() => applyTheme(theme.id)}>
                    <ExcelThemeMiniPreview theme={theme}/>
                    <div className="excel-theme-card-title"><strong>{theme.name}</strong><span>{theme.category}</span></div>
                  </button>
                  <button className={`excel-theme-fav ${favorites.includes(theme.id) ? "active" : ""}`} onClick={(e) => toggleFavorite(theme.id,e)} aria-label="Favorite theme">♥</button>
                  <button className="excel-theme-compare" onClick={() => toggleCompare(theme.id)}>{compareIds.includes(theme.id) ? "Compared" : "Compare"}</button>
                </div>
              ))}
            </div>
          </section>

          <section className="excel-live-preview-section">
            <div className="excel-section-title-row"><div><span className="card-label">LIVE PREVIEW</span><h2>{activeTheme.name}</h2><p>Before and after preview using your actual imported headers and data.</p></div><div className="excel-preview-pill"><span style={{background: activeTheme.colors.accent}}/> {activeTheme.name}</div></div>
            <div className="excel-before-after">
              <div className="excel-before"><span>BEFORE · RAW IMPORT</span><div className="raw-preview">{current.headers.slice(0,6).map((h,i)=><div key={h}><b>{h}</b><span>{reactSafeExcelValue(current.rows[0]?.[i])}</span></div>)}</div></div>
              <div className="excel-after"><span>AFTER · {activeTheme.name.toUpperCase()}</span><div className="styled-preview" style={{"--preview-header":activeTheme.colors.header,"--preview-accent":activeTheme.colors.accent,"--preview-bg":activeTheme.colors.background,"--preview-text":activeTheme.colors.text}}><div className="styled-preview-kpis"><b>{summary.rows.toLocaleString()}<small>Rows</small></b><b>{summary.columns.length}<small>Columns</small></b><b>{summary.missing}<small>Missing</small></b></div><div className="styled-preview-table"><div className="sp-row head">{current.headers.slice(0,5).map((h,i)=><span key={h}>{h}</span>)}</div>{current.rows.slice(0,3).map((row,ri)=><div className="sp-row" key={ri}>{current.headers.slice(0,5).map((_,i)=><span key={i}>{reactSafeExcelValue(row[i])}</span>)}</div>)}</div></div></div>
            </div>
          </section>

          {compareIds.length > 1 && (
            <section className="excel-compare-section"><div className="excel-section-title-row"><div><span className="card-label">THEME COMPARISON</span><h2>Compare themes</h2><p>Render the same imported data using multiple visual systems.</p></div></div><div className="excel-compare-grid">{compareIds.map((id) => { const theme = excelThemeObject(id); return <div className="excel-compare-card" key={id}><ExcelThemeMiniPreview theme={theme}/><strong>{theme.name}</strong><button className="primary-button" onClick={() => applyTheme(id)}>Use This Theme</button></div>; })}</div></section>
          )}

          <section className="excel-custom-export">
            <div className="excel-custom-card">
              <span className="card-label">DASHBOARD GENERATOR</span><h2>Turn the workbook into a report</h2><p>Choose a dashboard profile and let Open Ledger Docs build KPI summaries, metrics and analytics sheets from the imported data.</p>
              <div className="dashboard-type-grid">{["executive","sales","finance","hr","operations","marketing","kpi"].map((type) => <button className={dashboardType === type ? "active" : ""} key={type} onClick={() => setDashboardType(type)}><strong>{type[0].toUpperCase()+type.slice(1)}</strong><span>Auto KPI layout</span></button>)}</div>
            </div>
            <div className="excel-export-panel">
              <span className="card-label">EXPORT OPTIONS</span><h2>Generate Excel</h2>
              <div className="export-mode-grid">{[["styled","Styled Excel"],["dashboard","Excel + Dashboard"],["summary","Excel + Summary"],["full","Full Report Workbook"]].map(([id,label]) => <button className={exportMode === id ? "active" : ""} key={id} onClick={() => setExportMode(id)}><strong>{label}</strong><span>{id === "full" ? "Dashboard, data, summary, analytics & insights" : "Professional formatting applied"}</span></button>)}</div>
              {error && <div className="excel-import-alert error"><AlertTriangle size={15}/>{error}</div>}
              <button className="primary-button excel-generate-btn" disabled={isGenerating} onClick={generateExcel}>{isGenerating ? `Generating… ${["Preparing workbook","Applying theme","Formatting data","Generating dashboard","Finalizing workbook"][generationStep]}` : <><Download size={16}/> Generate Excel</>}</button>
              {isGenerating && <div className="excel-generation-progress"><div><span>Preparing workbook...</span><b>{Math.min(100, (generationStep+1)*20)}%</b></div><div className="excel-progress-line"><i style={{width:`${Math.min(100,(generationStep+1)*20)}%`}}/></div><small>Applying theme → Formatting data → Generating charts → Finalizing workbook</small></div>}
            </div>
          </section>
        </>
      )}

      {customOpen && (
        <div className="import-custom-backdrop" onClick={() => setCustomOpen(false)}>
          <div className="import-custom-modal" onClick={(e) => e.stopPropagation()}>
            <div className="import-custom-head"><div><span className="card-label">CUSTOM THEME BUILDER</span><h2>Design your own workbook theme</h2></div><button onClick={() => setCustomOpen(false)}><X size={18}/></button></div>
            <div className="custom-theme-grid">
              {[
                ["header","Header color"],["accent","Accent color"],["background","Background color"],["text","Text color"],["border","Border color"],["positive","Positive value"],["negative","Negative value"],["warning","Warning"]
              ].map(([key,label]) => <label key={key}><span>{label}</span><input type="color" value={customTheme.colors[key]} onChange={(e) => setCustomTheme((t)=>({...t,colors:{...t.colors,[key]:e.target.value}}))}/></label>)}
              <label><span>Font family</span><select value={customTheme.typography.font} onChange={(e)=>setCustomTheme((t)=>({...t,typography:{...t.typography,font:e.target.value}}))}><option>Aptos</option><option>Calibri</option><option>Arial</option><option>Georgia</option><option>Verdana</option></select></label>
              <label><span>Font size</span><input type="number" min="8" max="18" value={customTheme.typography.size} onChange={(e)=>setCustomTheme((t)=>({...t,typography:{...t.typography,size:Number(e.target.value)}}))}/></label>
              <label><span>Header font size</span><input type="number" min="9" max="22" value={customTheme.typography.headerSize} onChange={(e)=>setCustomTheme((t)=>({...t,typography:{...t.typography,headerSize:Number(e.target.value)}}))}/></label>
              <label><span>Header weight</span><select value={customTheme.typography.headerWeight} onChange={(e)=>setCustomTheme((t)=>({...t,typography:{...t.typography,headerWeight:Number(e.target.value)}}))}><option value="600">600</option><option value="700">700</option><option value="800">800</option></select></label>
              <label><span>Body weight</span><select value={customTheme.typography.bodyWeight} onChange={(e)=>setCustomTheme((t)=>({...t,typography:{...t.typography,bodyWeight:Number(e.target.value)}}))}><option value="400">400</option><option value="500">500</option><option value="600">600</option></select></label>
              <label><span>Border style</span><select value={customTheme.table.border} onChange={(e)=>setCustomTheme((t)=>({...t,table:{...t.table,border:e.target.value}}))}><option value="thin">Thin</option><option value="medium">Medium</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label>
              <label><span>Row height</span><input type="number" min="16" max="40" value={customTheme.table.rowHeight} onChange={(e)=>setCustomTheme((t)=>({...t,table:{...t.table,rowHeight:Number(e.target.value)}}))}/></label>
              <label><span>Header height</span><input type="number" min="20" max="50" value={customTheme.table.headerHeight} onChange={(e)=>setCustomTheme((t)=>({...t,table:{...t.table,headerHeight:Number(e.target.value)}}))}/></label>
              <label className="custom-check"><span>Zebra rows</span><input type="checkbox" checked={customTheme.table.zebra} onChange={(e)=>setCustomTheme((t)=>({...t,table:{...t.table,zebra:e.target.checked}}))}/></label>
              <label className="custom-check"><span>Freeze header</span><input type="checkbox" checked={customTheme.table.freeze} onChange={(e)=>setCustomTheme((t)=>({...t,table:{...t.table,freeze:e.target.checked}}))}/></label>
              <label className="custom-check"><span>Auto filter</span><input type="checkbox" checked={customTheme.table.filter} onChange={(e)=>setCustomTheme((t)=>({...t,table:{...t.table,filter:e.target.checked}}))}/></label>
              <label><span>Chart type</span><select value={customTheme.charts.type} onChange={(e)=>setCustomTheme((t)=>({...t,charts:{...t.charts,type:e.target.value}}))}><option>bar</option><option>line</option><option>area</option><option>pie</option><option>doughnut</option><option>column</option></select></label>
              <label><span>Theme name</span><input value={customTheme.name} onChange={(e)=>setCustomTheme((t)=>({...t,name:e.target.value}))}/></label>
            </div>
            <div className="import-custom-preview"><ExcelThemeMiniPreview theme={customTheme}/></div>
            <div className="import-custom-actions"><button className="secondary-button" onClick={() => setCustomOpen(false)}>Cancel</button><button className="primary-button" onClick={() => { setCustomOpen(false); onToast?.("Custom theme applied to the live preview.", "success"); }}>Use Custom Theme</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{reactSafeExcelValue(value)}</strong>
    </div>
  );
}

function SettingToggle({ title, text, enabled, onChange }) {
  return (
    <button type="button" className="setting-toggle setting-toggle-button" onClick={() => onChange?.(!enabled)} aria-pressed={enabled}>
      <div><strong>{title}</strong><p>{text}</p></div>
      <span className={`toggle ${enabled ? "on" : ""}`}><span /></span>
    </button>
  );
}

/* -------------------------------- */
/* Backend response mapping */
/* -------------------------------- */

// Adapts whatever your /analyze endpoint returns into the shape this UI
// expects. It checks a few common field-name variants so it has a good
// chance of working out of the box — but if your backend uses different
// keys, this is the one place to edit.
function mapAnalysisResponse(raw) {
  const data = raw?.data ?? raw?.result ?? raw ?? {};

  const tags = normalizeTags(data.tags ?? data.categories ?? data.labels);

  // Prefer the backend's own category + description; fall back to the
  // first tag plus our local lookup table; fall back again to a generic
  // "couldn't determine" message so this never renders blank.
  const category = data.category ?? data.document_type ?? data.documentType ?? tags[0] ?? DEFAULT_CATEGORY;
  const categoryDescription =
    data.category_description ??
    data.categoryDescription ??
    CATEGORY_DESCRIPTIONS[category] ??
    DEFAULT_CATEGORY_DESCRIPTION;

  return {
    // Preserve the backend-issued document identifier when the analyzer
    // returns one so /chat can use the same document identity.
    documentId:
      data.document_id ??
      data.documentId ??
      data.document?.document_id ??
      data.document?.documentId ??
      data.document?.id ??
      data.id ??
      null,
    risk: normalizeRiskLevel(data.risk_level ?? data.risk ?? data.riskLevel),
    confidence: toNumberOrNull(
      data.confidence ?? data.confidence_score ?? data.confidenceScore
    ),
    pages: toNumberOrNull(data.pages ?? data.page_count ?? data.pageCount),
    wordCount: toNumberOrNull(
      data.word_count ?? data.wordCount ?? data.words
    ),
    language: data.language ?? "English",
    tags,
    category,
    categoryDescription,
    summary:
      data.summary ?? data.ai_summary ?? data.aiSummary ?? "No summary returned by the analyzer.",
    entities: normalizeEntities(
      data.entities ?? data.extracted_fields ?? data.extractedFields ?? data.fields
    ),
    findings: normalizeFindings(
      data.findings ?? data.risks ?? data.issues
    ),
    // Preserve the backend's complete structured CV profile so the Candidate
    // Overview exporter can use the real extracted data instead of trying to
    // reconstruct nested CV fields from display-only entities.
    extracted_data: data.extracted_data ?? data.extractedData ?? data.cv_profile ?? data.profile ?? null,
    analytics: data.analytics ?? null,
    extraction_confidence: data.confidence ?? null,
    source_traceability: data.source_traceability ?? data.sourceTraceability ?? null,
    document_type_confidence: data.document_type_confidence ?? data.documentTypeConfidence ?? null,
    status: data.status,
  };
}

function normalizeRiskLevel(value) {
  if (!value) return "Low";
  const normalized = String(value).toLowerCase();
  if (normalized.startsWith("high")) return "High";
  if (normalized.startsWith("med")) return "Medium";
  return "Low";
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String);
  return String(tags).split(",").map((t) => t.trim()).filter(Boolean);
}

function normalizeEntities(entities) {
  if (!entities) return [];

  if (Array.isArray(entities)) {
    return entities.map((entity) => ({
      label: entity.label ?? entity.name ?? entity.key ?? "Field",
      value: entity.value ?? entity.text ?? String(entity),
    }));
  }

  if (typeof entities === "object") {
    return Object.entries(entities).map(([label, value]) => ({
      label,
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
    }));
  }

  return [];
}

function normalizeFindings(findings) {
  if (!Array.isArray(findings)) return [];

  return findings.map((finding) => ({
    level: normalizeRiskLevel(finding.level ?? finding.severity),
    text: finding.text ?? finding.description ?? finding.message ?? String(finding),
  }));
}

/* -------------------------------- */
/* Excel export helpers                                                */
/* Requires: npm install exceljs                                       */
/*                                                                     */
/* Produces real, styled .xlsx files (bold colored header row, frozen  */
/* header, autofilter, zebra striping, risk color-coding) rather than  */
/* plain CSV. Note: the plain "xlsx" (SheetJS community) package does  */
/* NOT persist cell styling when writing — only exceljs does.          */
/* -------------------------------- */

const RISK_FONT_COLORS = {
  Low: "FF16A34A",
  Medium: "FFD97706",
  High: "FFDC2626",
};

const HEADER_FILL = "FF7C3AED";
const ZEBRA_FILL = "FFF3EFFD";
const BODY_FONT = "Calibri";

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { name: BODY_FONT, bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: false };
  });
  row.height = 22;
}

// Alternating row shading + a consistent base font, applied to every data
// row (skips the header). Call this before colorizeRiskColumn so the risk
// column's color isn't overwritten afterward.
function applyZebraStripes(sheet) {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.font = { ...(cell.font || {}), name: BODY_FONT, size: 10.5 };
      cell.alignment = { vertical: "top", wrapText: cell.alignment?.wrapText ?? false };
      if (rowNumber % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA_FILL } };
      }
    });
    row.height = Math.max(row.height || 0, 18);
  });
}

// Bolds + color-codes a Low/Medium/High column (e.g. "Risk", "Risk Level").
function colorizeRiskColumn(sheet, columnKey) {
  const column = sheet.getColumn(columnKey);
  if (!column) return;
  const colNumber = column.number;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cell = row.getCell(colNumber);
    const color = RISK_FONT_COLORS[cell.value];
    if (color) {
      cell.font = { ...(cell.font || {}), name: BODY_FONT, bold: true, color: { argb: color } };
    }
  });
}

async function triggerExcelDownload(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);

  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// One clean "Documents" sheet: every document as a row, sortable/filterable,
// with the header frozen so it stays visible while scrolling.
async function downloadDocumentsExcel(documents) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Open Ledger Docs";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Documents", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: "Name", key: "name", width: 34 },
    { header: "Type", key: "type", width: 8 },
    { header: "Size", key: "size", width: 10 },
    { header: "Status", key: "status", width: 12 },
    { header: "Risk", key: "risk", width: 10 },
    { header: "Date", key: "date", width: 18 },
    { header: "Pages", key: "pages", width: 8 },
    { header: "Word Count", key: "wordCount", width: 12 },
    { header: "Confidence (%)", key: "confidence", width: 14 },
    { header: "Language", key: "language", width: 11 },
    { header: "Uploaded By", key: "uploadedBy", width: 16 },
    { header: "Document Category", key: "category", width: 18 },
    { header: "Tags", key: "tags", width: 26 },
  ];

  documents.forEach((doc) => {
    sheet.addRow({
      name: doc.name,
      type: doc.type,
      size: doc.size,
      status: doc.status,
      risk: doc.risk,
      date: doc.date,
      pages: doc.pages ?? "",
      wordCount: doc.wordCount ?? "",
      confidence: doc.confidence ?? "",
      language: doc.language ?? "",
      uploadedBy: doc.uploadedBy ?? "",
      category: doc.category ?? "",
      tags: (doc.tags || []).join(", "),
    });
  });

  styleHeaderRow(sheet.getRow(1));
  applyZebraStripes(sheet);
  colorizeRiskColumn(sheet, "risk");
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columns.length },
  };

  await triggerExcelDownload(workbook, "documents-report.xlsx");
}

// One document's full report, split across three readable sheets rather
// than one long wall of rows: an overview, extracted fields, and findings.
async function downloadDocumentExcel(document) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Open Ledger Docs";
  workbook.created = new Date();

  // --- Overview ---
  const overview = workbook.addWorksheet("Overview");
  overview.columns = [
    { header: "Field", key: "field", width: 26 },
    { header: "Value", key: "value", width: 64 },
  ];

  [
    ["Name", document.name],
    ["Type", document.type],
    ["Size", document.size],
    ["Status", document.status],
    ["Risk level", document.risk],
    ["Pages", document.pages ?? ""],
    ["Word count", document.wordCount != null ? document.wordCount : ""],
    ["Confidence (%)", document.confidence ?? ""],
    ["Language", document.language ?? ""],
    ["Uploaded by", document.uploadedBy ?? ""],
    ["Uploaded", document.date],
    ["Document category", document.category ?? ""],
    ["Document category description", document.categoryDescription ?? ""],
    ["Tags", (document.tags || []).join(", ")],
    ["AI summary", document.summary ?? ""],
  ].forEach(([field, value]) => overview.addRow({ field, value }));

  styleHeaderRow(overview.getRow(1));
  overview.getColumn("value").alignment = { wrapText: true, vertical: "top" };
  applyZebraStripes(overview);

  // --- Extracted fields ---
  const entitiesSheet = workbook.addWorksheet("Extracted Fields");
  entitiesSheet.columns = [
    { header: "Field", key: "label", width: 26 },
    { header: "Value", key: "value", width: 54 },
  ];

  const entities = document.entities || [];
  if (entities.length > 0) {
    entities.forEach((e) => entitiesSheet.addRow(e));
  } else {
    entitiesSheet.addRow({ label: "—", value: "No structured fields extracted." });
  }
  styleHeaderRow(entitiesSheet.getRow(1));
  applyZebraStripes(entitiesSheet);

  // --- Risk findings ---
  const findingsSheet = workbook.addWorksheet("Risk Findings");
  findingsSheet.columns = [
    { header: "Risk Level", key: "level", width: 14 },
    { header: "Finding", key: "text", width: 76 },
  ];

  const findings = document.findings || [];
  if (findings.length > 0) {
    findings.forEach((f) => findingsSheet.addRow(f));
  } else {
    findingsSheet.addRow({ level: "—", text: "No risk findings recorded." });
  }
  styleHeaderRow(findingsSheet.getRow(1));
  findingsSheet.getColumn("text").alignment = { wrapText: true, vertical: "top" };
  applyZebraStripes(findingsSheet);
  colorizeRiskColumn(findingsSheet, "level");

  const safeName = document.name.replace(/[^a-z0-9.-]+/gi, "_");
  await triggerExcelDownload(workbook, `${safeName}-report.xlsx`);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* -------------------------------- */
/* Theme — violet, matched to the pricing reference */
/* -------------------------------- */


/* -------------------------------- */
/* Expanded workspace modules */
/* -------------------------------- */

function FolderHealth({ documents, folders, onNavigate }) {
  const rows = folders.map((folder) => {
    const items = documents.filter((doc) => doc.folderId === folder.id);
    const analyzed = items.filter((doc) => doc.status === "Analyzed").length;
    const flagged = items.filter((doc) => doc.risk === "High" || doc.risk === "Medium").length;
    return { ...folder, total: items.length, analyzed, flagged };
  }).filter((row) => row.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  return <section className="card folder-health-card"><div className="section-card-heading"><div><span className="card-label">FOLDER HEALTH</span><h2>Workspace collections</h2></div><button className="text-link-button" onClick={() => onNavigate("Documents")}>Manage <ArrowUpRight size={14} /></button></div>{rows.length ? <div className="folder-health-list">{rows.map((row) => <button key={row.id} onClick={() => onNavigate("Documents")}><span className="folder-health-icon"><Folder size={16} /></span><span className="folder-health-copy"><strong>{row.name}</strong><small>{row.total} document{row.total !== 1 ? "s" : ""} · {row.analyzed} analyzed</small></span><span className="folder-health-score"><strong>{row.flagged}</strong><small>review</small></span><ChevronRight size={14} /></button>)}</div> : <div className="panel-empty"><Folder size={22} /><span>Folders become useful once documents are organized.</span></div>}</section>;
}

function ComparisonLauncher({ documents, onSelect }) {
  const [leftId, setLeftId] = useState(documents[0]?.id ?? "");
  const [rightId, setRightId] = useState(documents[1]?.id ?? "");
  const left = documents.find((doc) => String(doc.id) === String(leftId));
  const right = documents.find((doc) => String(doc.id) === String(rightId));
  const compare = () => { if (left) onSelect(left); if (right) onSelect(right); };
  return <section className="card comparison-launcher"><div className="section-card-heading"><div><span className="card-label">COMPARE</span><h2>Put two documents side by side.</h2></div><Layers size={18} /></div><p className="comparison-description">Choose two saved files to open them from the same workspace. Use this as the starting point for contract, version or report comparison workflows.</p><div className="comparison-select-grid"><label>Document A<select value={leftId} onChange={(e) => setLeftId(e.target.value)}><option value="">Choose a document</option>{documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}</option>)}</select></label><div className="comparison-vs">VS</div><label>Document B<select value={rightId} onChange={(e) => setRightId(e.target.value)}><option value="">Choose a document</option>{documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}</option>)}</select></label></div><div className="comparison-preview"><div><FileText size={16} /><span>{left?.name || "Select document A"}</span></div><strong>↔</strong><div><FileText size={16} /><span>{right?.name || "Select document B"}</span></div></div><button className="secondary-button" disabled={!left || !right} onClick={compare}><Layers size={15} /> Open selected reviews</button></section>;
}

function ActivityTimeline({ documents }) {
  const events = documents.slice(0, 7).map((doc, index) => ({
    id: `${doc.id}-${index}`,
    title: doc.status === "Analyzed" ? "Document analyzed" : doc.status === "Processing" ? "Analysis started" : "Analysis needs attention",
    text: doc.name,
    status: doc.status,
  }));
  return <section className="card activity-timeline"><div className="section-card-heading"><div><span className="card-label">ACTIVITY</span><h2>Workspace timeline</h2></div><Clock3 size={18} /></div>{events.length ? <div className="activity-timeline-list">{events.map((event) => <div key={event.id} className="activity-event"><span className={`activity-event-dot ${String(event.status).toLowerCase()}`} /><div><strong>{event.title}</strong><span>{event.text}</span></div><time>{event.status}</time></div>)}</div> : <div className="panel-empty"><Clock3 size={22} /><span>Activity will appear after your first upload.</span></div>}</section>;
}

function WorkspaceChecklist({ documents, folders, onNavigate, onUpload }) {
  const checks = [
    [documents.length > 0, "Upload your first document", "Add a PDF, DOCX or image to the analyzer.", () => onUpload()],
    [documents.some((doc) => doc.status === "Analyzed"), "Complete an AI review", "Wait for the analyzer to return structured results.", () => onNavigate("Analyze")],
    [folders.length > 0, "Create a folder", "Group related files into a reusable collection.", () => onNavigate("Documents")],
    [documents.length > 1, "Compare your workspace", "Select two documents to review together.", () => onNavigate("Documents")],
    [documents.some((doc) => doc.status === "Analyzed"), "Create a presentation", "Turn one file or a folder into a presentation.", () => onNavigate("Presentation")],
  ];
  const done = checks.filter((item) => item[0]).length;
  return <section className="card workspace-checklist"><div className="checklist-heading"><div><span className="card-label">WORKSPACE SETUP</span><h2>Build momentum</h2></div><strong>{done}/{checks.length}</strong></div><div className="checklist-progress"><i style={{ width: `${Math.round((done / checks.length) * 100)}%` }} /></div><div className="checklist-items">{checks.map(([complete, title, text, action]) => <button key={title} onClick={action} className={complete ? "complete" : ""}><span className="checklist-icon">{complete ? <Check size={14} /> : <Plus size={14} />}</span><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={14} /></button>)}</div></section>;
}

function DocumentCommandBar({ documents, onUpload, onNavigate }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => documents.filter((doc) => doc.name.toLowerCase().includes(query.toLowerCase())).slice(0, 4), [documents, query]);
  return <section className="document-command-bar"><div className="document-command-copy"><span>QUICK FIND</span><strong>Jump to a document or workspace action.</strong></div><div className="document-command-input"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search saved documents..." /><kbd>⌘K</kbd></div>{query && <div className="document-command-results">{matches.length ? matches.map((doc) => <button key={doc.id} onClick={() => onNavigate("Analyze")}><FileText size={14} /><span>{doc.name}</span><small>{doc.status}</small></button>) : <span>No matching documents.</span>}</div>}<button className="document-command-upload" onClick={onUpload}><Plus size={15} /> Upload</button></section>;
}

function SmartEmptyState({ title, text, icon = <Files size={22} />, actionLabel, onAction }) {
  return <div className="smart-empty-state"><div className="smart-empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p>{actionLabel && <button className="secondary-button" onClick={onAction}>{actionLabel}<ArrowUpRight size={14} /></button>}</div>;
}

function MetricSparkline({ values = [4, 6, 5, 8, 7, 9, 10] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${100 - ((value - min) / Math.max(max - min, 1)) * 76}`).join(" ");
  return <svg className="metric-sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ConfidenceMeter({ value = 0, label = "Confidence" }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className="confidence-meter"><div className="confidence-meter-head"><span>{label}</span><strong>{safe}%</strong></div><div className="confidence-meter-track"><i style={{ width: `${safe}%` }} /></div></div>;
}

function AnalysisStatusJourney({ document }) {
  const stages = ["Uploaded", "Processing", "Analyzed", "Review"];
  const currentIndex = document?.status === "Failed" ? 1 : Math.max(0, stages.indexOf(document?.status || "Uploaded"));
  return <div className="status-journey">{stages.map((stage, index) => <div key={stage} className={`journey-step ${index <= currentIndex ? "done" : ""} ${stage === document?.status ? "current" : ""}`}><span>{index < currentIndex ? <Check size={12} /> : index + 1}</span><small>{stage}</small>{index < stages.length - 1 && <i />}</div>)}</div>;
}

function ReviewScoreCard({ document }) {
  const confidence = Number(document?.confidence) || 0;
  const findingCount = document?.findings?.length || 0;
  const entityCount = document?.entities?.length || 0;
  return <section className="card review-score-card"><div className="review-score-main"><div><span className="card-label">REVIEW SCORE</span><h2>{confidence ? `${confidence}%` : "Pending"}</h2><p>{confidence ? "AI confidence across the extracted review." : "A score will appear after analysis completes."}</p></div><div className="review-score-ring" style={{ "--score": `${confidence}%` }}><div>{confidence || 0}%</div></div></div><div className="review-score-stats"><div><strong>{findingCount}</strong><span>findings</span></div><div><strong>{entityCount}</strong><span>entities</span></div><div><strong>{document?.pages ?? "—"}</strong><span>pages</span></div></div><ConfidenceMeter value={confidence} label="Extraction confidence" /></section>;
}

/* ==========================================================================
   SAP Data Integration Workspace
   --------------------------------------------------------------------------
   Frontend integration for the real FastAPI SAP module. This component does
   not fabricate SAP data: every connection, entity, query, import, analysis
   and report action is backed by the configured /api/sap endpoints.
   ========================================================================== */

function SAPPage({ darkMode = false, onBack, onToast }) {
  const [status, setStatus] = useState(null);
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [preview, setPreview] = useState(null);
  const [queryRows, setQueryRows] = useState([]);
  const [importJob, setImportJob] = useState(null);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [connection, setConnection] = useState({
    system_type: "s4hana",
    system_name: "",
    base_url: "",
    endpoint: "",
    tenant_id: "",
    client_id: "",
    auth_type: "oauth2",
  });
  const [query, setQuery] = useState({
    entity: "",
    select: [],
    filters: {},
    page: 1,
    page_size: 100,
  });

  const apiCall = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}/api/sap${path}`, {
      ...options,
      headers: {
        ...getApiHeaders(!(options.body instanceof FormData)),
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const detail = await readBackendError(response);
      throw new Error(detail || `SAP service returned ${response.status}.`);
    }
    const type = response.headers.get("content-type") || "";
    return type.includes("application/json") ? response.json() : response;
  };

  const loadStatus = async () => {
    try {
      const result = await apiCall("/status");
      setStatus(result);
      setError("");
      return result;
    } catch (e) {
      setStatus(null);
      setError(e?.message || "SAP service is unavailable.");
      return null;
    }
  };

  const loadEntities = async () => {
    try {
      setBusy(true);
      const result = await apiCall("/entities");
      const items = Array.isArray(result) ? result : (result.items || result.entities || result.data || []);
      setEntities(items);
      if (!selectedEntity && items[0]) {
        setSelectedEntity(items[0]);
        setQuery((current) => ({ ...current, entity: items[0].name || items[0].entity_name || "" }));
      }
      setError("");
    } catch (e) {
      setError(e?.message || "Unable to load SAP data sources.");
    } finally {
      setBusy(false);
    }
  };

  const loadReports = async () => {
    try {
      const result = await apiCall("/reports");
      setReports(Array.isArray(result) ? result : (result.items || result.reports || []));
    } catch (e) {
      // Report history is optional until the backend endpoint is configured.
      console.warn("SAP report history unavailable:", e);
    }
  };

  useEffect(() => {
    loadStatus();
    loadReports();
  }, []);

  useEffect(() => {
    if (status?.connected) loadEntities();
  }, [status?.connected]);

  useEffect(() => {
    if (!importJob?.job_id) return undefined;
    if (["completed", "failed", "cancelled"].includes(String(importJob.status).toLowerCase())) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const result = await apiCall(`/import/${encodeURIComponent(importJob.job_id)}`);
        setImportJob(result);
        if (String(result.status).toLowerCase() === "completed") {
          onToast?.("SAP dataset import completed.", "success");
          await loadStatus();
        }
      } catch (e) {
        setImportJob((current) => ({ ...(current || {}), status: "failed", error: e?.message }));
      }
    }, 1800);
    return () => window.clearInterval(timer);
  }, [importJob?.job_id, importJob?.status]);

  const connectSAP = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiCall("/connect", {
        method: "POST",
        body: JSON.stringify(connection),
      });
      setStatus(result);
      setWizardOpen(false);
      onToast?.("SAP connection configured. Run a connection test before importing data.", "success");
      await loadEntities();
    } catch (e) {
      setError(e?.message || "SAP connection could not be configured.");
    } finally {
      setBusy(false);
    }
  };

  const testConnection = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await apiCall("/test-connection", { method: "POST", body: JSON.stringify({}) });
      setStatus((current) => ({ ...(current || {}), ...(result || {}) }));
      onToast?.("SAP connection test completed.", result?.connected === false ? "danger" : "success");
    } catch (e) {
      setError(e?.message || "SAP connection test failed.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await apiCall("/disconnect", { method: "POST", body: JSON.stringify({}) });
      setStatus({ connected: false });
      setEntities([]);
      setSelectedEntity(null);
      setPreview(null);
      setQueryRows([]);
      onToast?.("SAP connection disconnected.", "success");
    } catch (e) {
      setError(e?.message || "SAP disconnect failed.");
    } finally {
      setBusy(false);
    }
  };

  const querySAP = async () => {
    if (!query.entity) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiCall("/query", { method: "POST", body: JSON.stringify(query) });
      const rows = Array.isArray(result?.records) ? result.records : (result?.items || result?.data || []);
      setPreview(result);
      setQueryRows(rows);
      onToast?.(`${rows.length} SAP records loaded for preview.`, "success");
    } catch (e) {
      setError(e?.message || "SAP query failed.");
    } finally {
      setBusy(false);
    }
  };

  const importDataset = async () => {
    if (!query.entity) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiCall("/import", {
        method: "POST",
        body: JSON.stringify({ ...query, preview: false }),
      });
      setImportJob(result);
      onToast?.("SAP import job queued.", "success");
    } catch (e) {
      setError(e?.message || "SAP import could not be started.");
    } finally {
      setBusy(false);
    }
  };

  const analyzeDataset = async () => {
    if (!query.entity) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiCall("/analyze", {
        method: "POST",
        body: JSON.stringify({
          entity: query.entity,
          dataset_id: preview?.dataset_id || preview?.id,
          records: queryRows,
        }),
      });
      setPreview((current) => ({ ...(current || {}), analysis: result }));
      onToast?.("SAP dataset analysis completed.", "success");
    } catch (e) {
      setError(e?.message || "SAP analysis failed.");
    } finally {
      setBusy(false);
    }
  };

  const generateReport = async () => {
    if (!query.entity) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiCall("/reports", {
        method: "POST",
        body: JSON.stringify({
          name: `SAP ${selectedEntity?.label || selectedEntity?.name || query.entity} Report`,
          dataset_id: preview?.dataset_id || preview?.id,
          entity: query.entity,
          report_type: "Executive Report",
          template: "executive",
          rows: queryRows,
          theme: "professional",
        }),
      });
      setReports((current) => [result, ...current]);
      onToast?.("SAP report generated.", "success");
    } catch (e) {
      setError(e?.message || "SAP report generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = async (report) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sap/reports/${encodeURIComponent(report.id)}/download`, {
        headers: getApiHeaders(false),
      });
      if (!response.ok) throw new Error((await readBackendError(response)) || `Download failed (${response.status}).`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = report.filename || "SAP_Report.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      onToast?.(e?.message || "SAP report download failed.", "danger");
    }
  };

  const connected = Boolean(status?.connected || status?.status === "connected");
  const mode = String(status?.mode || status?.environment || "").toLowerCase();
  const selectedFields = query.select || [];
  const entityFields = selectedEntity?.fields || selectedEntity?.properties || selectedEntity?.columns || [];
  const fieldNames = entityFields.map((field) => typeof field === "string" ? field : field.name || field.key).filter(Boolean);

  const toggleField = (field) => {
    setQuery((current) => ({
      ...current,
      select: current.select.includes(field)
        ? current.select.filter((item) => item !== field)
        : [...current.select, field],
    }));
  };

  return (
    <section className={`sap-page ${darkMode ? "is-dark" : ""}`}>
      <div className="sap-hero">
        <div>
          <span className="sap-eyebrow"><Database size={13} /> ENTERPRISE DATA CONNECTOR</span>
          <h1>SAP Data</h1>
          <p>Connect an authorized SAP environment and turn permitted business data into validated analysis, dashboards and Excel reports.</p>
        </div>
        <div className="sap-hero-actions">
          <button className="secondary-button" onClick={loadStatus} disabled={busy}><Activity size={15} /> Refresh</button>
          {!connected ? (
            <button className="primary-button" onClick={() => setWizardOpen(true)}><Database size={15} /> Connect SAP</button>
          ) : (
            <button className="secondary-button" onClick={testConnection} disabled={busy}><ShieldCheck size={15} /> Test Connection</button>
          )}
        </div>
      </div>

      {error && (
        <div className="sap-alert sap-alert-error">
          <AlertTriangle size={16} />
          <div><strong>SAP service message</strong><span>{error}</span></div>
          <button onClick={() => setError("")}>×</button>
        </div>
      )}

      {mode === "demo" && <div className="sap-demo-banner"><Database size={15} /><strong>DEMO DATA</strong><span>SAP demo mode is enabled by the backend. Synthetic records must never be used as production SAP data.</span></div>}

      <div className="sap-status-grid">
        <div className="sap-status-card">
          <span>Connection</span>
          <strong className={connected ? "sap-ok" : "sap-muted"}>{connected ? "✓ Connected" : "○ Not Connected"}</strong>
          <small>{status?.system_type || "SAP environment not configured"}</small>
        </div>
        <div className="sap-status-card">
          <span>Environment</span>
          <strong>{status?.environment || status?.system_name || "—"}</strong>
          <small>{status?.base_url || "Configured on the backend"}</small>
        </div>
        <div className="sap-status-card">
          <span>Last Test</span>
          <strong>{status?.last_tested_at ? new Date(status.last_tested_at).toLocaleString() : "Not tested"}</strong>
          <small>{status?.test_status || "Run Test Connection"}</small>
        </div>
        <div className="sap-status-card sap-status-actions">
          <button className="secondary-button" onClick={testConnection} disabled={!connected || busy}>Test</button>
          <button className="secondary-button" onClick={disconnect} disabled={!connected || busy}>Disconnect</button>
        </div>
      </div>

      <div className="sap-section-head">
        <div><span>DATA SOURCES</span><h2>Permitted SAP entities</h2><p>Only entities returned by the connected SAP API are shown.</p></div>
        {connected && <button className="secondary-button" onClick={loadEntities} disabled={busy}><Files size={15} /> Refresh sources</button>}
      </div>

      {!connected ? (
        <div className="sap-empty">
          <Database size={30} />
          <h2>Connect an SAP environment to begin</h2>
          <p>No SAP records are shown until the backend confirms an authorized connection.</p>
          <button className="primary-button" onClick={() => setWizardOpen(true)}>Connect SAP</button>
        </div>
      ) : (
        <div className="sap-workspace-grid">
          <div className="sap-source-list">
            {(entities.length ? entities : []).map((entity) => {
              const name = entity.name || entity.entity_name || entity.key;
              const active = selectedEntity && (selectedEntity.name || selectedEntity.entity_name || selectedEntity.key) === name;
              return (
                <button key={name} className={`sap-source-card ${active ? "active" : ""}`} onClick={() => {
                  setSelectedEntity(entity);
                  setQuery((current) => ({ ...current, entity: name, select: [] }));
                  setPreview(null);
                  setQueryRows([]);
                }}>
                  <span className="sap-source-icon"><Database size={16} /></span>
                  <span><strong>{entity.label || name}</strong><small>{entity.description || "SAP API entity"}</small></span>
                  <ChevronRight size={15} />
                </button>
              );
            })}
            {!entities.length && <div className="sap-inline-empty">No permitted entities were returned by SAP.</div>}
          </div>

          <div className="sap-query-card">
            <div className="sap-query-head">
              <div><span>QUERY BUILDER</span><h2>{selectedEntity?.label || selectedEntity?.name || "Select a data source"}</h2></div>
              <span className="sap-odata-badge">OData/API</span>
            </div>

            {selectedEntity ? (
              <>
                <div className="sap-field-section">
                  <label>Columns</label>
                  <div className="sap-field-chips">
                    {(fieldNames.length ? fieldNames : ["Fields are provided by the SAP metadata endpoint"]).map((field) => (
                      fieldNames.length
                        ? <button key={field} className={selectedFields.includes(field) ? "selected" : ""} onClick={() => toggleField(field)}>{field}</button>
                        : <span key={field}>{field}</span>
                    ))}
                  </div>
                </div>

                <div className="sap-filter-grid">
                  <label><span>Date from</span><input type="date" value={query.filters.date_from || ""} onChange={(e) => setQuery((c) => ({ ...c, filters: { ...c.filters, date_from: e.target.value } }))} /></label>
                  <label><span>Date to</span><input type="date" value={query.filters.date_to || ""} onChange={(e) => setQuery((c) => ({ ...c, filters: { ...c.filters, date_to: e.target.value } }))} /></label>
                  <label><span>Status</span><input value={query.filters.status || ""} onChange={(e) => setQuery((c) => ({ ...c, filters: { ...c.filters, status: e.target.value } }))} placeholder="Optional" /></label>
                  <label><span>Page size</span><select value={query.page_size} onChange={(e) => setQuery((c) => ({ ...c, page_size: Math.min(1000, Math.max(1, Number(e.target.value) || 100)) }))}><option value={50}>50</option><option value={100}>100</option><option value={250}>250</option><option value={500}>500</option><option value={1000}>1000</option></select></label>
                </div>

                <div className="sap-action-row">
                  <button className="secondary-button" onClick={querySAP} disabled={busy}><Search size={15} /> {busy ? "Querying…" : "Preview Data"}</button>
                  <button className="primary-button" onClick={importDataset} disabled={busy || !query.entity}><Upload size={15} /> Import Dataset</button>
                </div>

                {preview && (
                  <div className="sap-preview-card">
                    <div className="sap-preview-stats">
                      <span><b>{preview.total ?? preview.count ?? queryRows.length}</b> records</span>
                      <span><b>{fieldNames.length || Object.keys(queryRows[0] || {}).length}</b> columns</span>
                      <span><b>{preview.quality?.quality_score ?? "—"}</b> quality</span>
                    </div>
                    <div className="sap-table-wrap">
                      <table><thead><tr>{Object.keys(queryRows[0] || {}).map((key) => <th key={key}>{key}</th>)}</tr></thead>
                        <tbody>{queryRows.slice(0, 100).map((row, i) => <tr key={i}>{Object.keys(queryRows[0] || {}).map((key) => <td key={key}>{String(row[key] ?? "")}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                    <div className="sap-action-row">
                      <button className="secondary-button" onClick={analyzeDataset} disabled={busy || !queryRows.length}><Sparkles size={15} /> Analyze with AI</button>
                      <button className="primary-button" onClick={generateReport} disabled={busy || !queryRows.length}><FileSpreadsheet size={15} /> Build Excel Report</button>
                    </div>
                    {preview.analysis && <div className="sap-analysis"><span>AI ANALYSIS</span><pre>{JSON.stringify(preview.analysis, null, 2)}</pre></div>}
                  </div>
                )}
              </>
            ) : (
              <div className="sap-inline-empty">Select an entity to build a validated SAP query.</div>
            )}
          </div>
        </div>
      )}

      {importJob && (
        <div className="sap-job-card">
          <div><span>IMPORT JOB</span><strong>{importJob.status || "queued"}</strong></div>
          <div className="sap-job-progress"><i style={{ width: `${Math.max(0, Math.min(100, Number(importJob.progress) || 0))}%` }} /></div>
          <small>{importJob.records_processed ?? 0} records processed · {Number(importJob.progress) || 0}%</small>
        </div>
      )}

      <div className="sap-section-head">
        <div><span>REPORT HISTORY</span><h2>SAP reports</h2><p>Reports are loaded from the authenticated backend account.</p></div>
        <button className="secondary-button" onClick={loadReports}><RefreshIcon /> Refresh</button>
      </div>
      <div className="sap-report-list">
        {reports.length ? reports.map((report) => (
          <div className="sap-report-row" key={report.id}>
            <div><strong>{report.name || "SAP Report"}</strong><small>{report.created_at ? new Date(report.created_at).toLocaleString() : "—"} · {report.record_count ?? "—"} records</small></div>
            <button className="secondary-button" onClick={() => downloadReport(report)}><Download size={15} /> Download</button>
          </div>
        )) : <div className="sap-inline-empty">No SAP reports have been generated for this account.</div>}
      </div>

      {wizardOpen && (
        <div className="sap-modal-backdrop" onClick={() => setWizardOpen(false)}>
          <form className="sap-wizard" onSubmit={connectSAP} onClick={(e) => e.stopPropagation()}>
            <div className="sap-wizard-head"><div><span>SECURE CONNECTION</span><h2>Connect SAP</h2><p>Credentials and tokens stay on the backend. They are never placed in this React form.</p></div><button type="button" onClick={() => setWizardOpen(false)}><X size={17} /></button></div>
            <div className="sap-wizard-grid">
              <label><span>SAP system</span><select value={connection.system_type} onChange={(e) => setConnection((c) => ({ ...c, system_type: e.target.value }))}><option value="s4hana">SAP S/4HANA</option><option value="business_one">SAP Business One</option><option value="successfactors">SAP SuccessFactors</option><option value="custom_odata">Custom SAP API/OData</option></select></label>
              <label><span>System name</span><input value={connection.system_name} onChange={(e) => setConnection((c) => ({ ...c, system_name: e.target.value }))} placeholder="Production S/4HANA" /></label>
              <label className="full"><span>SAP base URL</span><input required type="url" value={connection.base_url} onChange={(e) => setConnection((c) => ({ ...c, base_url: e.target.value }))} placeholder="https://sap.example.com" /></label>
              <label className="full"><span>OData/API endpoint</span><input value={connection.endpoint} onChange={(e) => setConnection((c) => ({ ...c, endpoint: e.target.value }))} placeholder="/sap/opu/odata/sap/..." /></label>
              <label><span>Tenant / client</span><input value={connection.tenant_id} onChange={(e) => setConnection((c) => ({ ...c, tenant_id: e.target.value }))} placeholder="Provided by SAP" /></label>
              <label><span>Authentication</span><select value={connection.auth_type} onChange={(e) => setConnection((c) => ({ ...c, auth_type: e.target.value }))}><option value="oauth2">OAuth 2.0</option><option value="basic_backend">Basic auth (backend only)</option><option value="custom">Custom backend auth</option></select></label>
            </div>
            <div className="sap-wizard-security"><ShieldCheck size={16} /><span>Do not enter a SAP password or client secret here. Configure backend-side credentials/OAuth in the server environment.</span></div>
            <div className="sap-wizard-actions"><button type="button" className="secondary-button" onClick={() => setWizardOpen(false)}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Connecting…" : "Configure Connection"}</button></div>
          </form>
        </div>
      )}
    </section>
  );
}

function RefreshIcon() {
  return <Activity size={15} />;
}


export default App;

function AIReportStudio({ darkMode = false, onBack, onToast }) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [profile, setProfile] = useState(null);
  const [detected, setDetected] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [plan, setPlan] = useState(null);
  const [step, setStep] = useState(1);
  const [output, setOutput] = useState("all");
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [branding, setBranding] = useState({ company_name: "", accent: "#5B21B6", font: "Aptos" });
  const inputRef = useRef(null);

  const reportEndpoint = (path) => `${API_BASE_URL}/api/reports${path}`;

  const cleanValue = (value) => {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === "object" && value?.result !== undefined) return cleanValue(value.result);
    if (typeof value === "object" && value?.text !== undefined) return String(value.text);
    return String(value).replace(/\s+/g, " ").trim();
  };

  const parseCsv = (csv) => {
    const out = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < csv.length; i += 1) {
      const ch = csv[i], next = csv[i + 1];
      if (ch === '"') {
        if (quoted && next === '"') { cell += '"'; i += 1; }
        else quoted = !quoted;
      } else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
      else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && next === "\n") i += 1;
        row.push(cell); out.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell.length || row.length) { row.push(cell); out.push(row); }
    return out.filter((r) => r.some((v) => String(v ?? "").trim() !== ""));
  };

  const parseFile = async (file) => {
    const ext = getFileExtension(file.name);
    if (!['xlsx', 'csv'].includes(ext)) throw new Error("AI Report Studio supports .xlsx and .csv files.");
    if (file.size > 75 * 1024 * 1024) throw new Error("This workbook is larger than 75 MB.");
    let raw = [];
    if (ext === 'csv') {
      raw = parseCsv(await file.text());
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets.find((ws) => ws.rowCount > 1) || workbook.worksheets[0];
      if (!sheet) throw new Error("No readable worksheet was found.");
      sheet.eachRow({ includeEmpty: false }, (r) => raw.push(r.values.slice(1).map(cleanValue)));
    }
    if (!raw.length) throw new Error("The workbook is empty.");
    const width = Math.max(...raw.map((r) => r.length));
    const headers = Array.from({ length: width }, (_, i) => String(raw[0]?.[i] || `Column ${i + 1}`).trim() || `Column ${i + 1}`);
    const parsedRows = raw.slice(1).filter((r) => r.some((v) => cleanValue(v))).map((r) => {
      const record = {};
      headers.forEach((header, i) => { record[header] = cleanValue(r[i] ?? ""); });
      return record;
    });
    if (!parsedRows.length) throw new Error("No data records were found below the header row.");
    return { headers, rows: parsedRows };
  };

  const importWorkbook = async (file) => {
    if (!file) return;
    setBusy(true); setError(""); setDashboard(null);
    try {
      const parsed = await parseFile(file);
      setFileName(file.name);
      setRows(parsed.rows.slice(0, 10000));
      setSelected(parsed.rows.slice(0, 10000).map((_, i) => i));
      setProfile(null); setDetected(null); setIdentity(null); setMappings([]); setPlan(null); setStep(1);
      onToast?.(`${file.name} loaded. Profiling the dataset…`, "success");
      await profileDataset(parsed.rows.slice(0, 10000));
    } catch (e) {
      setError(e?.message || "Unable to import the workbook.");
    } finally { setBusy(false); }
  };

  const apiJson = async (path, body) => {
    const response = await fetch(reportEndpoint(path), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error((await readBackendError(response)) || `Report Studio returned ${response.status}.`);
    return response.json();
  };

  const profileDataset = async (datasetRows = rows) => {
    if (!datasetRows.length) return;
    setBusy(true); setError("");
    try {
      const payload = { rows: datasetRows, title: fileName || "Open Ledger Docs Report" };
      const result = await apiJson("/preview", payload);
      const mappingResult = await apiJson("/map-fields", payload);
      setProfile(result.profile); setDetected(result.detected); setIdentity(result.identity); setPlan(result.plan); setMappings(mappingResult.mappings || []);
      setSelectedSectionId(result.plan?.sections?.[0]?.id || null);
      setStep(2);
    } catch (e) { setError(e?.message || "Dataset profiling failed."); }
    finally { setBusy(false); }
  };

  const runAssistant = async () => {
    if (!rows.length || !assistantPrompt.trim()) return;
    setBusy(true); setError("");
    try {
      const result = await apiJson("/assistant", { rows, prompt: assistantPrompt });
      setDetected(result.detected); setProfile(result.profile); setPlan(result.proposal);
      setSelectedSectionId(result.proposal?.sections?.[0]?.id || null);
      setStep(4);
      onToast?.("AI proposed a report structure. Review it before generation.", "success");
    } catch (e) { setError(e?.message || "AI report planning failed."); }
    finally { setBusy(false); }
  };

  const updateSection = (id, patch) => {
    setPlan((current) => current ? ({ ...current, sections: current.sections.map((s) => s.id === id ? { ...s, ...patch } : s) }) : current);
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows.map((row, index) => ({ row, index }));
    return rows.map((row, index) => ({ row, index })).filter(({ row }) => Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [rows, search]);

  const selectedRow = rows[selected[0] ?? 0] || {};
  const activeSection = plan?.sections?.find((section) => section.id === selectedSectionId) || plan?.sections?.[0];

  const toggleSelected = (index) => setSelected((current) => current.includes(index) ? current.filter((x) => x !== index) : [...current, index]);
  const toggleAllVisible = () => {
    const visible = filteredRows.map(({ index }) => index);
    const allSelected = visible.every((index) => selected.includes(index));
    setSelected((current) => allSelected ? current.filter((index) => !visible.includes(index)) : [...new Set([...current, ...visible])]);
  };

  const generate = async () => {
    if (!rows.length || !plan || selected.length === 0) return;
    setBusy(true); setError(""); setDashboard(null);
    try {
      const response = await fetch(reportEndpoint("/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, title: fileName.replace(/\.(xlsx|csv)$/i, "") || "Open Ledger Docs Report", output, plan, record_indexes: selected, filename: "Open Ledger Docs_Professional_Report", branding }),
      });
      if (!response.ok) throw new Error((await readBackendError(response)) || `Generation failed with ${response.status}.`);
      const type = response.headers.get("content-type") || "";
      if (type.includes("application/json")) {
        const result = await response.json();
        setDashboard(result.dashboard || null);
        setStep(5);
        onToast?.("Dashboard generated from the actual dataset.", "success");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/)?.[1] || (output === "excel_workbook" ? "Open Ledger Docs_Report.xlsx" : "Open Ledger Docs_Reports.zip");
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      setStep(5);
      onToast?.("Report output generated from the selected records.", "success");
    } catch (e) { setError(e?.message || "Report generation failed."); }
    finally { setBusy(false); }
  };

  const saveTemplate = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await apiJson("/templates", { name: `${detected?.label || "Business"} Template`, template: { plan, branding, output } });
      onToast?.("Report template saved to the configured persistence layer.", "success");
    } catch (e) { setError(e?.message || "Template could not be saved."); }
    finally { setBusy(false); }
  };

  const outputOptions = [
    ["professional_report", "Professional Report", "PDF + DOCX per selected record"],
    ["excel_workbook", "Excel Workbook", "Executive summary + analysis + raw data"],
    ["dashboard", "Dashboard", "KPIs, quality and dataset insights"],
    ["professional_report_excel", "Professional Report + Excel", "Profiles plus workbook"],
    ["professional_report_dashboard", "Professional Report + Dashboard", "Profiles plus analytics"],
    ["excel_dashboard", "Excel + Dashboard", "Workbook plus live dashboard data"],
    ["all", "All Outputs", "Profiles + Excel + complete output package"],
  ];

  return <section className={`report-studio ${darkMode ? "is-dark" : ""}`}>
    <header className="report-studio-head">
      <div>
        <span className="report-studio-eyebrow"><Sparkles size={13}/> DATA → AI → REPORT GENERATION</span>
        <h1>AI Report Studio</h1>
        <p>Turn structured Excel data into grounded professional reports, workbooks, dashboards and insights.</p>
      </div>
      <div className="report-studio-head-actions">
        <button className="secondary-button" onClick={onBack}><ArrowLeft size={15}/> Back</button>
        <button className="primary-button" onClick={() => inputRef.current?.click()}><FileUp size={15}/> Import Excel</button>
        <input ref={inputRef} hidden type="file" accept=".xlsx,.csv" onChange={(e) => importWorkbook(e.target.files?.[0])}/>
      </div>
    </header>

    <div className="report-studio-steps">
      {["Import & Detect", "Map Fields", "Records", "Build Report", "Generate"].map((label, i) => <button key={label} className={step === i + 1 ? "active" : step > i + 1 ? "done" : ""} onClick={() => (i === 0 || profile) && setStep(i + 1)}><span>{i + 1}</span>{label}</button>)}
    </div>

    {error && <div className="report-studio-alert error"><AlertTriangle size={15}/><span>{error}</span><button onClick={() => setError("")}>×</button></div>}

    {!rows.length ? <div className="report-studio-empty"><div><FileSpreadsheet size={34}/></div><h2>Import a structured Excel dataset</h2><p>Upload CVs, employees, customers, invoices, sales, products, projects or other business records. Open Ledger Docs will detect the dataset type and propose the report structure.</p><button className="primary-button" onClick={() => inputRef.current?.click()}><Upload size={16}/> Choose Excel / CSV</button></div> : <>
      <div className="report-studio-meta">
        <span><b>Dataset</b>{fileName}</span><span><b>Detected</b>{detected?.label || "Profiling…"}</span><span><b>Records</b>{identity?.record_count ?? rows.length}</span><span><b>Fields</b>{profile?.columns ?? "—"}</span><span><b>Quality</b>{profile?.quality?.quality_score ?? "—"}</span>
      </div>

      <div className="report-studio-grid">
        <aside className="report-studio-left">
          <div className="rs-card">
            <div className="rs-card-title"><Sparkles size={14}/> Build with AI</div>
            <textarea value={assistantPrompt} onChange={(e) => setAssistantPrompt(e.target.value)} placeholder="Tell AI what report you want… e.g. create a professional profile for every candidate with summary, skills, experience, education and certifications." />
            <button className="rs-primary" disabled={busy || !assistantPrompt.trim()} onClick={runAssistant}>{busy ? "Planning…" : "Propose Report"}</button>
          </div>
          <div className="rs-card">
            <div className="rs-card-title">Dataset detected</div>
            <strong>{detected?.label || "Unknown"}</strong>
            <p>{detected?.confidence ? `${detected.confidence}% detection confidence` : "No detection yet"}</p>
            <div className="rs-signal-list">{(detected?.matched_signals || []).slice(0, 6).map((signal) => <span key={signal}>{signal}</span>)}</div>
          </div>
          <div className="rs-card">
            <div className="rs-card-title">Data quality</div>
            {profile?.quality && <div className="rs-quality-grid"><div><b>{profile.quality.missing_cells}</b><small>Missing cells</small></div><div><b>{profile.quality.duplicate_rows}</b><small>Duplicates</small></div><div><b>{profile.quality.invalid_dates}</b><small>Invalid dates</small></div><div><b>{profile.quality.quality_score}</b><small>Quality score</small></div></div>}
            <small className="rs-method">{profile?.quality?.score_method}</small>
          </div>
        </aside>

        <main className="report-studio-center">
          {step === 1 && <div className="rs-panel"><div className="rs-panel-head"><div><span>DATA UNDERSTANDING</span><h2>{detected?.label || "Dataset"}</h2><p>{detected?.record_type ? `One row is treated as one ${detected.record_type}.` : "Profile the dataset to continue."}</p></div><button className="secondary-button" onClick={() => profileDataset()} disabled={busy}>{busy ? "Profiling…" : "Re-profile"}</button></div><div className="rs-preview-table"><table><thead><tr>{(profile?.column_profile || Object.keys(rows[0] || {})).slice(0, 10).map((column) => <th key={typeof column === "string" ? column : column.key}>{typeof column === "string" ? column : column.label}</th>)}</tr></thead><tbody>{rows.slice(0, 8).map((row, index) => <tr key={index}>{(profile?.column_profile || Object.keys(row).slice(0, 10)).slice(0, 10).map((column) => { const key = typeof column === "string" ? column : column.key; return <td key={key}>{String(row[key] ?? "")}</td>; })}</tr>)}</tbody></table></div></div>}

          {step === 2 && <div className="rs-panel"><div className="rs-panel-head"><div><span>AI FIELD MAPPING</span><h2>Review semantic mappings</h2><p>Mappings are suggestions. They are not applied silently.</p></div><button className="secondary-button" onClick={() => setStep(3)}>Continue <ChevronRight size={15}/></button></div><div className="rs-mapping-list">{mappings.map((mapping, index) => <div className="rs-mapping-row" key={`${mapping.source_column}-${index}`}><div><b>{mapping.source_label}</b><small>{mapping.source_column}</small></div><ChevronRight size={15}/><select value={mapping.mapped_field || ""} onChange={(e) => setMappings((current) => current.map((m, i) => i === index ? { ...m, mapped_field: e.target.value, approved: Boolean(e.target.value) } : m))}><option value="">Do not map</option>{[...new Set([mapping.mapped_field, "name", "skills", "experience", "education", "certifications", "role", "company", "department", "status", "amount", "date", "customer", "product", "region", "project", "budget"])].filter(Boolean).map((field) => <option key={field} value={field}>{field.replace(/_/g, " ")}</option>)}</select><span className="rs-confidence">{mapping.confidence ? `${mapping.confidence}%` : "—"}</span></div>)}</div></div>}

          {step === 3 && <div className="rs-panel"><div className="rs-panel-head"><div><span>RECORD SELECTION</span><h2>{selected.length} of {rows.length} records selected</h2><p>Filter the imported records before generating individual reports.</p></div><button className="secondary-button" onClick={() => setStep(4)}>Build Report <ChevronRight size={15}/></button></div><div className="rs-record-toolbar"><input placeholder="Search records…" value={search} onChange={(e) => setSearch(e.target.value)}/><button onClick={toggleAllVisible}>Select / Clear visible</button></div><div className="rs-record-list">{filteredRows.slice(0, 250).map(({ row, index }) => <label key={index} className={selected.includes(index) ? "selected" : ""}><input type="checkbox" checked={selected.includes(index)} onChange={() => toggleSelected(index)}/><span><b>{String(row[identity?.identity_column] || row.name || row[Object.keys(row)[0]] || `Record ${index + 1}`)}</b><small>{Object.values(row).slice(0, 3).filter(Boolean).join(" · ")}</small></span></label>)}</div></div>}

          {step === 4 && (
            <div className="rs-panel">
              <div className="rs-panel-head">
                <div>
                  <span>REPORT STRUCTURE</span>
                  <h2>{plan?.recommended_template || "Generic Professional Report"}</h2>
                  <p>Sections adapt to the detected dataset type. You can disable or rename any section.</p>
                </div>
                <button className="primary-button" onClick={generate} disabled={busy || selected.length === 0}>
                  {busy ? "Generating…" : "Generate Reports"}
                </button>
              </div>

              <div className="rs-output-grid">
                {outputOptions.map(([id, label, detail]) => (
                  <button key={id} className={output === id ? "selected" : ""} onClick={() => setOutput(id)}>
                    <b>{label}</b><small>{detail}</small>
                  </button>
                ))}
              </div>

              <div className="rs-builder-grid">
                <div className="rs-section-list">
                  {(plan?.sections || []).map((section) => (
                    <button key={section.id} className={selectedSectionId === section.id ? "selected" : ""} onClick={() => setSelectedSectionId(section.id)}>
                      <input type="checkbox" checked={section.visibility !== false} onChange={(e) => updateSection(section.id, { visibility: e.target.checked })} onClick={(e) => e.stopPropagation()} />
                      <span>{section.title}</span><small>{section.type}</small>
                    </button>
                  ))}
                </div>

                <div className="rs-report-preview">
                  <div className="rs-page">
                    <span className="rs-kicker">{branding.company_name || "OPEN LEDGER DOCS AI"}</span>
                    <h1>{String(selectedRow.name || selectedRow.candidate_name || selectedRow.employee_name || selectedRow[Object.keys(selectedRow)[0]] || "Professional Report")}</h1>
                    {activeSection && (
                      <>
                        <h3>{activeSection.title}</h3>
                        <p>{activeSection.type === "generated" ? `Grounded summary will be generated from ${(activeSection.source_fields || []).join(", ") || "mapped fields"}.` : ((activeSection.source_fields || []).map((field) => selectedRow[field]).filter(Boolean).join(" · ") || "No source values available.")}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="rs-section-settings">
                  {activeSection ? (
                    <>
                      <label>Heading<input value={activeSection.title} onChange={(e) => updateSection(activeSection.id, { title: e.target.value })} /></label>
                      <label>Type<select value={activeSection.type} onChange={(e) => updateSection(activeSection.id, { type: e.target.value })}>
                        <option value="generated">generated</option><option value="list">list</option><option value="timeline">timeline</option><option value="facts">facts</option><option value="metrics">metrics</option><option value="table">table</option><option value="exceptions">exceptions</option>
                      </select></label>
                      <label>Source fields<textarea value={(activeSection.source_fields || []).join(", ")} onChange={(e) => updateSection(activeSection.id, { source_fields: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })} /></label>
                    </>
                  ) : <p>Select a section to edit it.</p>}
                  <button className="secondary-button" onClick={saveTemplate} disabled={busy}>Save Template</button>
                </div>
              </div>

              <div className="rs-branding">
                <label>Company<input value={branding.company_name} onChange={(e) => setBranding((b) => ({ ...b, company_name: e.target.value }))} /></label>
                <label>Brand color<input type="color" value={branding.accent} onChange={(e) => setBranding((b) => ({ ...b, accent: e.target.value }))} /></label>
                <label>Font<select value={branding.font} onChange={(e) => setBranding((b) => ({ ...b, font: e.target.value }))}><option>Aptos</option><option>Arial</option><option>Calibri</option><option>Times New Roman</option></select></label>
              </div>
            </div>
          )}

          {step === 5 && <div className="rs-panel"><div className="rs-panel-head"><div><span>OUTPUT COMPLETE</span><h2>Report Studio results</h2><p>Generated outputs are based on the selected records and the approved report structure.</p></div><button className="primary-button" onClick={() => setStep(4)}>Generate Again</button></div>{dashboard ? <div className="rs-dashboard"><div className="rs-kpi-row"><div><b>{dashboard.profile?.rows ?? 0}</b><span>Records</span></div><div><b>{dashboard.profile?.columns ?? 0}</b><span>Fields</span></div><div><b>{dashboard.profile?.quality?.quality_score ?? "—"}</b><span>Data quality</span></div><div><b>{dashboard.detected?.label || detected?.label || "Business"}</b><span>Dataset type</span></div></div><div className="rs-insights">{(dashboard.insights || []).map((item, index) => <div key={index}><Sparkles size={14}/><span>{item.message}</span></div>)}</div></div> : <div className="rs-success"><CheckCircle2 size={42}/><h3>Output generated</h3><p>Your selected report package has been downloaded.</p><button className="secondary-button" onClick={() => setStep(4)}>Back to Report Builder</button></div>}</div>}
        </main>
      </div>
    </>}
    {busy && <div className="report-studio-busy"><div><Sparkles size={24}/><b>Processing real dataset…</b><span>Profiling, mapping, validating or generating output.</span></div></div>}
  </section>;
}


const styles = `
:root {
  --bg: #F5F3FC;
  --surface: #FFFFFF;
  --surface-alt: #FAF9FF;
  --border: #E9E5F7;
  --text: #221D3D;
  --text-muted: #6E6B87;
  --accent: #7C3AED;
  --accent-dark: #5B21B6;
  --accent-soft: #EDE7FC;
  --accent-softer: #F3EFFD;
  --gradient: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%);
  --success: #16A34A;
  --success-soft: #E9F8EE;
  --warn: #D97706;
  --warn-soft: #FEF3E2;
  --danger: #DC2626;
  --danger-soft: #FDECEC;
  --radius-lg: 18px;
  --radius-md: 14px;
  --radius-sm: 10px;
  --shadow: 0 2px 4px rgba(76, 29, 149, 0.04), 0 10px 30px rgba(76, 29, 149, 0.06);
}

* { box-sizing: border-box; }

.app {
  position: relative;
  overflow-x: hidden;
  animation: appEnter .55s cubic-bezier(.22,1,.36,1);
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.app.dark {
  --bg: #16121F;
  --surface: #1D1830;
  --surface-alt: #221C38;
  --border: #322A4C;
  --text: #F3F1FA;
  --text-muted: #A79FC4;
  --accent-soft: #2C2249;
  --accent-softer: #251D3E;
  --shadow: 0 10px 30px rgba(0,0,0,0.35);
}

button, input, select { font-family: inherit; color: inherit; }

/* Motion system */

@keyframes appEnter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes floatSoft {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-7px) rotate(1deg); }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,.12); }
  50% { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
}

.page-content > * {
  animation: pageReveal .48s cubic-bezier(.22,1,.36,1) both;
}

@keyframes pageReveal {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.sidebar .logo-icon { animation: floatSoft 4s ease-in-out infinite; }
.primary-button, .reference-primary-cta, .plan-cta.primary { position: relative; overflow: hidden; }
.primary-button::after, .reference-primary-cta::after, .plan-cta.primary::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,.22) 48%, transparent 70%);
  background-size: 220% 100%;
  animation: shimmer 3.5s linear infinite;
  pointer-events: none;
}

.card, .pricing-card, .folder-card, .stat-card, .feature-card {
  transition: transform .24s cubic-bezier(.22,1,.36,1), box-shadow .24s ease, border-color .24s ease;
}
.card:hover, .pricing-card:hover, .folder-card:hover, .stat-card:hover, .feature-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 45px rgba(76,29,149,.10);
}
.pricing-card.featured { animation: pulseGlow 3s ease-in-out infinite; }

/* Sidebar */

.sidebar {
  width: 274px;
  flex: 0 0 274px;
  background: #0E1523;
  color: #F7F8FC;
  border-right: 1px solid rgba(255,255,255,.055);
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: visible;
  z-index: 40;
  box-shadow: 8px 0 28px rgba(15,23,42,.05);
  transition: width .3s cubic-bezier(.22,1,.36,1), flex-basis .3s cubic-bezier(.22,1,.36,1), padding .3s ease;
}

.sidebar-collapsed {
  width: 78px;
  flex-basis: 78px;
  padding: 14px 9px;
}

.sidebar-expanded {
  width: 274px;
  flex-basis: 274px;
}

.logo {
  height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 7px;
  position: relative;
}

.logo-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(145deg, #8B5CF6 0%, #6D28D9 100%);
  color: #fff;
  display: grid;
  place-items: center;
  flex: 0 0 34px;
  box-shadow: 0 8px 20px rgba(124,58,237,.26);
}

.logo-copy {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.logo-copy span {
  display: block;
  color: #F8FAFC;
  font-size: 14px;
  font-weight: 750;
  letter-spacing: -.02em;
}

.logo-copy small {
  display: block;
  margin-top: 2px;
  color: #79859B;
  font-size: 10px;
}

.sidebar-toggle {
  width: 28px;
  height: 28px;
  position: absolute;
  right: -14px;
  top: 18px;
  z-index: 70;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 999px;
  background: #182235;
  color: #A7B0C1;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(2,6,23,.22);
  transition: background .16s ease, color .16s ease, border-color .16s ease, transform .3s ease;
}

.sidebar-toggle:hover {
  background: #232F46;
  color: #fff;
  border-color: rgba(139,92,246,.5);
}

.sidebar-collapsed .sidebar-toggle svg { transform: rotate(180deg); }

.workspace-label {
  padding: 6px 10px 4px;
  color: #68748A;
  font-size: 9px;
  font-weight: 750;
  line-height: 1;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.workspace-chip {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 46px;
  margin: 0 2px 7px;
  padding: 7px 9px;
  background: rgba(255,255,255,.035);
  border: 1px solid rgba(255,255,255,.065);
  border-radius: 12px;
  color: #E8ECF3;
}

.workspace-avatar {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(135deg,#7C3AED,#4F46E5);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.workspace-chip-copy {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.workspace-chip-copy strong,
.workspace-chip-copy small {
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.workspace-chip-copy strong {
  color: #F5F7FA;
  font-size: 11.5px;
  font-weight: 650;
}

.workspace-chip-copy small {
  margin-top: 2px;
  color: #78849A;
  font-size: 9.5px;
}

.workspace-chip > svg { flex: 0 0 auto; color: #66738A; }

.navigation {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-item {
  width: 100%;
  min-height: 42px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: transparent;
  color: #8994A8;
  font-size: 12.5px;
  font-weight: 530;
  text-align: left;
  cursor: pointer;
  transition: background .16s ease, color .16s ease, border-color .16s ease, transform .16s ease;
}

.nav-item svg { flex: 0 0 auto; }
.nav-item span { flex: 1; white-space: nowrap; }

.nav-item:hover {
  background: rgba(255,255,255,.045);
  border-color: rgba(255,255,255,.035);
  color: #EEF2F7;
  transform: translateX(1px);
}

.nav-item.active {
  background: linear-gradient(100deg, rgba(124,58,237,.25), rgba(99,102,241,.13));
  border-color: rgba(139,92,246,.19);
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.025), 0 8px 18px rgba(2,6,23,.08);
}

.nav-item.active::before {
  content: "";
  position: absolute;
  left: -1px;
  top: 9px;
  bottom: 9px;
  width: 3px;
  border-radius: 999px;
  background: #A78BFA;
}

.nav-item em {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(255,255,255,.07);
  color: #9DA8BA;
  font-size: 9px;
  font-style: normal;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.nav-item.active em { background: rgba(255,255,255,.12); color: #fff; }

.sidebar-section {
  margin-top: 9px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,.055);
}

.sidebar-spacer { flex: 1; }

.sidebar-collapsed .logo { justify-content: center; padding-left: 1px; padding-right: 1px; }
.sidebar-collapsed .logo-copy,
.sidebar-collapsed .workspace-label,
.sidebar-collapsed .workspace-chip,
.sidebar-collapsed .nav-item span,
.sidebar-collapsed .nav-item em,
.sidebar-collapsed .usage-card,
.sidebar-collapsed .user-card { display: none; }

.sidebar-collapsed .nav-item {
  width: 52px;
  min-height: 44px;
  height: 44px;
  margin: 0 auto;
  padding: 0;
  justify-content: center;
  border-radius: 12px;
}

.sidebar-collapsed .nav-item.active::before {
  left: 0;
  top: 11px;
  bottom: 11px;
}

.sidebar-collapsed .nav-item:hover::after,
.sidebar-collapsed .nav-item:focus-visible::after {
  content: attr(aria-label);
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  z-index: 90;
  padding: 7px 10px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px;
  background: #171F2F;
  color: #F5F7FA;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 12px 26px rgba(2,6,23,.24);
}

.sidebar .usage-card {
  background: rgba(255,255,255,.035);
  border-color: rgba(255,255,255,.065);
}
.sidebar .usage-top,
.sidebar .usage-card > p { color: #78849A; }
.sidebar .usage-card > strong { color: #fff; }
.sidebar .progress { background: rgba(255,255,255,.08); }
.sidebar .progress > div { background: linear-gradient(90deg,#8B5CF6,#6D28D9); }
.sidebar .user-card { border-top-color: rgba(255,255,255,.065); }
.sidebar .user-info strong { color: #E6EAF1; }
.sidebar .user-info span { color: #78849A; }
.sidebar .avatar { background: linear-gradient(135deg,#7C3AED,#4F46E5); color: #fff; }

.usage-card {
  background: var(--accent-softer);
  border: 1px solid var(--accent-soft);
  border-radius: var(--radius-md);
  padding: 14px;
  margin-top: 10px;
}

.usage-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.usage-card > strong {
  font-size: 20px;
  display: block;
}

.progress {
  height: 6px;
  background: rgba(124, 58, 237, 0.15);
  border-radius: 999px;
  margin: 8px 0;
  overflow: hidden;
}

.progress > div {
  height: 100%;
  background: var(--gradient);
  border-radius: 999px;
}

.usage-card > p {
  font-size: 11.5px;
  color: var(--text-muted);
  margin: 0 0 10px;
}

.usage-card > button {
  width: 100%;
  border: none;
  background: var(--gradient);
  color: white;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  margin-top: 12px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.user-info { flex: 1; min-width: 0; }
.user-info strong { display: block; font-size: 13px; }
.user-info span { display: block; font-size: 11.5px; color: var(--text-muted); }
.user-card svg { color: var(--text-muted); cursor: pointer; }

/* -------------------------------------------------------------------------- */
/* Light sidebar visibility                                                    */
/* Keep every sidebar navigation element clearly visible in black.            */
/* -------------------------------------------------------------------------- */
.app:not(.dark) .sidebar {
  background: #ffffff;
  color: #111111;
  border-right-color: #e5e7eb;
  box-shadow: 8px 0 28px rgba(15,23,42,.07);
}

.app:not(.dark) .sidebar .logo-copy span,
.app:not(.dark) .sidebar .workspace-label,
.app:not(.dark) .sidebar .workspace-chip,
.app:not(.dark) .sidebar .workspace-chip-copy strong,
.app:not(.dark) .sidebar .workspace-chip-copy small,
.app:not(.dark) .sidebar .workspace-chip > svg,
.app:not(.dark) .sidebar .nav-item,
.app:not(.dark) .sidebar .nav-item svg,
.app:not(.dark) .sidebar .user-info strong,
.app:not(.dark) .sidebar .user-info span,
.app:not(.dark) .sidebar .user-card > svg {
  color: #111111;
}

.app:not(.dark) .sidebar .logo-copy small {
  color: #374151;
}

.app:not(.dark) .sidebar .sidebar-toggle {
  background: #111111;
  color: #ffffff;
  border-color: #111111;
}

.app:not(.dark) .sidebar .sidebar-toggle:hover {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.app:not(.dark) .sidebar .workspace-chip {
  background: #f8fafc;
  border-color: #e5e7eb;
}

.app:not(.dark) .sidebar .nav-item {
  background: transparent;
  border-color: transparent;
  color: #111111;
  font-weight: 600;
}

.app:not(.dark) .sidebar .nav-item:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
  color: #000000;
}

.app:not(.dark) .sidebar .nav-item.active {
  background: #f1f5f9;
  border-color: #d1d5db;
  color: #000000;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 6px 16px rgba(15,23,42,.06);
}

.app:not(.dark) .sidebar .nav-item.active svg {
  color: #000000;
}

.app:not(.dark) .sidebar .nav-item em {
  background: #e5e7eb;
  color: #111111;
}

.app:not(.dark) .sidebar .nav-item.active em {
  background: #111111;
  color: #ffffff;
}

.app:not(.dark) .sidebar .sidebar-section {
  border-top-color: #e5e7eb;
}

.app:not(.dark) .sidebar .usage-card {
  background: #f8fafc;
  border-color: #e5e7eb;
}

.app:not(.dark) .sidebar .usage-top,
.app:not(.dark) .sidebar .usage-card > p {
  color: #374151;
}

.app:not(.dark) .sidebar .usage-card > strong {
  color: #111111;
}

.app:not(.dark) .sidebar .progress {
  background: #e5e7eb;
}

.app:not(.dark) .sidebar .user-card {
  border-top-color: #e5e7eb;
}

.app:not(.dark) .sidebar .user-card > svg {
  color: #111111;
}

.app:not(.dark) .sidebar .nav-item:hover::after,
.app:not(.dark) .sidebar .nav-item:focus-visible::after {
  background: #111111;
  color: #ffffff;
  border-color: #111111;
}

/* Main / topbar */

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 28px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.mobile-menu {
  display: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.breadcrumb strong { color: var(--text); font-weight: 600; }

.top-actions {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.global-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  width: 280px;
  max-width: 40vw;
  color: var(--text-muted);
}

.global-search input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  font-size: 13px;
  color: var(--text);
}

.global-search kbd {
  font-size: 10.5px;
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 1px 5px;
  color: var(--text-muted);
}

.icon-button {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
  position: relative;
  flex-shrink: 0;
}

.icon-button:hover { background: var(--accent-softer); color: var(--accent); }

/* Video-inspired light/dark switch: soft pill, white floating thumb,
   warm orange center, and a clean snap between sun and moon. */
.theme-switch {
  width: 72px;
  height: 38px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}

.theme-switch-track {
  position: relative;
  display: block;
  width: 72px;
  height: 38px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(129, 130, 138, .18);
  background: linear-gradient(135deg, #e9e8e6 0%, #d8d9da 100%);
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,.82),
    inset 0 -1px 2px rgba(0,0,0,.08),
    0 3px 10px rgba(0,0,0,.08);
  transition: background .42s cubic-bezier(.22,.61,.36,1),
              border-color .42s ease,
              box-shadow .42s ease;
}

.theme-switch-icon {
  position: absolute;
  top: 0;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,.76);
  transition: opacity .32s ease, transform .48s cubic-bezier(.22,.61,.36,1), color .32s ease;
}

.theme-switch-moon { left: 0; opacity: .36; transform: scale(.88); }
.theme-switch-sun { right: 0; opacity: .8; transform: scale(1); }

.theme-switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffffff 0%, #f1f1f0 100%);
  box-shadow:
    0 3px 8px rgba(0,0,0,.19),
    inset 0 1px 0 rgba(255,255,255,.95),
    inset 0 -2px 3px rgba(0,0,0,.06);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: left .52s cubic-bezier(.22,.61,.36,1), box-shadow .35s ease;
  z-index: 3;
}

.theme-switch-thumb::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: radial-gradient(circle at 46% 42%, #ff8c55 0 22%, #ff5b1f 38%, #ff7a31 68%, rgba(255,122,49,0) 72%);
  filter: blur(.1px);
}

.theme-switch-thumb span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff5b1f;
  position: relative;
  z-index: 2;
  box-shadow: 0 0 8px rgba(255,91,31,.3);
}

.theme-switch:hover .theme-switch-thumb {
  box-shadow:
    0 5px 12px rgba(0,0,0,.22),
    0 0 0 3px rgba(255,255,255,.22),
    inset 0 1px 0 rgba(255,255,255,.98),
    inset 0 -2px 3px rgba(0,0,0,.05);
}

.theme-switch:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 999px; }

.theme-switch.is-dark .theme-switch-track {
  background: linear-gradient(135deg, #3a3a3a 0%, #242424 100%);
  border-color: rgba(255,255,255,.06);
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,.08),
    inset 0 -2px 3px rgba(0,0,0,.25),
    0 4px 12px rgba(0,0,0,.22);
}

.theme-switch.is-dark .theme-switch-thumb { left: 37px; }
.theme-switch.is-dark .theme-switch-moon { opacity: .8; transform: scale(1); color: #bcbcbc; }
.theme-switch.is-dark .theme-switch-sun { opacity: .2; transform: scale(.86); }

.theme-switch.is-dark .theme-switch-thumb::before {
  background: radial-gradient(circle at 46% 42%, #fff3e7 0 22%, #ffb07b 38%, #ff7040 68%, rgba(255,112,64,0) 72%);
}

.notification-button span {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent);
}

.page-content {
  padding: 26px 28px 60px;
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
}

/* Page heading */

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}

.page-heading-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 8px;
}

.page-heading h1 {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 6px;
  letter-spacing: -0.3px;
}

.page-heading p {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
  max-width: 480px;
}

.primary-button {
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: var(--gradient);
  color: white;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(124, 58, 237, 0.28);
  flex-shrink: 0;
}

.secondary-button {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  padding: 9px 15px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.secondary-button:hover { background: var(--accent-softer); color: var(--accent); }

.danger-button {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--danger-soft);
  background: var(--danger-soft);
  color: var(--danger);
  padding: 9px 15px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.text-button {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* Stats */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--accent-softer);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-content { display: flex; flex-direction: column; }
.stat-content span { font-size: 12px; color: var(--text-muted); }
.stat-content strong { font-size: 21px; font-weight: 700; margin: 2px 0; }
.stat-content small { font-size: 11.5px; color: var(--text-muted); }
.stat-content small.positive { color: var(--success); }
.stat-content small.warning { color: var(--warn); }

/* Cards, generic */

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow);
}

.card-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.02em;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.card-title-row h2 { font-size: 16px; margin: 4px 0 0; }
.card-title-row svg { color: var(--text-muted); }

.card-title-row select {
  border: 1px solid var(--border);
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font-size: 12.5px;
}

/* Analytics-style dashboard */
.analytics-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dash-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 2px;
}

.dash-heading h1 {
  font-size: 30px;
  line-height: 1.1;
  margin: 6px 0 5px;
  letter-spacing: -0.03em;
}

.dash-heading p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  max-width: 620px;
}

.dash-heading-actions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.dash-period-button,
.dash-mini-select {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 11px;
  padding: 9px 11px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(76, 29, 149, 0.03);
}

.dash-period-button:hover,
.dash-mini-select:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.dash-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.dash-stat-card {
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 15px;
  padding: 14px;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  box-shadow: 0 8px 24px rgba(76, 29, 149, 0.045);
}

.dash-stat-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.dash-stat-icon.purple { background: var(--accent-softer); color: var(--accent); }
.dash-stat-icon.gold { background: #FFF7DE; color: #D99A00; }
.dash-stat-icon.red { background: var(--danger-soft); color: var(--danger); }
.dash-stat-icon.blue { background: #EAF2FF; color: #3974D8; }

.dash-stat-copy { min-width: 0; display: flex; flex-direction: column; }
.dash-stat-copy > span { color: var(--text-muted); font-size: 11.5px; }
.dash-stat-copy > strong { font-size: 25px; line-height: 1; margin: 5px 0 5px; letter-spacing: -0.02em; }
.dash-stat-copy > small { color: var(--text-muted); font-size: 10.5px; display: inline-flex; align-items: center; gap: 3px; }
.dash-positive { color: var(--success) !important; }
.dash-warning { color: var(--warn) !important; }

.dash-main-grid {
  display: grid;
  grid-template-columns: 1.62fr 0.92fr;
  gap: 14px;
}

.dash-bottom-grid {
  display: grid;
  grid-template-columns: 1.62fr 0.92fr;
  gap: 14px;
}


/* Open Ledger Docs — Analysis Activity */
.open-led-activity-card {
  position: relative;
  overflow: hidden;
  min-height: 430px;
  background:
    radial-gradient(circle at 92% 4%, rgba(124,58,237,.10), transparent 30%),
    linear-gradient(180deg, #ffffff 0%, #fcfbff 100%);
}

.open-led-chart-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.open-led-chart-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.open-led-chart-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #7C3AED;
  background: #F0EAFE;
  border: 1px solid #E4D8FF;
  box-shadow: 0 8px 22px rgba(124,58,237,.10);
}

.open-led-chart-title .card-label {
  color: #7C3AED;
  letter-spacing: .12em;
}

.open-led-chart-title h2 {
  margin: 4px 0 3px;
  font-size: 20px;
  letter-spacing: -.025em;
}

.open-led-chart-title p {
  margin: 0;
  color: #77738F;
  font-size: 12px;
}

.open-led-chart-period {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 11px;
  border: 1px solid #E7E1F4;
  border-radius: 10px;
  background: rgba(255,255,255,.9);
  color: #514C68;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: .18s ease;
}

.open-led-chart-period:hover {
  border-color: #CDBAF8;
  color: #6D28D9;
  transform: translateY(-1px);
}

.open-led-chart-metrics {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) repeat(2, minmax(120px, .65fr));
  gap: 10px;
  margin: 24px 0 20px;
}

.open-led-primary-metric,
.open-led-mini-metric {
  border: 1px solid #ECE7F6;
  border-radius: 14px;
  background: rgba(255,255,255,.78);
}

.open-led-primary-metric {
  padding: 14px 16px;
  background: linear-gradient(135deg, #F7F3FF 0%, #FFFFFF 100%);
}

.open-led-primary-metric > span,
.open-led-mini-metric > span {
  display: block;
  color: #77738F;
  font-size: 11px;
  font-weight: 700;
}

.open-led-primary-metric strong {
  display: block;
  margin: 2px 0 4px;
  color: #241D3D;
  font-size: 29px;
  line-height: 1;
  letter-spacing: -.04em;
}

.open-led-primary-metric small {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #7C3AED;
  font-size: 10px;
  font-weight: 700;
}

.open-led-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7C3AED;
  box-shadow: 0 0 0 4px #EDE7FC;
}

.open-led-mini-metric {
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.open-led-mini-metric strong {
  margin-top: 5px;
  color: #2B2544;
  font-size: 20px;
}

.open-led-chart-shell {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  min-height: 220px;
}

.open-led-chart-axis {
  height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0 0 20px;
  color: #A29DB5;
  font-size: 9px;
  text-align: right;
}

.open-led-chart-body {
  min-width: 0;
  position: relative;
}

.open-led-line-chart {
  width: 100%;
  height: 190px;
  overflow: visible;
}

.open-led-grid-line {
  stroke: #ECE8F4;
  stroke-width: 1;
  stroke-dasharray: 3 5;
}

.open-led-chart-area {
  fill: url(#openLedChartFill);
  stroke: none;
}

.open-led-chart-line {
  fill: none;
  stroke: #7C3AED;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: url(#openLedChartGlow);
}

.open-led-chart-point-halo {
  fill: rgba(124,58,237,.13);
  stroke: none;
}

.open-led-chart-point {
  fill: #7C3AED;
  stroke: #FFFFFF;
  stroke-width: 3;
}

.open-led-chart-point-group {
  cursor: pointer;
  transition: transform .18s ease;
  transform-box: fill-box;
  transform-origin: center;
}

.open-led-chart-point-group:hover {
  transform: scale(1.35);
}

.open-led-chart-labels {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-top: 2px;
  color: #9691A9;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
}

.open-led-chart-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 15px;
  padding-top: 13px;
  border-top: 1px solid #EEEAF5;
  color: #8A849F;
  font-size: 10px;
}

.open-led-chart-footer span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.open-led-footer-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7C3AED;
  box-shadow: 0 0 0 4px #F0EAFE;
}

@media (max-width: 760px) {
  .open-led-chart-top {
    flex-direction: column;
  }

  .open-led-chart-period {
    align-self: flex-start;
  }

  .open-led-chart-metrics {
    grid-template-columns: 1fr 1fr;
  }

  .open-led-primary-metric {
    grid-column: 1 / -1;
  }
}

.dash-chart-card,
.dash-risk-card,
.dash-recent-card,
.dash-category-card {
  min-width: 0;
}

.dash-card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 13px;
}

.dash-card-heading h2 {
  font-size: 16px;
  margin: 4px 0 0;
  letter-spacing: -0.01em;
}

.dash-card-heading > svg { color: var(--text-muted); }

.dash-mini-select {
  padding: 7px 9px;
  font-size: 11px;
}

.dash-chart-summary {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 7px;
}

.dash-chart-summary strong { font-size: 28px; letter-spacing: -0.03em; }
.dash-chart-summary span { color: var(--text-muted); font-size: 11.5px; }
.dash-chart-summary em { margin-left: auto; display: inline-flex; align-items: center; gap: 3px; color: var(--success); font-size: 10.5px; font-style: normal; }

.dash-line-chart {
  position: relative;
  height: 205px;
  padding: 2px 0 0 25px;
}

.dash-y-labels {
  position: absolute;
  left: 0;
  top: 7px;
  bottom: 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 9px;
}

.dash-line-chart svg {
  width: 100%;
  height: 170px;
  overflow: visible;
}

.dash-line-chart svg line {
  stroke: var(--border);
  stroke-width: 1;
}

.dash-line-chart .dash-area {
  fill: rgba(124, 58, 237, 0.09);
  stroke: none;
}

.dash-line-chart .dash-line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dash-point {
  fill: var(--surface);
  stroke: var(--accent);
  stroke-width: 3;
}

.dash-x-labels {
  display: flex;
  justify-content: space-between;
  padding: 2px 1% 0 1%;
  color: var(--text-muted);
  font-size: 9.5px;
}

.risk-donut-wrap {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 6px 0 15px;
}

.risk-donut {
  width: 132px;
  height: 132px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.risk-donut-center {
  width: 82px;
  height: 82px;
  border-radius: 50%;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px var(--border);
}

.risk-donut-center strong { font-size: 22px; line-height: 1; }
.risk-donut-center span { color: var(--text-muted); font-size: 9.5px; margin-top: 3px; }

.risk-legend { flex: 1; display: flex; flex-direction: column; gap: 11px; }
.risk-legend > div { display: grid; grid-template-columns: 10px 1fr auto; align-items: center; gap: 7px; font-size: 11.5px; }
.risk-dot { width: 8px; height: 8px; border-radius: 999px; }
.risk-dot.low { background: var(--success); }
.risk-dot.medium { background: var(--warn); }
.risk-dot.high { background: var(--danger); }
.risk-legend span { color: var(--text-muted); }
.risk-legend strong { font-size: 12px; }

.risk-callout {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 11px;
  border-radius: 11px;
  background: var(--accent-softer);
  color: var(--accent);
}

.risk-callout svg { margin-top: 1px; flex: 0 0 auto; }
.risk-callout strong { display: block; font-size: 11.5px; color: var(--text); }
.risk-callout span { display: block; margin-top: 2px; font-size: 10px; color: var(--text-muted); }

.dash-recent-card .table-wrapper { max-height: 265px; overflow: auto; }
.dash-recent-card tbody td { padding-top: 9px; padding-bottom: 9px; }
.dash-recent-card thead th { padding-top: 5px; }

.category-bars { display: flex; flex-direction: column; gap: 13px; margin-top: 5px; }
.category-row-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 11.5px; margin-bottom: 5px; }
.category-row-top span { color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.category-row-top strong { font-size: 11.5px; }
.category-progress { height: 7px; background: var(--accent-softer); border-radius: 999px; overflow: hidden; }
.category-progress > div { height: 100%; border-radius: inherit; background: var(--gradient); }

.dash-category-link {
  margin-top: 16px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--accent);
  padding: 9px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.dash-category-link:hover { background: var(--accent-softer); }

.dash-empty-note {
  min-height: 145px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--text-muted);
  font-size: 11px;
  text-align: center;
}

.dash-insight-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 13px;
  border-radius: 13px;
  border: 1px solid var(--border);
  background: linear-gradient(90deg, var(--surface) 0%, var(--accent-softer) 100%);
}

.dash-insight-strip > div { display: flex; align-items: center; gap: 8px; color: var(--accent); }
.dash-insight-strip > div > span { color: var(--text-muted); font-size: 11.5px; }
.dash-insight-strip strong { color: var(--text); margin-right: 3px; }
.dash-insight-strip > button { border: none; background: transparent; color: var(--accent); font-size: 11.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }

/* Dashboard grid */

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.analyzer-card {
  background: var(--gradient);
  color: white;
  border: none;
}

.card-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.analyzer-card .card-label { color: rgba(255,255,255,0.75); }
.analyzer-card h2 { font-size: 19px; margin: 6px 0 8px; }
.analyzer-card p { font-size: 13px; color: rgba(255,255,255,0.85); margin: 0; max-width: 320px; }

.ai-symbol {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  background: rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}

.quick-actions button {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: rgba(255,255,255,0.12);
  color: white;
  padding: 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
}

.quick-actions button:hover { background: rgba(255,255,255,0.2); }
.quick-actions button span { flex: 1; display: flex; flex-direction: column; }
.quick-actions button strong { font-size: 13px; }
.quick-actions button small { font-size: 11.5px; color: rgba(255,255,255,0.75); }

.risk-score {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.score-circle {
  width: 62px;
  height: 62px;
  border-radius: 999px;
  border: 4px solid var(--accent);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.score-circle strong { font-size: 17px; line-height: 1; }
.score-circle span { font-size: 10px; color: var(--text-muted); }

.risk-score > div:last-child strong { font-size: 14px; display: block; }
.risk-score > div:last-child p { font-size: 12.5px; color: var(--text-muted); margin: 2px 0 0; }

.risk-bars { display: flex; flex-direction: column; gap: 12px; }

.risk-row-top {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  margin-bottom: 5px;
  color: var(--text-muted);
}

.risk-row-top strong { color: var(--text); }

.risk-progress {
  height: 6px;
  background: var(--accent-softer);
  border-radius: 999px;
  overflow: hidden;
}

.risk-progress > div {
  height: 100%;
  background: var(--gradient);
  border-radius: 999px;
}

/* Table */

.table-wrapper { overflow-x: auto; }

table { width: 100%; border-collapse: collapse; }

thead th {
  text-align: left;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
}

tbody td {
  padding: 10px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  vertical-align: middle;
}

tbody tr:last-child td { border-bottom: none; }

.document-name {
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 0;
}

.file-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: var(--accent-softer);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.document-name strong { display: block; font-size: 13px; }
.document-name span { display: block; font-size: 11.5px; color: var(--text-muted); }

.date { color: var(--text-muted); font-size: 12.5px; }

.status-badge, .risk-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 4px 9px;
  border-radius: 999px;
}

.status-badge.analyzed { background: var(--success-soft); color: var(--success); }
.status-badge.processing { background: var(--warn-soft); color: var(--warn); }
.status-badge.failed { background: var(--danger-soft); color: var(--danger); }

.risk-badge.low { background: var(--success-soft); color: var(--success); }
.risk-badge.medium { background: var(--warn-soft); color: var(--warn); }
.risk-badge.high { background: var(--danger-soft); color: var(--danger); }
.risk-badge.pending { background: var(--accent-softer); color: var(--text-muted); }

.table-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
}

.move-document-control {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 32px;
  padding: 0 7px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-alt);
  color: var(--text-muted);
  transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease;
}

.move-document-control:hover {
  border-color: rgba(124,58,237,.35);
  transform: translateY(-1px);
  box-shadow: 0 7px 16px rgba(76,29,149,.08);
}

.move-document-control select {
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 10.5px;
  font-weight: 650;
  max-width: 125px;
  cursor: pointer;
}

@media (max-width: 900px) {
  .move-document-control select { max-width: 90px; }
}

.table-action {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-action.danger:hover { background: var(--danger-soft); color: var(--danger); }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 50px 20px;
  color: var(--text-muted);
  text-align: center;
}

.empty-state svg { color: var(--border); margin-bottom: 6px; }
.empty-state h3 { margin: 0; font-size: 15px; color: var(--text); }
.empty-state p { margin: 0; font-size: 13px; }

/* Analyzer page */

.large-upload {
  border: 2px dashed var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  padding: 50px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 16px;
}

.large-upload.dragging { border-color: var(--accent); background: var(--accent-softer); }

.large-upload-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--accent-softer);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.large-upload h2 { font-size: 17px; margin: 0 0 4px; }
.large-upload p { font-size: 13px; color: var(--text-muted); margin: 0 0 16px; }

.upload-info {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.upload-info span {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 999px;
}

.selected-files { margin-bottom: 16px; }

.selected-file {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  font-size: 13px;
}

.selected-file span { flex: 1; }
.selected-file small { color: var(--text-muted); font-size: 11.5px; }

.feature-grid, .insight-grid, .faq-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.feature-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex;
  gap: 12px;
}

.feature-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: var(--accent-softer);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-card h3 { font-size: 13.5px; margin: 0 0 4px; }
.feature-card p { font-size: 12.5px; color: var(--text-muted); margin: 0; }

/* Analysis result page */

.analysis-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.analysis-file {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}

.analysis-file h2 {
  font-size: 18px;
  margin: 5px 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-file p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12.5px;
}

.analysis-status {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.analysis-overview-grid {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.analysis-review-card {
  min-height: 250px;
}

.review-copy {
  color: var(--text-muted);
  font-size: 13.5px;
  line-height: 1.65;
  margin: 0 0 18px;
  max-width: 720px;
}

.review-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.review-meta > div {
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 11px 12px;
}

.review-meta span,
.snapshot-row span {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
  margin-bottom: 3px;
}

.review-meta strong,
.snapshot-row strong {
  font-size: 13px;
}

.analysis-stats-card {
  min-height: 250px;
}

.analysis-big-number {
  font-size: 34px;
  font-weight: 700;
  margin: 8px 0 0;
}

.analysis-stats-card > p {
  margin: 0 0 15px;
  color: var(--text-muted);
  font-size: 12.5px;
}

.snapshot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding: 9px 0;
}

.snapshot-row span {
  margin: 0;
}

.snapshot-row strong {
  text-align: right;
}

.analysis-content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.analysis-bottom-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.analysis-bottom-card h2 {
  font-size: 15px;
  margin: 5px 0 5px;
  max-width: 680px;
}

.analysis-bottom-card p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12.5px;
}

.analysis-empty {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.analysis-empty-icon {
  width: 62px;
  height: 62px;
  border-radius: var(--radius-md);
  background: var(--accent-softer);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.analysis-empty h2 {
  font-size: 19px;
  margin: 0 0 6px;
}

.analysis-empty p {
  color: var(--text-muted);
  font-size: 13px;
  max-width: 430px;
  margin: 0 0 18px;
}

/* Documents toolbar */

.document-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.library-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  color: var(--text-muted);
}

.library-search input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  font-size: 13px;
  color: var(--text);
}

.document-toolbar select {
  border: 1px solid var(--border);
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 12.5px;
}

/* Analytics */

.analytics-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}

.chart {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  height: 180px;
  padding-top: 10px;
}

.chart-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  gap: 8px;
}

.chart-bar {
  width: 100%;
  border-radius: 8px 8px 3px 3px;
  background: var(--gradient);
  min-height: 6px;
}

.chart-column span { font-size: 11px; color: var(--text-muted); }

.analytics-number { font-size: 34px; font-weight: 700; margin: 6px 0 2px; }
.analytics-summary > p { font-size: 12.5px; color: var(--text-muted); margin: 0 0 16px; }

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  font-size: 13px;
}

.summary-row:first-of-type { border-top: none; }

/* Pricing page */

.pricing-heading { justify-content: center; text-align: center; }
.pricing-heading > div { max-width: 520px; }
.pricing-heading .eyebrow { justify-content: center; }
.pricing-heading h1 { font-size: 30px; }
.pricing-heading p { margin: 0 auto; }

.billing-toggle {
  display: flex;
  justify-content: center;
  margin: 4px auto 28px;
}

.billing-toggle > div,
.billing-toggle {
  gap: 4px;
}

.billing-toggle {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px;
  width: fit-content;
  box-shadow: var(--shadow);
}

.billing-toggle button {
  border: none;
  background: transparent;
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.billing-toggle button.active {
  background: var(--gradient);
  color: white;
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.3);
}

.billing-toggle button em {
  font-style: normal;
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(255,255,255,0.25);
  padding: 2px 6px;
  border-radius: 999px;
}

.billing-toggle button:not(.active) em {
  background: var(--success-soft);
  color: var(--success);
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
  align-items: stretch;
}

.pricing-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px 22px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow);
}

.pricing-card.featured {
  background: var(--gradient);
  border: none;
  color: white;
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(124, 58, 237, 0.35);
}

.pricing-badge {
  position: absolute;
  top: -12px;
  left: 22px;
  background: white;
  color: var(--accent-dark);
  font-size: 11px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}

.pricing-card-top { margin-bottom: 14px; }

.plan-name { font-size: 15px; font-weight: 700; }

.plan-tagline {
  font-size: 12.5px;
  color: var(--text-muted);
  margin: 6px 0 0;
  min-height: 32px;
}

.pricing-card.featured .plan-tagline { color: rgba(255,255,255,0.85); }

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}

.pricing-card.featured .plan-price { border-bottom-color: rgba(255,255,255,0.25); }

.plan-price strong { font-size: 30px; font-weight: 700; }
.plan-price span { font-size: 13px; color: var(--text-muted); }
.pricing-card.featured .plan-price span { color: rgba(255,255,255,0.75); }

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

.plan-features li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.plan-features li svg {
  flex-shrink: 0;
  color: var(--accent);
  background: var(--accent-softer);
  border-radius: 999px;
  padding: 2px;
  width: 15px;
  height: 15px;
}

.pricing-card.featured .plan-features li svg {
  color: white;
  background: rgba(255,255,255,0.2);
}

.plan-cta {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  padding: 11px;
  border-radius: var(--radius-sm);
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.plan-cta.primary {
  background: white;
  color: var(--accent-dark);
  border: none;
}

.pricing-card:not(.featured) .plan-cta:hover { background: var(--accent-softer); }

.pricing-faq { margin-top: 4px; }

/* Settings */

.settings-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.settings-card h2 { font-size: 15px; margin: 0 0 16px; }

.settings-card label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.settings-card input, .settings-card select {
  border: 1px solid var(--border);
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 9px 11px;
  font-size: 13px;
  color: var(--text);
}

.setting-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.setting-toggle:first-of-type { border-top: none; padding-top: 0; }
.setting-toggle strong { font-size: 13px; display: block; }
.setting-toggle p { font-size: 12px; color: var(--text-muted); margin: 3px 0 0; }

.toggle {
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background: var(--border);
  flex-shrink: 0;
  padding: 3px;
  cursor: pointer;
}

.toggle span {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: white;
  transition: transform 0.15s ease;
}

.toggle.on { background: var(--gradient); }
.toggle.on span { transform: translateX(16px); }

/* Modals */

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(34, 29, 61, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 50;
}

.modal {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 22px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.25);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.modal-header h2 { font-size: 16px; margin: 4px 0 0; }

.close-button {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--bg);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius-md);
  padding: 30px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.modal-dropzone.dragging { border-color: var(--accent); background: var(--accent-softer); }

.modal-upload-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  background: var(--accent-softer);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.modal-dropzone h3 { font-size: 14.5px; margin: 0 0 4px; }
.modal-dropzone p { font-size: 12.5px; color: var(--text-muted); margin: 0 0 14px; }

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.modal-footer span { font-size: 11.5px; color: var(--text-muted); }

.modal-footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.document-modal { max-width: 560px; max-height: 86vh; overflow-y: auto; }

.document-modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.large-file-icon {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-sm);
  background: var(--accent-softer);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.detail-grid.detail-grid-wide {
  grid-template-columns: repeat(3, 1fr);
}

.detail-item {
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}

.detail-item span { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px; }
.detail-item strong { font-size: 13px; }

.detail-item-icon {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 3px;
}

.analysis-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-radius: var(--radius-md);
  padding: 12px 14px;
  margin-bottom: 14px;
}

.analysis-banner > div { flex: 1; }
.analysis-banner strong { font-size: 13px; display: block; margin-bottom: 2px; }
.analysis-banner p { font-size: 12px; margin: 0; }
.analysis-banner .secondary-button { flex-shrink: 0; }

.analysis-banner.failed {
  background: var(--danger-soft);
  color: var(--danger);
}
.analysis-banner.failed p { color: var(--danger); opacity: 0.85; }

.analysis-banner.processing {
  background: var(--warn-soft);
  color: var(--warn);
}
.analysis-banner.processing p { color: var(--warn); opacity: 0.85; }

.ai-preview {
  display: flex;
  gap: 10px;
  background: var(--accent-softer);
  border-radius: var(--radius-md);
  padding: 14px;
  margin-bottom: 14px;
}

.ai-preview-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: var(--gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-preview strong { font-size: 13px; display: block; margin-bottom: 3px; }
.ai-preview p { font-size: 12px; color: var(--text-muted); margin: 0; }

.modal-section { margin-bottom: 16px; }

.modal-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 10px;
}

.modal-section-title svg { color: var(--accent); }

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--accent-dark);
  background: var(--accent-softer);
  border: 1px solid var(--accent-soft);
  padding: 4px 10px;
  border-radius: 999px;
}

.doc-type-card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
}

.doc-type-name {
  display: inline-block;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--accent-dark);
  background: var(--accent-softer);
  border: 1px solid var(--accent-soft);
  padding: 3px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.doc-type-card p {
  font-size: 12.5px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

.entity-list {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.entity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  font-size: 12.5px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.entity-row:first-child { border-top: none; }
.entity-row span { color: var(--text-muted); }
.entity-row strong { text-align: right; }

.finding-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.finding-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  background: var(--bg);
  border: 1px solid var(--border);
}

.finding-row svg { flex-shrink: 0; margin-top: 1px; }
.finding-row.low svg { color: var(--success); }
.finding-row.medium svg { color: var(--warn); }
.finding-row.high svg { color: var(--danger); }

.empty-note {
  font-size: 12.5px;
  color: var(--text-muted);
  padding: 10px 12px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--border);
}

/* Folders */
.folder-workspace { margin-bottom: 16px; }

.folder-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.folder-section-heading h2 { font-size: 16px; margin: 4px 0 0; }

.folder-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.folder-card {
  min-width: 0;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: var(--radius-md);
  padding: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.folder-card:hover {
  border-color: var(--accent);
  background: var(--accent-softer);
  transform: translateY(-1px);
}

.folder-card.active {
  border-color: var(--accent);
  background: var(--accent-softer);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.12);
}

.folder-card > div:nth-child(2) { flex: 1; min-width: 0; }

.folder-card strong {
  display: block;
  font-size: 12.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-card span {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
  margin-top: 2px;
}

.folder-card > svg { color: var(--text-muted); flex-shrink: 0; }

.folder-card-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--accent-softer);
  color: var(--accent);
}

.folder-card-icon.green { background: var(--success-soft); color: var(--success); }
.folder-card-icon.blue { background: #E8F1FF; color: #2563EB; }
.folder-card-icon.orange { background: var(--warn-soft); color: var(--warn); }
.folder-card-icon.gray { background: var(--bg); color: var(--text-muted); }
.folder-card-icon.all { background: var(--accent-softer); color: var(--accent); }

.new-folder-form {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  margin-bottom: 12px;
  background: var(--surface);
  border: 1px solid var(--accent-soft);
  border-radius: var(--radius-md);
}

.new-folder-form > svg { color: var(--accent); flex-shrink: 0; }

.new-folder-form input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text);
}

.folder-back-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.folder-back-button:hover { color: var(--accent); background: var(--accent-softer); }


/* Responsive */


/* -------------------------------- */
/* Landing dashboard / hero */
/* -------------------------------- */

.landing-dashboard {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.landing-hero {
  position: relative;
  min-height: 575px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 0.94fr 1.06fr;
  align-items: center;
  gap: 18px;
  padding: 62px 58px 54px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background:
    radial-gradient(circle at 76% 40%, rgba(124,58,237,.13), transparent 29%),
    radial-gradient(circle at 48% 100%, rgba(14,165,233,.08), transparent 32%),
    var(--surface);
  box-shadow: 0 28px 70px rgba(15,23,42,.08);
}

.landing-hero::before,
.landing-hero::after {
  content: "";
  position: absolute;
  pointer-events: none;
  border-radius: 999px;
  border: 1px solid var(--border);
}

.landing-hero::before { width: 470px; height: 470px; right: -190px; top: -210px; opacity: .45; }
.landing-hero::after { width: 330px; height: 330px; left: -205px; bottom: -245px; opacity: .35; }

.landing-hero-copy { position: relative; z-index: 2; max-width: 570px; }

.landing-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-soft, var(--bg));
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: .08em;
  margin-bottom: 22px;
}

.landing-pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-softer);
}

.landing-hero h1 {
  font-size: clamp(42px, 5vw, 67px);
  line-height: .98;
  letter-spacing: -2.8px;
  margin: 0;
  max-width: 620px;
}

.landing-hero h1 span {
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.landing-subtitle {
  margin: 22px 0 0;
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.75;
  max-width: 520px;
}

.landing-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 27px; }

.landing-primary { padding: 12px 17px; border-radius: 12px; }

.landing-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 15px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.landing-secondary:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-softer); }

.landing-trust-row { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 27px; }
.landing-trust-row .trust-item { display: inline-flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 11.5px; }
.landing-trust-row svg { color: var(--accent); }

.landing-visual { position: relative; min-height: 470px; display: grid; place-items: center; z-index: 1; }

.analysis-preview-card {
  position: relative;
  width: min(405px, 72%);
  padding: 17px;
  border: 1px solid rgba(255,255,255,.8);
  border-radius: 20px;
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  box-shadow: 0 30px 80px rgba(79,70,229,.18), 0 12px 30px rgba(15,23,42,.10);
  backdrop-filter: blur(18px);
  z-index: 4;
}

.preview-topline { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 15px; }
.preview-brand { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 750; }
.preview-brand-mark { width: 27px; height: 27px; border-radius: 9px; display: grid; place-items: center; color: white; background: var(--gradient); }
.preview-status { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: var(--success); font-weight: 700; }
.preview-status span { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.preview-document { display: flex; gap: 11px; align-items: center; padding: 12px; border-radius: 13px; background: var(--bg); border: 1px solid var(--border); }
.preview-doc-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; color: var(--accent); background: var(--accent-softer); }
.preview-document strong { display: block; font-size: 12px; max-width: 215px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.preview-document span { display: block; font-size: 10.5px; color: var(--text-muted); margin-top: 2px; }

.preview-summary { padding: 15px 3px 13px; }
.preview-summary-label { font-size: 9.5px; font-weight: 800; color: var(--accent); letter-spacing: .08em; }
.preview-summary p { margin: 7px 0 0; font-size: 11px; line-height: 1.6; color: var(--text-muted); }

.preview-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.preview-metrics > div { padding: 10px; border-radius: 11px; background: var(--bg); border: 1px solid var(--border); }
.preview-metrics strong { display: block; font-size: 16px; letter-spacing: -.3px; }
.preview-metrics span { display: block; margin-top: 2px; color: var(--text-muted); font-size: 9.5px; }

.orbit { position: absolute; border: 1px solid rgba(124,58,237,.16); border-radius: 50%; pointer-events: none; }
.orbit-one { width: 500px; height: 500px; }
.orbit-two { width: 350px; height: 350px; border-color: rgba(14,165,233,.15); }

.orbit-icon {
  position: absolute;
  width: 39px;
  height: 39px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  background: var(--surface);
  color: var(--accent);
  border: 1px solid var(--border);
  box-shadow: 0 12px 30px rgba(15,23,42,.08);
  z-index: 5;
}
.orbit-icon-1 { top: 10%; left: 16%; }
.orbit-icon-2 { top: 8%; right: 18%; }
.orbit-icon-3 { bottom: 12%; left: 20%; }
.orbit-icon-4 { bottom: 11%; right: 18%; }

.floating-file {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 166px;
  padding: 10px 11px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 15px 35px rgba(15,23,42,.10);
  z-index: 6;
}
.floating-file-left { left: 1%; top: 31%; transform: rotate(-4deg); }
.floating-file-right { right: 1%; bottom: 27%; transform: rotate(4deg); }
.floating-file-icon { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; }
.floating-file-icon.pdf { color: #dc2626; background: #fee2e2; }
.floating-file-icon.invoice { color: #059669; background: #d1fae5; }
.floating-file strong { display: block; font-size: 10.5px; }
.floating-file span { display: block; color: var(--text-muted); font-size: 9.5px; margin-top: 2px; }
.floating-file > svg { margin-left: auto; color: var(--success); }

.landing-capabilities { padding: 4px 2px 0; }
.capability-intro { margin-bottom: 13px; }
.capability-intro h2 { margin: 5px 0 3px; font-size: 20px; letter-spacing: -.5px; }
.capability-intro p { margin: 0; color: var(--text-muted); font-size: 12.5px; }
.capability-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 11px; }
.capability-card { min-height: 132px; padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); box-shadow: var(--shadow); }
.capability-icon { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--accent-softer); color: var(--accent); margin-bottom: 14px; }
.capability-card strong { display: block; font-size: 12.5px; }
.capability-card span { display: block; margin-top: 5px; color: var(--text-muted); font-size: 10.8px; line-height: 1.5; }

.landing-stat-strip { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--border); border-radius: 17px; overflow: hidden; background: var(--surface); box-shadow: var(--shadow); }
.landing-stat-strip > div { padding: 18px 20px; border-right: 1px solid var(--border); }
.landing-stat-strip > div:last-child { border-right: none; }
.landing-stat-strip span { display: block; color: var(--text-muted); font-size: 10.5px; }
.landing-stat-strip strong { display: block; font-size: 24px; letter-spacing: -.7px; margin: 4px 0 1px; }
.landing-stat-strip small { color: var(--text-muted); font-size: 10px; }

.landing-recent { margin-bottom: 2px; }

@media (max-width: 980px) {
  .dash-stats-grid { grid-template-columns: repeat(2, 1fr); }
  .dash-main-grid, .dash-bottom-grid { grid-template-columns: 1fr; }
  .dash-heading { align-items: flex-start; flex-direction: column; }
}

@media (max-width: 760px) {
  .dash-heading-actions { width: 100%; }
  .dash-heading-actions > button { flex: 1; justify-content: center; }
  .dash-stats-grid { grid-template-columns: 1fr; }
  .dash-insight-strip { align-items: flex-start; flex-direction: column; }
}

@media (max-width: 980px) {
  .landing-hero { grid-template-columns: 1fr; padding: 45px 32px 30px; min-height: auto; }
  .landing-hero-copy { max-width: 700px; }
  .landing-visual { min-height: 450px; }
  .capability-grid, .landing-stat-strip { grid-template-columns: repeat(2, 1fr); }
  .landing-stat-strip > div:nth-child(2) { border-right: none; }
  .landing-stat-strip > div:nth-child(-n+2) { border-bottom: 1px solid var(--border); }
}

@media (max-width: 620px) {
  .landing-hero { padding: 32px 20px 20px; border-radius: 22px; }
  .landing-hero h1 { font-size: 40px; letter-spacing: -1.9px; }
  .landing-subtitle { font-size: 13px; line-height: 1.65; }
  .landing-trust-row { gap: 10px; }
  .landing-visual { min-height: 370px; }
  .analysis-preview-card { width: 82%; }
  .orbit-one { width: 390px; height: 390px; }
  .orbit-two { width: 280px; height: 280px; }
  .floating-file { min-width: 145px; transform: none; }
  .floating-file-left { left: 0; top: 27%; }
  .floating-file-right { right: 0; bottom: 23%; }
  .orbit-icon { width: 34px; height: 34px; }
  .capability-grid, .landing-stat-strip { grid-template-columns: 1fr; }
  .landing-stat-strip > div { border-right: none; border-bottom: 1px solid var(--border); }
  .landing-stat-strip > div:last-child { border-bottom: none; }
}

@media (max-width: 980px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .dashboard-grid, .analytics-grid, .analysis-overview-grid, .analysis-content-grid { grid-template-columns: 1fr; }
  .feature-grid, .insight-grid, .faq-grid, .settings-layout, .pricing-grid { grid-template-columns: 1fr; }
  .analysis-bottom-card { align-items: flex-start; flex-direction: column; }
  .folder-grid { grid-template-columns: repeat(3, 1fr); }
  .pricing-card.featured { transform: none; }
  .detail-grid.detail-grid-wide { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 760px) {
  .sidebar,
  .sidebar-collapsed,
  .sidebar-expanded {
    width: 286px;
    flex-basis: 286px;
    padding: 14px 12px;
    position: fixed;
    left: 0;
    top: 0;
    transform: translateX(-104%);
    transition: transform .3s cubic-bezier(.22,1,.36,1);
    box-shadow: 14px 0 40px rgba(0,0,0,.22);
  }

  .sidebar-collapsed .logo-copy,
  .sidebar-collapsed .workspace-label,
  .sidebar-collapsed .workspace-chip,
  .sidebar-collapsed .nav-item span,
  .sidebar-collapsed .nav-item em,
  .sidebar-collapsed .usage-card,
  .sidebar-collapsed .user-card { display: block; }
  .sidebar-collapsed .logo { justify-content: flex-start; padding: 6px 7px; }
  .sidebar-collapsed .sidebar-toggle { position: absolute; right: -14px; top: 18px; }
  .sidebar-collapsed .sidebar-toggle svg { transform: none; }
  .sidebar-collapsed .navigation { gap: 3px; }
  .sidebar-collapsed .nav-item { width: 100%; height: 42px; min-height: 42px; margin: 0; padding: 0 11px; justify-content: flex-start; }
  .sidebar-collapsed .nav-item.active::before { left: -1px; top: 9px; bottom: 9px; }
  .sidebar-collapsed .nav-item:hover::after,
  .sidebar-collapsed .nav-item:focus-visible::after { display: none; }

  .sidebar.mobile-open { transform: translateX(0); }

  .mobile-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 15;
  }

  .mobile-menu { display: flex; }
  .global-search { display: none; }
  .stats-grid { grid-template-columns: 1fr; }
  .folder-grid { grid-template-columns: 1fr 1fr; }
  .new-folder-form { flex-wrap: wrap; }
  .new-folder-form input { flex-basis: 180px; }
  .page-content { padding: 18px 16px 40px; }
  .detail-grid.detail-grid-wide { grid-template-columns: 1fr; }
  .analysis-hero { align-items: flex-start; flex-direction: column; }
  .analysis-status { width: 100%; }
}
.public-landing {
  min-height: 100vh;
  background: #f6f6f4;
  color: #171717;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  overflow: hidden;
}

.public-nav {
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
}

.public-brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 0;
  background: transparent;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -0.03em;
  cursor: pointer;
}

.public-brand-icon {
  width: 31px; height: 31px; border-radius: 9px;
  display: inline-flex; align-items: center; justify-content: center;
  background: #171717; color: white;
}

.public-nav-links { display: flex; align-items: center; gap: 30px; }
.public-nav-links a { color: #686868; text-decoration: none; font-size: 12px; font-weight: 550; }
.public-nav-links a:hover { color: #171717; }
.public-nav-actions { display: flex; align-items: center; gap: 10px; }
.public-text-button, .public-dark-button { border: 0; cursor: pointer; font-weight: 650; }
.public-text-button { background: transparent; color: #444; font-size: 12px; padding: 10px 12px; }
.public-dark-button { display: inline-flex; align-items: center; gap: 8px; background: #171717; color: white; padding: 11px 16px; border-radius: 10px; font-size: 12px; box-shadow: 0 8px 20px rgba(0,0,0,.08); }
.public-dark-button:hover, .public-primary-cta:hover { transform: translateY(-1px); }

.public-hero {
  width: min(1180px, calc(100% - 48px));
  min-height: 620px;
  margin: 8px auto 0;
  padding: 72px 62px 58px;
  border: 1px solid #e9e9e5;
  border-radius: 20px;
  background: rgba(255,255,255,.82);
  box-shadow: 0 28px 80px rgba(0,0,0,.045);
  display: grid; grid-template-columns: .88fr 1.12fr; gap: 30px;
  align-items: center;
  position: relative;
}
.public-hero:before { content: ""; position: absolute; inset: 0; border-radius: inherit; background: radial-gradient(circle at 78% 45%, rgba(124,58,237,.08), transparent 31%), radial-gradient(circle at 15% 20%, rgba(0,0,0,.025), transparent 26%); pointer-events: none; }
.public-hero-copy, .public-hero-visual { position: relative; z-index: 1; }
.public-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 800; letter-spacing: .13em; color: #777; margin-bottom: 21px; }
.public-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #7c3aed; box-shadow: 0 0 0 4px #eee7fb; }
.public-hero h1 { margin: 0; font-size: clamp(44px, 5vw, 66px); line-height: .98; letter-spacing: -.065em; font-weight: 760; max-width: 620px; }
.public-hero h1 span { color: #777; }
.public-hero-copy > p { max-width: 520px; color: #747474; font-size: 14px; line-height: 1.8; margin: 24px 0 28px; }
.public-hero-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.public-primary-cta, .public-secondary-cta { border-radius: 999px; padding: 13px 18px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 9px; cursor: pointer; transition: transform .22s ease, box-shadow .22s ease, filter .22s ease; }
.public-primary-cta {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border: 0;
  border-radius: 999px;
  background: #20345d;
  color: #fff;
  min-width: 188px;
  min-height: 50px;
  padding: 13px 19px;
  box-shadow:
    0 12px 30px rgba(20, 31, 59, .18),
    inset 0 1px 0 rgba(255,255,255,.07);
  will-change: transform;
}

/* The reference button uses a bright multi-colour ring that travels smoothly
   around the complete rounded perimeter. */
.public-primary-cta::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: conic-gradient(
    from 215deg,
    #b87cf5 0deg,
    #d996ff 32deg,
    #ffffff 76deg,
    #ff4a3d 123deg,
    #ffad22 167deg,
    #49ed73 214deg,
    #32e7e7 257deg,
    #9074ff 310deg,
    #ef72d5 346deg,
    #b87cf5 360deg
  );
  animation: openLedDocsBorderSpin 4.2s linear infinite;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: 2;
  filter: drop-shadow(0 0 3px rgba(174, 130, 255, .18));
}

/* Calm dark inner surface in the normal state. */
.public-primary-cta::after {
  content: "";
  position: absolute;
  inset: 1.5px;
  border-radius: inherit;
  background: #20345d;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.07);
  z-index: -1;
  pointer-events: none;
}

/* On hover, the reference develops a soft moving rainbow wash inside the
   button while the border remains visible. */
.public-primary-cta:hover::after {
  background:
    radial-gradient(circle at 72% 48%, rgba(188, 173, 255, .54) 0 9%, rgba(188,173,255,0) 31%),
    radial-gradient(circle at 31% 78%, rgba(48, 238, 113, .26) 0 8%, rgba(48,238,113,0) 30%),
    radial-gradient(circle at 47% 25%, rgba(255, 92, 81, .22) 0 9%, rgba(255,92,81,0) 31%),
    radial-gradient(circle at 82% 77%, rgba(255, 184, 55, .18) 0 8%, rgba(255,184,55,0) 30%),
    linear-gradient(110deg, #314978 0%, #31466f 50%, #3a4a78 100%);
  animation: openLedDocsHoverWash 2.8s ease-in-out infinite alternate;
}

.public-primary-cta > * { position: relative; z-index: 3; }
.public-primary-cta svg {
  transition: transform .25s ease, color .25s ease, filter .25s ease;
}
.public-primary-cta:hover {
  transform: translateY(-1px);
  box-shadow:
    0 14px 34px rgba(23, 32, 56, .22),
    0 0 22px rgba(128, 112, 255, .08);
}
.public-primary-cta:hover svg {
  transform: translateX(2px);
  color: #5dff36;
  filter: drop-shadow(0 0 6px rgba(93,255,54,.46));
}

@keyframes openLedDocsBorderSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes openLedDocsHoverWash {
  0% {
    transform: scale(1);
    filter: saturate(.95) blur(.15px);
  }
  100% {
    transform: scale(1.035);
    filter: saturate(1.14) blur(.45px);
  }
}

.public-secondary-cta { border: 1px solid #deded9; background: white; color: #292929; }
@keyframes openLedDocsRainbow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.public-proof-row { display: flex; flex-wrap: wrap; gap: 17px; margin-top: 28px; color: #7b7b7b; font-size: 10px; font-weight: 650; }
.public-proof-row span { display: inline-flex; align-items: center; gap: 6px; }
.public-proof-row svg { color: #7c3aed; }

.public-hero-visual { min-height: 500px; display: flex; align-items: center; justify-content: center; }
.public-document-card { width: 390px; padding: 20px; border: 1px solid #e7e7e3; border-radius: 17px; background: rgba(255,255,255,.96); box-shadow: 0 25px 65px rgba(0,0,0,.11); position: relative; z-index: 3; }
.public-card-header, .public-file-row, .public-risk-row { display: flex; align-items: center; }
.public-card-header { justify-content: space-between; padding-bottom: 17px; border-bottom: 1px solid #f0f0ed; }
.public-mini-brand { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 750; }
.public-mini-brand span { width: 23px; height: 23px; border-radius: 7px; background: #eee8fc; color: #7c3aed; display: flex; align-items: center; justify-content: center; }
.public-analyzed { color: #2d8a52; font-size: 9px; font-weight: 700; display: flex; gap: 5px; align-items: center; }
.public-analyzed > span { width: 6px; height: 6px; background: #2d8a52; border-radius: 50%; }
.public-file-row { gap: 11px; margin: 19px 0; }
.public-file-icon { width: 42px; height: 42px; border-radius: 11px; background: #f2effc; color: #7c3aed; display: flex; align-items: center; justify-content: center; }
.public-file-row strong { display: block; font-size: 12px; }
.public-file-row span { display: block; margin-top: 4px; font-size: 9px; color: #8a8a8a; }
.public-ai-summary { background: #fafaf8; border: 1px solid #ededeb; border-radius: 12px; padding: 14px; }
.public-ai-summary div { display: flex; align-items: center; gap: 6px; color: #7c3aed; font-size: 8px; letter-spacing: .12em; font-weight: 800; }
.public-ai-summary p { color: #646464; font-size: 10px; line-height: 1.6; margin: 8px 0 0; }
.public-metric-row { display: grid; grid-template-columns: repeat(3,1fr); margin: 17px 0; }
.public-metric-row div { padding: 0 12px; border-right: 1px solid #ededeb; }
.public-metric-row div:first-child { padding-left: 0; }
.public-metric-row div:last-child { border: 0; }
.public-metric-row strong { display: block; font-size: 19px; letter-spacing: -.04em; }
.public-metric-row span { color: #8b8b8b; font-size: 8px; }
.public-risk-row { gap: 7px; padding-top: 13px; border-top: 1px solid #ededeb; font-size: 9px; }
.public-risk-row svg { color: #d97706; }
.public-risk-row span { color: #6e6e6e; }
.public-risk-row em { margin-left: auto; font-style: normal; color: #a05c00; background: #fff3df; padding: 5px 7px; border-radius: 7px; font-weight: 700; }

.public-orbit { position: absolute; border: 1px solid #e6e3ed; border-radius: 50%; }
.public-orbit-a { width: 510px; height: 310px; transform: rotate(-22deg); }
.public-orbit-b { width: 390px; height: 390px; transform: rotate(27deg); border-color: #ece9f1; }
.public-orbit-c { width: 285px; height: 470px; transform: rotate(64deg); border-color: #efedf2; }
.public-orbit-node { position: absolute; width: 34px; height: 34px; border-radius: 50%; background: white; border: 1px solid #e5e4e1; box-shadow: 0 8px 22px rgba(0,0,0,.08); display: flex; align-items: center; justify-content: center; color: #777; z-index: 4; }
.node-one { top: 48px; left: 22%; } .node-two { top: 28%; right: 4%; } .node-three { bottom: 16%; left: 10%; } .node-four { bottom: 7%; right: 23%; color: #7c3aed; }
.public-floating-file { position: absolute; z-index: 5; display: flex; align-items: center; gap: 9px; width: 170px; padding: 10px; border: 1px solid #e9e8e4; background: rgba(255,255,255,.95); border-radius: 11px; box-shadow: 0 14px 35px rgba(0,0,0,.09); }
.public-floating-file > div { width: 30px; height: 30px; border-radius: 8px; background: #f1eff9; color: #7c3aed; display: flex; align-items: center; justify-content: center; }
.public-floating-file span { flex: 1; min-width: 0; }
.public-floating-file strong, .public-floating-file small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.public-floating-file strong { font-size: 9px; } .public-floating-file small { font-size: 8px; color: #999; margin-top: 3px; }
.floating-left { left: 1%; top: 24%; transform: rotate(-4deg); } .floating-right { right: -1%; bottom: 22%; transform: rotate(4deg); }

.public-integrations { width: min(1040px, calc(100% - 48px)); margin: 34px auto 0; text-align: center; color: #a1a19d; }
.public-integrations > span { font-size: 8px; letter-spacing: .15em; font-weight: 800; }
.public-integrations div { display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 24px; margin-top: 17px; }
.public-integrations b { color: #888884; font-size: 10px; letter-spacing: .04em; }

.public-section { width: min(1080px, calc(100% - 48px)); margin: 130px auto 0; }
.public-section-heading { max-width: 680px; }
.public-section-heading > span, .public-workflow .public-section-kicker, .public-pricing > div > span { color: #8b8b87; font-size: 9px; letter-spacing: .14em; font-weight: 800; }
.public-section-heading h2, .public-workflow-card h2, .public-security h2, .public-pricing h2 { font-size: 40px; line-height: 1.05; letter-spacing: -.055em; margin: 11px 0 12px; }
.public-section-heading p, .public-workflow-card p, .public-security p { color: #777; font-size: 13px; line-height: 1.75; max-width: 620px; }
.public-feature-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-top: 35px; }
.public-feature-grid article { background: white; border: 1px solid #e8e8e4; border-radius: 15px; padding: 22px; min-height: 220px; }
.public-feature-icon { width: 37px; height: 37px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: #f1eff9; color: #7c3aed; margin-bottom: 34px; }
.public-feature-grid h3 { margin: 0 0 9px; font-size: 14px; }
.public-feature-grid article p { margin: 0; color: #7a7a77; font-size: 11px; line-height: 1.65; }

.public-workflow { width: min(1080px, calc(100% - 48px)); margin: 120px auto 0; }
.public-workflow-card { border-radius: 20px; background: #191919; color: white; padding: 55px; display: grid; grid-template-columns: .8fr 1.2fr; gap: 70px; }
.public-workflow-card p { color: #aaa; }
.public-workflow-card h2 { margin-bottom: 18px; }
.public-workflow-card .public-dark-button { margin-top: 20px; background: white; color: #171717; }
.public-steps { display: flex; flex-direction: column; gap: 0; }
.public-steps > div { display: grid; grid-template-columns: 42px 1fr; column-gap: 15px; padding: 19px 0; border-bottom: 1px solid #343434; }
.public-steps > div:last-child { border-bottom: 0; }
.public-steps span { grid-row: 1 / span 2; color: #8b5cf6; font-size: 10px; font-weight: 800; padding-top: 2px; }
.public-steps strong { font-size: 13px; }
.public-steps p { margin: 5px 0 0; font-size: 10px; line-height: 1.6; }

.public-security { width: min(760px, calc(100% - 48px)); margin: 125px auto; text-align: center; }
.public-security > div { display: inline-flex; align-items: center; gap: 7px; color: #777; font-size: 9px; letter-spacing: .13em; font-weight: 800; }
.public-security > div svg { color: #7c3aed; }
.public-security h2 { margin-top: 14px; }
.public-security p { margin: 0 auto; }
.public-link-button { border: 0; background: transparent; color: #171717; display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 750; cursor: pointer; margin-top: 18px; }

.public-pricing { width: min(1080px, calc(100% - 48px)); margin: 0 auto 100px; padding: 34px; border: 1px solid #e4e4df; border-radius: 17px; background: white; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.public-pricing h2 { font-size: 25px; margin-bottom: 0; }
.public-footer { width: min(1080px, calc(100% - 48px)); margin: 0 auto; padding: 22px 0 35px; border-top: 1px solid #deded9; display: flex; align-items: center; gap: 20px; color: #969692; font-size: 9px; }
.public-footer .public-brand { color: #333; margin-right: auto; }

@media (max-width: 900px) {
  .public-nav-links { display: none; }
  .public-hero { grid-template-columns: 1fr; padding: 50px 30px; }
  .public-hero-copy { text-align: center; }
  .public-eyebrow, .public-hero-actions, .public-proof-row { justify-content: center; }
  .public-hero-copy > p { margin-left: auto; margin-right: auto; }
  .public-feature-grid { grid-template-columns: repeat(2,1fr); }
  .public-workflow-card { grid-template-columns: 1fr; gap: 30px; }
}

@media (max-width: 620px) {
  .public-nav, .public-hero, .public-integrations, .public-section, .public-workflow, .public-security, .public-pricing, .public-footer { width: min(100% - 28px, 1080px); }
  .public-nav { height: 66px; }
  .public-text-button { display: none; }
  .public-hero { padding: 38px 18px 28px; min-height: auto; }
  .public-hero h1 { font-size: 42px; }
  .public-hero-visual { min-height: 390px; transform: scale(.83); margin: -25px -45px; }
  .public-document-card { width: 360px; }
  .public-feature-grid { grid-template-columns: 1fr; }
  .public-section, .public-workflow { margin-top: 80px; }
  .public-section-heading h2, .public-workflow-card h2, .public-security h2 { font-size: 32px; }
  .public-workflow-card { padding: 30px 24px; }
  .public-pricing { flex-direction: column; align-items: flex-start; margin-bottom: 70px; }
  .public-footer { flex-wrap: wrap; }
  .public-footer .public-brand { width: 100%; }
}



/* AI document chat */

.document-chat-card {
  margin-top: 16px;
  overflow: hidden;
}

.document-chat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}

.document-chat-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.document-chat-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: var(--accent-soft);
  color: var(--accent);
}

.document-chat-title h2 {
  margin: 3px 0 3px;
  font-size: 18px;
  letter-spacing: -.025em;
}

.document-chat-title p {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
}

.document-chat-clear {
  white-space: nowrap;
}

.document-chat-suggestions {
  padding: 16px 0 4px;
}

.document-chat-suggestions > span {
  display: block;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 750;
  margin-bottom: 9px;
}

.document-chat-suggestions > div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.document-chat-suggestion {
  border: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--text);
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 10px;
  cursor: pointer;
  transition: border-color .16s ease, background .16s ease, transform .16s ease;
}

.document-chat-suggestion:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-soft);
  transform: translateY(-1px);
}

.document-chat-suggestion:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.document-chat-messages {
  max-height: 560px;
  min-height: 90px;
  overflow-y: auto;
  padding: 18px 2px 4px;
  scroll-behavior: smooth;
}

.document-chat-message-row {
  display: flex;
  margin-bottom: 14px;
}

.document-chat-message-row.user {
  justify-content: flex-end;
}

.document-chat-message-row.assistant {
  justify-content: flex-start;
}

.document-chat-message {
  width: min(86%, 760px);
  border-radius: 14px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  background: var(--surface-alt);
}

.document-chat-message.user {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  border-bottom-right-radius: 5px;
}

.document-chat-message.assistant {
  border-bottom-left-radius: 5px;
}

.document-chat-message-label {
  margin-bottom: 5px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .04em;
  text-transform: uppercase;
  opacity: .72;
}

.document-chat-message-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.65;
}

.document-chat-message-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 9px;
}

.document-chat-action,
.document-chat-source-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
  padding: 4px 5px;
  border-radius: 6px;
}

.document-chat-action:hover,
.document-chat-source-button:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.document-chat-sources {
  margin-top: 12px;
  padding-top: 11px;
  border-top: 1px solid var(--border);
}

.document-chat-sources-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .07em;
}

.document-chat-source {
  padding: 9px 10px;
  margin-top: 7px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
}

.document-chat-source-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.document-chat-source-top strong {
  font-size: 10px;
}

.document-chat-source p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.document-chat-source p.is-expanded {
  display: block;
  -webkit-line-clamp: unset;
}

.document-chat-thinking {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 11px;
}

.document-chat-thinking-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  animation: document-chat-pulse 1s ease-in-out infinite;
}

@keyframes document-chat-pulse {
  0%, 100% { opacity: .3; transform: scale(.8); }
  50% { opacity: 1; transform: scale(1); }
}

.document-chat-error {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 9px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 10px;
  line-height: 1.45;
}

.document-chat-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 9px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.document-chat-input-wrap textarea {
  width: 100%;
  min-height: 62px;
  max-height: 150px;
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
  color: var(--text);
  outline: none;
  padding: 11px 12px;
  font-size: 11px;
  line-height: 1.55;
}

.document-chat-input-wrap textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.document-chat-input-wrap textarea::placeholder {
  color: var(--text-muted);
}

.document-chat-send {
  flex: 0 0 auto;
  min-height: 42px;
}

.document-chat-send:disabled,
.document-chat-clear:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.document-chat-hint {
  margin: 7px 2px 0;
  color: var(--text-muted);
  font-size: 9px;
}

@media (max-width: 620px) {
  .document-chat-header {
    flex-direction: column;
  }

  .document-chat-message {
    width: 94%;
  }

  .document-chat-input-wrap {
    align-items: stretch;
    flex-direction: column;
  }

  .document-chat-send {
    width: 100%;
    justify-content: center;
  }
}

/* Professional analytics + presentation dashboard */
.pro-analytics { display:flex; flex-direction:column; gap:20px; }
.analytics-hero { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; }
.analytics-hero h1 { margin:8px 0 7px; font-size:34px; letter-spacing:-.035em; }
.analytics-hero p { margin:0; color:var(--text-muted); max-width:680px; }
.analytics-hero-actions { display:flex; gap:9px; flex-wrap:wrap; justify-content:flex-end; }
.secondary-button,.filter-pill { border:1px solid var(--border); background:var(--surface); border-radius:11px; padding:10px 13px; display:inline-flex; align-items:center; gap:7px; cursor:pointer; transition:.2s ease; font-weight:650; }
.secondary-button:hover,.filter-pill:hover { transform:translateY(-1px); border-color:var(--accent); }
.analytics-toolbar { padding:10px; display:flex; gap:9px; align-items:center; flex-wrap:wrap; }
.analytics-search { min-width:260px; flex:1; display:flex; gap:8px; align-items:center; padding:0 10px; }
.analytics-search input { border:0; outline:0; background:transparent; width:100%; padding:9px 0; }
.analytics-toolbar select { border:1px solid var(--border); background:var(--surface-alt); border-radius:10px; padding:9px 11px; outline:none; }
.filter-pill.active { background:var(--accent-soft); color:var(--accent-dark); border-color:var(--accent); }
.analytics-kpis { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; }
.analytics-kpis .stat-card { min-height:126px; }
.analytics-main-grid,.cv-analytics-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
.analytics-chart-card,.analytics-table-card { min-width:0; }
.analytics-chart-card.wide,.analytics-table-card.wide { grid-column:1 / -1; }
.analytics-risk-layout { display:flex; align-items:center; gap:28px; padding-top:12px; }
.analytics-donut { width:156px; height:156px; border-radius:50%; display:grid; place-items:center; flex:0 0 auto; }
.analytics-donut > div { width:98px; height:98px; border-radius:50%; background:var(--surface); display:flex; flex-direction:column; justify-content:center; align-items:center; }
.analytics-donut strong { font-size:28px; letter-spacing:-.04em; }.analytics-donut span { color:var(--text-muted); font-size:12px; }
.analytics-legend { display:flex; flex-direction:column; gap:13px; width:100%; }.analytics-legend div { display:grid; grid-template-columns:10px 1fr auto; gap:8px; align-items:center; }.analytics-legend strong { font-size:16px; }.analytics-legend .risk-dot { width:9px;height:9px;border-radius:50%;display:block; }.risk-dot.high { background:var(--danger); }.risk-dot.medium { background:var(--warn); }.risk-dot.low { background:var(--success); }
.horizontal-bars { display:flex; flex-direction:column; gap:13px; padding-top:10px; }.hbar-row { display:grid; grid-template-columns:110px 1fr 28px; align-items:center; gap:10px; font-size:13px; }.hbar-row > div,.status-row > div { height:9px; background:var(--accent-softer); border-radius:99px; overflow:hidden; }.hbar-row i,.status-row i { display:block; height:100%; background:var(--accent); border-radius:99px; }.hbar-row strong,.status-row strong { text-align:right; }
.timeline-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 24px; margin-top:6px; }.timeline-item { display:flex; gap:12px; padding:14px 0; border-bottom:1px solid var(--border); }.timeline-dot { width:9px;height:9px;border-radius:50%;background:var(--accent);margin-top:5px;flex:0 0 auto;box-shadow:0 0 0 4px var(--accent-soft); }.timeline-item div { display:flex;flex-direction:column;gap:4px; }.timeline-item span { color:var(--text-muted);font-size:12px; }
.status-bars { display:flex; flex-direction:column; gap:17px; margin-top:14px; }.status-row { display:grid;grid-template-columns:90px 1fr 28px;gap:10px;align-items:center;font-size:13px; }.status-row i { background:var(--success); }
.analytics-table-wrap { overflow:auto; margin-top:6px; }.analytics-table-wrap table { width:100%; border-collapse:collapse; min-width:760px; }.analytics-table-wrap th,.analytics-table-wrap td { padding:12px 10px; border-bottom:1px solid var(--border); text-align:left; font-size:13px; vertical-align:middle; }.analytics-table-wrap th { color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em; }.table-link { border:0;background:none;padding:0;color:var(--text);font-weight:700;cursor:pointer;text-align:left; }.table-link:hover { color:var(--accent); }.table-count { color:var(--text-muted);font-size:12px; }
.analytics-bottom-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px; }.insight-list { display:flex;flex-direction:column;gap:10px;margin-top:10px; }.analytics-insight { display:flex;gap:10px;align-items:flex-start;padding:13px;border:1px solid var(--border);border-radius:12px;background:var(--surface-alt); }.analytics-insight > span { display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--accent-soft);color:var(--accent);flex:0 0 auto; }.analytics-insight p { margin:3px 0 0;font-size:13px;line-height:1.5; }.attention-row { width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border:0;border-bottom:1px solid var(--border);background:transparent;text-align:left;cursor:pointer; }.attention-row > div { min-width:0;display:flex;flex-direction:column;gap:4px; }.attention-row strong { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.attention-row span { color:var(--text-muted);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }.analytics-mini-empty { padding:28px 6px;color:var(--text-muted);font-size:13px; }
.cv-overview { display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;margin-top:12px; }.cv-overview strong { font-size:30px;letter-spacing:-.04em; }.cv-overview span { color:var(--text-muted);font-size:12px; }.simple-bars { height:190px;display:flex;align-items:flex-end;justify-content:space-around;gap:10px;padding:16px 4px 0; }.simple-bars > div { height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:7px;min-width:42px; }.simple-bars i { display:block;width:28px;min-height:8px;background:var(--accent);border-radius:8px 8px 3px 3px; }.simple-bars span { font-size:11px;color:var(--text-muted); }.simple-bars strong { font-size:12px; }.distribution-list { display:flex;flex-direction:column;gap:8px;font-size:12px;margin-top:10px; }.distribution-list > strong { margin-top:7px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted); }.distribution-list > div { display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border); }.distribution-list p { color:var(--text-muted);margin:4px 0; }
.analytics-empty { padding:70px 20px;text-align:center; }.analytics-empty svg { color:var(--accent); }.analytics-empty h2 { margin:14px 0 7px; }.analytics-empty p { color:var(--text-muted); }
.analytics-modal-backdrop { position:fixed;inset:0;background:rgba(10,8,18,.56);backdrop-filter:blur(6px);z-index:100;display:grid;place-items:center;padding:20px; }.analytics-modal { width:min(850px,100%);max-height:90vh;overflow:auto;background:var(--surface);border:1px solid var(--border);border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.28);padding:22px; }.analytics-modal-head { display:flex;justify-content:space-between;gap:20px;align-items:flex-start; }.analytics-modal-head h2 { margin:6px 0 4px;font-size:25px; }.analytics-modal-head p { margin:0;color:var(--text-muted); }.analytics-detail-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0; }.analytics-detail-section { border-top:1px solid var(--border);padding:17px 0; }.analytics-detail-section > p { line-height:1.65;color:var(--text-muted); }.detail-finding { display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border); }.detail-finding span { font-size:13px;line-height:1.5; }.detail-fields { display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:10px; }.detail-fields div { padding:11px;border:1px solid var(--border);border-radius:10px;display:flex;flex-direction:column;gap:4px; }.detail-fields span { color:var(--text-muted);font-size:11px; }.detail-fields strong { font-size:13px;overflow-wrap:anywhere; }.analytics-modal-actions { display:flex;justify-content:flex-end;gap:8px;margin-top:4px; }
.presentation-shell { position:fixed;inset:0;background:#0d0b12;color:#f7f5fb;z-index:200;display:flex;flex-direction:column; }.presentation-top { height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;border-bottom:1px solid rgba(255,255,255,.09); }.presentation-top span { color:#a9a4b5;font-size:13px; }.presentation-top button { border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;border-radius:9px;padding:8px 11px;display:flex;align-items:center;gap:7px;cursor:pointer; }.presentation-slide { flex:1;display:flex;flex-direction:column;justify-content:center;width:min(1100px,90vw);margin:auto;padding:50px 0; }.presentation-kicker { color:#a78bfa;font-size:11px;font-weight:800;letter-spacing:.14em; }.presentation-slide h1 { font-size:clamp(42px,6vw,82px);letter-spacing:-.055em;margin:12px 0 12px;max-width:900px; }.presentation-slide > p { color:#aaa5b5;font-size:18px;max-width:720px; }.presentation-content { margin-top:30px; }.presentation-kpi-large { display:flex;align-items:baseline;gap:14px; }.presentation-kpi-large strong { font-size:100px;letter-spacing:-.07em; }.presentation-kpi-large span { color:#aaa5b5; }.presentation-kpi-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:14px; }.presentation-kpi-grid > div { border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);border-radius:16px;padding:22px;min-height:130px;display:flex;flex-direction:column;justify-content:space-between; }.presentation-kpi-grid strong { font-size:36px; }.presentation-kpi-grid span { color:#aaa5b5; }.presentation-risk { display:flex;align-items:center;gap:70px; }.presentation-risk > div:last-child { display:flex;flex-direction:column;gap:12px; }.presentation-risk p { margin:0;color:#bcb7c6; }.presentation-risk p strong { color:#fff;font-size:26px;margin-right:8px; }.presentation-findings,.presentation-candidate-list { display:flex;flex-direction:column;gap:12px;max-width:900px; }.presentation-findings > div,.presentation-candidate-list > div { padding:17px 19px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);border-radius:13px;display:flex;gap:13px;align-items:flex-start;line-height:1.5; }.presentation-candidate-list strong { min-width:190px; }.presentation-candidate-list span { color:#bcb7c6; }.presentation-controls { display:flex;align-items:center;justify-content:space-between;padding:18px 28px;border-top:1px solid rgba(255,255,255,.09); }.presentation-controls > button { border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#fff;border-radius:9px;padding:9px 13px;cursor:pointer; }.presentation-controls > button:disabled { opacity:.35;cursor:not-allowed; }.presentation-controls > div { display:flex;gap:6px; }.presentation-controls > div button { width:7px;height:7px;border:0;border-radius:50%;padding:0;background:#5f5969;cursor:pointer; }.presentation-controls > div button.active { background:#a78bfa; }
@media (max-width:1100px) { .analytics-kpis { grid-template-columns:repeat(3,1fr); }.analytics-hero { align-items:flex-start;flex-direction:column; }.analytics-hero-actions { justify-content:flex-start; } }
@media (max-width:760px) { .analytics-kpis,.analytics-main-grid,.cv-analytics-grid,.analytics-bottom-grid { grid-template-columns:1fr; }.analytics-chart-card.wide,.analytics-table-card.wide { grid-column:auto; }.timeline-list { grid-template-columns:1fr; }.analytics-detail-grid { grid-template-columns:repeat(2,1fr); }.detail-fields { grid-template-columns:1fr; }.presentation-kpi-grid { grid-template-columns:1fr 1fr; }.presentation-slide { padding:28px 0; }.presentation-top { padding:0 14px; }.presentation-controls { padding:14px; }.presentation-risk { gap:25px; }.analytics-toolbar { align-items:stretch; }.analytics-search { min-width:100%; }.analytics-toolbar select,.filter-pill { flex:1; } }


.made-dashboard{margin:22px 0;padding:22px}.made-dashboard-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.made-dashboard-head h2{margin:5px 0 4px}.made-dashboard-head p{margin:0;color:var(--muted)}.made-dashboard-actions{display:flex;gap:10px;flex-wrap:wrap}.dashboard-editor{margin-top:20px;padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--surface-2)}.dashboard-editor-title{font-weight:700;display:flex;align-items:center;gap:7px;margin-bottom:14px}.dashboard-edit-grid{display:grid;grid-template-columns:1fr 1.5fr 180px;gap:12px}.dashboard-edit-grid label{font-size:12px;font-weight:700;color:var(--muted);display:grid;gap:7px}.dashboard-edit-grid input,.dashboard-edit-grid select{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--text)}.dashboard-widget-toggles{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.widget-toggle{border:1px solid var(--border);background:var(--surface);color:var(--muted);border-radius:999px;padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:5px}.widget-toggle.active{color:var(--text);border-color:var(--accent);background:var(--accent-soft)}.made-dashboard-preview{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.made-dashboard-preview.compact{gap:8px}.made-dashboard-preview.spacious{gap:18px}.preview-widget{min-height:88px;border:1px solid var(--border);border-radius:16px;padding:16px;background:var(--surface);display:flex;flex-direction:column;justify-content:center}.preview-widget strong{font-size:24px}.preview-widget span{font-size:12px;color:var(--muted);margin-top:5px}.preview-wide{grid-column:span 2}@media(max-width:850px){.made-dashboard-head{flex-direction:column}.dashboard-edit-grid{grid-template-columns:1fr}.made-dashboard-preview{grid-template-columns:1fr 1fr}.preview-wide{grid-column:span 2}}@media(max-width:560px){.made-dashboard-preview{grid-template-columns:1fr}.preview-wide{grid-column:span 1}}

.presentation-builder-page{display:flex;flex-direction:column;gap:22px}.presentation-builder-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.presentation-builder-card{padding:24px}.scope-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.scope-tabs button{border:1px solid var(--border);background:var(--surface);border-radius:12px;padding:12px;font-weight:700;cursor:pointer;color:var(--text)}.scope-tabs button.active{border-color:var(--accent);background:var(--accent-soft);color:var(--accent)}.builder-field{display:flex;flex-direction:column;gap:8px;margin:14px 0;font-size:13px;font-weight:700}.builder-field input,.builder-field select{width:100%;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:11px;padding:12px 13px;outline:none}.presentation-source-summary,.presentation-preview-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.presentation-source-summary{padding:16px;border:1px dashed var(--border);border-radius:14px}.presentation-source-summary strong{font-size:28px}.presentation-source-summary span{color:var(--muted);font-size:12px}.presentation-checks{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.builder-start{width:100%;justify-content:center;margin-top:10px}.presentation-preview-strip>div{padding:18px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}.presentation-preview-strip strong{display:block;font-size:25px}.presentation-preview-strip span{font-size:12px;color:var(--muted)}@media(max-width:850px){.presentation-builder-grid{grid-template-columns:1fr}.scope-tabs{grid-template-columns:1fr}.presentation-source-summary,.presentation-preview-strip{grid-template-columns:repeat(2,1fr)}}

/* Reference landing page / image-inspired visual system                     */
.reference-landing {
  min-height: 100vh;
  background: #e8e8e8;
  color: #161616;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  padding: 28px 0;
}
.reference-page-shell {
  width: min(1240px, calc(100% - 32px));
  margin: 0 auto;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.reference-nav {
  min-height: 70px;
  padding: 0 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  border-bottom: 1px solid #f0f0f0;
  background: rgba(255, 255, 255, 0.92);
}
.reference-brand {
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: #171717;
  font-weight: 780;
  letter-spacing: -0.04em;
  font-size: 14px;
  cursor: pointer;
}
.reference-brand-mark {
  width: 29px;
  height: 29px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #171717;
}
.reference-nav-links {
  display: flex;
  align-items: center;
  gap: 27px;
  margin-left: auto;
}
.reference-nav-links a {
  color: #777;
  text-decoration: none;
  font-size: 10px;
  font-weight: 650;
  transition: color .2s ease;
}
.reference-nav-links a:hover {
  color: #171717;
}
.reference-nav-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}
.reference-signin {
  border: 0;
  background: transparent;
  color: #333;
  padding: 9px 11px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.reference-signin:hover {
  background: #f4f4f4;
}
.reference-signin.large {
  border: 1px solid #dedede;
  min-height: 45px;
  padding: 0 17px;
  justify-content: center;
}
.reference-demo-button {
  border: 0;
  background: #171717;
  color: #fff;
  min-height: 34px;
  border-radius: 8px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease;
}
.reference-demo-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, .12);
}
.reference-hero {
  position: relative;
  min-height: 610px;
  padding: 72px 72px 58px;
  display: grid;
  grid-template-columns: .9fr 1.1fr;
  align-items: center;
  gap: 28px;
  overflow: hidden;
  background: #fff;
}
.reference-hero::before {
  content: "";
  position: absolute;
  width: 520px;
  height: 520px;
  right: -220px;
  top: -210px;
  border-radius: 50%;
  background: #f6f1ff;
  pointer-events: none;
}
.reference-hero::after {
  content: "";
  position: absolute;
  width: 360px;
  height: 360px;
  left: -220px;
  bottom: -260px;
  border-radius: 50%;
  background: #f7f7f7;
  pointer-events: none;
}
.reference-hero-copy {
  position: relative;
  z-index: 2;
  max-width: 520px;
}
.reference-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #8a8a8a;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .15em;
  margin-bottom: 19px;
}
.reference-eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7c3aed;
  box-shadow: 0 0 0 4px #f0eaff;
}
.reference-hero h1 {
  margin: 0;
  font-size: clamp(42px, 5vw, 70px);
  line-height: .97;
  letter-spacing: -.065em;
  font-weight: 780;
  color: #151515;
}
.reference-hero h1 span {
  color: #7a7a7a;
}
.reference-hero-copy > p {
  margin: 22px 0 25px;
  max-width: 475px;
  color: #777;
  font-size: 12px;
  line-height: 1.75;
}
.reference-hero-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}
.reference-primary-cta,
.reference-secondary-cta {
  min-height: 44px;
  border-radius: 9px;
  padding: 0 15px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 760;
  cursor: pointer;
  transition: transform .22s ease, box-shadow .22s ease, background .22s ease;
}
.reference-primary-cta {
  border: 0;
  background: #f05f54;
  color: #fff;
  box-shadow: 0 10px 24px rgba(240, 95, 84, .19);
}
.reference-primary-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(240, 95, 84, .23);
}
.reference-secondary-cta {
  border: 1px solid #e2e2e2;
  background: #fff;
  color: #222;
}
.reference-secondary-cta:hover {
  transform: translateY(-2px);
  border-color: #cfcfcf;
}
.reference-trust-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 23px;
}
.reference-trust-row span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #858585;
  font-size: 9px;
  font-weight: 650;
}
.reference-trust-row svg {
  color: #7c3aed;
}
.reference-hero-art {
  min-height: 470px;
  position: relative;
  display: grid;
  place-items: center;
  z-index: 1;
}
.reference-network {
  position: absolute;
  height: 1px;
  background: #e9e9e9;
  transform-origin: left center;
}
.reference-network::after {
  content: "";
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #b7a1e9;
  right: -2px;
  top: -2px;
}
.reference-network-one {
  width: 215px;
  left: 10%;
  top: 28%;
  transform: rotate(16deg);
}
.reference-network-two {
  width: 190px;
  left: 12%;
  top: 67%;
  transform: rotate(-18deg);
}
.reference-network-three {
  width: 215px;
  right: 11%;
  top: 29%;
  transform: rotate(165deg);
}
.reference-network-four {
  width: 190px;
  right: 12%;
  top: 67%;
  transform: rotate(198deg);
}
.reference-orb {
  position: absolute;
  width: 45px;
  height: 45px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  box-shadow: 0 12px 24px rgba(0, 0, 0, .08);
  animation: referenceFloat 5s ease-in-out infinite;
}
.reference-orb svg {
  filter: drop-shadow(0 1px 2px rgba(0,0,0,.1));
}
.orb-yellow {
  left: 9%;
  top: 20%;
  color: #6d4e00;
  background: #f5e95a;
}
.orb-blue {
  left: 15%;
  bottom: 19%;
  color: #fff;
  background: #20b7d8;
  animation-delay: -1.2s;
}
.orb-red {
  right: 10%;
  top: 18%;
  color: #fff;
  background: #e8473e;
  animation-delay: -2.1s;
}
.orb-white {
  right: 10%;
  bottom: 20%;
  color: #202020;
  background: #fff;
  border: 1px solid #ececec;
  animation-delay: -3s;
}
.reference-avatar {
  position: absolute;
  width: 47px;
  height: 47px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #f0d2c3, #c7b6ae);
  border: 3px solid #fff;
  box-shadow: 0 10px 24px rgba(0,0,0,.1);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}
.avatar-left {
  left: 1%;
  top: 35%;
}
.avatar-right {
  right: 1%;
  bottom: 30%;
  background: linear-gradient(135deg, #f0d7c4, #c7b5a9);
}
.reference-center-card {
  width: 108px;
  height: 108px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  position: relative;
  background: linear-gradient(145deg, #9b63ef, #6d28d9);
  box-shadow: 0 22px 42px rgba(109, 40, 217, .28);
  animation: referenceCenterPulse 4.2s ease-in-out infinite;
}
.reference-center-icon {
  color: #fff;
  position: relative;
  z-index: 2;
}
.reference-center-ring {
  position: absolute;
  width: 72px;
  height: 72px;
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 50%;
  animation: referenceRing 3s linear infinite;
}
.reference-mini-card {
  position: absolute;
  min-width: 158px;
  padding: 10px 11px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #ededed;
  border-radius: 12px;
  background: rgba(255,255,255,.96);
  box-shadow: 0 14px 35px rgba(0,0,0,.09);
  animation: referenceFloat 6s ease-in-out infinite;
}
.reference-mini-card .mini-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #6d28d9;
  background: #f1eaff;
}
.reference-mini-card div:nth-child(2) {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.reference-mini-card strong {
  font-size: 9px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.reference-mini-card span {
  color: #8b8b8b;
  font-size: 8px;
  margin-top: 2px;
}
.reference-mini-card svg:last-child {
  color: #16a34a;
}
.mini-left {
  left: 5%;
  bottom: 28%;
}
.mini-right {
  right: 5%;
  top: 33%;
  animation-delay: -2.4s;
}
.mini-right svg:last-child {
  color: #7c3aed;
}
.reference-analysis-chip {
  position: absolute;
  left: 50%;
  bottom: 4%;
  transform: translateX(-50%);
  min-width: 255px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #ececec;
  background: rgba(255,255,255,.94);
  box-shadow: 0 14px 30px rgba(0,0,0,.08);
  display: flex;
  align-items: center;
  gap: 8px;
}
.chip-pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #16a34a;
  box-shadow: 0 0 0 4px #e8f7ed;
}
.reference-analysis-chip div {
  display: flex;
  flex-direction: column;
}
.reference-analysis-chip strong {
  font-size: 9px;
}
.reference-analysis-chip small {
  margin-top: 2px;
  color: #888;
  font-size: 8px;
}
@keyframes referenceFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}
@keyframes referenceCenterPulse {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-5px) scale(1.025); }
}
@keyframes referenceRing {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.reference-logo-strip {
  padding: 22px 42px;
  border-top: 1px solid #f1f1f1;
  border-bottom: 1px solid #f1f1f1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
}
.reference-logo-strip > span {
  color: #999;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .12em;
}
.reference-logo-strip > div {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 21px;
  flex-wrap: wrap;
}
.reference-logo-strip b {
  color: #8b8b8b;
  font-size: 9px;
  letter-spacing: .04em;
}
.reference-feature-section,
.reference-demo-section,
.reference-workflow-section,
.reference-security-section,
.reference-pricing-section {
  padding: 82px 62px;
}
.reference-section-heading {
  max-width: 690px;
  margin-bottom: 35px;
}
.reference-section-heading.compact {
  max-width: 610px;
  margin-bottom: 30px;
}
.reference-section-heading > span,
.reference-demo-head > div:first-child > span,
.reference-pricing-section > div:first-child > span {
  color: #8b8b8b;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .15em;
}
.reference-section-heading h2,
.reference-demo-head h2,
.reference-security-section h2,
.reference-pricing-section h2 {
  margin: 9px 0 11px;
  font-size: clamp(31px, 4vw, 48px);
  line-height: 1.02;
  letter-spacing: -.055em;
}
.reference-section-heading p,
.reference-demo-head p,
.reference-security-section p,
.reference-pricing-section p {
  margin: 0;
  color: #777;
  font-size: 12px;
  line-height: 1.75;
  max-width: 610px;
}
.reference-feature-grid {
  display: grid;
  grid-template-columns: 1.25fr .875fr .875fr;
  gap: 13px;
}
.reference-feature-card {
  min-height: 330px;
  padding: 24px;
  border: 1px solid #e9e9e9;
  border-radius: 17px;
  background: #fff;
  position: relative;
  overflow: hidden;
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.reference-feature-card:hover {
  transform: translateY(-4px);
  border-color: #ddd;
  box-shadow: 0 18px 40px rgba(0,0,0,.06);
}
.reference-feature-card > span {
  color: #9a9a9a;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .1em;
}
.reference-feature-card h3 {
  max-width: 340px;
  margin: 9px 0 9px;
  font-size: 22px;
  line-height: 1.1;
  letter-spacing: -.045em;
}
.reference-feature-card p {
  color: #777;
  font-size: 11px;
  line-height: 1.7;
  max-width: 340px;
}
.feature-card-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  margin-bottom: 34px;
}
.feature-card-icon.purple {
  color: #6d28d9;
  background: #f0e9ff;
}
.feature-card-icon.red {
  color: #d7372f;
  background: #ffebe9;
}
.feature-card-icon.blue {
  color: #087f9d;
  background: #e8f8fc;
}
.feature-preview-lines {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feature-preview-lines i {
  display: block;
  height: 8px;
  border-radius: 99px;
  background: #f0edf7;
}
.feature-preview-lines i:nth-child(1) {
  width: 88%;
  background: #e8defc;
}
.feature-preview-lines i:nth-child(2) {
  width: 66%;
}
.feature-preview-lines i:nth-child(3) {
  width: 76%;
}
.feature-preview-lines i:nth-child(4) {
  width: 45%;
}
.feature-risk-stack {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  display: flex;
  gap: 6px;
}
.feature-risk-stack b {
  padding: 7px 10px;
  border-radius: 8px;
  background: #f5f5f5;
  color: #666;
  font-size: 8px;
}
.feature-risk-stack b:first-child {
  color: #c6312c;
  background: #ffeded;
}
.feature-risk-stack b:nth-child(2) {
  color: #9b6300;
  background: #fff4d9;
}
.feature-bars {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  height: 85px;
  display: flex;
  align-items: flex-end;
  gap: 9px;
}
.feature-bars i {
  flex: 1;
  min-width: 0;
  border-radius: 6px 6px 2px 2px;
  background: #e9defe;
}
.feature-bars i:nth-child(4) {
  background: #7c3aed;
}
.reference-demo-section {
  background: #f8f8f7;
}
.reference-demo-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
}
.reference-demo-tabs {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}
.reference-demo-tabs button {
  border: 1px solid #e5e5e5;
  background: #fff;
  color: #777;
  border-radius: 999px;
  padding: 8px 10px;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}
.reference-demo-tabs button.active {
  color: #fff;
  background: #171717;
  border-color: #171717;
}
.reference-demo-window {
  min-height: 470px;
  border: 1px solid #dedede;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 25px 55px rgba(0,0,0,.08);
  overflow: hidden;
  display: grid;
  grid-template-columns: 160px 1fr;
}
.demo-window-sidebar {
  padding: 18px 12px;
  background: #171717;
  color: #fff;
}
.demo-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 750;
  margin-bottom: 30px;
}
.demo-sidebar-brand span {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  background: #7c3aed;
}
.demo-sidebar-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 8px;
  border-radius: 7px;
  color: #a5a5a5;
  font-size: 8px;
  margin-bottom: 3px;
}
.demo-sidebar-item.active {
  color: #fff;
  background: rgba(255,255,255,.09);
}
.demo-window-main {
  min-width: 0;
  background: #fbfbfb;
}
.demo-window-top {
  min-height: 50px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ececec;
  color: #858585;
  font-size: 9px;
}
.demo-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #228446;
  font-weight: 700;
}
.demo-status > span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #22a454;
}
.demo-window-content {
  padding: 24px;
}
.demo-document-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.demo-file-box {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  color: #6d28d9;
  background: #efe8ff;
}
.demo-document-title span {
  color: #9a9a9a;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: .12em;
}
.demo-document-title h3 {
  margin: 4px 0 0;
  font-size: 15px;
  letter-spacing: -.025em;
}
.demo-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 22px;
}
.demo-kpi-row > div {
  padding: 13px;
  border: 1px solid #e9e9e9;
  border-radius: 11px;
  background: #fff;
}
.demo-kpi-row span {
  display: block;
  color: #909090;
  font-size: 7px;
}
.demo-kpi-row strong {
  display: block;
  margin-top: 5px;
  font-size: 19px;
  letter-spacing: -.04em;
}
.demo-lower-grid {
  display: grid;
  grid-template-columns: 1.3fr .7fr;
  gap: 9px;
  margin-top: 9px;
}
.demo-panel {
  padding: 16px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  background: #fff;
}
.demo-panel > span {
  color: #969696;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: .12em;
}
.demo-panel p {
  color: #686868;
  font-size: 10px;
  line-height: 1.65;
  margin: 8px 0 12px;
}
.demo-line-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.demo-line-list i {
  height: 6px;
  border-radius: 99px;
  background: #efedf4;
}
.demo-line-list i:nth-child(1) {
  width: 94%;
}
.demo-line-list i:nth-child(2) {
  width: 74%;
}
.demo-line-list i:nth-child(3) {
  width: 56%;
}
.demo-signal {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px;
  margin-top: 11px;
}
.demo-signal b {
  font-size: 8px;
}
.demo-signal strong {
  font-size: 8px;
}
.demo-signal em {
  grid-column: 1 / -1;
  height: 5px;
  border-radius: 99px;
  overflow: hidden;
  background: #efedf4;
}
.demo-signal em i {
  display: block;
  height: 100%;
  width: 90%;
  border-radius: inherit;
  background: #7c3aed;
}
.demo-signal:nth-child(4) em i {
  width: 82%;
  background: #e6a12f;
}
.demo-signal:nth-child(5) em i {
  width: 96%;
  background: #20a85b;
}
.reference-step-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.reference-step-grid > div {
  padding: 23px;
  border: 1px solid #e8e8e8;
  border-radius: 15px;
  background: #fff;
  position: relative;
}
.reference-step-grid > div > span {
  display: block;
  color: #aaa;
  font-size: 8px;
  font-weight: 800;
  margin-bottom: 30px;
}
.reference-step-grid svg {
  color: #7c3aed;
}
.reference-step-grid h3 {
  margin: 9px 0 7px;
  font-size: 18px;
  letter-spacing: -.03em;
}
.reference-step-grid p {
  color: #777;
  font-size: 10px;
  line-height: 1.7;
  margin: 0;
}
.reference-security-section {
  background: #171717;
  color: #fff;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 50px;
  align-items: center;
}
.security-copy {
  max-width: 540px;
}
.security-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 999px;
  color: #d5d5d5;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .1em;
}
.reference-security-section h2 {
  color: #fff;
}
.reference-security-section p {
  color: #a8a8a8;
}
.reference-security-section .reference-secondary-cta {
  margin-top: 22px;
}
.security-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}
.security-grid > div {
  min-height: 135px;
  padding: 17px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 13px;
  background: rgba(255,255,255,.035);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.security-grid svg {
  color: #b78cff;
}
.security-grid strong {
  margin-top: 18px;
  font-size: 10px;
}
.security-grid span {
  margin-top: 5px;
  color: #919191;
  font-size: 8px;
  line-height: 1.5;
}
.reference-pricing-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
}
.reference-pricing-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.reference-footer {
  min-height: 74px;
  padding: 0 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-top: 1px solid #ededed;
  color: #8a8a8a;
  font-size: 9px;
}
.reference-footer .reference-brand {
  color: #171717;
}

/* Reference-inspired sign-in / workspace access page                        */
.reference-auth-page {
  min-height: 100vh;
  padding: 28px 0;
  background: #e8e8e8;
  color: #171717;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.reference-auth-shell {
  width: min(1120px, calc(100% - 32px));
  min-height: calc(100vh - 56px);
  margin: 0 auto;
  border-radius: 22px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 24px 70px rgba(0,0,0,.08);
  display: flex;
  flex-direction: column;
}
.reference-auth-nav {
  height: 68px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
}
.reference-auth-card {
  flex: 1;
  display: grid;
  grid-template-columns: 1.05fr .95fr;
  min-height: 650px;
}
.auth-art-panel {
  position: relative;
  overflow: hidden;
  padding: 56px;
  background: #f7f6f8;
  border-right: 1px solid #ededed;
}
.auth-art-copy {
  position: relative;
  z-index: 3;
  max-width: 450px;
}
.auth-art-copy > span {
  color: #7c3aed;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .15em;
}
.auth-art-copy h1 {
  margin: 12px 0 12px;
  font-size: clamp(34px, 4vw, 55px);
  line-height: 1;
  letter-spacing: -.06em;
}
.auth-art-copy p {
  margin: 0;
  color: #777;
  font-size: 11px;
  line-height: 1.75;
  max-width: 420px;
}
.auth-art-stage {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 360px;
}
.auth-art-line {
  position: absolute;
  height: 1px;
  background: #dedbe4;
  transform-origin: left center;
}
.auth-art-line::after {
  content: "";
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #9a7ad8;
  right: -2px;
  top: -2px;
}
.line-a {
  left: 10%;
  top: 48%;
  width: 300px;
  transform: rotate(12deg);
}
.line-b {
  left: 14%;
  top: 63%;
  width: 270px;
  transform: rotate(-13deg);
}
.line-c {
  right: 9%;
  top: 45%;
  width: 250px;
  transform: rotate(169deg);
}
.auth-floating {
  position: absolute;
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  box-shadow: 0 12px 25px rgba(0,0,0,.08);
  animation: referenceFloat 5.5s ease-in-out infinite;
}
.auth-float-one {
  left: 12%;
  top: 28%;
  color: #6b4c00;
  background: #f5e95a;
}
.auth-float-two {
  right: 12%;
  top: 24%;
  color: #fff;
  background: #e8473e;
  animation-delay: -1.5s;
}
.auth-float-three {
  left: 18%;
  bottom: 9%;
  color: #fff;
  background: #20b7d8;
  animation-delay: -2.7s;
}
.auth-center-card {
  position: absolute;
  left: 50%;
  top: 51%;
  transform: translate(-50%, -50%);
  width: 128px;
  height: 128px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(145deg, #9a61ee, #6d28d9);
  box-shadow: 0 25px 50px rgba(109,40,217,.27);
}
.auth-center-card svg {
  margin-bottom: 7px;
}
.auth-center-card strong {
  font-size: 12px;
}
.auth-center-card span {
  margin-top: 3px;
  color: rgba(255,255,255,.72);
  font-size: 8px;
}
.auth-form-panel {
  padding: 56px 55px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #fff;
}
.auth-form-heading > span {
  color: #8d8d8d;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .14em;
}
.auth-form-heading h2 {
  margin: 9px 0 8px;
  font-size: 31px;
  line-height: 1.05;
  letter-spacing: -.05em;
}
.auth-form-heading p {
  margin: 0;
  color: #7b7b7b;
  font-size: 11px;
  line-height: 1.65;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 30px;
}
.auth-form > label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  color: #353535;
  font-size: 9px;
  font-weight: 750;
}
.auth-form input {
  width: 100%;
  height: 43px;
  border: 1px solid #e3e3e3;
  border-radius: 9px;
  background: #fff;
  color: #171717;
  outline: none;
  padding: 0 12px;
  font-size: 11px;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.auth-form input:focus {
  border-color: #9c73e4;
  box-shadow: 0 0 0 3px rgba(124,58,237,.08);
}
.auth-password {
  position: relative;
}
.auth-password input {
  padding-right: 58px;
}
.auth-password button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: #777;
  font-size: 8px;
  font-weight: 800;
  cursor: pointer;
}
.auth-form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.auth-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #777;
  font-size: 9px;
}
.auth-checkbox input {
  width: 13px;
  height: 13px;
  accent-color: #7c3aed;
}
.auth-forgot {
  border: 0;
  background: transparent;
  color: #6d28d9;
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}
.auth-error {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 11px;
  border-radius: 9px;
  color: #b42318;
  background: #fff1ef;
  border: 1px solid #ffd9d4;
  font-size: 9px;
  line-height: 1.45;
}
.auth-submit {
  height: 45px;
  border: 0;
  border-radius: 9px;
  background: #171717;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 780;
  cursor: pointer;
  box-shadow: 0 12px 25px rgba(0,0,0,.1);
  transition: transform .2s ease, box-shadow .2s ease;
}
.auth-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 15px 30px rgba(0,0,0,.14);
}
.auth-demo-note {
  margin-top: 20px;
  padding: 10px 11px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #858585;
  background: #f8f7fb;
  border: 1px solid #eeeaf7;
  border-radius: 9px;
  font-size: 8px;
  line-height: 1.55;
}
.auth-demo-note svg {
  color: #7c3aed;
  flex: 0 0 auto;
}
.auth-footer {
  background: #fff;
}

/* Command palette                                                            */
.command-backdrop,
.shortcut-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(20, 16, 31, .48);
  backdrop-filter: blur(7px);
  display: grid;
  place-items: start center;
  padding: 12vh 20px 20px;
}
.command-palette {
  width: min(650px, 100%);
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 18px;
  overflow: hidden;
  background: var(--surface);
  box-shadow: 0 35px 90px rgba(0,0,0,.25);
}
.command-search {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 17px;
  border-bottom: 1px solid var(--border);
}
.command-search svg {
  color: var(--accent);
  flex: 0 0 auto;
}
.command-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 14px;
}
.command-search kbd,
.command-footer kbd,
.document-command-input kbd {
  border: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--text-muted);
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 9px;
  font-family: inherit;
}
.command-list {
  max-height: 420px;
  overflow: auto;
  padding: 8px;
}
.command-item {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--text);
  border-radius: 11px;
  min-height: 58px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 11px;
  text-align: left;
  cursor: pointer;
}
.command-item:hover,
.command-item.active {
  background: var(--accent-softer);
}
.command-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--accent-soft);
  color: var(--accent);
  flex: 0 0 auto;
}
.command-item > span:nth-child(2) {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.command-item strong {
  font-size: 12px;
}
.command-item small {
  color: var(--text-muted);
  font-size: 10px;
}
.command-item > svg {
  color: var(--text-muted);
}
.command-empty {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-muted);
}
.command-empty svg {
  color: var(--accent);
  margin-bottom: 5px;
}
.command-empty strong {
  color: var(--text);
  font-size: 13px;
}
.command-empty span {
  font-size: 11px;
}
.command-footer {
  min-height: 42px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 9px;
}
.command-footer span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Notification panel                                                         */
.notification-panel {
  position: fixed;
  z-index: 450;
  top: 72px;
  right: 22px;
  width: min(390px, calc(100vw - 32px));
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  box-shadow: 0 24px 65px rgba(35,25,55,.18);
  overflow: hidden;
  animation: panelDrop .2s ease-out;
}
@keyframes panelDrop {
  from { opacity: 0; transform: translateY(-7px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.notification-head {
  padding: 15px 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid var(--border);
}
.notification-head span {
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .11em;
}
.notification-head h3 {
  margin: 4px 0 0;
  font-size: 17px;
}
.notification-head button {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--text-muted);
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.notification-list {
  max-height: 390px;
  overflow: auto;
}
.notification-item {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  padding: 13px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  cursor: pointer;
}
.notification-item:hover {
  background: var(--surface-alt);
}
.notification-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
}
.notification-dot.danger {
  background: var(--danger);
  box-shadow: 0 0 0 4px var(--danger-soft);
}
.notification-dot.warning {
  background: var(--warn);
  box-shadow: 0 0 0 4px var(--warn-soft);
}
.notification-dot.info {
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}
.notification-item > span:nth-child(2) {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.notification-item strong {
  font-size: 11px;
}
.notification-item small {
  color: var(--text-muted);
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notification-item > svg {
  color: var(--text-muted);
}
.notification-empty {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--text-muted);
  text-align: center;
}
.notification-empty svg {
  color: var(--success);
  margin-bottom: 4px;
}
.notification-empty strong {
  color: var(--text);
  font-size: 12px;
}
.notification-empty span {
  font-size: 10px;
}
.notification-foot {
  min-height: 43px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 9px;
}
.notification-foot button {
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
}
.notification-button.is-open {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-soft);
}

/* Shortcut modal                                                             */
.shortcut-modal {
  width: min(480px, 100%);
  padding: 20px;
  border-radius: 17px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 30px 80px rgba(0,0,0,.25);
}
.shortcut-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 15px;
}
.shortcut-head span {
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .12em;
}
.shortcut-head h2 {
  margin: 5px 0 0;
  font-size: 21px;
}
.shortcut-head button {
  width: 31px;
  height: 31px;
  border: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--text-muted);
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 18px;
}
.shortcut-list > div {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 11px;
}
.shortcut-list kbd {
  min-width: 90px;
  text-align: center;
  padding: 5px 7px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface-alt);
  color: var(--text);
  font-family: inherit;
  font-size: 9px;
}
.shortcut-close {
  margin-top: 16px;
  width: 100%;
  justify-content: center;
}

/* Toasts                                                                     */
.toast-message {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 650;
  max-width: min(420px, calc(100vw - 32px));
  min-height: 48px;
  padding: 8px 9px 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 18px 45px rgba(0,0,0,.15);
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text);
  font-size: 11px;
  animation: toastIn .25s cubic-bezier(.22,1,.36,1);
}
@keyframes toastIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.toast-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex: 0 0 auto;
}
.toast-message.success .toast-icon {
  background: var(--success-soft);
  color: var(--success);
}
.toast-message.danger .toast-icon {
  background: var(--danger-soft);
  color: var(--danger);
}
.toast-message > span:nth-child(2) {
  flex: 1;
  line-height: 1.45;
}
.toast-message > button {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  cursor: pointer;
  border-radius: 7px;
}
.toast-message > button:hover {
  background: var(--surface-alt);
}

/* Dashboard support modules                                                  */
.workspace-pulse {
  position: relative;
  overflow: hidden;
  margin: 0 0 14px;
  padding: 20px 22px;
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 20px;
  align-items: center;
}
.workspace-pulse::after {
  content: "";
  position: absolute;
  width: 220px;
  height: 220px;
  right: -90px;
  top: -110px;
  border-radius: 50%;
  background: var(--accent-soft);
  opacity: .45;
}
.pulse-copy {
  position: relative;
  z-index: 1;
}
.pulse-copy h2 {
  margin: 5px 0 4px;
  font-size: 19px;
  letter-spacing: -.035em;
}
.pulse-copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
}
.pulse-metrics {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.pulse-metrics > div {
  min-height: 66px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface-alt);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.pulse-metrics strong {
  font-size: 20px;
  letter-spacing: -.04em;
}
.pulse-metrics span {
  color: var(--text-muted);
  font-size: 8px;
  margin-top: 2px;
}
.pulse-track {
  grid-column: 1 / -1;
  height: 5px;
  border-radius: 99px;
  background: var(--accent-softer);
  overflow: hidden;
}
.pulse-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width .5s ease;
}
.quick-action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 9px;
  margin-bottom: 14px;
}
.quick-action-grid > button {
  min-height: 82px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--surface);
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.quick-action-grid > button:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: var(--shadow);
}
.quick-action-grid > button > span:first-child {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex: 0 0 auto;
}
.quick-action-grid > button > span:nth-child(2) {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.quick-action-grid strong {
  font-size: 10px;
}
.quick-action-grid small {
  color: var(--text-muted);
  font-size: 8px;
  line-height: 1.35;
}
.quick-action-grid > button > svg {
  color: var(--text-muted);
}
.insight-strip {
  min-height: 56px;
  margin-bottom: 16px;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: linear-gradient(90deg, var(--accent-softer), var(--surface));
  display: flex;
  align-items: center;
  gap: 10px;
}
.insight-strip > span {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex: 0 0 auto;
}
.insight-strip > div {
  min-width: 0;
  flex: 1;
}
.insight-strip strong {
  font-size: 10px;
}
.insight-strip p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 9px;
}
.insight-strip button,
.text-link-button {
  border: 0;
  background: transparent;
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
  white-space: nowrap;
}
.dashboard-support-grid,
.dashboard-secondary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.section-card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.section-card-heading h2 {
  margin: 4px 0 0;
  font-size: 16px;
  letter-spacing: -.025em;
}
.section-card-heading > svg {
  color: var(--accent);
}
.document-health {
  padding: 19px;
}
.health-ring {
  width: 124px;
  height: 124px;
  margin: 18px auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: conic-gradient(var(--accent) var(--health-value), var(--accent-softer) 0);
  position: relative;
}
.health-ring::after {
  content: "";
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: var(--surface);
}
.health-ring > div {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.health-ring strong {
  font-size: 25px;
  letter-spacing: -.05em;
}
.health-ring span {
  color: var(--text-muted);
  font-size: 8px;
}
.health-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.health-rows button {
  border: 0;
  background: transparent;
  color: var(--text);
  padding: 7px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
}
.health-rows button:last-child {
  border-bottom: 0;
}
.health-rows span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
}
.health-rows i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.health-rows i.high { background: var(--danger); }
.health-rows i.medium { background: var(--warn); }
.health-rows i.low { background: var(--success); }
.health-rows strong {
  font-size: 11px;
}
.recent-analysis-rail {
  padding: 19px;
}
.recent-analysis-list {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
}
.recent-analysis-list > button {
  width: 100%;
  min-height: 52px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
  cursor: pointer;
}
.recent-analysis-list > button:last-child {
  border-bottom: 0;
}
.recent-analysis-list > button:hover .recent-file-copy strong {
  color: var(--accent);
}
.recent-file-icon {
  width: 31px;
  height: 31px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  flex: 0 0 auto;
}
.recent-file-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.recent-file-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10px;
}
.recent-file-copy small {
  color: var(--text-muted);
  font-size: 8px;
}
.recent-risk {
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 7px;
  font-weight: 800;
}
.recent-risk.high { color: var(--danger); background: var(--danger-soft); }
.recent-risk.medium { color: var(--warn); background: var(--warn-soft); }
.recent-risk.low { color: var(--success); background: var(--success-soft); }
.recent-risk.pending { color: var(--text-muted); background: var(--surface-alt); }
.recent-analysis-list > button > svg {
  color: var(--text-muted);
}
.panel-empty,
.smart-empty-state {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-muted);
  gap: 7px;
}
.panel-empty svg,
.smart-empty-icon {
  color: var(--accent);
}
.panel-empty span {
  font-size: 10px;
}
.folder-health-card,
.workspace-checklist,
.activity-timeline,
.comparison-launcher {
  padding: 19px;
}
.folder-health-list,
.checklist-items,
.activity-timeline-list {
  margin-top: 11px;
  display: flex;
  flex-direction: column;
}
.folder-health-list > button {
  width: 100%;
  min-height: 54px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
  cursor: pointer;
}
.folder-health-list > button:last-child {
  border-bottom: 0;
}
.folder-health-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #b57900;
  background: #fff2c8;
  flex: 0 0 auto;
}
.folder-health-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.folder-health-copy strong {
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.folder-health-copy small {
  color: var(--text-muted);
  font-size: 8px;
}
.folder-health-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.folder-health-score strong {
  font-size: 12px;
}
.folder-health-score small {
  color: var(--text-muted);
  font-size: 7px;
}
.checklist-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.checklist-heading h2 {
  margin: 4px 0 0;
  font-size: 16px;
}
.checklist-heading > strong {
  color: var(--accent);
  font-size: 13px;
}
.checklist-progress {
  height: 5px;
  border-radius: 99px;
  background: var(--accent-softer);
  overflow: hidden;
  margin: 12px 0 5px;
}
.checklist-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}
.checklist-items > button {
  width: 100%;
  min-height: 48px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}
.checklist-items > button:last-child {
  border-bottom: 0;
}
.checklist-icon {
  width: 23px;
  height: 23px;
  border: 1px solid var(--border);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--text-muted);
  flex: 0 0 auto;
}
.checklist-items > button.complete .checklist-icon {
  color: #fff;
  background: var(--success);
  border-color: var(--success);
}
.checklist-items > button > span:nth-child(2) {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.checklist-items strong {
  font-size: 9px;
}
.checklist-items small {
  color: var(--text-muted);
  font-size: 8px;
}
.activity-event {
  min-height: 50px;
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 9px;
  border-bottom: 1px solid var(--border);
}
.activity-event:last-child {
  border-bottom: 0;
}
.activity-event-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-soft);
}
.activity-event-dot.analyzed { background: var(--success); box-shadow: 0 0 0 4px var(--success-soft); }
.activity-event-dot.processing { background: var(--warn); box-shadow: 0 0 0 4px var(--warn-soft); }
.activity-event-dot.failed { background: var(--danger); box-shadow: 0 0 0 4px var(--danger-soft); }
.activity-event div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.activity-event strong {
  font-size: 9px;
}
.activity-event span:not(.activity-event-dot) {
  color: var(--text-muted);
  font-size: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-event time {
  color: var(--text-muted);
  font-size: 7px;
}
.comparison-description {
  color: var(--text-muted);
  font-size: 9px;
  line-height: 1.6;
  margin: 9px 0 13px;
}
.comparison-select-grid {
  display: grid;
  grid-template-columns: 1fr 30px 1fr;
  gap: 8px;
  align-items: end;
}
.comparison-select-grid label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 700;
}
.comparison-select-grid select {
  width: 100%;
  height: 37px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 0 8px;
  outline: none;
  font-size: 9px;
}
.comparison-vs {
  height: 37px;
  display: grid;
  place-items: center;
  color: var(--text-muted);
  font-size: 8px;
  font-weight: 800;
}
.comparison-preview {
  margin: 13px 0;
  display: grid;
  grid-template-columns: 1fr 25px 1fr;
  gap: 7px;
  align-items: center;
}
.comparison-preview > div {
  min-width: 0;
  min-height: 37px;
  padding: 0 9px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 8px;
}
.comparison-preview > div svg {
  color: var(--accent);
  flex: 0 0 auto;
}
.comparison-preview > div span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.comparison-preview > strong {
  text-align: center;
  color: var(--accent);
  font-size: 11px;
}
.comparison-launcher .secondary-button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

/* Analysis journey and review score                                          */
.analysis-journey-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 14px 0;
}
.journey-card,
.review-score-card {
  padding: 20px;
}
.status-journey {
  display: flex;
  align-items: flex-start;
  gap: 0;
  margin-top: 24px;
}
.journey-step {
  min-width: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 6px;
  position: relative;
}
.journey-step > span {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--text-muted);
  background: var(--surface);
  font-size: 8px;
  font-weight: 800;
  z-index: 2;
}
.journey-step.done > span {
  border-color: var(--accent);
  color: #fff;
  background: var(--accent);
}
.journey-step.current > span {
  box-shadow: 0 0 0 4px var(--accent-soft);
}
.journey-step small {
  margin-top: 7px;
  color: var(--text-muted);
  font-size: 8px;
}
.journey-step.done small,
.journey-step.current small {
  color: var(--text);
  font-weight: 700;
}
.journey-step > i {
  position: absolute;
  left: 24px;
  right: 0;
  top: 12px;
  height: 1px;
  background: var(--border);
  z-index: 1;
}
.journey-step.done > i {
  background: var(--accent);
}
.review-score-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
.review-score-main h2 {
  margin: 5px 0 3px;
  font-size: 34px;
  letter-spacing: -.055em;
}
.review-score-main p {
  max-width: 250px;
  margin: 0;
  color: var(--text-muted);
  font-size: 9px;
  line-height: 1.5;
}
.review-score-ring {
  width: 82px;
  height: 82px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: conic-gradient(var(--accent) var(--score), var(--accent-softer) 0);
  position: relative;
  flex: 0 0 auto;
}
.review-score-ring::after {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: var(--surface);
}
.review-score-ring > div {
  position: relative;
  z-index: 1;
  font-size: 13px;
  font-weight: 800;
}
.review-score-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 16px 0;
}
.review-score-stats > div {
  padding: 9px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-alt);
}
.review-score-stats strong {
  display: block;
  font-size: 14px;
}
.review-score-stats span {
  color: var(--text-muted);
  font-size: 7px;
}
.confidence-meter {
  margin-top: 10px;
}
.confidence-meter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 8px;
}
.confidence-meter-head strong {
  color: var(--text);
}
.confidence-meter-track {
  height: 5px;
  margin-top: 6px;
  border-radius: 99px;
  background: var(--accent-softer);
  overflow: hidden;
}
.confidence-meter-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

/* Document quick command bar and smart empty states                          */
.document-command-bar {
  position: relative;
  min-height: 66px;
  margin-bottom: 14px;
  padding: 9px 10px 9px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
.document-command-copy {
  min-width: 190px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.document-command-copy span {
  color: var(--text-muted);
  font-size: 7px;
  font-weight: 850;
  letter-spacing: .11em;
}
.document-command-copy strong {
  font-size: 10px;
}
.document-command-input {
  height: 38px;
  min-width: 220px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-alt);
}
.document-command-input svg {
  color: var(--accent);
}
.document-command-input input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 9px;
}
.document-command-upload {
  height: 38px;
  padding: 0 12px;
  border: 0;
  border-radius: 9px;
  background: var(--accent);
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  font-weight: 750;
  cursor: pointer;
}
.document-command-results {
  position: absolute;
  left: 210px;
  right: 75px;
  top: 58px;
  z-index: 30;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 18px 40px rgba(0,0,0,.13);
}
.document-command-results button {
  width: 100%;
  min-height: 34px;
  border: 0;
  background: transparent;
  color: var(--text);
  display: grid;
  grid-template-columns: 18px 1fr auto;
  gap: 7px;
  align-items: center;
  text-align: left;
  border-radius: 7px;
  padding: 0 7px;
  cursor: pointer;
}
.document-command-results button:hover {
  background: var(--accent-softer);
}
.document-command-results button svg {
  color: var(--accent);
}
.document-command-results button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 9px;
}
.document-command-results button small {
  color: var(--text-muted);
  font-size: 7px;
}
.document-command-results > span {
  display: block;
  padding: 11px;
  color: var(--text-muted);
  font-size: 9px;
}
.smart-empty-state {
  min-height: 280px;
  padding: 30px;
}
.smart-empty-icon {
  width: 45px;
  height: 45px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
}
.smart-empty-state h3 {
  margin: 7px 0 0;
  color: var(--text);
  font-size: 14px;
}
.smart-empty-state p {
  max-width: 420px;
  margin: 4px 0 10px;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.6;
}
.metric-sparkline {
  width: 100%;
  height: 45px;
  color: var(--accent);
}

/* Additional responsive polish                                               */
@media (max-width: 1080px) {
  .reference-hero {
    grid-template-columns: 1fr;
    padding: 58px 48px 42px;
  }
  .reference-hero-copy {
    max-width: 760px;
  }
  .reference-hero-art {
    min-height: 430px;
  }
  .reference-feature-grid {
    grid-template-columns: 1fr 1fr;
  }
  .feature-large {
    grid-column: 1 / -1;
  }
  .reference-security-section {
    grid-template-columns: 1fr;
  }
  .security-copy {
    max-width: 760px;
  }
  .workspace-pulse {
    grid-template-columns: 1fr;
  }
  .quick-action-grid {
    grid-template-columns: 1fr 1fr;
  }
  .document-command-copy {
    display: none;
  }
  .document-command-results {
    left: 10px;
  }
}
@media (max-width: 820px) {
  .reference-landing,
  .reference-auth-page {
    padding: 10px 0;
  }
  .reference-page-shell,
  .reference-auth-shell {
    width: calc(100% - 16px);
    border-radius: 17px;
  }
  .reference-nav {
    padding: 0 17px;
  }
  .reference-nav-links {
    display: none;
  }
  .reference-hero {
    padding: 45px 28px 28px;
  }
  .reference-hero h1 {
    font-size: clamp(38px, 10vw, 58px);
  }
  .reference-hero-art {
    min-height: 380px;
    transform: scale(.9);
  }
  .reference-logo-strip {
    align-items: flex-start;
    flex-direction: column;
    padding: 19px 24px;
  }
  .reference-logo-strip > div {
    justify-content: flex-start;
  }
  .reference-feature-section,
  .reference-demo-section,
  .reference-workflow-section,
  .reference-security-section,
  .reference-pricing-section {
    padding: 58px 28px;
  }
  .reference-demo-head {
    align-items: flex-start;
    flex-direction: column;
  }
  .reference-demo-window {
    grid-template-columns: 1fr;
  }
  .demo-window-sidebar {
    display: none;
  }
  .reference-pricing-section {
    flex-direction: column;
    align-items: flex-start;
  }
  .reference-footer {
    padding: 0 22px;
    flex-wrap: wrap;
    min-height: 90px;
  }
  .reference-auth-card {
    grid-template-columns: 1fr;
  }
  .auth-art-panel {
    min-height: 430px;
    padding: 40px 30px;
  }
  .auth-form-panel {
    padding: 40px 30px;
  }
  .auth-art-stage {
    height: 240px;
  }
  .auth-center-card {
    width: 100px;
    height: 100px;
  }
  .auth-floating {
    width: 38px;
    height: 38px;
  }
  .dashboard-support-grid,
  .dashboard-secondary-grid,
  .analysis-journey-grid {
    grid-template-columns: 1fr;
  }
  .pulse-metrics {
    grid-template-columns: repeat(3, 1fr);
  }
  .reference-feature-grid {
    grid-template-columns: 1fr;
  }
  .feature-large {
    grid-column: auto;
  }
}
@media (max-width: 600px) {
  .reference-nav-actions .reference-signin {
    display: none;
  }
  .reference-demo-button {
    min-height: 31px;
    font-size: 8px;
  }
  .reference-hero {
    min-height: auto;
    padding: 38px 21px 22px;
  }
  .reference-hero-copy > p {
    font-size: 11px;
  }
  .reference-hero-art {
    min-height: 310px;
    transform: scale(.78);
    margin: -28px 0;
  }
  .reference-analysis-chip {
    min-width: 225px;
  }
  .reference-mini-card {
    min-width: 140px;
  }
  .reference-logo-strip > div {
    gap: 13px;
  }
  .reference-feature-section,
  .reference-demo-section,
  .reference-workflow-section,
  .reference-security-section,
  .reference-pricing-section {
    padding: 45px 20px;
  }
  .reference-section-heading h2,
  .reference-demo-head h2,
  .reference-security-section h2,
  .reference-pricing-section h2 {
    font-size: 32px;
  }
  .reference-step-grid,
  .security-grid {
    grid-template-columns: 1fr;
  }
  .demo-window-content {
    padding: 15px;
  }
  .demo-kpi-row {
    grid-template-columns: 1fr 1fr;
  }
  .demo-lower-grid {
    grid-template-columns: 1fr;
  }
  .reference-footer {
    align-items: flex-start;
    flex-direction: column;
    padding: 20px;
  }
  .auth-art-panel {
    min-height: 370px;
    padding: 34px 23px;
  }
  .auth-art-copy h1 {
    font-size: 36px;
  }
  .auth-form-panel {
    padding: 34px 23px;
  }
  .reference-auth-nav {
    padding: 0 17px;
  }
  .quick-action-grid {
    grid-template-columns: 1fr;
  }
  .workspace-pulse {
    padding: 16px;
  }
  .pulse-metrics {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .pulse-metrics > div {
    min-height: 58px;
  }
  .insight-strip {
    align-items: flex-start;
  }
  .insight-strip button {
    align-self: center;
  }
  .comparison-select-grid {
    grid-template-columns: 1fr;
  }
  .comparison-vs {
    display: none;
  }
  .comparison-preview {
    grid-template-columns: 1fr;
  }
  .comparison-preview > strong {
    display: none;
  }
  .document-command-bar {
    flex-wrap: wrap;
  }
  .document-command-input {
    order: 2;
    flex-basis: 100%;
  }
  .document-command-upload {
    margin-left: auto;
  }
  .document-command-results {
    top: 108px;
    left: 10px;
    right: 10px;
  }
  .review-score-main {
    align-items: flex-start;
  }
  .status-journey {
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .journey-step {
    min-width: 105px;
  }
  .toast-message {
    right: 12px;
    bottom: 12px;
  }
  .notification-panel {
    top: 62px;
    right: 10px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .reference-orb,
  .reference-mini-card,
  .reference-center-card,
  .reference-center-ring,
  .toast-message,
  .notification-panel {
    animation: none !important;
  }
  .reference-primary-cta,
  .reference-secondary-cta,
  .reference-feature-card,
  .quick-action-grid > button,
  .auth-submit {
    transition: none !important;
  }
}

/* Accessibility and focus states                                             */
.reference-landing button:focus-visible,
.reference-landing a:focus-visible,
.reference-auth-page button:focus-visible,
.reference-auth-page input:focus-visible,
.command-palette button:focus-visible,
.notification-panel button:focus-visible,
.shortcut-modal button:focus-visible,
.dashboard-support-grid button:focus-visible,
.dashboard-secondary-grid button:focus-visible {
  outline: 2px solid #7c3aed;
  outline-offset: 2px;
}
.reference-landing ::selection {
  color: #fff;
  background: #7c3aed;
}

/* Fine-grained dark-mode compatibility for the expanded modules              */
.dark .reference-landing,
.dark .reference-auth-page {
  color: #f5f2ff;
}
.dark .workspace-pulse::after {
  opacity: .18;
}
.dark .quick-action-grid > button:hover,
.dark .recent-analysis-list > button:hover,
.dark .folder-health-list > button:hover {
  background: var(--surface-alt);
}
.dark .notification-panel,
.dark .command-palette,
.dark .shortcut-modal,
.dark .toast-message {
  box-shadow: 0 30px 90px rgba(0,0,0,.4);
}
.dark .reference-landing {
  background: #17131f;
}
.dark .reference-page-shell,
.dark .reference-auth-shell {
  background: #201a2b;
}

/* Component density helpers                                                  */
.density-tight .workspace-pulse,
.density-tight .quick-action-grid,
.density-tight .dashboard-support-grid,
.density-tight .dashboard-secondary-grid {
  margin-bottom: 8px;
}
.density-tight .quick-action-grid > button {
  min-height: 68px;
}
.density-tight .dashboard-support-grid .card,
.density-tight .dashboard-secondary-grid .card {
  padding: 14px;
}
.density-comfortable .workspace-pulse,
.density-comfortable .quick-action-grid,
.density-comfortable .dashboard-support-grid,
.density-comfortable .dashboard-secondary-grid {
  margin-bottom: 16px;
}
.density-spacious .workspace-pulse,
.density-spacious .quick-action-grid,
.density-spacious .dashboard-support-grid,
.density-spacious .dashboard-secondary-grid {
  margin-bottom: 22px;
}
.density-spacious .quick-action-grid > button {
  min-height: 95px;
}

/* Presentation-ready print helpers                                           */
@media print {
  .sidebar,
  .topbar,
  .mobile-overlay,
  .upload-modal-backdrop,
  .analytics-modal-backdrop,
  .command-backdrop,
  .shortcut-backdrop,
  .notification-panel,
  .toast-message,
  .presentation-top,
  .presentation-controls {
    display: none !important;
  }
  .app,
  .main,
  .page-content {
    background: #fff !important;
    color: #000 !important;
  }
  .page-content {
    padding: 0 !important;
  }
  .card,
  .reference-feature-card,
  .reference-demo-window {
    box-shadow: none !important;
    break-inside: avoid;
  }
}


/* 2026 VISUAL POLISH LAYER                                                   */

:root {
  --ds-primary: #7c3aed;
  --ds-primary-2: #a855f7;
  --ds-ink: #17121f;
  --ds-muted: #71677d;
  --ds-line: rgba(24, 18, 31, .09);
  --ds-card: rgba(255, 255, 255, .82);
  --ds-shadow: 0 18px 60px rgba(35, 20, 55, .10);
  --ds-shadow-hover: 0 24px 80px rgba(35, 20, 55, .16);
}
.app {
  background:
    radial-gradient(circle at 88% 0%, rgba(124,58,237,.07), transparent 28%),
    radial-gradient(circle at 12% 80%, rgba(59,130,246,.045), transparent 30%),
    var(--surface, #f7f5fa);
}
.app .card {
  border: 1px solid var(--ds-line);
  box-shadow: var(--ds-shadow);
  backdrop-filter: blur(18px);
}
.app .card:hover {
  box-shadow: var(--ds-shadow-hover);
}
.primary-button,
.secondary-button,
.dash-heading-actions button,
.reference-primary-cta,
.reference-secondary-cta,
.auth-submit {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}
.primary-button::after,
.secondary-button::after,
.reference-primary-cta::after,
.reference-secondary-cta::after,
.auth-submit::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,.28), transparent 65%);
  transform: translateX(-120%);
  transition: transform .55s ease;
  pointer-events: none;
}
.primary-button:hover::after,
.secondary-button:hover::after,
.reference-primary-cta:hover::after,
.reference-secondary-cta:hover::after,
.auth-submit:hover::after {
  transform: translateX(120%);
}
.dash-heading-actions {
  flex-wrap: wrap;
}
.dash-heading-actions button {
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}
.dash-heading-actions button:hover {
  transform: translateY(-2px);
}
.global-search {
  border: 1px solid rgba(124,58,237,.10);
  box-shadow: 0 8px 28px rgba(32,20,50,.06);
  transition: width .3s ease, border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.global-search:focus-within {
  border-color: rgba(124,58,237,.35);
  box-shadow: 0 12px 36px rgba(124,58,237,.12);
  transform: translateY(-1px);
}
.nav-item {
  transition: transform .2s ease, background .2s ease, color .2s ease;
}
.nav-item:hover {
  transform: translateX(3px);
}
.nav-item.active {
  box-shadow: inset 3px 0 0 var(--ds-primary), 0 8px 22px rgba(124,58,237,.08);
}
.quick-action-grid > button {
  border: 1px solid var(--ds-line);
  box-shadow: 0 10px 35px rgba(32,20,50,.06);
  transition: transform .24s ease, box-shadow .24s ease, border-color .24s ease;
}
.quick-action-grid > button:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 55px rgba(32,20,50,.12);
  border-color: rgba(124,58,237,.25);
}
.recent-analysis-list > button,
.folder-health-list > button,
.health-rows > button {
  transition: transform .2s ease, background .2s ease, padding .2s ease;
}
.recent-analysis-list > button:hover,
.folder-health-list > button:hover,
.health-rows > button:hover {
  transform: translateX(3px);
}
.notification-panel,
.command-palette,
.shortcut-modal {
  border: 1px solid rgba(124,58,237,.12);
  box-shadow: 0 35px 100px rgba(24,16,34,.22);
  backdrop-filter: blur(24px);
}
.toast-message {
  border: 1px solid rgba(255,255,255,.55);
  box-shadow: 0 20px 60px rgba(24,16,34,.18);
  backdrop-filter: blur(20px);
}
.reference-landing {
  background:
    radial-gradient(circle at 15% 10%, rgba(168,85,247,.08), transparent 28%),
    radial-gradient(circle at 90% 40%, rgba(59,130,246,.08), transparent 25%),
    #fbfafc;
}
.reference-hero {
  position: relative;
}
.reference-hero-copy h1 {
  letter-spacing: -.045em;
}
.reference-feature-card {
  transition: transform .28s ease, box-shadow .28s ease, border-color .28s ease;
}
.reference-feature-card:hover {
  transform: translateY(-7px);
  box-shadow: 0 30px 80px rgba(40,20,60,.13);
  border-color: rgba(124,58,237,.16);
}
.reference-demo-window {
  box-shadow: 0 35px 100px rgba(35,20,55,.15);
  border-color: rgba(124,58,237,.12);
}
.reference-primary-cta,
.reference-secondary-cta {
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}
.reference-primary-cta:hover,
.reference-secondary-cta:hover {
  transform: translateY(-3px);
}
.reference-primary-cta:hover {
  box-shadow: 0 16px 40px rgba(124,58,237,.22);
}
.reference-auth-card {
  box-shadow: 0 35px 100px rgba(35,20,55,.13);
  border-color: rgba(124,58,237,.10);
}
.theme-switch {
  transition: transform .22s ease;
}
.theme-switch:hover {
  transform: rotate(-4deg) scale(1.04);
}
.document-command-results {
  box-shadow: 0 24px 70px rgba(24,16,34,.18);
  border: 1px solid rgba(124,58,237,.10);
}
.status-journey .journey-step {
  transition: transform .2s ease, opacity .2s ease;
}
.status-journey .journey-step:hover {
  transform: translateY(-2px);
}
@media (max-width: 900px) {
  .dash-heading-actions {
    width: 100%;
  }
  .dash-heading-actions > button {
    flex: 1 1 150px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .app *,
  .reference-landing *,
  .reference-auth-page * {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
  }
}

/* Reusable visual utility aliases. These intentionally use existing tokens so
   the new polish layer remains compatible with the original design system. */
.ds-surface { background: var(--surface, #fff); }
.ds-surface-alt { background: var(--surface-alt, #f6f3f8); }
.ds-border { border: 1px solid var(--ds-line); }
.ds-shadow { box-shadow: var(--ds-shadow); }
.ds-shadow-hover:hover { box-shadow: var(--ds-shadow-hover); }
.ds-radius-sm { border-radius: 10px; }
.ds-radius-md { border-radius: 16px; }
.ds-radius-lg { border-radius: 24px; }
.ds-transition { transition: all .22s ease; }
.ds-hover-lift:hover { transform: translateY(-3px); }
.ds-text-muted { color: var(--ds-muted); }
.ds-text-primary { color: var(--ds-primary); }
.ds-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); }
.ds-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); }
.ds-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); }
.ds-flex { display: flex; }
.ds-items-center { align-items: center; }
.ds-justify-between { justify-content: space-between; }
.ds-gap-1 { gap: 4px; }
.ds-gap-2 { gap: 8px; }
.ds-gap-3 { gap: 12px; }
.ds-gap-4 { gap: 16px; }
.ds-gap-5 { gap: 20px; }
.ds-gap-6 { gap: 24px; }
.ds-p-2 { padding: 8px; }
.ds-p-3 { padding: 12px; }
.ds-p-4 { padding: 16px; }
.ds-p-5 { padding: 20px; }
.ds-p-6 { padding: 24px; }
.ds-w-full { width: 100%; }
.ds-min-0 { min-width: 0; }
.ds-overflow-hidden { overflow: hidden; }
.ds-relative { position: relative; }
.ds-sticky { position: sticky; top: 0; }
.ds-pointer { cursor: pointer; }
.ds-select-none { user-select: none; }


@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
  }
}

/* ==========================================================================
   Open Ledger Docs reference-theme upgrade
   Inspired by the supplied purple/coral landing-page direction.
   ========================================================================== */

.ds-reference-landing {
  min-height: 100vh;
  padding: 28px 0;
  color: #15233f;
  background:
    radial-gradient(circle at 8% 8%, rgba(126, 58, 237, .95) 0, rgba(126, 58, 237, .5) 18%, transparent 42%),
    radial-gradient(circle at 94% 8%, rgba(255, 115, 77, .96) 0, rgba(255, 115, 77, .55) 22%, transparent 44%),
    linear-gradient(135deg, #8d35e8 0%, #b04edc 35%, #f57c72 72%, #ff9b57 100%);
  overflow: hidden;
}

.ds-reference-shell {
  width: min(1290px, calc(100% - 44px));
  border-radius: 28px;
  background: #fffaf8;
  box-shadow: 0 35px 100px rgba(49, 19, 77, .24);
}

.ds-reference-nav {
  min-height: 76px;
  padding: 0 40px;
  border-bottom: 1px solid rgba(31, 35, 61, .07);
  background: rgba(255, 250, 248, .92);
  backdrop-filter: blur(18px);
}

.ds-brand {
  font-size: 17px;
  letter-spacing: -.045em;
}

.ds-brand-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 800;
  letter-spacing: -.045em;
}
.ds-brand-open {
  color: var(--text, #221D3D);
}
.ds-brand-accent {
  background: linear-gradient(135deg, #7C3AED 0%, #9333EA 55%, #6D28D9 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #7C3AED;
}


.ds-brand-mark {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: linear-gradient(135deg, #6d28d9, #9333ea 55%, #f05f54);
  box-shadow: 0 9px 22px rgba(124, 58, 237, .24);
}

.ds-nav-links {
  gap: 32px;
}

.ds-nav-links a {
  color: #18233e;
  font-size: 11px;
  font-weight: 700;
}

.ds-nav-links a:hover {
  color: #6d28d9;
}

.ds-nav-actions {
  gap: 8px;
}

.ds-round-theme {
  width: 40px;
  height: 40px;
  border: 1px solid #dddbe6;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  color: #17213b;
  cursor: pointer;
  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease;
}

.ds-round-theme:hover {
  transform: translateY(-2px);
  border-color: rgba(124, 58, 237, .35);
  box-shadow: 0 8px 22px rgba(53, 29, 77, .10);
}

.ds-round-theme.is-active {
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.dark .ds-round-theme {
  background: var(--surface);
  border-color: var(--border);
  color: var(--text);
}

.ds-reference-hero {
  min-height: 650px;
  padding: 70px 58px 58px;
  grid-template-columns: .92fr 1.08fr;
  gap: 28px;
  background:
    radial-gradient(circle at 75% 26%, rgba(251, 176, 229, .35), transparent 23%),
    radial-gradient(circle at 95% 60%, rgba(255, 179, 135, .22), transparent 28%),
    linear-gradient(120deg, #fffaf9 0%, #fff8f7 55%, #fff4f1 100%);
}

.ds-reference-hero::before {
  width: 600px;
  height: 600px;
  right: -230px;
  top: -250px;
  background: rgba(250, 213, 246, .5);
}

.ds-reference-hero::after {
  background: rgba(246, 231, 255, .55);
}

.ds-hero-copy {
  max-width: 590px;
}

.ds-eyebrow {
  padding: 8px 13px;
  border-radius: 999px;
  color: #6741ca;
  background: linear-gradient(90deg, #efe4ff, #f7ddf8);
  box-shadow: 0 7px 20px rgba(124, 58, 237, .08);
  font-size: 10px;
  letter-spacing: .08em;
}

.ds-eyebrow svg {
  color: #7c3aed;
}

.ds-reference-hero h1 {
  font-size: clamp(45px, 5.2vw, 73px);
  line-height: .98;
  color: #12233f;
  letter-spacing: -.065em;
}

.ds-gradient-text {
  background: linear-gradient(90deg, #6734e8 0%, #c84bba 48%, #ef665c 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent !important;
}

.ds-hero-copy > p {
  max-width: 515px;
  color: #53647e;
  font-size: 13px;
  line-height: 1.75;
  margin-top: 24px;
}

.ds-hero-actions {
  margin-top: 27px;
}

.ds-primary-cta {
  min-height: 49px;
  padding: 0 18px;
  border-radius: 13px;
  background: linear-gradient(100deg, #7225e8 0%, #a637df 46%, #ff6c59 100%);
  box-shadow: 0 15px 30px rgba(126, 58, 237, .22);
  font-size: 11px;
}

.ds-secondary-cta {
  min-height: 49px;
  padding: 0 18px;
  border-radius: 13px;
  background: rgba(255,255,255,.72);
  border: 1px solid #dddbe6;
  color: #16243f;
  font-size: 11px;
}

.ds-trust-row {
  margin-top: 25px;
}

.ds-trust-row span {
  color: #53647e;
  font-size: 10px;
}

.ds-trust-row svg {
  color: #7c3aed;
}

.ds-landing-visual {
  min-height: 500px;
  isolation: isolate;
}

.ds-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(1px);
  pointer-events: none;
}

.ds-glow-one {
  width: 410px;
  height: 410px;
  left: 18%;
  top: 8%;
  background: radial-gradient(circle, rgba(235, 121, 214, .32), rgba(235, 121, 214, 0) 68%);
}

.ds-glow-two {
  width: 300px;
  height: 300px;
  right: 4%;
  bottom: 2%;
  background: radial-gradient(circle, rgba(255, 131, 104, .22), rgba(255, 131, 104, 0) 68%);
}

.ds-document-preview {
  position: absolute;
  left: 8%;
  top: 13%;
  width: 48%;
  min-height: 355px;
  padding: 23px 22px;
  border-radius: 17px;
  background: rgba(255,255,255,.96);
  border: 1px solid rgba(221, 217, 231, .9);
  box-shadow: 0 25px 65px rgba(78, 39, 91, .15);
  transform: rotate(-3deg);
  z-index: 2;
}

.ds-document-preview::before {
  content: "";
  position: absolute;
  inset: 12px -12px -12px 12px;
  border-radius: inherit;
  background: rgba(255,255,255,.5);
  border: 1px solid rgba(255,255,255,.6);
  z-index: -1;
}

.ds-paper-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ds-pdf-badge {
  padding: 5px 8px;
  border-radius: 7px;
  color: #fff;
  background: #f44348;
  font-size: 8px;
  font-weight: 850;
}

.ds-paper-menu {
  color: #9da2b0;
  letter-spacing: 2px;
}

.ds-paper-title {
  margin-top: 23px;
  font-size: 15px;
  font-weight: 800;
  color: #1b2944;
}

.ds-paper-subtitle {
  margin-top: 4px;
  color: #8b92a1;
  font-size: 8px;
}

.ds-paper-lines {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 25px;
}

.ds-paper-lines i {
  height: 6px;
  border-radius: 99px;
  background: #dfe2e8;
}

.ds-paper-lines i:nth-child(1) { width: 86%; }
.ds-paper-lines i:nth-child(2) { width: 74%; }
.ds-paper-lines i:nth-child(3) { width: 91%; }
.ds-paper-lines i:nth-child(4) { width: 66%; }
.ds-paper-lines i:nth-child(5) { width: 88%; }
.ds-paper-lines i:nth-child(6) { width: 77%; }
.ds-paper-lines i:nth-child(7) { width: 93%; }
.ds-paper-lines i:nth-child(8) { width: 62%; }

.ds-paper-highlight {
  margin-top: 23px;
  padding: 9px 10px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #6d28d9;
  background: #f3ebff;
  border-radius: 9px;
  font-size: 8px;
  font-weight: 800;
}

.ds-analysis-preview {
  position: absolute;
  right: 2%;
  top: 19%;
  width: 50%;
  min-height: 360px;
  padding: 18px;
  border: 1px solid rgba(225, 217, 232, .95);
  border-radius: 18px;
  background: rgba(255,255,255,.98);
  box-shadow: 0 28px 70px rgba(73, 36, 84, .17);
  z-index: 4;
  animation: dsAnalysisFloat 5.5s ease-in-out infinite;
}

@keyframes dsAnalysisFloat {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}

.ds-analysis-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.ds-analysis-kicker {
  color: #9a87b9;
  font-size: 7px;
  font-weight: 850;
  letter-spacing: .12em;
}

.ds-analysis-top h3 {
  margin: 5px 0 0;
  font-size: 15px;
  letter-spacing: -.03em;
  color: #17243f;
}

.ds-complete-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 999px;
  color: #6d28d9;
  background: #f1e9ff;
  font-size: 7px;
  font-weight: 800;
}

.ds-type-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 17px;
  padding: 10px;
  border-radius: 10px;
  background: linear-gradient(90deg, #f2eaff, #fbf1ff);
}

.ds-type-icon {
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #6d28d9;
  background: #fff;
}

.ds-type-box div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ds-type-box small,
.ds-key-info > span,
.ds-summary > span {
  color: #9196a4;
  font-size: 7px;
}

.ds-type-box strong {
  color: #26334d;
  font-size: 9px;
}

.ds-key-info {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 16px;
}

.ds-key-info b {
  color: #516079;
  font-size: 8px;
  font-weight: 650;
}

.ds-key-info em {
  color: #283750;
  font-style: normal;
  font-weight: 750;
}

.ds-summary {
  margin-top: 15px;
}

.ds-summary p {
  margin: 5px 0 0;
  color: #69758a;
  font-size: 8px;
  line-height: 1.55;
}

.ds-analysis-button {
  width: 100%;
  min-height: 36px;
  margin-top: 15px;
  border: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  background: linear-gradient(100deg, #6d28d9, #a53ddd 48%, #ff725c);
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 9px 22px rgba(124,58,237,.18);
}

.ds-floating-chip {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(225, 220, 231, .95);
  background: rgba(255,255,255,.97);
  box-shadow: 0 15px 35px rgba(60, 32, 74, .12);
  z-index: 6;
  animation: dsChipFloat 5.5s ease-in-out infinite;
}

@keyframes dsChipFloat {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.ds-floating-chip > span {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: #6d28d9;
  background: #f1e9ff;
}

.ds-floating-chip div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ds-floating-chip strong {
  color: #27344c;
  font-size: 8px;
}

.ds-floating-chip small {
  color: #949aaa;
  font-size: 7px;
}

.ds-upload-chip {
  right: 35%;
  top: 7%;
}

.ds-file-chip {
  left: 4%;
  bottom: 12%;
  animation-delay: -1.7s;
}

.ds-file-chip > span {
  color: #6d28d9;
}

.ds-feature-dock {
  position: absolute;
  right: 10%;
  bottom: 3%;
  display: flex;
  gap: 7px;
  padding: 8px;
  border: 1px solid rgba(225,220,231,.9);
  border-radius: 13px;
  background: rgba(255,255,255,.82);
  box-shadow: 0 13px 30px rgba(60,32,74,.10);
  z-index: 5;
}

.ds-feature-dock span {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: #6d28d9;
  background: #f6efff;
}

.ds-feature-dock span:nth-child(3),
.ds-feature-dock span:nth-child(4) {
  color: #f06b58;
  background: #fff0ec;
}

.ds-capability-strip {
  padding: 27px 42px;
  background: #fff;
}

.ds-capability-strip > span {
  color: #24324c;
  font-size: 9px;
}

.ds-capability-strip > div {
  gap: 26px;
}

.ds-capability-strip b {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #56657d;
  font-size: 9px;
}

.ds-capability-strip b svg {
  color: #7c3aed;
}

.ds-feature-section,
.ds-workflow-section {
  background: #fffaf9;
}

.ds-feature-card {
  background: rgba(255,255,255,.8);
  border-color: #eee7f0;
}

.ds-demo-section {
  background: linear-gradient(180deg, #fff8f6, #faf5ff);
}

.ds-demo-window {
  border-color: rgba(124,58,237,.13);
  box-shadow: 0 30px 90px rgba(66, 35, 90, .15);
}

.ds-security-section {
  background: linear-gradient(135deg, #19112c 0%, #26163c 52%, #3a1d4b 100%);
}

.ds-final-cta {
  background:
    radial-gradient(circle at 10% 20%, rgba(168,85,247,.12), transparent 30%),
    linear-gradient(135deg, #fffaf8, #fff4f1);
}

.ds-faq-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 0 62px 70px;
  background: #fffaf8;
}

.ds-faq-strip > div {
  padding: 18px;
  border: 1px solid #eee5ef;
  border-radius: 15px;
  background: rgba(255,255,255,.72);
}

.ds-faq-strip strong {
  display: block;
  color: #24324c;
  font-size: 11px;
}

.ds-faq-strip span {
  display: block;
  margin-top: 7px;
  color: #718097;
  font-size: 9px;
  line-height: 1.6;
}

.ds-footer {
  background: #fffaf8;
  border-top-color: #eee5ef;
}

/* Workspace uses the same violet / coral visual language as the landing page. */
.app {
  --bg: #f8f4fb;
  --surface: #fffdfd;
  --surface-alt: #fbf7ff;
  --border: #ebe2f2;
  --text: #17243f;
  --text-muted: #6f7890;
  --accent: #7c3aed;
  --accent-dark: #6024c7;
  --accent-soft: #f0e7ff;
  --accent-softer: #f8f2ff;
  --gradient: linear-gradient(135deg, #7028e8, #a63bdd 55%, #ff725c);
  background:
    radial-gradient(circle at 100% 0, rgba(255,111,91,.08), transparent 25%),
    radial-gradient(circle at 0 60%, rgba(124,58,237,.07), transparent 27%),
    #f8f4fb;
}

.app.dark {
  --bg: #171222;
  --surface: #20182d;
  --surface-alt: #271d36;
  --border: #3a2c4c;
  --text: #f7f3fb;
  --text-muted: #aca1bd;
  --accent: #a56bff;
  --accent-dark: #b986ff;
  --accent-soft: #302044;
  --accent-softer: #281c39;
  background:
    radial-gradient(circle at 100% 0, rgba(255,111,91,.08), transparent 25%),
    radial-gradient(circle at 0 60%, rgba(124,58,237,.12), transparent 27%),
    #171222;
}

.sidebar {
  background: rgba(255,253,253,.93);
  border-right: 1px solid #ebe2f2;
  box-shadow: 10px 0 35px rgba(64,31,86,.05);
  backdrop-filter: blur(18px);
}

.dark .sidebar {
  background: rgba(29,21,41,.94);
  border-right-color: #3a2c4c;
}

.topbar {
  background: rgba(255,253,253,.82);
  border-bottom-color: rgba(235,226,242,.85);
  backdrop-filter: blur(18px);
}

.dark .topbar {
  background: rgba(23,18,34,.78);
  border-bottom-color: #3a2c4c;
}

.page-content {
  background: transparent;
}

.app .card {
  border-radius: 20px;
  border-color: rgba(124,58,237,.10);
  box-shadow: 0 14px 45px rgba(58, 28, 78, .07);
}

.app .card:hover {
  box-shadow: 0 22px 65px rgba(58, 28, 78, .11);
}

.logo-icon,
.large-file-icon,
.analysis-empty-icon {
  background: linear-gradient(135deg, #6d28d9, #a63bdd 58%, #ff725c);
  box-shadow: 0 10px 24px rgba(124,58,237,.2);
}

.primary-button {
  background: linear-gradient(100deg, #6d28d9, #a63bdd 55%, #ff725c);
  box-shadow: 0 10px 25px rgba(124,58,237,.18);
}

.primary-button:hover {
  box-shadow: 0 16px 34px rgba(124,58,237,.24);
}

.large-upload {
  background:
    radial-gradient(circle at 15% 10%, rgba(168,85,247,.11), transparent 28%),
    radial-gradient(circle at 85% 90%, rgba(255,114,92,.10), transparent 25%),
    rgba(255,255,255,.82);
  border-color: rgba(124,58,237,.18);
  box-shadow: 0 25px 75px rgba(58,28,78,.08);
}

.large-upload.dragging {
  border-color: #7c3aed;
  background: #faf5ff;
}

.analysis-hero {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0, rgba(255,112,92,.14), transparent 32%),
    radial-gradient(circle at 0 100%, rgba(124,58,237,.12), transparent 30%),
    rgba(255,255,255,.9);
}

.analysis-hero::after {
  content: "";
  position: absolute;
  width: 260px;
  height: 260px;
  right: -110px;
  top: -120px;
  border-radius: 50%;
  background: rgba(235,121,214,.15);
  pointer-events: none;
}

.analysis-review-card {
  background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(249,242,255,.92));
}

.analysis-stats-card {
  background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(255,245,241,.9));
}

.review-score-ring {
  box-shadow: 0 12px 35px rgba(124,58,237,.13);
}

.status-journey .journey-step.active .journey-dot {
  background: linear-gradient(135deg, #6d28d9, #ff725c);
}

.finding-row.high {
  border-color: rgba(220,38,38,.15);
}

.sidebar .nav-item.active {
  background: linear-gradient(90deg, rgba(124,58,237,.12), rgba(255,114,92,.06));
  color: #6d28d9;
}

.dark .sidebar .nav-item.active {
  color: #c4a2ff;
  background: linear-gradient(90deg, rgba(124,58,237,.2), rgba(255,114,92,.08));
}

@media (max-width: 1050px) {
  .ds-reference-hero {
    grid-template-columns: 1fr;
  }
  .ds-hero-copy {
    max-width: 760px;
  }
  .ds-landing-visual {
    min-height: 540px;
    width: min(720px, 100%);
    margin: 0 auto;
  }
}

@media (max-width: 760px) {
  .ds-reference-landing {
    padding: 10px 0;
  }
  .ds-reference-shell {
    width: min(100% - 18px, 1290px);
    border-radius: 20px;
  }
  .ds-reference-nav {
    padding: 0 17px;
  }
  .ds-nav-links {
    display: none;
  }
  .ds-round-theme {
    width: 34px;
    height: 34px;
  }
  .ds-reference-hero {
    padding: 48px 22px 35px;
    min-height: auto;
  }
  .ds-reference-hero h1 {
    font-size: clamp(40px, 12vw, 58px);
  }
  .ds-landing-visual {
    min-height: 510px;
    transform: scale(.96);
    transform-origin: center top;
  }
  .ds-document-preview {
    left: 2%;
    width: 54%;
  }
  .ds-analysis-preview {
    right: 0;
    width: 56%;
  }
  .ds-upload-chip {
    right: 25%;
  }
  .ds-file-chip {
    left: 0;
  }
  .ds-feature-dock {
    right: 3%;
  }
  .ds-capability-strip {
    padding: 22px;
    display: block;
  }
  .ds-capability-strip > div {
    margin-top: 15px;
    justify-content: flex-start;
  }
  .ds-feature-section,
  .ds-demo-section,
  .ds-workflow-section,
  .ds-security-section,
  .ds-final-cta {
    padding: 55px 24px;
  }
  .ds-faq-strip {
    grid-template-columns: 1fr;
    padding: 0 24px 55px;
  }
}

@media (max-width: 560px) {
  .ds-reference-hero {
    overflow: visible;
  }
  .ds-landing-visual {
    min-height: 590px;
    transform: none;
  }
  .ds-document-preview {
    left: 3%;
    top: 12%;
    width: 62%;
    min-height: 320px;
  }
  .ds-analysis-preview {
    right: 0;
    top: 27%;
    width: 67%;
    min-height: 330px;
  }
  .ds-upload-chip {
    right: 2%;
    top: 4%;
  }
  .ds-file-chip {
    left: 1%;
    bottom: 12%;
  }
  .ds-feature-dock {
    right: 1%;
    bottom: 2%;
  }
  .ds-floating-chip {
    transform: scale(.9);
    transform-origin: left center;
  }
  .ds-capability-strip > div {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 13px;
  }
  .reference-feature-grid,
  .reference-step-grid {
    grid-template-columns: 1fr;
  }
  .reference-demo-window {
    grid-template-columns: 1fr;
  }
  .demo-window-sidebar {
    display: none;
  }
  .demo-kpi-row {
    grid-template-columns: 1fr 1fr;
  }
  .demo-lower-grid {
    grid-template-columns: 1fr;
  }
  .ds-final-cta {
    flex-direction: column;
    align-items: flex-start;
  }
}


/* Desktop landing expansion + functional settings/checkout */
.ds-reference-landing { min-height: 100vh; padding: 0; background: linear-gradient(135deg,#8b3df0 0%,#c34bdc 38%,#ff6f5b 100%); }
.ds-reference-shell { width: 100%; min-height: 100vh; margin: 0; border-radius: 0; box-shadow: none; background: rgba(255,255,255,.96); }
.ds-reference-nav { min-height: 76px; padding: 0 clamp(28px,6vw,92px); }
.ds-reference-hero { min-height: calc(100vh - 76px); padding: clamp(60px,8vh,110px) clamp(28px,8vw,112px); grid-template-columns: minmax(0, .95fr) minmax(520px, 1.05fr); gap: clamp(30px,5vw,90px); background: linear-gradient(135deg,#fff 0%,#fff7fb 52%,#fff2ef 100%); }
.ds-reference-hero::before { width: 680px; height: 680px; right: -180px; top: -250px; background: radial-gradient(circle,rgba(245,168,220,.45),rgba(245,168,220,0)); }
.ds-reference-hero h1 { font-size: clamp(50px,6.2vw,94px); }
.ds-hero-copy > p { max-width: 590px; font-size: clamp(13px,1vw,16px); }
.ds-landing-visual { min-height: min(650px,72vh); transform: scale(1.02); }
.ds-reference-landing .reference-feature-section,.ds-reference-landing .reference-demo-section,.ds-reference-landing .reference-workflow-section,.ds-reference-landing .reference-security-section,.ds-reference-landing .reference-pricing-section { padding-left: clamp(28px,8vw,112px); padding-right: clamp(28px,8vw,112px); }
.settings-heading-actions { display:flex; gap:10px; align-items:center; }
.settings-card-heading { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:18px; }
.settings-save-note { margin-top:14px; padding:10px 12px; border-radius:12px; background:var(--accent-soft); color:var(--accent); display:flex; align-items:center; gap:7px; font-size:12px; }
.setting-toggle-button { width:100%; border:0; text-align:left; background:transparent; color:inherit; cursor:pointer; padding:12px 0; display:flex; justify-content:space-between; align-items:center; gap:18px; border-bottom:1px solid var(--border); }
.setting-toggle-button:last-child { border-bottom:0; }
.setting-toggle-button:hover { background:linear-gradient(90deg,transparent,var(--accent-soft),transparent); }
.checkout-backdrop { position:fixed; inset:0; z-index:1000; background:rgba(20,10,30,.55); backdrop-filter:blur(12px); display:flex; align-items:center; justify-content:center; padding:20px; }
.checkout-modal { width:min(720px,100%); max-height:92vh; overflow:auto; border-radius:24px; background:var(--surface); color:var(--text); box-shadow:0 35px 100px rgba(20,10,30,.3); border:1px solid var(--border); padding:26px; }
.checkout-head { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:20px; }
.checkout-head h2 { margin:5px 0 3px; font-size:26px; }
.checkout-head p { margin:0; color:var(--muted); }
.payment-methods { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:20px; }
.payment-methods button { min-height:72px; padding:12px; border:1px solid var(--border); border-radius:15px; background:var(--surface-2); color:var(--text); display:flex; align-items:center; gap:10px; cursor:pointer; text-align:left; }
.payment-methods button.active { border-color:var(--accent); background:var(--accent-soft); box-shadow:0 0 0 2px rgba(124,58,237,.08); }
.payment-methods button > span { flex:1; display:grid; gap:3px; }
.payment-methods strong { font-size:13px; }
.payment-methods small { color:var(--muted); font-size:11px; }
.checkout-form { display:grid; gap:13px; }
.checkout-form label { display:grid; gap:7px; font-size:12px; font-weight:700; color:var(--muted); }
.checkout-form input { width:100%; box-sizing:border-box; padding:12px 13px; border-radius:12px; border:1px solid var(--border); background:var(--surface); color:var(--text); outline:none; }
.checkout-form input:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(124,58,237,.10); }
.checkout-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.checkout-free { display:flex; align-items:center; gap:12px; padding:18px; border-radius:16px; background:var(--accent-soft); color:var(--text); }
.checkout-free p { margin:4px 0 0; color:var(--muted); font-size:12px; }
.checkout-submit { width:100%; justify-content:center; }
.checkout-disclaimer { color:var(--muted); text-align:center; font-size:10px; }
@media(max-width:1000px){.ds-reference-hero{grid-template-columns:1fr;}.ds-landing-visual{min-height:520px}.payment-methods{grid-template-columns:1fr 1fr;}}
@media(max-width:640px){.ds-reference-hero{min-height:auto}.ds-landing-visual{min-height:400px;transform:none}.settings-heading-actions{width:100%}.settings-heading-actions button{flex:1}.payment-methods,.checkout-row{grid-template-columns:1fr}.checkout-modal{padding:18px;border-radius:18px;}}


/* Account limits modal */
.modal-backdrop{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:24px;background:rgba(8,10,18,.58);backdrop-filter:blur(14px)}
.modal-card{width:min(520px,100%);padding:30px;border:1px solid rgba(120,120,150,.2);border-radius:26px;background:#fff;box-shadow:0 30px 90px rgba(0,0,0,.28)}
.modal-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;margin-bottom:16px}
.modal-card h2{margin:0 0 10px;font-size:24px;letter-spacing:-.03em}
.modal-card p{margin:0;color:#667085;line-height:1.7}
.limit-summary{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0}
.limit-summary div{padding:15px;border-radius:16px;background:#f5f3ff;display:flex;flex-direction:column;gap:5px}
.limit-summary span{font-size:12px;color:#667085}
.limit-summary strong{font-size:18px}
.modal-actions{display:flex;justify-content:flex-end;gap:10px}
.primary-button,.secondary-button{border:0;border-radius:12px;padding:11px 16px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
.primary-button{background:#111827;color:#fff}.secondary-button{background:#f1f3f5;color:#20242b}
.dark .modal-card{background:#11131a;color:#f8fafc}.dark .modal-card p{color:#a8afbf}.dark .limit-summary div{background:#191c25}.dark .secondary-button{background:#242936;color:#fff}


.auth-mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:4px;margin:18px 0;border:1px solid rgba(120,120,150,.16);background:rgba(120,120,150,.07);border-radius:12px}
.auth-mode-switch button{border:0;background:transparent;border-radius:9px;padding:9px 10px;font:inherit;font-weight:700;color:#737b8c;cursor:pointer}
.auth-mode-switch button.active{background:#fff;color:#161922;box-shadow:0 3px 12px rgba(0,0,0,.08)}
.dark .auth-mode-switch button.active{background:#202430;color:#fff}



/* ==========================================================================
   Premium landing + auth polish
   ========================================================================== */

/* Hero depth */
.ds-reference-hero {
  position: relative;
  overflow: hidden;
}
.ds-reference-hero::before,
.ds-reference-hero::after {
  pointer-events: none;
}
.ds-hero-copy {
  position: relative;
  z-index: 4;
}
.ds-reference-hero h1 {
  text-wrap: balance;
  animation: dsHeroTextIn .8s cubic-bezier(.22,1,.36,1) both;
}
.ds-hero-copy > p {
  animation: dsHeroTextIn .8s .08s cubic-bezier(.22,1,.36,1) both;
}
.ds-hero-actions {
  animation: dsHeroTextIn .8s .16s cubic-bezier(.22,1,.36,1) both;
}
.ds-trust-row {
  animation: dsHeroTextIn .8s .22s cubic-bezier(.22,1,.36,1) both;
}
@keyframes dsHeroTextIn {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Hero capability metrics */
.ds-hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  max-width: 590px;
  margin-top: 24px;
}
.ds-hero-metric {
  min-height: 76px;
  padding: 13px 14px;
  border: 1px solid rgba(124,58,237,.12);
  border-radius: 15px;
  background: rgba(255,255,255,.66);
  box-shadow: 0 10px 30px rgba(79,39,91,.06);
  backdrop-filter: blur(12px);
}
.ds-hero-metric strong {
  display: block;
  color: #17213b;
  font-size: 22px;
  line-height: 1;
  letter-spacing: -.04em;
}
.ds-hero-metric span {
  display: block;
  margin-top: 7px;
  color: #6d7890;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .01em;
}
.ds-hero-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 13px;
}
.ds-hero-capabilities span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border: 1px solid rgba(124,58,237,.10);
  border-radius: 999px;
  background: rgba(255,255,255,.5);
  color: #58657c;
  font-size: 9px;
  font-weight: 700;
}
.ds-hero-capabilities svg {
  color: #7c3aed;
}

/* More premium visual motion */
.ds-landing-visual {
  animation: dsVisualIn 1s .08s cubic-bezier(.22,1,.36,1) both;
}
@keyframes dsVisualIn {
  from { opacity: 0; transform: translateY(22px) scale(.98); }
  to { opacity: 1; transform: translateY(0) scale(1.02); }
}
.ds-document-preview,
.ds-analysis-preview {
  transition: transform .45s cubic-bezier(.22,1,.36,1), box-shadow .35s ease;
}
.ds-document-preview:hover {
  transform: rotate(-1deg) translateY(-7px) scale(1.015);
  box-shadow: 0 32px 75px rgba(78,39,91,.20);
}
.ds-analysis-preview:hover {
  transform: translateY(-7px) scale(1.015);
  box-shadow: 0 32px 75px rgba(78,39,91,.20);
}
.ds-floating-chip {
  box-shadow: 0 18px 42px rgba(49,19,77,.13);
}

/* Stronger section rhythm */
.ds-reference-landing .reference-feature-section,
.ds-reference-landing .reference-demo-section,
.ds-reference-landing .reference-workflow-section,
.ds-reference-landing .reference-security-section {
  position: relative;
}
.ds-reference-landing .reference-feature-section::before,
.ds-reference-landing .reference-demo-section::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 0;
  width: min(760px, 70%);
  height: 1px;
  transform: translateX(-50%);
  background: linear-gradient(90deg, transparent, rgba(124,58,237,.15), transparent);
}
.ds-reference-landing .reference-feature-card {
  border-radius: 22px;
  box-shadow: 0 15px 45px rgba(49,19,77,.07);
}
.ds-reference-landing .reference-feature-card:hover {
  transform: translateY(-7px);
  box-shadow: 0 25px 60px rgba(49,19,77,.12);
}

/* Auth page: premium glassy background */
.reference-auth-page {
  position: relative;
  overflow: hidden;
  padding: 24px 0;
  background:
    radial-gradient(circle at 8% 10%, rgba(124,58,237,.22), transparent 30%),
    radial-gradient(circle at 92% 8%, rgba(255,106,89,.18), transparent 28%),
    linear-gradient(135deg, #f3efff 0%, #fff7f8 48%, #fff1ed 100%);
}
.reference-auth-page::before,
.reference-auth-page::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(2px);
}
.reference-auth-page::before {
  width: 420px;
  height: 420px;
  left: -180px;
  bottom: -170px;
  background: radial-gradient(circle, rgba(124,58,237,.17), transparent 68%);
}
.reference-auth-page::after {
  width: 520px;
  height: 520px;
  right: -230px;
  top: -210px;
  background: radial-gradient(circle, rgba(255,105,88,.16), transparent 68%);
}
.reference-auth-shell {
  position: relative;
  z-index: 2;
  width: min(1180px, calc(100% - 36px));
  min-height: calc(100vh - 48px);
  border: 1px solid rgba(255,255,255,.75);
  border-radius: 28px;
  background: rgba(255,255,255,.78);
  box-shadow: 0 35px 100px rgba(49,19,77,.18);
  backdrop-filter: blur(22px);
}
.reference-auth-nav {
  height: 74px;
  padding: 0 32px;
  background: rgba(255,255,255,.58);
}
.reference-auth-card {
  min-height: 680px;
  grid-template-columns: 1.08fr .92fr;
}
.auth-art-panel {
  padding: 58px;
  background:
    radial-gradient(circle at 18% 18%, rgba(124,58,237,.18), transparent 28%),
    radial-gradient(circle at 88% 68%, rgba(255,105,88,.20), transparent 30%),
    linear-gradient(145deg, #f8f5ff 0%, #fff8f7 100%);
}
.auth-art-copy > span {
  display: inline-flex;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(124,58,237,.09);
  color: #6d28d9;
}
.auth-art-copy h1 {
  max-width: 540px;
  font-size: clamp(38px, 4.3vw, 61px);
}
.auth-art-copy p {
  color: #68758c;
  font-size: 12px;
  max-width: 470px;
}
.auth-art-stage {
  height: 390px;
}
.auth-center-card {
  width: 168px;
  height: 168px;
  border-radius: 30px;
  background: linear-gradient(145deg,#7c3aed,#5b21b6 58%,#ef665c);
  box-shadow: 0 30px 70px rgba(109,40,217,.28);
  animation: authCenterFloat 4.5s ease-in-out infinite;
}
@keyframes authCenterFloat {
  0%,100% { transform: translate(-50%,-50%) translateY(0); }
  50% { transform: translate(-50%,-50%) translateY(-9px); }
}
.auth-floating {
  border: 1px solid rgba(255,255,255,.65);
  box-shadow: 0 18px 38px rgba(49,19,77,.13);
}
.auth-form-panel {
  padding: 58px 58px;
  background: rgba(255,255,255,.88);
}
.auth-form-heading h2 {
  font-size: 35px;
}
.auth-form-heading p {
  font-size: 12px;
  color: #6d7890;
}
.auth-benefit-grid {
  display: grid;
  gap: 8px;
  margin-top: 22px;
}
.auth-benefit {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border: 1px solid #ece8f5;
  border-radius: 13px;
  background: linear-gradient(135deg,#fff,#faf8ff);
}
.auth-benefit > span {
  width: 31px;
  height: 31px;
  flex: 0 0 31px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: #f0eaff;
  color: #6d28d9;
}
.auth-benefit:nth-child(2) > span {
  background: #fff0ed;
  color: #e45745;
}
.auth-benefit:nth-child(3) > span {
  background: #eaf7ff;
  color: #1685b5;
}
.auth-benefit strong,
.auth-benefit small {
  display: block;
}
.auth-benefit strong {
  color: #1c2941;
  font-size: 10px;
}
.auth-benefit small {
  margin-top: 2px;
  color: #8490a4;
  font-size: 8.5px;
}
.auth-mode-switch {
  margin-top: 18px;
  margin-bottom: 18px;
  padding: 4px;
  background: #f4f1fa;
  border-color: #e8e3f0;
}
.auth-mode-switch button.active {
  background: #fff;
  color: #5b21b6;
  box-shadow: 0 5px 16px rgba(61,34,105,.10);
}
.auth-form {
  margin-top: 20px;
  gap: 14px;
}
.auth-form input {
  height: 47px;
  border-radius: 12px;
  border-color: #e5e1ed;
  background: rgba(255,255,255,.92);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.auth-form input:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px rgba(124,58,237,.10);
  transform: translateY(-1px);
}
.auth-submit {
  min-height: 48px;
  margin-top: 3px;
  border-radius: 13px;
  background: linear-gradient(100deg,#7225e8,#a637df 52%,#ff6c59);
  box-shadow: 0 15px 30px rgba(126,58,237,.20);
  font-size: 12px;
  position: relative;
  overflow: hidden;
}
.auth-submit::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,.22) 48%, transparent 70%);
  background-size: 220% 100%;
  animation: shimmer 3.2s linear infinite;
  pointer-events: none;
}
.auth-demo-note {
  margin-top: 18px;
  padding: 11px 12px;
  border: 1px solid #e8e1f6;
  border-radius: 13px;
  background: linear-gradient(135deg,#f8f4ff,#fff7f5);
  color: #69758b;
}
.auth-demo-note svg { color: #7c3aed; flex: 0 0 auto; }
.auth-footer {
  background: rgba(255,255,255,.35);
}

@media (max-width: 900px) {
  .ds-hero-metrics { max-width: 700px; }
  .reference-auth-card { grid-template-columns: 1fr; }
  .auth-art-panel { min-height: 500px; }
  .auth-form-panel { padding: 44px 34px; }
}
@media (max-width: 620px) {
  .ds-hero-metrics { grid-template-columns: 1fr 1fr; }
  .ds-hero-metric:last-child { grid-column: 1 / -1; }
  .ds-hero-capabilities { gap: 6px; }
  .ds-hero-capabilities span { font-size: 8px; }
  .reference-auth-shell { width: calc(100% - 16px); border-radius: 20px; }
  .reference-auth-nav { padding: 0 18px; }
  .auth-art-panel { min-height: 450px; padding: 36px 24px; }
  .auth-form-panel { padding: 36px 22px; }
  .auth-form-heading h2 { font-size: 29px; }
}

/* Smart Summarization premium gate */
.smart-summary-card {
  position: relative;
  overflow: hidden;
  padding: 20px;
  border: 1px solid rgba(124,58,237,.16);
  background: linear-gradient(135deg, var(--surface) 0%, rgba(124,58,237,.035) 100%);
}
.smart-summary-card.smart-summary-locked {
  border-color: rgba(124,58,237,.2);
}
.smart-summary-head {
  display: flex;
  align-items: center;
  gap: 13px;
}
.smart-summary-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg,#7c3aed,#ec4899);
  box-shadow: 0 10px 24px rgba(124,58,237,.22);
}
.smart-summary-copy { min-width: 0; flex: 1; }
.smart-summary-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.smart-summary-title-row h2 { margin: 0; font-size: 16px; }
.smart-summary-copy p {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.55;
  max-width: 720px;
}
.premium-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 999px;
  color: #7c3aed;
  background: #f1eafe;
  border: 1px solid rgba(124,58,237,.14);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.smart-summary-action {
  flex: 0 0 auto;
  border: 0;
  border-radius: 11px;
  padding: 10px 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  background: linear-gradient(135deg,#7c3aed,#ec4899);
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 9px 22px rgba(124,58,237,.18);
  transition: transform .2s ease, box-shadow .2s ease;
}
.smart-summary-action:hover { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(124,58,237,.24); }
.smart-summary-action.is-locked { background: #f1eef7; color: #6b637a; box-shadow: none; }
.smart-summary-action.is-locked:hover { transform: none; }
.smart-summary-preview {
  position: relative;
  min-height: 94px;
  margin-top: 15px;
  padding: 14px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface-2);
}
.smart-summary-preview-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.smart-summary-blur-lines { margin-top: 12px; display: grid; gap: 8px; }
.smart-summary-blur-lines span {
  display: block;
  height: 8px;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--border), rgba(124,58,237,.12), var(--border));
}
.smart-summary-blur-lines span:nth-child(1) { width: 92%; }
.smart-summary-blur-lines span:nth-child(2) { width: 78%; }
.smart-summary-blur-lines span:nth-child(3) { width: 58%; }
.smart-summary-locked .smart-summary-blur-lines { filter: blur(5px); opacity: .7; }
.smart-summary-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 14px;
  text-align: center;
  background: linear-gradient(180deg, rgba(255,255,255,.48), rgba(255,255,255,.88));
  backdrop-filter: blur(2px);
}
.smart-summary-lock-icon {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: #7c3aed;
  background: #efe7ff;
}
.smart-summary-lock-overlay strong { font-size: 11px; }
.smart-summary-lock-overlay span { color: var(--muted); font-size: 9px; }
.dark .premium-badge { color: #c4b5fd; background: rgba(124,58,237,.18); }
.dark .smart-summary-action.is-locked { color: #c4bfd0; background: #24202d; }
.dark .smart-summary-lock-overlay { background: linear-gradient(180deg, rgba(17,19,26,.55), rgba(17,19,26,.92)); }
@media (max-width: 760px) {
  .smart-summary-head { align-items: flex-start; flex-wrap: wrap; }
  .smart-summary-action { width: 100%; }
}

/* -------------------------------- */
/* Excel Export Builder              */
/* -------------------------------- */

.excel-builder-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(10, 8, 18, .56);
  backdrop-filter: blur(10px);
  padding: 16px;
  display: grid;
  place-items: center;
}

.excel-builder-overlay.is-dark {
  background: rgba(2, 2, 5, .72);
}

.excel-builder-shell {
  width: min(1480px, 100%);
  height: min(940px, calc(100vh - 32px));
  min-height: 620px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 40px 120px rgba(15, 23, 42, .28);
}

.excel-builder-overlay.is-dark .excel-builder-shell {
  --excel-surface: #15131d;
  --excel-surface-alt: #1b1824;
  --excel-border: #302b3d;
  --excel-text: #f5f3fa;
  --excel-muted: #aaa4ba;
  background: var(--excel-surface);
  color: var(--excel-text);
  border-color: var(--excel-border);
}

.excel-builder-topbar {
  min-height: 82px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.excel-builder-title-wrap {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.excel-builder-title-wrap > div { min-width: 0; }

.excel-builder-topbar h1 {
  margin: 2px 0 2px;
  font-size: 21px;
  line-height: 1.15;
  letter-spacing: -.025em;
}

.excel-builder-topbar p {
  margin: 0;
  color: var(--text-muted);
  font-size: 11px;
}

.excel-back-button,
.excel-close-button {
  border: 1px solid var(--border);
  background: var(--surface-alt);
  color: var(--text);
  cursor: pointer;
}

.excel-back-button {
  min-height: 36px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.excel-close-button {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
}

.excel-back-button:hover,
.excel-close-button:hover,
.excel-icon-button:hover {
  border-color: rgba(124,58,237,.35);
  background: var(--accent-softer);
  color: var(--accent);
}

.excel-builder-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.excel-builder-actions .primary-button,
.excel-builder-actions .secondary-button {
  min-height: 38px;
}

.excel-builder-body {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 390px minmax(0, 1fr);
  overflow: hidden;
}

.excel-builder-sidebar {
  min-height: 0;
  overflow: auto;
  padding: 14px;
  border-right: 1px solid var(--border);
  background: var(--surface-alt);
}

.excel-builder-preview {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  background: var(--bg);
}

.excel-recommendation {
  padding: 11px 12px;
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 8px;
  border: 1px solid rgba(124,58,237,.16);
  border-radius: 12px;
  background: var(--accent-softer);
  color: var(--text-muted);
  font-size: 10px;
}

.excel-recommendation svg { grid-row: span 2; color: var(--accent); }
.excel-recommendation strong { color: var(--text); font-size: 11px; }

.excel-panel-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
  padding: 3px;
  margin-bottom: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}

.excel-panel-tabs button {
  min-height: 31px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.excel-panel-tabs button:hover { color: var(--text); }
.excel-panel-tabs button.active {
  background: var(--text);
  color: var(--surface);
  box-shadow: 0 3px 10px rgba(15,23,42,.08);
}

.excel-theme-list {
  display: grid;
  gap: 8px;
}

.excel-theme-card {
  position: relative;
  width: 100%;
  padding: 9px;
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 10px;
  text-align: left;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
}

.excel-theme-card:hover {
  transform: translateY(-1px);
  border-color: rgba(124,58,237,.28);
  box-shadow: 0 9px 22px rgba(76,29,149,.07);
}

.excel-theme-card.is-selected {
  border-color: rgba(124,58,237,.62);
  box-shadow: 0 0 0 2px rgba(124,58,237,.10), 0 10px 24px rgba(76,29,149,.08);
}

.excel-theme-mini {
  min-height: 82px;
  overflow: hidden;
  padding: 5px;
  border: 1px solid rgba(15,23,42,.09);
  border-radius: 8px;
  background: #fff;
  color: var(--excel-theme-text);
  font-size: 6.5px;
}

.excel-theme-mini-row {
  display: grid;
  grid-template-columns: 1fr 34px;
  gap: 4px;
  min-height: 15px;
  padding: 3px 4px;
  border-bottom: 1px solid rgba(15,23,42,.07);
  white-space: nowrap;
}

.excel-theme-mini-row.header {
  color: #fff;
  background: var(--excel-theme-header);
  font-weight: 800;
  border-bottom-color: transparent;
}

.excel-theme-mini-row:nth-child(3) { background: var(--excel-theme-soft); }
.excel-theme-mini-row b { text-align: right; }

.excel-theme-card-copy {
  min-width: 0;
  padding: 1px 18px 1px 0;
}

.excel-theme-card-copy > div:first-child {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.excel-theme-card-copy strong {
  font-size: 11px;
  letter-spacing: -.01em;
}

.excel-theme-card-copy p {
  margin: 4px 0 7px;
  color: var(--text-muted);
  font-size: 9.5px;
  line-height: 1.45;
}

.excel-theme-meta {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  color: var(--text-muted);
  font-size: 8.5px;
}

.excel-recommended {
  padding: 2px 5px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 7.5px;
  font-weight: 800;
}

.excel-theme-radio {
  position: absolute;
  right: 9px;
  top: 9px;
  width: 17px;
  height: 17px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  color: #fff;
}

.excel-theme-card.is-selected .excel-theme-radio {
  border-color: var(--accent);
  background: var(--accent);
}

.excel-config-section {
  margin-bottom: 12px;
}

.excel-config-section-head {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.excel-config-section-head h3 {
  margin: 2px 0 0;
  font-size: 13px;
  letter-spacing: -.01em;
}

.excel-text-button {
  min-height: 28px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: 10px;
  font-weight: 750;
  cursor: pointer;
}

.excel-text-button:hover { text-decoration: underline; }

.excel-column-list,
.excel-sheet-list {
  display: grid;
  gap: 4px;
}

.excel-column-row,
.excel-sheet-row {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 6px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: var(--surface);
}

.excel-column-row:hover,
.excel-sheet-row:hover {
  border-color: var(--border);
}

.excel-drag-handle {
  width: 14px;
  flex: 0 0 14px;
  color: #9B96AA;
  font-size: 11px;
  cursor: grab;
}

.excel-checkbox {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid #CFC9DD;
  border-radius: 5px;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.excel-checkbox.checked {
  border-color: var(--accent);
  background: var(--accent);
}

.excel-column-name,
.excel-sheet-name {
  min-width: 0;
  flex: 1;
}

.excel-column-name strong,
.excel-column-name small,
.excel-sheet-name strong,
.excel-sheet-name small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.excel-column-name strong,
.excel-sheet-name strong { font-size: 10.5px; }
.excel-column-name small,
.excel-sheet-name small {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 8px;
}

.excel-column-name input,
.excel-sheet-name input {
  width: 100%;
  min-height: 28px;
  padding: 0 7px;
  border: 1px solid var(--accent);
  border-radius: 7px;
  outline: none;
  background: var(--surface);
  color: var(--text);
  font-size: 10px;
}

.excel-icon-button {
  width: 27px;
  height: 27px;
  flex: 0 0 27px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
}

.excel-icon-button:disabled {
  opacity: .35;
  cursor: not-allowed;
}

.excel-icon-button.danger:hover {
  border-color: rgba(220,38,38,.25);
  background: var(--danger-soft);
  color: var(--danger);
}

.excel-setting-grid {
  display: grid;
  gap: 4px;
}

.excel-setting-toggle {
  min-height: 43px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 8px;
  border: 1px solid transparent;
  border-radius: 9px;
  cursor: pointer;
}

.excel-setting-toggle:hover {
  background: var(--surface);
  border-color: var(--border);
}

.excel-setting-toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.excel-toggle-visual {
  width: 31px;
  height: 18px;
  position: relative;
  flex: 0 0 31px;
  border-radius: 999px;
  background: #D8D3E1;
  transition: background .16s ease;
}

.excel-toggle-visual::after {
  content: "";
  width: 14px;
  height: 14px;
  position: absolute;
  top: 2px;
  left: 2px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.18);
  transition: transform .16s ease;
}

.excel-setting-toggle input:checked + .excel-toggle-visual {
  background: var(--accent);
}

.excel-setting-toggle input:checked + .excel-toggle-visual::after {
  transform: translateX(13px);
}

.excel-setting-toggle > span:last-child {
  min-width: 0;
}

.excel-setting-toggle strong,
.excel-setting-toggle small {
  display: block;
}

.excel-setting-toggle strong { font-size: 10px; }
.excel-setting-toggle small {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 8px;
  line-height: 1.35;
}

.excel-filename-field {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

.excel-filename-field > label {
  display: block;
  margin-bottom: 5px;
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 750;
}

.excel-filename-field > div {
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.excel-filename-field input {
  width: 100%;
  min-height: 34px;
  padding: 0 9px;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 10px;
}

.excel-filename-field span {
  padding-right: 9px;
  color: var(--text-muted);
  font-size: 9px;
}

.excel-history-card {
  margin-top: 12px;
  padding: 11px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.excel-history-list { display: grid; gap: 5px; }

.excel-history-row {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  padding: 7px;
  border-radius: 8px;
  background: var(--surface-alt);
}

.excel-history-row > div { min-width: 0; }
.excel-history-row strong,
.excel-history-row span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.excel-history-row strong { font-size: 9px; }
.excel-history-row span {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 7.5px;
}

.excel-history-theme {
  max-width: 80px;
  padding: 3px 5px;
  border: 1px solid var(--border);
  border-radius: 999px;
}

.excel-muted {
  margin: 0;
  color: var(--text-muted);
  font-size: 9px;
  line-height: 1.5;
}

.excel-preview-theme-bar {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  padding: 9px 11px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.excel-preview-theme-bar > div:first-child {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
}

.excel-theme-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  border-radius: 50%;
}

.excel-preview-theme-bar strong { font-size: 11px; }
.excel-preview-theme-bar span:not(.excel-theme-dot) {
  color: var(--text-muted);
  font-size: 9px;
}

.excel-preview-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.excel-preview-panel {
  min-width: 0;
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: var(--surface);
  box-shadow: 0 8px 30px rgba(76,29,149,.04);
}

.excel-preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 10px;
}

.excel-preview-head h2 {
  margin: 2px 0 3px;
  font-size: 15px;
  letter-spacing: -.015em;
}

.excel-preview-head p {
  margin: 0;
  color: var(--text-muted);
  font-size: 9px;
}

.excel-preview-search {
  width: 230px;
  height: 32px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-alt);
  color: var(--text-muted);
}

.excel-preview-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 9px;
}

.excel-preview-status {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-bottom: 9px;
}

.excel-preview-status span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 22px;
  padding: 0 7px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-alt);
  color: var(--text-muted);
  font-size: 8px;
}

.excel-preview-status b { color: var(--text); }

.excel-spreadsheet-wrap {
  max-width: 100%;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
}

.excel-spreadsheet {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  color: #1E293B;
  font-size: 8.5px;
}

.excel-spreadsheet th,
.excel-spreadsheet td {
  min-width: 115px;
  max-width: 260px;
  padding: 7px 8px;
  text-align: left;
  vertical-align: top;
  border-right: 1px solid #E2E8F0;
  border-bottom: 1px solid #E2E8F0;
}

.excel-spreadsheet th {
  position: sticky;
  top: 0;
  z-index: 2;
  min-width: 125px;
  background: var(--accent);
  color: #fff;
  font-weight: 750;
}

.excel-spreadsheet td {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.excel-spreadsheet tbody tr:nth-child(even) td { background: #F8F7FC; }
.excel-spreadsheet tbody tr:hover td { background: #F0ECFF; }

.excel-row-number-head,
.excel-row-number {
  width: 38px !important;
  min-width: 38px !important;
  max-width: 38px !important;
  text-align: center !important;
  color: #94A3B8;
  background: #F8FAFC !important;
  font-weight: 650;
}

.excel-row-number-head {
  background: var(--accent) !important;
  color: rgba(255,255,255,.7) !important;
}

.excel-col-letter {
  display: block;
  margin-bottom: 2px;
  color: rgba(255,255,255,.58);
  font-size: 6.5px;
  text-transform: uppercase;
}

.excel-empty-preview {
  min-width: 500px !important;
  padding: 50px !important;
  text-align: center !important;
  color: #64748B;
}

.excel-preview-foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-top: 8px;
  color: var(--text-muted);
  font-size: 8px;
}

.excel-sheet-tabs {
  display: flex;
  gap: 4px;
  margin-top: 9px;
  overflow-x: auto;
}

.excel-sheet-tabs button {
  min-height: 31px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  flex: 0 0 auto;
  border: 1px solid var(--border);
  border-radius: 8px 8px 0 0;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
}

.excel-sheet-tabs button:hover { color: var(--text); }
.excel-sheet-tabs button.active {
  color: var(--accent);
  border-bottom-color: var(--surface);
  box-shadow: 0 -2px 0 var(--accent) inset;
}

.excel-summary-preview {
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
}

.excel-summary-brand {
  display: grid;
  gap: 3px;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--border);
}

.excel-summary-brand span {
  color: var(--accent);
  font-size: 7px;
  font-weight: 850;
  letter-spacing: .14em;
}

.excel-summary-brand strong { font-size: 18px; }

.excel-summary-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 8px;
  margin: 13px 0;
}

.excel-summary-kpis > div {
  padding: 11px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-alt);
}

.excel-summary-kpis span,
.excel-summary-kpis strong {
  display: block;
}

.excel-summary-kpis span {
  color: var(--text-muted);
  font-size: 8px;
}

.excel-summary-kpis strong {
  margin-top: 4px;
  font-size: 18px;
}

.excel-summary-category-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 4px;
}

.excel-summary-category-list div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border-bottom: 1px solid var(--border);
  font-size: 9px;
}

.excel-summary-category-list b { color: var(--accent); }

.excel-export-alert,
.excel-export-success {
  margin-bottom: 9px;
  padding: 10px 11px;
  display: flex;
  align-items: center;
  gap: 9px;
  border-radius: 11px;
}

.excel-export-alert > div,
.excel-export-success > div:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.excel-export-alert strong,
.excel-export-alert span,
.excel-export-success strong,
.excel-export-success span {
  display: block;
}

.excel-export-alert strong,
.excel-export-success strong { font-size: 10px; }
.excel-export-alert span,
.excel-export-success span {
  margin-top: 2px;
  font-size: 8.5px;
  line-height: 1.4;
}

.excel-export-alert button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.excel-export-alert.error {
  border: 1px solid rgba(220,38,38,.18);
  background: var(--danger-soft);
  color: var(--danger);
}

.excel-export-success {
  border: 1px solid rgba(22,163,74,.18);
  background: var(--success-soft);
  color: var(--success);
}

.excel-success-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex: 0 0 28px;
  border-radius: 8px;
  background: rgba(22,163,74,.12);
}

.excel-success-actions {
  display: flex;
  align-items: center;
  gap: 5px;
}

.excel-success-actions .secondary-button {
  min-height: 30px;
  padding: 0 8px;
  font-size: 9px;
}

.excel-generating-card {
  margin-top: 10px;
  padding: 13px;
  border: 1px solid rgba(124,58,237,.18);
  border-radius: 12px;
  background: var(--accent-softer);
}

.excel-generating-head {
  display: flex;
  align-items: center;
  gap: 9px;
}

.excel-generating-head strong,
.excel-generating-head span {
  display: block;
}

.excel-generating-head strong { font-size: 10px; }
.excel-generating-head span {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 8px;
}

.excel-spinner {
  width: 27px;
  height: 27px;
  flex: 0 0 27px;
  border: 2px solid rgba(124,58,237,.18);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: excelSpin .8s linear infinite;
}

@keyframes excelSpin { to { transform: rotate(360deg); } }

.excel-progress-track {
  height: 5px;
  margin-top: 11px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(124,58,237,.11);
}

.excel-progress-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width .35s ease;
}

.excel-generation-steps {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 5px;
  margin-top: 9px;
}

.excel-generation-steps span {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 7.5px;
}

.excel-generation-steps span.done { color: var(--accent); font-weight: 700; }

.excel-empty-shell { height: min(620px, calc(100vh - 32px)); }

.excel-empty-state {
  flex: 1;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  padding: 30px;
  text-align: center;
}

.excel-empty-icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
  border-radius: 16px;
  background: var(--accent-soft);
  color: var(--accent);
}

.excel-empty-state h2 {
  margin: 0;
  font-size: 20px;
}

.excel-empty-state p {
  max-width: 430px;
  margin: 0 0 9px;
  color: var(--text-muted);
  font-size: 11px;
}

.excel-builder-overlay.is-dark .excel-spreadsheet-wrap {
  border-color: #383342;
}

.excel-builder-overlay.is-dark .excel-spreadsheet {
  background: #1D1A23;
  color: #E7E3EE;
}

.excel-builder-overlay.is-dark .excel-spreadsheet td {
  border-color: #37313F;
}

.excel-builder-overlay.is-dark .excel-spreadsheet tbody tr:nth-child(even) td {
  background: #25212D;
}

.excel-builder-overlay.is-dark .excel-spreadsheet tbody tr:hover td {
  background: #302A3A;
}

.excel-builder-overlay.is-dark .excel-row-number {
  background: #211E27 !important;
  color: #938CA0;
}

.excel-builder-overlay.is-dark .excel-spreadsheet th {
  background: var(--accent);
}

@media (max-width: 1050px) {
  .excel-builder-body { grid-template-columns: 330px minmax(0, 1fr); }
  .excel-theme-card { grid-template-columns: 96px minmax(0,1fr); }
  .excel-summary-kpis { grid-template-columns: repeat(2,1fr); }
}

@media (max-width: 820px) {
  .excel-builder-overlay { padding: 0; }
  .excel-builder-shell {
    width: 100%;
    height: 100vh;
    min-height: 0;
    border-radius: 0;
  }
  .excel-builder-topbar {
    min-height: 72px;
    padding: 12px;
  }
  .excel-builder-actions .secondary-button { display: none; }
  .excel-builder-body {
    display: flex;
    flex-direction: column;
    overflow: auto;
  }
  .excel-builder-sidebar {
    flex: 0 0 auto;
    max-height: 48vh;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
  .excel-builder-preview {
    flex: 1;
    min-height: 460px;
  }
  .excel-theme-list {
    grid-template-columns: repeat(2, minmax(0,1fr));
  }
  .excel-theme-card { grid-template-columns: 84px minmax(0,1fr); }
  .excel-preview-head { flex-direction: column; }
  .excel-preview-search { width: 100%; }
}

@media (max-width: 560px) {
  .excel-builder-topbar {
    align-items: flex-start;
  }
  .excel-builder-title-wrap {
    align-items: flex-start;
    gap: 8px;
  }
  .excel-back-button { padding: 0 8px; }
  .excel-builder-topbar h1 { font-size: 16px; }
  .excel-builder-topbar p { display: none; }
  .excel-builder-actions .primary-button {
    min-height: 34px;
    padding: 0 9px;
    font-size: 9px;
  }
  .excel-builder-sidebar { max-height: 55vh; padding: 10px; }
  .excel-theme-list { grid-template-columns: 1fr; }
  .excel-panel-tabs { grid-template-columns: repeat(2,1fr); }
  .excel-preview-theme-bar { align-items: flex-start; flex-direction: column; }
  .excel-preview-meta { justify-content: flex-start; }
  .excel-summary-kpis,
  .excel-summary-category-list { grid-template-columns: 1fr; }
  .excel-generation-steps { grid-template-columns: repeat(2,1fr); }
  .excel-success-actions { display: none; }
}





/* ==========================================================================
   SAP Data Integration Workspace
   ========================================================================== */
.sap-page{display:grid;gap:16px;padding:6px 0 38px;min-width:0;color:var(--text)}
.sap-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:22px;padding:26px;border:1px solid var(--border);border-radius:24px;background:linear-gradient(135deg,var(--surface),var(--surface-2));box-shadow:0 14px 40px rgba(15,23,42,.055)}
.sap-eyebrow{display:flex;align-items:center;gap:6px;color:var(--accent);font-size:9px;font-weight:900;letter-spacing:.12em}
.sap-hero h1{margin:5px 0 7px;font-size:34px;letter-spacing:-.045em}
.sap-hero p{margin:0;max-width:780px;color:var(--muted);line-height:1.7}
.sap-hero-actions,.sap-action-row{display:flex;gap:8px;flex-wrap:wrap}
.sap-alert{display:flex;align-items:flex-start;gap:9px;padding:12px 14px;border-radius:14px;font-size:11px}
.sap-alert-error{background:var(--danger-soft);color:var(--danger);border:1px solid rgba(220,38,38,.15)}
.sap-alert div{display:grid;gap:3px}.sap-alert span{color:inherit;opacity:.82}.sap-alert button{margin-left:auto;border:0;background:transparent;color:inherit;font-size:18px;cursor:pointer}
.sap-demo-banner{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #f3d18a;background:#fffbeb;color:#92400e;border-radius:12px;font-size:10px}
.sap-status-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.sap-status-card{min-width:0;padding:16px;border:1px solid var(--border);border-radius:17px;background:var(--surface);box-shadow:0 8px 25px rgba(15,23,42,.035)}
.sap-status-card>span{display:block;color:var(--muted);font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.sap-status-card>strong{display:block;margin-top:7px;font-size:15px;letter-spacing:-.02em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sap-status-card>small{display:block;margin-top:5px;color:var(--muted);font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sap-ok{color:var(--success)}.sap-muted{color:var(--muted)}
.sap-status-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px}
.sap-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:15px;margin-top:5px}
.sap-section-head>div>span{font-size:8px;color:var(--accent);font-weight:900;letter-spacing:.11em}
.sap-section-head h2{margin:4px 0;font-size:19px;letter-spacing:-.03em}
.sap-section-head p{margin:0;color:var(--muted);font-size:10px}
.sap-empty{min-height:280px;display:grid;place-items:center;align-content:center;gap:7px;text-align:center;padding:32px;border:1px dashed var(--border);border-radius:22px;background:var(--surface)}
.sap-empty>svg{color:var(--accent)}.sap-empty h2{margin:5px 0 0;font-size:20px}.sap-empty p{margin:0 0 10px;color:var(--muted);font-size:11px}
.sap-workspace-grid{display:grid;grid-template-columns:300px minmax(0,1fr);gap:12px;align-items:start}
.sap-source-list{display:grid;gap:6px}
.sap-source-card{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) 15px;align-items:center;gap:9px;text-align:left;padding:11px;border:1px solid var(--border);border-radius:14px;background:var(--surface);color:var(--text);cursor:pointer}
.sap-source-card:hover,.sap-source-card.active{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 10%,transparent)}
.sap-source-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--accent-softer);color:var(--accent)}
.sap-source-card strong,.sap-source-card small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sap-source-card strong{font-size:11px}.sap-source-card small{margin-top:3px;color:var(--muted);font-size:8px}
.sap-query-card{min-width:0;border:1px solid var(--border);border-radius:20px;background:var(--surface);overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.045)}
.sap-query-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;padding:18px;border-bottom:1px solid var(--border)}
.sap-query-head>div>span,.sap-analysis>span{font-size:8px;color:var(--accent);font-weight:900;letter-spacing:.11em}
.sap-query-head h2{margin:4px 0 0;font-size:18px}.sap-odata-badge{padding:6px 8px;border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:8px;font-weight:800}
.sap-field-section{padding:16px 18px 4px}.sap-field-section>label,.sap-filter-grid label>span{display:block;color:var(--muted);font-size:9px;font-weight:800;margin-bottom:6px}
.sap-field-chips{display:flex;gap:5px;flex-wrap:wrap}.sap-field-chips button,.sap-field-chips span{padding:7px 9px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2);color:var(--muted);font-size:9px;cursor:pointer}.sap-field-chips button.selected{border-color:var(--accent);background:var(--accent-soft);color:var(--text)}
.sap-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:14px 18px}.sap-filter-grid input,.sap-filter-grid select{box-sizing:border-box;width:100%;height:35px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2);color:var(--text);padding:0 9px;font-size:10px;outline:0}
.sap-action-row{padding:0 18px 16px}.sap-preview-card{border-top:1px solid var(--border);background:var(--surface-2);padding:15px}.sap-preview-stats{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}.sap-preview-stats span{padding:7px 9px;border:1px solid var(--border);border-radius:9px;background:var(--surface);font-size:9px;color:var(--muted)}.sap-preview-stats b{color:var(--text)}
.sap-table-wrap{max-height:390px;overflow:auto;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.sap-table-wrap table{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;font-size:9px}.sap-table-wrap th{position:sticky;top:0;z-index:2;text-align:left;padding:9px;background:var(--text);color:var(--surface);white-space:nowrap}.sap-table-wrap td{padding:8px 9px;border-bottom:1px solid var(--border);max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sap-table-wrap tr:nth-child(even) td{background:var(--surface-2)}
.sap-analysis{margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.sap-analysis pre{margin:8px 0 0;max-height:260px;overflow:auto;white-space:pre-wrap;font:9px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}
.sap-job-card{padding:15px;border:1px solid var(--border);border-radius:17px;background:var(--surface)}.sap-job-card>div:first-child{display:flex;justify-content:space-between;gap:10px}.sap-job-card>div:first-child span{font-size:8px;color:var(--accent);font-weight:900;letter-spacing:.1em}.sap-job-card>div:first-child strong{font-size:11px;text-transform:capitalize}.sap-job-progress{height:7px;margin:10px 0 6px;background:var(--surface-2);border-radius:999px;overflow:hidden}.sap-job-progress i{display:block;height:100%;background:var(--accent);border-radius:inherit;transition:width .25s}.sap-job-card small{font-size:9px;color:var(--muted)}
.sap-report-list{display:grid;gap:7px}.sap-report-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}.sap-report-row strong,.sap-report-row small{display:block}.sap-report-row strong{font-size:11px}.sap-report-row small{margin-top:3px;color:var(--muted);font-size:9px}
.sap-inline-empty{padding:20px;text-align:center;border:1px dashed var(--border);border-radius:14px;color:var(--muted);font-size:10px;background:var(--surface)}
.sap-modal-backdrop{position:fixed;inset:0;z-index:2500;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.58);backdrop-filter:blur(10px)}
.sap-wizard{width:min(760px,100%);max-height:90vh;overflow:auto;padding:20px;border:1px solid var(--border);border-radius:22px;background:var(--surface);box-shadow:0 30px 90px rgba(0,0,0,.28);color:var(--text)}
.sap-wizard-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.sap-wizard-head>div>span{font-size:8px;color:var(--accent);font-weight:900;letter-spacing:.1em}.sap-wizard-head h2{margin:4px 0;font-size:22px}.sap-wizard-head p{margin:0;color:var(--muted);font-size:10px;line-height:1.55}.sap-wizard-head>button{width:32px;height:32px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2);color:var(--text);cursor:pointer}
.sap-wizard-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:18px}.sap-wizard-grid label{display:grid;gap:5px}.sap-wizard-grid label.full{grid-column:1/-1}.sap-wizard-grid label>span{font-size:9px;font-weight:800;color:var(--muted)}.sap-wizard-grid input,.sap-wizard-grid select{height:38px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2);color:var(--text);padding:0 10px;font-size:10px;outline:0}
.sap-wizard-security{display:flex;gap:8px;align-items:flex-start;margin-top:13px;padding:10px 12px;border:1px solid rgba(22,163,74,.16);border-radius:11px;background:var(--success-soft);color:var(--success);font-size:9px;line-height:1.5}.sap-wizard-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
@media(max-width:1050px){.sap-status-grid{grid-template-columns:repeat(2,1fr)}.sap-workspace-grid{grid-template-columns:1fr}.sap-source-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.sap-hero,.sap-section-head{align-items:stretch;flex-direction:column}.sap-status-grid{grid-template-columns:1fr}.sap-filter-grid{grid-template-columns:1fr 1fr}.sap-source-list{grid-template-columns:1fr}.sap-wizard-grid{grid-template-columns:1fr}.sap-wizard-grid label.full{grid-column:auto}.sap-report-row{align-items:flex-start;flex-direction:column}.sap-report-row button{width:100%}}
@media(max-width:480px){.sap-hero{padding:18px}.sap-hero h1{font-size:28px}.sap-filter-grid{grid-template-columns:1fr}.sap-action-row .primary-button,.sap-action-row .secondary-button{flex:1}.sap-status-actions{justify-content:stretch}.sap-status-actions button{flex:1}}

/* Coming soon product pages */
.coming-soon-page {
  min-height: calc(100vh - 92px);
  position: relative;
  display: grid;
  place-items: center;
  padding: 48px 24px;
  overflow: hidden;
}
.coming-soon-card {
  width: min(760px, 100%);
  position: relative;
  z-index: 2;
  text-align: center;
  padding: 56px 54px;
  border: 1px solid var(--ds-line, #e8e2ee);
  border-radius: 32px;
  background: var(--surface, #fff);
  box-shadow: 0 30px 90px rgba(67, 44, 94, .12);
  backdrop-filter: blur(18px);
}
.coming-soon-icon {
  width: 76px;
  height: 76px;
  margin: 0 auto 20px;
  display: grid;
  place-items: center;
  border-radius: 24px;
  color: #fff;
  background: linear-gradient(135deg, #7c3aed, #ec4899);
  box-shadow: 0 18px 38px rgba(124, 58, 237, .24);
}
.coming-soon-badge {
  display: inline-flex;
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
  color: #7c3aed;
  background: rgba(124, 58, 237, .09);
}
.coming-soon-eyebrow {
  display: block;
  margin-top: 18px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--ds-muted, #777080);
}
.coming-soon-card h1 {
  margin: 8px 0 14px;
  font-size: clamp(34px, 5vw, 52px);
  line-height: 1.05;
  letter-spacing: -.04em;
}
.coming-soon-card > p {
  max-width: 620px;
  margin: 0 auto;
  color: var(--ds-muted, #777080);
  font-size: 16px;
  line-height: 1.75;
}
.coming-soon-features {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 28px auto 30px;
  max-width: 590px;
  text-align: left;
}
.coming-soon-feature {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  border: 1px solid var(--ds-line, #e8e2ee);
  border-radius: 14px;
  background: var(--surface-alt, #f8f6fa);
  font-size: 13px;
}
.coming-soon-feature svg { color: #7c3aed; flex: 0 0 auto; }
.coming-soon-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.coming-soon-orb-one {
  width: 280px; height: 280px;
  top: 8%; left: 5%;
  background: radial-gradient(circle, rgba(124,58,237,.20), transparent 68%);
  animation: comingSoonFloat 7s ease-in-out infinite;
}
.coming-soon-orb-two {
  width: 340px; height: 340px;
  right: 4%; bottom: 2%;
  background: radial-gradient(circle, rgba(236,72,153,.16), transparent 68%);
  animation: comingSoonFloat 9s ease-in-out infinite reverse;
}
@keyframes comingSoonFloat {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -18px, 0); }
}
@media (max-width: 700px) {
  .coming-soon-card { padding: 38px 22px; border-radius: 24px; }
  .coming-soon-features { grid-template-columns: 1fr; }
}

/* FastAPI connection indicator */
.backend-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.backend-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #94A3B8;
  box-shadow: 0 0 0 3px rgba(148,163,184,.12);
}
.backend-status-online .backend-status-dot {
  background: #16A34A;
  box-shadow: 0 0 0 3px rgba(22,163,74,.12);
}
.backend-status-offline .backend-status-dot,
.backend-status-error .backend-status-dot {
  background: #DC2626;
  box-shadow: 0 0 0 3px rgba(220,38,38,.12);
}
.backend-status-checking .backend-status-dot {
  background: #D97706;
  box-shadow: 0 0 0 3px rgba(217,119,6,.12);
}
@media (max-width: 900px) {
  .backend-status { display: none; }
}


/* ==========================================================================
   Import Excel Studio
   ========================================================================== */
.excel-import-page{display:grid;gap:20px;padding:6px 0 36px;min-width:0}
.excel-import-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:26px;border:1px solid var(--border);border-radius:24px;background:linear-gradient(135deg,var(--surface),var(--surface-2));box-shadow:0 14px 40px rgba(15,23,42,.06)}
.excel-import-hero h1{margin:5px 0 7px;font-size:34px;letter-spacing:-.045em}
.excel-import-hero p{margin:0;max-width:760px;color:var(--muted);line-height:1.7}
.excel-import-hero-actions{display:flex;gap:9px;flex-wrap:wrap}
.excel-workflow{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:9px;border:1px solid var(--border);border-radius:18px;background:var(--surface)}
.excel-workflow-step{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px 7px;border-radius:12px;color:var(--muted);font-size:11px;font-weight:700}
.excel-workflow-step span{display:grid;place-items:center;width:24px;height:24px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border)}
.excel-workflow-step.active,.excel-workflow-step:first-child{background:var(--accent-soft);color:var(--text)}
.excel-workflow-step.active span,.excel-workflow-step:first-child span{background:var(--accent);color:white;border-color:var(--accent)}
.excel-import-empty{min-height:430px;display:grid;place-items:center;align-content:center;text-align:center;padding:42px;border:1.5px dashed var(--border);border-radius:28px;background:radial-gradient(circle at 50% 0%,var(--accent-soft),transparent 45%),var(--surface)}
.excel-import-empty-icon{display:grid;place-items:center;width:72px;height:72px;border-radius:22px;background:var(--accent-soft);color:var(--accent);box-shadow:0 12px 30px rgba(124,58,237,.12)}
.excel-import-empty h2{margin:18px 0 7px;font-size:24px;letter-spacing:-.03em}
.excel-import-empty p{max-width:620px;margin:0 0 20px;color:var(--muted);line-height:1.7}
.excel-import-empty-meta{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:18px}
.excel-import-empty-meta span,.excel-preview-pill{padding:7px 10px;border:1px solid var(--border);border-radius:999px;background:var(--surface-2);color:var(--muted);font-size:10px;font-weight:700}
.excel-import-filebar{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:14px 16px;border:1px solid var(--border);border-radius:18px;background:var(--surface)}
.excel-import-filebar>div:first-child{display:flex;align-items:center;gap:12px}.excel-import-filebar svg{color:var(--accent)}
.excel-import-filebar strong{display:block;font-size:13px}.excel-import-filebar span{display:block;color:var(--muted);font-size:11px;margin-top:3px}
.excel-import-file-actions{display:flex;gap:8px}
.excel-import-grid{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px}
.excel-import-data-card,.excel-data-insights,.excel-theme-workspace,.excel-live-preview-section,.excel-compare-section,.excel-custom-card,.excel-export-panel{border:1px solid var(--border);border-radius:22px;background:var(--surface);box-shadow:0 10px 32px rgba(15,23,42,.045)}
.excel-import-data-card{overflow:hidden}
.excel-import-section-head,.excel-theme-toolbar,.excel-section-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:21px}
.excel-import-section-head h2,.excel-theme-toolbar h2,.excel-section-title-row h2,.excel-custom-card h2,.excel-export-panel h2{margin:4px 0 5px;font-size:20px;letter-spacing:-.025em}
.excel-import-section-head p,.excel-theme-toolbar p,.excel-section-title-row p,.excel-custom-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.55}
.excel-data-stats{display:flex;gap:8px;flex-wrap:wrap}.excel-data-stats span{padding:8px 10px;border:1px solid var(--border);border-radius:11px;color:var(--muted);font-size:10px}.excel-data-stats b{color:var(--text)}
.excel-sheet-selector{display:flex;gap:5px;padding:0 16px 12px;overflow:auto}.excel-sheet-selector button{display:flex;align-items:center;gap:6px;border:1px solid var(--border);background:var(--surface-2);color:var(--muted);border-radius:10px;padding:8px 10px;white-space:nowrap;cursor:pointer;font-weight:700;font-size:11px}.excel-sheet-selector button.active{background:var(--accent-soft);border-color:var(--accent);color:var(--text)}.excel-sheet-selector small{opacity:.7}
.excel-table-wrap{overflow:auto;max-height:420px;border-top:1px solid var(--border)}
.excel-live-table{width:100%;border-collapse:collapse;font-size:11px;min-width:760px}.excel-live-table th{position:sticky;top:0;z-index:2;text-align:left;padding:11px 12px;background:var(--surface-2);border-bottom:1px solid var(--border);color:var(--text)}.excel-live-table th span{display:block}.excel-live-table th small{display:inline-block;margin-top:4px;padding:3px 5px;border-radius:5px;background:var(--accent-soft);color:var(--accent);font-size:8px}.excel-live-table td{padding:10px 12px;border-bottom:1px solid var(--border);max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted)}.excel-live-table tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--surface-2) 55%,transparent)}
.excel-data-insights{padding:14px;display:grid;align-content:start;gap:12px}.excel-insight-card{padding:14px;border:1px solid var(--border);border-radius:16px;background:var(--surface-2)}.excel-insight-card>span{display:block;margin-bottom:10px;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.excel-insight-card>div{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:10px}.excel-insight-card>div:last-child{border-bottom:0}.excel-insight-card b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.excel-insight-card em{font-style:normal;color:var(--accent);font-weight:800}
.excel-import-alert{display:flex;align-items:flex-start;gap:8px;margin:12px 16px;padding:10px 12px;border-radius:11px;font-size:11px;line-height:1.5}.excel-import-alert.warning{background:#fffbeb;color:#92400e;border:1px solid #fde68a}.excel-import-alert.error{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
.excel-theme-workspace{padding-bottom:18px}.excel-theme-toolbar-actions{display:flex;gap:8px;flex-wrap:wrap}.excel-theme-tools{display:grid;grid-template-columns:240px minmax(0,1fr) auto;gap:10px;align-items:center;padding:0 18px 16px}.excel-theme-search{display:flex;align-items:center;gap:7px;border:1px solid var(--border);border-radius:11px;padding:0 10px;background:var(--surface-2);color:var(--muted)}.excel-theme-search input{border:0;outline:0;background:transparent;color:var(--text);padding:10px 0;width:100%;font:inherit;font-size:11px}.excel-theme-cats{display:flex;gap:5px;overflow:auto}.excel-theme-cats button{white-space:nowrap;border:1px solid var(--border);background:var(--surface);color:var(--muted);border-radius:999px;padding:7px 10px;font-size:10px;font-weight:700;cursor:pointer}.excel-theme-cats button.active{background:var(--text);color:var(--surface);border-color:var(--text)}.excel-theme-count{font-size:10px;color:var(--muted);font-weight:700}
.excel-theme-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:0 18px}.excel-theme-card-pro{position:relative;border:1px solid var(--border);border-radius:17px;overflow:hidden;background:var(--surface);transition:.2s}.excel-theme-card-pro:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(15,23,42,.08)}.excel-theme-card-pro.selected{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 20%,transparent)}.excel-theme-card-main{width:100%;border:0;background:transparent;text-align:left;padding:0;cursor:pointer;color:var(--text)}.excel-theme-card-title{display:flex;justify-content:space-between;gap:8px;padding:10px 11px 13px}.excel-theme-card-title strong{font-size:11px}.excel-theme-card-title span{font-size:9px;color:var(--muted)}.excel-theme-fav,.excel-theme-compare{position:absolute;border:0;cursor:pointer;font-size:9px}.excel-theme-fav{top:8px;right:8px;width:24px;height:24px;border-radius:8px;background:rgba(255,255,255,.88);color:#94a3b8}.excel-theme-fav.active{color:#e11d48}.excel-theme-compare{bottom:8px;right:8px;padding:4px 6px;border-radius:6px;background:var(--surface-2);color:var(--muted)}
.import-theme-mini{padding:9px;background:var(--it-bg);color:var(--it-text);min-height:130px}.import-theme-mini-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.import-theme-mini-kpis span{padding:5px;border-radius:5px;background:white;box-shadow:0 1px 4px rgba(0,0,0,.06)}.import-theme-mini-kpis b,.import-theme-mini-kpis small{display:block}.import-theme-mini-kpis b{font-size:8px;color:var(--it-header)}.import-theme-mini-kpis small{font-size:6px;opacity:.65}.import-theme-mini-chart{display:flex;align-items:flex-end;height:28px;gap:3px;margin:6px 0}.import-theme-mini-chart i{display:block;flex:1;border-radius:2px 2px 0 0;background:var(--it-accent);opacity:.8}.import-theme-mini-chart i:nth-child(1){height:35%}.import-theme-mini-chart i:nth-child(2){height:65%}.import-theme-mini-chart i:nth-child(3){height:48%}.import-theme-mini-chart i:nth-child(4){height:80%}.import-theme-mini-chart i:nth-child(5){height:92%}.import-theme-mini-table{border:1px solid color-mix(in srgb,var(--it-text) 18%,transparent);border-radius:5px;overflow:hidden}.import-theme-mini-row{display:grid;grid-template-columns:1.5fr 1fr 1fr;background:white}.import-theme-mini-row span{padding:3px 4px;border-right:1px solid #e2e8f0;font-size:6px;white-space:nowrap;overflow:hidden}.import-theme-mini-row.head{background:var(--it-header);color:white;font-weight:700}
.excel-live-preview-section,.excel-compare-section{overflow:hidden}.excel-preview-pill{display:flex;align-items:center;gap:6px}.excel-preview-pill span{width:8px;height:8px;border-radius:50%}.excel-before-after{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:0 21px 21px}.excel-before,.excel-after{border:1px solid var(--border);border-radius:17px;padding:14px;overflow:hidden}.excel-before>span,.excel-after>span{font-size:9px;font-weight:800;letter-spacing:.08em;color:var(--muted)}.raw-preview{display:grid;gap:6px;margin-top:10px}.raw-preview div{display:flex;justify-content:space-between;gap:12px;padding:9px;border-bottom:1px solid var(--border);font-size:10px}.raw-preview span{color:var(--muted)}.styled-preview{margin-top:10px;padding:11px;background:var(--preview-bg);border-radius:12px;color:var(--preview-text)}.styled-preview-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.styled-preview-kpis b{padding:8px;background:white;border-radius:8px;color:var(--preview-header);font-size:14px}.styled-preview-kpis small{display:block;color:#64748b;font-size:8px;font-weight:500}.styled-preview-table{margin-top:8px;border:1px solid color-mix(in srgb,var(--preview-text) 15%,transparent);border-radius:7px;overflow:hidden}.sp-row{display:grid;grid-template-columns:repeat(5,1fr);background:white}.sp-row span{padding:6px;border-right:1px solid #e2e8f0;font-size:7px;overflow:hidden;white-space:nowrap}.sp-row.head{background:var(--preview-header);color:white;font-weight:700}
.excel-compare-section{padding-bottom:20px}.excel-compare-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:0 21px}.excel-compare-card{border:1px solid var(--border);border-radius:16px;overflow:hidden}.excel-compare-card>strong{display:block;padding:10px 12px}.excel-compare-card>.primary-button{margin:0 12px 12px}
.excel-custom-export{display:grid;grid-template-columns:1.1fr .9fr;gap:16px}.excel-custom-card,.excel-export-panel{padding:21px}.dashboard-type-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:16px}.dashboard-type-grid button,.export-mode-grid button{border:1px solid var(--border);background:var(--surface-2);color:var(--text);border-radius:12px;padding:10px;text-align:left;cursor:pointer}.dashboard-type-grid button.active,.export-mode-grid button.active{border-color:var(--accent);background:var(--accent-soft);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 12%,transparent)}.dashboard-type-grid strong,.dashboard-type-grid span,.export-mode-grid strong,.export-mode-grid span{display:block}.dashboard-type-grid strong,.export-mode-grid strong{font-size:10px}.dashboard-type-grid span,.export-mode-grid span{font-size:8px;color:var(--muted);margin-top:3px;line-height:1.4}.export-mode-grid{display:grid;gap:7px;margin-top:14px}.excel-generate-btn{width:100%;justify-content:center;margin-top:12px}.excel-generation-progress{margin-top:13px}.excel-generation-progress>div:first-child{display:flex;justify-content:space-between;font-size:10px}.excel-progress-line{height:6px;margin-top:7px;background:var(--surface-2);border-radius:999px;overflow:hidden}.excel-progress-line i{display:block;height:100%;background:var(--accent);border-radius:inherit;transition:.35s}.excel-generation-progress small{display:block;color:var(--muted);font-size:9px;margin-top:7px}
.import-custom-backdrop{position:fixed;inset:0;z-index:2500;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.58);backdrop-filter:blur(12px)}.import-custom-modal{width:min(920px,100%);max-height:90vh;overflow:auto;background:var(--surface);border:1px solid var(--border);border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.28);padding:22px}.import-custom-head{display:flex;justify-content:space-between;gap:15px}.import-custom-head h2{margin:4px 0 0;font-size:22px}.import-custom-head button{width:34px;height:34px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--text);cursor:pointer}.custom-theme-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px}.custom-theme-grid label{display:grid;gap:6px;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);font-size:10px;font-weight:700}.custom-theme-grid input,.custom-theme-grid select{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);padding:7px}.custom-theme-grid input[type=color]{height:34px;padding:2px}.custom-theme-grid .custom-check{display:flex;align-items:center;justify-content:space-between}.import-custom-preview{margin-top:15px;border:1px solid var(--border);border-radius:15px;overflow:hidden}.import-custom-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}
.excel-import-page.is-dark .excel-import-empty{background:radial-gradient(circle at 50% 0%,rgba(124,58,237,.18),transparent 45%),var(--surface)}
@media(max-width:1200px){.excel-theme-grid{grid-template-columns:repeat(3,1fr)}.excel-import-grid{grid-template-columns:1fr}.excel-data-insights{grid-template-columns:repeat(2,1fr)}.excel-custom-export{grid-template-columns:1fr}}
@media(max-width:850px){.excel-import-hero,.excel-import-section-head,.excel-theme-toolbar,.excel-section-title-row{flex-direction:column;align-items:stretch}.excel-workflow{grid-template-columns:repeat(3,1fr)}.excel-theme-tools{grid-template-columns:1fr}.excel-theme-grid{grid-template-columns:repeat(2,1fr)}.excel-before-after{grid-template-columns:1fr}.dashboard-type-grid{grid-template-columns:repeat(2,1fr)}.custom-theme-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.excel-import-hero h1{font-size:28px}.excel-workflow{grid-template-columns:repeat(2,1fr)}.excel-theme-grid,.excel-compare-grid{grid-template-columns:1fr}.excel-data-insights{grid-template-columns:1fr}.excel-import-filebar{align-items:flex-start;flex-direction:column}.excel-import-file-actions{width:100%}.excel-import-file-actions button{flex:1}.custom-theme-grid{grid-template-columns:1fr}}

/* ================================================================
   AI Excel Report Builder — product workspace
   ================================================================ */
.erb-shell{width:min(1680px,98vw);height:min(960px,96vh);display:flex;flex-direction:column;overflow:hidden;background:var(--surface);border:1px solid var(--border);border-radius:24px;box-shadow:0 30px 90px rgba(15,23,42,.22);color:var(--text)}
.erb-header{min-height:78px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:1px solid var(--border);background:var(--surface)}
.erb-title-area{display:flex;align-items:center;gap:13px;min-width:0}.erb-title-area h1{margin:2px 0 3px;font-size:22px;letter-spacing:-.6px}.erb-title-area p{margin:0;color:var(--text-muted);font-size:11px}.erb-header-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.erb-header-actions button{white-space:nowrap}
.erb-ghost,.erb-outline,.erb-primary{height:36px;border-radius:10px;padding:0 12px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:10px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.erb-ghost:hover,.erb-outline:hover{background:var(--accent-softer);border-color:rgba(124,58,237,.3)}.erb-primary{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 7px 18px rgba(124,58,237,.2)}.erb-primary:hover{transform:translateY(-1px)}.erb-header-actions button:disabled{opacity:.45;cursor:not-allowed;transform:none}
.erb-meta{display:flex;align-items:center;gap:0;min-height:43px;padding:0 18px;border-bottom:1px solid var(--border);background:var(--surface-alt);overflow:auto}.erb-meta span{display:flex;align-items:center;gap:6px;padding:0 17px;border-right:1px solid var(--border);font-size:10px;color:var(--text-muted);white-space:nowrap}.erb-meta span:first-child{padding-left:0}.erb-meta b{color:var(--text);font-size:9px;text-transform:uppercase;letter-spacing:.07em}
.erb-alert{margin:10px 14px 0;border-radius:12px;padding:9px 12px;display:flex;align-items:center;gap:8px;font-size:10px}.erb-alert.error{background:var(--danger-soft);border:1px solid rgba(220,38,38,.15);color:var(--danger)}.erb-alert.success{background:var(--success-soft);border:1px solid rgba(22,163,74,.15);color:var(--success)}.erb-alert button{margin-left:auto;border:0;background:transparent;color:inherit;cursor:pointer;font-weight:800}
.erb-layout{flex:1;min-height:0;display:grid;grid-template-columns:290px minmax(0,1fr) 355px;overflow:hidden}.erb-left,.erb-right{min-width:0;overflow:auto;background:var(--surface-alt)}.erb-left{border-right:1px solid var(--border);padding:13px}.erb-right{border-left:1px solid var(--border);padding:13px}.erb-center{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--bg);overflow:hidden}
.erb-ai-card{padding:13px;border:1px solid rgba(124,58,237,.18);border-radius:15px;background:linear-gradient(145deg,var(--accent-softer),var(--surface));margin-bottom:11px}.erb-ai-card-title{display:flex;align-items:center;gap:7px;color:var(--accent);font-size:12px}.erb-ai-card p{margin:7px 0 10px;color:var(--text-muted);font-size:9.5px;line-height:1.55}.erb-ai-button{width:100%;min-height:36px;border:0;border-radius:10px;background:var(--gradient);color:#fff;font-weight:800;font-size:10px;cursor:pointer;box-shadow:0 8px 20px rgba(124,58,237,.18)}
.erb-left-tabs,.erb-config-tabs{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:3px;padding:3px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:11px}.erb-left-tabs button,.erb-config-tabs button{min-height:31px;border:0;border-radius:7px;background:transparent;color:var(--text-muted);font-size:9px;font-weight:800;cursor:pointer}.erb-left-tabs button.active,.erb-config-tabs button.active{background:var(--text);color:var(--surface)}
.erb-section-caption{font-size:8px;font-weight:900;letter-spacing:.11em;color:var(--text-muted);margin:13px 4px 7px}.erb-sheet-item{display:flex;align-items:stretch;border:1px solid transparent;border-radius:11px;margin-bottom:4px;background:transparent}.erb-sheet-item.active{background:var(--surface);border-color:var(--border);box-shadow:0 5px 15px rgba(15,23,42,.04)}.erb-sheet-main{min-width:0;flex:1;border:0;background:transparent;color:var(--text);display:flex;align-items:center;gap:8px;padding:9px 7px;text-align:left;cursor:pointer}.erb-sheet-main b{display:block;font-size:10px}.erb-sheet-main small{display:block;color:var(--text-muted);font-size:8px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.erb-drag{color:var(--text-muted);font-size:11px;letter-spacing:-3px}.erb-sheet-icon{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;background:var(--accent-softer);color:var(--accent);font-size:11px;flex-shrink:0}.erb-sheet-actions{display:flex;align-items:center;padding-right:5px;gap:1px}.erb-sheet-actions button{width:22px;height:22px;border:0;background:transparent;color:var(--text-muted);border-radius:6px;cursor:pointer}.erb-sheet-actions button:hover{background:var(--accent-softer);color:var(--accent)}.erb-add-sheet{width:100%;margin-top:6px;min-height:34px;border:1px dashed var(--border);border-radius:9px;background:transparent;color:var(--text-muted);font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:5px;cursor:pointer}.erb-add-sheet:hover{border-color:var(--accent);color:var(--accent)}
.erb-template-list{display:grid;gap:5px}.erb-template-item{display:flex;flex-direction:column;text-align:left;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);cursor:pointer}.erb-template-item:hover{border-color:rgba(124,58,237,.3);transform:translateY(-1px)}.erb-template-item b{font-size:10px}.erb-template-item small{font-size:8px;color:var(--text-muted);margin-top:3px}.erb-template-empty{padding:15px;text-align:center;color:var(--text-muted);font-size:9px;border:1px dashed var(--border);border-radius:10px}.erb-left-foot{display:flex;gap:5px;margin-top:12px;position:sticky;bottom:0;padding-top:8px;background:linear-gradient(var(--surface-alt),var(--surface-alt))}.erb-left-foot input{min-width:0;flex:1;height:31px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);padding:0 8px;font-size:9px}.erb-left-foot button{height:31px;border:0;border-radius:8px;background:var(--text);color:var(--surface);font-size:9px;font-weight:800;padding:0 9px}
.erb-preview-toolbar{min-height:79px;padding:14px 17px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border);background:var(--surface)}.erb-preview-toolbar h2{margin:2px 0 3px;font-size:16px}.erb-preview-toolbar p{margin:0;color:var(--text-muted);font-size:9px}.erb-preview-actions{display:flex;align-items:center;gap:6px}.erb-preview-actions input,.erb-preview-actions select{height:34px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font-size:9px;padding:0 9px}.erb-preview-actions input{width:170px}
.erb-assistant-message{margin:10px 12px 0;padding:10px 11px;border:1px solid rgba(124,58,237,.18);border-radius:11px;background:var(--accent-softer);display:flex;gap:8px;align-items:flex-start;color:var(--text)}.erb-assistant-message svg{color:var(--accent);flex-shrink:0;margin-top:1px}.erb-assistant-message b{font-size:9px}.erb-assistant-message p{margin:3px 0 0;font-size:9px;line-height:1.5;color:var(--text-muted)}.erb-assistant-message button{margin-left:auto;border:0;background:transparent;color:var(--text-muted);cursor:pointer}
.erb-sheet-preview{margin:13px;min-height:0;flex:1;border:1px solid var(--border);border-radius:15px;background:var(--surface);overflow:auto;box-shadow:0 8px 28px rgba(15,23,42,.05)}.erb-table-wrap{overflow:auto;max-height:100%}.erb-table-wrap table{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%}.erb-table-wrap th{position:sticky;top:0;z-index:2;text-align:left;padding:10px 11px;background:var(--erb-header);color:#fff;font-size:9px;min-width:120px;border-right:1px solid rgba(255,255,255,.14)}.erb-table-wrap th small{display:block;opacity:.72;font-weight:500;font-size:7px;margin-top:2px;text-transform:uppercase}.erb-table-wrap td{padding:9px 11px;border-bottom:1px solid var(--border);font-size:9px;max-width:260px;vertical-align:top;line-height:1.45;color:var(--erb-text)}.erb-table-wrap tr:nth-child(even) td{background:var(--erb-soft)}.erb-table-wrap tr:hover td{background:var(--accent-softer)}.erb-no-data{text-align:center!important;padding:50px!important;color:var(--text-muted)!important}.erb-preview-footer{min-height:38px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 10px;color:var(--text-muted);font-size:8px;background:var(--surface)}.erb-preview-footer div{display:flex;align-items:center;gap:7px}.erb-preview-footer button{width:24px;height:24px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);cursor:pointer}.erb-preview-footer button:disabled{opacity:.4;cursor:not-allowed}.erb-sheet-tabs{display:flex;gap:3px;overflow:auto;padding:0 13px 10px}.erb-sheet-tabs button{height:29px;flex:0 0 auto;padding:0 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-muted);font-size:8px;font-weight:800;cursor:pointer}.erb-sheet-tabs button.active{background:var(--text);color:var(--surface);border-color:var(--text)}
.erb-summary-preview{padding:22px}.erb-report-cover{padding:22px;border-radius:15px;background:linear-gradient(135deg,var(--erb-header),var(--erb-accent));color:#fff;min-height:150px;display:flex;flex-direction:column;justify-content:center}.erb-report-cover span{font-size:9px;text-transform:uppercase;letter-spacing:.12em;opacity:.78}.erb-report-cover h2{font-size:24px;margin:7px 0 3px}.erb-report-cover p{margin:0;opacity:.82;font-size:10px}.erb-report-cover small{margin-top:14px;opacity:.7}.erb-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.erb-kpi{padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.erb-kpi span{font-size:8px;color:var(--text-muted);display:block}.erb-kpi strong{display:block;font-size:17px;margin:6px 0;color:var(--text)}.erb-kpi small{font-size:7px;color:var(--accent)}.erb-insight-panel{margin-top:10px;padding:14px;border-radius:12px;background:var(--erb-soft);border:1px solid var(--border)}.erb-insight-panel h3{margin:0 0 7px;font-size:11px}.erb-insight-panel p{font-size:9px;color:var(--text-muted);margin:5px 0}
.erb-config-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.erb-config-header h2{margin:2px 0 0;font-size:15px}.erb-live-dot{font-size:8px;color:var(--success);font-weight:800}.erb-config-tabs{grid-template-columns:repeat(3,1fr);grid-auto-flow:row}.erb-config-stack{display:grid;gap:9px}.erb-config-card{padding:11px;border:1px solid var(--border);border-radius:13px;background:var(--surface)}.erb-config-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}.erb-config-card-head span{font-size:10px;font-weight:900}.erb-mini-action{border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--accent);font-size:8px;font-weight:800;padding:5px 7px;cursor:pointer;display:inline-flex;align-items:center;gap:4px}.erb-mini-action:hover{background:var(--accent-softer)}.erb-theme-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.erb-theme{padding:7px;text-align:left;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);cursor:pointer}.erb-theme.selected{border-color:var(--accent);box-shadow:0 0 0 2px rgba(124,58,237,.09)}.erb-theme span{display:block;height:16px;border-radius:5px;margin-bottom:6px}.erb-theme b{display:block;font-size:8px}.erb-theme small{display:block;color:var(--text-muted);font-size:7px;margin-top:2px}.erb-color-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.erb-color-grid label{font-size:8px;color:var(--text-muted);display:grid;gap:4px}.erb-color-grid input{width:100%;height:29px;border:1px solid var(--border);border-radius:7px;background:var(--surface);padding:2px}.erb-wide-action{width:100%;min-height:30px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:8px;font-weight:800;cursor:pointer;margin-top:7px}.erb-wide-action.primary{background:var(--accent);color:#fff;border-color:var(--accent)}.erb-field{display:grid;gap:5px;font-size:8px;font-weight:800;color:var(--text-muted);margin-bottom:8px}.erb-field input,.erb-field textarea,.erb-field select{width:100%;border:1px solid var(--border);border-radius:8px;background:var(--surface-alt);color:var(--text);padding:7px 8px;font-size:9px;resize:vertical}.erb-field textarea{line-height:1.5}
.erb-column-list{display:grid;gap:5px;max-height:560px;overflow:auto}.erb-column-row{display:grid;grid-template-columns:24px minmax(0,1fr) 72px 45px 34px;gap:5px;align-items:center;padding:7px;border:1px solid var(--border);border-radius:9px;background:var(--surface-alt)}.erb-column-row.enabled{background:var(--surface)}.erb-check{width:22px;height:22px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--accent);font-weight:900;cursor:pointer}.erb-column-main{min-width:0}.erb-column-main input{width:100%;border:0;background:transparent;color:var(--text);font-size:9px;font-weight:800;outline:none}.erb-column-main small{display:block;color:var(--text-muted);font-size:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}.erb-column-row select,.erb-width{width:100%;height:26px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);font-size:7px;padding:0 3px}.erb-column-move{display:grid;gap:2px}.erb-column-move button{height:12px;border:0;background:var(--surface-alt);color:var(--text-muted);font-size:8px;cursor:pointer}.erb-column-move button:hover{color:var(--accent)}
.erb-kpi-editor,.erb-formula-list,.erb-chart-list{display:grid;gap:5px}.erb-editor-row{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:6px;border:1px solid var(--border);border-radius:8px}.erb-editor-row input,.erb-editor-row select{height:26px;min-width:0;border:1px solid var(--border);border-radius:6px;background:var(--surface-alt);color:var(--text);font-size:7px;padding:0 5px}.erb-editor-row input:nth-of-type(2){grid-column:1/3}.erb-editor-row button,.erb-formula-list button,.erb-chart-card button,.erb-rule-row button{border:0;background:transparent;color:var(--danger);cursor:pointer}.erb-formula-builder{display:grid;grid-template-columns:1fr 1fr;gap:5px}.erb-formula-builder select{height:29px;border:1px solid var(--border);border-radius:7px;background:var(--surface-alt);color:var(--text);font-size:8px}.erb-formula-builder .erb-wide-action{grid-column:1/3;margin-top:0}.erb-formula-list>div{display:grid;grid-template-columns:1fr auto;gap:4px;padding:7px;border:1px solid var(--border);border-radius:8px;background:var(--surface-alt)}.erb-formula-list b{font-size:8px}.erb-formula-list code{grid-column:1/2;color:var(--accent);font-size:7px;overflow-wrap:anywhere}.erb-chart-card{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface-alt)}.erb-chart-card b{font-size:8px}.erb-chart-card small{display:block;color:var(--text-muted);font-size:7px;margin-top:2px}.erb-chart-card>div:last-child{display:flex;gap:4px}.erb-chart-card>div:last-child button{font-size:8px;color:var(--text-muted)}.erb-chip-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.erb-chip-grid button{height:27px;border:1px solid var(--border);border-radius:7px;background:var(--surface-alt);color:var(--text);font-size:7px;font-weight:800;cursor:pointer;text-transform:capitalize}.erb-chip-grid button:hover{border-color:var(--accent);color:var(--accent)}.erb-quality-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-bottom:8px}.erb-quality-grid div{padding:8px;border-radius:8px;background:var(--surface-alt);border:1px solid var(--border)}.erb-quality-grid b{display:block;font-size:14px}.erb-quality-grid span{font-size:7px;color:var(--text-muted)}.erb-check-field{display:flex;gap:7px;align-items:flex-start;font-size:8px;color:var(--text-muted);margin:7px 0}.erb-check-field input{margin-top:1px;accent-color:var(--accent)}.erb-note{font-size:7px;line-height:1.45;color:var(--text-muted)}.erb-rule-row{display:grid;grid-template-columns:1fr 1fr 1fr 20px;gap:4px;margin:5px 0}.erb-rule-row select,.erb-rule-row input{min-width:0;height:27px;border:1px solid var(--border);border-radius:6px;background:var(--surface-alt);color:var(--text);font-size:7px;padding:0 4px}.erb-preset-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.erb-preset-grid button{padding:9px;text-align:left;border:1px solid var(--border);border-radius:8px;background:var(--surface-alt);color:var(--text);font-size:8px;font-weight:800;cursor:pointer}.erb-preset-grid small{display:block;color:var(--text-muted);font-size:7px;margin-top:2px;font-weight:500}.erb-export-options{display:grid;grid-template-columns:1fr 1fr;gap:6px}.erb-export-options label{display:flex;align-items:center;gap:5px;font-size:8px;color:var(--text-muted)}.erb-export-options input{accent-color:var(--accent)}.erb-assistant-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px}.erb-assistant-actions .erb-wide-action{margin:0}
.erb-progress-overlay{position:absolute;inset:0;background:rgba(15,23,42,.38);backdrop-filter:blur(4px);display:grid;place-items:center;z-index:50}.erb-progress-card{width:min(470px,90vw);padding:24px;border-radius:18px;background:var(--surface);box-shadow:0 30px 80px rgba(15,23,42,.3);text-align:center}.erb-progress-card>svg{color:var(--accent)}.erb-progress-card h3{margin:8px 0 15px;font-size:17px}.erb-progress-steps{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left}.erb-progress-steps div{font-size:8px;color:var(--text-muted);padding:8px;border:1px solid var(--border);border-radius:8px}.erb-progress-steps div.done{color:var(--accent);background:var(--accent-softer);border-color:rgba(124,58,237,.18)}.erb-progress-steps span{margin-right:5px}.erb-progress-bar{height:7px;background:var(--border);border-radius:10px;overflow:hidden;margin-top:15px}.erb-progress-bar i{display:block;height:100%;background:var(--gradient);border-radius:10px;transition:width .3s ease}.erb-empty{width:min(650px,92vw);padding:42px;text-align:center;border-radius:22px;background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow)}.erb-empty-icon{width:64px;height:64px;margin:0 auto 14px;border-radius:18px;display:grid;place-items:center;background:var(--accent-softer);color:var(--accent)}.erb-empty h1{margin:7px 0;font-size:24px}.erb-empty p{color:var(--text-muted);font-size:11px;line-height:1.6;max-width:520px;margin:0 auto 20px}.erb-empty button{margin:3px}
@media(max-width:1250px){.erb-layout{grid-template-columns:250px minmax(0,1fr) 315px}.erb-header-actions .erb-ghost:nth-child(-n+2){display:none}.erb-kpi-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:980px){.erb-shell{width:100%;height:100vh;border-radius:0}.erb-layout{grid-template-columns:240px minmax(0,1fr)}.erb-right{display:none}.erb-layout:has(.erb-right){grid-template-columns:240px minmax(0,1fr)}.erb-header-actions .erb-outline{display:none}}
@media(max-width:760px){.erb-header{align-items:flex-start}.erb-title-area p{display:none}.erb-meta{display:grid;grid-template-columns:repeat(2,1fr);padding:7px}.erb-meta span{padding:5px 8px;border-right:0}.erb-layout{display:flex;flex-direction:column;overflow:auto}.erb-left{max-height:42vh;border-right:0;border-bottom:1px solid var(--border)}.erb-center{min-height:600px}.erb-header-actions .erb-ghost{display:none}.erb-preview-toolbar{align-items:flex-start;flex-direction:column}.erb-preview-actions{width:100%}.erb-preview-actions input{flex:1;width:auto}.erb-column-row{grid-template-columns:24px minmax(0,1fr) 65px}.erb-width,.erb-column-move{display:none}}
@media(max-width:520px){.erb-header{padding:10px}.erb-title-area h1{font-size:17px}.erb-header-actions .erb-primary{height:33px;padding:0 9px;font-size:9px}.erb-left{padding:9px}.erb-kpi-grid{grid-template-columns:1fr}.erb-summary-preview{padding:12px}.erb-report-cover h2{font-size:19px}.erb-config-tabs{grid-template-columns:repeat(2,1fr)}}
@media(prefers-reduced-motion:reduce){.erb-shell *{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important}}


/* ========================================================================
   AI Report Studio
   ======================================================================== */
.report-studio{position:relative;min-height:calc(100vh - 100px);padding:18px;display:flex;flex-direction:column;gap:12px;background:var(--bg);color:var(--text)}
.report-studio-head{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 20px;border:1px solid var(--border);border-radius:20px;background:var(--surface);box-shadow:var(--shadow)}
.report-studio-eyebrow{display:flex;align-items:center;gap:6px;color:var(--accent);font-size:9px;font-weight:900;letter-spacing:.12em}.report-studio-head h1{margin:5px 0 3px;font-size:26px;letter-spacing:-.04em}.report-studio-head p{margin:0;color:var(--text-muted);font-size:11px}.report-studio-head-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.report-studio-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.report-studio-steps button{border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:11px;padding:9px 8px;font-size:9px;font-weight:800;cursor:pointer}.report-studio-steps button span{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;margin-right:6px;background:var(--surface-alt)}.report-studio-steps button.active{background:var(--text);color:var(--surface);border-color:var(--text)}.report-studio-steps button.done{color:var(--accent);border-color:rgba(124,58,237,.25)}
.report-studio-alert{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:11px;font-size:10px}.report-studio-alert.error{background:var(--danger-soft);color:var(--danger);border:1px solid rgba(220,38,38,.16)}.report-studio-alert button{margin-left:auto;border:0;background:transparent;color:inherit;font-weight:900;cursor:pointer}
.report-studio-meta{display:flex;gap:0;overflow:auto;border:1px solid var(--border);border-radius:13px;background:var(--surface)}.report-studio-meta span{padding:10px 14px;border-right:1px solid var(--border);font-size:9px;white-space:nowrap}.report-studio-meta b{display:block;font-size:7px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:2px}
.report-studio-grid{display:grid;grid-template-columns:280px minmax(0,1fr);gap:12px;min-height:0}.report-studio-left{display:grid;gap:10px;align-content:start}.rs-card,.rs-panel{border:1px solid var(--border);background:var(--surface);border-radius:17px;box-shadow:0 8px 24px rgba(15,23,42,.04)}.rs-card{padding:13px}.rs-card-title{font-size:10px;font-weight:900;display:flex;gap:6px;align-items:center;margin-bottom:8px}.rs-card p{font-size:9px;color:var(--text-muted);line-height:1.5}.rs-card textarea{width:100%;min-height:82px;border:1px solid var(--border);border-radius:9px;background:var(--surface-alt);color:var(--text);font-size:9px;padding:8px;resize:vertical}.rs-primary{width:100%;height:34px;margin-top:7px;border:0;border-radius:9px;background:var(--gradient);color:#fff;font-size:9px;font-weight:900;cursor:pointer}.rs-primary:disabled{opacity:.5}.rs-signal-list{display:flex;flex-wrap:wrap;gap:4px}.rs-signal-list span{font-size:7px;padding:4px 6px;border-radius:999px;background:var(--accent-softer);color:var(--accent)}.rs-quality-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.rs-quality-grid div{padding:7px;border:1px solid var(--border);border-radius:8px;background:var(--surface-alt)}.rs-quality-grid b{display:block;font-size:13px}.rs-quality-grid small{font-size:7px;color:var(--text-muted)}.rs-method{display:block;color:var(--text-muted);font-size:7px;line-height:1.45;margin-top:8px}
.report-studio-center{min-width:0}.rs-panel{padding:15px;min-height:560px}.rs-panel-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;padding-bottom:12px;border-bottom:1px solid var(--border)}.rs-panel-head span{font-size:8px;font-weight:900;letter-spacing:.11em;color:var(--accent)}.rs-panel-head h2{margin:4px 0;font-size:18px;letter-spacing:-.03em}.rs-panel-head p{margin:0;color:var(--text-muted);font-size:9px}.rs-preview-table{margin-top:12px;overflow:auto;border:1px solid var(--border);border-radius:12px;max-height:500px}.rs-preview-table table{border-collapse:separate;border-spacing:0;min-width:100%;width:max-content}.rs-preview-table th{position:sticky;top:0;background:var(--text);color:var(--surface);padding:9px;font-size:8px;text-align:left}.rs-preview-table td{padding:8px 9px;border-bottom:1px solid var(--border);font-size:8px;max-width:240px}.rs-preview-table tr:nth-child(even) td{background:var(--surface-alt)}
.rs-mapping-list{display:grid;gap:6px;margin-top:12px;max-height:560px;overflow:auto}.rs-mapping-row{display:grid;grid-template-columns:minmax(0,1fr) 18px 180px 55px;align-items:center;gap:8px;border:1px solid var(--border);border-radius:10px;padding:8px;background:var(--surface-alt)}.rs-mapping-row b{display:block;font-size:9px}.rs-mapping-row small{font-size:7px;color:var(--text-muted)}.rs-mapping-row select{height:30px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-size:8px}.rs-confidence{font-size:8px;font-weight:900;color:var(--accent);text-align:right}
.rs-record-toolbar{display:flex;gap:7px;margin:12px 0}.rs-record-toolbar input{height:33px;flex:1;border:1px solid var(--border);border-radius:8px;background:var(--surface-alt);color:var(--text);font-size:9px;padding:0 9px}.rs-record-toolbar button{border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:8px;font-weight:800;padding:0 10px;cursor:pointer}.rs-record-list{display:grid;gap:4px;max-height:500px;overflow:auto}.rs-record-list label{display:flex;align-items:center;gap:8px;border:1px solid transparent;border-radius:9px;padding:8px;cursor:pointer}.rs-record-list label.selected{background:var(--accent-softer);border-color:rgba(124,58,237,.16)}.rs-record-list input{accent-color:var(--accent)}.rs-record-list b{display:block;font-size:9px}.rs-record-list small{display:block;color:var(--text-muted);font-size:7px;margin-top:2px;max-width:700px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs-output-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:13px 0}.rs-output-grid button{padding:9px;text-align:left;border:1px solid var(--border);border-radius:9px;background:var(--surface-alt);color:var(--text);cursor:pointer}.rs-output-grid button.selected{border-color:var(--accent);box-shadow:0 0 0 2px rgba(124,58,237,.08);background:var(--accent-softer)}.rs-output-grid b{display:block;font-size:8px}.rs-output-grid small{display:block;color:var(--text-muted);font-size:7px;line-height:1.35;margin-top:3px}.rs-builder-grid{display:grid;grid-template-columns:190px minmax(0,1fr) 220px;gap:9px;min-height:370px}.rs-section-list{display:grid;align-content:start;gap:4px}.rs-section-list button{display:grid;grid-template-columns:18px 1fr auto;align-items:center;gap:5px;border:1px solid var(--border);border-radius:8px;background:var(--surface-alt);color:var(--text);padding:8px;text-align:left;cursor:pointer}.rs-section-list button.selected{border-color:var(--accent);background:var(--accent-softer)}.rs-section-list span{font-size:8px;font-weight:800}.rs-section-list small{font-size:6px;color:var(--text-muted)}.rs-section-list input{accent-color:var(--accent)}.rs-report-preview{background:#eef1f6;border-radius:10px;padding:16px;overflow:auto}.rs-page{width:min(100%,600px);min-height:440px;margin:auto;background:#fff;color:#1f2937;padding:35px;box-shadow:0 12px 35px rgba(15,23,42,.12)}.rs-page .rs-kicker{font-size:8px;letter-spacing:.15em;color:#6d28d9;font-weight:900}.rs-page h1{font-size:25px;letter-spacing:-.04em;margin:9px 0 24px}.rs-page h3{font-size:12px;color:#5b21b6;border-bottom:1px solid #e5e7eb;padding-bottom:6px}.rs-page p{font-size:9px;line-height:1.7;color:#4b5563}.rs-section-settings{border:1px solid var(--border);border-radius:10px;padding:9px;background:var(--surface-alt)}.rs-section-settings label,.rs-branding label{display:grid;gap:4px;font-size:7px;color:var(--text-muted);font-weight:900;margin-bottom:8px}.rs-section-settings input,.rs-section-settings select,.rs-section-settings textarea,.rs-branding input,.rs-branding select{width:100%;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);padding:7px;font-size:8px}.rs-section-settings textarea{min-height:70px;resize:vertical}.rs-branding{display:grid;grid-template-columns:1fr 100px 140px;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)}.rs-branding input[type=color]{padding:2px;height:30px}.rs-dashboard{padding-top:15px}.rs-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.rs-kpi-row div{padding:12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-alt)}.rs-kpi-row b{display:block;font-size:17px}.rs-kpi-row span{font-size:7px;color:var(--text-muted)}.rs-insights{display:grid;gap:6px;margin-top:10px}.rs-insights div{display:flex;gap:7px;align-items:flex-start;padding:10px;border:1px solid var(--border);border-radius:9px;font-size:9px;line-height:1.5}.rs-insights svg{color:var(--accent);flex-shrink:0}.rs-success{text-align:center;padding:80px 20px}.rs-success svg{color:var(--success)}.rs-success h3{font-size:20px;margin:12px 0 5px}.rs-success p{color:var(--text-muted);font-size:10px}.report-studio-empty{min-height:560px;display:grid;place-items:center;text-align:center;padding:35px;border:1px dashed var(--border);border-radius:20px;background:var(--surface)}.report-studio-empty>div{width:68px;height:68px;display:grid;place-items:center;margin:auto;border-radius:18px;background:var(--accent-softer);color:var(--accent)}.report-studio-empty h2{margin:15px 0 6px;font-size:22px}.report-studio-empty p{max-width:620px;color:var(--text-muted);font-size:10px;line-height:1.65;margin:0 auto 16px}.report-studio-busy{position:absolute;inset:0;z-index:80;display:grid;place-items:center;background:rgba(15,23,42,.28);backdrop-filter:blur(3px)}.report-studio-busy>div{display:grid;gap:6px;text-align:center;padding:24px 32px;border-radius:17px;background:var(--surface);box-shadow:0 30px 80px rgba(15,23,42,.25)}.report-studio-busy svg{margin:auto;color:var(--accent)}.report-studio-busy b{font-size:13px}.report-studio-busy span{font-size:9px;color:var(--text-muted)}
.report-studio.is-dark .rs-page{box-shadow:0 12px 35px rgba(0,0,0,.35)}
@media(max-width:1100px){.report-studio-grid{grid-template-columns:1fr}.report-studio-left{grid-template-columns:repeat(3,1fr)}.rs-builder-grid{grid-template-columns:170px minmax(0,1fr)}}
@media(max-width:800px){.report-studio-head{align-items:flex-start;flex-direction:column}.report-studio-steps{grid-template-columns:repeat(2,1fr)}.report-studio-left{grid-template-columns:1fr}.rs-builder-grid{grid-template-columns:1fr}.rs-section-list{max-height:190px;overflow:auto}.rs-output-grid{grid-template-columns:1fr 1fr}.rs-branding{grid-template-columns:1fr}.rs-mapping-row{grid-template-columns:1fr}.rs-mapping-row>svg{display:none}.rs-confidence{text-align:left}}
@media(max-width:520px){.report-studio{padding:10px}.report-studio-head h1{font-size:21px}.report-studio-meta{display:grid;grid-template-columns:1fr 1fr}.report-studio-meta span{border-bottom:1px solid var(--border)}.rs-output-grid{grid-template-columns:1fr}.rs-kpi-row{grid-template-columns:1fr 1fr}}



/* -------------------------------------------------------------------------- */
/* Open Ledger Docs — premium document processing experience                   */
/* -------------------------------------------------------------------------- */
.ol-processing-backdrop {
  position: fixed; inset: 0; z-index: 140; display: grid; place-items: center;
  padding: 24px; background: rgba(6, 15, 30, .62); backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px); animation: olFadeIn .24s ease both;
}
.ol-processing-shell {
  width: min(1120px, 100%); max-height: min(860px, calc(100vh - 48px)); overflow: auto;
  border: 1px solid rgba(148, 163, 184, .25); border-radius: 28px;
  background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(247,250,252,.97));
  box-shadow: 0 40px 120px rgba(2, 13, 29, .34), 0 8px 30px rgba(2, 13, 29, .16);
  color: #0B1F3A; animation: olPanelIn .34s cubic-bezier(.22,1,.36,1) both;
}
.dark .ol-processing-shell { background: linear-gradient(145deg, rgba(11,31,58,.98), rgba(12,27,48,.98)); color: #F8FAFC; border-color: rgba(148,163,184,.18); }
.ol-processing-shell.is-error { border-color: rgba(239,68,68,.24); }
.ol-processing-shell.is-complete { border-color: rgba(31,181,201,.28); }
.ol-processing-header, .ol-processing-footer { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 24px; }
.ol-processing-header { border-bottom:1px solid rgba(148,163,184,.15); }
.ol-processing-brand { display:flex; align-items:center; gap:11px; }
.ol-processing-brand > div { display:flex; flex-direction:column; gap:2px; }
.ol-processing-brand > div span { font-size:10px; letter-spacing:.16em; font-weight:800; opacity:.55; }
.ol-processing-brand > div strong { font-size:12px; letter-spacing:.08em; }
.ol-processing-orbit { width:32px; height:32px; display:grid; place-items:center; border-radius:10px; color:#1FB5C9; background:rgba(31,181,201,.10); border:1px solid rgba(31,181,201,.20); box-shadow:0 0 0 5px rgba(31,181,201,.035); }
.ol-processing-close { width:36px; height:36px; border:1px solid rgba(148,163,184,.18); border-radius:10px; background:transparent; color:inherit; display:grid; place-items:center; cursor:pointer; transition:.2s ease; }
.ol-processing-close:hover { background:rgba(148,163,184,.10); transform:translateY(-1px); }
.ol-processing-title-row { display:flex; justify-content:space-between; gap:24px; padding:25px 28px 18px; }
.ol-processing-eyebrow { color:#1FB5C9; font-size:10px; font-weight:800; letter-spacing:.17em; }
.ol-processing-title-row h2 { margin:7px 0 6px; font-size:clamp(22px, 3vw, 31px); line-height:1.1; letter-spacing:-.035em; }
.ol-processing-title-row p { margin:0; color:#64748B; max-width:690px; font-size:14px; line-height:1.6; }
.dark .ol-processing-title-row p { color:#94A3B8; }
.ol-ai-status { flex:none; display:flex; align-items:center; gap:8px; align-self:flex-start; padding:9px 12px; border:1px solid rgba(31,181,201,.18); background:rgba(31,181,201,.055); border-radius:999px; font-size:11px; font-weight:750; color:#0E7490; }
.ol-ai-status.error { color:#B91C1C; border-color:rgba(239,68,68,.18); background:rgba(239,68,68,.06); }
.ol-ai-status.complete { color:#047857; border-color:rgba(16,185,129,.18); background:rgba(16,185,129,.06); }
.ol-ai-pulse { display:grid; place-items:center; width:22px; height:22px; border-radius:50%; background:#E6F8FA; position:relative; color:#1FB5C9; }
.ol-ai-pulse:before { content:""; position:absolute; inset:-4px; border:1px solid rgba(31,181,201,.30); border-radius:50%; animation:olPulse 1.8s ease-out infinite; }
.dark .ol-ai-pulse { background:rgba(31,181,201,.12); }
.ol-processing-body { display:grid; grid-template-columns:minmax(300px,.88fr) minmax(0,1.12fr); gap:22px; padding:4px 28px 24px; }
.ol-preview-column { min-width:0; }
.ol-analysis-column { min-width:0; display:flex; flex-direction:column; gap:16px; }
.ol-processing-preview { overflow:hidden; border:1px solid rgba(11,31,58,.12); border-radius:18px; background:#EEF3F7; box-shadow:inset 0 1px 0 rgba(255,255,255,.8); }
.dark .ol-processing-preview { background:#0A192D; border-color:rgba(148,163,184,.15); }
.ol-preview-toolbar, .ol-preview-footer { height:36px; display:flex; align-items:center; gap:8px; padding:0 12px; color:#64748B; font-size:10px; font-weight:750; }
.ol-preview-toolbar { border-bottom:1px solid rgba(148,163,184,.14); }
.ol-preview-dot { width:7px; height:7px; border-radius:50%; background:#1FB5C9; box-shadow:0 0 0 4px rgba(31,181,201,.10); }
.ol-preview-page { margin-left:auto; opacity:.65; font-weight:650; }
.ol-document-sheet { position:relative; min-height:395px; margin:18px auto; width:min(83%, 390px); padding:28px 25px; border-radius:4px; background:#fff; box-shadow:0 18px 45px rgba(15,23,42,.16); overflow:hidden; }
.dark .ol-document-sheet { background:#F8FAFC; color:#0B1F3A; }
.ol-sheet-heading { display:flex; justify-content:space-between; align-items:center; padding-bottom:17px; border-bottom:2px solid #DCE5EA; }
.ol-sheet-title { font-size:13px; font-weight:800; letter-spacing:-.01em; }
.ol-sheet-mini { font-size:8px; color:#64748B; font-weight:800; }
.ol-sheet-lines { display:flex; flex-direction:column; gap:9px; padding-top:19px; }
.ol-sheet-line { display:block; height:5px; border-radius:4px; background:#D9E3E8; }
.ol-sheet-line.strong { height:8px; background:#B9CBD4; }
.ol-sheet-section { margin-top:25px; font-size:8px; letter-spacing:.12em; font-weight:900; color:#507083; }
.ol-sheet-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:11px; }
.ol-sheet-grid span { height:34px; border:1px solid #DCE6EB; border-radius:5px; background:#F7FAFB; }
.ol-sheet-lines.compact { padding-top:17px; gap:8px; }
.ol-image-preview { display:block; width:100%; height:100%; min-height:395px; object-fit:contain; background:#fff; }
.ol-scan-line { position:absolute; left:8%; right:8%; top:0; height:2px; background:#1FB5C9; box-shadow:0 0 12px rgba(31,181,201,.75), 0 0 28px rgba(31,181,201,.25); animation:olScan 2.9s cubic-bezier(.45,0,.55,1) infinite; opacity:.9; }
.ol-detection-highlight { position:absolute; height:27px; border:1px solid rgba(31,181,201,.42); background:rgba(31,181,201,.075); border-radius:4px; animation:olHighlight 1.1s ease both; }
.highlight-one { top:26%; left:15%; width:59%; }
.highlight-two { top:51%; left:15%; width:70%; animation-delay:.35s; }
.highlight-three { top:69%; left:15%; width:52%; animation-delay:.7s; }
.ol-preview-footer { border-top:1px solid rgba(148,163,184,.14); }
.ol-preview-footer span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ol-preview-footer strong { margin-left:auto; font-size:9px; opacity:.7; }
.ol-processing-stages { display:grid; grid-template-columns:repeat(6, 1fr); gap:0; padding:4px 0 2px; }
.ol-stage { min-width:0; position:relative; display:flex; flex-direction:column; align-items:center; gap:7px; color:#94A3B8; font-size:9px; font-weight:750; text-align:center; }
.ol-stage i { position:absolute; left:50%; top:13px; width:100%; height:1px; background:#DDE5EA; z-index:0; }
.dark .ol-stage i { background:#243B53; }
.ol-stage-node { position:relative; z-index:1; width:27px; height:27px; display:grid; place-items:center; border-radius:50%; border:1px solid #D6E0E5; background:#fff; color:#94A3B8; font-size:8px; transition:.3s ease; }
.dark .ol-stage-node { background:#0B1F3A; border-color:#29435D; }
.ol-stage.is-current { color:#0E7490; }
.ol-stage.is-current .ol-stage-node { border-color:#1FB5C9; color:#0E7490; box-shadow:0 0 0 5px rgba(31,181,201,.08); }
.ol-stage.is-complete { color:#047857; }
.ol-stage.is-complete .ol-stage-node { border-color:#34D399; background:#ECFDF5; color:#047857; }
.ol-stage.is-complete i { background:#9ADFD1; }
.ol-live-analysis { border:1px solid rgba(148,163,184,.17); border-radius:17px; padding:17px; background:rgba(248,250,252,.72); }
.dark .ol-live-analysis { background:rgba(2,13,29,.22); }
.ol-live-heading { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:800; color:#334155; margin-bottom:13px; }
.dark .ol-live-heading { color:#CBD5E1; }
.ol-live-dot { width:7px; height:7px; border-radius:50%; background:#1FB5C9; box-shadow:0 0 0 5px rgba(31,181,201,.08); animation:olBlink 1.6s ease-in-out infinite; }
.ol-extraction-list { display:grid; gap:8px; }
.ol-extraction-row { display:flex; align-items:center; gap:10px; padding:10px 11px; border:1px solid rgba(148,163,184,.12); border-radius:10px; background:rgba(255,255,255,.72); animation:olFieldIn .35s ease both; }
.dark .ol-extraction-row { background:rgba(15,35,58,.56); }
.ol-extraction-row:nth-child(2) { animation-delay:.08s; }.ol-extraction-row:nth-child(3) { animation-delay:.16s; }.ol-extraction-row:nth-child(4) { animation-delay:.24s; }
.ol-extraction-check { width:21px; height:21px; flex:none; display:grid; place-items:center; border-radius:7px; color:#0E7490; background:#E8F9FB; }
.ol-extraction-row div { display:flex; flex-direction:column; min-width:0; gap:2px; }
.ol-extraction-row span:not(.ol-extraction-check) { font-size:9px; color:#64748B; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
.ol-extraction-row strong { font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ol-progress-wrap { margin-top:14px; }
.ol-progress-top { display:flex; justify-content:space-between; gap:10px; font-size:10px; font-weight:750; color:#64748B; margin-bottom:8px; }
.ol-progress-top strong { color:#0B1F3A; }.dark .ol-progress-top strong { color:#E2E8F0; }
.ol-progress-track { height:5px; overflow:hidden; border-radius:99px; background:#DCE6EA; }
.dark .ol-progress-track { background:#223A52; }
.ol-progress-track > span { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#0B1F3A,#1FB5C9); transition:width .35s ease; }
.ol-progress-track.indeterminate:before { content:""; display:block; width:35%; height:100%; border-radius:inherit; background:linear-gradient(90deg,transparent,#1FB5C9,transparent); animation:olIndeterminate 1.5s ease-in-out infinite; }
.ol-progress-wrap small { display:block; margin-top:7px; color:#94A3B8; font-size:9px; }
.ol-complete-card, .ol-error-card { display:flex; gap:11px; align-items:flex-start; padding:14px; border-radius:12px; }
.ol-complete-card { color:#047857; background:#ECFDF5; border:1px solid #A7F3D0; }.ol-error-card { color:#B91C1C; background:#FEF2F2; border:1px solid #FECACA; }
.ol-complete-card div, .ol-error-card div { display:flex; flex-direction:column; gap:4px; }.ol-complete-card span, .ol-error-card span { color:#64748B; font-size:11px; line-height:1.5; }
.ol-processing-footer { border-top:1px solid rgba(148,163,184,.14); }
.ol-processing-assurance { display:flex; align-items:center; gap:7px; color:#64748B; font-size:10px; }
.ol-processing-assurance svg { color:#1FB5C9; }.ol-processing-actions { display:flex; gap:8px; }
@keyframes olFadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes olPanelIn { from { opacity:0; transform:translateY(12px) scale(.985) } to { opacity:1; transform:none } }
@keyframes olScan { 0% { top:7%; opacity:0 } 12% { opacity:.9 } 80% { opacity:.9 } 100% { top:91%; opacity:0 } }
@keyframes olHighlight { from { opacity:0; transform:scaleX(.94) } to { opacity:1; transform:none } }
@keyframes olPulse { 0% { transform:scale(.8); opacity:.8 } 100% { transform:scale(1.55); opacity:0 } }
@keyframes olBlink { 0%,100% { opacity:.4 } 50% { opacity:1 } }
@keyframes olFieldIn { from { opacity:0; transform:translateY(5px) scale(.99) } to { opacity:1; transform:none } }
@keyframes olIndeterminate { 0% { transform:translateX(-120%) } 100% { transform:translateX(330%) } }
@media (max-width: 820px) {
  .ol-processing-backdrop { padding:10px; align-items:end; }
  .ol-processing-shell { max-height:calc(100vh - 20px); border-radius:22px; }
  .ol-processing-title-row { padding:20px 18px 14px; flex-direction:column; gap:12px; }
  .ol-processing-body { grid-template-columns:1fr; padding:4px 18px 18px; }
  .ol-document-sheet { min-height:270px; width:min(72%,330px); padding:20px 18px; }
  .ol-image-preview { min-height:270px; }
  .ol-processing-stages { overflow-x:auto; padding-bottom:5px; }
  .ol-stage { min-width:75px; }
  .ol-processing-footer { align-items:flex-start; flex-direction:column; padding:14px 18px 18px; }
  .ol-processing-actions { width:100%; }.ol-processing-actions button { flex:1; }
}
@media (prefers-reduced-motion: reduce) {
  .ol-processing-backdrop, .ol-processing-shell, .ol-scan-line, .ol-ai-pulse:before, .ol-live-dot, .ol-extraction-row, .ol-progress-track.indeterminate:before { animation:none !important; }
  .ol-stage-node, .ol-processing-close, .ol-progress-track > span { transition:none !important; }
}
`;
