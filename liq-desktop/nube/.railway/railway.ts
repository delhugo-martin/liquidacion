// Configuración de Railway para la nube de Liquidación (cuentas y planes).
//
// Se aplica a mano desde esta carpeta (liq-desktop/nube):
//   npm install -D railway     (una sola vez)
//   railway login
//   railway link               (elegí el proyecto de Railway)
//   railway config plan        (muestra qué va a cambiar, sin tocar nada)
//   railway config apply       (lo aplica)
//
// Hacer `git push` NO aplica este archivo: solo vuelve a desplegar el código.
// Volvé a correr `railway config apply` solo si cambiás algo acá.

import { defineRailway, github, postgres, project, service } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");

  const nube = service("nube", {
    source: github("delhugo-martin/liquidacion", {
      branch: "main",
      rootDirectory: "liq-desktop/nube",
    }),
    build: "npm run build",
    // Aplica las migraciones pendientes antes de cada despliegue; si fallan, no se publica la versión nueva.
    preDeploy: "npm run migrar:prod",
    start: "npm start",
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      // Railway pone un proxy HTTPS adelante: hace falta para que el límite de intentos de ingreso vea la IP real.
      TRUST_PROXY: "1",
      // PORT no va: Railway la define sola y config.ts ya la lee.
    },
  });

  return project("liquidacion", { resources: [nube, db] });
});
