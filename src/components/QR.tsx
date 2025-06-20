import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";

const QRScanner: React.FC = () => {
  const [result, setResult] = useState<string>("No result");
  const [analysis, setAnalysis] = useState<string>("Waiting for scan...");
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannedSet = useRef(new Set<string>()); // to prevent duplicate scans

  // 🔍 Analyze the scanned link with ChatGPT (OpenAI API)
  const analyzeLink = async (url: string) => {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer YOUR_OPENAI_API_KEY`, // 🔐 Replace for demo/testing only
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that explains and analyzes URLs.",
              },
              {
                role: "user",
                content: `Analyze this URL: ${url}`,
              },
            ],
          }),
        }
      );

      const data = await response.json();
      const reply =
        data.choices?.[0]?.message?.content || "No response from ChatGPT.";
      setAnalysis(reply);
    } catch (error) {
      console.error("Error talking to OpenAI:", error);
      setAnalysis("❌ Failed to analyze the URL.");
    }
  };

  useEffect(() => {
    if (!scannerRef.current) return;

    html5QrCodeRef.current = new Html5Qrcode(scannerRef.current.id);

    const onScanSuccess = async (decodedText: string) => {
      if (scannedSet.current.has(decodedText)) return;
      scannedSet.current.add(decodedText);

      setResult(decodedText);
      setAnalysis("🔍 Analyzing...");

      await analyzeLink(decodedText);

      // Allow scanning again after 5 seconds
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

        <h3>ChatGPT Analysis</h3>
        <div
          style={{
            whiteSpace: "pre-wrap",
            background: "#f6f6f6",
            padding: "10px",
            borderRadius: "5px",
            maxWidth: "600px",
            margin: "auto",
          }}
        >
          {analysis}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
