# Sitio de presentación — Liquidación

Sitio hecho con **React + Vite + TypeScript** que presenta la versión de escritorio con cuenta (`liq-desktop`). Al compilarlo queda un sitio estático (HTML, CSS y JS) que se sube a cualquier hosting.

```
index.html, terminos.html, privacidad.html   Las tres páginas (cada una carga su archivo de src/paginas/)
src/
├── config.ts          ⚠ WhatsApp, email, enlace de descarga y planes con precios: lo que hay que completar
├── montar.tsx         Monta cada página (fuentes y estilos)
├── estilos.css        Estilos (misma paleta que la app, modo claro y oscuro)
├── paginas/           inicio.tsx, terminos.tsx, privacidad.tsx
└── componentes/
    ├── Marco.tsx      Barra de arriba, pie y armado de las páginas legales
    ├── Portada.tsx    Título, botones de descarga y la vista de la app (con datos inventados)
    ├── Secciones.tsx  Qué hace, Tus datos, Cómo empezar, Planes, Preguntas y Contacto
    └── Icono.tsx      Íconos
public/
├── favicon.svg
└── descargas/         Acá va el instalador de Windows
```

## Trabajar en el sitio

```bash
npm install
npm run dev        # http://localhost:5180, se recarga solo al guardar
```

## Antes de publicar

- **`src/config.ts`**: número de WhatsApp, email y precios (los actuales, $15.000 y $30.000, son de EJEMPLO). La cantidad de profesionales de cada plan tiene que coincidir con la tabla `planes` de la nube.
- **Instalador**: copiá `liq-desktop/app/release/Liquidación Setup x.y.z.exe` a `public/descargas/Liquidacion-Setup.exe` (sin espacios ni tildes). Pesa ~120 MB: si el hosting no acepta archivos grandes, subilo a GitHub Releases o a Google Drive y poné esa dirección en `DESCARGA_WINDOWS` de `config.ts`.
- **Términos y privacidad** (`src/paginas/`): completar lo que está entre corchetes y hacerlos revisar por un abogado. Después sacar el recuadro "BORRADOR" de `PaginaLegal` en `Marco.tsx`.

## Publicarlo

```bash
npm run build      # deja el sitio listo en dist/
npm run preview    # para mirarlo tal cual va a quedar
```

Se sube el contenido de `dist/` a cualquier hosting de sitios estáticos (Netlify, Cloudflare Pages, GitHub Pages, o el mismo servidor de la nube). Las rutas son relativas, así que funciona tanto en la raíz del dominio como en una subcarpeta.
