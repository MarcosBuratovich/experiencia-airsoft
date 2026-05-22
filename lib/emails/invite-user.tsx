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

export const INVITE_USER_SUBJECT = "Te invitaron a Experiencia Airsoft";

type Props = {
  email: string;
  actionUrl: string;
  /** Nombre del admin que invita, si lo tenemos en metadata. */
  invitedBy?: string | null;
};

export default function InviteUserEmail({
  email,
  actionUrl,
  invitedBy,
}: Props) {
  return (
    <EmailLayout preview="Te abrieron una cuenta. Aceptá la invitación y elegí tu contraseña.">
      <EmailEyebrow>Invitación · Experiencia Airsoft</EmailEyebrow>
      <EmailHeading>Te invitaron a la plataforma</EmailHeading>

      <EmailBody>Hola,</EmailBody>
      <EmailBody>
        {invitedBy ? <strong>{invitedBy} </strong> : null}
        te creó una cuenta en{" "}
        <strong>Experiencia Airsoft</strong> con el email{" "}
        <strong>{email}</strong>. Para activarla, tocá el botón y elegí
        tu contraseña.
      </EmailBody>

      <Section style={{ margin: "32px 0", textAlign: "left" }}>
        <EmailButton href={actionUrl}>Aceptar invitación</EmailButton>
      </Section>

      <EmailCard>
        <EmailMuted>
          <strong style={{ color: "#f5f5f0" }}>¿Qué hacés con la cuenta?</strong>
          <br />
          Te anotás a partidas, ves tu historial de juego, tu número de
          jugador, conectás con tu clan si tenés y manejás tu perfil.
          Todo desde app.experienciaairsoft.com.
        </EmailMuted>
      </EmailCard>

      <EmailFallbackLink href={actionUrl} />

      <EmailMuted>
        Si esta invitación no te parece familiar, podés ignorarla — la
        cuenta no se activa hasta que aceptes y crees tu contraseña.
      </EmailMuted>
    </EmailLayout>
  );
}
