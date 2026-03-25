import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const TENANTS_TABLE = 'tenants';
const USERS_TABLE = 'users';

const supabaseAdminRead = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const toFieldValue = (value) => (value === null || value === undefined ? '' : String(value));

const formatDisplayDate = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'N/A';
  }

  return dateFormatter.format(parsedDate);
};

const formatLeaseDate = (value) => {
  if (!value) {
    return 'Not set';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not set';
  }

  return dateFormatter.format(parsedDate);
};

const toDateInputValue = (value) => {
  const normalized = normalizeString(value) || toFieldValue(value);
  if (!normalized) {
    return '';
  }

  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toISOString().slice(0, 10);
};

const normalizeDateValue = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsedDate = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return normalized;
};

const buildName = (firstName, lastName) =>
  [normalizeString(firstName), normalizeString(lastName)].filter(Boolean).join(' ').trim();

const splitName = (fullName) => {
  const normalized = normalizeString(fullName);
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
};

const buildTenantRow = (tenant, user) => {
  const firstName = normalizeString(user?.first_name);
  const lastName = normalizeString(user?.last_name);
  const fullName = buildName(firstName, lastName);
  const statusValue = tenant.status || (tenant.move_out_date ? 'Moved-out' : 'Active');
  const normalizedStatus = `${statusValue}`.toLowerCase();

  return {
    id: tenant.tenant_id,
    userId: tenant.user_id ?? null,
    name: fullName || `Tenant #${tenant.tenant_id}`,
    room: tenant.assigned_room || 'N/A',
    contact: tenant.contact_no || 'N/A',
    moveIn: formatDisplayDate(tenant.move_in_date),
    leaseStart: formatLeaseDate(tenant.lease_start),
    leaseEnd: formatLeaseDate(tenant.lease_end),
    moveOut: tenant.move_out_date ? formatDisplayDate(tenant.move_out_date) : 'N/A',
    emergencyContact: tenant.emergency_contact || 'N/A',
    emergencyNo: tenant.emergency_contact_no || 'N/A',
    profilePhoto: tenant.profile_photo || '',
    status: normalizedStatus.includes('active') ? 'Active' : 'Moved-out',
    firstName,
    lastName,
    roomRaw: tenant.assigned_room ?? '',
    contactRaw: toFieldValue(tenant.contact_no),
    moveInRaw: tenant.move_in_date ?? '',
    moveOutRaw: tenant.move_out_date ?? '',
    emergencyContactRaw: tenant.emergency_contact ?? '',
    emergencyNoRaw: toFieldValue(tenant.emergency_contact_no)
  };
};

const createEmptyForm = () => ({
  name: '',
  room: '',
  contact: '',
  moveInDate: '',
  moveOutDate: '',
  emergencyContact: '',
  emergencyContactNo: ''
});

export function useTenantManagement() {
  const [tenantDetails, setTenantDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [editForm, setEditForm] = useState(createEmptyForm());
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((setter) => {
    if (isMountedRef.current) {
      setter();
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    safeSetState(() => {
      setIsLoading(true);
      setFetchError('');
    });

    try {
      const { data: tenantData, error: tenantError } = await supabaseAdminRead
        .from(TENANTS_TABLE)
        .select(
          'tenant_id, user_id, assigned_room, contact_no, move_in_date, lease_start, lease_end, move_out_date, emergency_contact, emergency_contact_no, profile_photo, status'
        )
        .order('tenant_id', { ascending: true });

      if (tenantError) {
        throw new Error(tenantError.message);
      }

      if (!tenantData?.length) {
        safeSetState(() => setTenantDetails([]));
        return;
      }

      const tenantUserIds = [...new Set(tenantData.map((tenant) => tenant.user_id).filter(Boolean))];
      let usersData = [];

      if (tenantUserIds.length > 0) {
        const { data: fetchedUsers, error: usersError } = await supabaseAdminRead
          .from(USERS_TABLE)
          .select('user_id, first_name, last_name')
          .in('user_id', tenantUserIds);

        if (usersError) {
          throw new Error(usersError.message);
        }

        usersData = fetchedUsers ?? [];
      }

      const userById = new Map((usersData ?? []).map((tenantUser) => [tenantUser.user_id, tenantUser]));

      const normalizedTenantDetails = tenantData.map((tenant) => {
        const tenantUser = tenant.user_id ? userById.get(tenant.user_id) : null;
        return buildTenantRow(tenant, tenantUser);
      });

      safeSetState(() => setTenantDetails(normalizedTenantDetails));
    } catch (error) {
      safeSetState(() => {
        setFetchError(error.message || 'Failed to load tenant details.');
        setTenantDetails([]);
      });
    } finally {
      safeSetState(() => setIsLoading(false));
    }
  }, [safeSetState]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const openEditModal = useCallback((tenant) => {
    if (!tenant) {
      return;
    }

    const fullName = buildName(tenant.firstName, tenant.lastName);

    setSelectedTenant(tenant);
    setEditForm({
      name: fullName,
      room: toFieldValue(tenant.roomRaw),
      contact: toFieldValue(tenant.contactRaw),
      moveInDate: toDateInputValue(tenant.moveInRaw),
      moveOutDate: toDateInputValue(tenant.moveOutRaw),
      emergencyContact: toFieldValue(tenant.emergencyContactRaw),
      emergencyContactNo: toFieldValue(tenant.emergencyNoRaw)
    });
    setFormError('');
    setIsEditOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditOpen(false);
    setSelectedTenant(null);
    setEditForm(createEmptyForm());
    setFormError('');
  }, []);

  const updateEditField = useCallback((field, value) => {
    setEditForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }, []);

  const saveEdit = useCallback(async () => {
    if (!selectedTenant) {
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const tenantPayload = {
        assigned_room: normalizeString(editForm.room) || null,
        contact_no: normalizeString(editForm.contact) || null,
        move_in_date: normalizeDateValue(editForm.moveInDate),
        move_out_date: normalizeDateValue(editForm.moveOutDate),
        emergency_contact: normalizeString(editForm.emergencyContact) || null,
        emergency_contact_no: normalizeString(editForm.emergencyContactNo) || null
      };

      const { error: tenantUpdateError } = await supabaseAdminRead
        .from(TENANTS_TABLE)
        .update(tenantPayload)
        .eq('tenant_id', selectedTenant.id);

      if (tenantUpdateError) {
        throw new Error(`Failed to update tenant: ${tenantUpdateError.message}`);
      }

      const normalizedName = normalizeString(editForm.name);
      if (selectedTenant.userId && normalizedName) {
        const { firstName, lastName } = splitName(normalizedName);
        const { error: userError } = await supabaseAdminRead
          .from(USERS_TABLE)
          .update({ first_name: firstName, last_name: lastName })
          .eq('user_id', selectedTenant.userId);

        if (userError) {
          throw new Error(`Failed to update tenant name: ${userError.message}`);
        }
      }

      await fetchTenants();
      closeEditModal();
    } catch (error) {
      setFormError(error.message || 'Failed to update tenant.');
    } finally {
      setIsSaving(false);
    }
  }, [closeEditModal, editForm, fetchTenants, selectedTenant]);

  return {
    tenantDetails,
    isLoading,
    fetchError,
    isEditOpen,
    selectedTenant,
    editForm,
    formError,
    isSaving,
    openEditModal,
    closeEditModal,
    updateEditField,
    saveEdit,
    refreshTenants: fetchTenants
  };
}
