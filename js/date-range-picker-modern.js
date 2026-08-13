import {
  MONTH_NAMES,
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
  getFirstDayOfWeekIndex,
  differenceInCalendarDays
} from './date-utils.js';

export class DateRangePickerModern {
  constructor(options = {}) {
    this.triggerId = options.triggerId || 'date-range-trigger-modern';
    this.popoverId = options.popoverId || 'date-range-popover-modern';
    this.onApplyCallback = options.onApply || null;

    // State
    this.startDate = options.initialStartDate || new Date(2026, 7, 1);
    this.endDate = options.initialEndDate || new Date(2026, 7, 15);
    this.hoverDate = null;
    this.activePreset = 'custom';
    this.committedStartDate = this.startDate ? new Date(this.startDate) : null;
    this.committedEndDate = this.endDate ? new Date(this.endDate) : null;
    this.committedActivePreset = this.activePreset;

    this.leftBaseDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
    this.rightBaseDate = addMonths(this.leftBaseDate, 1);
    this.isOpen = false;

    // DOM Elements
    this.triggerEl = document.getElementById(this.triggerId);
    this.popoverEl = document.getElementById(this.popoverId);
    this.startInputEl = document.getElementById(options.startInputId || 'modern-start-input');
    this.endInputEl = document.getElementById(options.endInputId || 'modern-end-input');

    this.init();
  }

  init() {
    if (!this.popoverEl || !this.triggerEl || !this.startInputEl || !this.endInputEl) {
      console.error('DateRangePickerModern missing required DOM elements');
      return;
    }

    this.renderPopoverStructure();
    this.bindEvents();
    this.updateTriggerDisplay();
    this.renderCalendars();
  }

  renderPopoverStructure() {
    this.popoverEl.className = 'modern-drp-popover';
    this.popoverEl.setAttribute('role', 'dialog');
    this.popoverEl.setAttribute('aria-label', 'Selecionar intervalo de datas');
    this.popoverEl.setAttribute('aria-hidden', 'true');
    this.popoverEl.innerHTML = `
      <!-- Presets Sidebar on Left -->
      <aside class="modern-sidebar">
        <button type="button" class="modern-preset-btn" data-preset="today">Hoje</button>
        <button type="button" class="modern-preset-btn" data-preset="yesterday">Ontem</button>
        <button type="button" class="modern-preset-btn" data-preset="last7">Últimos 7 dias</button>
        <button type="button" class="modern-preset-btn" data-preset="last14">Últimos 14 dias</button>
        <button type="button" class="modern-preset-btn" data-preset="last30">Últimos 30 dias</button>
        <button type="button" class="modern-preset-btn" data-preset="lastMonth">Mês passado</button>
        <button type="button" class="modern-preset-btn" data-preset="thisMonth">Este mês</button>
        <button type="button" class="modern-preset-btn" data-preset="nextMonth">Próximo mês</button>
        <button type="button" class="modern-preset-btn" data-preset="thisYear">Este ano</button>
        <button type="button" class="modern-preset-btn active" data-preset="custom">Personalizado</button>
      </aside>

      <!-- Main Calendar Content -->
      <main class="modern-main-content">
        <!-- Top Calendar Header -->
        <header class="modern-calendar-header">
          <button type="button" class="modern-nav-btn" id="modern-prev-month">&lt;</button>
          <div class="modern-month-title" id="modern-month-title">Agosto 2026 - Setembro 2026</div>
          <button type="button" class="modern-nav-btn" id="modern-next-month">&gt;</button>
        </header>

        <!-- Dual Calendar Grid -->
        <div class="modern-grid-wrapper">
          <div id="modern-calendar-left"></div>
          <div id="modern-calendar-right"></div>
        </div>

        <!-- Footer -->
        <footer class="modern-footer">
          <div class="modern-summary-badge" id="modern-summary-badge">
            <div id="modern-summary-text">Selecione o período</div>
          </div>
          <div class="modern-footer-actions">
            <button type="button" class="modern-btn-cancel" id="modern-btn-cancel">Cancelar</button>
            <button type="button" class="modern-btn-apply" id="modern-btn-apply">Aplicar</button>
          </div>
        </footer>
      </main>
    `;
  }

  bindEvents() {
    // Prevent clicks inside popover from bubbling to document click listener
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

    // Close ONLY when clicking outside the popover and trigger
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

    this.popoverEl.querySelector('#modern-prev-month').addEventListener('click', () => {
      this.leftBaseDate = addMonths(this.leftBaseDate, -1);
      this.rightBaseDate = addMonths(this.leftBaseDate, 1);
      this.renderCalendars();
    });

    this.popoverEl.querySelector('#modern-next-month').addEventListener('click', () => {
      this.leftBaseDate = addMonths(this.leftBaseDate, 1);
      this.rightBaseDate = addMonths(this.leftBaseDate, 1);
      this.renderCalendars();
    });

    const presetBtns = this.popoverEl.querySelectorAll('.modern-preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.getAttribute('data-preset');
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activePreset = presetKey;
        this.applyPreset(presetKey);
      });
    });

    this.popoverEl.querySelector('#modern-btn-cancel').addEventListener('click', () => {
      this.cancelSelection();
    });

    // ONLY CLOSE ON "APLICAR INTERVALO" CLICK
    this.popoverEl.querySelector('#modern-btn-apply').addEventListener('click', () => {
      this.applySelection();
    });
  }

  togglePopover() {
    if (this.isOpen) {
      this.cancelSelection();
    } else {
      this.openPopover();
    }
  }

  openPopover() {
    document.dispatchEvent(new CustomEvent('date-range-picker:open', { detail: this }));
    this.isOpen = true;
    this.popoverEl.classList.add('open');
    this.triggerEl.classList.add('active');
    this.popoverEl.setAttribute('aria-hidden', 'false');
    this.triggerEl.setAttribute('aria-expanded', 'true');
    this.renderCalendars();
  }

  closePopover() {
    this.isOpen = false;
    this.popoverEl.classList.remove('open');
    this.triggerEl.classList.remove('active');
    this.popoverEl.setAttribute('aria-hidden', 'true');
    this.triggerEl.setAttribute('aria-expanded', 'false');
  }

  renderCalendars() {
    const leftTitle = `${MONTH_NAMES[this.leftBaseDate.getMonth()]} ${this.leftBaseDate.getFullYear()}`;
    const rightTitle = `${MONTH_NAMES[this.rightBaseDate.getMonth()]} ${this.rightBaseDate.getFullYear()}`;
    this.popoverEl.querySelector('#modern-month-title').textContent = `${leftTitle} — ${rightTitle}`;

    const leftContainer = this.popoverEl.querySelector('#modern-calendar-left');
    const rightContainer = this.popoverEl.querySelector('#modern-calendar-right');

    leftContainer.innerHTML = this.buildMonthHTML(this.leftBaseDate);
    rightContainer.innerHTML = this.buildMonthHTML(this.rightBaseDate);

    this.attachDayEvents(leftContainer);
    this.attachDayEvents(rightContainer);

    this.updateSummaryCount();
    this.updateApplyButtonState();
  }

  buildMonthHTML(baseDate) {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const startDayOfWeek = getFirstDayOfWeekIndex(year, month);
    const today = new Date();

    let html = `
      <div style="font-size: 13px; font-weight: 700; color: #1E293B; margin-bottom: 8px;">${MONTH_NAMES[month]} ${year}</div>
      <div class="drp-weekdays-grid">
        ${WEEKDAYS_INITIALS.map(w => `<div class="drp-weekday">${w}</div>`).join('')}
      </div>
      <div class="drp-days-grid">
    `;

    for (let i = 0; i < startDayOfWeek; i++) {
      html += `<div class="modern-day-cell outside"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const isTodayCell = isSameDay(cellDate, today);

      let classes = ['modern-day-cell'];

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

    html += `</div>`;
    return html;
  }

  attachDayEvents(container) {
    const dayCells = container.querySelectorAll('.modern-day-cell:not(.outside):not(:disabled)');
    dayCells.forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        if (dateStr) {
          const [y, m, d] = dateStr.split('-').map(Number);
          this.handleDayClick(new Date(y, m - 1, d));
        }
      });

      cell.addEventListener('mouseenter', () => {
        const dateStr = cell.getAttribute('data-date');
        if (dateStr && this.startDate && !this.endDate) {
          const [y, m, d] = dateStr.split('-').map(Number);
          this.hoverDate = new Date(y, m - 1, d);
          this.updateHoverRangePreview();
        }
      });
    });
  }

  updateHoverRangePreview() {
    const dayCells = this.popoverEl.querySelectorAll('.modern-day-cell[data-date]');

    dayCells.forEach(cell => {
      cell.classList.remove('hover-range');

      if (!this.startDate || this.endDate || !this.hoverDate || !isAfterDay(this.hoverDate, this.startDate)) {
        return;
      }

      const [year, month, day] = cell.getAttribute('data-date').split('-').map(Number);
      const cellDate = new Date(year, month - 1, day);

      if (isBetweenDays(cellDate, this.startDate, this.hoverDate) && !isSameDay(cellDate, this.startDate)) {
        cell.classList.add('hover-range');
      }
    });
  }

  handleDayClick(date) {
    const presetBtns = this.popoverEl.querySelectorAll('.modern-preset-btn');
    presetBtns.forEach(b => b.classList.remove('active'));
    const customBtn = this.popoverEl.querySelector('[data-preset="custom"]');
    if (customBtn) customBtn.classList.add('active');
    this.activePreset = 'custom';

    if (!this.startDate && !this.endDate) {
      this.startDate = date;
      this.endDate = null;
      this.hoverDate = null;
    } else if (this.startDate && !this.endDate) {
      if (isBeforeDay(date, this.startDate)) {
        this.endDate = new Date(this.startDate);
        this.startDate = date;
      } else {
        this.endDate = date;
      }
      this.hoverDate = null;
    } else if (isBeforeDay(date, this.startDate)) {
      this.startDate = date;
      this.hoverDate = null;
    } else if (isAfterDay(date, this.endDate)) {
      this.endDate = date;
      this.hoverDate = null;
    } else {
      const distanceFromStart = differenceInCalendarDays(this.startDate, date);
      const distanceFromEnd = differenceInCalendarDays(date, this.endDate);

      if (distanceFromStart <= distanceFromEnd) {
        this.startDate = date;
      } else {
        this.endDate = date;
      }
      this.hoverDate = null;
    }

    this.renderCalendars();
  }

  applyPreset(key) {
    const today = new Date();
    let start = null;
    let end = null;

    switch (key) {
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
      case 'last30':
        start = addDays(today, -29);
        end = today;
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'nextMonth':
        start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        break;
      case 'lastMonth':
        const prevMonth = addMonths(today, -1);
        start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
        end = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case 'custom':
        this.hoverDate = null;
        this.renderCalendars();
        return;
    }

    if (start && end) {
      this.startDate = start;
      this.endDate = end;
      this.leftBaseDate = new Date(start.getFullYear(), start.getMonth(), 1);
      this.rightBaseDate = addMonths(this.leftBaseDate, 1);
      this.renderCalendars();
    }
  }

  updateSummaryCount() {
    const textEl = this.popoverEl.querySelector('#modern-summary-text');

    if (this.startDate && this.endDate) {
      const diffDays = differenceInCalendarDays(this.startDate, this.endDate) + 1;
      textEl.innerHTML = `
        <strong>${formatDate(this.startDate)}</strong>
        <span class="modern-summary-arrow" aria-hidden="true">➔</span>
        <strong>${formatDate(this.endDate)}</strong>
        <span class="modern-summary-separator" aria-hidden="true">•</span>
        <span class="modern-summary-count">${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}</span>
      `;
    } else if (this.startDate) {
      textEl.innerHTML = `Início: <strong>${formatDate(this.startDate)}</strong> — <span style="color: #0066FF;">Clique no calendário para selecionar a data final</span>`;
    } else {
      textEl.innerHTML = `Nenhuma data selecionada`;
    }
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
    this.activePreset = 'custom';
    this.leftBaseDate = new Date(start.getFullYear(), start.getMonth(), 1);
    this.rightBaseDate = new Date(end.getFullYear(), end.getMonth(), 1);
    this.renderCalendars();
    this.applySelection();
    return true;
  }

  applySelection() {
    if (!this.startDate || !this.endDate) return;

    this.committedStartDate = new Date(this.startDate);
    this.committedEndDate = new Date(this.endDate);
    this.committedActivePreset = this.activePreset;
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

  updateApplyButtonState() {
    const applyBtn = this.popoverEl.querySelector('#modern-btn-apply');
    const sameStart = (!this.startDate && !this.committedStartDate) ||
      (this.startDate && this.committedStartDate && isSameDay(this.startDate, this.committedStartDate));
    const sameEnd = (!this.endDate && !this.committedEndDate) ||
      (this.endDate && this.committedEndDate && isSameDay(this.endDate, this.committedEndDate));
    applyBtn.disabled = !(this.startDate && this.endDate && !(sameStart && sameEnd));
  }

  cancelSelection() {
    this.startDate = this.committedStartDate ? new Date(this.committedStartDate) : null;
    this.endDate = this.committedEndDate ? new Date(this.committedEndDate) : null;
    this.activePreset = this.committedActivePreset;
    this.hoverDate = null;

    if (this.startDate) {
      this.leftBaseDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
      this.rightBaseDate = addMonths(this.leftBaseDate, 1);
    }

    this.popoverEl.querySelectorAll('.modern-preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-preset') === this.activePreset);
    });
    this.updateTriggerDisplay();
    this.renderCalendars();
    this.closePopover();
  }
}
