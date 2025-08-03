import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
  Section,
  Row,
  Column,
  Img,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface BadgeSubmittedEmailProps {
  badgeName: string
  makerName: string
  makerEmail: string
  teamName?: string
  category?: string
  description?: string
  imageUrl?: string
  adminUrl: string
}

export const BadgeSubmittedEmail = ({
  badgeName,
  makerName,
  makerEmail,
  teamName,
  category,
  description,
  imageUrl,
  adminUrl,
}: BadgeSubmittedEmailProps) => (
  <Html>
    <Head />
    <Preview>New badge "{badgeName}" submitted for review</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎫 New Badge Submission</Heading>
        
        <Text style={text}>
          A new badge has been submitted to MyBadgeLife and requires admin review.
        </Text>

        <Section style={badgeSection}>
          {imageUrl && (
            <Row>
              <Column align="center">
                <Img
                  src={imageUrl}
                  width="150"
                  height="150"
                  alt={badgeName}
                  style={badgeImage}
                />
              </Column>
            </Row>
          )}
          
          <Row>
            <Column>
              <Text style={badgeTitle}>{badgeName}</Text>
              {teamName && <Text style={badgeDetail}>Team: {teamName}</Text>}
              {category && <Text style={badgeDetail}>Category: {category}</Text>}
              {description && <Text style={badgeDetail}>Description: {description}</Text>}
            </Column>
          </Row>
        </Section>

        <Section style={makerSection}>
          <Text style={sectionTitle}>Submitted by:</Text>
          <Text style={text}>
            <strong>{makerName}</strong><br />
            {makerEmail}
          </Text>
        </Section>

        <Section style={buttonSection}>
          <Button style={button} href={adminUrl}>
            Review Badge in Admin Panel
          </Button>
        </Section>

        <Text style={footer}>
          <Link href={adminUrl} style={link}>
            MyBadgeLife Admin Panel
          </Link>
          <br />
          Manage badge submissions and approvals
        </Text>
      </Container>
    </Body>
  </Html>
)

export default BadgeSubmittedEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '14px',
  margin: '24px 0',
  lineHeight: '24px',
}

const badgeSection = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const badgeImage = {
  borderRadius: '8px',
  border: '2px solid #e9ecef',
}

const badgeTitle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#333',
  margin: '16px 0 8px 0',
  textAlign: 'center' as const,
}

const badgeDetail = {
  fontSize: '14px',
  color: '#666',
  margin: '4px 0',
  textAlign: 'center' as const,
}

const makerSection = {
  margin: '24px 0',
}

const sectionTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0 0 8px 0',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#007ee6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const link = {
  color: '#007ee6',
  textDecoration: 'underline',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  margin: '32px 0',
  textAlign: 'center' as const,
}