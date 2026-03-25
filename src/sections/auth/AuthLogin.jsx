import PropTypes from 'prop-types';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Image from 'react-bootstrap/Image';
import InputGroup from 'react-bootstrap/InputGroup';
import Stack from 'react-bootstrap/Stack';

// third-party
import { useForm } from 'react-hook-form';

// project-imports
import { setAuthenticated } from 'utils/auth';
import { emailSchema, passwordSchema } from 'utils/validationSchema';
import { loginLandlord } from 'viewmodel/login-landlord';
import ViewModal from 'viewmodel/ViewModal';

// assets
import DarkLogo from 'assets/images/lowgow.svg';

// ==============================|| AUTH LOGIN FORM ||============================== //

export default function AuthLoginForm({ className }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const onSubmit = async (data) => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const result = await loginLandlord({
        email: data.email,
        password: data.password
      });

      if (!result.session) {
        throw new Error('Please confirm your email before logging in.');
      }

      setAuthenticated(true);
      reset();
      navigate('/', { replace: true });
    } catch (error) {
      setAuthenticated(false);
      setSubmitError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={`auth-card-modern ${className || ''}`}>
        <div className="auth-card-panel auth-card-panel--welcome">
          <div className="auth-brand">
            <span className="auth-brand__badge">
              <Image src={DarkLogo} alt="logo" />
            </span>
            <span className="auth-brand__name">Vesta</span>
          </div>
          <h2>Welcome Back!</h2>
          <p>Enter your landlord credentials to access your dashboard.</p>
          <div className="auth-card-panel__accent" />
        </div>
        <div className="auth-card-panel auth-card-panel--form">
          <div className="auth-form-header">
            <h3>Sign In</h3>
            <p>Access your property management hub</p>
          </div>
          <div className="auth-tabs">
            <span className="auth-tab is-active">Sign In</span>
            <Link to="/register" className="auth-tab">
              Sign Up
            </Link>
          </div>
          <Form onSubmit={handleSubmit(onSubmit)} className="auth-form-modern">
            <Form.Group className="mb-3" controlId="formEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                {...register('email', emailSchema)}
                isInvalid={!!errors.email}
                className="auth-input"
              />
              <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3" controlId="formPassword">
              <Form.Label>Password</Form.Label>
              <InputGroup className="auth-input-group">
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', passwordSchema)}
                  isInvalid={!!errors.password}
                  className="auth-input"
                />
                <Button type="button" className="auth-ghost-btn" onClick={togglePasswordVisibility}>
                  {showPassword ? <i className="ti ti-eye" /> : <i className="ti ti-eye-off" />}
                </Button>
              </InputGroup>
              <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
            </Form.Group>
            {submitError ? <div className="text-danger small mb-2">{submitError}</div> : null}

            <Stack direction="horizontal" className="auth-meta">
              <Form.Group controlId="customCheckc1">
                <Form.Check type="checkbox" label="Remember me" defaultChecked className="auth-check" />
              </Form.Group>
              <Link to="#!" className="auth-link">
                Forgot Password?
              </Link>
            </Stack>
            <Button type="submit" className="auth-submit" disabled={isSubmitting}>
              Login
            </Button>
            <div className="auth-footer">
              <span>Don&apos;t have an account?</span>
              <Link to="/register" className="auth-link">
                Create Account
              </Link>
            </div>
          </Form>
        </div>
      </div>
      <ViewModal open={isSubmitting} message="Logging in..." />
    </>
  );
}

AuthLoginForm.propTypes = { className: PropTypes.string };
