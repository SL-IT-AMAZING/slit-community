import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const getDomain = (url) => {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

export default function NewsletterEmail({
  previewText = "이번 주 AI 트렌드",
  issueNumber = 1,
  date = new Date().toLocaleDateString("ko-KR"),
  greeting = "안녕하세요!",
  intro = "이번 주 AI 세계에서 주목할 만한 소식들을 정리했습니다.",
  sections = [],
  unsubscribeUrl = "#",
}) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={logo}>AI Community</Heading>
            <Text style={issueInfo}>
              #{issueNumber} · {date}
            </Text>
          </Section>

          <Section style={content}>
            <Text style={greetingStyle}>{greeting}</Text>
            <Text style={introStyle}>{intro}</Text>

            {sections.map((section, index) => (
              <Section key={index} style={sectionStyle}>
                <Heading as="h2" style={sectionTitle}>
                  {section.emoji} {section.title}
                </Heading>

                {section.items.map((item, itemIndex) => {
                  const domain = getDomain(item.url);
                  return (
                    <Section key={itemIndex} style={itemStyle}>
                      {item.thumbnailUrl && (
                        <Link href={item.url}>
                          <Img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            style={itemThumbnail}
                          />
                        </Link>
                      )}
                      <Section style={itemContentArea}>
                        {domain && (
                          <Text style={domainRow}>
                            <Img
                              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                              alt=""
                              style={faviconImg}
                            />
                            <span style={domainText}>{domain}</span>
                          </Text>
                        )}
                        <Link href={item.url} style={itemTitle}>
                          {item.title}
                        </Link>
                        <Text style={itemDescription}>{item.summary}</Text>
                      </Section>
                    </Section>
                  );
                })}

                {index < sections.length - 1 && <Hr style={divider} />}
              </Section>
            ))}
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              AI Community 뉴스레터를 구독해 주셔서 감사합니다.
            </Text>
            <Text style={footerText}>
              <Link href={unsubscribeUrl} style={unsubscribeLink}>
                구독 취소
              </Link>
              {" · "}
              <Link
                href="https://west-monroe.vercel.app"
                style={unsubscribeLink}
              >
                웹사이트 방문
              </Link>
            </Text>
            <Text style={copyright}>
              © 2025 AI Community. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 48px",
  textAlign: "center",
  borderBottom: "1px solid #e6ebf1",
};

const logo = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 8px",
};

const issueInfo = {
  color: "#666666",
  fontSize: "14px",
  margin: "0",
};

const content = {
  padding: "32px 48px",
};

const greetingStyle = {
  color: "#1a1a1a",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 16px",
};

const introStyle = {
  color: "#4a4a4a",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 32px",
};

const sectionStyle = {
  marginBottom: "24px",
};

const sectionTitle = {
  color: "#1a1a1a",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 16px",
};

const itemStyle = {
  marginBottom: "20px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  border: "1px solid #e6ebf1",
  overflow: "hidden",
};

const itemTitle = {
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  display: "block",
  marginBottom: "8px",
  lineHeight: "1.4",
};

const itemDescription = {
  color: "#4a4a4a",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px",
};

const itemThumbnail = {
  width: "100%",
  maxWidth: "568px",
  height: "auto",
  display: "block",
};

const itemContentArea = {
  padding: "16px",
};

const domainRow = {
  margin: "0 0 8px 0",
  fontSize: "12px",
  lineHeight: "16px",
};

const faviconImg = {
  width: "16px",
  height: "16px",
  marginRight: "6px",
  borderRadius: "2px",
  verticalAlign: "middle",
  display: "inline",
};

const domainText = {
  color: "#6b7280",
  fontSize: "12px",
  verticalAlign: "middle",
};

const divider = {
  borderColor: "#e6ebf1",
  margin: "32px 0",
};

const footer = {
  padding: "0 48px",
  textAlign: "center",
};

const footerText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "0 0 8px",
};

const unsubscribeLink = {
  color: "#8898aa",
  textDecoration: "underline",
};

const copyright = {
  color: "#8898aa",
  fontSize: "12px",
  margin: "16px 0 0",
};
