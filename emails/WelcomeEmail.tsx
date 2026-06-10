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

type WelcomeEmailProps = {
  ctaLabel: string;
  dashboardUrl: string;
  email: string;
  footer: string;
  intro: string;
  logo: string;
  preview: string;
  steps: Array<{
    href: string;
    label: string;
  }>;
};

export function WelcomeEmail({
  ctaLabel,
  dashboardUrl,
  email,
  footer,
  intro,
  logo,
  preview,
  steps,
}: WelcomeEmailProps) {
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
            <Heading style={styles.heading}>Bienvenue {email} !</Heading>
            <Text style={styles.intro}>{intro}</Text>
            <Section style={styles.steps}>
              {steps.map((step, index) => (
                <Text key={step.href} style={styles.step}>
                  <span style={styles.stepNumber}>{index + 1}.</span>{" "}
                  <a href={step.href} style={styles.stepLink}>
                    {step.label}
                  </a>
                </Text>
              ))}
            </Section>
            <Button href={dashboardUrl} style={styles.button}>
              {ctaLabel}
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
    background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
    padding: "26px 28px",
  },
  heading: {
    color: "#18111f",
    fontSize: "28px",
    lineHeight: "34px",
    margin: "0 0 16px",
  },
  hr: {
    borderColor: "#e8e1ef",
    margin: "0 28px 20px",
  },
  intro: {
    color: "#3b3147",
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 20px",
  },
  logo: {
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: 800,
    margin: 0,
  },
  step: {
    color: "#18111f",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "10px 0",
  },
  stepLink: {
    color: "#7C3AED",
    fontWeight: 700,
    textDecoration: "none",
  },
  stepNumber: {
    color: "#F59E0B",
    fontWeight: 800,
  },
  steps: {
    backgroundColor: "#FAF7FF",
    borderRadius: "10px",
    padding: "12px 16px",
  },
};
