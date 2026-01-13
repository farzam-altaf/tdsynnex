"use client"

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading, user } = useAuth();
    const [authChecked, setAuthChecked] = useState(false);
    const [authInitialized, setAuthInitialized] = useState(false);


    // Handle auth check - IMPROVED VERSION
    useEffect(() => {
        // Only run auth check after auth is fully initialized
        if (loading) {
            // Still loading auth state
            console.log("AuthContext is still loading...");
            return;
        }

        // AuthContext loading is done, mark as initialized
        console.log("AuthContext loaded - User:", user, "Profile:", profile, "isLoggedIn:", isLoggedIn);
        setAuthInitialized(true);

        // Now check authentication status
        if (!isLoggedIn || profile?.isVerified === false && !profile) {
            console.log("User not authenticated, redirecting to login");
            router.replace('/login/?redirect_to=users');
        } else {
            console.log("User authenticated, setting authChecked to true");
            setAuthChecked(true);
        }
    }, [loading, isLoggedIn, profile, user, router]);

    // Fetch data only after auth is confirmed AND initialized
    useEffect(() => {
        if (!authChecked || !authInitialized) {
            return; // Don't fetch data until auth is fully checked AND initialized
        }

        console.log("Auth confirmed and initialized, fetching data...");
    }, [authChecked, authInitialized]);

    return (
        <div className="">
            My Users
        </div>
    )
}