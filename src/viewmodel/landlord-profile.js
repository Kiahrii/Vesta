import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../model/supabaseclient.js';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const buildDisplayName = (profile, authUser) => {
  const explicitName = normalizeString(profile?.full_name) || normalizeString(profile?.name);
  if (explicitName) {
    return explicitName;
  }

  const firstName = normalizeString(profile?.first_name) || normalizeString(authUser?.user_metadata?.first_name);
  const middleName = normalizeString(profile?.middle_name) || normalizeString(authUser?.user_metadata?.middle_name);
  const lastName = normalizeString(profile?.last_name) || normalizeString(authUser?.user_metadata?.last_name);
  const composedName = [firstName, middleName, lastName].filter(Boolean).join(' ');

  if (composedName) {
    return composedName;
  }

  const metaName = normalizeString(authUser?.user_metadata?.full_name) || normalizeString(authUser?.user_metadata?.name);
  if (metaName) {
    return metaName;
  }

  return normalizeString(authUser?.email) || 'Landlord';
};

const resolveEmail = (profile, authUser) => normalizeString(profile?.email) || normalizeString(authUser?.email) || '';

const resolveAvatar = (profile, authUser) =>
  normalizeString(profile?.photo) ||
  normalizeString(authUser?.user_metadata?.avatar_url) ||
  normalizeString(authUser?.user_metadata?.picture) ||
  normalizeString(authUser?.user_metadata?.photo) ||
  '';

export function useLandlordProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw new Error(authError.message || 'Unable to load user session.');
      }

      const authUser = authData?.user ?? null;
      if (!authUser) {
        setProfile(null);
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('user_id, user_role, first_name, middle_name, last_name, email')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(`Failed to load landlord profile: ${profileError.message}`);
      }

      setProfile({
        name: buildDisplayName(userProfile, authUser),
        email: resolveEmail(userProfile, authUser),
        photo: resolveAvatar(userProfile, authUser)
      });
    } catch (loadError) {
      setProfile(null);
      setError(loadError.message || 'Unable to load landlord profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    refreshProfile: loadProfile
  };
}
