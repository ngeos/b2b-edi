import { useMemo, useState } from 'react';

type MappingEntry = {
  id: string;
  name: string;
  source: string;
  target: string;
  mode: 'Direct' | 'Code' | 'Join';
  standard: 'X12' | 'EDIFACT' | 'HL7';
};

const supportedFormats = [
  { name: 'X12', count: 26, status: 'Healthy' },
  { name: 'EDIFACT', count: 18, status: 'Healthy' },
  { name: 'HL7', count: 12, status: 'Monitoring' },
  { name: 'TRADACOMS', count: 7, status: 'Draft' },
];

const sourceSegments = ['ISA', 'GS', 'BEG', 'N1', 'PO1', 'CTT'];

const targetNodes = [
  'root.order.id',
  'root.customer.name',
  'root.lineItems',
  'root.total',
  'root.shipTo.address',
  'root.billing.phone',
];

const initialMappings: MappingEntry[] = [
  { id: 'm-101', name: '850 – JSON', source: 'ISA', target: 'root.order.id', mode: 'Direct', standard: 'X12' },
  { id: 'm-102', name: '850 – XML', source: 'BEG', target: 'root.customer.name', mode: 'Code', standard: 'X12' },
  { id: 'm-103', name: 'Orders – HL7', source: 'PO1', target: 'root.lineItems', mode: 'Join', standard: 'HL7' },
];

export default function App() {
  const [mappings, setMappings] = useState<MappingEntry[]>(initialMappings);
  const [dragged, setDragged] = useState<string | null>(null);
  const [status, setStatus] = useState('System ready');
  const [code, setCode] = useState(`function transform(value) {
  return value.trim().toUpperCase();
}`);
  const [activeMappingId, setActiveMappingId] = useState<string>('m-101');

  const metrics = useMemo(
    () => ({
      throughput: '2.1k',
      validation: '99%',
      activeJobs: '18',
      latency: '92ms',
    }),
    [],
  );

  const activeMapping = mappings.find((mapping) => mapping.id === activeMappingId) ?? mappings[0];

  const handleDrop = (target: string) => {
    if (!dragged) {
      setStatus('Select a source segment first.');
      return;
    }

    const nextMapping: MappingEntry = {
      id: `m-${Date.now()}`,
      name: `${activeMapping?.name ?? 'New mapping'} - ${dragged}`,
      source: dragged,
      target,
      mode: code.trim() ? 'Code' : 'Direct',
      standard: activeMapping?.standard ?? 'X12',
    };

    setMappings((current) => [...current, nextMapping]);
    setActiveMappingId(nextMapping.id);
    setStatus(`Mapped ${dragged} → ${target}`);
  };

  const handleValidate = () => {
    setStatus(`Validation succeeded for ${mappings.length} mapping rules.`);
  };

  const handleExecute = () => {
    setStatus('Transaction queued for execution.');
  };

  const addNewMapping = () => {
    const newMapping: MappingEntry = {
      id: `m-${Date.now()}`,
      name: `New mapping ${mappings.length + 1}`,
      source: 'ISA',
      target: 'root.order.id',
      mode: 'Direct',
      standard: 'X12',
    };
    setMappings((current) => [...current, newMapping]);
    setActiveMappingId(newMapping.id);
    setStatus('Created a new mapping definition.');
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <h1>B2B EDI Studio</h1>
        </div>
        <div className="toolbar">
          <button onClick={addNewMapping}>New mapping</button>
          <button className="primary" onClick={handleValidate}>Validate</button>
          <button onClick={handleExecute}>Execute</button>
        </div>
      </header>

      <section className="metrics-grid">
        <div className="metric-card">
          <span className="label">Throughput</span>
          <strong>{metrics.throughput}</strong>
        </div>
        <div className="metric-card">
          <span className="label">Validation</span>
          <strong>{metrics.validation}</strong>
        </div>
        <div className="metric-card">
          <span className="label">Active jobs</span>
          <strong>{metrics.activeJobs}</strong>
        </div>
        <div className="metric-card">
          <span className="label">Latency</span>
          <strong>{metrics.latency}</strong>
        </div>
      </section>

      <main className="layout layout-wide">
        <aside className="panel panel-compact">
          <h2>Transaction formats</h2>
          <div className="format-list">
            {supportedFormats.map((format) => (
              <div key={format.name} className="format-row">
                <div>
                  <strong>{format.name}</strong>
                  <small>{format.count} schemas</small>
                </div>
                <span className={`status-badge ${format.status.toLowerCase()}`}>{format.status}</span>
              </div>
            ))}
          </div>
        </aside>

        <aside className="panel panel-compact">
          <h2>Mappings</h2>
          <div className="mapping-list">
            {mappings.map((mapping) => (
              <button
                key={mapping.id}
                className={`mapping-item ${activeMappingId === mapping.id ? 'active' : ''}`}
                onClick={() => setActiveMappingId(mapping.id)}
              >
                <div className="mapping-header">
                  <strong>{mapping.name}</strong>
                  <span>{mapping.standard}</span>
                </div>
                <small>{mapping.source} → {mapping.target}</small>
              </button>
            ))}
          </div>
        </aside>

        <aside className="panel panel-compact">
          <h2>EDI Source</h2>
          <div className="source-list">
            {sourceSegments.map((segment) => (
              <div
                key={segment}
                className="source-item"
                draggable
                onDragStart={() => setDragged(segment)}
                onDragEnd={() => setDragged(null)}
              >
                {segment}
              </div>
            ))}
          </div>
        </aside>

        <section className="panel panel-wide">
          <h2>Mapping canvas</h2>
          <div className="mapping-canvas">
            {mappings.map((entry) => (
              <div key={entry.id} className="mapping-row">
                <div>
                  <strong>{entry.source}</strong>
                  <span> → {entry.target}</span>
                </div>
                <div className="mapping-meta">
                  <span className="mode-pill">{entry.mode}</span>
                  <span className="mapping-name">{entry.name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel panel-compact">
          <h2>Target schema</h2>
          <div className="target-list">
            {targetNodes.map((target) => (
              <div
                key={target}
                className="target-node"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(target)}
              >
                <span>{target}</span>
                <span className="node-type">string</span>
              </div>
            ))}
          </div>

          <div className="field-block">
            <label>Custom code</label>
            <textarea value={code} onChange={(event) => setCode(event.target.value)} />
          </div>

          <div className="field-block">
            <label>Selected mapping</label>
            <div className="summary-box">
              <strong>{activeMapping?.name ?? 'No mapping selected'}</strong>
              <p>{activeMapping ? `${activeMapping.source} → ${activeMapping.target}` : 'Choose a mapping to edit.'}</p>
            </div>
          </div>

          <div className="status">{status}</div>
        </aside>
      </main>
    </div>
  );
}
