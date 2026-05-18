/** UI-only copy polish for analyze results — does not change calculations or API data */

export type PolishedIssue = {
  title: string
  insight: string
  tip?: string
}

const VERDICT_POLISH: Record<string, string> = {
  "Mix needs improvement before release": "Further polish recommended before release",
}

const ISSUE_TITLE_POLISH: Record<string, string> = {
  "Stereo image inconsistent": "Stereo field loses focus in dense sections",
  "Low-end lacks control": "Low end loses stability during heavier passages",
  "Mix is too dynamic — may sound weak compared to commercial tracks":
    "Dynamics may feel uncontrolled on smaller speakers",
  "Kick lacks punch": "Kick transient could hit harder",
  "Vocals slightly buried": "Vocals sit slightly behind the mix",
  "High-end could be smoother": "Top end could feel silkier and less edgy",
  "Transient energy could be improved": "Transients could feel sharper and more defined",
  "Low end muddy": "Low end loses clarity in the low mids",
  "Low end weak": "Foundation could carry more weight",
  "Lacking brightness": "Top end could use more air and presence",
  "Overcompressed mix": "Dynamics feel a touch flattened",
  "Fine-tune stereo image": "Stereo field could feel more immersive",
}

const ISSUE_INSIGHT_POLISH: Record<string, string> = {
  "Stereo image inconsistent":
    "Width can collapse when layers stack — give reverbs and pads room at the sides without widening the kick.",
  "Low-end lacks control":
    "The foundation may wobble when kicks and bass overlap — gentle EQ and bus control can steady the feel.",
  "Mix is too dynamic — may sound weak compared to commercial tracks":
    "Big peaks can disappear on phones — light bus glue keeps the body present without killing punch.",
  "Kick lacks punch":
    "The attack may be masked by low-mid buildup — check kick EQ and how it shares space with the bass.",
  "Vocals slightly buried":
    "The vocal may need a touch more level or presence in the upper mids to sit on top of the bed.",
  "High-end could be smoother":
    "A little de-essing or gentle shelf work can tame harshness while keeping air.",
  "Transient energy could be improved":
    "Drums and perc can gain clarity with subtle transient shaping or parallel compression.",
  "Low end muddy":
    "Energy around 60–120 Hz may be masking the kick — carve gently for a tighter low end.",
  "Low end weak":
    "Sub and kick could reinforce each other — level and EQ moves can add weight without boom.",
  "Lacking brightness":
    "A gentle high shelf or saturation can add sheen without making the mix harsh.",
  "Overcompressed mix":
    "Backing off bus limiting can restore punch — aim for musical movement, not maximum level.",
  "Fine-tune stereo image":
    "Widen reverbs and ear candy while keeping kick, bass, and vocal anchored in the center.",
}

export function polishVerdictDisplay(verdict: string | null | undefined): string | null {
  if (!verdict?.trim()) return null
  return VERDICT_POLISH[verdict] ?? verdict
}

export function polishIssueDisplay(issueKey: string, presented: PolishedIssue): PolishedIssue {
  const title =
    ISSUE_TITLE_POLISH[issueKey] ?? ISSUE_TITLE_POLISH[presented.title] ?? presented.title
  const insight =
    ISSUE_INSIGHT_POLISH[issueKey] ?? ISSUE_INSIGHT_POLISH[presented.title] ?? presented.insight

  return { title, insight, tip: presented.tip }
}
