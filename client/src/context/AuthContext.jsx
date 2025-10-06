import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    let ignore = false;
    async function me() {
      try {
        const data = await api("/api/auth/me", { token });
        if (!ignore) setUser(data.user);
      } catch {
        if (!ignore) { localStorage.removeItem("token"); setToken(null); }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    if (token) me(); else setLoading(false);
    return () => { ignore = true; };
  }, [token]);

 async function login(identifier, password) {
    // Vous décidez ici si c’est un email ou un username
    const isEmail = identifier.includes("@");
    const body = isEmail
      ? { email: identifier, password }
      : { username: identifier, password };

    return api.post("/auth/login", body); // adapte à ton API
  }
  async function register(pseudo, email, password) {
    const data = await api("/api/auth/register", { method: "POST", body: { pseudo, email, password } });
    localStorage.setItem("token", data.token); setToken(data.token); setUser(data.user);
  }
  async function logout() {
    if (token) await api("/api/auth/logout", { method: "POST", token });
    localStorage.removeItem("token"); setToken(null); setUser(null);
  }

  return <AuthCtx.Provider value={{ user, token, loading, login, register, logout }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);