// client/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  // Récupérer le token au chargement
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  async function register(username, email, password) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    // Stocker le token et l'user
    if (data?.data?.token) {
      localStorage.setItem("token", data.data.token);
      setToken(data.data.token);
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

    if (data?.data?.token) {
      localStorage.setItem("token", data.data.token);
      setToken(data.data.token);
    }
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
    setToken(null);
  }

  // Ajoutez token dans la valeur du contexte
  const value = {
    user,
    token, // ← IMPORTANT: exposez le token
    register,
    login,
    logout
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}