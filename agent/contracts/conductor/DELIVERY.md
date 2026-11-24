# The delivery of the conductor

`delivery.json`, one object with exactly these fields. A field that is not here is a red.

| Field | What it is |
|---|---|
| `seat` | Always `"conductor"` |
| `decision` | `retry_with_hint` or `stop_and_tell` |
| `hint` | With `retry_with_hint`, what the seat should do differently, in English, one line, 400 characters at most. With `stop_and_tell`, `""` |
| `kind` | What kind of stop this is: `seat_kept_failing`, `seat_did_not_finish`, `not_possible_yet` or `nothing_found` |
| `options` | What the traveller can do, one or more of `allowed_options` of `in/stop.json`, each once |
| `message` | One or two sentences for the traveller, in their `language`, 500 characters at most, or `""` (RC5) |
| `why` | Why you chose this, in English, for the people who run the house, 600 characters at most |

The meaning of each `kind`:

- `seat_kept_failing`: a step did not pass its checks, even after its passes.
- `seat_did_not_finish`: a step did not finish its work.
- `not_possible_yet`: what was asked is a kind of trip the house does not plan yet.
- `nothing_found`: there was nothing to work with for what was asked.

The meaning of each option:

- `retry`: start the research again, as it is.
- `change_request`: change something of what was asked, and start again.
- `continue_without`: go on without that part. Only when `allowed_options` has it.

The examples in this file are invented. They show the form only.

`{ "seat": "conductor", "decision": "retry_with_hint", "hint": "Every seen note names its file with its extension,
as in [in/sheet.json] (common method, step 3).", "kind": "seat_kept_failing", "options": ["retry"], "message": "",
"why": "The same red of form came back twice: a source without its extension. The fix is clear." }`

`{ "seat": "conductor", "decision": "stop_and_tell", "hint": "", "kind": "nothing_found", "options":
["change_request"], "message": "No encontré con qué hacer esta parte del viaje. Puedes cambiar algo de lo que
pediste y volver a empezar.", "why": "The reds say there was nothing to choose from: no pass can fix it." }`
