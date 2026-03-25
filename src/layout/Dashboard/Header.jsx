import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import Image from 'react-bootstrap/Image';
import Nav from 'react-bootstrap/Nav';
import Stack from 'react-bootstrap/Stack';

// project-imports
import MainCard from 'components/MainCard';
import SimpleBarScroll from 'components/third-party/SimpleBar';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';
import { supabase } from 'model/supabaseclient.js';
import { setAuthenticated } from 'utils/auth';
import { useLandlordProfile } from 'viewmodel/landlord-profile.js';
import { useNotifications } from 'viewmodel/notifications.js';

// assets
import Img2 from 'assets/images/user/avatar-2.png';
import Img4 from 'assets/images/user/avatar-4.png';
import 'assets/scss/apartment-page/notifications.scss';

// =============================|| MAIN LAYOUT - HEADER ||============================== //

function Header() {
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;
  const navigate = useNavigate();
  const { profile: landlordProfile, loading: landlordLoading } = useLandlordProfile();
  const {
    loading: notificationsLoading,
    error: notificationsError,
    notifications,
    refreshNotifications,
    markNotificationReadLocal,
    markAllReadLocal
  } = useNotifications();

  const landlordName = landlordProfile?.name || (landlordLoading ? 'Loading...' : 'Landlord');
  const landlordEmail = landlordProfile?.email || '';
  const landlordAvatar = landlordProfile?.photo || Img2;

  const notificationAvatars = {
    payment: Img2,
    report: Img4
  };

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  const handleNotificationClick = async (notification) => {
    const notificationId = Number(notification?.notification_id);
    if (!Number.isFinite(notificationId) || notificationId <= 0 || notification.is_read) {
      return;
    }

    markNotificationReadLocal(notificationId);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('notification_id', notificationId);

    if (error) {
      refreshNotifications();
    }
  };

  const handleMarkAllRead = async (event) => {
    event.preventDefault();

    if (unreadCount === 0) {
      return;
    }

    const tenantIds = Array.from(
      new Set(
        notifications
          .map((notification) => Number(notification.tenant_id))
          .filter((tenantIdValue) => Number.isFinite(tenantIdValue) && tenantIdValue > 0)
      )
    );
    const tenantId = tenantIds.length === 1 ? tenantIds[0] : null;
    markAllReadLocal(tenantId);

    let query = supabase.from('notifications').update({ is_read: true }).eq('is_read', false);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    } else {
      const unreadIds = notifications
        .filter((notification) => !notification.is_read && notification.notification_id)
        .map((notification) => Number(notification.notification_id))
        .filter((notificationId) => Number.isFinite(notificationId) && notificationId > 0);

      if (unreadIds.length === 0) {
        return;
      }

      query = supabase.from('notifications').update({ is_read: true }).in('notification_id', unreadIds);
    }

    const { error } = await query;
    if (error) {
      refreshNotifications();
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    navigate('/login', { replace: true });
  };

  return (
    <header className="pc-header">
      <div className="header-wrapper">
        <div className="me-auto pc-mob-drp">
          <Nav className="list-unstyled">
            <Nav.Item className="pc-h-item pc-sidebar-collapse">
              <Nav.Link
                as={Link}
                to="#"
                className="pc-head-link ms-0"
                id="sidebar-hide"
                onClick={() => {
                  handlerDrawerOpen(!drawerOpen);
                }}
              >
                <i className="ph ph-list" />
              </Nav.Link>
            </Nav.Item>

            <Nav.Item className="pc-h-item pc-sidebar-popup">
              <Nav.Link as={Link} to="#" className="pc-head-link ms-0" id="mobile-collapse" onClick={() => handlerDrawerOpen(!drawerOpen)}>
                <i className="ph ph-list" />
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>
        <div className="ms-auto">
          <Nav className="list-unstyled">
            {/* NOTIFICATION BELL - 36px PERFECT SIZE */}
            <Dropdown className="pc-h-item" align="end">
              <Dropdown.Toggle 
                className="pc-head-link me-0 arrow-none notification-bell-toggle" 
                variant="link" 
                id="notification-dropdown"
              >
                <i className="ph ph-bell" style={{ fontSize: '36px', width: '36px', height: '36px' }} />
                {unreadCount > 0 ? (
                  <span className="badge bg-success pc-h-badge notification-badge">{unreadCount}</span>
                ) : null}
              </Dropdown.Toggle>

              <Dropdown.Menu className="dropdown-notification pc-h-dropdown" style={{ width: '500px' }}>
                <Dropdown.Header className="d-flex align-items-center justify-content-between">
                  <h5 className="m-0">Notifications</h5>
                  <Link className="btn btn-link btn-sm" to="#" onClick={handleMarkAllRead}>
                    Mark all read
                  </Link>
                </Dropdown.Header>
                <SimpleBarScroll style={{ maxHeight: '320px' }}>
                  <div className="dropdown-body text-wrap position-relative">
                    {notificationsLoading ? <p className="text-muted mb-0">Loading notifications...</p> : null}
                    {!notificationsLoading && notificationsError ? <p className="text-danger mb-0">{notificationsError}</p> : null}
                    {!notificationsLoading && !notificationsError && notifications.length === 0 ? (
                      <p className="text-muted mb-0">No notifications yet.</p>
                    ) : null}
                    {!notificationsLoading &&
                      !notificationsError &&
                      notifications.map((notification, index) => (
                        <React.Fragment key={notification.notification_id ?? notification.id}>
                          {index === 0 || notifications[index - 1].date !== notification.date ? (
                            <p className="text-span">{notification.date}</p>
                          ) : null}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleNotificationClick(notification)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleNotificationClick(notification);
                              }
                            }}
                          >
                            <MainCard
                              className={`notification-item mb-1 ${
                                notification.is_read ? 'notification-read' : 'notification-unread'
                              }`}
                            >
                              <Stack direction="horizontal" gap={2}>
                                <Image
                                  className="img-radius avatar rounded-0 notification-avatar"
                                  src={notification.avatar || notificationAvatars[notification.type] || Img2}
                                  alt="Notification avatar"
                                />
                                <div>
                                  {notification.time ? <span className="float-end text-sm text-muted">{notification.time}</span> : null}
                                  <h5 className="text-body mb-2">{notification.title}</h5>
                                  <p className="mb-0">{notification.description}</p>
                                </div>
                              </Stack>
                            </MainCard>
                          </div>
                        </React.Fragment>
                      ))}
                  </div>
                </SimpleBarScroll>

                <div className="text-center py-2">
                  <Link to="#!" className="link-danger">
                    Clear all Notifications
                  </Link>
                </div>
              </Dropdown.Menu>
            </Dropdown>

            {/* USER PROFILE ICON - 36px PERFECT SIZE */}
            <Dropdown className="pc-h-item" align="end">
              <Dropdown.Toggle
                className="pc-head-link arrow-none me-0 user-profile-toggle"
                variant="link"
                id="user-profile-dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <i className="ph ph-user-circle" style={{ fontSize: '36px', width: '36px', height: '36px' }} />
              </Dropdown.Toggle>

              <Dropdown.Menu className="dropdown-user-profile pc-h-dropdown p-0 overflow-hidden">
                <Dropdown.Header className="bg-primary">
                  <Stack direction="horizontal" gap={3} className="my-2">
                    <div className="flex-shrink-0">
                      <Image src={landlordAvatar} alt="user-avatar" className="user-avatar wid-35" roundedCircle />
                    </div>
                    <Stack gap={1}>
                      <h6 className="text-black mb-0">{landlordName}</h6>
                      <span className="text-white text-opacity-75">{landlordEmail}</span>
                    </Stack>
                  </Stack>
                </Dropdown.Header>

                <div className="dropdown-body">
                  <div className="profile-notification-scroll position-relative" style={{ maxHeight: 'calc(100vh - 225px)' }}>
                    <Dropdown.Item as={Link} to="/profile" className="justify-content-start">
                      <i className="ph ph-user-circle me-2" />
                      Profile
                    </Dropdown.Item>
                    <Dropdown.Item as={Link} to="/settings" className="justify-content-start">
                      <i className="ph ph-gear me-2" />
                      Settings
                    </Dropdown.Item>
                    <div className="d-grid my-2">
                      <Button onClick={handleLogout}>
                        <i className="ph ph-sign-out align-middle me-2" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </div>
      </div>
    </header>
  );
}

export default Header;