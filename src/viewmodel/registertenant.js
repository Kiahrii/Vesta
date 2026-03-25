import { supabase } from '../model/supabaseclient.js';

const TENANT_ROLE = 'tenant';
const MAX_NAME_LENGTH = 20;
const MAX_EMAIL_LENGTH = 50;
const MAX_EMERGENCY_CONTACT_LENGTH = 50;
const PHONE_LENGTH = 11;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const toDigitsOnly = (value) => normalizeString(value).replace(/\D/g, '');

const toISODate = (value) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return new Date().toISOString().slice(0, 10);
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Move-in date is invalid.');
  }

  return parsed.toISOString().slice(0, 10);
};

const toOptionalISODate = (value, errorMessage) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(errorMessage || 'Date is invalid.');
  }

  return parsed.toISOString().slice(0, 10);
};

const validateRegisterTenantPayload = (payload = {}) => {
  const firstName = normalizeString(payload.first_name);
  const middleName = normalizeString(payload.middle_name);
  const lastName = normalizeString(payload.last_name);
  const email = normalizeString(payload.email).toLowerCase();
  const password = typeof payload.password === 'string' ? payload.password : '';
  const contactNo = toDigitsOnly(payload.contact_no);
  const emergencyContact = normalizeString(payload.emergency_contact ?? payload.contact_name);
  const emergencyContactNo = toDigitsOnly(payload.emergency_contact_no ?? payload.em_contact_no);
  const moveInDate = toISODate(payload.move_in_date ?? payload.move_in);
  const leaseEndDate = toOptionalISODate(payload.lease_end, 'Lease end date is invalid.');
  const roomId = Number(payload.room_id);

  if (!firstName) {
    throw new Error('First name is required.');
  }
  if (firstName.length > MAX_NAME_LENGTH) {
    throw new Error(`First name must be ${MAX_NAME_LENGTH} characters or less.`);
  }

  if (middleName.length > MAX_NAME_LENGTH) {
    throw new Error(`Middle name must be ${MAX_NAME_LENGTH} characters or less.`);
  }

  if (!lastName) {
    throw new Error('Last name is required.');
  }
  if (lastName.length > MAX_NAME_LENGTH) {
    throw new Error(`Last name must be ${MAX_NAME_LENGTH} characters or less.`);
  }

  if (!email) {
    throw new Error('Email is required.');
  }
  if (email.length > MAX_EMAIL_LENGTH) {
    throw new Error(`Email must be ${MAX_EMAIL_LENGTH} characters or less.`);
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Email format is invalid.');
  }

  if (!password) {
    throw new Error('Password is required.');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  if (contactNo.length !== PHONE_LENGTH) {
    throw new Error(`Contact number must be exactly ${PHONE_LENGTH} digits.`);
  }

  if (!emergencyContact) {
    throw new Error('Emergency contact name is required.');
  }
  if (emergencyContact.length > MAX_EMERGENCY_CONTACT_LENGTH) {
    throw new Error(`Emergency contact name must be ${MAX_EMERGENCY_CONTACT_LENGTH} characters or less.`);
  }

  if (emergencyContactNo.length !== PHONE_LENGTH) {
    throw new Error(`Emergency contact number must be exactly ${PHONE_LENGTH} digits.`);
  }

  if (!Number.isInteger(roomId) || roomId <= 0) {
    throw new Error('Please select a valid room.');
  }

  if (leaseEndDate) {
    const leaseStartValue = new Date(moveInDate);
    const leaseEndValue = new Date(leaseEndDate);
    if (leaseEndValue < leaseStartValue) {
      throw new Error('Lease end date cannot be earlier than lease start.');
    }
  }

  return {
    firstName,
    middleName: middleName || null,
    lastName,
    email,
    password,
    contactNo,
    emergencyContact,
    emergencyContactNo,
    moveInDate,
    leaseStartDate: moveInDate,
    leaseEndDate,
    roomId
  };
};

export async function getTenantRoomOptions() {
  const { data: roomRows, error: roomError } = await supabase
    .from('rooms')
    .select('room_id, room_no, room_capacity, occupancy_status')
    .order('room_no', { ascending: true });

  if (roomError) {
    throw new Error(`Failed to load rooms: ${roomError.message}`);
  }

  const { data: tenantRows, error: tenantError } = await supabase.from('tenants').select('room_id');

  if (tenantError) {
    throw new Error(`Failed to load tenant occupancy: ${tenantError.message}`);
  }

  const occupancyByRoom = (tenantRows ?? []).reduce((map, tenant) => {
    const roomId = Number(tenant.room_id);
    if (!Number.isFinite(roomId)) {
      return map;
    }
    map.set(roomId, (map.get(roomId) ?? 0) + 1);
    return map;
  }, new Map());

  const roomOptions = (roomRows ?? [])
    .map((room) => {
      const roomId = Number(room.room_id);
      return {
        ...room,
        current_occupants: occupancyByRoom.get(roomId) ?? 0
      };
    })
    .filter((room) => {
      const capacity = Number(room.room_capacity) || 0;
      return (room.current_occupants ?? 0) < capacity;
    });

  return roomOptions;
}

export async function registerTenant(payload) {
  const {
    firstName,
    middleName,
    lastName,
    email,
    password,
    contactNo,
    emergencyContact,
    emergencyContactNo,
    moveInDate,
    leaseStartDate,
    leaseEndDate,
    roomId
  } = validateRegisterTenantPayload(payload);

  const { data: roomData, error: roomError } = await supabase
    .from('rooms')
    .select('room_id, room_no')
    .eq('room_id', roomId)
    .maybeSingle();

  if (roomError) {
    throw new Error(`Failed to validate room: ${roomError.message}`);
  }
  if (!roomData) {
    throw new Error('Selected room does not exist.');
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    throw new Error(`Tenant registration failed: ${authError.message}`);
  }

  const userId = authData?.user?.id;
  if (!userId) {
    throw new Error('Tenant registration failed: no auth user id returned.');
  }

  const userRecord = {
    user_id: userId,
    user_role: tenant,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    email
  };

  const { error: usersError } = await supabase.from('users').insert(userRecord);
  if (usersError) {
    await supabase.auth.signOut();
    throw new Error(`Tenant registration failed while creating user profile: ${usersError.message}`);
  }

  const tenantRecord = {
    user_id: userId,
    contact_no: contactNo,
    emergency_contact: emergencyContact,
    emergency_contact_no: emergencyContactNo,
    move_in_date: moveInDate,
    lease_start: leaseStartDate,
    lease_end: leaseEndDate,
    assigned_room: roomData.room_no,
    room_id: roomId
  };

  const { data: tenantData, error: tenantError } = await supabase
    .from('tenants')
    .insert(tenantRecord)
    .select()
    .maybeSingle();

  if (tenantError) {
    await supabase.from('users').delete().eq('user_id', userId);
    await supabase.auth.signOut();
    throw new Error(`Tenant registration failed while creating tenant profile: ${tenantError.message}`);
  }

  if (!tenantData?.tenant_id) {
    await supabase.from('users').delete().eq('user_id', userId);
    await supabase.auth.signOut();
    throw new Error('Tenant registration failed: no tenant id returned.');
  }

  /* ✅ UPDATE ROOM STATUS TO OCCUPIED */
  const { error: roomUpdateError } = await supabase
    .from('rooms')
    .update({
      occupancy_status: 'Occupied'
    })
    .eq('room_id', roomId);

  if (roomUpdateError) {
    // Rollback tenant + user if room update fails
    await supabase.from('tenants').delete().eq('tenant_id', tenantData.tenant_id);
    await supabase.from('users').delete().eq('user_id', userId);
    await supabase.auth.signOut();

    throw new Error(`Failed to update room status: ${roomUpdateError.message}`);
  }

  const tenantRoomId = tenantData.room_id ?? roomId;
  const { data: billingRoomData, error: billingRoomError } = await supabase
    .from('rooms')
    .select('room_id, monthly_rent')
    .eq('room_id', tenantRoomId)
    .maybeSingle();

  if (billingRoomError) {
    await supabase.from('tenants').delete().eq('tenant_id', tenantData.tenant_id);
    await supabase.from('users').delete().eq('user_id', userId);
    await supabase
      .from('rooms')
      .update({ occupancy_status: 'Available' })
      .eq('room_id', roomId);
    await supabase.auth.signOut();
    throw new Error(`Failed to fetch room rental details: ${billingRoomError.message}`);
  }

  const monthlyRent = Number(billingRoomData?.monthly_rent);
  if (!Number.isFinite(monthlyRent) || monthlyRent <= 0) {
    await supabase.from('tenants').delete().eq('tenant_id', tenantData.tenant_id);
    await supabase.from('users').delete().eq('user_id', userId);
    await supabase
      .from('rooms')
      .update({ occupancy_status: 'Available' })
      .eq('room_id', roomId);
    await supabase.auth.signOut();
    throw new Error('Monthly rent is missing or invalid. Cannot create billing.');
  }

  const convertMonthToEnumFormat = (monthName) => {
  const monthMap = {
    'JANUARY': 'January',
    'FEBRUARY': 'February',
    'MARCH': 'March',
    'APRIL': 'April',
    'MAY': 'May',
    'JUNE': 'June',
    'JULY': 'July',
    'AUGUST': 'August',
    'SEPTEMBER': 'September',
    'OCTOBER': 'October',
    'NOVEMBER': 'November',
    'DECEMBER': 'December'
  };
  
  return monthMap[monthName] || monthName;
};

  const monthNames = [
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

const now = new Date();
const billingMonthFull = monthNames[now.getMonth()];
const billingMonth = convertMonthToEnumFormat(billingMonthFull); // Convert to "March", "April", etc.
const billingYear = now.getFullYear();

  const paymentRecord = {
    tenant_id: tenantData.tenant_id,
    billing_month: billingMonth,
    billing_year: billingYear,
    amount_due: monthlyRent,
    amount_paid: 0,
    balance: 0,
    payment_method: 'Over-the-Counter',
    status: 'Billing'
  };

  const { error: paymentError } = await supabase.from('payments').insert(paymentRecord);

  if (paymentError) {
    await supabase.from('tenants').delete().eq('tenant_id', tenantData.tenant_id);
    await supabase.from('users').delete().eq('user_id', userId);
    await supabase
      .from('rooms')
      .update({ occupancy_status: 'Available' })
      .eq('room_id', roomId);
    await supabase.auth.signOut();
    throw new Error(`Failed to create initial billing record: ${paymentError.message}`);
  }

  return {
    user: authData.user,
    session: authData.session,
    userProfile: userRecord,
    tenantProfile: tenantData,
    needsEmailConfirmation: !authData.session
  };
}
