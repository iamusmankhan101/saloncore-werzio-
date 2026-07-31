import PayrollFeaturePage from "../../../components/PayrollFeaturePage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Payroll Software in Pakistan for Salons",
  description: "Payroll software in Pakistan for salons. Salon Central manages staff salaries, commissions, payouts, attendance, and payroll reports.",
  path: "/features/payroll-management",
});

const webPageSchema = webPageJsonLd({
  name: "Payroll Software in Pakistan for Salons | Salon Central",
  description: "Payroll software in Pakistan for salons. Salon Central manages staff salaries, commissions, payouts, attendance, and payroll reports.",
  path: "/features/payroll-management",
});

export default function PayrollManagementPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <PayrollFeaturePage />
    </>
  );
}
