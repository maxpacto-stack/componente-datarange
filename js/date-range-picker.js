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
  differenceInCalendarDays,
  getDaysInMonth,
  getFirstDayOfWeekIndex
} from './date-utils.js';

export class DateRangePicker {
  constructor(options = {}) {
    this.triggerId = options.triggerId || 'date-range-trigger';
    this.inputId = options.inputId || 'date-range-input';
    this.popoverId = options.popoverId || 'date-range-popover';
    this.onApplyCallback = options.onApply || null;

    // State
    this.startDate = options.initialStartDate || new Date(2026, 7, 12);
    this.endDate = options.initialEndDate || null;
    this.hoverDate = null;
    this.committedStartDate = this.startDate ? new Date(this.startDate) : null;
    this.committedEndDate = this.endDate ? new Date(this.endDate) : null;

    // Independent Base Dates for Left and Right Calendars
    this.leftBaseDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
    this.rightBaseDate = this.endDate
      ? new Date(this.endDate.getFullYear(), this.endDate.getMonth(), 1)
      : addMonths(this.leftBaseDate, 1);

    this.isOpen = false;

    // DOM Elements
    this.triggerEl = document.getElementById(this.triggerId);
    this.inputEl = document.getElementById(this.inputId);
    this.popoverEl = document.getElementById(this.popoverId);

    this.init();
  }

  init() {
    if (!this.popoverEl || !this.triggerEl || !this.inputEl) {
      console.error('DateRangePicker missing required DOM elements');
      return;
    }

    this.renderPopoverStructure();
    this.bindEvents();
    this.updateInputDisplay();
    this.renderCalendars();
  }

  renderPopoverStructure() {
    this.popoverEl.className = 'drp-popover';
    this.popoverEl.setAttribute('role', 'dialog');
    this.popoverEl.setAttribute('aria-label', 'Selecionar intervalo de datas');
    this.popoverEl.setAttribute('aria-hidden', 'true');
    this.popoverEl.innerHTML = `
      <!-- Independent Side by Side Calendars Container -->
      <div class="drp-calendars-container">
        <!-- Left Month Calendar -->
        <div class="drp-calendar-month" id="drp-calendar-left"></div>

        <!-- Right Month Calendar -->
        <div class="drp-calendar-month" id="drp-calendar-right"></div>
      </div>

      <!-- Quick Preset Controls Row -->
      <div class="drp-quick-select-row">
        <span class="drp-quick-label">Selecionar rápido</span>
        <div class="drp-quick-controls">
          <select id="drp-quick-preset" class="drp-select-input drp-select-preset" aria-label="Seleção rápida">
            <option value="" selected>Selecione...</option>
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="thisMonth">Este mês</option>
            <option value="thisMonthFull">Este mês inteiro</option>
            <option value="nextMonth">Próximo mês</option>
            <option value="lastMonth">Mês passado</option>
            <option value="thisYear">Este ano</option>
            <option value="thisYearFull">Este ano inteiro</option>
            <option value="lastYear">Ano passado</option>
            <option value="nextYear">Próximo ano</option>
            <option value="customPast">Personalizado passados</option>
            <option value="customFuture">Personalizado próximos</option>
          </select>
          <select id="drp-quick-num" class="drp-select-input drp-select-number" aria-label="Quantidade" disabled>
            <option value="1">1</option>
            <option value="7" selected>7</option>
            <option value="15">15</option>
            <option value="30">30</option>
            <option value="60">60</option>
            <option value="90">90</option>
          </select>
          <select id="drp-quick-unit" class="drp-select-input drp-select-unit" aria-label="Tipo do período" disabled>
            <option value="days" selected>Dia(s)</option>
            <option value="months">Mês(es)</option>
            <option value="years">Ano(s)</option>
          </select>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="drp-actions-row">
        <div class="drp-selection-summary" id="drp-selection-summary" aria-live="polite"></div>
        <div class="drp-action-buttons">
          <button type="button" class="drp-btn drp-btn-clear" id="drp-btn-clear">Limpar</button>
          <button type="button" class="drp-btn drp-btn-apply" id="drp-btn-apply">Aplicar</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Prevent clicks inside popover from bubbling to document click listener
    this.popoverEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Toggle popover on trigger click
    this.triggerEl.querySelector('.calendar-btn-icon').addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePopover();
    });

    this.inputEl.addEventListener('click', (e) => e.stopPropagation());

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

    const quickPreset = this.popoverEl.querySelector('#drp-quick-preset');
    const quickUnit = this.popoverEl.querySelector('#drp-quick-unit');
    const quickNum = this.popoverEl.querySelector('#drp-quick-num');

    const handleQuickChange = () => {
      const presetKey = quickPreset.value;
      const isCustom = presetKey === 'customPast' || presetKey === 'customFuture';

      quickUnit.disabled = !isCustom;
      quickNum.disabled = !isCustom;

      if (presetKey) {
        this.applyQuickSelection(presetKey, quickUnit.value, parseInt(quickNum.value, 10));

        if (!isCustom) {
          this.applySelection();
        }
      }
    };

    quickPreset.addEventListener('change', handleQuickChange);
    quickUnit.addEventListener('change', handleQuickChange);
    quickNum.addEventListener('change', handleQuickChange);

    this.popoverEl.querySelector('#drp-btn-clear').addEventListener('click', () => {
      this.clearSelection();
    });

    // ONLY CLOSE ON "APLICAR" CLICK
    this.popoverEl.querySelector('#drp-btn-apply').addEventListener('click', () => {
      if (this.startDate && this.endDate) {
        this.applySelection();
      }
    });

    this.inputEl.addEventListener('change', () => {
      if (this.parseInputText() && this.startDate && this.endDate) {
        this.applySelection();
      }
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (this.parseInputText() && this.startDate && this.endDate) {
          this.applySelection();
        }
      }
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
    this.resetQuickControls();
    this.isOpen = true;
    this.popoverEl.classList.add('open');
    this.triggerEl.classList.add('active');
    this.popoverEl.setAttribute('aria-hidden', 'false');
    this.triggerEl.setAttribute('aria-expanded', 'true');
    this.triggerEl.querySelector('.calendar-btn-icon')?.setAttribute('aria-expanded', 'true');
    this.renderCalendars();
  }

  closePopover() {
    this.isOpen = false;
    this.popoverEl.classList.remove('open');
    this.triggerEl.classList.remove('active');
    this.popoverEl.setAttribute('aria-hidden', 'true');
    this.triggerEl.setAttribute('aria-expanded', 'false');
    this.triggerEl.querySelector('.calendar-btn-icon')?.setAttribute('aria-expanded', 'false');
  }

  renderCalendars() {
    const leftContainer = this.popoverEl.querySelector('#drp-calendar-left');
    const rightContainer = this.popoverEl.querySelector('#drp-calendar-right');

    leftContainer.innerHTML = this.buildSingleMonthHTML(this.leftBaseDate, 'left');
    rightContainer.innerHTML = this.buildSingleMonthHTML(this.rightBaseDate, 'right');

    this.attachNavEvents(leftContainer, 'left');
    this.attachNavEvents(rightContainer, 'right');

    this.attachDayEvents(leftContainer, 'left');
    this.attachDayEvents(rightContainer, 'right');

    this.updateSelectionSummary();
    this.updateApplyButtonState();
  }

  updateSelectionSummary() {
    const summaryEl = this.popoverEl.querySelector('#drp-selection-summary');
    if (!summaryEl) return;

    if (!this.startDate || !this.endDate) {
      summaryEl.innerHTML = `
        <span class="drp-summary-label">Período selecionado</span>
        <span class="drp-summary-empty">Selecione as datas inicial e final</span>
      `;
      return;
    }

    const totalDays = differenceInCalendarDays(this.startDate, this.endDate) + 1;
    const approximateMonths = (totalDays / 30.44).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    const approximateYears = (totalDays / 365.25).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });

    summaryEl.innerHTML = `
      <span class="drp-summary-dates">
        <span><strong>Início</strong> ${formatDate(this.startDate)}</span>
        <span class="drp-summary-arrow" aria-hidden="true">→</span>
        <span><strong>Fim</strong> ${formatDate(this.endDate)}</span>
      </span>
      <span class="drp-summary-duration" title="Meses e anos são equivalências aproximadas">
        <strong>${totalDays}</strong> dia${totalDays === 1 ? '' : 's'}
        <span aria-hidden="true">•</span> ≈ ${approximateMonths} ${approximateMonths === '1,0' ? 'mês' : 'meses'}
        <span aria-hidden="true">•</span> ≈ ${approximateYears} ano${approximateYears === '1,0' ? '' : 's'}
      </span>
    `;
  }

  buildSingleMonthHTML(baseMonthDate, side) {
    const year = baseMonthDate.getFullYear();
    const month = baseMonthDate.getMonth();
    const monthName = MONTH_NAMES[month];
    const sideLabel = side === 'left' ? 'Data de início' : 'Data de fim';

    const daysInMonth = getDaysInMonth(year, month);
    const startDayOfWeek = getFirstDayOfWeekIndex(year, month);
    const today = new Date();

    const firstAvailableYear = Math.min(2015, year - 5);
    const lastAvailableYear = Math.max(2035, year + 5);
    let yearOptions = '';
    for (let y = firstAvailableYear; y <= lastAvailableYear; y++) {
      yearOptions += `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`;
    }

    let html = `
      <div class="drp-side-label">${sideLabel}</div>
      <div class="drp-month-header">
        <div class="drp-month-nav">
          <button type="button" class="drp-nav-btn drp-month-prev" aria-label="Mês anterior">&lt;</button>
          
          <div class="drp-month-title-group">
            <span class="drp-month-name-year">${monthName}</span>
            <select class="drp-year-select" id="drp-year-select-${side}" aria-label="Alterar apenas o ano">
              ${yearOptions}
            </select>
            <button type="button" class="drp-today-btn" title="Voltar para o mês atual">Hoje</button>
          </div>

          <button type="button" class="drp-nav-btn drp-month-next" aria-label="Próximo mês">&gt;</button>
        </div>
      </div>
      <div class="drp-weekdays-grid">
        ${WEEKDAYS_INITIALS.map(w => `<div class="drp-weekday">${w}</div>`).join('')}
      </div>
      <div class="drp-days-grid">
    `;

    for (let i = 0; i < startDayOfWeek; i++) {
      html += `<div class="drp-day-cell outside"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const isTodayCell = isSameDay(cellDate, today);
      const isInvalidStart = side === 'left' && this.endDate && isAfterDay(cellDate, this.endDate);
      const isInvalidEnd = side === 'right' && (!this.startDate || isBeforeDay(cellDate, this.startDate));
      const isDisabled = Boolean(isInvalidStart || isInvalidEnd);

      let classes = ['drp-day-cell'];
      if (isTodayCell) classes.push('today');
      if (isDisabled) classes.push('disabled');

      if (this.startDate && isSameDay(cellDate, this.startDate)) classes.push('range-start');
      if (this.endDate && isSameDay(cellDate, this.endDate)) classes.push('range-end');

      if (this.startDate && this.endDate && isBetweenDays(cellDate, this.startDate, this.endDate)) {
        if (!isSameDay(cellDate, this.startDate) && !isSameDay(cellDate, this.endDate)) {
          classes.push('in-range');
        }
      }

      if (this.startDate && !this.endDate && this.hoverDate) {
        if (isAfterDay(this.hoverDate, this.startDate)) {
          if (isBetweenDays(cellDate, this.startDate, this.hoverDate) && !isSameDay(cellDate, this.startDate)) {
            classes.push('hover-range');
          }
        }
      }

      const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      html += `
        <button type="button" class="${classes.join(' ')}" data-date="${isoDate}" aria-label="${day} de ${monthName} de ${year}" ${isDisabled ? 'disabled' : ''}>
          <span class="drp-day-number">${day}</span>
        </button>
      `;
    }

    html += `</div>`;
    return html;
  }

  attachNavEvents(container, side) {
    const prevBtn = container.querySelector('.drp-month-prev');
    const nextBtn = container.querySelector('.drp-month-next');
    const todayBtn = container.querySelector('.drp-today-btn');
    const yearSelect = container.querySelector(`#drp-year-select-${side}`);

    prevBtn.addEventListener('click', () => {
      if (side === 'left') {
        this.leftBaseDate = addMonths(this.leftBaseDate, -1);
      } else {
        this.rightBaseDate = addMonths(this.rightBaseDate, -1);
      }
      this.renderCalendars();
    });

    nextBtn.addEventListener('click', () => {
      if (side === 'left') {
        this.leftBaseDate = addMonths(this.leftBaseDate, 1);
      } else {
        this.rightBaseDate = addMonths(this.rightBaseDate, 1);
      }
      this.renderCalendars();
    });

    yearSelect.addEventListener('change', (e) => {
      const newYear = parseInt(e.target.value, 10);
      if (side === 'left') {
        this.leftBaseDate = new Date(newYear, this.leftBaseDate.getMonth(), 1);
      } else {
        this.rightBaseDate = new Date(newYear, this.rightBaseDate.getMonth(), 1);
      }
      this.renderCalendars();
    });

    todayBtn.addEventListener('click', () => {
      const today = new Date();
      const todayBase = new Date(today.getFullYear(), today.getMonth(), 1);

      if (side === 'left') {
        this.leftBaseDate = todayBase;
      } else {
        this.rightBaseDate = todayBase;
      }
      this.renderCalendars();
    });
  }

  attachDayEvents(container, side) {
    const dayCells = container.querySelectorAll('.drp-day-cell:not(.outside):not(:disabled)');
    dayCells.forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.getAttribute('data-date');
        if (dateStr) {
          const [y, m, d] = dateStr.split('-').map(Number);
          this.handleDayClick(new Date(y, m - 1, d), side);
        }
      });

      cell.addEventListener('mouseenter', () => {
        const dateStr = cell.getAttribute('data-date');
        if (side === 'right' && dateStr && this.startDate && !this.endDate) {
          const [y, m, d] = dateStr.split('-').map(Number);
          this.hoverDate = new Date(y, m - 1, d);
          this.updateHoverRangePreview();
        }
      });
    });
  }

  updateHoverRangePreview() {
    const dayCells = this.popoverEl.querySelectorAll('.drp-day-cell[data-date]');

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

  handleDayClick(date, side) {
    this.resetQuickControls();

    if (side === 'left') {
      if (this.endDate && isAfterDay(date, this.endDate)) return;

      this.startDate = date;
      this.hoverDate = null;
    } else {
      if (!this.startDate || isBeforeDay(date, this.startDate)) return;

      this.endDate = date;
      this.hoverDate = null;
    }

    this.updateInputDisplay();
    this.renderCalendars();
  }

  applyQuickSelection(presetKey, unit, amount) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = null;
    let end = null;

    switch (presetKey) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start = addDays(today, -1);
        end = new Date(start);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case 'thisMonthFull':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'nextMonth':
        start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = today;
        break;
      case 'thisYearFull':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case 'lastYear':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'nextYear':
        start = new Date(today.getFullYear() + 1, 0, 1);
        end = new Date(today.getFullYear() + 1, 11, 31);
        break;
      case 'customPast':
      case 'customFuture': {
        const direction = presetKey === 'customPast' ? -1 : 1;
        let targetDate = new Date(today);

        if (unit === 'days') {
          targetDate = addDays(today, direction * Math.max(amount - 1, 0));
        } else if (unit === 'months') {
          targetDate = addMonths(today, direction * amount);
        } else if (unit === 'years') {
          targetDate = addYears(today, direction * amount);
        }

        start = direction < 0 ? targetDate : today;
        end = direction < 0 ? today : targetDate;
        break;
      }
      default:
        return;
    }

    this.startDate = start;
    this.endDate = end;

    this.leftBaseDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
    this.rightBaseDate = new Date(this.endDate.getFullYear(), this.endDate.getMonth(), 1);

    this.updateInputDisplay();
    this.renderCalendars();
  }

  setPreset(startDate, endDate) {
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.committedStartDate = new Date(startDate);
    this.committedEndDate = new Date(endDate);
    this.leftBaseDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
    this.rightBaseDate = new Date(this.endDate.getFullYear(), this.endDate.getMonth(), 1);
    this.updateInputDisplay();
    this.renderCalendars();
  }

  clearSelection() {
    this.startDate = null;
    this.endDate = null;
    this.hoverDate = null;
    this.resetQuickControls();
    this.updateInputDisplay();
    this.renderCalendars();
  }

  applySelection() {
    if (!this.startDate || !this.endDate) return;

    this.committedStartDate = new Date(this.startDate);
    this.committedEndDate = new Date(this.endDate);
    this.updateInputDisplay();
    this.closePopover();

    if (typeof this.onApplyCallback === 'function') {
      this.onApplyCallback({
        startDate: this.startDate,
        endDate: this.endDate,
        formattedRange: this.inputEl.value
      });
    }
  }

  updateInputDisplay() {
    if (this.startDate && this.endDate) {
      this.inputEl.value = `${formatDate(this.startDate)} | ${formatDate(this.endDate)}`;
    } else if (this.startDate) {
      this.inputEl.value = `${formatDate(this.startDate)} | dd/mm/aaaa`;
    } else {
      this.inputEl.value = 'dd/mm/aaaa | dd/mm/aaaa';
    }
  }

  updateApplyButtonState() {
    const applyBtn = this.popoverEl.querySelector('#drp-btn-apply');
    const sameStart = (!this.startDate && !this.committedStartDate) ||
      (this.startDate && this.committedStartDate && isSameDay(this.startDate, this.committedStartDate));
    const sameEnd = (!this.endDate && !this.committedEndDate) ||
      (this.endDate && this.committedEndDate && isSameDay(this.endDate, this.committedEndDate));
    const hasChanges = !(sameStart && sameEnd);
    const canApply = Boolean(this.startDate && this.endDate && hasChanges);
    applyBtn.disabled = !canApply;
    if (canApply) {
      applyBtn.classList.add('active');
    } else {
      applyBtn.classList.remove('active');
    }
  }

  resetQuickControls() {
    const quickPreset = this.popoverEl.querySelector('#drp-quick-preset');
    const quickUnit = this.popoverEl.querySelector('#drp-quick-unit');
    const quickNum = this.popoverEl.querySelector('#drp-quick-num');

    if (!quickPreset || !quickUnit || !quickNum) return;
    quickPreset.value = '';
    quickUnit.disabled = true;
    quickNum.disabled = true;
  }

  parseInputText() {
    const val = this.inputEl.value.trim();
    if (!val || val === 'dd/mm/aaaa | dd/mm/aaaa') {
      this.clearSelection();
      this.inputEl.setAttribute('aria-invalid', 'false');
      return true;
    }

    const parts = val.split('|').map(s => s.trim());
    if (parts.length >= 1) {
      const d1 = parseDate(parts[0]);
      const d2 = parts[1] ? parseDate(parts[1]) : null;

      if (d1) {
        this.startDate = d1;
        this.endDate = d2;
        if (this.endDate && isBeforeDay(this.endDate, this.startDate)) {
          [this.startDate, this.endDate] = [this.endDate, this.startDate];
        }
        this.leftBaseDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
        this.rightBaseDate = this.endDate
          ? new Date(this.endDate.getFullYear(), this.endDate.getMonth(), 1)
          : addMonths(this.leftBaseDate, 1);
        this.inputEl.setAttribute('aria-invalid', 'false');
        this.updateInputDisplay();
        this.renderCalendars();
        return true;
      }
    }

    this.inputEl.setAttribute('aria-invalid', 'true');
    return false;
  }

  cancelSelection() {
    this.startDate = this.committedStartDate ? new Date(this.committedStartDate) : null;
    this.endDate = this.committedEndDate ? new Date(this.committedEndDate) : null;
    this.hoverDate = null;
    if (this.startDate) {
      this.leftBaseDate = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), 1);
      this.rightBaseDate = this.endDate
        ? new Date(this.endDate.getFullYear(), this.endDate.getMonth(), 1)
        : addMonths(this.leftBaseDate, 1);
    }
    this.updateInputDisplay();
    this.renderCalendars();
    this.closePopover();
  }
}
