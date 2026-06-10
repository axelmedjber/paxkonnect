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

type NewOpportunityEmailProps = {
  category: string;
  deadline: string;
  description: string;
  footer: string;
  isClosingSoon: boolean;
  location: string;
  logo: string;
  opportunityUrl: string;
  organizer: string;
  title: string;
  unsubscribeLabel: string;
  unsubscribeUrl: string;
};

export function NewOpportunityEmail({
  category,
  deadline,
  description,
  footer,
  isClosingSoon,
  location,
  logo,
  opportunityUrl,
  organizer,
  title,
  unsubscribeLabel,
  unsubscribeUrl,
}: NewOpportunityEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Nouvelle opportunité PaxKonnect pour votre profil artiste.</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.logo}>{logo}</Text>
          </Section>
          <Section style={styles.content}>
            <Heading style={styles.heading}>Une nouvelle opportunité vous correspond !</Heading>
            <Section style={styles.card}>
              <Text style={styles.badge}>{category}</Text>
              <Heading style={styles.title}>{title}</Heading>
              <Text style={styles.meta}>
                {organizer} · {location}
              </Text>
              <Text style={isClosingSoon ? styles.deadlineSoon : styles.deadline}>{deadline}</Text>
              <Text style={styles.description}>{description}</Text>
              <Button href={opportunityUrl} style={styles.button}>
                Voir l&apos;opportunité →
              </Button>
            </Section>
          </Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{footer}</Text>
          <Text style={styles.footer}>
            <a href={unsubscribeUrl} style={styles.footerLink}>
              {unsubscribeLabel}
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  badge: {
    backgroundColor: "#F59E0B",
    borderRadius: "999px",
    color: "#18111f",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    margin: "0 0 14px",
    padding: "6px 10px",
    textTransform: "uppercase" as const,
  },
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
    marginTop: "16px",
    padding: "12px 18px",
    textDecoration: "none",
  },
  card: {
    border: "1px solid #eadff8",
    borderRadius: "14px",
    padding: "22px",
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
  deadline: {
    color: "#6f6478",
    fontSize: "14px",
    fontWeight: 700,
    margin: "14px 0 0",
  },
  deadlineSoon: {
    color: "#b45309",
    fontSize: "14px",
    fontWeight: 800,
    margin: "14px 0 0",
  },
  description: {
    color: "#3b3445",
    fontSize: "15px",
    lineHeight: "23px",
    margin: "14px 0 0",
  },
  footer: {
    color: "#6f6478",
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0 28px 12px",
  },
  footerLink: {
    color: "#7C3AED",
    textDecoration: "underline",
  },
  header: {
    background: "linear-gradient(135deg, #7C3AED 0%, #F59E0B 100%)",
    padding: "26px 28px",
  },
  heading: {
    color: "#18111f",
    fontSize: "26px",
    lineHeight: "32px",
    margin: "0 0 22px",
  },
  hr: {
    borderColor: "#e8e1ef",
    margin: "0 28px 18px",
  },
  logo: {
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: 800,
    margin: 0,
  },
  meta: {
    color: "#6f6478",
    fontSize: "14px",
    margin: "8px 0 0",
  },
  title: {
    color: "#18111f",
    fontSize: "24px",
    lineHeight: "30px",
    margin: 0,
  },
};
