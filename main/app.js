/* ============================================
   CANE's STORE — Main Application Logic
   ============================================ */
(function () {
  'use strict';

  let products = [];
  let cart = JSON.parse(localStorage.getItem('cane_cart') || '[]');
  let activeCategory = 'All';
  let searchQuery = '';

  const $ = (s, p) => (p || document).querySelector(s);
  const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

  document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    renderProducts();
    updateCartBadge();
    bindNavbar();
    bindSearch();
    bindCart();
    bindCheckout();
    bindCategoryFilters();
    animateOnScroll();
    updateUserButton();
  });

  function updateUserButton() {
    var btn = $('#user-btn');
    if (!btn) return;
    if (typeof CaneAuth !== 'undefined' && CaneAuth.isLoggedIn()) {
      var s = CaneAuth.getSession();
      btn.textContent = s.name.split(' ')[0];
      btn.title = s.name + ' (' + s.role + ')';
      btn.style.fontSize = '.78rem';
      btn.style.fontWeight = '600';
      btn.style.width = 'auto';
      btn.style.padding = '0 14px';
      if (s.role === 'admin') {
        btn.href = 'admin.html';
      } else {
        btn.href = '#';
        btn.onclick = function (e) {
          e.preventDefault();
          if (confirm('Sign out of ' + s.email + '?')) CaneAuth.logout();
        };
      }
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch('products.json');
      products = await res.json();
    } catch (e) {
      console.error('Failed to load products:', e);
      products = [];
    }
  }

  function getProductImage(p, size) {
    if (p.image) return '<img src="' + p.image + '" alt="' + p.name + '" loading="lazy" style="width:100%;height:100%;object-fit:cover">';
    var fs = size === 'sm' ? '2rem' : '4rem';
    return '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:' + fs + ';background:#EDE8DD">' + (p.emoji || '🛒') + '</div>';
  }

  function renderProducts() {
    var grid = $('#products-grid');
    if (!grid) return;

    var filtered = products.filter(function (p) {
      var matchCat = activeCategory === 'All' || p.category === activeCategory;
      var matchSearch = p.name.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1 ||
        p.category.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="no-results"><div class="no-results__icon">🔍</div><div class="no-results__text">No products found</div><div class="no-results__sub">Try a different search or category</div></div>';
      return;
    }

    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var p = filtered[i];
      html += '<article class="product-card" data-id="' + p.id + '" id="product-' + p.id + '">';
      html += '<div class="product-card__image">';
      if (p.badge) html += '<span class="product-card__badge">' + p.badge + '</span>';
      html += '<button class="product-card__wishlist" aria-label="Wishlist">♡</button>';
      html += getProductImage(p, 'lg');
      html += '</div>';
      html += '<div class="product-card__body">';
      html += '<div class="product-card__category">' + p.category + '</div>';
      html += '<h3 class="product-card__name">' + p.name + '</h3>';
      html += '<div class="product-card__unit">' + p.unit + '</div>';
      html += '<div class="product-card__footer">';
      html += '<div class="product-card__price"><span>KSh </span>' + p.price.toLocaleString() + '</div>';
      html += '<button class="product-card__add-btn" data-id="' + p.id + '" aria-label="Add to cart" id="add-btn-' + p.id + '">+</button>';
      html += '</div></div></article>';
    }
    grid.innerHTML = html;

    $$('.product-card__add-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        addToCart(parseInt(btn.dataset.id));
        btn.classList.add('added');
        btn.textContent = '✓';
        setTimeout(function () {
          btn.classList.remove('added');
          btn.textContent = '+';
        }, 1200);
      });
    });

    $$('.product-card').forEach(function (card, idx) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(function () {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, idx * 60);
    });
  }

  function bindCategoryFilters() {
    $$('.category-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.category-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeCategory = btn.dataset.category;
        renderProducts();
      });
    });
  }

  function bindNavbar() {
    var nav = $('.navbar');
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  function bindSearch() {
    var toggleBtn = $('#search-toggle');
    var bar = $('#search-bar');
    var overlay = $('#search-overlay');
    var input = $('#search-input');
    var closeBtn = $('#search-close');

    function openSearch() {
      bar.classList.add('active');
      overlay.classList.add('active');
      setTimeout(function () { input.focus(); }, 300);
    }
    function closeSearch() {
      bar.classList.remove('active');
      overlay.classList.remove('active');
      input.value = '';
      searchQuery = '';
      renderProducts();
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openSearch);
    if (closeBtn) closeBtn.addEventListener('click', closeSearch);
    if (overlay) overlay.addEventListener('click', closeSearch);

    if (input) {
      input.addEventListener('input', function (e) {
        searchQuery = e.target.value;
        renderProducts();
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeSearch();
      });
    }
  }

  function addToCart(productId) {
    var existing = cart.find(function (item) { return item.id === productId; });
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ id: productId, qty: 1 });
    }
    saveCart();
    updateCartBadge();
    showToast('Added to cart!');
  }

  function removeFromCart(productId) {
    cart = cart.filter(function (item) { return item.id !== productId; });
    saveCart();
    updateCartBadge();
    renderCartDrawer();
  }

  function updateQty(productId, delta) {
    var item = cart.find(function (i) { return i.id === productId; });
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { removeFromCart(productId); return; }
    saveCart();
    updateCartBadge();
    renderCartDrawer();
  }

  function saveCart() {
    localStorage.setItem('cane_cart', JSON.stringify(cart));
  }

  function getCartTotal() {
    return cart.reduce(function (sum, item) {
      var p = products.find(function (pr) { return pr.id === item.id; });
      return sum + (p ? p.price * item.qty : 0);
    }, 0);
  }

  function getCartCount() {
    return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function updateCartBadge() {
    var badge = $('#cart-badge');
    var count = getCartCount();
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('visible', count > 0);
    }
  }

  function bindCart() {
    var cartBtn = $('#cart-btn');
    var cartOverlay = $('#cart-overlay');
    var cartDrawer = $('#cart-drawer');
    var cartClose = $('#cart-close');

    function openCart() {
      cartOverlay.classList.add('active');
      cartDrawer.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderCartDrawer();
    }
    function closeCart() {
      cartOverlay.classList.remove('active');
      cartDrawer.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (cartBtn) cartBtn.addEventListener('click', openCart);
    if (cartClose) cartClose.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
  }

  function renderCartDrawer() {
    var itemsEl = $('#cart-items');
    var footerEl = $('#cart-footer');
    var countEl = $('#cart-count');

    if (countEl) countEl.textContent = getCartCount() + ' items';

    if (cart.length === 0) {
      itemsEl.innerHTML = '<div class="cart-empty"><div class="cart-empty__icon">🛒</div><div class="cart-empty__text">Your cart is empty</div><div class="cart-empty__sub">Add some fresh groceries!</div><button class="btn btn--primary btn--sm" onclick="document.getElementById(\'cart-overlay\').click()">Start Shopping</button></div>';
      footerEl.style.display = 'none';
      return;
    }

    footerEl.style.display = 'block';
    var html = '';
    for (var i = 0; i < cart.length; i++) {
      var item = cart[i];
      var p = products.find(function (pr) { return pr.id === item.id; });
      if (!p) continue;
      html += '<div class="cart-item" data-id="' + item.id + '">';
      html += '<div class="cart-item__image">' + getProductImage(p, 'sm') + '</div>';
      html += '<div class="cart-item__info">';
      html += '<div class="cart-item__name">' + p.name + '</div>';
      html += '<div class="cart-item__price">KSh ' + (p.price * item.qty).toLocaleString() + '</div>';
      html += '</div>';
      html += '<div class="cart-item__actions">';
      html += '<button class="cart-item__qty-btn" onclick="window.__updateQty(' + item.id + ', -1)">−</button>';
      html += '<span class="cart-item__qty">' + item.qty + '</span>';
      html += '<button class="cart-item__qty-btn" onclick="window.__updateQty(' + item.id + ', 1)">+</button>';
      html += '<button class="cart-item__remove" onclick="window.__removeFromCart(' + item.id + ')">✕</button>';
      html += '</div></div>';
    }
    itemsEl.innerHTML = html;

    var total = getCartTotal();
    $('#cart-subtotal').textContent = 'KSh ' + total.toLocaleString();
  }

  window.__updateQty = updateQty;
  window.__removeFromCart = removeFromCart;

  function bindCheckout() {
    var checkoutBtn = $('#checkout-btn');
    var modalOverlay = $('#modal-overlay');
    var modalClose = $('#modal-close');
    var placeOrderBtn = $('#place-order-btn');

    function openModal() {
      if (cart.length === 0) return;
      $('#cart-overlay').classList.remove('active');
      $('#cart-drawer').classList.remove('active');
      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderOrderSummary();
      showCheckoutForm();
    }

    function closeModal() {
      modalOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (checkoutBtn) checkoutBtn.addEventListener('click', openModal);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closeModal();
    });

    $$('.payment-option').forEach(function (opt) {
      opt.addEventListener('click', function () {
        $$('.payment-option').forEach(function (o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
      });
    });

    if (placeOrderBtn) {
      placeOrderBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var name = $('#checkout-name').value.trim();
        var email = $('#checkout-email').value.trim();
        var phone = $('#checkout-phone').value.trim();
        var address = $('#checkout-address').value.trim();

        if (!name || !email || !phone || !address) {
          showToast('Please fill all required fields', '⚠️');
          return;
        }

        // Check which payment method is selected
        var selectedMethod = 'paystack';
        var selectedOpt = $('.payment-option.selected');
        if (selectedOpt) selectedMethod = selectedOpt.dataset.method;

        if (selectedMethod === 'paystack') {
          // Launch Paystack payment
          payWithPaystack(email, name, phone, address);
        } else {
          // Cash on Delivery — place order directly
          var orderId = 'CS-' + Date.now().toString(36).toUpperCase();
          saveOrderRecord(orderId, name, email, phone, address, 'Cash on Delivery');
          showConfirmation(orderId, 'cod');
          cart = [];
          saveCart();
          updateCartBadge();
        }
      });
    }
  }

  // =============================================
  // PAYSTACK INTEGRATION
  // =============================================
  // IMPORTANT: Replace this test key with your live Paystack public key
  var PAYSTACK_PUBLIC_KEY = 'pk_test_4ead468fca399e801f68f5cc8a1f4f707576c7f1';

  function payWithPaystack(email, name, phone, address) {
    var total = getCartTotal();
    var delivery = total >= 2000 ? 0 : 200;
    var grandTotal = total + delivery;
    // Paystack expects amount in the smallest currency unit (kobo/cents)
    // For KES, 1 KSh = 100 cents
    var amountInCents = grandTotal * 100;

    var handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: amountInCents,
      currency: 'KES',
      ref: 'CS-' + Date.now().toString(36).toUpperCase(),
      metadata: {
        custom_fields: [
          { display_name: 'Customer Name', variable_name: 'customer_name', value: name },
          { display_name: 'Phone', variable_name: 'phone', value: phone },
          { display_name: 'Delivery Address', variable_name: 'delivery_address', value: address },
          { display_name: 'Cart Items', variable_name: 'cart_items', value: JSON.stringify(cart) }
        ]
      },
      callback: function (response) {
        // Payment successful
        var nm = $('#checkout-name').value.trim();
        var em = $('#checkout-email').value.trim();
        var ph = $('#checkout-phone').value.trim();
        var ad = $('#checkout-address').value.trim();
        saveOrderRecord(response.reference, nm, em, ph, ad, 'Paystack');
        showConfirmation(response.reference, 'paystack');
        cart = [];
        saveCart();
        updateCartBadge();
        showToast('Payment successful!', '✅');
      },
      onClose: function () {
        showToast('Payment cancelled', '⚠️');
      }
    });

    handler.openIframe();
  }

  function renderOrderSummary() {
    var el = $('#order-summary');
    if (!el) return;
    var total = getCartTotal();
    var delivery = total >= 2000 ? 0 : 200;
    var html = '';
    html += '<div class="modal__order-row"><span>Subtotal (' + getCartCount() + ' items)</span><span>KSh ' + total.toLocaleString() + '</span></div>';
    html += '<div class="modal__order-row"><span>Delivery</span><span>' + (delivery === 0 ? 'Free' : 'KSh ' + delivery.toLocaleString()) + '</span></div>';
    html += '<div class="modal__order-row total"><span>Total</span><span>KSh ' + (total + delivery).toLocaleString() + '</span></div>';
    el.innerHTML = html;
  }

  function showCheckoutForm() {
    $('#checkout-form').style.display = 'block';
    $('#confirmation-view').style.display = 'none';
    $('#modal-title').textContent = 'Checkout';
  }

  function showConfirmation(refId, method) {
    $('#checkout-form').style.display = 'none';
    var conf = $('#confirmation-view');
    conf.style.display = 'block';
    var payLabel = method === 'paystack' ? 'Payment confirmed via Paystack' : 'Cash on Delivery — pay on arrival';
    conf.innerHTML = '<div class="confirmation"><div class="confirmation__icon">✓</div><h2 class="confirmation__title">Order Placed!</h2><p class="confirmation__message">Thank you for shopping at CANE\'s STORE</p><p class="confirmation__order-id">Reference: ' + refId + '</p><p class="confirmation__message" style="font-size:.85rem;margin-top:-4px">' + payLabel + '</p><button class="btn btn--primary" onclick="document.getElementById(\'modal-overlay\').classList.remove(\'active\');document.body.style.overflow=\'\';location.reload();">Continue Shopping</button></div>';
    $('#modal-title').textContent = 'Confirmation';
  }

  function saveOrderRecord(orderId, name, email, phone, address, payment) {
    if (typeof CaneAuth === 'undefined') return;
    var total = getCartTotal();
    var delivery = total >= 2000 ? 0 : 200;
    CaneAuth.saveOrder({
      id: orderId,
      name: name,
      email: email,
      phone: phone,
      address: address,
      payment: payment,
      total: total + delivery,
      items: JSON.parse(JSON.stringify(cart)),
      status: 'pending',
      date: new Date().toISOString()
    });
  }

  function showToast(message, icon) {
    icon = icon || '✓';
    var existing = $('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '<span class="toast__icon">' + icon + '</span>' + message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  }

  function animateOnScroll() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    $$('.feature-item').forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });
  }
})();
