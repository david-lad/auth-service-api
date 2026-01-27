/**
 * Test Script for Authentication Service
 * 
 * This script tests all authentication and user management endpoints.
 * Run with: node test/api-test.js
 * 
 * Make sure the server is running before executing this script.
 */

const BASE_URL = 'http://localhost:3000/api';

// Store tokens for authenticated requests
let adminAccessToken = '';
let adminRefreshToken = '';
let userAccessToken = '';
let userRefreshToken = '';
let createdUserId = '';

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

/**
 * Test Results Logger
 */
function logTest(testName, success, details = '') {
  const emoji = success ? '✅' : '❌';
  console.log(`${emoji} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
  console.log('');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Starting Authentication Service Tests\n');
  console.log('='.repeat(60));
  console.log('');

  // Test 1: Register new user
  console.log('📝 Test 1: Register New User');
  const registerData = {
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  };
  const registerResult = await makeRequest('/auth/register', 'POST', registerData);
  logTest(
    'Register New User',
    registerResult.ok,
    registerResult.ok
      ? `User created: ${registerResult.data.user.email}`
      : `Error: ${JSON.stringify(registerResult.data)}`,
  );

  if (registerResult.ok) {
    userAccessToken = registerResult.data.accessToken;
    userRefreshToken = registerResult.data.refreshToken;
    createdUserId = registerResult.data.user.id;
  }

  // Test 2: Login with admin credentials
  console.log('🔐 Test 2: Login as Admin');
  const adminLoginResult = await makeRequest('/auth/login', 'POST', {
    email: 'admin@example.com',
    password: 'admin123',
  });
  logTest(
    'Admin Login',
    adminLoginResult.ok,
    adminLoginResult.ok
      ? `Admin logged in: ${adminLoginResult.data.user.email}`
      : `Error: ${JSON.stringify(adminLoginResult.data)}`,
  );

  if (adminLoginResult.ok) {
    adminAccessToken = adminLoginResult.data.accessToken;
    adminRefreshToken = adminLoginResult.data.refreshToken;
  }

  // Test 3: Login with regular user
  console.log('🔐 Test 3: Login as Regular User');
  const userLoginResult = await makeRequest('/auth/login', 'POST', {
    email: 'user@example.com',
    password: 'user123',
  });
  logTest(
    'User Login',
    userLoginResult.ok,
    userLoginResult.ok
      ? `User logged in: ${userLoginResult.data.user.email}`
      : `Error: ${JSON.stringify(userLoginResult.data)}`,
  );

  // Test 4: Get current user profile
  console.log('👤 Test 4: Get Current User Profile');
  const profileResult = await makeRequest('/auth/me', 'GET', null, userAccessToken);
  logTest(
    'Get Profile',
    profileResult.ok,
    profileResult.ok
      ? `User profile: ${profileResult.data.user.email}`
      : `Error: ${JSON.stringify(profileResult.data)}`,
  );

  // Test 5: Refresh access token
  console.log('🔄 Test 5: Refresh Access Token');
  const refreshResult = await makeRequest('/auth/refresh', 'POST', {
    refreshToken: userRefreshToken,
  });
  logTest(
    'Refresh Token',
    refreshResult.ok,
    refreshResult.ok
      ? 'New tokens generated successfully'
      : `Error: ${JSON.stringify(refreshResult.data)}`,
  );

  if (refreshResult.ok) {
    userAccessToken = refreshResult.data.accessToken;
  }

  // Test 6: Get all users (Admin only)
  console.log('👥 Test 6: Get All Users (Admin)');
  const allUsersResult = await makeRequest('/users', 'GET', null, adminAccessToken);
  logTest(
    'Get All Users',
    allUsersResult.ok,
    allUsersResult.ok
      ? `Found ${allUsersResult.data.length} users`
      : `Error: ${JSON.stringify(allUsersResult.data)}`,
  );

  // Test 7: Get all users (Regular user - should fail)
  console.log('🚫 Test 7: Get All Users (Regular User - Should Fail)');
  const unauthorizedResult = await makeRequest('/users', 'GET', null, userAccessToken);
  logTest(
    'Unauthorized Access Test',
    !unauthorizedResult.ok && unauthorizedResult.status === 403,
    !unauthorizedResult.ok
      ? 'Correctly denied access'
      : 'ERROR: Regular user should not access this endpoint',
  );

  // Test 8: Assign role (Admin only)
  if (createdUserId) {
    console.log('👑 Test 8: Assign Role to User (Admin)');
    const assignRoleResult = await makeRequest(
      '/users/assign-role',
      'POST',
      { userId: createdUserId, role: 'ADMIN' },
      adminAccessToken,
    );
    logTest(
      'Assign Role',
      assignRoleResult.ok,
      assignRoleResult.ok
        ? `Role updated to ADMIN for user ${createdUserId}`
        : `Error: ${JSON.stringify(assignRoleResult.data)}`,
    );
  }

  // Test 9: Get user by ID (Admin only)
  if (createdUserId) {
    console.log('🔍 Test 9: Get User by ID (Admin)');
    const getUserResult = await makeRequest(`/users/${createdUserId}`, 'GET', null, adminAccessToken);
    logTest(
      'Get User by ID',
      getUserResult.ok,
      getUserResult.ok
        ? `User found: ${getUserResult.data.email}`
        : `Error: ${JSON.stringify(getUserResult.data)}`,
    );
  }

  // Test 10: Update user (Admin only)
  if (createdUserId) {
    console.log('✏️  Test 10: Update User (Admin)');
    const updateResult = await makeRequest(
      `/users/${createdUserId}`,
      'PATCH',
      { firstName: 'Updated', lastName: 'Name' },
      adminAccessToken,
    );
    logTest(
      'Update User',
      updateResult.ok,
      updateResult.ok
        ? `User updated: ${updateResult.data.firstName} ${updateResult.data.lastName}`
        : `Error: ${JSON.stringify(updateResult.data)}`,
    );
  }

  // Test 11: Invalid token
  console.log('🚫 Test 11: Access with Invalid Token');
  const invalidTokenResult = await makeRequest('/auth/me', 'GET', null, 'invalid-token');
  logTest(
    'Invalid Token Test',
    !invalidTokenResult.ok && invalidTokenResult.status === 401,
    !invalidTokenResult.ok
      ? 'Correctly rejected invalid token'
      : 'ERROR: Should reject invalid token',
  );

  // Test 12: Logout
  console.log('👋 Test 12: Logout User');
  const logoutResult = await makeRequest(
    '/auth/logout',
    'POST',
    { refreshToken: userRefreshToken },
    userAccessToken,
  );
  logTest(
    'Logout',
    logoutResult.ok,
    logoutResult.ok
      ? 'User logged out successfully'
      : `Error: ${JSON.stringify(logoutResult.data)}`,
  );

  // Test 13: Use revoked refresh token (should fail)
  console.log('🚫 Test 13: Use Revoked Refresh Token (Should Fail)');
  const revokedTokenResult = await makeRequest('/auth/refresh', 'POST', {
    refreshToken: userRefreshToken,
  });
  logTest(
    'Revoked Token Test',
    !revokedTokenResult.ok && revokedTokenResult.status === 401,
    !revokedTokenResult.ok
      ? 'Correctly rejected revoked token'
      : 'ERROR: Should reject revoked token',
  );

  console.log('='.repeat(60));
  console.log('✨ All tests completed!\n');
}

// Run tests
runTests().catch(console.error);
