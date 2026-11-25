# Facturación de prestaciones por obra social

Sitio web para que facturistas registren las consultas y prácticas de los profesionales para los que trabajan, por obra social, con aranceles, totales gravado/no gravado y exportación a Excel (CSV).

- **web/**: frontend en React + TypeScript (Vite)
- **server/**: API en Node + Express + TypeScript
- **Postgres**: base de datos, con Row Level Security para separar los datos de cada facturista

## Cómo está organizado

```
Usuario (facturista)
 └─ Profesionales (varios)
     └─ Obras sociales (SANCOR, NOBIS, …)
         ├─ Aranceles (código, nombre, monto)
         └─ Prestaciones (consultas y prácticas)
```

Un facturista **nunca** ve los datos de otro. Esto se garantiza en dos capas:

1. Cada tabla tiene `usuario_id` y las claves foráneas compuestas impiden mezclar filas de usuarios distintos.
2. **Row Level Security**: la API abre cada pedido como una transacción con `app.usuario_id` fijado (`comoUsuario()` en `server/src/db.ts`), y Postgres solo devuelve o modifica filas de ese usuario, aunque una consulta tenga un error.

> ⚠️ El usuario de Postgres que usa la app **no puede ser superusuario ni tener BYPASSRLS**, porque esos roles saltean RLS. `npm run migrar` lo verifica y se niega a correr si lo es.

Cada alta, cambio o baja de prestaciones, aranceles y unidades queda en la tabla `auditoria`, que es de "solo agregar": ni siquiera el usuario de la aplicación puede modificar o borrar sus filas.

## Correrlo en tu compu

Necesitás **Node 22 o más nuevo** y **Docker** (o un Postgres 16 instalado).

```bash
# 1. Base de datos
docker compose up -d

# 2. Backend
cd server
cp .env.example .env        # revisá los valores
npm install
npm run migrar              # crea las tablas
npm run dev                 # API en http://localhost:3000

# 3. Frontend (en otra terminal)
cd web
npm install
npm run dev                 # abrí http://localhost:5173
```

Creá una cuenta, agregá un profesional, una obra social y sus aranceles, y empezá a cargar.

Si usás un Postgres propio en vez de Docker, creá el usuario y la base así (como administrador):

```sql
CREATE ROLE facturacion LOGIN PASSWORD 'una_clave_segura';
CREATE DATABASE facturacion OWNER facturacion;
```

## Publicarlo en internet

El backend sirve también el frontend compilado, así que alcanza con un solo servicio más una base de datos.

```bash
cd web && npm install && npm run build      # genera web/dist
cd ../server && npm install && npm run build
NODE_ENV=production npm run migrar:prod && NODE_ENV=production npm start
```

Variables en el hosting: `DATABASE_URL`, `APP_ORIGIN` (la dirección pública, por ej. `https://facturacion.com.ar`), `NODE_ENV=production`, `PORT`.

Opciones razonables para empezar: Render, Railway o Fly.io para el servicio, y su Postgres administrado (o Neon). Usá siempre HTTPS (los tres lo dan gratis) y activá los backups automáticos de la base.

## Antes de abrirlo al público

Funciona, pero para datos de salud de terceros falta esto:

- [ ] **Revisión legal** de `web/public/terminos.html` y `web/public/privacidad.html` (son borradores) y del acuerdo de tratamiento de datos con cada profesional. Inscripción ante la AAIP.
- [ ] **Verificación de email** y **recuperar contraseña** (requiere un servicio de envío de emails, por ej. Resend o Amazon SES).
- [ ] **Segundo factor (2FA)** opcional para las cuentas.
- [ ] **Backups** automáticos y una prueba de restauración.
- [ ] **Exportar y borrar todos los datos de una cuenta** (derechos de los titulares y baja del servicio).
- [ ] Monitoreo de errores (por ej. Sentry) sin enviar datos de pacientes.

## Ideas para seguir

- Importar las planillas de Excel existentes.
- Resumen mensual por profesional con todas sus obras sociales.
- Varios facturistas compartiendo un mismo profesional (consultorios grandes).
- Generar la presentación en el formato que pide cada obra social.
