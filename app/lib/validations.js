// Email validation
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Password validation
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return null;
};

// Name validation (prevent email format)
export const validateName = (name) => {
  if (name.includes('@') && name.includes('.')) {
    return 'Name should not contain email format';
  }
  return null;
};