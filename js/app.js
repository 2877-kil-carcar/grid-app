import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { GRID_COLS, GRID_ROWS, members, setObjects, objects, setMembers } from "./data.js";
import { getObjectAt, canPlace } from "./grid.js";
import * as ui from "./ui.js";

const grid = document.getElementById("grid");

let deleteMode = false;

let activeCell = null;

let activeCellPos = null;

const btn = document.getElementById("deleteModeBtn");

btn.onclick = () => {
  deleteMode = !deleteMode;

  btn.textContent = deleteMode ? "削除モードON" : "削除モードOFF";
  btn.style.background = deleteMode ? "red" : "";

  // ★ ここ追加（重要）
  document.body.classList.toggle("delete-mode", deleteMode);
};

let editMode = false;
const EDIT_PASSWORD = "des";

const editBtn = document.getElementById("editModeBtn");

editBtn.onclick = () => {

  if (!editMode) {
    const input = prompt("パスワード入力");

    if (input !== EDIT_PASSWORD) {
      alert("パスワード違う");
      return;
    }

    editMode = true;
  } else {
    editMode = false;
  }

  editBtn.textContent = editMode ? "編集モードON" : "編集モードOFF";
  editBtn.style.background = editMode ? "#16a34a" : "";
  document.body.classList.toggle("edit-mode", editMode);
};

// ==========================
// 初期化
// ==========================
function initGrid() {

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {

      const cell = document.createElement("div");
      cell.className = "cell";

      cell.onclick = async () => {
      
        // ★ 先にハイライト
        activeCellPos = { x, y };
      
        // ★ 編集モード制御
        if (!editMode) return;
      
        if (deleteMode) {
          const obj = getObjectAt(x, y);
          if (!obj) return;
      
          if (confirm("削除する？")) {
            await deleteObjectAt(x, y);
          }
          return;
        }
      
        ui.openSheet(x, y);
      };
      
      grid.appendChild(cell);
    }
  }
}

// ==========================
// 配置処理（移動対応）
// ==========================
ui.setOnSelectCallback(async (type, memberId, pos) => {
  // ★ 制限チェック
  if (type === "base") {
    const count = objects.filter(o => o.type === "base").length;
    if (count >= 1) {
      alert("本部は1つまで");
      return;
    }
  }
  
  if (type === "trap") {
    const count = objects.filter(o => o.type === "trap").length;
    if (count >= 2) {
      alert("熊罠は2つまで");
      return;
    }
  }

  let size = 1;
  if (type === "player") size = 2;
  if (type === "trap" || type === "base") size = 3;

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

  if (!canPlace(pos.x, pos.y, size)) {
    alert("置けない");
    return;
  }

  const newObj = { x: pos.x, y: pos.y, size };

  await deleteOverlappingObjects(newObj);

  const key = `${pos.x}_${pos.y}`;

  await setDoc(doc(db, "objects", key), {
    type,
    memberId: memberId || null,
    x: pos.x,
    y: pos.y,
    size,
    updatedAt: Date.now()
  });
});

// ==========================
// 描画（FC対応版）
// ==========================
function render() {

  const cells = grid.children;

  for (let i = 0; i < cells.length; i++) {

    const cell = cells[i];
    const x = i % GRID_COLS;
    const y = Math.floor(i / GRID_COLS);

    // ★ 完全リセット
    cell.className = "cell";
    cell.innerHTML = "";

    // ★ クリック再設定（これが重要）
    cell.onclick = async () => {

      if (deleteMode) {
        const obj = getObjectAt(x, y);
        if (!obj) return;

        if (confirm("削除する？")) {
          await deleteObjectAt(x, y);
        }
        return;
      }

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
          const lv = parseInt(m.furnace.replace("FC",""));
          cell.classList.add(`fc${Math.min(lv,10)}`);
        }

      } else if (obj.type === "flag") {
        cell.textContent = "🚩";
      } else if (obj.type === "trap") {
        cell.textContent = "🪤";
      } else if (obj.type === "base") {
        cell.textContent = "🏰";
      }

      drawMultiBorder(cell, obj, x, y);
    }
  }
}
// ==========================
// 削除
// ==========================
async function deleteObjectAt(x, y) {

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
initGrid();