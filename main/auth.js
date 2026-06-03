/* ============================================
   GROCERY STORE — Authentication (Backend API)
   Calls Node.js backend instead of Firebase
   ============================================ */
(function () {
  'use strict';

  function getApiBase() {
    if (window.__CANE_API_URL) return window.__CANE_API_URL;
    var meta = document.querySelector('meta[name="api-base"]');
    if (meta && meta.content) return meta.content;
    return '/api';
  }

  const API_URL = getApiBase();
  let token = null;
  let currentUser = null;

  // Load token from localStorage on init
  function loadToken() {
    return new Promise((resolve) => {
      token = localStorage.getItem('cane_token');
      if (token) {
        getMe().then(() => resolve()).catch(() => resolve());
      } else {
        resolve();
      }
    });
  }

  function login(email, password) {
    return fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          token = data.token;
          currentUser = data.user;
          localStorage.setItem('cane_token', token);
          console.log('✓ Login successful');
          return data;
        }
        return data;
      })
      .catch(error => {
        console.error('Login error:', error);
        return { success: false, message: 'Network error' };
      });
  }

  function register(name, email, password) {
    return fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          token = data.token;
          currentUser = data.user;
          localStorage.setItem('cane_token', token);
          console.log('✓ Registration successful');
          return data;
        }
        return data;
      })
      .catch(error => {
        console.error('Register error:', error);
        return { success: false, message: 'Network error' };
      });
  }

  function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('cane_token');
    window.location.href = 'login.html';
  }

  function isLoggedIn() {
    return token !== null && currentUser !== null;
  }

  function isAdmin() {
    return currentUser && currentUser.role === 'admin';
  }

  function getSession() {
    return currentUser;
  }

  function getMe() {
    if (!token) return Promise.resolve(null);

    return fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          currentUser = data.user;
          console.log('✓ User loaded');
          return data.user;
        } else {
          token = null;
          localStorage.removeItem('cane_token');
          return null;
        }
      })
      .catch(error => {
        console.error('Get user error:', error);
        token = null;
        localStorage.removeItem('cane_token');
        return null;
      });
  }

  function requireAuth(redirectTo) {
    return new Promise((resolve) => {
      if (isLoggedIn()) {
        resolve(true);
      } else if (token) {
        getMe().then(user => {
          if (user) {
            resolve(true);
          } else {
            window.location.href = redirectTo || 'login.html';
            resolve(false);
          }
        });
      } else {
        window.location.href = redirectTo || 'login.html';
        resolve(false);
      }
    });
  }

  function requireAdmin() {
    return new Promise((resolve) => {
      if (isAdmin()) {
        resolve(true);
      } else if (isLoggedIn()) {
        window.location.href = 'index.html';
        resolve(false);
      } else {
        window.location.href = 'login.html';
        resolve(false);
      }
    });
  }

  // Orders
  function getOrders() {
    if (!token) return Promise.resolve([]);

    return fetch(`${API_URL}/orders`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => data.orders || [])
      .catch(error => {
        console.error('Get orders error:', error);
        return [];
      });
  }

  function getAllOrders() {
    if (!token || !isAdmin()) return Promise.resolve([]);

    return fetch(`${API_URL}/admin/orders`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => data.orders || [])
      .catch(error => {
        console.error('Get all orders error:', error);
        return [];
      });
  }

  function getAllUsers() {
    if (!token || !isAdmin()) return Promise.resolve([]);

    return fetch(`${API_URL}/admin/users`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => data.users || [])
      .catch(error => {
        console.error('Get all users error:', error);
        return [];
      });
  }

  function getProducts() {
    return fetch(`${API_URL}/products`, {
      method: 'GET'
    })
      .then(res => res.json())
      .then(data => data.products || data || [])
      .catch(error => {
        console.error('Get products error:', error);
        return [];
      });
  }

  function createProduct(product) {
    if (!token || !isAdmin()) return Promise.reject('Not authorized');

    return fetch(`${API_URL}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(product)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) return data.product;
        throw new Error(data.message || 'Create product failed');
      });
  }

  function updateProduct(productId, product) {
    if (!token || !isAdmin()) return Promise.reject('Not authorized');

    return fetch(`${API_URL}/admin/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(product)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) return data.product;
        throw new Error(data.message || 'Update product failed');
      });
  }

  function deleteProduct(productId) {
    if (!token || !isAdmin()) return Promise.reject('Not authorized');

    return fetch(`${API_URL}/admin/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) return true;
        throw new Error(data.message || 'Delete product failed');
      });
  }

  function saveOrder(order) {
    if (!token) return Promise.reject('Not logged in');

    return fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items: order.items, total: order.total })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('✓ Order saved');
          return data.order;
        }
        throw new Error(data.message);
      })
      .catch(error => {
        console.error('Save order error:', error);
        throw error;
      });
  }

  function updateOrderStatus(orderId, status) {
    if (!token || !isAdmin()) return Promise.reject('Not authorized');

    return fetch(`${API_URL}/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: status })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('✓ Order status updated');
          return data;
        }
        throw new Error(data.message);
      })
      .catch(error => {
        console.error('Update order error:', error);
        throw error;
      });
  }

  function initAuth() {
    return loadToken();
  }

  // Expose API
  window.CaneAuth = {
    init: initAuth,
    login: login,
    register: register,
    logout: logout,
    getSession: getSession,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin,
    getOrders: getOrders,
    getAllOrders: getAllOrders,
    getAllUsers: getAllUsers,
    getProducts: getProducts,
    createProduct: createProduct,
    updateProduct: updateProduct,
    deleteProduct: deleteProduct,
    saveOrder: saveOrder,
    updateOrderStatus: updateOrderStatus
  };

  // Auto-init
  initAuth();
})();
