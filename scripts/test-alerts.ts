import assert from 'node:assert/strict'
import { currentAlerts } from '../src/lib/alerts.ts'
import type { Alert } from '../src/lib/nws.ts'

const now = Date.parse('2026-09-08T22:00:00Z')
const alert = (id: string, extra: Partial<Alert> = {}): Alert => ({
  id, event: 'Flood Watch', areaDesc: 'Oahu', senderName: 'NWS Honolulu',
  effective: '2026-09-08T18:00:00Z', expires: '2026-09-09T04:00:00Z',
  severity: 'Moderate', certainty: 'Likely', urgency: 'Expected',
  headline: null, description: '', instruction: null, status: 'Actual',
  ...extra,
})
const ids = (items: Alert[]) => currentAlerts(items, now).map((a) => a.id).sort()
const old = alert('old', { event: 'Tropical Cyclone Local Statement', parameters: { AWIPSidentifier: ['HLSHFO'] } })
const latest = { ...old, id: 'latest', sent: '2026-09-08T20:00:00Z' }
assert.deepEqual(ids([old, latest]), ['latest'])
assert.deepEqual(ids([latest, old]), ['latest'])
assert.deepEqual(ids([old, { ...latest, areaDesc: 'Kauai' }]), ['latest', 'old'])
assert.deepEqual(ids([old, { ...latest, parameters: { AWIPSidentifier: ['HLSOTHER'] } }]), ['latest', 'old'])
assert.deepEqual(ids([old, { ...latest, expires: '2026-09-08T21:00:00Z' }]), [])
assert.deepEqual(ids([alert('one'), alert('two', { areaDesc: 'Kauai' })]), ['one', 'two'])
assert.deepEqual(ids([alert('one'), alert('one')]), ['one'])
for (const messageType of ['Update', 'Cancel']) {
  assert.deepEqual(ids([alert('old'), alert('new', { messageType, references: [{ identifier: 'old' }] })]), messageType === 'Update' ? ['new'] : [])
}
assert.deepEqual(ids([alert('expired', { expires: '2026-09-08T21:00:00Z' }), alert('test', { status: 'Test' }), alert('ended', { ends: '2026-09-08T21:00:00Z' })]), [])
console.log('Alert validity checks passed')
