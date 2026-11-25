// ============================================================================
//  DATOS DEL SITIO: lo que hay que completar antes de publicar está acá.
// ============================================================================

/** Número de WhatsApp en formato internacional, sin + ni espacios: 549 + característica sin 0 + número sin 15. */
export const WHATSAPP = "549CAMBIAR";

/** Email de contacto. */
export const EMAIL = "contacto@CAMBIAR.com.ar";

/**
 * Enlace al instalador de Windows. Si lo copiás a public/descargas/, dejalo así.
 * Si lo subís a otro lado (GitHub Releases, Google Drive), poné la dirección completa.
 */
export const DESCARGA_WINDOWS = "descargas/Liquidacion-Setup.exe";

export interface Plan {
  nombre: string;
  para: string;
  /** null = gratis */
  precioMensual: number | null;
  /** Tiene que coincidir con la tabla `planes` de la nube. */
  profesionales: number;
  destacado?: boolean;
}

/** OJO: los precios son de EJEMPLO. */
export const PLANES: Plan[] = [
  { nombre: "Prueba", para: "Para conocer la aplicación.", precioMensual: null, profesionales: 1 },
  { nombre: "Básico", para: "Para quien factura a pocos médicos.", precioMensual: 15000, profesionales: 3, destacado: true },
  { nombre: "Profesional", para: "Para estudios de facturación.", precioMensual: 30000, profesionales: 10 },
];

// ----------------------------------------------------------------------------

export const enlaceWhatsApp = (texto = "Hola, quiero consultar por Liquidación") =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;

export const enlaceEmail = (asunto = "Consulta por Liquidación") =>
  `mailto:${EMAIL}?subject=${encodeURIComponent(asunto)}`;

export const pesos = (n: number) => `$ ${n.toLocaleString("es-AR")}`;
