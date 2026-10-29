# link-monitor 链接状态监控

部署在 Cloudflare Workers 上的链接存活监控：Web 界面添加链接，每 5 分钟自动检查一次，显示状态码 / 标题 / 耗时 / 跳转。

## 部署步骤

```bash
cd link-monitor
npm install -g wrangler   # 没装过 wrangler 才需要
wrangler login            # 浏览器里登录 Cloudflare 账号

# 1. 创建 KV 命名空间（存链接列表和检查结果）
wrangler kv:namespace create STORE
# 把输出的 id 填进 wrangler.toml 里 REPLACE_WITH_KV_NAMESPACE_ID 的位置

# 2. 部署
npm install
wrangler deploy
```

部署成功后会得到一个地址，形如 `https://link-monitor.<你的账号>.workers.dev`，打开就是 Web 界面。

## 用法

- 在页面顶部输入名称（可选）和链接，点「添加」——添加后会立刻检查一次。
- 表格显示：状态（正常/异常/待检查）、HTTP 状态码、页面标题或失败原因、耗时、上次检查时间。
- 「立即检查全部」手动触发一轮检查；cron 每 5 分钟自动跑一轮（可在 `wrangler.toml` 的 `[triggers]` 里改频率）。
- 每行可删除。

## 说明

- 检查走的是 Worker 的 HTTP 请求（跟随跳转、20 秒超时），**不经过 LightPanda**：
  Worker 里直连 CDP 脆弱，而且 Instacloud 机器 30 分钟闲置会暂停，定时检查会大面积报失败。
  需要 JS 渲染才能判定的页面，继续用 `../lightpanda_test/check-links.mjs` 在本地深查。
- 免费额度足够：KV 每天 10 万次读 / 1000 次写，cron 每 5 分钟一轮，几十个链接完全没压力。
- 公开地址谁都能打开添加链接；如果介意，可以在 Worker 里加一层简单的访问密码（需要的话我帮你加）。
