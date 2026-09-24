const sourceList = document.getElementById('sourceList');
const targetList = document.getElementById('targetList');
const mappingCanvas = document.getElementById('mappingCanvas');
const mappingSummary = document.getElementById('mappingSummary');
const status = document.getElementById('status');
const validateButton = document.getElementById('validateButton');
const executeButton = document.getElementById('executeButton');
const codeEditor = document.getElementById('codeEditor');

let draggedSegment = null;
let mappingItems = [
  { source: 'ISA', target: 'root.order.id', mode: 'Direct' },
  { source: 'BEG', target: 'root.customer.name', mode: 'Code' },
];

function renderMappings() {
  mappingCanvas.innerHTML = '';

  mappingItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'mapping-item';
    card.innerHTML = `
      <div class="left">
        <strong>${item.source} → ${item.target}</strong>
        <span class="sub">X12 850 → JSON</span>
      </div>
      <span class="mode">${item.mode}</span>
    `;
    mappingCanvas.appendChild(card);
  });
}

function addDragHandlers() {
  document.querySelectorAll('.source-item').forEach((item) => {
    item.addEventListener('dragstart', (event) => {
      draggedSegment = {
        code: item.dataset.segment,
        label: item.dataset.label,
      };
      item.classList.add('dragging');
      event.dataTransfer.setData('text/plain', draggedSegment.code);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });
  });

  targetList.addEventListener('dragover', (event) => {
    event.preventDefault();
    targetList.classList.add('drag-over');
  });

  targetList.addEventListener('dragleave', () => {
    targetList.classList.remove('drag-over');
  });

  targetList.addEventListener('drop', (event) => {
    event.preventDefault();
    targetList.classList.remove('drag-over');

    const target = event.target.closest('.target-node');
    const source = draggedSegment ? draggedSegment.code : 'BEG';
    const targetPath = target ? target.dataset.target : 'root.order.id';

    if (!target || !draggedSegment) {
      status.textContent = 'Select a source segment and drop it on a target field.';
      return;
    }

    const exists = mappingItems.some((entry) => entry.source === source && entry.target === targetPath);
    if (!exists) {
      mappingItems.push({
        source,
        target: targetPath,
        mode: codeEditor.value.trim() ? 'Code' : 'Direct',
      });
    }

    renderMappings();
    mappingSummary.innerHTML = `
      <strong>Source:</strong> <code>${source}</code><br />
      <strong>Target:</strong> <code>${targetPath}</code><br />
      <strong>Mode:</strong> ${codeEditor.value.trim() ? 'Code' : 'Direct'}
    `;
    status.textContent = `Mapping created for ${source} → ${targetPath}`;
  });
}

async function loadMetrics() {
  try {
    const response = await fetch('/api/v1/metrics');
    const metrics = await response.json();

    document.getElementById('metricThroughput').textContent = `${(metrics.throughput_rps / 1000).toFixed(1)}k`;
    document.getElementById('metricValidation').textContent = `${metrics.validation_success_rate}%`;
    document.getElementById('metricJobs').textContent = String(metrics.active_jobs);
    document.getElementById('metricLatency').textContent = `${metrics.avg_latency_ms}ms`;
  } catch (error) {
    // ignore and keep defaults for the starter UI
  }
}

async function validateMapping() {
  const payload = {
    name: '850-to-json',
    source_standard: 'X12',
    target_format: 'Json',
    steps: mappingItems.map((entry) => ({
      source_path: entry.source,
      target_path: entry.target,
      mode: entry.mode,
      transform: codeEditor.value.trim() ? codeEditor.value.trim() : null,
    })),
  };

  try {
    const response = await fetch('/api/v1/mappings/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    status.textContent = result.message || 'Mapping validated.';
  } catch (error) {
    status.textContent = 'Validation request failed.';
  }
}

async function executeTransaction() {
  const payload = {
    transaction_type: '850',
    standard: 'X12',
    payload: 'ISA*00*...*ZZ*...*20240924*1200*U*00401*000000001*0*T*:',
    metadata: {
      sender: 'ACME',
      receiver: 'CONTOSO',
    },
  };

  try {
    const response = await fetch('/api/v1/transactions/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    status.textContent = result.message || 'Transaction queued.';
  } catch (error) {
    status.textContent = 'Execution request failed.';
  }
}

sourceList.addEventListener('dragover', (event) => event.preventDefault());
addDragHandlers();
renderMappings();
validateButton.addEventListener('click', validateMapping);
executeButton.addEventListener('click', executeTransaction);
loadMetrics();
