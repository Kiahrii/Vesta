import PropTypes from 'prop-types';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// react-bootstrap
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Image from 'react-bootstrap/Image';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Stack from 'react-bootstrap/Stack';

// third-party
import { useForm } from 'react-hook-form';

// project-imports
import { confirmPasswordSchema, emailSchema, firstNameSchema, lastNameSchema, passwordSchema } from 'utils/validationSchema';
import { registerLandlord } from 'viewmodel/register-landlord';
import ViewModal from 'viewmodel/ViewModal';

// assets
import DarkLogo from 'assets/images/logo-dark.svg';

// ==============================|| AUTH REGISTER FORM ||============================== //

export default function AuthRegisterForm({ className }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
    clearErrors
  } = useForm();

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError('confirmPassword', {
        type: 'manual',
        message: 'Both Password must be match!'
      });
      return;
    }

    clearErrors('confirmPassword');
    setSubmitError('');
    setSubmitSuccess('');
    setIsSubmitting(true);

    try {
      const result = await registerLandlord({
        first_name: data.firstName,
        middle_name: '',
        last_name: data.lastName,
        email: data.email,
        password: data.password
      });

      reset();

      if (result.needsEmailConfirmation) {
        setSubmitSuccess('Registration successful. Please confirm your email before logging in.');
      } else {
        navigate('/login', { replace: true });
      }
    } catch (error) {
      setSubmitError(error.message || 'Registration failed. Please try again.');
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
          <h2>Create Account</h2>
          <p>Set up your landlord profile to manage properties with ease.</p>
          <div className="auth-card-panel__accent" />
        </div>
        <div className="auth-card-panel auth-card-panel--form">
          <div className="auth-form-header">
            <h3>Sign Up</h3>
            <p>Create your landlord credentials</p>
          </div>
          <div className="auth-tabs">
            <Link to="/login" className="auth-tab">
              Sign In
            </Link>
            <span className="auth-tab is-active">Sign Up</span>
          </div>
          <Form onSubmit={handleSubmit(onSubmit)} className="auth-form-modern">
            <Row className="auth-row">
              <Col sm={6}>
                <Form.Group className="mb-3" controlId="formFirstName">
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="First name"
                    {...register('firstName', firstNameSchema)}
                    isInvalid={!!errors.firstName}
                    className="auth-input"
                  />
                  <Form.Control.Feedback type="invalid">{errors.firstName?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3" controlId="formLastName">
                  <Form.Label>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Last name"
                    {...register('lastName', lastNameSchema)}
                    isInvalid={!!errors.lastName}
                    className="auth-input"
                  />
                  <Form.Control.Feedback type="invalid">{errors.lastName?.message}</Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3" controlId="formEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder="you@example.com"
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
                  placeholder="Create a password"
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
            <Form.Group className="mb-3" controlId="formConfirmPassword">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Re-enter password"
                {...register('confirmPassword', confirmPasswordSchema)}
                isInvalid={!!errors.confirmPassword}
                className="auth-input"
              />
              <Form.Control.Feedback type="invalid">{errors.confirmPassword?.message}</Form.Control.Feedback>
            </Form.Group>
            {submitError ? <div className="text-danger small mb-3">{submitError}</div> : null}
            {submitSuccess ? <div className="text-success small mb-3">{submitSuccess}</div> : null}
            <Stack direction="horizontal" className="auth-meta">
              <Form.Group controlId="customCheckc1">
                <Form.Check type="checkbox" label="I agree to the Terms & Conditions" defaultChecked className="auth-check" />
              </Form.Group>
            </Stack>
            <Button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing up...' : 'Create Account'}
            </Button>
            <div className="auth-footer">
              <span>Already have an account?</span>
              <Link to="/login" className="auth-link">
                Sign In
              </Link>
            </div>
          </Form>
        </div>
      </div>
      <ViewModal open={isSubmitting} message="Creating landlord account..." />
    </>
  );
}

AuthRegisterForm.propTypes = { className: PropTypes.string };
