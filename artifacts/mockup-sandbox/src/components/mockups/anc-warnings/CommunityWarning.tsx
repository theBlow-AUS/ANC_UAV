import './_group.css';
import { useState } from 'react';

function StatusChip({ children, warning = false }: { children: string; warning?: boolean }) {
  return <span className={`chip ${warning ? 'chip-warning' : ''}`}>{children}</span>;
}

function CompactFrequencyCard({ ctaf = false }: { ctaf?: boolean }) {
  return (
    <article className="compact-card">
      <div className="chips">
        <StatusChip>{ctaf ? 'CTAF · source record' : 'Other airport service'}</StatusChip>
        <StatusChip warning>Unverified community data</StatusChip>
      </div>
      <h2>{ctaf ? '120.7 MHz · CTAF' : '114.3 MHz · MISC'}</h2>
      <h3>[Duplicate] Dalhousie Airport (YDLH)</h3>
      <p className="metadata">{ctaf ? 'Source description: CTAF' : 'Source description: MISC'} · small_airport</p>
      <p className="distance">Distance unknown: no origin set</p>
      <p className="metadata">Control status and effective dates unknown</p>
      <button className="details">⌄ &nbsp; Source details</button>
    </article>
  );
}

export function CommunityWarning() {
  const [limitsOpen, setLimitsOpen] = useState(false);
  return (
    <main className="phone">
      <header className="screen-heading">
        <span>COMMUNICATE · COMPACT STATUS LABELS</span>
        <h1>Airport CTAF lookup</h1>
        <p>OurAirports community reference</p>
      </header>
      <section className="compact-callout">
        <div className="callout-heading"><span className="callout-dot" />Partial, unverified dataset</div>
        <p>Dates and control status unknown. No result does NOT mean no radio requirement.</p>
        <button className="limits-toggle" onClick={() => setLimitsOpen(!limitsOpen)}>
          {limitsOpen ? 'Hide dataset limits' : 'Show dataset limits'} <span>{limitsOpen ? '−' : '+'}</span>
        </button>
        {limitsOpen ? <p className="limits-detail">Coverage is partial. Tower hours are unknown. No FCTAF is inferred. Use current authorized sources.</p> : null}
      </section>
      <CompactFrequencyCard ctaf />
      <CompactFrequencyCard />
    </main>
  );
}

