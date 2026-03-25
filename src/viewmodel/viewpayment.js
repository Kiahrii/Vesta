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

const BILLING_MONTH_NAMES = [
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
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key);
const toNullableNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeStatusValue = (status) => normalizeString(status).toUpperCase().replace(/\s+/g, '_');

export const formatPaymentStatus = (status) => {
  const normalized = normalizeStatusValue(status);
  return STATUS_DISPLAY[normalized] || normalized || 'Unknown';
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

const calculateBalance = (amountDue, amountPaid) => Math.max(toNumber(amountDue) - toNumber(amountPaid), 0);

const normalizeBillingMonthValue = (value) => {
  const numericValue = Number(value);
  if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 12) {
    return BILLING_MONTH_NAMES[numericValue - 1];
  }

  return normalizeString(value).toUpperCase().replace(/\s+/g, '_');
};

const formatBillingMonthValue = (value) => {
  const normalized = normalizeBillingMonthValue(value);
  if (!normalized) {
    return '';
  }

  return normalized
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const buildBillingDatesFromParts = (billingMonth, billingYear) => {
  const normalizedMonth = normalizeBillingMonthValue(billingMonth);
  const yearValue = Number(billingYear);
  const monthIndex = BILLING_MONTH_NAMES.indexOf(normalizedMonth);

  if (monthIndex < 0 || !Number.isInteger(yearValue)) {
    return { start: null, end: null };
  }

  const startDate = new Date(Date.UTC(yearValue, monthIndex, 1));
  const endDate = new Date(Date.UTC(yearValue, monthIndex + 1, 0));

  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10)
  };
};

const buildBillingPeriodLabel = ({ billingMonth, billingYear, billingPeriodStart }) => {
  const monthLabel = formatBillingMonthValue(billingMonth);
  if (monthLabel && billingYear) {
    return `${monthLabel} ${billingYear}`;
  }

  const startDate = parseDate(billingPeriodStart);
  if (!startDate) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric'
  }).format(startDate);
};

const buildTenantName = (tenant, user) => {
  // Check if tenant has a name directly
  const directName = normalizeString(tenant?.tenant_name);
  if (directName) return directName;
  
  // Build name from user's first, middle, last names
  if (user) {
    const firstName = normalizeString(user.first_name);
    const middleName = normalizeString(user.middle_name);
    const lastName = normalizeString(user.last_name);
    
    const nameParts = [];
    if (firstName) nameParts.push(firstName);
    if (middleName) nameParts.push(middleName);
    if (lastName) nameParts.push(lastName);
    
    if (nameParts.length > 0) {
      return nameParts.join(' ');
    }
  }
  
  // Fallback to tenant ID
  return `Tenant #${tenant?.tenant_id ?? 'N/A'}`;
};

const buildRoomNumber = (tenant, room) => {
  if (room?.room_no && normalizeString(room.room_no)) {
    return normalizeString(room.room_no);
  }
  if (tenant?.assigned_room && normalizeString(tenant.assigned_room)) {
    return normalizeString(tenant.assigned_room);
  }
  return '-';
};

const buildTenantCode = (tenantId) => `TN-${String(tenantId ?? '').padStart(3, '0')}`;

const buildBillingTemplateKeys = (payment) => {
  const tenantId = toNullableNumber(payment?.tenant_id);
  if (!tenantId) {
    return [];
  }

  const keys = [];
  const billingId = toNullableNumber(payment?.billing_id);
  const billingMonth = normalizeBillingMonthValue(payment?.billing_month);
  const billingYear = Number(payment?.billing_year);

  if (billingId) {
    keys.push(`billing:${tenantId}:${billingId}`);
  }

  if (billingMonth && Number.isInteger(billingYear)) {
    keys.push(`period:${tenantId}:${billingYear}:${billingMonth}`);
  }

  if (payment?.billing_period_start && payment?.billing_period_end) {
    keys.push(`range:${tenantId}:${payment.billing_period_start}:${payment.billing_period_end}`);
  }

  if (payment?.billing_period_start) {
    keys.push(`start:${tenantId}:${payment.billing_period_start}`);
  }

  return keys;
};

const resolveRawStatus = ({ amountDue, amountPaid, dueDate, sourceStatus }) => {
  const normalizedSource = normalizeStatusValue(sourceStatus);
  if (normalizedSource === 'PENDING' || normalizedSource === 'PENDING_VALIDATION' || normalizedSource === 'REJECTED') {
    return normalizedSource;
  }

  const balance = calculateBalance(amountDue, amountPaid);
  if (balance <= 0 && toNumber(amountDue) > 0) return 'Paid';
  if (toNumber(amountPaid) > 0) return 'Partially Paid';
  if (dueDate && new Date(dueDate) < new Date() && balance > 0) return 'Overdue';
  return 'Billing';
};

const getApprovedDatabaseStatus = (balance) => (balance <= 0 ? 'Paid' : 'Partially Paid');

const getPaymentSortTime = (payment) =>
  parseDate(payment?.paid_date ?? payment?.payment_date ?? payment?.created_at ?? payment?.billing_period_end ?? payment?.billing_period_start)
    ?.getTime() ?? 0;

const getLedgerSortTime = (payment) =>
  parseDate(payment?.billing_period_start ?? payment?.billing_period_end ?? payment?.paid_date ?? payment?.payment_date ?? payment?.created_at)
    ?.getTime() ?? 0;

const getMonthYearFromDate = (value) => {
  const date = parseDate(value);
  if (!date) {
    return { billingMonth: '', billingYear: null };
  }

  return {
    billingMonth: BILLING_MONTH_NAMES[date.getMonth()] || '',
    billingYear: date.getFullYear()
  };
};

const buildLedgerGroupKey = (payment) => {
  const tenantId = toNullableNumber(payment?.tenant_id);
  const tenantKey = tenantId ? `tenant:${tenantId}|` : '';
  const billingMonth = normalizeBillingMonthValue(payment?.billing_month_normalized || payment?.billing_month);
  if (payment?.billing_id) {
    return `${tenantKey}billing:${payment.billing_id}`;
  }

  const derivedBillingPeriod = getMonthYearFromDate(
    payment?.billing_period_start ?? payment?.billing_period_end ?? payment?.paid_date ?? payment?.payment_date ?? payment?.created_at
  );
  const effectiveBillingMonth = billingMonth || derivedBillingPeriod.billingMonth;
  const effectiveBillingYear = payment?.billing_year ?? derivedBillingPeriod.billingYear;

  if (effectiveBillingMonth && effectiveBillingYear) {
    return `${tenantKey}period:${effectiveBillingYear}:${effectiveBillingMonth}`;
  }

  if (payment?.billing_period_start && payment?.billing_period_end) {
    return `${tenantKey}range:${payment.billing_period_start}:${payment.billing_period_end}`;
  }

  if (payment?.billing_period_start) {
    return `${tenantKey}start:${payment.billing_period_start}`;
  }

  return `${tenantKey}payment:${payment?.payment_id ?? 'unknown'}`;
};

const isTransactionRow = (payment) => {
  const status = normalizeStatusValue(payment?.status_normalized || payment?.status);

  return (
    toNumber(payment?.amount_paid) > 0 &&
    (
      Boolean(normalizeString(payment?.payment_method)) ||
      Boolean(normalizeString(payment?.receipt_proof)) ||
      Boolean(normalizeString(payment?.reference_no)) ||
      Boolean(parseDate(payment?.paid_date ?? payment?.payment_date)) ||
      status === 'PENDING' ||
      status === 'PENDING_VALIDATION' ||
      status === 'REJECTED'
    )
  );
};

const resolvePaymentAmountDue = (payment) => {
  const billingDue = toNumber(payment?.billing_ledger?.amount_due);
  if (billingDue > 0) {
    return billingDue;
  }

  const rowDue = toNumber(payment?.amount_due);
  if (!isTransactionRow(payment) && rowDue > 0) {
    return rowDue;
  }

  const roomDue = toNumber(payment?.room?.monthly_rent);
  if (roomDue > 0) {
    return roomDue;
  }

  return rowDue;
};

const buildLedgerEntry = (payments) => {
  const sortedPayments = [...payments].sort((a, b) => getPaymentSortTime(b) - getPaymentSortTime(a));
  const latestPayment = sortedPayments[0] ?? null;
  const latestTransaction = sortedPayments.find((payment) => isTransactionRow(payment)) ?? latestPayment;
  const totalDue = payments.reduce((highest, payment) => Math.max(highest, resolvePaymentAmountDue(payment)), 0);
  const transactionRows = payments.filter((payment) => isTransactionRow(payment));
  const totalPaid =
    transactionRows.length > 0
      ? transactionRows.reduce((sum, payment) => sum + toNumber(payment.amount_paid), 0)
      : payments.reduce((highest, payment) => Math.max(highest, toNumber(payment.amount_paid)), 0);
  const balance = calculateBalance(totalDue, totalPaid);
  const statusSource = latestTransaction ?? latestPayment;
  const statusNormalized = resolveRawStatus({
    amountDue: totalDue,
    amountPaid: totalPaid,
    dueDate: parseDate(latestPayment?.billing_period_end ?? latestTransaction?.billing_period_end),
    sourceStatus: statusSource?.status || latestPayment?.status
  });

  return {
    ...latestPayment,
    amount_due: totalDue,
    amount_paid: totalPaid,
    balance,
    payment_method: latestTransaction?.payment_method || latestPayment?.payment_method || null,
    receipt_proof: latestTransaction?.receipt_proof || latestPayment?.receipt_proof || null,
    notes: latestTransaction?.notes || latestPayment?.notes || null,
    payment_date: latestTransaction?.payment_date || latestPayment?.payment_date || null,
    paid_date: latestTransaction?.paid_date || latestPayment?.paid_date || null,
    reference_no: latestTransaction?.reference_no || latestPayment?.reference_no || null,
    status: statusSource?.status || latestPayment?.status || '',
    status_normalized: statusNormalized,
    display_status: formatPaymentStatus(statusNormalized)
  };
};

const buildLedgerEntries = (payments) => {
  const ledgerGroups = payments.reduce((groups, payment) => {
    const groupKey = buildLedgerGroupKey(payment);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }

    groups.get(groupKey).push(payment);
    return groups;
  }, new Map());

  return [...ledgerGroups.values()]
    .map((groupedPayments) => buildLedgerEntry(groupedPayments))
    .sort((a, b) => getLedgerSortTime(b) - getLedgerSortTime(a));
};

export function usePayments() {
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionPaymentId, setActionPaymentId] = useState(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data: paymentRows, error: paymentError } = await supabase.from('payments').select('*').order('payment_id', { ascending: false });

      if (paymentError) throw new Error(paymentError.message);

      const tenantIds = [...new Set((paymentRows || []).map((payment) => payment?.tenant_id).filter(Boolean))];
      const billingIds = [...new Set((paymentRows || []).map((payment) => payment?.billing_id).filter(Boolean))];

      let tenantRows = [];
      if (tenantIds.length > 0) {
        const { data: tenantsData, error: tenantsError } = await supabase.from('tenants').select('*').in('tenant_id', tenantIds);
        if (tenantsError) {
          throw new Error(`Failed to load tenants: ${tenantsError.message}`);
        }
        tenantRows = tenantsData || [];
      }

      const userIds = [...new Set(tenantRows.map((tenant) => tenant?.user_id).filter(Boolean))];
      const roomIds = [...new Set(tenantRows.map((tenant) => tenant?.room_id).filter(Boolean))];

      const [usersResult, roomsResult] = await Promise.all([
        userIds.length > 0 ? supabase.from('users').select('user_id, first_name, middle_name, last_name').in('user_id', userIds) : Promise.resolve({ data: [], error: null }),
        roomIds.length > 0 ? supabase.from('rooms').select('room_id, room_no, monthly_rent').in('room_id', roomIds) : Promise.resolve({ data: [], error: null })
      ]);

      if (usersResult.error) {
        throw new Error(`Failed to load users: ${usersResult.error.message}`);
      }

      if (roomsResult.error) {
        throw new Error(`Failed to load rooms: ${roomsResult.error.message}`);
      }

      let billingRows = [];
      if (billingIds.length > 0) {
        const { data: billingData, error: billingError } = await supabase.from('billing_ledger').select('*').in('billing_id', billingIds);
        if (billingError) {
          console.warn('Unable to load billing ledger rows for payments:', billingError.message);
        } else {
          billingRows = billingData || [];
        }
      }

      const tenantMap = new Map(tenantRows.map((tenant) => [tenant.tenant_id, tenant]));
      const userMap = new Map((usersResult.data || []).map((user) => [user.user_id, user]));
      const roomMap = new Map((roomsResult.data || []).map((room) => [room.room_id, room]));
      const billingMap = new Map(billingRows.map((billing) => [billing.billing_id, billing]));
      const billingTemplateMap = (paymentRows || []).reduce((map, payment) => {
        if (normalizeStatusValue(payment?.status) !== 'BILLING') {
          return map;
        }

        buildBillingTemplateKeys(payment).forEach((key) => {
          if (!map.has(key)) {
            map.set(key, payment);
          }
        });

        return map;
      }, new Map());

      const transformedPayments = (paymentRows || []).map((payment) => {
        const tenant = tenantMap.get(payment?.tenant_id) ?? null;
        const user = tenant?.user_id ? userMap.get(tenant.user_id) ?? null : null;
        const room = tenant?.room_id ? roomMap.get(tenant.room_id) ?? null : null;
        const billing = payment?.billing_id ? billingMap.get(payment.billing_id) ?? null : null;
        const billingTemplate =
          buildBillingTemplateKeys(payment).reduce((foundTemplate, key) => foundTemplate ?? billingTemplateMap.get(key) ?? null, null);

        const billingMonthRaw = payment?.billing_month ?? billingTemplate?.billing_month ?? billing?.billing_month ?? null;
        const billingYear = payment?.billing_year ?? billingTemplate?.billing_year ?? billing?.billing_year ?? null;
        const derivedBillingDates = buildBillingDatesFromParts(billingMonthRaw, billingYear);
        const billingPeriodStart = payment?.billing_period_start ?? billingTemplate?.billing_period_start ?? derivedBillingDates.start;
        const billingPeriodEnd = payment?.billing_period_end ?? billingTemplate?.billing_period_end ?? billing?.due_date ?? derivedBillingDates.end;
        const paymentDate = payment?.paid_date ?? payment?.payment_date ?? payment?.created_at ?? null;
        const amountDue = resolvePaymentAmountDue({
          ...payment,
          billing_ledger: billing,
          room
        });
        const amountPaid = toNumber(payment?.amount_paid ?? billing?.amount_paid);
        const balance = calculateBalance(amountDue, amountPaid);
        const dueDate = parseDate(billingPeriodEnd);
        const rawStatus = payment?.status ?? billing?.status ?? '';
        const statusNormalized = resolveRawStatus({
          amountDue,
          amountPaid,
          dueDate,
          sourceStatus: rawStatus
        });
        const tenantId = toNullableNumber(payment?.tenant_id ?? tenant?.tenant_id);
        const billingMonthLabel = formatBillingMonthValue(billingMonthRaw);

        return {
          ...payment,
          tenant: tenant ? { ...tenant, user, room } : null,
          user,
          room,
          billing_ledger: billing,
          payment_id: payment.payment_id,
          billing_id: payment?.billing_id ?? billing?.billing_id ?? null,
          tenant_id: tenantId,
          tenant_name: buildTenantName(tenant, user),
          tenant_code: buildTenantCode(tenantId),
          room_no: buildRoomNumber(tenant, room),
          amount_due: amountDue,
          amount_paid: amountPaid,
          balance,
          status: rawStatus,
          status_normalized: statusNormalized,
          display_status: formatPaymentStatus(statusNormalized),
          payment_method: payment.payment_method,
          receipt_proof: payment.receipt_proof,
          notes: payment.notes,
          payment_date: paymentDate,
          paid_date: paymentDate,
          billing_period_start: billingPeriodStart,
          billing_period_end: billingPeriodEnd,
          billing_month: billingMonthLabel || payment?.billing_month || billingMonthRaw,
          billing_month_normalized: normalizeBillingMonthValue(billingMonthRaw),
          billing_year: billingYear,
          billing_period: buildBillingPeriodLabel({
            billingMonth: billingMonthRaw,
            billingYear,
            billingPeriodStart
          }),
          reference_no: payment.reference_no,
          source_date_column: hasOwn(payment, 'paid_date') ? 'paid_date' : hasOwn(payment, 'payment_date') ? 'payment_date' : null,
          source_has_balance_field: hasOwn(payment, 'balance'),
          source_has_notes_field: hasOwn(payment, 'notes')
        };
      });

      setAllPayments(transformedPayments);
      return transformedPayments;
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err.message || 'Failed to load payments');
      setAllPayments([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const tenantPayments = useMemo(() => {
    return buildLedgerEntries(allPayments);
  }, [allPayments]);

  const pendingValidationPayments = useMemo(() => {
    return allPayments
      .filter((payment) => {
        const status = normalizeStatusValue(payment?.status_normalized || payment?.status);
        return status === 'PENDING' || status === 'PENDING_VALIDATION';
      })
      .map((payment) => {
        const amountDue = toNumber(payment?.amount_due);
        const amountPaid = toNumber(payment?.amount_paid);
        const balance = calculateBalance(amountDue, amountPaid);
        const statusNormalized = resolveRawStatus({
          amountDue,
          amountPaid,
          dueDate: parseDate(payment?.billing_period_end),
          sourceStatus: payment?.status
        });

        return {
          ...payment,
          amount_due: amountDue,
          balance,
          status_normalized: statusNormalized,
          display_status: formatPaymentStatus(statusNormalized)
        };
      });
  }, [allPayments]);

  const getTenantLedger = useCallback((tenantId) => {
    return allPayments
      .filter((payment) => Number(payment.tenant_id) === Number(tenantId))
      .sort((a, b) => getLedgerSortTime(b) - getLedgerSortTime(a));
  }, [allPayments]);

  const getTenantSummary = useCallback((tenantId) => {
    const tenantHistory = allPayments
      .filter((payment) => Number(payment.tenant_id) === Number(tenantId))
      .sort((a, b) => getLedgerSortTime(b) - getLedgerSortTime(a));
    const ledger = buildLedgerEntries(tenantHistory);

    if (ledger.length === 0) {
      return { totalDue: 0, totalPaid: 0, outstandingBalance: 0 };
    }
    
    const totalDue = ledger.reduce((sum, p) => sum + toNumber(p.amount_due), 0);
    const totalPaid = ledger.reduce((sum, p) => sum + toNumber(p.amount_paid), 0);
    const outstandingBalance = calculateBalance(totalDue, totalPaid);
    
    return { totalDue, totalPaid, outstandingBalance };
  }, [allPayments]);

  const approvePayment = useCallback(async (payment) => {
    const paymentId = Number(payment?.payment_id);
    if (!paymentId) throw new Error('Invalid payment');
    
    setActionPaymentId(paymentId);
    
    try {
      const amountDue = toNumber(payment.amount_due);
      const amountPaid = toNumber(payment.amount_paid);
      const balance = calculateBalance(amountDue, amountPaid);
      const status = getApprovedDatabaseStatus(balance);
      const paidDate = new Date().toISOString();
      const updateData = {
        status
      };

      if (payment?.source_has_balance_field) {
        updateData.balance = balance;
      }

      if (payment?.source_date_column) {
        updateData[payment.source_date_column] = paidDate;
      }
      
      const { error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('payment_id', paymentId);
      
      if (updateError) throw new Error(updateError.message);

      const billingId = Number(payment?.billing_id);
      if (billingId) {
        const { data: billingRow, error: billingFetchError } = await supabase
          .from('billing_ledger')
          .select('billing_id, amount_due')
          .eq('billing_id', billingId)
          .maybeSingle();

        if (billingFetchError) {
          throw new Error(billingFetchError.message);
        }

        if (billingRow) {
          const { data: billingPayments, error: billingPaymentsError } = await supabase
            .from('payments')
            .select('amount_paid, status')
            .eq('billing_id', billingId);

          if (billingPaymentsError) {
            throw new Error(billingPaymentsError.message);
          }

          const nextLedgerPaid = (billingPayments || []).reduce((sum, billingPayment) => {
            const paymentStatus = normalizeStatusValue(billingPayment?.status);
            if (paymentStatus === 'PENDING' || paymentStatus === 'PENDING_VALIDATION' || paymentStatus === 'REJECTED') {
              return sum;
            }

            return sum + toNumber(billingPayment?.amount_paid);
          }, 0);
          const nextLedgerDue = toNumber(billingRow.amount_due);
          const nextLedgerBalance = calculateBalance(nextLedgerDue, nextLedgerPaid);

          const { error: billingUpdateError } = await supabase
            .from('billing_ledger')
            .update({
              amount_paid: nextLedgerPaid,
              balance: nextLedgerBalance
            })
            .eq('billing_id', billingId);

          if (billingUpdateError) {
            throw new Error(billingUpdateError.message);
          }
        }
      }
      
      await fetchPayments();
      return { createdNextBilling: false };
    } catch (err) {
      throw new Error(err.message || 'Failed to approve payment');
    } finally {
      setActionPaymentId(null);
    }
  }, [fetchPayments]);

  const rejectPayment = useCallback(async (payment, notes = '') => {
    const paymentId = Number(payment?.payment_id);
    if (!paymentId) throw new Error('Invalid payment');
    
    setActionPaymentId(paymentId);
    
    try {
      const updateData = {
        status: 'REJECTED'
      };

      if (payment?.source_has_notes_field) {
        updateData.notes = notes || null;
      }

      const { error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('payment_id', paymentId);
      
      if (updateError) throw new Error(updateError.message);
      await fetchPayments();
    } catch (err) {
      throw new Error(err.message || 'Failed to reject payment');
    } finally {
      setActionPaymentId(null);
    }
  }, [fetchPayments]);

  return {
    loading,
    error,
    actionPaymentId,
    rawAllPayments: allPayments,
    tenantPayments,
    pendingValidationPayments,
    approvePayment,
    rejectPayment,
    getTenantLedger,
    getTenantSummary,
    refreshPayments: fetchPayments
  };
}
