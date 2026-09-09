import type { Alert } from './nws'

/** Resolve CAP replacements before expiry filtering, so an expired replacement
 * cannot bring an older bulletin back. Never deduplicate warnings by title. */
export function currentAlerts(alerts: Alert[], now = Date.now()): Alert[] {
  const actual = alerts.filter((a) => !a.status || a.status === 'Actual')
  const replaced = new Set(actual.flatMap((a) =>
    a.messageType === 'Update' || a.messageType === 'Cancel'
      ? (a.references ?? []).map((r) => r.identifier) : [],
  ))
  const seen = new Set<string>()
  const statements = new Set<string>()
  return [...actual]
    .sort((a, b) => Date.parse(b.sent ?? b.effective) - Date.parse(a.sent ?? a.effective))
    .filter((a) => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      if (replaced.has(a.id)) return false

      // HLS bulletins can arrive as fresh CAP Alerts with no references even
      // while the preceding issuance is unexpired. Limit this fallback to the
      // same office's product and exact coverage, not unrelated weather events.
      const product = a.parameters?.AWIPSidentifier?.[0]
      if (a.event === 'Tropical Cyclone Local Statement' && product && a.senderName && a.areaDesc) {
        const coverage = a.areaDesc.split(';').map((area) => area.trim()).sort()
        const key = JSON.stringify([a.senderName, product, coverage])
        if (statements.has(key)) return false
        statements.add(key)
      }
      return a.messageType !== 'Cancel' && Date.parse(a.expires) > now &&
        (!a.ends || Date.parse(a.ends) > now)
    })
}
