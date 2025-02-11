import { useState } from "react";
import pdfjsLib from "../utils/pdfjs-setup";

const HEADER_PATTERNS = {
  SR_NO: /sr\.?\s*no\.?|s\.?\s*no\.?|#/i,
  DATE: /transaction\s*date|date|txn\s*date/i,
  VALUE_DATE: /value\s*date|val\s*date/i,
  DESCRIPTION: /particulars|description|transaction\s*details|narration/i,
  REF_NO: /ref\.?\s*no\.?|chq\.?\s*no\.?|utr|reference/i,
  DEBIT: /withdrawal|debit|dr\s*\(?₹?\)?/i,
  CREDIT: /deposit|credit|cr\s*\(?₹?\)?/i,
  BALANCE: /closing|balance|bal\s*\(?₹?\)?/i
};

function PDFViewer({ onDataExtracted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const identifyColumns = (headerRow) => {
    const columns = [];
    
    // Sort header items by x position
    headerRow.sort((a, b) => a.x - b.x);

    // Calculate average column width
    let totalWidth = 0;
    let itemCount = headerRow.length;
    headerRow.forEach(item => {
      totalWidth += item.width || 100;
    });
    const avgWidth = totalWidth / itemCount;

    // Process header items
    headerRow.forEach((item, index) => {
      const text = item.text.toLowerCase();
      const width = item.width || avgWidth;

      // Try to identify column type
      let type = null;
      for (const [key, pattern] of Object.entries(HEADER_PATTERNS)) {
        if (pattern.test(text)) {
          type = key;
          break;
        }
      }

      if (type) {
        columns.push({
          type,
          x: item.x,
          width,
          end: item.x + width + 10 // Add padding
        });
      }
    });

    return columns;
  };

  const parseAmount = (text) => {
    if (!text) return 0;
    // Remove all non-numeric characters except . and -
    const cleanText = text.replace(/[^\d.-]/g, '');
    const amount = parseFloat(cleanText);
    return isNaN(amount) ? 0 : amount;
  };

  const processAmounts = (rowData) => {
    let debitCredit = 0;
    let balance = 0;

    // First try to get balance
    if (rowData.BALANCE) {
      balance = parseAmount(rowData.BALANCE);
    }

    // Then handle debit/credit
    if (rowData.DEBIT && parseAmount(rowData.DEBIT) !== 0) {
      debitCredit = -Math.abs(parseAmount(rowData.DEBIT));
    } else if (rowData.CREDIT && parseAmount(rowData.CREDIT) !== 0) {
      debitCredit = Math.abs(parseAmount(rowData.CREDIT));
    }

    return { debitCredit, balance };
  };

  const extractTableData = async (page) => {
    try {
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      // Group items by row with better precision
      const rows = {};
      textContent.items.forEach(item => {
        if (!item.str.trim()) return;
        
        // Round to 2 decimal places for better grouping
        const y = Math.round((viewport.height - item.transform[5]) * 100) / 100;
        if (!rows[y]) rows[y] = [];
        rows[y].push({
          text: item.str.trim(),
          x: Math.round(item.transform[4] * 100) / 100,
          width: Math.round(item.width || 50),
          height: Math.round(item.height || 10)
        });
      });

      // Find header row
      let headerRow = null;
      let headerY = null;

      // Try to find header row by looking for common column names
      for (const [y, items] of Object.entries(rows)) {
        const text = items.map(i => i.text.toLowerCase()).join(' ');
        if ((text.includes('date') && text.includes('balance')) || 
            (text.includes('transaction') && text.includes('amount')) ||
            (text.includes('particulars') && text.includes('debit'))) {
          headerRow = items;
          headerY = parseFloat(y);
          break;
        }
      }

      if (!headerRow) {
        throw new Error('Could not find table header');
      }

      // Identify columns
      const columns = identifyColumns(headerRow);

      // Keep track of previous balance for validation
      let previousBalance = null;
      
      // Process data rows
      const transactions = [];
      Object.entries(rows)
        .filter(([y]) => parseFloat(y) > headerY)
        .sort(([y1], [y2]) => parseFloat(y1) - parseFloat(y2))
        .forEach(([_, items]) => {
          // Create row data object
          const rowData = {};
          items.forEach(item => {
            // Find which column this item belongs to
            const column = columns.find(col => 
              item.x >= col.x - 10 && item.x <= col.end + 10
            );
            if (column) {
              if (!rowData[column.type]) rowData[column.type] = '';
              rowData[column.type] += ' ' + item.text;
            }
          });

          // Clean and validate row data
          if (rowData.DATE) {
            const { debitCredit, balance } = processAmounts(rowData);

            // Validate balance change
            if (previousBalance !== null) {
              const expectedBalance = previousBalance + debitCredit;
              // Allow for small rounding differences
              if (Math.abs(expectedBalance - balance) > 0.01) {
                console.warn('Balance mismatch:', { 
                  previousBalance, 
                  debitCredit, 
                  expectedBalance, 
                  actualBalance: balance 
                });
              }
            }

            if (balance !== 0 || debitCredit !== 0) {
              transactions.push({
                transactionDate: rowData.DATE.trim(),
                valueDate: rowData.VALUE_DATE?.trim() || rowData.DATE.trim(),
                transactionDetails: rowData.DESCRIPTION?.trim() || '',
                chqRefNo: rowData.REF_NO?.trim() || '',
                debitCredit,
                balance
              });

              previousBalance = balance;
            }
          }
        });

      return transactions;
    } catch (error) {
      console.error('Error extracting table data:', error);
      throw error;
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      setError('Please upload a PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: true
      }).promise;

      let allData = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const pageData = await extractTableData(page);
          allData = [...allData, ...pageData];
        } catch (pageError) {
          console.error(`Error processing page ${pageNum}:`, pageError);
        }
      }

      if (allData.length === 0) {
        throw new Error('No transaction data found in the PDF');
      }

      onDataExtracted(allData);
    } catch (error) {
      console.error('Error processing PDF:', error);
      setError(error.message || 'Error processing the PDF file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-uploader">
      <div className="upload-container">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={loading}
        />
        <p className="help-text">Upload your bank statement PDF</p>
      </div>
      {loading && <div className="loading">Processing PDF...</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default PDFViewer;
