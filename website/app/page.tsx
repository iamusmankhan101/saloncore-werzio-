import Navbar        from "../components/Navbar";
import Hero          from "../components/Hero";
import TrustedBy     from "../components/TrustedBy";
import Features      from "../components/Features";
import HowItWorks    from "../components/HowItWorks";
import WhySalonCentral from "../components/WhySalonCentral";
import Testimonials  from "../components/Testimonials";
import Pricing       from "../components/Pricing";
import Footer        from "../components/Footer";
import ScrollReveal  from "../components/ScrollReveal";

export default function Home() {
  return (
    <>
      <ScrollReveal />
      <Navbar />
      <Hero />
      <TrustedBy />
      <Features />
      <HowItWorks />
      <WhySalonCentral />
      <Testimonials />
      <Pricing />
      <Footer />
    </>
  );
}
