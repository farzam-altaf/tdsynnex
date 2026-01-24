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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Edit, Eye, Save, X, Trash, Send, CheckSquare, Square } from "lucide-react"
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
import { emailTemplates, sendEmail } from "@/lib/email"

// Define Order type based on your Supabase table
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
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
    const [isSendingReminders, setIsSendingReminders] = useState(false);

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
        "select": "Select",
        "order_no": "Order #",
        "order_date": "Order Date",
        "order_status": "Shipping Status",
        "rev_opportunity": "Pipeline Opportunity",
        "dev_budget": "Budget Per Device",
        "dev_opportunity": "Device Opportunity Size",
        "crm_account": "Account #",
        "se_email": "Sales Executive Email",
        "company_name": "Customer Name",
        "shipped_date": "Shipped Date",
        "returned_date": "Returned Date",
        "vertical": "Vertical",
        "segment": "Segment",
        "order_month": "Order Month",
        "order_quarter": "Order Quarter",
        "order_year": "Order Year",
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
            router.replace('/login/?redirect_to=overdue-orders');
            return;
        }

        // Check if user has permission to access this page
        if (!isAuthorized) {
            router.replace('/product-category/alldevices');
            return;
        }

    }, [loading, isLoggedIn, profile, router, isAuthorized]);

    // Calculate days shipped
    const calculateDaysShipped = (shippedDate: string | null): number => {
        if (!shippedDate) return 0;

        const shipped = new Date(shippedDate);
        const today = new Date();

        // Calculate difference in days
        const diffTime = Math.abs(today.getTime() - shipped.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    // Calculate estimated return date (45 days after shipped date)
    const calculateEstimatedReturnDate = (shippedDate: string | null): Date | null => {
        if (!shippedDate) return null;

        const shipped = new Date(shippedDate);
        const estimatedReturn = new Date(shipped);
        estimatedReturn.setDate(shipped.getDate() + 45);

        return estimatedReturn;
    };

    // Format estimated return date for display
    const formatEstimatedReturnDate = (shippedDate: string | null): string => {
        const date = calculateEstimatedReturnDate(shippedDate);
        if (!date) return "-";

        return date.toLocaleDateString();
    };

    // Check if estimated return date has passed
    const hasReturnDatePassed = (shippedDate: string | null): boolean => {
        if (!shippedDate) return false;

        const estimatedReturnDate = calculateEstimatedReturnDate(shippedDate);
        if (!estimatedReturnDate) return false;

        const today = new Date();
        // Set both dates to midnight for accurate day comparison
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const returnDateMidnight = new Date(
            estimatedReturnDate.getFullYear(),
            estimatedReturnDate.getMonth(),
            estimatedReturnDate.getDate()
        );

        return returnDateMidnight < todayMidnight;
    };

    // Calculate days overdue
    const calculateDaysOverdue = (shippedDate: string | null): number => {
        if (!shippedDate) return 0;

        const daysShipped = calculateDaysShipped(shippedDate);
        return Math.max(0, daysShipped - 45);
    };

    // Fetch orders data from Supabase - ONLY SHIPPED ORDERS with passed return dates
    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const shippedStatus = process.env.NEXT_PUBLIC_STATUS_SHIPPED;

            if (!shippedStatus) {
                throw new Error("Shipping status environment variable not set");
            }

            let ordersData: Order[] = [];

            if (!isActionAuthorized) {
                const { data, error: supabaseError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('order_status', shippedStatus)
                    .eq("order_by", profile?.id)
                    .order('order_no', { ascending: false });

                if (supabaseError) {
                    throw supabaseError;
                }

                if (data) {
                    ordersData = data as Order[];
                }
            } else {
                const { data, error: supabaseError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('order_status', shippedStatus)
                    .order('order_no', { ascending: false });

                if (supabaseError) {
                    throw supabaseError;
                }

                if (data) {
                    ordersData = data as Order[];
                }
            }

            // Filter orders where estimated return date has passed (shipped more than 45 days ago)
            const filteredOrders = ordersData.filter(order => {
                return hasReturnDatePassed(order.shipped_date);
            });

            setOrders(filteredOrders);
            // Reset selected rows when data is loaded
            setSelectedRows({});

        } catch (err: unknown) {
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

    // Handle select all rows
    const handleSelectAll = () => {
        const allSelected = Object.keys(selectedRows).length === orders.length &&
            orders.length > 0 &&
            Object.values(selectedRows).every(Boolean);

        if (allSelected) {
            // Deselect all
            setSelectedRows({});
        } else {
            // Select all
            const newSelectedRows: Record<string, boolean> = {};
            orders.forEach(order => {
                newSelectedRows[order.id] = true;
            });
            setSelectedRows(newSelectedRows);
        }
    };

    // Handle select single row
    const handleSelectRow = (orderId: string) => {
        setSelectedRows(prev => ({
            ...prev,
            [orderId]: !prev[orderId]
        }));
    };

    // Replace the existing handleSendReminders function with this updated version:

    const handleSendReminders = async () => {
        const selectedOrderIds = Object.keys(selectedRows).filter(id => selectedRows[id]);

        if (selectedOrderIds.length === 0) {
            toast.error("Please select at least one order to send reminder", {
                style: { color: "white", backgroundColor: "red" }
            });
            return;
        }

        setIsSendingReminders(true);

        try {
            // Get selected orders with user data
            const { data: selectedOrdersData, error: orderError } = await supabase
                .from('orders')
                .select(`
                *,
                users:order_by (
                    id,
                    email
                )
            `)
                .in('id', selectedOrderIds);

            if (orderError) throw orderError;

            if (!selectedOrdersData || selectedOrdersData.length === 0) {
                toast.error("No orders found", {
                    style: { color: "white", backgroundColor: "red" }
                });
                return;
            }

            // Prepare and send emails for each order
            const emailPromises = selectedOrdersData.map(async (order) => {
                // Check if user has email
                if (!order.users?.email) {
                    console.warn(`No email found for user with ID: ${order.order_by}`);
                    return {
                        success: false,
                        orderId: order.id,
                        orderNumber: order.order_no,
                        reason: 'User email not found'
                    };
                }

                try {
                    // Get product details if available
                    let productName = "Standard Device Package";
                    let productSlug = "-";
                    let quantity = 1;

                    if (order.product_id) {
                        const { data: productData } = await supabase
                            .from('products')
                            .select('product_name, slug')
                            .eq('id', order.product_id)
                            .single();

                        if (productData) {
                            productName = productData.product_name;
                            productSlug = productData.slug;
                        }
                    }

                    const daysSinceShipped = calculateDaysShipped(order.shipped_date);
                    const daysOverdue = calculateDaysOverdue(order.shipped_date);

                    // Prepare days count text with overdue info
                    let daysCountText = `${daysSinceShipped} days`;
                    if (daysOverdue > 0) {
                        daysCountText += ` (${daysOverdue} days overdue)`;
                    }

                    // Prepare email data
                    const emailData = {
                        orderNumber: order.order_no,
                        orderDate: formatDate(order.order_date),
                        productName: productName,
                        productSlug: productSlug,
                        quantity: quantity,
                        returnTracking: order.return_tracking || "Not provided yet",
                        fileLink: order.return_label || "https://tdsynnex.vercel.app",
                        salesExecutive: order.sales_executive || "N/A",
                        salesExecutiveEmail: order.se_email || "N/A",
                        salesManager: order.sales_manager || "N/A",
                        salesManagerEmail: order.sm_email || "N/A",
                        companyName: order.company_name || "N/A",
                        contactEmail: order.email || "N/A",
                        shippedDate: formatDate(order.shipped_date),
                        daysCount: daysCountText,
                        note: order.notes || "Please return the device as soon as possible.",
                        customerName: order.company_name || "Customer",
                        customerEmail: order.users.email
                    };

                    // Get email template
                    const template = emailTemplates.returnReminderCronEmail({
                        orderNumber: emailData.orderNumber,
                        orderDate: emailData.orderDate,
                        customerName: emailData.customerName,
                        customerEmail: emailData.customerEmail,
                        productName: emailData.productName,
                        quantity: emailData.quantity,
                        returnTracking: emailData.returnTracking,
                        fileLink: emailData.fileLink,
                        salesExecutive: emailData.salesExecutive,
                        salesExecutiveEmail: emailData.salesExecutiveEmail,
                        salesManager: emailData.salesManager,
                        salesManagerEmail: emailData.salesManagerEmail,
                        companyName: emailData.companyName,
                        contactEmail: emailData.contactEmail,
                        shippedDate: emailData.shippedDate,
                        productSlug: emailData.productSlug,
                        daysCount: emailData.daysCount
                    });

                    // Send email
                    await sendEmail({
                        to: order.users.email,
                        subject: template.subject,
                        text: template.text,
                        html: template.html,
                    });

                    // Log email sent in orders table (optional)
                    await supabase
                        .from('orders')
                        .update({
                            notes: order.notes
                                ? `${order.notes}\n[Reminder sent on ${new Date().toLocaleDateString()}]`
                                : `[Reminder sent on ${new Date().toLocaleDateString()}]`,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', order.id);

                    return {
                        success: true,
                        orderId: order.id,
                        orderNumber: order.order_no,
                        email: order.users.email
                    };

                } catch (emailError: any) {
                    console.error(`Failed to send email for order ${order.order_no}:`, emailError);
                    return {
                        success: false,
                        orderId: order.id,
                        orderNumber: order.order_no,
                        reason: emailError.message || 'Email sending failed'
                    };
                }
            });

            // Wait for all emails to be sent
            const results = await Promise.all(emailPromises);

            // Count success and failures
            const successful = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            // Show summary toast
            if (successful > 0) {
                toast.success(`Reminders sent successfully for ${successful} order(s)${failed > 0 ? `, ${failed} failed` : ''}`, {
                    style: { color: "white", backgroundColor: "black" }
                });
            }

            if (failed > 0) {
                toast.error(`Failed to send ${failed} reminder(s)`, {
                    style: { color: "white", backgroundColor: "red" }
                });
            }

            // Clear selection after sending
            setSelectedRows({});

        } catch (err: any) {
            toast.error(err.message || "Failed to send reminders", {
                style: { color: "white", backgroundColor: "red" }
            });
        } finally {
            setIsSendingReminders(false);
        }
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
            // Prepare updated order data
            const updatedOrder = {
                ...selectedOrder,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('orders')
                .update(updatedOrder)
                .eq('id', selectedOrder.id);

            if (error) throw error;

            // Update local state
            setOrders(prev => prev.map(order =>
                order.id === selectedOrder.id ? updatedOrder : order
            ));

            toast.success("Order updated successfully!", { style: { color: "white", backgroundColor: "black" } });
            setIsEditDrawerOpen(false);
            setSelectedOrder(null);
            setEditErrors({});

        } catch (err: any) {
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
        // Select column
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex justify-center">
                    <button
                        onClick={handleSelectAll}
                        className="cursor-pointer"
                    >
                        {Object.keys(selectedRows).length === orders.length &&
                            orders.length > 0 &&
                            Object.values(selectedRows).every(Boolean) ? (
                            <CheckSquare className="h-5 w-5 text-[#0A4647]" />
                        ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                        )}
                    </button>
                </div>
            ),
            cell: ({ row }) => {
                const order = row.original;
                return (
                    <div className="flex justify-center">
                        <input
                            type="checkbox"
                            checked={!!selectedRows[order.id]}
                            onChange={() => handleSelectRow(order.id)}
                            className="h-4 w-4 rounded border-gray-300 text-[#0A4647] focus:ring-[#0A4647] cursor-pointer"
                        />
                    </div>
                )
            },
            enableSorting: false,
            enableHiding: false,
        },
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
                <Link href={`/order-details/${row.getValue("order_no")}`} target="_blank" className="text-teal-600 underline">{row.getValue("order_no")}</Link>
            </div>,
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
                        Company Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("company_name") || '-'}</div>,
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
            id: "days_shipped",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Days Since Shipped
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const order = row.original;
                const days = calculateDaysShipped(order.shipped_date);
                let className = "text-left ps-2 font-medium";

                // Color coding based on days overdue
                const daysOverdue = calculateDaysOverdue(order.shipped_date);
                if (daysOverdue > 0) {
                    className += " text-red-600";
                } else if (days > 40) {
                    className += " text-orange-600";
                } else if (days > 35) {
                    className += " text-yellow-600";
                }

                return <div className={className}>{days} days</div>
            },
        },
        {
            id: "days_overdue",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Days Overdue
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const order = row.original;
                const daysOverdue = calculateDaysOverdue(order.shipped_date);
                let className = "text-left ps-2 font-medium";

                if (daysOverdue > 0) {
                    className += " text-red-600 font-semibold";
                }

                return (
                    <div className={className}>
                        {daysOverdue > 0 ? `${daysOverdue} days` : "On time"}
                    </div>
                );
            },
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
            id: "estimated_return_date",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Estimated Return Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const order = row.original;
                const estimatedDate = formatEstimatedReturnDate(order.shipped_date);
                const daysOverdue = calculateDaysOverdue(order.shipped_date);
                let className = "text-left ps-2";

                if (daysOverdue > 0) {
                    className += " text-red-600 font-semibold";
                }

                return <div className={className}>{estimatedDate}</div>
            },
        },
        {
            accessorKey: "return_tracking",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Return Tracking #
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const order = row.original;
                const returnTracking = order.return_tracking;
                const returnTrackingLink = order.return_tracking_link;

                if (!returnTracking) {
                    return <div className="text-left ps-2 text-gray-500">Not returned yet</div>;
                }

                if (returnTrackingLink) {
                    return (
                        <div className="text-left ps-2">
                            <Link
                                href={returnTrackingLink}
                                target="_blank"
                                className="text-blue-600 hover:underline cursor-pointer"
                            >
                                {returnTracking}
                            </Link>
                        </div>
                    );
                }

                return <div className="text-left ps-2">{returnTracking}</div>;
            },
        },
        {
            accessorKey: "sales_executive",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Sales Executive
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("sales_executive") || '-'}</div>,
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
            cell: ({ row }) => {
                const email = row.getValue("se_email") as string;
                return (
                    <div className="text-left ps-2">{email}</div>
                )
            },
        },
        {
            accessorKey: "notes",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Notes
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                return <div className="text-left ps-2">{row.getValue("notes") || '-'}</div>
            },
        }
    ];

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
    });

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
                'Days Since Shipped': calculateDaysShipped(order.shipped_date),
                'Days Overdue': calculateDaysOverdue(order.shipped_date),
                'Estimated Return Date': formatEstimatedReturnDate(order.shipped_date),
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
            downloadCSV(csvString, `overdue_orders_${new Date().toISOString().split('T')[0]}.csv`);
        } catch (error) {
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

    // Get count of selected rows
    const selectedCount = Object.values(selectedRows).filter(Boolean).length;

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
        <div className="container mx-auto py-10 px-5">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="sm:text-3xl text-xl font-bold">Overdue Orders Dashboard</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Showing {orders.length} order{orders.length !== 1 ? 's' : ''} with passed return dates (shipped more than 45 days ago)
                    </p>
                </div>
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

            {/* Send Reminders Button */}
            {selectedCount > 0 && (
                <div className="mb-6 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="font-semibold">{selectedCount}</span>
                            <span className="ml-2">
                                {selectedCount === 1 ? 'order selected' : 'orders selected'}
                            </span>
                        </div>
                        <div className="send-reminders-button">
                            <button
                                onClick={handleSendReminders}
                                disabled={isSendingReminders}
                                className="
                                    flex items-center gap-2
                                    bg-blue-900 hover:bg-blue-700
                                    text-white  {/* Changed from text-black */}
                                    px-4 py-2
                                    rounded-md
                                    disabled:opacity-50
                                "
                            >
                                {isSendingReminders ? "Sending..." : "Send Reminders"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="w-full">
                <div className="flex items-center py-4 gap-4">
                    <Input
                        placeholder="Filter by Customer Name..."
                        value={(table.getColumn("company_name")?.getFilterValue() as string) ?? ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            table.getColumn("company_name")?.setFilterValue(event.target.value)
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
                                .filter((column) => column.getCanHide() && column.id !== 'select')
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
                    <Table className="border">
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
                                        className={`hover:bg-gray-50 ${selectedRows[row.original.id] ? 'bg-blue-50' : ''}`}
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
                                                <span className="ml-2">Loading overdue orders...</span>
                                            </div>
                                        ) : (
                                            "No overdue orders found. All orders are within their 45-day return period."
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
        </div>
    );
}