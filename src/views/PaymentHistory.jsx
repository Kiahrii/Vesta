// react-bootstrap
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

// project-imports
import { MagnifyingGlass, Funnel, Export } from 'phosphor-react';
import MainCard from 'components/MainCard';
import 'assets/scss/apartment-page/past-tenants.scss';
import 'assets/scss/themes/components/_table.scss';

// ==============================|| PAYMENT HISTORY PAGE ||============================== //

export default function PaymentHistory() {
  return (
    <Row>
      <Col xl={12}>
        <MainCard>

          <div className="top-buttons">
            <div className="right-side">

              <div className="search-content">
                <MagnifyingGlass size={25} className="search-icon" />
                <input className="search-input" type="search" placeholder="Search" />
              </div>

            </div>

            <div className="left-side">
              <div className="export-btn">
                <button data-modal="addRoomModal" className="openModal export-btn"><Export size={25} />Export</button>
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Name</th>
                    <th>Room</th>
                    <th>Monthly Rent</th>
                    <th>Total Paid</th>
                    <th>Balance on Exit</th>
                    <th>Exit Reason</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>PY-001</td>
                    <td>Kath Uson</td>
                    <td>C-034</td>
                    <td>₱4,000.00</td>
                    <td>₱32,000.00</td>
                    <td>₱0</td>
                    <td>Moved to a House</td>
                  </tr>
                  <tr>
                    <td>PY-002</td>
                    <td>Dani Soriano</td>
                    <td>B-021</td>
                    <td>₱4,000.00</td>
                    <td>₱40,000.00</td>
                    <td>₱0</td>
                    <td>Moved to a House</td>
                  </tr>
                  <tr>
                    <td>PY-003</td>
                    <td>Bernard Aguilar</td>
                    <td>A-090</td>
                    <td>₱4,000.00</td>
                    <td>₱24,000.00</td>
                    <td>₱0</td>
                    <td>Moved to a House</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </MainCard>
      </Col>
    </Row>

  );
}
