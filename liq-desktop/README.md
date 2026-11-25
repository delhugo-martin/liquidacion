# Liquidación — versión de escritorio

Misma aplicación que `liq-web`, pero los datos de los profesionales, pacientes y prestaciones **se guardan en la PC** del facturista. Internet solo se usa para la cuenta.

```
liq-desktop/
├── nube/   Servidor de cuentas (Node + Express + Postgres). Guarda SOLO:
│           email, nombre, contraseña (hash), plan y cuántos profesionales tiene cargados.
└── app/    Aplicación de escritorio (Electron + React). Guarda todo lo demás en SQLite, en la PC.
```

## Cómo funciona

- **Ingresar**: la app pide email y contraseña y los valida contra la nube. **Sin internet no deja entrar.** La sesión queda guardada cifrada con el usuario de Windows (no hace falta escribir la contraseña cada vez), pero igual se verifica contra la nube cada vez que se abre la app y cada 10 minutos.
- **Datos locales**: cada cuenta tiene su propio archivo SQLite en la carpeta de datos de la app:
  - Windows: `%APPDATA%\Liquidación\datos\<id de la cuenta>.sqlite`
  - Linux: `~/.config/Liquidación/datos/<id de la cuenta>.sqlite`
- **Planes**: antes de agregar un profesional, la app le pregunta a la nube si el plan lo permite. Al borrar uno, le avisa la cantidad nueva. Los planes están en la tabla `planes` de la nube (por ahora: Prueba = 1, Básico = 3, Profesional = 10). Para cambiar el plan de una cuenta: `UPDATE usuarios SET plan = 'basico' WHERE email = '...'`.
- **Exportar**: arma el Excel o CSV y abre "Guardar como".
- **Auditoría**: cada alta, cambio o baja de prestaciones, aranceles y unidades queda en la tabla `auditoria` de la base local, que no se puede modificar ni borrar.

Las pantallas son las mismas que en `liq-web` (`app/src/renderer` es una copia de `liq-web/web/src`); lo único distinto es `api.ts`, que en vez de hablar con un servidor le pide a la app (`app/src/main/rutas.ts` hace lo mismo que `liq-web/server/src/rutas/datos.ts`, pero con SQLite).

## Correrlo en tu compu

Necesitás **Node 22 o más nuevo** y un Postgres para la nube.

```bash
# 1. Nube (en una terminal)
cd nube
cp .env.example .env        # completá DATABASE_URL (base y usuario propios, ver abajo)
npm install
npm run migrar              # crea las tablas
npm run dev                 # queda escuchando en http://localhost:3100

# 2. App (en otra terminal)
cd app
npm install
npm run dev                 # abre la ventana; se recarga sola al guardar cambios de la interfaz
```

Para crear la base de la nube (como administrador de Postgres):

```sql
CREATE ROLE liquidacion_nube LOGIN PASSWORD 'una-clave-larga-y-aleatoria';
CREATE DATABASE liquidacion_nube OWNER liquidacion_nube;
```

## Armar el instalador

1. En `app/src/main/index.ts`, poner en `NUBE_URL` la dirección real de la nube (tiene que ser `https://`; la app instalada no acepta otra cosa).
2. Windows: `npm run dist:win` **en una PC con Windows** (desde Linux hace falta Wine). Queda en `app/release/`.
3. Linux: `npm run dist:linux` (AppImage).

## Pendiente

- **Copias de seguridad**: los datos están solo en la PC. Si se rompe el disco, se pierden. Falta agregar un botón de "Guardar copia de seguridad" (o recomendar copiar la carpeta de datos).
- **Cifrado del archivo de datos**: hoy lo protege la cuenta de Windows. Si la PC la usa más gente con el mismo usuario, conviene cifrarlo o activar BitLocker.
- **Firma del instalador**: sin un certificado de firma de código, Windows muestra "Editor desconocido" al instalar.
- **Pago de suscripciones**: la nube guarda el plan, pero todavía no hay forma de pagar ni de cambiarlo desde la app.
