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
    orderHash: string // Yehi field aap use kar rahe hain
    resellerAccount: string
    customerName: string
    units: number
    deal_rev: number
    purchaseType: string
    purchaseDate: string
    notes: string
    product_id?: string | string[] // Can be string or array
    order_id?: string
    products?: any
    orders?: any
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

    // Format date to dd-MMM-yyyy
    const formatDateToCustomFormat = (dateString: string | null) => {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';

            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();

            return `${day}-${month}-${year}`;
        } catch (error) {
            return 'N/A';
        }
    };

    // Fetch win details with related data - UPDATED
    const fetchWinDetails = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // First, fetch the win record with LEFT JOIN on orders
            const { data: winData, error: winError } = await supabase
                .from('wins')
                .select(`
                    *,
                    orders:order_id (
                        order_no,
                        company_name,
                        reseller,
                        crm_account,
                        order_date
                    )
                `)
                .eq('id', winId)
                .single();

            if (winError) {
                throw winError;
            }

            if (winData) {
                const winRecord = winData as any;

                // Agar product_id JSON string hai to parse karein
                let productIds: string[] = [];
                if (winRecord.product_id) {
                    try {
                        if (typeof winRecord.product_id === 'string') {
                            const parsed = JSON.parse(winRecord.product_id);
                            if (Array.isArray(parsed)) {
                                productIds = parsed;
                            } else if (parsed) {
                                productIds = [parsed];
                            }
                        } else if (Array.isArray(winRecord.product_id)) {
                            productIds = winRecord.product_id;
                        }
                    } catch (e) {
                        // Agar JSON parse nahi ho sakta to direct use karein
                        if (typeof winRecord.product_id === 'string') {
                            productIds = [winRecord.product_id];
                        }
                    }
                }

                // Fetch products if productIds exist
                let productsData = null;
                if (productIds.length > 0) {
                    const { data: products, error: productsError } = await supabase
                        .from('products')
                        .select('id, product_name, sku')
                        .in('id', productIds);

                    if (!productsError && products) {
                        productsData = products;
                    }
                }

                // Combine all data
                const combinedData = {
                    ...winRecord,
                    products: productsData,
                    // orders already included in the join
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

    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
            fetchWinDetails();
        }
    }, [loading, isLoggedIn, profile, isAuthorized, winId]);

    // Show loading states
    if (loading || isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">Loading win details...</div>
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
                <button
                    onClick={() => fetchWinDetails()}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Try Again
                </button>
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

    // Helper to get device names - UPDATED for multiple products
    const getDeviceNames = () => {
        // If isOther is true, show otherDesc
        if (win.isOther && win.otherDesc) {
            return win.otherDesc;
        }

        // For multiple products
        if (win.products && Array.isArray(win.products) && win.products.length > 0) {
            if (win.products.length === 1) {
                return win.products[0]?.sku || win.products[0]?.sku || "Unknown Product";
            } else {
                return win.products.map((p: any) => p.sku || p.sku || "Unknown Product").join(", ");
            }
        }

        return "-";
    };

    // Helper to get Synnex order number - FIXED: Use orderHash instead of synnexOrderHash
    const getSynnexOrderNumber = () => {
        // Check win record first - FIX: Use orderHash
        if (win.orderHash) {
            return win.orderHash;
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
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Win Details</h1>
                <p className="text-gray-600 mt-2">View detailed information about this win report</p>
            </div>

            <div className="mb-6">
                <Link
                    href="/view-windetails"
                    className="text-blue-500 hover:text-blue-700 hover:underline"
                >
                    ← Back to Wins List
                </Link>
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
                        {/* Submitted By */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Submitted By</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.submitted_by || "-"}
                            </TableCell>
                        </TableRow>

                        {/* Demo Program Order # */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Demo Program Order #</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.orders?.order_no || "-"}
                            </TableCell>
                        </TableRow>

                        {/* Device Name */}
                        {/* Device Name */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">
                                {!win.isOther ? `Device Name${win.products && Array.isArray(win.products) && win.products.length > 1 ? 's' : ''}` : 'Device Part #'}
                            </TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.products && Array.isArray(win.products) && win.products.length > 0 ? (
                                    win.products.length === 1 ? (
                                        <div>{win.products[0]?.sku || "Unknown Product"}</div>
                                    ) : (
                                        <div>
                                            {win.products.map((product: any, index: number) => (
                                                <div key={product.id || index} className="mb-1">
                                                    {product.sku || "Unknown Product"}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ) : (
                                     <div>{win.otherDesc || "Unknown Product"}</div>
                                )}
                            </TableCell>
                        </TableRow>

                        {/* Product Type */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Product Type</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.isOther ? "Other Product" : "Standard Product"}
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

                        {/* Synnex Order # - FIXED: Using orderHash */}
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
                                    win.purchaseType.toLowerCase() === "roll-out" ? "Roll-out" :
                                        win.purchaseType.toLowerCase() === "one-time" ? "One-time Purchase" : win.purchaseType
                                ) : "-"}
                            </TableCell>
                        </TableRow>

                        {/* Date of Purchase */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold">Date of Purchase</TableCell>
                            <TableCell className="w-[35%] border-l">
                                {win.purchaseDate ? formatDateToCustomFormat(win.purchaseDate) : "-"}
                            </TableCell>
                        </TableRow>

                        {/* How Demo Helped */}
                        <TableRow>
                            <TableCell className="w-[65%] font-semibold align-top">
                                How did TD Synnex Surface help you close this deal?
                            </TableCell>
                            <TableCell className="w-[35%] border-l">
                                <div className="whitespace-pre-wrap">{getNotes()}</div>
                            </TableCell>
                        </TableRow>

                    </TableBody>
                </Table>

                {/* Product Details Table (for multiple products) */}
                {win.products && Array.isArray(win.products) && win.products.length > 1 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-bold mb-4">Product Details</h2>
                        <Table className="border">
                            <TableHeader>
                                <TableRow>
                                    <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }}>
                                        Product Name
                                    </TableHead>
                                    <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }}>
                                        SKU
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {win.products.map((product: any, index: number) => (
                                    <TableRow key={product.id || index}>
                                        <TableCell>{product.product_name || "Unknown Product"}</TableCell>
                                        <TableCell>{product.sku || "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    )
}