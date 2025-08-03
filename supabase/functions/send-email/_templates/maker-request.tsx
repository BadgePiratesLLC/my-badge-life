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
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface MakerRequestEmailProps {
  userName: string
  userEmail: string
  requestMessage?: string
  userProfileUrl: string
  adminUrl: string
  registrationDate: string
}

export const MakerRequestEmail = ({
  userName,
  userEmail,
  requestMessage,
  userProfileUrl,
  adminUrl,
  registrationDate,
}: MakerRequestEmailProps) => (
  <Html>
    <Head />
    <Preview>New maker request from {userName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🛠️ New Maker Request</Heading>
        
        <Text style={text}>
          A user has requested to become a badge maker on MyBadgeLife and needs admin approval.
        </Text>

        <Section style={userSection}>
          <Text style={sectionTitle}>User Information:</Text>
          <Text style={userInfo}>
            <strong>Name:</strong> {userName}<br />
            <strong>Email:</strong> {userEmail}<br />
            <strong>Member since:</strong> {new Date(registrationDate).toLocaleDateString()}
          </Text>
        </Section>

        {requestMessage && (
          <Section style={messageSection}>
            <Text style={sectionTitle}>Request Message:</Text>
            <Text style={messageText}>"{requestMessage}"</Text>
          </Section>
        )}

        <Section style={actionsSection}>
          <Text style={sectionTitle}>Review Required:</Text>
          <Text style={text}>
            Please review this user's profile and determine if they should be granted maker permissions. 
            Makers can submit badges for approval and manage their own badge submissions.
          </Text>
        </Section>

        <Section style={buttonSection}>
          <Row>
            <Column align="center">
              <Button style={primaryButton} href={adminUrl}>
                Review in Admin Panel
              </Button>
            </Column>
          </Row>
          <Row>
            <Column align="center">
              <Button style={secondaryButton} href={userProfileUrl}>
                View User Profile
              </Button>
            </Column>
          </Row>
        </Section>

        <Section style={guidelinesSection}>
          <Text style={guidelinesTitle}>📋 Maker Approval Guidelines:</Text>
          <Text style={guidelinesText}>
            • User should have a complete profile with valid contact information<br />
            • Consider their history and engagement with the platform<br />
            • Verify they understand badge submission guidelines<br />
            • Check for any previous policy violations<br />
            • Ensure they have legitimate badge creation experience or intent
          </Text>
        </Section>

        <Text style={footer}>
          <Link href={adminUrl} style={link}>
            MyBadgeLife Admin Panel
          </Link>
          <br />
          Manage user roles and maker permissions
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MakerRequestEmail

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

const userSection = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e9ecef',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const sectionTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0 0 12px 0',
}

const userInfo = {
  fontSize: '14px',
  color: '#333',
  margin: '0',
  lineHeight: '22px',
}

const messageSection = {
  backgroundColor: '#e0f2fe',
  border: '1px solid #0ea5e9',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const messageText = {
  fontSize: '14px',
  color: '#333',
  margin: '0',
  fontStyle: 'italic',
  lineHeight: '22px',
}

const actionsSection = {
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const primaryButton = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '8px',
}

const secondaryButton = {
  backgroundColor: '#6b7280',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'normal',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
  margin: '8px',
}

const guidelinesSection = {
  backgroundColor: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const guidelinesTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#374151',
  margin: '0 0 12px 0',
}

const guidelinesText = {
  fontSize: '14px',
  color: '#333',
  margin: '0',
  lineHeight: '22px',
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