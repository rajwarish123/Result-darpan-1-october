// Result Darpan - Firebase Authentication Integration
// Provides stable, secure OTP verification, email password resets, and user authentication through Google Firebase.

(function () {
  const DEFAULT_CONFIG = {
    apiKey: "AIzaSyC_DNmdcwutIlQed-OpV5GwoVyR7Ktjtqw",
    authDomain: "result-darpan.firebaseapp.com",
    projectId: "result-darpan",
    storageBucket: "result-darpan.firebasestorage.app",
    messagingSenderId: "469748967221",
    appId: "1:469748967221:web:bdac35155e513031f5ce7c",
    measurementId: "G-8WL6HD9CM4"
  };

  let activeConfig = { ...DEFAULT_CONFIG };
  try {
    const saved = localStorage.getItem('result-darpan-firebase-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.apiKey === 'string' && parsed.apiKey.trim()) {
        activeConfig = { ...DEFAULT_CONFIG, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Could not read saved Firebase config:', e);
  }

  window.FIREBASE_CONFIG = activeConfig;

  let isInitialized = false;
  let authInstance = null;
  let currentConfirmationResult = null;
  let recaptchaVerifier = null;

  function isConfigured() {
    return Boolean(
      window.FIREBASE_CONFIG &&
      window.FIREBASE_CONFIG.apiKey &&
      window.FIREBASE_CONFIG.apiKey.trim().length > 10 &&
      window.FIREBASE_CONFIG.projectId &&
      window.FIREBASE_CONFIG.projectId.trim().length > 2
    );
  }

  function initFirebase() {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK script not loaded yet.');
      return false;
    }
    if (!isConfigured()) {
      return false;
    }
    try {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      authInstance = firebase.auth();
      isInitialized = true;
      return true;
    } catch (err) {
      console.error('Failed to initialize Firebase Auth:', err);
      return false;
    }
  }

  // Auto-init if Firebase SDK is present
  if (typeof firebase !== 'undefined') {
    initFirebase();
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      if (typeof firebase !== 'undefined') initFirebase();
    });
  }

  function formatError(err) {
    if (!err) return 'An unexpected error occurred.';
    const code = err.code || '';
    const msg = err.message || String(err);
    if (code === 'auth/user-not-found' || msg.includes('user-not-found')) {
      return 'Firebase: No user found with this email in your Firebase Console. Switch to the "📱 Phone SMS OTP" tab above to verify instantly with a 6-digit SMS OTP, or add this user in Firebase Console > Authentication > Users.';
    }
    if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
      return 'Firebase: Sign-in provider disabled. In Firebase Console > Authentication > Sign-in method, please enable "Phone" and "Email/Password".';
    }
    if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
      return 'Firebase: Domain not authorized. In Firebase Console > Authentication > Settings > Authorized domains, ensure "localhost" is added.';
    }
    if (code === 'auth/invalid-api-key' || msg.includes('invalid-api-key') || msg.includes('api-key-not-valid')) {
      return 'Firebase: Invalid API Key. Please verify your Firebase project credentials in ⚙ Firebase Settings.';
    }
    if (code === 'auth/quota-exceeded' || msg.includes('quota-exceeded')) {
      return 'Firebase SMS quota reached for today. Tip: Add free test phone numbers in Firebase Console > Authentication > Sign-in method > Phone > "Phone numbers for testing" (e.g. +91 9999999999 with OTP 123456).';
    }
    if (code === 'auth/invalid-phone-number' || msg.includes('invalid-phone-number')) {
      return 'Firebase: Please enter a valid mobile number with country code (e.g. +91 9876543210).';
    }
    if (code === 'auth/invalid-verification-code' || msg.includes('invalid-verification-code')) {
      return 'Firebase: The 6-digit OTP code is incorrect. Please check your SMS and try again.';
    }
    if (code === 'auth/code-expired' || msg.includes('code-expired')) {
      return 'Firebase: The OTP code has expired. Please click "Send SMS OTP" again.';
    }
    if (code === 'auth/captcha-check-failed') {
      return 'Firebase: reCAPTCHA verification failed. Please refresh the page and try again.';
    }
    return `Firebase: ${msg.replace(/^Firebase:\s*/i, '')}`;
  }

  function parseSnippet(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const extract = (key) => {
      const match = raw.match(new RegExp(`${key}['"\\s]*:['"\\s]*([^'"\\s,]+)`));
      return match ? match[1].replace(/['",;]/g, '').trim() : '';
    };
    const apiKey = extract('apiKey');
    const authDomain = extract('authDomain');
    const projectId = extract('projectId');
    const appId = extract('appId');
    const storageBucket = extract('storageBucket');
    const messagingSenderId = extract('messagingSenderId');
    if (apiKey || projectId) {
      return { apiKey, authDomain, projectId, appId, storageBucket, messagingSenderId };
    }
    return null;
  }

  window.ResultDarpanFirebase = {
    isConfigured,
    init: initFirebase,
    formatError,
    parseSnippet,
    getAuth: () => authInstance || (initFirebase() ? authInstance : null),
    getConfig: () => ({ ...window.FIREBASE_CONFIG }),
    saveConfig: (newConfig) => {
      const merged = { ...DEFAULT_CONFIG, ...newConfig };
      localStorage.setItem('result-darpan-firebase-config', JSON.stringify(merged));
      window.FIREBASE_CONFIG = merged;
      if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
        try {
          authInstance = null;
          isInitialized = false;
          firebase.apps.forEach((app) => app.delete().catch(() => {}));
        } catch (e) {
          console.warn('Firebase app cleanup notice:', e);
        }
      }
      return initFirebase();
    },

    // 1. Send Password Reset Email through Firebase (No SMTP server needed)
    sendPasswordResetEmail: async (email) => {
      const auth = window.ResultDarpanFirebase.getAuth();
      if (!auth) {
        throw new Error('Firebase Authentication is not configured yet. Please enter your Firebase project API keys in Firebase Settings.');
      }
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      await auth.sendPasswordResetEmail(cleanEmail);
      return { ok: true, email: cleanEmail };
    },

    // 2. Send SMS Phone OTP through Firebase Phone Auth
    sendPhoneOtp: async (phoneNumber, containerId = 'recaptcha-container') => {
      const auth = window.ResultDarpanFirebase.getAuth();
      if (!auth) {
        throw new Error('Firebase Authentication is not configured yet. Please enter your Firebase project API keys in Firebase Settings.');
      }
      const cleanPhone = String(phoneNumber || '').trim();
      if (!/^\+?[1-9]\d{6,14}$/.test(cleanPhone.replace(/[\s\-]/g, ''))) {
        throw new Error('Please enter a valid phone number with country code (e.g. +91 9876543210).');
      }

      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Recaptcha container #${containerId} not found in page.`);
      }

      if (recaptchaVerifier) {
        try { recaptchaVerifier.clear(); } catch (e) {}
      }

      recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        }
      });

      currentConfirmationResult = await auth.signInWithPhoneNumber(cleanPhone, recaptchaVerifier);
      return { ok: true, confirmationResult: currentConfirmationResult };
    },

    // 3. Verify Phone OTP code
    verifyPhoneOtp: async (otpCode) => {
      if (!currentConfirmationResult) {
        throw new Error('No OTP request found. Please request an OTP first.');
      }
      const cleanOtp = String(otpCode || '').trim();
      if (!/^\d{4,8}$/.test(cleanOtp)) {
        throw new Error('Please enter a valid numeric OTP code.');
      }
      const userCredential = await currentConfirmationResult.confirm(cleanOtp);
      return userCredential.user;
    },

    // 4. Synchronize user with Result Darpan backend
    syncWithBackend: async ({ email, newPassword, firebaseUid }) => {
      const res = await fetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, firebaseUid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync authentication with backend.');
      if (data.token) {
        localStorage.setItem('preply-session-token', data.token);
        localStorage.setItem('preply-authenticated', 'true');
        if (data.user?.email) localStorage.setItem('preply-account-email', data.user.email);
      }
      return data;
    }
  };
})();

