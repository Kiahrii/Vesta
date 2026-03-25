import { useEffect, useMemo, useState, useRef } from 'react';
import Modal from 'layout/Modal';
import { validateRegisterTenant, validateAddRoom, validateOnTheCounter } from 'viewmodel/validation.js';
import { getTenantRoomOptions, registerTenant } from 'viewmodel/registertenant.js';
import {
  addRoom,
  updateRoom,
  getRooms,
  getNextRoomNumber,
  getRoomTenantAssignments,
  getTenantCandidates,
  assignTenantToRoom,
  removeTenantFromRoom
} from 'viewmodel/addroom.js';
import 'assets/scss/apartment-page/shortcutModals.scss';
import ViewModal from 'viewmodel/ViewModal';
import { useShortcutModalLogic } from 'viewmodel/shortcutmodals-logic';

const getMonthAbbreviation = (fullMonthName) => {
  const monthMap = {
    January: 'Jan',
    February: 'Feb',
    March: 'Mar',
    April: 'Apr',
    May: 'May',
    June: 'Jun',
    July: 'Jul',
    August: 'Aug',
    September: 'Sep',
    October: 'Oct',
    November: 'Nov',
    December: 'Dec'
  };

  return monthMap[fullMonthName] || fullMonthName.substring(0, 3);
};

// REGISTER TENANT MODAL

export function RegisterTenantModal({ open, onClose }) {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    contact_no: '',
    contact_name: '',
    em_contact_no: '',
    move_in: getTodayDate(),
    lease_end: '',
    room_id: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState({ field: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadRooms = async () => {
      if (!open) {
        return;
      }

      setRoomsLoading(true);

      try {
        const roomOptions = await getTenantRoomOptions();
        if (isMounted) {
          setRooms(roomOptions);
        }
      } catch (loadError) {
        if (isMounted) {
          setError({
            field: 'room_id',
            message: loadError.message || 'Failed to load rooms.'
          });
        }
      } finally {
        if (isMounted) {
          setRoomsLoading(false);
        }
      }
    };

    loadRooms();

    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));

    // Clear error for the current field if it was the one with error
    if (error.field === name) {
      setError({ field: '', message: '' });
    }
  };

  const handleSubmit = async () => {
    const validation = validateRegisterTenant(form);

    if (!validation.isValid) {
      // Get the first field with an error
      const firstErrorField = Object.keys(validation.errors)[0];
      const firstErrorMessage = validation.errors[firstErrorField];

      setError({
        field: firstErrorField,
        message: firstErrorMessage
      });

      // Focus the first field with error (optional)
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.focus();
      }
      return;
    }

    setError({ field: '', message: '' });
    setLoading(true);
    setIsSubmitting(true);

    try {
      const result = await registerTenant({
        ...form,
        emergency_contact: form.contact_name,
        emergency_contact_no: form.em_contact_no,
        move_in_date: form.move_in,
        lease_start: form.move_in,
        lease_end: form.lease_end
      });

      setFeedbackMessage(
        result.needsEmailConfirmation
          ? 'Tenant registered successfully. Please ask tenant to confirm their email.'
          : 'Tenant registered successfully.'
      );
      setLoading(false);
      setIsSubmitting(false);
      handleClose();
    } catch (submitError) {
      setError({
        field: '',
        message: submitError.message || 'Failed to register tenant.'
      });
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm({
      first_name: '',
      middle_name: '',
      last_name: '',
      contact_no: '',
      contact_name: '',
      em_contact_no: '',
      move_in: getTodayDate(),
      lease_end: '',
      room_id: '',
      email: '',
      password: ''
    });
    setError({ field: '', message: '' });
    onClose();
  };

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <div className="shortcut-modal shortcut-modal--register">
          <h2 className="shortcut-modal__title">Register Tenant</h2>

          {error.message && <div className="shortcut-modal__global-error">{error.message}</div>}

          <div className="shortcut-modal__body shortcut-modal__body--scroll">
            <div className="shortcut-modal__grid">
              <div className="shortcut-modal__section">
                <h5 className="shortcut-modal__subtitle">Tenant Information</h5>
                <input
                  className={`shortcut-modal__input ${error.field === 'first_name' ? 'error' : ''}`}
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  placeholder="First Name"
                />
                <input
                  className={`shortcut-modal__input ${error.field === 'middle_name' ? 'error' : ''}`}
                  name="middle_name"
                  value={form.middle_name}
                  onChange={handleChange}
                  placeholder="Middle Name"
                />
                <input
                  className={`shortcut-modal__input ${error.field === 'last_name' ? 'error' : ''}`}
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  placeholder="Last Name"
                />
                <input
                  className={`shortcut-modal__input ${error.field === 'contact_no' ? 'error' : ''}`}
                  name="contact_no"
                  value={form.contact_no}
                  onChange={handleChange}
                  placeholder="Contact No"
                />
              </div>

              <div className="shortcut-modal__section">
                <h5 className="shortcut-modal__subtitle">Emergency Contact</h5>
                <input
                  className={`shortcut-modal__input ${error.field === 'contact_name' ? 'error' : ''}`}
                  name="contact_name"
                  value={form.contact_name}
                  onChange={handleChange}
                  placeholder="Contact Name"
                />
                <input
                  className={`shortcut-modal__input ${error.field === 'em_contact_no' ? 'error' : ''}`}
                  name="em_contact_no"
                  value={form.em_contact_no}
                  onChange={handleChange}
                  placeholder="Contact Number"
                />
              </div>

              <div className="shortcut-modal__section">
                <h5 className="shortcut-modal__subtitle">Room Details</h5>
                <input
                  className={`shortcut-modal__input ${error.field === 'move_in' ? 'error' : ''}`}
                  type="date"
                  name="move_in"
                  value={form.move_in}
                  onChange={handleChange}
                />

                <select
                  className={`shortcut-modal__input ${error.field === 'room_id' ? 'error' : ''}`}
                  name="room_id"
                  value={form.room_id}
                  onChange={handleChange}
                >
                  <option value="">{roomsLoading ? 'Loading rooms...' : 'Select Room'}</option>
                  {!roomsLoading &&
                    rooms.map((room) => (
                      <option key={room.room_id} value={room.room_id}>
                        Room {room.room_no}
                      </option>
                    ))}
                </select>

                <h5 className="shortcut-modal__subtitle">Lease End Date</h5>
                <input
                  className={`shortcut-modal__input ${error.field === 'lease_end' ? 'error' : ''}`}
                  type="date"
                  name="lease_end"
                  value={form.lease_end}
                  onChange={handleChange}
                />
              </div>

              <div className="shortcut-modal__section">
                <h5 className="shortcut-modal__subtitle">Account Details</h5>
                <input
                  className={`shortcut-modal__input ${error.field === 'email' ? 'error' : ''}`}
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                />
                <input
                  className={`shortcut-modal__input ${error.field === 'password' ? 'error' : ''}`}
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Password"
                />
              </div>
            </div>
          </div>

          <div className="shortcut-modal__actions">
            <button className="shortcut-modal__btn shortcut-modal__btn--cancel" onClick={handleClose}>
              Cancel
            </button>

            <button className="shortcut-modal__btn shortcut-modal__btn--primary" type="button" onClick={handleSubmit} disabled={loading}>
              Register
            </button>
          </div>
        </div>
        <ViewModal open={isSubmitting} message="Registering.." />
      </Modal>
      <ViewModal
        open={Boolean(feedbackMessage)}
        message={feedbackMessage}
        showSpinner={false}
        onClose={() => setFeedbackMessage('')}
        duration={2000}
      />
    </>
  );
}

// ADD ROOM MODAL

export function AddRoomModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    room_no: '',
    monthly_rent: '',
    capacity: 1,
    occupancy_status: 'Available'
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const hasManualRoomNo = useRef(false);

  const [error, setError] = useState({ field: '', message: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;
    hasManualRoomNo.current = false;

    const loadSuggestedRoom = async () => {
      try {
        const rooms = await getRooms();
        const nextRoomNo = getNextRoomNumber(rooms);
        if (!isMounted) {
          return;
        }
        setForm((prev) => {
          if (prev.room_no || hasManualRoomNo.current) {
            return prev;
          }
          return { ...prev, room_no: nextRoomNo };
        });
      } catch (loadError) {
        if (isMounted) {
          setError({
            field: 'room_no',
            message: loadError.message || 'Failed to load next room number.'
          });
        }
      }
    };

    loadSuggestedRoom();

    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'room_no') {
      hasManualRoomNo.current = true;
    }
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));

    // Clear error for the current field if it was the one with error
    if (error.field === name) {
      setError({ field: '', message: '' });
    }
  };

  const handlePhotoChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    if (!selectedFile) {
      setPhotoFile(null);
      setPhotoPreview('');
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setError({ field: 'photo', message: 'Only image files are allowed.' });
      e.target.value = '';
      return;
    }

    setPhotoFile(selectedFile);
    setPhotoPreview(URL.createObjectURL(selectedFile));
    if (error.field === 'photo') {
      setError({ field: '', message: '' });
    }
  };

  const handleSubmit = async () => {
    const validation = validateAddRoom(form);

    if (!validation.isValid) {
      // Get the first field with an error
      const firstErrorField = Object.keys(validation.errors)[0];
      const firstErrorMessage = validation.errors[firstErrorField];

      setError({
        field: firstErrorField,
        message: firstErrorMessage
      });

      // Focus the first field with error
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.focus();
      }
      return;
    }

    setError({ field: '', message: '' });
    setLoading(true);

    try {
      await addRoom({ ...form, photoFile });
      setFeedbackMessage('Room added successfully.');
      setLoading(false);
      onSaved?.();
      handleClose();
    } catch (submitError) {
      setError({
        field: '',
        message: submitError.message || 'Failed to add room.'
      });
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ room_no: '', monthly_rent: '', capacity: 1, occupancy_status: 'Available' });
    setPhotoFile(null);
    setPhotoPreview('');
    hasManualRoomNo.current = false;
    setError({ field: '', message: '' });
    onClose();
  };

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <div className="shortcut-modal shortcut-modal--compact">
          <h2 className="shortcut-modal__title">Add Room</h2>

          {error.message && <div className="shortcut-modal__global-error">{error.message}</div>}

          <div className="shortcut-modal__stack">
            <input
              className={`shortcut-modal__input ${error.field === 'room_no' ? 'error' : ''}`}
              type="text"
              name="room_no"
              value={form.room_no}
              onChange={handleChange}
              placeholder="Room No"
            />

            <input
              className={`shortcut-modal__input ${error.field === 'monthly_rent' ? 'error' : ''}`}
              type="number"
              name="monthly_rent"
              value={form.monthly_rent}
              onChange={handleChange}
              placeholder="Monthly Rent"
            />

            <input
              className={`shortcut-modal__input ${error.field === 'capacity' ? 'error' : ''}`}
              type="number"
              name="capacity"
              value={form.capacity}
              onChange={handleChange}
              placeholder="Capacity"
              min={1}
              max={4}
            />

            <select
              className={`shortcut-modal__input ${error.field === 'occupancy_status' ? 'error' : ''}`}
              name="occupancy_status"
              value={form.occupancy_status}
              onChange={handleChange}
            >
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Under Maintenance">Under Maintenance</option>
            </select>

            <input
              className={`shortcut-modal__input ${error.field === 'photo' ? 'error' : ''}`}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />

            {photoPreview ? <img src={photoPreview} alt="Room preview" className="shortcut-modal__preview" /> : null}
          </div>

          <div className="shortcut-modal__actions">
            <button className="shortcut-modal__btn shortcut-modal__btn--cancel" onClick={handleClose}>
              Cancel
            </button>
            <button className="shortcut-modal__btn shortcut-modal__btn--primary" type="button" onClick={handleSubmit} disabled={loading}>
              Add
            </button>
          </div>
        </div>
      </Modal>
      <ViewModal
        open={Boolean(feedbackMessage)}
        message={feedbackMessage}
        showSpinner={false}
        onClose={() => setFeedbackMessage('')}
        duration={2000}
      />
    </>
  );
}

export function UpdateRoomModal({ open, onClose, room, onSaved }) {
  const [form, setForm] = useState({
    room_no: '',
    monthly_rent: '',
    capacity: 1,
    occupancy_status: 'Available',
    photo: ''
  });
  const [roomTenants, setRoomTenants] = useState([]);
  const [tenantCandidates, setTenantCandidates] = useState([]);
  const [newTenantIdsBySlot, setNewTenantIdsBySlot] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState({ field: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [tenantActionLoading, setTenantActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    if (!open || !room) {
      return;
    }

    setForm({
      room_no: room.room_no || '',
      monthly_rent: room.monthly_rent ?? '',
      capacity: room.room_capacity ?? 1,
      occupancy_status: room.occupancy_status || 'Available',
      photo: room.photo || ''
    });
    setPhotoFile(null);
    setPhotoPreview(room.photo || '');
    setRoomTenants([]);
    setTenantCandidates([]);
    setNewTenantIdsBySlot({});
    setError({ field: '', message: '' });
  }, [open, room]);

  useEffect(() => {
    let isMounted = true;

    const loadTenantData = async () => {
      if (!open || !room?.room_id) {
        return;
      }

      try {
        const [assignments, candidates] = await Promise.all([
          getRoomTenantAssignments(room.room_id, room.room_no),
          getTenantCandidates(room.room_id, room.room_no)
        ]);

        if (!isMounted) {
          return;
        }

        setRoomTenants(assignments);
        setTenantCandidates(candidates);
      } catch (loadError) {
        if (isMounted) {
          setError({
            field: '',
            message: loadError.message || 'Failed to load tenant data.'
          });
        }
      }
    };

    loadTenantData();

    return () => {
      isMounted = false;
    };
  }, [open, room]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));

    if (error.field === name) {
      setError({ field: '', message: '' });
    }
  };

  const handlePhotoChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    if (!selectedFile) {
      setPhotoFile(null);
      setPhotoPreview(form.photo || '');
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setError({ field: 'photo', message: 'Only image files are allowed.' });
      e.target.value = '';
      return;
    }

    setPhotoFile(selectedFile);
    setPhotoPreview(URL.createObjectURL(selectedFile));
    if (error.field === 'photo') {
      setError({ field: '', message: '' });
    }
  };

  const refreshTenantData = async () => {
    if (!room?.room_id) {
      return;
    }

    const [assignments, candidates] = await Promise.all([
      getRoomTenantAssignments(room.room_id, room.room_no),
      getTenantCandidates(room.room_id, room.room_no)
    ]);

    setRoomTenants(assignments);
    setTenantCandidates(candidates);
  };

  const tenantSlots = useMemo(() => {
    const slotCount = Number(form.capacity) > 0 ? Number(form.capacity) : 1;
    const slots = Array.from({ length: slotCount }, (_, index) => ({
      slot: index,
      tenant: roomTenants[index] || null
    }));
    return slots;
  }, [form.capacity, roomTenants]);

  const availableCandidateIds = useMemo(() => new Set(roomTenants.map((tenant) => tenant.tenant_id)), [roomTenants]);

  const handleSubmit = async () => {
    if (!room?.room_id) {
      return;
    }

    const validation = validateAddRoom(form);

    if (!validation.isValid) {
      const firstErrorField = Object.keys(validation.errors)[0];
      const firstErrorMessage = validation.errors[firstErrorField];

      setError({
        field: firstErrorField,
        message: firstErrorMessage
      });
      return;
    }

    setError({ field: '', message: '' });
    setLoading(true);

    try {
      await updateRoom(room.room_id, { ...form, photoFile });
      setFeedbackMessage('Room updated successfully.');
      setLoading(false);
      onSaved?.();
      onClose();
    } catch (submitError) {
      setError({
        field: '',
        message: submitError.message || 'Failed to update room.'
      });
      setLoading(false);
    }
  };

  const handleTenantSelectionChange = (slot, tenantId) => {
    setNewTenantIdsBySlot((prev) => ({
      ...prev,
      [slot]: tenantId
    }));
  };

  const handleAddTenant = async (slot) => {
    if (!room?.room_id) {
      return;
    }

    const selectedTenantId = Number(newTenantIdsBySlot[slot]);
    if (!Number.isInteger(selectedTenantId) || selectedTenantId <= 0) {
      setError({
        field: '',
        message: 'Please select a tenant to add.'
      });
      return;
    }

    setTenantActionLoading(true);
    setError({ field: '', message: '' });

    try {
      await assignTenantToRoom({
        tenantId: selectedTenantId,
        roomId: room.room_id,
        roomNo: form.room_no || room.room_no
      });
      await refreshTenantData();
      await onSaved?.();
      setForm((prev) => ({
        ...prev,
        occupancy_status: 'Occupied'
      }));
      setNewTenantIdsBySlot((prev) => ({
        ...prev,
        [slot]: ''
      }));
    } catch (actionError) {
      setError({
        field: '',
        message: actionError.message || 'Failed to add tenant.'
      });
    } finally {
      setTenantActionLoading(false);
    }
  };

  const handleRemoveTenant = async (tenantId) => {
    if (!room?.room_id) {
      return;
    }

    setTenantActionLoading(true);
    setError({ field: '', message: '' });

    try {
      const statusAfterRemoval = await removeTenantFromRoom({
        tenantId,
        roomId: room.room_id
      });
      await refreshTenantData();
      await onSaved?.();
      setForm((prev) => ({
        ...prev,
        occupancy_status: statusAfterRemoval
      }));
    } catch (actionError) {
      setError({
        field: '',
        message: actionError.message || 'Failed to remove tenant.'
      });
    } finally {
      setTenantActionLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <div className="shortcut-modal shortcut-modal--compact">
          <h2 className="shortcut-modal__title">Update Room</h2>

          {error.message && <div className="shortcut-modal__global-error">{error.message}</div>}

          <div className="shortcut-modal__stack">
            {tenantSlots.map(({ slot, tenant }) => {
              const selectedTenantId = newTenantIdsBySlot[slot] ?? '';
              const filteredCandidates = tenantCandidates.filter((candidate) => !availableCandidateIds.has(candidate.tenant_id));

              return (
                <div key={`tenant-slot-${slot}`} className="edit-room-field">
                  <label htmlFor={`edit-tenant-${slot}`}>Tenant {slot + 1}:</label>
                  <input
                    id={`edit-tenant-${slot}`}
                    className="otc-field-input"
                    type="text"
                    value={tenant ? tenant.full_name : '-'}
                    readOnly
                  />
                  {tenant ? (
                    <button
                      className="remove"
                      type="button"
                      onClick={() => handleRemoveTenant(tenant.tenant_id)}
                      disabled={tenantActionLoading || loading}
                    >
                      <i className="ph ph-trash" />
                    </button>
                  ) : (
                    <div className="d-flex gap-2">
                      <select
                        className="shortcut-modal__input"
                        value={selectedTenantId}
                        onChange={(event) => handleTenantSelectionChange(slot, event.target.value)}
                        disabled={tenantActionLoading || loading}
                      >
                        <option value="">Select tenant</option>
                        {filteredCandidates.map((candidate) => (
                          <option key={candidate.tenant_id} value={candidate.tenant_id}>
                            {candidate.full_name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="add-tenant-btn"
                        type="button"
                        onClick={() => handleAddTenant(slot)}
                        disabled={tenantActionLoading || loading}
                      >
                        <i className="ph ph-plus-circle"></i>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <input
              className={`shortcut-modal__input ${error.field === 'room_no' ? 'error' : ''}`}
              type="text"
              name="room_no"
              value={form.room_no}
              onChange={handleChange}
              placeholder="Room No"
            />

            <input
              className={`shortcut-modal__input ${error.field === 'monthly_rent' ? 'error' : ''}`}
              type="number"
              name="monthly_rent"
              value={form.monthly_rent}
              onChange={handleChange}
              placeholder="Monthly Rent"
            />

            <input
              className={`shortcut-modal__input ${error.field === 'capacity' ? 'error' : ''}`}
              type="number"
              name="capacity"
              value={form.capacity}
              onChange={handleChange}
              placeholder="Capacity"
              min={1}
              max={4}
            />

            <select
              className={`shortcut-modal__input ${error.field === 'occupancy_status' ? 'error' : ''}`}
              name="occupancy_status"
              value={form.occupancy_status}
              onChange={handleChange}
            >
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Under Maintenance">Under Maintenance</option>
            </select>

            <input
              className={`shortcut-modal__input ${error.field === 'photo' ? 'error' : ''}`}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />

            {photoPreview ? <img src={photoPreview} alt="Room preview" className="shortcut-modal__preview" /> : null}
          </div>

          <div className="shortcut-modal__actions">
            <button className="shortcut-modal__btn shortcut-modal__btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className="shortcut-modal__btn shortcut-modal__btn--primary"
              type="button"
              onClick={handleSubmit}
              disabled={loading || tenantActionLoading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
      <ViewModal
        open={Boolean(feedbackMessage)}
        message={feedbackMessage}
        showSpinner={false}
        onClose={() => setFeedbackMessage('')}
        duration={2000}
      />
    </>
  );
}

// ON THE COUNTER MODAL
// ON THE COUNTER MODAL

export function OnTheCounter({ open, onClose }) {
  const {
    tenants,
    selectedTenant,
    roomNumber,
    searchTerm,
    loading: tenantsLoading,
    error: tenantsError,
    isOpen,
    setIsOpen,
    handleTenantSelect,
    handleSearchChange,
    resetSelection
  } = useShortcutModalLogic(open);

  const [form, setForm] = useState({
    tenant: '',
    roomNumber: '',
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  const [error, setError] = useState({ field: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const dropdownRef = useRef(null);

  // Update form when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      setForm((prev) => ({
        ...prev,
        tenant: selectedTenant.full_name,
        roomNumber: selectedTenant.room_number
      }));
    }
  }, [selectedTenant]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsOpen]);

  const handleTenantInputChange = (e) => {
    const value = e.target.value;
    handleSearchChange(value);

    // Clear error for tenant field if it was the one with error
    if (error.field === 'tenant') {
      setError({ field: '', message: '' });
    }
  };

  const handleTenantInputFocus = () => {
    setIsOpen(true);
  };

  const handleTenantOptionClick = (tenant) => {
    handleTenantSelect(tenant);
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    const name = id.replace('otc-', '');

    // Only allow manual changes for amount and date
    if (name === 'amount' || name === 'paymentDate') {
      setForm((prev) => ({
        ...prev,
        [name]: value
      }));

      // Clear error for the current field if it was the one with error
      if (error.field === name) {
        setError({ field: '', message: '' });
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validation = validateOnTheCounter(form);

    if (!validation.isValid) {
      // Get the first field with an error
      const firstErrorField = Object.keys(validation.errors)[0];
      const firstErrorMessage = validation.errors[firstErrorField];

      setError({
        field: firstErrorField,
        message: firstErrorMessage
      });

      // Focus the first field with error
      const errorElement = document.getElementById(`otc-${firstErrorField}`);
      if (errorElement) {
        errorElement.focus();
      }
      return;
    }

    setSubmitting(true);
    setFeedbackMessage('Payment Submitted (UI Only)');
    setSubmitting(false);
    handleClose();
  };

  const handleClose = () => {
    setForm({
      tenant: '',
      roomNumber: '',
      amount: '',
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setError({ field: '', message: '' });
    resetSelection();
    onClose();
  };

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <div className="shortcut-modal shortcut-modal--compact">
          <h3 className="shortcut-modal__title shortcut-modal__title--small">
            Pay Rent
            <small>Over-The-Counter</small>
          </h3>

          {error.message && <div className="shortcut-modal__global-error">{error.message}</div>}

          {tenantsError && <div className="shortcut-modal__global-error">{tenantsError}</div>}

          <form onSubmit={handleSubmit}>
            <div className="shortcut-modal__stack">
              <div className="shortcut-modal__field-row" ref={dropdownRef}>
                <label htmlFor="otc-tenant">Tenant:</label>
                <div className="combobox-container">
                  <input
                    id="otc-tenant"
                    className={`shortcut-modal__input ${error.field === 'tenant' ? 'error' : ''}`}
                    type="text"
                    value={searchTerm}
                    onChange={handleTenantInputChange}
                    onFocus={handleTenantInputFocus}
                    placeholder="Search tenant"
                    disabled={tenantsLoading || submitting}
                    autoComplete="off"
                  />
                  {tenantsLoading && <div className="combobox-loading">Loading...</div>}
                  {isOpen && !tenantsLoading && tenants.length > 0 && (
                    <ul className="combobox-dropdown">
                      {tenants.map((tenant) => (
                        <li
                          key={tenant.tenant_id}
                          className={`combobox-option ${selectedTenant?.tenant_id === tenant.tenant_id ? 'selected' : ''}`}
                          onClick={() => handleTenantOptionClick(tenant)}
                        >
                          {tenant.full_name}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isOpen && !tenantsLoading && tenants.length === 0 && searchTerm && (
                    <div className="combobox-no-results">No tenants found</div>
                  )}
                </div>
              </div>

              <div className="shortcut-modal__field-row">
                <label htmlFor="otc-room">Room Number:</label>
                <input
                  id="otc-room"
                  className={`shortcut-modal__input ${error.field === 'roomNumber' ? 'error' : ''}`}
                  type="text"
                  value={form.roomNumber}
                  readOnly
                  disabled={submitting}
                />
              </div>

              <div className="shortcut-modal__field-row">
                <label htmlFor="otc-amount">Amount to Pay:</label>
                <input
                  id="otc-amount"
                  className={`shortcut-modal__input ${error.field === 'amount' ? 'error' : ''}`}
                  type="number"
                  value={form.amount}
                  onChange={handleChange}
                  disabled={submitting}
                  placeholder="Enter amount"
                />
              </div>

              <div className="shortcut-modal__field-row">
                <label htmlFor="otc-date">Payment Date:</label>
                <input
                  id="otc-date"
                  className={`shortcut-modal__input ${error.field === 'paymentDate' ? 'error' : ''}`}
                  type="date"
                  value={form.paymentDate}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="shortcut-modal__actions">
              <button type="button" className="shortcut-modal__btn shortcut-modal__btn--cancel" onClick={handleClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="shortcut-modal__btn shortcut-modal__btn--success" disabled={submitting || tenantsLoading}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
      <ViewModal
        open={Boolean(feedbackMessage)}
        message={feedbackMessage}
        showSpinner={false}
        onClose={() => setFeedbackMessage('')}
        duration={2000}
      />
    </>
  );
}
