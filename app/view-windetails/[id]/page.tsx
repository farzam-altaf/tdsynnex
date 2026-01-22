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
import Link from "next/link"

export type Win = {
    id: string
    submitted_by: string
    isOther: boolean
    otherDesc: string
    reseller: string
    orderHash: string
    synnexOrderHash: string
    resellerAccount: string
    customerName: string
    units: number
    deal_rev: number
    purchaseType: string
    purchaseDate: string
    notes: string
    product_id?: string
    order_id?: string
    products?: any // Added for product data
    orders?: any // Added for order data
}

export default function WinDetailsPage() {
    const params = useParams();
    const winId = params.id as string;
    const { profile, isLoggedIn, loading } = useAuth();
    const [win, setWin] = useState<Win | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Check if current user is authorized
    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const ssRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const sRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

    const allowedRoles = [smRole, adminRole, sRole, ssRole].filter(Boolean);
    const isAuthorized = profile?.role && allowedRoles.includes(profile.role);

    // Fetch win details with related data
    const fetchWinDetails = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // First, fetch the win record
            const { data: winData, error: winError } = await supabase
                .from('wins')
                .select('*')
                .eq('id', winId)
                .single();

            if (winError) {
                throw winError;
            }

            if (winData) {
                const winRecord = winData as Win;

                // Fetch related data in parallel
                const [productData, orderData] = await Promise.all([
                    // Fetch product if product_id exists
                    winRecord.product_id ?
                        supabase
                            .from('products')
                            .select('*')
                            .eq('id', winRecord.product_id)
                            .single()
                        : Promise.resolve({ data: null, error: null }),

                    // Fetch order if order_id exists
                    winRecord.order_id ?
                        supabase
                            .from('orders')
                            .select('*')
                            .eq('id', winRecord.order_id)
                            .single()
                        : Promise.resolve({ data: null, error: null })
                ]);

                // Combine all data
                const combinedData = {
                    ...winRecord,
                    product: productData.data,
                    order: orderData.data
                };

                setWin(combinedData);
            }

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch win details');
            } else {
                setError('Failed to fetch win details');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Alternative method using JOIN (if your Supabase supports it)
    const fetchWinDetailsWithJoin = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { data, error: supabaseError } = await supabase
                .from('wins')
                .select(`
                    *,
                    products!left(*),
                    orders!left(*)
                `)
                .eq('id', winId)
                .single();

            if (supabaseError) {
                throw supabaseError;
            }

            if (data) {
                setWin(data as Win);
            }

        } catch (err: unknown) {
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
            // Try the JOIN method first, if it fails, use the parallel method
            fetchWinDetailsWithJoin();
            // Or use: fetchWinDetails();
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

    // Helper to get device name - UPDATED with isOther condition
    const getDeviceName = () => {
        // If isOther is true, show otherDesc
        if (win.isOther && win.otherDesc) {
            return win.otherDesc;
        }

        // Try to get from product first
        if (win.products?.sku) {
            return win.products.sku;
        }
        // Try to get from order's product
        if (win.orders?.products?.sku) {
            return win.orders.products.sku;
        }
        return "-";
    };

    // Helper to get Synnex order number
    const getSynnexOrderNumber = () => {
        // Check win record first
        if (win.synnexOrderHash) {
            return win.synnexOrderHash;
        }
        // Check order record
        if (win.orders?.order_no) {
            return win.orders.order_no;
        }
        return "-";
    };

    // Helper to get notes
    const getNotes = () => {
        // Check win record first
        if (win.notes) {
            return win.notes;
        }
        // Check order record
        if (win.orders?.notes) {
            return win.orders.notes;
        }
        return "-";
    };

    // Convert string to number safely
    const safeParseNumber = (value: any): number => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        const num = parseFloat(value.toString().replace(/[^0-9.-]+/g, ''));
        return isNaN(num) ? 0 : num;
    };

    return (
        <div className="container mx-auto py-10 px-5">

            <div className="h-lvh">

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
                                    {win.orders?.order_no || win.orderHash || "-"}
                                </TableCell>
                            </TableRow>

                            {/* Device Name */}
                            <TableRow>
                                <TableCell className="w-[65%] font-semibold">{!win.isOther ? `Device Name` : 'Device Part #'}</TableCell>
                                <TableCell className="w-[35%] border-l">
                                    {getDeviceName()}
                                </TableCell>
                            </TableRow>

                            {/* Reseller Name */}
                            <TableRow>
                                <TableCell className="w-[65%] font-semibold">Reseller Name</TableCell>
                                <TableCell className="w-[35%] border-l">
                                    {win.reseller || "-"}
                                </TableCell>
                            </TableRow>

                            {/* Reseller Account # */}
                            <TableRow>
                                <TableCell className="w-[65%] font-semibold">Reseller Account #</TableCell>
                                <TableCell className="w-[35%] border-l">
                                    {win.resellerAccount || "-"}
                                </TableCell>
                            </TableRow>

                            {/* Synnex Order # */}
                            <TableRow>
                                <TableCell className="w-[65%] font-semibold">Synnex Order #</TableCell>
                                <TableCell className="w-[35%] border-l">
                                    {getSynnexOrderNumber()}
                                </TableCell>
                            </TableRow>

                            {/* Customer Name */}
                            <TableRow>
                                <TableCell className="w-[65%] font-semibold">Customer Name</TableCell>
                                <TableCell className="w-[35%] border-l">
                                    {win.customerName || "-"}
                                </TableCell>
                            </TableRow>

                            {/* Number of Units */}
                            <TableRow>
                                <TableCell className="w-[65%] font-semibold">Number of Units</TableCell>
                                <TableCell className="w-[35%] border-l">
                                    {formatNumber(safeParseNumber(win.units))}
                                </TableCell>
                            </TableRow>

                            {/* Total Deal Revenue */}
                            <TableRow>
                                <TableCell className="w-[65%] font-semibold">Total Deal Revenue ($)</TableCell>
                                <TableCell className="w-[35%] border-l">
                                    {formatCurrency(safeParseNumber(win.deal_rev))}
                                </TableCell>
                            </TableRow>

                            {/* Purchase Type */}
                            <TableRow>
                                <TableCell className="w-[65%] font-semibold">Is this a one time purchase or roll-out?</TableCell>
                                <TableCell className="w-[35%] border-l">
                                    {win.purchaseType ? (
                                        win.purchaseType.toLowerCase() === "roll-out" ? "Roll-out" : "One-time Purchase"
                                    ) : "-"}
                                </TableCell>
                            </TableRow>

                            {/* Date of Purchase */}
                            <TableRow>
                                <TableCell className="w-[65%] font-semibold">Date of Purchase</TableCell>
                                <TableCell className="w-[35%] border-l">
                                    {win.purchaseDate ? new Date(win.purchaseDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit'
                                    }) : "-"}
                                </TableCell>
                            </TableRow>

                            {/* How Demo Helped */}
                            <TableRow>
                                <TableCell className="w-[65%] font-semibold">How did TD Synnex Surface Demo help you close this deal?</TableCell>
                            </TableRow>

                            {/* How Demo Helped */}
                            <TableRow>
                                <TableCell className="w-[35%] border-l">
                                    {getNotes()}
                                </TableCell>
                            </TableRow>

                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}