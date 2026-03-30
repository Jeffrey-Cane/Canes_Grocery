/* ============================================
   CANE's STORE — Authentication Logic
   localStorage-based auth for demo purposes
   ============================================ */
(function () {
  'use strict';

  var USERS_KEY = 'cane_users';
  var SESSION_KEY = 'cane_session';
  var ORDERS_KEY = 'cane_orders';

  // Default admin account
  var DEFAULT_ADMIN = {
    id: 'admin-001',
    name: 'Admin',
    email: 'admin@canesstore.com',
    password: 'admin123',
    role: 'admin',
    createdAt: new Date().toISOString()
  };

  // Initialize default users if none exist
  function initUsers() {
    var users = getUsers();
    if (users.length === 0) {
      users.push(DEFAULT_ADMIN);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    // Ensure admin always exists
    var adminExists = users.some(function (u) { return u.role === 'admin'; });
    if (!adminExists) {
      users.push(DEFAULT_ADMIN);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  }

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function setSession(user) {
    var session = { id: user.id, name: user.name, email: user.email, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function login(email, password) {
    var users = getUsers();
    var user = users.find(function (u) {
      return u.email.toLowerCase() === email.toLowerCase() && u.password === password;
    });
    if (!user) return { success: false, message: 'Invalid email or password' };
    setSession(user);
    return { success: true, user: user };
  }

  function register(name, email, password) {
    var users = getUsers();
    var exists = users.some(function (u) {
      return u.email.toLowerCase() === email.toLowerCase();
    });
    if (exists) return { success: false, message: 'Email already registered' };

    var newUser = {
      id: 'user-' + Date.now().toString(36),
      name: name,
      email: email,
      password: password,
      role: 'customer',
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    setSession(newUser);
    return { success: true, user: newUser };
  }

  function logout() {
    clearSession();
    window.location.href = 'login.html';
  }

  function isLoggedIn() {
    return getSession() !== null;
  }

  function isAdmin() {
    var session = getSession();
    return session && session.role === 'admin';
  }

  function requireAuth(redirectTo) {
    if (!isLoggedIn()) {
      window.location.href = redirectTo || 'login.html';
      return false;
    }
    return true;
  }

  function requireAdmin() {
    if (!isAdmin()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  // Orders
  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveOrder(order) {
    var orders = getOrders();
    orders.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function updateOrderStatus(orderId, status) {
    var orders = getOrders();
    var order = orders.find(function (o) { return o.id === orderId; });
    if (order) {
      order.status = status;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }
  }

  // Expose API
  window.CaneAuth = {
    init: initUsers,
    login: login,
    register: register,
    logout: logout,
    getSession: getSession,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin,
    getUsers: getUsers,
    getOrders: getOrders,
    saveOrder: saveOrder,
    updateOrderStatus: updateOrderStatus
  };

  // Auto-init
  initUsers();
})();
