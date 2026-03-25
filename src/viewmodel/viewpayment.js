import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../model/supabaseclient.js';

const STATUS_DISPLAY = {
  BILLING: 'Billing',
  UNPAID: 'Unpaid',
  PARTIAL: 'Partially Paid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  PENDING: 'Pending',
  PENDING_VALIDATION: 'Pending',
  REJECTED: 'Rejected'
};

const STATUS_DATABASE = {
  BILLING: 'Billing',
  UNPAID: 'Unpaid',
  PARTIAL: 'Partially Paid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  PENDING: 'Pending',
  PENDING_VALIDATION: 'Pending',
  REJECTED: 'Rejected'
};

const MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER'
];

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeBillingMonth = (value) => normalizeString(value).toUpperCase().replace(/\s+/g, '_');
const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};
const pickJoinedRow = (value) => (Array.isArray(value) ? value[0] ?? null : value ?? null);

export const normalizeStatusValue = (status) => normalizeString(status).toUpperCase().replace(/\s+/g, '_');

const toTitleCase = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatPaymentStatus = (status) => {
  const normalized = normalizeStatusValue(status);
  const fallback = toTitleCase(normalized.replace(/_/g, ' '));
  return STATUS_DISPLAY[normalized] || fallback || 'Unknown';
};

const toDatabaseStatus = (status) => {
  const normalized = normalizeStatusValue(status);
  if (!normalized) {
    return null;
  }

  return STATUS_DATABASE[normalized] || toTitleCase(normalized.replace(/_/g, ' '));
};

export const formatBillingPeriod = (billingMonth) => {
  const normalized = normalizeString(billingMonth);
  if (!normalized) {
    return 'N/A';
  }

  return toTitleCase(normalized.replace(/_/g, ' '));
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const toStartOfDay = (value) => {
  const date = value instanceof Date ? new Date(value) : parseDate(value);
  if (!date) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

const formatLongDate = (value) => {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatBillingPeriodRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 'N/A';
  }

  return `${formatLongDate(startDate)} - ${formatLongDate(endDate)}`;
};

const addMonthsSafely = (date, months) => {
  const base = toStartOfDay(date);
  if (!base || !Number.isFinite(months)) {
    return null;
  }

  const target = new Date(base);
  const dayOfMonth = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + months);

  const lastDayOfMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(dayOfMonth, lastDayOfMonth));

  return target;
};

const getBillingCycleIndex = (startDate, currentDate) => {
  const start = toStartOfDay(startDate);
  const current = toStartOfDay(currentDate);

  if (!start || !current) {
    return 0;
  }

  let months = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
  if (months < 0) {
    return 0;
  }

  const candidate = addMonthsSafely(start, months);
  if (candidate && current < candidate) {
    months -= 1;
  }

  return Math.max(months, 0);
};

const resolveTenantStartDate = (tenant, ledger = []) => {
  const tenantDate = parseDate(tenant?.move_in_date) ?? parseDate(tenant?.created_at);
  if (tenantDate) {
    return toStartOfDay(tenantDate);
  }

  const ledgerDates = (ledger ?? [])
    .map((payment) => parseDate(payment?.payment_date) ?? parseDate(payment?.due_date_resolved) ?? parseDate(payment?.created_at))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  if (ledgerDates.length > 0) {
    return toStartOfDay(ledgerDates[0]);
  }

  return getStartOfToday();
};

const resolveMonthlyRent = (ledger = [], room = null) => {
  const roomRent = toNumber(room?.monthly_rent);
  if (roomRent > 0) {
    return roomRent;
  }

  const ledgerRent = (ledger ?? []).reduce((found, payment) => {
    if (found > 0) {
      return found;
    }
    const value = toNumber(payment?.amount_due);
    return value > 0 ? value : 0;
  }, 0);

  return ledgerRent;
};

const sumTenantPayments = (ledger = []) =>
  (ledger ?? []).reduce((sum, payment) => {
    const status = normalizeStatusValue(payment?.status_normalized ?? payment?.status);
    if (status === 'REJECTED') {
      return sum;
    }
    return sum + toNumber(payment?.amount_paid);
  }, 0);

const resolveStatusOverrideForPeriod = (ledger, periodStart, periodEnd, periodMonthKey) => {
  if (!Array.isArray(ledger) || ledger.length === 0) {
    return null;
  }

  const startTime = periodStart ? periodStart.getTime() : null;
  const endTime = periodEnd ? periodEnd.getTime() : null;

  const candidates = ledger.filter((payment) => {
    const status = normalizeStatusValue(payment?.status_normalized ?? payment?.status);
    if (!isPendingStatus(status) && status !== 'REJECTED') {
      return false;
    }

    const paymentDate = parseDate(payment?.payment_date);
    if (paymentDate && startTime !== null && endTime !== null) {
      const time = paymentDate.getTime();
      return time >= startTime && time < endTime;
    }

    const billingMonth = normalizeBillingMonth(payment?.billing_month);
    if (billingMonth && periodMonthKey) {
      return billingMonth === periodMonthKey;
    }

    return false;
  });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const dateA = parseDate(a?.payment_date)?.getTime() ?? 0;
    const dateB = parseDate(b?.payment_date)?.getTime() ?? 0;
    return dateB - dateA;
  });

  return normalizeStatusValue(candidates[0]?.status_normalized ?? candidates[0]?.status) || null;
};

const resolveCurrentPeriodStatus = ({ amountDue, amountPaid, dueDate, overrideStatus }) => {
  const normalizedOverride = normalizeStatusValue(overrideStatus);
  if (normalizedOverride) {
    return normalizedOverride;
  }

  const numericAmountDue = toNumber(amountDue);
  const numericAmountPaid = toNumber(amountPaid);
  const balance = Math.max(numericAmountDue - numericAmountPaid, 0);

  if (numericAmountDue <= 0) {
    return 'PAID';
  }

  if (dueDate && toStartOfDay(dueDate) < getStartOfToday() && balance > 0) {
    return 'OVERDUE';
  }

  if (balance <= 0) {
    return 'PAID';
  }

  if (numericAmountPaid > 0) {
    return 'PARTIALLY_PAID';
  }

  return 'UNPAID';
};

const inferDueDateFromBillingMonth = (billingMonth) => {
  const normalized = normalizeString(billingMonth);
  if (!normalized) {
    return null;
  }

  const plain = normalized.replace(/_/g, ' ').toUpperCase();

  const yearMonthMatch = plain.match(/^(\d{4})[-\s/](\d{1,2})$/);
  if (yearMonthMatch) {
    const year = Number(yearMonthMatch[1]);
    const month = Number(yearMonthMatch[2]);

    if (year >= 2000 && month >= 1 && month <= 12) {
      return new Date(year, month, 0);
    }
  }

  const explicitDate = parseDate(`${plain} 01`);
  if (explicitDate) {
    return new Date(explicitDate.getFullYear(), explicitDate.getMonth() + 1, 0);
  }

  const monthIndex = MONTH_NAMES.indexOf(plain);
  if (monthIndex === -1) {
    return null;
  }

  const now = new Date();
  const inferredYear = now.getMonth() >= monthIndex ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(inferredYear, monthIndex + 1, 0);
};

const resolveDueDate = (paymentRow) => parseDate(paymentRow?.due_date) ?? inferDueDateFromBillingMonth(paymentRow?.billing_month);

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const calculateBalance = (amountDue, amountPaid) => Math.max(toNumber(amountDue) - toNumber(amountPaid), 0);
const isPendingStatus = (status) => status === 'PENDING' || status === 'PENDING_VALIDATION';

const resolveComputedStatus = ({ amountDue, amountPaid, dueDate, sourceStatus }) => {
  const normalizedSource = normalizeStatusValue(sourceStatus);
  if (isPendingStatus(normalizedSource) || normalizedSource === 'REJECTED') {
    return normalizedSource;
  }

  const numericAmountDue = toNumber(amountDue);
  const numericAmountPaid = toNumber(amountPaid);

  if (numericAmountPaid <= 0) {
    if (dueDate && dueDate < getStartOfToday()) {
      return 'OVERDUE';
    }
    return 'UNPAID';
  }

  if (numericAmountPaid < numericAmountDue) {
    return 'PARTIALLY_PAID';
  }

  return 'PAID';
};

const buildTenantName = (tenant, user) => {
  const directName =
    normalizeString(tenant?.tenant_name) ||
    normalizeString(tenant?.full_name) ||
    normalizeString(tenant?.name);

  if (directName) {
    return directName;
  }

  const userFullName =
    normalizeString(user?.full_name) ||
    [normalizeString(user?.first_name), normalizeString(user?.middle_name), normalizeString(user?.last_name)]
      .filter(Boolean)
      .join(' ');

  if (userFullName) {
    return userFullName;
  }

  const tenantComposedName = [normalizeString(tenant?.first_name), normalizeString(tenant?.middle_name), normalizeString(tenant?.last_name)]
    .filter(Boolean)
    .join(' ');

  return tenantComposedName || `Tenant #${tenant?.tenant_id ?? 'N/A'}`;
};

const buildRoomNumber = (tenant, room) => normalizeString(room?.room_no) || normalizeString(tenant?.assigned_room) || '-';

const buildTenantCode = (tenantId) => `TN-${String(tenantId ?? '').padStart(3, '0')}`;

const enrichPaymentRows = ({ paymentRows, tenantRows, userRows, roomRows }) => {
  const hasLookupMaps = Array.isArray(tenantRows) || Array.isArray(userRows) || Array.isArray(roomRows);
  const tenantMap = hasLookupMaps ? new Map((tenantRows ?? []).map((tenant) => [tenant.tenant_id, tenant])) : null;
  const userMap = hasLookupMaps ? new Map((userRows ?? []).map((user) => [user.user_id, user])) : null;
  const roomMap = hasLookupMaps ? new Map((roomRows ?? []).map((room) => [room.room_id, room])) : null;

  return (paymentRows ?? []).map((payment) => {
    const joinedTenant = pickJoinedRow(payment.tenants);
    const tenant = tenantMap ? tenantMap.get(payment.tenant_id) ?? null : joinedTenant ?? null;
    const joinedUser = pickJoinedRow(joinedTenant?.users);
    const joinedRoom = pickJoinedRow(joinedTenant?.rooms);
    const user = tenantMap ? (tenant?.user_id ? userMap.get(tenant.user_id) ?? null : null) : joinedUser ?? null;
    const room = tenantMap ? (tenant?.room_id ? roomMap.get(tenant.room_id) ?? null : null) : joinedRoom ?? null;

    const amountDue = toNumber(room?.monthly_rent ?? payment.amount_due);
    const amountPaid = toNumber(payment.amount_paid);
    const dueDate = resolveDueDate(payment);
    const computedBalance = calculateBalance(amountDue, amountPaid);
    const computedStatus = resolveComputedStatus({
      amountDue,
      amountPaid,
      dueDate,
      sourceStatus: payment.status
    });
    const sourceStatus = normalizeStatusValue(payment.status);
    const currentStatus = sourceStatus || computedStatus;

    return {
      ...payment,
      tenant,
      user,
      room,
      tenant_name: buildTenantName(tenant, user),
      tenant_code: buildTenantCode(payment.tenant_id),
      room_no: buildRoomNumber(tenant, room),
      amount_due: amountDue,
      amount_paid: amountPaid,
      balance: computedBalance,
      computed_balance: computedBalance,
      status_normalized: currentStatus,
      computed_status: computedStatus,
      display_status: formatPaymentStatus(currentStatus),
      billing_period: formatBillingPeriod(payment.billing_month),
      due_date_resolved: dueDate ? dueDate.toISOString().slice(0, 10) : null
    };
  });
};

const buildTenantCurrentSummary = (tenantId, ledger) => {
  if (!Array.isArray(ledger) || ledger.length === 0) {
    return null;
  }

  const template = ledger[0];
  const tenant = template?.tenant ?? null;
  const user = template?.user ?? null;
  const room = template?.room ?? null;

  const startDate = resolveTenantStartDate(tenant, ledger);
  const today = getStartOfToday();
  const monthlyRent = resolveMonthlyRent(ledger, room);
  const totalPaid = sumTenantPayments(ledger);
  const dateCycleIndex = getBillingCycleIndex(startDate, today);
  const paidCycleIndex = monthlyRent > 0 ? Math.floor(totalPaid / monthlyRent) : 0;
  const cycleIndex = Math.max(dateCycleIndex, paidCycleIndex);
  const periodStart = addMonthsSafely(startDate, cycleIndex);
  const periodEnd = addMonthsSafely(startDate, cycleIndex + 1);
  const previousPeriodsTotal = monthlyRent * cycleIndex;
  const previousUnpaid = Math.max(previousPeriodsTotal - totalPaid, 0);
  const totalDue = Math.max(monthlyRent + previousUnpaid, 0);
  const amountPaidCurrent = Math.max(totalPaid - previousPeriodsTotal, 0);
  const amountPaid = Math.min(amountPaidCurrent, totalDue);
  const balance = Math.max(totalDue - amountPaid, 0);

  const periodMonth = periodStart ? MONTH_NAMES[periodStart.getMonth()] : null;
  const normalizedPeriodMonth = normalizeBillingMonth(periodMonth);
  const overrideStatus = resolveStatusOverrideForPeriod(ledger, periodStart, periodEnd, normalizedPeriodMonth);
  const statusNormalized = resolveCurrentPeriodStatus({
    amountDue: totalDue,
    amountPaid,
    dueDate: periodEnd,
    overrideStatus
  });

  return {
    ...template,
    tenant,
    user,
    room,
    tenant_id: tenantId,
    amount_due: totalDue,
    amount_paid: amountPaid,
    balance,
    computed_balance: balance,
    status_normalized: statusNormalized,
    computed_status: statusNormalized,
    display_status: formatPaymentStatus(statusNormalized),
    billing_period: formatBillingPeriodRange(periodStart, periodEnd),
    billing_month: periodMonth || template?.billing_month,
    billing_year: periodStart ? periodStart.getFullYear() : template?.billing_year,
    due_date_resolved: periodEnd ? periodEnd.toISOString().slice(0, 10) : template?.due_date_resolved,
    billing_period_start: periodStart ? periodStart.toISOString().slice(0, 10) : null,
    billing_period_end: periodEnd ? periodEnd.toISOString().slice(0, 10) : null,
    current_period_index: cycleIndex
  };
};

const toTenantId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toReferenceNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getApprovedStatus = (amountDue, amountPaid) => {
  const numericAmountDue = toNumber(amountDue);
  const numericAmountPaid = toNumber(amountPaid);

  if (numericAmountPaid >= numericAmountDue) {
    return 'PAID';
  }
  if (numericAmountPaid > 0) {
    return 'PARTIALLY_PAID';
  }
  return 'UNPAID';
};

export async function createInitialBillingForTenant({ tenantId, billingMonth, amountDue }) {
  const parsedTenantId = toTenantId(tenantId);
  const normalizedBillingMonth = normalizeBillingMonth(billingMonth);

  if (!parsedTenantId) {
    throw new Error('A valid tenant id is required to create a billing record.');
  }
  if (!normalizedBillingMonth) {
    throw new Error('Billing month is required.');
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('payments')
    .select('payment_id')
    .eq('tenant_id', parsedTenantId)
    .eq('billing_month', normalizedBillingMonth)
    .limit(1);

  if (existingError) {
    throw new Error(`Failed to validate billing record uniqueness: ${existingError.message}`);
  }

  if ((existingRows ?? []).length > 0) {
    return {
      created: false,
      payment_id: existingRows[0].payment_id
    };
  }

  const { data: tenantRow, error: tenantError } = await supabase
    .from('tenants')
    .select('tenant_id, room_id')
    .eq('tenant_id', parsedTenantId)
    .maybeSingle();

  if (tenantError) {
    throw new Error(`Failed to fetch tenant information: ${tenantError.message}`);
  }
  if (!tenantRow?.room_id) {
    throw new Error('Tenant room information is missing. Cannot create billing.');
  }

  const { data: roomRow, error: roomError } = await supabase
    .from('rooms')
    .select('room_id, monthly_rent')
    .eq('room_id', tenantRow.room_id)
    .maybeSingle();

  if (roomError) {
    throw new Error(`Failed to fetch room rental details: ${roomError.message}`);
  }

  const normalizedAmountDue = toNumber(roomRow?.monthly_rent ?? amountDue);
  if (normalizedAmountDue <= 0) {
    throw new Error('Monthly rent is missing or invalid. Cannot create billing.');
  }

  const payload = {
    tenant_id: parsedTenantId,
    billing_month: normalizedBillingMonth,
    amount_due: normalizedAmountDue,
    amount_paid: 0,
    balance: normalizedAmountDue,
    status: toDatabaseStatus('BILLING'),
    payment_method: null,
    payment_date: null,
    reference_no: null,
    receipt_proof: null
  };

  const { data: insertedRow, error: insertError } = await supabase.from('payments').insert(payload).select('*').single();

  if (insertError) {
    throw new Error(`Failed to create initial billing record: ${insertError.message}`);
  }

  return {
    created: true,
    payment: insertedRow
  };
}

export async function submitTenantUploadedPayment({
  tenantId,
  billingMonth,
  amountPaid,
  paymentMethod,
  paymentDate,
  referenceNo,
  receiptProof,
  notes
}) {
  const parsedTenantId = toTenantId(tenantId);
  const normalizedBillingMonth = normalizeBillingMonth(billingMonth);

  if (!parsedTenantId) {
    throw new Error('A valid tenant id is required.');
  }
  if (!normalizedBillingMonth) {
    throw new Error('Billing month is required.');
  }

  const { data: paymentRow, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('tenant_id', parsedTenantId)
    .eq('billing_month', normalizedBillingMonth)
    .maybeSingle();

  if (paymentError) {
    throw new Error(`Failed to locate billing row for payment upload: ${paymentError.message}`);
  }
  if (!paymentRow) {
    throw new Error('No billing row found for this tenant and month.');
  }

  const normalizedAmountPaid = Math.max(0, toNumber(amountPaid));
  const normalizedAmountDue = toNumber(paymentRow.amount_due);

  const payload = {
    amount_paid: normalizedAmountPaid,
    balance: calculateBalance(normalizedAmountDue, normalizedAmountPaid),
    payment_method: normalizeString(paymentMethod) || null,
    payment_date: normalizeString(paymentDate) || new Date().toISOString().slice(0, 10),
    reference_no: toReferenceNumber(referenceNo),
    receipt_proof: normalizeString(receiptProof) || null,
    status: toDatabaseStatus('PENDING'),
    notes: normalizeString(notes) || null
  };

  const { data: updatedRow, error: updateError } = await supabase
    .from('payments')
    .update(payload)
    .eq('payment_id', paymentRow.payment_id)
    .select('*')
    .maybeSingle();

  if (updateError) {
    throw new Error(`Failed to update payment upload: ${updateError.message}`);
  }

  return updatedRow;
}

export function usePayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionPaymentId, setActionPaymentId] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data: paymentRows, error: paymentError } = await supabase
        .from('payments')
        .select(
          `
          *,
          tenants (
            tenant_id,
            user_id,
            move_in_date,
            assigned_room,
            room_id,
            users (
              user_id,
              first_name,
              middle_name,
              last_name
            ),
            rooms (
              room_id,
              room_no,
              monthly_rent
            )
          )
        `
        )
        .order('payment_id', { ascending: false });

      if (paymentError) {
        throw new Error(`Failed to fetch payments: ${paymentError.message}`);
      }

      console.log('[payments] raw payments', paymentRows);

      const enrichedRows = enrichPaymentRows({
        paymentRows
      });

      console.log('[payments] enriched payments', enrichedRows);

      setPayments(enrichedRows);
      return enrichedRows;
    } catch (fetchError) {
      setPayments([]);
      setError(fetchError.message || 'Unable to load payments.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const allPayments = useMemo(() => payments, [payments]);

  const pendingValidationPayments = useMemo(
    () => allPayments.filter((payment) => isPendingStatus(normalizeStatusValue(payment.status_normalized))),
    [allPayments]
  );

  const paymentsByTenant = useMemo(() => {
    const map = new Map();

    allPayments.forEach((payment) => {
      const tenantId = toTenantId(payment.tenant_id);
      if (!tenantId) {
        return;
      }

      const rows = map.get(tenantId) ?? [];
      rows.push(payment);
      map.set(tenantId, rows);
    });

    map.forEach((rows) => {
      rows.sort((a, b) => {
        const dateA = parseDate(a.due_date_resolved ?? a.payment_date)?.getTime() ?? 0;
        const dateB = parseDate(b.due_date_resolved ?? b.payment_date)?.getTime() ?? 0;
        return dateB - dateA;
      });
    });

    return map;
  }, [allPayments]);

  const tenantPayments = useMemo(() => {
    const summaries = [];

    paymentsByTenant.forEach((ledger, tenantId) => {
      const summary = buildTenantCurrentSummary(tenantId, ledger);
      if (summary) {
        summaries.push(summary);
      }
    });

    summaries.sort((a, b) => {
      const nameA = normalizeString(a?.tenant_name).toLowerCase();
      const nameB = normalizeString(b?.tenant_name).toLowerCase();
      if (nameA && nameB) {
        return nameA.localeCompare(nameB);
      }
      if (nameA) {
        return -1;
      }
      if (nameB) {
        return 1;
      }
      return (a?.tenant_id ?? 0) - (b?.tenant_id ?? 0);
    });

    return summaries;
  }, [paymentsByTenant]);

  const getTenantLedger = useCallback(
    (tenantId) => {
      const parsedTenantId = toTenantId(tenantId);
      if (!parsedTenantId) {
        return [];
      }

      return paymentsByTenant.get(parsedTenantId) ?? [];
    },
    [paymentsByTenant]
  );

  const getTenantSummary = useCallback(
    (tenantId) => {
      const ledger = getTenantLedger(tenantId);

      const totalRent = ledger.reduce((sum, payment) => sum + toNumber(payment.amount_due), 0);
      const totalPaid = ledger.reduce((sum, payment) => sum + toNumber(payment.amount_paid), 0);
      const outstandingBalance = ledger.reduce((sum, payment) => sum + toNumber(payment.balance), 0);

      return {
        totalRent,
        totalPaid,
        outstandingBalance
      };
    },
    [getTenantLedger]
  );

  const updatePayment = useCallback(
    async (paymentId, payload) => {
      const parsedPaymentId = Number(paymentId);
      if (!Number.isInteger(parsedPaymentId) || parsedPaymentId <= 0) {
        throw new Error('A valid payment id is required.');
      }

      setActionPaymentId(parsedPaymentId);
      setError('');

      try {
        const nextPayload = { ...payload };
        if (Object.prototype.hasOwnProperty.call(nextPayload, 'status')) {
          const nextStatus = toDatabaseStatus(nextPayload.status);
          if (nextStatus) {
            nextPayload.status = nextStatus;
          } else {
            delete nextPayload.status;
          }
        }

        const { error: updateError } = await supabase.from('payments').update(nextPayload).eq('payment_id', parsedPaymentId);

        if (updateError) {
          throw new Error(`Failed to update payment: ${updateError.message}`);
        }

        await fetchPayments();
      } finally {
        setActionPaymentId(null);
      }
    },
    [fetchPayments]
  );

  const processPayment = useCallback(
    async ({ paymentId, amountPaid, paymentMethod, paymentDate, referenceNo, receiptProof, notes }) => {
      const selectedPayment = allPayments.find((payment) => Number(payment.payment_id) === Number(paymentId));
      if (!selectedPayment) {
        throw new Error('Payment record not found.');
      }

      const normalizedAmountPaid = Math.max(0, toNumber(amountPaid));
      const normalizedAmountDue = toNumber(selectedPayment.amount_due);
      const balance = calculateBalance(normalizedAmountDue, normalizedAmountPaid);

      const payload = {
        amount_paid: normalizedAmountPaid,
        balance,
        payment_method: normalizeString(paymentMethod) || null,
        payment_date: normalizeString(paymentDate) || new Date().toISOString().slice(0, 10),
        reference_no: toReferenceNumber(referenceNo),
        receipt_proof: normalizeString(receiptProof) || null,
        status: toDatabaseStatus('PENDING'),
        notes: normalizeString(notes) || selectedPayment.notes || null
      };

      await updatePayment(paymentId, payload);
    },
    [allPayments, updatePayment]
  );

  const approvePayment = useCallback(
    async (payment) => {
      if (!payment?.payment_id) {
        throw new Error('Payment data is required for approval.');
      }

      const amountDue = toNumber(payment.amount_due);
      const amountPaid = toNumber(payment.amount_paid);
      const balance = calculateBalance(amountDue, amountPaid);

      const payload = {
        balance,
        status: toDatabaseStatus(getApprovedStatus(amountDue, amountPaid))
      };

      await updatePayment(payment.payment_id, payload);
    },
    [updatePayment]
  );

  const rejectPayment = useCallback(
    async (payment, notes = '') => {
      const paymentId = Number(payment?.payment_id ?? payment);
      if (!Number.isInteger(paymentId) || paymentId <= 0) {
        throw new Error('Payment data is required for rejection.');
      }

      const payload = {
        status: toDatabaseStatus('REJECTED')
      };

      if (normalizeString(notes)) {
        payload.notes = normalizeString(notes);
      }

      await updatePayment(paymentId, payload);
    },
    [updatePayment]
  );
  

  return {
    loading,
    error,
    actionPaymentId,
    allPayments,
    tenantPayments,
    pendingValidationPayments,
    refreshPayments: fetchPayments,
    updatePayment,
    processPayment,
    approvePayment,
    rejectPayment,
    getTenantLedger,
    getTenantSummary
  };
}
