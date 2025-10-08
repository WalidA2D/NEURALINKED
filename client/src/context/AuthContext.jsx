// client/src/context/AuthContext.jsx
import { createContext, useContext, useState } from "react";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function register(username, email, password) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // 🔁 Adapter les noms pour le backend
      body: JSON.stringify({
        pseudo: username,
        email,
        mot_de_passe: password,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || "Inscription impossible");
    }

    // tu peux stocker le token et l'user ici
    if (data?.data?.token) {
      localStorage.setItem("token", data.data.token);
    }
    setUser({
      id: data?.data?.id,
      pseudo: data?.data?.pseudo,
      email: data?.data?.email,
    });
    return data;
  }

  async function login(identifiant, mot_de_passe) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, mot_de_passe }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Connexion impossible");
    if (data?.data?.token) localStorage.setItem("token", data.data.token);
    setUser({
      id: data?.data?.id,
      pseudo: data?.data?.pseudo,
      email: data?.data?.email,
    });
    return data;
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  const value = { user, register, login, logout };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
