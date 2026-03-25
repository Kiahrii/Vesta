// react-bootstrap
import { useMemo, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

// project-imports
import { MagnifyingGlass, Funnel, Export } from 'phosphor-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import MainCard from 'components/MainCard';
import Modal from 'layout/Modal';
import { useTenantManagement } from 'viewmodel/tenant-management';
import 'assets/scss/apartment-page/tenantManagement.scss';
import 'assets/scss/apartment-page/past-tenants.scss';
import 'assets/scss/themes/components/_table.scss';

// ==============================|| PAST TENANTS PAGE ||============================== //

export default function PastTenants() {
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

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

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  const normalize = (value) => (value || '').toString().trim().toLowerCase();
  const parseDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };
  const getMonthIndex = (value) => {
    const parsed = parseDate(value);
    return parsed ? parsed.getMonth() : null;
  };
  const getYearValue = (value) => {
    const parsed = parseDate(value);
    return parsed ? parsed.getFullYear() : null;
  };
  const formatTenantCode = (id) => `TN-${String(id ?? '').padStart(3, '0')}`;

  const pastTenants = useMemo(
    () => tenantDetails.filter((tenant) => tenant.status === 'Moved-out' || tenant.moveOutRaw),
    [tenantDetails]
  );

  const monthOptions = useMemo(() => {
    const months = new Set();
    pastTenants.forEach((tenant) => {
      const monthIndex = getMonthIndex(tenant.moveOutRaw);
      if (monthIndex !== null) {
        months.add(monthIndex);
      }
    });
    return Array.from(months)
      .sort((a, b) => a - b)
      .map((monthIndex) => ({
        value: String(monthIndex),
        label: monthNames[monthIndex]
      }));
  }, [pastTenants]);

  const yearOptions = useMemo(() => {
    const years = new Set();
    pastTenants.forEach((tenant) => {
      const yearValue = getYearValue(tenant.moveOutRaw);
      if (yearValue !== null) {
        years.add(yearValue);
      }
    });
    return Array.from(years)
      .sort((a, b) => b - a)
      .map((yearValue) => ({
        value: String(yearValue),
        label: String(yearValue)
      }));
  }, [pastTenants]);

  const filteredTenants = useMemo(() => {
    const query = normalize(searchTerm);

    return pastTenants.filter((tenant) => {
      const monthIndex = getMonthIndex(tenant.moveOutRaw);
      const monthMatch = monthFilter === 'all' || (monthIndex !== null && String(monthIndex) === monthFilter);

      const yearValue = getYearValue(tenant.moveOutRaw);
      const yearMatch = yearFilter === 'all' || (yearValue !== null && String(yearValue) === yearFilter);

      if (!monthMatch || !yearMatch) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        formatTenantCode(tenant.id),
        tenant.name,
        tenant.room,
        tenant.contact,
        tenant.moveIn,
        tenant.moveOut
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [pastTenants, monthFilter, yearFilter, searchTerm]);

  const selectedMonthLabel =
    monthFilter === 'all' ? 'Month' : monthOptions.find((option) => option.value === monthFilter)?.label || 'Month';
  const selectedYearLabel =
    yearFilter === 'all' ? 'Year' : yearOptions.find((option) => option.value === yearFilter)?.label || 'Year';

  const handleFilterSelect = (setter) => (value) => {
    setter(value);
    if (document?.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleExport = () => {
    if (filteredTenants.length === 0) {
      return;
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4'
    });

    const exportTimestamp = new Date();
    const filterSummary = [
      `Month: ${selectedMonthLabel}`,
      `Year: ${selectedYearLabel}`,
      searchTerm ? `Search: "${searchTerm}"` : 'Search: All'
    ].join(' | ');

    doc.setFontSize(20);
    doc.text('Past Tenants', 40, 40);
    doc.setFontSize(10);
    doc.text(`Exported: ${exportTimestamp.toLocaleString('en-US')}`, 40, 60);
    doc.text(filterSummary, 40, 75);

    const tableBody = filteredTenants.map((tenant) => [
      formatTenantCode(tenant.id),
      tenant.name,
      tenant.room,
      tenant.contact,
      tenant.moveIn,
      tenant.moveOut
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['Tenant ID', 'Name', 'Room', 'Contact No.', 'Move-In Date', 'Move-Out Date']],
      body: tableBody,
      styles: {
        fontSize: 9
      },
      headStyles: {
        fillColor: [46, 69, 102]
      }
    });

    const fileName = `past-tenants_${exportTimestamp
      .toISOString()
      .slice(0, 10)}_${selectedMonthLabel}_${selectedYearLabel}.pdf`
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-_\.]/g, '');

    doc.save(fileName);
  };

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
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>

                <div className="filter-status">
                  <button className="status" type="button">
                    <Funnel size={25} className="filter-icon" />
                    {selectedMonthLabel}
                  </button>
                  <div className="status-options">
                    <button type="button" onClick={() => handleFilterSelect(setMonthFilter)('all')}>
                      All
                    </button>
                    {monthOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleFilterSelect(setMonthFilter)(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-status">
                  <button className="status" type="button">
                    <Funnel size={25} className="filter-icon" />
                    {selectedYearLabel}
                  </button>
                  <div className="status-options">
                    <button type="button" onClick={() => handleFilterSelect(setYearFilter)('all')}>
                      All
                    </button>
                    {yearOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleFilterSelect(setYearFilter)(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="left-side">
                <div className="export-btn">
                  <button
                    type="button"
                    className="openModal export-btn"
                    onClick={handleExport}
                    disabled={filteredTenants.length === 0}
                  >
                    <Export size={25} />
                    Export
                  </button>
                </div>
              </div>
            </div>

            <div className="table-wrapper">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tenant ID</th>
                      <th>Name</th>
                      <th>Room</th>
                      <th>Contact No.</th>
                      <th>Move-In Date</th>
                      <th>Move-Out Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td colSpan={7}>Loading past tenants...</td>
                      </tr>
                    )}

                    {!isLoading && fetchError && (
                      <tr>
                        <td colSpan={7}>{fetchError}</td>
                      </tr>
                    )}

                    {!isLoading && !fetchError && filteredTenants.length === 0 && (
                      <tr>
                        <td colSpan={7}>No past tenants found.</td>
                      </tr>
                    )}

                    {!isLoading &&
                      !fetchError &&
                      filteredTenants.map((tenant) => (
                        <tr key={tenant.id}>
                          <td>{formatTenantCode(tenant.id)}</td>
                          <td>{tenant.name}</td>
                          <td>{tenant.room}</td>
                          <td>{tenant.contact}</td>
                          <td>{tenant.moveIn}</td>
                          <td>{tenant.moveOut}</td>
                          <td>
                            <button
                              className="openModal"
                              type="button"
                              onClick={() => openEditModal(tenant)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
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
    </>
  );
}
