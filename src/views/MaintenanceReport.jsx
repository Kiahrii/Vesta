import { useEffect, useMemo, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import { Funnel, MagnifyingGlass } from 'phosphor-react';
import ViewModal from 'viewmodel/ViewModal';
import MainCard from 'components/MainCard';
import { getMaintenanceReports, MAINTENANCE_STATUS, updateMaintenanceReportStatus } from 'viewmodel/maintenance-report';
import 'assets/scss/apartment-page/tenantReports.scss';
import 'assets/scss/themes/components/_table.scss';

const DEFAULT_ISSUE_OPTIONS = ['Plumbing', 'Electrical', 'Furniture', 'Appliance', 'Noise', 'Others'];

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

// ==============================|| MAINTENANCE REPORT PAGE ||============================== //

export default function MaintenanceReport() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [issueFilter, setIssueFilter] = useState('all');
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [updatingReportId, setUpdatingReportId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [showSpinner, setShowSpinner] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    setFetchError('');
    setActionError('');

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

  const issueOptions = useMemo(() => {
    const dynamicIssues = [...new Set(reports.map((row) => row.issue).filter(Boolean))];
    if (dynamicIssues.length > 0) {
      return dynamicIssues.sort((a, b) => a.localeCompare(b));
    }

    return DEFAULT_ISSUE_OPTIONS;
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = normalize(searchTerm);

    return reports.filter((row) => {
      const issue = row.issue || '';
      const status = row.status || MAINTENANCE_STATUS.PENDING;
      const rowDate = row.created_at;

      const isResolved = normalize(status) === normalize(MAINTENANCE_STATUS.RESOLVED);
      const isRejected = normalize(status) === normalize(MAINTENANCE_STATUS.REJECTED);
      const isCancelled = normalize(status) === normalize(MAINTENANCE_STATUS.CANCELLED);
      const isArchived = isResolved || isRejected || isCancelled;

      // When statusFilter is 'all', only show non-archived reports (pending and in-progress)
      // When a specific status is selected, show only that status
      const matchesStatus = statusFilter === 'all'
        ? !isArchived  // Exclude resolved, rejected, and cancelled from 'all' view
        : normalize(status) === normalize(statusFilter);

      const matchesIssue = issueFilter === 'all' || normalize(issue) === normalize(issueFilter);

      if (!query) return matchesStatus && matchesIssue;

      const searchable = [
        row.report_id,
        row.tenant_name,
        row.room,
        issue,
        status,
        row.description,
        formatDate(rowDate)
      ]
        .join(' ')
        .toLowerCase();

      return matchesStatus && matchesIssue && searchable.includes(query);
    });
  }, [reports, searchTerm, statusFilter, issueFilter]);

  const handleStatusUpdate = async (reportId, nextStatus) => {
    setActionError('');
    setUpdatingReportId(reportId);

    try {
      setShowModal(true);
      setShowSpinner(true);
      setModalMessage("Updating report status...");

      await updateMaintenanceReportStatus(reportId, nextStatus);

      setReports((previous) =>
        previous.map((row) =>
          row.report_id === reportId ? { ...row, status: nextStatus } : row
        )
      );

      setShowSpinner(false);
      setModalMessage("Status updated successfully!");

      setTimeout(() => {
        setShowModal(false);
      }, 3000);

    } catch (error) {
      setShowSpinner(false);
      setModalMessage("Failed to update status.");
    } finally {
      setUpdatingReportId(null);
    }
  };

  const showActionColumn = statusFilter !== MAINTENANCE_STATUS.RESOLVED &&
    statusFilter !== MAINTENANCE_STATUS.REJECTED &&
    statusFilter !== MAINTENANCE_STATUS.CANCELLED;
  const tableColumnCount = showActionColumn ? 8 : 7;

  return (
    <Row>
      <Col xl={12}>
        <MainCard>
          <div className="act-btns">
            <button className="pending-btn" onClick={() => setStatusFilter(MAINTENANCE_STATUS.PENDING)} type="button">
              Pending
            </button>
            <button className="progress-btn" onClick={() => setStatusFilter(MAINTENANCE_STATUS.IN_PROGRESS)} type="button">
              In Progress
            </button>
            {/* <button className="resolved-btn" onClick={() => setStatusFilter(MAINTENANCE_STATUS.RESOLVED)} type="button">
              Resolved
            </button> */}
          </div>

          <div className="top-buttons">
            <div className="card-header">
              <h5>Recent Activity Log</h5>
            </div>

            <div className="right-side">
              <div className="maintenance-search-content">
                <MagnifyingGlass size={25} className="search-icon" />
                <input
                  className="maintenance-search-input"
                  type="search"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <button className="all-filter-btn" onClick={() => setStatusFilter('all')} type="button">
                All
              </button>

              <div className="filter-issue">
                <button className="issue" type="button" onClick={() => setIsIssueOpen((previous) => !previous)} aria-expanded={isIssueOpen}>
                  <Funnel size={25} className="filter-icon" />
                  {issueFilter === 'all' ? 'Issues' : issueFilter}
                </button>

                {isIssueOpen && (
                  <div className="issue-options">
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setIssueFilter('all');
                        setIsIssueOpen(false);
                      }}
                    >
                      All
                    </a>
                    {issueOptions.map((issue) => (
                      <a
                        href="#"
                        key={issue}
                        onClick={(event) => {
                          event.preventDefault();
                          setIssueFilter(issue);
                          setIsIssueOpen(false);
                        }}
                      >
                        {issue}
                      </a>
                    ))}
                  </div>
                )}
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
                    <th>Date Reported</th>
                    <th>Issue</th>
                    <th>Status</th>
                    <th>Attachment</th>
                    {showActionColumn && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={tableColumnCount}>Loading maintenance reports...</td>
                    </tr>
                  )}

                  {!loading && fetchError && (
                    <tr>
                      <td colSpan={tableColumnCount}>{fetchError}</td>
                    </tr>
                  )}

                  {!loading && !fetchError && actionError && (
                    <tr>
                      <td colSpan={tableColumnCount}>{actionError}</td>
                    </tr>
                  )}

                  {!loading && !fetchError && filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={tableColumnCount}>No maintenance reports found.</td>
                    </tr>
                  )}

                  {!loading &&
                    !fetchError &&
                    filteredReports.map((row) => {
                      const status = row.status || MAINTENANCE_STATUS.PENDING;
                      const statusKey = normalize(status);
                      const isUpdating = updatingReportId === row.report_id;
                      const isPending = statusKey === normalize(MAINTENANCE_STATUS.PENDING);
                      const isInProgress = statusKey === normalize(MAINTENANCE_STATUS.IN_PROGRESS);
                      const isResolved = statusKey === normalize(MAINTENANCE_STATUS.RESOLVED);
                      const isRejected = statusKey === normalize(MAINTENANCE_STATUS.REJECTED);
                      const isCancelled = statusKey === normalize(MAINTENANCE_STATUS.CANCELLED);

                      return (
                        <tr key={row.report_id}>
                          <td>{row.report_id}</td>
                          <td>{row.tenant_name || `Tenant #${row.tenant_id}`}</td>
                          <td>{row.room || '-'}</td>
                          <td>{formatDate(row.created_at)}</td>
                          <td>{row.issue || `Issue #${row.issue_id}`}</td>
                          <td>{status}</td>
                          <td>
                            {row.photo ? (
                              <button className="attachment-link" type="button" onClick={() => setSelectedPhoto(row.photo)}>
                                Attachment
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>
                          {showActionColumn && (
                            <td>
                              {isResolved || isRejected || isCancelled ? (
                                '-'
                              ) : (
                                <div className="act-btn3">
                                  {isPending && (
                                    <>
                                      <button
                                        className="approve"
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleStatusUpdate(row.report_id, MAINTENANCE_STATUS.IN_PROGRESS)}
                                      >
                                        Accept
                                      </button>
                                      <button
                                        className="reject"
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleStatusUpdate(row.report_id, MAINTENANCE_STATUS.REJECTED)}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}

                                  {isInProgress && (
                                    <>
                                      <button
                                        className="cancel"
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleStatusUpdate(row.report_id, MAINTENANCE_STATUS.PENDING)}
                                      >
                                        Revert
                                      </button>
                                      <button
                                        className="approve"
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleStatusUpdate(row.report_id, MAINTENANCE_STATUS.RESOLVED)}
                                      >
                                        Resolve
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <ViewModal
                open={showModal}
                message={modalMessage}
                showSpinner={showSpinner}
              />
            </div>
          </div>

          <Modal show={Boolean(selectedPhoto)} onHide={() => setSelectedPhoto('')} centered size="lg">
            <Modal.Header closeButton>
              <Modal.Title>Report Attachment</Modal.Title>
            </Modal.Header>
            <Modal.Body className="image-preview-modal-body">
              {selectedPhoto && <img className="image-preview-image" src={selectedPhoto} alt="Maintenance report attachment" />}
            </Modal.Body>
          </Modal>
        </MainCard>
      </Col>
    </Row>
  );
}