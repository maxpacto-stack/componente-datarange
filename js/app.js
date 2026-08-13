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
  const form = document.getElementById('vote-form');
  const submitButton = document.getElementById('vote-submit');
  const status = document.getElementById('vote-status');
  const nameInput = document.getElementById('voter-name');
  const noteInput = document.getElementById('voter-note');
  const totalElement = document.getElementById('vote-total');
  const totalLabel = document.getElementById('vote-total-label');
  const radioButtons = [...document.querySelectorAll('input[name="preferred-model"]')];
  const voteDialog = document.getElementById('vote-dialog');
  const voteDialogClose = document.getElementById('vote-dialog-close');
  const voteDialogCancel = document.getElementById('vote-dialog-cancel');
  const voteDialogChoice = document.getElementById('vote-dialog-choice');
  const voteDialogStatus = document.getElementById('vote-dialog-status');
  const voteDetailsForm = document.getElementById('vote-details-form');
  const voteDialogSubmit = document.getElementById('vote-dialog-submit');
  const adminDialog = document.getElementById('admin-dialog');
  const adminAccessButton = document.getElementById('admin-access-button');
  const adminCloseButton = document.getElementById('admin-close-button');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminPasswordInput = document.getElementById('admin-password');
  const adminLoginStatus = document.getElementById('admin-login-status');
  const adminReport = document.getElementById('admin-report');
  const adminSummary = document.getElementById('admin-summary');
  const adminVotesBody = document.getElementById('admin-votes-body');
  const adminReportUpdated = document.getElementById('admin-report-updated');
  const adminRefreshButton = document.getElementById('admin-refresh-button');
  let activeAdminPassword = '';

  if (!form || !submitButton || !status || !nameInput || !noteInput || !totalElement || !totalLabel) return;

  function renderPublicTotal(total) {
    const safeTotal = Math.max(0, Number(total) || 0);
    totalElement.textContent = safeTotal;
    totalLabel.textContent = safeTotal === 1 ? 'voto registrado' : 'votos registrados';
  }

  async function loadPublicTotal() {
    try {
      const response = await fetch('/api/votes');
      const result = await response.json();
      if (!response.ok) throw new Error();
      renderPublicTotal(result.total);
    } catch {
      totalElement.textContent = '—';
      totalLabel.textContent = 'total indisponível';
    }
  }

  function updateSubmitState() {
    const selectedRadio = radioButtons.find(radio => radio.checked);
    submitButton.disabled = !selectedRadio;
  }

  radioButtons.forEach(radio => radio.addEventListener('change', () => {
    updateSubmitState();
    status.textContent = `Modelo ${radio.value} selecionado. Clique em Confirmar voto.`;
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    const selectedRadio = radioButtons.find(radio => radio.checked);
    if (!selectedRadio) return;

    voteDetailsForm.reset();
    voteDialogStatus.textContent = '';
    voteDialogChoice.textContent = `Você selecionou o Modelo ${selectedRadio.value}.`;
    voteDialog.showModal();
    nameInput.focus();
  });

  function closeVoteDialog() {
    if (!voteDialogSubmit.disabled) voteDialog.close();
  }

  voteDialogClose?.addEventListener('click', closeVoteDialog);
  voteDialogCancel?.addEventListener('click', closeVoteDialog);
  voteDialog?.addEventListener('click', event => {
    if (event.target === voteDialog) closeVoteDialog();
  });

  voteDetailsForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const selectedRadio = radioButtons.find(radio => radio.checked);
    if (!selectedRadio) {
      voteDialog.close();
      status.textContent = 'Selecione novamente uma opção para votar.';
      return;
    }

    voteDialogSubmit.disabled = true;
    voteDialogSubmit.textContent = 'Registrando...';
    voteDialogStatus.textContent = 'Enviando seu voto com segurança.';

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          note: noteInput.value.trim(),
          option: selectedRadio.value
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível registrar o voto.');

      renderPublicTotal(result.total);
      form.reset();
      voteDetailsForm.reset();
      voteDialog.close();
      submitButton.textContent = 'Voto registrado';
      status.textContent = `Obrigado, ${result.name}! Seu voto foi registrado.`;
      setTimeout(() => {
        submitButton.textContent = 'Confirmar voto';
        updateSubmitState();
      }, 1800);
    } catch (error) {
      voteDialogStatus.textContent = error.message;
    } finally {
      voteDialogSubmit.disabled = false;
      voteDialogSubmit.textContent = 'Registrar voto';
    }
  });

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function loadAdminReport(password) {
    adminLoginStatus.textContent = 'Carregando relatório...';
    const response = await fetch('/api/votes', {
      headers: { 'X-Admin-Password': password }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível abrir o relatório.');

    activeAdminPassword = password;
    adminSummary.innerHTML = result.summary.options.map(item => `
      <article class="admin-summary-card opt-${item.option}">
        <span>Modelo ${item.option}</span>
        <strong>${item.count}</strong>
        <small>${item.percentage}% dos votos</small>
      </article>
    `).join('') + `
      <article class="admin-summary-card total">
        <span>Total</span>
        <strong>${result.summary.total}</strong>
        <small>${result.summary.total === 1 ? 'participante' : 'participantes'}</small>
      </article>
    `;

    adminVotesBody.innerHTML = result.votes.length
      ? result.votes.map(vote => `
          <tr>
            <td>${escapeHtml(new Date(vote.createdAt).toLocaleString('pt-BR'))}</td>
            <td><strong>${escapeHtml(vote.name)}</strong></td>
            <td><span class="option-badge opt-${vote.option}">${vote.option}</span> Modelo ${vote.option}</td>
            <td>${escapeHtml(vote.note || '—')}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" class="admin-empty-state">Nenhum voto registrado neste ambiente.</td></tr>';

    adminLoginForm.hidden = true;
    adminReport.hidden = false;
    adminLoginStatus.textContent = '';
    adminReportUpdated.textContent = `Atualizado em ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  adminAccessButton?.addEventListener('click', () => {
    adminLoginForm.hidden = false;
    adminReport.hidden = true;
    adminLoginStatus.textContent = '';
    adminPasswordInput.value = '';
    adminDialog.showModal();
    adminPasswordInput.focus();
  });

  adminCloseButton?.addEventListener('click', () => adminDialog.close());
  adminDialog?.addEventListener('click', event => {
    if (event.target === adminDialog) adminDialog.close();
  });

  adminLoginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await loadAdminReport(adminPasswordInput.value);
    } catch (error) {
      activeAdminPassword = '';
      adminLoginStatus.textContent = error.message;
      adminPasswordInput.select();
    }
  });

  adminRefreshButton?.addEventListener('click', async () => {
    try {
      await loadAdminReport(activeAdminPassword);
    } catch (error) {
      adminLoginStatus.textContent = error.message;
    }
  });

  loadPublicTotal();
}
