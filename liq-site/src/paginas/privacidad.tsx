import { montar } from "../montar";
import { PaginaLegal } from "../componentes/Marco";
import { EMAIL } from "../config";

montar(
  <PaginaLegal titulo="Política de privacidad">
    <h2>Qué datos guardamos nosotros</h2>
    <p>Solo los de tu cuenta, en nuestro servidor:</p>
    <ul>
      <li>Nombre y email.</li>
      <li>Contraseña, guardada cifrada (nunca en texto plano).</li>
      <li>Plan contratado y cantidad de profesionales cargados, para aplicar el límite del plan.</li>
    </ul>

    <h2>Qué datos quedan en tu computadora</h2>
    <p>Todo lo que cargás en la aplicación: profesionales, obras sociales, aranceles, pacientes (apellido y nombre, número de afiliado, plan) y prestaciones (fecha, código, monto y condición frente al IVA). Son datos de salud (datos sensibles, Ley 25.326, art. 7). <strong>Nunca se envían a nuestro servidor</strong> y no tenemos acceso a ellos.</p>

    <h2>Para qué usamos los datos de tu cuenta</h2>
    <p>Únicamente para dejarte entrar a la aplicación, aplicar el límite de tu plan y contactarte por temas del servicio. No los vendemos, no los compartimos y no los usamos para publicidad.</p>

    <h2>Cómo los protegemos</h2>
    <p>La conexión con nuestro servidor es cifrada (HTTPS) y las contraseñas se guardan cifradas. En tu computadora, la sesión queda guardada cifrada con tu usuario de Windows. La protección de los datos locales depende también de tu computadora: usá una contraseña de Windows y hacé copias de seguridad.</p>

    <h2>Dónde está nuestro servidor</h2>
    <p>[Completar: proveedor de hosting y país de los servidores. Si están fuera de Argentina, indicar las garantías de transferencia internacional.]</p>

    <h2>Tus derechos</h2>
    <p>Podés pedir acceso, rectificación o supresión de los datos de tu cuenta escribiendo a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Los pacientes deben dirigir esos pedidos al profesional responsable de sus datos. La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende denuncias y reclamos.</p>
  </PaginaLegal>,
);
