import {
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  WEEKDAYS_INITIALS,
  formatDate,
  parseDate,
  isSameDay,
  isBeforeDay,
  isAfterDay,
  isBetweenDays,
  addDays,
  addMonths,
  addYears,
  getDaysInMonth,
  getFirstDayOfWeekIndex
} from './date-utils.js';

export class DateRangePickerHierarchical {
  constructor(options = {}) {
    this.triggerId = options.triggerId || 'date-range-trigger-h';
    this.popoverId = options.popoverId || 'date-range-popover-h';
    this.onApplyCallback = options.onApply || null;

    // State matching Google Data Studio reference
    this.startDate = options.initialStartDate || new Date(2025, 0, 1);  // 1 Jan 2025
    this.endDate = options.initialEndDate || new Date(2026, 6, 25);    // 25 Jul 2026
    this.hoverDate = null;
    this.selectedOptionLabel = 'Fixo';
    this.committedStartDate = this.startDate ? new Date(this.startDate) : null;
    this.committedEndDate = this.endDate ? new Date(this.endDate) : null;
    this.committedOptionLabel = this.selectedOptionLabel;

    this.leftBaseDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
    this.leftMode = 'days'; // 'days' | 'months' | 'years'
    this.leftYearBlockStart = 2016;

    this.rightBaseDate = new Date(this.endDate.getFullYear(), this.endDate.getMonth(), 1);
    this.rightMode = 'days'; // 'days' | 'months' | 'years'
    this.rightYearBlockStart = 2016;

    this.isOpen = false;

    // DOM Elements
    this.triggerEl = document.getElementById(this.triggerId);
    this.popoverEl = document.getElementById(this.popoverId);
    this.startInputEl = document.getElementById(options.startInputId || 'hierarchical-start-input');
    this.endInputEl = document.getElementById(options.endInputId || 'hierarchical-end-input');

    this.init();
  }

  init() {
    if (!this.popoverEl || !this.triggerEl || !this.startInputEl || !this.endInputEl) {
      console.error('DateRangePickerHierarchical missing required DOM elements');
      return;
    }

    this.renderPopoverStructure();
    this.bindEvents();
    this.updateTriggerDisplay();
    this.renderView();
  }

  renderPopoverStructure() {
    this.popoverEl.className = 'hierarchical-drp-popover';
    this.popoverEl.setAttribute('role', 'dialog');
    this.popoverEl.setAttribute('aria-label', 'Selecionar intervalo de datas por ano, mês ou dia');
    this.popoverEl.setAttribute('aria-hidden', 'true');
    this.popoverEl.innerHTML = `
      <!-- Top Dark Header Bar with Custom Flyout Dropdown (Exact Google Data Studio Replica) -->
      <div class="ds-header-bar">
        <div class="ds-header-title">Período de datas</div>
        
        <!-- Custom Dropdown Component -->
        <div class="ds-dropdown-wrapper">
          <button type="button" class="ds-dropdown-btn" id="ds-dropdown-trigger">
            <span id="ds-selected-label">Fixo</span>
            <span class="ds-arrow">▼</span>
          </button>

          <!-- Main Dropdown Flyout Menu -->
          <div class="ds-dropdown-menu" id="ds-dropdown-menu">
            <button type="button" class="ds-menu-item active" data-preset="fixed">Fixo</button>
            <button type="button" class="ds-menu-item" data-preset="today">Hoje</button>
            <button type="button" class="ds-menu-item" data-preset="yesterday">Ontem</button>
            
            <!-- Submenu 1: Este mês -->
            <div class="ds-menu-item has-submenu" tabindex="0" role="menuitem" aria-haspopup="menu">
              <span>Este mês</span>
              <span class="ds-submenu-arrow">▶</span>
              <div class="ds-submenu">
                <button type="button" class="ds-submenu-item" data-preset="thisWeekSun">Esta semana (começa no domingo)</button>
                <button type="button" class="ds-submenu-item" data-preset="thisWeekMon">Esta semana (começa na segunda-feira)</button>
                <button type="button" class="ds-submenu-item" data-preset="thisMonthFull">Este mês</button>
                <button type="button" class="ds-submenu-item" data-preset="thisMonthSoFar">Este mês, até agora</button>
                <button type="button" class="ds-submenu-item" data-preset="thisQuarter">Este trimestre</button>
                <button type="button" class="ds-submenu-item" data-preset="thisQuarterSoFar">Este trimestre, até agora</button>
                <button type="button" class="ds-submenu-item" data-preset="thisYearFull">Este ano</button>
                <button type="button" class="ds-submenu-item" data-preset="thisYearSoFar">Este ano, até agora</button>
              </div>
            </div>

            <!-- Submenu 2: Últimos 7 dias -->
            <div class="ds-menu-item has-submenu" tabindex="0" role="menuitem" aria-haspopup="menu">
              <span>Últimos 7 dias</span>
              <span class="ds-submenu-arrow">▶</span>
              <div class="ds-submenu">
                <button type="button" class="ds-submenu-item" data-preset="last7">Últimos 7 dias</button>
                <button type="button" class="ds-submenu-item" data-preset="last14">Últimos 14 dias</button>
                <button type="button" class="ds-submenu-item" data-preset="last28">Últimos 28 dias</button>
                <button type="button" class="ds-submenu-item" data-preset="last30">Últimos 30 dias</button>
                <button type="button" class="ds-submenu-item" data-preset="lastWeekSun">Semana passada (começa no domingo)</button>
                <button type="button" class="ds-submenu-item" data-preset="lastWeekMon">Semana passada (começa na segunda-feira)</button>
                <button type="button" class="ds-submenu-item" data-preset="lastMonth">Mês passado</button>
                <button type="button" class="ds-submenu-item" data-preset="lastQuarter">Trimestre passado</button>
                <button type="button" class="ds-submenu-item" data-preset="lastYear">Ano passado</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Body Content with Dual Columns -->
      <div class="ds-body-content">
        <!-- Left Column: Data de início -->
        <div class="ds-col" id="ds-col-left">
          <div class="ds-col-title">Data de início</div>
          <div class="ds-nav-row" id="ds-nav-left"></div>
          <div class="ds-grid-container" id="ds-body-left"></div>
        </div>

        <!-- Right Column: Data de término -->
        <div class="ds-col" id="ds-col-right">
          <div class="ds-col-title">Data de término</div>
          <div class="ds-nav-row" id="ds-nav-right"></div>
          <div class="ds-grid-container" id="ds-body-right"></div>
        </div>
      </div>

      <!-- Footer Actions (Data Studio Style) -->
      <footer class="ds-footer">
        <button type="button" class="ds-btn-cancel" id="ds-btn-cancel">Cancelar</button>
        <button type="button" class="ds-btn-apply" id="ds-btn-apply">Aplicar</button>
      </footer>
    `;
  }

  bindEvents() {
    // Prevent clicks inside popover from bubbling up to document click listener
    this.popoverEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    this.triggerEl.querySelector('.modern-calendar-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePopover();
    });

    [this.startInputEl, this.endInputEl].forEach(input => {
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.applyManualInput();
        }
      });
      input.addEventListener('change', () => this.applyManualInput());
    });

    // Close ONLY when clicking outside trigger and popover
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.triggerEl.contains(e.target)) {
        this.cancelSelection();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.cancelSelection();
      }
    });

    document.addEventListener('date-range-picker:open', (e) => {
      if (e.detail !== this && this.isOpen) this.cancelSelection();
    });

    // Custom Dropdown Trigger
    const dropdownBtn = this.popoverEl.querySelector('#ds-dropdown-trigger');
    const dropdownMenu = this.popoverEl.querySelector('#ds-dropdown-menu');

    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('open');
    });

    // Dropdown Items Click
    const menuItems = this.popoverEl.querySelectorAll('[data-preset]');
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const presetKey = item.getAttribute('data-preset');
        const labelText = item.textContent.trim();

        this.selectedOptionLabel = labelText;
        this.popoverEl.querySelector('#ds-selected-label').textContent = labelText;
        dropdownMenu.classList.remove('open');

        this.applyPresetRule(presetKey);
      });
    });

    this.popoverEl.querySelector('#ds-btn-cancel').addEventListener('click', () => {
      this.cancelSelection();
    });

    // ONLY CLOSE ON "APLICAR" CLICK
    this.popoverEl.querySelector('#ds-btn-apply').addEventListener('click', () => {
      this.applySelection();
    });
  }

  togglePopover() {
    if (this.isOpen) this.cancelSelection();
    else this.openPopover();
  }

  openPopover() {
    document.dispatchEvent(new CustomEvent('date-range-picker:open', { detail: this }));
    this.isOpen = true;
    this.popoverEl.classList.add('open');
    this.triggerEl.classList.add('active');
    this.popoverEl.setAttribute('aria-hidden', 'false');
    this.triggerEl.setAttribute('aria-expanded', 'true');
    this.renderView();
  }

  closePopover() {
    this.isOpen = false;
    this.popoverEl.classList.remove('open');
    this.triggerEl.classList.remove('active');
    this.popoverEl.setAttribute('aria-hidden', 'true');
    this.triggerEl.setAttribute('aria-expanded', 'false');
    const dropdownMenu = this.popoverEl.querySelector('#ds-dropdown-menu');
    if (dropdownMenu) dropdownMenu.classList.remove('open');
  }

  applyPresetRule(presetKey) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = null;
    let end = null;

    const getWeekStart = (date, startsOnMonday) => {
      const firstDay = startsOnMonday ? 1 : 0;
      const offset = (date.getDay() - firstDay + 7) % 7;
      return addDays(date, -offset);
    };

    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
    const currentQuarterStart = new Date(today.getFullYear(), quarterStartMonth, 1);

    switch (presetKey) {
      case 'fixed':
      case 'custom':
        return;
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start = addDays(today, -1);
        end = addDays(today, -1);
        break;
      case 'last7':
        start = addDays(today, -6);
        end = today;
        break;
      case 'last14':
        start = addDays(today, -13);
        end = today;
        break;
      case 'last28':
        start = addDays(today, -27);
        end = today;
        break;
      case 'last30':
        start = addDays(today, -29);
        end = today;
        break;
      case 'thisWeekSun':
        start = getWeekStart(today, false);
        end = addDays(start, 6);
        break;
      case 'thisWeekMon':
        start = getWeekStart(today, true);
        end = addDays(start, 6);
        break;
      case 'thisMonthFull':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'thisMonthSoFar':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case 'lastMonth':
        const prevM = addMonths(today, -1);
        start = new Date(prevM.getFullYear(), prevM.getMonth(), 1);
        end = new Date(prevM.getFullYear(), prevM.getMonth() + 1, 0);
        break;
      case 'thisQuarter':
        start = currentQuarterStart;
        end = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
        break;
      case 'thisQuarterSoFar':
        start = currentQuarterStart;
        end = today;
        break;
      case 'lastWeekSun': {
        const currentWeekStart = getWeekStart(today, false);
        start = addDays(currentWeekStart, -7);
        end = addDays(start, 6);
        break;
      }
      case 'lastWeekMon': {
        const currentWeekStart = getWeekStart(today, true);
        start = addDays(currentWeekStart, -7);
        end = addDays(start, 6);
        break;
      }
      case 'lastQuarter':
        start = addMonths(currentQuarterStart, -3);
        end = addDays(currentQuarterStart, -1);
        break;
      case 'thisYearFull':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case 'thisYearSoFar':
        start = new Date(today.getFullYear(), 0, 1);
        end = today;
        break;
      case 'lastYear':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }

    if (start && end) {
      this.startDate = start;
      this.endDate = end;
      this.leftBaseDate = new Date(start.getFullYear(), start.getMonth(), 1);
      this.rightBaseDate = new Date(end.getFullYear(), end.getMonth(), 1);
      this.renderView();
    }
  }

  renderView() {
    this.renderColumn('left');
    this.renderColumn('right');
  }

  renderColumn(side) {
    const isLeft = side === 'left';
    const mode = isLeft ? this.leftMode : this.rightMode;
    const baseDate = isLeft ? this.leftBaseDate : this.rightBaseDate;
    const yearBlockStart = isLeft ? this.leftYearBlockStart : this.rightYearBlockStart;

    const navRow = this.popoverEl.querySelector(`#ds-nav-${side}`);
    const bodyContainer = this.popoverEl.querySelector(`#ds-body-${side}`);

    let navTitle = '';
    let arrowChar = '▾';

    if (mode === 'days') {
      const monthShort = MONTH_NAMES_SHORT[baseDate.getMonth()];
      navTitle = `${monthShort} DE ${baseDate.getFullYear()}`;
      arrowChar = '▾';
    } else if (mode === 'months') {
      navTitle = `${baseDate.getFullYear()}`;
      arrowChar = '▲';
    } else if (mode === 'years') {
      navTitle = `${yearBlockStart} – ${yearBlockStart + 23}`;
      arrowChar = '▲';
    }

    navRow.innerHTML = `
      <button type="button" class="ds-nav-title-btn" id="ds-btn-title-${side}">
        <span>${navTitle}</span>
        <span class="arrow">${arrowChar}</span>
      </button>
      <div class="ds-chevrons-group">
        <button type="button" class="ds-chevron-btn" id="ds-btn-prev-${side}">&lt;</button>
        <button type="button" class="ds-chevron-btn" id="ds-btn-next-${side}">&gt;</button>
      </div>
    `;

    navRow.querySelector(`#ds-btn-title-${side}`).addEventListener('click', () => {
      if (mode === 'days') {
        this.setMode(side, 'months');
      } else if (mode === 'months') {
        this.setMode(side, 'years');
      } else if (mode === 'years') {
        this.setMode(side, 'days');
      }
    });

    navRow.querySelector(`#ds-btn-prev-${side}`).addEventListener('click', () => {
      this.navigateColumn(side, -1);
    });

    navRow.querySelector(`#ds-btn-next-${side}`).addEventListener('click', () => {
      this.navigateColumn(side, 1);
    });

    if (mode === 'days') {
      bodyContainer.innerHTML = this.buildDaysHTML(baseDate);
      this.attachDayEvents(bodyContainer, side);
    } else if (mode === 'months') {
      bodyContainer.innerHTML = this.buildMonthsHTML(baseDate);
      this.attachMonthEvents(bodyContainer, side);
    } else if (mode === 'years') {
      bodyContainer.innerHTML = this.buildYearsHTML(yearBlockStart, baseDate);
      this.attachYearEvents(bodyContainer, side);
    }
  }

  setMode(side, mode) {
    if (side === 'left') this.leftMode = mode;
    else this.rightMode = mode;
    this.renderView();
  }

  navigateColumn(side, direction) {
    const isLeft = side === 'left';
    const mode = isLeft ? this.leftMode : this.rightMode;

    if (mode === 'days') {
      if (isLeft) this.leftBaseDate = addMonths(this.leftBaseDate, direction);
      else this.rightBaseDate = addMonths(this.rightBaseDate, direction);
    } else if (mode === 'months') {
      if (isLeft) this.leftBaseDate = addYears(this.leftBaseDate, direction);
      else this.rightBaseDate = addYears(this.rightBaseDate, direction);
    } else if (mode === 'years') {
      if (isLeft) this.leftYearBlockStart += direction * 24;
      else this.rightYearBlockStart += direction * 24;
    }

    this.renderView();
  }

  buildDaysHTML(baseDate) {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const startDayOfWeek = getFirstDayOfWeekIndex(year, month);
    const today = new Date();

    let html = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div class="ds-weekdays-grid">
          ${WEEKDAYS_INITIALS.map(w => `<div class="ds-weekday">${w}</div>`).join('')}
        </div>
        <div class="ds-days-grid">
    `;

    for (let i = 0; i < startDayOfWeek; i++) {
      html += `<div class="ds-day-cell outside"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const isTodayCell = isSameDay(cellDate, today);

      let classes = ['ds-day-cell'];
      if (isTodayCell) classes.push('today');

      const isStart = this.startDate && isSameDay(cellDate, this.startDate);
      const isEnd = this.endDate && isSameDay(cellDate, this.endDate);

      if (isStart) classes.push('range-start');
      if (isEnd) classes.push('range-end');

      if (this.startDate && this.endDate && isBetweenDays(cellDate, this.startDate, this.endDate)) {
        if (!isStart && !isEnd) {
          classes.push('in-range');
        }
      }

      if (this.startDate && !this.endDate && this.hoverDate) {
        if (isAfterDay(this.hoverDate, this.startDate)) {
          if (isBetweenDays(cellDate, this.startDate, this.hoverDate) && !isStart) {
            classes.push('hover-range');
          }
        }
      }

      const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      html += `<button type="button" class="${classes.join(' ')}" data-date="${isoDate}" aria-label="${day} de ${MONTH_NAMES[month]} de ${year}">${day}</button>`;
    }

    html += `</div></div>`;
    return html;
  }

  buildMonthsHTML(baseDate) {
    const selectedMonth = baseDate.getMonth();
    let html = `<div class="ds-months-grid">`;

    MONTH_NAMES_SHORT.forEach((mName, index) => {
      let isSel = index === selectedMonth ? 'selected' : '';
      html += `<button type="button" class="ds-month-cell ${isSel}" data-month="${index}">${mName}</button>`;
    });

    html += `</div>`;
    return html;
  }

  buildYearsHTML(blockStart, baseDate) {
    const selectedYear = baseDate.getFullYear();
    let html = `<div class="ds-years-grid">`;

    for (let year = blockStart; year < blockStart + 24; year++) {
      let isSel = year === selectedYear ? 'selected' : '';
      html += `<button type="button" class="ds-year-cell ${isSel}" data-year="${year}">${year}</button>`;
    }

    html += `</div>`;
    return html;
  }

  attachDayEvents(container, side) {
    const dayCells = container.querySelectorAll('.ds-day-cell:not(.outside)');
    dayCells.forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        if (dateStr) {
          const [y, m, d] = dateStr.split('-').map(Number);
          const clickedDate = new Date(y, m - 1, d);

          this.popoverEl.querySelector('#ds-selected-label').textContent = 'Fixo';
          this.selectedOptionLabel = 'Fixo';

          if (side === 'left') {
            this.startDate = clickedDate;
          } else {
            this.endDate = clickedDate;
          }

          if (this.startDate && this.endDate && isBeforeDay(this.endDate, this.startDate)) {
            const temp = this.startDate;
            this.startDate = this.endDate;
            this.endDate = temp;
          }

          this.renderView();
        }
      });

      cell.addEventListener('mouseenter', () => {
        const dateStr = cell.getAttribute('data-date');
        if (dateStr && this.startDate && !this.endDate) {
          const [y, m, d] = dateStr.split('-').map(Number);
          this.hoverDate = new Date(y, m - 1, d);
          this.renderView();
        }
      });
    });
  }

  attachMonthEvents(container, side) {
    const monthCells = container.querySelectorAll('.ds-month-cell');
    monthCells.forEach(cell => {
      cell.addEventListener('click', () => {
        const monthIndex = parseInt(cell.getAttribute('data-month'), 10);
        if (side === 'left') {
          this.leftBaseDate = new Date(this.leftBaseDate.getFullYear(), monthIndex, 1);
          this.leftMode = 'days';
        } else {
          this.rightBaseDate = new Date(this.rightBaseDate.getFullYear(), monthIndex, 1);
          this.rightMode = 'days';
        }
        this.renderView();
      });
    });
  }

  attachYearEvents(container, side) {
    const yearCells = container.querySelectorAll('.ds-year-cell');
    yearCells.forEach(cell => {
      cell.addEventListener('click', () => {
        const yearNum = parseInt(cell.getAttribute('data-year'), 10);
        if (side === 'left') {
          this.leftBaseDate = new Date(yearNum, this.leftBaseDate.getMonth(), 1);
          this.leftMode = 'months';
        } else {
          this.rightBaseDate = new Date(yearNum, this.rightBaseDate.getMonth(), 1);
          this.rightMode = 'months';
        }
        this.renderView();
      });
    });
  }

  updateTriggerDisplay() {
    this.startInputEl.value = formatDate(this.startDate);
    this.endInputEl.value = formatDate(this.endDate);
    this.startInputEl.setAttribute('aria-invalid', 'false');
    this.endInputEl.setAttribute('aria-invalid', 'false');
  }

  applyManualInput() {
    const start = parseDate(this.startInputEl.value);
    const end = parseDate(this.endInputEl.value);
    const validRange = start && end && !isAfterDay(start, end);

    this.startInputEl.setAttribute('aria-invalid', String(!start || (start && end && !validRange)));
    this.endInputEl.setAttribute('aria-invalid', String(!end || (start && end && !validRange)));
    if (!validRange) return false;

    this.startDate = start;
    this.endDate = end;
    this.selectedOptionLabel = 'Fixo';
    this.leftBaseDate = new Date(start.getFullYear(), start.getMonth(), 1);
    this.rightBaseDate = new Date(end.getFullYear(), end.getMonth(), 1);
    this.leftMode = 'days';
    this.rightMode = 'days';
    this.renderView();
    this.applySelection();
    return true;
  }

  applySelection() {
    if (!this.startDate || !this.endDate) return;

    this.committedStartDate = new Date(this.startDate);
    this.committedEndDate = new Date(this.endDate);
    this.committedOptionLabel = this.selectedOptionLabel;
    this.updateTriggerDisplay();
    this.closePopover();

    if (typeof this.onApplyCallback === 'function') {
      this.onApplyCallback({
        startDate: this.startDate,
        endDate: this.endDate,
        formattedRange: `${formatDate(this.startDate)} ➔ ${formatDate(this.endDate)}`
      });
    }
  }

  cancelSelection() {
    this.startDate = this.committedStartDate ? new Date(this.committedStartDate) : null;
    this.endDate = this.committedEndDate ? new Date(this.committedEndDate) : null;
    this.selectedOptionLabel = this.committedOptionLabel;
    this.hoverDate = null;
    this.leftMode = 'days';
    this.rightMode = 'days';

    if (this.startDate) {
      this.leftBaseDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
    }
    if (this.endDate) {
      this.rightBaseDate = new Date(this.endDate.getFullYear(), this.endDate.getMonth(), 1);
    }

    this.popoverEl.querySelector('#ds-selected-label').textContent = this.selectedOptionLabel;
    this.updateTriggerDisplay();
    this.renderView();
    this.closePopover();
  }
}
