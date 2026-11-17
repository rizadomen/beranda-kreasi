// --- auth-app.js ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyD6ipCQh1s9ReTxAbnMNeowUp18cfJgCkI",
  authDomain: "beranda-kreasi-wvh.firebaseapp.com",
  projectId: "beranda-kreasi-wvh",
  storageBucket: "beranda-kreasi-wvh.firebasestorage.app",
  messagingSenderId: "424058424980",
  appId: "1:424058424980:web:GANTI_DENGAN_APP_ID_ASLI_LU" // Pastikan sudah diisi App ID Firebase yang benar
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// URL Apps Script (Opsional untuk sinkronisasi latar belakang jika diperlukan nanti)
const GAS_URL = "https://script.google.com/macros/s/AKfycbxsyukFGT1DwBMZz80hNeHKpMyR0erEL-08t1Wz4HP8p2zQFuHecw7FU_bLL5ZD18Ts/exec";

/**
 * Fungsi Login dengan Google (Bypass langsung ke client.html setelah sukses di Firebase)
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // 1. Bungkus data user langsung dari respons Google / Firebase
    const clientData = {
      ID_KLIEN: "CLI_FB_" + user.uid.slice(-6),
      NAMA: user.displayName || "Klien Google",
      EMAIL: user.email,
      STATUS: "AKTIF",
      FIREBASE_UID: user.uid
    };

    // 2. Simpan ke localStorage dengan key 'wvh_client'
    localStorage.setItem("wvh_client", JSON.stringify(clientData));
    localStorage.setItem("wvh_is_logged_in", "true");

    // 3. (Opsional) Lempar ke sheet di background tanpa nge-block proses login kalau gagal
    fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "googleAuthLogin",
        payload: { email: user.email, name: user.displayName, uid: user.uid }
      })
    }).catch(err => console.log("Background sync skipped:", err));

    // 4. Langsung alihkan ke halaman dashboard klien!
    window.location.href = "client.html";

  } catch (error) {
    console.warn("Google Sign-In Error:", error.code, error.message);

    // Jika pop-up diblokir browser, alihkan ke metode Redirect
    if (error.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return;
    }

    const btnGoogle = document.getElementById("btnGoogleLogin");
    if (btnGoogle) {
      btnGoogle.textContent = "Lanjutkan dengan Google";
      btnGoogle.disabled = false;
    }

    alert("Gagal login Google (" + error.code + "): " + error.message);
  }
}

// Tangkap hasil login jika menggunakan mode Redirect
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const user = result.user;
      const clientData = {
        ID_KLIEN: "CLI_FB_" + user.uid.slice(-6),
        NAMA: user.displayName || "Klien Google",
        EMAIL: user.email,
        STATUS: "AKTIF",
        FIREBASE_UID: user.uid
      };
      localStorage.setItem("wvh_client", JSON.stringify(clientData));
      localStorage.setItem("wvh_is_logged_in", "true");
      window.location.href = "client.html";
    }
  } catch (error) {
    console.error("Redirect Login Error:", error);
  }
});

/**
 * Fungsi Logout
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    localStorage.removeItem("wvh_client");
    localStorage.removeItem("wvh_is_logged_in");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error saat logout:", error);
  }
}

/**
 * Fungsi Proteksi Halaman
 */
export function checkAuthStatus(requireLogin = false) {
  onAuthStateChanged(auth, (user) => {
    const localClient = localStorage.getItem("wvh_client");
    if (!user && !localClient && requireLogin) {
      window.location.href = "index.html";
    }
  });
}
