# AIWriter

网页端 AI 小说写作框架：自备 OpenAI 兼容 API，流式写作 / 追问解读 / 修改正文。配置与历史仅存本机。

**使用 Cursor 制作** · v1.0.0

## 快速开始

```bash
npm install
cp .env.example .env.local   # 可选；账号功能默认关闭
npm run dev                  # http://localhost:5173
npm run build
npm run preview
```

将 `dist/` 部署到静态托管，或使用仓库根目录的 [`vercel.json`](./vercel.json) 一键部署到 Vercel。

### 部署到 Vercel

1. 将本仓库推送到 GitHub
2. 在 [Vercel](https://vercel.com) Import 该仓库（Framework Preset: Vite）
3. 无需必填环境变量即可运行；若日后启用账号，再添加：
   - `VITE_AUTH_ENABLED=true`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`（publishable / anon，切勿使用 service_role）

## 功能概览

- **写作**：左栏正文，右栏设定；可选思维链
- **追问**：解读正文（独立系统提示词，不覆盖小说）
- **修改**：按意见改写并更新正文（使用写作系统提示词）
- **下载 / 历史 / 设置**：含模型预设、高级提示词、清除本机数据
- **账号（预留）**：Supabase Auth 脚手架已接入，默认关闭

## 隐私（公开使用必读）

- **无后端**：API Key 不会发往本应用服务器；请求直连你填写的 API。
- 数据在浏览器 `localStorage`；共享电脑请用后在设置中「清除本机全部数据」。
- 详见 [`SECURITY.md`](./SECURITY.md)。

## 预设服务商

| 预设 | Base URL |
|------|----------|
| OpenAI | `https://api.openai.com/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| 通义（兼容模式） | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| SiliconFlow | `https://api.siliconflow.cn/v1` |
| 自定义 | 自行填写 |

路径：`{API URI}/chat/completions`。部分官方 API 可能因 **CORS** 无法在浏览器直连，需兼容网关。

## 提示词文件

| 用途 | 文件 |
|------|------|
| 写作 / 修改 | [`prompts/novel-writer.system.md`](./prompts/novel-writer.system.md) |
| 追问 | [`prompts/novel-ask.system.md`](./prompts/novel-ask.system.md) |

设置 → 高级设置可覆盖写作提示词（仅存本机）。

## 技术栈

Vite + React 19 + TypeScript + 原生 CSS（Apple HIG 风格，无 Bootstrap）  
可选：Supabase Auth（默认关闭）

## 文档

- [`AGENT.md`](./AGENT.md) / [`CLAUDE.md`](./CLAUDE.md) — 协作约定
- [`SECURITY.md`](./SECURITY.md) — 安全与隐私
- [`.env.example`](./.env.example) — 环境变量模板
