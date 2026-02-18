
let isExporting = false;

// 1. 消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "export_chat") {
        if (isExporting) {
            sendResponse({ status: "busy" });
            return;
        }
        sendResponse({ status: "started" });
        startExportProcess(request.format);
    }
    return true;
});

// 2. 悬浮 UI 系统 
function getOrCreatePanel() {
    let div = document.getElementById('gem-panel');
    if (!div) {
        div = document.createElement('div');
        div.id = 'gem-panel';
        div.style.cssText = `
            position: fixed; bottom: 30px; right: 30px; width: 320px;
            background: white; border-radius: 12px; z-index: 2147483647; 
            box-shadow: 0 10px 40px rgba(0,0,0,0.3); border: 1px solid #ddd;
            overflow: hidden; display: flex; flex-direction: column; font-family: sans-serif;
        `;
        document.body.appendChild(div);
    }
    return div;
}

function updateStatus(text, type = "normal") {
    const div = getOrCreatePanel();
    const color = type === 'error' ? '#d93025' : (type === 'success' ? '#188038' : '#333');
    div.innerHTML = '';

    // 标题栏与关闭按钮 
    const header = document.createElement('div');
    header.style.cssText = "padding: 15px 15px 10px; display: flex; justify-content: space-between; border-bottom: 1px solid #eee;";
    header.innerHTML = "<strong>📥 导出助手</strong>";

    const closeBtn = document.createElement('span');
    closeBtn.innerText = "✖";
    closeBtn.style.cssText = "cursor: pointer; color: #999; font-size: 16px;";
    closeBtn.onclick = () => { div.remove(); isExporting = false; };
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.style.cssText = `padding: 15px; color: ${color}; line-height: 1.5;`;
    body.innerHTML = text;

    const actionArea = document.createElement('div');
    actionArea.id = "gem-actions";
    actionArea.style.cssText = "padding: 0 15px 15px;";

    div.appendChild(header);
    div.appendChild(body);
    div.appendChild(actionArea);
    return actionArea;
}

// 3. 智能回溯 
async function scrollUp() {
    const candidates = document.querySelectorAll('div, main, infinite-scroller');
    let scroller = document.documentElement;
    let maxScroll = 0;
    candidates.forEach(el => {
        if (el.scrollHeight > el.clientHeight && el.scrollHeight > maxScroll) {
            maxScroll = el.scrollHeight; scroller = el;
        }
    });

    let loop = 0, lastH = scroller.scrollHeight, noChange = 0;
    while (loop < 100) {
        scroller.scrollTop = 0;
        await new Promise(r => setTimeout(r, 2200));
        let currH = scroller.scrollHeight;
        if (currH === lastH) {
            if (++noChange >= 2) break;
        } else {
            noChange = 0; lastH = currH;
            updateStatus(`📚 正在全量回溯历史... (第 ${++loop} 页)`);
        }
    }
    scroller.scrollTop = scroller.scrollHeight;
}

// 4. 数据解析与格式化

function getChatData() {
    const userNodes = Array.from(document.querySelectorAll('.user-query-container'));
    const modelNodes = Array.from(document.querySelectorAll('.model-response-container, .markdown, [data-test-id="model-response-text"]'));

    const all = [
        ...userNodes.map(n => ({ role: 'User', node: n })),
        ...modelNodes.map(n => ({ role: 'Gemini', node: n }))
    ];

    all.sort((a, b) => (a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1);

    const history = [];
    const seen = new Set();

    // 定义噪音词集合
    const NOISE_WORDS = ["you said", "您说", "edit", "编辑"];

    all.forEach(({ role, node }) => {
        let rawText = "";

        // 针对 User 消息，优先深入子层级抓取，如果还多抓了，靠后面的行过滤解决
        if (role === 'User') {
            const queryTextEl = node.querySelector('.query-text');
            rawText = queryTextEl ? queryTextEl.innerText : node.innerText;
        } else {
            rawText = node.innerText;
        }

        // --- 核心修复：行过滤逻辑 ---
        let lines = rawText.split('\n');
        let cleanLines = lines.filter(line => {
            const trimmedLine = line.trim().toLowerCase();
            // 过滤掉：空行、纯噪音词行、以及包含噪音词且长度很短的行
            if (!trimmedLine) return false;
            if (NOISE_WORDS.includes(trimmedLine)) return false;
            return true;
        });

        let text = cleanLines.join('\n').trim();


        if (!text || text === "Show thinking" || text === "正在思考") return;

  
        text = text.replace(/显示草稿|Show drafts|Regenerate|重新生成/g, '').trim();

        const fingerprint = role + text.substring(0, 30) + text.length;
        if (seen.has(fingerprint)) return;
        seen.add(fingerprint);

        history.push({ role, content: text });
    });

    return history;
}
// 5. 主流程
async function startExportProcess(format) {
    isExporting = true;
    updateStatus(" 正在启动全量回溯...");
    try {
        await scrollUp();
        updateStatus("⚡ 正在处理数据并转换格式...");

        const chatHistory = getChatData();
        if (chatHistory.length === 0) throw new Error("未找到有效对话内容");

        let blobContent, fileExt;
        if (format === 'json') {
            blobContent = JSON.stringify({
                title: document.title,
                export_time: new Date().toISOString(),
                chat_history: chatHistory
            }, null, 2);
            fileExt = "json";
        } else {
            blobContent = `# Gemini 对话存档\n\n> 导出时间：${new Date().toLocaleString()}\n\n---\n\n`;
            chatHistory.forEach(item => {
                const icon = item.role === 'User' ? "🙋" : "🤖";
                blobContent += `### ${icon} **${item.role}**\n\n${item.content}\n\n---\n\n`;
            });
            fileExt = "md";
        }

        const url = URL.createObjectURL(new Blob([blobContent], { type: format === 'json' ? 'application/json' : 'text/markdown' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `Gemini_Chat_${Date.now()}.${fileExt}`;
        document.body.appendChild(a);
        a.click();

        updateStatus(`🎉 导出 ${format.toUpperCase()} 成功！<br>点击下方按钮复制启动 Prompt。`, "success");
        const actions = document.getElementById('gem-actions');
        const copyBtn = document.createElement('button');
        copyBtn.innerText = "📋 复制启动 Prompt";
        copyBtn.style.cssText = "width: 100%; padding: 10px; background: #1a73e8; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;";
        copyBtn.onclick = () => {
            const prompt = `<role_definition>
你是搭载了**外部记忆库* 的智能助手。
我上传了一份结构化文档，请将其作为本次会话的**核心上下文扩展**。
</role_definition>

<memory_protocol>
**构建记忆索引**:
1. 不要试图逐字逐句复述全文，这很低效。
2. 请快速扫描文档，在你的上下文窗口中构建一个**虚拟索引 **。
3. 重点提取以下元数据：
   - **关键实体**：核心概念、项目名称、特定术语。
   - **逻辑关系**：各章节/模块之间的层级与关联。
   - **时间/流程**：如果是对话或日志，标记关键的时间节点和转折点。
目标是：当你需要信息时，能通过索引快速定位到原文的具体片段。
</memory_protocol>

<retrieval_hierarchy>
**混合检索机制 **:
在回答我的后续问题时，请严格遵循以下**优先级路径**:

1.  **第一优先级：上下文检索**
    * 首先查询你构建的<虚拟索引>。
    * 如果用户问题涉及文件中的定义、设定或历史记录，**直接引用**文件内容作为事实依据。

2.  **第二优先级：知识补全**
    * 如果文件内容未提及,或信息不完整,**则调用你的预训练知识**进行推理、解释或补充。
    * 注意：外部知识仅用于**辅助解释**或**填补空白**，不得篡改文件内已明确定义的设定。
</retrieval_hierarchy>

<initialization>
请读取文件，建立索引，并仅回复以下内容表示准备就绪：
"外部记忆索引已构建。"
</initialization>`;
            navigator.clipboard.writeText(prompt).then(() => {
                copyBtn.innerText = "✅ 已复制成功！"; copyBtn.style.background = "#188038";
                setTimeout(() => { copyBtn.innerText = "📋 复制启动 Prompt"; copyBtn.style.background = "#1a73e8"; }, 2000);
            });
        };
        actions.appendChild(copyBtn);
    } catch (e) {
        updateStatus(`❌ 出错: ${e.message}`, "error");
        isExporting = false;
    }
}