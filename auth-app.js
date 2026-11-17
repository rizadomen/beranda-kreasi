// --- auth-app.js ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. ISI DENGAN FIREBASE CONFIG LU BRAY
const firebaseConfig = {
  apiKey: "AIzaSyD6ipCQh1s9ReTxAbnMNeowUp18cfJgCkI",
  authDomain: "beranda-kreasi-wvh.firebaseapp.com",
  projectId: "beranda-kreasi-wvh",
  storageBucket: "beranda-kreasi-wvh.firebasestorage.app",
  messagingSenderId: "424058424980",
  appId: "G-ZM1ERK2DLP"
};

// Inisialisasi Firebase & Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 2. ISI DENGAN URL DEPLOYMENT APPS SCRIPT LU YANG BARU
const GAS_URL = "URL_WEB_APP_GAS_LU"; 

/**
 * Fungsi Login dengan Google
 * Dipanggil pas tombol "Login with Google" diklik
 */
export async function loginWithGoogle() {
  try {
    // Tampilkan pop-up login Google
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log("Firebase login sukses:", user.email);
    
    // Kirim data ke backend Code.gs untuk sinkronisasi ke sheet AKUN_KLIEN
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // GAS CORS aman pakai text/plain
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
      console.log("Backend sync sukses:", data.message);
      
      // Simpan data sesi ke localStorage biar gampang dipanggil di halaman lain
      localStorage.setItem("wvh_client_data", JSON.stringify(data.client));
      localStorage.setItem("wvh_is_logged_in", "true");
      
      // Arahkan langsung ke halaman dashboard klien lu (sesuaikan nama file)
      window.location.href = "client.html"; 
    } else {
      alert("Gagal sinkronisasi data akun: " + data.message);
      await signOut(auth); // Rollback: paksa logout Firebase kalau gagal catat di Spreadsheet
    }
    
  } catch (error) {
    console.error("Error saat Google Sign-In:", error);
    alert("Gagal login dengan Google. Pastikan pop-up tidak diblokir browser.");
  }
}

/**
 * Fungsi Logout
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    localStorage.removeItem("wvh_client_data");
    localStorage.removeItem("wvh_is_logged_in");
    window.location.href = "index.html"; // Balikin ke halaman utama
  } catch (error) {
    console.error("Error saat logout:", error);
  }
}

/**
 * Fungsi Cek Status Auth
 * Panggil checkAuthStatus(true) di halaman client.html untuk proteksi, 
 * Panggil checkAuthStatus(false) di halaman login buat redirect otomatis kalau udah login
 */
export function checkAuthStatus(requireLogin = false) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Jika user sudah login tapi malah buka halaman login
      if (window.location.pathname.includes("login.html")) {
        window.location.href = "client.html";
      }
    } else {
      // Jika user belum login tapi maksa buka halaman klien (Proteksi)
      if (requireLogin) {
        window.location.href = "login.html";
      }
    }
  });
}
