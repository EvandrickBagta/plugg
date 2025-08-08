import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import PdfWorker from "../workers/pdf.worker.js?worker";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { ScanHistoryItem } from "./ScanHistory";
import ReactMarkdown from "react-markdown";

GlobalWorkerOptions.workerPort = new PdfWorker();

interface QRScannerProps {
  selectedScan: ScanHistoryItem | null;
  onClearSelectedScan: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({
  selectedScan,
  onClearSelectedScan,
}) => {
  const [result, setResult] = useState<string>("No result");
  const [analysis, setAnalysis] = useState<string>("Waiting for scan...");
  const [extractedText, setExtractedText] = useState<string>(
    "No text extracted yet."
  );
  const [activeTab, setActiveTab] = useState<"extracted" | "analysis">(
    "analysis"
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showMarkdown, setShowMarkdown] = useState<boolean>(true);

  const scannerRef = useRef<HTMLDivElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannedSet = useRef(new Set<string>());

  // Save scan to localStorage and notify ScanHistory
  const saveToHistory = (
    url: string,
    extractedText: string,
    analysis: string
  ) => {
    const stored = localStorage.getItem("scanHistoryV2");
    let history: ScanHistoryItem[] = stored ? JSON.parse(stored) : [];
    // Remove duplicates
    history = history.filter((item) => item.url !== url);
    history.unshift({ url, extractedText, analysis });
    localStorage.setItem("scanHistoryV2", JSON.stringify(history));
    window.dispatchEvent(new Event("scanHistoryUpdated"));
  };

  // Extract text from PDF
  const extractTextFromPdf = async (url: string) => {
    try {
      const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        setExtractedText("Failed to fetch PDF.");
        setAnalysis("No analysis available.");
        saveToHistory(url, "Failed to fetch PDF.", "No analysis available.");
        return;
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      const maxPages = Math.min(pdf.numPages, 5);

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }

      const text = fullText.slice(0, 5000);
      setExtractedText(text);
      setAnalysis("Scan complete. Ready to analyze.");
      saveToHistory(url, text, "Scan complete. Ready to analyze.");
    } catch (err) {
      setExtractedText("Error extracting text.");
      setAnalysis("No analysis available.");
      saveToHistory(url, "Error extracting text.", "No analysis available.");
    }
  };

  // Run GPT analysis
  const runAnalysisFromExtractedText = async () => {
    try {
      setIsAnalyzing(true);
      setAnalysis("Analyzing...");
      setActiveTab("analysis");

      const structure = await fetch("/prompt-template.txt").then((res) =>
        res.text()
      );

      const prompt = `${structure}\n\n${extractedText}`;

      const openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a chatbot that helps budtenders explain cannabis products to customers.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 10000,
          }),
        }
      );

      if (!openaiResponse.ok) {
        setAnalysis("Failed to analyze text with ChatGPT.");
        saveToHistory(
          result,
          extractedText,
          "Failed to analyze text with ChatGPT."
        );
        return;
      }

      const data = await openaiResponse.json();
      const reply =
        data.choices?.[0]?.message?.content || "No response from ChatGPT.";
      setAnalysis(reply);
      saveToHistory(result, extractedText, reply);
    } catch (err) {
      setAnalysis("An error occurred during analysis.");
      saveToHistory(
        result,
        extractedText,
        "An error occurred during analysis."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // QR scanning logic
  useEffect(() => {
    if (!scannerRef.current) return;

    html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);

    const onScanSuccess = async (decodedText: string) => {
      if (scannedSet.current.has(decodedText)) return;
      scannedSet.current.add(decodedText);

      setResult(decodedText);
      setAnalysis("Extracting text...");
      setActiveTab("extracted");
      extractTextFromPdf(decodedText);

      setTimeout(() => {
        scannedSet.current.delete(decodedText);
      }, 5000);
    };

    html5QrCodeRef.current
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        onScanSuccess,
        (errorMessage: string) => {
          console.warn("Scan error:", errorMessage);
        }
      )
      .catch((err) => {
        console.error("Failed to start QR scanner:", err);
      });

    return () => {
      if (
        html5QrCodeRef.current &&
        html5QrCodeRef.current.getState() === Html5QrcodeScannerState.SCANNING
      ) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .catch(() => {});
      } else {
        html5QrCodeRef.current?.clear();
      }
    };
  }, []);

  // When a scan is selected from history, update the display
  useEffect(() => {
    if (selectedScan) {
      setResult(selectedScan.url);
      setExtractedText(selectedScan.extractedText);
      setAnalysis(selectedScan.analysis);
      setActiveTab("extracted");
      onClearSelectedScan();
    }
    // eslint-disable-next-line
  }, [selectedScan]);

  // Utility to clean up line breaks for Markdown
  function formatAnalysis(text: string) {
    // Normalize line endings
    let cleaned = text.replace(/\r\n/g, "\n");

    // Remove blank lines after Markdown headers (##, #, or **Header:**)
    // Handles both "**Header:**\n\nContent" and "# Header\n\nContent"
    cleaned = cleaned.replace(
      /(^|\n)((\s*(\#{1,6}\s.*|(\*\*.+\*\*:)))\n+)([^\n])/g,
      (_, p1, p2, p3, p4, p5, p6) => `${p1}${p3}\n${p6}`
    );

    // Replace 3+ line breaks with 2 (Markdown paragraph)
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    // Replace 2+ line breaks with 2 (Markdown paragraph)
    cleaned = cleaned.replace(/\n{2,}/g, "\n\n");
    // Trim leading/trailing whitespace
    cleaned = cleaned.trim();
    return cleaned;
  }

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>The Plugg</h2>
      <div
        id="reader"
        ref={scannerRef}
        style={{ width: 300, margin: "auto" }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "40px",
          marginTop: "30px",
          flexWrap: "wrap",
        }}
      >
        {/* Main Content */}
        <div>
          <p>
            <strong>Last Scanned URL:</strong>{" "}
            <a href={result} target="_blank" rel="noopener noreferrer">
              {result}
            </a>
          </p>

          {result !== "No result" && (
            <button
              onClick={runAnalysisFromExtractedText}
              disabled={isAnalyzing}
              style={{
                marginTop: "10px",
                padding: "8px 16px",
                fontSize: "16px",
                cursor: isAnalyzing ? "not-allowed" : "pointer",
                opacity: isAnalyzing ? 0.6 : 1,
              }}
            >
              {isAnalyzing ? "Analyzing..." : "Run Analysis"}
            </button>
          )}

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              marginBottom: "20px",
              marginTop: "20px",
            }}
          >
            <button
              onClick={() => setActiveTab("extracted")}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                borderBottom:
                  activeTab === "extracted" ? "3px solid #007bff" : "none",
                fontWeight: activeTab === "extracted" ? "bold" : "normal",
                background: "none",
                border: "none",
              }}
            >
              Extracted Text
            </button>
            <button
              onClick={() => setActiveTab("analysis")}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                borderBottom:
                  activeTab === "analysis" ? "3px solid #007bff" : "none",
                fontWeight: activeTab === "analysis" ? "bold" : "normal",
                background: "none",
                border: "none",
              }}
            >
              ChatGPT Analysis
            </button>
          </div>

          <div
            style={{
              marginBottom: "10px",
              textAlign: "right",
              width: "500px",
              margin: "0 auto",
            }}
          >
            <button
              onClick={() => setShowMarkdown((prev) => !prev)}
              style={{
                padding: "4px 12px",
                fontSize: "14px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                background: showMarkdown ? "#e6f0ff" : "#f6f6f6",
                cursor: "pointer",
                marginBottom: "10px",
              }}
            >
              {showMarkdown ? "Show Plain Text" : "Show Markdown"}
            </button>
          </div>

          {/* Tab Content */}
          <div
            style={{
              whiteSpace: "pre-wrap",
              background: "#f6f6f6",
              padding: "10px",
              borderRadius: "5px",
              minHeight: "120px",
              maxHeight: "400px",
              overflowY: "auto",
              textAlign: "left",
              width: "500px",
              margin: "0 auto",
            }}
          >
            {activeTab === "extracted" ? (
              extractedText
            ) : showMarkdown ? (
              <ReactMarkdown>{formatAnalysis(analysis)}</ReactMarkdown>
            ) : (
              <pre style={{ margin: 0 }}>{analysis}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
