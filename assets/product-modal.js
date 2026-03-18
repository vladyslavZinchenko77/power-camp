if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
        this.initSlider();
        this.activeSliderIdx = 0;
      }

      hide() {
        super.hide();
      }

      show(opener) {
        super.show(opener);
        this.showActiveMedia();
      }

      initSlider() {
        const outsideEl = this.querySelector('.product-media-modal__content');
        if (outsideEl) {
          outsideEl.addEventListener('click', function () {
            const closeBtn = outsideEl.previousElementSibling;
            if (closeBtn) {
              closeBtn.click();
            }
          });
        }

        const swiper = new Swiper(".product-media-modal__content", {
          navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
          },
          slidesPerView: 1,
          spaceBetween: 30,
          effect: "fade",
          draggable: false,
          allowTouchMove: false
        });

        const items = document.querySelectorAll('.slider-mobile-gutter ul li .product__modal-opener--image');
        items.forEach((item, index) => {
          item.addEventListener('click', (e) => {
            const modalItems = document.querySelectorAll('.product-media-modal__content .swiper-slide');
            modalItems.forEach((modal) => {
              const id = modal.getAttribute('data-media-id');
              if (item.querySelector('button.product__media-toggle').getAttribute('data-media-id') == id) {
                swiper.slideTo(index);
              }
            });
          });
        });
      }

      showActiveMedia() {
        this.querySelectorAll(
          `[data-media-id]:not([data-media-id="${this.openedBy.getAttribute('data-media-id')}"])`
        ).forEach((element) => {
          element.classList.remove('active');
        });
        const activeMedia = this.querySelector(`[data-media-id="${this.openedBy.getAttribute('data-media-id')}"]`);
        const activeMediaTemplate = activeMedia.querySelector('template');
        const activeMediaContent = activeMediaTemplate ? activeMediaTemplate.content : null;
        activeMedia.classList.add('active');
        activeMedia.scrollIntoView();

        const container = this.querySelector('[role="document"]');
        container.scrollLeft = (activeMedia.width - container.clientWidth) / 2;

        if (
          activeMedia.nodeName == 'DEFERRED-MEDIA' &&
          activeMediaContent &&
          activeMediaContent.querySelector('.js-youtube')
        )
          activeMedia.loadContent();
      }
    }
  );
}
