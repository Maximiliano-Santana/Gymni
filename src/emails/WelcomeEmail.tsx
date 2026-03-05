import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  gymName: string;
  userName: string;
  tempPassword?: string;
  loginUrl?: string;
  changePasswordUrl?: string;
}

export default function WelcomeEmail({
  gymName,
  userName,
  tempPassword,
  loginUrl,
  changePasswordUrl,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Bienvenido a {gymName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Bienvenido, {userName}</Heading>
          <Text style={text}>
            Tu cuenta en <strong>{gymName}</strong> está lista.
          </Text>
          {tempPassword && (
            <Section style={credentialsBox}>
              <Text style={credentialsTitle}>Tus credenciales de acceso:</Text>
              <Text style={credentialsText}>
                Contraseña temporal: <strong>{tempPassword}</strong>
              </Text>
            </Section>
          )}
          {loginUrl && (
            <Text style={text}>
              Inicia sesión en:{" "}
              <Link href={loginUrl} style={link}>
                {loginUrl}
              </Link>
            </Text>
          )}
          {changePasswordUrl && (
            <Text style={text}>
              Te recomendamos cambiar tu contraseña:{" "}
              <Link href={changePasswordUrl} style={link}>
                Cambiar contraseña
              </Link>
            </Text>
          )}
          {!tempPassword && (
            <Text style={text}>
              Ya puedes iniciar sesión y acceder a tu membresía.
            </Text>
          )}
          <Hr style={hr} />
          <Text style={footer}>
            {gymName} — Powered by Gymni
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "5px",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "400",
  color: "#484848",
  padding: "17px 0 0",
  textAlign: "center" as const,
};

const text = {
  margin: "0 0 10px",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#3c4149",
  padding: "0 40px",
};

const credentialsBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "6px",
  margin: "16px 40px",
  padding: "16px 20px",
};

const credentialsTitle = {
  fontSize: "13px",
  color: "#71717a",
  margin: "0 0 8px",
};

const credentialsText = {
  fontSize: "15px",
  color: "#18181b",
  margin: "0",
};

const link = {
  color: "#7c3aed",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#dfe1e4",
  margin: "42px 0 26px",
};

const footer = {
  fontSize: "12px",
  lineHeight: "1.4",
  color: "#898989",
  padding: "0 40px",
};
