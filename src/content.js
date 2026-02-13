
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

    all.forEach(({ role, node }) => {
        let text = node.innerText.trim();
        if (!text || text === "Show thinking") return;
        text = text.replace(/|/g, '');

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
    updateStatus("🚀 正在启动全量回溯...");
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
            const prompt = `系统提示：以下内容是用户与 Gemini 的过往对话历史。请读取此上下文，并恢复之前的对话记忆，准备回答用户的新问题。不要对历史内容进行总结，只需确认“已读取上下文”。`;
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