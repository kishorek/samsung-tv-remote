const ipEl = document.getElementById("ip");
const appNameEl = document.getElementById("appName");
const secureEl = document.getElementById("secure");
const autoConnectEl = document.getElementById("autoConnect");
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const statusEl = document.getElementById("status");
const statusDot = document.getElementById("statusDot");
const tokenEl = document.getElementById("token");
const saveTokenBtn = document.getElementById("saveTokenBtn");
const sendTextBtn = document.getElementById("sendTextBtn");
const textInputEl = document.getElementById("textInput");
const loadAppsBtn = document.getElementById("loadAppsBtn");
const appSearchEl = document.getElementById("appSearch");
const appsSelectEl = document.getElementById("appsSelect");
const launchSelectedBtn = document.getElementById("launchSelectedBtn");

let connectedIp = null;
let keyRepeatTimer = null;

function setStatus(msg, connected = null) {
  statusEl.textContent = `Status: ${msg}`;
  if (connected === true) {
    statusDot.classList.add("connected");
    statusDot.classList.remove("disconnected");
  } else if (connected === false) {
    statusDot.classList.add("disconnected");
    statusDot.classList.remove("connected");
  }
}

function persistSettings() {
  const settings = {
    ip: ipEl.value.trim(),
    appName: appNameEl.value.trim(),
    secure: !!secureEl.checked,
    autoConnect: !!autoConnectEl.checked,
  };
  try {
    localStorage.setItem("settings", JSON.stringify(settings));
  } catch (_) {}
}

function loadSettings() {
  try {
    const raw = localStorage.getItem("settings");
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.ip) ipEl.value = s.ip;
    if (s.appName) appNameEl.value = s.appName;
    if (typeof s.secure === "boolean") secureEl.checked = s.secure;
    if (typeof s.autoConnect === "boolean")
      autoConnectEl.checked = s.autoConnect;
  } catch (_) {}
}

function setControlsEnabled(enabled) {
  const buttons = document.querySelectorAll(
    "button[data-key], button[data-app-name], #sendTextBtn, #loadAppsBtn, #launchSelectedBtn"
  );
  buttons.forEach((b) => {
    b.disabled = !enabled;
  });
}

async function refreshTokenField() {
  const ip = ipEl.value.trim();
  if (!ip) return;
  const res = await window.api.getToken({ ip });
  if (res.ok) {
    tokenEl.value = res.token || "";
  }
}

connectBtn.addEventListener("click", async () => {
  const ip = ipEl.value.trim();
  if (!ip) {
    setStatus("Enter TV IP first", false);
    return;
  }
  const appName = appNameEl.value.trim() || "Electron Remote";
  const secure = secureEl.checked;

  setStatus("Connecting...");
  setControlsEnabled(false);
  persistSettings();
  const res = await window.api.connect({ ip, appName, secure });
  if (res.ok) {
    connectedIp = ip;
    setStatus(`Connected to ${ip} (${secure ? "wss" : "ws"})`, true);
    setControlsEnabled(true);
    if (res.token) tokenEl.value = res.token;
  } else {
    setStatus(`Connect failed: ${res.error}`, false);
    setControlsEnabled(false);
  }
});

disconnectBtn.addEventListener("click", async () => {
  const ip = ipEl.value.trim();
  if (!ip) return;
  const res = await window.api.disconnect({ ip });
  if (res.ok) {
    if (connectedIp === ip) connectedIp = null;
    setStatus("Disconnected", false);
    setControlsEnabled(false);
  } else {
    setStatus(`Disconnect error: ${res.error}`, false);
  }
});

saveTokenBtn.addEventListener("click", async () => {
  const ip = ipEl.value.trim();
  if (!ip) return;
  const token = tokenEl.value.trim() || null;
  const res = await window.api.setToken({ ip, token });
  if (res.ok) {
    setStatus("Token saved");
  } else {
    setStatus(`Token save error: ${res.error}`);
  }
});

async function sendKey(key) {
  const ip = ipEl.value.trim();
  if (!ip) {
    setStatus("Enter TV IP first", false);
    return;
  }
  const res = await window.api.sendKey({ ip, key });
  if (!res.ok) {
    setStatus(`Send key error: ${res.error}`, false);
  }
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-key]");
  if (!btn) return;
  const key = btn.getAttribute("data-key");
  await sendKey(key);
});

// Quick app launch by name
document.addEventListener("click", async (e) => {
  const appBtn = e.target.closest("button[data-app-name]");
  if (!appBtn) return;
  const appName = appBtn.getAttribute("data-app-name");
  const ip = ipEl.value.trim();
  if (!ip) {
    setStatus("Enter TV IP first", false);
    return;
  }
  const res = await window.api.launchApp({ ip, appName });
  if (!res.ok) setStatus(`Launch failed: ${res.error}`, false);
});

async function renderAppsList(apps) {
  const query = (appSearchEl?.value || "").trim().toLowerCase();
  const filtered = query
    ? apps.filter((a) => (a.name || "").toLowerCase().includes(query))
    : apps;
  if (!appsSelectEl) return;
  appsSelectEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = filtered.length ? "Select an app" : "No apps";
  appsSelectEl.appendChild(placeholder);
  filtered.forEach((app) => {
    const opt = document.createElement("option");
    opt.value = app.appId || app.id;
    opt.textContent = app.name || app.id;
    appsSelectEl.appendChild(opt);
  });
}

let cachedApps = [];
loadAppsBtn?.addEventListener("click", async () => {
  const ip = ipEl.value.trim();
  if (!ip) {
    setStatus("Enter TV IP first", false);
    return;
  }
  setStatus("Loading apps...");
  const res = await window.api.listApps({ ip });
  if (res.ok) {
    cachedApps = res.apps || [];
    renderAppsList(cachedApps);
    setStatus("Apps loaded", true);
  } else {
    setStatus(`Load apps failed: ${res.error}`, false);
  }
});

appSearchEl?.addEventListener("input", () => {
  renderAppsList(cachedApps);
});

launchSelectedBtn?.addEventListener("click", async () => {
  const ip = ipEl.value.trim();
  if (!ip) {
    setStatus("Enter TV IP first", false);
    return;
  }
  const appId = appsSelectEl?.value || "";
  if (!appId) return;
  const res = await window.api.launchApp({ ip, appId });
  if (!res.ok) setStatus(`Launch failed: ${res.error}`, false);
});

// Long-press repeat for navigation/volume/channel
document.addEventListener("mousedown", (e) => {
  const btn = e.target.closest('button[data-key][data-repeat="true"]');
  if (!btn) return;
  const key = btn.getAttribute("data-key");
  // initial send
  sendKey(key);
  // ramp up repeat
  let interval = 220;
  keyRepeatTimer = setTimeout(function repeater() {
    sendKey(key);
    interval = Math.max(60, interval - 20);
    keyRepeatTimer = setTimeout(repeater, interval);
  }, 380);
});

["mouseup", "mouseleave", "blur"].forEach((evt) => {
  window.addEventListener(evt, () => {
    if (keyRepeatTimer) {
      clearTimeout(keyRepeatTimer);
      keyRepeatTimer = null;
    }
  });
});

sendTextBtn.addEventListener("click", async () => {
  const ip = ipEl.value.trim();
  if (!ip) {
    setStatus("Enter TV IP first");
    return;
  }
  const text = textInputEl.value;
  if (!text) return;
  const res = await window.api.sendText({ ip, text });
  if (!res.ok) {
    setStatus(`Send text error: ${res.error}`);
  }
});

textInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendTextBtn.click();
  }
});

secureEl.addEventListener("change", () => {
  refreshTokenField();
  persistSettings();
});

ipEl.addEventListener("blur", () => {
  refreshTokenField();
  persistSettings();
});

appNameEl.addEventListener("blur", persistSettings);
autoConnectEl.addEventListener("change", persistSettings);

// Keyboard shortcuts mapping
const keyMap = {
  ArrowUp: "KEY_UP",
  ArrowDown: "KEY_DOWN",
  ArrowLeft: "KEY_LEFT",
  ArrowRight: "KEY_RIGHT",
  Enter: "KEY_ENTER",
  Escape: "KEY_EXIT",
  Backspace: "KEY_BACK",
  Home: "KEY_HOME",
  F1: "KEY_RED",
  F2: "KEY_GREEN",
  F3: "KEY_YELLOW",
  F4: "KEY_BLUE",
  "+": "KEY_VOLUP",
  "-": "KEY_VOLDOWN",
};

document.addEventListener("keydown", (e) => {
  const key = keyMap[e.key];
  if (!key) return;
  e.preventDefault();
  sendKey(key);
});

// Initialize UI
loadSettings();
setControlsEnabled(false);
refreshTokenField();
// Auto-connect if requested
if (autoConnectEl.checked && ipEl.value.trim()) {
  connectBtn.click();
}
