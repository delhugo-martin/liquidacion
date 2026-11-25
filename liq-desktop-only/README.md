# Liquidación — versión solo escritorio (prueba)

Igual que `liq-desktop/app`, pero **sin cuenta ni servidor**: la app abre directo, sin iniciar sesión, y no usa internet para nada. Sirve para probarla en varias computadoras sin tener la nube publicada.

- **No hay límite de profesionales** (no hay planes).
- **Datos**: todo queda en un solo archivo SQLite en la PC:
  - Windows: `%APPDATA%\Liquidación Local\datos\local.sqlite`
  - Linux: `~/.config/Liquidación Local/datos/local.sqlite`
  Para pasar los datos a otra PC, o hacer una copia de seguridad, copiar ese archivo con la app cerrada.
- Se llama "Liquidación Local" para que no se mezcle con la versión con cuenta si están instaladas las dos.
- Lo demás es igual: aranceles por monto o unidad, fechas dd/mm/aa, autocompletado de afiliados, exportar a Excel/CSV con "Guardar como" y auditoría local que no se puede borrar.

## Correrla

Necesitás Node 22 o más nuevo.

```bash
npm install
npm run dev        # abre la ventana
```

Si `npm install` no termina de bajar Electron (la ventana no abre), correr `node node_modules/electron/install.js`.

## Armar el instalador

- Windows: `npm run dist:win` en una PC con Windows (desde Linux hace falta Wine). Queda en `release/`.
- Linux: `npm run dist:linux` (AppImage).

Sin certificado de firma, Windows muestra "Editor desconocido" al instalar: hay que tocar "Más información" → "Ejecutar de todas formas".
