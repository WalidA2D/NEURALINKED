// Générer un code de salle unique (6 caractères alphanumériques)
export function generateRoomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Valider un code de salle
export function isValidRoomCode(code) {
    return typeof code === 'string' &&
        code.length === 6 &&
        /^[A-Z0-9]+$/.test(code);
}