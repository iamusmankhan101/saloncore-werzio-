"use client";

import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e8e8f0", padding: "20px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/salon-central-logo.png" alt="Salon Central" style={{ height: 32, width: "auto" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              <ArrowLeft size={16} /> Back to Home
            </Link>
            <Link href="/sign-up" style={{ padding: "9px 18px", borderRadius: 8, background: "#7C3AED", color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px", display: "grid", gridTemplateColumns: "240px 1fr", gap: 48 }}>
        
        {/* Sidebar */}
        <aside style={{ position: "sticky", top: 48, height: "fit-content" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 20 }}>Legal Terms</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Link href="/privacy" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#6b7280", textDecoration: "none", transition: "all 0.15s" }}>
              Privacy Policy
            </Link>
            <Link href="/terms" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#7C3AED", background: "#f5f3ff", fontWeight: 600, textDecoration: "none" }}>
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
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #7C3AED, #9333EA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={20} color="#fff" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", margin: 0 }}>Salon Central Terms of Use</h1>
          </div>
          
          <div style={{ fontSize: 13, color: "#9999b0", marginBottom: 40 }}>Last Updated: May 30, 2026</div>

          {/* Section 1 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>1. Acceptance of Terms</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              These Terms of Use ("<strong>Terms</strong>") are an agreement between you, whether personally or on behalf of an entity ("<strong>user</strong>," "<strong>you</strong>" or "<strong>your</strong>") and Salon Central ("<strong>Salon Central</strong>", "<strong>we</strong>", "<strong>us</strong>" or "<strong>our</strong>"), concerning your access to and use of our website located at <a href="https://app.werzio.com" style={{ color: "#7C3AED", textDecoration: "none" }}>app.werzio.com</a> (collectively, the "<strong>Website</strong>").
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              Please note that we offer many services. Your use of Salon Central products or services, including without limitation our online business management software platform and related services designed for salons, spas, and other beauty and wellness businesses, are provided by Salon Central pursuant to those agreements you enter when you use those products and services.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              Please read these Terms carefully before you use the Website.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
              These Terms set forth the legally binding Terms that govern your use of the Website. By accessing or using the Website, you are accepting these Terms (on behalf of yourself or the entity that you represent), and you represent and warrant that you have the right, authority, and capacity to enter into these Terms (on behalf of yourself or the entity that you represent). You may not access or use the Website or accept the Terms if you are not at least 18 years old. If you do not agree with all of the provisions of these Terms, do not access or use the Website.
            </p>
          </section>

          {/* Section 2 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>2. Changes</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              These Terms may be revised at any time for any reason, and we may provide you notice of these changes by any reasonable means, including by posting the revised version of the Terms on our website. You can determine when we last updated these Terms by referring to the "Last Updated" legend at the end of the document. By accessing, browsing, or using the Website following the posting of changes to these Terms, you accept such changes. We recommend that you periodically visit this page of the website to review these Terms.
            </p>
          </section>

          {/* Section 3 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>3. Use of the Website</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              Subject to your compliance with these Terms, Salon Central grants you a limited, non-exclusive, non-transferable, non-sublicensable license to access and use the Website for your personal or internal business purposes.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              You agree not to:
            </p>
            <ul style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginLeft: 24, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>Use the Website in any way that violates any applicable national or international law or regulation</li>
              <li style={{ marginBottom: 8 }}>Exploit, harm, or attempt to exploit or harm minors in any way</li>
              <li style={{ marginBottom: 8 }}>Transmit any material that is defamatory, obscene, or offensive</li>
              <li style={{ marginBottom: 8 }}>Engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Website</li>
              <li style={{ marginBottom: 8 }}>Use any robot, spider, or other automatic device to access the Website</li>
              <li style={{ marginBottom: 8 }}>Introduce any viruses, trojan horses, worms, or other malicious code</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>4. Intellectual Property Rights</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              The Website and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof) are owned by Salon Central, its licensors, or other providers of such material and are protected by Pakistan and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
            </p>
          </section>

          {/* Section 5 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>5. User Accounts</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
              You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.
            </p>
          </section>

          {/* Section 6 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>6. Limitation of Liability</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              In no event shall Salon Central, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Website.
            </p>
          </section>

          {/* Section 7 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>7. Governing Law</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
              These Terms shall be governed and construed in accordance with the laws of Pakistan, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
            </p>
          </section>

          {/* Section 8 */}
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 16 }}>8. Contact Us</h2>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", marginBottom: 16 }}>
              If you have any questions about these Terms, please contact us:
            </p>
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px" }}>
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 8 }}>
                <strong>Email:</strong> <a href="mailto:support@werzio.com" style={{ color: "#7C3AED", textDecoration: "none" }}>support@werzio.com</a>
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
