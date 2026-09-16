
/*
    VISUALIZE AI

    The site is intentionally client-side for GitHub Pages.

    The user supplies their own API key. The key is stored only in
    sessionStorage and is never written to GitHub.

    IMPORTANT:
    Client-side API keys can be extracted by browser users.
    This is therefore a BYOK/demo architecture, not a secure
    production architecture.
*/

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const DEFAULT_SETTINGS = {
    model: "gpt-5.6-luna",
    effort: "medium",
    creativity: 50,
    visualDetail: 75,
    canvasStyle: "technical",
    grid: "dots",
    autoVisualize: true,
    showCoordinates: false,
    theme: "system",
    animation: 70,
    reducedMotion: false
};

let settings = {
    ...DEFAULT_SETTINGS
};

let apiKey = sessionStorage.getItem("visualize_ai_key") || "";

let conversations = [];
let currentConversation = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: "Untitled canvas",
    messages: []
};

let canvasState = {
    objects: [],
    grid: true,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    style: "technical"
};

let isGenerating = false;

const canvas = $("#visualCanvas");
const ctx = canvas.getContext("2d");

const canvasContainer = $("#canvasContainer");

function loadSettings() {
    try {
        const saved = localStorage.getItem("visualize_settings");

        if (saved) {
            settings = {
                ...DEFAULT_SETTINGS,
                ...JSON.parse(saved)
            };
        }
    } catch {
        settings = {...DEFAULT_SETTINGS};
    }

    applySettingsToUI();
    applyTheme();
}

function saveSettings() {
    localStorage.setItem(
        "visualize_settings",
        JSON.stringify(settings)
    );
}

function applySettingsToUI() {

    $("#modelSelect").value = settings.model;
    $("#effortSelect").value = settings.effort;

    $("#creativitySlider").value = settings.creativity;
    $("#visualDetailSlider").value = settings.visualDetail;

    $("#creativityValue").textContent = settings.creativity;
    $("#visualDetailValue").textContent = settings.visualDetail;

    $("#canvasStyleSelect").value = settings.canvasStyle;
    $("#gridSelect").value = settings.grid;

    $("#autoVisualize").checked = settings.autoVisualize;
    $("#showCoordinates").checked = settings.showCoordinates;

    $("#themeSelect").value = settings.theme;

    $("#animationSlider").value = settings.animation;
    $("#animationValue").textContent = settings.animation;

    $("#reducedMotion").checked = settings.reducedMotion;

    document.body.classList.toggle(
        "reduced-motion",
        settings.reducedMotion
    );

    canvasState.style = settings.canvasStyle;

    updateModelLabel();
}

function applyTheme() {

    let theme = settings.theme;

    if (theme === "system") {
        theme = window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches ? "dark" : "light";
    }

    document.documentElement.dataset.theme = theme;
}

function updateModelLabel() {

    const labels = {
        "gpt-5.6-luna": "GPT-5.6 Luna",
        "gpt-5.6-terra": "GPT-5.6 Terra",
        "gpt-5.6-sol": "GPT-5.6 Sol"
    };

    $("#modelLabel").textContent =
        apiKey
            ? `${labels[settings.model] || settings.model} · ${settings.effort} effort`
            : "Bring your own API key";
}

function updateConnectionUI() {

    const pill = $("#connectionPill");
    const text = $("#connectionText");

    if (apiKey) {

        pill.classList.add("connected");
        text.textContent = "AI connected";
        $("#connectButton").textContent = "Connected";

    } else {

        pill.classList.remove("connected");
        text.textContent = "Not connected";
        $("#connectButton").textContent = "Connect AI";
    }

    updateModelLabel();
}

function openModal(id) {
    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.remove("hidden");
}

function closeModal(id) {
    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.add("hidden");
}

$$("[data-close]").forEach(button => {

    button.addEventListener("click", () => {
        closeModal(button.dataset.close);
    });

});

$$(".modal-overlay").forEach(overlay => {

    overlay.addEventListener("click", event => {

        if (event.target === overlay) {
            overlay.classList.add("hidden");
        }

    });

});

$("#connectButton").addEventListener("click", () => {

    $("#apiKeyInput").value = "";

    $("#keyError").textContent = "";

    openModal("connectModal");

    setTimeout(() => {
        $("#apiKeyInput").focus();
    }, 100);

});

$("#showKeyButton").addEventListener("click", () => {

    const input = $("#apiKeyInput");

    input.type =
        input.type === "password"
            ? "text"
            : "password";

    $("#showKeyButton").textContent =
        input.type === "password"
            ? "Show"
            : "Hide";
});

$("#saveKeyButton").addEventListener("click", async () => {

    const key = $("#apiKeyInput").value.trim();

    if (!key) {

        $("#keyError").textContent =
            "Please enter an API key.";

        return;
    }

    if (!key.startsWith("sk-")) {

        $("#keyError").textContent =
            "That doesn't look like an OpenAI API key.";

        return;
    }

    $("#keyError").textContent = "Checking key...";

    try {

        /*
            We use a tiny Responses request as a connectivity test.
            The key is stored only in sessionStorage after success.
        */

        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: settings.model,
                    input: "Respond with the single word OK.",
                    max_output_tokens: 5
                })
            }
        );

        if (!response.ok) {

            let detail = "";

            try {
                const data = await response.json();
                detail = data?.error?.message || "";
            } catch {}

            throw new Error(
                detail || `API returned ${response.status}.`
            );
        }

        apiKey = key;

        sessionStorage.setItem(
            "visualize_ai_key",
            apiKey
        );

        $("#keyError").textContent = "";

        closeModal("connectModal");

        updateConnectionUI();

        addSystemMessage(
            "AI connected. Your key is available only for this browser session."
        );

    } catch (error) {

        $("#keyError").textContent =
            error.message ||
            "Could not connect to the API.";

    }

});

$("#disconnectButton").addEventListener("click", () => {

    apiKey = "";

    sessionStorage.removeItem(
        "visualize_ai_key"
    );

    updateConnectionUI();

    closeModal("connectModal");

    addSystemMessage(
        "AI disconnected. The session key has been removed."
    );

});

$("#settingsButton").addEventListener(
    "click",
    () => openModal("settingsModal")
);

$("#shortcutsButton").addEventListener(
    "click",
    () => openModal("shortcutsModal")
);

$("#resetSettings").addEventListener("click", () => {

    settings = {...DEFAULT_SETTINGS};

    saveSettings();

    applySettingsToUI();

    redraw();

});

function bindSetting(id, key, transform = value => value) {

    const element = document.getElementById(id);

    element.addEventListener("change", () => {

        settings[key] = transform(element.value);

        saveSettings();

        applySettingsToUI();

        redraw();

    });

}

bindSetting("modelSelect", "model");
bindSetting("effortSelect", "effort");
bindSetting("canvasStyleSelect", "canvasStyle");
bindSetting("gridSelect", "grid");
bindSetting("themeSelect", "theme");

$("#creativitySlider").addEventListener("input", event => {

    settings.creativity = Number(event.target.value);

    $("#creativityValue").textContent =
        settings.creativity;

    saveSettings();

});

$("#visualDetailSlider").addEventListener("input", event => {

    settings.visualDetail = Number(event.target.value);

    $("#visualDetailValue").textContent =
        settings.visualDetail;

    saveSettings();

});

$("#animationSlider").addEventListener("input", event => {

    settings.animation = Number(event.target.value);

    $("#animationValue").textContent =
        settings.animation;

    saveSettings();

});

$("#autoVisualize").addEventListener("change", event => {

    settings.autoVisualize = event.target.checked;

    saveSettings();

});

$("#showCoordinates").addEventListener("change", event => {

    settings.showCoordinates = event.target.checked;

    saveSettings();

    redraw();

});

$("#reducedMotion").addEventListener("change", event => {

    settings.reducedMotion = event.target.checked;

    saveSettings();

    applySettingsToUI();

});

$$("[data-preset]").forEach(button => {

    button.addEventListener("click", () => {

        const preset = button.dataset.preset;

        if (preset === "minimal") {

            settings = {
                ...settings,
                canvasStyle: "minimal",
                grid: "off",
                animation: 75,
                visualDetail: 60,
                theme: "light"
            };

        }

        if (preset === "engineering") {

            settings = {
                ...settings,
                canvasStyle: "technical",
                grid: "lines",
                animation: 60,
                visualDetail: 95
            };

        }

        if (preset === "focus") {

            settings = {
                ...settings,
                canvasStyle: "minimal",
                grid: "off",
                animation: 40
            };

        }

        if (preset === "studio") {

            settings = {
                ...settings,
                canvasStyle: "isometric",
                grid: "dots",
                animation: 85,
                visualDetail: 100
            };

        }

        if (preset === "developer") {

            settings = {
                ...settings,
                canvasStyle: "technical",
                grid: "lines",
                animation: 65,
                visualDetail: 90
            };

        }

        if (preset === "presentation") {

            settings = {
                ...settings,
                canvasStyle: "minimal",
                grid: "off",
                animation: 80,
                visualDetail: 85
            };

        }

        saveSettings();
        applySettingsToUI();
        redraw();

    });

});

$("#newChatBtn").addEventListener(
    "click",
    newConversation
);

function newConversation() {

    if (
        currentConversation.messages.length > 0
    ) {
        conversations.push(currentConversation);
    }

    currentConversation = {
        id: crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()),
        title: "Untitled canvas",
        messages: []
    };

    $("#messages").innerHTML = `
        <div class="welcome-message">
            <div class="welcome-symbol">✦</div>
            <h2>Visualize anything.</h2>
            <p>
                Ask questions, request diagrams,
                explain concepts or modify your canvas.
            </p>
        </div>
    `;

    canvasState.objects = [];

    $("#canvasTitle").textContent =
        "Untitled canvas";

    redraw();

    renderConversations();
}

function renderConversations() {

    const list = $("#conversationList");

    list.innerHTML = "";

    [...conversations, currentConversation]
        .slice(-12)
        .reverse()
        .forEach(conversation => {

            const button =
                document.createElement("button");

            button.className =
                "conversation" +
                (
                    conversation.id ===
                    currentConversation.id
                        ? " active"
                        : ""
                );

            button.textContent =
                conversation.title ||
                "Untitled canvas";

            button.addEventListener(
                "click",
                () => loadConversation(conversation)
            );

            list.appendChild(button);

        });

}

function loadConversation(conversation) {

    currentConversation = conversation;

    $("#messages").innerHTML = "";

    conversation.messages.forEach(message => {

        addMessage(
            message.role,
            message.content,
            false
        );

    });

    $("#canvasTitle").textContent =
        conversation.title ||
        "Untitled canvas";

    renderConversations();

}

function addMessage(role, content, animate = true) {

    const messages = $("#messages");

    const welcome =
        messages.querySelector(".welcome-message");

    if (welcome) {
        welcome.remove();
    }

    const wrapper =
        document.createElement("div");

    wrapper.className =
        `message ${role}`;

    if (!animate) {
        wrapper.style.animation = "none";
    }

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";

    bubble.textContent = content;

    wrapper.appendChild(bubble);

    messages.appendChild(wrapper);

    messages.scrollTop =
        messages.scrollHeight;

    return wrapper;

}

function addSystemMessage(text) {

    addMessage(
        "system",
        text
    );

}

function addTypingMessage() {

    const messages = $("#messages");

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message assistant";

    wrapper.id = "typingMessage";

    wrapper.innerHTML = `
        <div class="message-bubble">
            <span class="typing-dot">•</span>
            <span class="typing-dot">•</span>
            <span class="typing-dot">•</span>
        </div>
    `;

    messages.appendChild(wrapper);

    messages.scrollTop =
        messages.scrollHeight;

}

function removeTypingMessage() {

    $("#typingMessage")?.remove();

}

function buildSystemPrompt() {

    return `
You are Visualize AI, an AI assistant inside a visual canvas application.

Your job is to:
1. Answer the user's question clearly.
2. When appropriate, create or modify a visual representation.
3. Think of the canvas as an interactive 2D drawing area.
4. If the user asks for something visual, return a visual specification.

IMPORTANT:
You do not directly execute JavaScript.

When a visualization is useful, append a section exactly like:

<visual>
{
  "clear": false,
  "background": "none",
  "objects": [
    {
      "type": "circle",
      "x": 0.5,
      "y": 0.5,
      "radius": 0.12,
      "fill": "#0071e3",
      "stroke": "#005bb5",
      "label": "Example"
    }
  ]
}
</visual>

Supported object types:

circle:
{
  type, x, y, radius, fill, stroke, label
}

rect:
{
  type, x, y, width, height, fill, stroke, label, radius
}

line:
{
  type, x1, y1, x2, y2, stroke, width
}

arrow:
{
  type, x1, y1, x2, y2, stroke, width, label
}

text:
{
  type, x, y, text, size, color, align
}

Use normalized coordinates from 0 to 1.

Canvas is approximately 16:10.

For technical diagrams:
- use clean geometry
- use labels
- use arrows
- keep spacing generous
- avoid overlapping objects

For engineering diagrams:
- prioritize clarity
- use sensible proportions
- use multiple labeled components

For ordinary questions where no visual is useful, do not include <visual>.

Do not put markdown code fences around <visual>.
Do not include anything after </visual>.

Current user customization:

Effort: ${settings.effort}
Creativity: ${settings.creativity}/100
Visual detail: ${settings.visualDetail}/100
Canvas style: ${settings.canvasStyle}
Grid: ${settings.grid}

Be concise but useful.
`;
}

function extractVisual(text) {

    const match =
        text.match(
            /<visual>([\s\S]*?)<\/visual>/i
        );

    if (!match) {
        return {
            cleanText: text,
            visual: null
        };
    }

    let visual = null;

    try {

        visual = JSON.parse(
            match[1].trim()
        );

    } catch (error) {

        console.warn(
            "Visual JSON could not be parsed.",
            error
        );

    }

    const cleanText =
        text
            .replace(
                /<visual>[\s\S]*?<\/visual>/i,
                ""
            )
            .trim();

    return {
        cleanText,
        visual
    };

}

function addVisualObjects(visual) {

    if (!visual) return;

    if (visual.clear) {
        canvasState.objects = [];
    }

    if (Array.isArray(visual.objects)) {

        for (const object of visual.objects) {

            canvasState.objects.push({
                ...object,
                id:
                    crypto.randomUUID
                        ? crypto.randomUUID()
                        : Math.random().toString(36)
            });

        }

    }

    $("#canvasEmpty").classList.add("hidden");

    animateCanvas();

}

function normalizeResponseText(data) {

    if (typeof data.output_text === "string") {
        return data.output_text;
    }

    let output = "";

    if (Array.isArray(data.output)) {

        for (const item of data.output) {

            if (
                item.type === "message" &&
                Array.isArray(item.content)
            ) {

                for (const content of item.content) {

                    if (
                        content.type ===
                        "output_text"
                    ) {
                        output +=
                            content.text || "";
                    }

                }

            }

        }

    }

    return output || "I couldn't generate a response.";

}

async function askAI(userText) {

    if (!apiKey) {

        openModal("connectModal");

        $("#keyError").textContent =
            "Connect an API key first.";

        return;

    }

    if (isGenerating) return;

    isGenerating = true;

    addMessage(
        "user",
        userText
    );

    currentConversation.messages.push({
        role: "user",
        content: userText
    });

    if (
        currentConversation.title ===
        "Untitled canvas"
    ) {

        currentConversation.title =
            userText.length > 35
                ? userText.slice(0, 35) + "…"
                : userText;

        $("#canvasTitle").textContent =
            currentConversation.title;

        renderConversations();

    }

    addTypingMessage();

    showCanvasStatus(
        "Thinking"
    );

    const previousMessages =
        currentConversation.messages
            .slice(-14)
            .map(message => ({
                role: message.role,
                content: message.content
            }));

    const input = [
        {
            role: "developer",
            content: buildSystemPrompt()
        },
        ...previousMessages
    ];

    try {

        const response =
            await fetch(
                "https://api.openai.com/v1/responses",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Authorization":
                            `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: settings.model,
                        input,
                        reasoning: {
                            effort:
                                settings.effort
                        },
                        max_output_tokens:
                            4000
                    })
                }
            );

        if (!response.ok) {

            let message =
                `API error ${response.status}`;

            try {

                const data =
                    await response.json();

                if (
                    data?.error?.message
                ) {
                    message =
                        data.error.message;
                }

            } catch {}

            throw new Error(message);

        }

        const data =
            await response.json();

        const rawText =
            normalizeResponseText(data);

        const parsed =
            extractVisual(rawText);

        removeTypingMessage();

        addMessage(
            "assistant",
            parsed.cleanText || "Done."
        );

        currentConversation.messages.push({
            role: "assistant",
            content: parsed.cleanText || "Done."
        });

        if (
            parsed.visual &&
            settings.autoVisualize
        ) {

            showCanvasStatus(
                "Drawing"
            );

            addVisualObjects(
                parsed.visual
            );

            setTimeout(
                () => hideCanvasStatus(),
                settings.reducedMotion
                    ? 0
                    : 500
            );

        } else {

            hideCanvasStatus();

        }

        saveConversationState();

    } catch (error) {

        removeTypingMessage();

        addMessage(
            "system",
            `Something went wrong: ${error.message}`
        );

        hideCanvasStatus();

    } finally {

        isGenerating = false;

    }

}

function saveConversationState() {

    try {

        localStorage.setItem(
            "visualize_conversations",
            JSON.stringify(
                conversations
            )
        );

    } catch {}

}

function autoResizeTextarea() {

    const input =
        $("#messageInput");

    input.style.height = "auto";

    input.style.height =
        Math.min(
            input.scrollHeight,
            140
        ) + "px";

}

$("#messageInput").addEventListener(
    "input",
    autoResizeTextarea
);

$("#messageInput").addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendCurrentMessage();

        }

    }
);

$("#sendButton").addEventListener(
    "click",
    sendCurrentMessage
);

function sendCurrentMessage() {

    const input =
        $("#messageInput");

    const text =
        input.value.trim();

    if (!text || isGenerating)
        return;

    input.value = "";

    autoResizeTextarea();

    askAI(text);

}

$$("[data-prompt]").forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const prompt =
                button.dataset.prompt;

            $("#messageInput").value =
                prompt;

            autoResizeTextarea();

            $("#messageInput").focus();

        }
    );

});

$("#clearCanvas").addEventListener(
    "click",
    () => {

        canvasState.objects = [];

        $("#canvasEmpty")
            .classList.remove("hidden");

        redraw();

    }
);

$("#themeButton").addEventListener(
    "click",
    () => {

        settings.theme =
            settings.theme === "dark"
                ? "light"
                : "dark";

        saveSettings();

        applySettingsToUI();

    }
);

$("#gridButton").addEventListener(
    "click",
    () => {

        const order = [
            "off",
            "dots",
            "lines",
            "isometric"
        ];

        const index =
            order.indexOf(settings.grid);

        settings.grid =
            order[
                (index + 1) %
                order.length
            ];

        saveSettings();

        applySettingsToUI();

        redraw();

    }
);

$("#fitButton").addEventListener(
    "click",
    () => {

        canvasState.zoom = 1;
        canvasState.offsetX = 0;
        canvasState.offsetY = 0;

        updateZoomLabel();

        redraw();

    }
);

$$(".tool-button[data-tool]").forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                $$(".tool-button[data-tool]")
                    .forEach(
                        b => b.classList.remove("active")
                    );

                button.classList.add("active");

            }
        );

    }
);

$$(".tool-button[data-tool='zoom-in']").forEach(button => {
    button.addEventListener("click", () => {
        canvasState.zoom = Math.min(4, canvasState.zoom * 1.2);
        updateZoomLabel();
        redraw();
    });
});

$$(".tool-button[data-tool='zoom-out']").forEach(button => {
    button.addEventListener("click", () => {
        canvasState.zoom = Math.max(0.25, canvasState.zoom / 1.2);
        updateZoomLabel();
        redraw();
    });
});

$("#downloadCanvas").addEventListener(
    "click",
    () => {

        const link =
            document.createElement("a");

        link.download =
            "visualize-ai-canvas.png";

        link.href =
            canvas.toDataURL(
                "image/png"
            );

        link.click();

    }
);

function showCanvasStatus(text) {

    $("#canvasStatusText").textContent =
        text;

    $("#canvasStatus")
        .classList.add("visible");

}

function hideCanvasStatus() {

    $("#canvasStatus")
        .classList.remove("visible");

}

function resizeCanvas() {

    const rect =
        canvasContainer.getBoundingClientRect();

    const ratio =
        window.devicePixelRatio || 1;

    canvas.width =
        Math.max(
            1,
            Math.floor(
                rect.width * ratio
            )
        );

    canvas.height =
        Math.max(
            1,
            Math.floor(
                rect.height * ratio
            )
        );

    canvas.style.width =
        rect.width + "px";

    canvas.style.height =
        rect.height + "px";

    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );

    redraw();

}

function canvasSize() {

    return {
        width:
            canvas.clientWidth,
        height:
            canvas.clientHeight
    };

}

function drawGrid() {

    if (settings.grid === "off")
        return;

    const {
        width,
        height
    } = canvasSize();

    ctx.save();

    const spacing =
        settings.grid === "lines"
            ? 32
            : 26;

    const dark =
        document.documentElement.dataset.theme ===
        "dark";

    ctx.globalAlpha =
        dark ? .07 : .055;

    ctx.strokeStyle =
        dark ? "#ffffff" : "#000000";

    ctx.fillStyle =
        dark ? "#ffffff" : "#000000";

    if (
        settings.grid === "dots"
    ) {

        for (
            let x = 0;
            x < width;
            x += spacing
        ) {

            for (
                let y = 0;
                y < height;
                y += spacing
            ) {

                ctx.beginPath();

                ctx.arc(
                    x,
                    y,
                    .8,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

            }

        }

    } else if (
        settings.grid === "lines"
    ) {

        ctx.lineWidth = 1;

        for (
            let x = 0;
            x < width;
            x += spacing
        ) {

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

        }

        for (
            let y = 0;
            y < height;
            y += spacing
        ) {

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

        }

    } else if (
        settings.grid === "isometric"
    ) {

        ctx.lineWidth = 1;

        const size = 34;

        for (
            let x = -height;
            x < width + height;
            x += size
        ) {

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(
                x + height,
                height
            );
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x, height);
            ctx.lineTo(
                x + height,
                0
            );
            ctx.stroke();

        }

    }

    ctx.restore();

}

function worldX(normalized) {

    return normalized *
        canvas.clientWidth;

}

function worldY(normalized) {

    return normalized *
        canvas.clientHeight;

}

function drawArrow(
    x1,
    y1,
    x2,
    y2,
    color,
    width = 2
) {

    ctx.save();

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle =
        Math.atan2(
            y2 - y1,
            x2 - x1
        );

    const head = 8;

    ctx.beginPath();

    ctx.moveTo(x2, y2);

    ctx.lineTo(
        x2 -
            head *
            Math.cos(angle - Math.PI / 6),
        y2 -
            head *
            Math.sin(angle - Math.PI / 6)
    );

    ctx.lineTo(
        x2 -
            head *
            Math.cos(angle + Math.PI / 6),
        y2 -
            head *
            Math.sin(angle + Math.PI / 6)
    );

    ctx.closePath();

    ctx.fill();

    ctx.restore();

}

function drawObject(object) {

    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    const fill =
        object.fill ||
        "rgba(0,113,227,.12)";

    const stroke =
        object.stroke ||
        getComputedStyle(
            document.documentElement
        ).getPropertyValue(
            "--text"
        );

    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (
        object.type === "circle"
    ) {

        const x =
            worldX(object.x);

        const y =
            worldY(object.y);

        const radius =
            object.radius *
            Math.min(
                width,
                height
            );

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = fill;
        ctx.fill();

        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (object.label) {

            drawCenteredLabel(
                object.label,
                x,
                y
            );

        }

    }

    else if (
        object.type === "rect"
    ) {

        const x =
            worldX(object.x);

        const y =
            worldY(object.y);

        const w =
            object.width *
            width;

        const h =
            object.height *
            height;

        const radius =
            object.radius ??
            8;

        roundRect(
            ctx,
            x,
            y,
            w,
            h,
            radius
        );

        ctx.fillStyle = fill;
        ctx.fill();

        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (object.label) {

            drawCenteredLabel(
                object.label,
                x + w / 2,
                y + h / 2
            );

        }

    }

    else if (
        object.type === "line"
    ) {

        ctx.strokeStyle =
            object.stroke ||
            "#0071e3";

        ctx.lineWidth =
            object.width ||
            2;

        ctx.beginPath();

        ctx.moveTo(
            worldX(object.x1),
            worldY(object.y1)
        );

        ctx.lineTo(
            worldX(object.x2),
            worldY(object.y2)
        );

        ctx.stroke();

    }

    else if (
        object.type === "arrow"
    ) {

        drawArrow(
            worldX(object.x1),
            worldY(object.y1),
            worldX(object.x2),
            worldY(object.y2),
            object.stroke ||
                "#0071e3",
            object.width ||
                2
        );

        if (object.label) {

            const x =
                (
                    worldX(object.x1) +
                    worldX(object.x2)
                ) / 2;

            const y =
                (
                    worldY(object.y1) +
                    worldY(object.y2)
                ) / 2;

            drawCenteredLabel(
                object.label,
                x,
                y - 8
            );

        }

    }

    else if (
        object.type === "text"
    ) {

        const x =
            worldX(object.x);

        const y =
            worldY(object.y);

        ctx.fillStyle =
            object.color ||
            getComputedStyle(
                document.documentElement
            ).getPropertyValue(
                "--text"
            );

        ctx.font =
            `${object.size || 14}px -apple-system, BlinkMacSystemFont, sans-serif`;

        ctx.textAlign =
            object.align || "center";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            object.text || "",
            x,
            y
        );

    }

    ctx.restore();

}

function drawCenteredLabel(
    text,
    x,
    y
) {

    ctx.save();

    ctx.font =
        "600 11px -apple-system, BlinkMacSystemFont, sans-serif";

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";

    ctx.fillStyle =
        getComputedStyle(
            document.documentElement
        ).getPropertyValue(
            "--text"
        );

    ctx.fillText(
        text,
        x,
        y
    );

    ctx.restore();

}

function roundRect(
    context,
    x,
    y,
    width,
    height,
    radius
) {

    radius =
        Math.min(
            radius,
            width / 2,
            height / 2
        );

    context.beginPath();

    context.moveTo(
        x + radius,
        y
    );

    context.arcTo(
        x + width,
        y,
        x + width,
        y + height,
        radius
    );

    context.arcTo(
        x + width,
        y + height,
        x,
        y + height,
        radius
    );

    context.arcTo(
        x,
        y + height,
        x,
        y,
        radius
    );

    context.arcTo(
        x,
        y,
        x + width,
        y,
        radius
    );

    context.closePath();

}

function redraw() {

    const {
        width,
        height
    } = canvasSize();

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    drawGrid();

    for (
        const object
        of canvasState.objects
    ) {

        drawObject(object);

    }

    if (
        settings.showCoordinates
    ) {

        ctx.save();

        ctx.fillStyle =
            getComputedStyle(
                document.documentElement
            ).getPropertyValue(
                "--muted"
            );

        ctx.font =
            "9px monospace";

        ctx.fillText(
            "0,0",
            10,
            16
        );

        ctx.fillText(
            `${width} × ${height}`,
            10,
            height - 10
        );

        ctx.restore();

    }

}

function animateCanvas() {

    if (
        settings.reducedMotion
    ) {

        redraw();
        return;

    }

    const duration =
        Math.max(
            180,
            800 -
                settings.animation *
                4
        );

    const start =
        performance.now();

    function frame(now) {

        const progress =
            Math.min(
                1,
                (now - start) /
                duration
            );

        const eased =
            1 -
            Math.pow(
                1 - progress,
                3
            );

        ctx.save();

        ctx.globalAlpha =
            eased;

        redraw();

        ctx.restore();

        if (progress < 1) {

            requestAnimationFrame(
                frame
            );

        }

    }

    requestAnimationFrame(frame);

}

function updateZoomLabel() {

    $("#zoomLabel").textContent =
        Math.round(
            canvasState.zoom * 100
        ) + "%";

}

$("#mobileMenu").addEventListener(
    "click",
    () => {

        $("#sidebar")
            .classList.toggle("open");

    }
);

window.addEventListener(
    "resize",
    resizeCanvas
);

window.addEventListener(
    "keydown",
    event => {

        if (
            (event.ctrlKey ||
                event.metaKey) &&
            event.key.toLowerCase() === "n"
        ) {

            event.preventDefault();

            newConversation();

        }

        if (
            (event.ctrlKey ||
                event.metaKey) &&
            event.key === ","
        ) {

            event.preventDefault();

            openModal(
                "settingsModal"
            );

        }

        if (
            (event.ctrlKey ||
                event.metaKey) &&
            event.key.toLowerCase() === "b"
        ) {

            event.preventDefault();

            $("#sidebar")
                .classList.toggle("open");

        }

    }
);

try {

    const saved =
        localStorage.getItem(
            "visualize_conversations"
        );

    if (saved) {

        conversations =
            JSON.parse(saved);

    }

} catch {

    conversations = [];

}

loadSettings();
updateConnectionUI();
renderConversations();

setTimeout(
    resizeCanvas,
    50
);
