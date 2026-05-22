import { Section } from "@react-email/components";
import {
  EmailBody,
  EmailButton,
  EmailCard,
  EmailEyebrow,
  EmailFallbackLink,
  EmailHeading,
  EmailLayout,
  EmailMuted,
} from "./_brand";

export const CONFIRM_SIGNUP_SUBJECT = "Confirmá tu cuenta · Experiencia Airsoft";

type Props = {
  /** Email del destinatario (para personalizar saludo + mostrarlo). */
  email: string;
  /** URL completa que activa la cuenta (token incluido). */
  actionUrl: string;
  /** Nombre opcional (lo tenemos en metadata del signup). */
  nombre?: string | null;
};

export default function ConfirmSignupEmail({
  email,
  actionUrl,
  nombre,
}: Props) {
  const greeting = nombre ? `Hola ${nombre},` : "Hola,";
  return (
    <EmailLayout preview="Confirmá tu email y entrás a la plataforma de Experiencia Airsoft.">
      <EmailEyebrow>Paso 1 de 2 · Activación</EmailEyebrow>
      <EmailHeading>Confirmá tu cuenta</EmailHeading>

      <EmailBody>{greeting}</EmailBody>
      <EmailBody>
        Recibimos tu registro en{" "}
        <strong>Experiencia Airsoft</strong> con el email{" "}
        <strong>{email}</strong>. Falta un paso: tocá el botón para confirmar
        que sos vos y dejar tu cuenta activa.
      </EmailBody>

      <Section style={{ margin: "32px 0", textAlign: "left" }}>
        <EmailButton href={actionUrl}>Activar mi cuenta</EmailButton>
      </Section>

      <EmailCard>
        <EmailMuted>
          <strong style={{ color: "#f5f5f0" }}>¿Qué sigue después?</strong>
          <br />
          Una vez confirmes el email vas a poder loguearte en
          app.experienciaairsoft.com, anotarte a partidas, ver tu historial
          y manejar tu perfil de jugador.
        </EmailMuted>
      </EmailCard>

      <EmailFallbackLink href={actionUrl} />

      <EmailMuted>
        Si no creaste esta cuenta, ignorá este email y no va a pasar nada.
        El link de activación expira en 24 horas.
      </EmailMuted>
    </EmailLayout>
  );
}
