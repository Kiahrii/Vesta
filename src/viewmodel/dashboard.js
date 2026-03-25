import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../model/supabaseclient.js';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeStatusValue = (status) => normalizeString(status).toUpperCase().replace(/\s+/g, '_');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const PAYMENT_STATUS = {
  PAID: 'PAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  OVERDUE: 'OVERDUE'
};

const REPORT_STATUS = {
  PENDING: 'PENDING'
};

export function useDashboardMetrics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState({
    totalRooms: 0,
    totalTenants: 0,
    totalRent: 0,
    pendingReports: 0,
    totalEarnings: 0,
    paymentOverview: {
      labels: ['Paid', 'Partially Paid', 'Overdue'],
      series: [0, 0, 0]
    }
  });

  const fetchDashboardMetrics = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [roomsResult, tenantsResult, reportsResult, paymentsResult] = await Promise.all([
        supabase.from('rooms').select('room_id, monthly_rent'),
        supabase.from('tenants').select('tenant_id'),
        supabase.from('maintenance_report').select('status'),
        supabase.from('payments').select('status, amount_paid')
      ]);

      if (roomsResult.error) {
        throw new Error(`Failed to load rooms: ${roomsResult.error.message}`);
      }
      if (tenantsResult.error) {
        throw new Error(`Failed to load tenants: ${tenantsResult.error.message}`);
      }
      if (reportsResult.error) {
        throw new Error(`Failed to load maintenance reports: ${reportsResult.error.message}`);
      }
      if (paymentsResult.error) {
        throw new Error(`Failed to load payments: ${paymentsResult.error.message}`);
      }

      const rooms = roomsResult.data ?? [];
      const tenants = tenantsResult.data ?? [];
      const reports = reportsResult.data ?? [];
      const payments = paymentsResult.data ?? [];

      const totalRooms = rooms.length;
      const totalTenants = tenants.length;
      const totalRent = rooms.reduce((sum, room) => sum + toNumber(room.monthly_rent), 0);

      const pendingReports = reports.reduce((count, report) => {
        const statusKey = normalizeStatusValue(report?.status);
        return statusKey === REPORT_STATUS.PENDING ? count + 1 : count;
      }, 0);

      const paymentSummary = {
        paid: 0,
        partiallyPaid: 0,
        overdue: 0
      };

      let totalEarnings = 0;

      payments.forEach((payment) => {
        const statusKey = normalizeStatusValue(payment?.status);
        if (statusKey === PAYMENT_STATUS.PAID) {
          paymentSummary.paid += 1;
          totalEarnings += toNumber(payment?.amount_paid);
        } else if (statusKey === PAYMENT_STATUS.PARTIALLY_PAID) {
          paymentSummary.partiallyPaid += 1;
          totalEarnings += toNumber(payment?.amount_paid);
        } else if (statusKey === PAYMENT_STATUS.OVERDUE) {
          paymentSummary.overdue += 1;
        }
      });

      setMetrics({
        totalRooms,
        totalTenants,
        totalRent,
        pendingReports,
        totalEarnings,
        paymentOverview: {
          labels: ['Paid', 'Partially Paid', 'Overdue'],
          series: [paymentSummary.paid, paymentSummary.partiallyPaid, paymentSummary.overdue]
        }
      });
    } catch (fetchError) {
      setMetrics((current) => ({
        ...current,
        totalRooms: 0,
        totalTenants: 0,
        totalRent: 0,
        pendingReports: 0,
        totalEarnings: 0,
        paymentOverview: {
          labels: current.paymentOverview.labels,
          series: [0, 0, 0]
        }
      }));
      setError(fetchError.message || 'Unable to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [fetchDashboardMetrics]);

  const paymentOverview = useMemo(() => metrics.paymentOverview, [metrics.paymentOverview]);

  return {
    loading,
    error,
    metrics,
    paymentOverview,
    refreshDashboard: fetchDashboardMetrics
  };
}