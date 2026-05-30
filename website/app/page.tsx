import Navbar       from "../components/Navbar";
import Hero         from "../components/Hero";
import TrustedBy    from "../components/TrustedBy";
import Features     from "../components/Features";
import HowItWorks   from "../components/HowItWorks";
import WhyWerzio    from "../components/WhyWerzio";
import Testimonials from "../components/Testimonials";
import Pricing      from "../components/Pricing";
import Footer       from "../components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <TrustedBy />
      <Features />
      <HowItWorks />
      <WhyWerzio />
      <Testimonials />
      <Pricing />
      <Footer />
    </>
  );
}
