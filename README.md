# dsh-nav-tidy

Hide any panel entry in the **dsh Web** left sidebar — without disabling the plugin behind it.

[中文说明](README.zh.md)

The dsh sidebar lists every installed plugin that registers a global panel. Ten entries in, the list starts pushing the workspace and session browser down the screen. The official sidebar only offers a whole-column collapse (56px rail), and the official More menu explicitly does not manage entry visibility, so `dsh-nav-tidy` adds exactly that:

- A **checkbox panel** at the bottom of the sidebar — **More → 侧栏入口…**
- A tiny **console API** (`dshNavTidy`) for scripted use

Ticking a row off hides the row. The plugin itself keeps loading and its panel stays reachable; nothing is uninstalled.

```
┌──────────────────────────────────────────────┐
│ 侧栏入口                                      │
│ 新装的插件入口默认都会显示出来；取消勾选即隐藏。  │
├──────────────────────────────────────────────┤
│ ☑ SSH                                        │
│ ☑ HyperFrames                                │
│ ☑ Remotion                                   │
│ ☑ 插件市场                                    │
│ ☐ Logcat 实机调试                             │
│ ☑ 插件                                        │
│ ☑ 无限画布                                     │
├──────────────────────────────────────────────┤
│                          全部显示   完成       │
└──────────────────────────────────────────────┘
```

## Install

```sh
dsh plugin --profile desktop add github:AD199-gif/dsh-nav-tidy
```

Use your own profile name in place of `desktop` (`dsh plugin --profile web add …` for a `dsh web` profile). Then restart dsh so the client bundle is picked up.

Prebuilt tarball, if you prefer not to build from source:

```sh
dsh plugin --profile desktop add https://github.com/AD199-gif/dsh-nav-tidy/releases/latest/download/dsh-nav-tidy.tgz
```

## Use

**Checkbox panel** — sidebar → **More** → **侧栏入口**. Untick a row to hide it, tick it back to restore; “全部显示” clears the list.

**Nothing is hidden out of the box.** An entry a plugin adds shows up in the sidebar first — hiding it is your call, not the plugin's.

**Console** — the same store, scriptable:

```js
dshNavTidy.open()          // open the checkbox panel
dshNavTidy.list()          // currently hidden entries
dshNavTidy.hide('SSH')     // hide every row whose label contains "SSH"
dshNavTidy.show('SSH')     // restore them
dshNavTidy.reset()         // back to the default list
```

Matching is **substring, case-insensitive**: `SSH` also hides a row labelled `SSH tunnel`, and `插件` would also swallow `插件市场`. Rows added by plugins you install later appear in the panel automatically — no code change needed.

Defaults are persisted under the `dsh-nav-tidy:hidden` key in `localStorage`, so they survive restarts.

## How it works

1. The panel rows are `<button aria-label="<entry name>">` inside the sidebar root. The plugin tags that root with `data-nav-tidy-scope`.
2. It injects one stylesheet: `[data-nav-tidy-scope] button[aria-label*="X" i] { display: none !important }`.
3. A `MutationObserver` re-applies the root tag if React replaces the sidebar subtree; a stylesheet means ordinary re-renders need no work.

The checkbox panel is registered into the `sidebar.panellist.actions` list slot — the same seat the official More menu uses — and renders as a plain DOM overlay, so it does not depend on any component library.

No dsh source is patched, no `@deepseek-ai/*` package is imported at load time. `@deepseek-ai/dsh-client-ui-primitives` is required *optionally* for the menu row (it falls back to a plain button if unavailable), and every DOM hook is wrapped in `try/catch`: a failure can cost you the panel, not the UI.

## Requirements

- dsh Web (desktop app or `dsh web` profile) with the `sidebar.panellist.actions` slot — present in `@deepseek-ai/dsh-client-ui-sidebar` 0.2.2-rc.1 and the builds that ship `dsh-client-ui-entry-customization`.
- Tested against DSH Desktop 0.2.2-rc.1 on Windows.

## Limitations

- **Visual only.** Hidden plugins still load and still consume memory — hide a row here, and disable the plugin itself if you want the resources back. The plugin collapses the sidebar column natively; this one manages individual rows.
- Matching is label-based. A row registered without `aria-label` cannot be targeted; check `[...document.querySelectorAll('nav button')].map(b => b.getAttribute('aria-label'))` to see what a row actually exposes.
- The `More` row itself is never hideable — it is the way back into the panel.

## Development

```sh
git clone https://github.com/AD199-gif/dsh-nav-tidy.git
cd dsh-nav-tidy
# install into a scratch profile as a local dependency
dsh plugin --profile <profile> add file:$PWD
```

`lib/index.js` is the host half (an empty `apply` — all work is in the browser), `lib/client.js` is the browser bundle. The bundle is written directly against the dsh client module contract (`window.__ModuleLoader__.load({ id, factory })`), so there is no build step: edit the file and restart dsh.

## License

MIT
