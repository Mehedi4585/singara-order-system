// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export const firebaseConfig = {
    apiKey: "AIzaSyBd7DrGigsOX6R7xcb59TLzZLqvqENhfUQ",
    authDomain: "singara-3827a.firebaseapp.com",
    databaseURL: "https://singara-3827a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "singara-3827a",
    storageBucket: "singara-3827a.appspot.com",
    messagingSenderId: "586272028714",
    appId: "1:586272028714:web:db5c16e02461093b57ab53"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
