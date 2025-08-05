import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

import PdfWorker from "../workers/pdf.worker.js?worker";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerPort = new PdfWorker();

const QRScanner: React.FC = () => {
  const [result, setResult] = useState<string>("No result");
  const [analysis, setAnalysis] = useState<string>("Waiting for scan...");
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannedSet = useRef(new Set<string>());
  const [extractedText, setExtractedText] = useState<string>(
    "No text extracted yet."
  );

  const [activeTab, setActiveTab] = useState<"extracted" | "analysis">(
    "analysis"
  );

  const analyzeLink = async (url: string) => {
    try {
      const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        console.error("Failed to fetch PDF:", await response.text());
        setAnalysis("Failed to fetch PDF.");
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

      // Save raw extracted text
      setExtractedText(fullText.slice(0, 5000));

      // Fetch prompt template from public folder
      const structure = await fetch("/prompt-template.txt").then((res) =>
        res.text()
      );

      // Compose final prompt with the template
      const prompt = `Analyze the following COA and summarize it in the structure below. Keep the tone casual but informative — like explaining to a smart friend. Use plain English where possible and include emojis sparingly to enhance readability (not overload it). Be concise, but thorough.\n\n${fullText.slice(
        0,
        5000
      )}\n\n${structure}`;

      // Send to OpenAI for analysis
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
                  "You are a budtender who explains cannabis products to customers.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        }
      );

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error("OpenAI API error:", errorText);
        setAnalysis("Failed to analyze text with ChatGPT.");
        return;
      }

      const data = await openaiResponse.json();
      const reply =
        data.choices?.[0]?.message?.content || "No response from ChatGPT.";
      setAnalysis(reply);
    } catch (err) {
      console.error("Error analyzing PDF:", err);
      setAnalysis("An error occurred during analysis.");
    }
  };

  useEffect(() => {
    if (!scannerRef.current) return;

    html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);

    const onScanSuccess = async (decodedText: string) => {
      if (scannedSet.current.has(decodedText)) return;
      scannedSet.current.add(decodedText);

      setResult(decodedText);
      setAnalysis("Analyzing...");

      await analyzeLink(decodedText);

      // Reset scan after 5 seconds
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

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>The Plugg</h2>
      <div
        id="reader"
        ref={scannerRef}
        style={{ width: 300, margin: "auto" }}
      />

      <div style={{ marginTop: "20px" }}>
        <p>
          <strong>Last Scanned URL:</strong>{" "}
          <a href={result} target="_blank" rel="noopener noreferrer">
            {result}
          </a>
        </p>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "20px",
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

        {/* Tab Content */}
        {activeTab === "extracted" && (
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
            {extractedText}
          </div>
        )}

        {activeTab === "analysis" && (
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
            {analysis}
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
