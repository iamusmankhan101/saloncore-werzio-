"use client";

import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e8e8f0", padding: "20px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/salon-central-logo.png" alt="Salon Central" style={{ height: 32, width: "auto" }} />
          </Link>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px", display: "grid", gridTemplateColumns: "240px 1fr", gap: 48 }}>
        
        {/* Sidebar */}
        <aside style={{ position: "sticky", top: 48, height: "fit-content" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 20 }}>Legal Terms</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Link href="/privacy" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#7C3AED", background: "#f5f3ff", fontWeight: 600, textDecoration: "none" }}>
              Privacy Policy
            </Link>
            <Link href="/terms" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#6b7280", textDecoration: "none", transition: "all 0.15s" }}>
              Website Terms of Use
            </Link>
            <Link href="/data-processing" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#6b7280", textDecoration: "none", transition: "all 0.15s" }}>
              Data Processing
            </Link>
            <Link href="/payments" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#6b7280", textDecoration: "none", transition: "all 0.15s" }}>
              Payments Terms
            </Link>
            <Link href="/platform" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#6b7280", textDecoration: "none", transition: "all 0.15s" }}>
              Platform Terms
            </Link>
          </nav>
        </aside>

        {/* Content */}
        <main style={{ background: "#fff", borderRadius: 16, padding: "48px 56px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e8e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #059669, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={20} color="#fff" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", margin: 0 }}>Privacy Policy</h1>
          </div>
          
          <div style={{ fontSize: 13, color: "#9999b0", marginBottom: 40 }}>Last Updated: May 30, 2026</div>

          {/* Introduction */}
          <section style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              At Salon Central ("<strong>we</strong>", "<strong>us</strong>", or "<strong>our</strong>"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website <a href="https://app.werzio.com" style={{ color: "#7C3AED", textDecoration: "none" }}>app.werzio.com</a> and use our services.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
              Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the site or use our services.
            </p>
          </section>

          {/* Section 1 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>1. Information We Collect</h2>
            
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 12, marginTop: 20 }}>Personal Information</h3>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              We collect personal information that you voluntarily provide to us when you register on the Website, express an interest in obtaining information about us or our products and services, or otherwise contact us. The personal information we collect may include:
            </p>
            <ul style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginLeft: 24, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>Name and contact information (email address, phone number)</li>
              <li style={{ marginBottom: 8 }}>Business information (salon name, business address)</li>
              <li style={{ marginBottom: 8 }}>Account credentials (username, password)</li>
              <li style={{ marginBottom: 8 }}>Payment information (processed securely through third-party payment processors)</li>
              <li style={{ marginBottom: 8 }}>Client data you input into our system (names, contact details, appointment history)</li>
            </ul>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 12, marginTop: 20 }}>Automatically Collected Information</h3>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              When you access our Website, we automatically collect certain information about your device, including:
            </p>
            <ul style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginLeft: 24, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>IP address and browser type</li>
              <li style={{ marginBottom: 8 }}>Operating system and device information</li>
              <li style={{ marginBottom: 8 }}>Usage data (pages visited, time spent, features used)</li>
              <li style={{ marginBottom: 8 }}>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>2. How We Use Your Information</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              We use the information we collect or receive to:
            </p>
            <ul style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginLeft: 24, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>Provide, operate, and maintain our services</li>
              <li style={{ marginBottom: 8 }}>Process your transactions and manage your account</li>
              <li style={{ marginBottom: 8 }}>Send you administrative information, updates, and security alerts</li>
              <li style={{ marginBottom: 8 }}>Respond to your inquiries and provide customer support</li>
              <li style={{ marginBottom: 8 }}>Improve and optimize our Website and services</li>
              <li style={{ marginBottom: 8 }}>Monitor and analyze usage patterns and trends</li>
              <li style={{ marginBottom: 8 }}>Detect, prevent, and address technical issues and security threats</li>
              <li style={{ marginBottom: 8 }}>Send you marketing communications (with your consent)</li>
              <li style={{ marginBottom: 8 }}>Comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>3. How We Share Your Information</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              We may share your information in the following situations:
            </p>
            <ul style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginLeft: 24, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}><strong>Service Providers:</strong> We share information with third-party vendors who perform services on our behalf (payment processing, email delivery, hosting, analytics)</li>
              <li style={{ marginBottom: 8 }}><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, financing, or acquisition of all or a portion of our business</li>
              <li style={{ marginBottom: 8 }}><strong>Legal Requirements:</strong> When required by law or to protect our rights, property, or safety</li>
              <li style={{ marginBottom: 8 }}><strong>With Your Consent:</strong> We may share your information for any other purpose with your explicit consent</li>
            </ul>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
              We do not sell your personal information to third parties.
            </p>
          </section>

          {/* Section 4 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>4. Data Security</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginLeft: 24, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>Encryption of data in transit and at rest</li>
              <li style={{ marginBottom: 8 }}>Secure database storage with Turso (libSQL)</li>
              <li style={{ marginBottom: 8 }}>Regular security assessments and updates</li>
              <li style={{ marginBottom: 8 }}>Access controls and authentication mechanisms</li>
              <li style={{ marginBottom: 8 }}>Employee training on data protection practices</li>
            </ul>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
            </p>
          </section>

          {/* Section 5 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>5. Data Retention</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
              We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need your information, we will securely delete or anonymize it.
            </p>
          </section>

          {/* Section 6 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>6. Your Privacy Rights</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              Depending on your location, you may have the following rights regarding your personal information:
            </p>
            <ul style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginLeft: 24, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li style={{ marginBottom: 8 }}><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li style={{ marginBottom: 8 }}><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li style={{ marginBottom: 8 }}><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li style={{ marginBottom: 8 }}><strong>Objection:</strong> Object to processing of your personal information</li>
              <li style={{ marginBottom: 8 }}><strong>Withdraw Consent:</strong> Withdraw consent for marketing communications</li>
            </ul>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
              To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          {/* Section 7 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>7. Cookies and Tracking Technologies</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              We use cookies and similar tracking technologies to track activity on our Website and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Website.
            </p>
          </section>

          {/* Section 8 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>8. Third-Party Services</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              Our Website may contain links to third-party websites or integrate with third-party services (such as WhatsApp Business API, payment processors, and email services). We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
            </p>
          </section>

          {/* Section 9 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>9. Children's Privacy</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us, and we will take steps to delete such information.
            </p>
          </section>

          {/* Section 10 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>10. Changes to This Privacy Policy</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          {/* Section 11 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>11. Contact Us</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
                <strong>Email:</strong> <a href="mailto:privacy@werzio.com" style={{ color: "#7C3AED", textDecoration: "none" }}>privacy@werzio.com</a>
              </div>
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
                <strong>Phone:</strong> +92 305 8562523
              </div>
              <div style={{ fontSize: 14, color: "#374151" }}>
                <strong>Website:</strong> <a href="https://app.werzio.com" style={{ color: "#7C3AED", textDecoration: "none" }}>app.werzio.com</a>
              </div>
            </div>
          </section>

          {/* Footer note */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e8e8f0", fontSize: 13, color: "#9999b0", textAlign: "center" }}>
            © 2026 Salon Central. All rights reserved.
          </div>
        </main>
      </div>
    </div>
  );
}
