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
import { CheckCircle, ChevronDown, ExternalLink, Pencil, XCircle } from "lucide-react"
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
import { emailTemplates, sendEmail } from "@/lib/email"
import { logActivity, logError, logSuccess, logInfo, logWarning } from "@/lib/logger";
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ApprovedEmail, ReturnedEmail, ShippedEmail } from "@/lib/emailconst"

export type Product = {
    id: string;
    product_name: string;
    sku: string;
    thumbnail: string;
    stock_quantity: string;
    withCustomer: string;
    processor?: string | null;
    form_factor?: string | null;
    slug?: string | null;
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
    quantity: number | null
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
    product_ids_array?: string[]
    quantities_array?: number[]
    products_array?: Product[]
    approved_user?: {
        id: string
        email: string
        firstName?: string
        lastName?: string
    }
    rejected_user?: {
        id: string
        email: string
        firstName?: string
        lastName?: string
    }
    order_by_user?: {
        id: string
        email: string
        firstName?: string
        lastName?: string
    }
    wins?: {
        id: string;
        order_id: string;
        created_at: string;
    }[];
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
    const [pendingStatusChange, setPendingStatusChange] = useState<{ field: string, value: string, rowId: string } | null>(null);
    const [trackingData, setTrackingData] = useState({
        tracking: "",
        return_tracking: "",
        tracking_link: "",
        return_tracking_link: "",
        username: "",
        case_type: "",
        password: ""
    });

    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [returnedProducts, setReturnedProducts] = useState<{
        productId: string;
        productName: string;
        shippedQuantity: number;
        returnedQuantity: number;
        isDamaged: boolean;
    }[]>([]);

    // Role constants from environment variables
    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const ssRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const sRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

    const allowedRoles = [smRole, adminRole, sRole, ssRole].filter(Boolean);

    // Permission levels
    const isAdmin = profile?.role === adminRole;
    const isSSRole = profile?.role === ssRole;
    const isSMRole = profile?.role === smRole;
    const isSubscriber = profile?.role === sRole;

    // Action permissions
    const canApproveReject = isAdmin || isSSRole;
    const canEditAll = isAdmin;
    const canEditSMFields = isSMRole;
    const canEditProduct = isAdmin || isSMRole;
    const canEditStatus = isAdmin || isSMRole;
    const canEditTracking = isAdmin || isSMRole;
    const canUploadReturnLabel = isAdmin || isSMRole;
    const canViewOnly = isSubscriber;

    // Check if current user is authorized
    const isAuthorized = profile?.role && allowedRoles.includes(profile.role);

    // Order status options from environment variables
    const statusOptions = [
        { value: `${process.env.NEXT_PUBLIC_STATUS_AWAITING}`, label: "Awaiting Approval" },
        { value: `${process.env.NEXT_PUBLIC_STATUS_PROCESSING}`, label: "Processing" },
        { value: `${process.env.NEXT_PUBLIC_STATUS_SHIPPED}`, label: "Shipped" },
        { value: `${process.env.NEXT_PUBLIC_STATUS_EXTENSION}`, label: "Shipped (Order Extension)" },
        { value: `${process.env.NEXT_PUBLIC_IN_TRANSIT}`, label: "Return In transit" },
        { value: `${process.env.NEXT_PUBLIC_FEDEX_DELIVERED}`, label: "Delivered to warehouse" },
        { value: `${process.env.NEXT_PUBLIC_STATUS_RETURNED}`, label: "Returned" },
        { value: `${process.env.NEXT_PUBLIC_STATUS_REJECTED}`, label: "Rejected" }
    ];

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            router.replace(`/login/?redirect_to=order-details/${orderHash}`);
            return;
        }

        if (!isAuthorized) {
            router.replace('/product-category/alldevices');
            return;
        }
    }, [loading, isLoggedIn, profile, router, isAuthorized, orderHash]);

    // Helper function to handle status change to Returned
    const handleStatusChangeToReturned = (field: string, value: string, rowId: string = "order") => {
        console.log('handleStatusChangeToReturned called:', { field, value, rowId });

        if (field !== "order_status" || value !== process.env.NEXT_PUBLIC_STATUS_RETURNED) {
            console.log('Not a return status change');
            return;
        }

        if (!order || !canEditStatus) {
            console.log('No order or not authorized:', { hasOrder: !!order, canEditStatus });
            return;
        }

        // Check if order has shipped products
        if (!order.shipped_date || !order.products) {
            console.log('Order not shipped or no products:', {
                hasShippedDate: !!order.shipped_date,
                hasProducts: !!order.products
            });
            toast.error("Order is not shipped or has no products");
            return;
        }

        // Prepare returned products data (single product now)
        const productsData = [{
            productId: order.products.id,
            productName: order.products.product_name,
            shippedQuantity: order.quantity || 0,
            returnedQuantity: order.quantity || 0,
            isDamaged: false
        }];

        console.log('Setting returned products:', productsData);
        setReturnedProducts(productsData);

        const pendingChange = {
            field: field,
            value: value,
            rowId: rowId
        };
        console.log('Setting pending status change:', pendingChange);
        setPendingStatusChange(pendingChange);

        console.log('Opening return modal');
        setIsReturnModalOpen(true);
    };

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

    const fetchOrders = async () => {
        const startTime = Date.now();

        await logActivity({
            type: 'order',
            level: 'info',
            action: 'order_details_fetch_attempt',
            message: `Attempting to fetch order details for ${orderHash}`,
            userId: profile?.id || null,
            details: {
                orderHash,
                userRole: profile?.role
            }
        });

        try {
            setIsLoading(true);
            setError(null);

            console.log('🔍 Fetching order details...');

            let query = supabase
                .from('orders')
                .select(`
                *,
                approved_user:users!orders_approved_by_fkey(id, email, firstName, lastName),
                rejected_user:users!orders_rejected_by_fkey(id, email, firstName, lastName),
                order_by_user:users!orders_order_by_fkey(id, email, firstName, lastName),
                wins:wins(*),
                products:product_id (*)
            `)
                .eq('order_no', orderHash);

            const { data, error: supabaseError } = await query;

            if (supabaseError) {
                console.error('Supabase error:', supabaseError);
                throw supabaseError;
            }

            if (data && data.length > 0) {
                console.log("📦 Fetched raw data:", data[0]);

                if (sRole === profile?.role && data[0].order_by !== profile?.id) {
                    console.warn('⚠️ Unauthorized access attempt');
                    router.back();
                    return;
                }

                const processedOrder: Order = {
                    ...data[0],
                    product_id: data[0].product_id,
                    quantity: data[0].quantity,
                    product_ids_array: [data[0].product_id],
                    quantities_array: [data[0].quantity],
                    products_array: data[0].products ? [data[0].products] : [],
                    approved_user: data[0].approved_user ? {
                        id: data[0].approved_user.id,
                        email: data[0].approved_user.email,
                        firstName: data[0].approved_user.firstName,
                        lastName: data[0].approved_user.lastName
                    } : undefined,
                    rejected_user: data[0].rejected_user ? {
                        id: data[0].rejected_user.id,
                        email: data[0].rejected_user.email,
                        firstName: data[0].rejected_user.firstName,
                        lastName: data[0].rejected_user.lastName
                    } : undefined,
                    order_by_user: data[0].order_by_user ? {
                        id: data[0].order_by_user.id,
                        email: data[0].order_by_user.email,
                        firstName: data[0].order_by_user.firstName,
                        lastName: data[0].order_by_user.lastName
                    } : undefined
                };

                console.log("✅ Processed order:", processedOrder);
                setOrders([processedOrder]);

                setTrackingData({
                    tracking: processedOrder.tracking || "",
                    return_tracking: processedOrder.return_tracking || "",
                    tracking_link: processedOrder.tracking_link || "",
                    return_tracking_link: processedOrder.return_tracking_link || "",
                    username: processedOrder.username || "",
                    case_type: processedOrder.case_type || "",
                    password: processedOrder.password || ""
                });

                await logActivity({
                    type: 'order',
                    level: 'success',
                    action: 'order_details_fetch_success',
                    message: `Successfully fetched order details for ${orderHash}`,
                    userId: profile?.id || null,
                    orderId: data[0]?.id,
                    details: {
                        orderHash,
                        orderNumber: data[0]?.order_no,
                        orderStatus: data[0]?.order_status,
                        executionTimeMs: Date.now() - startTime,
                        userRole: profile?.role
                    },
                    status: 'completed'
                });
            }

        } catch (err: unknown) {
            console.error('❌ Error in fetchOrders:', err);
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch orders');
            } else {
                setError('Failed to fetch orders');
            }
        } finally {
            setIsLoading(false);
            console.log('🏁 fetchOrders completed');
        }
    };

    // Fetch data when authorized
    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
            fetchOrders();
            fetchAllProducts();
        }
    }, [loading, isLoggedIn, profile, isAuthorized]);

    const renderAllProducts = () => {
        if (!order.products) {
            return (
                <TableRow>
                    <TableCell colSpan={2} className="text-center">
                        <span className="text-gray-500">No product found</span>
                    </TableCell>
                </TableRow>
            );
        }

        const isEditing = editingField === "product_id" && editingRowId === "product";

        return (
            <>
                <TableRow>
                    <TableCell className="w-[85%]">
                        {isEditing ? (
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
                                    disabled={!(isAdmin || isSMRole)}
                                >
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="cursor-pointer"
                                    disabled={!(isAdmin || isSMRole)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    {order.products?.slug ? (
                                        <Link
                                            href={`/product/${order.products.slug}`}
                                            target="_blank"
                                            className="text-blue-600 hover:underline cursor-pointer"
                                        >
                                            {order.products?.product_name}
                                        </Link>
                                    ) : (
                                        <span>{order.products?.product_name}</span>
                                    )}
                                    {order.products?.sku && (
                                        <span className="text-xs text-gray-500">(SKU: {order.products.sku})</span>
                                    )}
                                </div>
                                {(isAdmin || isSMRole) && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 cursor-pointer"
                                        onClick={() => {
                                            console.log('Product edit clicked');
                                            setEditingField("product_id");
                                            setEditedValue(order.product_id || "");
                                            setEditingRowId("product");
                                        }}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </TableCell>
                    <TableCell className="w-[15%] border-l text-center">
                        {order.quantity || 0}
                    </TableCell>
                </TableRow>
            </>
        );
    };

    // Handle returned quantity change
    const handleReturnedQuantityChange = (index: number, value: number) => {
        setReturnedProducts(prev => prev.map((product, i) => {
            if (i === index) {
                const maxAllowed = product.shippedQuantity;
                const newQuantity = Math.min(Math.max(0, value), maxAllowed);
                return { ...product, returnedQuantity: newQuantity };
            }
            return product;
        }));
    };

    interface ReturnApiResponse {
        success: boolean;
        message: string;
        orderId: string;
        error?: string;
        details?: string;
    }

    const handleReturnSubmit = async () => {
        console.log('handleReturnSubmit called');

        if (!order || !canEditStatus) {
            console.log('Condition failed');
            toast.error("Not authorized or no order");
            return;
        }

        const startTime = Date.now();

        await logActivity({
            type: 'order',
            level: 'info',
            action: 'order_return_submission_attempt',
            message: `Attempting to process return for order ${order.order_no}`,
            userId: profile?.id || null,
            orderId: order.id,
            details: {
                orderNumber: order.order_no,
                returnedProducts: returnedProducts.length,
                selectedProducts: returnedProducts.filter(p => p.returnedQuantity > 0).length,
                userRole: profile?.role
            }
        });

        try {
            toast.loading("Processing return...");

            const currentDate = new Date().toISOString().split('T')[0];

            for (const returnedProduct of returnedProducts) {
                if (returnedProduct.returnedQuantity > 0) {
                    const product = order.products;

                    if (product && product.id === returnedProduct.productId) {
                        const currentStock = parseInt(product.stock_quantity) || 0;
                        const currentWithCustomer = parseInt(product.withCustomer) || 0;

                        const newStock = currentStock + returnedProduct.returnedQuantity;
                        const newWithCustomer = Math.max(0, currentWithCustomer - returnedProduct.shippedQuantity);

                        console.log(`Updating product ${product.product_name}:`, {
                            productId: returnedProduct.productId,
                            currentStock,
                            currentWithCustomer,
                            shippedQuantity: returnedProduct.shippedQuantity,
                            returnedQuantity: returnedProduct.returnedQuantity,
                            newStock,
                            newWithCustomer
                        });

                        const { error: productError } = await supabase
                            .from('products')
                            .update({
                                stock_quantity: newStock.toString(),
                                withCustomer: newWithCustomer.toString()
                            })
                            .eq('id', returnedProduct.productId);

                        if (productError) {
                            throw new Error(`Failed to update product ${product.product_name}: ${productError.message}`);
                        }

                        console.log(`✅ Product ${product.product_name} updated successfully`);
                    } else {
                        console.warn(`Product ${returnedProduct.productId} not found in order`);
                    }
                }
            }

            const returnStatus = process.env.NEXT_PUBLIC_STATUS_RETURNED || "Returned";

            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    order_status: returnStatus,
                    returned_date: currentDate
                })
                .eq('id', order.id);

            if (orderError) {
                throw new Error(`Failed to update order: ${orderError.message}`);
            }

            console.log('✅ Order status updated to Returned');

            if (order.order_by_user?.email) {
                try {
                    await sendReturnedOrderEmail({
                        ...order,
                        order_status: returnStatus,
                        returned_date: currentDate
                    }, returnedProducts);
                    console.log('✅ Return email sent');
                } catch (emailError) {
                    console.error('Email sending failed:', emailError);
                }
            }

            toast.dismiss();
            toast.success("Return processed successfully!");

            setIsReturnModalOpen(false);
            setReturnedProducts([]);
            setPendingStatusChange(null);
            setEditingField(null);
            setEditingRowId(null);
            setEditedValue("");

            await logActivity({
                type: 'order',
                level: 'success',
                action: 'order_return_success',
                message: `Successfully processed return for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    returnedProducts: returnedProducts.length,
                    totalReturned: returnedProducts.reduce((sum, p) => sum + p.returnedQuantity, 0),
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'completed'
            });

            console.log('✅ Refreshing data immediately...');
            await fetchOrders();
            await fetchAllProducts();

        } catch (err: any) {
            console.error('Error in handleReturnSubmit:', err);
            console.error('Error stack:', err.stack);

            toast.dismiss();
            toast.error(err.message || "Failed to process return");

            await logActivity({
                type: 'order',
                level: 'error',
                action: 'order_return_error',
                message: `Failed to process return for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    error: err.message || err,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'failed'
            });
        }
    };

    // Helper function to format action_date with dd-MMM-yyyy format
    const formatActionDate = (dateTimeString: string | null) => {
        if (!dateTimeString) return "-";

        try {
            const date = new Date(dateTimeString);
            if (isNaN(date.getTime())) return "-";

            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();

            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;

            return `${day}-${month}-${year} (${hours}:${minutes} ${ampm})`;
        } catch (error) {
            console.error('Error formatting action_date:', error);
            return dateTimeString;
        }
    };

    const renderReturnModal = () => {
        return (
            <Dialog
                open={isReturnModalOpen}
                onOpenChange={(open) => {
                    console.log('Modal open state changed:', open);

                    if (!open) {
                        console.log('Closing modal by user action');

                        const hasSelectedProducts = returnedProducts.some(p => p.returnedQuantity > 0);
                        if (hasSelectedProducts) {
                            const confirmed = window.confirm(
                                "You have selected products to return. Are you sure you want to cancel?"
                            );
                            if (!confirmed) {
                                return;
                            }
                        }

                        setIsReturnModalOpen(false);
                        setReturnedProducts([]);
                    }
                }}
            >
                <DialogContent className="sm:max-w-300 max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle>Process Return for Order #{order?.order_no}</DialogTitle>
                        <p className="text-sm text-gray-600 mt-1">
                            Specify quantity to return to inventory
                        </p>
                    </DialogHeader>

                    <div className="space-y-4 py-4 overflow-x-hidden">
                        <div className="overflow-x-auto">
                            <Table className="td-table w-full min-w-162.5">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-25 td-th">Shipped</TableHead>
                                        <TableHead className="w-37.5 td-th">Return to Stock</TableHead>
                                        <TableHead className=" td-th">Product</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {returnedProducts.map((product, index) => (
                                        <TableRow key={product.productId} className="hover:bg-gray-50">
                                            <TableCell className="font-medium text-center td-td">
                                                {product.shippedQuantity}
                                            </TableCell>
                                            <TableCell className="td-td">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={product.shippedQuantity}
                                                        value={product.returnedQuantity}
                                                        onChange={(e) => {
                                                            const value = parseInt(e.target.value) || 0;
                                                            const maxAllowed = product.shippedQuantity;
                                                            const newQuantity = Math.min(Math.max(0, value), maxAllowed);

                                                            setReturnedProducts(prev => prev.map((p, i) => {
                                                                if (i === index) {
                                                                    return {
                                                                        ...p,
                                                                        returnedQuantity: newQuantity,
                                                                        isDamaged: newQuantity === 0
                                                                    };
                                                                }
                                                                return p;
                                                            }));
                                                        }}
                                                        className="w-24 text-center"
                                                    />
                                                    <span className="text-sm text-gray-500">
                                                        / {product.shippedQuantity}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium td-td">
                                                {product.productName}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="bg-gray-50 p-4 rounded">
                            <h4 className="font-semibold mb-3 text-lg">Return Summary</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                <div className="bg-white p-3 rounded border">
                                    <span className="text-gray-600">Total Products:</span>
                                    <span className="font-medium ml-2 text-lg">{returnedProducts.length}</span>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <span className="text-gray-600">Total Shipped:</span>
                                    <span className="font-medium ml-2 text-lg">
                                        {returnedProducts.reduce((sum, p) => sum + p.shippedQuantity, 0)}
                                    </span>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <span className="text-gray-600">Returning to Stock:</span>
                                    <span className="font-medium ml-2 text-lg text-green-600">
                                        {returnedProducts.reduce((sum, p) => sum + p.returnedQuantity, 0)}
                                    </span>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <span className="text-gray-600">Remaining with Customer:</span>
                                    <span className="font-medium ml-2 text-lg text-orange-600">
                                        {returnedProducts.reduce((sum, p) => sum + (p.shippedQuantity - p.returnedQuantity), 0)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setReturnedProducts(prev => prev.map(p => ({
                                            ...p,
                                            returnedQuantity: p.shippedQuantity,
                                            isDamaged: false
                                        })));
                                    }}
                                    className="text-xs"
                                >
                                    Return All
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setReturnedProducts(prev => prev.map(p => ({
                                            ...p,
                                            returnedQuantity: 0,
                                            isDamaged: true
                                        })));
                                    }}
                                    className="text-xs"
                                >
                                    Return None
                                </Button>
                            </div>

                            {returnedProducts.some(p => p.returnedQuantity === 0) && (
                                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                                    <div className="flex items-start">
                                        <span className="text-amber-600 mr-2">⚠️</span>
                                        <div>
                                            <strong className="text-amber-700">Note:</strong>
                                            <p className="text-amber-600 text-sm mt-1">
                                                Products with quantity 0 will not be added back to stock inventory.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={() => {
                                console.log('Cancel button clicked - explicit cancel');
                                setIsReturnModalOpen(false);
                                setReturnedProducts([]);
                                toast.info("Return process cancelled");
                            }}
                            className="cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                console.log('=== CONFIRM RETURN CLICKED ===');
                                console.log('Current state:', {
                                    order: order?.id,
                                    canEditStatus,
                                    returnedProductsCount: returnedProducts.length,
                                    returnedProducts
                                });

                                if (!order) {
                                    console.error('❌ No order');
                                    toast.error("No order data");
                                    return;
                                }

                                if (!canEditStatus) {
                                    console.error('❌ Not authorized');
                                    toast.error("You are not authorized");
                                    return;
                                }

                                console.log('✅ All conditions passed, calling handleReturnSubmit');
                                handleReturnSubmit();
                            }}
                            className="bg-teal-600 hover:bg-teal-700 cursor-pointer"
                            disabled={!order || !canEditStatus}
                        >
                            Confirm Return
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    const handleApprove = async () => {
        if (!order || !canApproveReject) return;

        const startTime = Date.now();

        await logActivity({
            type: 'order',
            level: 'info',
            action: 'order_approve_attempt',
            message: `Attempting to approve order ${order.order_no}`,
            userId: profile?.id || null,
            orderId: order.id,
            details: {
                orderNumber: order.order_no,
                companyName: order.company_name,
                currentStatus: order.order_status,
                userRole: profile?.role,
                approvedBy: profile?.email
            }
        });

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    order_status: `${process.env.NEXT_PUBLIC_STATUS_PROCESSING}`,
                    approved_by: profile?.id,
                    action_date: `${new Date().toISOString().split('T')[0]}`
                })
                .eq('id', order.id);

            if (error) {
                await logActivity({
                    type: 'order',
                    level: 'error',
                    action: 'order_approve_failed',
                    message: `Failed to approve order ${order.order_no}: ${error.message}`,
                    userId: profile?.id || null,
                    orderId: order.id,
                    details: {
                        orderNumber: order.order_no,
                        error: error,
                        executionTimeMs: Date.now() - startTime,
                        userRole: profile?.role
                    },
                    status: 'failed'
                });
                throw error;
            }

            await logActivity({
                type: 'order',
                level: 'success',
                action: 'order_approve_success',
                message: `Successfully approved order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    companyName: order.company_name,
                    previousStatus: order.order_status,
                    newStatus: `${process.env.NEXT_PUBLIC_STATUS_PROCESSING}`,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role,
                    approvedBy: profile?.email
                },
                status: 'completed'
            });

            await fetchOrders();
            sendApprovedOrderEmail(order);

            await logActivity({
                type: 'email',
                level: 'info',
                action: 'approved_order_email_sent',
                message: `Approved order email sent for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    recipient: order.order_by_user?.email,
                    emailType: 'approved_order'
                },
                status: 'sent'
            });

        } catch (err) {
            await logActivity({
                type: 'order',
                level: 'error',
                action: 'order_approve_error',
                message: `Failed to approve order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    error: err,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'failed'
            });
        }
    };

    // Helper functions for date calculations
    const calculateDaysShipped = (shippedDate: string | null): number => {
        if (!shippedDate) return 0;

        const shipped = new Date(shippedDate);
        const today = new Date();

        const diffTime = Math.abs(today.getTime() - shipped.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };

    const calculateEstimatedReturnDate = (shippedDate: string | null): Date | null => {
        if (!shippedDate) return null;

        const shipped = new Date(shippedDate);
        const estimatedReturn = new Date(shipped);
        estimatedReturn.setDate(shipped.getDate() + 45);

        return estimatedReturn;
    };

    const formatEstimatedReturnDate = (shippedDate: string | null): string => {
        const date = calculateEstimatedReturnDate(shippedDate);
        if (!date) return "-";

        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const hasReturnDatePassed = (shippedDate: string | null): boolean => {
        if (!shippedDate) return false;

        const estimatedReturnDate = calculateEstimatedReturnDate(shippedDate);
        if (!estimatedReturnDate) return false;

        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const returnDateMidnight = new Date(
            estimatedReturnDate.getFullYear(),
            estimatedReturnDate.getMonth(),
            estimatedReturnDate.getDate()
        );

        return returnDateMidnight < todayMidnight;
    };

    const formatDateToCustomFormat = (dateString: string | null) => {
        if (!dateString) return "-";

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "-";

            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();

            return `${day}-${month}-${year}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    };

    const calculateDaysOverdue = (shippedDate: string | null): number => {
        if (!shippedDate) return 0;

        const daysShipped = calculateDaysShipped(shippedDate);
        return Math.max(0, daysShipped - 45);
    };

    const handleReject = async () => {
        if (!order || !canApproveReject) return;

        const startTime = Date.now();

        await logActivity({
            type: 'order',
            level: 'info',
            action: 'order_reject_attempt',
            message: `Attempting to reject order ${order.order_no}`,
            userId: profile?.id || null,
            orderId: order.id,
            details: {
                orderNumber: order.order_no,
                companyName: order.company_name,
                currentStatus: order.order_status,
                userRole: profile?.role,
                rejectedBy: profile?.email
            }
        });

        try {
            const currentDate = new Date().toISOString().split('T')[0];

            const allowedPreviousStatuses = [
                process.env.NEXT_PUBLIC_STATUS_AWAITING,
                process.env.NEXT_PUBLIC_STATUS_PROCESSING,
                process.env.NEXT_PUBLIC_STATUS_SHIPPED,
                process.env.NEXT_PUBLIC_STATUS_EXTENSION,
                process.env.NEXT_PUBLIC_IN_TRANSIT,
                process.env.NEXT_PUBLIC_FEDEX_DELIVERED
            ].filter(Boolean);

            if (allowedPreviousStatuses.includes(order.order_status) && order.products && order.quantity) {
                const orderQuantity = order.quantity || 0;

                if (orderQuantity > 0) {
                    const currentStockQty = parseInt(order.products.stock_quantity) || 0;
                    const currentWithCustomerQty = parseInt(order.products.withCustomer) || 0;

                    const newStockQty = currentStockQty + orderQuantity;
                    const newWithCustomerQty = currentWithCustomerQty - orderQuantity;

                    const finalStockQty = Math.max(0, newStockQty).toString();
                    const finalWithCustomerQty = Math.max(0, newWithCustomerQty).toString();

                    const { error: productUpdateError } = await supabase
                        .from('products')
                        .update({
                            stock_quantity: finalStockQty,
                            withCustomer: finalWithCustomerQty
                        })
                        .eq('id', order.product_id);

                    if (productUpdateError) {
                        await logActivity({
                            type: 'product',
                            level: 'error',
                            action: 'product_quantity_update_failed_on_reject',
                            message: `Failed to update product quantities when rejecting order ${order.order_no}`,
                            userId: profile?.id || null,
                            orderId: order.id,
                            productId: order.product_id,
                            details: {
                                orderNumber: order.order_no,
                                productId: order.product_id,
                                quantity: orderQuantity,
                                error: productUpdateError
                            },
                            status: 'failed'
                        });
                    } else {
                        await logActivity({
                            type: 'product',
                            level: 'info',
                            action: 'product_quantity_updated_on_reject',
                            message: `Updated product quantities when rejecting order ${order.order_no}`,
                            userId: profile?.id || null,
                            orderId: order.id,
                            productId: order.product_id,
                            details: {
                                orderNumber: order.order_no,
                                productId: order.product_id,
                                quantity: orderQuantity,
                                oldStock: currentStockQty,
                                newStock: finalStockQty,
                                oldWithCustomer: currentWithCustomerQty,
                                newWithCustomer: finalWithCustomerQty
                            },
                            status: 'completed'
                        });
                    }
                }
            }

            const updateData: any = {
                order_status: `${process.env.NEXT_PUBLIC_STATUS_REJECTED}`,
                rejected_by: profile?.id,
                action_date: currentDate,
                shipped_date: null,
                returned_date: null
            };

            const { error } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', order.id);

            if (error) {
                await logActivity({
                    type: 'order',
                    level: 'error',
                    action: 'order_reject_failed',
                    message: `Failed to reject order ${order.order_no}: ${error.message}`,
                    userId: profile?.id || null,
                    orderId: order.id,
                    details: {
                        orderNumber: order.order_no,
                        error: error,
                        executionTimeMs: Date.now() - startTime,
                        userRole: profile?.role
                    },
                    status: 'failed'
                });
                throw error;
            }

            // FIX: Use undefined instead of null for rejected_user
            setOrders(prev => prev.map(o =>
                o.id === order.id ? {
                    ...o,
                    order_status: `${process.env.NEXT_PUBLIC_STATUS_REJECTED}`,
                    rejected_by: profile?.id || null,
                    rejectedBy: profile?.id || null,
                    action_date: currentDate,
                    shipped_date: null,
                    returned_date: null,
                    // Change null to undefined to match the Order type
                    rejected_user: profile ? {
                        id: profile.id,
                        email: profile.email,
                        firstName: profile.firstName || '',
                        lastName: profile.lastName || ''
                    } : undefined // Changed from null to undefined
                } : o
            ));

            await logActivity({
                type: 'order',
                level: 'success',
                action: 'order_reject_success',
                message: `Successfully rejected order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    companyName: order.company_name,
                    previousStatus: order.order_status,
                    newStatus: `${process.env.NEXT_PUBLIC_STATUS_REJECTED}`,
                    quantityReturned: order.quantity,
                    productId: order.product_id,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role,
                    rejectedBy: profile?.email
                },
                status: 'completed'
            });

            sendRejectedOrderEmail({ ...order, ...updateData });

            await logActivity({
                type: 'email',
                level: 'info',
                action: 'rejected_order_email_sent',
                message: `Rejected order email sent for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    recipient: order.order_by_user?.email,
                    emailType: 'rejected_order'
                },
                status: 'sent'
            });

            toast.success("Order rejected successfully!");

        } catch (err) {
            await logActivity({
                type: 'order',
                level: 'error',
                action: 'order_reject_error',
                message: `Failed to reject order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    error: err,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'failed'
            });
            toast.error("Failed to reject order");
        }
    };

    const handleEditClick = (field: string, value: string, rowId: string) => {
        // Check if user can edit this specific field based on their role
        let canEdit = false;

        // Admin can edit everything
        if (isAdmin) {
            canEdit = true;
        }
        // SM Role can edit specific fields
        else if (isSMRole) {
            // Fields that SM Role can edit
            const smEditableFields = [
                "order_status",
                "tracking",
                "return_tracking",
                "tracking_link",
                "return_tracking_link",
                "username",
                "case_type",
                "password",
                "product_id"
            ];

            if (smEditableFields.includes(field)) {
                canEdit = true;
            }
        }

        if (!canEdit) {
            console.log('User cannot edit this field:', field);
            return;
        }

        console.log('Setting editing field:', field, 'with value:', value);
        setEditingField(field);
        setEditedValue(value || "");
        setEditingRowId(rowId);
    };

    const handleSaveEdit = async (field: string) => {
        if (!order || editingField !== field) return;

        // Check if user can edit this specific field
        let canEdit = false;

        // Admin can edit everything
        if (isAdmin) {
            canEdit = true;
        }
        // SM Role can edit specific fields
        else if (isSMRole) {
            const smEditableFields = [
                "order_status",
                "tracking",
                "return_tracking",
                "tracking_link",
                "return_tracking_link",
                "username",
                "case_type",
                "password",
                "product_id"
            ];

            if (smEditableFields.includes(field)) {
                canEdit = true;
            }
        }

        if (!canEdit) return;

        const startTime = Date.now();
        const oldValue = order[field as keyof Order];

        await logActivity({
            type: 'order',
            level: 'info',
            action: 'order_field_edit_attempt',
            message: `Attempting to edit ${field} for order ${order.order_no}`,
            userId: profile?.id || null,
            orderId: order.id,
            details: {
                orderNumber: order.order_no,
                field,
                oldValue: oldValue,
                newValue: editedValue,
                userRole: profile?.role
            }
        });


        try {
            const updateData: any = { [field]: editedValue };

            if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_REJECTED) {
                console.log('Rejecting order via dropdown...');
                await handleReject();
                setEditingField(null);
                setEditingRowId(null);
                setEditedValue("");
                return;
            }

            if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {
                await handleApprove();
                setEditingField(null);
                setEditingRowId(null);
                setEditedValue("");
                return;
            }

            if (field === "dev_opportunity" || field === "dev_budget") {
                const devOpportunity = field === "dev_opportunity" ? parseInt(editedValue) : order.dev_opportunity;
                const devBudget = field === "dev_budget" ? parseFloat(editedValue) : order.dev_budget;

                if (devOpportunity && devBudget) {
                    updateData.rev_opportunity = devOpportunity * devBudget;
                    await logActivity({
                        type: 'order',
                        level: 'info',
                        action: 'order_revenue_calculated',
                        message: `Calculated revenue for order ${order.order_no}`,
                        userId: profile?.id || null,
                        orderId: order.id,
                        details: {
                            orderNumber: order.order_no,
                            field,
                            devOpportunity,
                            devBudget,
                            revenue: devOpportunity * devBudget
                        },
                        status: 'completed'
                    });
                }
            }

            if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED) {
                if (!order.tracking || !order.tracking_link || !order.return_tracking || !order.return_tracking_link) {
                    await logActivity({
                        type: 'validation',
                        level: 'warning',
                        action: 'order_shipped_missing_tracking',
                        message: `Cannot mark order ${order.order_no} as shipped - missing tracking details`,
                        userId: profile?.id || null,
                        orderId: order.id,
                        details: {
                            orderNumber: order.order_no,
                            missingFields: {
                                tracking: !order.tracking,
                                tracking_link: !order.tracking_link,
                                return_tracking: !order.return_tracking,
                                return_tracking_link: !order.return_tracking_link
                            }
                        },
                        status: 'pending'
                    });

                    toast.error("Please fill Tracking & Return Tracking details before marking as Shipped", {
                        duration: 5000,
                    });

                    setIsModalOpen(true);
                    setPendingStatusChange({
                        field: field,
                        value: editedValue,
                        rowId: editingRowId || "order"
                    });

                    return;
                }
            }

            if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_RETURNED) {
                handleStatusChangeToReturned(field, editedValue);
                return;
            }

            if (field === "order_status") {
                const currentDate = new Date().toISOString().split('T')[0];

                if (editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED ||
                    editedValue === process.env.NEXT_PUBLIC_STATUS_EXTENSION) {
                    updateData.shipped_date = currentDate;
                    updateData.returned_date = null;
                }

                if (editedValue === process.env.NEXT_PUBLIC_STATUS_REJECTED ||
                    editedValue === process.env.NEXT_PUBLIC_STATUS_AWAITING ||
                    editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {
                    updateData.shipped_date = null;
                    updateData.returned_date = null;
                }
            }

            setOrders(prev => {
                const updatedOrder = prev.map(o => {
                    if (o.id === order.id) {
                        const updated = { ...o, [field]: editedValue };

                        // Find this section in handleSaveEdit function
                        if (field === "order_status") {
                            const currentDate = new Date().toISOString().split('T')[0];

                            if (editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED ||
                                editedValue === process.env.NEXT_PUBLIC_STATUS_EXTENSION) {
                                updateData.shipped_date = currentDate;
                                updateData.returned_date = null;
                            }

                            if (editedValue === process.env.NEXT_PUBLIC_STATUS_REJECTED ||
                                editedValue === process.env.NEXT_PUBLIC_STATUS_AWAITING ||
                                editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {
                                updateData.shipped_date = null;
                                updateData.returned_date = null;
                            }
                        }

                        setOrders(prev => {
                            const updatedOrder = prev.map(o => {
                                if (o.id === order.id) {
                                    const updated = { ...o, [field]: editedValue };

                                    if (field === "order_status") {
                                        if (editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {
                                            // FIX: Convert undefined to null
                                            updated.approvedBy = profile?.id || null; // Changed from profile?.id
                                            updated.action_date = new Date().toISOString().split('T')[0];
                                            updated.rejectedBy = null;
                                        }

                                        if (editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED ||
                                            editedValue === process.env.NEXT_PUBLIC_STATUS_EXTENSION) {
                                            updated.shipped_date = new Date().toISOString().split('T')[0];
                                            updated.returned_date = null;
                                        } else if (editedValue === process.env.NEXT_PUBLIC_STATUS_RETURNED) {
                                            updated.returned_date = new Date().toISOString().split('T')[0];
                                            updated.shipped_date = null;
                                        } else if (editedValue === process.env.NEXT_PUBLIC_STATUS_REJECTED ||
                                            editedValue === process.env.NEXT_PUBLIC_STATUS_AWAITING ||
                                            editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {
                                            updated.shipped_date = null;
                                            updated.returned_date = null;
                                        }
                                    }

                                    if (field === "product_id") {
                                        updateData.product_id = editedValue;
                                    }

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

                        if (field === "product_id") {
                            updateData.product_id = editedValue;
                        }

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

            const { error } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', order.id);

            if (error) {
                setOrders(prev => prev.map(o =>
                    o.id === order.id ? { ...o, [field]: oldValue } : o
                ));

                await logActivity({
                    type: 'order',
                    level: 'error',
                    action: 'order_field_edit_failed',
                    message: `Failed to edit ${field} for order ${order.order_no}: ${error.message}`,
                    userId: profile?.id || null,
                    orderId: order.id,
                    details: {
                        orderNumber: order.order_no,
                        field,
                        error: error,
                        executionTimeMs: Date.now() - startTime,
                        userRole: profile?.role
                    },
                    status: 'failed'
                });
                throw error;
            }

            await logActivity({
                type: 'order',
                level: 'success',
                action: 'order_field_edit_success',
                message: `Successfully edited ${field} for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    field,
                    oldValue: oldValue,
                    newValue: editedValue,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'completed'
            });

            if (field === "order_status") {
                const updatedOrder = { ...order, ...updateData };

                if (editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {
                    sendApprovedOrderEmail(updatedOrder);
                } else if (editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED) {
                    sendShippedOrderEmail(updatedOrder);
                }
            }

            setEditingField(null);
            setEditingRowId(null);
            setEditedValue("");

            toast.success(`Data updated successfully!`);

        } catch (err) {
            await logActivity({
                type: 'order',
                level: 'error',
                action: 'order_field_edit_error',
                message: `Failed to edit ${field} for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    field,
                    error: err,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'failed'
            });

            toast.error(`Failed to update ${field}`);
        }
    };

    const handleCancelEdit = () => {
        if (pendingStatusChange) {
            setPendingStatusChange(null);
            toast.info("Status change cancelled");
        }
        setEditingField(null);
        setEditingRowId(null);
        setEditedValue("");
    };

    useEffect(() => {
        if (!isModalOpen && pendingStatusChange) {
            setPendingStatusChange(null);
            setEditingField(null);
            setEditingRowId(null);
            setEditedValue("");
        }
    }, [isModalOpen, pendingStatusChange]);

    const handleTrackingUpdate = async () => {
        if (!order || !canEditTracking) return;

        const startTime = Date.now();

        await logActivity({
            type: 'order',
            level: 'info',
            action: 'order_tracking_update_attempt',
            message: `Attempting to update tracking for order ${order.order_no}`,
            userId: profile?.id || null,
            orderId: order.id,
            details: {
                orderNumber: order.order_no,
                hasPendingStatus: !!pendingStatusChange,
                userRole: profile?.role
            }
        });

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

            if (error) {
                await logActivity({
                    type: 'order',
                    level: 'error',
                    action: 'order_tracking_update_failed',
                    message: `Failed to update tracking for order ${order.order_no}: ${error.message}`,
                    userId: profile?.id || null,
                    orderId: order.id,
                    details: {
                        orderNumber: order.order_no,
                        error: error,
                        executionTimeMs: Date.now() - startTime,
                        userRole: profile?.role
                    },
                    status: 'failed'
                });
                throw error;
            }

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

            await logActivity({
                type: 'order',
                level: 'success',
                action: 'order_tracking_update_success',
                message: `Successfully updated tracking for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    trackingUpdated: trackingData.tracking !== order.tracking,
                    returnTrackingUpdated: trackingData.return_tracking !== order.return_tracking,
                    hasPendingStatus: !!pendingStatusChange,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'completed'
            });

            if (pendingStatusChange && pendingStatusChange.field === "order_status") {
                setIsModalOpen(false);

                toast.success("Tracking details saved. Now updating status to Shipped...");

                const updatedOrderData = {
                    ...order,
                    tracking: trackingData.tracking,
                    return_tracking: trackingData.return_tracking,
                    tracking_link: trackingData.tracking_link,
                    return_tracking_link: trackingData.return_tracking_link,
                    username: trackingData.username,
                    case_type: trackingData.case_type,
                    password: trackingData.password,
                    order_status: pendingStatusChange.value,
                    shipped_date: new Date().toISOString().split('T')[0]
                };

                const { error: statusError } = await supabase
                    .from('orders')
                    .update({
                        order_status: pendingStatusChange.value,
                        shipped_date: new Date().toISOString().split('T')[0]
                    })
                    .eq('id', order.id);

                if (statusError) {
                    await logActivity({
                        type: 'order',
                        level: 'error',
                        action: 'order_status_update_failed',
                        message: `Failed to update status to Shipped for order ${order.order_no}: ${statusError.message}`,
                        userId: profile?.id || null,
                        orderId: order.id,
                        details: {
                            orderNumber: order.order_no,
                            error: statusError,
                            executionTimeMs: Date.now() - startTime,
                            userRole: profile?.role
                        },
                        status: 'failed'
                    });
                    throw statusError;
                }

                setOrders(prev => prev.map(o =>
                    o.id === order.id ? {
                        ...o,
                        ...updatedOrderData
                    } : o
                ));

                sendShippedOrderEmail(updatedOrderData);

                await logActivity({
                    type: 'email',
                    level: 'info',
                    action: 'shipped_order_email_sent',
                    message: `Shipped order email sent for order ${order.order_no}`,
                    userId: profile?.id || null,
                    orderId: order.id,
                    details: {
                        orderNumber: order.order_no,
                        recipient: order.order_by_user?.email,
                        emailType: 'shipped_order'
                    },
                    status: 'sent'
                });

                setEditingField(null);
                setEditingRowId(null);
                setEditedValue("");
                setPendingStatusChange(null);

                toast.success("Status updated to Shipped successfully!");
            } else {
                setIsModalOpen(false);
                toast.success("Tracking details updated successfully");
            }

        } catch (err) {
            await logActivity({
                type: 'order',
                level: 'error',
                action: 'order_tracking_update_error',
                message: `Failed to update tracking for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    error: err,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'failed'
            });
            toast.error("Failed to update tracking details");
        }
    };

    // Email sending functions
    const sendApprovedOrderEmail = async (orderData: Order) => {
        try {
            if (!orderData.order_by_user?.email || !orderData.products_array || orderData.products_array.length === 0) {
                return;
            }

            const productsForEmail = orderData.products_array.map((product, index) => ({
                name: product.product_name || `Product ${index + 1}`,
                quantity: orderData.quantities_array?.[index] || 0
            }));

            const totalQuantity = productsForEmail.reduce((sum, product) => sum + product.quantity, 0);

            const template = emailTemplates.approvedOrderEmail({
                orderNumber: orderData.order_no,
                orderDate: orderData.order_date,
                customerName: orderData.contact_name || "Customer",
                customerEmail: orderData.order_by_user?.email,
                products: productsForEmail,
                totalQuantity: totalQuantity,
                salesExecutive: orderData.sales_executive || "",
                salesExecutiveEmail: orderData.se_email || "",
                salesManager: orderData.sales_manager || "",
                salesManagerEmail: orderData.sm_email || "",
                reseller: orderData.reseller || "",
                companyName: orderData.company_name || "",
                contactName: orderData.contact_name || "",
                contactEmail: orderData.email || "",
                shippingAddress: orderData.address || "",
                city: orderData.city || "",
                state: orderData.state || "",
                zip: orderData.zip || "",
                deliveryDate: orderData.desired_date || "",
                deviceUnits: orderData.dev_opportunity || 0,
                budgetPerDevice: orderData.dev_budget || 0,
                revenue: orderData.rev_opportunity || 0,
                crmAccount: orderData.crm_account || "",
                vertical: orderData.vertical || "",
                segment: orderData.segment || "",
                useCase: orderData.use_case || "",
                currentDevices: orderData.currently_running || "",
                licenses: orderData.licenses || "",
                usingCopilot: orderData.isCopilot || "",
                securityFactor: orderData.isSecurity || "",
                deviceProtection: orderData.current_protection || "",
                note: orderData.notes || "",
            });

            const mergedEmails = [orderData.order_by_user?.email, ...ApprovedEmail];
            await sendEmail({
                to: mergedEmails,
                cc: "",
                subject: template.subject,
                text: template.text,
                html: template.html,
            });
        } catch (error) {
            console.error('Error sending approved order email:', error);
        }
    };

    const sendRejectedOrderEmail = async (orderData: Order) => {
        try {
            if (!orderData.order_by_user?.email || !orderData.products_array || orderData.products_array.length === 0) {
                return;
            }

            const productsForEmail = orderData.products_array.map((product, index) => ({
                name: product.product_name || `Product ${index + 1}`,
                quantity: orderData.quantities_array?.[index] || 0
            }));

            const totalQuantity = productsForEmail.reduce((sum, product) => sum + product.quantity, 0);

            const template = emailTemplates.rejectedOrderEmail({
                orderNumber: orderData.order_no,
                orderDate: orderData.order_date,
                customerName: orderData.contact_name || "Customer",
                customerEmail: orderData.order_by_user?.email,
                products: productsForEmail,
                totalQuantity: totalQuantity,
                salesExecutive: orderData.sales_executive || "",
                salesExecutiveEmail: orderData.se_email || "",
                salesManager: orderData.sales_manager || "",
                salesManagerEmail: orderData.sm_email || "",
                reseller: orderData.reseller || "",
                companyName: orderData.company_name || "",
                contactName: orderData.contact_name || "",
                contactEmail: orderData.email || "",
                shippingAddress: orderData.address || "",
                city: orderData.city || "",
                state: orderData.state || "",
                zip: orderData.zip || "",
                deliveryDate: orderData.desired_date || "",
                deviceUnits: orderData.dev_opportunity || 0,
                budgetPerDevice: orderData.dev_budget || 0,
                revenue: orderData.rev_opportunity || 0,
                crmAccount: orderData.crm_account || "",
                vertical: orderData.vertical || "",
                segment: orderData.segment || "",
                useCase: orderData.use_case || "",
                currentDevices: orderData.currently_running || "",
                licenses: orderData.licenses || "",
                usingCopilot: orderData.isCopilot || "",
                securityFactor: orderData.isSecurity || "",
                deviceProtection: orderData.current_protection || "",
                note: orderData.notes || "",
            });

            await sendEmail({
                to: orderData.order_by_user?.email,
                cc: "",
                subject: template.subject,
                text: template.text,
                html: template.html,
            });
        } catch (error) {
            console.error('Error sending rejected order email:', error);
        }
    };

    const sendReturnedOrderEmail = async (orderData: Order, returnedProductsData: typeof returnedProducts) => {
        try {
            if (!orderData.order_by_user?.email || !orderData.products_array || orderData.products_array.length === 0) {
                return;
            }

            const productsForEmail = orderData.products_array.map((product, index) => {
                const shippedQuantity = orderData.quantities_array?.[index] || 0;
                const returnedProduct = returnedProductsData.find(rp => rp.productId === product.id);
                const returnedQuantity = returnedProduct?.returnedQuantity || 0;
                const leftWithCustomer = shippedQuantity - returnedQuantity;

                return {
                    name: product.product_name || `Product ${index + 1}`,
                    shippedQuantity: shippedQuantity,
                    returnedQuantity: returnedQuantity,
                    leftWithCustomer: leftWithCustomer
                };
            });

            const totalShipped = productsForEmail.reduce((sum, product) => sum + product.shippedQuantity, 0);
            const totalReturned = productsForEmail.reduce((sum, product) => sum + product.returnedQuantity, 0);
            const totalLeft = totalShipped - totalReturned;

            const template = emailTemplates.returnedOrderEmail({
                orderNumber: orderData.order_no,
                orderDate: orderData.order_date,
                customerName: orderData.contact_name || "Customer",
                customerEmail: orderData.order_by_user?.email,
                products: productsForEmail,
                totalQuantity: totalShipped,
                totalReturned: totalReturned,
                totalLeft: totalLeft,
                salesExecutive: orderData.sales_executive || "",
                salesExecutiveEmail: orderData.se_email || "",
                salesManager: orderData.sales_manager || "",
                salesManagerEmail: orderData.sm_email || "",
                reseller: orderData.reseller || "",
                companyName: orderData.company_name || "",
                contactName: orderData.contact_name || "",
                contactEmail: orderData.email || "",
                shippingAddress: orderData.address || "",
                city: orderData.city || "",
                state: orderData.state || "",
                zip: orderData.zip || "",
                deliveryDate: orderData.desired_date || "",
                deviceUnits: orderData.dev_opportunity || 0,
                budgetPerDevice: orderData.dev_budget || 0,
                revenue: orderData.rev_opportunity || 0,
                crmAccount: orderData.crm_account || "",
                vertical: orderData.vertical || "",
                segment: orderData.segment || "",
                useCase: orderData.use_case || "",
                currentDevices: orderData.currently_running || "",
                licenses: orderData.licenses || "",
                usingCopilot: orderData.isCopilot || "",
                securityFactor: orderData.isSecurity || "",
                deviceProtection: orderData.current_protection || "",
                note: orderData.notes || "",
            });

            const mergedEmails = [orderData.order_by_user?.email, ...ReturnedEmail];

            await sendEmail({
                to: mergedEmails,
                cc: "",
                subject: template.subject,
                text: template.text,
                html: template.html,
            });
        } catch (error) {
            console.error('Error sending returned order email:', error);
        }
    };

    const sendShippedOrderEmail = async (orderData: Order) => {
        try {
            if (!orderData.order_by_user?.email || !orderData.products_array || orderData.products_array.length === 0) {
                return;
            }

            const productsForEmail = orderData.products_array.map((product, index) => ({
                name: product.product_name || `Product ${index + 1}`,
                quantity: orderData.quantities_array?.[index] || 0
            }));

            const totalQuantity = productsForEmail.reduce((sum, product) => sum + product.quantity, 0);

            const template = emailTemplates.shippedOrderEmail({
                orderNumber: orderData.order_no,
                orderDate: orderData.order_date,
                customerName: orderData.contact_name || "Customer",
                customerEmail: orderData.order_by_user?.email,
                orderTracking: orderData.tracking || "",
                orderTrackingLink: orderData.tracking_link || "",
                returnTracking: orderData.return_tracking || "",
                returnTrackingLink: orderData.return_tracking_link || "",
                caseType: orderData.case_type || "",
                fileLink: orderData.return_label || "",
                products: productsForEmail,
                totalQuantity: totalQuantity,
                salesExecutive: orderData.sales_executive || "",
                salesExecutiveEmail: orderData.se_email || "",
                salesManager: orderData.sales_manager || "",
                salesManagerEmail: orderData.sm_email || "",
                reseller: orderData.reseller || "",
                companyName: orderData.company_name || "",
                contactName: orderData.contact_name || "",
                contactEmail: orderData.email || "",
                shippingAddress: orderData.address || "",
                city: orderData.city || "",
                state: orderData.state || "",
                zip: orderData.zip || "",
                deliveryDate: orderData.desired_date || "",
                deviceUnits: orderData.dev_opportunity || 0,
                budgetPerDevice: orderData.dev_budget || 0,
                revenue: orderData.rev_opportunity || 0,
                crmAccount: orderData.crm_account || "",
                vertical: orderData.vertical || "",
                segment: orderData.segment || "",
                useCase: orderData.use_case || "",
                currentDevices: orderData.currently_running || "",
                licenses: orderData.licenses || "",
                usingCopilot: orderData.isCopilot || "",
                securityFactor: orderData.isSecurity || "",
                deviceProtection: orderData.current_protection || "",
                note: orderData.notes || "",
            });

            const mergedEmails = [orderData.order_by_user?.email, ...ShippedEmail];

            await sendEmail({
                to: mergedEmails,
                cc: "",
                subject: template.subject,
                text: template.text,
                html: template.html,
            });

        } catch (error) {
            console.error('Error sending shipped order email:', error);
        }
    };

    // Handle file upload for return label
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!order || !canUploadReturnLabel) return;

        const file = event.target.files?.[0];
        if (!file) return;

        const startTime = Date.now();

        await logActivity({
            type: 'order',
            level: 'info',
            action: 'order_return_label_upload_attempt',
            message: `Attempting to upload return label for order ${order.order_no}`,
            userId: profile?.id || null,
            orderId: order.id,
            details: {
                orderNumber: order.order_no,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                userRole: profile?.role
            }
        });

        if (
            file.type !== 'application/pdf' &&
            !file.name.toLowerCase().endsWith('.pdf')
        ) {
            await logActivity({
                type: 'validation',
                level: 'error',
                action: 'order_return_label_validation_failed',
                message: `Invalid file type for return label upload`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    fileName: file.name,
                    fileType: file.type,
                    allowedType: 'application/pdf',
                    userRole: profile?.role
                },
                status: 'failed'
            });
            setUploadError('Please upload a valid PDF file');
            return;
        }

        try {
            setIsUploading(true);
            setUploadError(null);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `return-labels/${order.order_no}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('TdSynnex')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) {
                await logActivity({
                    type: 'storage',
                    level: 'error',
                    action: 'order_return_label_upload_failed',
                    message: `Failed to upload return label: ${uploadError.message}`,
                    userId: profile?.id || null,
                    orderId: order.id,
                    details: {
                        orderNumber: order.order_no,
                        fileName: file.name,
                        error: uploadError,
                        executionTimeMs: Date.now() - startTime,
                        userRole: profile?.role
                    },
                    status: 'failed'
                });
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('TdSynnex')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('orders')
                .update({ return_label: publicUrl })
                .eq('id', order.id);

            if (updateError) {
                await logActivity({
                    type: 'db',
                    level: 'error',
                    action: 'order_return_label_update_failed',
                    message: `Failed to update order with return label URL: ${updateError.message}`,
                    userId: profile?.id || null,
                    orderId: order.id,
                    details: {
                        orderNumber: order.order_no,
                        fileName: file.name,
                        error: updateError,
                        executionTimeMs: Date.now() - startTime,
                        userRole: profile?.role
                    },
                    status: 'failed'
                });
                throw updateError;
            }

            await logActivity({
                type: 'order',
                level: 'success',
                action: 'order_return_label_upload_success',
                message: `Successfully uploaded return label for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    fileName: file.name,
                    fileSize: file.size,
                    fileUrl: publicUrl,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'completed'
            });

            setOrders(prev => prev.map(o =>
                o.id === order.id ? { ...o, return_label: publicUrl } : o
            ));

            event.target.value = '';

        } catch (err: any) {
            await logActivity({
                type: 'order',
                level: 'error',
                action: 'order_return_label_upload_error',
                message: `Failed to upload return label for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    fileName: file.name,
                    error: err.message || err,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'failed'
            });
            setUploadError(err.message || 'Failed to upload file. Please check storage bucket configuration.');
        } finally {
            setIsUploading(false);
        }
    };

    // Handle product selection
    const handleProductSelect = async (productId: string) => {
        // Both Admin and SM Role can change product
        if (!order || !(isAdmin || isSMRole)) {
            toast.error("You don't have permission to change product");
            return;
        }

        const startTime = Date.now();

        await logActivity({
            type: 'order',
            level: 'info',
            action: 'order_product_change_attempt',
            message: `Attempting to change product for order ${order.order_no}`,
            userId: profile?.id || null,
            orderId: order.id,
            productId,
            details: {
                orderNumber: order.order_no,
                oldProductId: order.product_id,
                newProductId: productId,
                userRole: profile?.role
            }
        });

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    product_id: productId
                })
                .eq('id', order.id);

            if (error) {
                await logActivity({
                    type: 'order',
                    level: 'error',
                    action: 'order_product_change_failed',
                    message: `Failed to change product for order ${order.order_no}: ${error.message}`,
                    userId: profile?.id || null,
                    orderId: order.id,
                    details: {
                        orderNumber: order.order_no,
                        oldProductId: order.product_id,
                        newProductId: productId,
                        error: error,
                        executionTimeMs: Date.now() - startTime,
                        userRole: profile?.role
                    },
                    status: 'failed'
                });
                throw error;
            }

            await logActivity({
                type: 'order',
                level: 'success',
                action: 'order_product_change_success',
                message: `Successfully changed product for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    oldProductId: order.product_id,
                    newProductId: productId,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'completed'
            });

            toast.success("Product updated successfully!");
            await fetchOrders();
            setEditingField(null);
            setEditingRowId(null);
            setEditedValue("");

        } catch (err) {
            await logActivity({
                type: 'order',
                level: 'error',
                action: 'order_product_change_error',
                message: `Failed to change product for order ${order.order_no}`,
                userId: profile?.id || null,
                orderId: order.id,
                details: {
                    orderNumber: order.order_no,
                    error: err,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'failed'
            });
            toast.error("Failed to update product");
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

        // Check if user can edit this field
        let canEdit = false;

        if (isAdmin) {
            canEdit = true;
        } else if (isSMRole) {
            // SM Role can edit these specific fields
            const smEditableFields = [
                "tracking",
                "return_tracking",
                "tracking_link",
                "return_tracking_link",
                "username",
                "case_type",
                "password"
            ];

            if (smEditableFields.includes(field)) {
                canEdit = true;
            }
        }

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
                        disabled={!canEdit}
                    >
                        Save
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="cursor-pointer"
                        disabled={!canEdit}
                    >
                        Cancel
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-between group">
                <span>{displayValue}</span>
                {canEdit && (
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

    const renderStatusDropdown = (field: string, value: any, rowId: string = "order") => {
        const isEditing = editingField === field && editingRowId === rowId;

        const isPendingShipped = pendingStatusChange &&
            pendingStatusChange.field === field &&
            pendingStatusChange.value === process.env.NEXT_PUBLIC_STATUS_SHIPPED &&
            pendingStatusChange.rowId === rowId;

        const isPendingReturned = pendingStatusChange &&
            pendingStatusChange.field === field &&
            pendingStatusChange.value === process.env.NEXT_PUBLIC_STATUS_RETURNED &&
            pendingStatusChange.rowId === rowId;

        if (isEditing || isPendingShipped || isPendingReturned) {
            return (
                <div className="flex items-center gap-2">
                    <Select
                        value={isPendingShipped || isPendingReturned ? pendingStatusChange!.value : editedValue}
                        onValueChange={(val) => {
                            console.log('Status dropdown value changed:', val);
                            if (val === process.env.NEXT_PUBLIC_STATUS_RETURNED) {
                                console.log('Returned status selected, calling handleStatusChangeToReturned');
                                handleStatusChangeToReturned(field, val, rowId);
                            } else {
                                console.log('Other status selected, setting edited value');
                                setEditedValue(val);
                            }
                        }}
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
                        onClick={() => {
                            console.log('Save button clicked in status dropdown');
                            if (editedValue !== process.env.NEXT_PUBLIC_STATUS_RETURNED) {
                                console.log('Saving non-return status');
                                handleSaveEdit(field);
                            } else {
                                console.log('Return status - should already be handled by modal');
                            }
                        }}
                        className="bg-teal-600 hover:bg-teal-700 cursor-pointer"
                        disabled={!canEditStatus}
                    >
                        {isPendingShipped ? "Awaiting Tracking..." :
                            isPendingReturned ? "Processing Return..." : "Save"}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            console.log('Cancel button clicked in status dropdown');
                            if (pendingStatusChange) {
                                console.log('Clearing pending status change:', pendingStatusChange);
                                setPendingStatusChange(null);
                            }
                            handleCancelEdit();
                        }}
                        className="cursor-pointer"
                        disabled={!canEditStatus}
                    >
                        Cancel
                    </Button>
                    {isPendingShipped && (
                        <div className="text-xs text-amber-600 ml-2">
                            Please complete tracking details
                        </div>
                    )}
                    {isPendingReturned && (
                        <div className="text-xs text-amber-600 ml-2">
                            Please verify returned products in modal
                        </div>
                    )}
                </div>
            );
        }

        const statusLabel = statusOptions.find(opt => opt.value === value)?.label || value;

        return (
            <div className="flex items-center justify-between group">
                <span>{statusLabel}</span>
                {canEditStatus && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 cursor-pointer"
                        // In renderStatusDropdown function, update the onClick handler
                        onClick={() => {
                            console.log('Edit button clicked for status');
                            // Directly call handleEditClick instead of going through the function
                            setEditingField(field);
                            setEditedValue(value || "");
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

                {canUploadReturnLabel && (
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
                        disabled={!canEditAll}
                    >
                        Save
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="cursor-pointer"
                        disabled={!canEditAll}
                    >
                        Cancel
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <b className="block mb-2">Notes:</b>
                    <div className="whitespace-pre-wrap wrap-break-word max-h-30 overflow-y-auto pr-2 border border-gray-200 rounded p-2 bg-white">
                        {order.notes || "No notes available"}
                    </div>
                </div>
                {canEditAll && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2 cursor-pointer shrink-0"
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
                                                        className="text-blue-600 underline cursor-pointer"
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
                                        {canEditTracking && (
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
                                                <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
                                                            disabled={!canEditTracking}
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
                                                        className="text-blue-600 underline cursor-pointer"
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
            {order.order_status !== process.env.NEXT_PUBLIC_STATUS_AWAITING && profile?.role !== process.env.NEXT_PUBLIC_SUBSCRIBER && (
                <>
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold">Order #{order.order_no}</h1>
                        <p className="text-gray-600 mt-2">Order Date: {formatDateToCustomFormat(order.order_date)}</p>
                    </div>
                </>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-[72%] space-y-6">
                    <div>
                        {order.order_status !== process.env.NEXT_PUBLIC_STATUS_AWAITING && profile?.role !== process.env.NEXT_PUBLIC_SUBSCRIBER && (
                            <>
                                <h2 className="text-lg font-semibold mb-4">Order Details</h2>
                            </>
                        )}
                        {order.order_status === process.env.NEXT_PUBLIC_STATUS_AWAITING && profile?.role !== process.env.NEXT_PUBLIC_SUBSCRIBER ? (
                            <>
                                {canApproveReject && (
                                    <Table className="hover:bg-white">
                                        <TableBody>
                                            <TableRow>
                                                <TableCell colSpan={2}>
                                                    <div className="flex">
                                                        <Button
                                                            onClick={handleApprove}
                                                            className="bg-[#0A4647] hover:bg-[#093131] text-white cursor-pointer flex items-center gap-2"
                                                            disabled={!canApproveReject}
                                                        >
                                                            <CheckCircle size={18} />
                                                            Approve Order
                                                        </Button>
                                                        <Button
                                                            onClick={handleReject}
                                                            className="bg-red-700 hover:bg-red-800 text-white cursor-pointer mx-4 flex items-center gap-2"
                                                            variant="destructive"
                                                            disabled={!canApproveReject}
                                                        >
                                                            <XCircle size={18} />
                                                            Reject Order
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                )}
                                <div className="my-6">
                                    <h1 className="text-2xl font-bold">Order #{order.order_no}</h1>
                                    <p className="text-gray-600 mt-2">Order Date: {formatDateToCustomFormat(order.order_date)}</p>
                                </div>
                            </>
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
                                                    {order.action_date ? formatActionDate(order.action_date) : "-"}
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
                                                    {order.action_date ? formatActionDate(order.action_date) : "-"}
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
                                        Products
                                    </TableHead>
                                    <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} className="w-[15%]">
                                        Quantity
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderAllProducts()}
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
                                        {formatDateToCustomFormat(order.desired_date)}
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
                                    <TableCell colSpan={2} className="py-3">
                                        {renderNotesCell()}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="lg:w-[28%] space-y-6">
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
                                        {order.order_status === process.env.NEXT_PUBLIC_STATUS_AWAITING
                                            ? order.order_status === "Shipped Extension"
                                                ? "Shipped (Order Extension)"
                                                : order.order_status
                                            : renderStatusDropdown("order_status", order.order_status, "status")
                                        }
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    {renderTrackingSection()}

                    {order.shipped_date && (
                        <div>
                            <Table className="border">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead style={{ backgroundColor: '#0A4647', color: 'white' }} colSpan={2}>
                                            Win Status
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.wins && order.wins.length == 0 && (
                                        <>
                                            <TableRow>
                                                <TableCell className="font-semibold">Days Since Shipped</TableCell>
                                                <TableCell className="border-l">
                                                    <div className="flex items-center">
                                                        {order.shipped_date ? (
                                                            (() => {
                                                                const daysShipped = calculateDaysShipped(order.shipped_date);
                                                                const daysOverdue = calculateDaysOverdue(order.shipped_date);
                                                                const isOverdue = daysOverdue > 0;

                                                                return (
                                                                    <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                                                                        {daysShipped} days
                                                                        {isOverdue && ` (${daysOverdue} days overdue)`}
                                                                    </span>
                                                                );
                                                            })()
                                                        ) : (
                                                            <span className="text-gray-500">Not shipped yet</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="font-semibold">Estimated Return Date</TableCell>
                                                <TableCell className="border-l">
                                                    <div className="flex items-center">
                                                        {order.shipped_date ? (
                                                            (() => {
                                                                const estimatedDate = calculateEstimatedReturnDate(order.shipped_date);
                                                                const hasPassed = hasReturnDatePassed(order.shipped_date);

                                                                return (
                                                                    <span className={hasPassed ? "text-red-600 font-semibold" : ""}>
                                                                        {formatEstimatedReturnDate(order.shipped_date)}
                                                                        {hasPassed && " (Passed)"}
                                                                    </span>
                                                                );
                                                            })()
                                                        ) : (
                                                            <span className="text-gray-500">Not shipped yet</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    )}
                                    <TableRow>
                                        <TableCell className="font-semibold">Win Status</TableCell>
                                        <TableCell className="border-l">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    {order.wins && order.wins.length > 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-green-600 font-semibold">
                                                                Win Reported
                                                            </span>
                                                            {order.wins[0]?.id && (
                                                                <Link
                                                                    href={`/view-windetails/${order.wins[0].id}`}
                                                                    target="_blank"
                                                                    className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                                                    title="View Win Details"
                                                                >
                                                                    <ExternalLink className="h-4 w-4 ml-1" />
                                                                </Link>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-amber-600 font-semibold">
                                                            Win Not Reported
                                                        </span>
                                                    )}
                                                </div>

                                                {order.wins && order.wins.length > 1 && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 cursor-pointer"
                                                            >
                                                                <ChevronDown className="h-3 w-3" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Multiple Wins</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            {order.wins.map((win, index) => (
                                                                <DropdownMenuItem key={win?.id}>
                                                                    <Link
                                                                        href={`/view-windetails/${win?.id}`}
                                                                        target="_blank"
                                                                        className="flex items-center gap-2 w-full cursor-pointer"
                                                                    >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                        Win #{index + 1}
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>
            {renderReturnModal()}
        </div>
    )
}