import { useState, useEffect, useMemo, } from 'react';
import { supabase } from '../model/supabaseclient.js';

export function useShortcutModalLogic(open) {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch tenants when modal opens
  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setSelectedTenant(null);
      setRoomNumber('');
      setSearchTerm('');
      setIsOpen(false);
      return;
    }

    const fetchTenants = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('tenants')
          .select(`
            tenant_id,
            user_id,
            room_id,
            users!inner (
              first_name,
              last_name
            ),
            rooms!inner (
              room_no
            )
          `)
          .order('users(first_name)', { ascending: true });

        if (error) throw error;

        // Transform data for dropdown
        const tenantList = data.map(tenant => ({
          tenant_id: tenant.tenant_id,
          full_name: `${tenant.users.first_name} ${tenant.users.last_name}`.trim(),
          first_name: tenant.users.first_name,
          last_name: tenant.users.last_name,
          room_number: tenant.rooms.room_no,
          room_id: tenant.room_id
        }));

        setTenants(tenantList);
      } catch (err) {
        console.error('Error fetching tenants:', err);
        setError(err.message || 'Failed to load tenants');
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [open]);

  // Filter tenants based on search term
  const filteredTenants = useMemo(() => {
    if (!searchTerm.trim()) return tenants;
    
    const searchLower = searchTerm.toLowerCase();
    return tenants.filter(tenant => 
      tenant.full_name.toLowerCase().includes(searchLower) ||
      tenant.first_name.toLowerCase().includes(searchLower) ||
      tenant.last_name.toLowerCase().includes(searchLower)
    );
  }, [tenants, searchTerm]);

  const handleTenantSelect = (tenant) => {
    setSelectedTenant(tenant);
    setRoomNumber(tenant?.room_number || '');
    setSearchTerm(tenant?.full_name || '');
    setIsOpen(false);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setIsOpen(true);
    // Clear selected tenant if search doesn't match
    if (selectedTenant && selectedTenant.full_name !== value) {
      setSelectedTenant(null);
      setRoomNumber('');
    }
  };

  const resetSelection = () => {
    setSelectedTenant(null);
    setRoomNumber('');
    setSearchTerm('');
    setIsOpen(false);
  };

  return {
    tenants: filteredTenants,
    selectedTenant,
    roomNumber,
    searchTerm,
    loading,
    error,
    isOpen,
    setIsOpen,
    handleTenantSelect,
    handleSearchChange,
    resetSelection
  };
}