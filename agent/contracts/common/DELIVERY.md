# How every seat delivers

- Answer once, with the six parts of the method, in this order and nothing else. Each part starts with a line that
  holds only the name of its file between `===` marks, exactly like these six lines:

      === 1-acknowledgement.md ===
      === 2-plan.md ===
      === 3-notes.md ===
      === 4-computations.md ===
      === 5-self-critique.md ===
      === delivery.json ===

  Nothing goes before the first mark and nothing after the delivery. Each mark appears once. Do not wrap a part in a
  code fence.
- `delivery.json` is strict JSON: double quotes, no comments, no trailing commas, nothing before or after the object.
- Use exactly the field names and the allowed values of your seat's `DELIVERY.md`. A value outside its list is a red.
- What you do not know is the string `"unknown"`. Do not leave a field out and do not use `null`.
- Write the delivery in English, in plain and neutral words. Another seat writes for the traveller, in the
  traveller's language.
- Do not explain the method, the house or the other seats in your delivery.
