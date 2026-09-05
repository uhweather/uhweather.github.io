import { LINK_GROUPS } from '../lib/sources'
import { Card } from '../components/ui'
import { UiIcons } from '../components/UiIcons'

export default function About() {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">About Weather Glass</h1>
        <p className="mt-1 max-w-3xl text-muted">
          Live observations, forecasts, satellite and radar for the Hawaiian Islands.
        </p>
        <p className="mt-3 max-w-3xl text-muted">
          This is a passion project by a group of students in the Department of Atmospheric
          Sciences at the University of Hawai‘i at Mānoa.
        </p>
      </header>

      <Card className="mt-6" title="Disclaimer">
        <div className="space-y-3 text-sm leading-relaxed text-ink">
          <p>
            <strong className="font-semibold">
              This is not an official University of Hawai‘i publication.
            </strong>{' '}
            It is an independent project built by students, and is not produced, reviewed,
            endorsed or maintained by the University of Hawai‘i, the Department of Atmospheric
            Sciences, SOEST, or NOAA. The department is named here to say who we are, not to
            claim the site speaks for it.
          </p>
          <p>
            It is also not an official source of weather warnings. Data is relayed from NOAA
            without modification, but availability, timeliness and accuracy are not guaranteed
            and the site may be wrong or offline without notice. For any decision affecting life
            or property, use{' '}
            <a className="underline hover:text-primary" href="https://www.weather.gov/hfo/">
              NWS Honolulu
            </a>{' '}
            and, for tropical systems, the{' '}
            <a className="underline hover:text-primary" href="https://www.nhc.noaa.gov/?cpac">
              Central Pacific Hurricane Center
            </a>
            .
          </p>
        </div>
      </Card>

      <h2 className="mb-4 mt-8 text-xl font-semibold tracking-tight">Related sites</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {LINK_GROUPS.map((g) => (
          <Card key={g.title} title={g.title}>
            <ul className="space-y-3">
              {g.links.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {l.label} <UiIcons.external size={13} className="inline align-[-1px]" />
                  </a>
                  <p className="text-sm text-muted">{l.blurb}</p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  )
}
