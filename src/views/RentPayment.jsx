import { useMemo, useState } from 'react';
import Col from 'react-bootstrap/Col';
import { Funnel, MagnifyingGlass, Wallet, CreditCard } from 'phosphor-react';

import MainCard from 'components/MainCard';
import Modal from 'layout/Modal';
import { OnTheCounter } from 'views/ShortcutModals';
import { formatDate } from 'viewmodel/formatDate.js';
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
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PENDING_VALIDATION', label: 'Pending Validation' },
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

    return tenantPayments.filter((payment) => {
      const searchableText = [
        payment.tenant_name,
        payment.tenant_code,
        payment.room_no,
        payment.billing_period,
        payment.display_status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (keyword && !searchableText.includes(keyword)) {
        return false;
      }

      if (selectedBillingMonth !== 'ALL') {
        const billingMonthText = `${normalizeString(payment.billing_month)} ${normalizeString(payment.billing_period)}`.toUpperCase();
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

  const selectedLedger = useMemo(
    () => (selectedTenantId ? getTenantLedger(selectedTenantId) : []),
    [selectedTenantId, getTenantLedger]
  );

  const selectedSummary = useMemo(
    () =>
      selectedTenantId
        ? getTenantSummary(selectedTenantId)
        : {
            totalRent: 0,
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

  const handleApprove = async (payment) => {
    const tenantName = normalizeString(payment?.tenant_name) || 'this tenant';
    const shouldApprove = window.confirm(`Approve payment for ${tenantName}?`);
    if (!shouldApprove) {
      return;
    }

    try {
      await approvePayment(payment);
      alert('Payment approved successfully.');
    } catch (approveError) {
      alert(approveError.message || 'Failed to approve payment.');
    }
  };

  const handleReject = async (payment) => {
    const tenantName = normalizeString(payment?.tenant_name) || 'this tenant';
    const shouldReject = window.confirm(`Reject payment for ${tenantName}?`);
    if (!shouldReject) {
      return;
    }

    const notes = window.prompt('Optional rejection note:', normalizeString(payment.notes));
    if (notes === null) {
      return;
    }

    try {
      await rejectPayment(payment, notes);
      alert('Payment rejected successfully.');
    } catch (rejectError) {
      alert(rejectError.message || 'Failed to reject payment.');
    }
  };

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
                            <th>Billing Period</th>
                            <th>Total Due</th>
                            <th>Amount Paid</th>
                            <th>Balance</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading && (
                            <tr>
                              <td colSpan={7}>Loading payments...</td>
                            </tr>
                          )}

                          {!loading && filteredTenantPayments.length === 0 && (
                            <tr>
                              <td colSpan={7}>No payment records found.</td>
                            </tr>
                          )}

                          {!loading &&
                            filteredTenantPayments.map((payment) => (
                              <tr key={payment.tenant_id}>
                                <td className="left-align">
                                  {payment.tenant_name}
                                  <br />
                                  <small>{payment.tenant_code}</small>
                                </td>
                                <td>{payment.billing_period}</td>
                                <td>{formatMoney(payment.amount_due)}</td>
                                <td>{formatMoney(payment.amount_paid)}</td>
                                <td>{formatMoney(payment.balance)}</td>
                                <td>{formatPaymentStatus(payment.status_normalized)}</td>
                                <td>
                                  <button onClick={() => handleViewDetails(payment)}>View</button>
                                </td>
                              </tr>
                            ))}
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
                            <th>Total Due</th>
                            <th>Amount Paid</th>
                            <th>Balance</th>
                            <th>Mode of Payment</th>
                            <th>Proof of Payment</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading && (
                            <tr>
                              <td colSpan={9}>Loading pending payments...</td>
                            </tr>
                          )}

                          {!loading && filteredPendingPayments.length === 0 && (
                            <tr>
                              <td colSpan={9}>No pending payments for validation.</td>
                            </tr>
                          )}

                          {!loading &&
                            filteredPendingPayments.map((payment) => {
                              const rowUpdating = Number(actionPaymentId) === Number(payment.payment_id);

                              return (
                                <tr key={payment.payment_id}>
                                  <td className="left-align">
                                    {payment.tenant_name}
                                    <br />
                                    <small>{payment.tenant_code}</small>
                                  </td>
                                  <td>{payment.room_no}</td>
                                  <td>{formatMoney(payment.amount_due)}</td>
                                  <td>{formatMoney(payment.amount_paid)}</td>
                                  <td>{formatMoney(payment.balance)}</td>
                                  <td>{payment.payment_method || '-'}</td>
                                  <td>
                                    <ProofAttachment
                                      receiptProof={payment.receipt_proof}
                                      notes={payment.notes}
                                      onOpenImage={handleOpenProofPreview}
                                    />
                                  </td>
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
              <h5 className="card-title">Total Rent:</h5>
              <p className="card-text">{formatMoney(selectedSummary.totalRent)}</p>
            </div>
            <div className="card-footer">
              <small className="text-muted">Calculated from billing records</small>
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
              <small className="text-muted">Calculated from balances</small>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Billing Period</th>
                  <th>Due Date</th>
                  <th>Total Due</th>
                  <th>Amount Paid</th>
                  <th>Balance</th>
                  <th>Mode of Payment</th>
                  <th>Proof</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedLedger.length === 0 && (
                  <tr>
                    <td colSpan={8}>No billing records found for this tenant.</td>
                  </tr>
                )}

                {selectedLedger.map((payment) => (
                  <tr key={payment.payment_id}>
                    <td>{payment.billing_period}</td>
                    <td>{formatDate(payment.due_date_resolved ?? payment.payment_date)}</td>
                    <td>{formatMoney(payment.amount_due)}</td>
                    <td>{formatMoney(payment.amount_paid)}</td>
                    <td>{formatMoney(payment.balance)}</td>
                    <td>{payment.payment_method || '-'}</td>
                    <td>
                      <ProofAttachment
                        receiptProof={payment.receipt_proof}
                        notes={payment.notes}
                        onOpenImage={handleOpenProofPreview}
                      />
                    </td>
                    <td>{formatPaymentStatus(payment.status_normalized)}</td>
                  </tr>
                ))}
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
    </>
  );
}
