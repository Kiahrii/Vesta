import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';

// project-imports
import MainCard from 'components/MainCard';
import { applyTheme, getStoredTheme } from 'utils/theme';

// ================================|| SETTINGS PAGE ||============================== //

export default function SettingsPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getStoredTheme);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <Row>
      <Col xs={12} md={8} lg={6}>
        <MainCard title="Settings">
          <div className="mb-4">
            <h6 className="mb-3 fw-bold">Theme Preference</h6>
            <p className="text-muted mb-3">Choose your preferred color theme for the application</p>

            <div className="theme-selector p-3 border rounded" style={{ backgroundColor: 'var(--bs-gray-100)', borderColor: 'var(--bs-gray-300)' }}>
              <Form.Check
                type="radio"
                id="light-theme"
                label={
                  <div className="d-flex align-items-center gap-2">
                    <i className="ph ph-sun" />
                    <span>Light Theme</span>
                  </div>
                }
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => handleThemeChange('light')}
                className="mb-2"
              />

              <Form.Check
                type="radio"
                id="dark-theme"
                label={
                  <div className="d-flex align-items-center gap-2">
                    <i className="ph ph-moon" />
                    <span>Dark Theme</span>
                  </div>
                }
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => handleThemeChange('dark')}
                className="mb-0"
              />
            </div>

            <div className="mt-4 p-3 bg-light rounded">
              <h6 className="mb-2">Current Theme: <strong className="text-primary text-uppercase">{theme}</strong></h6>
              <p className="text-muted mb-0 small">Your theme preference is automatically saved and will persist when you return.</p>
            </div>
          </div>

          <hr />

          <div className="mt-4">
            <h6 className="mb-3 fw-bold">Other Settings</h6>
            <p className="text-muted">Additional settings and preferences can be configured here.</p>

            <Form.Check
              type="checkbox"
              id="notifications"
              label="Enable Notifications"
              defaultChecked
              className="mb-2"
            />

            <Form.Check
              type="checkbox"
              id="auto-save"
              label="Auto-save Changes"
              defaultChecked
              className="mb-2"
            />

            <Form.Check
              type="checkbox"
              id="analytics"
              label="Allow Analytics"
              defaultChecked
              className="mb-3"
            />
          </div>

          <div className="mt-4">
            <Button 
              variant="primary" 
              className="me-2"
              onClick={() => navigate(-1)}
            >
              Save Changes
            </Button>
            <Button 
              variant="outline-secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
          </div>
        </MainCard>
      </Col>

      <Col xs={12} md={8} lg={6}>
        <MainCard title="About">
          <div>
            <h6 className="mb-3 fw-bold">Application Information</h6>
            <div className="mb-3">
              <span className="text-muted">Version:</span>
              <strong className="ms-2">1.0.0</strong>
            </div>
            <div className="mb-3">
              <span className="text-muted">Last Updated:</span>
              <strong className="ms-2">February 10, 2026</strong>
            </div>
            <div className="mb-3">
              <span className="text-muted">Application:</span>
              <strong className="ms-2">Vesta Property Management</strong>
            </div>
            <hr />
            <p className="text-muted small">
              Vesta is a comprehensive property management system designed to help you manage apartments, tenants, and finances efficiently.
            </p>
          </div>
        </MainCard>
      </Col>
    </Row>
  );
}
