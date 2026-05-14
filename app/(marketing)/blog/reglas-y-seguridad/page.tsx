import type { Metadata } from "next";
import Link from "next/link";
import { BlogArticleLayout } from "../_article-layout";
import { getPostBySlug } from "../_posts";
import { SITE_URL } from "../../../_components/site-constants";

const SLUG = "reglas-y-seguridad";
const post = getPostBySlug(SLUG)!;
const PAGE_URL = `${SITE_URL}/blog/${SLUG}`;

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: post.title,
    description: post.description,
    url: PAGE_URL,
    siteName: "Experiencia Airsoft",
    type: "article",
    locale: "es_AR",
    publishedTime: post.date,
  },
};

export default function Post() {
  return (
    <BlogArticleLayout slug={SLUG}>
      <p>
        El airsoft funciona gracias a reglas universales que todos los
        campos serios respetan. No son arbitrarias — están pensadas para
        que el deporte sea seguro y disfrutable para todos. Si nunca
        jugaste, este artículo te explica las básicas en 5 minutos.
      </p>

      <h2>1. Protección facial siempre puesta</h2>
      <p>
        <strong>Esta es la regla número uno y no admite excepciones.</strong>{" "}
        Una bb plástica a 90 m/s contra un ojo descubierto causa daño
        severo. Por eso en zonas de juego ("zona caliente") los anteojos
        reglamentarios están puestos en todo momento — incluso si tu
        marcadora está descargada, incluso si "es solo un segundo".
      </p>
      <p>
        Los anteojos de calle (incluso los de sol) <strong>no
        sirven</strong> — se rompen con el impacto y los fragmentos lastiman
        más. Los que provee el campo cumplen norma ANSI Z87.1 o equivalente.
      </p>

      <h2>2. Límite de potencia · 330 FPS indoor</h2>
      <p>
        Las marcadoras se miden en <em>FPS</em> (feet per second / pies por
        segundo). En campos indoor el límite estándar es 330 FPS con bb de
        0.20g — es energía suficiente para que duela y respete el deporte,
        pero no tanta que cause lesiones graves a corta distancia.
      </p>
      <p>
        Antes de cada partida el campo te puede pedir{" "}
        <strong>chequeo de cronógrafo</strong> — un sensor que mide la
        velocidad real de tu marcadora. Si pasaste el límite, no entrás.
      </p>

      <h2>3. Honor system · si te dieron, te declarás</h2>
      <p>
        A diferencia del paintball (donde la pintura te marca visiblemente),
        en airsoft <strong>cada jugador es responsable de declarar sus
        propios impactos</strong>. Cuando te dan, gritás "¡HIT!" o "¡MUERTO!",
        levantás un brazo y caminás hacia la zona de respawn.
      </p>
      <p>
        Esto requiere fair play. Si querés ganar a costa de no declararte —
        el deporte deja de funcionar y todos lo notan. La comunidad de
        airsoft confía en el honor de cada jugador y la trampa se castiga
        con expulsión.
      </p>
      <p>
        <strong>Reglas concretas de declaración:</strong>
      </p>
      <ul>
        <li>
          Te impacta un BB en cuerpo, ropa, marcadora o equipo → estás
          fuera.
        </li>
        <li>
          Te impacta en la marcadora pero no estás seguro → declarás igual
          (regla de duda).
        </li>
        <li>
          Te impacta tu propio compañero por error (fuego amigo) → seguís
          estando fuera. No cuenta menos.
        </li>
      </ul>

      <h2>4. Distancia mínima de seguridad · MED</h2>
      <p>
        Las marcadoras de alta potencia (300+ FPS) impactando a menos de
        3-5 metros pueden hacer daño real. Por eso existe la regla MED
        (<em>Minimum Engagement Distance</em>): si tenés a un enemigo a
        menos de la distancia mínima, no disparás —{" "}
        <strong>le decís "DEAD" o le tocás el hombro</strong> y queda fuera
        sin disparo.
      </p>
      <p>
        En CQB indoor donde las distancias son cortas, esto se vuelve
        crítico. Buenas prácticas:
      </p>
      <ul>
        <li>Si abrís una puerta y hay alguien a 2 metros: "DEAD", no
        dispares.</li>
        <li>Si dudás de la distancia, usá la voz antes que el dedo del
        gatillo.</li>
      </ul>

      <h2>5. Modo seguro fuera de zona</h2>
      <p>
        En la <em>zona fría</em> (área social, vestuarios, salida del campo)
        las marcadoras van en{" "}
        <strong>safe + cargador desconectado + mira hacia el piso</strong>.
        Nadie apunta a nadie fuera de la zona de juego, ni para mostrarla
        ni para "una foto".
      </p>
      <p>
        El staff puede pedirte revisar tu marcadora en cualquier momento.
        Es para asegurar que respetás la zona.
      </p>

      <h2>6. Edad mínima · 18 años</h2>
      <p>
        En Argentina la edad mínima para jugar airsoft es 18 años. Es
        norma legal — las marcadoras pueden confundirse con armas reales
        fuera del campo, y se reserva el deporte a personas que pueden
        responsabilizarse del transporte y manejo. <strong>En Experiencia
        Airsoft pedimos DNI</strong> el día de la partida sin excepciones.
      </p>

      <h2>7. Cero alcohol o sustancias</h2>
      <p>
        Manejar una marcadora bajo efectos de alcohol o drogas pone en
        riesgo a todos. Si llegás visiblemente alterado, no entrás a la
        cancha — sin reembolso. La regla protege al grupo entero.
      </p>

      <h2>8. Reglas específicas del campo</h2>
      <p>
        Además de las universales, cada campo tiene reglas propias que se
        explican en el briefing inicial:
      </p>
      <ul>
        <li>Códigos de comunicación (CONTACT, RELOADING, FRAG OUT)</li>
        <li>
          Zonas donde no se puede disparar (puntos de respawn, vestuarios)
        </li>
        <li>
          Reglas de la modalidad del día (eliminación, captura, defensa,
          etc.)
        </li>
        <li>Tiempos de respawn (si los hay)</li>
      </ul>

      <h2>Qué pasa si rompés una regla</h2>
      <p>
        Depende. La gradiente típica:
      </p>
      <ol>
        <li>
          <strong>Aviso verbal del staff</strong> — primera vez, cosas menores.
        </li>
        <li>
          <strong>Pausa de partida</strong> — te sentás afuera una ronda.
        </li>
        <li>
          <strong>Expulsión del día</strong> — sin reembolso, regla grave o
          repetición.
        </li>
        <li>
          <strong>Expulsión definitiva del campo</strong> — fair play
          violado de forma intencional, agresión, etc.
        </li>
      </ol>
      <p>
        La gran mayoría de jugadores no llega ni al primer aviso. Las
        reglas son intuitivas una vez que las escuchás en el briefing.
      </p>

      <h2>En resumen</h2>
      <ul>
        <li>Anteojos puestos en zona caliente. Siempre.</li>
        <li>Marcadora 330 FPS o menos.</li>
        <li>Si te dan, te declarás. Honor.</li>
        <li>MED: si está muy cerca, "DEAD" en vez de disparar.</li>
        <li>Marcadora segura fuera del campo.</li>
        <li>+18 con DNI.</li>
        <li>Cero alcohol antes de jugar.</li>
        <li>Escuchá el briefing y respetá al staff.</li>
      </ul>
      <p>
        Eso es todo. No es complicado y se entiende muy rápido en cancha.
        Si tenés dudas sobre cómo prepararte,{" "}
        <Link href="/primera-vez">leé la guía de primera vez</Link> o{" "}
        <Link href="/blog/equipamiento-principiantes">
          el post sobre equipamiento básico
        </Link>
        .
      </p>
    </BlogArticleLayout>
  );
}
