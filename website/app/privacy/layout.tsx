import Navbar from "../../components/Navbar";

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar forceSolid />
      {children}
    </>
  );
}
