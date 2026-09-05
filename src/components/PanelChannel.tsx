import { SAT_BANDS, type SatBand } from '../lib/sources'

const COMPOSITES = SAT_BANDS.filter((b) => b.group === 'composite')
const BANDS = SAT_BANDS.filter((b) => b.group === 'band')

/**
 * The channel selector that lives on a panel.
 *
 * A 2×2 whose four channels are fixed answers one question well and every other
 * question badly. Putting the choice on the panel itself — rather than in four
 * more controls in the header — keeps the association obvious and costs no
 * layout: it replaces the label that was already sitting in the corner.
 */
export default function PanelChannel({
  value,
  onChange,
  className = '',
}: {
  value: SatBand
  onChange: (b: SatBand) => void
  className?: string
}) {
  return (
    <label className={`absolute left-1.5 top-1.5 z-10 ${className}`}>
      <span className="sr-only">Channel for this panel</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SatBand)}
        title="Choose the channel shown in this panel"
        /* Fixed width: a select sizes itself to its widest option, so left to
           itself each panel's label would be a different size from its
           neighbour's for no reason the reader can see. */
        className="w-[5.5rem] cursor-pointer appearance-none rounded border border-white/20 bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white outline-none backdrop-blur-sm transition-colors hover:bg-black/85 focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {/* Grouped, because a flat list of 22 is a list nobody reads to the end:
            the composites are the products, the bands are the raw channels. */}
        <optgroup label="Composites">
          {COMPOSITES.map((b) => (
            <option key={b.id} value={b.id} className="bg-surface text-ink">
              {b.short}
            </option>
          ))}
        </optgroup>
        <optgroup label="ABI bands">
          {BANDS.map((b) => (
            <option key={b.id} value={b.id} className="bg-surface text-ink">
              {b.short}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  )
}
