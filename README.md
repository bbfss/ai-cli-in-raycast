# AI CLI in Raycast

<p align="center">
  <img src="extensions/ask-codex-raycast/assets/chat-icon.png" alt="AI CLI in Raycast" width="160" height="160">
</p>

在 Raycast 中使用本机 AI CLI。一个扩展，六家独立聊天入口，各自保存会话、草稿和模型选择。

Native Raycast chats for your local AI CLIs, with independent commands, settings, and sessions.

[下载 v0.1.0-beta.1](https://github.com/bbfss/ai-cli-in-raycast/releases/download/v0.1.0-beta.1/ai-cli-in-raycast-v0.1.0-beta.1.zip) · [发布说明](https://github.com/bbfss/ai-cli-in-raycast/releases/tag/v0.1.0-beta.1) · [全部版本](https://github.com/bbfss/ai-cli-in-raycast/releases) · [详细说明](extensions/ask-codex-raycast/README.md)

## 六家 CLI，八个命令

| 命令                        | 用途                               |
| --------------------------- | ---------------------------------- |
| **AI CLI in Raycast**       | 统一启动器，搜索并打开六家 CLI     |
| **Codex in Raycast**        | 使用本机 Codex CLI                 |
| **Antigravity in Raycast**  | 使用本机 Antigravity CLI（`agy`）  |
| **Qoder in Raycast**        | 使用国际版 Qoder CLI               |
| **Qoder CN in Raycast**     | 使用国内版 Qoder CLI               |
| **WorkBuddy in Raycast**    | 使用已安装的 WorkBuddy CLI         |
| **Gemini in Raycast**       | 使用 Google Gemini CLI             |
| **CLI 设置 / CLI Settings** | 检测安装、打开聊天、设置模型默认值 |

在 **Raycast Settings → Extensions → AI CLI in Raycast** 中，通过各命令的 **Enabled** 开关决定显示哪些入口。

## 聊天与设置

- **完整 Markdown 对话**：全宽显示正文、代码块、列表和公式，各家 AI 使用对应标志。最新一轮问答在前，问题位于回答上方。
- **右下角输入浮层**：按 Enter 打开输入，输入后按 Enter 发送，聊天正文保持可见。模型与思考强度分别选择。
- **独立会话与草稿**：各 CLI 分开保存记录，通过明确的会话 ID 恢复；切换 CLI 前保存草稿，不转交当前对话。
- **停止与继续**：可停止正在生成的回复，再在同一会话继续。Codex 还支持在回复过程中追加指令。
- **模型默认策略**：每家分别选择“沿用上次选择”或“固定模型与强度”。固定值用于打开 CLI 或新建聊天，聊天中的临时切换不会修改固定值。
- **自动检测 CLI**：支持标准安装路径与已支持的本机安装方式，也可手动填写路径。手动路径优先；关闭自动检测后需明确指定路径。

CLI Settings 先显示六家命令入口，偏好设置入口在后。每家第一动作打开聊天，第二动作配置模型与强度默认值。模型选项来自当前 CLI；只有明确公布支持档位的模型才提供强度选择。

## 安装

这是通过源码加载的测试版，尚未在 Raycast Store 上架。

准备好 Raycast、Node.js **22.22.2 或更新版本**和 npm，并安装、登录你要使用的 CLI。扩展使用各 CLI 自己的登录状态，不代为安装或登录。

### 从 GitHub Releases 下载

1. 下载 [ai-cli-in-raycast-v0.1.0-beta.1.zip](https://github.com/bbfss/ai-cli-in-raycast/releases/download/v0.1.0-beta.1/ai-cli-in-raycast-v0.1.0-beta.1.zip) 并解压。
2. 进入解压后的 `ai-cli-in-raycast` 文件夹，其中直接包含 `package.json`、`src` 和 `assets`。如果下载的是发布页自动生成的整仓 **Source code (zip)**，则需进入其中的 `extensions/ask-codex-raycast`。
3. 在该目录打开终端，运行：

   ```sh
   npm ci
   npm run dev
   ```

4. 在 Raycast 中搜索 **AI CLI in Raycast** 或某一家独立命令，按首次设置选择模型。

后续测试版见 [GitHub Releases](https://github.com/bbfss/ai-cli-in-raycast/releases)。

### 克隆仓库

```sh
git clone https://github.com/bbfss/ai-cli-in-raycast.git
cd ai-cli-in-raycast/extensions/ask-codex-raycast
npm ci
npm run dev
```

## 界面语言

默认 **跟随系统**，也可在扩展偏好设置中手动选择 **English、简体中文、繁體中文**。

- **Windows**：使用系统区域语言。
- **macOS**：优先使用“系统设置 → 通用 → 语言与地区 → 应用程序”中为 Raycast 指定的语言；未单独指定时使用系统首选语言。
- 中文按简体、繁体对应显示，其他语言使用英文。手动选择优先于系统设置。

修改系统或 macOS 应用语言后，退出并重新打开 Raycast；修改扩展语言后重新打开命令。原生扩展设置页使用静态中英双语文案。语言选项只影响扩展界面，保留模型 ID、CLI 原始诊断、用户消息和 AI 回复。

## 当前验证与限制

当前版本通过构建、TypeScript、lint 和 **301 项自动化测试**，并在 **Windows 的 Raycast 2.8.2** 中验证了原生界面、Markdown、输入浮层、模型选择与语言显示。macOS 的语言处理已有自动化覆盖，**本轮尚未进行 Mac 真机验收**。

| CLI              | 本机验证情况                                                              |
| ---------------- | ------------------------------------------------------------------------- |
| **Codex**        | 已有实际对话、恢复、取消与继续的验证记录                                  |
| **Antigravity**  | 已有实际对话、恢复、取消与继续的验证记录                                  |
| **Qoder CN**     | 已有实际对话、恢复、取消与继续的验证记录                                  |
| **Qoder 国际版** | 已提供独立入口与适配，本机尚未验证                                        |
| **WorkBuddy**    | 已验证安装检测与模型目录；本机仍需完成其 CLI 登录，实际对话与恢复尚未验证 |
| **Gemini CLI**   | 已验证启动；本机账号返回 `UNSUPPORTED_CLIENT`，实际对话与恢复尚未验证     |

自动检测的“已找到”表示安装路径可用；模型目录也不等于账号已有调用权限。各 CLI 的账号、额度、工作区信任和权限行为由其自身决定。

输入浮层使用 Raycast 原生组件，当前不是常驻多行编辑器，不承诺 Shift+Enter 换行。重开草稿通过“发送草稿”动作保留全文；需要继续编辑时可复制草稿后粘贴回输入。更完整的行为与兼容性说明见[扩展文档](extensions/ask-codex-raycast/README.md)及[验证记录](extensions/ask-codex-raycast/HANDOFF.md)。

## 项目与品牌

这是社区项目，并非 Raycast 与各家 AI 厂商的官方联合产品。各品牌名称和标志属于其权利人，图标来源见 [BRANDING.md](extensions/ask-codex-raycast/BRANDING.md)。

仓库基于 [Raycast Extensions](https://github.com/raycast/extensions) 的 fork，保留原 monorepo 目录；本项目代码位于 `extensions/ask-codex-raycast`。为延续现有本地数据，内部扩展 ID 仍为 `ask-codex-raycast`，Codex 命令 ID 仍为 `index`。许可证见 [LICENSE](LICENSE)。
