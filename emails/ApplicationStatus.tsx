import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Text,
} from "@react-email/components";

interface ApplicationStatusEmailProps {
  artistName: string;
  opportunityTitle: string;
  organizer: string;
  status: "accepted" | "rejected";
  dashboardUrl: string;
}

export function ApplicationStatusEmail({
  artistName,
  dashboardUrl,
  opportunityTitle,
  organizer,
  status,
}: ApplicationStatusEmailProps) {
  const isAccepted = status === "accepted";

  return (
    <Html>
      <Head />
      <Body style={{ background: "#f9f9f9", fontFamily: "Inter, sans-serif" }}>
        <Container style={{ margin: "0 auto", maxWidth: 600, padding: 32 }}>
          <div
            style={{
              background: isAccepted ? "#7C3AED" : "#6B7280",
              borderRadius: 12,
              marginBottom: 24,
              padding: "24px",
            }}
          >
            <Heading style={{ color: "white", fontSize: 24, margin: 0 }}>
              {isAccepted ? "Candidature acceptee !" : "Candidature non retenue"}
            </Heading>
          </div>

          <Text>Bonjour {artistName},</Text>

          {isAccepted ? (
            <Text>
              Felicitations ! Votre candidature pour <strong>{opportunityTitle}</strong>{" "}
              organisee par <strong>{organizer}</strong> a ete <strong>acceptee</strong>.
              L&apos;organisateur va vous contacter prochainement.
            </Text>
          ) : (
            <Text>
              Votre candidature pour <strong>{opportunityTitle}</strong> organisee par{" "}
              <strong>{organizer}</strong> n&apos;a pas ete retenue cette fois-ci. Ne vous
              decouragez pas - de nouvelles opportunites sont ajoutees regulierement sur
              PaxKonnect !
            </Text>
          )}

          <Button
            href={dashboardUrl}
            style={{
              background: "#7C3AED",
              borderRadius: 8,
              color: "white",
              display: "inline-block",
              padding: "12px 24px",
              textDecoration: "none",
            }}
          >
            Voir mon tableau de bord
          </Button>

          <Hr />
          <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
            PaxKonnect - MonsPax ASBL - paxkonnect.be
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
