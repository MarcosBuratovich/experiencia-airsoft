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

export const CHANGE_EMAIL_SUBJECT =
  "Confirmá tu nuevo email · Experiencia Airsoft";

type Props = {
  /** Email destino del cambio (el nuevo, al que se envía esta confirmación). */
  newEmail: string;
  /** Email anterior, para contexto. */
  oldEmail?: string | null;
  actionUrl: string;
};

export default function ChangeEmailEmail({
  newEmail,
  oldEmail,
  actionUrl,
}: Props) {
  return (
    <EmailLayout preview="Confirmá tu nuevo email para que el cambio tome efecto.">
      <EmailEyebrow>Cuenta · Cambio de email</EmailEyebrow>
      <EmailHeading>Confirmá tu nuevo email</EmailHeading>

      <EmailBody>Hola,</EmailBody>
      <EmailBody>
        Pediste cambiar el email de tu cuenta de Experiencia Airsoft
        {oldEmail ? (
          <>
            {" "}
            de <strong>{oldEmail}</strong> a <strong>{newEmail}</strong>
          </>
        ) : (
          <>
            {" "}
            a <strong>{newEmail}</strong>
          </>
        )}
        . Confirmá tocando el botón para que tome efecto.
      </EmailBody>

      <Section style={{ margin: "32px 0", textAlign: "left" }}>
        <EmailButton href={actionUrl}>Confirmar nuevo email</EmailButton>
      </Section>

      <EmailCard>
        <EmailMuted>
          <strong style={{ color: "#f5f5f0" }}>Importante</strong>
          <br />
          Una vez confirmes, vas a tener que loguearte con{" "}
          <strong>{newEmail}</strong>. Tu contraseña no cambia.
        </EmailMuted>
      </EmailCard>

      <EmailFallbackLink href={actionUrl} />

      <EmailMuted>
        Si no pediste este cambio, ignorá el email. Tu cuenta sigue con el
        email anterior y nadie obtuvo acceso.
      </EmailMuted>
    </EmailLayout>
  );
}
