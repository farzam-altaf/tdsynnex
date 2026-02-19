"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Boxes,
    Trophy,
    Users,
    Clock,
    Menu,
    X
} from "lucide-react";

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading } = useAuth();
    const [activeTab, setActiveTab] = useState<string>("summary");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const superSubscriberRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;

    const allowedRoles = [adminRole, superSubscriberRole].filter(Boolean);
    const isAuthorized = profile?.role && allowedRoles.includes(profile?.role);



    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            router.replace('/login/?redirect_to=360dashboard');
            return;
        }

        if (!isAuthorized) {
            router.replace('/product-category/alldevices');
            return;
        }
    }, [loading, isLoggedIn, profile, router, isAuthorized]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A4647]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="w-full" style={{ height: 'calc(100vh - 200px)' }}>
                <iframe
                    src="https://lookerstudio.google.com/embed/reporting/54eb4bb8-52d2-486c-8669-7e8d4d41d9e2" // Replace with your actual summary URL
                    className="w-full h-full border-0"
                    title="Dashboard Summary"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    loading="lazy"
                />
            </div>
        </div>
    );
}