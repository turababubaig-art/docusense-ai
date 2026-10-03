const API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const SAP_BASE = `${API_BASE_URL}/api/sap`;

const getHeaders = (json = true) => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
});

async function request(path, options = {}) {
  const response = await fetch(`${SAP_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(!(options.body instanceof FormData)), ...(options.headers || {}) },
  });

  if (!response.ok) {
    let message = "";
    try {
      const payload = await response.json();
      message = payload?.detail || payload?.message || payload?.error || "";
    } catch {
      message = await response.text().catch(() => "");
    }
    throw new Error(message || `SAP API request failed (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : response;
}

export const connectSAP = (payload) => request("/connect", { method: "POST", body: JSON.stringify(payload) });
export const getSAPStatus = () => request("/status");
export const testSAPConnection = (payload = {}) => request("/test-connection", { method: "POST", body: JSON.stringify(payload) });
export const getSAPEntities = () => request("/entities");
export const getSAPEntity = (entityName) => request(`/entities/${encodeURIComponent(entityName)}`);
export const querySAP = (payload) => request("/query", { method: "POST", body: JSON.stringify(payload) });
export const startSAPImport = (payload) => request("/import", { method: "POST", body: JSON.stringify(payload) });
export const getImportStatus = (jobId) => request(`/import/${encodeURIComponent(jobId)}`);
export const getImportPreview = (jobId) => request(`/import/${encodeURIComponent(jobId)}/preview`);
export const analyzeSAPData = (payload) => request("/analyze", { method: "POST", body: JSON.stringify(payload) });
export const generateSAPReport = (payload) => request("/reports", { method: "POST", body: JSON.stringify(payload) });
export const getSAPReports = () => request("/reports");
export const getSAPReport = (reportId) => request(`/reports/${encodeURIComponent(reportId)}`);
export const downloadSAPReport = async (reportId) => {
  const response = await fetch(`${SAP_BASE}/reports/${encodeURIComponent(reportId)}/download`);
  if (!response.ok) throw new Error(`SAP report download failed (${response.status}).`);
  return response.blob();
};
export const disconnectSAP = () => request("/disconnect", { method: "POST", body: JSON.stringify({}) });

export default {
  connectSAP,
  getSAPStatus,
  testSAPConnection,
  getSAPEntities,
  getSAPEntity,
  querySAP,
  startSAPImport,
  getImportStatus,
  getImportPreview,
  analyzeSAPData,
  generateSAPReport,
  getSAPReports,
  getSAPReport,
  downloadSAPReport,
  disconnectSAP,
};
