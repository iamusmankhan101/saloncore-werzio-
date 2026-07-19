import Navbar from "../../components/Navbar";

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar forceSolid />
      {children}
    </>
  );
}
