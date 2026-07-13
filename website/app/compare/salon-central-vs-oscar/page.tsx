import ComparisonPage from "../../../components/ComparisonPage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Salon Central vs Oscar POS Software",
  description:
    "Compare Salon Central and Oscar POS: see which salon software offers appointment scheduling, client profiles, and WhatsApp automation built for salons.",
  path: "/compare/salon-central-vs-oscar",
  keywords: [
    "salon central vs oscar",
    "oscar pos alternative",
    "salon pos software pakistan",
    "best salon software pakistan",
    "oscar pos pakistan",
  ],
});

export default function SalonCentralVsOscarPage() {
  return (
    <ComparisonPage
      competitorName="Oscar"
      competitorUrl="https://oscar.pk"
      competitorSummary="Oscar is a general POS and business management platform serving restaurants, retail stores, fitness centers, clinics, and beauty salons among many other business types, rather than focusing specifically on salons."
      rows={[
        {
          feature: "Built specifically for salons & beauty businesses",
          salonCentral: true,
          competitor: false,
          note: "Oscar lists beauty salons, hair salons, and spas alongside restaurants, gyms, clinics, and vape shops as supported business types.",
        },
        { feature: "Appointment scheduling & staff calendars", salonCentral: true, competitor: false },
        { feature: "Online client booking page", salonCentral: true, competitor: false },
        { feature: "Client beauty profiles (hair formulas, allergy alerts, skin type)", salonCentral: true, competitor: false },
        {
          feature: "WhatsApp automation (confirmations, reminders, follow-ups)",
          salonCentral: true,
          competitor: false,
          note: "Oscar lists WhatsApp only as a contact channel, not an automated messaging feature.",
        },
        { feature: "Loyalty / rewards program", salonCentral: true, competitor: true },
        { feature: "Employee management", salonCentral: true, competitor: true },
        { feature: "Multi-location / franchise support", salonCentral: true, competitor: true },
        { feature: "Published starting price", salonCentral: "Contact for pricing", competitor: "Not published — free trial only" },
      ]}
      verdict="Oscar is a broad, multi-industry POS platform that happens to list beauty salons among the many business types it supports, alongside restaurants, gyms, and clinics. That breadth means it has no salon-specific appointment calendar, client beauty profiles, or automated WhatsApp reminders. Salon Central is built around exactly those workflows: bookings, staff schedules, client history, and WhatsApp automation designed specifically for how a salon operates day to day."
      faqs={[
        {
          q: "Is Oscar designed specifically for salons?",
          a: "No. Oscar is a general POS platform that supports many business types, including restaurants, gyms, clinics, and salons, but it doesn't include salon-specific features like appointment scheduling or client beauty profiles.",
        },
        {
          q: "Does Oscar send automated WhatsApp appointment reminders?",
          a: "Oscar lists WhatsApp only as a customer support contact channel on its website, not as a feature for sending automated booking confirmations or reminders.",
        },
        {
          q: "What does Salon Central offer that Oscar doesn't?",
          a: "Salon Central includes appointment scheduling with staff calendars, an online client booking page, client beauty profiles, staff commission payroll, and automated WhatsApp confirmations, reminders, and follow-ups, built specifically for salons rather than as one of many supported industries.",
        },
        {
          q: "Is Oscar's pricing public?",
          a: "No, Oscar does not publish pricing tiers on its website; it promotes a free trial and demo instead. Salon Central's pricing is also available on request.",
        },
      ]}
    />
  );
}
