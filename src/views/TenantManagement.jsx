// react-bootstrap
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

// project-imports
import React, { useState, useMemo } from 'react';
import { MagnifyingGlass, Funnel, UserPlus, UserCircle, PencilSimple } from 'phosphor-react';
import { RegisterTenantModal } from 'views/ShortcutModals';
import MainCard from 'components/MainCard';
import Modal from 'layout/Modal';
import { useTenantManagement } from 'viewmodel/tenant-management';
import 'assets/scss/apartment-page/tenantManagement.scss';
import 'assets/scss/themes/components/_table.scss';

// ==============================|| TENANT MANAGEMENT PAGE ||============================== //

export default function TenantManagement() {
  const [RegisterOpen, setRegisterOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const {
    tenantDetails,
    isLoading,
    fetchError,
    isEditOpen,
    editForm,
    formError,
    isSaving,
    openEditModal,
    closeEditModal,
    updateEditField,
    saveEdit
  } = useTenantManagement();

  const toggleCard = (tenantId) => {
    setActiveCardId((previous) => (previous === tenantId ? null : tenantId));
  };

  const filteredTenants = useMemo(() => {
    return tenantDetails.filter((tenant) => {
      const matchesSearch = searchTerm === '' || 
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.contact.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        tenant.status.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
  }, [tenantDetails, searchTerm, statusFilter]);

  return (
    <>
      <Row>
        <Col xl={12}>
          <MainCard>
            <div className="top-buttons">
              <div className="right-side">
                <div className="search-content">
                  <MagnifyingGlass size={25} className="search-icon" />
                  <input 
                    className="search-input" 
                    type="search" 
                    placeholder="Search tenant name..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>

                <div className="filter-status">
                  <button 
                    className="status"
                    onClick={() => setStatusFilter(statusFilter === 'all' ? 'occupied' : 'all')}
                  >
                    <Funnel size={25} className="filter-icon" />
                    {statusFilter === 'all' ? 'All Status' : statusFilter === 'occupied' ? 'Active' : 'Moved-Out'}
                  </button>
                  <div className="status-options">
                    <a 
                      href="#" 
                      onClick={(event) => {
                        event.preventDefault();
                        setStatusFilter('all');
                      }}
                    >
                      All
                    </a>
                    <a 
                      href="#" 
                      onClick={(event) => {
                        event.preventDefault();
                        setStatusFilter('occupied');
                      }}
                    >
                      Active
                    </a>
                    <a 
                      href="#" 
                      onClick={(event) => {
                        event.preventDefault();
                        setStatusFilter('available');
                      }}
                    >
                      Moved-Out
                    </a>
                  </div>
                </div>
              </div>

              <div className="left-side">
                <div className="add-room">
                  <button onClick={() => setRegisterOpen(true)} className="add-room-btn">
                    <UserPlus size={28} />
                    Register Tenant
                  </button>
                </div>
              </div>
            </div>

            {/* TENANT FLIP CARD */}
            <div className="tenant-card-wrapper">
              {isLoading ? <p>Loading tenant details...</p> : null}
              {!isLoading && fetchError ? <p className="text-danger mb-0">{fetchError}</p> : null}
              {!isLoading && !fetchError && filteredTenants.length === 0 ? <p>No tenant details found.</p> : null}
              {!isLoading && !fetchError && filteredTenants.length > 0
                ? filteredTenants.map((tenant) => (
                  <div className="tenant-card" key={tenant.id}>
                    <div
                      className={`tenant-card-inner ${activeCardId === tenant.id ? 'is-flipped' : ''}`}
                      onClick={() => toggleCard(tenant.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleCard(tenant.id);
                        }
                      }}
                    >
                      {/* FRONT */}
                      <div className="tenant-card-front">
                        <button
                          className="tenant-card-edit"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(tenant);
                          }}
                          onKeyDown={(event) => {
                            event.stopPropagation();
                          }}
                          aria-label={`Edit ${tenant.name}`}
                        >
                          <PencilSimple size={18} />
                        </button>
                        <h3 className="front-header">
                          {tenant.profilePhoto ? (
                            <img src={tenant.profilePhoto} alt={`${tenant.name} profile`} className="tenant-profile-photo" />
                          ) : (
                            <UserCircle size={80} />
                          )}
                          <span>{tenant.name}</span>
                        </h3>
                        <p className="tenant-p">
                          Status: <span className={tenant.status === 'Active' ? 'active' : 'moved-out'}>{tenant.status}</span>
                        </p>
                      </div>

                      {/* BACK */}
                      <div className="tenant-card-back">
                        <h4 className="title-tenant">Tenant Details</h4>

                        <div className="tenant-info">
                          <span>
                            <b>Room: </b>
                          </span>
                          <br></br>
                          {tenant.room}
                        </div>
                        <div className="tenant-info">
                          <span>
                            <b>Contact: </b>
                          </span>
                          <br></br>
                          {tenant.contact}
                        </div>
                        <div className="tenant-info">
                          <span>
                            <b>Move-in: </b>
                          </span>
                          <br></br>
                          {tenant.moveIn}
                        </div>
                        <div className="tenant-info">
                          <span>
                            <b>Move-out: </b>
                          </span>
                          <br></br>
                          {tenant.moveOut}
                        </div>
                        <div className="tenant-info">
                          <span>
                            <b>Emergency Contact: </b>
                          </span>
                          <br></br>
                          {tenant.emergencyContact}
                        </div>
                        <div className="tenant-info">
                          <span>
                            <b>Emergency No.: </b>
                          </span>
                          <br></br>
                          {tenant.emergencyNo}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
                : null}
            </div>
          </MainCard>
        </Col>
      </Row>

      <Modal open={isEditOpen} onClose={closeEditModal}>
        <h3>Edit Tenant</h3>
        <div className="register-container">
          <div className="register-grid">
            <div>
              <label htmlFor="tenant-edit-name">Name</label>
              <input
                id="tenant-edit-name"
                className="register-field-input"
                type="text"
                value={editForm.name}
                onChange={(event) => updateEditField('name', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="tenant-edit-room">Room</label>
              <input
                id="tenant-edit-room"
                className="register-field-input"
                type="text"
                value={editForm.room}
                onChange={(event) => updateEditField('room', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="tenant-edit-contact">Contact</label>
              <input
                id="tenant-edit-contact"
                className="register-field-input"
                type="text"
                value={editForm.contact}
                onChange={(event) => updateEditField('contact', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="tenant-edit-movein">Move-In Date</label>
              <input
                id="tenant-edit-movein"
                className="register-field-input"
                type="date"
                value={editForm.moveInDate}
                onChange={(event) => updateEditField('moveInDate', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="tenant-edit-moveout">Move-Out Date</label>
              <input
                id="tenant-edit-moveout"
                className="register-field-input"
                type="date"
                value={editForm.moveOutDate}
                onChange={(event) => updateEditField('moveOutDate', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="tenant-edit-emergency">Emergency Contact</label>
              <input
                id="tenant-edit-emergency"
                className="register-field-input"
                type="text"
                value={editForm.emergencyContact}
                onChange={(event) => updateEditField('emergencyContact', event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="tenant-edit-emergency-no">Emergency Contact No.</label>
              <input
                id="tenant-edit-emergency-no"
                className="register-field-input"
                type="text"
                value={editForm.emergencyContactNo}
                onChange={(event) => updateEditField('emergencyContactNo', event.target.value)}
              />
            </div>
          </div>
          {formError ? <p className="text-danger mb-0">{formError}</p> : null}
          <div className="act-btn2">
            <button className="cancel" type="button" onClick={closeEditModal} disabled={isSaving}>
              Cancel
            </button>
            <button className="register-btn" type="button" onClick={saveEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <RegisterTenantModal open={RegisterOpen} onClose={() => setRegisterOpen(false)} />
    </>
  );
}