import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Konfigurasi Firebase lo (sesuaikan dengan firebaseConfig project lo)
const firebaseConfig = {
  apiKey: "API_KEY_LO",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Helper Toast
function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast " + type;
  setTimeout(() => t.classList.add("hidden"), 3000);
}

// Handler Tombol Google
document.getElementById("btnGoogleLogin").addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      showToast("Berhasil masuk sebagai " + user.displayName, "success");
      
      // Redirect ke halaman client setelah sukses
      setTimeout(() => {
        window.location.href = "client.html";
      }, 1000);
    })
    .catch((error) => {
      showToast("Gagal Google Login: " + error.message, "err");
    });
});

// Handler Form Email Manual (Opsional)
document.getElementById("authForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("emailInput").value;
  const pass = document.getElementById("passwordInput").value;

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      showToast("Login berhasil!", "success");
      window.location.href = "client.html";
    })
    .catch(() => {
      // Jika belum ada akun, coba buat otomatis (Sign Up)
      createUserWithEmailAndPassword(auth, email, pass)
        .then(() => {
          showToast("Akun berhasil dibuat!", "success");
          window.location.href = "client.html";
        })
        .catch((err) => {
          showToast("Gagal: " + err.message, "err");
        });
    });
});
