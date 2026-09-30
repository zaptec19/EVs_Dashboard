import { Fragment, type ReactNode } from 'react';
import { BookOpen, ChevronDown, CircleAlert, Database, Download } from 'lucide-react';
import { doesntShow, howToRead, whereFrom } from '../content';
import { splitOf, useData } from '../lib/data';
import { fmtInt, fmtRange } from '../lib/format';
import { useMediaQuery } from './ui';

function Panel({ icon, title, children, id, className }: { icon: ReactNode; title: string; children: ReactNode; index: number; id: string; className: string }) {
  // reference material: open on desktop, collapsed on phones so it doesn't add screens of scroll
  const phone = useMediaQuery('(max-width: 671px)');
  return (
    <section id={id} className={`card panel ${className}`} aria-labelledby={`${id}-h`}>
      <details open={!phone} key={phone ? 'phone' : 'wide'}>
        <summary>
          <h2 id={`${id}-h`}>{icon}{title}</h2>
          <ChevronDown size={20} aria-hidden className="panel-chevron" />
        </summary>
        {children}
      </details>
    </section>
  );
}

export function Panels({ index }: { index: number }) {
  const d = useData();
  const m = d.meta;
  const fy = splitOf(d, 'fy_file');
  const cf = splitOf(d, 'category_fuel');
  const v2stats = d.stats.find((s) => s.rule === 'v3' && s.file.includes('fuel-type'))!;
  const catStats = d.stats.find((s) => s.rule === 'v3' && s.file.includes('vehicle-category'))!;
  const fyA = d.fyCompare[0];
  const fyB = d.fyCompare[d.fyCompare.length - 1];
  const sideOf = (r: (typeof d.fyCompare)[number]) => ({ fy: r.fy, file: fmtInt(r.fy_file_ev), vahan: fmtInt(r.vahan_ev) });
  const base = `${import.meta.env.BASE_URL}data/downloads/`;

  return (
    <>
      <Panel id="how-to-read" className="col-6" index={index} icon={<BookOpen size={18} aria-hidden />} title={howToRead.title}>
        <dl>
          {howToRead.items({ l12: fmtRange(m.last12_from, m.last12_to), p12: fmtRange(m.prior12_from, m.prior12_to), aligned: fmtRange(m.granular_from, m.granular_to) }).map((it) => (
            <Fragment key={it.h}><dt>{it.h}</dt><dd>{it.p}</dd></Fragment>
          ))}
        </dl>
      </Panel>
      <Panel id="doesnt-show" className="col-6" index={index + 1} icon={<CircleAlert size={18} aria-hidden />} title={doesntShow.title}>
        <dl>
          {doesntShow.items({
            split: { fy: m.fy_last, fy3w: fy.shares['3W'] ?? NaN, cf3w: cf.shares['3W'] ?? NaN },
            dropped: { blocks: v2stats.blocks_dropped, pctRows: v2stats.pct_rows, pctVol: v2stats.pct_naive_volume, catBlocks: catStats.blocks_dropped },
            excluded: { office: m.excluded_office, months: m.excluded_office_months, evRemoved: fmtInt(Number(m.excluded_office_ev_removed)) },
            fyVsVahan: { a: sideOf(fyA), b: sideOf(fyB) },
            to: m.granular_to,
          }).map((it) => (
            <Fragment key={it.h}><dt>{it.h}</dt><dd>{it.p}</dd></Fragment>
          ))}
        </dl>
      </Panel>
      <Panel id="where-from" className="col-12" index={index + 2} icon={<Database size={18} aria-hidden />} title={whereFrom.title}>
        <div className="where-grid">
          <div>
            <p className="where-intro">{whereFrom.intro}</p>
            <h3 className="panel-h3">{whereFrom.downloadsHeading}</h3>
            <ul className="downloads">
              {whereFrom.downloads.map((f) => (
                <li key={f.file}>
                  <a href={base + f.file} download>
                    <Download size={14} aria-hidden /> {f.label} <span className="file">({f.file})</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            {/* the DataMeet map licence (CC BY 4.0) requires this credit wherever the map is shown */}
            <div className="source source-static" data-testid="map-attribution">
              <h3 className="panel-h3">{whereFrom.mapAttribution.heading}</h3>
              <p>
                {whereFrom.mapAttribution.text}{' '}
                <a href={whereFrom.mapAttribution.link} target="_blank" rel="noreferrer">DataMeet maps</a>
                {' · '}
                <a href={whereFrom.mapAttribution.licenceLink} target="_blank" rel="noreferrer">CC BY 4.0</a>
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </>
  );
}
