var swiper = new Swiper(".bundle-products", {
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
});

let cartSwiper = new Swiper("[js-cart-upsell]", {
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
});

const relatedProducts = document.querySelector('.related-products');
if (relatedProducts) {
  relatedProducts.classList.add('hidden');
}

setTimeout(() => {
  const recommendationElement = document.querySelector('.product-recommendations-grid');
  if (recommendationElement) {
    relatedProducts.classList.remove('hidden');

    new Swiper(".product-recommendations-grid", {
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      slidesPerView: 1,
      spaceBetween: 30,
      breakpoints: {
        640: {
          slidesPerView: 1,
          spaceBetween: 16,
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 24,
        },
        1024: {
          slidesPerView: 4,
          spaceBetween: 30,
        }
      }
    });
  }
}, 2000);

const bundleButtons = document.querySelectorAll('[js-bundle-add-button]');
this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

bundleButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    e.preventDefault();
    const bundleForms = document.querySelectorAll('[js-bundle-form]');

    bundleForms.forEach(form => {
      const id = form.getAttribute('data-variant-id');

      if (id == button.getAttribute('data-variant-id')) {
        const button = form.querySelector('form .product-form__buttons button');
        if (button) button.click();
      }
    });
  })
});

document.addEventListener('DOMContentLoaded', function () {
  if (typeof geoip2 !== 'undefined') {
    geoip2.country(onGeoSuccess, onGeoError);
  }

  function onGeoSuccess(res) {

    if (!localStorage.getItem('saved_currency')) {
      var selected_cur = 'USD';
      if (res.continent.code == 'EU') {
        selected_cur = 'EUR';
      }
      if (res.country.iso_code == 'AU') { selected_cur = 'AUD'; }
      if (res.country.iso_code == 'BR') { selected_cur = 'BRL'; }
      if (res.country.iso_code == 'CA') { selected_cur = 'CAD'; }
      if (res.country.iso_code == 'CH') { selected_cur = 'CHF'; }
      if (res.country.iso_code == 'DK') { selected_cur = 'DKK'; }
      if (res.country.iso_code == 'GB' || res.country.iso_code == 'UK') { selected_cur = 'GBP'; }
      if (res.country.iso_code == 'HK') { selected_cur = 'HKD'; }
      if (res.country.iso_code == 'NO') { selected_cur = 'NOK'; }
      if (res.country.iso_code == 'NZ') { selected_cur = 'NZD'; }
      if (res.country.iso_code == 'SE') { selected_cur = 'SEK'; }
      if (res.country.iso_code == 'ZA') { selected_cur = 'ZAR'; }
      if (res.country.iso_code == 'JP') { selected_cur = 'YEN'; }

      if (selected_cur != 'USD'){document.querySelector('.currency-wrapper [data-cur="' + selected_cur + '"]').click()}
    }

    localStorage.setItem('geo', res.country.iso_code)

    var $msg = document.querySelector(".marquee__item");
    if(theme.marquee.enableGeo) {
      if(res.country.iso_code !== "US") {
        $msg.querySelector('span').innerHTML = theme.marquee.internationalMsg;
        $msg.style.display = 'block'
        // $msg.css('display', 'block');
      } else {
        $msg.querySelector('span').innerHTML = theme.marquee.usMsg;
        $msg.style.display = 'block'
        // $msg.css('display', 'block');
      }
    } else {
      $msg.style.display = 'block'
    }

    // check shipping message

    const shippingMessage = document.querySelector('.min_shipping_msg');
    if (shippingMessage) {
      geoip2.country((res) => {
        if(res.country.iso_code == "US") {
          const promotionBar = shippingMessage.closest('[data-shippingmin]');
          if (promotionBar) {
            const shippingPrice = Number(promotionBar.dataset.shippingmin);
            fetch('/cart.js')
              .then((response) => response.json())
              .then((response) => {
                const cartTotalPrice = response.total_price;
                if (cartTotalPrice > 0) {
                  if (cartTotalPrice >= shippingPrice) {
                    shippingMessage.querySelector('span').innerHTML = 'You got free shipping';
                  }
                  else {
                    const amountFromFree = shippingPrice - cartTotalPrice;
                    shippingMessage.querySelector('span').innerHTML = `Free shipping when you spend ` + window.EXCHANGE.ex(amountFromFree) + ' more.';
                  }
                }
              });
          }
        }
      })
    }
  }

  function onGeoError(res) {
    console.log('Geo error', res)
  }
});