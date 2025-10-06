# NEURALINKED — Installation & Lancement (Client + Server)

Projet composé de **deux dossiers** :

* `client/` → Frontend **React + Vite**
* `server/` → Backend **Node.js + Socket.IO**

## ✅ Prérequis

* **Node.js 18+** (inclut `npm`)
* **Git**

Vérifier rapidement :

```bash
node -v
npm -v
git --version
```

---

## 🚀 1) Cloner le dépôt

Dans le dossier où tu veux installer le projet (Documents/Dev, etc.) :

```bash
git clone https://github.com/WalidA2D/NEURALINKED.git
cd NEURALINKED
```

À partir de maintenant, on travaille **dans `NEURALINKED/`**.

---

## 🌐 2) Installer et lancer le FRONTEND (client)

### 2.1 Se placer dans `client/`

```bash
cd client
```

### 2.2 Créer le fichier d’environnement

Créer **`client/.env`** avec le contenu suivant :

```
VITE_SOCKET_URL=http://localhost:3001
```

> C’est l’URL où tourne le serveur Socket.IO en local.

### 2.3 Installer les dépendances du client

```bash
npm install
```

> Si tu as une erreur du type `Failed to resolve import 'socket.io-client'` :

```bash
npm install socket.io-client
```

### 2.4 Lancer le client (terminal 1)

```bash
npm run dev
```

* Vite démarre (par défaut) sur **[http://localhost:5173](http://localhost:5173)**
* **Laisse ce terminal ouvert.**

---

## ⚙️ 3) Installer et lancer le BACKEND (server)

### 3.1 Ouvrir **un nouveau terminal**

Ne ferme pas le terminal du client. Ouvre un **deuxième** terminal.

### 3.2 Se placer dans `server/`

Depuis le nouveau terminal :

```bash
cd NEURALINKED/server
```

### 3.3 (Optionnel) Créer un `.env` serveur

Si le serveur lit des variables d’environnement, créer **`server/.env`** :

```
PORT=3001
```

> Garde 3001 pour correspondre au `VITE_SOCKET_URL` côté client.

### 3.4 Installer les dépendances du serveur

```bash
npm install
```

### 3.5 Lancer le serveur (terminal 2)

```bash
# en développement (si nodemon est configuré)
npm run dev

# sinon, lancement standard
# npm start
```

Le serveur est disponible sur **[http://localhost:3001](http://localhost:3001)**.

> Assure-toi que le serveur autorise le **CORS** depuis `http://localhost:5173` (côté code Socket.IO/Express).

---

## 🧪 4) Vérifier que tout fonctionne

1. Va sur **[http://localhost:5173](http://localhost:5173)**
2. Ouvre la console du navigateur (F12) :

   * Pas d’erreur `socket.io-client` manquante
   * Pas d’erreur de connexion WebSocket/CORS
3. Tu peux **créer une partie** ou **rejoindre par code**
4. Le **chat temps réel** fonctionne pendant la partie

---

## 🧰 Mémo ultra-rapide (où se placer, quoi taper)

**Terminal 1 — FRONTEND**

```bash
cd NEURALINKED/client
npm install
# (si besoin)
npm install socket.io-client
npm run dev
```

**Terminal 2 — BACKEND**

```bash
cd NEURALINKED/server
npm install
# (optionnel)
# echo PORT=3001 > .env
npm run dev    # ou npm start
```

---

## ❗ Dépannage

* **Le client ne se connecte pas au serveur**

  * `client/.env` → `VITE_SOCKET_URL=http://localhost:3001`
  * Le serveur tourne bien ? (`server/` → `npm run dev` ou `npm start`)
  * CORS autorisé côté serveur pour `http://localhost:5173`

* **Port occupé**

  * Change `PORT` dans `server/.env` (ex: 3002) **et** adapte `VITE_SOCKET_URL` côté client.
  * Relance client + serveur.

* **Node trop ancien**

  * Mets à jour Node (v18+). Vérifie avec `node -v`.

---

## 📝 Rappel du jeu

* **2–5 joueurs**, **5 énigmes dans l’ordre**, **15 minutes**
* **Chat temps réel**
* Flux : Connexion → Lobby (créer/rejoindre par code) → Salle d’attente → Partie → Retour lobby
