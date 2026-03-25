import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../model/supabaseclient.js';
import { getMaintenanceReports } from './maintenance-report.js';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getDateGroup = (date) => {
  if (!date) {
    return 'Unknown';
  }

  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((today - target) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

const formatRelativeTime = (date) => {
  if (!date) {
    return '';
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second');
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
};

const truncateText = (value, limit = 120) => {
  const text = normalizeString(value);
  if (!text) {
    return '';
  }
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit).trim()}...`;
};

const formatMoney = (value) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(toNumber(value));

const normalizeStatusValue = (status) => normalizeString(status).toUpperCase().replace(/\s+/g, '_');
const normalizeNotificationType = (value) => normalizeString(value).toLowerCase();
const buildNotificationKey = (type, referenceId) => `${normalizeNotificationType(type)}:${toNumber(referenceId)}`;

const PAYMENT_STATUSES = new Set(['PENDING', 'PENDING_VALIDATION']);
const REPORT_PENDING_STATUS = 'PENDING';

const toTenantName = (tenant, user) => {
  const directName = normalizeString(tenant?.tenant_name);
  if (directName) {
    return directName;
  }

  const userName = [normalizeString(user?.first_name), normalizeString(user?.middle_name), normalizeString(user?.last_name)]
    .filter(Boolean)
    .join(' ');
  if (userName) {
    return userName;
  }

  const tenantName = [normalizeString(tenant?.first_name), normalizeString(tenant?.middle_name), normalizeString(tenant?.last_name)]
    .filter(Boolean)
    .join(' ');

  return tenantName || `Tenant #${tenant?.tenant_id ?? 'N/A'}`;
};

const toRoomLabel = (tenant, room) =>
  normalizeString(room?.room_no) || normalizeString(tenant?.assigned_room) || (tenant?.room_id ? `Room #${tenant.room_id}` : '');

const buildPaymentDescription = ({ tenantName, roomLabel, amountPaid, billingMonth, status }) => {
  const pieces = [];

  if (tenantName) {
    pieces.push(tenantName);
  }
  if (roomLabel) {
    pieces.push(`(${roomLabel})`);
  }

  const statusLabel = normalizeStatusValue(status).replace(/_/g, ' ').toLowerCase();
  const statusText = statusLabel ? `submitted a ${statusLabel} payment` : 'submitted a payment';

  const paymentLabel = billingMonth ? `for ${billingMonth}` : '';
  const amountLabel = amountPaid ? `of ${formatMoney(amountPaid)}` : '';

  return truncateText([pieces.join(' '), statusText, amountLabel, paymentLabel].filter(Boolean).join(' '));
};

export function useNotifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [maintenanceRows, paymentsResult, notificationsResult] = await Promise.all([
        getMaintenanceReports(),
        supabase
          .from('payments')
          .select('payment_id, tenant_id, amount_paid, billing_month, status, payment_date')
          .order('payment_id', { ascending: false }),
        supabase
          .from('notifications')
          .select('notification_id, tenant_id, title, message, type, reference_id, is_read, created_at')
          .order('created_at', { ascending: false })
      ]);

      if (paymentsResult.error) {
        throw new Error(`Failed to load payments: ${paymentsResult.error.message}`);
      }

      if (notificationsResult.error) {
        throw new Error(`Failed to load notifications: ${notificationsResult.error.message}`);
      }

      const payments = paymentsResult.data ?? [];
      const notificationRows = notificationsResult.data ?? [];
      const notificationMap = new Map(
        notificationRows.map((notification) => [
          buildNotificationKey(notification.type, notification.reference_id),
          notification
        ])
      );
      const reportTenantIds = [...new Set((maintenanceRows ?? []).map((report) => report.tenant_id).filter(Boolean))];
      const paymentTenantIds = [...new Set(payments.map((row) => row.tenant_id).filter(Boolean))];
      const tenantIds = [...new Set([...paymentTenantIds, ...reportTenantIds])];

      let tenantRows = [];
      let userRows = [];
      let roomRows = [];

      if (tenantIds.length > 0) {
        const { data: tenantsData, error: tenantsError } = await supabase.from('tenants').select('*').in('tenant_id', tenantIds);
        if (tenantsError) {
          throw new Error(`Failed to load tenant information: ${tenantsError.message}`);
        }
        tenantRows = tenantsData ?? [];

        const userIds = [...new Set(tenantRows.map((tenant) => tenant.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: usersData } = await supabase.from('users').select('*').in('user_id', userIds);
          userRows = usersData ?? [];
        }

        const roomIds = [...new Set(tenantRows.map((tenant) => tenant.room_id).filter(Boolean))];
        if (roomIds.length > 0) {
          const { data: roomsData } = await supabase.from('rooms').select('*').in('room_id', roomIds);
          roomRows = roomsData ?? [];
        }
      }

      const tenantMap = new Map(tenantRows.map((tenant) => [tenant.tenant_id, tenant]));
      const userMap = new Map(userRows.map((user) => [user.user_id, user]));
      const roomMap = new Map(roomRows.map((room) => [room.room_id, room]));

      const paymentNotifications = payments
        .filter((payment) => PAYMENT_STATUSES.has(normalizeStatusValue(payment.status)))
        .map((payment) => {
          const tenant = tenantMap.get(payment.tenant_id) ?? null;
          const user = tenant?.user_id ? userMap.get(tenant.user_id) ?? null : null;
          const room = tenant?.room_id ? roomMap.get(tenant.room_id) ?? null : null;

          const paymentDate = parseDate(payment.payment_date);
          const notificationMeta = notificationMap.get(buildNotificationKey('payment', payment.payment_id)) ?? null;
          const createdAt = parseDate(notificationMeta?.created_at) || paymentDate;
          const tenantName = toTenantName(tenant, user);
          const roomLabel = toRoomLabel(tenant, room);
          const description =
            normalizeString(notificationMeta?.message) ||
            buildPaymentDescription({
              tenantName,
              roomLabel,
              amountPaid: payment.amount_paid,
              billingMonth: normalizeString(payment.billing_month).replace(/_/g, ' '),
              status: payment.status
            });

          return {
            id: notificationMeta?.notification_id ? `notification-${notificationMeta.notification_id}` : `payment-${payment.payment_id}`,
            notification_id: notificationMeta?.notification_id ?? null,
            tenant_id: notificationMeta?.tenant_id ?? payment.tenant_id ?? null,
            reference_id: payment.payment_id,
            is_read: Boolean(notificationMeta?.is_read),
            type: 'payment',
            avatar: normalizeString(tenant?.profile_photo) || '',
            createdAt,
            date: getDateGroup(createdAt),
            time: formatRelativeTime(createdAt),
            title: normalizeString(notificationMeta?.title) || 'Pending Payment',
            description
          };
        });

      const reportNotifications = (maintenanceRows ?? [])
        .filter((report) => normalizeStatusValue(report.status) === REPORT_PENDING_STATUS)
        .map((report) => {
          const tenant = report?.tenant_id ? tenantMap.get(report.tenant_id) ?? null : null;
          const notificationMeta = notificationMap.get(buildNotificationKey('report', report.report_id)) ?? null;
          const createdAt = parseDate(notificationMeta?.created_at) || parseDate(report.created_at);
          const title = normalizeString(notificationMeta?.title) || 'Maintenance Report';
          const issue = normalizeString(report.issue) || 'an issue';
          const description =
            normalizeString(notificationMeta?.message) ||
            truncateText(`${report.tenant_name || 'A tenant'} reported ${issue}. ${normalizeString(report.description)}`);

          return {
            id: notificationMeta?.notification_id ? `notification-${notificationMeta.notification_id}` : `report-${report.report_id}`,
            notification_id: notificationMeta?.notification_id ?? null,
            tenant_id: notificationMeta?.tenant_id ?? report.tenant_id ?? null,
            reference_id: report.report_id,
            is_read: Boolean(notificationMeta?.is_read),
            type: 'report',
            avatar: normalizeString(tenant?.profile_photo) || '',
            createdAt,
            date: getDateGroup(createdAt),
            time: formatRelativeTime(createdAt),
            title,
            description
          };
        });

      const merged = [...paymentNotifications, ...reportNotifications]
        .filter((notification) => notification.createdAt)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setNotifications(merged);
    } catch (fetchError) {
      setNotifications([]);
      setError(fetchError.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markNotificationReadLocal = useCallback((notificationId) => {
    const parsedId = Number(notificationId);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return;
    }

    setNotifications((previous) =>
      previous.map((notification) => {
        const currentId = Number(notification.notification_id);
        if (Number.isFinite(currentId) && currentId === parsedId) {
          return { ...notification, is_read: true };
        }
        return notification;
      })
    );
  }, []);

  const markAllReadLocal = useCallback((tenantId = null) => {
    const parsedTenantId = tenantId ? Number(tenantId) : null;
    setNotifications((previous) =>
      previous.map((notification) => {
        if (notification.is_read) {
          return notification;
        }

        const currentTenantId = Number(notification.tenant_id);
        if (parsedTenantId && (!Number.isFinite(currentTenantId) || currentTenantId !== parsedTenantId)) {
          return notification;
        }

        return { ...notification, is_read: true };
      })
    );
  }, []);

  const groupedNotifications = useMemo(() => notifications, [notifications]);

  return {
    loading,
    error,
    notifications: groupedNotifications,
    refreshNotifications: fetchNotifications,
    markNotificationReadLocal,
    markAllReadLocal
  };
}
