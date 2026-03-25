// react-bootstrap
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

// project-imports
import Modal from 'layout/Modal';
import React, { useEffect, useMemo, useState } from 'react';
import apartment_door from 'assets/images/apartment_door.jpg';
import { MagnifyingGlass, Funnel, Plus, Door, NotePencil } from 'phosphor-react';
import { AddRoomModal, UpdateRoomModal } from 'views/ShortcutModals.jsx';
import MainCard from 'components/MainCard';
import { getRooms, getRoomTenants } from 'viewmodel/addroom.js';
import 'assets/scss/apartment-page/roomManagement.scss';
import 'assets/scss/themes/components/_table.scss';

// ==============================|| ROOM MANAGEMENT PAGE ||============================== //

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount);
};

export default function RoomManagementPage() {
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [viewRoomOpen, setViewRoomOpen] = useState(false);
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchRoomDetails = async () => {
    setLoading(true);
    setFetchError('');

    try {
      const loadedRooms = await getRooms();
      const tenantRows = await getRoomTenants(loadedRooms);
      const tenantsByRoomId = tenantRows.reduce((accumulator, tenant) => {
        if (!accumulator[tenant.room_id]) {
          accumulator[tenant.room_id] = [];
        }
        accumulator[tenant.room_id].push(tenant.full_name);
        return accumulator;
      }, {});

      const normalizedRooms = loadedRooms.map((room) => ({
        ...room,
        tenants: tenantsByRoomId[room.room_id] ?? []
      }));

      setRooms(normalizedRooms);

      if (selectedRoom?.room_id) {
        const updatedRoom = normalizedRooms.find((room) => room.room_id === selectedRoom.room_id) ?? null;
        setSelectedRoom(updatedRoom);
      }
    } catch (error) {
      setFetchError(error.message || 'Failed to load room details.');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomDetails();
  }, []);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = room.room_no.toLowerCase().includes(searchValue.trim().toLowerCase());
      const matchesStatus = statusFilter === 'All' || room.occupancy_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchValue, statusFilter]);

  const metrics = useMemo(() => {
    const total = rooms.length;
    const available = rooms.filter((room) => room.occupancy_status === 'Available').length;
    const occupied = rooms.filter((room) => room.occupancy_status === 'Occupied').length;
    const underMaintenance = rooms.filter((room) => room.occupancy_status === 'Under Maintenance').length;

    return [
      { 
        title: 'Total Rooms', 
        value: total, 
        icon: 'ph ph-door-open', 
        bgColor: '#F49C75',
        textColor: '#000000'
      },
      { 
        title: 'Available', 
        value: available, 
        icon: 'ph ph-check-circle', 
        bgColor: '#A7CBA7', 
        textColor: '#000000'
      },
      { 
        title: 'Occupied', 
        value: occupied, 
        icon: 'ph ph-users', 
        bgColor: '#EFE480', 
        textColor: '#000000'
      },
      { 
        title: 'Under Maintenance', 
        value: underMaintenance, 
        icon: 'ph ph-wrench', 
        bgColor: '#9CA3AF', 
        textColor: '#000000'
      }
    ];
  }, [rooms]);

  const openRoom = (room) => {
    setSelectedRoom(room);
    setViewRoomOpen(true);
  };

  const tenantSlots = useMemo(() => {
    if (!selectedRoom) {
      return [];
    }

    return Array.from({ length: selectedRoom.room_capacity || 1 }, (_, index) => selectedRoom.tenants[index] || '-');
  }, [selectedRoom]);

  const handleSaved = async () => {
    await fetchRoomDetails();
  };

  return (
    <>
      <Row style={{ fontFamily: "'Arial', sans-serif" }}>
        {/* DASHBOARD-STYLE METRICS - ARIAL FONT */}
        <Row className="g-3 mb-4">
          {metrics.map((metric, index) => (
            <Col key={`metric-${index}`} xs={12} sm={6} md={6} lg={3}>
              <MainCard 
                className="h-100 metric-card p-4"
                style={{ 
                  transition: 'all 0.3s ease',
                  borderRadius: '15px', // Updated to 15px
                  boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontFamily: "'Arial', sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
                }}
              >
                <div className="text-center" style={{ fontFamily: "'Arial', sans-serif" }}>
                  <div className="mb-4">
                    <div 
                      className="metric-icon d-inline-flex align-items-center justify-content-center rounded-circle mx-auto"
                      style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: metric.bgColor,
                        color: 'black', // Fixed to black for better contrast
                        fontSize: '36px',
                        border: '4px solid',
                        borderColor: metric.bgColor,
                        boxShadow: `0 8px 25px ${metric.bgColor}20`,
                        transition: 'all 0.3s ease',
                        borderRadius: '15px'
                      }}
                    >
                      <i className={metric.icon} />
                    </div>
                  </div>
                  <h6 
                    className="text-black text-uppercase mb-3 metric-title"
                    style={{ 
                      fontSize: '18px', // Fixed to match dashboard
                      letterSpacing: '1px',
                      fontWeight: '700',
                      color: '#6B7280',
                      fontFamily: "'Arial', sans-serif"
                    }}
                  >
                    {metric.title}
                  </h6>
                  <h2 
                    className="fw-bold mb-0 metric-value"
                    style={{ 
                      fontSize: '32px',
                      color: metric.textColor || '#1F2937',
                      fontWeight: '800',
                      lineHeight: 1.1,
                      fontFamily: "'Arial', sans-serif"
                    }}
                  >
                    {metric.value}
                  </h2>
                </div>
              </MainCard>
            </Col>
          ))}
        </Row>

        <Col xl={12}>
          <MainCard style={{ fontFamily: "'Arial', sans-serif" }}>
            <div className="top-buttons-rm">
              <div className="right-side">
                <div className="search-content-rm">
                  <MagnifyingGlass size={25} className="search-icon-rm" />
                  <input
                    className="search-input-rm"
                    type="search"
                    placeholder="Search room number"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    style={{ fontFamily: "'Arial', sans-serif" }}
                  />
                </div>

                <div className="filter-occupancy">
                  <button className="occupancy" style={{ fontFamily: "'Arial', sans-serif" }}>
                    <Funnel size={25} className="filter-icon" />
                    {statusFilter}
                  </button>
                  <div className="occupancy-options">
                    <a href="#" onClick={(event) => { event.preventDefault(); setStatusFilter('All'); }} style={{ fontFamily: "'Arial', sans-serif" }}>
                      All
                    </a>
                    <a href="#" onClick={(event) => { event.preventDefault(); setStatusFilter('Occupied'); }} style={{ fontFamily: "'Arial', sans-serif" }}>
                      Occupied
                    </a>
                    <a href="#" onClick={(event) => { event.preventDefault(); setStatusFilter('Available'); }} style={{ fontFamily: "'Arial', sans-serif" }}>
                      Available
                    </a>
                    <a href="#" onClick={(event) => { event.preventDefault(); setStatusFilter('Under Maintenance'); }} style={{ fontFamily: "'Arial', sans-serif" }}>
                      Under Maintenance
                    </a>
                  </div>
                </div>
              </div>

              <div className="left-side">
                <div className="add-room">
                  <button className="add-room-btn" onClick={() => setAddRoomOpen(true)} style={{ fontFamily: "'Arial', sans-serif" }}>
                    <Plus size={25} />
                    Add Room
                  </button>
                </div>
              </div>
            </div>

            {loading ? <p style={{ fontFamily: "'Arial', sans-serif" }}>Loading room details...</p> : null}
            {!loading && fetchError ? <p className="text-danger mb-0" style={{ fontFamily: "'Arial', sans-serif" }}>{fetchError}</p> : null}
            {!loading && !fetchError && filteredRooms.length === 0 ? <p style={{ fontFamily: "'Arial', sans-serif" }}>No rooms found.</p> : null}

            {!loading && !fetchError && filteredRooms.length > 0 ? (
              <div className="container-wrapper-rm">
                <Row className="g-4">
                  {filteredRooms.map((room) => (
                    <Col key={room.room_id} xs={12} md={6} xl={4}>
                      <div className="room-card">
                        <img src={room.photo || apartment_door} alt={`Room ${room.room_no}`} className="apartment_door" />
                        <button className="room-btn" onClick={() => openRoom(room)} style={{ fontFamily: "'Arial', sans-serif" }}>
                          <Door size={25} />
                          {room.room_no}
                        </button>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            ) : null}
          </MainCard>
        </Col>
      </Row>

      <AddRoomModal
        open={addRoomOpen}
        onClose={() => setAddRoomOpen(false)}
        onSaved={async () => {
          await handleSaved();
          setAddRoomOpen(false);
        }}
      />

      <Modal open={viewRoomOpen} onClose={() => setViewRoomOpen(false)}>
        {selectedRoom ? (
          <div className="modal-container" style={{ fontFamily: "'Arial', sans-serif" }}>
            <div className="modal-content">
              <h2 className="title" style={{ fontFamily: "'Arial', sans-serif" }}>{selectedRoom.room_no}</h2>
              <p className="description" style={{ fontFamily: "'Arial', sans-serif" }}>
                <i>Occupancy Status: {selectedRoom.occupancy_status}</i>
              </p>
              <div className="otc-field">
                {tenantSlots.map((tenantName, index) => (
                  <React.Fragment key={`${selectedRoom.room_id}-${index}`}>
                    <label htmlFor={`tenant-${index}`} style={{ fontFamily: "'Arial', sans-serif" }}>Tenant {index + 1}:</label>
                    <input id={`tenant-${index}`} className="otc-field-input" type="text" value={tenantName} readOnly style={{ fontFamily: "'Arial', sans-serif" }} />
                  </React.Fragment>
                ))}
              </div>
              <div className="otc-field">
                <label htmlFor="monthly-rent" style={{ fontFamily: "'Arial', sans-serif" }}>Monthly Rent:</label>
                <input id="monthly-rent" className="otc-field-input" type="text" value={formatCurrency(selectedRoom.monthly_rent)} readOnly style={{ fontFamily: "'Arial', sans-serif" }} />
              </div>
              <div className="otc-field">
                <label htmlFor="room-capacity" style={{ fontFamily: "'Arial', sans-serif" }}>Room Capacity:</label>
                <input id="room-capacity" className="otc-field-input" type="text" value={selectedRoom.room_capacity} readOnly style={{ fontFamily: "'Arial', sans-serif" }} />
              </div>

              <div className="act-btn2">
                <button className="close" onClick={() => setViewRoomOpen(false)} style={{ fontFamily: "'Arial', sans-serif" }}>
                  Close
                </button>
                <button
                  className="edit"
                  onClick={() => {
                    setViewRoomOpen(false);
                    setEditRoomOpen(true);
                  }}
                  style={{ fontFamily: "'Arial', sans-serif" }}
                >
                  <NotePencil size={16} />
                  Edit
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <UpdateRoomModal
        open={editRoomOpen}
        onClose={() => setEditRoomOpen(false)}
        room={selectedRoom}
        onSaved={async () => {
          await handleSaved();
        }}
      />
    </>
  );
}