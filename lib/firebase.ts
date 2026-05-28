import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB2JIhNld6NCGXVHKSI65Lsjf9FxY3GW2Q",
  authDomain: "mcc-blitz-live.firebaseapp.com",
  projectId: "mcc-blitz-live",
  storageBucket: "mcc-blitz-live.firebasestorage.app",
  messagingSenderId: "526005051898",
  appId: "1:526005051898:web:d1c09f12a49d49d7f10443",
  databaseURL: "https://mcc-blitz-live-default-rtdb.firebaseio.com/"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);