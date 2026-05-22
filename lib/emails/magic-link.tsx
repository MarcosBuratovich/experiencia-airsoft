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

export const MAGIC_LINK_SUBJECT = "Tu acceso a Experiencia Airsoft";

type Props = {
  email: string;
  actionUrl: string;
};

export default function MagicLinkEmail({ email, actionUrl }: Props) {
  return (
    <EmailLayout preview="Tocá el link y entrás a la plataforma sin contraseña.">
      <EmailEyebrow>Acceso · Magic Link</EmailEyebrow>
      <EmailHeading>Entrá sin contraseña</EmailHeading>

      <EmailBody>Hola,</EmailBody>
      <EmailBody>
        Generamos un link único de acceso para la cuenta{" "}
        <strong>{email}</strong>. Es válido por una sola sesión y se vence
        en 1 hora.
      </EmailBody>

      <Section style={{ margin: "32px 0", textAlign: "left" }}>
        <EmailButton href={actionUrl}>Entrar a la plataforma</EmailButton>
      </Section>

      <EmailCard>
        <EmailMuted>
          <strong style={{ color: "#f5f5f0" }}>¿Por qué un magic link?</strong>
          <br />
          Es una forma de entrar sin escribir tu contraseña. Útil cuando la
          olvidaste o estás en un dispositivo donde no la querés tipear.
          El link funciona una sola vez y solo para esta cuenta.
        </EmailMuted>
      </EmailCard>

      <EmailFallbackLink href={actionUrl} />

      <EmailMuted>
        Si no pediste este link, ignorá este email. Nadie obtuvo acceso a la
        cuenta — los magic links no se activan hasta que vos los uses.
      </EmailMuted>
    </EmailLayout>
  );
}
