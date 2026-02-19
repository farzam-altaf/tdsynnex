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

    // Navigation items
    const navItems = [
        {
            id: "summary",
            name: "Summary",
            href: "/360dashboard",
            icon: <LayoutDashboard className="w-4 h-4" />
        },
        {
            id: "live-inventory",
            name: "Live Inventory",
            href: "/liveinventory",
            icon: <Package className="w-4 h-4" />
        },
        {
            id: "order-details",
            name: "Order Details",
            href: "/order-details",
            icon: <ShoppingBag className="w-4 h-4" />
        },
        {
            id: "sku-order-detail",
            name: "SKU Order Detail",
            href: "/sku-order-detail",
            icon: <Boxes className="w-4 h-4" />
        },
        {
            id: "win-details",
            name: "Win Details",
            href: "/view-windetails",
            icon: <Trophy className="w-4 h-4" />
        },
        {
            id: "user-list",
            name: "User List",
            href: "/users-list",
            icon: <Users className="w-4 h-4" />
        },
        {
            id: "overdue-orders",
            name: "Overdue Orders",
            href: "/overdue-orders",
            icon: <Clock className="w-4 h-4" />
        },
    ];

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

    // Get current tab from URL
    useEffect(() => {
        const path = window.location.pathname;
        const matchingItem = navItems.find(item => path.includes(item.href));
        if (matchingItem) {
            setActiveTab(matchingItem.id);
        } else if (path === '/360dashboard') {
            setActiveTab('summary');
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A4647]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header/Navigation */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center justify-between h-16">
                        <div className="flex items-center space-x-1 overflow-x-auto">
                            {navItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap
                                        ${activeTab === item.id
                                            ? 'bg-[#0A4647] text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-[#0A4647]'
                                        }
                                    `}
                                >
                                    {item.icon}
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    <div className="md:hidden flex items-center justify-between h-14">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-[#0A4647] transition-colors"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <span className="font-medium text-gray-900">
                            {navItems.find(item => item.id === activeTab)?.name || 'Dashboard'}
                        </span>
                        <div className="w-8"></div> {/* Spacer for alignment */}
                    </div>

                    {/* Mobile Menu Dropdown */}
                    {isMobileMenuOpen && (
                        <div className="md:hidden absolute left-0 right-0 bg-white border-b border-gray-200 shadow-lg py-2 px-4 space-y-1 z-50">
                            {navItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`
                                        flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors
                                        ${activeTab === item.id
                                            ? 'bg-[#0A4647] text-white'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-[#0A4647]'
                                        }
                                    `}
                                >
                                    {item.icon}
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {activeTab === "summary" ? (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-800">Dashboard Summary</h2>
                        </div>
                        {/* Iframe Container */}
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
                ) : (
                    // For other tabs, show a message or redirect
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <p className="text-gray-500">
                            Content for {navItems.find(item => item.id === activeTab)?.name} will be displayed here.
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            This page is under construction or will redirect to its respective route.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}