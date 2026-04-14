import { members, objects } from "./data.js";
import { jumpTo } from "./app.js";

let current = null;
let filterText = "";
let inputEl = null;

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

  // ★ 初回だけinput作る
  if (!inputEl) {

    inputEl = document.createElement("input");
    inputEl.placeholder = "検索...";

    inputEl.style.width = "100%";
    inputEl.style.boxSizing = "border-box";
    inputEl.style.padding = "10px";
    inputEl.style.marginBottom = "10px";
    inputEl.style.borderRadius = "10px";

    inputEl.oninput = (e) => {
      filterText = e.target.value.toLowerCase();
      renderListOnly(); // ★ここが重要
    };

    list.appendChild(inputEl);
  }

  inputEl.value = filterText;

  renderListOnly();
}

function renderListOnly() {

  const list = document.getElementById("list");

  // ★ input以外を消す
  while (list.children.length > 1) {
    list.removeChild(list.lastChild);
  }

  // ===== 同盟員 =====
  const filtered = members
    .filter(m => m.name.toLowerCase().includes(filterText))
    .sort((a, b) => a.name.localeCompare(b.name));

  filtered.forEach(m => {

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.marginBottom = "6px";

    const placeBtn = document.createElement("div");
    placeBtn.className = "item";
    placeBtn.textContent = m.name;
    placeBtn.style.flex = "1";
    placeBtn.onclick = () => {
      select("player", m.id);
    };

    row.appendChild(placeBtn);

    const obj = findMemberObject(m.id);
    if (obj) {
      const jumpBtn = document.createElement("div");
      jumpBtn.className = "item";
      jumpBtn.textContent = "📍";
      jumpBtn.style.width = "48px";
      jumpBtn.style.textAlign = "center";
      jumpBtn.onclick = () => {
        jumpTo(obj.x, obj.y);
        closeSheet();
      };
      row.appendChild(jumpBtn);
    }

    list.appendChild(row);
  });

  addDivider(list);

  addItem(list, "🚩 旗", () => select("flag"));
  addItem(list, "🐻 熊罠", () => select("trap"));
  addItem(list, "🕌 本部", () => select("base"));
  addItem(list, "⛏️ 大型採取場", () => select("mine"));
  addItem(list, "🍕 同盟資源", () => select("food"));

  addDivider(list);

  const unplaced = members.filter(m =>
    !objects.find(o => o.type === "player" && o.memberId === m.id)
  );

  if (unplaced.length > 0) {

    const title = document.createElement("div");
    title.textContent = "未配置";
    title.style.marginTop = "10px";
    title.style.fontWeight = "bold";
    list.appendChild(title);

    unplaced.forEach(m => {
      addItem(list, "⚠ " + m.name, () => {
        select("player", m.id);
      });
    });
  }
}

function findMemberObject(memberId) {
  return objects.find(o =>
    o.type === "player" &&
    String(o.memberId) === String(memberId)
  );
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

function select(type, memberId = null) {
  if (!onSelectCallback) return;
  onSelectCallback(type, memberId, current);
  closeSheet();
}

window.closeSheet = closeSheet;