// react-bootstrap
import Col from 'react-bootstrap/Col';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// project-imports
import branding from 'branding.json';

// ==============================|| MAIN LAYOUT - FOOTER ||============================== //
export default function Footer() {
  return (
    <footer className="pc-footer">
      <div className="footer-wrapper container-fluid">
        <Row className="justify-content-center">
          <Col xs="auto" className="text-center">
            <p className="m-0">© 2026 Vesta. All rights reserved.</p>
          </Col>
        </Row>
      </div>
    </footer>
  );
}

