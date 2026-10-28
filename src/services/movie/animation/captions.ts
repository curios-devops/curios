// One caption line at a time under the stage, in step with the narrator: a beat's "say" is cut
// into short lines (one line on a phone) and the line shown follows how much has been said.

const MAX = 42; // characters that fit one line at 360 px

/** The beat's text as short lines, cut after punctuation when possible, never inside a word. */
export function captionLines(text: string, max = MAX): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; continue; }
    line = line ? `${line} ${word}` : word;
    // A sentence or clause that ends past half a line closes it, so lines follow the speech.
    if (/[.!?;:,]$/.test(word) && line.length > max / 2) { lines.push(line); line = ''; }
  }
  if (line) lines.push(line);
  return lines;
}

/** The line being said when `done` (0-1) of the beat has been said, by its share of the characters. */
export function lineAt(lines: string[], done: number): number {
  const total = lines.reduce((n, l) => n + l.length, 0);
  let said = 0;
  for (let i = 0; i < lines.length; i++) {
    said += lines[i].length;
    if (done * total < said) return i;
  }
  return Math.max(0, lines.length - 1);
}

/** Seconds a beat takes to read aloud without a voice (the studio's pace: 2.6 words a second). */
export const readingSeconds = (text: string) => text.trim().split(/\s+/).length / 2.6;
