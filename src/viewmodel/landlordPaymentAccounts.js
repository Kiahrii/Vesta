import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '../model/supabaseclient.js';

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const buildAccountPayload = (payload = {}) => ({
  account_type: normalizeString(payload.account_type),
  provider_name: normalizeString(payload.provider_name),
  account_name: normalizeString(payload.account_name),
  account_number: normalizeString(payload.account_number)
});

const ensureAccountId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export function useLandlordPaymentAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('landlord_payment_accounts')
        .select('*')
        .order('account_id', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setAccounts(data ?? []);
      return data ?? [];
    } catch (fetchError) {
      setAccounts([]);
      setError(fetchError.message || 'Unable to load payment accounts.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = useCallback(async (payload) => {
    const normalized = buildAccountPayload(payload);

    if (!normalized.account_type || !normalized.provider_name || !normalized.account_name || !normalized.account_number) {
      throw new Error('All payment account fields are required.');
    }

    const { data, error: insertError } = await supabase
      .from('landlord_payment_accounts')
      .insert(normalized)
      .select('*')
      .single();

    if (insertError) {
      throw new Error(insertError.message || 'Failed to save payment account.');
    }

    setAccounts((prev) => [...prev, data]);
    return data;
  }, []);

  const updateAccount = useCallback(async (accountId, payload) => {
    const parsedId = ensureAccountId(accountId);
    if (!parsedId) {
      throw new Error('A valid account id is required.');
    }

    const normalized = buildAccountPayload(payload);
    const updatePayload = Object.fromEntries(
      Object.entries(normalized).filter(([, value]) => value !== '')
    );

    const { data, error: updateError } = await supabase
      .from('landlord_payment_accounts')
      .update(updatePayload)
      .eq('account_id', parsedId)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update payment account.');
    }

    setAccounts((prev) => prev.map((account) => (account.account_id === parsedId ? data : account)));
    return data;
  }, []);

  const orderedAccounts = useMemo(() => accounts, [accounts]);

  return {
    accounts: orderedAccounts,
    loading,
    error,
    refreshAccounts: fetchAccounts,
    addAccount,
    updateAccount
  };
}
