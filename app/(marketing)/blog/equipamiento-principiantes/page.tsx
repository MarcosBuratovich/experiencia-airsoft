import type { Metadata } from "next";
import Link from "next/link";
import { BlogArticleLayout } from "../_article-layout";
import { getPostBySlug } from "../_posts";
import { SITE_URL } from "../../../_components/site-constants";

const SLUG = "equipamiento-principiantes";
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
        Si tu primera partida es en un campo organizado como Experiencia
        Airsoft con alquiler, no necesitás comprar nada — tenemos todo el
        equipo listo. Pero igual conviene saber qué está incluido, qué
        podés sumar y qué <strong>NO</strong> tenés que traer. Acá va el
        listado.
      </p>

      <h2>Lo que viene incluido si alquilás</h2>
      <p>
        En Experiencia Airsoft, cuando alquilás{" "}
        <Link href="/precios">marcadora simple ($40k) o avanzada ($50k)</Link>,
        entra:
      </p>
      <ul>
        <li>
          <strong>Marcadora.</strong> Réplica eléctrica con cargador y
          munición inicial.
        </li>
        <li>
          <strong>Protección facial.</strong> Anteojos reglamentarios — no
          se entra al campo sin ellos.
        </li>
        <li>
          <strong>Briefing inicial.</strong> Te explican uso, seguridad y
          mecánica de las partidas.
        </li>
        <li>
          <strong>Staff técnico.</strong> Te ayudan a regular la mira y la
          mecánica antes de jugar.
        </li>
        <li>
          <strong>Acceso al campo.</strong> Cancha, hidratación, vestuarios.
        </li>
      </ul>
      <p>
        Si <strong>traés tu propio equipo (BYOP)</strong> la entrada baja a
        $20.000 y solo pagás el acceso al campo + el briefing. Es la
        modalidad para jugadores que ya tienen marcadora propia.
      </p>

      <h2>Qué ropa llevar</h2>
      <p>
        No hace falta uniforme militar. Lo importante es{" "}
        <strong>cubrir piel</strong> y estar cómodo. Recomendación práctica:
      </p>
      <ul>
        <li>
          <strong>Pantalón largo</strong> — jean, cargo, jogging grueso.
          Evita shorts: las bbs en muslos al descubierto son más molestas.
        </li>
        <li>
          <strong>Buzo o remera manga larga</strong> — preferentemente una
          capa fina + buzo encima. La capa interna absorbe sudor.
        </li>
        <li>
          <strong>Zapatillas que no te importen ensuciarse</strong> — el
          campo tiene polvo, marcas de impactos en el piso, etc. Cualquier
          zapatilla de skater o trekking sirve. Evitá zapatillas blancas
          inmaculadas.
        </li>
        <li>
          <strong>Guantes (opcional pero recomendado)</strong> — guantes
          tácticos baratos o incluso de jardín gruesos te cubren los nudillos
          y la palma.
        </li>
        <li>
          <strong>Una gorra o pañuelo</strong> — protege la frente y absorbe
          sudor. Opcional pero útil.
        </li>
      </ul>
      <p>
        En cuanto a colores: <strong>no es obligatorio camuflarse</strong>. La
        mayoría de la gente viene con ropa civil oscura. Si tenés camo, es
        un plus estético pero no estratégico — en CQB indoor las luces son
        controladas y la distancia es corta.
      </p>

      <h2>Qué NO traer</h2>
      <p>
        Esto importa tanto como lo anterior:
      </p>
      <ul>
        <li>
          <strong>NO traigas tus propios anteojos comunes.</strong> Los
          anteojos de calle (incluso de sol) no resisten un impacto de BB y
          podés perder la visión. Los reglamentarios los proveemos nosotros.
        </li>
        <li>
          <strong>NO traigas armas reales</strong> de ningún tipo. Obvio.
        </li>
        <li>
          <strong>NO traigas bbs propias si alquilás.</strong> Las BBs del
          campo están dentro del límite legal (0.20g típico). Otras pueden
          afectar el funcionamiento de las marcadoras de alquiler.
        </li>
        <li>
          <strong>NO alcohol ni sustancias</strong> antes de la partida. La
          seguridad de todos depende de que cada jugador esté lúcido.
        </li>
        <li>
          <strong>NO ropa demasiado ajustada o cara</strong> que te dé pena
          ensuciar.
        </li>
      </ul>

      <h2>Equipo opcional que podés sumar</h2>
      <h3>Chaleco táctico ($10.000)</h3>
      <p>
        Suma protección al torso (sentís menos los impactos en el pecho) y
        agrega carga MOLLE para cargadores extras. Para una primera vez no
        es indispensable, pero para una segunda partida la mayoría lo
        recomienda.
      </p>
      <h3>Marcadora avanzada (+$10.000 sobre la simple)</h3>
      <p>
        Incluye trazador y bbs tracer (se iluminan con UV). Cambia mucho la
        experiencia visual, sobre todo en partidas oscuras o nocturnas. Si
        te late lo cinematográfico, vale el upgrade.
      </p>
      <h3>Recargas durante la partida</h3>
      <p>
        Si te quedás sin balas en plena partida, pedís recarga al staff. Las
        opciones:
      </p>
      <ul>
        <li>100 bbs tracer · $3.000</li>
        <li>200 bbs convencional · $3.000</li>
        <li>400 bbs convencional · $6.000</li>
      </ul>
      <p>
        Para una primera partida con marcadora simple, el cargador inicial
        suele alcanzar. Si comprás el upgrade a avanzada y querés sacar el
        máximo del trazador, conviene sumar una recarga de tracer.
      </p>

      <h2>Si querés comprar tu propio equipo</h2>
      <p>
        Recomendación seria: <strong>jugá al menos 3 partidas con alquiler
        antes de comprar tu primera marcadora</strong>. Hay razones:
      </p>
      <ol>
        <li>
          Vas a entender qué tipo de marcadora se adapta a tu estilo (rifle,
          DMR, pistola, escopeta) — todo el mundo cree saber al principio,
          casi nadie acierta.
        </li>
        <li>
          Una marcadora decente de entrada cuesta más de lo que pensás. La
          mejor inversión inicial es probar mucho con alquiler hasta tener
          claro qué querés.
        </li>
        <li>
          Las marcadoras de alquiler en Experiencia Airsoft están
          mantenidas y reguladas. Comprar una sin probar y meterse en el
          mantenimiento es trampa común.
        </li>
      </ol>
      <p>
        Cuando estés listo para comprar, sumate a algún clan que te pueda
        asesorar o consultá en el campo. Marcas confiables, presupuestos
        realistas y dónde comprar son cosas que se hablan mejor en persona.
      </p>

      <h2>Checklist final · qué llevar el día de tu partida</h2>
      <ul>
        <li>✓ DNI (obligatorio · +18)</li>
        <li>✓ Reserva confirmada por WhatsApp</li>
        <li>✓ Plata para el alquiler + posibles recargas</li>
        <li>✓ Pantalón largo + buzo manga larga</li>
        <li>✓ Zapatillas cerradas</li>
        <li>✓ Bidón de agua (hay hidratación en el campo pero no está de más)</li>
        <li>✓ Buena predisposición</li>
      </ul>
      <p>
        Eso es todo. El resto lo tenemos nosotros. Si querés ver el paso a
        paso completo del día,{" "}
        <Link href="/primera-vez">leé la guía de primera vez</Link>.
      </p>
    </BlogArticleLayout>
  );
}
