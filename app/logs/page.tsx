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
import { ArrowUpDown, ChevronDown, Search, Filter, Calendar, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { LogType, LogLevel, LogStatus } from "@/lib/logger"

// Define Log type based on your Supabase logs table
export type Log = {
    id: string
    type: LogType
    level: LogLevel
    action: string
    message: string
    user_id: string | null
    product_id: string | null
    filter_id: string | null
    order_id: string | null
    details: any | null
    status: LogStatus | null
    environment: string
    execution_time_ms: number | null
    source: string | null
    created_at: string
    updated_at: string | null
    user_email?: string | null // Joined from users table
    order_no?: string | null // Joined from orders table
    product_name?: string | null // Joined from products table
}

export default function LogsPage() {
    const router = useRouter();
    const { profile, isLoggedIn, loading } = useAuth();
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState<number>(0);

    // Filter states
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [levelFilter, setLevelFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Table states
    const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 50,
    });

    // Role constants from environment variables
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;

    // Check if current user is admin
    const isAdmin = profile?.role === adminRole;

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            router.replace(`/login/?redirect_to=logs`);
            return;
        }

        if (!isAdmin) {
            toast.error("Access denied. Admin privileges required.");
            router.replace('/product-category/alldevices');
            return;
        }

    }, [loading, isLoggedIn, profile, router, isAdmin]);

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Debug: Log the Supabase client state
            console.log('Fetching logs with Supabase client:', {
                url: process.env.NEXT_PUBLIC_SUPABASE_URL,
                table: 'logs',
                pagination: pagination,
                filters: { typeFilter, levelFilter, statusFilter, dateFrom, dateTo, searchQuery }
            });

            // Start building the query - simplify first to test basic connection
            let query = supabase
                .from('logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(
                    pagination.pageIndex * pagination.pageSize,
                    (pagination.pageIndex + 1) * pagination.pageSize - 1
                );

            // Apply filters
            if (typeFilter !== "all") {
                query = query.eq('type', typeFilter);
            }

            if (levelFilter !== "all") {
                query = query.eq('level', levelFilter);
            }

            if (statusFilter !== "all") {
                query = query.eq('status', statusFilter);
            }

            if (dateFrom) {
                query = query.gte('created_at', `${dateFrom}T00:00:00`);
            }

            if (dateTo) {
                query = query.lte('created_at', `${dateTo}T23:59:59`);
            }

            if (searchQuery) {
                query = query.or(`action.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`);
            }

            console.log('Executing Supabase query...');
            const { data, error: supabaseError, count } = await query;

            if (supabaseError) {
                // Check if supabaseError is an object and log it properly
                console.error('Supabase Error Object:', supabaseError);
                console.error('Supabase Error Type:', typeof supabaseError);

                // Try different ways to extract error message
                let errorMessage = 'Database query failed';

                if (supabaseError && typeof supabaseError === 'object') {
                    // Check for PostgREST error format
                    if ('message' in supabaseError && supabaseError.message) {
                        errorMessage = supabaseError.message;
                    } else if ('details' in supabaseError && supabaseError.details) {
                        errorMessage = supabaseError.details;
                    } else if ('hint' in supabaseError && supabaseError.hint) {
                        errorMessage = supabaseError.hint;
                    } else if ('code' in supabaseError && supabaseError.code) {
                        errorMessage = `Error code: ${supabaseError.code}`;
                    } else {
                        // Stringify the entire object for debugging
                        errorMessage = `Database error: ${JSON.stringify(supabaseError)}`;
                    }
                } else if (typeof supabaseError === 'string') {
                    errorMessage = supabaseError;
                }

                throw new Error(errorMessage);
            }

            console.log('Query successful, data length:', data?.length || 0);

            if (data) {
                // Now fetch related data if needed
                const processedLogs = await Promise.all(
                    data.map(async (log) => {
                        let userEmail = null;
                        let orderNo = null;
                        let productName = null;

                        // Fetch user email if user_id exists
                        if (log.user_id) {
                            const { data: userData } = await supabase
                                .from('users')
                                .select('email')
                                .eq('id', log.user_id)
                                .single();
                            userEmail = userData?.email || null;
                        }

                        // Fetch order number if order_id exists
                        if (log.order_id) {
                            const { data: orderData } = await supabase
                                .from('orders')
                                .select('order_no')
                                .eq('id', log.order_id)
                                .single();
                            orderNo = orderData?.order_no || null;
                        }

                        // Fetch product name if product_id exists
                        if (log.product_id) {
                            const { data: productData } = await supabase
                                .from('products')
                                .select('product_name')
                                .eq('id', log.product_id)
                                .single();
                            productName = productData?.product_name || null;
                        }

                        return {
                            ...log,
                            user_email: userEmail,
                            order_no: orderNo,
                            product_name: productName
                        } as Log;
                    })
                );

                setLogs(processedLogs);
                setTotalCount(count || 0);
            }

        } catch (err: unknown) {
            console.error('Error in fetchLogs:');
            console.error('Full error:', err);

            // Better error handling
            let errorMessage = 'Failed to fetch logs';

            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            } else if (err && typeof err === 'object') {
                // Check for common error formats
                const errorObj = err as any;
                if (errorObj.message) {
                    errorMessage = errorObj.message;
                } else if (errorObj.error) {
                    errorMessage = errorObj.error;
                } else {
                    try {
                        errorMessage = JSON.stringify(err);
                    } catch {
                        errorMessage = 'Unknown error occurred';
                    }
                }
            }

            setError(errorMessage);

            // Also show toast notification
            toast.error(errorMessage);

        } finally {
            setIsLoading(false);
        }
    };

    // Fetch data when filters change
    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAdmin) {
            fetchLogs();
        }
    }, [
        loading,
        isLoggedIn,
        profile,
        isAdmin,
        typeFilter,
        levelFilter,
        statusFilter,
        dateFrom,
        dateTo,
        searchQuery,
        pagination.pageIndex,
        pagination.pageSize
    ]);

    // Reset all filters
    const handleResetFilters = () => {
        setTypeFilter("all");
        setLevelFilter("all");
        setStatusFilter("all");
        setDateFrom("");
        setDateTo("");
        setSearchQuery("");
        setPagination({ pageIndex: 0, pageSize: 50 });
    };

    // Format date for display
    const formatDateTime = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Format execution time
    const formatExecutionTime = (ms: number | null) => {
        if (!ms) return '-';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    // Get badge color based on level
    const getLevelBadge = (level: LogLevel) => {
        switch (level) {
            case 'error': return 'destructive';
            case 'warning': return 'secondary'; // Changed from 'warning' to 'secondary'
            case 'success': return 'outline';   // Changed from 'success' to 'outline'
            case 'info': return 'default';
            default: return 'secondary';
        }
    };

    // Get badge color based on type
    const getTypeBadge = (type: LogType) => {
        switch (type) {
            case 'auth': return 'default';
            case 'order': return 'secondary';
            case 'product': return 'outline';
            case 'user': return 'secondary';
            case 'email': return 'outline';
            case 'db': return 'default';
            case 'system': return 'destructive';
            case 'cron': return 'secondary'; // Changed from 'warning' to 'secondary'
            default: return 'secondary';
        }
    };

    // Define columns
    const columns: ColumnDef<Log>[] = [
        {
            accessorKey: "created_at",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Timestamp
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const date = row.getValue("created_at") as string;
                return (
                    <div className="text-left ps-2">
                        <div className="text-sm">{formatDateTime(date)}</div>
                        <div className="text-xs text-gray-500">
                            {formatExecutionTime(row.original.execution_time_ms)}
                        </div>
                    </div>
                )
            },
        },
        {
            accessorKey: "level",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Level
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const level = row.getValue("level") as LogLevel;
                return (
                    <div className="text-left ps-2">
                        <Badge variant={getLevelBadge(level)}>
                            {level.toUpperCase()}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "type",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const type = row.getValue("type") as LogType;
                return (
                    <div className="text-left ps-2">
                        <Badge variant={getTypeBadge(type)}>
                            {type.toUpperCase()}
                        </Badge>
                    </div>
                )
            },
        },
        {
            accessorKey: "action",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Action
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const action = row.getValue("action") as string;
                return (
                    <div className="text-left ps-2">
                        <div className="font-medium truncate max-w-xs">{action}</div>
                        {row.original.status && (
                            <div className="text-xs text-gray-500 capitalize">
                                Status: {row.original.status}
                            </div>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "message",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Message
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const message = row.getValue("message") as string;
                return <div className="text-left ps-2 truncate max-w-md">{message}</div>
            },
        },
        {
            accessorKey: "user_email",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        User
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const email = row.original.user_email;
                return <div className="text-left ps-2">{email || '-'}</div>
            },
        },
        {
            accessorKey: "source",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Source
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const source = row.getValue("source") as string;
                return (
                    <div className="text-left ps-2">
                        {source ? (
                            <div className="truncate max-w-xs text-xs text-gray-500">
                                {source.replace(/^https?:\/\//, '')}
                            </div>
                        ) : (
                            '-'
                        )}
                    </div>
                )
            },
        },
        {
            id: "details",
            header: () => <div className="text-left ps-2 font-medium">Details</div>,
            cell: ({ row }) => {
                const details = row.original.details;
                const orderNo = row.original.order_no;
                const productName = row.original.product_name;

                return (
                    <div className="text-left ps-2 space-y-1">
                        {orderNo && (
                            <div className="text-xs">
                                <span className="text-gray-500">Order:</span>{' '}
                                <span className="font-medium">{orderNo}</span>
                            </div>
                        )}
                        {productName && (
                            <div className="text-xs">
                                <span className="text-gray-500">Product:</span>{' '}
                                <span className="font-medium">{productName}</span>
                            </div>
                        )}
                    </div>
                )
            },
        },
    ];

    // Initialize table
    const table = useReactTable({
        data: logs,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            pagination,
        },
    });

    // Filter options
    const typeOptions = [
        { value: "all", label: "All Types" },
        { value: "auth", label: "Auth" },
        { value: "order", label: "Order" },
        { value: "product", label: "Product" },
        { value: "user", label: "User" },
        { value: "email", label: "Email" },
        { value: "db", label: "Database" },
        { value: "system", label: "System" },
        { value: "cron", label: "Cron" },
        { value: "ui", label: "UI" },
        { value: "export", label: "Export" },
        { value: "navigation", label: "Navigation" },
        { value: "validation", label: "Validation" },
        { value: "win", label: "Win" },
        { value: "storage", label: "Storage" },
    ];

    const levelOptions = [
        { value: "all", label: "All Levels" },
        { value: "info", label: "Info" },
        { value: "success", label: "Success" },
        { value: "warning", label: "Warning" },
        { value: "error", label: "Error" },
    ];

    const statusOptions = [
        { value: "all", label: "All Statuses" },
        { value: "pending", label: "Pending" },
        { value: "processing", label: "Processing" },
        { value: "completed", label: "Completed" },
        { value: "failed", label: "Failed" },
        { value: "sent", label: "Sent" },
        { value: "skipped", label: "Skipped" },
    ];

    // Show loading states
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">Loading authentication...</div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">Redirecting...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-5">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="sm:text-3xl text-xl font-bold">System Logs</h1>
                    <p className="text-gray-600 mt-1">
                        View and analyze system activity logs. Showing {logs.length} of {totalCount} total logs.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    className="cursor-pointer"
                >
                    Reset Filters
                </Button>
            </div>

            {/* Filter Section */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                    <CardDescription>
                        Filter logs by type, level, date, and search terms
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Type Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Log Type</label>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {typeOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Level Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Log Level</label>
                            <Select value={levelFilter} onValueChange={setLevelFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {levelOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search actions/messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Date Range
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Input
                                        type="date"
                                        placeholder="From"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        type="date"
                                        placeholder="To"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        min={dateFrom}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Logs Table */}
            <div className="w-full">
                <div className="flex items-center py-4 gap-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 whitespace-nowrap">Show</span>
                        <select
                            value={pagination.pageSize}
                            onChange={e => {
                                table.setPageSize(Number(e.target.value));
                            }}
                            className="border rounded px-2 py-1 text-sm"
                        >
                            {[10, 20, 50, 100, 200].map(pageSize => (
                                <option key={pageSize} value={pageSize}>
                                    {pageSize}
                                </option>
                            ))}
                        </select>
                        <span className="text-sm text-gray-600 whitespace-nowrap">entries</span>
                    </div>

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
                                            {column.id.replace('_', ' ')}
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
                                                <span className="ml-2">Loading logs...</span>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                                <p className="text-gray-500">No logs found matching your criteria.</p>
                                                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters.</p>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Page info for desktop */}
                        <div className="text-sm text-gray-600">
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} • Showing {logs.length} of {totalCount} logs
                        </div>

                        <div className="flex items-center justify-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                Previous
                            </Button>

                            <div className="flex items-center space-x-1">
                                {(() => {
                                    const pageCount = table.getPageCount();
                                    const currentPage = table.getState().pagination.pageIndex;

                                    if (pageCount <= 5) {
                                        return Array.from({ length: pageCount }, (_, i) => i).map(pageIndex => (
                                            <Button
                                                key={pageIndex}
                                                variant={currentPage === pageIndex ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => table.setPageIndex(pageIndex)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageIndex + 1}
                                            </Button>
                                        ));
                                    }

                                    const pages = [];
                                    pages.push(
                                        <Button
                                            key={0}
                                            variant={currentPage === 0 ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => table.setPageIndex(0)}
                                            className="w-8 h-8 p-0"
                                        >
                                            1
                                        </Button>
                                    );

                                    let start = Math.max(1, currentPage - 1);
                                    let end = Math.min(pageCount - 2, currentPage + 1);

                                    if (currentPage <= 2) {
                                        start = 1;
                                        end = 3;
                                    }

                                    if (currentPage >= pageCount - 3) {
                                        start = pageCount - 4;
                                        end = pageCount - 2;
                                    }

                                    if (start > 1) {
                                        pages.push(
                                            <span key="ellipsis1" className="px-2 text-gray-500">
                                                ...
                                            </span>
                                        );
                                    }

                                    for (let i = start; i <= end; i++) {
                                        pages.push(
                                            <Button
                                                key={i}
                                                variant={currentPage === i ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => table.setPageIndex(i)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {i + 1}
                                            </Button>
                                        );
                                    }

                                    if (end < pageCount - 2) {
                                        pages.push(
                                            <span key="ellipsis2" className="px-2 text-gray-500">
                                                ...
                                            </span>
                                        );
                                    }

                                    pages.push(
                                        <Button
                                            key={pageCount - 1}
                                            variant={currentPage === pageCount - 1 ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => table.setPageIndex(pageCount - 1)}
                                            className="w-8 h-8 p-0"
                                        >
                                            {pageCount}
                                        </Button>
                                    );

                                    return pages;
                                })()}
                            </div>

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

            {/* Stats Section */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="text-lg">Log Statistics</CardTitle>
                    <CardDescription>
                        Overview of system logs by level and type
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-sm text-blue-600 font-medium">Info Logs</div>
                            <div className="text-2xl font-bold text-blue-800">
                                {logs.filter(log => log.level === 'info').length}
                            </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="text-sm text-green-600 font-medium">Success Logs</div>
                            <div className="text-2xl font-bold text-green-800">
                                {logs.filter(log => log.level === 'success').length}
                            </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="text-sm text-yellow-600 font-medium">Warning Logs</div>
                            <div className="text-2xl font-bold text-yellow-800">
                                {logs.filter(log => log.level === 'warning').length}
                            </div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="text-sm text-red-600 font-medium">Error Logs</div>
                            <div className="text-2xl font-bold text-red-800">
                                {logs.filter(log => log.level === 'error').length}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}