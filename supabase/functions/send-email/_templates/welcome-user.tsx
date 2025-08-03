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

interface WelcomeUserEmailProps {
  userName: string
  userEmail: string
  exploreUrl: string
  profileUrl: string
  makerRequestUrl: string
  communityUrl?: string
}

export const WelcomeUserEmail = ({
  userName,
  userEmail,
  exploreUrl,
  profileUrl,
  makerRequestUrl,
  communityUrl,
}: WelcomeUserEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to MyBadgeLife! Start exploring electronic badges</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>🎫 MyBadgeLife</Text>
        </Section>

        <Heading style={h1}>Welcome to MyBadgeLife!</Heading>
        
        <Text style={text}>
          Hi {userName}, welcome to the ultimate destination for electronic badge enthusiasts! 
          We're thrilled to have you join our community.
        </Text>

        <Section style={featureSection}>
          <Text style={sectionTitle}>🔍 What you can do:</Text>
          <Text style={featureText}>
            • <strong>Discover badges:</strong> Search through thousands of electronic badges from conventions, events, and makers<br />
            • <strong>Track your collection:</strong> Mark badges you own or want to collect<br />
            • <strong>AI-powered identification:</strong> Upload photos to identify unknown badges<br />
            • <strong>Connect with makers:</strong> Find badge creators and learn about their work
          </Text>
        </Section>

        <Section style={emailNoticeSection}>
          <Text style={emailNoticeTitle}>📧 Email Notifications</Text>
          <Text style={emailNoticeText}>
            <strong>Good news!</strong> We respect your inbox. All email notifications are <strong>disabled by default</strong>. 
            You can choose which emails you'd like to receive in your account settings.
          </Text>
          <Button style={settingsButton} href={`${profileUrl}#settings`}>
            Manage Email Preferences
          </Button>
        </Section>

        <Section style={buttonSection}>
          <Button style={button} href={exploreUrl}>
            Start Exploring Badges
          </Button>
        </Section>

        <Section style={quickLinksSection}>
          <Text style={sectionTitle}>Quick Links:</Text>
          <Row>
            <Column>
              <Button style={smallButton} href={profileUrl}>
                Complete Profile
              </Button>
            </Column>
            <Column>
              <Button style={smallButton} href={makerRequestUrl}>
                Become a Maker
              </Button>
            </Column>
          </Row>
        </Section>

        <Section style={tipsSection}>
          <Text style={tipsTitle}>💡 Pro Tips:</Text>
          <Text style={tipsText}>
            • Use the camera feature to instantly identify badges you find<br />
            • Follow your favorite badge makers for updates<br />
            • Join the community to share your collection and discoveries<br />
            • Submit badges you've created to help grow our database<br />
            • <strong>Enable email notifications</strong> in settings to stay updated on your badge activity
          </Text>
        </Section>

        {communityUrl && (
          <Section style={communitySection}>
            <Text style={communityTitle}>🤝 Join the Community</Text>
            <Text style={text}>
              Connect with fellow badge enthusiasts, share your finds, and stay updated on the latest badge releases.
            </Text>
            <Button style={communityButton} href={communityUrl}>
              Join Discord Community
            </Button>
          </Section>
        )}

        <Text style={welcomeText}>
          Thank you for joining MyBadgeLife. We can't wait to see what badges you discover! 
          Remember to enable email notifications in your settings if you'd like to stay updated.
        </Text>

        <Text style={footer}>
          <Link href={exploreUrl} style={link}>
            MyBadgeLife
          </Link>
          <br />
          Questions? Reply to this email or contact our support team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeUserEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const logoSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
}

const logoText = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#007ee6',
  margin: '0',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '14px',
  margin: '16px 0',
  lineHeight: '24px',
}

const featureSection = {
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

const featureText = {
  fontSize: '14px',
  color: '#333',
  margin: '0',
  lineHeight: '24px',
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
  padding: '14px 28px',
}

const quickLinksSection = {
  margin: '24px 0',
}

const smallButton = {
  backgroundColor: '#6b7280',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'normal',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 16px',
  margin: '4px',
}

const emailNoticeSection = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const emailNoticeTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#16a34a',
  margin: '0 0 8px 0',
}

const emailNoticeText = {
  fontSize: '14px',
  color: '#333',
  margin: '0 0 16px 0',
  lineHeight: '22px',
}

const settingsButton = {
  backgroundColor: '#16a34a',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
}

const tipsSection = {
  backgroundColor: '#e0f2fe',
  border: '1px solid #0ea5e9',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const tipsTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#0ea5e9',
  margin: '0 0 12px 0',
}

const tipsText = {
  fontSize: '14px',
  color: '#333',
  margin: '0',
  lineHeight: '22px',
}

const communitySection = {
  backgroundColor: '#f3e8ff',
  border: '1px solid #a855f7',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const communityTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#a855f7',
  margin: '0 0 12px 0',
}

const communityButton = {
  backgroundColor: '#a855f7',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  margin: '12px 0',
}

const welcomeText = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '16px',
  fontSize: '14px',
  color: '#333',
  fontStyle: 'italic',
  margin: '24px 0',
  textAlign: 'center' as const,
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