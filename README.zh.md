# dsh-nav-tidy

隐藏 **dsh Web** 左侧栏里的任意面板入口 —— 但不卸载它背后的插件。

[English](README.md)

dsh 的侧栏会把每个注册了全局面板的插件都列一行。装到十来个插件以后，这串入口就把工作区和会话列表挤到屏幕下面去了。官方侧栏只提供整列折叠（56px 图标轨道），官方「更多」菜单也明确不管理入口显隐，所以这个插件补的就是这一块：

- 侧栏底部 **更多 → 侧栏入口** 的**勾选面板**
- 一个很小的**控制台 API**（`dshNavTidy`），方便脚本化

勾掉一行，这一行就从侧栏消失。插件照常加载、面板照常能进，什么都没被卸载。

```
┌──────────────────────────────────────────────┐
│ 侧栏入口                                      │
│ 新装的插件入口默认都会显示出来；取消勾选即隐藏。  │
├──────────────────────────────────────────────┤
│ ☐ SSH                                        │
│ ☐ HyperFrames                                │
│ ☐ Remotion                                   │
│ ☐ 插件市场                                    │
│ ☑ Logcat 实机调试                             │
│ ☑ 插件                                        │
│ ☑ 无限画布                                     │
├──────────────────────────────────────────────┤
│                          全部显示   完成       │
└──────────────────────────────────────────────┘
```

## 安装

```sh
dsh plugin --profile desktop add github:AD199-gif/dsh-nav-tidy
```

profile 名按你自己的来（`dsh web` 的 profile 用 `--profile web`）。装完重启 dsh，让客户端 bundle 重新加载。

不想从源码装，也可以用预构建 tarball：

```sh
dsh plugin --profile desktop add https://github.com/AD199-gif/dsh-nav-tidy/releases/latest/download/dsh-nav-tidy.tgz
```

## 使用

## 使用

**右键直接隐藏** —— 最快的路径：在侧栏任意面板行上点右键，那一行立刻消失，底部给 4 秒**撤销**。工作区和会话行的右键菜单不受影响。

**勾选面板** —— 侧栏 → **更多** → **侧栏入口**。取消勾选即隐藏，勾回来即恢复；「全部显示」清空清单；顶部搜索框按名字过滤。所有文案跟随宿主语言。

**出厂不藏任何东西**：插件新加的入口先照常显示在左侧栏，藏不藏由你决定，插件不替你做判断。

**失效条目** —— 清单里的某个名字已经匹配不到任何行了（插件被卸载），面板会提示还有几个残留并可一键清理。

**控制台** —— 同一份数据，可脚本化：

```js
dshNavTidy.open()          // 打开勾选面板
dshNavTidy.list()          // 现在藏了哪些
dshNavTidy.hide('SSH')     // 藏掉标签含 "SSH" 的所有行
dshNavTidy.show('SSH')     // 放回来
dshNavTidy.reset()         // 回默认清单
```

匹配规则是**子串 + 大小写不敏感**：`SSH` 会连 `SSH 隧道` 一起藏；写 `插件` 会把 `插件市场` 也带走。**以后新装的插件加的入口会自动出现在面板里**，不用改代码。

清单存在 `localStorage` 的 `dsh-nav-tidy:hidden`，重启后仍生效。

## 原理

1. 面板行都是侧栏根节点里的 `<button aria-label="<入口名>">`；插件给根节点贴 `data-nav-tidy-scope`。
2. 注入一条样式表：`[data-nav-tidy-scope] button[aria-label*="X" i] { display: none !important }`。
3. `MutationObserver` 只在 React 整体替换侧栏子树时重贴标记；普通重渲染由样式表自己覆盖。

勾选面板注册在 `sidebar.panellist.actions` 这个 list slot 上（和官方「更多」菜单同一个座位），面板本身是纯 DOM 覆盖层，不依赖任何组件库。

不 patch 任何 dsh 源码，加载期不 import 任何 `@deepseek-ai/*` 包。`@deepseek-ai/dsh-client-ui-primitives` 只是**可选**引入，用来让菜单行和其它菜单项长得一样（拿不到就退化成普通按钮）；所有 DOM 操作都包在 `try/catch` 里 —— 最坏情况是丢面板，不会影响整个界面。

## 环境要求

- 带 `sidebar.panellist.actions` slot 的 dsh Web（桌面版或 `dsh web` profile）—— `@deepseek-ai/dsh-client-ui-sidebar` 0.2.2-rc.1 及随 `dsh-client-ui-entry-customization` 发布的构建都有。
- 实测环境：Windows 上的 DSH Desktop 0.2.2-rc.1。

## 已知限制

- **只管显隐**。被藏的插件仍在加载、仍占内存 —— 想省资源请去插件页禁用插件本身。整列折叠是官方能力，本插件只管单行。
- 按标签匹配。注册时没写 `aria-label` 的行藏不了；可以用 `[...document.querySelectorAll('nav button')].map(b => b.getAttribute('aria-label'))` 看某一行到底暴露了什么。
- `更多` 这一行永远不可藏 —— 它是回到面板的唯一入口。

## 开发

```sh
git clone https://github.com/AD199-gif/dsh-nav-tidy.git
cd dsh-nav-tidy
dsh plugin --profile <profile> add file:$PWD
```

`lib/index.js` 是 host 半侧（空的 `apply`，活都在浏览器里），`lib/client.js` 是浏览器 bundle。bundle 直接按 dsh 客户端模块契约写（`window.__ModuleLoader__.load({ id, factory })`），**没有构建步骤**：改完文件重启 dsh 即可。

## 许可

MIT
