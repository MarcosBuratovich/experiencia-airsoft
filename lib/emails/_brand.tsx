import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button as REButton,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

/**
 * Tokens de marca para emails. Mismos hex que globals.css.
 * No reutilizamos las CSS vars porque los clientes de email no las soportan.
 */
export const BRAND = {
  ink: "#0a0a0a",
  carbon: "#141414",
  rail: "#2a2a2a",
  bone: "#f5f5f0",
  ash: "#b8b8b8",
  smoke: "#6e6e6e",
  orange: "#ff6b1a",
  orangeHover: "#e85a0f",
} as const;

// Fuentes con fallback robusto. Outlook ignora Google Fonts, asi que la
// segunda opcion siempre tiene que ser una system font que se le parezca.
const FONT_DISPLAY =
  "'Oswald', 'Impact', 'Arial Narrow Bold', Arial, sans-serif";
const FONT_SANS =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

const SITE_URL = "https://www.experienciaairsoft.com";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.experienciaairsoft.com";
const LOGO_URL = `${SITE_URL}/icon.png`;
const WHATSAPP_URL = "https://wa.me/5491138689783";
const INSTAGRAM_URL = "https://www.instagram.com/experienciaairsoft/";

const main: CSSProperties = {
  backgroundColor: BRAND.ink,
  color: BRAND.bone,
  fontFamily: FONT_SANS,
  margin: 0,
  padding: 0,
  WebkitFontSmoothing: "antialiased",
};

const container: CSSProperties = {
  margin: "0 auto",
  padding: "32px 20px 48px",
  maxWidth: "600px",
  width: "100%",
};

const headerSection: CSSProperties = {
  paddingBottom: "28px",
  borderBottom: `1px solid ${BRAND.rail}`,
  marginBottom: "32px",
};

const logoStyle: CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "8px",
  display: "block",
};

const brandLabel: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  fontSize: "13px",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: BRAND.orange,
  margin: "16px 0 0",
};

const footer: CSSProperties = {
  marginTop: "48px",
  paddingTop: "24px",
  borderTop: `1px solid ${BRAND.rail}`,
  fontSize: "12px",
  lineHeight: "1.6",
  color: BRAND.smoke,
};

const footerLink: CSSProperties = {
  color: BRAND.ash,
  textDecoration: "underline",
};

const heading: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  fontSize: "30px",
  lineHeight: "1.1",
  letterSpacing: "-0.01em",
  textTransform: "uppercase",
  color: BRAND.bone,
  margin: "0 0 16px",
};

const eyebrow: CSSProperties = {
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  fontSize: "11px",
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: BRAND.orange,
  margin: "0 0 8px",
};

const body: CSSProperties = {
  fontFamily: FONT_SANS,
  fontSize: "16px",
  lineHeight: "1.65",
  color: BRAND.bone,
  margin: "0 0 16px",
};

const muted: CSSProperties = {
  fontFamily: FONT_SANS,
  fontSize: "13px",
  lineHeight: "1.55",
  color: BRAND.ash,
  margin: "16px 0 0",
};

const button: CSSProperties = {
  backgroundColor: BRAND.orange,
  color: BRAND.ink,
  fontFamily: FONT_DISPLAY,
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  textDecoration: "none",
  padding: "14px 28px",
  borderRadius: "0",
  display: "inline-block",
};

const card: CSSProperties = {
  backgroundColor: BRAND.carbon,
  border: `1px solid ${BRAND.rail}`,
  padding: "20px",
  margin: "24px 0",
};

const fallbackLink: CSSProperties = {
  color: BRAND.orange,
  fontFamily:
    "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  fontSize: "12px",
  wordBreak: "break-all",
  textDecoration: "underline",
};

const hr: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${BRAND.rail}`,
  margin: "32px 0",
};

export function EmailLayout({
  preview,
  children,
}: {
  /** Texto que aparece en la preview del inbox (max ~90 chars). */
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang="es">
      <Head>
        <meta name="color-scheme" content="dark only" />
        <meta name="supported-color-schemes" content="dark only" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerSection}>
            <Img
              src={LOGO_URL}
              alt="Experiencia Airsoft"
              width={56}
              height={56}
              style={logoStyle}
            />
            <Text style={brandLabel}>Experiencia Airsoft</Text>
          </Section>

          {children}

          <Section style={footer}>
            <Text style={{ ...muted, marginTop: 0 }}>
              <strong style={{ color: BRAND.bone }}>Experiencia Airsoft</strong>
              {" — "}
              Centro de airsoft CQB indoor en Buenos Aires.
            </Text>
            <Text style={{ ...muted, marginTop: 8 }}>
              Gral. Conesa 1858, CABA &nbsp;·&nbsp;{" "}
              <Link href={`${SITE_URL}/buenos-aires`} style={footerLink}>
                Cómo llegar
              </Link>
              &nbsp;·&nbsp;{" "}
              <Link href={INSTAGRAM_URL} style={footerLink}>
                Instagram
              </Link>
              &nbsp;·&nbsp;{" "}
              <Link href={WHATSAPP_URL} style={footerLink}>
                WhatsApp
              </Link>
            </Text>
            <Text style={{ ...muted, marginTop: 16, color: BRAND.smoke }}>
              Recibiste este email porque tenés (o creaste) una cuenta en
              app.experienciaairsoft.com. Si no fuiste vos, podés ignorarlo
              tranquilo — no se acciona nada sin que confirmes.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailEyebrow({ children }: { children: ReactNode }) {
  return <Text style={eyebrow}>{children}</Text>;
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return <Heading style={heading}>{children}</Heading>;
}

export function EmailBody({ children }: { children: ReactNode }) {
  return <Text style={body}>{children}</Text>;
}

export function EmailMuted({ children }: { children: ReactNode }) {
  return <Text style={muted}>{children}</Text>;
}

export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <REButton href={href} style={button}>
      {children}
    </REButton>
  );
}

export function EmailCard({ children }: { children: ReactNode }) {
  return <Section style={card}>{children}</Section>;
}

export function EmailDivider() {
  return <Hr style={hr} />;
}

export function EmailFallbackLink({ href }: { href: string }) {
  return (
    <Text style={{ ...muted, color: BRAND.ash }}>
      Si el botón no funciona, pegá este link en el navegador:
      <br />
      <Link href={href} style={fallbackLink}>
        {href}
      </Link>
    </Text>
  );
}

export const URLS = {
  site: SITE_URL,
  app: APP_URL,
  whatsapp: WHATSAPP_URL,
  instagram: INSTAGRAM_URL,
  logo: LOGO_URL,
};
