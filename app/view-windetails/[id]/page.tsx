"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { supabase } from "@/lib/supabase/client"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export type Win = {
    id: string
    order_no: string
    device_name: string
    reseller_name: string
    reseller_account_no: string
    synnex_order_no: string
    customer_name: string
    number_of_units: number
    total_deal_revenue: number
    purchase_type: string
    date_of_purchase: string
    how_demo_helped: string
}

export default function WinDetailsPage() {
    const params = useParams();
    const winId = params.id as string;
    const { profile, isLoggedIn, loading } = useAuth();
    const [win, setWin] = useState<Win | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Check if current user is authorized (similar to your existing logic)
    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const ssRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const sRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

    const allowedRoles = [smRole, adminRole, sRole, ssRole].filter(Boolean);
    const isAuthorized = profile?.role && allowedRoles.includes(profile.role);

    // Fetch win details from Supabase
    const fetchWinDetails = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { data, error: supabaseError } = await supabase
                .from('wins') // Assuming your table is named 'wins'
                .select('*')
                .eq('id', winId)
                .single();

            if (supabaseError) {
                throw supabaseError;
            }

            if (data) {
                setWin(data as Win);
            }

        } catch (err: unknown) {
            console.error('Error fetching win details:', err);
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch win details');
            } else {
                setError('Failed to fetch win details');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
            fetchWinDetails();
        }
    }, [loading, isLoggedIn, profile, isAuthorized, winId]);

    // Show loading states
    if (loading || isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">You are not authorized to view this page</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg text-red-600">Error: {error}</div>
            </div>
        );
    }

    if (!win) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">No win details found</div>
            </div>
        );
    }

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Format number with commas
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    return (
        <div className="container mx-auto py-10 px-5">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Win Report Details</h1>
                <p className="text-gray-600 mt-2">Order #: {win.order_no || "N/A"}</p>
            </div>

            {/* Win Details Table */}
            <div className="space-y-6">
                <Table className="border">
                    <TableHeader>
                        <TableRow>
                            <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} colSpan={2}>
                                Win Form Details
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Demo Program Order # */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Demo Program Order #</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.order_no || "-"}
                            </TableCell>
                        </TableRow>

                        {/* Device Name */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Device Name</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.device_name || "-"}
                            </TableCell>
                        </TableRow>

                        {/* Reseller Name */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Reseller Name</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.reseller_name || "-"}
                            </TableCell>
                        </TableRow>

                        {/* Reseller Account # */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Reseller Account #</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.reseller_account_no || "-"}
                            </TableCell>
                        </TableRow>

                        {/* Synnex Order # */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Synnex Order #</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.synnex_order_no || "-"}
                            </TableCell>
                        </TableRow>

                        {/* Customer Name */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Customer Name</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.customer_name || "-"}
                            </TableCell>
                        </TableRow>

                        {/* Number of Units */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Number of Units</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.number_of_units ? formatNumber(win.number_of_units) : "0"}
                            </TableCell>
                        </TableRow>

                        {/* Total Deal Revenue */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Total Deal Revenue ($)</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.total_deal_revenue ? formatCurrency(win.total_deal_revenue) : "$0"}
                            </TableCell>
                        </TableRow>

                        {/* Purchase Type */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Is this a one time purchase or roll-out?</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.purchase_type ? (
                                    win.purchase_type.toLowerCase() === "roll-out" ? "Roll-out" : "One-time Purchase"
                                ) : "-"}
                            </TableCell>
                        </TableRow>

                        {/* Date of Purchase */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Date of Purchase</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.date_of_purchase ? new Date(win.date_of_purchase).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                }) : "-"}
                            </TableCell>
                        </TableRow>

                        {/* How Demo Helped */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">How did TD Synnex Surface Demo help you close this deal?</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.how_demo_helped || "-"}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>

                {/* Back Button */}
                <div className="flex justify-start">
                    <button
                        onClick={() => window.history.back()}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer"
                    >
                        Back to Wins List
                    </button>
                </div>
            </div>
        </div>
    )
}