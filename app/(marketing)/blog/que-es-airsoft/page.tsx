import type { Metadata } from "next";
import Link from "next/link";
import { BlogArticleLayout } from "../_article-layout";
import { getPostBySlug } from "../_posts";
import { SITE_URL } from "../../../_components/site-constants";

const SLUG = "que-es-airsoft";
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
        Si tu primera referencia de airsoft es una película de acción o un
        video de YouTube, probablemente te falten un montón de detalles. Este
        artículo te explica qué es el airsoft, cómo funciona y por qué creció
        tanto en Argentina los últimos años.
      </p>

      <h2>Qué es el airsoft</h2>
      <p>
        El airsoft es un deporte táctico de equipo que consiste en simular
        operaciones militares o de combate con réplicas de armas que disparan
        balines plásticos (BBs) de 6 mm. El objetivo de cada partida varía:
        eliminar al equipo contrario, capturar un punto, plantar una bomba,
        rescatar a un rehén, etc. Lo importante es que <strong>cada jugador
        confía en el honor de los otros</strong> para declararse fuera cuando
        recibe un impacto — es lo que se llama <em>honor system</em>.
      </p>
      <p>
        Las réplicas se llaman <em>marcadoras</em> y son funcionalmente
        idénticas a armas reales (peso, dimensiones, manejo) pero disparan BBs
        plásticos biodegradables, no munición letal. Las marcadoras serias
        están reguladas para no superar los 330 FPS (~91 m/s) en interior:
        suficiente para sentir el impacto, no suficiente para lesionar con la
        protección reglamentaria.
      </p>

      <h2>Cómo funciona una partida</h2>
      <p>
        Una partida típica en un campo organizado tiene esta estructura:
      </p>
      <ol>
        <li>
          <strong>Briefing inicial.</strong> El staff explica las reglas de
          seguridad, el objetivo de la misión, el mapa y los códigos del
          campo.
        </li>
        <li>
          <strong>Calibración del equipo.</strong> Cada jugador prueba su
          marcadora en un área segura (zona caliente / zona fría).
        </li>
        <li>
          <strong>Partida.</strong> Dos equipos se enfrentan en escenarios
          dinámicos. Puede durar entre 15 y 45 minutos según la modalidad.
        </li>
        <li>
          <strong>Debrief.</strong> Al final se comenta lo que pasó, qué
          jugada salió bien, qué se puede mejorar.
        </li>
      </ol>
      <p>
        Un día típico incluye 4-6 partidas distintas con dinámicas diferentes:
        eliminación libre, captura de bandera, búsqueda y destrucción,
        defensa de zona.
      </p>

      <h2>Modalidades principales</h2>
      <p>
        Hay dos grandes familias de airsoft según el terreno:
      </p>
      <h3>CQB · Combate cuarto cerrado</h3>
      <p>
        Indoor o en estructuras edificadas. Distancias cortas (5-25 m),
        pasillos, puertas, ventanas, niveles de altura. Mucha intensidad,
        ritmo rápido, dinámica de equipo crítica. Es lo que hacemos en
        Experiencia Airsoft.
      </p>
      <h3>Field · Combate al aire libre</h3>
      <p>
        Outdoor, en bosques o terrenos grandes. Distancias largas (hasta 60
        m), uso de cobertura natural, francotiradores, partidas más extensas.
        Otra experiencia, otro ritmo.
      </p>

      <h2>Por qué creció en Argentina</h2>
      <p>
        Varias razones se combinaron:
      </p>
      <ul>
        <li>
          <strong>Estética táctica realista.</strong> Las réplicas son
          visualmente idénticas a armas reales. Atrae a quienes les gusta el
          cine de acción, los videojuegos como Call of Duty o Counter-Strike,
          o tienen vocación por la simulación.
        </li>
        <li>
          <strong>Comunidad organizada.</strong> Aparecieron clanes serios
          con reglamentos, fechas regulares y eventos.
        </li>
        <li>
          <strong>Campos indoor estables.</strong> Antes el airsoft dependía
          del clima en campos outdoor. Lugares indoor como Experiencia
          Airsoft permiten jugar todo el año.
        </li>
        <li>
          <strong>Costo razonable.</strong> Una partida con equipo de
          alquiler es accesible — no requiere comprar tu propia marcadora si
          recién empezás.
        </li>
      </ul>

      <h2>Diferencia con el paintball</h2>
      <p>
        Es la comparación que más se hace. La diferencia central: el airsoft
        es <strong>más realista, menos sucio y más táctico</strong>. El
        paintball es <strong>más arcade, más fácil de jugar y aceptado para
        menores de edad</strong>. Si querés profundizar, escribimos una{" "}
        <Link href="/airsoft-vs-paintball">
          comparativa honesta entre airsoft y paintball
        </Link>
        .
      </p>

      <h2>Quién puede jugar</h2>
      <p>
        En Argentina la edad mínima para airsoft es 18 años. Es una norma
        importante: las marcadoras pueden confundirse con armas reales fuera
        del campo, por eso se reserva el deporte a personas mayores que
        pueden hacerse responsables del transporte y uso seguro.
      </p>
      <p>
        Más allá de la edad, <strong>no necesitás estado físico especial</strong>.
        El CQB indoor premia la estrategia y la comunicación más que correr.
        Si nunca jugaste, lo mejor es empezar por una{" "}
        <Link href="/primera-vez">partida con equipo de alquiler</Link> donde
        el staff te explica todo desde cero.
      </p>

      <h2>En resumen</h2>
      <p>
        Airsoft = deporte táctico, simulación real, comunidad activa, +18,
        intenso y estratégico. No es paintball arcade. No es videojuego. Es
        actividad física moderada con dinámica de equipo y estética militar
        cinematográfica.
      </p>
      <p>
        Si te pica la curiosidad, lo más rápido es{" "}
        <Link href="/precios">ver los precios</Link> y{" "}
        <Link href="/primera-vez">leer la guía de primera vez</Link>. En 20
        minutos de lectura tenés todo lo que necesitás para reservar y venir.
      </p>
    </BlogArticleLayout>
  );
}
