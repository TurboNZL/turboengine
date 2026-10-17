# Recent projects

`src/app/recent.ts`: `rememberProject(p)`, `listRecent()`, `loadRecent(key)`, `forgetRecent(key)`, plus the pure helpers `describeProject`, `newestFirst`, `ago`, `hasContent` (tested in `test/recent.test.ts`).

Optional. Source: `TurboNZL/turbocut`, where it runs. It imports `projectDuration` (core timeline) and `parseProject`/`serializeProject` (project file): adapt to the app's own project format.

## Using it
Call `rememberProject` when the person saves, opens a project, starts a new one over work, on `pagehide`, and 4 s after the last change (debounced). Show `listRecent()` on the home screen; opening one goes through the same path as opening a file (asking for the media again when the project does not carry it).

## Gotchas
- Keyed by project name (case-insensitive): two projects with the same name share one slot. That is what people expect from "the project called X"; an app with real project ids should key by id.
- An empty project is never stored. Storage can be blocked or full: every call swallows the error and the list is simply empty.
- Only the edit is stored, so a recent project needs its media found again, like a file.
