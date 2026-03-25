// react-bootstrap
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

// project-imports
import MainCard from 'components/MainCard';
import { PieChart, EarningChart } from 'sections/dashboard/default';
import { useMemo, useState } from 'react'
import { RegisterTenantModal, AddRoomModal, OnTheCounter } from 'views/ShortcutModals';
import { useDashboardMetrics } from 'viewmodel/dashboard.js';

// ================================|| DASHBOARD - DEFAULT ||============================== //

export default function DefaultPage() {
  const [RegisterOpen, setRegisterOpen] = useState(false)
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [payRent, setPayRent] = useState(false);
  const { loading, error, metrics: dashboardMetrics, paymentOverview } = useDashboardMetrics();

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
      }),
    []
  );

  const formatMoney = (value) => currencyFormatter.format(Number(value) || 0);

  // FIXED METRICS - ENSURE ROOMS ALWAYS SHOW
  const metrics = useMemo(
    () => [
      {
        title: 'Total Rooms',
        value: loading ? '...' : (dashboardMetrics?.totalRooms || 0),
        icon: 'ph ph-door-open',
        bgColor: '#F49C75',
        textColor: '#000000'
      },
      {
        title: 'Total Tenants',
        value: loading ? '...' : (dashboardMetrics?.totalTenants || 0),
        icon: 'ph ph-user-plus',
        bgColor: '#A7CBA7',
        textColor: '#000000'
      },
      {
        title: 'Total Rent',
        value: loading ? '₱0' : formatMoney(dashboardMetrics?.totalRent),
        icon: 'ph ph-money-wavy',
        bgColor: '#EFE480',
        textColor: '#000000'
      },
      {
        title: 'Pending Reports',
        value: loading ? '...' : (dashboardMetrics?.pendingReports || 0),
        icon: 'ph ph-exclamation-mark',
        bgColor: '#ca0909',
        textColor: '#000000'
      }
    ],
    [dashboardMetrics, formatMoney, loading]
  );

  // DEBUG: Log metrics to console to check data
  console.log('Dashboard Metrics:', { loading, dashboardMetrics, paymentOverview });

  return (
      <div className="dashboard-container" style={{ fontFamily: "'Arial', sans-serif" }}>
        {/* SHORTCUT NAVIGATION - MINIMIZED BORDERS */}
        <Row className="g-2 mb-4 shortcut-navigation">
          <Col xs={6} sm={6} md={4} lg={3}>
            <button
              className="btn w-100 h-100 py-3 shortcut-btn"
              onClick={() => setAddRoomOpen(true)}
              style={{
                backgroundColor: '#F49C75',
                border: '1px solid transparent', // Minimized border
                color: '#000000',
                borderRadius: '15px',
                fontFamily: "'Arial', sans-serif",
                fontWeight: '500',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(244, 156, 117, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-4px)';
                e.target.style.boxShadow = '0 8px 25px rgba(244, 156, 117, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(244, 156, 117, 0.3)';
              }}
            >
              <i className="ph ph-door-open me-2" style={{ fontSize: '28px' }} />
              <div>
                <strong>Add Room</strong>
              </div>
            </button>
          </Col>
        
        <Col xs={6} sm={6} md={4} lg={3}>
          <button
            className="btn w-100 h-100 py-3 shortcut-btn"
            onClick={() => setRegisterOpen(true)}
            style={{
              backgroundColor: '#A7CBA7',
              border: '1px solid transparent', // Minimized border
              color: '#000000',
              borderRadius: '15px',
              fontFamily: "'Arial', sans-serif",
              fontWeight: '500',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(167, 203, 167, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-4px)';
              e.target.style.boxShadow = '0 8px 25px rgba(167, 203, 167, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(167, 203, 167, 0.3)';
            }}
          >
            <i className="ph ph-user-plus me-2" style={{ fontSize: '28px' }} />
            <div>
              <strong>Register Tenant</strong>
            </div>
          </button>
        </Col>
        <Col xs={6} sm={6} md={4} lg={3}>
          <button
            className="btn w-100 h-100 py-3 shortcut-btn"
            onClick={() => setPayRent(true)}
            style={{
              backgroundColor: '#EFE480',
              border: '1px solid transparent', // Minimized border
              color: '#000000',
              borderRadius: '15px',
              fontFamily: "'Arial', sans-serif",
              fontWeight: '500',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(239, 228, 128, 0.4)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-4px)';
              e.target.style.boxShadow = '0 8px 25px rgba(239, 228, 128, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(239, 228, 128, 0.4)';
            }}
          >
            <i className="ph ph-wallet me-2" style={{ fontSize: '28px' }} />
            <div>
              <strong>On The Counter</strong>
            </div>
          </button>
        </Col>
        <Col xs={6} sm={6} md={4} lg={3}>
          <button
            className="btn w-100 h-100 py-3 shortcut-btn"
            disabled
            style={{
              backgroundColor: '#9CA3AF',
              border: '1px solid transparent', // Minimized border
              color: '#000000',
              borderRadius: '15px',
              fontFamily: "'Arial', sans-serif",
              fontWeight: '500',
              opacity: 0.7
            }}
          >
            <i className="ph ph-chart-line-up me-2" style={{ fontSize: '28px' }} />
            <div>
              <strong>View Reports</strong>
            </div>
          </button>
        </Col>
    </Row>

      {/* Rest of your component remains the same */ }
  <Row className="g-3 mb-4">
    {metrics.map((metric, index) => (
      <Col key={`metric-${index}`} xs={12} sm={6} md={6} lg={3}>
        <MainCard
          className="h-100 metric-card p-4"
          style={{
            transition: 'all 0.3s ease',
            borderRadius: '15px',
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
                  color: 'black',
                  fontSize: '34px',
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
                fontSize: '16px',
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
                fontSize: '24px',
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

  {
    error && (
      <div className="alert alert-danger mb-4" role="alert" style={{ fontFamily: "'Arial', sans-serif" }}>
        <i className="ph ph-exclamation-triangle me-2" />
        {error}
      </div>
    )
  }

  {/* Charts Row */ }
  <Row className="g-4">
    <Col xs={12} lg={6}>
      <PieChart series={paymentOverview.series} labels={paymentOverview.labels} />
    </Col>
    <Col xs={12} lg={6}>
      <EarningChart totalEarnings={dashboardMetrics.totalEarnings} loading={loading} />
    </Col>
  </Row>

  {/* MODALS */ }
      <AddRoomModal open={addRoomOpen} onClose={() => setAddRoomOpen(false)} onSaved={() => window.location.reload()} />
      <RegisterTenantModal open={RegisterOpen} onClose={() => setRegisterOpen(false)} />
      <OnTheCounter open={payRent} onClose={() => setPayRent(false)} />
    </div >
  );
}