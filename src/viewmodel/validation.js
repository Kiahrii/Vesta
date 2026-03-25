// validation.js

// Register Tenant Validation
export const validateRegisterTenant = (form) => {
  const errors = {};

  // First Name validation
  if (!form.first_name?.trim()) {
    errors.first_name = 'First name is required';
  } else if (form.first_name.length < 2) {
    errors.first_name = 'First name must be at least 2 characters';
  } else if (form.first_name.length > 20) {
    errors.first_name = 'First name must be less than 21 characters';
  }

  // Middle Name validation (optional)
  if (form.middle_name?.trim() && form.middle_name.length > 20) {
    errors.middle_name = 'Middle name must be less than 21 characters';
  }

  // Last Name validation
  if (!form.last_name?.trim()) {
    errors.last_name = 'Last name is required';
  } else if (form.last_name.length < 2) {
    errors.last_name = 'Last name must be at least 2 characters';
  } else if (form.last_name.length > 20) {
    errors.last_name = 'Last name must be less than 21 characters';
  }

  // Contact Number validation
  if (!form.contact_no?.trim()) {
    errors.contact_no = 'Contact number is required';
  } else if (!/^[0-9]{11}$/.test(form.contact_no.replace(/\D/g, ''))) {
    errors.contact_no = 'Contact number must be exactly 11 digits';
  }

  // Emergency Contact Name validation
  if (!form.contact_name?.trim()) {
    errors.contact_name = 'Emergency contact name is required';
  } else if (form.contact_name.length < 2) {
    errors.contact_name = 'Emergency contact name must be at least 2 characters';
  } else if (form.contact_name.length > 50) {
    errors.contact_name = 'Emergency contact name must be less than 51 characters';
  }

  // Emergency Contact Number validation
  if (!form.em_contact_no?.trim()) {
    errors.em_contact_no = 'Emergency contact number is required';
  } else if (!/^[0-9]{11}$/.test(form.em_contact_no.replace(/\D/g, ''))) {
    errors.em_contact_no = 'Emergency contact number must be exactly 11 digits';
  }

  // Move In Date validation
  let moveInDate = null;
  if (!form.move_in) {
    errors.move_in = 'Move-in date is required';
  } else {
    moveInDate = new Date(form.move_in);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (moveInDate < today) {
      errors.move_in = 'Move-in date cannot be in the past';
    }
  }

  // Lease End validation (optional)
  if (form.lease_end) {
    const leaseEndDate = new Date(form.lease_end);
    if (Number.isNaN(leaseEndDate.getTime())) {
      errors.lease_end = 'Lease end date is invalid';
    } else if (moveInDate && leaseEndDate < moveInDate) {
      errors.lease_end = 'Lease end date cannot be earlier than lease start';
    }
  }

  // Room ID validation
  if (!form.room_id) {
    errors.room_id = 'Please select a room';
  }

  // Email validation
  if (!form.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Password validation
  if (!form.password) {
    errors.password = 'Password is required';
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)/.test(form.password)) {
    errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Add Room Validation
export const validateAddRoom = (form) => {
  const errors = {};

  // Room Number validation
  if (!form.room_no?.trim()) {
    errors.room_no = 'Room number is required';
  } else if (!/^[A-Za-z0-9\s-]+$/.test(form.room_no)) {
    errors.room_no = 'Room number can only contain letters, numbers, spaces, and hyphens';
  }

  // Monthly Rent validation
  if (!form.monthly_rent) {
    errors.monthly_rent = 'Monthly rent is required';
  } else if (isNaN(form.monthly_rent) || form.monthly_rent <= 0) {
    errors.monthly_rent = 'Monthly rent must be a positive number';
  } else if (form.monthly_rent > 1000000) {
    errors.monthly_rent = 'Monthly rent cannot exceed 1,000,000';
  }

  // Capacity validation
  if (!form.capacity) {
    errors.capacity = 'Capacity is required';
  } else if (isNaN(form.capacity) || form.capacity <= 0) {
    errors.capacity = 'Capacity must be a positive number';
  } else if (form.capacity > 20) {
    errors.capacity = 'Capacity cannot exceed 20 persons';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// On The Counter Validation
export const validateOnTheCounter = (form) => {
  const errors = {};

  // Tenant validation
  if (!form.tenant?.trim()) {
    errors.tenant = 'Tenant name is required';
  }

  // Room Number validation
  if (!form.roomNumber?.trim()) {
    errors.roomNumber = 'Room number is required';
  }

  // Amount validation
  if (!form.amount) {
    errors.amount = 'Amount is required';
  } else if (isNaN(form.amount) || form.amount <= 0) {
    errors.amount = 'Amount must be a positive number';
  } else if (form.amount > 1000000) {
    errors.amount = 'Amount cannot exceed 1,000,000';
  }

  // Payment Date validation
  if (!form.paymentDate) {
    errors.paymentDate = 'Payment date is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Utility function to format validation errors for display
export const formatValidationErrors = (errors) => {
  return Object.values(errors).join(', ');
};

// Utility function to check if a field has an error
export const hasFieldError = (errors, fieldName) => {
  return errors && errors[fieldName] ? true : false;
};

// Utility function to get field error message
export const getFieldError = (errors, fieldName) => {
  return errors && errors[fieldName] ? errors[fieldName] : '';
};
