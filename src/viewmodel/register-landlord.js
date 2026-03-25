import { supabase } from '../model/supabaseclient.js';

export const LANDLORD_ROLE = 'Landlord';

const MAX_NAME_LENGTH = 20;
const MAX_EMAIL_LENGTH = 50;
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const validateRegisterLandlordPayload = (payload = {}) => {
  const firstName = normalizeString(payload.first_name);
  const middleName = normalizeString(payload.middle_name);
  const lastName = normalizeString(payload.last_name);
  const email = normalizeString(payload.email).toLowerCase();
  const password = typeof payload.password === 'string' ? payload.password : '';

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

  return {
    firstName,
    middleName: middleName || null,
    lastName,
    email,
    password
  };
};

export async function registerLandlord(payload) {
  const { firstName, middleName, lastName, email, password } = validateRegisterLandlordPayload(payload);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    throw new Error(`Registration failed: ${authError.message}`);
  }

  const userId = authData?.user?.id;
  if (!userId) {
    throw new Error('Registration failed: no user id returned by Supabase.');
  }

  const userProfile = {
    user_id: userId,
    user_role: LANDLORD_ROLE,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    email
  };

  const { error: profileError } = await supabase.from('users').insert(userProfile);

  if (profileError) {
    await supabase.auth.signOut();
    throw new Error(`Registration failed while creating landlord profile: ${profileError.message}`);
  }

  return {
    user: authData.user,
    session: authData.session,
    profile: userProfile,
    needsEmailConfirmation: !authData.session
  };
}
