-- =========================================================================
-- Experiencia Airsoft — contenido inicial de la base de conocimiento del bot
-- Correr DESPUES de db/schema-phase-19.sql. Idempotente por titulo.
--
-- Estas 11 entradas son las que estan cargadas en produccion al 2026-07-30.
-- El contenido NO esta inventado: sale del sitio de marketing (home,
-- primera-vez, comparativa con paintball) y de datos confirmados por el
-- dueno. Si se edita una respuesta desde /admin/bot/conocimiento, este
-- archivo queda desactualizado — es un punto de partida, no la verdad.
--
-- OJO con la edad: son 18 anios sin excepciones. Un seed anterior decia 14
-- por error y contradecia las cinco menciones del propio sitio.
-- =========================================================================

insert into public.bot_conocimiento (titulo, contenido, orden) values
  ('Edad mínima', 'Desde los 18 años cumplidos, sin excepciones, y pedimos documento al momento del ingreso. Es normativa: por la apariencia realista de las marcadoras se exige mayoría de edad. No es una política nuestra y no podemos hacer excepciones ni con autorización de un adulto.', 0),
  ('¿Duele cuando te dan?', 'Se siente, no te vamos a mentir: es como un pellizco rápido. Trabajamos con 330 FPS máximos, que es la categoría más baja permitida, justamente para que sea controlado. Con el chaleco y ropa larga lo notás menos. La mayoría dice "menos de lo que pensaba".', 1),
  ('Qué ropa ponerse', 'Algo cómodo y que no te importe ensuciar: pantalón largo (jean o jogger), calzado deportivo cerrado, y una remera de manga larga si querés más cobertura. Evitá ropa demasiado holgada.', 2),
  ('Qué hace falta traer', 'Nada. El equipo completo se alquila en el lugar: marcadora, protección facial, chaleco y BBs. Solo venís a jugar. Si tenés equipo propio también podés traerlo.', 3),
  ('Dónde queda y cómo es el lugar', 'Gral. Conesa 1858, C1870, Ciudad Autónoma de Buenos Aires. Somos un centro de airsoft CQB indoor, o sea que se juega en espacios cerrados con distancias cortas. Al ser techado, la lluvia no afecta las partidas.', 4),
  ('Seguridad y potencia', 'Máximo 330 FPS, la categoría más baja permitida para CQB. Protección facial obligatoria en todo momento, staff arbitrando durante toda la partida y zonas seguras claramente marcadas. Nunca tuvimos accidentes serios. Quien llegue bajo efectos de alcohol o drogas no juega.', 5),
  ('¿Hace falta experiencia?', 'Ninguna. Recibimos gente que nunca jugó en su vida: hay un briefing de seguridad y las primeras misiones están pensadas para que aprendas jugando. La mitad de la gente que viene un sábado es primera vez.', 6),
  ('Modalidades y reservas', 'Hay partidas públicas abiertas (cualquiera se anota), privadas de grupo de 10 a 20 personas, y eventos corporativos para empresas. Trabajamos 100% bajo reserva previa: no se puede caer sin reservar.', 7),
  ('Medios de pago', 'Efectivo o transferencia. Los precios son distintos según el medio, así que conviene consultarlos con la herramienta de precios y aclarar los dos valores.', 8),
  ('Estacionamiento', 'Se estaciona en la calle, sobre Gral. Conesa. No tenemos estacionamiento propio dentro del predio.', 9),
  ('Cuánto dura una jornada', 'Entre 3 y 4 horas, con descansos entre partidas.', 10)
on conflict do nothing;
