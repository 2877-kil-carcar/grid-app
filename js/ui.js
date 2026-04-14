import { members } from "./data.js";

let current = null;
let filterText = "";

export function openSheet(x, y) {
  current = { x, y };
  document.getElementById("sheet").classList.add("show");
  buildList();
}

export function closeSheet() {
  document.getElementById("sheet").classList.remove("show");
}

function buildList() {

  const list = document.getElementById("list");
  list.innerHTML = "";

  // ===== 検索ボックス =====
  const input = document.createElement("input");
  input.placeholder = "検索...";
  input.value = filterText;
  input.style.width = "100%";
  input.style.padding = "10px";
  input.style.marginBottom = "10px";
  input.style.borderRadius = "10px";

  input.oninput = () => {
    filterText = input.value.toLowerCase();
    buildList();
  };

  list.appendChild(input);

  // ===== 同盟員フィルタ =====
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(filterText)
  );

  filtered.forEach(m => {
    addItem(list, m.name, () => select("player", m.id));
  });

  // ===== 区切り =====
  addDivider(list);

  addItem(list, "🚩 旗", () => select("flag"));
  addItem(list, "🪤 熊罠", () => select("trap"));
  addItem(list, "🏰 本部", () => select("base"));
}

function addItem(parent, text, fn) {
  const div = document.createElement("div");
  div.className = "item";
  div.textContent = text;
  div.onclick = fn;
  parent.appendChild(div);
}

function addDivider(parent) {
  const div = document.createElement("div");
  div.style.margin = "10px 0";
  div.style.borderTop = "1px solid rgba(255,255,255,0.2)";
  parent.appendChild(div);
}

let onSelectCallback = null;

export function setOnSelectCallback(fn) {
  onSelectCallback = fn;
}

function select(type, memberId=null) {
  if (!onSelectCallback) return;
  onSelectCallback(type, memberId, current);
  closeSheet();
}

// HTMLから呼ばれるので必要
window.closeSheet = closeSheet;