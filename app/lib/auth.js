// app/lib/auth.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'finance_management_secret_key_for_jwt_signing';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

console.log('🔐 Auth module initialized');

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @param {string} user.user_code - User code
 * @param {string} user.email - User email
 * @param {string} user.name - User name
 * @returns {string} JWT token
 */
export function generateToken(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const payload = {
    user_code: user.user_code,
    email: user.email,
    name: user.name,
    department: user.department,
    position: user.position
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'cdi-fe-app',
    subject: user.user_code
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export function verifyToken(token) {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    
    throw error;
  }
}

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  if (!password) {
    throw new Error('Password is required');
  }

  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Password match result
 */
export async function verifyPassword(password, hash) {
  if (!password || !hash) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('❌ Password verification error:', error);
    return false;
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header
 * @returns {string|null} Token or null
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Middleware to protect routes (for API routes)
 * @param {Request} request - Next.js request object
 * @returns {Object} User data from token
 */
export async function protectRoute(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw new Error('Authorization token required');
    }

    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    console.error('❌ Route protection failed:', error.message);
    throw new Error('Authentication failed: ' + error.message);
  }
}

/**
 * Check if user has required permissions
 * @param {Array} userPermissions - User's permissions array
 * @param {string} requiredPermission - Required permission code
 * @returns {boolean} Has permission or not
 */
export function hasPermission(userPermissions = [], requiredPermission) {
  if (!requiredPermission) return true;
  
  return userPermissions.some(
    permission => permission.permission_code === requiredPermission
  );
}

/**
 * Check if user has any of the required roles
 * @param {Array} userRoles - User's roles array
 * @param {Array} requiredRoles - Required role codes
 * @returns {boolean} Has role or not
 */
export function hasRole(userRoles = [], requiredRoles = []) {
  if (!requiredRoles.length) return true;
  
  return userRoles.some(role => 
    requiredRoles.includes(role.role_code)
  );
}

/**
 * Generate random secure token (for password reset, etc.)
 * @param {number} length - Token length
 * @returns {string} Random token
 */
export function generateSecureToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

export default {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  protectRoute,
  hasPermission,
  hasRole,
  generateSecureToken
};