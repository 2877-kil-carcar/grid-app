import { setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window._docs = [];

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const nameInput = document.getElementById("name");
const furnaceSelect = document.getElementById("furnace");
const list = document.getElementById("memberList");

let memberCount = 0;

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

async function addMember() {
  if (memberCount >= 100) {
    alert("100人まで");
    return;
  }

  const name = nameInput.value.trim();
  const furnace = furnaceSelect.value;

  if (!name) {
    alert("名前必須");
    return;
  }

  const exists = window._docs.find(d => d.data().name === name);

  if (exists) {
    if (!confirm("既に存在。溶鉱炉を更新する？")) return;

    await setDoc(doc(db, "members", exists.id), {
      name,
      furnace,
      createdAt: exists.data().createdAt
    });

    nameInput.value = "";
    return;
  }

  await addDoc(collection(db, "members"), {
    name,
    furnace,
    createdAt: Date.now()
  });

  nameInput.value = "";
}

const q = collection(db, "members");

onSnapshot(q, snap => {
  window._docs = snap.docs;
  memberCount = snap.size;
  list.innerHTML = "";

  snap.docs
    .sort((a, b) => a.data().name.localeCompare(b.data().name))
    .forEach(docSnap => {
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

window.addMember = addMember;
window.goBack = () => {
  location.href = "./index.html";
};

initFurnace();