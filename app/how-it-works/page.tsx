"use client"

import { useRouter } from "next/navigation";
import HowItWorks from "../components/how-it-works-section";
import { useAuth } from "../context/AuthContext";
import { Suspense, useEffect } from "react";
import LoginForm from "../login/LoginForm";

export default function Page() {
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
                <Suspense fallback={null}>
                    <HowItWorks />
                </Suspense>
            ) : (
                <Suspense fallback={null}>
                    <LoginForm />
                </Suspense>
            )}
        </>
    )
}