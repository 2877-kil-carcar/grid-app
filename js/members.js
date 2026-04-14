import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const nameInput = document.getElementById("name");
const furnaceSelect = document.getElementById("furnace");
const list = document.getElementById("memberList");

let memberCount = 0;

// ===== 初期化 =====
function initFurnace() {
  for (let i = 1; i <= 30; i++) addOption(i);
  for (let i = 1; i <= 10; i++) addOption("FC" + i);
}

function addOption(val) {
  const opt = document.createElement("option");
  opt.value = val;
  opt.textContent = val;
  furnaceSelect.appendChild(opt);
}

// ===== 追加 =====
async function addMember() {

  if (memberCount >= 100) {
    alert("100人まで");
    return;
  }

  const name = nameInput.value.trim();
  const furnace = furnaceSelect.value;

  if (!name) return alert("名前必須");

  await addDoc(collection(db, "members"), {
    name,
    furnace,
    createdAt: Date.now()
  });

  nameInput.value = "";
}

// ===== 表示 =====
const q = query(collection(db, "members"), orderBy("createdAt"));

onSnapshot(q, snap => {

  memberCount = snap.size;
  list.innerHTML = "";

  snap.docs.forEach(docSnap => {

    const d = docSnap.data();

    const div = document.createElement("div");
    div.textContent = `${d.name} (${d.furnace})`;

    div.onclick = async () => {
      if (confirm("削除する？")) {
        await deleteDoc(doc(db, "members", docSnap.id));
      }
    };

    list.appendChild(div);
  });
});

initFurnace();
window.addMember = addMember;