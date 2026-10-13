import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import "./zombiehaus_deck_studio.js";
import "./zombiehaus_image_tray.js";

/**
 * Zombiehaus Settings Extension
 * Integrates Zombiehaus configuration directly into ComfyUI's native Settings panel,
 * provides a persistent menu button, and ensures reliable bootstrapping across frontend versions.
 */

// ── Default System Prompt Instructions ─────────────────────────────────────────
const DEFAULT_SYS_PROMPT_EXPRESSIONS = "You are an optical camera director. Convert the user's concept into raw photographic parameters. Describe only: 1) Camera model and focal length, 2) Lighting source, color, and angle, 3) Real-world physical textures and imperfections (skin pores, fabric weave, dust, lens distortion), 4) Subject pose. Do NOT use poetic words, adjectives like 'masterpiece' or 'stunning', and keep the response under 60 words.";

const DEFAULT_SYS_PROMPT_TAGS = "You are an optical camera director for tag-based diffusion models. Convert the user's concept strictly into concise, comma-separated photographic tags. Include only tags for: 1) Camera model and focal length (e.g., 35mm photo, 85mm portrait), 2) Lighting source, color, and angle (e.g., rim lighting, softbox, warm backlight), 3) Real-world physical textures and optical imperfections (e.g., skin pores, fabric texture, lens distortion, subtle grain), 4) Subject pose and framing. Output ONLY a comma-separated list of tags. Do NOT write full sentences, explanations, or buzzwords like 'masterpiece' or 'stunning', and keep under 40 tags.";

// ── Shared / Fallback Zombiehaus Settings Dialog ───────────────────────────────
function openZombiehausSettingsDialog() {
    if (typeof window.zombiehausShowSettings === "function" && window.zombiehausShowSettings !== openZombiehausSettingsDialog) {
        window.zombiehausShowSettings();
        return;
    }

    const existing = document.getElementById("zombiehaus-settings-modal") || document.getElementById("zombiehaus-settings-modal");
    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "zombiehaus-settings-modal";
    overlay.className = "zombiehaus-modal-overlay";
    overlay.style.cssText = "position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10006; backdrop-filter: blur(5px);";

    const dialog = document.createElement("div");
    dialog.style.cssText = "background: #181825; border: 1px solid #45475a; border-radius: 12px; padding: 22px; width: 620px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 24px 60px rgba(0,0,0,0.8); color: #cdd6f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow-y: auto;";

    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #313244; padding-bottom: 10px;";
    header.innerHTML = '<h3 style="margin: 0; font-size: 16px; color: #89b4fa; display: flex; align-items: center; gap: 8px;">⚙️ <span>Zombiehaus Studio &amp; AI Settings</span></h3>';

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "background: none; border: none; color: #6c7086; font-size: 18px; cursor: pointer; padding: 2px 6px; border-radius: 4px;";
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    const body = document.createElement("div");
    body.style.cssText = "display: flex; flex-direction: column; gap: 14px;";

    const mkSection = (title) => {
        const sec = document.createElement("div");
        sec.style.cssText = "font-size: 11px; font-weight: 700; color: #89b4fa; text-transform: uppercase; letter-spacing: 0.6px; border-bottom: 1px solid #313244; padding-bottom: 4px; margin-top: 4px;";
        sec.textContent = title;
        body.appendChild(sec);
    };

    const mkField = (label, el, hint = "") => {
        const row = document.createElement("div");
        row.style.cssText = "display: flex; flex-direction: column; gap: 4px;";
        const lbl = document.createElement("label");
        lbl.style.cssText = "font-size: 12px; font-weight: 600; color: #cdd6f4;";
        lbl.textContent = label;
        row.appendChild(lbl);
        row.appendChild(el);
        if (hint) {
            const h = document.createElement("div");
            h.style.cssText = "font-size: 11px; color: #6c7086; line-height: 1.3;";
            h.textContent = hint;
            row.appendChild(h);
        }
        body.appendChild(row);
        return el;
    };

    const mkInput = (val, placeholder = "", type = "text") => {
        const input = document.createElement("input");
        input.type = type;
        input.value = val || "";
        input.placeholder = placeholder;
        input.style.cssText = "background: #11111b; border: 1px solid #313244; border-radius: 6px; padding: 7px 10px; color: #cdd6f4; font-size: 12px; outline: none;";
        input.onfocus = () => { input.style.borderColor = "#89b4fa"; };
        input.onblur = () => { input.style.borderColor = "#313244"; };
        return input;
    };

    (async () => {
        let cfg = {
            ollama_url: "http://127.0.0.1:11434",
            ollama_model: "",
            ollama_timeout: 120,
            cloud_api_url: "https://openrouter.ai/api/v1",
            cloud_api_key: "",
            cloud_model: "deepseek/deepseek-chat",
            civitai_api_key: "",
            prompts_save_directory: "",
            prompt_style: "Tags (SDXL / Pony)",
            syntax_theme: "Zombiehaus Neon (Default)",
            ollama_sys_prompt_expressions: DEFAULT_SYS_PROMPT_EXPRESSIONS,
            ollama_sys_prompt_tags: DEFAULT_SYS_PROMPT_TAGS
        };
        try {
            const resp = await fetch("/zombiehaus/get_config");
            if (resp.ok) {
                const data = await resp.json();
                if (data.success && data.data) {
                    cfg = Object.assign(cfg, data.data);
                }
            }
        } catch (_) {}

        const sm = app.ui?.settings || app.settings || app.extensionManager?.setting;
        const readSm = (id) => {
            try { return sm?.getSettingValue?.(id); } catch (_) { return undefined; }
        };

        if (!cfg.ollama_sys_prompt_expressions || !cfg.ollama_sys_prompt_expressions.trim()) {
            cfg.ollama_sys_prompt_expressions = readSm("Zombiehaus.OllamaSysPromptExpressions") || DEFAULT_SYS_PROMPT_EXPRESSIONS;
        }
        if (!cfg.ollama_sys_prompt_tags || !cfg.ollama_sys_prompt_tags.trim()) {
            cfg.ollama_sys_prompt_tags = readSm("Zombiehaus.OllamaSysPromptTags") || DEFAULT_SYS_PROMPT_TAGS;
        }
        if (!cfg.civitai_api_key && readSm("Zombiehaus.CivitaiKey")) {
            cfg.civitai_api_key = readSm("Zombiehaus.CivitaiKey");
        }
        if (!cfg.prompts_save_directory && readSm("Zombiehaus.PromptsSaveDirectory")) {
            cfg.prompts_save_directory = readSm("Zombiehaus.PromptsSaveDirectory");
        }

        if (typeof localStorage !== "undefined") {
            if (!cfg.ollama_model && localStorage.getItem("zombiehaus_ollama_model")) {
                cfg.ollama_model = localStorage.getItem("zombiehaus_ollama_model");
            }
            if (localStorage.getItem("zombiehaus_default_prompt_style")) {
                cfg.prompt_style = localStorage.getItem("zombiehaus_default_prompt_style");
            }
            if (localStorage.getItem("zombiehaus_syntax_theme")) {
                cfg.syntax_theme = localStorage.getItem("zombiehaus_syntax_theme");
            }
        }

        mkSection("1. Local Ollama AI LLM");
        const ollamaUrlInput = mkField("Local Ollama Server URL", mkInput(cfg.ollama_url, "http://127.0.0.1:11434"), "Endpoint for local Ollama instance (default: http://127.0.0.1:11434)");

        // Dynamic model dropdown
        const modelSelect = document.createElement("select");
        modelSelect.style.cssText = "background: #11111b; border: 1px solid #313244; border-radius: 6px; padding: 7px 10px; color: #a6e3a1; font-size: 12px; font-weight: 600; outline: none;";
        const defaultModelOpt = document.createElement("option");
        defaultModelOpt.value = cfg.ollama_model || "";
        defaultModelOpt.textContent = cfg.ollama_model ? `Active: ${cfg.ollama_model}` : "-- Discovering models... --";
        modelSelect.appendChild(defaultModelOpt);

        fetch("/zombiehaus/ollama_status")
            .then(r => r.json())
            .then(data => {
                if (data && data.success && Array.isArray(data.models) && data.models.length > 0) {
                    modelSelect.innerHTML = "";
                    const chosen = cfg.ollama_model || data.models[0];
                    data.models.forEach(m => {
                        const opt = document.createElement("option");
                        opt.value = m;
                        opt.textContent = m;
                        if (m === chosen) opt.selected = true;
                        modelSelect.appendChild(opt);
                    });
                } else if (!cfg.ollama_model) {
                    defaultModelOpt.textContent = "-- No models detected (Ollama offline) --";
                }
            })
            .catch(() => {});

        const mkTextarea = (val, placeholder = "", rows = 4) => {
            const ta = document.createElement("textarea");
            ta.rows = rows;
            ta.value = val || "";
            ta.placeholder = placeholder;
            ta.style.cssText = "background: #11111b; border: 1px solid #313244; border-radius: 6px; padding: 7px 10px; color: #cdd6f4; font-size: 11px; font-family: monospace; outline: none; resize: vertical; min-height: 60px; line-height: 1.4;";
            ta.onfocus = () => { ta.style.borderColor = "#89b4fa"; };
            ta.onblur = () => { ta.style.borderColor = "#313244"; };
            return ta;
        };

        mkField("Default Ollama Enhancement Model", modelSelect, "Model used for one-click prompt enhancement and selection refinement.");
        const timeoutInput = mkField("Ollama Timeout (seconds)", mkInput(cfg.ollama_timeout || 120, "120", "number"), "Timeout before canceling long LLM completions.");
        const sysPromptExprInput = mkField("Expressions System Prompt (Flux / SD3 / Midjourney)", mkTextarea(cfg.ollama_sys_prompt_expressions, "Leave blank to use default natural language enricher prompt..."), "Custom system instructions sent to Ollama when enhancing in Expressions style.");
        const sysPromptTagsInput = mkField("Tags System Prompt (SDXL / Pony / Anime)", mkTextarea(cfg.ollama_sys_prompt_tags, "Leave blank to use default visual tags enricher prompt..."), "Custom system instructions sent to Ollama when enhancing in Tags style.");

        mkSection("2. Cloud LLMs (OpenAI, OpenRouter, Groq, DeepSeek)");
        const cloudUrlInput = mkField("Cloud API Base URL", mkInput(cfg.cloud_api_url, "https://openrouter.ai/api/v1"), "OpenAI-compatible chat completions endpoint");
        const cloudKeyInput = mkField("Cloud API Key", mkInput(cfg.cloud_api_key, "sk-...", "password"), "API key for OpenRouter or OpenAI cloud models");
        const cloudModelInput = mkField("Default Cloud Model", mkInput(cfg.cloud_model, "deepseek/deepseek-chat"), "e.g. deepseek/deepseek-chat, anthropic/claude-3.5-sonnet, openai/gpt-4o-mini");

        mkSection("3. Prompt Studio Defaults & Storage");
        const civitaiKeyInput = mkField("Civitai API Key", mkInput(cfg.civitai_api_key, "API Key"), "Used for high-resolution LoRA cards and metadata previews");
        const saveDirInput = mkField("Prompts Directory Override", mkInput(cfg.prompts_save_directory, "Leave blank for default: BASE_DIR/saved_prompts"), "Custom storage folder for prompt presets");

        const styleSelect = document.createElement("select");
        styleSelect.style.cssText = "background: #11111b; border: 1px solid #313244; border-radius: 6px; padding: 7px 10px; color: #89b4fa; font-size: 12px; font-weight: 600; outline: none;";
        ["Tags (SDXL / Pony)", "Expressions (Flux / SD3)"].forEach(s => {
            const opt = document.createElement("option");
            opt.value = s;
            opt.textContent = s;
            if (s === (cfg.prompt_style || "Tags (SDXL / Pony)")) opt.selected = true;
            styleSelect.appendChild(opt);
        });
        mkField("Default Prompt Style", styleSelect, "Global prompt philosophy for newly created nodes and AI enhancements.");

        const footer = document.createElement("div");
        footer.style.cssText = "display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #313244; padding-top: 12px; margin-top: 8px;";

        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.style.cssText = "background: #1e1e2e; border: 1px solid #313244; border-radius: 6px; padding: 7px 14px; color: #a6adc8; font-size: 12px; cursor: pointer;";
        cancelBtn.onclick = () => overlay.remove();

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "💾 Save & Apply Settings";
        saveBtn.style.cssText = "background: #89b4fa; border: none; border-radius: 6px; padding: 7px 16px; color: #11111b; font-size: 12px; font-weight: 700; cursor: pointer;";

        saveBtn.onclick = async () => {
            saveBtn.textContent = "⏳ Saving...";
            saveBtn.disabled = true;

            const payload = {
                ollama_url: (ollamaUrlInput.value || "").trim().replace(/\/+$/, ""),
                ollama_model: (modelSelect.value || "").trim(),
                ollama_timeout: parseInt(timeoutInput.value, 10) || 120,
                ollama_sys_prompt_expressions: (sysPromptExprInput.value || "").trim(),
                ollama_sys_prompt_tags: (sysPromptTagsInput.value || "").trim(),
                cloud_api_url: (cloudUrlInput.value || "").trim().replace(/\/+$/, ""),
                cloud_api_key: (cloudKeyInput.value || "").trim(),
                cloud_model: (cloudModelInput.value || "").trim(),
                civitai_api_key: (civitaiKeyInput.value || "").trim(),
                prompts_save_directory: (saveDirInput.value || "").trim(),
                prompt_style: styleSelect.value
            };

            if (payload.ollama_model && typeof localStorage !== "undefined") {
                try {
                    localStorage.setItem("zombiehaus_ollama_model", payload.ollama_model);
                    localStorage.setItem("zombiehaus_ollama_model", payload.ollama_model);
                } catch (_) {}
                app.ui?.settings?.setSettingValue?.("Zombiehaus.OllamaEnhanceModel", payload.ollama_model);
                app.ui?.settings?.setSettingValue?.("Zombiehaus.OllamaEnhanceModel", payload.ollama_model);
            }
            if (payload.prompt_style && typeof localStorage !== "undefined") {
                try {
                    localStorage.setItem("zombiehaus_default_prompt_style", payload.prompt_style);
                    localStorage.setItem("zombiehaus_default_prompt_style", payload.prompt_style);
                } catch (_) {}
                app.ui?.settings?.setSettingValue?.("Zombiehaus.DefaultPromptStyle", payload.prompt_style);
                app.ui?.settings?.setSettingValue?.("Zombiehaus.DefaultPromptStyle", payload.prompt_style);
            }
            if (payload.ollama_sys_prompt_expressions !== undefined) {
                app.ui?.settings?.setSettingValue?.("Zombiehaus.OllamaSysPromptExpressions", payload.ollama_sys_prompt_expressions);
                app.ui?.settings?.setSettingValue?.("Zombiehaus.OllamaSysPromptExpressions", payload.ollama_sys_prompt_expressions);
            }
            if (payload.ollama_sys_prompt_tags !== undefined) {
                app.ui?.settings?.setSettingValue?.("Zombiehaus.OllamaSysPromptTags", payload.ollama_sys_prompt_tags);
                app.ui?.settings?.setSettingValue?.("Zombiehaus.OllamaSysPromptTags", payload.ollama_sys_prompt_tags);
            }

            try {
                const resp = await fetch("/zombiehaus/save_config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const res = await resp.json();
                if (res.success) {
                    overlay.remove();
                } else {
                    alert("Failed to save settings: " + res.message);
                }
            } catch (err) {
                alert("Save error: " + err.message);
            } finally {
                saveBtn.textContent = "💾 Save & Apply Settings";
                saveBtn.disabled = false;
            }
        };

        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);

        dialog.appendChild(body);
        dialog.appendChild(footer);
    })();

    overlay.appendChild(dialog);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
}

if (!window.zombiehausShowSettings) {
    window.zombiehausShowSettings = openZombiehausSettingsDialog;
}

// ── Persistent ComfyUI Menu Button ───────────────────────────────────────────
function attachComfyMenuButton() {
    if (document.getElementById("zombiehaus-sidebar-btn") || document.getElementById("zombiehaus-sidebar-btn")) return;
    const comfyMenu = document.querySelector(".comfy-menu") ||
        document.querySelector("#comfy-menu") ||
        document.querySelector(".comfyui-menu") ||
        document.querySelector(".side-bar-button-selected")?.parentElement ||
        document.querySelector(".comfyui-action-bar");

    if (comfyMenu) {
        const btn = document.createElement("button");
        btn.id = "zombiehaus-sidebar-btn";
        btn.type = "button";
        btn.textContent = "⚙️ Zombiehaus";
        btn.title = "Open Zombiehaus Studio & AI Configuration";
        btn.className = "comfy-btn";
        btn.style.cssText = "font-weight: 600; color: #89b4fa; border: 1px solid rgba(137, 180, 250, 0.4); margin: 2px 4px; padding: 4px 8px; border-radius: 4px; background: rgba(30, 30, 46, 0.8); cursor: pointer;";
        btn.onclick = (e) => {
            e.preventDefault();
            openZombiehausSettingsDialog();
        };
        comfyMenu.appendChild(btn);
    }
}

// ── Debounced Server Config Saver ─────────────────────────────────────────────
let saveTimeout = null;
const pendingChanges = {};

const commitChanges = async () => {
    const payload = Object.assign({}, pendingChanges);
    for (const k of Object.keys(pendingChanges)) {
        delete pendingChanges[k];
    }
    try {
        await api.fetchApi("/zombiehaus/save_config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error("[Zombiehaus Settings] Failed to save config to server:", err);
    }
};

const queueSave = (key, val) => {
    pendingChanges[key] = val;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(commitChanges, 400);
};

let cachedOllamaModels = [];
let cachedOllamaOnline = false;

const refreshOllamaStatusBackground = async () => {
    try {
        const resp = await api.fetchApi("/zombiehaus/ollama_status");
        if (resp.ok) {
            const data = await resp.json();
            if (data.success && data.available && Array.isArray(data.models)) {
                cachedOllamaModels = data.models;
                cachedOllamaOnline = true;
                return data;
            }
        }
    } catch (_) {}
    cachedOllamaOnline = false;
    return { available: false, models: [] };
};

// ── Shared Settings Definitions for ComfyUI ───────────────────────────────────
function buildZombiehausSettingsList(serverConfig = {}) {
    return [
        {
            id: "Zombiehaus.OpenStudioSettings",
            category: ["Zombiehaus", "Studio & AI"],
            name: "Zombiehaus: Dedicated Configuration Dialog",
            type: () => {
                const wrap = document.createElement("div");
                wrap.style.cssText = "display: flex; align-items: center; gap: 10px;";
                const btn = document.createElement("button");
                btn.type = "button";
                btn.textContent = "⚙️ Open Zombiehaus Settings Dialog";
                btn.style.cssText = "background: #1e1e2e; color: #89b4fa; border: 1px solid #89b4fa; border-radius: 6px; padding: 7px 14px; cursor: pointer; font-size: 12px; font-weight: 700; transition: all 0.2s ease;";
                btn.onmouseenter = () => { btn.style.background = "#89b4fa"; btn.style.color = "#11111b"; };
                btn.onmouseleave = () => { btn.style.background = "#1e1e2e"; btn.style.color = "#89b4fa"; };
                btn.onclick = () => openZombiehausSettingsDialog();
                wrap.appendChild(btn);
                return wrap;
            },
            defaultValue: null,
            tooltip: "Click to open the comprehensive floating Zombiehaus configuration window",
            sortOrder: 100
        },
        {
            id: "Zombiehaus.OllamaURL",
            category: ["Zombiehaus", "Local Ollama"],
            name: "Zombiehaus: Local Ollama URL",
            type: "text",
            defaultValue: serverConfig.ollama_url || "http://127.0.0.1:11434",
            tooltip: "Endpoint for local Ollama instance (default: http://127.0.0.1:11434)",
            sortOrder: 50,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    const clean = newVal.trim().replace(/(\d+\.\d+\.\d+\.\d+)\.(?=:|\/|$)/, "$1");
                    queueSave("ollama_url", clean);
                    refreshOllamaStatusBackground();
                }
            }
        },
        {
            id: "Zombiehaus.OllamaEnhanceModel",
            category: ["Zombiehaus", "Local Ollama"],
            name: "Zombiehaus: Text Editor Ollama Model",
            type: "combo",
            defaultValue: serverConfig.ollama_model || (typeof localStorage !== "undefined" && (localStorage.getItem("zombiehaus_ollama_model"))) || "s1gnature/deepseek-r1-uncensored:8b",
            options: (val) => {
                const opts = [];
                if (serverConfig.ollama_model) opts.push(serverConfig.ollama_model);
                if (typeof localStorage !== "undefined") {
                    const saved = localStorage.getItem("zombiehaus_ollama_model");
                    if (saved) opts.push(saved);
                }
                if (cachedOllamaModels.length > 0) opts.push(...cachedOllamaModels);
                if (val) opts.push(val);
                opts.push("dolphin-mistral:latest", "llama3.2", "s1gnature/deepseek-r1-uncensored:8b");
                const uniq = [...new Set(opts.filter(Boolean))];
                return uniq.length ? uniq : ["--no models found--"];
            },
            tooltip: "Dropdown of local Ollama models for Text Editor one-click AI prompt enhancement",
            sortOrder: 46,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal && newVal !== "--no models found--") {
                    try {
                        localStorage.setItem("zombiehaus_ollama_model", newVal);
                        localStorage.setItem("zombiehaus_ollama_model", newVal);
                    } catch (_) {}
                    queueSave("ollama_model", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.OllamaTimeout",
            category: ["Zombiehaus", "Local Ollama"],
            name: "Zombiehaus: Ollama Timeout (seconds)",
            type: "number",
            defaultValue: serverConfig.ollama_timeout || 120,
            tooltip: "Timeout in seconds for Ollama requests (default: 120)",
            sortOrder: 40,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    queueSave("ollama_timeout", Number(newVal) || 120);
                }
            }
        },
        {
            id: "Zombiehaus.DefaultPromptStyle",
            category: ["Zombiehaus", "Studio & AI"],
            name: "Zombiehaus: Default Prompt Style",
            type: "combo",
            defaultValue: serverConfig.prompt_style || "Expressions (Flux / SD3)",
            options: ["Tags (SDXL / Pony)", "Expressions (Flux / SD3)"],
            tooltip: "Default prompt philosophy (Expressions vs Tags)",
            sortOrder: 90,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    try {
                        localStorage.setItem("zombiehaus_default_prompt_style", newVal);
                        localStorage.setItem("zombiehaus_default_prompt_style", newVal);
                    } catch (_) {}
                    queueSave("prompt_style", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.OllamaSysPromptExpressions",
            category: ["Zombiehaus", "Local Ollama"],
            name: "Zombiehaus: System Prompt (Expressions / Flux)",
            type: "text",
            defaultValue: serverConfig.ollama_sys_prompt_expressions || DEFAULT_SYS_PROMPT_EXPRESSIONS,
            tooltip: "Custom system instructions for Ollama when enhancing prompts in Expressions style (leave blank for default)",
            sortOrder: 38,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    queueSave("ollama_sys_prompt_expressions", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.OllamaSysPromptTags",
            category: ["Zombiehaus", "Local Ollama"],
            name: "Zombiehaus: System Prompt (Tags / SDXL / Pony)",
            type: "text",
            defaultValue: serverConfig.ollama_sys_prompt_tags || DEFAULT_SYS_PROMPT_TAGS,
            tooltip: "Custom system instructions for Ollama when enhancing prompts in Tags style (leave blank for default)",
            sortOrder: 37,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    queueSave("ollama_sys_prompt_tags", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.OllamaCloudURL",
            category: ["Zombiehaus", "Ollama Cloud"],
            name: "Zombiehaus: Ollama Cloud URL",
            type: "text",
            defaultValue: serverConfig.ollama_cloud_url || "",
            tooltip: "Endpoint for remote/cloud Ollama server (e.g. https://ollama.yourdomain.com)",
            sortOrder: 35,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    queueSave("ollama_cloud_url", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.OllamaCloudKey",
            category: ["Zombiehaus", "Ollama Cloud"],
            name: "Zombiehaus: Ollama Cloud API Key / Token",
            type: "text",
            defaultValue: serverConfig.ollama_cloud_api_key || "",
            tooltip: "Bearer token or API key for remote/cloud Ollama instance",
            sortOrder: 34,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    queueSave("ollama_cloud_api_key", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.CloudAPIURL",
            category: ["Zombiehaus", "Cloud LLMs"],
            name: "Zombiehaus: Cloud LLM Base URL",
            type: "text",
            defaultValue: serverConfig.cloud_api_url || "https://openrouter.ai/api/v1",
            tooltip: "OpenAI-compatible chat completions base URL (default: https://openrouter.ai/api/v1)",
            sortOrder: 30,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    queueSave("cloud_api_url", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.CloudAPIKey",
            category: ["Zombiehaus", "Cloud LLMs"],
            name: "Zombiehaus: Cloud LLM API Key",
            type: "text",
            defaultValue: serverConfig.cloud_api_key || "",
            tooltip: "API key for OpenAI, OpenRouter, Groq, or DeepSeek cloud models",
            sortOrder: 29,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    queueSave("cloud_api_key", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.CloudModel",
            category: ["Zombiehaus", "Cloud LLMs"],
            name: "Zombiehaus: Default Cloud Model",
            type: "text",
            defaultValue: serverConfig.cloud_model || "deepseek/deepseek-chat",
            tooltip: "Default cloud model ID (e.g. deepseek/deepseek-chat, openai/gpt-4o-mini)",
            sortOrder: 28,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    queueSave("cloud_model", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.CivitaiKey",
            category: ["Zombiehaus", "Civitai"],
            name: "Zombiehaus: Civitai API Key",
            type: "text",
            defaultValue: serverConfig.civitai_api_key || "",
            tooltip: "API key for fetching Civitai LoRA preview images and metadata",
            sortOrder: 20,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    queueSave("civitai_api_key", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.PromptsSaveDirectory",
            category: ["Zombiehaus", "Storage"],
            name: "Zombiehaus: Prompts Directory Override",
            type: "text",
            defaultValue: serverConfig.prompts_save_directory || "",
            tooltip: "Custom directory to save prompt JSON files. Leave empty for default: BASE_DIR/saved_prompts",
            sortOrder: 10,
            onChange: (newVal, oldVal) => {
                if (newVal !== undefined && oldVal !== undefined && newVal !== oldVal) {
                    queueSave("prompts_save_directory", newVal);
                }
            }
        },
        {
            id: "Zombiehaus.EnableImageTray",
            category: ["Zombiehaus", "Workspaces"],
            name: "Zombiehaus: Enable Bottom Image Tray",
            type: "boolean",
            defaultValue: true,
            tooltip: "Enable or disable the dockable bottom Image Tray filmstrip and quick preview dock (Alt+T / F10)",
            sortOrder: 50,
            onChange: (newVal) => {
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem("zombiehaus_image_tray_enabled", newVal ? "true" : "false");
                }
                if (window.zombiehausImageTray) {
                    window.zombiehausImageTray.setEnabled(!!newVal);
                }
            }
        },
        {
            id: "Zombiehaus.ImageTrayBottomOffset",
            category: ["Zombiehaus", "Workspaces"],
            name: "Zombiehaus: Image Tray Bottom Spacing (px)",
            type: "slider",
            attrs: {
                min: 0,
                max: 150,
                step: 1
            },
            defaultValue: 0,
            tooltip: "Bottom dock spacing for Image Tray. Set to 0 for automatic detection of ComfyUI's bottom menu bar, or specify custom pixel height.",
            sortOrder: 51,
            onChange: (newVal) => {
                const val = parseInt(newVal, 10) || 0;
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem("zombiehaus_image_tray_bottom_offset", val > 0 ? String(val) : "auto");
                }
                if (window.zombiehausImageTray) {
                    window.zombiehausImageTray.updateBottomOffset();
                }
            }
        }
    ];
}

// ── Extension Registration ───────────────────────────────────────────────────
app.registerExtension({
    name: "zombiehaus.Settings",

    // Export settings definitions directly so ComfyUI modern Vue frontend picks them up
    settings: buildZombiehausSettingsList(),

    init(app) {
        // Register synchronously during init for maximum compatibility across ComfyUI versions
        try {
            const list = buildZombiehausSettingsList();
            for (const s of list) {
                app.ui?.settings?.addSetting(s);
            }
        } catch (_) {}
    },

    async setup() {
        attachComfyMenuButton();
        setTimeout(attachComfyMenuButton, 1000);
        setTimeout(attachComfyMenuButton, 3000);

        // Fallback floating button if menu bar is hidden or customized
        setTimeout(() => {
            if (!document.getElementById("zombiehaus-sidebar-btn") && !document.getElementById("zombiehaus-floating-btn") && !document.getElementById("zombiehaus-sidebar-btn") && !document.getElementById("zombiehaus-floating-btn")) {
                const floatBtn = document.createElement("button");
                floatBtn.id = "zombiehaus-floating-btn";
                floatBtn.type = "button";
                floatBtn.textContent = "⚙️ Zombiehaus";
                floatBtn.title = "Open Zombiehaus Studio & AI Configuration";
                floatBtn.style.cssText = "position: fixed; bottom: 18px; left: 18px; z-index: 9999; background: #181825; color: #89b4fa; border: 1px solid #45475a; border-radius: 8px; padding: 7px 12px; font-weight: 700; font-size: 12px; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.6);";
                floatBtn.onclick = (e) => {
                    e.preventDefault();
                    openZombiehausSettingsDialog();
                };
                document.body.appendChild(floatBtn);
            }
        }, 3500);

        // Fetch backend config in background
        let serverConfig = {};
        try {
            const resp = await api.fetchApi("/zombiehaus/get_config");
            if (resp.ok) {
                const res = await resp.json();
                if (res.success && res.data) {
                    serverConfig = res.data;
                }
            }
        } catch (_) {}

        if (!serverConfig.ollama_sys_prompt_expressions) {
            serverConfig.ollama_sys_prompt_expressions = DEFAULT_SYS_PROMPT_EXPRESSIONS;
        }
        if (!serverConfig.ollama_sys_prompt_tags) {
            serverConfig.ollama_sys_prompt_tags = DEFAULT_SYS_PROMPT_TAGS;
        }

        refreshOllamaStatusBackground();

        const getSettingsManager = () => {
            return app.ui?.settings || app.settings || app.extensionManager?.setting;
        };

        const syncConfigToSettings = (cfg) => {
            const sm = getSettingsManager();
            if (!sm || typeof sm.setSettingValue !== "function") return;
            const setIfPresent = (id, val) => {
                if (val !== undefined && val !== null && val !== "") {
                    try {
                        sm.setSettingValue(id, val);
                    } catch (_) {}
                    const legacyId = id.replace("Zombiehaus.", "Zombiehaus.");
                    if (legacyId !== id) {
                        try { sm.setSettingValue(legacyId, val); } catch (_) {}
                    }
                }
            };

            setIfPresent("Zombiehaus.OllamaURL", cfg.ollama_url);
            setIfPresent("Zombiehaus.OllamaEnhanceModel", cfg.ollama_model);
            setIfPresent("Zombiehaus.OllamaTimeout", cfg.ollama_timeout);
            setIfPresent("Zombiehaus.OllamaSysPromptExpressions", cfg.ollama_sys_prompt_expressions);
            setIfPresent("Zombiehaus.OllamaSysPromptTags", cfg.ollama_sys_prompt_tags);
            setIfPresent("Zombiehaus.OllamaCloudURL", cfg.ollama_cloud_url);
            setIfPresent("Zombiehaus.OllamaCloudKey", cfg.ollama_cloud_api_key);
            setIfPresent("Zombiehaus.CloudAPIURL", cfg.cloud_api_url);
            setIfPresent("Zombiehaus.CloudAPIKey", cfg.cloud_api_key);
            setIfPresent("Zombiehaus.CloudModel", cfg.cloud_model);
            setIfPresent("Zombiehaus.CivitaiKey", cfg.civitai_api_key);
            setIfPresent("Zombiehaus.PromptsSaveDirectory", cfg.prompts_save_directory);
            setIfPresent("Zombiehaus.DefaultPromptStyle", cfg.prompt_style);

            if (cfg.ollama_model && typeof localStorage !== "undefined") {
                try {
                    localStorage.setItem("zombiehaus_ollama_model", cfg.ollama_model);
                    localStorage.setItem("zombiehaus_ollama_model", cfg.ollama_model);
                } catch (_) {}
            }
            if (cfg.prompt_style && typeof localStorage !== "undefined") {
                try {
                    localStorage.setItem("zombiehaus_default_prompt_style", cfg.prompt_style);
                    localStorage.setItem("zombiehaus_default_prompt_style", cfg.prompt_style);
                } catch (_) {}
            }
        };

        const registerAllInManager = () => {
            const sm = getSettingsManager();
            if (!sm || typeof sm.addSetting !== "function") return false;

            const list = buildZombiehausSettingsList(serverConfig);
            for (const s of list) {
                try {
                    sm.addSetting(s);
                } catch (err) {
                    console.warn("[Zombiehaus Settings] addSetting error for", s.id, err);
                }
            }
            syncConfigToSettings(serverConfig);
            return true;
        };

        if (!registerAllInManager()) {
            let attempts = 0;
            const timer = setInterval(() => {
                if (registerAllInManager() || ++attempts > 20) {
                    clearInterval(timer);
                }
            }, 250);
        } else {
            setTimeout(() => syncConfigToSettings(serverConfig), 500);
            setTimeout(() => syncConfigToSettings(serverConfig), 2000);
        }
    }
});
