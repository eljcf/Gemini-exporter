const btn = document.getElementById('exportBtn');
const status = document.getElementById('status');
const formatSelect = document.getElementById('formatSelect');

btn.addEventListener('click', () => {
    const selectedFormat = formatSelect.value;
    btn.disabled = true;
    btn.innerText = "正在启动...";
    status.innerText = "正在呼叫网页特工...";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;

        chrome.tabs.sendMessage(tabs[0].id, {
            action: "export_chat",
            format: selectedFormat
        }, (response) => {
            if (chrome.runtime.lastError) {
                status.innerText = "❌ 连接失败！请刷新网页后再试";
                status.style.color = "red";
                btn.disabled = false;
                btn.innerText = "重试";
                return;
            }
            status.innerText = "✅ 指令已发送，请看网页右下角";
            status.style.color = "green";
            setTimeout(() => window.close(), 2000);
        });
    });
});