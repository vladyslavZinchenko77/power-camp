class CollectionFilter extends HTMLElement {
  constructor() {
    super();
    
    this.filterDropdown = this.querySelector('[js-filter-dropdown]');
    this.filterContent = this.querySelector('[js-filter-content]');
    this.dropdownItems = this.querySelectorAll('[js-dropdown-filter-title]');
    this.dropdownContents = this.querySelectorAll('[js-dropdown-filter-content]');

    this.filterItems = this.querySelectorAll('[js-filter-item]');
    this.sortElement = this.querySelector('[js-filter-sort]');

    this.activeItemCounts = this.querySelectorAll('[js-active-filter]');
    this.activeTotalCount = this.querySelector('[js-active-total-count]');

    this.isContain = false;
    this.init();
  }

  init() {
    this.renderFilters();
    this.sortEvents();
  }

  renderFilters () {
    let selectedFilter = null;
    const handle = this.getAttribute('data-collection-handle') ? this.getAttribute('data-collection-handle') : '';
    if (handle != '' || this.getAttribute('data-template').includes('search')) {
      collection_filters.forEach(filter => {
        filter.handles.forEach(item => {
          if (item == handle) {
            selectedFilter = filter.filters;
          }
        });
      });

      if (selectedFilter == null) {
        selectedFilter = collection_filters[0].filters;
      }

      this.dropdownContents.forEach(content => {
        let totalHtml = '';
        const title = content.getAttribute('data-title');
        const prefix = content.getAttribute('data-filter-prefix');
        const filters = selectedFilter[title];
        if (filters) {
          filters.forEach(filter => {
            const html = `
              <div class="filter-content--item" js-filter-item data-param="filter.p.tag">
                <input class="hidden" type="checkbox" name="filter.p.tag" value="${encodeURIComponent(prefix + filter)}"/>
                <label>${filter}</label>
              </div>
            `;
            totalHtml += html;
          });
  
          content.innerHTML = totalHtml;
        }
      });
    }

    this.filterItems = this.querySelectorAll('[js-filter-item]');
    
    this.renderActiveFilters();
    this.eventButtons();
    this.eventFilters();
  }

  renderActiveFilters() {
    const url = window.location.href;

    if (url.split('?').length > 0 && url.split('?')[1]) {
      const facetItems = url.split('?')[1].split('&');
      let total_url = '';
      let arr = [];

      facetItems.forEach(facet => {
        if (facet != '') {
          const param = facet.split('=')[0];
          const val = facet.split('=')[1];

          if (param == 'filter.p.tag') {
            const obj = {
              param: param,
              value: val
            }
  
            arr.push(obj);
          }
        }
      });

      arr.forEach(item => {
        this.filterItems.forEach(filterItem => {
          const input = filterItem.querySelector('input');
          if (item.value == input.value && item.param == filterItem.getAttribute('data-param')) {
            input.checked = true;
          }
        });
      });

      let total_count = 0;

      this.activeItemCounts.forEach(countItem => {
        let count = 0;
        const title = countItem.getAttribute('data-title');

        this.filterItems.forEach(filterItem => {
          if (title == filterItem.parentNode.getAttribute('data-title')) {
            const input = filterItem.querySelector('input');
            if (input.checked) count ++;
          }
        });

        countItem.setAttribute('data-count', count);
        if (count != 0) {
          countItem.innerHTML = `(${count})`;
        }

        total_count += count;
      });

      if (this.activeTotalCount) {
        this.activeTotalCount.innerHTML = total_count;
      }
    }
  }

  eventButtons() {
    if (this.filterDropdown) {
      document.body.addEventListener('click', (e) => {
        if (this.filterDropdown.contains(e.target)) {
          this.isContain = true;
        } else {
          if (this.filterContent.contains(e.target)) {
            this.isContain = true;
          } else {
            this.isContain = false;
          }
        }
  
        if (!this.isContain) {
          this.filterDropdown.classList.remove('open');
          this.filterContent.classList.remove('open');
        }
      });

      this.filterDropdown.addEventListener('click', (e) => {
        e.preventDefault();

        if (this.filterDropdown.classList.contains('open')) {
          this.filterDropdown.classList.remove('open');
          this.filterContent.classList.remove('open');
        } else {
          this.filterDropdown.classList.add('open');
          this.filterContent.classList.add('open');
        }
      });
    }

    this.dropdownItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const title = item.getAttribute('data-title');

        this.dropdownItems.forEach(rmItem => {
          if (rmItem.getAttribute('data-title') != title)
          rmItem.classList.remove('open');
        });

        let isOpen = false;
        if (item.classList.contains('open')) {
          item.classList.remove('open');
        } else {
          item.classList.add('open');
          isOpen = true;
        }

        this.dropdownContents.forEach(content => {
          const content_title = content.getAttribute('data-title');
          if (title == content_title) {
            if (isOpen) {
              content.classList.add('open');
            } else {
              content.classList.remove('open');
            }
          } else {
            content.classList.remove('open');
          }
        });
      });
    });
  }

  eventFilters() {
    this.filterItems.forEach(filter => {
      filter.addEventListener('click', (e) => {
        e.preventDefault();
        const input = filter.querySelector('input');
        input.checked = !input.checked;

        if (input.checked) {
          this.updateParams(filter);
        } else {
          this.removeParams(filter);
        }
      });
    });
  }

  sortEvents() {
    if (this.sortElement) {
      this.sortElement.addEventListener('change', (e) => {
        e.preventDefault();
        this.sortFunc();
      });

      this.sortElement.addEventListener('click', (e) => {
        e.preventDefault();

        this.filterDropdown.classList.remove('open');
        this.filterContent.classList.remove('open');
      });
    }
  }

  sortFunc () {
    let filter_str = '', url = '';
    const w_url = window.location.href;
    if (w_url.split('?').length > 0) {
      let filter_strs = w_url.split('?')[1];

      const sortElement = this.querySelector('[js-filter-sort]');
      if (sortElement) {
        const sort_param = sortElement.name;
        const sort_val = sortElement.value;

        let is_sort = false;

        if (filter_strs && filter_strs.includes('&') && filter_strs.includes('filter.')) {
          let fiter_arrs = filter_strs.split('&');
          fiter_arrs.forEach(filter => {
            if (filter != '') {
              const param_name = filter.split('=')[0];
              const value = filter.split('=')[1];
              if (param_name == 'sort_by') {
                is_sort = true;
                filter_str += `${sort_param}=${sort_val}&`
              } else {
                filter_str += `${param_name}=${value}&`
              }
            }
          });
        }

        if (!is_sort) {
          filter_str += `${sort_param}=${sort_val}&`;
        }

        url = `${window.location.pathname}?${filter_str}`;

        let template_val = 'collection';
        template_val = this.getAttribute('data-template');
        if (!template_val.includes('collection')) {
          url += `type=product&q=${this.getAttribute('data-search')}&`; 
        }

        fetch(`${url}view=json`).then(res => {
          return res.text();
        }).then(text => {
          const cHtml = document.getElementById('ProductGridContainer');
          if (cHtml) {
            cHtml.innerHTML = text;
          }

          window.history.pushState(null,"",url);
          this.changePaginationLinks();
        });
      }
    }
  }

  removeParams(activeFilter) {
    const param_name = activeFilter.getAttribute('data-param');
    const value = activeFilter.querySelector('input').value;
    const url = window.location.href;

    if (url.split('?').length > 0 && url.split('?')[1]) {
      const facetItems = url.split('?')[1].split('&');
      let total_url = '';
      facetItems.forEach(facet => {
        if (facet != '') {
          const param = facet.split('=')[0];
          const val = facet.split('=')[1];
          if (param_name == param && value == val) {
            console.log('Same parameter!');
          } else {
            total_url += `${param}=${val}&`;
          }
        }
      });
      
      let arr = [];
      const totals = total_url.split('&');
      totals.forEach(item => {
        if (item && !item.includes('sort_by=') && !item.includes("type=") && !item.includes("q=") && !item.includes('page=')) {
          const val = item.split('filter.p.tag=')[1];
          const obj = {
            id: param_name,
            value: val
          }

          arr.push(obj);
        }
      });

      if (activeFilter) {
        const title = activeFilter.parentNode.getAttribute('data-title');
  
        this.activeItemCounts.forEach(itemCount => {
          const itemTitle = itemCount.getAttribute('data-title');
  
          if (title == itemTitle) {
            let count = Number(itemCount.getAttribute('data-count'));
            if ((count - 1) == 0) {
              itemCount.innerHTML = '';
              itemCount.setAttribute('data-count', 0); 
            } else {
              itemCount.innerHTML = `(${count-1})`;
              itemCount.setAttribute('data-count', (count-1));
            }
          }
        });
      }
  
      if (this.activeTotalCount) {
        let totalCount = Number(this.activeTotalCount.innerHTML);
        this.activeTotalCount.innerHTML = totalCount - 1;
      }

      this.renderHtml(arr);
    }
  }

  updateParams(activeFilter) {
    let arr = [];
    this.filterItems.forEach(element => {
      const input = element.querySelector('input');
      let option = {
        id: input.name,
        value: input.value
      }
      if (input.checked) {
        arr.push(option);
      }
    });

    if (activeFilter) {
      const title = activeFilter.parentNode.getAttribute('data-title');

      this.activeItemCounts.forEach(itemCount => {
        const itemTitle = itemCount.getAttribute('data-title');

        if (title == itemTitle) {
          let count = Number(itemCount.getAttribute('data-count'));
          itemCount.innerHTML = `(${count+1})`;
          itemCount.setAttribute('data-count', (count+1));
        }
      });
    }

    if (this.activeTotalCount) {
      let totalCount = Number(this.activeTotalCount.innerHTML);
      this.activeTotalCount.innerHTML = totalCount + 1;
    }

    this.renderHtml(arr);
  }

  renderHtml(filters, is_price = false) {
    let filter_str = '', url = '';
    if (!is_price) {
      filters.forEach(filter => {
        filter_str += `${filter.id}=${filter.value}&`
      });

      const min_price = this.querySelector('[js-filter-min-price]');
      const max_price = this.querySelector('[js-filter-max-price]');
      if (min_price && max_price)
        url = `${window.location.pathname}?${filter_str}filter.v.price.gte=${min_price.value}&filter.v.price.lte=${max_price.value}&`;
      else
        url = `${window.location.pathname}?${filter_str}`;
    } else {
      const w_url = window.location.href;
      if (w_url.split('?').length > 0) {
        let filter_strs = w_url.split('?')[1];
  
        if (filter_strs && filter_strs.includes('&') && filter_strs.includes('filter.')) {
          let fiter_arrs = filter_strs.split('&');
          fiter_arrs.forEach(filter => {
            if (filter != '') {
              const param_name = filter.split('=')[0];
              const value = filter.split('=')[1];

              if (param_name == 'filter.v.price.lte' || param_name == 'filter.v.price.gte') {
                filters.forEach(item => {
                  if (item.id == param_name) {
                    filter_str += `${item.id}=${item.value}&`
                  }
                });
              } else {
                filter_str += `${param_name}=${value}&`
              }
            }
          });
        }

        if (!filter_str.includes('filter.v.price')) {
          const min_price = this.querySelector('[js-filter-min-price]');
          const max_price = this.querySelector('[js-filter-max-price]');
          url = `${window.location.pathname}?${filter_str}filter.v.price.gte=${min_price.value}&filter.v.price.lte=${max_price.value}&`;
        } else {
          url = `${window.location.pathname}?${filter_str}`;
        }
      }
    }

    const sortElement = document.querySelector('[js-filter-sort]');
    const sort_param = sortElement.name;
    const sort_val = sortElement.value;

    url += `${sort_param}=${sort_val}&`

    let template_val = 'collection';
    template_val = this.getAttribute('data-template');

    if (!template_val.includes('collection')) {
      url += `type=product&q=${this.getAttribute('data-search')}&`; 
    }

    console.log('url = ', url);

    fetch(`${url}view=json`).then(res => {
      return res.text();
    }).then(text => {
      let cHtml = document.getElementById('ProductGridContainer');
      if (cHtml) {
        cHtml.innerHTML = text;
      }
      window.history.pushState(null,"",url);
      this.changePaginationLinks();
    });
  }

  changePaginationLinks() {
    const links = document.querySelectorAll('.pagination-wrapper li a');
    links.forEach(link => {
      if (link.href.includes('&view=json')) {
        link.href = link.href.split('&view=json')[0];
      }
    });
  }
}

customElements.define("collection-filter", CollectionFilter);