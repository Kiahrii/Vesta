// react-bootstrap
import { useEffect, useMemo, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

// project-imports
import { MagnifyingGlass, Funnel, Export } from 'phosphor-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MainCard from 'components/MainCard';
import { getMaintenanceReports, MAINTENANCE_STATUS, } from 'viewmodel/maintenance-report';
import 'assets/scss/apartment-page/past-tenants.scss';
import 'assets/scss/themes/components/_table.scss';

const normalize = (value) => (value || '').toString().trim().toLowerCase();

const formatDate = (value) => {
  if (!value) return '-';

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  return parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatResolvedDate = (value) => {
  if (!value) return '-';
  
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return '-';
  
  return parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const parseDate = (value) => {
  if (!value) return null;
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return parsedDate;
};

const getMonthIndex = (value) => {
  const parsedDate = parseDate(value);
  return parsedDate ? parsedDate.getMonth() : null;
};

const getYearValue = (value) => {
  const parsedDate = parseDate(value);
  return parsedDate ? parsedDate.getFullYear() : null;
};

const getIssueLabel = (row) => row.issue || `Issue #${row.issue_id}`;

// ==============================|| MAINTENANCE HISTORY PAGE ||============================== //

export default function MaintenanceHistory() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [issueFilter, setIssueFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  const loadReports = async () => {
    setLoading(true);
    setFetchError('');

    try {
      const rows = await getMaintenanceReports();
      setReports(rows);
    } catch (error) {
      setFetchError(error.message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

const archivedReports = useMemo(() => {
  return reports.filter((row) => {
    const status = row.status || MAINTENANCE_STATUS.PENDING;
    const statusKey = normalize(status);

    return (
      statusKey === normalize(MAINTENANCE_STATUS.RESOLVED) || 
      statusKey === normalize(MAINTENANCE_STATUS.REJECTED) ||
      statusKey === normalize(MAINTENANCE_STATUS.CANCELLED)
    );
  });
}, [reports]);

  const issueOptions = useMemo(() => {
    const optionMap = new Map();
    archivedReports.forEach((row) => {
      const label = getIssueLabel(row);
      const value = normalize(label);
      if (!optionMap.has(value)) {
        optionMap.set(value, label);
      }
    });
    return Array.from(optionMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [archivedReports]);

  const monthOptions = useMemo(() => {
    const months = new Set();
    archivedReports.forEach((row) => {
      const monthIndex = getMonthIndex(row.created_at);
      if (monthIndex !== null) {
        months.add(monthIndex);
      }
    });
    return Array.from(months)
      .sort((a, b) => a - b)
      .map((monthIndex) => ({
        value: String(monthIndex),
        label: monthNames[monthIndex]
      }));
  }, [archivedReports]);

  const yearOptions = useMemo(() => {
    const years = new Set();
    archivedReports.forEach((row) => {
      const yearValue = getYearValue(row.created_at);
      if (yearValue !== null) {
        years.add(yearValue);
      }
    });
    return Array.from(years)
      .sort((a, b) => b - a)
      .map((yearValue) => ({
        value: String(yearValue),
        label: String(yearValue)
      }));
  }, [archivedReports]);

  const filteredReports = useMemo(() => {
    const query = normalize(searchTerm);

    return archivedReports.filter((row) => {
      const status = row.status || MAINTENANCE_STATUS.PENDING;

      const issueLabel = getIssueLabel(row);
      const issueMatch = issueFilter === 'all' || normalize(issueLabel) === issueFilter;

      const monthIndex = getMonthIndex(row.created_at);
      const monthMatch = monthFilter === 'all' || (monthIndex !== null && String(monthIndex) === monthFilter);

      const yearValue = getYearValue(row.created_at);
      const yearMatch = yearFilter === 'all' || (yearValue !== null && String(yearValue) === yearFilter);

      if (!issueMatch || !monthMatch || !yearMatch) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        row.report_id,
        row.tenant_name,
        row.room,
        issueLabel,
        status,
        row.description,
        formatDate(row.created_at)
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [archivedReports, issueFilter, monthFilter, yearFilter, searchTerm]);

  const selectedIssueLabel =
    issueFilter === 'all' ? 'Issues' : issueOptions.find((option) => option.value === issueFilter)?.label || 'Issues';
  const selectedMonthLabel =
    monthFilter === 'all' ? 'Month' : monthOptions.find((option) => option.value === monthFilter)?.label || 'Month';
  const selectedYearLabel =
    yearFilter === 'all' ? 'Year' : yearOptions.find((option) => option.value === yearFilter)?.label || 'Year';

  const handleFilterSelect = (setter) => (value) => {
    setter(value);
    if (document?.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleExport = () => {
    if (filteredReports.length === 0) {
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    const exportTimestamp = new Date();
    const filterSummary = [
      `Issues: ${selectedIssueLabel}`,
      `Month: ${selectedMonthLabel}`,
      `Year: ${selectedYearLabel}`,
      searchTerm ? `Search: "${searchTerm}"` : 'Search: All'
    ].join(' | ');

    doc.setFontSize(16);
    doc.text('Maintenance History', 40, 40);
    doc.setFontSize(10);
    doc.text(`Exported: ${exportTimestamp.toLocaleString('en-US')}`, 40, 60);
    doc.text(filterSummary, 40, 75);

    const tableBody = filteredReports.map((row) => [
      row.report_id,
      row.tenant_name || `Tenant #${row.tenant_id}`,
      row.room || '-',
      getIssueLabel(row),
      formatDate(row.created_at),
      formatResolvedDate(row.resolved_at),
      row.status || MAINTENANCE_STATUS.PENDING
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['Report ID', 'Name', 'Room', 'Category', 'Date Reported', 'Date Resolved', 'Status']],
      body: tableBody,
      styles: {
        fontSize: 9
      },
      headStyles: {
        fillColor: [46, 69, 102]
      }
    });

    const fileName = `maintenance-history_${exportTimestamp
      .toISOString()
      .slice(0, 10)}_${selectedIssueLabel}_${selectedMonthLabel}_${selectedYearLabel}.pdf`
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_\.]/g, '');

    doc.save(fileName);
  };

  return (
    <Row>
      <Col xl={12}>
        <MainCard>

          <div className="top-buttons">
            <div className="right-side">

              <div className="search-content">
                <MagnifyingGlass size={25} className="search-icon" />
                <input
                  className="search-input"
                  type="search"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <div className="filter-status">
                <button className="status" type="button">
                  <Funnel size={25} className="filter-icon" />
                  {selectedIssueLabel}
                </button>
                <div className="status-options">
                  <button type="button" onClick={() => handleFilterSelect(setIssueFilter)('all')}>All</button>
                  {issueOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFilterSelect(setIssueFilter)(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-status">
                <button className="status" type="button">
                  <Funnel size={25} className="filter-icon" />
                  {selectedMonthLabel}
                </button>
                <div className="status-options">
                  <button type="button" onClick={() => handleFilterSelect(setMonthFilter)('all')}>All</button>
                  {monthOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFilterSelect(setMonthFilter)(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-status">
                <button className="status" type="button">
                  <Funnel size={25} className="filter-icon" />
                  {selectedYearLabel}
                </button>
                <div className="status-options">
                  <button type="button" onClick={() => handleFilterSelect(setYearFilter)('all')}>All</button>
                  {yearOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleFilterSelect(setYearFilter)(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="left-side">
              <div className="export-btn">
                <button
                  type="button"
                  className="openModal export-btn"
                  onClick={handleExport}
                  disabled={filteredReports.length === 0}
                >
                  <Export size={25} />
                  Export
                </button>
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Name</th>
                    <th>Room</th>
                    <th>Category</th>
                    <th>Date Reported</th>
                    <th>Date Resolved</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={7}>Loading maintenance history...</td>
                    </tr>
                  )}

                  {!loading && fetchError && (
                    <tr>
                      <td colSpan={7}>{fetchError}</td>
                    </tr>
                  )}

                  {!loading && !fetchError && filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={7}>No completed maintenance reports found.</td>
                    </tr>
                  )}

                  {!loading &&
                    !fetchError &&
                    filteredReports.map((row) => (
                      <tr key={row.report_id}>
                        <td>{row.report_id}</td>
                        <td>{row.tenant_name || `Tenant #${row.tenant_id}`}</td>
                        <td>{row.room || '-'}</td>
                        <td>{getIssueLabel(row)}</td>
                        <td>{formatDate(row.created_at)}</td>
                        <td>{formatResolvedDate(row.resolved_at)}</td>
                        <td>{row.status || MAINTENANCE_STATUS.PENDING}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

        </MainCard>
      </Col>
    </Row>

  );
}
