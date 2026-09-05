import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { activeStorms, tidy, tidyPosition, type StormSummary } from '../lib/tropical'
import { nws } from '../lib/nws'
import { floaterUrl, TROPICAL, TROPICAL_BASINS } from '../lib/sources'
import { hstDateTime, relativeAge } from '../lib/units'
import { Card, ErrorState, SegmentedControl, Skeleton } from '../components/ui'
import { useAlerts } from '../components/AlertsDrawer'

/**
 * Tropical systems for the Central and Eastern Pacific.
 *
 * This was a page of two outlook graphics and a set of links, on the belief that
 * the advisory text was not reachable without a backend. It is: the products are
 * `TCP`, `TCD` and `TWO` under basin *locations* (`CP`, `CP4`, `EP1`), all of it
 * CORS-open. So the advisories are read here — position, intensity, movement,
 * distance from the islands, the forecaster's discussion — with the storm-centred
 * GOES floater beside each one.
 */

const TROPICAL_EVENTS = /hurricane|tropical|storm surge/i

function Summary({ storm }: { storm: StormSummary }) {
  const facts: [string, string | null][] = [
    ['Position', storm.position && tidyPosition(storm.position)],
    ['Max winds', storm.winds && tidy(storm.winds)],
    ['Moving', storm.movement && tidy(storm.movement)],
    ['Pressure', storm.pressure && tidy(storm.pressure)],
  ]

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      {facts.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-semibold uppercase tracking-widest text-faint">{k}</dt>
          <dd className="mt-0.5 text-sm font-medium tabular-nums text-ink">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

function StormCard({ storm }: { storm: StormSummary }) {
  const discussion = useQuery({
    queryKey: ['tcd', storm.header],
    // The discussion shares the system's slot; TCP header WTPA34 pairs with the
    // TCD issued from the same office minutes later.
    queryFn: async () => {
      const all = await nws.recentProducts('TCD', 40)
      const mate = all
        .filter((p) => p.issuingOffice === storm.office)
        .sort((a, b) => new Date(b.issuanceTime).getTime() - new Date(a.issuanceTime).getTime())
        .find(
          (p) =>
            Math.abs(new Date(p.issuanceTime).getTime() - new Date(storm.issuedAt).getTime()) <
            3600_000,
        )
      return mate ? nws.product(mate.id) : null
    },
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
    refetchIntervalInBackground: true,
  })

  return (
    <Card
      title={storm.name ?? 'Tropical system'}
      subtitle={
        <>
          Advisory {storm.advisory ?? '—'} · {storm.office === 'PHFO' ? 'CPHC Honolulu' : 'NHC Miami'}
          {storm.atcf && <span className="text-faint"> · {storm.atcf}</span>}
        </>
      }
      actions={
        <span className="text-xs text-faint" title={`${hstDateTime(storm.issuedAt)} HST`}>
          {relativeAge(storm.issuedAt)}
        </span>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* The floater is a live NESDIS sector that tracks this system; a storm
            without one simply shows nothing. */}
        {storm.atcf && (
          <img
            src={floaterUrl(storm.atcf)}
            alt={`GOES imagery centred on ${storm.name ?? storm.atcf}`}
            className="w-full rounded border border-line bg-black object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}

        <div className="min-w-0 space-y-4">
          {storm.headline && (
            <p className="rounded border border-warn/40 bg-warn-soft px-3 py-2 text-sm font-medium text-ink">
              {storm.headline}
            </p>
          )}

          <Summary storm={storm} />

          {storm.distances.length > 0 && (
            <ul className="space-y-0.5 text-sm text-muted">
              {storm.distances.map((d) => (
                <li key={d}>About {tidy(d)}</li>
              ))}
            </ul>
          )}

          {storm.watches && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-faint">
                Watches and warnings
              </h3>
              <p className="mt-1 text-sm text-ink">{storm.watches}</p>
            </div>
          )}
        </div>
      </div>

      {/* The advisory as issued, in its own scroll box: always there, and it
          cannot push the cards below it around the way a disclosure does. */}
      <div className="mt-4 border-t border-line pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-faint">
          Advisory{discussion.data ? ' and forecaster discussion' : ''}, as issued
        </h3>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted">
          {storm.text.trim()}
          {discussion.data?.productText && `\n\n${discussion.data.productText.trim()}`}
        </pre>
      </div>
    </Card>
  )
}

/**
 * The outlook: what is being watched, and the odds given to it.
 *
 * The text is the product. Its shape is stable — a paragraph of prose, then one
 * `Formation chance through N hours...low...near 0 percent` line per window —
 * so the chances are lifted out and shown as figures, with the outlook itself
 * underneath.
 */
function chances(text: string) {
  return [...text.matchAll(/Formation chance through ([^.]+?)\.\.\.\s*(\w+)\.\.\.\s*([^.\n]+)\./gi)].map(
    (m) => ({ window: m[1].trim(), level: m[2].trim(), value: m[3].trim() }),
  )
}

/** The product minus its teleprinter wrapper and sign-off. */
function outlookBody(text: string) {
  const start = text.search(/^For the /m)
  const body = start >= 0 ? text.slice(start) : text
  return body.replace(/\$\$[\s\S]*$/, '').trim()
}

function Outlook() {
  const [basin, setBasin] = useState<string>(TROPICAL_BASINS[0].id)
  const spec = TROPICAL_BASINS.find((b) => b.id === basin) ?? TROPICAL_BASINS[0]

  const { data } = useQuery({
    queryKey: ['two', basin],
    queryFn: () => nws.latestProduct('TWO', basin),
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
    refetchIntervalInBackground: true,
  })

  const text = data?.productText ?? ''
  const odds = text ? chances(text) : []

  return (
    <Card
      title="Tropical weather outlook"
      subtitle={spec.blurb}
      actions={
        <SegmentedControl
          label="Basin"
          value={basin}
          onChange={setBasin}
          options={TROPICAL_BASINS.map((b) => ({ id: b.id, label: b.label, title: b.blurb }))}
        />
      }
    >
      {text ? (
        <div className="space-y-4">
          {odds.length > 0 && (
            <dl className="flex flex-wrap gap-x-10 gap-y-2">
              {odds.map((o) => (
                <div key={o.window}>
                  <dt className="text-xs font-semibold uppercase tracking-widest text-faint">
                    Formation, {o.window}
                  </dt>
                  <dd className="mt-0.5 text-lg font-medium text-ink">
                    {o.value}{' '}
                    <span className="text-sm font-normal text-muted">({o.level})</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {outlookBody(text)}
          </p>

          <p className="text-xs text-faint">
            Issued {relativeAge(data!.issuanceTime)} · {data!.issuingOffice === 'PHFO' ? 'CPHC Honolulu' : 'NHC Miami'}
          </p>
        </div>
      ) : (
        <Skeleton className="h-32 w-full" />
      )}
    </Card>
  )
}

export default function Tropical() {
  const storms = useQuery({
    queryKey: ['tropical-storms'],
    queryFn: activeStorms,
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchIntervalInBackground: true,
  })

  const { data: alerts } = useAlerts()
  const tropicalAlerts = (alerts ?? []).filter((a) => TROPICAL_EVENTS.test(a.event))

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tropical</h1>
        <p className="mt-1 max-w-3xl text-muted">
          Active systems in the Central and Eastern Pacific.
        </p>
      </header>

      <div className="space-y-6">
        {tropicalAlerts.length > 0 && (
          <Card title="In effect for Hawai‘i">
            <ul className="space-y-2">
              {tropicalAlerts.map((a) => (
                <li key={a.id}>
                  <p className="text-sm font-medium text-ink">{a.event}</p>
                  <p className="text-xs text-muted">{a.areaDesc}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {storms.isLoading && <Skeleton className="h-64 w-full" />}

        {storms.isError && (
          <ErrorState
            source="api.weather.gov"
            message={(storms.error as Error).message}
            onRetry={() => storms.refetch()}
          />
        )}

        {storms.data?.length === 0 && (
          <Card title="No active systems">
            <p className="text-sm text-muted">
              Nothing under advisory in the Central or Eastern Pacific right now. The outlook below
              shows anything being watched for development.
            </p>
          </Card>
        )}

        {storms.data?.map((s) => <StormCard key={s.header} storm={s} />)}

        <Outlook />

        <Card title="Official sources">
          <ul className="grid gap-3 sm:grid-cols-2">
            <li>
              <a
                className="text-sm font-medium text-primary hover:underline"
                href={TROPICAL.cphcSite}
                target="_blank"
                rel="noreferrer"
              >
                Central Pacific Hurricane Center →
              </a>
              <p className="text-xs text-muted">
                Advisories between 140°W and the dateline — the basin Hawai‘i sits in.
              </p>
            </li>
            <li>
              <a
                className="text-sm font-medium text-primary hover:underline"
                href={TROPICAL.nhcSite}
                target="_blank"
                rel="noreferrer"
              >
                National Hurricane Center →
              </a>
              <p className="text-xs text-muted">
                Eastern Pacific systems, which often track west into the Central Pacific.
              </p>
            </li>
          </ul>
        </Card>
      </div>
    </>
  )
}
