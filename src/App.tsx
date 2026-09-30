import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { CircleAlert } from 'lucide-react';
import { common, header } from './content';
import { DataContext, LoadError, loadDataset } from './lib/data';
import { actions, getState, initFromHash } from './lib/store';
import type { Dataset } from './types';
import { ControlBar, Header } from './components/Controls';
import { KpiStrip } from './components/KpiStrip';
import { Finding } from './components/Finding';
import { Panels } from './components/Panels';
import { ShortlistTray } from './components/ShortlistTray';
import { ToastRegion, TooltipLayer } from './components/overlay';
import { ViewBoundary } from './components/ViewBoundary';
import { NationalContext } from './views/NationalContext';
import { StateGrowth } from './views/StateGrowth';
import { RtoDrilldown } from './views/RtoDrilldown';
import { GapRanking } from './views/GapRanking';
import { VehicleMix } from './views/VehicleMix';

function Skeleton() {
  return (
    <div className="page" aria-busy="true" aria-live="polite">
      <Header />
      <p className="sr-only">{common.loading}</p>
      <div className="skeleton" style={{ height: 88 }} />
      <div className="skeleton" style={{ height: 56, marginTop: 16, maxWidth: 720 }} />
      <div className="kpis">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>
      <div className="grid">
        <div className="skeleton col-8" style={{ height: 560 }} />
        <div className="skeleton col-4" style={{ height: 560 }} />
        <div className="skeleton col-6" style={{ height: 420 }} />
        <div className="skeleton col-6" style={{ height: 420 }} />
      </div>
    </div>
  );
}

function ErrorState({ file }: { file: string }) {
  return (
    <div className="page">
      <Header />
      <div className="card error-state" role="alert">
        <CircleAlert size={28} aria-hidden style={{ color: 'var(--error)' }} />
        <h2>{common.errorTitle}</h2>
        <p>{common.errorBody(file)}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>{common.retry}</button>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDataset()
      .then((d) => {
        initFromHash([d.stateMonth.months[0], d.stateMonth.months[d.stateMonth.months.length - 1]], d.summary.map((r) => r.state_name));
        setData(d);
      })
      .catch((e) => setError(e instanceof LoadError ? e.file : String(e)));
  }, []);

  // Esc clears the selection (popovers and the combobox stop Esc before it gets here)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && getState().selected) actions.select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (error) return <ErrorState file={error} />;
  if (!data) return <Skeleton />;

  return (
    <MotionConfig reducedMotion="user">
      <DataContext.Provider value={data}>
        <a className="skip-link" href="#main">{header.skipLink}</a>
        <div className="page">
          <Header />
          <ControlBar />
          <main id="main" tabIndex={-1}>
            {/* answer first: the finding, then the gap itself beside the map; context and paperwork follow */}
            <Finding />
            <KpiStrip />
            <div className="grid">
              <ViewBoundary name="State growth" className="col-8"><StateGrowth index={5} /></ViewBoundary>
              <ViewBoundary name="Gap ranking" className="col-4"><GapRanking index={6} /></ViewBoundary>
              <ViewBoundary name="Vehicle mix" className="col-6"><VehicleMix index={7} /></ViewBoundary>
              <ViewBoundary name="RTO drill-down" className="col-6"><RtoDrilldown index={8} /></ViewBoundary>
              <ViewBoundary name="National context" className="col-12"><NationalContext index={9} /></ViewBoundary>
              <Panels index={10} />
            </div>
          </main>
        </div>
        <ShortlistTray />
        <TooltipLayer />
        <ToastRegion />
      </DataContext.Provider>
    </MotionConfig>
  );
}
