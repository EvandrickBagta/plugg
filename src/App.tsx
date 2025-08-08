import React, { useState } from "react";
import QRScanner from "./components/Scanner";
import ScanHistory, { ScanHistoryItem } from "./components/ScanHistory";

function App() {
  const [selectedScan, setSelectedScan] = useState<ScanHistoryItem | null>(
    null
  );

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ flex: "1" }}>
        <QRScanner
          selectedScan={selectedScan}
          onClearSelectedScan={() => setSelectedScan(null)}
        />
      </div>
      <div style={{ width: "250px", borderLeft: "1px solid #ccc" }}>
        <ScanHistory onSelect={setSelectedScan} />
      </div>
    </div>
  );
}

export default App;
