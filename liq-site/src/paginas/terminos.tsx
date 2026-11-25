import { montar } from "../montar";
import { PaginaLegal } from "../componentes/Marco";
import { EMAIL } from "../config";

montar(
  <PaginaLegal titulo="Términos y condiciones">
    <h2>1. Qué es Liquidación</h2>
    <p>Liquidación es una aplicación de escritorio para registrar prestaciones médicas por obra social y preparar la planilla de facturación. No emite comprobantes fiscales.</p>

    <h2>2. Cuenta y planes</h2>
    <p>Para usar la aplicación hace falta una cuenta, que se verifica por internet cada vez que se abre. Cada plan permite una cantidad máxima de profesionales. El plan de prueba es gratuito; los planes pagos se abonan [completar: forma y período de pago].</p>

    <h2>3. Dónde quedan los datos y quién es responsable</h2>
    <p>Los datos de pacientes y prestaciones se guardan únicamente en la computadora del usuario. [RESPONSABLE] no tiene acceso a ellos ni copia de ellos.</p>
    <p>El profesional de la salud es el responsable de la base de datos de sus pacientes en los términos de la Ley 25.326. Quien usa la aplicación declara cargar datos por cuenta y orden de ese profesional y contar con su autorización.</p>

    <h2>4. Obligaciones del usuario</h2>
    <ul>
      <li>Mantener la contraseña en secreto y no compartir la cuenta.</li>
      <li>Cargar solo los datos necesarios para facturar (no diagnósticos ni notas clínicas).</li>
      <li>Proteger el acceso a la computadora donde está instalada la aplicación.</li>
      <li>Hacer copias de seguridad de sus datos: si se pierden en su computadora, [RESPONSABLE] no puede recuperarlos.</li>
    </ul>

    <h2>5. Baja del servicio</h2>
    <p>El usuario puede dar de baja su cuenta en cualquier momento escribiendo a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Al hacerlo se borran sus datos de cuenta. Los datos guardados en su computadora siguen ahí y son del usuario. [Completar: qué pasa con los planes pagos al darse de baja.]</p>

    <h2>6. Contacto</h2>
    <p>[Completar: nombre o razón social, CUIT y domicilio.] Email: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
  </PaginaLegal>,
);
