import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface PaymentDueEmailProps {
  gymName: string;
  planName: string;
  amount: string;
  dueDate: string;
  isRenewal?: boolean;
}

export default function PaymentDueEmail({
  gymName,
  planName,
  amount,
  dueDate,
  isRenewal = false,
}: PaymentDueEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {isRenewal
          ? `Tu membresía en ${gymName} se renovó`
          : `Pago pendiente en ${gymName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>
            {isRenewal ? "Membresía renovada" : "Pago pendiente"}
          </Heading>
          {isRenewal ? (
            <>
              <Text style={text}>
                Tu plan <strong>{planName}</strong> en <strong>{gymName}</strong>{" "}
                se ha renovado automáticamente.
              </Text>
              <Text style={text}>
                Tu próximo pago de <strong>{amount}</strong> vence el{" "}
                <strong>{dueDate}</strong>.
              </Text>
            </>
          ) : (
            <>
              <Text style={text}>
                Tu pago de <strong>{amount}</strong> del plan{" "}
                <strong>{planName}</strong> en <strong>{gymName}</strong> está
                vencido.
              </Text>
              <Text style={text}>
                Por favor regulariza tu membresía lo antes posible para evitar
                la cancelación.
              </Text>
            </>
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
