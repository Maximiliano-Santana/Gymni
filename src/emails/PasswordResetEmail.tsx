import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  resetUrl: string;
  gymName?: string;
}

export default function PasswordResetEmail({
  resetUrl,
  gymName = "Gymni",
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Restablece tu contraseña en {gymName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Restablecer contraseña</Heading>
          <Text style={text}>
            Recibimos una solicitud para restablecer tu contraseña en{" "}
            <strong>{gymName}</strong>.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Restablecer contraseña
            </Button>
          </Section>
          <Text style={text}>
            Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes
            ignorar este correo.
          </Text>
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

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "15px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
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
