// --- auth-app.js ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. KONFIGURASI FIREBASE (Ganti appId dengan format 1:424058424980:web:... dari Project Settings Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyD6ipCQh1s9ReTxAbnMNeowUp18cfJgCkI",
  authDomain: "beranda-kreasi-wvh.firebaseapp.com",
  projectId: "beranda-kreasi-wvh",
  storageBucket: "beranda-kreasi-wvh.firebasestorage.app",
  messagingSenderId: "424058424980",
  appId: "1:424058424980:web:GANTI_DENGAN_APP_ID_ASLI_LU"
};

// Inisialisasi Firebase & Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 2. URL DEPLOYMENT APPS SCRIPT LU
const GAS_URL = "https://script.google.com/macros/s/AKfycbxsyukFGT1DwBMZz80hNeHKpMyR0erEL-08t1Wz4HP8p2zQFuHecw7FU_bLL5ZD18Ts/exec";

/**
 * Sinkronisasi data akun Google ke Google Sheets (Code.gs)
 */
async function syncClientToSheet(user) {
  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "googleAuthLogin",
        payload: {
          email: user.email,
          name: user.displayName,
          uid: user.uid
        }
      })
    });
    
    const data = await response.json();
    
    if (data.status === "BERHASIL") {
      localStorage.setItem("wvh_client", JSON.stringify(data.client));
      localStorage.setItem("wvh_is_logged_in", "true");
      window.location.href = "client.html"; 
    } else {
      alert("Gagal sinkronisasi data akun: " + data.message);
      await signOut(auth);
    }
  } catch (error) {
    console.error("Error koneksi ke Apps Script:", error);
    alert("Gagal terhubung ke server backend: " + error.message);
  }
}

/**
 * Fungsi Login dengan Google (Otomatis pindah ke Redirect jika Pop-up diblokir)
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    await syncClientToSheet(result.user);
  } catch (error) {
    console.warn("Google Sign-In Error:", error.code, error.message);

    // Jika pop-up diblokir browser, alihkan ke mode Redirect
    if (error.code === "auth/popup-blocked") {
      await signInWithRedirect(auth, provider);
      return;
    }

    // Kembalikan tombol Google ke keadaan semula jika batal/error
    const btnGoogle = document.getElementById("btnGoogleLogin");
    if (btnGoogle) {
      btnGoogle.textContent = "Lanjutkan dengan Google";
      btnGoogle.disabled = false;
    }

    // Tampilkan penyebab pasti (misal: auth/unauthorized-domain)
    alert("Gagal login Google (" + error.code + "): " + error.message);
  }
}

// Tangkap hasil login jika menggunakan mode Redirect
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      await syncClientToSheet(result.user);
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
