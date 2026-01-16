"use client"

import { useParams, useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"

export type Product = {
    id: string;
    product_name: string;
    sku: string;
    thumbnail: string;
    stock_quantity: string;
    withCustomer: string;
    processor?: string | null;
    form_factor?: string | null;
    processor_filter?: {
        title?: string;
    };
    form_factor_filter?: {
        title?: string;
    };
}

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
    quantity: string | null
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
    approvedBy: string | null
    rejectedBy: string | null
    action_date: string | null
    address: string | null
    tracking: string | null
    return_tracking: string | null
    tracking_link: string | null
    return_tracking_link: string | null
    username: string | null
    case_type: string | null
    password: string | null
    return_label: string | null
    state: string | null
    city: string | null
    zip: string | null
    desired_date: string | null
    notes: string | null
    product_id: string | null
    products?: Product
    approved_user?: { // Add this for the join
        id: string
        email: string
        first_name?: string
        last_name?: string
    }
    rejected_user?: { // Add this for the join
        id: string
        email: string
        first_name?: string
        last_name?: string
    }
}

export default function Page() {
    const router = useRouter();
    const params = useParams();
    const orderHash = params.order as string;
    const { profile, isLoggedIn, loading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editedValue, setEditedValue] = useState<string>("");
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [trackingData, setTrackingData] = useState({
        tracking: "",
        return_tracking: "",
        tracking_link: "",
        return_tracking_link: "",
        username: "",
        case_type: "",
        password: ""
    });

    // Order status options from environment variables
    const statusOptions = [
        { value: `${process.env.NEXT_PUBLIC_STATUS_AWAITING}`, label: "Awaiting Approval" },
        { value: `${process.env.NEXT_PUBLIC_STATUS_PROCESSING}`, label: "Processing" },
        { value: `${process.env.NEXT_PUBLIC_STATUS_SHIPPED}`, label: "Shipped" },
        { value: `${process.env.NEXT_PUBLIC_STATUS_EXTENSION}`, label: "Shipped Extension" },
        { value: `${process.env.NEXT_PUBLIC_STATUS_RETURNED}`, label: "Returned" },
        { value: `${process.env.NEXT_PUBLIC_STATUS_REJECTED}`, label: "Rejected" }
    ];

    // Role constants from environment variables
    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const ssRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const sRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

    const allowedRoles = [smRole, adminRole, sRole, ssRole].filter(Boolean);
    const actionRoles = [smRole, adminRole].filter(Boolean);

    // Check if current user is authorized
    const isAuthorized = profile?.role && allowedRoles.includes(profile.role);
    const isActionAuthorized = profile?.role && actionRoles.includes(profile.role);

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            console.log("User not authenticated, redirecting to login");
            router.replace(`/login/?redirect_to=order-details/${orderHash}`);
            return;
        }

        if (!isAuthorized) {
            console.log("User not authorized, redirecting...");
            router.replace('/product-category/alldevices');
            return;
        }

    }, [loading, isLoggedIn, profile, router, isAuthorized, orderHash]);

    // Fetch all products for the product selector
    const fetchAllProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('id, product_name, sku')
                .order('product_name');

            if (error) throw error;

            if (data) {
                setAllProducts(data as Product[]);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    // Fetch orders data from Supabase with user joins
    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Update the query to join with users table for approved_by and rejected_by
            let query = supabase
                .from('orders')
                .select(`
                    *,
                    products!inner(
                        *,
                        processor_filter:processor(title),
                        form_factor_filter:form_factor(title)
                    ),
                    approved_user:users!orders_approved_by_fkey(id, email),
                    rejected_user:users!orders_rejected_by_fkey(id, email)
                `)
                .eq('order_no', orderHash);

            const { data, error: supabaseError } = await query;

            if (supabaseError) {
                throw supabaseError;
            }

            if (data) {
                setOrders(data as Order[]);
                // Initialize tracking data with order data
                if (data.length > 0) {
                    const order = data[0];
                    setTrackingData({
                        tracking: order.tracking || "",
                        return_tracking: order.return_tracking || "",
                        tracking_link: order.tracking_link || "",
                        return_tracking_link: order.return_tracking_link || "",
                        username: order.username || "",
                        case_type: order.case_type || "",
                        password: order.password || ""
                    });
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
            fetchAllProducts();
        }
    }, [loading, isLoggedIn, profile, isAuthorized]);

    // Button click handlers
    const handleApprove = async () => {
        if (!order || !isActionAuthorized) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    order_status: `${process.env.NEXT_PUBLIC_STATUS_PROCESSING}`,
                    approved_by: profile?.id,
                    action_date: `${new Date().toISOString().split('T')[0]}`
                })
                .eq('id', order.id);

            if (error) throw error;

            // Refresh data
            fetchOrders();
        } catch (err) {
            console.error('Error approving order:', err);
        }
    };

    const handleReject = async () => {
        if (!order || !isActionAuthorized) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    order_status: `${process.env.NEXT_PUBLIC_STATUS_REJECTED}`,
                    rejected_by: profile?.id,
                    action_date: `${new Date().toISOString().split('T')[0]}`
                })
                .eq('id', order.id);

            if (error) throw error;

            // Refresh data
            fetchOrders();
        } catch (err) {
            console.error('Error rejecting order:', err);
        }
    };

    // Edit functionality
    const handleEditClick = (field: string, value: string, rowId: string) => {
        if (!isActionAuthorized) return;
        setEditingField(field);
        setEditedValue(value || "");
        setEditingRowId(rowId);
    };

    const handleSaveEdit = async (field: string) => {
        if (!order || !isActionAuthorized || editingField !== field) return;

        try {
            const updateData: any = { [field]: editedValue };

            // Calculate revenue opportunity if device opportunity or budget is changed
            if (field === "dev_opportunity" || field === "dev_budget") {
                const devOpportunity = field === "dev_opportunity" ? parseInt(editedValue) : order.dev_opportunity;
                const devBudget = field === "dev_budget" ? parseFloat(editedValue) : order.dev_budget;

                if (devOpportunity && devBudget) {
                    updateData.rev_opportunity = devOpportunity * devBudget;
                }
            }

            const { error } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', order.id);

            if (error) throw error;

            // Update local state without full reload
            setOrders(prev => {
                const updatedOrder = prev.map(o => {
                    if (o.id === order.id) {
                        const updated = { ...o, [field]: editedValue };
                        // Update revenue opportunity if needed
                        if (field === "dev_opportunity" || field === "dev_budget") {
                            const devOpportunity = field === "dev_opportunity" ? parseInt(editedValue) : order.dev_opportunity;
                            const devBudget = field === "dev_budget" ? parseFloat(editedValue) : order.dev_budget;

                            if (devOpportunity && devBudget) {
                                updated.rev_opportunity = devOpportunity * devBudget;
                            }
                        }
                        return updated;
                    }
                    return o;
                });
                return updatedOrder;
            });

            // Reset editing state
            setEditingField(null);
            setEditingRowId(null);
            setEditedValue("");
        } catch (err) {
            console.error('Error updating order:', err);
        }
    };

    const handleCancelEdit = () => {
        setEditingField(null);
        setEditingRowId(null);
        setEditedValue("");
    };

    // Handle tracking data update
    const handleTrackingUpdate = async () => {
        if (!order || !isActionAuthorized) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    tracking: trackingData.tracking,
                    return_tracking: trackingData.return_tracking,
                    tracking_link: trackingData.tracking_link,
                    return_tracking_link: trackingData.return_tracking_link,
                    username: trackingData.username,
                    case_type: trackingData.case_type,
                    password: trackingData.password
                })
                .eq('id', order.id);

            if (error) throw error;

            // Update local state
            setOrders(prev => prev.map(o =>
                o.id === order.id ? {
                    ...o,
                    tracking: trackingData.tracking,
                    return_tracking: trackingData.return_tracking,
                    tracking_link: trackingData.tracking_link,
                    return_tracking_link: trackingData.return_tracking_link,
                    username: trackingData.username,
                    case_type: trackingData.case_type,
                    password: trackingData.password
                } : o
            ));

            // Close modal
            setIsModalOpen(false);
        } catch (err) {
            console.error('Error updating tracking data:', err);
        }
    };

    // Handle file upload for return label
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!order || !isActionAuthorized) return;

        const file = event.target.files?.[0];
        if (!file) return;

        // Check if file is PDF
        if (
            file.type !== 'application/pdf' &&
            !file.name.toLowerCase().endsWith('.pdf')
        ) {
            setUploadError('Please upload a valid PDF file');
            return;
        }

        try {
            setIsUploading(true);
            setUploadError(null);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `return-labels/${order.order_no}/${fileName}`;

            // First, check if storage bucket exists and is accessible
            console.log('Uploading file to path:', filePath);

            // Upload file to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('TdSynnex')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                console.error('Upload error details:', uploadError);
                throw uploadError;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('TdSynnex')
                .getPublicUrl(filePath);

            console.log('File uploaded successfully, public URL:', publicUrl);

            // Update order with the file URL
            const { error: updateError } = await supabase
                .from('orders')
                .update({ return_label: publicUrl })
                .eq('id', order.id);

            if (updateError) throw updateError;

            // Update local state
            setOrders(prev => prev.map(o =>
                o.id === order.id ? { ...o, return_label: publicUrl } : o
            ));

            // Clear the file input
            event.target.value = '';

        } catch (err: any) {
            console.error('Error uploading file:', err);
            setUploadError(err.message || 'Failed to upload file. Please check storage bucket configuration.');
        } finally {
            setIsUploading(false);
        }
    };

    // Handle product selection
    const handleProductSelect = async (productId: string) => {
        if (!order || !isActionAuthorized) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({ product_id: productId })
                .eq('id', order.id);

            if (error) throw error;

            // Refresh data to get updated product info
            await fetchOrders();

            // Reset editing state AFTER successful update
            setEditingField(null);
            setEditingRowId(null);
            setEditedValue("");

        } catch (err) {
            console.error('Error updating product:', err);
        }
    };

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
                <div className="text-lg">Redirecting...</div>
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

    if (orders.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">No order found</div>
            </div>
        );
    }

    const order = orders[0];

    // Helper function to render editable cell
    const renderEditableCell = (field: string, value: any, rowId: string = "order") => {
        const displayValue = value || "-";
        const isEditing = editingField === field && editingRowId === rowId;

        if (isEditing) {
            return (
                <div className="flex items-center gap-2">
                    <Input
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value)}
                        className="flex-1"
                        autoFocus
                    />
                    <Button
                        size="sm"
                        onClick={() => handleSaveEdit(field)}
                        className="bg-teal-600 hover:bg-teal-700 cursor-pointer"
                    >
                        Save
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="cursor-pointer"
                    >
                        Cancel
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-between group">
                <span>{displayValue}</span>
                {isActionAuthorized && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 cursor-pointer"
                        onClick={() => handleEditClick(field, value, rowId)}
                    >
                        <Pencil className="h-3 w-3" />
                    </Button>
                )}
            </div>
        );
    };

    // Helper function to render status dropdown
    const renderStatusDropdown = (field: string, value: any, rowId: string = "order") => {
        const displayValue = value || "-";
        const isEditing = editingField === field && editingRowId === rowId;

        if (isEditing) {
            return (
                <div className="flex items-center gap-2">
                    <Select
                        value={editedValue}
                        onValueChange={setEditedValue}
                    >
                        <SelectTrigger className="flex-1">
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
                    <Button
                        size="sm"
                        onClick={() => handleSaveEdit(field)}
                        className="bg-teal-600 hover:bg-teal-700 cursor-pointer"
                    >
                        Save
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="cursor-pointer"
                    >
                        Cancel
                    </Button>
                </div>
            );
        }

        const statusLabel = statusOptions.find(opt => opt.value === value)?.label || value;

        return (
            <div className="flex items-center justify-between group">
                <span>{statusLabel}</span>
                {isActionAuthorized && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 cursor-pointer"
                        onClick={() => handleEditClick(field, value, rowId)}
                    >
                        <Pencil className="h-3 w-3" />
                    </Button>
                )}
            </div>
        );
    };

    // Helper function to render product selector
    const renderProductSelector = (field: string, currentProduct: any, rowId: string = "order") => {
        const isEditing = editingField === field && editingRowId === rowId;

        if (isEditing) {
            return (
                <div className="flex items-center gap-2">
                    <Select
                        value={editedValue}
                        onValueChange={setEditedValue}
                    >
                        <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                            {allProducts.map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                    {product.product_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        size="sm"
                        onClick={() => handleProductSelect(editedValue)}
                        className="bg-teal-600 hover:bg-teal-700 cursor-pointer"
                    >
                        Save
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="cursor-pointer"
                    >
                        Cancel
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-between group">
                <span>{order.products?.product_name || currentProduct || "-"}</span>
                {isActionAuthorized && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 cursor-pointer"
                        onClick={() => {
                            setEditingField(field);
                            setEditedValue(order.product_id || "");
                            setEditingRowId(rowId);
                        }}
                    >
                        <Pencil className="h-3 w-3" />
                    </Button>
                )}
            </div>
        );
    };

    // Helper function to render file upload for return label
    const renderReturnLabelUpload = (field: string, currentValue: any, rowId: string = "order") => {
        return (
            <div className="flex flex-col items-center justify-center gap-2">
                {currentValue ? (
                    <div className="flex flex-col items-center">
                        <Link
                            href={currentValue}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 cursor-pointer"
                        >
                            View Return Label (PDF)
                        </Link>
                    </div>
                ) : (
                    <span className="text-gray-500">No Return Label uploaded</span>
                )}

                {uploadError && (
                    <div className="text-sm text-red-600 mt-1 text-center">
                        {uploadError}
                    </div>
                )}

                {isActionAuthorized && (
                    <div className="mt-2">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="return-label-upload"
                        />
                        <label
                            htmlFor="return-label-upload"
                            className="inline-flex items-center justify-center px-3 py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? "Uploading..." : currentValue ? "Replace PDF" : "Upload PDF"}
                        </label>
                    </div>
                )}
            </div>
        );
    };

    // Helper function to render notes with edit
    const renderNotesCell = () => {
        const isEditing = editingField === "notes" && editingRowId === "notes";

        if (isEditing) {
            return (
                <div className="flex items-center gap-2">
                    <Input
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value)}
                        className="flex-1"
                        autoFocus
                    />
                    <Button
                        size="sm"
                        onClick={() => handleSaveEdit("notes")}
                        className="bg-teal-600 hover:bg-teal-700 cursor-pointer"
                    >
                        Save
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="cursor-pointer"
                    >
                        Cancel
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <b>Notes: </b>
                    <span>{order.notes || "-"}</span>
                </div>
                {isActionAuthorized && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2 cursor-pointer"
                        onClick={() => handleEditClick("notes", order.notes || "", "notes")}
                    >
                        <Pencil className="h-3 w-3" />
                    </Button>
                )}
            </div>
        );
    };

    // Tracking section with modal
    const renderTrackingSection = () => {
        return (
            <div className="space-y-6">
                <div>
                    <Table className="border">
                        <TableHeader>
                            <TableRow>
                                <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} colSpan={2}>Tracking & Return Tracking</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-semibold">Tracking</TableCell>
                                <TableCell className="border-l">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {order.tracking ? (
                                                order.tracking_link ? (
                                                    <Link
                                                        href={order.tracking_link}
                                                        target="_blank"
                                                        className="text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        {order.tracking}
                                                    </Link>
                                                ) : (
                                                    <span>{order.tracking}</span>
                                                )
                                            ) : (
                                                <span className="text-gray-500">No tracking available</span>
                                            )}
                                        </div>
                                        {isActionAuthorized && (
                                            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="group-hover:opacity-100 transition-opacity h-6 w-6 p-0 cursor-pointer"
                                                    >
                                                        <Pencil className="h-3 w-3 text-black" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[600px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Edit Tracking Details</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Tracking Number</label>
                                                            <Input
                                                                value={trackingData.tracking}
                                                                onChange={(e) => setTrackingData({ ...trackingData, tracking: e.target.value })}
                                                                placeholder="Enter tracking number"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Return Tracking Number</label>
                                                            <Input
                                                                value={trackingData.return_tracking}
                                                                onChange={(e) => setTrackingData({ ...trackingData, return_tracking: e.target.value })}
                                                                placeholder="Enter return tracking number"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Tracking Link</label>
                                                            <Input
                                                                value={trackingData.tracking_link}
                                                                onChange={(e) => setTrackingData({ ...trackingData, tracking_link: e.target.value })}
                                                                placeholder="Enter tracking link"
                                                                type="url"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Return Tracking Link</label>
                                                            <Input
                                                                value={trackingData.return_tracking_link}
                                                                onChange={(e) => setTrackingData({ ...trackingData, return_tracking_link: e.target.value })}
                                                                placeholder="Enter return tracking link"
                                                                type="url"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Username</label>
                                                            <Input
                                                                value={trackingData.username}
                                                                onChange={(e) => setTrackingData({ ...trackingData, username: e.target.value })}
                                                                placeholder="Enter username"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium">Case Type</label>
                                                            <Input
                                                                value={trackingData.case_type}
                                                                onChange={(e) => setTrackingData({ ...trackingData, case_type: e.target.value })}
                                                                placeholder="Enter case type"
                                                            />
                                                        </div>
                                                        <div className="space-y-2 md:col-span-2">
                                                            <label className="text-sm font-medium">Password</label>
                                                            <Input
                                                                value={trackingData.password}
                                                                onChange={(e) => setTrackingData({ ...trackingData, password: e.target.value })}
                                                                placeholder="Enter password"
                                                                type="password"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setIsModalOpen(false)}
                                                            className="cursor-pointer"
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            onClick={handleTrackingUpdate}
                                                            className="bg-teal-600 hover:bg-teal-700 cursor-pointer"
                                                        >
                                                            Save Changes
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="font-semibold">Return Tracking</TableCell>
                                <TableCell className="border-l">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {order.return_tracking ? (
                                                order.return_tracking_link ? (
                                                    <Link
                                                        href={order.return_tracking_link}
                                                        target="_blank"
                                                        className="text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        {order.return_tracking}
                                                    </Link>
                                                ) : (
                                                    <span>{order.return_tracking}</span>
                                                )
                                            ) : (
                                                <span className="text-gray-500">No return tracking available</span>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <div>
                    <Table className="border">
                        <TableHeader>
                            <TableRow>
                                <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} colSpan={2}>Return Label</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={2} className="text-center">
                                    {renderReturnLabelUpload("return_label", order.return_label, "return_label")}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto py-10 px-5">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Order #{order.order_no}</h1>
                <p className="text-gray-600 mt-2">Order Date: {order.order_date}</p>
            </div>

            {/* Main content with 70/30 split */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left column - 70% */}
                <div className="lg:w-[70%] space-y-6">
                    {/* Orders Section with Approve/Reject Buttons */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Order Details</h2>
                        {order.order_status === process.env.NEXT_PUBLIC_STATUS_AWAITING && profile?.role !== process.env.NEXT_PUBLIC_SUBSCRIBER ? (
                            <Table className="border">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }}>Approve</TableHead>
                                        <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }}>Reject</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>
                                            <Button
                                                onClick={handleApprove}
                                                className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                                                disabled={!isActionAuthorized}
                                            >
                                                Approve Order
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                onClick={handleReject}
                                                className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                                                variant="destructive"
                                                disabled={!isActionAuthorized}
                                            >
                                                Reject Order
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        ) : (
                            <Table className="border">
                                {order.order_status == process.env.NEXT_PUBLIC_STATUS_REJECTED ? (
                                    <>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }}>Rejected By</TableHead>
                                                <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }}>Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>
                                                    {order.rejected_user?.email || order.rejectedBy || "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    {order.action_date}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </>
                                ) : (
                                    <>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }}>Approved By</TableHead>
                                                <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }}>Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>
                                                <TableCell>
                                                    {order.approved_user?.email || order.approvedBy || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {order.action_date || "-"}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </>
                                )}
                            </Table>
                        )}
                    </div>

                    {/* Product Section */}
                    <div>
                        <Table className="border">
                            <TableHeader>
                                <TableRow>
                                    <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} className="w-[85%]">
                                        Product
                                    </TableHead>
                                    <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} className="w-[15%]">
                                        Quantity
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="w-[85%]">
                                        {renderProductSelector("product_id", order.products?.product_name, "product")}
                                    </TableCell>
                                    <TableCell className="w-[15%] border-l">
                                        {order.quantity}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <div>
                        <Table className="border">
                            <TableHeader>
                                <TableRow>
                                    <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} colSpan={2}>
                                        Team Details
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Sales Executive</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("sales_executive", order.sales_executive, "team_sales_executive")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Sales Executive Email</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("se_email", order.se_email, "team_se_email")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Sales Manager</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("sales_manager", order.sales_manager, "team_sales_manager")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Sales Manager Email</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("sm_email", order.sm_email, "team_sm_email")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Reseller</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("reseller", order.reseller, "team_reseller")}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <div>
                        <Table className="border">
                            <TableHeader>
                                <TableRow>
                                    <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} colSpan={2}>
                                        Shipping Details
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Company Name</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("company_name", order.company_name, "shipping_company")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Contact Name</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("contact_name", order.contact_name, "shipping_contact")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Email Address</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("email", order.email, "shipping_email")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Shipping Address</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("address", order.address, "shipping_address")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">City</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("city", order.city, "shipping_city")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">State</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("state", order.state, "shipping_state")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Zip</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("zip", order.zip, "shipping_zip")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Desired Demo Delivery Date</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("desired_date", order.desired_date, "shipping_date")}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    <div>
                        <Table className="border">
                            <TableHeader>
                                <TableRow>
                                    <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} colSpan={2}>
                                        Opportunity Details
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Device Opportunity Size (Units)</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("dev_opportunity", order.dev_opportunity, "opp_units")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Budget Per Device ($)</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("dev_budget", order.dev_budget, "opp_budget")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Revenue Opportunity Size ($ Device Rev)</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {order.rev_opportunity ? `$${order.rev_opportunity}` : "-"}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">CRM Account #</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("crm_account", order.crm_account, "opp_crm")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Vertical</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("vertical", order.vertical, "opp_vertical")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Segment</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("segment", order.segment, "opp_segment")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Use Case for this Demo Request</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("use_case", order.use_case, "opp_usecase")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">What are you currently running on your devices?</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("currently_running", order.currently_running, "device_running")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">How many licenses do you have?</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("licenses", order.licenses, "device_licenses")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Are you currently using Copilot?</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("isCopilot", order.isCopilot, "device_copilot")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">Is security a factor for you?</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("isSecurity", order.isSecurity, "device_security")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="w-[65%] font-semibold">How do you currently protect your devices?</TableCell>
                                    <TableCell className="w-[35%] border-l">
                                        {renderEditableCell("current_protection", order.current_protection, "device_protection")}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={2}>
                                        {renderNotesCell()}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Right column - 30% */}
                <div className="lg:w-[30%] space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Shipping Details</h2>
                        <Table className="border">
                            <TableHeader>
                                <TableRow>
                                    <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} colSpan={2}>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell colSpan={2}>
                                        {renderStatusDropdown("order_status", order.order_status, "status")}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    {renderTrackingSection()}
                </div>
            </div>
        </div>
    )
}