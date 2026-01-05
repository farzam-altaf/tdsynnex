import Image from "next/image";
import Navbar from "./components/Navbar";
import Banner from "./components/Banner";
import Laptop from "./components/Laptop";
import ImageBanner from "./components/ImageBanner";
import HowItWorks from "./components/how-it-works-section";

export default function Home() {
  return (
    <>
      <Banner />
      <Laptop />
      <ImageBanner />
      <HowItWorks/>
    </>
  );
}
