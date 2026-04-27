import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCjfk446ITuRjxLfPLbNABNmmBN-9I51g",
  authDomain: "mcc-blitz-live.firebaseapp.com",
  projectId: "mcc-blitz-live",
  storageBucket: "mcc-blitz-live.firebasestorage.app",
  messagingSenderId: "171009874823",
  appId: "1:171009874823:web:cb48f2e1a38f3e37a5d122",
  measurementId: "G-PY2Q7G58DW",
  databaseURL: "https://mcc-blitz-live-default-rtdb.firebaseio.com/"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getDatabase(app);
