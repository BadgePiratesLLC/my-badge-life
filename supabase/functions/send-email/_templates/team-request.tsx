import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface TeamRequestEmailProps {
  userName: string;
  teamName: string;
  teamDescription?: string;
  teamWebsite?: string;
}

export const TeamRequestEmail = ({
  userName,
  teamName,
  teamDescription,
  teamWebsite,
}: TeamRequestEmailProps) => (
  <Html>
    <Head />
    <Preview>New team creation request from {userName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🏢 New Team Creation Request</Heading>
        
        <Text style={text}>
          A user has requested to create a new team on MyBadgeLife.
        </Text>

        <Section style={infoBox}>
          <Text style={infoLabel}>Requested by:</Text>
          <Text style={infoValue}>{userName}</Text>

          <Text style={infoLabel}>Team Name:</Text>
          <Text style={infoValue}>{teamName}</Text>

          {teamDescription && (
            <>
              <Text style={infoLabel}>Description:</Text>
              <Text style={infoValue}>{teamDescription}</Text>
            </>
          )}

          {teamWebsite && (
            <>
              <Text style={infoLabel}>Website:</Text>
              <Link href={teamWebsite} style={link}>
                {teamWebsite}
              </Link>
            </>
          )}
        </Section>

        <Text style={text}>
          Please review this request in the admin panel:
        </Text>

        <Link
          href="https://mybadgelife.com/admin"
          target="_blank"
          style={{
            ...link,
            display: 'block',
            marginBottom: '16px',
            padding: '12px 24px',
            backgroundColor: '#000',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
            textAlign: 'center' as const,
          }}
        >
          Review in Admin Panel
        </Link>

        <Text style={footer}>
          MyBadgeLife Admin Notification
        </Text>
      </Container>
    </Body>
  </Html>
);

export default TeamRequestEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const infoBox = {
  backgroundColor: '#f4f4f4',
  borderRadius: '4px',
  margin: '24px 40px',
  padding: '24px',
};

const infoLabel = {
  color: '#666',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '16px 0 4px 0',
};

const infoValue = {
  color: '#333',
  fontSize: '16px',
  margin: '0 0 8px 0',
};

const link = {
  color: '#2754C5',
  fontSize: '14px',
  textDecoration: 'underline',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
  marginTop: '32px',
};
