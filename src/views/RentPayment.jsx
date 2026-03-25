import { useMemo, useState } from 'react';
import Col from 'react-bootstrap/Col';
import { Funnel, MagnifyingGlass, Wallet, CreditCard } from 'phosphor-react';

import MainCard from 'components/MainCard';
import Modal from 'layout/Modal';
import { OnTheCounter } from 'views/ShortcutModals';
import { formatDate } from 'viewmodel/formatDate.js';
import ViewModal from 'viewmodel/ViewModal';
import { formatPaymentStatus, normalizeStatusValue, usePayments } from 'viewmodel/viewpayment.js';

import 'assets/scss/apartment-page/rentPayment.scss';
import 'assets/scss/themes/components/_table.scss';

const BILLING_MONTH_OPTIONS = [
  { value: 'ALL', label: 'All Months' },
  { value: 'JANUARY', label: 'January' },
  { value: 'FEBRUARY', label: 'February' },
  { value: 'MARCH', label: 'March' },
  { value: 'APRIL', label: 'April' },
  { value: 'MAY', label: 'May' },
  { value: 'JUNE', label: 'June' },
  { value: 'JULY', label: 'July' },
  { value: 'AUGUST', label: 'August' },
  { value: 'SEPTEMBER', label: 'September' },
  { value: 'OCTOBER', label: 'October' },
  { value: 'NOVEMBER', label: 'November' },
  { value: 'DECEMBER', label: 'December' }
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'BILLING', label: 'Billing' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' }
];

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

function ProofAttachment({ receiptProof, preview = false, onOpenImage = null, notes = '' }) {
  const [canRenderImage, setCanRenderImage] = useState(true);
  const proofValue = normalizeString(receiptProof);

  if (!proofValue) {
    return 'No Attachment';
  }

  if (!preview) {
    if (typeof onOpenImage === 'function') {
      return (
        <button className="attachment-link" type="button" onClick={() => onOpenImage(proofValue, notes)}>
          Attachment
        </button>
      );
    }

    return (
      <a href={proofValue} target="_blank" rel="noreferrer">
        Attachment
      </a>
    );
  }

  if (!canRenderImage) {
    return (
      <a href={proofValue} target="_blank" rel="noreferrer">
        Open Attachment
      </a>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
      <img
        src={proofValue}
        alt="Proof of payment"
        onError={() => setCanRenderImage(false)}
        onClick={() => {
          if (typeof onOpenImage === 'function') {
            onOpenImage(proofValue, notes);
          }
        }}
        style={{
          width: '88px',
          height: '88px',
          objectFit: 'cover',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          cursor: typeof onOpenImage === 'function' ? 'pointer' : 'default'
        }}
      />
      <a href={proofValue} target="_blank" rel="noreferrer">
        Open Attachment
      </a>
    </div>
  );
}

const getPaymentRowData = (payment) => {
  const billingStartStr = payment.billing_period_start ? formatDate(payment.billing_period_start) : 'N/A';

  let dueDateStr = 'N/A';
  if (payment.billing_period_end) {
    dueDateStr = formatDate(payment.billing_period_end);
  } else if (payment.billing_period_start) {
    const d = new Date(payment.billing_period_start);
    if (!isNaN(d.getTime())) {
      d.setMonth(d.getMonth() + 1);
      dueDateStr = formatDate(d);
    }
  }

  const balance = Math.max(Number(payment.amount_due || 0) - Number(payment.amount_paid || 0), 0);

  return { billingStartStr, dueDateStr, balance };
};

const getDisplayedPaymentDate = (payment) => payment?.paid_date || payment?.payment_date || payment?.created_at || null;
const getTenantRowKey = (payment) => payment?.tenant_id || payment?.tenant_code || payment?.tenant_name || payment?.payment_id;
const getComparableTime = (value) => {
  const date = value ? new Date(value) : null;
  return Number.isNaN(date?.getTime()) ? 0 : date.getTime();
};

const isBetterTenantPayment = (candidate, current) => {
  if (!current) {
    return true;
  }

  const candidateStatus = normalizeStatusValue(candidate?.status_normalized || candidate?.status);
  const currentStatus = normalizeStatusValue(current?.status_normalized || current?.status);
  const candidateIsBilling = candidateStatus === 'BILLING';
  const currentIsBilling = currentStatus === 'BILLING';

  if (candidateIsBilling !== currentIsBilling) {
    return !candidateIsBilling;
  }

  const candidateActivityTime = getComparableTime(
    getDisplayedPaymentDate(candidate) ?? candidate?.billing_period_start ?? candidate?.billing_period_end
  );
  const currentActivityTime = getComparableTime(
    getDisplayedPaymentDate(current) ?? current?.billing_period_start ?? current?.billing_period_end
  );

  if (candidateActivityTime !== currentActivityTime) {
    return candidateActivityTime > currentActivityTime;
  }

  const candidateBillingTime = getComparableTime(candidate?.billing_period_start ?? candidate?.billing_period_end);
  const currentBillingTime = getComparableTime(current?.billing_period_start ?? current?.billing_period_end);

  return candidateBillingTime > currentBillingTime;
};

export default function RentPayment() {
  const [activeTab, setActiveTab] = useState('payments');
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [payRent, setPayRent] = useState(false);
  const [searchAllPayments, setSearchAllPayments] = useState('');
  const [searchPendingPayments, setSearchPendingPayments] = useState('');
  const [selectedBillingMonth, setSelectedBillingMonth] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [proofPreviewOpen, setProofPreviewOpen] = useState(false);
  const [proofPreviewUrl, setProofPreviewUrl] = useState('');
  const [proofPreviewNotes, setProofPreviewNotes] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [approveTargetPayment, setApproveTargetPayment] = useState(null);
  const [rejectTargetPayment, setRejectTargetPayment] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const {
    loading,
    error,
    actionPaymentId,
    tenantPayments,
    pendingValidationPayments,
    approvePayment,
    rejectPayment,
    getTenantLedger,
    getTenantSummary
  } = usePayments();

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    []
  );

  const formatMoney = (value) => currencyFormatter.format(Number(value) || 0);

  const filteredTenantPayments = useMemo(() => {
    const keyword = normalizeString(searchAllPayments).toLowerCase();

    const matchingPayments = tenantPayments.filter((payment) => {
      const searchableText = [payment.tenant_name, payment.tenant_code, payment.room_no, payment.billing_period, payment.display_status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (keyword && !searchableText.includes(keyword)) {
        return false;
      }

      if (selectedBillingMonth !== 'ALL') {
        const billingMonthText =
          `${normalizeString(payment.billing_month_normalized || payment.billing_month)} ${normalizeString(payment.billing_period)}`.toUpperCase();
        if (!billingMonthText.includes(selectedBillingMonth)) {
          return false;
        }
      }

      if (selectedStatus !== 'ALL') {
        const normalizedStatus = normalizeStatusValue(payment.status_normalized);
        if (normalizedStatus !== selectedStatus) {
          return false;
        }
      }

      return true;
    });

    const tenantRows = matchingPayments.reduce((rowsByTenant, payment) => {
      const tenantRowKey = getTenantRowKey(payment);
      const currentRow = rowsByTenant.get(tenantRowKey);

      if (isBetterTenantPayment(payment, currentRow)) {
        rowsByTenant.set(tenantRowKey, payment);
      }

      return rowsByTenant;
    }, new Map());

    return [...tenantRows.values()].sort((left, right) => {
      if (isBetterTenantPayment(left, right)) {
        return -1;
      }

      if (isBetterTenantPayment(right, left)) {
        return 1;
      }

      return 0;
    });
  }, [tenantPayments, searchAllPayments, selectedBillingMonth, selectedStatus]);

  const filteredPendingPayments = useMemo(() => {
    const keyword = normalizeString(searchPendingPayments).toLowerCase();

    return pendingValidationPayments.filter((payment) => {
      if (!keyword) {
        return true;
      }

      const searchableText = [
        payment.tenant_name,
        payment.tenant_code,
        payment.room_no,
        payment.payment_method,
        payment.reference_no,
        payment.display_status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [pendingValidationPayments, searchPendingPayments]);

  const selectedLedger = useMemo(() => (selectedTenantId ? getTenantLedger(selectedTenantId) : []), [selectedTenantId, getTenantLedger]);

  const historyLedger = useMemo(
    () => selectedLedger.filter((payment) => normalizeStatusValue(payment.status_normalized || payment.status) !== 'BILLING'),
    [selectedLedger]
  );

  const selectedSummary = useMemo(
    () =>
      selectedTenantId
        ? getTenantSummary(selectedTenantId)
        : {
            totalDue: 0,
            totalPaid: 0,
            outstandingBalance: 0
          },
    [selectedTenantId, getTenantSummary]
  );

  const selectedTenant = selectedLedger[0] ?? null;

  const closeViewDetails = () => {
    setViewDetailsOpen(false);
    setSelectedTenantId(null);
  };

  const handleViewDetails = (payment) => {
    setSelectedTenantId(payment.tenant_id);
    setViewDetailsOpen(true);
  };

  const handleOpenProofPreview = (proofUrl, notes = '') => {
    const normalizedProofUrl = normalizeString(proofUrl);
    if (!normalizedProofUrl) {
      return;
    }
    setProofPreviewUrl(normalizedProofUrl);
    setProofPreviewNotes(normalizeString(notes));
    setProofPreviewOpen(true);
  };

  const handleCloseProofPreview = () => {
    setProofPreviewOpen(false);
    setProofPreviewUrl('');
    setProofPreviewNotes('');
  };

  const closeApproveModal = () => {
    setApproveTargetPayment(null);
  };

  const closeRejectModal = () => {
    setRejectTargetPayment(null);
    setRejectNotes('');
  };

  const handleApprove = (payment) => {
    setApproveTargetPayment(payment);
  };

  const confirmApprove = async () => {
    if (!approveTargetPayment) {
      return;
    }

    try {
      const approvalResult = await approvePayment(approveTargetPayment);
      setFeedbackMessage(
        approvalResult?.createdNextBilling ? 'Payment approved. Next billing generated.' : 'Payment approved successfully.'
      );
    } catch (approveError) {
      setFeedbackMessage(approveError.message || 'Failed to approve payment.');
    } finally {
      closeApproveModal();
    }
  };

  const handleReject = (payment) => {
    if (!payment) {
      return;
    }

    setRejectTargetPayment(payment);
    setRejectNotes(normalizeString(payment.notes));
  };

  const confirmReject = async () => {
    if (!rejectTargetPayment) {
      return;
    }

    try {
      await rejectPayment(rejectTargetPayment, rejectNotes);
      setFeedbackMessage('Payment rejected successfully.');
    } catch (rejectError) {
      setFeedbackMessage(rejectError.message || 'Failed to reject payment.');
    } finally {
      closeRejectModal();
    }
  };

  const approveModalBusy = Number(actionPaymentId) === Number(approveTargetPayment?.payment_id);
  const rejectModalBusy = Number(actionPaymentId) === Number(rejectTargetPayment?.payment_id);

  return (
    <>
      <Col xl={12}>
        <MainCard>
          <div className="card text-center">
            <div className="card-header">
              <ul className="nav nav-pills card-header-pills justify">
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
                    All Payments
                  </button>
                </li>
                <li className="nav-item">
                  <button className={`nav-link ${activeTab === 'process' ? 'active' : ''}`} onClick={() => setActiveTab('process')}>
                    <CreditCard size={15} /> Process Payments
                  </button>
                </li>
              </ul>
            </div>

            <div className="card-body">
              {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

              {activeTab === 'payments' && (
                <>
                  <div className="top-buttons-rp">
                    <div className="right-side">
                      <div className="search-content">
                        <MagnifyingGlass size={25} className="search-icon" />
                        <input
                          className="search-input"
                          type="search"
                          placeholder="Search"
                          value={searchAllPayments}
                          onChange={(event) => setSearchAllPayments(event.target.value)}
                        />
                      </div>

                      <div className="filter-billing-month">
                        <button className="billing-month">
                          <Funnel size={25} className="filter-icon" />
                          Billing Month
                        </button>

                        <div className="month-options">
                          {BILLING_MONTH_OPTIONS.map((monthOption) => (
                            <a
                              href="#"
                              key={monthOption.value}
                              onClick={(event) => {
                                event.preventDefault();
                                setSelectedBillingMonth(monthOption.value);
                              }}
                            >
                              {monthOption.label}
                            </a>
                          ))}
                        </div>
                      </div>

                      <div className="filter-status">
                        <button className="status">
                          <Funnel size={25} className="filter-icon" />
                          Status
                        </button>
                        <div className="status-options">
                          {STATUS_OPTIONS.map((statusOption) => (
                            <a
                              href="#"
                              key={statusOption.value}
                              onClick={(event) => {
                                event.preventDefault();
                                setSelectedStatus(statusOption.value);
                              }}
                            >
                              {statusOption.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="table-wrapper">
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Tenant</th>
                            <th>Room</th>
                            <th>Billing Start</th>
                            <th>Due Date</th>
                            <th>Total Due</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading && (
                            <tr>
                              <td colSpan="9">Loading payments...</td>
                            </tr>
                          )}

                          {!loading && filteredTenantPayments.length === 0 && (
                            <tr>
                              <td colSpan="9">No payment records found.</td>
                            </tr>
                          )}

                          {!loading &&
                            filteredTenantPayments.map((payment) => {
                              const { billingStartStr, dueDateStr, balance } = getPaymentRowData(payment);

                              return (
                                <tr key={payment.payment_id}>
                                  <td className="left-align">
                                    {payment.tenant_name}
                                    <br />
                                    <small>{payment.tenant_code}</small>
                                  </td>
                                  <td>{payment.room_no}</td>
                                  <td>{billingStartStr}</td>
                                  <td>{dueDateStr}</td>
                                  <td>{formatMoney(payment.amount_due)}</td>
                                  <td>{formatPaymentStatus(payment.status_normalized)}</td>
                                  <td>
                                    <button onClick={() => handleViewDetails(payment)}>View</button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'process' && (
                <div>
                  <div className="top-buttons-rp">
                    <div className="right-side">
                      <div className="search-content">
                        <MagnifyingGlass size={25} className="search-icon" />
                        <input
                          className="search-input"
                          type="search"
                          placeholder="Search"
                          value={searchPendingPayments}
                          onChange={(event) => setSearchPendingPayments(event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="left-side">
                      <div className="pp-button">
                        <button className="otc-btn" onClick={() => setPayRent(true)}>
                          <Wallet size={25} />
                          On-The-Counter
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="table-wrapper">
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Tenant</th>
                            <th>Room</th>
                            <th>Amount Paid</th>
                            <th>Mode of Payment</th>
                            <th>Proof of Payment</th>
                            <th>Date Submitted</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading && (
                            <tr>
                              <td colSpan="10">Loading pending payments...</td>
                            </tr>
                          )}

                          {!loading && filteredPendingPayments.length === 0 && (
                            <tr>
                              <td colSpan="10">No pending payments for validation.</td>
                            </tr>
                          )}

                          {!loading &&
                            filteredPendingPayments.map((payment) => {
                              const rowUpdating = Number(actionPaymentId) === Number(payment.payment_id);
                              const { balance } = getPaymentRowData(payment);

                              return (
                                <tr key={payment.payment_id}>
                                  <td className="left-align">
                                    {payment.tenant_name}
                                    <br />
                                    <small>{payment.tenant_code}</small>
                                  </td>
                                  <td>{payment.room_no}</td>
                                  <td>{formatMoney(payment.amount_paid)}</td>
                                  <td>{payment.payment_method || '-'}</td>
                                  <td>
                                    <ProofAttachment
                                      receiptProof={payment.receipt_proof}
                                      notes={payment.notes}
                                      onOpenImage={handleOpenProofPreview}
                                    />
                                  </td>
                                  <td>{getDisplayedPaymentDate(payment) ? formatDate(getDisplayedPaymentDate(payment)) : '-'}</td>
                                  <td>{formatPaymentStatus(payment.status_normalized)}</td>
                                  <td>
                                    <div className="act-btn2">
                                      <button className="approve" onClick={() => handleApprove(payment)} disabled={rowUpdating}>
                                        {rowUpdating ? 'Processing...' : 'Approve'}
                                      </button>
                                      <button className="reject" onClick={() => handleReject(payment)} disabled={rowUpdating}>
                                        Reject
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </MainCard>
      </Col>

      <Modal open={viewDetailsOpen} onClose={closeViewDetails}>
        <h3>
          <b>Tenant:</b> {selectedTenant?.tenant_name || '-'}
          <br />
          <b>Room:</b> {selectedTenant?.room_no || '-'}
        </h3>
        <h4>Monthly Ledger</h4>

        <div className="card-group">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Total Due:</h5>
              <p className="card-text">{formatMoney(selectedSummary.totalDue)}</p>
            </div>
            <div className="card-footer">
              <small className="text-muted">Calculated from amount_due</small>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Total Paid:</h5>
              <p className="card-text">{formatMoney(selectedSummary.totalPaid)}</p>
            </div>
            <div className="card-footer">
              <small className="text-muted">Calculated from payment records</small>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Outstanding Balance:</h5>
              <p className="card-text">{formatMoney(selectedSummary.outstandingBalance)}</p>
            </div>
            <div className="card-footer">
              <small className="text-muted">Calculated from amount_due - amount_paid</small>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Billing Start</th>
                  <th>Billing End</th>
                  <th>Paid Date</th>
                  <th>Amount Paid</th>
                  <th>Mode of Payment</th>
                  <th>Proof</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historyLedger.length === 0 && (
                  <tr>
                    <td colSpan="9">No payment history found for this tenant.</td>
                  </tr>
                )}

                {historyLedger.map((payment) => {
                  const { billingStartStr, dueDateStr, balance } = getPaymentRowData(payment);

                  return (
                    <tr key={payment.payment_id}>
                      <td>{billingStartStr}</td>
                      <td>{dueDateStr}</td>
                      <td>{getDisplayedPaymentDate(payment) ? formatDate(getDisplayedPaymentDate(payment)) : '-'}</td>
                      <td>{formatMoney(payment.amount_paid)}</td>
                      <td>{payment.payment_method || '-'}</td>
                      <td>
                        <ProofAttachment receiptProof={payment.receipt_proof} notes={payment.notes} onOpenImage={handleOpenProofPreview} />
                      </td>
                      <td>{formatPaymentStatus(payment.status_normalized)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      <Modal open={proofPreviewOpen} onClose={handleCloseProofPreview}>
        {proofPreviewUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <strong>Notes:</strong>
              <div>{proofPreviewNotes || 'No notes provided'}</div>
            </div>
            <img
              src={proofPreviewUrl}
              alt="Proof of payment full preview"
              style={{
                maxWidth: '100%',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '10px'
              }}
            />
          </div>
        ) : (
          <p>No attachment selected.</p>
        )}
      </Modal>

      <OnTheCounter open={payRent} onClose={() => setPayRent(false)} />
      <ViewModal
        open={Boolean(approveTargetPayment)}
        message={`Approve payment for ${normalizeString(approveTargetPayment?.tenant_name) || 'this tenant'}?`}
        showSpinner={false}
        closeOnBackdrop
        onClose={closeApproveModal}
        autoClose={false}
        actions={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeApproveModal} disabled={approveModalBusy}>
              Cancel
            </button>
            <button type="button" onClick={confirmApprove} disabled={approveModalBusy}>
              {approveModalBusy ? 'Processing...' : 'Approve'}
            </button>
          </div>
        }
      />
      <ViewModal
        open={Boolean(rejectTargetPayment)}
        message={`Reject payment for ${normalizeString(rejectTargetPayment?.tenant_name) || 'this tenant'}?`}
        showSpinner={false}
        closeOnBackdrop
        onClose={closeRejectModal}
        autoClose={false}
        actions={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <textarea
              value={rejectNotes}
              onChange={(event) => setRejectNotes(event.target.value)}
              placeholder="Optional rejection note"
              rows={4}
              disabled={rejectModalBusy}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeRejectModal} disabled={rejectModalBusy}>
                Cancel
              </button>
              <button type="button" onClick={confirmReject} disabled={rejectModalBusy}>
                {rejectModalBusy ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        }
      />
      <ViewModal
        open={Boolean(feedbackMessage)}
        message={feedbackMessage}
        showSpinner={false}
        onClose={() => setFeedbackMessage('')}
        duration={2000}
      />
    </>
  );
}
