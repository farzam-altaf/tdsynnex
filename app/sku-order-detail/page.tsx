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
import { Drawer, Button as AntButton, Input as AntInput, Select, Form, DatePicker } from 'antd';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import Link from "next/link"

// Define Order type based on your Supabase table
export type Product = {
    id: string;
    product_name: string;
    sku: string;
    thumbnail: string;
    stock_quantity: string;
    withCustomer: string;
    processor?: string | null;
    form_factor?: string | null;
    // ... other product fields as per your console log
    processor_filter?: {
        title?: string;
    };
    form_factor_filter?: {
        title?: string;
    };
}

export type Order = {
    id: string
    order_no: string
    order_date: string
    order_status: string
    rev_opportunity: number | null
    dev_budget: number | null
    dev_opportunity: number | null
    crm_account: string | null
    se_email: string | null
    company_name: string | null
    shipped_date: string | null
    returned_date: string | null
    vertical: string | null
    segment: string | null
    order_month: string | null
    order_quarter: string | null
    order_year: string | null
    sales_executive: string | null
    sales_manager: string | null
    sm_email: string | null
    reseller: string | null
    current_manufacturer: string | null
    use_case: string | null
    currently_running: string | null
    licenses: string | null
    isCopilot: string | null
    isSecurity: string | null
    current_protection: string | null
    contact_name: string | null
    email: string | null
    address: string | null
    state: string | null
    city: string | null
    zip: string | null
    desired_date: string | null
    notes: string | null
    product_id: string | null
    products?: Product
    tracking: string | null
    return_tracking: string | null
    tracking_link: string | null
    return_tracking_link: string | null
    username: string | null
    case_type: string | null
    password: string | null
    return_label: string | null
}

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});

    // Table states
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 1000,
    });

    // Role constants from environment variables
    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const ssRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const sRole = process.env.NEXT_PUBLIC_SUBSCRIBER;


    const allowedRoles = [smRole, adminRole, sRole, ssRole].filter(Boolean); // Remove undefined values
    const actionRoles = [smRole, adminRole, ssRole].filter(Boolean); // Remove undefined values
    const viewRoles = [sRole, ssRole].filter(Boolean); // Remove undefined values

    const columnDisplayNames: Record<string, string> = {
        "order_no": "Order #",
        "order_date": "Order Date",
        "order_status": "Shipping Status",
        "company_name": "Customer Name",
        "se_email": "Sales Executive Email",
        "sm_email": "Sales Manager Email",
        "crm_account": "CRM Account #",
        "product_name": "Product Name",
        "processor": "Processor",
        "form_factor": "Form Factor",
        "quantity": "Quantity",
        "currently_running": "OS",
        "shipped_date": "Shipped Date",
        "returned_date": "Returned Date",
        "vertical": "Vertical",
        "segment": "Segment",
        "order_month": "Order Month",
        "order_quarter": "Order Quarter",
        "order_year": "Order Year",
        "tracking": "Tracking Number",
        "return_tracking": "Return Tracking",
        "tracking_link": "Tracking Link",
        "return_tracking_link": "Return Tracking Link",
        "username": "Username",
        "case_type": "Case Type",
        "actions": "Actions"
    };

    // Check if current user is authorized
    const isAuthorized = profile?.role && allowedRoles.includes(profile.role);
    const isActionAuthorized = profile?.role && actionRoles.includes(profile.role);
    const isViewAuthorized = profile?.role && viewRoles.includes(profile.role);

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            console.log("User not authenticated, redirecting to login");
            router.replace('/login/?redirect_to=sku-order-detail');
            return;
        }

        // Check if user has permission to access this page
        if (!isAuthorized) {
            console.log("User not authorized, redirecting...");
            router.replace('/product-category/alldevices');
            return;
        }

    }, [loading, isLoggedIn, profile, router, isAuthorized]);

    // Fetch orders function ko update karein:
    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            setError(null);

            if (!isActionAuthorized) {
                const { data, error: supabaseError } = await supabase
                    .from('orders')
                    .select(`
                    *,
                    products!inner(
                        *,
                        processor_filter:processor(title),
                        form_factor_filter:form_factor(title)
                    )
                `)
                    .order('order_no', { ascending: false })
                    .eq("order_by", profile?.id);

                if (supabaseError) {
                    throw supabaseError;
                }

                if (data) {
                    setOrders(data as Order[]);
                }
            } else {
                const { data, error: supabaseError } = await supabase
                    .from('orders')
                    .select(`
                    *,
                    products!inner(
                        *,
                        processor_filter:processor(title),
                        form_factor_filter:form_factor(title)
                    )
                `)
                    .order('order_no', { ascending: false });

                if (supabaseError) {
                    throw supabaseError;
                }

                if (data) {
                    setOrders(data as Order[]);
                }
            }

        } catch (err: unknown) {
            console.error('Error fetching orders:', err);
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch orders');
            } else {
                setError('Failed to fetch orders');
            }
        } finally {
            setIsLoading(false);
        }
    };


    // Fetch data when authorized
    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
            fetchOrders();
        }
    }, [loading, isLoggedIn, profile, isAuthorized]);

    // Format currency
    const formatCurrency = (amount: number | null) => {
        if (amount === null || amount === undefined) return '-';
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
        return new Date(dateString).toISOString().split('T')[0];
    };

    // Format date for display
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    // Handle edit order click
    const handleEditOrder = (order: Order) => {
        setSelectedOrder(order);
        setEditErrors({});
        setIsEditDrawerOpen(true);
    };

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!selectedOrder) return;

        const { name, value, type } = e.target;

        // Clear error for this field
        if (editErrors[name]) {
            setEditErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        setSelectedOrder(prev => {
            if (!prev) return prev;

            if (type === 'number') {
                return {
                    ...prev,
                    [name]: value === "" ? null : parseFloat(value)
                };
            }

            return {
                ...prev,
                [name]: value === "" ? null : value
            };
        });
    };

    // Handle select changes
    const handleSelectChange = (name: string, value: string) => {
        if (!selectedOrder) return;

        // Clear error for this field
        if (editErrors[name]) {
            setEditErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }

        setSelectedOrder(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                [name]: value === "" ? null : value
            };
        });
    };

    // Calculate revenue opportunity
    useEffect(() => {
        if (!selectedOrder) return;

        const devOpportunity = selectedOrder.dev_opportunity || 0;
        const devBudget = selectedOrder.dev_budget || 0;
        const revenue = devOpportunity * devBudget;

        setSelectedOrder(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                rev_opportunity: revenue
            };
        });
    }, [selectedOrder?.dev_opportunity, selectedOrder?.dev_budget]);

    // Validate field
    const validateField = (name: string, value: any): string => {
        const fieldName = name.replace(/_/g, ' ');

        if (name === 'dev_opportunity' && (value <= 0 || value === "")) {
            return `${fieldName} must be greater than 0`;
        }

        if (name === 'dev_budget' && (value <= 0 || value === "")) {
            return `${fieldName} must be greater than 0`;
        }

        if (name === 'email' && value && !/^\S+@\S+\.\S+$/.test(value)) {
            return "Please enter a valid email address";
        }

        if (name === 'se_email' && value && !/^\S+@\S+\.\S+$/.test(value)) {
            return "Please enter a valid email address";
        }

        if (name === 'sm_email' && value && !/^\S+@\S+\.\S+$/.test(value)) {
            return "Please enter a valid email address";
        }

        return "";
    };

    // Validate form before submission
    const validateEditForm = (): boolean => {
        if (!selectedOrder) return false;

        const requiredFields = [
            'order_no', 'order_date', 'order_status', 'crm_account',
            'company_name', 'se_email', 'sales_executive', 'sales_manager',
            'sm_email', 'reseller', 'dev_opportunity', 'dev_budget',
            'segment', 'vertical', 'current_manufacturer', 'use_case',
            'currently_running', 'licenses', 'isCopilot', 'isSecurity',
            'current_protection', 'contact_name', 'email', 'address',
            'state', 'city', 'zip', 'desired_date'
        ];

        const newErrors: Record<string, string> = {};
        let isValid = true;

        for (const field of requiredFields) {
            const value = selectedOrder[field as keyof typeof selectedOrder];
            const error = validateField(field, value);

            if (error || (value === null || value === "" || value === undefined)) {
                newErrors[field] = error || `${field.replace(/_/g, ' ')} is required`;
                isValid = false;
            }
        }

        setEditErrors(newErrors);
        return isValid;
    };

    // Update order in Supabase
    const handleUpdateOrder = async () => {
        if (!selectedOrder) return;

        if (!validateEditForm()) {
            toast.error("Please fill in all required fields correctly", { style: { color: "white", backgroundColor: "red" } });
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare updated order data - REMOVE products object
            const { products, ...orderWithoutProducts } = selectedOrder;

            const updatedOrder = {
                ...orderWithoutProducts,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('orders')
                .update(updatedOrder)
                .eq('id', selectedOrder.id);

            if (error) throw error;

            // Update local state
            setOrders(prev => prev.map(order =>
                order.id === selectedOrder.id ? {
                    ...orderWithoutProducts,
                    products: products // Keep products in local state
                } : order
            ));

            toast.success("Order updated successfully!", { style: { color: "white", backgroundColor: "black" } });
            setIsEditDrawerOpen(false);
            setSelectedOrder(null);
            setEditErrors({});

        } catch (err: any) {
            console.error('Error updating order:', err);
            toast.error(err.message || "Failed to update order", { style: { color: "white", backgroundColor: "red" } });
        } finally {
            setIsSubmitting(false);
        }
    };
    // Get error class for form fields
    const getErrorClass = (fieldName: string) => {
        return editErrors[fieldName]
            ? "border-red-500 focus:ring-red-500 focus:border-red-500"
            : "border-gray-300 focus:ring-[#0A4647] focus:border-[#0A4647]";
    };

    // Define columns for orders
    const columns: ColumnDef<Order>[] = [
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
            cell: ({ row }) => <div className="text-left ps-2 font-medium">
                <Link href={`/order-details/${row.getValue("order_no")}`} target="_blank" className="text-teal-600 underline">
                    {row.getValue("order_no")}
                </Link>
            </div>,
        },
        {
            accessorKey: "order_date",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Order Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const date = row.getValue("order_date") as string;
                return <div className="text-left ps-2">{formatDate(date)}</div>
            },
        },
        {
            accessorKey: "order_status",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Shipping Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const order_status = row.getValue("order_status") as string;
                return <div className="text-left ps-2 capitalize">{order_status}</div>
            },
        },
        {
            id: "product_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Product Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const productName = row.original.products?.product_name || '-';
                return <div className="text-left ps-2">{productName}</div>
            },
        },
        {
            id: "processor",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Processor
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const processor = row.original.products?.processor_filter?.title || '-';
                return <div className="text-left ps-2">{processor}</div>
            },
        },
        {
            id: "form_factor",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Form Factor
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const formFactor = row.original.products?.form_factor_filter?.title || '-';
                return <div className="text-left ps-2">{formFactor}</div>
            },
        },
        {
            accessorKey: "company_name",
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
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("company_name") || '-'}</div>,
        },
        {
            accessorKey: "se_email",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Sales Executive Email
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2 lowercase">{row.getValue("se_email") || '-'}</div>,
        },
        {
            accessorKey: "sm_email",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Sales Manager Email
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2 lowercase">{row.getValue("sm_email") || '-'}</div>,
        },
        {
            accessorKey: "crm_account",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Account #
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("crm_account") || '-'}</div>,
        },
        {
            accessorKey: "quantity",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Device Qty
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return <div className="text-left ps-2">{row.getValue("quantity") || '-'}</div>
            },
        },
        {
            accessorKey: "currently_running",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        OS
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return <div className="text-left ps-2">{row.getValue("currently_running") || '-'}</div>
            },
        },
        {
            accessorKey: "shipped_date",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Shipped Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const date = row.getValue("shipped_date") as string;
                return <div className="text-left ps-2">{formatDate(date)}</div>
            },
        },
        {
            accessorKey: "returned_date",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Returned Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const date = row.getValue("returned_date") as string;
                return <div className="text-left ps-2">{formatDate(date)}</div>
            },
        },
        {
            accessorKey: "vertical",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Vertical
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("vertical") || '-'}</div>,
        },
        {
            accessorKey: "segment",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Segment
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("segment") || '-'}</div>,
        },
        {
            accessorKey: "order_month",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Order Month
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("order_month") || '-'}</div>,
        },
        {
            accessorKey: "order_year",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Order Year
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("order_year") || '-'}</div>,
        },
        {
            accessorKey: "order_quarter",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Order Quarter
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("order_quarter") || '-'}</div>,
        },
    ];

    // Only add actions column if user is authorized for actions
    if (!isViewAuthorized) {
        columns.unshift({
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const order = row.original;
                const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

                const handleDeleteClick = () => {
                    setIsDeleteDialogOpen(true);
                };

                const handleConfirmDelete = async () => {
                    try {
                        const { error } = await supabase
                            .from('orders')
                            .delete()
                            .eq('id', order.id);

                        if (error) throw error;

                        // Refresh the orders list
                        fetchOrders();
                        setIsDeleteDialogOpen(false);
                    } catch (error) {
                        console.error('Error deleting order:', error);
                        setError('Failed to delete order');
                    }
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
                                    onClick={() => navigator.clipboard.writeText(order.order_no || '')}
                                >
                                    Copy Order #
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => navigator.clipboard.writeText(order.company_name || '')}
                                >
                                    Copy Customer Name
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                        router.push(`/order-details/${order.order_no}`);
                                    }}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => handleEditOrder(order)}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Order
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                    onClick={handleDeleteClick}
                                >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete Order
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Delete Confirmation Dialog */}
                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the order of
                                        <b> {order.company_name}</b> (Order no #{order.order_no}).
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleConfirmDelete}
                                        className="bg-red-500 hover:bg-red-600"
                                    >
                                        Delete Order
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )
            },
        });
    }
    if (isViewAuthorized) {
        columns.unshift({
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const order = row.original;
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
                                        router.push(`/order-details/${order.order_no}`);
                                    }}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        });
    }

    // Initialize table
    const table = useReactTable({
        data: orders,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
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
            pagination,
        },
    })

    // Handle CSV export
    const handleExportCSV = () => {
        if (orders.length === 0) {
            alert("No data to export");
            return;
        }

        try {
            const data = orders.map(order => ({
                'Order #': order.order_no || '',
                'Order Date': formatDate(order.order_date),
                'Shipping Status': order.order_status || '',
                'Product Name': order.products?.product_name || '',
                'Processor': order.products?.processor_filter?.title || '-',
                'Form Factor': order.products?.form_factor_filter?.title || '-',
                'Pipeline Opportunity': order.rev_opportunity || 0,
                'Budget Per Device': order.dev_budget || 0,
                'Device Opportunity Size': order.dev_opportunity || 0,
                'Account #': order.crm_account || '',
                'Sales Executive Email': order.se_email || '',
                'Customer Name': order.company_name || '',
                'Shipped Date': formatDate(order.shipped_date),
                'Returned Date': formatDate(order.returned_date),
                'Vertical': order.vertical || '',
                'Segment': order.segment || '',
                'Order Month': order.order_month || '',
                'Order Quarter': order.order_quarter || '',
                'Order Year': order.order_year || '',
                'Tracking Number': order.tracking || '',
                'Return Tracking': order.return_tracking || '',
                'Tracking Link': order.tracking_link || '',
                'Return Tracking Link': order.return_tracking_link || '',
                'Username': order.username || '',
                'Case Type': order.case_type || '',
                'Return Label': order.return_label || ''
            }));

            const csvString = convertToCSV(data);
            downloadCSV(csvString, `orders_${new Date().toISOString().split('T')[0]}.csv`);

            console.log("CSV exported successfully");
        } catch (error) {
            console.error('Error exporting CSV:', error);
            setError('Failed to export CSV');
        }
    };

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
                <div className="text-lg">Redirecting...</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 px-5 bg-gr">
            <div className="flex justify-between items-center mb-6">
                <h1 className="sm:text-3xl text-xl font-bold">SKU Order Management</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchOrders}
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
                        placeholder="Filter by Shipping Status..."
                        value={(table.getColumn("order_status")?.getFilterValue() as string) ?? ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            table.getColumn("order_status")?.setFilterValue(event.target.value)
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
                <div className="overflow-hidden rounded-md">
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
                                                <span className="ml-2">Loading orders...</span>
                                            </div>
                                        ) : (
                                            "No orders found."
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex flex-col gap-4 py-4">
                    {/* Top row: Rows per page selector */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 whitespace-nowrap">Show</span>
                            <select
                                value={pagination.pageSize === 1000000 ? "All" : pagination.pageSize}
                                onChange={e => {
                                    const value = e.target.value;
                                    if (value === "All") {
                                        table.setPageSize(1000000); // Very large number
                                    } else {
                                        table.setPageSize(Number(value));
                                    }
                                }}
                                className="border rounded px-2 py-1 text-sm"
                            >
                                <option value="All">All</option>
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                            <span className="text-sm text-gray-600 whitespace-nowrap">entries</span>
                        </div>

                        {/* Page info for mobile */}
                        <div className="text-sm text-gray-600 sm:hidden">
                            {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
                        </div>
                    </div>

                    {/* Bottom row: Pagination controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Page info for desktop */}
                        <div className="hidden sm:block text-sm text-gray-600">
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                        </div>

                        <div className="flex items-center justify-center space-x-1 w-full sm:w-auto">
                            {/* Mobile simplified pagination */}
                            <div className="sm:hidden flex items-center justify-center w-full">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="flex-1 max-w-25"
                                >
                                    ‹ Prev
                                </Button>

                                <div className="mx-4 flex items-center">
                                    <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span>
                                    <span className="mx-1 text-gray-500">of</span>
                                    <span className="text-gray-600">{table.getPageCount()}</span>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="flex-1 max-w-25"
                                >
                                    Next ›
                                </Button>
                            </div>

                            {/* Desktop full pagination */}
                            <div className="hidden sm:flex items-center space-x-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="px-3"
                                >
                                    Previous
                                </Button>

                                {/* Smart page numbers with ellipsis */}
                                {(() => {
                                    const pageCount = table.getPageCount();
                                    const currentPage = table.getState().pagination.pageIndex;

                                    if (pageCount <= 7) {
                                        // Show all pages for small page counts
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

                                    // Smart pagination for many pages
                                    const pages = [];

                                    // Always show first page
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

                                    // Calculate dynamic range
                                    let start = Math.max(1, currentPage - 1);
                                    let end = Math.min(pageCount - 2, currentPage + 1);

                                    // Adjust if at the beginning
                                    if (currentPage <= 2) {
                                        start = 1;
                                        end = 3;
                                    }

                                    // Adjust if at the end
                                    if (currentPage >= pageCount - 3) {
                                        start = pageCount - 4;
                                        end = pageCount - 2;
                                    }

                                    // Add ellipsis after first page if needed
                                    if (start > 1) {
                                        pages.push(
                                            <span key="ellipsis1" className="px-2 text-gray-500">
                                                ...
                                            </span>
                                        );
                                    }

                                    // Add middle pages
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

                                    // Add ellipsis before last page if needed
                                    if (end < pageCount - 2) {
                                        pages.push(
                                            <span key="ellipsis2" className="px-2 text-gray-500">
                                                ...
                                            </span>
                                        );
                                    }

                                    // Always show last page
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

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="px-3"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Order Drawer - Ant Design */}
            <Drawer
                title={
                    <div>
                        <div className="text-xl font-bold text-gray-800">
                            Edit Order #<span className="text-[#0A4647]">{selectedOrder?.order_no}</span>
                        </div>
                        <div className="text-gray-600 text-sm mt-1">
                            Update order information. All fields marked with * are required.
                        </div>
                    </div>
                }
                placement="right"
                onClose={() => setIsEditDrawerOpen(false)}
                open={isEditDrawerOpen}
                size={800}
                footer={
                    <div className="flex justify-end gap-3">
                        <AntButton
                            onClick={() => setIsEditDrawerOpen(false)}
                            className="flex items-center"
                        >
                            <CloseOutlined className="mr-2" />
                            Cancel
                        </AntButton>
                        <AntButton
                            type="primary"
                            onClick={handleUpdateOrder}
                            loading={isSubmitting}
                            icon={<SaveOutlined />}
                            className="!bg-[#0A4647] !border-[#0A4647] hover:!bg-[#093636]"
                        >
                            Save Changes
                        </AntButton>

                    </div>
                }
                closeIcon={<CloseOutlined />}
            >
                {selectedOrder && (
                    <div className="space-y-6">
                        {/* Basic Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Order # *
                                    </label>
                                    <AntInput
                                        name="order_no"
                                        value={selectedOrder.order_no || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.order_no ? 'error' : ''}
                                    />
                                    {editErrors.order_no && (
                                        <p className="text-xs text-red-500">{editErrors.order_no}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Order Date *
                                    </label>
                                    <AntInput
                                        name="order_date"
                                        type="date"
                                        value={formatDateForInput(selectedOrder.order_date)}
                                        onChange={handleInputChange}
                                        status={editErrors.order_date ? 'error' : ''}
                                    />
                                    {editErrors.order_date && (
                                        <p className="text-xs text-red-500">{editErrors.order_date}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        CRM Account # *
                                    </label>
                                    <AntInput
                                        name="crm_account"
                                        value={selectedOrder.crm_account || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.crm_account ? 'error' : ''}
                                    />
                                    {editErrors.crm_account && (
                                        <p className="text-xs text-red-500">{editErrors.crm_account}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Team Details Section */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Team Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Sales Executive *
                                    </label>
                                    <AntInput
                                        name="sales_executive"
                                        value={selectedOrder.sales_executive || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.sales_executive ? 'error' : ''}
                                    />
                                    {editErrors.sales_executive && (
                                        <p className="text-xs text-red-500">{editErrors.sales_executive}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        SE Email *
                                    </label>
                                    <AntInput
                                        name="se_email"
                                        type="email"
                                        value={selectedOrder.se_email || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.se_email ? 'error' : ''}
                                    />
                                    {editErrors.se_email && (
                                        <p className="text-xs text-red-500">{editErrors.se_email}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Sales Manager *
                                    </label>
                                    <AntInput
                                        name="sales_manager"
                                        value={selectedOrder.sales_manager || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.sales_manager ? 'error' : ''}
                                    />
                                    {editErrors.sales_manager && (
                                        <p className="text-xs text-red-500">{editErrors.sales_manager}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        SM Email *
                                    </label>
                                    <AntInput
                                        name="sm_email"
                                        type="email"
                                        value={selectedOrder.sm_email || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.sm_email ? 'error' : ''}
                                    />
                                    {editErrors.sm_email && (
                                        <p className="text-xs text-red-500">{editErrors.sm_email}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Reseller *
                                    </label>
                                    <AntInput
                                        name="reseller"
                                        value={selectedOrder.reseller || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.reseller ? 'error' : ''}
                                    />
                                    {editErrors.reseller && (
                                        <p className="text-xs text-red-500">{editErrors.reseller}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Opportunity Details Section */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Opportunity Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Device Units *
                                    </label>
                                    <AntInput
                                        name="dev_opportunity"
                                        type="number"
                                        min="1"
                                        value={selectedOrder.dev_opportunity || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.dev_opportunity ? 'error' : ''}
                                    />
                                    {editErrors.dev_opportunity && (
                                        <p className="text-xs text-red-500">{editErrors.dev_opportunity}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Budget/Device *
                                    </label>
                                    <AntInput
                                        name="dev_budget"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={selectedOrder.dev_budget || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.dev_budget ? 'error' : ''}
                                    />
                                    {editErrors.dev_budget && (
                                        <p className="text-xs text-red-500">{editErrors.dev_budget}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Pipeline Value
                                    </label>
                                    <AntInput
                                        name="rev_opportunity"
                                        type="number"
                                        readOnly
                                        value={selectedOrder.rev_opportunity || ''}
                                        className="bg-gray-50"
                                    />
                                    <p className="text-xs text-gray-500">
                                        {formatCurrency(selectedOrder.rev_opportunity)}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Segment *
                                    </label>
                                    <Select
                                        value={selectedOrder.segment || ''}
                                        onChange={(value) => handleSelectChange('segment', value)}
                                        status={editErrors.segment ? 'error' : ''}
                                        style={{ width: '100%' }}
                                        placeholder="Select segment"
                                    >
                                        <Select.Option value="SMB">SMB</Select.Option>
                                        <Select.Option value="Corporate">Corporate</Select.Option>
                                        <Select.Option value="Field">Field</Select.Option>
                                        <Select.Option value="Majors">Majors</Select.Option>
                                        <Select.Option value="State & Local">State & Local</Select.Option>
                                    </Select>
                                    {editErrors.segment && (
                                        <p className="text-xs text-red-500">{editErrors.segment}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Vertical *
                                    </label>
                                    <Select
                                        value={selectedOrder.vertical || ''}
                                        onChange={(value) => handleSelectChange('vertical', value)}
                                        status={editErrors.vertical ? 'error' : ''}
                                        style={{ width: '100%' }}
                                        placeholder="Select vertical"
                                    >
                                        <Select.Option value="Education">Education</Select.Option>
                                        <Select.Option value="Healthcare">Healthcare</Select.Option>
                                        <Select.Option value="Retails">Retails</Select.Option>
                                        <Select.Option value="Manufacturing">Manufacturing</Select.Option>
                                        <Select.Option value="Federal">Federal</Select.Option>
                                    </Select>
                                    {editErrors.vertical && (
                                        <p className="text-xs text-red-500">{editErrors.vertical}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Technical Details Section */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Technical Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Manufacturer *
                                    </label>
                                    <Select
                                        value={selectedOrder.current_manufacturer || ''}
                                        onChange={(value) => handleSelectChange('current_manufacturer', value)}
                                        status={editErrors.current_manufacturer ? 'error' : ''}
                                        style={{ width: '100%' }}
                                        placeholder="Select manufacturer"
                                    >
                                        <Select.Option value="Acer">Acer</Select.Option>
                                        <Select.Option value="Asus">Asus</Select.Option>
                                        <Select.Option value="Apple">Apple</Select.Option>
                                        <Select.Option value="Dell">Dell</Select.Option>
                                        <Select.Option value="HP">HP</Select.Option>
                                        <Select.Option value="Lenovo">Lenovo</Select.Option>
                                        <Select.Option value="Microsoft">Microsoft</Select.Option>
                                        <Select.Option value="Panasonic">Panasonic</Select.Option>
                                        <Select.Option value="Samsung">Samsung</Select.Option>
                                        <Select.Option value="Other">Other</Select.Option>
                                    </Select>
                                    {editErrors.current_manufacturer && (
                                        <p className="text-xs text-red-500">{editErrors.current_manufacturer}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Use Case *
                                    </label>
                                    <Select
                                        value={selectedOrder.use_case || ''}
                                        onChange={(value) => handleSelectChange('use_case', value)}
                                        status={editErrors.use_case ? 'error' : ''}
                                        style={{ width: '100%' }}
                                        placeholder="Select use case"
                                    >
                                        <Select.Option value="Customer needs to use it in their own environment">Customer Environment</Select.Option>
                                        <Select.Option value="Distributor needs it for their own conferences/events">Distributor Events</Select.Option>
                                        <Select.Option value="Reseller looking to use it for one of their events">Reseller Events</Select.Option>
                                    </Select>
                                    {editErrors.use_case && (
                                        <p className="text-xs text-red-500">{editErrors.use_case}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Current OS *
                                    </label>
                                    <Select
                                        value={selectedOrder.currently_running || ''}
                                        onChange={(value) => handleSelectChange('currently_running', value)}
                                        status={editErrors.currently_running ? 'error' : ''}
                                        style={{ width: '100%' }}
                                        placeholder="Select OS"
                                    >
                                        <Select.Option value="Windows">Windows</Select.Option>
                                        <Select.Option value="Chrome">Chrome</Select.Option>
                                        <Select.Option value="MacOS">MacOS</Select.Option>
                                    </Select>
                                    {editErrors.currently_running && (
                                        <p className="text-xs text-red-500">{editErrors.currently_running}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Licenses *
                                    </label>
                                    <Select
                                        value={selectedOrder.licenses || ''}
                                        onChange={(value) => handleSelectChange('licenses', value)}
                                        status={editErrors.licenses ? 'error' : ''}
                                        style={{ width: '100%' }}
                                        placeholder="Select licenses"
                                    >
                                        <Select.Option value="1-10">1-10</Select.Option>
                                        <Select.Option value="20-50">20-50</Select.Option>
                                        <Select.Option value="100+">100+</Select.Option>
                                    </Select>
                                    {editErrors.licenses && (
                                        <p className="text-xs text-red-500">{editErrors.licenses}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Using Copilot? *
                                    </label>
                                    <Select
                                        value={selectedOrder.isCopilot || ''}
                                        onChange={(value) => handleSelectChange('isCopilot', value)}
                                        status={editErrors.isCopilot ? 'error' : ''}
                                        style={{ width: '100%' }}
                                        placeholder="Select option"
                                    >
                                        <Select.Option value="Yes">Yes</Select.Option>
                                        <Select.Option value="No">No</Select.Option>
                                    </Select>
                                    {editErrors.isCopilot && (
                                        <p className="text-xs text-red-500">{editErrors.isCopilot}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Security Important? *
                                    </label>
                                    <Select
                                        value={selectedOrder.isSecurity || ''}
                                        onChange={(value) => handleSelectChange('isSecurity', value)}
                                        status={editErrors.isSecurity ? 'error' : ''}
                                        style={{ width: '100%' }}
                                        placeholder="Select option"
                                    >
                                        <Select.Option value="Yes">Yes</Select.Option>
                                        <Select.Option value="No">No</Select.Option>
                                    </Select>
                                    {editErrors.isSecurity && (
                                        <p className="text-xs text-red-500">{editErrors.isSecurity}</p>
                                    )}
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Current Protection *
                                    </label>
                                    <AntInput
                                        name="current_protection"
                                        value={selectedOrder.current_protection || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.current_protection ? 'error' : ''}
                                    />
                                    {editErrors.current_protection && (
                                        <p className="text-xs text-red-500">{editErrors.current_protection}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Shipping Details Section */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Shipping Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Company Name *
                                    </label>
                                    <AntInput
                                        name="company_name"
                                        value={selectedOrder.company_name || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.company_name ? 'error' : ''}
                                    />
                                    {editErrors.company_name && (
                                        <p className="text-xs text-red-500">{editErrors.company_name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Contact Name *
                                    </label>
                                    <AntInput
                                        name="contact_name"
                                        value={selectedOrder.contact_name || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.contact_name ? 'error' : ''}
                                    />
                                    {editErrors.contact_name && (
                                        <p className="text-xs text-red-500">{editErrors.contact_name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Email *
                                    </label>
                                    <AntInput
                                        name="email"
                                        type="email"
                                        value={selectedOrder.email || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.email ? 'error' : ''}
                                    />
                                    {editErrors.email && (
                                        <p className="text-xs text-red-500">{editErrors.email}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Address *
                                    </label>
                                    <AntInput
                                        name="address"
                                        value={selectedOrder.address || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.address ? 'error' : ''}
                                    />
                                    {editErrors.address && (
                                        <p className="text-xs text-red-500">{editErrors.address}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        State/Province *
                                    </label>
                                    <Select
                                        value={selectedOrder.state || ''}
                                        onChange={(value) => handleSelectChange('state', value)}
                                        status={editErrors.state ? 'error' : ''}
                                        style={{ width: '100%' }}
                                        placeholder="Select state"
                                        showSearch
                                    >
                                        <Select.Option value="Canada">Canada</Select.Option>
                                        <Select.Option value="Alabama">Alabama</Select.Option>
                                        <Select.Option value="Alaska">Alaska</Select.Option>
                                        <Select.Option value="Arizona">Arizona</Select.Option>
                                        <Select.Option value="Arkansas">Arkansas</Select.Option>
                                        <Select.Option value="California">California</Select.Option>
                                        <Select.Option value="Colorado">Colorado</Select.Option>
                                        <Select.Option value="Connecticut">Connecticut</Select.Option>
                                        <Select.Option value="Delaware">Delaware</Select.Option>
                                        <Select.Option value="District Of Columbia">District Of Columbia</Select.Option>
                                        <Select.Option value="Florida">Florida</Select.Option>
                                        <Select.Option value="Georgia">Georgia</Select.Option>
                                        <Select.Option value="Hawaii">Hawaii</Select.Option>
                                        <Select.Option value="Idaho">Idaho</Select.Option>
                                        <Select.Option value="Illinois">Illinois</Select.Option>
                                        <Select.Option value="Indiana">Indiana</Select.Option>
                                        <Select.Option value="Iowa">Iowa</Select.Option>
                                        <Select.Option value="Kansas">Kansas</Select.Option>
                                        <Select.Option value="Kentucky">Kentucky</Select.Option>
                                        <Select.Option value="Louisiana">Louisiana</Select.Option>
                                        <Select.Option value="Maine">Maine</Select.Option>
                                        <Select.Option value="Maryland">Maryland</Select.Option>
                                        <Select.Option value="Massachusetts">Massachusetts</Select.Option>
                                        <Select.Option value="Michigan">Michigan</Select.Option>
                                        <Select.Option value="Minnesota">Minnesota</Select.Option>
                                        <Select.Option value="Mississippi">Mississippi</Select.Option>
                                        <Select.Option value="Missouri">Missouri</Select.Option>
                                        <Select.Option value="Montana">Montana</Select.Option>
                                        <Select.Option value="Nebraska">Nebraska</Select.Option>
                                        <Select.Option value="Nevada">Nevada</Select.Option>
                                        <Select.Option value="New Hampshire">New Hampshire</Select.Option>
                                        <Select.Option value="New Jersey">New Jersey</Select.Option>
                                        <Select.Option value="New Mexico">New Mexico</Select.Option>
                                        <Select.Option value="New York">New York</Select.Option>
                                        <Select.Option value="North Carolina">North Carolina</Select.Option>
                                        <Select.Option value="North Dakota">North Dakota</Select.Option>
                                        <Select.Option value="Ohio">Ohio</Select.Option>
                                        <Select.Option value="Oklahoma">Oklahoma</Select.Option>
                                        <Select.Option value="Oregon">Oregon</Select.Option>
                                        <Select.Option value="Pennsylvania">Pennsylvania</Select.Option>
                                        <Select.Option value="Puerto Rico">Puerto Rico</Select.Option>
                                        <Select.Option value="Rhode Island">Rhode Island</Select.Option>
                                        <Select.Option value="South Carolina">South Carolina</Select.Option>
                                        <Select.Option value="South Dakota">South Dakota</Select.Option>
                                        <Select.Option value="Tennessee">Tennessee</Select.Option>
                                        <Select.Option value="Texas">Texas</Select.Option>
                                        <Select.Option value="Utah">Utah</Select.Option>
                                        <Select.Option value="Vermont">Vermont</Select.Option>
                                        <Select.Option value="Virginia">Virginia</Select.Option>
                                        <Select.Option value="Washington">Washington</Select.Option>
                                        <Select.Option value="West Virginia">West Virginia</Select.Option>
                                        <Select.Option value="Wisconsin">Wisconsin</Select.Option>
                                        <Select.Option value="Wyoming">Wyoming</Select.Option>
                                        <Select.Option value="Armed Forces (AA)">Armed Forces (AA)</Select.Option>
                                        <Select.Option value="Armed Forces (AE)">Armed Forces (AE)</Select.Option>
                                        <Select.Option value="Armed Forces (AP)">Armed Forces (AP)</Select.Option>
                                        <Select.Option value="Alberta">Alberta</Select.Option>
                                        <Select.Option value="British Columbia">British Columbia</Select.Option>
                                        <Select.Option value="Manitoba">Manitoba</Select.Option>
                                        <Select.Option value="New Brunswick">New Brunswick</Select.Option>
                                        <Select.Option value="Newfoundland and Labrador">Newfoundland and Labrador</Select.Option>
                                        <Select.Option value="Nova Scotia">Nova Scotia</Select.Option>
                                        <Select.Option value="Ontario">Ontario</Select.Option>
                                        <Select.Option value="Prince Edward Island">Prince Edward Island</Select.Option>
                                        <Select.Option value="Quebec">Quebec</Select.Option>
                                        <Select.Option value="Saskatchewan">Saskatchewan</Select.Option>
                                        <Select.Option value="Northwest Territories">Northwest Territories</Select.Option>
                                        <Select.Option value="Nunavut">Nunavut</Select.Option>
                                        <Select.Option value="Yukon">Yukon</Select.Option>
                                    </Select>
                                    {editErrors.state && (
                                        <p className="text-xs text-red-500">{editErrors.state}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        City *
                                    </label>
                                    <AntInput
                                        name="city"
                                        value={selectedOrder.city || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.city ? 'error' : ''}
                                    />
                                    {editErrors.city && (
                                        <p className="text-xs text-red-500">{editErrors.city}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Zip/Postal *
                                    </label>
                                    <AntInput
                                        name="zip"
                                        value={selectedOrder.zip || ''}
                                        onChange={handleInputChange}
                                        status={editErrors.zip ? 'error' : ''}
                                    />
                                    {editErrors.zip && (
                                        <p className="text-xs text-red-500">{editErrors.zip}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Delivery Date *
                                    </label>
                                    <AntInput
                                        name="desired_date"
                                        type="date"
                                        value={formatDateForInput(selectedOrder.desired_date)}
                                        onChange={handleInputChange}
                                        status={editErrors.desired_date ? 'error' : ''}
                                    />
                                    {editErrors.desired_date && (
                                        <p className="text-xs text-red-500">{editErrors.desired_date}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tracking & Return Details Section */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Tracking & Return Details
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Tracking Number
                                    </label>
                                    <AntInput
                                        name="tracking"
                                        value={selectedOrder.tracking || ''}
                                        onChange={handleInputChange}
                                        placeholder="Enter tracking number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Tracking Link
                                    </label>
                                    <AntInput
                                        name="tracking_link"
                                        type="url"
                                        value={selectedOrder.tracking_link || ''}
                                        onChange={handleInputChange}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Return Tracking
                                    </label>
                                    <AntInput
                                        name="return_tracking"
                                        value={selectedOrder.return_tracking || ''}
                                        onChange={handleInputChange}
                                        placeholder="Enter return tracking number"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Return Tracking Link
                                    </label>
                                    <AntInput
                                        name="return_tracking_link"
                                        type="url"
                                        value={selectedOrder.return_tracking_link || ''}
                                        onChange={handleInputChange}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Username
                                    </label>
                                    <AntInput
                                        name="username"
                                        value={selectedOrder.username || ''}
                                        onChange={handleInputChange}
                                        placeholder="Enter username"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Case Type
                                    </label>
                                    <AntInput
                                        name="case_type"
                                        value={selectedOrder.case_type || ''}
                                        onChange={handleInputChange}
                                        placeholder="Enter case type"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Password
                                    </label>
                                    <AntInput
                                        name="password"
                                        type="password"
                                        value={selectedOrder.password || ''}
                                        onChange={handleInputChange}
                                        placeholder="Enter password"
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Return Label URL
                                    </label>
                                    <AntInput
                                        name="return_label"
                                        value={selectedOrder.return_label || ''}
                                        onChange={handleInputChange}
                                        placeholder="https://..."
                                    />
                                    {selectedOrder.return_label && (
                                        <div className="mt-2">
                                            <a
                                                href={selectedOrder.return_label}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-sm"
                                            >
                                                View Return Label
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Additional Information Section */}
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <div className="h-6 w-1 bg-[#0A4647] rounded-full"></div>
                                Additional Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Shipped Date
                                    </label>
                                    <AntInput
                                        name="shipped_date"
                                        type="date"
                                        value={formatDateForInput(selectedOrder.shipped_date)}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Returned Date
                                    </label>
                                    <AntInput
                                        name="returned_date"
                                        type="date"
                                        value={formatDateForInput(selectedOrder.returned_date)}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="space-y-2 sm:col-span-4">
                                    <label className="text-sm font-medium text-gray-700">
                                        Notes
                                    </label>
                                    <AntInput.TextArea
                                        name="notes"
                                        value={selectedOrder.notes || ''}
                                        onChange={handleInputChange}
                                        placeholder="Additional notes..."
                                        rows={3}
                                    />
                                </div>
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