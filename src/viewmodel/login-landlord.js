import { supabase } from '../model/supabaseclient.js';
import { LANDLORD_ROLE } from './register-landlord.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const isLandlordRole = (role) => typeof role === 'string' && role.toLowerCase() === LANDLORD_ROLE.toLowerCase();

const validateLoginLandlordPayload = (payload = {}) => {
  const email = normalizeString(payload.email).toLowerCase();
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (!email) {
    throw new Error('Email is required.');
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new Error('Email format is invalid.');
  }
  if (!password) {
    throw new Error('Password is required.');
  }

  return { email, password };
};

export async function loginLandlord(payload) {
  const { email, password } = validateLoginLandlordPayload(payload);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    throw new Error(`Login failed: ${authError.message}`);
  }

  const userId = authData?.user?.id;
  if (!userId) {
    await supabase.auth.signOut();
    throw new Error('Login failed: no user id returned by Supabase.');
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('user_id, user_role, first_name, middle_name, last_name, email')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    throw new Error(`Login failed while checking user role: ${profileError.message}`);
  }

  if (!userProfile || !isLandlordRole(userProfile.user_role)) {
    await supabase.auth.signOut();
    throw new Error('Access denied. This login endpoint is for landlords only.');
  }

  return {
    user: authData.user,
    session: authData.session,
    profile: userProfile
  };
}
