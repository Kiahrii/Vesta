import { useMemo, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import { Export, MagnifyingGlass } from 'phosphor-react';
import MainCard from 'components/MainCard';
import { usePayments } from 'viewmodel/viewpayment.js';

import 'assets/scss/apartment-page/past-tenants.scss';
import 'assets/scss/themes/components/_table.scss';

const ONE_YEAR = 365 * 24 * 60 * 60 * 1000;

const currencyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeTenantStatus = (value) =>
  normalizeString(value)
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const formatDateValue = (value) => {
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : 'N/A';
};

const formatMoney = (value) => currencyFormatter.format(Number(value) || 0);

const buildDueDate = (billingStart) => {
  const parsedBillingStart = parseDate(billingStart);
  if (!parsedBillingStart) {
    return null;
  }

  const dueDate = new Date(parsedBillingStart);
  dueDate.setMonth(dueDate.getMonth() + 1);
  return dueDate;
};

const buildArchivedDate = (payment, archiveBaseDate) => {
  const moveOutDate = parseDate(payment?.tenant?.move_out_date ?? payment?.move_out_date);
  if (moveOutDate) {
    return moveOutDate;
  }

  if (!archiveBaseDate) {
    return null;
  }

  return new Date(archiveBaseDate.getTime() + ONE_YEAR);
};

const buildArchivedPaymentRow = (payment) => {
  const billingStart = parseDate(payment?.billing_period_start);
  const archiveBaseDate = billingStart ?? parseDate(payment?.created_at);
  const dueDate = buildDueDate(payment?.billing_period_start);
  const balance = Math.max(Number(payment?.amount_due || 0) - Number(payment?.amount_paid || 0), 0);
  const archivedDate = buildArchivedDate(payment, archiveBaseDate);

  return {
    ...payment,
    dueDate,
    balance,
    archivedDate
  };
};

export default function PaymentHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const { loading, error, rawAllPayments } = usePayments();

  const archivedPayments = useMemo(() => {
    const today = new Date();

    return (rawAllPayments ?? [])
      .filter((payment) => {
        const archiveBaseDate = parseDate(payment?.billing_period_start) ?? parseDate(payment?.created_at);
        const isOld = archiveBaseDate ? today.getTime() - archiveBaseDate.getTime() >= ONE_YEAR : false;
        const tenantStatus = normalizeTenantStatus(payment?.tenant?.status);
        const isMovedOut = tenantStatus === 'MOVED_OUT';

        return isMovedOut || isOld;
      })
      .map(buildArchivedPaymentRow)
      .sort((left, right) => {
        const leftTime = parseDate(left.archivedDate)?.getTime() ?? 0;
        const rightTime = parseDate(right.archivedDate)?.getTime() ?? 0;
        return rightTime - leftTime;
      });
  }, [rawAllPayments]);

  const filteredArchivedPayments = useMemo(() => {
    const keyword = normalizeString(searchTerm).toLowerCase();
    if (!keyword) {
      return archivedPayments;
    }

    return archivedPayments.filter((payment) => {
      const searchableText = [
        payment.tenant_name,
        payment.room_no,
        payment.payment_method,
        payment.status_normalized,
        payment.tenant?.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [archivedPayments, searchTerm]);

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
            </div>

            <div className="left-side">
              <div className="export-btn">
                <button type="button" className="export-btn" disabled>
                  <Export size={25} />
                  Export
                </button>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <div className="table-wrapper">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Room</th>
                    <th>Billing Start</th>
                    <th>Due Date</th>
                    <th>Paid Date</th>
                    <th>Total Due</th>
                    <th>Amount Paid</th>
                    <th>Balance</th>
                    <th>Mode of Payment</th>
                    <th>Status</th>
                    <th>Archived Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={11}>Loading archived payments...</td>
                    </tr>
                  )}

                  {!loading && filteredArchivedPayments.length === 0 && (
                    <tr>
                      <td colSpan={11}>No archived payment records found.</td>
                    </tr>
                  )}

                  {!loading &&
                    filteredArchivedPayments.map((payment) => (
                      <tr key={payment.payment_id}>
                        <td>{payment.tenant_name || 'N/A'}</td>
                        <td>{payment.room_no || 'N/A'}</td>
                        <td>{formatDateValue(payment.billing_period_start)}</td>
                        <td>{formatDateValue(payment.dueDate)}</td>
                        <td>{formatDateValue(payment.paid_date)}</td>
                        <td>{formatMoney(payment.amount_due)}</td>
                        <td>{formatMoney(payment.amount_paid)}</td>
                        <td>{formatMoney(payment.balance)}</td>
                        <td>{payment.payment_method || '-'}</td>
                        <td>{payment.status_normalized || 'N/A'}</td>
                        <td>{formatDateValue(payment.archivedDate)}</td>
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
