import LegalHeader from "../../components/LegalHeader";

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LegalHeader />
      {children}
    </>
  );
}
