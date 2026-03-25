import { supabaseRead } from '../model/supabaseclient.js';
import { useSupabaseQuery } from 'viewmodel/useSupabaseQuery.js';

const MAINTENANCE_REPORT_TABLE = 'maintenance_report';

export const MAINTENANCE_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled'
};

const STATUS_VALUES = new Set(Object.values(MAINTENANCE_STATUS));

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const toDisplayName = (userRecord, tenantId) => {
  if (!userRecord) {
    return `Tenant #${tenantId}`;
  }

  const firstName = normalizeString(userRecord.first_name);
  const middleName = normalizeString(userRecord.middle_name);
  const lastName = normalizeString(userRecord.last_name);

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
  return fullName || `Tenant #${tenantId}`;
};

const toIssueLabel = (issueRecord, issueId) => {
  if (!issueRecord) {
    return `Issue #${issueId}`;
  }

  return (
    normalizeString(issueRecord.issue_name) ||
    normalizeString(issueRecord.issue_type) ||
    normalizeString(issueRecord.issue) ||
    normalizeString(issueRecord.category) ||
    `Issue #${issueId}`
  );
};

const toRoomLabel = (tenantRecord, roomRecord) => {
  const roomNo = normalizeString(roomRecord?.room_no);
  if (roomNo) {
    return roomNo;
  }

  const assignedRoom = normalizeString(tenantRecord?.assigned_room);
  if (assignedRoom) {
    return assignedRoom;
  }

  if (tenantRecord?.room_id) {
    return `Room #${tenantRecord.room_id}`;
  }

  return '-';
};

const pickJoinedRow = (value) => (Array.isArray(value) ? value[0] ?? null : value ?? null);

export async function getMaintenanceReports() {
  const { data: reportRows, error: reportError } = await supabaseRead
    .from(MAINTENANCE_REPORT_TABLE)
    .select(
      `
      report_id,
      tenant_id,
      issue_id,
      description,
      photo,
      status,
      created_at,
      resolved_at,
      tenants (
        tenant_id,
        user_id,
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
          room_no
        )
      ),
      issues (
        issue_id,
        issue_name
      )
    `
    )
    .order('created_at', { ascending: false });

  if (reportError) {
    throw new Error(`Failed to load maintenance reports: ${reportError.message}`);
  }

  const reports = reportRows || [];
  if (reports.length === 0) {
    return [];
  }

  const mappedReports = reports.map((report) => {
    const tenantRecord = pickJoinedRow(report.tenants);
    const userRecord = pickJoinedRow(tenantRecord?.users);
    const roomRecord = pickJoinedRow(tenantRecord?.rooms);
    const issueRecord = pickJoinedRow(report.issues);

    return {
      report_id: report.report_id,
      tenant_id: report.tenant_id,
      issue_id: report.issue_id,
      description: report.description,
      photo: report.photo,
      status: report.status,
      created_at: report.created_at,
      resolved_at: report.resolved_at, // Add this line
      tenant_name: toDisplayName(userRecord, report.tenant_id),
      room: toRoomLabel(tenantRecord, roomRecord),
      issue: toIssueLabel(issueRecord, report.issue_id)
    };
  });

  return mappedReports;
}

export function useMaintenanceReports() {
  return useSupabaseQuery(getMaintenanceReports, {
    initialData: [],
    deps: [],
    errorMessage: 'Failed to load maintenance reports.'
  });
}

export async function updateMaintenanceReportStatus(reportId, status) {
  const parsedReportId = Number(reportId);
  if (!Number.isInteger(parsedReportId) || parsedReportId <= 0) {
    throw new Error('Invalid maintenance report id.');
  }

  const normalizedStatus = normalizeString(status);
  if (!STATUS_VALUES.has(normalizedStatus)) {
    throw new Error('Invalid status value.');
  }

  // Prepare update data
  const updateData = { status: normalizedStatus };
  
  // If status is RESOLVED, set resolved_at to current timestamp
  if (normalizedStatus === MAINTENANCE_STATUS.RESOLVED) {
    updateData.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabaseRead
    .from(MAINTENANCE_REPORT_TABLE)
    .update(updateData)
    .eq('report_id', parsedReportId)
    .select('report_id, status, resolved_at')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update maintenance status: ${error.message}`);
  }

  return data;
}
