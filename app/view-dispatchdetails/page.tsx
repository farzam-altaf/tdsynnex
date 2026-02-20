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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Eye, Edit, Trash, Save, X, MapPin } from "lucide-react"
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
import { Drawer, Input as AntInput, Select, Form, Space, DatePicker } from 'antd';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Link from "next/link"
import { logAuth, logError, logInfo, logSuccess, logWarning } from "@/lib/logger"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2 } from "lucide-react"

// Define Dispatch Submission type
export type DispatchSubmission = {
    id: string
    submitted_by: string
    tracking_number: string
    shipment_date: string | null
    created_at: string
    items?: DispatchItem[]
}

export type DispatchItem = {
    id: string
    submission_id: string
    product_name: string
    product_sku: string
    product_quantity: number
    inventory_owner: string
    created_at: string
}

// Extended type for display
export type DispatchWithItems = DispatchSubmission & {
    items: DispatchItem[]
    item_count: number
    total_quantity: number
    submitted_by_email: string
}

export default function DispatchPage() {
    const router = useRouter();
    const { profile, isLoggedIn, loading, user } = useAuth();
    const [submissions, setSubmissions] = useState<DispatchWithItems[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState<DispatchWithItems | null>(null);

    // Table states
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})
    const [globalFilter, setGlobalFilter] = useState<string>("")

    // Role constants from environment variables
    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const superSubscriberRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const subscriberRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

    const allowedRoles = [adminRole, superSubscriberRole].filter(Boolean);
    const viewRoles = [subscriberRole, superSubscriberRole, smRole].filter(Boolean);
    const isViewAuthorized = profile?.role && viewRoles.includes(profile.role);
    const isAdmin = profile?.role && allowedRoles.includes(profile.role);

    const columnDisplayNames: Record<string, string> = {
        "submitted_by": "Submitted By",
        "tracking_number": "Tracking #",
        "shipment_date": "Shipment Date",
        "created_at": "Submission Date",
        "item_count": "Items Count",
        "total_quantity": "Total Quantity",
        "actions": "Actions"
    };

    const source = `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/dispatch`;

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            logAuth(
                'access_denied',
                'Unauthorized access to Dispatch page',
                profile?.id,
                {
                    isLoggedIn,
                    isVerified: profile?.isVerified,
                    role: profile?.role
                },
                'failed',
                source
            );
            router.replace('/login/?redirect_to=view-dispatchdetails');
            return;
        }
    }, [loading, isLoggedIn, profile, router]);

    // Format date
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'N/A';
        }
    };

    // Format date only (for shipment date)
    const formatDateOnly = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'N/A';
        }
    };

    // Fetch Dispatch submissions
    const fetchSubmissions = async () => {
        const startTime = Date.now();
        try {
            setIsLoading(true);
            setError(null);

            logInfo(
                'db',
                'dispatch_fetch_started',
                'Started fetching Dispatch submissions',
                {
                    userId: profile?.id,
                    role: profile?.role,
                    isAdmin
                },
                profile?.id,
                source
            );

            let query = supabase
                .from('dispatch_submissions')
                .select(`
                    *,
                    items:dispatch_submission_items(*)
                `)
                .order('created_at', { ascending: false });

            // If not admin, only show user's own submissions
            if (!isAdmin) {
                query = query.eq('submitted_by', user?.email);
            }

            const { data: submissionsData, error: submissionsError } = await query;

            if (submissionsError) throw submissionsError;

            if (submissionsData) {
                const formattedSubmissions: DispatchWithItems[] = submissionsData.map(sub => ({
                    ...sub,
                    items: sub.items || [],
                    item_count: sub.items?.length || 0,
                    total_quantity: sub.items?.reduce((sum: number, item: DispatchItem) => sum + (item.product_quantity || 0), 0) || 0,
                    submitted_by_email: sub.submitted_by
                }));

                const executionTime = Date.now() - startTime;
                logSuccess(
                    'db',
                    'dispatch_fetch_success',
                    `Successfully fetched ${formattedSubmissions.length} Dispatch submissions`,
                    {
                        count: formattedSubmissions.length,
                        executionTime,
                        isAdmin
                    },
                    profile?.id,
                    source
                );

                setSubmissions(formattedSubmissions);
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch Dispatch submissions');
                logError(
                    'db',
                    'dispatch_fetch_failed',
                    `Failed to fetch Dispatch submissions: ${err.message}`,
                    err,
                    profile?.id,
                    source
                );
            } else {
                setError('Failed to fetch Dispatch submissions');
                logError(
                    'db',
                    'dispatch_fetch_failed',
                    'Failed to fetch Dispatch submissions',
                    { error: err },
                    profile?.id,
                    source
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch data when authorized
    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified) {
            fetchSubmissions();
        }
    }, [loading, isLoggedIn, profile, user]);

    // Handle view submission
    const handleViewSubmission = (submission: DispatchWithItems) => {
        setSelectedSubmission(submission);
        setIsViewDrawerOpen(true);

        logInfo(
            'ui',
            'view_submission_clicked',
            `View submission clicked for ID: ${submission.id}`,
            {
                submissionId: submission.id,
                submittedBy: submission.submitted_by,
                trackingNumber: submission.tracking_number,
                itemCount: submission.item_count
            },
            profile?.id,
            source
        );
    };

    // Handle delete submission
    const handleDeleteSubmission = async (submissionId: string, submittedBy: string) => {
        const startTime = Date.now();


        try {
            // Delete items first (due to foreign key constraint)
            const { error: itemsError } = await supabase
                .from('dispatch_submission_items')
                .delete()
                .eq('submission_id', submissionId);

            if (itemsError) throw itemsError;

            // Delete submission
            const { error } = await supabase
                .from('dispatch_submissions')
                .delete()
                .eq('id', submissionId);

            if (error) throw error;

            // Update local state
            setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));

            const executionTime = Date.now() - startTime;


            toast.success("Dispatch submission deleted successfully!", { style: { color: "white", backgroundColor: "black" } });

        } catch (err: any) {
            const executionTime = Date.now() - startTime;
            logError(
                'db',
                'dispatch_delete_failed',
                `Failed to delete submission ID: ${submissionId}`,
                {
                    error: err.message,
                    submissionId,
                    executionTime
                },
                profile?.id,
                source
            );

            toast.error(err.message || "Failed to delete submission", { style: { color: "white", backgroundColor: "red" } });
        }
    };

    // Handle export CSV
    const handleExportCSV = () => {
        if (submissions.length === 0) {
            logWarning(
                'export',
                'csv_export_empty',
                'Attempted to export CSV with no Dispatch data',
                { submissionsCount: submissions.length },
                profile?.id,
                source
            );
            toast.info("No data to export");
            return;
        }

        try {
            const data = submissions.flatMap(sub =>
                (sub.items || []).map(item => ({
                    'Submission ID': sub.id.substring(0, 8),
                    'Submitted By': sub.submitted_by,
                    'Tracking #': sub.tracking_number || 'N/A',
                    'Shipment Date': formatDateOnly(sub.shipment_date),
                    'Submission Date': formatDate(sub.created_at),
                    'Product Name': item.product_name,
                    'SKU': item.product_sku,
                    'Quantity': item.product_quantity,
                    'Inventory Owner': item.inventory_owner || 'N/A'
                }))
            );

            const csvString = convertToCSV(data);
            downloadCSV(csvString, `dispatch_submissions_${new Date().toISOString().split('T')[0]}.csv`);

            logSuccess(
                'export',
                'csv_export_success',
                `Successfully exported Dispatch data to CSV`,
                { submissionsCount: submissions.length },
                profile?.id,
                source
            );

        } catch (error) {
            setError('Failed to export CSV');
            logError(
                'export',
                'csv_export_failed',
                `Failed to export CSV`,
                { submissionsCount: submissions.length },
                profile?.id,
                source
            );
        }
    };

    // Helper function to convert array of objects to CSV
    const convertToCSV = (data: any[]) => {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);

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

    const handleRefresh = async () => {
        logInfo(
            'ui',
            'manual_refresh',
            'Manually refreshing Dispatch data',
            {
                currentCount: submissions.length,
                lastRefresh: new Date().toISOString()
            },
            profile?.id,
            source
        );
        await fetchSubmissions();
    };

    // Define columns
    const columns: ColumnDef<DispatchWithItems>[] = [
        {
            accessorKey: "tracking_number",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Tracking #
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="text-left ps-2 font-medium">
                    {row.getValue("tracking_number") || 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: "submitted_by",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Submitted By
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("submitted_by")}</div>,
        },
        {
            accessorKey: "shipment_date",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Shipment Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="text-left ps-2 text-sm">
                    {formatDateOnly(row.getValue("shipment_date"))}
                </div>
            ),
        },
        {
            accessorKey: "created_at",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Submission Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="text-left ps-2 text-sm">
                    {formatDate(row.getValue("created_at"))}
                </div>
            ),
        },
        {
            accessorKey: "item_count",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Items
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="text-left ps-2 font-medium">
                    {row.getValue("item_count")}
                </div>
            ),
        },
        {
            accessorKey: "total_quantity",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Total Qty
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="text-left ps-2 font-medium">
                    {row.getValue("total_quantity")}
                </div>
            ),
        }
    ];

    // Add actions column for admin
    if (isAdmin) {
        columns.unshift({
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const submission = row.original;
                const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

                const handleDeleteClick = () => setIsDeleteDialogOpen(true);
                const handleConfirmDelete = async () => {
                    await handleDeleteSubmission(submission.id, submission.submitted_by);
                    setIsDeleteDialogOpen(false);
                };

                return (
                    <div className="flex space-x-2 ps-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => handleViewSubmission(submission)}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                    onClick={handleDeleteClick}
                                >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete Submission
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the Dispatch submission from
                                        <b> {submission.submitted_by}</b> with {submission.item_count} item(s).
                                        {submission.tracking_number && <><br />Tracking #: <b>{submission.tracking_number}</b></>}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleConfirmDelete}
                                        className="bg-red-500 hover:bg-red-600"
                                    >
                                        Delete Submission
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                );
            },
        });
    } else {
        // For non-admin users, just show view button
        columns.unshift({
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const submission = row.original;
                return (
                    <div className="flex space-x-2 ps-2">
                        <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 cursor-pointer"
                            onClick={() => handleViewSubmission(submission)}
                        >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View details</span>
                        </Button>
                    </div>
                );
            },
        });
    }

    // Initialize table
    const table = useReactTable({
        data: submissions,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: "auto",
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
    });

    // Show loading states
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">Loading authentication...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-5 h-lvh">
            <div className="flex justify-between items-center mb-6">
                <h1 className="sm:text-3xl text-xl font-bold"></h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="cursor-pointer"
                    >
                        {isLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button onClick={handleExportCSV} className="bg-[#0A4647] hover:bg-[#093636] cursor-pointer">
                        <TbFileTypeCsv className="mr-2" />
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
                <div className="flex items-center justify-between py-4 gap-4">
                    <div>
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
                                    .map((column) => (
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
                                    ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="flex-1 max-w-sm">
                        <Input
                            placeholder="Search submissions..."
                            value={globalFilter ?? ""}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-[#0A4647] hover:bg-[#0A4647]">
                                    {headerGroup.headers.map((header) => (
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
                                    ))}
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
                                                <span className="ml-2">Loading Dispatch submissions...</span>
                                            </div>
                                        ) : (
                                            "No Dispatch submissions found."
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

            {/* View Details Drawer */}
            <Drawer
                title={
                    <div>
                        <div className="text-xl font-bold text-gray-800">
                            Dispatch Submission Details
                        </div>
                        <div className="text-gray-600 text-sm mt-1">
                            Viewing submission from {selectedSubmission?.submitted_by}
                        </div>
                    </div>
                }
                placement="right"
                onClose={() => setIsViewDrawerOpen(false)}
                open={isViewDrawerOpen}
                size={800}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            onClick={() => setIsViewDrawerOpen(false)}
                            variant="outline"
                            className="flex items-center"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Close
                        </Button>
                    </div>
                }
            >
                {selectedSubmission && (
                    <div className="space-y-6">

                        {/* Submission Header */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Submitted By</p>
                                    <p className="font-medium">{selectedSubmission.submitted_by}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Tracking #</p>
                                    <p className="font-medium">{selectedSubmission.tracking_number || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Shipment Date</p>
                                    <p>{formatDateOnly(selectedSubmission.shipment_date)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Submission Date</p>
                                    <p>{formatDate(selectedSubmission.created_at)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Items</p>
                                    <p className="font-medium">{selectedSubmission.item_count}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Quantity</p>
                                    <p className="font-medium">{selectedSubmission.total_quantity}</p>
                                </div>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Dispatched Items ({selectedSubmission.item_count})
                            </h3>

                            <div className="space-y-4">
                                {selectedSubmission.items?.map((item, index) => (
                                    <motion.div
                                        key={item.id || index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="border rounded-lg p-4 bg-white"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                Item #{index + 1}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500">Product Name</p>
                                                <p className="font-medium">{item.product_name || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">SKU</p>
                                                <p className="font-mono text-sm">{item.product_sku || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Quantity</p>
                                                <p className="font-medium">{item.product_quantity}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Inventory Owner</p>
                                                <p className="text-sm">{item.inventory_owner || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    )
}