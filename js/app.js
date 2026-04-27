import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { GRID_COLS, GRID_ROWS, members, setObjects, objects, setMembers, adminApproved, setAdminApproved } from "./data.js";
import { getObjectAt, canPlace } from "./grid.js";
import * as ui from "./ui.js";

const grid = document.getElementById("grid");
const wrapper = document.getElementById("gridWrapper");
const adminPwInput = document.getElementById("adminPwInput");
const adminApproveBtn = document.getElementById("adminApproveBtn");
const memberLink = document.getElementById("memberLink");

let activeCellPos = null;
let flashCellPos = null;
let scale = 1;
let lastDist = null;

const ADMIN_PASSWORD = "des";

// ==========================
// 管理者承認
// ==========================
function toggleAdmin() {
  if (adminApproved) {
    setAdminApproved(false);
    adminApproveBtn.textContent = "承認";
    adminApproveBtn.style.background = "";
    adminPwInput.value = "";
    sessionStorage.removeItem("adminApproved");
  } else {
    const input = adminPwInput.value;
    if (input !== ADMIN_PASSWORD) {
      alert("パスワードが違います");
      return;
    }
    setAdminApproved(true);
    adminApproveBtn.textContent = "承認中";
    adminApproveBtn.style.background = "#16a34a";
    adminPwInput.value = "";
    sessionStorage.setItem("adminApproved", "true");
  }
  render();
}

adminApproveBtn.addEventListener("click", toggleAdmin);
adminApproveBtn.addEventListener("touchend", (e) => {
  e.preventDefault();
  toggleAdmin();
});

memberLink.addEventListener("click", (e) => {
  if (!adminApproved) {
    e.preventDefault();
    alert("管理者承認が必要です");
  }
});

memberLink.addEventListener("touchend", (e) => {
  if (!adminApproved) {
    e.preventDefault();
    alert("管理者承認が必要です");
  }
});

// ==========================
// 初期化
// ==========================
function initGrid() {
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      grid.appendChild(cell);
    }
  }
  render();
}

// ==========================
// 配置処理
// ==========================
ui.setOnSelectCallback(async (type, memberId, pos) => {

  if (type === "base") {
    const existing = objects.find(o => o.type === "base");
    if (existing && !(existing.x === pos.x && existing.y === pos.y)) {
      alert("本部は1つまで");
      return;
    }
  }

  if (type === "trap") {
    const traps = objects.filter(o => o.type === "trap");
    if (traps.length >= 2) {
      const existsHere = traps.find(o => o.x === pos.x && o.y === pos.y);
      if (!existsHere) {
        alert("熊罠は2つまで");
        return;
      }
    }
  }

  let size = 1;
  if (type === "player") size = 2;
  if (type === "food") size = 2;
  if (type === "trap" || type === "base" || type === "mine") size = 3;

  if (type === "player") {
    const existing = objects.find(o =>
      o.type === "player" && o.memberId === memberId
    );

    if (existing) {
      for (let dx = 0; dx < existing.size; dx++) {
        for (let dy = 0; dy < existing.size; dy++) {
          const key = `${existing.x + dx}_${existing.y + dy}`;
          await deleteDoc(doc(db, "objects", key));
        }
      }
    }
  }

  // タップ位置を左下角として、実際の左上角を算出
  const placeX = pos.x;
  const placeY = pos.y - (size - 1);

  if (placeY < 1 || !canPlace(placeX, placeY, size)) {
    alert("置けない");
    return;
  }

  const newObj = { x: placeX, y: placeY, size };
  await deleteOverlappingObjects(newObj);

  const key = `${placeX}_${placeY}`;

  await setDoc(doc(db, "objects", key), {
    type,
    memberId: memberId ?? null,
    x: placeX,
    y: placeY,
    size,
    updatedAt: Date.now()
  });
});

// ==========================
// 描画
// ==========================
function render() {
  const cells = grid.children;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const x = i % GRID_COLS;
    const y = Math.floor(i / GRID_COLS);

    cell.className = "cell";
    cell.innerHTML = "";

    // ==========================
    // 座標表示
    // ==========================
    if (x === 0 && y === 0) {
      cell.textContent = "Y\\X";
      cell.classList.add("coord-cell");
      continue;
    }

    if (y === 0) {
      const xVal = 411 + x;
      cell.textContent = xVal;
      cell.classList.add("coord-cell");
      continue;
    }

    if (x === 0) {
      const yVal = 659 - y;
      cell.textContent = yVal;
      cell.classList.add("coord-cell");
      continue;
    }

    cell.onclick = async (e) => {
      activeCellPos = { x, y };
      render();
      ui.openSheet(x, y);
    };

    const obj = getObjectAt(x, y);

    if (obj) {
      if (obj.type === "player") {
        const m = members.find(m => m.id === obj.memberId);
        if (!m) continue;

        const nameDiv = document.createElement("div");
        nameDiv.className = "cell-name";
        nameDiv.textContent = m.name;

        const furnaceDiv = document.createElement("div");
        furnaceDiv.className = "cell-furnace";
        furnaceDiv.textContent = m.furnace;

        cell.appendChild(nameDiv);
        cell.appendChild(furnaceDiv);

        if (m.furnace.startsWith("FC")) {
          const lv = parseInt(m.furnace.replace("FC", ""), 10);
          cell.classList.add(`fc${Math.min(lv, 10)}`);
        } else {
          cell.classList.add("player-normal");
        }

      } else if (obj.type === "flag") {
        cell.textContent = "🚩";
      } else if (obj.type === "trap") {
        cell.textContent = "🐻";
      } else if (obj.type === "base") {
        cell.textContent = "🕌";
      } else if (obj.type === "mine") {
        cell.textContent = "⛏️";
      } else if (obj.type === "food") {
        cell.textContent = "🍕";
      }

      drawMultiBorder(cell, obj, x, y);
    }

    if (activeCellPos && activeCellPos.x === x && activeCellPos.y === y) {
      cell.classList.add("active");
    }

    if (flashCellPos && flashCellPos.x === x && flashCellPos.y === y) {
      cell.classList.add("flash");
    }
  }
  adjustTextSize();
  updateCurrentPos();
  updateCurrentPosTop();
}

// ==========================
// 削除
// ==========================
export async function deleteObjectAt(x, y) {
  const obj = getObjectAt(x, y);
  if (!obj) return;

  for (let dx = 0; dx < obj.size; dx++) {
    for (let dy = 0; dy < obj.size; dy++) {
      const key = `${obj.x + dx}_${obj.y + dy}`;
      await deleteDoc(doc(db, "objects", key));
    }
  }
}

// ==========================
// 重なり削除
// ==========================
function isOverlap(a, b) {
  return !(
    a.x + a.size <= b.x ||
    b.x + b.size <= a.x ||
    a.y + a.size <= b.y ||
    b.y + b.size <= a.y
  );
}

async function deleteOverlappingObjects(newObj) {
  for (const obj of objects) {
    if (isOverlap(obj, newObj)) {
      for (let dx = 0; dx < obj.size; dx++) {
        for (let dy = 0; dy < obj.size; dy++) {
          const key = `${obj.x + dx}_${obj.y + dy}`;
          await deleteDoc(doc(db, "objects", key));
        }
      }
    }
  }
}

// ==========================
// 複数マス枠
// ==========================
function drawMultiBorder(cell, obj, x, y) {
  const isTop = y === obj.y;
  const isBottom = y === obj.y + obj.size - 1;
  const isLeft = x === obj.x;
  const isRight = x === obj.x + obj.size - 1;

  if (isTop) cell.classList.add("border-top");
  if (isBottom) cell.classList.add("border-bottom");
  if (isLeft) cell.classList.add("border-left");
  if (isRight) cell.classList.add("border-right");
}

// ==========================
// Firestore同期
// ==========================
onSnapshot(collection(db, "objects"), snap => {
  setObjects(snap.docs.map(d => d.data()));
  render();
});

onSnapshot(collection(db, "members"), snap => {
  setMembers(snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  })));
  render();
});

// ==========================
// ジャンプ
// ==========================
export function jumpTo(x, y) {

  const cellSize = 34 + 3;
  const targetX = x * cellSize * scale;
  const targetY = y * cellSize * scale;

  const viewWidth = wrapper.clientWidth;
  const viewHeight = wrapper.clientHeight;

  const scrollX = targetX - viewWidth / 2 + (cellSize * scale) / 2;
  const scrollY = targetY - viewHeight / 2 + (cellSize * scale) / 2;

  activeCellPos = { x, y };
  flashCellPos = { x, y };
  render();

  wrapper.scrollTo({
    left: scrollX,
    top: scrollY,
    behavior: "smooth"
  });

  setTimeout(() => {
    flashCellPos = null;
    render();
  }, 800);
}

// ==========================
// ズーム
// ==========================
wrapper.addEventListener("wheel", (e) => {
  e.preventDefault();

  const rect = wrapper.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const prevScale = scale;
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  scale = Math.min(Math.max(0.5, scale + delta), 2);

  const ratio = scale / prevScale;

  wrapper.scrollLeft = (wrapper.scrollLeft + mouseX) * ratio - mouseX;
  wrapper.scrollTop = (wrapper.scrollTop + mouseY) * ratio - mouseY;

  grid.style.transform = `scale(${scale})`;
});

wrapper.addEventListener("touchmove", (e) => {
  if (e.touches.length !== 2) return;

  e.preventDefault();

  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (lastDist) {
    const prevScale = scale;
    const delta = dist - lastDist;
    scale = Math.min(Math.max(0.5, scale + delta * 0.005), 2);

    const ratio = scale / prevScale;
    wrapper.scrollLeft *= ratio;
    wrapper.scrollTop *= ratio;

    grid.style.transform = `scale(${scale})`;
  }

  lastDist = dist;
}, { passive: false });

wrapper.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) {
    lastDist = null;
  }
});

function adjustTextSize() {
  const names = document.querySelectorAll(".cell-name");

  names.forEach(el => {
    let size = 9;
    el.style.fontSize = size + "px";

    while (el.scrollHeight > el.clientHeight && size > 6) {
      size--;
      el.style.fontSize = size + "px";
    }
  });
}

function updateCurrentPos() {
  const el = document.getElementById("currentPos");
  if (!el) return;

  if (!activeCellPos) {
    el.textContent = "";
    return;
  }

  const x = activeCellPos.x;
  const y = activeCellPos.y;

  const xVal = 411 + x;
  const yVal = 659 - y;

  el.textContent = `現在地 X:${xVal}  Y:${yVal}`;
}

function updateCurrentPosTop() {
  const el = document.getElementById("currentPosTop");
  if (!el) return;

  if (!activeCellPos) {
    el.textContent = "";
    return;
  }

  const x = activeCellPos.x;
  const y = activeCellPos.y;

  const xVal = 411 + x;
  const yVal = 659 - y;

  el.textContent = `X:${xVal}  Y:${yVal}`;
}
// ==========================
initGrid();
