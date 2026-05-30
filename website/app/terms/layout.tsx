import LegalHeader from "../../components/LegalHeader";

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LegalHeader />
      {children}
    </>
  );
}
