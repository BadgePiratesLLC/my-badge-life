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

interface BadgeRejectedEmailProps {
  badgeName: string
  makerName: string
  teamName?: string
  category?: string
  imageUrl?: string
  rejectionReason?: string
  guidelinesUrl: string
  submitUrl: string
}

export const BadgeRejectedEmail = ({
  badgeName,
  makerName,
  teamName,
  category,
  imageUrl,
  rejectionReason,
  guidelinesUrl,
  submitUrl,
}: BadgeRejectedEmailProps) => (
  <Html>
    <Head />
    <Preview>Badge submission "{badgeName}" needs revision</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>📝 Badge Submission Update</Heading>
        
        <Text style={text}>
          Hi {makerName}, thank you for your badge submission. Unfortunately, "{badgeName}" requires some revisions before it can be approved.
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
              <Text style={rejectedText}>❌ Status: NEEDS REVISION</Text>
            </Column>
          </Row>
        </Section>

        {rejectionReason && (
          <Section style={reasonSection}>
            <Text style={sectionTitle}>Feedback:</Text>
            <Text style={reasonText}>{rejectionReason}</Text>
          </Section>
        )}

        <Text style={text}>
          Don't worry! This is a common part of the submission process. Please review our guidelines and make the necessary adjustments, then resubmit your badge.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={guidelinesUrl}>
            Review Badge Guidelines
          </Button>
        </Section>

        <Section style={buttonSection}>
          <Button style={secondaryButton} href={submitUrl}>
            Submit Revised Badge
          </Button>
        </Section>

        <Section style={tipsSection}>
          <Text style={tipsTitle}>💡 Quick Tips:</Text>
          <Text style={tipsText}>
            • Ensure your badge image is clear and high-quality<br />
            • Include accurate team and category information<br />
            • Provide a detailed description of the badge<br />
            • Check that external links are working correctly
          </Text>
        </Section>

        <Text style={footer}>
          <Link href={guidelinesUrl} style={link}>
            MyBadgeLife Badge Guidelines
          </Link>
          <br />
          Questions? Contact our admin team for assistance
        </Text>
      </Container>
    </Body>
  </Html>
)

export default BadgeRejectedEmail

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
  backgroundColor: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const badgeImage = {
  borderRadius: '8px',
  border: '2px solid #fbbf24',
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

const rejectedText = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#d97706',
  margin: '8px 0',
  textAlign: 'center' as const,
}

const reasonSection = {
  backgroundColor: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const sectionTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0 0 8px 0',
}

const reasonText = {
  fontSize: '14px',
  color: '#333',
  margin: '0',
  fontStyle: 'italic',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '16px 0',
}

const button = {
  backgroundColor: '#d97706',
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

const tipsSection = {
  backgroundColor: '#e0f2fe',
  border: '1px solid #0ea5e9',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const tipsTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#0ea5e9',
  margin: '0 0 8px 0',
}

const tipsText = {
  fontSize: '14px',
  color: '#333',
  margin: '0',
  lineHeight: '20px',
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