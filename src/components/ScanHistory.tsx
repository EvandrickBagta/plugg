import React, { useEffect, useState } from "react";

interface QRScannerProps {
  selectedScan: ScanHistoryItem | null;
  onClearSelectedScan: () => void;
}

export interface ScanHistoryItem {
  url: string;
  extractedText: string;
  analysis: string;
}

interface ScanHistoryProps {
  onSelect?: (item: ScanHistoryItem) => void;
}

const ScanHistory: React.FC<ScanHistoryProps> = ({ onSelect }) => {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);

  // Load from localStorage and listen for updates
  useEffect(() => {
    const loadScans = () => {
      const stored = localStorage.getItem("scanHistoryV2");
      if (stored) {
        setScans(JSON.parse(stored));
      } else {
        setScans([]);
      }
    };
    loadScans();
    window.addEventListener("scanHistoryUpdated", loadScans);
    return () => window.removeEventListener("scanHistoryUpdated", loadScans);
  }, []);

  const handleDelete = (urlToRemove: string) => {
    const updated = scans.filter((item) => item.url !== urlToRemove);
    setScans(updated);
    localStorage.setItem("scanHistoryV2", JSON.stringify(updated));
    window.dispatchEvent(new Event("scanHistoryUpdated"));
  };

  return (
    <div
      style={{
        padding: "10px",
        overflowY: "auto",
        height: "100%",
        background: "#f9f9f9",
      }}
    >
      <h3 style={{ fontSize: "18px", marginBottom: "10px" }}>Scan History</h3>
      {scans.length === 0 && <p style={{ color: "#666" }}>No scans yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {scans.map((item, index) => (
          <li
            key={index}
            style={{
              marginBottom: "10px",
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "8px",
              fontSize: "14px",
              wordBreak: "break-all",
              cursor: "pointer",
            }}
          >
            <div onClick={() => onSelect?.(item)}>{item.url}</div>
            <button
              onClick={() => handleDelete(item.url)}
              style={{
                marginTop: "6px",
                fontSize: "12px",
                background: "transparent",
                color: "#d00",
                border: "none",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

function QRScanner({ selectedScan, onClearSelectedScan }: QRScannerProps) {
  // component implementation
}

export default ScanHistory;
