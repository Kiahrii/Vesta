import { Link } from 'react-router-dom';

// react-bootstrap
import Image from 'react-bootstrap/Image';

// project-import
import { APP_DEFAULT_PATH } from 'config';

// assets
import logo from 'assets/images/lowgow.svg';

export const DrawerHeader = () => {
  return (
    <div className="m-header">
      <Image src={logo} fluid className="logo logo-lg" alt="logo" />
    </div>
  );
};
