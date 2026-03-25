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

// third-party
import { useForm } from 'react-hook-form';

// project-imports
import {
  confirmPasswordSchema,
  emailSchema,
  firstNameSchema,
  lastNameSchema,
  passwordSchema
} from 'utils/validationSchema';
import { registerLandlord } from 'viewmodel/register-landlord';
import ViewModal from 'viewmodel/ViewModal';

// assets
import DarkLogo from 'assets/images/lowgow.svg';

// ==============================|| AUTH REGISTER FORM - FIXED ||============================== //

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
        message: 'Both Passwords must match!'
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
      <div className={`auth-page ${className || ''}`}>
        {/* Background Elements */}
        <div className="auth-bg">
          <div className="splash-container">
            <div className="shape shape--1"></div>
            <div className="shape shape--2"></div>
            <div className="shape shape--3"></div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          {/* Brand Side */}
          <div className="auth-brand">
            <div className="auth-brand__content">
              <div className="auth-brand__logo">
                <Image src={DarkLogo} alt="Vesta Apartment Logo" />
              </div>
              <h2 className="auth-brand__title">Create Account</h2>
              <p className="auth-brand__text">
                Set up your landlord profile to manage properties with ease.
              </p>
            </div>
          </div>

          {/* Form Side */}
          <div className="auth-form">
            {/* Header */}
            <div className="auth-form__header">
              <h3>Sign Up</h3>
              <p>Create your landlord credentials</p>
            </div>

            {/* Tabs */}
            <div className="auth-form__tabs">
              <Link to="/login" className="tab">
                Sign In
              </Link>
              <span className="tab active">Sign Up</span>
            </div>

            {/* Form Content */}
            <div className="auth-form__content">
              
              {/* Messages */}
              {(submitError || submitSuccess) && (
                <div className={`auth-message mb-2 ${
                  submitError ? 'auth-message--error' : 'auth-message--success'
                }`}>
                  {submitError || submitSuccess}
                </div>
              )}

              <Form onSubmit={handleSubmit(onSubmit)} noValidate className="flex-grow-1 d-flex flex-column">
                
                {/* ========================================
                   FIXED NAME FIELDS - NO HOVER GAPS ✅
                   ======================================== */}
                <div className="auth-form-row">
                  <div className="auth-input name-field">
                    <Form.Label className="mb-1 small fw-semibold text-white">First Name</Form.Label>
                    <div className="position-relative">
                      <i className="auth-input__icon fas fa-user"></i>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="First name"
                        className="ps-5"
                        {...register('firstName', firstNameSchema)}
                        isInvalid={!!errors.firstName}
                      />
                    </div>
                    {errors.firstName && (
                      <small className="text-danger mt-1 d-block validation-message--error">
                        {errors.firstName.message}
                      </small>
                    )}
                  </div>
                  
                  <div className="auth-input name-field">
                    <Form.Label className="mb-1 small fw-semibold text-white">Last Name</Form.Label>
                    <div className="position-relative">
                      <i className="auth-input__icon fas fa-user"></i>
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="Last name"
                        className="ps-5"
                        {...register('lastName', lastNameSchema)}
                        isInvalid={!!errors.lastName}
                      />
                    </div>
                    {errors.lastName && (
                      <small className="text-danger mt-1 d-block validation-message--error">
                        {errors.lastName.message}
                      </small>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="auth-input mb-2">
                  <Form.Label className="mb-1 small fw-semibold text-white">Email</Form.Label>
                  <div className="position-relative">
                    <i className="auth-input__icon fas fa-envelope"></i>
                    <Form.Control
                      size="sm"
                      type="email"
                      placeholder="you@example.com"
                      className="ps-5"
                      {...register('email', emailSchema)}
                      isInvalid={!!errors.email}
                    />
                  </div>
                  {errors.email && (
                    <small className="text-danger mt-1 d-block validation-message--error">
                      {errors.email.message}
                    </small>
                  )}
                </div>

                {/* Password */}
                <div className="auth-input mb-2">
                  <Form.Label className="mb-1 small fw-semibold text-white">Password</Form.Label>
                  <InputGroup size="sm">
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create password"
                      className="auth-input password-field"
                      {...register('password', passwordSchema)}
                      isInvalid={!!errors.password}
                    />
                    <Button
                      variant=""
                      size="sm"
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="border-start px-2 auth-input__icon password-icon"
                    >
                      <i className={showPassword ? 'ti ti-eye' : 'ti ti-eye-off'} />
                    </Button>
                  </InputGroup>
                  {errors.password && (
                    <small className="text-danger mt-1 d-block validation-message--error">
                      {errors.password.message}
                    </small>
                  )}
                </div>

                {/* Confirm Password - SAME SIZE */}
                <div className="auth-input mb-3">
                  <Form.Label className="mb-1 small fw-semibold text-white">Confirm Password</Form.Label>
                  <div className="position-relative">
                    <i className="auth-input__icon fas fa-lock"></i>
                    <Form.Control
                      size="sm"
                      type="password"
                      placeholder="Re-enter password"
                      className="ps-5 pe-5 confirm-password"
                      {...register('confirmPassword', confirmPasswordSchema)}
                      isInvalid={!!errors.confirmPassword}
                    />
                    <i className="auth-input__icon password-icon fas fa-eye-slash position-absolute end-0 me-3"></i>
                  </div>
                  {errors.confirmPassword && (
                    <small className="text-danger mt-1 d-block validation-message--error">
                      {errors.confirmPassword.message}
                    </small>
                  )}
                </div>

                {/* Terms */}
                <Form.Check
                  type="checkbox"
                  id="terms"
                  label={
                    <span className="small text-muted">
                      I agree to the <Link href="#" className="text-primary fw-semibold">Terms</Link>
                    </span>
                  }
                  defaultChecked
                  className="mb-3 p-0 auth-remember"
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="auth-btn w-100 mb-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Signing up...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                {/* Footer */}
                <div className="auth-footer">
                  <span>Already have an account?</span>
                  <Link to="/login" className="auth-link">
                    Sign In
                  </Link>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </div>

      <ViewModal open={isSubmitting} message="Creating landlord account..." />
    </>
  );
}

AuthRegisterForm.propTypes = {
  className: PropTypes.string
};