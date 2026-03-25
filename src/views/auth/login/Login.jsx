// project-imoports
import AuthLoginForm from 'sections/auth/AuthLogin';
import 'assets/scss/apartment-page/_authentication.scss';

// ===========================|| AUTH - LOGIN PAGE ||=========================== //

export default function LoginPage() {
  return (
    <div className="auth-main auth-main-modern">
      <div className="auth-wrapper v1 auth-wrapper-modern">
        <div className="auth-form">
          <div className="position-relative auth-shell">
            <div className="auth-bg auth-bg-modern">
              <span className="orb orb-1" />
              <span className="orb orb-2" />
              <span className="orb orb-3" />
              <span className="orb orb-4" />
              <span className="orb orb-5" />
            </div>
            <AuthLoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
