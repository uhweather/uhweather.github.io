/**
 * Reading NWS text products as prose.
 *
 * These arrive shaped for a teleprinter: a WMO routing header, an office
 * banner, hard wrapping at about 69 columns and `.SECTION...` markers separated
 * by `&&`. Rendered verbatim it is a wall of monospace that nobody reads. The
 * structure is all there — it just has to be recognised.
 */

/**
 * Undo the teletype wrap.
 *
 * NWS products are hard-wrapped at about 69 columns for a printer. In a reading
 * column half that width every one of those lines wraps again, so a paragraph
 * comes out double-spaced and ragged — "…Saturday and Sunday as a low" / "pressure
 * trough moving into…" — and a synopsis that is five sentences long fills the
 * panel. Joining the wrapped lines back into paragraphs halves the height and
 * reads as prose. Blank lines still separate paragraphs, and indented or bulleted
 * lines are left alone: those breaks are the forecaster's, not the printer's.
 */
export function reflow(text: string): string {
  const out: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    const prev = out[out.length - 1]
    const wrapped =
      prev !== undefined &&
      prev.length > 45 && // the previous line ran to the wrap column
      line.trim().length > 0 &&
      !/^\s/.test(raw) && // indentation means a list or a table
      // A bullet or a numbered item stands alone; a line that merely starts
      // with a figure — "4 on the Saffir-Simpson scale" — is the sentence above
      // it carrying on.
      !/^(?:[-*•]|\d+[.)])\s/.test(line.trim())
    if (wrapped) out[out.length - 1] = `${prev} ${line.trim()}`
    else out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * The forecast discussion, split into its named sections.
 *
 * NWS text products arrive with a WMO routing header, a station block and then
 * `.SYNOPSIS...`-style section markers separated by `&&`. Rendered raw it is a
 * wall of teletype; the headings are what make it skimmable from across a room,
 * and they are already in the text — they just have to be recognised.
 */
export function parseAfd(text: string): { heading: string; body: string }[] {
  // Drop everything up to the issuance line: routing codes and the office
  // banner are addressed to a teleprinter, not a reader.
  const start = text.search(/^\.[A-Z][A-Z /-]*\.\.\./m)
  const body = start >= 0 ? text.slice(start) : text

  const sections: { heading: string; body: string }[] = []
  const re = /^\.([A-Z][A-Z0-9 /&'-]*?)\.\.\.\s*/gm
  let match = re.exec(body)
  while (match) {
    const next = re.exec(body)
    const chunk = body.slice(match.index + match[0].length, next ? next.index : undefined)
    sections.push({
      heading: match[1].trim(),
      // `&&` is a section terminator, and `$$` ends the product.
      body: reflow(chunk.replace(/^\s*&&\s*$/gm, '').replace(/\$\$[\s\S]*$/, '')),
    })
    match = next
  }

  return sections.length ? sections : [{ heading: 'Discussion', body: body.trim() }]
}
