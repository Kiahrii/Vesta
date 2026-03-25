// project-imports
import AuthRegisterForm from 'sections/auth/AuthRegister';
import 'assets/scss/apartment-page/_authentication.scss';

// ===========================|| AUTH - REGISTER PAGE ||=========================== //

export default function RegisterPage() {
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
            <AuthRegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
}
