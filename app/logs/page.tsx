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
import { ArrowUpDown, ChevronDown, Search, Filter, Calendar, Eye, ChevronLeft, ChevronRight } from "lucide-react"
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

    // Table states - initialize with default values
    const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

    // Pagination state for the table
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

    const fetchLogs = async (pageIndex: number, pageSize: number) => {
        try {
            setIsLoading(true);
            setError(null);

            // 🚨 IMPORTANT: Clear previous logs while loading new data
            setLogs([]); // Add this line to clear previous data


            // Start building the query
            let query = supabase
                .from('logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(
                    pageIndex * pageSize,
                    (pageIndex + 1) * pageSize - 1
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

            const { data, error: supabaseError, count } = await query;

            if (supabaseError) {
                let errorMessage = 'Database query failed';

                if (supabaseError && typeof supabaseError === 'object') {
                    if ('message' in supabaseError && supabaseError.message) {
                        errorMessage = supabaseError.message;
                    } else if ('details' in supabaseError && supabaseError.details) {
                        errorMessage = supabaseError.details;
                    } else if ('hint' in supabaseError && supabaseError.hint) {
                        errorMessage = supabaseError.hint;
                    } else if ('code' in supabaseError && supabaseError.code) {
                        errorMessage = `Error code: ${supabaseError.code}`;
                    } else {
                        errorMessage = `Database error: ${JSON.stringify(supabaseError)}`;
                    }
                } else if (typeof supabaseError === 'string') {
                    errorMessage = supabaseError;
                }

                throw new Error(errorMessage);
            }


            if (data) {
                // Fetch related data
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
            let errorMessage = 'Failed to fetch logs';

            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            } else if (err && typeof err === 'object') {
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
            toast.error(errorMessage);

        } finally {
            setIsLoading(false);
        }
    };

    // Fetch data when filters or pagination changes
    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAdmin) {
            fetchLogs(pagination.pageIndex, pagination.pageSize);
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
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    };

    // Handle page change
    const handlePageChange = (pageIndex: number) => {
        setPagination(prev => ({ ...prev, pageIndex }));
    };

    // Handle page size change
    const handlePageSizeChange = (pageSize: number) => {
        setPagination(prev => ({ ...prev, pageSize, pageIndex: 0 }));
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
            case 'warning': return 'secondary';
            case 'success': return 'outline';
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
            case 'cron': return 'secondary';
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
                const [showFullDetails, setShowFullDetails] = useState(false);

                // Function to render a preview of details
                const renderPreview = (data: any) => {
                    if (!data) return null;

                    try {
                        const detailsObj = typeof data === 'string' ? JSON.parse(data) : data;
                        const entries = Object.entries(detailsObj);
                        const previewCount = 3; // Show only first 3 key-value pairs

                        return (
                            <div className="space-y-1 max-w-xs">
                                {entries.slice(0, previewCount).map(([key, value], index) => {
                                    const formattedKey = key
                                        .replace(/_/g, ' ')
                                        .replace(/\b\w/g, char => char.toUpperCase());

                                    let formattedValue = value;
                                    if (typeof value === 'boolean') {
                                        formattedValue = value ? 'Yes' : 'No';
                                    } else if (value === null || value === undefined) {
                                        formattedValue = 'null';
                                    } else if (typeof value === 'object') {
                                        formattedValue = 'Object';
                                    }

                                    return (
                                        <div key={index} className="text-xs">
                                            <span className="text-gray-500 font-medium">{formattedKey}:</span>{' '}
                                            <span className="font-mono text-gray-800 truncate block">
                                                {String(formattedValue).substring(0, 50)}
                                                {String(formattedValue).length > 50 ? '...' : ''}
                                            </span>
                                        </div>
                                    );
                                })}

                                {entries.length > previewCount && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs p-0 text-blue-600 hover:text-blue-800 cursor-pointer"
                                        onClick={() => setShowFullDetails(true)}
                                    >
                                        +{entries.length - previewCount} more
                                    </Button>
                                )}
                            </div>
                        );
                    } catch (error) {
                        return (
                            <div className="text-xs">
                                <span className="text-gray-500">Details:</span>{' '}
                                <span className="font-mono text-gray-800 truncate block">
                                    {String(data).substring(0, 100)}
                                    {String(data).length > 100 ? '...' : ''}
                                </span>
                            </div>
                        );
                    }
                };

                return (
                    <>
                        <div className="text-left ps-2 space-y-1 max-w-md">
                            {orderNo && (
                                <div className="text-xs">
                                    <span className="text-gray-500 font-medium">Order:</span>{' '}
                                    <span className="font-mono text-gray-800">{orderNo}</span>
                                </div>
                            )}
                            {productName && (
                                <div className="text-xs">
                                    <span className="text-gray-500 font-medium">Product:</span>{' '}
                                    <span className="font-mono text-gray-800">{productName}</span>
                                </div>
                            )}
                            {details && renderPreview(details)}
                        </div>

                        {/* Full Details Dialog */}
                        {showFullDetails && details && (
                            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-auto shadow-xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold">Full Details</h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowFullDetails(false)}
                                            className="h-8 w-8 p-0 cursor-pointer"
                                        >
                                            ✕
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {orderNo && (
                                            <div>
                                                <span className="text-gray-500 font-medium">Order:</span>{' '}
                                                <span className="font-mono text-gray-800">{orderNo}</span>
                                            </div>
                                        )}
                                        {productName && (
                                            <div>
                                                <span className="text-gray-500 font-medium">Product:</span>{' '}
                                                <span className="font-mono text-gray-800">{productName}</span>
                                            </div>
                                        )}

                                        {(() => {
                                            try {
                                                const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
                                                return (
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium">Details Object:</h4>
                                                        <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto border">
                                                            {JSON.stringify(detailsObj, null, 2)}
                                                        </pre>
                                                    </div>
                                                );
                                            } catch (error) {
                                                return (
                                                    <div>
                                                        <span className="text-gray-500 font-medium">Raw Details:</span>
                                                        <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto border">
                                                            {String(details)}
                                                        </pre>
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )
            },
        },
    ];

    // Initialize table with the logs data
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
        manualPagination: true, // Important: We're handling pagination manually
        pageCount: Math.ceil(totalCount / pagination.pageSize),
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            pagination,
        },
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pagination.pageSize);
    const currentPage = pagination.pageIndex;
    const pageSize = pagination.pageSize;

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

            {/* Filter Section - Improved UI */}
            <Card className="mb-6 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-gray-600" />
                            <CardTitle className="text-lg">Filters</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {totalCount} total logs
                        </Badge>
                    </div>
                    <CardDescription>
                        Filter logs by type, level, date, and search terms
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Type Filter */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                Log Type
                            </label>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full bg-white">
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
                            <label className="text-sm font-medium flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                Log Level
                            </label>
                            <Select value={levelFilter} onValueChange={setLevelFilter}>
                                <SelectTrigger className="w-full bg-white">
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
                            <label className="text-sm font-medium flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                Status
                            </label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full bg-white">
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
                            <label className="text-sm font-medium flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                Search
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search actions/messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-white"
                                />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="md:col-span-4 space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-600" />
                                Date Range
                            </label>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                            type="date"
                                            placeholder="From"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="pl-10 bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-gray-400">to</span>
                                </div>
                                <div className="flex-1">
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                        <Input
                                            type="date"
                                            placeholder="To"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            min={dateFrom}
                                            className="pl-10 bg-white"
                                        />
                                    </div>
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
                <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 whitespace-nowrap">Show</span>
                            <select
                                value={pageSize}
                                onChange={e => handlePageSizeChange(Number(e.target.value))}
                                className="border rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {[10, 20, 50, 100, 200].map(size => (
                                    <option key={size} value={size}>
                                        {size} rows
                                    </option>
                                ))}
                            </select>
                            <span className="text-sm text-gray-600 whitespace-nowrap">per page</span>
                        </div>
                        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded">
                            Page {currentPage + 1} of {totalPages}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <Eye className="h-4 w-4" />
                                    Columns
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
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
                </div>

                <div className="overflow-hidden rounded-lg border shadow-sm">
                    <div className="overflow-x-auto">
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
                                            className="hover:bg-gray-50 border-b"
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    className="border-r border-gray-200 last:border-r-0 align-middle py-3"
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
                                                <div className="flex flex-col items-center justify-center py-8">
                                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0A4647] mb-4"></div>
                                                    <p className="text-gray-600">Loading logs...</p>
                                                    <p className="text-gray-400 text-sm mt-1">Please wait while we fetch your data.</p>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                                    <p className="text-gray-500">No logs found matching your criteria.</p>
                                                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or reset them.</p>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Pagination - Enhanced UI */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
                    <div className="text-sm text-gray-600">
                        Showing {(currentPage * pageSize) + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} entries
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(0)}
                            disabled={currentPage === 0}
                            className="gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <ChevronLeft className="h-4 w-4 -ml-2" />
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 0}
                            className="gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>

                        <div className="flex items-center space-x-1">
                            {(() => {
                                const pageCount = totalPages;
                                const current = currentPage;

                                if (pageCount <= 7) {
                                    return Array.from({ length: pageCount }, (_, i) => i).map(pageIndex => (
                                        <Button
                                            key={pageIndex}
                                            variant={current === pageIndex ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handlePageChange(pageIndex)}
                                            className="w-9 h-9 p-0"
                                        >
                                            {pageIndex + 1}
                                        </Button>
                                    ));
                                }

                                const pages = [];
                                pages.push(
                                    <Button
                                        key={0}
                                        variant={current === 0 ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handlePageChange(0)}
                                        className="w-9 h-9 p-0"
                                    >
                                        1
                                    </Button>
                                );

                                let start = Math.max(1, current - 2);
                                let end = Math.min(pageCount - 2, current + 2);

                                if (current <= 3) {
                                    start = 1;
                                    end = 4;
                                }

                                if (current >= pageCount - 4) {
                                    start = pageCount - 5;
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
                                            variant={current === i ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => handlePageChange(i)}
                                            className="w-9 h-9 p-0"
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
                                        variant={current === pageCount - 1 ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handlePageChange(pageCount - 1)}
                                        className="w-9 h-9 p-0"
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
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages - 1}
                            className="gap-1"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(totalPages - 1)}
                            disabled={currentPage >= totalPages - 1}
                            className="gap-1"
                        >
                            <ChevronRight className="h-4 w-4" />
                            <ChevronRight className="h-4 w-4 -mr-2" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <Card className="mt-8 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Log Statistics</CardTitle>
                    <CardDescription>
                        Overview of system logs by level and type
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors">
                            <div className="text-sm text-blue-600 font-medium flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                Info Logs
                            </div>
                            <div className="text-2xl font-bold text-blue-800 mt-2">
                                {logs.filter(log => log.level === 'info').length}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                                {((logs.filter(log => log.level === 'info').length / logs.length) * 100 || 0).toFixed(1)}%
                            </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors">
                            <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                Success Logs
                            </div>
                            <div className="text-2xl font-bold text-green-800 mt-2">
                                {logs.filter(log => log.level === 'success').length}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                                {((logs.filter(log => log.level === 'success').length / logs.length) * 100 || 0).toFixed(1)}%
                            </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:bg-yellow-100 transition-colors">
                            <div className="text-sm text-yellow-600 font-medium flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                Warning Logs
                            </div>
                            <div className="text-2xl font-bold text-yellow-800 mt-2">
                                {logs.filter(log => log.level === 'warning').length}
                            </div>
                            <div className="text-xs text-yellow-600 mt-1">
                                {((logs.filter(log => log.level === 'warning').length / logs.length) * 100 || 0).toFixed(1)}%
                            </div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors">
                            <div className="text-sm text-red-600 font-medium flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                Error Logs
                            </div>
                            <div className="text-2xl font-bold text-red-800 mt-2">
                                {logs.filter(log => log.level === 'error').length}
                            </div>
                            <div className="text-xs text-red-600 mt-1">
                                {((logs.filter(log => log.level === 'error').length / logs.length) * 100 || 0).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}