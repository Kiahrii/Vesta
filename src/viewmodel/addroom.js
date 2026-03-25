import { useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseRead } from '../model/supabaseclient.js';
import { useSupabaseQuery } from './useSupabaseQuery.js';

const MAX_ROOM_NO_LENGTH = 10;
const MAX_RENT = 1000000;
const MAX_CAPACITY = 4;
const ROOM_PHOTO_BUCKET = import.meta.env.VITE_SUPABASE_ROOM_PHOTO_BUCKET || 'room_photos';
const supabaseAdminWrite = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
const roomWriteClient = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? supabaseAdminWrite : supabase;
const roomReadClient = supabaseRead;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeStatus = (value) => normalizeString(value).toLowerCase();
const normalizeFileExtension = (fileName = '') => {
  const parts = fileName.split('.');
  const extension = parts.length > 1 ? parts.pop() : 'jpg';
  return extension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
};

const normalizeForPath = (value = '') => normalizeString(value).toLowerCase().replace(/[^a-z0-9_-]/g, '');
const isTenantActive = (tenant) => !tenant.move_out_date && !normalizeStatus(tenant.status).includes('moved');
const pickJoinedRow = (value) => (Array.isArray(value) ? value[0] ?? null : value ?? null);

const toRoomResolutionMaps = (rooms = []) => {
  const roomIds = [];
  const roomIdByNo = new Map();

  rooms.forEach((room) => {
    const numericRoomId = Number(room.room_id);
    const roomNo = normalizeString(room.room_no);
    if (Number.isInteger(numericRoomId) && numericRoomId > 0) {
      roomIds.push(numericRoomId);
    }
    if (roomNo) {
      roomIdByNo.set(roomNo, numericRoomId);
      roomIdByNo.set(roomNo.toLowerCase(), numericRoomId);
    }
  });

  return {
    roomIds: [...new Set(roomIds)],
    roomIdByNo
  };
};

const resolveTenantRoomId = (tenant, roomIdByNo) => {
  const numericRoomId = Number(tenant.room_id);
  if (Number.isInteger(numericRoomId) && numericRoomId > 0) {
    return numericRoomId;
  }

  const assignedRoom = normalizeString(tenant.assigned_room);
  if (!assignedRoom) {
    return null;
  }

  return roomIdByNo.get(assignedRoom) ?? roomIdByNo.get(assignedRoom.toLowerCase()) ?? null;
};

const toTenantNameMap = (users = []) =>
  new Map(
    (users ?? []).map((user) => {
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
      return [user.user_id, fullName];
    })
  );

const buildTenantDisplayName = (tenant, userNameById) => {
  const userName = tenant.user_id ? userNameById.get(tenant.user_id) : '';
  if (userName) {
    return userName;
  }

  const fallbackName = normalizeString(tenant.emergency_contact);
  if (fallbackName) {
    return fallbackName;
  }

  return `Tenant #${tenant.tenant_id}`;
};

const validateAddRoomPayload = (payload = {}) => {
  const roomNo = normalizeString(payload.room_no);
  const monthlyRent = Number(payload.monthly_rent);
  const capacity = Number(payload.capacity);
  const occupancyStatus = normalizeString(payload.occupancy_status) || 'Available';

  if (!roomNo) {
    throw new Error('Room number is required.');
  }

  if (!/^[A-Za-z0-9\s-]+$/.test(roomNo)) {
    throw new Error('Room number can only contain letters, numbers, spaces, and hyphens.');
  }

  if (roomNo.length > MAX_ROOM_NO_LENGTH) {
    throw new Error(`Room number must be ${MAX_ROOM_NO_LENGTH} characters or less.`);
  }

  if (!Number.isFinite(monthlyRent) || monthlyRent <= 0 || monthlyRent > MAX_RENT) {
    throw new Error('Monthly rent must be a positive number not greater than 1,000,000.');
  }

  if (!Number.isInteger(capacity) || capacity <= 0 || capacity > MAX_CAPACITY) {
    throw new Error('Capacity must be an integer between 1 and 4.');
  }

  return {
    room_no: roomNo,
    room_capacity: capacity,
    monthly_rent: monthlyRent,
    occupancy_status: occupancyStatus
  };
};

export async function getRooms() {
  const { data, error } = await roomReadClient
    .from('rooms')
    .select('room_id, room_no, room_capacity, monthly_rent, occupancy_status, photo')
    .order('room_no', { ascending: true });

  if (error) {
    throw new Error(`Failed to load rooms: ${error.message}`);
  }

  return data ?? [];
}

export async function getRoomTenants(roomsOrRoomIds = []) {
  if (!Array.isArray(roomsOrRoomIds) || roomsOrRoomIds.length === 0) {
    return [];
  }

  const rooms =
    typeof roomsOrRoomIds[0] === 'object'
      ? roomsOrRoomIds
      : roomsOrRoomIds.map((roomId) => ({
        room_id: roomId,
        room_no: ''
      }));
  const { roomIds, roomIdByNo } = toRoomResolutionMaps(rooms);
  const requestedRoomIds = new Set(roomIds);
  if (requestedRoomIds.size === 0) {
    return [];
  }

  const normalizedRequestedRoomNos = new Set(
    rooms
      .map((room) => normalizeString(room.room_no).toLowerCase())
      .filter(Boolean)
  );

  const { data: tenantData, error: tenantError } = await roomReadClient
    .from('tenants')
    .select(
      `
      tenant_id,
      room_id,
      assigned_room,
      user_id,
      emergency_contact,
      move_out_date,
      status,
      users (
        user_id,
        first_name,
        last_name
      )
    `
    );

  if (tenantError) {
    throw new Error(`Failed to load room tenants: ${tenantError.message}`);
  }

  const activeTenants =
    tenantData
      ?.map((tenant) => {
        const tenantRoomId = Number(tenant.room_id);
        const tenantAssignedRoom = normalizeString(tenant.assigned_room).toLowerCase();
        const matchesByRoomId = Number.isInteger(tenantRoomId) && requestedRoomIds.has(tenantRoomId);
        const matchesByRoomNo = Boolean(tenantAssignedRoom) && normalizedRequestedRoomNos.has(tenantAssignedRoom);

        if (!isTenantActive(tenant) || (!matchesByRoomId && !matchesByRoomNo)) {
          return null;
        }

        return {
          ...tenant,
          resolved_room_id: matchesByRoomId ? tenantRoomId : resolveTenantRoomId(tenant, roomIdByNo)
        };
      })
      .filter(Boolean) ?? [];

  const joinedUsers = (tenantData ?? []).map((tenant) => pickJoinedRow(tenant?.users)).filter(Boolean);
  const userNameById = toTenantNameMap(joinedUsers);

  return activeTenants.map((tenant) => {
    const fullName = buildTenantDisplayName(tenant, userNameById);

    return {
      tenant_id: tenant.tenant_id,
      room_id: tenant.resolved_room_id,
      full_name: fullName
    };
  });
}

export function useRoomsWithTenants() {
  const fetchRoomsWithTenants = useCallback(async () => {
    const loadedRooms = await getRooms();
    const tenantRows = await getRoomTenants(loadedRooms);
    const tenantsByRoomId = tenantRows.reduce((accumulator, tenant) => {
      if (!accumulator[tenant.room_id]) {
        accumulator[tenant.room_id] = [];
      }
      accumulator[tenant.room_id].push(tenant.full_name);
      return accumulator;
    }, {});

    return loadedRooms.map((room) => ({
      ...room,
      tenants: tenantsByRoomId[room.room_id] ?? []
    }));
  }, []);

  return useSupabaseQuery(fetchRoomsWithTenants, {
    initialData: [],
    deps: [fetchRoomsWithTenants],
    errorMessage: 'Failed to load room details.'
  });
}

export async function getRoomTenantAssignments(roomId, roomNo = '') {
  const numericRoomId = Number(roomId);
  if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) {
    throw new Error('Invalid room id.');
  }

  const { data: tenantData, error: tenantError } = await roomReadClient
    .from('tenants')
    .select(
      `
      tenant_id,
      room_id,
      assigned_room,
      user_id,
      emergency_contact,
      move_out_date,
      status,
      users (
        user_id,
        first_name,
        last_name
      )
    `
    )
    .order('tenant_id', { ascending: true });

  if (tenantError) {
    throw new Error(`Failed to load room tenants: ${tenantError.message}`);
  }

  const normalizedRoomNo = normalizeString(roomNo).toLowerCase();
  const activeTenants = (tenantData ?? []).filter((tenant) => {
    if (!isTenantActive(tenant)) {
      return false;
    }

    const tenantRoomId = Number(tenant.room_id);
    if (Number.isInteger(tenantRoomId) && tenantRoomId === numericRoomId) {
      return true;
    }

    const tenantAssignedRoom = normalizeString(tenant.assigned_room).toLowerCase();
    return Boolean(normalizedRoomNo) && tenantAssignedRoom === normalizedRoomNo;
  });
  const joinedUsers = (tenantData ?? []).map((tenant) => pickJoinedRow(tenant?.users)).filter(Boolean);
  const userNameById = toTenantNameMap(joinedUsers);

  return activeTenants.map((tenant) => ({
    tenant_id: tenant.tenant_id,
    user_id: tenant.user_id,
    full_name: buildTenantDisplayName(tenant, userNameById)
  }));
}

export async function getTenantCandidates(roomId, roomNo = '') {
  const numericRoomId = Number(roomId);
  if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) {
    throw new Error('Invalid room id.');
  }

  const { data: tenantData, error: tenantError } = await roomReadClient
    .from('tenants')
    .select(
      `
      tenant_id,
      room_id,
      assigned_room,
      user_id,
      emergency_contact,
      move_out_date,
      status,
      users (
        user_id,
        first_name,
        last_name
      )
    `
    )
    .order('tenant_id', { ascending: true });

  if (tenantError) {
    throw new Error(`Failed to load tenants: ${tenantError.message}`);
  }

  const normalizedRoomNo = normalizeString(roomNo).toLowerCase();

  const candidates =
    tenantData?.filter((tenant) => {
      const active = isTenantActive(tenant);
      const tenantRoomId = Number(tenant.room_id);
      const tenantAssignedRoom = normalizeString(tenant.assigned_room).toLowerCase();
      const hasAssignedRoomName = Boolean(tenantAssignedRoom);
      const hasAssignedRoomId = Number.isInteger(tenantRoomId) && tenantRoomId > 0;

      const isAssignedToTargetById = hasAssignedRoomId && tenantRoomId === numericRoomId;
      const isAssignedToTargetByRoomNo = Boolean(normalizedRoomNo) && hasAssignedRoomName && tenantAssignedRoom === normalizedRoomNo;
      const isAssignedToAnyRoom = active && (hasAssignedRoomId || hasAssignedRoomName);

      if (isAssignedToTargetById || isAssignedToTargetByRoomNo) {
        return true;
      }

      return !isAssignedToAnyRoom;
    }) ?? [];

  const joinedUsers = (tenantData ?? []).map((tenant) => pickJoinedRow(tenant?.users)).filter(Boolean);
  const userNameById = toTenantNameMap(joinedUsers);
  return candidates
    .map((tenant) => ({
      tenant_id: tenant.tenant_id,
      user_id: tenant.user_id,
      full_name: buildTenantDisplayName(tenant, userNameById)
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}

const syncRoomOccupancyStatus = async (roomId) => {
  const numericRoomId = Number(roomId);

  const { data: tenantData, error: tenantError } = await roomReadClient
    .from('tenants')
    .select('tenant_id, move_out_date, status')
    .eq('room_id', numericRoomId);

  if (tenantError) {
    throw new Error(`Failed to refresh room occupancy: ${tenantError.message}`);
  }

  const activeCount = (tenantData ?? []).filter(isTenantActive).length;
  const updatedStatus = activeCount > 0 ? 'Occupied' : 'Available';

  const { error: roomError } = await roomWriteClient.from('rooms').update({ occupancy_status: updatedStatus }).eq('room_id', numericRoomId);
  if (roomError) {
    throw new Error(`Failed to update room occupancy: ${roomError.message}`);
  }

  return updatedStatus;
};

export async function assignTenantToRoom({ tenantId, roomId, roomNo }) {
  const numericTenantId = Number(tenantId);
  const numericRoomId = Number(roomId);
  const normalizedRoomNo = normalizeString(roomNo);

  if (!Number.isInteger(numericTenantId) || numericTenantId <= 0) {
    throw new Error('Invalid tenant id.');
  }
  if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) {
    throw new Error('Invalid room id.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await roomWriteClient
    .from('tenants')
    .update({
      room_id: numericRoomId,
      assigned_room: normalizedRoomNo || null,
      move_out_date: null,
      status: 'Active',
      move_in_date: today
    })
    .eq('tenant_id', numericTenantId);

  if (error) {
    throw new Error(`Failed to assign tenant: ${error.message}`);
  }

  return syncRoomOccupancyStatus(numericRoomId);
}

export async function removeTenantFromRoom({ tenantId, roomId }) {
  const numericTenantId = Number(tenantId);
  const numericRoomId = Number(roomId);

  if (!Number.isInteger(numericTenantId) || numericTenantId <= 0) {
    throw new Error('Invalid tenant id.');
  }
  if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) {
    throw new Error('Invalid room id.');
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await roomWriteClient
    .from('tenants')
    .update({
      room_id: null,
      assigned_room: null,
      move_out_date: today,
      status: 'Moved-out'
    })
    .eq('tenant_id', numericTenantId);

  if (error) {
    throw new Error(`Failed to remove tenant: ${error.message}`);
  }

  return syncRoomOccupancyStatus(numericRoomId);
}

export async function uploadRoomPhoto({ file, roomNo }) {
  if (!file) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const safeRoomNo = normalizeForPath(roomNo || 'room');
  const extension = normalizeFileExtension(file.name);
  const filePath = `room_${safeRoomNo}_photo_${timestamp}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(ROOM_PHOTO_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (uploadError) {
    throw new Error(`Failed to upload room photo: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(ROOM_PHOTO_BUCKET).getPublicUrl(filePath);

  return publicUrlData?.publicUrl || null;
}

export async function addRoom(payload) {
  const room = validateAddRoomPayload(payload);
  const { data, error } = await roomWriteClient.from('rooms').insert(room).select().maybeSingle();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Room number already exists.');
    }
    throw new Error(`Failed to add room: ${error.message}`);
  }

  if (!data?.room_id) {
    throw new Error('Room was created but no room_id was returned.');
  }

  if (payload.photoFile) {
    const photoUrl = await uploadRoomPhoto({ file: payload.photoFile, roomNo: room.room_no });
    const { data: updatedRoom, error: photoUpdateError } = await roomWriteClient
      .from('rooms')
      .update({ photo: photoUrl })
      .eq('room_id', data.room_id)
      .select()
      .maybeSingle();

    if (photoUpdateError) {
      throw new Error(`Room added but failed to save photo URL: ${photoUpdateError.message}`);
    }

    if (!updatedRoom) {
      throw new Error(`Room added but no row was updated for photo. room_id=${data.room_id}`);
    }

    return updatedRoom;
  }

  return data;
}

export async function updateRoom(roomId, payload) {
  const numericRoomId = Number(roomId);
  if (!Number.isInteger(numericRoomId) || numericRoomId <= 0) {
    throw new Error('Invalid room id.');
  }

  const room = validateAddRoomPayload(payload);
  const { data, error } = await roomWriteClient.from('rooms').update(room).eq('room_id', numericRoomId).select().maybeSingle();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Room number already exists.');
    }
    throw new Error(`Failed to update room: ${error.message}`);
  }
  // NOTE:
  // With RLS, UPDATE can succeed but return no row when SELECT is restricted.
  // In that case, treat "no error" as success.

  if (payload.photoFile) {
    const photoUrl = await uploadRoomPhoto({ file: payload.photoFile, roomNo: room.room_no });
    const { data: photoUpdatedRoom, error: photoUpdateError } = await roomWriteClient
      .from('rooms')
      .update({ photo: photoUrl })
      .eq('room_id', numericRoomId)
      .select()
      .maybeSingle();

    if (photoUpdateError) {
      throw new Error(`Room details updated but failed to save photo URL: ${photoUpdateError.message}`);
    }
    return photoUpdatedRoom ?? { ...room, room_id: numericRoomId, photo: photoUrl };
  }

  if (payload.photo !== undefined) {
    const normalizedPhoto = normalizeString(payload.photo) || null;
    const { data: photoRetainedRoom, error: retainPhotoError } = await roomWriteClient
      .from('rooms')
      .update({ photo: normalizedPhoto })
      .eq('room_id', numericRoomId)
      .select()
      .maybeSingle();

    if (retainPhotoError) {
      throw new Error(`Room updated but failed to retain current photo URL: ${retainPhotoError.message}`);
    }
    return photoRetainedRoom ?? { ...room, room_id: numericRoomId, photo: normalizedPhoto };
  }

  return data ?? { ...room, room_id: numericRoomId };
    }
