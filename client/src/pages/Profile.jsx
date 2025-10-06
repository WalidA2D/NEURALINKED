import { useAuth } from "../context/AuthContext.jsx";
export default function Profile() {
  const { user } = useAuth();
  return (
    <div>
      <h2>Profil</h2>
      {user ? (
        <ul>
          <li>Pseudo : {user.pseudo}</li>
          <li>Email : {user.email}</li>
        </ul>
      ) : <p>Non connecté.</p>}
    </div>
  );
}
