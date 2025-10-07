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
                // ✅ CORRECTION : Passer le token dans les headers
                const data = await api("/api/auth/profile", {
                    method: "GET",
                    token: token
                });
                if (!ignore) setUser(data.data);
            } catch (error) {
                console.error("Erreur profil:", error);
                if (!ignore) {
                    localStorage.removeItem("token");
                    setToken(null);
                    setUser(null);
                }
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        if (token) me();
        else setLoading(false);

        return () => { ignore = true; };
    }, [token]);

    // Fonction login (déjà correcte)
    async function login(identifier, password) {
        const body = {
            identifiant: identifier,
            mot_de_passe: password
        };

        const data = await api("/api/auth/login", {
            method: "POST",
            body: body
        });

        localStorage.setItem("token", data.data.token);
        setToken(data.data.token);
        setUser(data.data);
        return data;
    }

    // Fonction register (déjà correcte)
    async function register(pseudo, email, password) {
        const body = {
            pseudo: pseudo,
            email: email,
            mot_de_passe: password
        };

        const data = await api("/api/auth/register", {
            method: "POST",
            body: body
        });

        localStorage.setItem("token", data.data.token);
        setToken(data.data.token);
        setUser(data.data);
        return data;
    }

    async function logout() {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }

    return (
        <AuthCtx.Provider value={{
            user,
            token,
            loading,
            login,
            register,
            logout
        }}>
            {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);