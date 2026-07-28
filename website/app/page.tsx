import Navbar        from "../components/Navbar";
import Hero          from "../components/Hero";
import TrustedBy     from "../components/TrustedBy";
import Features      from "../components/Features";
import HowItWorks    from "../components/HowItWorks";
import WhySalonCentral from "../components/WhySalonCentral";
import Testimonials  from "../components/Testimonials";
import BlogSection   from "../components/BlogSection";
import Pricing       from "../components/Pricing";
import Footer        from "../components/Footer";
import ScrollReveal  from "../components/ScrollReveal";
import { getPublishedPosts } from "../lib/blog";

export const revalidate = 60;

export default async function Home() {
  const posts = await getPublishedPosts();
  return (
    <>
      <ScrollReveal />
      <Navbar dark />
      <Hero />
      <TrustedBy />
      <Features />
      <HowItWorks />
      <WhySalonCentral />
      <Testimonials />
      <BlogSection posts={posts} />
      <Pricing />
      <Footer />
    </>
  );
}
