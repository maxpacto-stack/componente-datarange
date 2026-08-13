import { DateRangePicker } from './date-range-picker.js';
import { DateRangePickerModern } from './date-range-picker-modern.js';
import { DateRangePickerHierarchical } from './date-range-picker-hierarchical.js';
import { formatDate, formatDateISO, differenceInCalendarDays } from './date-utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const jsonDisplayOriginal = document.getElementById('json-output-display');
  const jsonDisplayModern = document.getElementById('json-output-modern');
  const jsonDisplayH = document.getElementById('json-output-h');

  // 1. Initialize Original Reference DateRangePicker
  const pickerOriginal = new DateRangePicker({
    triggerId: 'date-range-trigger',
    inputId: 'date-range-input',
    popoverId: 'date-range-popover',
    initialStartDate: new Date(2026, 7, 12),
    initialEndDate: new Date(2026, 7, 12),
    onApply: (data) => {
      updateJsonDisplay(jsonDisplayOriginal, data);
    }
  });

  // 2. Initialize Modern Market Standard DateRangePicker
  const pickerModern = new DateRangePickerModern({
    triggerId: 'date-range-trigger-modern',
    popoverId: 'date-range-popover-modern',
    initialStartDate: new Date(2026, 7, 1),
    initialEndDate: new Date(2026, 7, 15),
    onApply: (data) => {
      updateJsonDisplay(jsonDisplayModern, data);
    }
  });

  // 3. Initialize NEW Hierarchical 3-Tier DateRangePicker (Ano/Mês/Dia)
  const pickerHierarchical = new DateRangePickerHierarchical({
    triggerId: 'date-range-trigger-h',
    popoverId: 'date-range-popover-h',
    initialStartDate: new Date(2025, 1, 1),
    initialEndDate: new Date(2026, 6, 31),
    onApply: (data) => {
      updateJsonDisplay(jsonDisplayH, data);
    }
  });

  function updateJsonDisplay(targetEl, data) {
    if (!targetEl) return;

    let totalDays = 0;
    if (data.startDate && data.endDate) {
      totalDays = differenceInCalendarDays(data.startDate, data.endDate) + 1;
    } else if (data.startDate) {
      totalDays = 1;
    }

    const payload = {
      status: data.startDate && data.endDate ? 'SELECIONADO' : data.startDate ? 'EM SELEÇÃO' : 'LIMPO',
      startDateISO: formatDateISO(data.startDate) || null,
      endDateISO: formatDateISO(data.endDate) || null,
      formattedRange: data.formattedRange,
      totalDaysSelected: totalDays
    };

    targetEl.textContent = JSON.stringify(payload, null, 2);
  }

  // Initial updates for all three
  updateJsonDisplay(jsonDisplayOriginal, {
    startDate: pickerOriginal.startDate,
    endDate: pickerOriginal.endDate,
    formattedRange: pickerOriginal.inputEl.value
  });

  updateJsonDisplay(jsonDisplayModern, {
    startDate: pickerModern.startDate,
    endDate: pickerModern.endDate,
    formattedRange: `${formatDate(pickerModern.startDate)} ➔ ${formatDate(pickerModern.endDate)}`
  });

  updateJsonDisplay(jsonDisplayH, {
    startDate: pickerHierarchical.startDate,
    endDate: pickerHierarchical.endDate,
    formattedRange: `${formatDate(pickerHierarchical.startDate)} ➔ ${formatDate(pickerHierarchical.endDate)}`
  });

  initializeVoting();

});

function initializeVoting() {
  const storageKey = 'datarange-prototype-voting';
  const form = document.getElementById('vote-form');
  const submitButton = document.getElementById('vote-submit');
  const status = document.getElementById('vote-status');
  const totalElement = document.getElementById('vote-total');
  const totalLabel = document.getElementById('vote-total-label');
  const radioButtons = [...document.querySelectorAll('input[name="preferred-model"]')];

  if (!form || !submitButton || !status || !totalElement || !totalLabel) return;

  const emptyState = { counts: { 1: 0, 2: 0, 3: 0 }, selected: null };
  let voteState = loadVoteState();

  function loadVoteState() {
    try {
      const savedState = JSON.parse(localStorage.getItem(storageKey));
      if (!savedState?.counts) return structuredClone(emptyState);

      return {
        counts: {
          1: Math.max(0, Number(savedState.counts[1]) || 0),
          2: Math.max(0, Number(savedState.counts[2]) || 0),
          3: Math.max(0, Number(savedState.counts[3]) || 0)
        },
        selected: ['1', '2', '3'].includes(String(savedState.selected))
          ? String(savedState.selected)
          : null
      };
    } catch {
      return structuredClone(emptyState);
    }
  }

  function saveVoteState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(voteState));
      return true;
    } catch {
      status.textContent = 'Não foi possível preservar o voto neste navegador.';
      return false;
    }
  }

  function renderResults() {
    const total = Object.values(voteState.counts).reduce((sum, count) => sum + count, 0);
    totalElement.textContent = total;
    totalLabel.textContent = total === 1 ? 'voto' : 'votos';

    ['1', '2', '3'].forEach(option => {
      const result = document.querySelector(`[data-result="${option}"]`);
      if (!result) return;

      const count = voteState.counts[option];
      const percentage = total ? Math.round((count / total) * 100) : 0;
      result.querySelector('.vote-result-percent').textContent = `${percentage}%`;
      result.querySelector('.vote-result-count').textContent = `${count} ${count === 1 ? 'voto' : 'votos'}`;
      result.querySelector('.vote-result-bar').style.width = `${percentage}%`;
      result.classList.toggle('is-leading', total > 0 && count === Math.max(...Object.values(voteState.counts)));
      result.classList.toggle('is-selected', voteState.selected === option);
    });
  }

  function selectSavedVote() {
    const savedRadio = radioButtons.find(radio => radio.value === voteState.selected);
    if (!savedRadio) return;

    savedRadio.checked = true;
    submitButton.textContent = 'Voto confirmado';
    submitButton.disabled = true;
    status.textContent = `Seu voto atual é o Modelo ${voteState.selected}. Você pode escolher outro para atualizar.`;
  }

  radioButtons.forEach(radio => {
    radio.addEventListener('change', () => {
      const isCurrentVote = radio.value === voteState.selected;
      submitButton.disabled = isCurrentVote;
      submitButton.textContent = voteState.selected ? 'Atualizar voto' : 'Confirmar voto';
      status.textContent = isCurrentVote
        ? `Seu voto atual é o Modelo ${voteState.selected}.`
        : `Modelo ${radio.value} selecionado.`;
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const selectedRadio = radioButtons.find(radio => radio.checked);
    if (!selectedRadio) return;

    if (voteState.selected) {
      voteState.counts[voteState.selected] = Math.max(0, voteState.counts[voteState.selected] - 1);
    }

    voteState.selected = selectedRadio.value;
    voteState.counts[voteState.selected] += 1;
    saveVoteState();
    renderResults();

    submitButton.textContent = 'Voto confirmado';
    submitButton.disabled = true;
    status.textContent = `Obrigado! Seu voto no Modelo ${voteState.selected} foi registrado.`;
  });

  selectSavedVote();
  renderResults();
}
