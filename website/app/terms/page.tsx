import LegalLayout from "../../components/LegalLayout";
import styles from "../legal.module.css";
import { pageMetadata } from "../../lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "The terms and conditions governing your use of the Salon Central salon management platform.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalLayout>
      <div className={styles.doc}>
        <h1>Terms of Service</h1>
        <span className={styles.updated}>Last updated: May 2026</span>

        <h2>1. Acceptance of Terms</h2>
        <p>
          These Terms of Service ("<strong>Terms</strong>") are an agreement between you, whether personally or on
          behalf of a business ("<strong>you</strong>" or "<strong>your</strong>") and Salon Central ("<strong>Salon Central</strong>,"
          "<strong>we</strong>," "<strong>us</strong>" or "<strong>our</strong>"), concerning your access to and use of our
          platform located at <a href="https://werzio.com">werzio.com</a> and <a href="https://app.werzio.com">app.werzio.com</a>.
        </p>
        <p>
          By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree with any part of
          these Terms, you may not access the Platform.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Salon Central provides a salon management platform that includes appointment booking, client management, staff management,
          point of sale, inventory tracking, revenue management, WhatsApp reminders, and related features designed for
          Pakistan's beauty industry.
        </p>

        <h2>3. Account Registration</h2>
        <p>
          To use the Platform, you must register for an account. You agree to provide accurate, complete, and current
          information during registration and to update such information to keep it accurate. You are responsible for
          maintaining the confidentiality of your account credentials.
        </p>
        <p>
          You are responsible for all activity that occurs under your account. Notify us immediately at{" "}
          <a href="mailto:support@werzio.com">support@werzio.com</a> if you suspect unauthorized access.
        </p>

        <h2>4. Subscription Plans & Billing</h2>
        <p>Salon Central offers the following subscription plans:</p>
        <ul>
          <li><strong>Salon Central Free</strong>: Available at no cost with limited features.</li>
          <li><strong>Salon Central Pro</strong>: contact sales for current pricing.</li>
          <li><strong>Salon Central Premium</strong>: contact sales for current pricing.</li>
        </ul>
        <p>
          All paid plans are billed in advance on a monthly basis. You may cancel at any time. Cancellations take effect
          at the end of the current billing period. We do not offer refunds for partial months.
        </p>

        <h2>5. Acceptable Use</h2>
        <p>You agree not to use the Platform to:</p>
        <ul>
          <li>Violate any applicable laws or regulations in Pakistan or internationally.</li>
          <li>Transmit spam or unsolicited WhatsApp messages to clients who have not opted in.</li>
          <li>Attempt to gain unauthorized access to any part of the Platform or its infrastructure.</li>
          <li>Reverse engineer, decompile, or disassemble any portion of the Platform.</li>
          <li>Use the Platform for any fraudulent or deceptive purpose.</li>
        </ul>

        <h2>6. Data & Privacy</h2>
        <p>
          Your use of the Platform is also governed by our{" "}
          <a href="/privacy">Privacy Policy</a>, which is incorporated into these Terms by reference. By using the Platform,
          you consent to our data practices as described in the Privacy Policy.
        </p>
        <p>
          You retain ownership of all data you upload or create through the Platform, including client records, appointment
          data, and business information. We will not sell your data to third parties.
        </p>

        <h2>7. WhatsApp Integration</h2>
        <p>
          Salon Central's WhatsApp reminder and notification features operate through WhatsApp Business API. By enabling these
          features, you confirm that your clients have consented to receive WhatsApp messages from your salon. You are
          solely responsible for ensuring compliance with WhatsApp's terms of service and applicable messaging regulations.
        </p>

        <h2>8. Intellectual Property</h2>
        <p>
          The Platform and its original content, features, and functionality are and will remain the exclusive property of
          Salon Central. Our trademarks and trade dress may not be used in connection with any product or service without the prior
          written consent of Salon Central.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Salon Central shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages, including loss of profits or revenue, loss of data, or business interruption
          arising from your use of the Platform.
        </p>
        <p>
          Our total liability to you for any claims arising under these Terms shall not exceed the amount you paid to
          Salon Central in the twelve (12) months preceding the claim.
        </p>

        <h2>10. Termination</h2>
        <p>
          We may terminate or suspend your account at any time, with or without cause, and with or without notice, if we
          believe you have violated these Terms. Upon termination, your right to use the Platform will immediately cease.
        </p>

        <h2>11. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will provide reasonable notice of material changes by
          posting the updated Terms on this page with a new "Last updated" date. Your continued use of the Platform after
          changes constitutes acceptance of the new Terms.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of Pakistan, without regard to its
          conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the courts of Lahore,
          Pakistan.
        </p>

        <h2>13. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at{" "}
          <a href="mailto:legal@werzio.com">legal@werzio.com</a> or visit{" "}
          <a href="https://werzio.com">werzio.com</a>.
        </p>
      </div>
    </LegalLayout>
  );
}
