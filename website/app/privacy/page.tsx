import LegalLayout from "../../components/LegalLayout";
import styles from "../legal.module.css";

export const metadata = {
  title: "Privacy Policy — Werzio",
};

export default function PrivacyPage() {
  return (
    <LegalLayout>
      <div className={styles.doc}>
        <h1>Privacy Policy</h1>
        <span className={styles.updated}>Last updated: May 2026</span>

        <h2>1. Introduction</h2>
        <p>
          Werzio ("<strong>we</strong>," "<strong>us</strong>," or "<strong>our</strong>") is committed to protecting
          your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when
          you use our salon management platform at <a href="https://werzio.com">werzio.com</a> and{" "}
          <a href="https://app.werzio.com">app.werzio.com</a>.
        </p>
        <p>
          Please read this policy carefully. If you disagree with its terms, please discontinue use of the Platform.
        </p>

        <h2>2. Information We Collect</h2>
        <p>We collect the following types of information:</p>
        <ul>
          <li>
            <strong>Account Information:</strong> Name, email address, phone number, salon name, and business details
            when you register.
          </li>
          <li>
            <strong>Business Data:</strong> Appointment records, client profiles, staff details, service menus,
            inventory, and revenue data that you enter into the Platform.
          </li>
          <li>
            <strong>Client Data:</strong> Information about your salon's clients that you add to the Platform, including
            names, contact details, visit history, and hair/skin formulas.
          </li>
          <li>
            <strong>Payment Information:</strong> Billing details processed through our payment partners. We do not store
            full payment card numbers.
          </li>
          <li>
            <strong>Usage Data:</strong> Log files, IP addresses, browser type, pages visited, and time spent on the
            Platform, collected automatically.
          </li>
          <li>
            <strong>Device Information:</strong> Device type, operating system, and unique device identifiers.
          </li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and maintain the Platform.</li>
          <li>Process transactions and send billing-related communications.</li>
          <li>Send WhatsApp reminders and notifications on your behalf to your clients.</li>
          <li>Improve, personalize, and expand the Platform's features.</li>
          <li>Respond to support requests and troubleshoot issues.</li>
          <li>Send product updates, security alerts, and administrative messages.</li>
          <li>Comply with legal obligations under Pakistani law.</li>
        </ul>

        <h2>4. WhatsApp Data & Messaging</h2>
        <p>
          Werzio uses the WhatsApp Business API to send automated appointment confirmations, reminders, and follow-up
          messages to your clients on your behalf. By enabling WhatsApp features, you confirm that:
        </p>
        <ul>
          <li>Your clients have consented to receive WhatsApp messages from your salon.</li>
          <li>You are responsible for maintaining opt-in records for your clients.</li>
          <li>Werzio acts as a data processor for WhatsApp communications you initiate.</li>
        </ul>
        <p>
          We do not use your clients' WhatsApp data for our own marketing or share it with third parties.
        </p>

        <h2>5. Data Sharing & Disclosure</h2>
        <p>We do not sell your personal data. We may share your information only in the following circumstances:</p>
        <ul>
          <li>
            <strong>Service Providers:</strong> Trusted third-party vendors who assist us in operating the Platform
            (e.g., cloud hosting, payment processing, SMS/WhatsApp delivery). These parties are bound by confidentiality
            agreements.
          </li>
          <li>
            <strong>Legal Requirements:</strong> If required by Pakistani law, court order, or government authority.
          </li>
          <li>
            <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of all or part of our
            assets, your data may be transferred as part of that transaction.
          </li>
        </ul>

        <h2>6. Data Security</h2>
        <p>
          We implement industry-standard security measures including SSL/TLS encryption, secure data centers, and
          access controls to protect your information. However, no method of transmission over the internet is 100%
          secure and we cannot guarantee absolute security.
        </p>
        <p>
          In the event of a data breach that affects your personal information, we will notify you in accordance with
          applicable law.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          We retain your account and business data for as long as your account is active. After account termination,
          we retain data for up to 90 days before permanent deletion, unless a longer retention period is required by
          law. You may request earlier deletion by contacting us.
        </p>

        <h2>8. Your Rights</h2>
        <p>Depending on your location and applicable law, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your personal data.</li>
          <li>Export your data in a portable format.</li>
          <li>Withdraw consent for data processing where consent is the legal basis.</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a href="mailto:privacy@werzio.com">privacy@werzio.com</a>.
        </p>

        <h2>9. Cookies</h2>
        <p>
          We use cookies and similar tracking technologies to enhance your experience on the Platform. Essential cookies
          are required for the Platform to function. You may configure your browser to reject non-essential cookies,
          though this may affect certain features.
        </p>

        <h2>10. Children's Privacy</h2>
        <p>
          The Platform is not directed to children under the age of 18. We do not knowingly collect personal information
          from minors. If you believe a minor has provided us with personal information, please contact us immediately.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the
          new policy on this page with an updated date. We encourage you to review this policy periodically.
        </p>

        <h2>12. Contact Us</h2>
        <p>
          If you have questions or concerns about this Privacy Policy, please contact us at:
        </p>
        <ul>
          <li>Email: <a href="mailto:privacy@werzio.com">privacy@werzio.com</a></li>
          <li>Website: <a href="https://werzio.com">werzio.com</a></li>
          <li>Location: Lahore, Pakistan</li>
        </ul>
      </div>
    </LegalLayout>
  );
}
