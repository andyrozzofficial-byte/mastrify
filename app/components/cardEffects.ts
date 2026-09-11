/**
 * Mastrify purple surface treatment.
 *
 * The pricing card is the reference: a violet-950 → black → slate-950 diagonal
 * base, a violet bloom seated at the top edge so the light falls from above,
 * and a faint diagonal sheen. Every surface here is mixed from that same violet
 * family, but the emphasis is tuned per role — cards and panels carry the full
 * layered treatment, selection states are the loudest so the active option is
 * unmistakable, and CTAs are flattest so they read premium rather than raised.
 *
 * Class strings must stay literal and unbroken; Tailwind scans this file as
 * plain text and will not see values assembled from interpolated parts.
 */

export const cardMastrifyPurple =
  "border-violet-400/[0.2] bg-gradient-to-br from-violet-950/55 via-black/70 to-slate-950/55 shadow-[0_22px_60px_rgba(0,0,0,0.5),0_0_38px_rgba(139,92,246,0.12)]"

/**
 * Bloom and sheen laid over a purple card. Carries the colour past the corner
 * the base gradient reaches on taller cards. Decorative, so it must stay
 * absolutely positioned and non-interactive.
 */
export const cardMastrifyPurpleSheen =
  "bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(124,58,237,0.18),transparent_70%),linear-gradient(105deg,rgba(255,255,255,0.035)_0%,transparent_46%,transparent_100%)]"

/**
 * The card material on a large panel, weighted to the rim: the bloom is pulled
 * into a shallow band at the top edge, an inset violet hairline lights the
 * border, and the interior keeps the panels' original white/4.5% → black/72%
 * fill so it stays as dark as before. Filling a panel this size the way the
 * pricing card is filled would read as a solid purple block.
 *
 * Border colour is deliberately omitted — the upload frames drive it from their
 * own idle/hover/drag/loaded state.
 */
export const panelMastrifyPurple =
  "bg-[radial-gradient(ellipse_110%_38%_at_50%_0%,rgba(124,58,237,0.16),transparent_62%),linear-gradient(105deg,rgba(255,255,255,0.035)_0%,transparent_46%,transparent_100%),linear-gradient(to_bottom,rgba(255,255,255,0.045),rgba(0,0,0,0.72))] shadow-[inset_0_1px_0_rgba(167,139,250,0.1),0_22px_60px_rgba(0,0,0,0.5),0_0_38px_rgba(139,92,246,0.12)]"

/**
 * Selected state for option/preset pickers: a bright top bloom over the diagonal
 * base, so a selected card separates unmistakably from the neutral unselected
 * ones. Deliberately more emphatic than the buttons — a selection indicator has
 * to shout, a CTA should not. Supplies border colour, fill and glow only; the
 * control keeps its own border width, radius and spacing.
 */
export const optionMastrifyPurpleSelected =
  "border-violet-400/60 text-white bg-[radial-gradient(ellipse_120%_150%_at_50%_0%,rgba(124,58,237,0.38),transparent_72%),linear-gradient(105deg,rgba(255,255,255,0.05)_0%,transparent_46%,transparent_100%),linear-gradient(to_bottom_right,rgba(46,16,101,0.9),rgba(0,0,0,0.72)_52%,rgba(2,6,23,0.85))] shadow-[0_0_0_1px_rgba(167,139,250,0.25),0_10px_30px_rgba(0,0,0,0.45),0_0_28px_rgba(139,92,246,0.2)] transition duration-200 hover:border-violet-300/70 hover:brightness-[1.08]"

/**
 * Primary CTA surface. Same violet family as the cards, but deliberately flat:
 * an even top-to-bottom violet with no hotspot, no gloss sheen and no lift
 * shadow, because those three are what made the buttons read as raised plastic.
 * Only a whisper of ambient purple remains to keep them in the card family.
 */
export const buttonMastrifyPurple =
  "bg-[linear-gradient(to_bottom,rgba(109,40,217,0.5)_0%,rgba(88,32,180,0.5)_55%,rgba(67,24,140,0.55)_100%)] shadow-[0_0_16px_rgba(139,92,246,0.07)]"
