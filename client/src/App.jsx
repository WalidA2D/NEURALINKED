import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Lobby from "./pages/Lobby.jsx";
import Profile from "./pages/Profile.jsx";
import WaitingRoom from "./pages/WaitingRoom.jsx";
import PuzzleLayout from "./pages/game/PuzzleLayout.jsx";
import Puzzle1 from "./pages/game/puzzles/Puzzle1.jsx";
import Puzzle2 from "./pages/game/puzzles/Puzzle2.jsx";
import Puzzle3 from "./pages/game/puzzles/Puzzle3.jsx";
import Puzzle4 from "./pages/game/puzzles/Puzzle4.jsx";
import RoomLayout from "./layouts/RoomLayout.jsx"; // ⬅️ nouveau

import "./App.css";

function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav>
      <header className="home__top">
        <nav className="home__nav_brand">
          <Link to="/" className="home__brand">Neuralinked</Link>
        </nav>

        <div style={{ display: "flex", gap: 12 }}>
          {user ? (
            <>
              <span>Bonjour, {user.pseudo}</span>
              <nav className="home__nav">
                <Link to="/lobby">Lobby</Link>
                <Link to="/profil">Profil</Link>
              </nav>
              <button onClick={logout}>Déconnexion</button>
            </>
          ) : null}
        </div>
      </header>
    </nav>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Chargement…</div>;

  const devBypass =
    typeof window !== "undefined" &&
    localStorage.getItem("mockAuth") === "1";

  return (user || devBypass) ? children : <Navigate to="/connexion" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />

          <Route path="/lobby" element={<Lobby />} />
          <Route path="/profil" element={<Protected><Profile /></Protected>} />

          {/* ⬇️ RoomLayout fournit RoomProvider à Attente + Partie */}
          <Route element={<RoomLayout />}>
            <Route path="/attente/:roomId" element={<WaitingRoom />} />
            <Route path="/partie/:roomId/*" element={<PuzzleLayout />}>
              <Route path="enigme/1" element={<Puzzle1 />} />
              <Route path="enigme/2" element={<Puzzle2 />} />
              <Route path="enigme/3" element={<Puzzle3 />} />
              <Route path="enigme/4" element={<Puzzle4 />} />
              <Route index element={<Navigate to="enigme/1" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
