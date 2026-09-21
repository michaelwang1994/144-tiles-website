import { getHandSummary, getTotalFan } from './points-calculator-ui';
import formConfig from './generated-google-form-config.json';

function $<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

const submitModal = $('submit-hand-modal');
const submitForm = $<HTMLFormElement>('submit-hand-form');
const submitClose = $('submit-hand-close');
const submitBtn = $<HTMLButtonElement>('submit-hand');
const fanMinInput = $<HTMLInputElement>('submit-fan-min');
const fanMinValue = $('fan-min-value');

function openSubmitModal() {
  if (submitModal) submitModal.style.display = 'flex';
}

function closeSubmitModal() {
  if (submitModal) submitModal.style.display = 'none';
}

function updateSubmitButtonState() {
  if (!submitBtn) return;
  const summary = getHandSummary();
  submitBtn.disabled = summary.totalTiles === 0;
}

if (submitBtn) submitBtn.addEventListener('click', openSubmitModal);
if (submitClose) submitClose.addEventListener('click', closeSubmitModal);
if (submitModal) {
  submitModal.addEventListener('click', (e) => {
    if (e.target === submitModal) closeSubmitModal();
  });
}

const fanBreakdown = $('fan-breakdown');
if (fanBreakdown) {
  const observer = new MutationObserver(updateSubmitButtonState);
  observer.observe(fanBreakdown, { childList: true, subtree: true });
}
updateSubmitButtonState();

if (fanMinInput && fanMinValue) {
  fanMinInput.addEventListener('input', () => {
    fanMinValue.textContent = fanMinInput.value;
  });
}

function buildGoogleFormUrl(
  name: string,
  email: string,
  fanMin: number,
  summary: ReturnType<typeof getHandSummary>
): string {
  const baseUrl = `https://docs.google.com/forms/d/e/${formConfig.formId}/viewform`;
  const params = new URLSearchParams();
  params.set('usp', 'pp_url');

  const entries = formConfig.entries as Record<string, string>;
  const setEntry = (key: string, value: string) => {
    const entryId = entries[key];
    if (entryId) params.set(`entry.${entryId}`, value);
  };
  const addEntry = (key: string, value: string) => {
    const entryId = entries[key];
    if (entryId) params.append(`entry.${entryId}`, value);
  };

  setEntry('name', name);
  setEntry('email', email);
  setEntry('fanMinimum', String(fanMin));
  setEntry('totalFan', String(summary.totalFan));
  setEntry('totalPoints', String(summary.totalPoints));
  setEntry('totalTiles', String(summary.totalTiles));
  setEntry('tiles', summary.tiles);
  summary.checkedConditions.forEach((condition) => {
    addEntry('checkedConditions', condition);
  });
  setEntry('tableWind', summary.tableWind);
  setEntry('seatWind', summary.seatWind);

  return `${baseUrl}?${params.toString()}`;
}

if (submitForm) {
  submitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(submitForm);
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const fanMin = Number(formData.get('fanMin') ?? 0);

    if (!name || !email) {
      alert('Please enter your name and email.');
      return;
    }

    const summary = getHandSummary();
    const totalFan = getTotalFan();

    if (totalFan < fanMin) {
      alert(`This hand has ${totalFan} fan, which is below the ${fanMin} fan minimum.`);
      return;
    }

    const url = buildGoogleFormUrl(name, email, fanMin, summary);
    window.open(url, '_blank');
    closeSubmitModal();
  });
}
