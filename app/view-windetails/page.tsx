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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Edit, Eye, Save, X, Trash } from "lucide-react"
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
import { Drawer, Input as AntInput, Select, Form, DatePicker } from 'antd';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
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
    isOther: boolean
    otherDesc: string
    reseller: string
    orderHash: string
    resellerAccount: string
    purchaseType: string
    purchaseDate: string
    notes: string
    product_id?: string
}

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading } = useAuth();
    const [wins, setWins] = useState<Win[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [selectedWin, setSelectedWin] = useState<Win | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});

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
    const viewRoles = [subscriberRole, superSubscriberRole].filter(Boolean);
    const isViewAuthorized = profile?.role && viewRoles.includes(profile.role);

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
            router.replace('/login/?redirect_to=view-windetails');
            return;
        }

    }, [loading, isLoggedIn, profile, router, isAuthorized]);

    const fetchWins = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // First, fetch wins data
            if (isAuthorized) {
                const { data: winsData, error: winsError } = await supabase
                    .from('wins')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (winsError) {
                    throw winsError;
                }

                if (winsData) {
                    // Fetch order details for each win and merge them
                    const winsWithOrderDetails = await Promise.all(
                        winsData.map(async (win) => {
                            let orderNo = 0;
                            let companyName = win.customerName; // Fallback to customerName

                            // Get order_no from orders table using order_id
                            if (win.order_id) {
                                const { data: orderData, error: orderError } = await supabase
                                    .from('orders')
                                    .select('order_no, company_name')
                                    .eq('id', win.order_id)
                                    .single();

                                if (!orderError && orderData) {
                                    orderNo = orderData.order_no || 0;
                                    companyName = orderData.company_name || win.customerName;
                                }
                            }

                            return {
                                ...win,
                                order_no: orderNo,
                                // Don't include order_data property
                            } as Win;
                        })
                    );

                    setWins(winsWithOrderDetails);
                }

            } else {
                const { data: winsData, error: winsError } = await supabase
                    .from('wins')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .eq('user_id', profile?.id);

                if (winsError) {
                    throw winsError;
                }

                if (winsData) {
                    // Fetch order details for each win and merge them
                    const winsWithOrderDetails = await Promise.all(
                        winsData.map(async (win) => {
                            let orderNo = 0;
                            let companyName = win.customerName;

                            // Get order_no from orders table using order_id
                            if (win.order_id) {
                                const { data: orderData, error: orderError } = await supabase
                                    .from('orders')
                                    .select('order_no, company_name')
                                    .eq('id', win.order_id)
                                    .single();

                                if (!orderError && orderData) {
                                    orderNo = orderData.order_no || 0;
                                    companyName = orderData.company_name || win.customerName;
                                }
                            }

                            return {
                                ...win,
                                order_no: orderNo,
                                // Update customerName if we got company_name from orders
                                customerName: companyName,
                            } as Win;
                        })
                    );

                    setWins(winsWithOrderDetails);
                }
            }
        } catch (err: unknown) {
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
        if (!loading && isLoggedIn && profile?.isVerified) {
            fetchWins();
        }
    }, [loading, isLoggedIn, profile]);

    // Handle edit win click
    const handleEditWin = (win: Win) => {
        setSelectedWin(win);
        setEditErrors({});
        setIsEditDrawerOpen(true);
    };

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!selectedWin) return;

        const { name, value, type } = e.target;

        // Clear error for this field
        if (editErrors[name]) {
            setEditErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        setSelectedWin(prev => {
            if (!prev) return prev;

            if (type === 'number') {
                return {
                    ...prev,
                    [name]: value === "" ? 0 : parseFloat(value)
                };
            }

            if (name === 'isOther') {
                return {
                    ...prev,
                    [name]: value === "true"
                };
            }

            return {
                ...prev,
                [name]: value === "" ? "" : value
            };
        });
    };

    // Handle select changes
    const handleSelectChange = (name: string, value: string) => {
        if (!selectedWin) return;

        // Clear error for this field
        if (editErrors[name]) {
            setEditErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        setSelectedWin(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [name]: value === "" ? "" : value
            };
        });
    };

    // Handle boolean change
    const handleBooleanChange = (name: string, value: boolean) => {
        if (!selectedWin) return;

        // Clear error for this field
        if (editErrors[name]) {
            setEditErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        setSelectedWin(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [name]: value
            };
        });
    };

    // Validate form before submission
    const validateEditForm = (): boolean => {
        if (!selectedWin) return false;

        const newErrors: Record<string, string> = {};
        let isValid = true;

        // Required fields validation
        const requiredFields = ['customerName', 'reseller', 'orderHash', 'resellerAccount', 'units', 'deal_rev', 'purchaseType', 'purchaseDate'];

        for (const field of requiredFields) {
            const value = selectedWin[field as keyof typeof selectedWin];
            if (!value || value === "") {
                newErrors[field] = `${field} is required`;
                isValid = false;
            }
        }

        // Validate numbers
        if (selectedWin.units <= 0) {
            newErrors.units = "Number of units must be greater than 0";
            isValid = false;
        }

        if (selectedWin.deal_rev <= 0) {
            newErrors.deal_rev = "Deal revenue must be greater than 0";
            isValid = false;
        }

        // If isOther is true, otherDesc is required
        if (selectedWin.isOther && (!selectedWin.otherDesc || selectedWin.otherDesc.trim() === "")) {
            newErrors.otherDesc = "Other description is required when 'Other' is selected";
            isValid = false;
        }

        setEditErrors(newErrors);
        return isValid;
    };

    // Update win in Supabase
    const handleUpdateWin = async () => {
        if (!selectedWin) return;

        if (!validateEditForm()) {
            toast.error("Please fill in all required fields correctly", { style: { color: "white", backgroundColor: "red" } });
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare updated win data
            const { order_no, ...rest } = selectedWin;

            const updatedWin = {
                ...rest,
                updated_at: new Date().toISOString()
            };


            const { error } = await supabase
                .from('wins')
                .update(updatedWin)
                .eq('id', selectedWin.id);

            if (error) throw error;

            // Update local state
            setWins(prev => prev.map(win =>
                win.id === selectedWin.id ? updatedWin : win
            ));

            toast.success("Win updated successfully!", { style: { color: "white", backgroundColor: "black" } });
            setIsEditDrawerOpen(false);
            setSelectedWin(null);
            setEditErrors({});
            fetchWins(); // Refresh data

        } catch (err: any) {
            toast.error(err.message || "Failed to update win", { style: { color: "white", backgroundColor: "red" } });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete win
    const handleDeleteWin = async (winId: string) => {
        try {
            const { error } = await supabase
                .from('wins')
                .delete()
                .eq('id', winId);

            if (error) throw error;

            // Update local state
            setWins(prev => prev.filter(win => win.id !== winId));
            toast.success("Win deleted successfully!", { style: { color: "white", backgroundColor: "black" } });

        } catch (err: any) {
            toast.error(err.message || "Failed to delete win", { style: { color: "white", backgroundColor: "red" } });
        }
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Format date for input fields
    const formatDateForInput = (dateString: string | null) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

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
                'Notes': win.notes || '',
                'Is Other Device': win.isOther ? 'Yes' : 'No',
                'Other Description': win.otherDesc || ''
            }));

            // Convert to CSV string
            const csvString = convertToCSV(data);

            // Download file
            downloadCSV(csvString, `wins_${new Date().toISOString().split('T')[0]}.csv`);
        } catch (error) {
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
        // Actions column - Always add for authorized users
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const win = row.original;
                const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

                const handleDeleteClick = () => {
                    setIsDeleteDialogOpen(true);
                };

                const handleConfirmDelete = async () => {
                    await handleDeleteWin(win.id);
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
                                    onClick={() => {
                                        router.push(`/view-windetails/${win.id}`);
                                    }}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                                {!isViewAuthorized && (
                                    <>
                                        <DropdownMenuItem
                                            className="cursor-pointer"
                                            onClick={() => handleEditWin(win)}
                                        >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Win
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="cursor-pointer text-red-600 focus:text-red-600"
                                            onClick={handleDeleteClick}
                                        >
                                            <Trash className="mr-2 h-4 w-4" />
                                            Delete Win
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Delete Confirmation Dialog */}
                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the win report for
                                        <b> {win.customerName}</b> (Order # {win.order_no || win.orderHash || 'N/A'}).
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleConfirmDelete}
                                        className="bg-red-500 hover:bg-red-600"
                                    >
                                        Delete Win
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )
            },
        },

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
                        ${amount?.toLocaleString()}
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
                return <div className="text-left ps-2 font-medium">{units?.toLocaleString() || 0}</div>
            },
        },
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

    return (
        <div className="container mx-auto py-10 px-5 h-lvh">
            <div className="flex justify-between items-center mb-6">
                <h1 className="sm:text-3xl text-xl font-bold">Wins Dashboard</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchWins}
                        disabled={isLoading}
                        className="cursor-pointer"
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

            {/* Edit Win Drawer */}
            <Drawer
                title={
                    <div>
                        <div className="text-xl font-bold text-gray-800">
                            Edit Win Report
                        </div>
                        <div className="text-gray-600 text-sm mt-1">
                            Update win report information. All fields marked with * are required.
                        </div>
                    </div>
                }
                placement="right"
                onClose={() => setIsEditDrawerOpen(false)}
                open={isEditDrawerOpen}
                size={600}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            onClick={() => setIsEditDrawerOpen(false)}
                            variant="outline"
                            className="flex items-center"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateWin}
                            disabled={isSubmitting}
                            className="flex items-center bg-[#0A4647] hover:bg-[#093636]"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                }
            >
                {selectedWin && (
                    <div className="space-y-6">
                        {/* Basic Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Customer Name *
                                    </label>
                                    <AntInput
                                        name="customerName"
                                        value={selectedWin.customerName || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.customerName ? 'error' : ''}
                                    />
                                    {editErrors.customerName && (
                                        <p className="text-xs text-red-500">{editErrors.customerName}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Reseller *
                                    </label>
                                    <AntInput
                                        name="reseller"
                                        value={selectedWin.reseller || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.reseller ? 'error' : ''}
                                    />
                                    {editErrors.reseller && (
                                        <p className="text-xs text-red-500">{editErrors.reseller}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Order Hash *
                                    </label>
                                    <AntInput
                                        name="orderHash"
                                        value={selectedWin.orderHash || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.orderHash ? 'error' : ''}
                                    />
                                    {editErrors.orderHash && (
                                        <p className="text-xs text-red-500">{editErrors.orderHash}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Reseller Account *
                                    </label>
                                    <AntInput
                                        name="resellerAccount"
                                        value={selectedWin.resellerAccount || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.resellerAccount ? 'error' : ''}
                                    />
                                    {editErrors.resellerAccount && (
                                        <p className="text-xs text-red-500">{editErrors.resellerAccount}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Device Information Section */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Device Information
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Is this an "Other" device? *
                                    </label>
                                    <Select
                                        value={selectedWin.isOther ? "true" : "false"}
                                        onChange={(value) => handleBooleanChange("isOther", value === "true")}
                                        style={{ width: '100%' }}
                                    >
                                        <Select.Option value="false">No (Standard Product)</Select.Option>
                                        <Select.Option value="true">Yes (Other Device Part  )</Select.Option>
                                    </Select>
                                </div>

                                {selectedWin.isOther && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Other Device Description *
                                        </label>
                                        <AntInput
                                            name="otherDesc"
                                            value={selectedWin.otherDesc || ''}
                                            onChange={handleInputChange}
                                            placeholder="Describe the other device"
                                            status={editErrors.otherDesc ? 'error' : ''}
                                        />
                                        {editErrors.otherDesc && (
                                            <p className="text-xs text-red-500">{editErrors.otherDesc}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Deal Information Section */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Deal Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Number of Units *
                                    </label>
                                    <AntInput
                                        name="units"
                                        type="number"
                                        min="1"
                                        value={selectedWin.units || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.units ? 'error' : ''}
                                    />
                                    {editErrors.units && (
                                        <p className="text-xs text-red-500">{editErrors.units}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Total Deal Revenue ($) *
                                    </label>
                                    <AntInput
                                        name="deal_rev"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={selectedWin.deal_rev || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.deal_rev ? 'error' : ''}
                                    />
                                    {editErrors.deal_rev && (
                                        <p className="text-xs text-red-500">{editErrors.deal_rev}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Purchase Information Section */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Purchase Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Purchase Type *
                                    </label>
                                    <Select
                                        value={selectedWin.purchaseType || ''}
                                        onChange={(value) => handleSelectChange("purchaseType", value)}
                                        style={{ width: '100%' }}
                                        status={editErrors.purchaseType ? 'error' : ''}
                                    >
                                        <Select.Option value="one-time">One Time Purchase</Select.Option>
                                        <Select.Option value="roll-out">Roll Out</Select.Option>
                                    </Select>
                                    {editErrors.purchaseType && (
                                        <p className="text-xs text-red-500">{editErrors.purchaseType}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Purchase Date *
                                    </label>
                                    <AntInput
                                        name="purchaseDate"
                                        type="date"
                                        value={formatDateForInput(selectedWin.purchaseDate)}
                                        onChange={handleInputChange}
                                        status={editErrors.purchaseDate ? 'error' : ''}
                                    />
                                    {editErrors.purchaseDate && (
                                        <p className="text-xs text-red-500">{editErrors.purchaseDate}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Additional Information
                            </h3>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">
                                    How did TD Synnex Surface Demo help you close this deal?
                                </label>
                                <AntInput.TextArea
                                    name="notes"
                                    value={selectedWin.notes || ''}
                                    onChange={handleInputChange}
                                    placeholder="Describe how the demo helped close this deal..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {Object.keys(editErrors).length > 0 && (
                    <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded text-center">
                        <p className="text-sm text-red-600 font-medium">
                            Please fix the errors above before saving.
                        </p>
                    </div>
                )}
            </Drawer>
        </div>
    )
}