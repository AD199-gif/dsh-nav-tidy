/**
 * dsh-nav-tidy — node 半侧。
 *
 * 这个插件只在浏览器里干活（隐藏左侧栏选中的全局面板入口），host 侧不需要任何服务，
 * 所以 apply 是空实现：Loader 只要能把这一行装上，`dsh.client` 声明就会把
 * lib/client.js 作为浏览器 bundle 交给 Web GUI。
 */
export const name = 'nav-tidy'

export const inject = []

export function apply() {
  // no host-side behaviour
}
