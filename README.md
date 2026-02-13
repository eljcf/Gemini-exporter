
# Gemini-exporter 

**Gemini-exporter** 是一款专为 Google Gemini 导出聊天记录的插件。

它解决了 Gemini 网页端“懒加载”导致的历史记录无法完整保存的问题，支持一键将**超长对话**无损导出为 Markdown/JSON文件，并提供**“记忆恢复”**功能，助你在新对话中快速找回上下文。

---

## ✨ 核心功能 (Features)

* **全量历史回溯 (Auto-Scroll Backtrace)**
突破网页懒加载限制，插件自动识别滚动容器并向上回溯，直到加载完第一条消息，确保几百轮的长对话也能完整导出。
* **智能提取与去重**
* **精准分角**：完美区分 User 和 Gemini 的对话内容。
* **指纹去重**：采用“角色+文本指纹”算法 (`Role` + `Text Snippet` + `Length`)，彻底解决因 DOM 嵌套导致的对话重复问题。
* **文本清洗**：自动过滤 "Show thinking"、"Regenerate" 等系统干扰词，生成纯净文档。


* **标准 Markdown/JSON 格式**
导出文件排版清晰，包含时间戳和分隔符，完美兼容 **Notion**、**Obsidian** 等笔记软件。
* **上下文记忆恢复 (Context Restoration)**
导出成功后，悬浮窗会自动提供 **`复制启动 Prompt`** 按钮。在新对话中粘贴该 Prompt 并上传导出的 Markdown 文件，即可让 Gemini 瞬间“读档”，延续之前的思维脉络。

---

## 📥 安装教程 (Installation)

### 方法一：通过 Chrome 应用商店安装 (待发布)

> 🚧 目前插件正在审核中，审核通过后将在此处提供商店下载链接。

### 方法二：本地安装 (开发者模式) - 推荐

如果你想立即使用或进行二次开发，请按照以下步骤操作：

#### 1. 下载源码

Clone 本项目到本地：

```bash
git clone https://github.com/eljcf/Gemini-exporter.git

```

或者直接下载 ZIP 压缩包并解压到一个文件夹中。

#### 2. 打开扩展程序管理页

* 在 Chrome 浏览器地址栏输入 `chrome://extensions/` 并回车。
* 在页面右上角，开启 **"开发者模式" (Developer mode)** 开关。

#### 3. 加载插件

* 点击左上角的 **"加载已解压的扩展程序" (Load unpacked)** 按钮。
* 选择src文件夹即可
#### 4. 完成

浏览器工具栏出现插件图标，安装成功！🎉

---

## 📖 使用指南 (Usage)

1. **打开页面**：访问 [Google Gemini](https://gemini.google.com/) 并进入任意一个对话页面。
2. **启动导出**：点击浏览器右上角的 **Gemini-Exporter** 插件图标，点击`导出完整对话`。
3. **等待回溯**：
* 页面右下角会出现悬浮面板，显示进度（如：“📚 正在加载历史... (第 X 页)”）。
* 插件会自动控制页面向上滚动，**请勿关闭当前标签页**。


4. **下载与恢复**：
* 回溯完成后，浏览器会自动下载生成的 `.md` 文件。
* 悬浮窗会出现绿色的 **`📋 复制启动 Prompt`** 按钮，点击即可复制系统提示词，用于在新对话中恢复记忆。



---

## 🛠 技术架构 (Tech Stack)

* **Manifest V3**: 符合 Chrome 最新安全标准的扩展架构。
* **Native DOM API**: 使用原生 `MutationObserver` 和 `querySelector` 进行高性能 DOM 操作，无需第三方库依赖。
* **Smart Scroller**: 自研的 `findScrollContainer` 算法，能自动适配 Google 网页结构的更新，精准定位滚动条。

---

## 🔒 隐私声明 (Privacy)

* **本地运行**：所有数据提取、处理和文件生成均在您的浏览器**本地内存**中完成。
* **零数据上传**：本插件**绝不**会将您的对话内容、Cookies 或任何个人信息上传到任何服务器。
* **权限克制**：仅申请了必要的 `activeTab` 权限，只有在您点击图标时才会运行脚本。

---

## 📄 开源协议 (License)

本项目遵循 [MIT License](https://www.google.com/search?q=LICENSE) 开源协议。