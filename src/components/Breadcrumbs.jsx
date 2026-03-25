import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// react-bootstrap
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

// project-imports
import { APP_DEFAULT_PATH } from 'config';
import navigation from 'menu-items';
import 'assets/scss/apartment-page/breadcrumb.scss';

// ==============================|| MAIN BREADCRUMB ||============================== //

export default function Breadcrumbs() {
  
  const location = useLocation();

  
const hiddenRoutes = ['/settings']; // Add any other routes you want to hide the breadcrumb on

if (hiddenRoutes.includes(location.pathname)) {
  return null;
}


  const [main, setMain] = useState({});
  const [item, setItem] = useState({});

  const getCollapse = useCallback(
    (item) => {
      if (item.children) {
        item.children.forEach((collapse) => {
          if (collapse.type === 'collapse') {
            getCollapse(collapse);
          } else if (collapse.type === 'item' && location.pathname === collapse.url) {
            setMain((prev) => ({
              ...prev,
              type: 'collapse', // Add this
              title: typeof item.title === 'string' ? item.title : undefined
            }));
            setItem((prev) => ({
              ...prev,
              type: 'item', // Add this
              title: typeof collapse.title === 'string' ? collapse.title : undefined,
              breadcrumbs: collapse.breadcrumbs !== false
            }));
          }
        });
      }
    },
    [location.pathname]
  );

  // useEffect(() => {
  //   navigation.items.forEach((navItem) => {
  //     if (navItem.type === 'group') {
  //       getCollapse(navItem);
  //     }
  //   });
  // }, [location.pathname, getCollapse]);

  useEffect(() => {
  let found = false;

  setMain({});
  setItem({});

  const search = (navItem) => {
    if (navItem.children) {
      navItem.children.forEach((collapse) => {
        if (collapse.type === 'collapse') {
          search(collapse);
        } else if (collapse.type === 'item' && location.pathname === collapse.url) {
          found = true;

          setMain({
            type: 'collapse',
            title: typeof navItem.title === 'string' ? navItem.title : undefined
          });

          setItem({
            type: 'item',
            title: typeof collapse.title === 'string' ? collapse.title : undefined,
            breadcrumbs: collapse.breadcrumbs !== false
          });
        }
      });
    }
  };

  navigation.items.forEach((navItem) => {
    if (navItem.type === 'group') {
      search(navItem);
    }
  });
}, [location.pathname]);

  let mainContent;
  let itemContent;
  let breadcrumbContent;
  let title = '';

  if (main?.type === 'collapse') {
    mainContent = (
      <Breadcrumb.Item href="#" className="text-capitalize">
        {main.title}
      </Breadcrumb.Item>
    );
  }

  if (item?.type === 'item') {
    title = item.title ?? '';
    itemContent = (
      <Breadcrumb.Item href="#" className="text-capitalize">
        {title}
      </Breadcrumb.Item>
    );

    if (item.breadcrumbs !== false) {
      breadcrumbContent = (
        // <div className="page-header">
        //   <div className="page-block">
        //     <Row className="align-items-center">
        //       <Col md={12} className="page-header-title text-capitalize text-center">
        //         <h3 className="fw-bold text-decoration-underline">{title}</h3>
        //       </Col>
        //     </Row>
        //   </div>
        // </div>

<div className="page-header page-header-underline">
  <div className="page-block">
    <Row className="align-items-center justify-content-center">
      <Col md={12} className="page-header-title text-capitalize">
        <h3 className="underline-title">{title}</h3>
      </Col>
    </Row>
  </div>
</div>

      );
    } else {
      breadcrumbContent = null;
    }
  }

  return <>{breadcrumbContent}</>;
}