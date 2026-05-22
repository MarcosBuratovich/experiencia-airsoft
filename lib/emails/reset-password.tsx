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

export const RESET_PASSWORD_SUBJECT =
  "Restablecé tu contraseña · Experiencia Airsoft";

type Props = {
  email: string;
  /** URL con el token de reset. Lleva al form de nueva contraseña. */
  actionUrl: string;
};

export default function ResetPasswordEmail({ email, actionUrl }: Props) {
  return (
    <EmailLayout preview="Pediste cambiar tu contraseña. Link valido por 1 hora.">
      <EmailEyebrow>Acceso · Cambio de contraseña</EmailEyebrow>
      <EmailHeading>Crear nueva contraseña</EmailHeading>

      <EmailBody>Hola,</EmailBody>
      <EmailBody>
        Recibimos un pedido para restablecer la contraseña de la cuenta{" "}
        <strong>{email}</strong>. Si fuiste vos, tocá el botón y elegí una
        contraseña nueva.
      </EmailBody>

      <Section style={{ margin: "32px 0", textAlign: "left" }}>
        <EmailButton href={actionUrl}>Crear nueva contraseña</EmailButton>
      </Section>

      <EmailCard>
        <EmailMuted>
          <strong style={{ color: "#f5f5f0" }}>Tip</strong>
          <br />
          Mínimo 8 caracteres, con al menos una letra y un número. Usá una
          contraseña distinta a la de otros sitios.
        </EmailMuted>
      </EmailCard>

      <EmailFallbackLink href={actionUrl} />

      <EmailMuted>
        El link vence en <strong style={{ color: "#f5f5f0" }}>1 hora</strong>.
        Si no pediste este cambio, podés ignorar este email — tu contraseña
        actual sigue funcionando y nadie obtuvo acceso a la cuenta.
      </EmailMuted>
    </EmailLayout>
  );
}
