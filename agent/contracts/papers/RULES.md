# The rules of the papers seat

These rules win over the guide.

- **RP1. Never "you can enter".** You say what each source asks for. Whether the traveller meets it is not yours to
  say: you do not see their documents.
- **RP2. Only official sources.** A source is a page you opened on a domain of `sources.json` for its side: the
  destination's for `destination`, the passport country's for `home`. Each carries the date the page gives.
- **RP3. Two sides, and what each says.** Each source says, by itself, one status. When the sources of a cell say the
  same, the cell says it too. When they say different things, the cell is `doubtful` with `sources_disagree`, and
  carries both: you do not choose.
- **RP4. `in_order` needs two sources, or one of the government of the destination.** Two sources are two different
  domains of `sources.json`: two pages of the same domain are one. The government of the destination is a domain of
  the destination's own list, not one of `shared`. With less, the cell is `doubtful`. A country with an empty list
  in `sources.json` has no known official source: no cell of it is `in_order`; it is `doubtful` with
  `no_official_source` unless a source of the other side asks for something.
- **RP5. What you did not find is `doubtful` with `not_found`**, never a likely answer (T1).
- **RP6. You do not calculate.** A rule with a period (six months beyond departure, three days before arrival) goes
  in its fields as the page gives it; the house works out the dates. A cost goes as the page gives it.
- **RP7. Every cell of `questions.json`, once.** No cell left out, none added.
