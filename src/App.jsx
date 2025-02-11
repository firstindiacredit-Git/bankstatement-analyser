import { useState } from "react";
import PDFViewer from "./components/PDFViewer";
import Dashboard from "./components/Dashboard";
import "./App.css";

function App() {
  const [transactions, setTransactions] = useState([]);
  const [hasUploadedFile, setHasUploadedFile] = useState(false);

  const handlePDFData = (data) => {
    setTransactions(data);
    setHasUploadedFile(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bank Statement Analyzer</h1>
      </header>

      {!hasUploadedFile ? (
        <div className="upload-section">
          <PDFViewer onDataExtracted={handlePDFData} />
        </div>
      ) : (
        <Dashboard transactions={transactions} />
      )}
    </div>
  );
}

export default App;
