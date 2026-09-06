// Docker collecte déjà stdout et applique la rotation configurée dans Compose.
// Garder une seule sortie évite des écritures en double sur la carte SD.
export function customLogger(message: string, ...rest: string[]) {
  if (process.env.NODE_ENV === "test") return;
  console.log(message, ...rest);
}
