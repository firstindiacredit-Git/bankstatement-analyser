import { useState, useEffect, useMemo } from "react";
import "./Dashboard.css";

const SORT_DIRECTIONS = {
  ASC: "ascending",
  DESC: "descending",
};

const DATE_FIELDS = ["transactionDate", "valueDate"];
const NUMERIC_FIELDS = ["debitCredit", "balance"];

function Dashboard({ transactions }) {
  const [filters, setFilters] = useState({ date: "", details: "" });
  const [sortConfig, setSortConfig] = useState({
    key: "transactionDate",
    direction: SORT_DIRECTIONS.DESC,
  });
  const [prevBalance, setPrevBalance] = useState(null);

  const totals = useMemo(
    () =>
      transactions.reduce(
        (acc, { debitCredit }) => {
          const amount = parseFloat(debitCredit) || 0;
          if (amount < 0) {
            acc.totalDebit += Math.abs(amount);
          } else {
            acc.totalCredit += amount;
          }
          return acc;
        },
        { totalDebit: 0, totalCredit: 0 }
      ),
    [transactions]
  );

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    const [day, month, year] = dateStr.split(" ");
    const monthMap = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    return new Date(year, monthMap[month], parseInt(day));
  };

  const sortedAndFilteredTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      const matchesDate = (transaction.transactionDate || "")
        .toLowerCase()
        .includes(filters.date.toLowerCase());
      const matchesDetails = (transaction.transactionDetails || "")
        .toLowerCase()
        .includes(filters.details.toLowerCase());
      return matchesDate && matchesDetails;
    });

    return [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      let comparison = 0;

      if (DATE_FIELDS.includes(key)) {
        comparison = parseDate(a[key]) - parseDate(b[key]);
      } else if (NUMERIC_FIELDS.includes(key)) {
        comparison = (parseFloat(a[key]) || 0) - (parseFloat(b[key]) || 0);
      } else {
        comparison = (a[key] || "").localeCompare(b[key] || "");
      }

      return direction === SORT_DIRECTIONS.ASC ? comparison : -comparison;
    });
  }, [transactions, filters, sortConfig]);

  useEffect(() => {
    if (sortedAndFilteredTransactions.length > 0) {
      setPrevBalance(parseFloat(sortedAndFilteredTransactions[0].balance));
    }
  }, [sortedAndFilteredTransactions]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === SORT_DIRECTIONS.ASC
          ? SORT_DIRECTIONS.DESC
          : SORT_DIRECTIONS.ASC,
    }));
  };

  return (
    <div className="dashboard">
      <div className="statement-header">
        <h2>Statement of Account</h2>
        <div className="statement-info">
          <p>Total Transactions: {transactions.length}</p>
          <p>Total Debits: ₹{totals.totalDebit.toFixed(2)}</p>
          <p>Total Credits: ₹{totals.totalCredit.toFixed(2)}</p>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Filter by Date:</label>
          <input
            type="text"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            placeholder="Enter date..."
          />
        </div>
        <div className="filter-group">
          <label>Filter by Details:</label>
          <input
            type="text"
            value={filters.details}
            onChange={(e) =>
              setFilters({ ...filters, details: e.target.value })
            }
            placeholder="Enter transaction details..."
          />
        </div>
      </div>

      <div className="table-container">
        <table className="statement-table">
          <thead>
            <tr>
              <th></th>
              <th onClick={() => handleSort("transactionDate")}>
                TRANSACTION DATE{" "}
                {sortConfig.key === "transactionDate" &&
                  (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("valueDate")}>
                VALUE DATE{" "}
                {sortConfig.key === "valueDate" &&
                  (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("transactionDetails")}>
                TRANSACTION DETAILS{" "}
                {sortConfig.key === "transactionDetails" &&
                  (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("chqRefNo")}>
                CHQ / REF NO.{" "}
                {sortConfig.key === "chqRefNo" &&
                  (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("debitCredit")}>
                DEBIT/CREDIT(₹){" "}
                {sortConfig.key === "debitCredit" &&
                  (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </th>
              <th onClick={() => handleSort("balance")}>
                BALANCE(₹){" "}
                {sortConfig.key === "balance" &&
                  (sortConfig.direction === "ascending" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredTransactions.map((transaction, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  {transaction.transactionDate || ""}
                  <div className="timestamp">{transaction.timeStamp || ""}</div>
                </td>
                <td>{transaction.valueDate || ""}</td>
                <td className="transaction-details">
                  {transaction.transactionDetails || ""}
                </td>
                <td>{transaction.chqRefNo || ""}</td>
                <td
                  className={
                    parseFloat(transaction.debitCredit) >= 0
                      ? "credit"
                      : "debit"
                  }
                >
                  {Math.abs(
                    parseFloat(transaction.debitCredit || 0)
                  ).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="balance">
                  {parseFloat(transaction.balance || 0).toLocaleString(
                    "en-IN",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;
