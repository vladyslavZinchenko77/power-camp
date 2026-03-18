(function () {
  'use strict';

  const SELECTORS = {
    panel: '[data-recommendations-panel]',
    list: '[data-recommendations-list]',
    mobilePanel: '[data-recommendations-mobile]',
    mobileList: '[data-recommendations-mobile-list]',
  };

  class CartDrawerRecommendations {
    constructor() {
      this.cache = null;
      this.cacheKey = null;

      // Use event delegation on document so clicks work even after DOM replacement
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-add-recommended]');
        if (btn) {
          e.preventDefault();
          this.addToCart(btn.dataset.variantId, btn);
        }
      });

      this.fetchRecommendations();

      // Re-fetch when cart updates via Dawn PubSub (quantity change, item removal)
      this.subscribeToPubSub();

      // Re-fetch when drawer opens
      var drawerEl = document.querySelector('cart-drawer');
      if (drawerEl) {
        var self = this;
        var classObserver = new MutationObserver(function (mutations) {
          for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].attributeName === 'class' && drawerEl.classList.contains('active')) {
              self.fetchRecommendations();
              break;
            }
          }
        });
        classObserver.observe(drawerEl, { attributes: true, attributeFilter: ['class'] });
      }

      // Re-fetch when .drawer__inner children are replaced wholesale
      this._innerObserver = null;
      this._innerDebounce = null;
      this.setupInnerObserver();
    }

    /**
     * Observe .drawer__inner for direct childList changes (e.g. discount code apply).
     * Re-attaches each time because .drawer__inner can be destroyed and recreated.
     */
    setupInnerObserver() {
      if (this._innerObserver) this._innerObserver.disconnect();

      var drawerInner = document.querySelector('.drawer__inner');
      if (!drawerInner) return;

      var self = this;
      this._innerObserver = new MutationObserver(function () {
        var drawer = document.querySelector('cart-drawer');
        if (!drawer || !drawer.classList.contains('active')) return;
        clearTimeout(self._innerDebounce);
        self._innerDebounce = setTimeout(function () {
          self.cache = null;
          self.cacheKey = null;
          self.fetchRecommendations();
        }, 300);
      });
      this._innerObserver.observe(drawerInner, { childList: true });
    }

    subscribeToPubSub() {
      var self = this;
      var trySubscribe = function () {
        if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          subscribe(PUB_SUB_EVENTS.cartUpdate, function () {
            self.showLoader();
            setTimeout(function () { self.showLoader(); }, 300);
            setTimeout(function () {
              self.cache = null;
              self.cacheKey = null;
              self.fetchRecommendations();
            }, 600);
          });
        } else {
          setTimeout(trySubscribe, 100);
        }
      };
      trySubscribe();
    }

    /**
     * Show loader in both desktop and mobile lists.
     */
    showLoader() {
      if (this.getElements()) {
        this.forceVisible();

        var loaderHtml = this.createLoaderElement();
        this.list.innerHTML = '';
        this.list.appendChild(loaderHtml.cloneNode(true));
        if (this.mobileList) {
          this.mobileList.innerHTML = '';
          this.mobileList.appendChild(loaderHtml.cloneNode(true));
        }
        var inlineList = document.querySelector('[data-recommendations-inline-list]');
        if (inlineList) {
          inlineList.innerHTML = '';
          inlineList.appendChild(loaderHtml.cloneNode(true));
        }

      }
    }

    createLoaderElement() {
      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;width:100%;padding:30px 0;';
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 200 200');
      svg.setAttribute('width', '40');
      svg.setAttribute('height', '40');
      svg.style.cssText = 'animation:recSpin 2s linear infinite;';
      svg.innerHTML =
        '<defs><radialGradient id="recSpinGrad" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)">' +
          '<stop offset="0" stop-color="#333333"/><stop offset=".3" stop-color="#333333" stop-opacity=".9"/>' +
          '<stop offset=".6" stop-color="#333333" stop-opacity=".6"/><stop offset=".8" stop-color="#333333" stop-opacity=".3"/>' +
          '<stop offset="1" stop-color="#333333" stop-opacity="0"/></radialGradient></defs>' +
        '<circle fill="none" opacity=".2" stroke="#333333" stroke-width="15" stroke-linecap="round" cx="100" cy="100" r="70"/>' +
        '<circle fill="none" stroke="url(#recSpinGrad)" stroke-width="15" stroke-linecap="round" stroke-dasharray="200 1000" cx="100" cy="100" r="70"/>';
      if (!document.getElementById('recSpinStyle')) {
        var style = document.createElement('style');
        style.id = 'recSpinStyle';
        style.textContent = '@keyframes recSpin{to{transform:rotate(360deg)}}';
        document.head.appendChild(style);
      }
      wrapper.appendChild(svg);
      return wrapper;
    }

    /**
     * If the drawer is already open, force the desktop panel to be visible immediately
     * (skip the CSS entrance animation that has a 0.5s delay).
     */
    forceVisible() {
      if (!this.panel) return;
      var drawerEl = document.querySelector('cart-drawer');
      if (drawerEl && drawerEl.classList.contains('active')) {
        this.panel.style.transition = 'none';
        this.panel.style.opacity = '1';
        this.panel.style.transform = 'translateX(0)';
      }
    }

    /**
     * Re-query DOM elements every time — section rendering may have replaced them.
     */
    getElements() {
      this.panel = document.querySelector(SELECTORS.panel);
      if (!this.panel) return false;
      this.list = this.panel.querySelector(SELECTORS.list);
      this.mobilePanel = document.querySelector(SELECTORS.mobilePanel);
      this.mobileList = this.mobilePanel ? this.mobilePanel.querySelector(SELECTORS.mobileList) : null;
      this.limit = parseInt(this.panel.dataset.limit || '6', 10);
      this.addText = this.panel.dataset.addText || '+ Add';
      this.moneyFormat = this.panel.dataset.moneyFormat || '${{amount}}';
      this.scrollableMobile = this.panel.dataset.recommendationsScrollableMobile === 'true';
      return !!this.list;
    }

    async fetchRecommendations() {
      if (!this.getElements()) return;
      this.forceVisible();

      try {
        const cartResponse = await fetch('/cart.js');
        const cart = await cartResponse.json();

        if (!this.getElements()) return;
        this.forceVisible();

        if (cart.item_count === 0) {
  
          this.list.innerHTML = '';
          if (this.mobileList) this.mobileList.innerHTML = '';
          this.panel.style.display = 'none';
          if (this.mobilePanel) this.mobilePanel.style.display = 'none';
          var inlineHide = document.querySelector('[data-recommendations-inline]');
          if (inlineHide) inlineHide.style.display = 'none';
  
          return;
        }

        this.panel.style.removeProperty('display');
        if (this.mobilePanel) this.mobilePanel.style.removeProperty('display');
        this.ensureInlineRecommendations();

        const cartProductIds = cart.items.map((item) => item.product_id);
        const cacheKey = cartProductIds.sort().join(',');

        if (this.cacheKey === cacheKey && this.cache) {
          this.render(this.cache, cartProductIds);
          return;
        }


        this.list.innerHTML = '<div class="cart-drawer-recommendations__loader"></div>';


        const fetchPromises = cart.items.map((item) =>
          fetch(
            '/recommendations/products.json?product_id=' +
              item.product_id +
              '&limit=' +
              this.limit
          )
            .then((r) => r.json())
            .then((data) => data.products || [])
            .catch(() => [])
        );

        const results = await Promise.all(fetchPromises);
        const allProducts = results.flat();

        const seen = new Set();
        const uniqueProducts = [];
        for (const product of allProducts) {
          if (!seen.has(product.id) && !cartProductIds.includes(product.id)) {
            seen.add(product.id);
            uniqueProducts.push(product);
          }
        }

        const limitedProducts = uniqueProducts.slice(0, this.limit);

        this.cache = limitedProducts;
        this.cacheKey = cacheKey;

        this.render(limitedProducts, cartProductIds);
      } catch (error) {
        console.error('[Cart Recommendations] Error fetching:', error);
      }

      // Re-attach observer to current .drawer__inner (it may have been recreated)
      this.setupInnerObserver();
    }

    render(products, cartProductIds) {
      if (!this.getElements()) return;
      this.forceVisible();

      if (!products || products.length === 0) {
        this.list.innerHTML = '';
        if (this.mobileList) this.mobileList.innerHTML = '';
        var inlineEmpty = document.querySelector('[data-recommendations-inline]');
        if (inlineEmpty) inlineEmpty.style.display = 'none';
        this.syncInlineRecommendations();

        return;
      }

      const filtered = cartProductIds
        ? products.filter((p) => !cartProductIds.includes(p.id))
        : products;

      if (filtered.length === 0) {
        this.list.innerHTML = '';
        if (this.mobileList) this.mobileList.innerHTML = '';
        var inlineNone = document.querySelector('[data-recommendations-inline]');
        if (inlineNone) inlineNone.style.display = 'none';
        this.syncInlineRecommendations();

        return;
      }

      // Desktop cards (vertical list)
      this.list.innerHTML = filtered
        .map((product) => this.renderDesktopCard(product))
        .join('');

      // Mobile cards (horizontal slider)
      if (this.mobileList) {
        this.mobileList.innerHTML = filtered
          .map((product) => this.renderMobileCard(product))
          .join('');
      }

      // Inline recommendations (scrollable mobile mode)
      this.ensureInlineRecommendations();
      var inlineRec = document.querySelector('[data-recommendations-inline]');
      if (inlineRec) {
        inlineRec.style.removeProperty('display');
      }
      this.syncInlineRecommendations();

    }

    /**
     * Dynamically create inline recommendations container inside cart-drawer-items
     * so it scrolls with the cart items (used when scrollableMobile is true or screen <= 375px).
     */
    ensureInlineRecommendations() {
      var cartDrawerItems = document.querySelector('cart-drawer-items');
      if (!cartDrawerItems) return;

      var inline = cartDrawerItems.querySelector('[data-recommendations-inline]');
      if (!inline) {
        inline = document.createElement('div');
        inline.className = 'cart-drawer-recommendations-inline';
        inline.setAttribute('data-recommendations-inline', '');

        if (this.mobilePanel) {
          inline.style.cssText = this.mobilePanel.style.cssText;
        }

        inline.style.display = 'none';

        var titleEl = this.panel ? this.panel.querySelector('.cart-drawer-recommendations__title') : null;
        var titleText = titleEl ? titleEl.textContent.trim() : 'You may also like';

        inline.innerHTML =
          '<h3 class="cart-drawer-recommendations-mobile__title">' +
          this.escapeHtml(titleText) +
          '</h3>' +
          '<div class="cart-drawer-recommendations-mobile__slider" data-recommendations-inline-list></div>';

        cartDrawerItems.appendChild(inline);
      }
    }

    /**
     * Copy mobile list content into the inline list.
     */
    syncInlineRecommendations() {
      var cartDrawerItems = document.querySelector('cart-drawer-items');
      if (!cartDrawerItems) return;
      var inlineList = cartDrawerItems.querySelector('[data-recommendations-inline-list]');
      if (inlineList && this.mobileList) {
        inlineList.innerHTML = this.mobileList.innerHTML;
      }
    }

    renderDesktopCard(product) {
      var variant = product.variants && product.variants[0];
      if (!variant) return '';

      var hasComparePrice =
        product.compare_at_price && product.compare_at_price > product.price;
      var image = product.featured_image || (product.images && product.images[0]);

      return (
        '<div class="cart-drawer-recommendations__card" data-rec-product-id="' +
        product.id +
        '">' +
        '<div class="cart-drawer-recommendations__card-image">' +
        (image
          ? '<img src="' +
            image +
            '" alt="' +
            this.escapeHtml(product.title) +
            '" width="70" height="70" loading="lazy">'
          : '') +
        '</div>' +
        '<div class="cart-drawer-recommendations__card-info">' +
        '<h4 class="cart-drawer-recommendations__card-name">' +
        '<a href="' +
        product.url +
        '">' +
        this.escapeHtml(product.title) +
        '</a>' +
        '</h4>' +
        '<div class="cart-drawer-recommendations__card-prices">' +
        (hasComparePrice
          ? '<span class="cart-drawer-recommendations__card-price-compare">' +
            this.formatMoney(product.compare_at_price) +
            '</span>'
          : '') +
        '<span class="cart-drawer-recommendations__card-price' +
        (hasComparePrice
          ? ' cart-drawer-recommendations__card-price--sale'
          : '') +
        '">' +
        this.formatMoney(product.price) +
        '</span>' +
        '</div>' +
        '<button type="button" class="cart-drawer-recommendations__add-btn" data-add-recommended data-variant-id="' +
        variant.id +
        '">' +
        this.escapeHtml(this.addText) +
        '</button>' +
        '</div>' +
        '</div>'
      );
    }

    renderMobileCard(product) {
      var variant = product.variants && product.variants[0];
      if (!variant) return '';

      var hasComparePrice =
        product.compare_at_price && product.compare_at_price > product.price;
      var image = product.featured_image || (product.images && product.images[0]);

      return (
        '<div class="cart-drawer-recommendations-mobile__card" data-rec-product-id="' +
        product.id +
        '">' +
        '<div class="cart-drawer-recommendations-mobile__card-image">' +
        (image
          ? '<img src="' +
            image +
            '" alt="' +
            this.escapeHtml(product.title) +
            '" width="70" height="70" loading="lazy">'
          : '') +
        '</div>' +
        '<div class="cart-drawer-recommendations-mobile__card-info">' +
        '<h4 class="cart-drawer-recommendations-mobile__card-name">' +
        '<a href="' +
        product.url +
        '">' +
        this.escapeHtml(product.title) +
        '</a>' +
        '</h4>' +
        '<div class="cart-drawer-recommendations-mobile__card-prices">' +
        (hasComparePrice
          ? '<span class="cart-drawer-recommendations-mobile__card-price-compare">' +
            this.formatMoney(product.compare_at_price) +
            '</span>'
          : '') +
        '<span class="cart-drawer-recommendations-mobile__card-price' +
        (hasComparePrice
          ? ' cart-drawer-recommendations-mobile__card-price--sale'
          : '') +
        '">' +
        this.formatMoney(product.price) +
        '</span>' +
        '</div>' +
        '<button type="button" class="cart-drawer-recommendations-mobile__card-add-btn" data-add-recommended data-variant-id="' +
        variant.id +
        '">' +
        this.escapeHtml(this.addText) +
        '</button>' +
        '</div>' +
        '</div>'
      );
    }

    async addToCart(variantId, buttonEl) {
      if (!variantId) return;

      var card = buttonEl.closest('.cart-drawer-recommendations__card') ||
                 buttonEl.closest('.cart-drawer-recommendations-mobile__card');
      buttonEl.classList.add('is-loading');
      if (card) card.classList.add('is-loading');

      try {
        var response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ id: parseInt(variantId, 10), quantity: 1 }),
        });

        if (!response.ok) {
          var errorData = await response.json();
          console.error('[Cart Recommendations] Add error:', errorData.description);
          return;
        }

        // Remove card with animation
        if (card) {
          card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
          card.style.opacity = '0';
          card.style.transform = 'translateX(-10px)';
          setTimeout(function () { card.remove(); }, 200);
        }

        // Show loader while updating
        this.showLoader();

        // Update cart drawer sections and wait for completion
        await this.updateCartDrawerSections();

        // Invalidate cache and re-fetch recommendations
        this.cache = null;
        this.cacheKey = null;
        await this.fetchRecommendations();
      } catch (error) {
        console.error('[Cart Recommendations] Add to cart error:', error);
      } finally {
        buttonEl.classList.remove('is-loading');
        if (card) card.classList.remove('is-loading');
      }
    }

    async updateCartDrawerSections() {
      try {
        var html = await fetch(routes.cart_url + '?section_id=cart-drawer').then(function (r) {
          return r.text();
        });
        var doc = new DOMParser().parseFromString(html, 'text/html');

        var sourceEmpty = doc.querySelector('cart-drawer');
        if (sourceEmpty && sourceEmpty.classList.contains('is-empty')) {
          window.location.reload();
          return;
        }

        var selectors = [
          'cart-drawer-items',
          '.cart-drawer__footer',
          '.js-free-shipping',
        ];

        for (var i = 0; i < selectors.length; i++) {
          var target = document.querySelector(selectors[i]);
          var source = doc.querySelector(selectors[i]);
          if (target && source) {
            target.replaceWith(source);
          }
        }

        // Update cart icon bubble
        var bubbleHtml = await fetch(routes.cart_url + '?section_id=cart-icon-bubble').then(function (r) {
          return r.text();
        });
        var bubbleDoc = new DOMParser().parseFromString(bubbleHtml, 'text/html');
        var bubbleTarget = document.getElementById('cart-icon-bubble');
        var bubbleSource = bubbleDoc.querySelector('.shopify-section');
        if (bubbleTarget && bubbleSource) {
          bubbleTarget.innerHTML = bubbleSource.innerHTML;
        }
      } catch (error) {
        console.error('[Cart Recommendations] Section update error:', error);
      }
    }

    formatMoney(cents) {
      if (window.Shopify && window.Shopify.formatMoney) {
        return window.Shopify.formatMoney(cents, this.moneyFormat);
      }
      var amount = (cents / 100).toFixed(2);
      return this.moneyFormat
        .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, amount.replace('.', ','))
        .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, Math.floor(cents / 100).toString())
        .replace(/\{\{\s*amount\s*\}\}/g, amount);
    }

    escapeHtml(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      new CartDrawerRecommendations();
    });
  } else {
    new CartDrawerRecommendations();
  }
})();
