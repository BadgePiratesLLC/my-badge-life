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

interface BadgeApprovedEmailProps {
  badgeName: string
  makerName: string
  teamName?: string
  category?: string
  imageUrl?: string
  badgeUrl: string
  exploreUrl: string
}

export const BadgeApprovedEmail = ({
  badgeName,
  makerName,
  teamName,
  category,
  imageUrl,
  badgeUrl,
  exploreUrl,
}: BadgeApprovedEmailProps) => (
  <Html>
    <Head />
    <Preview>🎉 Your badge "{badgeName}" has been approved!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 Badge Approved!</Heading>
        
        <Text style={text}>
          Congratulations {makerName}! Your badge submission has been approved and is now live on MyBadgeLife.
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
              <Text style={approvedText}>✅ Status: APPROVED</Text>
            </Column>
          </Row>
        </Section>

        <Text style={text}>
          Your badge is now visible to all MyBadgeLife users and can be discovered through our search and exploration features.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={badgeUrl}>
            View Your Badge
          </Button>
        </Section>

        <Section style={buttonSection}>
          <Button style={secondaryButton} href={exploreUrl}>
            Explore All Badges
          </Button>
        </Section>

        <Text style={encouragementText}>
          Thank you for contributing to the MyBadgeLife community! We encourage you to submit more badges and help build our comprehensive badge database.
        </Text>

        <Text style={footer}>
          <Link href={exploreUrl} style={link}>
            MyBadgeLife
          </Link>
          <br />
          Discover, collect, and share electronic badges
        </Text>
      </Container>
    </Body>
  </Html>
)

export default BadgeApprovedEmail

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
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const badgeImage = {
  borderRadius: '8px',
  border: '2px solid #bbf7d0',
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

const approvedText = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#16a34a',
  margin: '8px 0',
  textAlign: 'center' as const,
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '16px 0',
}

const button = {
  backgroundColor: '#16a34a',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
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
}

const encouragementText = {
  backgroundColor: '#f8f9fa',
  padding: '16px',
  borderRadius: '6px',
  fontSize: '14px',
  color: '#333',
  fontStyle: 'italic',
  margin: '24px 0',
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