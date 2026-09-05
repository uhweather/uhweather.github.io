import { useState } from 'react'
import { ANALYSIS_GROUPS, type AnalysisChart } from '../lib/sources'
import { SegmentedControl } from '../components/ui'
import { useNow } from '../lib/useFrameLoop'

/**
 * Hand-analysed Pacific charts from the Ocean Prediction Center.
 *
 * This replaced a page of links to model guidance. A forecaster's surface
 * analysis — fronts, isobars and centres drawn by a person — is a different and
 * more useful thing than a raw model field, and unlike the model graphics it can
 * actually be shown here rather than pointed at.
 *
 * OPC reissues each chart at the same URL, so the browser would keep showing the
 * one it cached. A token ticking on the issue cycle is what keeps a window left
 * open current.
 */
export default function Analysis() {
  const [groupId, setGroupId] = useState(ANALYSIS_GROUPS[0].id)
  const [chartId, setChartId] = useState(ANALYSIS_GROUPS[0].charts[0].id)

  // Charts land every six hours; check twice as often as that.
  const generation = useNow(180)

  const group = ANALYSIS_GROUPS.find((g) => g.id === groupId) ?? ANALYSIS_GROUPS[0]
  const chart: AnalysisChart =
    group.charts.find((c) => c.id === chartId) ?? group.charts[0]

  const pickGroup = (id: string) => {
    const next = ANALYSIS_GROUPS.find((g) => g.id === id) ?? ANALYSIS_GROUPS[0]
    setGroupId(next.id)
    // Keep the same lead time where the new group has one, so switching from a
    // 48-hour surface chart to 48-hour waves is one click rather than two.
    const sameHour = next.charts.find((c) => c.hour === chart.hour)
    setChartId((sameHour ?? next.charts[0]).id)
  }

  return (
    <div className="flex min-h-[520px] flex-1 flex-col gap-3">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pacific analysis</h1>
        <p className="mt-1 max-w-3xl text-muted">
          Surface and upper-air charts for the Pacific from NOAA's Ocean Prediction Center.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <SegmentedControl
          label="Chart type"
          name="Chart"
          value={groupId}
          onChange={pickGroup}
          options={ANALYSIS_GROUPS.map((g) => ({ id: g.id, label: g.title, title: g.blurb }))}
        />
        <SegmentedControl
          label="Lead time"
          name="Valid"
          value={chart.id}
          onChange={setChartId}
          options={group.charts.map((c) => ({ id: c.id, label: c.label, title: c.blurb }))}
        />
        <p className="ml-auto text-xs text-muted">{chart.blurb}</p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded border border-line bg-white">
        <img
          key={chart.id}
          src={`${chart.url}?_=${generation}`}
          alt={`${group.title} — ${chart.label}: ${chart.blurb}`}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>

      <p className="border-t border-line pt-3 text-xs text-muted">
        {group.blurb} Issued four times a day by the{' '}
        <a
          className="text-primary hover:underline"
          href="https://ocean.weather.gov/Pac_tab.php"
          target="_blank"
          rel="noreferrer"
        >
          Ocean Prediction Center
        </a>
        .
      </p>
    </div>
  )
}
