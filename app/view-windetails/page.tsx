"use client"

import * as React from "react"
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { TbFileTypeCsv } from "react-icons/tb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"

// Define Win type based on your Supabase table
export type Win = {
    id: string
    order_id: string
    order_no?: number
    customerName: string
    created_at: string
    deal_rev: number
    units: number
    product_id?: string
    isOther?: boolean
    otherDesc?: string
    reseller?: string
    orderHash?: string
    resellerAccount?: string
    purchaseType?: string
    purchaseDate?: string
    notes?: string
    order_data?: {
        order_no?: number
        company_name?: string
        [key: string]: any
    }
}

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading } = useAuth();
    const [wins, setWins] = useState<Win[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Table states
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})

    // Role constants from environment variables
    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const superSubscriberRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const subscriberRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

    const allowedRoles = [smRole, adminRole, superSubscriberRole].filter(Boolean);

    const columnDisplayNames: Record<string, string> = {
        "order_no": "Order #",
        "customerName": "Customer Name",
        "created_at": "Date of Submission",
        "deal_rev": "Total Deal Revenue ($)",
        "units": "Number of Units",
        "actions": "Actions"
    };

    // Check if current user is authorized
    const isAuthorized = profile?.role && allowedRoles.includes(profile.role);

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            console.log("User not authenticated, redirecting to login");
            router.replace('/login/?redirect_to=view-windetails');
            return;
        }

        // Check if user has permission to access this page
        if (!isAuthorized) {
            console.log("User not authorized, redirecting...");
            router.replace('/product-category/alldevices');
            return;
        }

    }, [loading, isLoggedIn, profile, router, isAuthorized]);

    // Fetch wins data from Supabase
    const fetchWins = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // First, fetch wins data
            const { data: winsData, error: winsError } = await supabase
                .from('wins')
                .select('*')
                .order('created_at', { ascending: false });

            if (winsError) {
                throw winsError;
            }

            if (winsData) {
                // Fetch order details for each win
                const winsWithOrderDetails = await Promise.all(
                    winsData.map(async (win) => {
                        // Get order_no from orders table using order_id
                        if (win.order_id) {
                            const { data: orderData, error: orderError } = await supabase
                                .from('orders')
                                .select('order_no, company_name')
                                .eq('id', win.order_id)
                                .single();

                            if (!orderError && orderData) {
                                return {
                                    ...win,
                                    order_no: orderData.order_no,
                                    order_data: orderData
                                } as Win;
                            }
                        }
                        
                        // If no order data found, use what we have
                        return {
                            ...win,
                            order_no: win.orderHash ? parseInt(win.orderHash) || 0 : 0,
                            order_data: {}
                        } as Win;
                    })
                );

                setWins(winsWithOrderDetails);
            }
        } catch (err: unknown) {
            console.error('Error fetching wins:', err);
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch wins');
            } else {
                setError('Failed to fetch wins');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch data when authorized
    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
            fetchWins();
        }
    }, [loading, isLoggedIn, profile, isAuthorized]);

    // Handle export CSV
    const handleExportCSV = () => {
        if (wins.length === 0) {
            alert("No data to export");
            return;
        }

        try {
            // Prepare the data with specified columns
            const data = wins.map(win => ({
                'Order #': win.order_no || win.orderHash || 'N/A',
                'Customer Name': win.customerName || '',
                'Date of Submission': win.created_at ? new Date(win.created_at).toLocaleDateString() : 'N/A',
                'Total Deal Revenue ($)': `$${win.deal_rev?.toFixed(2) || '0.00'}`,
                'Number of Units': win.units || 0,
                'Reseller': win.reseller || '',
                'Reseller Account': win.resellerAccount || '',
                'Purchase Type': win.purchaseType || '',
                'Purchase Date': win.purchaseDate || '',
                'Notes': win.notes || ''
            }));

            // Convert to CSV string
            const csvString = convertToCSV(data);

            // Download file
            downloadCSV(csvString, `wins_${new Date().toISOString().split('T')[0]}.csv`);

            console.log("CSV exported successfully");
        } catch (error) {
            console.error('Error exporting CSV:', error);
            setError('Failed to export CSV');
        }
    };

    // Helper function to convert array of objects to CSV
    const convertToCSV = (data: any[]) => {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);

        // Escape quotes and wrap in quotes if contains comma
        const escapeCSV = (field: any) => {
            if (field === null || field === undefined) return '';
            const string = String(field);
            if (string.includes(',') || string.includes('"') || string.includes('\n')) {
                return `"${string.replace(/"/g, '""')}"`;
            }
            return string;
        };

        const headerRow = headers.map(escapeCSV).join(',');
        const dataRows = data.map(row =>
            headers.map(header => escapeCSV(row[header])).join(',')
        );

        return [headerRow, ...dataRows].join('\n');
    };

    // Helper function to download CSV
    const downloadCSV = (csvContent: string, fileName: string) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    };

    // Define columns
    const columns: ColumnDef<Win>[] = [
        // Order # column
        {
            accessorKey: "order_no",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Order #
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const win = row.original;
                return (
                    <Link href={`/view-windetails/${win.id}`} className="text-left ps-2 font-medium text-teal-600 hover:underline cursor-pointer">
                        {win.order_no || win.orderHash || 'N/A'}
                    </Link>
                )
            },
        },

        // Customer Name column
        {
            accessorKey: "customerName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Customer Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("customerName")}</div>,
        },

        // Date of Submission column
        {
            accessorKey: "created_at",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Date of Submission
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const date = row.getValue("created_at") as string;
                return (
                    <div className="text-left ps-2">
                        {date ? new Date(date).toLocaleDateString() : 'N/A'}
                    </div>
                )
            },
        },

        // Total Deal Revenue ($) column
        {
            accessorKey: "deal_rev",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Total Deal Revenue ($)
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const amount = row.getValue("deal_rev") as number;
                return (
                    <div className="text-left ps-2 font-medium text-green-600">
                        ${amount}
                    </div>
                )
            },
        },

        // Number of Units column
        {
            accessorKey: "units",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Number of Units
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const units = row.getValue("units") as number;
                return <div className="text-left ps-2 font-medium">{units || 0}</div>
            },
        },

        // Actions column - Only for Admin and Super Subscriber
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const win = row.original;

                // Only show actions for Admin and Super Subscriber
                const canViewActions = profile?.role && [adminRole, superSubscriberRole].includes(profile.role);

                if (!canViewActions) return null;

                return (
                    <div className="flex space-x-2 ps-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => {
                                        // View details action
                                        console.log("View win details:", win);
                                        alert(`Viewing win details for Order #${win.order_no}`);
                                    }}
                                >
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => navigator.clipboard.writeText(win.id)}
                                >
                                    Copy Win ID
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => navigator.clipboard.writeText(win.order_id)}
                                >
                                    Copy Order ID
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        }
    ]

    // Initialize table
    const table = useReactTable({
        data: wins,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    // Show loading states
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">Loading authentication...</div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">You are not authorized to view this page.</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-5 h-lvh">
            <div className="flex justify-between items-center mb-6">
                <h1 className="sm:text-3xl text-xl font-bold">Wins Dashboard</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchWins}
                        disabled={isLoading}
                    >
                        {isLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button onClick={handleExportCSV} className="bg-[#0A4647] hover:bg-[#093636] cursor-pointer">
                        <TbFileTypeCsv />
                        Export CSV
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="w-full">
                <div className="flex items-center py-4 gap-4">
                    <Input
                        placeholder="Filter by customer name..."
                        value={(table.getColumn("customerName")?.getFilterValue() as string) ?? ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            table.getColumn("customerName")?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto">
                                Columns <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value: boolean) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {columnDisplayNames[column.id] || column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-[#0A4647] hover:bg-[#0A4647]">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead 
                                                key={header.id} 
                                                className="text-white font-semibold border-r border-[#2d5f60] last:border-r-0"
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="hover:bg-gray-50"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell 
                                                key={cell.id} 
                                                className="border-r border-gray-200 last:border-r-0 align-middle"
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center border-r-0"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                                <span className="ml-2">Loading wins data...</span>
                                            </div>
                                        ) : (
                                            "No wins found."
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}