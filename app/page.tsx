"use client"
import Image from "next/image";
import Navbar from "./components/Navbar";
import Banner from "./components/Banner";
import Laptop from "./components/Laptop";
import ImageBanner from "./components/ImageBanner";
import HowItWorks from "./components/how-it-works-section";
import { Suspense, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { useRouter } from "next/navigation";
import LoginForm from "./login/LoginForm";

export default function Home() {

  const { profile, isLoggedIn, loading, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;

    if (!isLoggedIn || !profile?.isVerified) {
      router.replace(`/login`);
      return;
    }

  }, [loading, isLoggedIn, profile, router]);


  return (
    <>
      {isLoggedIn ? (
        <>
          <Banner />
          <Laptop />
          <ImageBanner />
          <HowItWorks />
        </>
      ) : (
         <Suspense fallback={null}>
           <LoginForm />
         </Suspense>
      )}
    </>
  );
}
