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

type ApplicationStatusUpdateProps = {
  dashboardUrl: string;
  footer: string;
  heading: string;
  intro: string;
  logo: string;
  opportunityTitle: string;
  opportunityTitleLabel: string;
  preview: string;
  status: string;
  statusLabel: string;
  trackStatus: string;
};

export function ApplicationStatusUpdate({
  dashboardUrl,
  footer,
  heading,
  intro,
  logo,
  opportunityTitle,
  opportunityTitleLabel,
  preview,
  status,
  statusLabel,
  trackStatus,
}: ApplicationStatusUpdateProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.logo}>{logo}</Text>
          </Section>
          <Section style={styles.content}>
            <Heading style={styles.heading}>{heading}</Heading>
            <Text style={styles.intro}>{intro}</Text>
            <Text style={styles.label}>{opportunityTitleLabel}</Text>
            <Text style={styles.value}>{opportunityTitle}</Text>
            <Text style={styles.label}>{statusLabel}</Text>
            <Text style={styles.status}>{status}</Text>
            <Button href={dashboardUrl} style={styles.button}>
              {trackStatus}
            </Button>
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f6f4f8",
    fontFamily: "Arial, sans-serif",
    margin: 0,
  },
  button: {
    backgroundColor: "#7C3AED",
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: 700,
    marginTop: "18px",
    padding: "12px 18px",
    textDecoration: "none",
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    margin: "32px auto",
    overflow: "hidden",
    width: "560px",
  },
  content: {
    padding: "28px",
  },
  footer: {
    color: "#6f6478",
    fontSize: "13px",
    padding: "0 28px 24px",
  },
  header: {
    background: "linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%)",
    padding: "26px 28px",
  },
  heading: {
    color: "#18111f",
    fontSize: "28px",
    lineHeight: "34px",
    margin: "0 0 14px",
  },
  hr: {
    borderColor: "#e8e1ef",
    margin: "0 28px 20px",
  },
  intro: {
    color: "#4d4158",
    fontSize: "15px",
    lineHeight: "23px",
    margin: "0 0 20px",
  },
  label: {
    color: "#6f6478",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    margin: "16px 0 4px",
    textTransform: "uppercase" as const,
  },
  logo: {
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: 800,
    margin: 0,
  },
  status: {
    color: "#7C3AED",
    fontSize: "18px",
    fontWeight: 800,
    lineHeight: "26px",
    margin: 0,
  },
  value: {
    color: "#18111f",
    fontSize: "16px",
    lineHeight: "24px",
    margin: 0,
  },
};
