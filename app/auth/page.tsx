"use client";
import { useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { firebaseConfig } from "@/lib/firebase-client";

if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const auth = getAuth();

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  // New fields for signup
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess("Logged in successfully!");
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Save name and phone to Firebase user profile
        await updateProfile(cred.user, {
          displayName: name,
          // Firebase Auth does not have a phone field by default, so we can store it in user metadata or a custom claim if needed
        });
        // Optionally, save phone to localStorage or a database for now
        if (phone) {
          localStorage.setItem(`user_phone_${cred.user.uid}`, phone);
        }
        setSuccess("Account created! You are now logged in.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[var(--background)]">
      <div className="bg-[var(--card)] rounded-lg shadow-lg p-8 w-full max-w-md border border-[var(--border)]">
        <h1 className="text-3xl font-bold mb-6 text-center text-[var(--primary)]">
          {isLogin ? "Login to Compete" : "Sign Up for Compete"}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                className="w-full px-4 py-2 rounded border border-[var(--input)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full px-4 py-2 rounded border border-[var(--input)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-2 rounded border border-[var(--input)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-2 rounded border border-[var(--input)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-500 text-sm">{success}</div>}
          <button
            type="submit"
            className="w-full py-2 rounded bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold hover:bg-[var(--accent)] transition"
            disabled={loading}
          >
            {loading ? (isLogin ? "Logging in..." : "Signing up...") : (isLogin ? "Login" : "Sign Up")}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            className="text-[var(--accent)] hover:underline"
            onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </main>
  );
}
