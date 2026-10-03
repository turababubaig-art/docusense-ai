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
} from "lucide-react";
import ExcelJS from "exceljs";

/* -------------------------------- */
/* Backend connection */
/* -------------------------------- */

// Your FastAPI/Flask/etc backend. Change this if the backend runs
// somewhere other than localhost:8000 (e.g. once deployed).
const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ANALYZE_URL) ||
  "http://127.0.0.1:8000/analyze";
const ANALYZE_ENDPOINT = `${API_BASE_URL}`;
// Reuse the existing backend host/base path for document chat. The analyzer
// currently ends in /analyze, so /chat is the sibling FastAPI endpoint.
const CHAT_ENDPOINT = API_BASE_URL.replace(/\/analyze\/?$/, "/chat");

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
    console.warn("DocuSense local persistence unavailable:", error);
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
    `docusense-analysis-${new Date().toISOString().slice(0, 10)}.csv`,
    rowsToCSV(rows),
    "text/csv;charset=utf-8"
  );
}

function exportWorkspaceJSON(documents = [], folders = []) {
  const payload = {
    exportedAt: new Date().toISOString(),
    product: "DocuSense",
    documents: documents.map(sanitizeDocumentForStorage),
    folders,
  };
  downloadTextFile(
    `docusense-workspace-${new Date().toISOString().slice(0, 10)}.json`,
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
    return "The analyzer could not be reached. Check that the backend is running and CORS is enabled.";
  }
  return error.message || "The analyzer returned an unexpected error.";
}


const initialDocuments = [
  {
    id: 1,
    name: "NDA Agreement.pdf",
    type: "PDF",
    size: "2.4 MB",
    status: "Analyzed",
    risk: "Low",
    date: "Today, 10:42 AM",
    pages: 6,
    wordCount: 2140,
    confidence: 97,
    uploadedBy: "Admin User",
    language: "English",
    tags: ["Legal", "Confidential", "NDA"],
    category: "NDA",
    categoryDescription: CATEGORY_DESCRIPTIONS.NDA,
    summary:
      "A mutual non-disclosure agreement between two parties covering the exchange of confidential business information for a period of 3 years.",
    entities: [
      { label: "Party A", value: "Acme Holdings LLC" },
      { label: "Party B", value: "Bright Path Ventures Inc." },
      { label: "Effective Date", value: "Jan 12, 2026" },
      { label: "Term", value: "3 years" },
      { label: "Governing Law", value: "State of Delaware" },
    ],
    findings: [
      { level: "Low", text: "Standard mutual confidentiality clause, balanced obligations." },
      { level: "Low", text: "Return-of-materials clause present with 30-day window." },
    ],
  },
  {
    id: 2,
    name: "Employment Contract.pdf",
    type: "PDF",
    size: "1.8 MB",
    status: "Analyzed",
    risk: "Medium",
    date: "Yesterday, 4:20 PM",
    pages: 9,
    wordCount: 3120,
    confidence: 92,
    uploadedBy: "Admin User",
    language: "English",
    tags: ["HR", "Contract"],
    category: "Employment",
    categoryDescription: CATEGORY_DESCRIPTIONS.Employment,
    summary:
      "Full-time employment agreement outlining compensation, benefits, non-compete terms and termination conditions.",
    entities: [
      { label: "Employer", value: "Northwind Technologies" },
      { label: "Employee", value: "J. Alvarez" },
      { label: "Start Date", value: "Oct 1, 2026" },
      { label: "Base Salary", value: "$96,000 / yr" },
      { label: "Notice Period", value: "45 days" },
    ],
    findings: [
      { level: "Medium", text: "Non-compete clause extends 18 months, above typical market range." },
      { level: "Low", text: "Standard at-will termination language." },
    ],
  },
  {
    id: 3,
    name: "Invoice_2026_09.docx",
    type: "DOCX",
    size: "850 KB",
    status: "Processing",
    risk: "Pending",
    date: "Yesterday, 2:15 PM",
    pages: 2,
    wordCount: 410,
    confidence: null,
    uploadedBy: "Admin User",
    language: "English",
    tags: ["Finance", "Invoice"],
    category: "Invoice",
    categoryDescription: CATEGORY_DESCRIPTIONS.Invoice,
    summary: "Analysis in progress. Structured fields will appear once processing completes.",
    entities: [],
    findings: [],
  },
  {
    id: 4,
    name: "Resume_Jordan_Lee.pdf",
    type: "PDF",
    size: "310 KB",
    status: "Analyzed",
    risk: "Low",
    date: "2 days ago",
    pages: 2,
    wordCount: 640,
    confidence: 88,
    uploadedBy: "Admin User",
    language: "English",
    tags: ["Resume"],
    category: "Resume",
    categoryDescription: CATEGORY_DESCRIPTIONS.Resume,
    summary:
      "A résumé for a senior software engineer with 6 years of backend experience, covering work history, education, and technical skills.",
    entities: [
      { label: "Name", value: "Jordan Lee" },
      { label: "Email", value: "jordan.lee@example.com" },
      { label: "Phone", value: "(415) 555-0199" },
      { label: "Most Recent Role", value: "Senior Engineer, Acme Corp" },
      { label: "Skills", value: "Python, distributed systems, PostgreSQL" },
    ],
    findings: [
      { level: "Low", text: "No risk indicators — résumés are informational, not contractual." },
    ],
  },
];

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
      "10 analyses / month",
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
    return Array.isArray(saved?.documents) && saved.documents.length
      ? saved.documents
      : initialDocuments;
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
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);

  const [workspaceHydrated, setWorkspaceHydrated] = useState(false);

  useEffect(() => {
    const saved = loadPersistedJSON(APP_STORAGE_KEY, null);
    if (saved?.documents?.length) {
      // Persisted File objects cannot be restored; analyzed metadata remains usable.
      setDocuments((current) =>
        current.map((doc) => {
          const savedDoc = saved.documents.find((item) => item.id === doc.id);
          return savedDoc ? { ...doc, ...savedDoc, file: doc.file } : doc;
        })
      );
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

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
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

  const createFolder = (name) => {
    const cleanName = name.trim();
    if (!cleanName) return null;
    if (folders.some((folder) => folder.name.toLowerCase() === cleanName.toLowerCase())) return null;

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

    const newDocuments = incomingFiles.map((file, index) => ({
      id: makeClientDocumentId() + `-${index}`,
      name: file.name,
      folderId: selectedFolderId || "other",
      type: getFileExtension(file.name).toUpperCase() || "FILE",
      size: formatFileSize(file.size),
      status: "Processing",
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
      const response = await fetch(ANALYZE_ENDPOINT, {
        method: "POST",
        body: formData,
        signal: timeout.signal,
      });

      if (!response.ok) {
        let detail = "";
        try {
          const payload = await response.json();
          detail = payload?.detail || payload?.message || "";
        } catch {
          // Non-JSON error responses are still handled below.
        }
        throw new Error(
          detail || `Backend returned ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      const parsed = mapAnalysisResponse(result);

      setDocuments((current) =>
        current.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                ...parsed,
                status: parsed.status || "Analyzed",
                analyzedAt: new Date().toISOString(),
                error: null,
              }
            : doc
        )
      );
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
      <>
        <style>{styles}</style>
        {showLogin ? (
          <LoginPage
            onBack={() => setShowLogin(false)}
            onContinue={() => {
              setShowLogin(false);
              setShowLanding(false);
              showToast("Welcome back to your workspace.", "success");
            }}
          />
        ) : (
          <LandingPage
            onViewApp={() => setShowLanding(false)}
            onAnalyze={() => {
              setShowLanding(false);
              setActivePage("Analyzer");
            }}
            onSignIn={() => setShowLogin(true)}
          />
        )}
      </>
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

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"} ${mobileMenu ? "mobile-open" : ""}`}>

        <div className="logo">
          <div className="logo-icon">
            <FileSearch size={19} />
          </div>

          <div className="logo-copy">
            <span>DocuSense</span>
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
            <strong>DocuSense</strong>
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

          <strong>72%</strong>

          <div className="progress">
            <div style={{ width: "72%" }} />
          </div>

          <p>720 / 1,000 analyses</p>

          <button onClick={() => setActivePage("Pricing")}>
            Upgrade plan
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* User */}
        <div className="user-card">
          <div className="avatar">
            A
          </div>

          <div className="user-info">
            <strong>Admin User</strong>
            <span>Pro Workspace</span>
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

          {activePage === "Analyze" && (
            <AnalyzePage
              document={selectedDocument}
              onBack={() => setActivePage("Analyzer")}
              onDocuments={() => setActivePage("Documents")}
              onSelect={(doc) => setSelectedDocumentId(doc.id)}
              documents={documents}
              folders={folders}
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
              search={search}
              onUpload={() => setShowUpload(true)}
              onDelete={deleteDocument}
              onMoveDocument={moveDocument}
              onSelect={(doc) => setSelectedDocumentId(doc.id)}
            />
          )}

          {activePage === "Analytics" && (
            <Analytics documents={documents} />
          )}

          {activePage === "Presentation" && (
            <PresentationBuilder
              documents={documents}
              folders={folders}
              config={presentationConfig}
              onConfig={setPresentationConfig}
              onBack={() => setActivePage("Analyze")}
            />
          )}

          {activePage === "Pricing" && (
            <Pricing
              billingCycle={billingCycle}
              setBillingCycle={setBillingCycle}
            />
          )}

          {activePage === "Settings" && (
            <SettingsPage />
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
      {selectedDocument && (
        <DocumentModal
          document={selectedDocument}
          onClose={() => setSelectedDocumentId(null)}
          onDelete={deleteDocument}
          onRetry={retryAnalysis}
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

      {toast && (
        <ToastMessage message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      )}

    </div>
  );
}

/* Public landing page */
/* -------------------------------- */

function LandingPage({ onViewApp, onAnalyze, onSignIn }) {
  const [activeDemo, setActiveDemo] = useState("overview");
  const demoCards = {
    overview: {
      title: "Contract review",
      subtitle: "Employment Agreement.pdf",
      status: "Analyzed",
      score: "94%",
      label: "AI confidence",
      icon: <FileCheck2 size={24} />,
    },
    risks: {
      title: "Risk review",
      subtitle: "12 clauses scanned",
      status: "2 flagged",
      score: "Low",
      label: "Portfolio risk",
      icon: <ShieldCheck size={24} />,
    },
    insights: {
      title: "Executive insight",
      subtitle: "Board-ready summary",
      status: "Ready",
      score: "8",
      label: "Key findings",
      icon: <Sparkles size={24} />,
    },
  };
  const demo = demoCards[activeDemo];

  return (
    <div className="reference-landing">
      <div className="reference-page-shell">
        <header className="reference-nav">
          <button className="reference-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className="reference-brand-mark"><FileSearch size={16} /></span>
            <span>DocuSense</span>
          </button>

          <nav className="reference-nav-links" aria-label="Main navigation">
            <a href="#product">Product</a>
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#security">Security</a>
            <a href="#pricing">Pricing</a>
          </nav>

          <div className="reference-nav-actions">
            <button className="reference-signin" onClick={onSignIn}>Sign in</button>
            <button className="reference-demo-button" onClick={onViewApp}>Request a Demo <ArrowUpRight size={13} /></button>
          </div>
        </header>

        <main>
          <section className="reference-hero" id="product">
            <div className="reference-hero-copy">
              <div className="reference-eyebrow"><span className="reference-eyebrow-dot" /> DOCUMENT INTELLIGENCE WORKSPACE</div>
              <h1>All-in-one <span>document</span><br />intelligence platform</h1>
              <p>
                Convert contracts, reports, invoices, resumes and business files into structured insights.
                Review what matters, find risks faster, and turn analysis into a professional presentation.
              </p>
              <div className="reference-hero-actions">
                <button className="reference-primary-cta" onClick={onAnalyze}>Request a Demo <ArrowUpRight size={15} /></button>
                <button className="reference-secondary-cta" onClick={onViewApp}>View Your Workspace <ChevronRight size={15} /></button>
              </div>
              <div className="reference-trust-row">
                <span><CheckCircle2 size={13} /> PDF & DOCX</span>
                <span><CheckCircle2 size={13} /> Risk detection</span>
                <span><CheckCircle2 size={13} /> Presentation mode</span>
              </div>
            </div>

            <div className="reference-hero-art" aria-label="Document intelligence preview">
              <div className="reference-network reference-network-one" />
              <div className="reference-network reference-network-two" />
              <div className="reference-network reference-network-three" />
              <div className="reference-network reference-network-four" />

              <div className="reference-orb orb-yellow"><Sparkles size={17} /></div>
              <div className="reference-orb orb-blue"><FileText size={17} /></div>
              <div className="reference-orb orb-red"><ShieldCheck size={17} /></div>
              <div className="reference-orb orb-white"><BarChart3 size={18} /></div>

              <div className="reference-avatar avatar-left"><span>DS</span></div>
              <div className="reference-avatar avatar-right"><span>AI</span></div>

              <div className="reference-center-card">
                <div className="reference-center-icon"><CheckCircle2 size={35} strokeWidth={1.8} /></div>
                <div className="reference-center-ring" />
              </div>

              <div className="reference-mini-card mini-left">
                <div className="mini-icon"><FileText size={13} /></div>
                <div><strong>Contract.pdf</strong><span>Analyzed</span></div>
                <CheckCircle2 size={14} />
              </div>

              <div className="reference-mini-card mini-right">
                <div className="mini-icon"><Layers size={13} /></div>
                <div><strong>Report.docx</strong><span>12 pages</span></div>
                <Activity size={14} />
              </div>

              <div className="reference-analysis-chip">
                <span className="chip-pulse" />
                <div><strong>AI analysis complete</strong><small>42 fields · 3 findings · 94% confidence</small></div>
              </div>
            </div>
          </section>

          <section className="reference-logo-strip">
            <span>WORKS WITH THE FILES YOUR TEAM ALREADY USES</span>
            <div><b>PDF</b><b>DOCX</b><b>XLSX</b><b>PNG</b><b>JPG</b><b>CONTRACTS</b><b>INVOICES</b><b>RESUMES</b></div>
          </section>

          <section className="reference-feature-section" id="features">
            <div className="reference-section-heading">
              <span>ONE WORKSPACE</span>
              <h2>Everything important,<br />without the busywork.</h2>
              <p>Upload once and move through extraction, review, risk analysis, comparison, reporting and presentation from the same workspace.</p>
            </div>

            <div className="reference-feature-grid">
              <article className="reference-feature-card feature-large">
                <div className="feature-card-icon purple"><FileSearch size={20} /></div>
                <span>01 · UNDERSTAND</span>
                <h3>Turn long documents into clear reviews.</h3>
                <p>See summaries, entities, dates, numbers, clauses and important facts in a format your team can scan quickly.</p>
                <div className="feature-preview-lines"><i /><i /><i /><i /></div>
              </article>
              <article className="reference-feature-card">
                <div className="feature-card-icon red"><ShieldCheck size={20} /></div>
                <span>02 · PROTECT</span>
                <h3>Find risks before they get buried.</h3>
                <p>Group findings by severity and surface missing information that deserves a second look.</p>
                <div className="feature-risk-stack"><b>High</b><b>Medium</b><b>Low</b></div>
              </article>
              <article className="reference-feature-card">
                <div className="feature-card-icon blue"><BarChart3 size={20} /></div>
                <span>03 · EXPLAIN</span>
                <h3>Build an executive view from the analysis.</h3>
                <p>Use dashboards and presentation mode to turn document-level results into a story for clients and teams.</p>
                <div className="feature-bars"><i style={{height:"48%"}} /><i style={{height:"74%"}} /><i style={{height:"61%"}} /><i style={{height:"88%"}} /><i style={{height:"68%"}} /></div>
              </article>
            </div>
          </section>

          <section className="reference-demo-section" id="workflow">
            <div className="reference-demo-head">
              <div><span>LIVE PRODUCT PREVIEW</span><h2>From upload to<br />decision-ready output.</h2></div>
              <div className="reference-demo-tabs">
                {Object.entries(demoCards).map(([key, item]) => (
                  <button key={key} className={activeDemo === key ? "active" : ""} onClick={() => setActiveDemo(key)}>{item.title}</button>
                ))}
              </div>
            </div>
            <div className="reference-demo-window">
              <div className="demo-window-sidebar">
                <div className="demo-sidebar-brand"><span><FileSearch size={12} /></span> DocuSense</div>
                <div className="demo-sidebar-item active"><LayoutDashboard size={13} /> Dashboard</div>
                <div className="demo-sidebar-item"><FileSearch size={13} /> Analyzer</div>
                <div className="demo-sidebar-item"><Files size={13} /> Documents</div>
                <div className="demo-sidebar-item"><BarChart3 size={13} /> Analytics</div>
              </div>
              <div className="demo-window-main">
                <div className="demo-window-top"><span>Workspace / {demo.title}</span><span className="demo-status"><span /> {demo.status}</span></div>
                <div className="demo-window-content">
                  <div className="demo-document-title"><div className="demo-file-box">{demo.icon}</div><div><span>AI REVIEW</span><h3>{demo.subtitle}</h3></div></div>
                  <div className="demo-kpi-row">
                    <div><span>{demo.label}</span><strong>{demo.score}</strong></div>
                    <div><span>Pages reviewed</span><strong>12</strong></div>
                    <div><span>Important fields</span><strong>24</strong></div>
                    <div><span>Findings</span><strong>03</strong></div>
                  </div>
                  <div className="demo-lower-grid"><div className="demo-panel"><span>AI SUMMARY</span><p>The document was reviewed and structured into a concise set of findings, fields, risks and recommended follow-up actions.</p><div className="demo-line-list"><i /><i /><i /></div></div><div className="demo-panel"><span>REVIEW SIGNALS</span><div className="demo-signal"><b>Confidence</b><strong>94%</strong><em><i /></em></div><div className="demo-signal"><b>Risk coverage</b><strong>88%</strong><em><i /></em></div><div className="demo-signal"><b>Field extraction</b><strong>96%</strong><em><i /></em></div></div></div>
                </div>
              </div>
            </div>
          </section>

          <section className="reference-workflow-section">
            <div className="reference-section-heading compact"><span>HOW IT WORKS</span><h2>Three steps to a clearer file.</h2><p>No complicated setup. Drop in a document and let the workspace organize the review.</p></div>
            <div className="reference-step-grid">
              <div><span>01</span><FileUp size={18} /><h3>Upload</h3><p>Drop one document or a batch of files into the analyzer.</p></div>
              <div><span>02</span><Sparkles size={18} /><h3>Analyze</h3><p>The connected analyzer returns structured summaries, fields and findings.</p></div>
              <div><span>03</span><MonitorPlay size={18} /><h3>Present</h3><p>Move from a single PDF or an entire folder into a polished presentation.</p></div>
            </div>
          </section>

          <section className="reference-security-section" id="security">
            <div className="security-copy"><div className="security-badge"><ShieldCheck size={16} /> REVIEW-FIRST WORKFLOW</div><h2>Built to make important information easier to see.</h2><p>Keep original context, extracted information, AI findings and presentation output connected instead of scattering the work across separate tools.</p><button className="reference-secondary-cta" onClick={onViewApp}>Explore workspace <ArrowUpRight size={15} /></button></div>
            <div className="security-grid"><div><ShieldCheck size={18} /><strong>Clear review states</strong><span>Processing, analyzed and failed states stay visible.</span></div><div><Files size={18} /><strong>Saved workspace</strong><span>Documents and folders remain connected to their analysis.</span></div><div><Download size={18} /><strong>Professional exports</strong><span>Keep analysis results ready for reporting and sharing.</span></div><div><MonitorPlay size={18} /><strong>Presentation ready</strong><span>Build a deck from one document or a whole folder.</span></div></div>
          </section>

          <section className="reference-pricing-section" id="pricing">
            <div><span>READY TO REVIEW</span><h2>Bring your next document<br />into the workspace.</h2><p>Start with the existing analyzer and expand from one file to a complete document intelligence workflow.</p></div>
            <div className="reference-pricing-actions"><button className="reference-primary-cta" onClick={onViewApp}>View Your Workspace <ArrowUpRight size={15} /></button><button className="reference-signin large" onClick={onSignIn}>Sign in</button></div>
          </section>
        </main>

        <footer className="reference-footer"><div className="reference-brand"><span className="reference-brand-mark"><FileSearch size={16} /></span><span>DocuSense</span></div><span>Document intelligence workspace</span><span>© 2026</span></footer>
      </div>
    </div>
  );
}

function LoginPage({ onBack, onContinue }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password to continue.");
      return;
    }
    setError("");
    onContinue();
  };

  return (
    <div className="reference-auth-page">
      <div className="reference-auth-shell">
        <header className="reference-auth-nav"><button className="reference-brand" onClick={onBack}><span className="reference-brand-mark"><FileSearch size={16} /></span><span>DocuSense</span></button><button className="reference-signin" onClick={onBack}><ArrowLeft size={14} /> Back to site</button></header>
        <div className="reference-auth-card">
          <div className="auth-art-panel">
            <div className="auth-art-copy"><span>DOCUMENT INTELLIGENCE</span><h1>Turn every file into a clearer decision.</h1><p>Review contracts, reports, invoices and resumes with one connected AI workspace.</p></div>
            <div className="auth-art-stage">
              <div className="auth-art-line line-a" /><div className="auth-art-line line-b" /><div className="auth-art-line line-c" />
              <div className="auth-floating auth-float-one"><Sparkles size={16} /></div><div className="auth-floating auth-float-two"><ShieldCheck size={16} /></div><div className="auth-floating auth-float-three"><FileText size={16} /></div>
              <div className="auth-center-card"><CheckCircle2 size={32} /><strong>Ready</strong><span>Workspace analysis</span></div>
            </div>
          </div>
          <div className="auth-form-panel">
            <div className="auth-form-heading"><span>WELCOME BACK</span><h2>Sign in to your workspace</h2><p>Continue where you left off with your saved document reviews.</p></div>
            <form onSubmit={submit} className="auth-form">
              <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" /></label>
              <label>Password<div className="auth-password"><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</button></div></label>
              <div className="auth-form-row"><label className="auth-checkbox"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Remember me</span></label><button type="button" className="auth-forgot" onClick={() => setError("Password recovery is not connected in this demo workspace.")}>Forgot password?</button></div>
              {error && <div className="auth-error"><AlertTriangle size={14} /> {error}</div>}
              <button className="auth-submit" type="submit">Continue to workspace <ArrowUpRight size={15} /></button>
            </form>
            <div className="auth-demo-note"><Sparkles size={14} /><span>This is a workspace-ready demo sign-in. Connect your auth provider when deploying.</span></div>
          </div>
        </div>
        <footer className="reference-footer auth-footer"><span>Private workspace</span><span>Secure review flow</span><span>© 2026 DocuSense</span></footer>
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
        <article className="card dash-chart-card">
          <div className="dash-card-heading">
            <div>
              <span className="card-label">Analysis activity</span>
              <h2>Documents processed</h2>
            </div>
            <button className="dash-mini-select">7 days <ChevronRight size={13} /></button>
          </div>

          <div className="dash-chart-summary">
            <strong>{documents.length}</strong>
            <span>total documents</span>
            <em><ArrowUpRight size={12} /> Active workspace</em>
          </div>

          <div className="dash-line-chart">
            <div className="dash-y-labels"><span>10</span><span>8</span><span>6</span><span>4</span><span>2</span><span>0</span></div>
            <svg viewBox="0 0 380 170" preserveAspectRatio="none" aria-hidden="true">
              <line x1="20" y1="32" x2="372" y2="32" />
              <line x1="20" y1="54" x2="372" y2="54" />
              <line x1="20" y1="76" x2="372" y2="76" />
              <line x1="20" y1="98" x2="372" y2="98" />
              <line x1="20" y1="120" x2="372" y2="120" />
              <line x1="20" y1="142" x2="372" y2="142" />
              <polyline className="dash-area" points={`28,142 ${chartPoints} 352,142`} />
              <polyline className="dash-line" points={chartPoints} />
              {activity.map((value, index) => {
                const x = 28 + index * 54;
                const y = 142 - value * 11;
                return <circle className="dash-point" key={index} cx={x} cy={y} r="4.5" />;
              })}
            </svg>
            <div className="dash-x-labels">
              {activityLabels.map((label) => <span key={label}>{label}</span>)}
            </div>
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

function AnalyzePage({ document, onBack, onDocuments, onSelect, documents, folders, onPresentation }) {
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadDocumentExcel(current);
    } catch (error) {
      console.error("Excel export failed:", error);
      window.alert("Couldn't generate the Excel report.");
    } finally {
      setExporting(false);
    }
  };

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
            onClick={handleExport}
            disabled={exporting || isProcessing}
          >
            <Download size={16} />
            {exporting ? "Preparing…" : "Download report"}
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

function PresentationViewer({ slides, title, onExit }) {
  const [index, setIndex] = useState(0);
  useEffect(() => { const handler = e => { if (e.key === "ArrowRight") setIndex(v=>Math.min(slides.length-1,v+1)); if (e.key === "ArrowLeft") setIndex(v=>Math.max(0,v-1)); if (e.key === "Escape") onExit(); }; window.addEventListener("keydown",handler); return ()=>window.removeEventListener("keydown",handler); }, [slides.length,onExit]);
  const slide = slides[index];
  return <div className="presentation-shell"><div className="presentation-top"><strong>DocuSense · {title}</strong><span>{index+1} / {slides.length}</span><button onClick={onExit}><X size={17}/> Exit</button></div><main className="presentation-slide"><span className="presentation-kicker">DOCUMENT INTELLIGENCE PRESENTATION</span><h1>{slide.title}</h1><p>{slide.subtitle}</p><div className="presentation-content">{slide.body}</div></main><div className="presentation-controls"><button disabled={!index} onClick={()=>setIndex(v=>v-1)}>← Previous</button><div>{slides.map((_,i)=><button key={i} className={i===index?"active":""} onClick={()=>setIndex(i)} aria-label={`Slide ${i+1}`}/>)}</div><button disabled={index===slides.length-1} onClick={()=>setIndex(v=>v+1)}>Next →</button></div></div>;
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
        headers: {
          "Content-Type": "application/json",
        },
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

      setChatError(
        "Couldn't connect to DocuSense AI. Please make sure the backend is running."
      );
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
                <h2>Ask DocuSense AI</h2>
                <p>Ask questions about your document</p>
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
                {message.role === "user" ? "You" : "DocuSense AI"}
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
              <div className="document-chat-message-label">DocuSense AI</div>
              <div className="document-chat-thinking">
                <span className="document-chat-thinking-dot" />
                <span>DocuSense AI is thinking...</span>
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

/* -------------------------------- */
/* Documents */
/* -------------------------------- */

function Documents({
  documents,
  allDocuments,
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpload,
  onDelete,
  onMoveDocument,
  onSelect,
}) {
  const [exporting, setExporting] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  const activeFolder = folders.find((folder) => folder.id === selectedFolderId);

  const submitFolder = () => {
    const createdId = onCreateFolder?.(newFolderName);
    if (createdId) {
      setNewFolderName("");
      setShowNewFolder(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadDocumentsExcel(documents);
    } catch (error) {
      console.error("Excel export failed:", error);
      window.alert("Couldn't generate the Excel file. Check the console for details.");
    } finally {
      setExporting(false);
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
            onClick={handleExport}
            disabled={exporting || documents.length === 0}
          >
            <Download size={16} />
            {exporting ? "Preparing Excel…" : "Export Excel"}
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
              <button
                className={`folder-card ${selectedFolderId === folder.id ? "active" : ""}`}
                key={folder.id}
                onClick={() => onSelectFolder?.(folder.id)}
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
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [cvOnly, setCvOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [slide, setSlide] = useState(0);

  const allTypes = useMemo(() => [...new Set(documents.map((d) => d.category || d.type).filter(Boolean))], [documents]);
  const isCvDocument = (doc) => String(doc?.category || "").toLowerCase().includes("resume") || String(doc?.type || "").toLowerCase() === "cv";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((doc) => {
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
  }, [documents, query, riskFilter, statusFilter, typeFilter, cvOnly]);

  const stats = useMemo(() => calculateAnalyticsStats(filtered, documents), [filtered, documents]);

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
    workbook.creator = "DocuSense";
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

    await triggerExcelDownload(workbook, "docusense-analytics-report.xlsx");
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
  const categories = countValues(docs.map((d) => d.category || d.type || "Other"));
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
    const experience = parseExperience(experienceRaw);
    const skills = getEntity(doc, ["skills", "technical skills"]) || (doc.tags || []).join(", ");
    const education = getEntity(doc, ["education", "degree", "qualification"]) || "—";
    const location = getEntity(doc, ["location", "city", "address"]) || "—";
    const score = toNumberOrNull(getEntity(doc, ["match", "score", "fit"])) ?? doc.confidence ?? null;
    return { id: doc.id, document: doc, rank: index + 1, candidate: String(name), score, experience, skills: String(skills || "—"), education: String(education), location: String(location), status: score != null && score >= 80 ? "Shortlisted" : "Review" };
  });
  const experienceValues = candidates.map((c) => c.experience).filter((v) => v != null);
  const topSkills = countValues(candidates.flatMap((c) => c.skills.split(/[,|•]/).map((s) => s.trim()).filter(Boolean))).slice(0, 8).map(([skill, count]) => ({ skill, count }));
  return {
    totalCandidates: cvs.length,
    shortlisted: candidates.filter((c) => c.status === "Shortlisted").length,
    averageExperience: experienceValues.length ? Math.round((experienceValues.reduce((a, b) => a + b, 0) / experienceValues.length) * 10) / 10 : null,
    averageMatchScore: (() => { const v = candidates.map((c) => c.score).filter((x) => x != null); return v.length ? Math.round(v.reduce((a,b) => a+b,0)/v.length) : null; })(),
    topSkill: topSkills[0]?.skill || "",
    topSkills,
    experienceDistribution: ["0–1", "1–3", "3–5", "5–10", "10+"].map((label, i) => ({ label, count: candidates.filter((c) => c.experience != null && ((i === 0 && c.experience <= 1) || (i === 1 && c.experience > 1 && c.experience <= 3) || (i === 2 && c.experience > 3 && c.experience <= 5) || (i === 3 && c.experience > 5 && c.experience <= 10) || (i === 4 && c.experience > 10))).length })),
    educationDistribution: countValues(candidates.map((c) => c.education).filter((v) => v !== "—")).slice(0, 6),
    locationDistribution: countValues(candidates.map((c) => c.location).filter((v) => v !== "—")).slice(0, 6),
    candidates,
  };
}

function parseExperience(value) {
  if (value == null) return null;
  const match = String(value).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function countValues(values) {
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
  return <div className="presentation-shell"><div className="presentation-top"><strong>DocuSense AI</strong><span>{slide + 1} / {slides.length}</span><button onClick={onExit}><X size={17} /> Exit Presentation</button></div><main className="presentation-slide"><span className="presentation-kicker">ANALYTICS REPORT · {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span><h1>{current.title}</h1><p>{current.subtitle}</p><div className="presentation-content">{current.content}</div></main><div className="presentation-controls"><button disabled={slide===0} onClick={() => setSlide((v)=>Math.max(0,v-1))}>← Previous</button><div>{slides.map((_,i)=><button className={i===slide?"active":""} key={i} onClick={()=>setSlide(i)} aria-label={`Go to slide ${i+1}`} />)}</div><button disabled={slide===slides.length-1} onClick={() => setSlide((v)=>Math.min(slides.length-1,v+1))}>Next →</button></div></div>;
}

function buildPresentationSlides(stats) {
  const topRisk = stats.attention.slice(0, 4);
  return [
    { title: "Analytics Report", subtitle: "A presentation-ready view of the current DocuSense workspace.", content: <div className="presentation-kpi-large"><strong>{stats.total}</strong><span>documents in this report</span></div> },
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

function Pricing({ billingCycle, setBillingCycle }) {
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

              <button className={plan.featured ? "plan-cta primary" : "plan-cta"}>
                {plan.name === "Business" && <Phone size={15} />}
                {plan.cta}
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

function SettingsPage() {
  return (
    <>
      <div className="page-heading">

        <div>
          <div className="eyebrow">
            <Settings size={14} />
            Settings
          </div>

          <h1>Workspace settings</h1>

          <p>
            Configure your DocuSense workspace.
          </p>
        </div>

      </div>

      <div className="settings-layout">

        <section className="card settings-card">

          <h2>General</h2>

          <label>
            Workspace name
            <input defaultValue="DocuSense Workspace" />
          </label>

          <label>
            Default language
            <select defaultValue="English">
              <option>English</option>
              <option>Urdu</option>
              <option>Spanish</option>
            </select>
          </label>

          <button className="primary-button">
            Save changes
          </button>

        </section>

        <section className="card settings-card">

          <h2>AI Analysis</h2>

          <SettingToggle
            title="Automatic risk detection"
            text="Detect potentially risky clauses automatically."
            enabled
          />

          <SettingToggle
            title="Smart summaries"
            text="Generate a concise AI summary for every document."
            enabled
          />

          <SettingToggle
            title="Structured extraction"
            text="Extract important entities and values."
            enabled
          />

        </section>

      </div>
    </>
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

function DocumentModal({
  document,
  onClose,
  onDelete,
  onRetry,
}) {
  const tags = document.tags || [];
  const entities = document.entities || [];
  const findings = document.findings || [];
  const isProcessing = document.status === "Processing";
  const isFailed = document.status === "Failed";
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadDocumentExcel(document);
    } catch (error) {
      console.error("Excel export failed:", error);
      window.alert("Couldn't generate the Excel file. Check the console for details.");
    } finally {
      setExporting(false);
    }
  };

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
              onClick={handleExport}
              disabled={exporting}
            >
              <Download size={16} />
              {exporting ? "Preparing Excel…" : "Download Excel report"}
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

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SettingToggle({ title, text, enabled }) {
  return (
    <div className="setting-toggle">

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

      <div className={`toggle ${enabled ? "on" : ""}`}>
        <span />
      </div>

    </div>
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
  workbook.creator = "DocuSense";
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
  workbook.creator = "DocuSense";
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
  animation: docuSenseBorderSpin 4.2s linear infinite;
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
  animation: docuSenseHoverWash 2.8s ease-in-out infinite alternate;
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

@keyframes docuSenseBorderSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes docuSenseHoverWash {
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
@keyframes docuSenseRainbow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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

/* ========================================================================== */
/* Reference landing page / image-inspired visual system                     */
/* ========================================================================== */
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

/* ========================================================================== */
/* Reference-inspired sign-in / workspace access page                        */
/* ========================================================================== */
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

/* ========================================================================== */
/* Command palette                                                            */
/* ========================================================================== */
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

/* ========================================================================== */
/* Notification panel                                                         */
/* ========================================================================== */
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

/* ========================================================================== */
/* Shortcut modal                                                             */
/* ========================================================================== */
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

/* ========================================================================== */
/* Toasts                                                                     */
/* ========================================================================== */
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

/* ========================================================================== */
/* Dashboard support modules                                                  */
/* ========================================================================== */
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

/* ========================================================================== */
/* Analysis journey and review score                                          */
/* ========================================================================== */
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

/* ========================================================================== */
/* Document quick command bar and smart empty states                          */
/* ========================================================================== */
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

/* ========================================================================== */
/* Additional responsive polish                                               */
/* ========================================================================== */
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

/* ========================================================================== */
/* Accessibility and focus states                                             */
/* ========================================================================== */
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

/* ========================================================================== */
/* Fine-grained dark-mode compatibility for the expanded modules              */
/* ========================================================================== */
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

/* ========================================================================== */
/* Component density helpers                                                  */
/* ========================================================================== */
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

/* ========================================================================== */
/* Presentation-ready print helpers                                           */
/* ========================================================================== */
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


/* ========================================================================== */
/* 2026 VISUAL POLISH LAYER                                                   */
/* ========================================================================== */

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
`;

export default App;
/* ========================================================================== */
