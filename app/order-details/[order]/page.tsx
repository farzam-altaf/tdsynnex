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
    quantity: string | null // This is total quantity as string for backward compatibility
    quantity_array?: number[] | null // Add this for array support
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
    product_id: string[] | null // Change this to string array
    products?: Product
    products_array?: Product[] // Add this for multiple products
    approved_user?: { // Add this for the join
        id: string
        email: string
        firstName?: string  // Change to camelCase
        lastName?: string   // Change to camelCase
    }
    rejected_user?: { // Add this for the join
        id: string
        email: string
        firstName?: string  // Change to camelCase
        lastName?: string   // Change to camelCase
    }
    order_by_user?: { // Add this for the join
        id: string
        email: string
        firstName?: string  // Change to camelCase
        lastName?: string   // Change to camelCase
    }
    wins?: { // Add this for the join
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

    // Helper function to handle status change to Returned
    const handleStatusChangeToReturned = (field: string, value: string, rowId: string = "order") => {
        console.log('handleStatusChangeToReturned called:', { field, value, rowId });

        if (field !== "order_status" || value !== process.env.NEXT_PUBLIC_STATUS_RETURNED) {
            console.log('Not a return status change');
            return;
        }

        if (!order || !isActionAuthorized) {
            console.log('No order or not authorized:', { hasOrder: !!order, isActionAuthorized });
            return;
        }

        // Check if order has shipped products
        if (!order.shipped_date || !order.products_array || order.products_array.length === 0) {
            console.log('Order not shipped or no products:', {
                hasShippedDate: !!order.shipped_date,
                hasProductsArray: !!order.products_array,
                productsCount: order.products_array?.length || 0
            });
            toast.error("Order is not shipped or has no products");
            return;
        }

        // Prepare returned products data
        const productsData = order.products_array.map((product, index) => ({
            productId: product.id,
            productName: product.product_name,
            shippedQuantity: order.quantity_array?.[index] || 0,
            returnedQuantity: order.quantity_array?.[index] || 0, // Initially all returned
            isDamaged: false // Initially all items are NOT damaged (will be returned to stock)
        }));

        console.log('Setting returned products:', productsData);
        setReturnedProducts(productsData);

        // Store the pending status change
        const pendingChange = {
            field: field,
            value: value,
            rowId: rowId
        };
        console.log('Setting pending status change:', pendingChange);
        setPendingStatusChange(pendingChange);

        // Open the modal
        console.log('Opening return modal');
        setIsReturnModalOpen(true);
    };

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
            router.replace(`/login/?redirect_to=order-details/${orderHash}`);
            return;
        }

        if (!isAuthorized) {
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
                userRole: profile?.role,
                isActionAuthorized
            }
        });

        try {
            setIsLoading(true);
            setError(null);

            console.log('🔍 Fetching order details...');

            // First, fetch the order without the product join
            let query = supabase
                .from('orders')
                .select(`
            *,
            approved_user:users!orders_approved_by_fkey(id, email, firstName, lastName),
            rejected_user:users!orders_rejected_by_fkey(id, email, firstName, lastName),
            order_by_user:users!orders_order_by_fkey(id, email, firstName, lastName),
            wins:wins(*) 
        `)
                .eq('order_no', orderHash);

            const { data, error: supabaseError } = await query;

            if (supabaseError) {
                console.error('Supabase error:', supabaseError);
                throw supabaseError;
            }

            if (data) {
                console.log("📦 Fetched raw data:", data);
                console.log("📊 Number of orders:", data.length);

                // Check if user is authorized to view this order
                if (sRole === profile?.role && data[0].order_by !== profile?.id) {
                    console.warn('⚠️ Unauthorized access attempt');
                    router.back();
                    return;
                }

                // Parse the product_id array and quantity array
                const processedOrders = await Promise.all(data.map(async (order: any) => {
                    try {
                        // Parse product_id and quantity arrays
                        let productIds: string[] = [];
                        let quantities: number[] = [];

                        console.log("📋 Original product_id:", order.product_id);
                        console.log("📋 Original quantity:", order.quantity);
                        console.log("📋 Order status:", order.order_status);

                        // Handle product_id parsing
                        if (order.product_id) {
                            if (typeof order.product_id === 'string') {
                                try {
                                    productIds = JSON.parse(order.product_id);
                                    console.log("✅ Parsed productIds:", productIds);
                                } catch (parseError) {
                                    console.error('❌ Error parsing product_id JSON:', parseError);
                                    if (order.product_id.trim().startsWith('[') === false) {
                                        productIds = [order.product_id.trim()];
                                    }
                                }
                            } else if (Array.isArray(order.product_id)) {
                                productIds = order.product_id;
                            }
                        }

                        // Handle quantity parsing
                        if (order.quantity) {
                            if (typeof order.quantity === 'string') {
                                try {
                                    quantities = JSON.parse(order.quantity);
                                    console.log("✅ Parsed quantities:", quantities);
                                } catch (parseError) {
                                    console.error('❌ Error parsing quantity JSON:', parseError);
                                    const parsed = parseInt(order.quantity);
                                    if (!isNaN(parsed)) {
                                        quantities = [parsed];
                                    }
                                }
                            } else if (Array.isArray(order.quantity)) {
                                quantities = order.quantity;
                            } else if (typeof order.quantity === 'number') {
                                quantities = [order.quantity];
                            }
                        }

                        console.log("🎯 Final productIds:", productIds);
                        console.log("🎯 Final quantities:", quantities);

                        // Fetch all products for this order
                        let productsDetails: Product[] = [];
                        if (productIds.length > 0) {
                            const { data: productsData, error: productsError } = await supabase
                                .from('products')
                                .select(`
                            *,
                            processor_filter:processor(title),
                            form_factor_filter:form_factor(title)
                        `)
                                .in('id', productIds);

                            if (!productsError && productsData) {
                                productsDetails = productsData as Product[];
                                console.log(`✅ Fetched ${productsDetails.length} products`);
                            } else {
                                console.error('❌ Error fetching products:', productsError);
                            }
                        }

                        // Calculate total quantity
                        const totalQuantity = quantities.reduce((sum, qty) => sum + qty, 0);

                        // Create the order object
                        const processedOrder: Order = {
                            ...order,
                            product_id: productIds,
                            quantity: totalQuantity.toString(),
                            quantity_array: quantities,
                            products: productIds.length > 0 ? productsDetails[0] : undefined,
                            products_array: productsDetails,
                            approved_user: order.approved_user ? {
                                id: order.approved_user.id,
                                email: order.approved_user.email,
                                firstName: order.approved_user.firstName,
                                lastName: order.approved_user.lastName
                            } : undefined,
                            rejected_user: order.rejected_user ? {
                                id: order.rejected_user.id,
                                email: order.rejected_user.email,
                                firstName: order.rejected_user.firstName,
                                lastName: order.rejected_user.lastName
                            } : undefined,
                            order_by_user: order.order_by_user ? {
                                id: order.order_by_user.id,
                                email: order.order_by_user.email,
                                firstName: order.order_by_user.firstName,
                                lastName: order.order_by_user.lastName
                            } : undefined
                        };

                        console.log("✅ Processed order:", {
                            id: processedOrder.id,
                            order_no: processedOrder.order_no,
                            order_status: processedOrder.order_status,
                            returned_date: processedOrder.returned_date,
                            product_count: processedOrder.product_id?.length || 0
                        });

                        return processedOrder;
                    } catch (parseError) {
                        console.error('❌ Error parsing order data:', parseError);
                        return {
                            ...order,
                            product_id: [],
                            quantity: null,
                            products: undefined,
                            products_array: [],
                            approved_user: order.approved_user ? {
                                id: order.approved_user.id,
                                email: order.approved_user.email,
                                firstName: order.approved_user.firstName,
                                lastName: order.approved_user.lastName
                            } : undefined,
                            rejected_user: order.rejected_user ? {
                                id: order.rejected_user.id,
                                email: order.rejected_user.email,
                                firstName: order.rejected_user.firstName,
                                lastName: order.rejected_user.lastName
                            } : undefined,
                            order_by_user: order.order_by_user ? {
                                id: order.order_by_user.id,
                                email: order.order_by_user.email,
                                firstName: order.order_by_user.firstName,
                                lastName: order.order_by_user.lastName
                            } : undefined
                        } as Order;
                    }
                }));

                console.log("🎉 Setting processed orders to state:", processedOrders.length);
                setOrders(processedOrders);

                // Initialize tracking data
                if (processedOrders.length > 0) {
                    const order = processedOrders[0];
                    console.log("📦 First order details:", {
                        order_no: order.order_no,
                        order_status: order.order_status,
                        returned_date: order.returned_date
                    });
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
                        userRole: profile?.role,
                        productCount: processedOrders[0]?.product_id?.length || 0
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


    const renderAllProducts = () => {
        // Safely handle product_id - it could be string or array
        let productIds: string[] = [];

        if (order.product_id) {
            if (Array.isArray(order.product_id)) {
                productIds = order.product_id;
            } else if (typeof order.product_id === 'string') {
                try {
                    // Try to parse JSON string
                    const parsed = JSON.parse(order.product_id);
                    if (Array.isArray(parsed)) {
                        productIds = parsed;
                    } else {
                        // If not an array, treat as single ID
                        productIds = [order.product_id];
                    }
                } catch (error) {
                    // If parsing fails, treat as single ID
                    productIds = [order.product_id];
                }
            }
        }

        // Also handle products_array safely
        const productsArray = order.products_array || [];
        const quantityArray = order.quantity_array || [];

        if (productIds.length === 0 || productsArray.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={2} className="text-center">
                        <span className="text-gray-500">No products found</span>
                    </TableCell>
                </TableRow>
            );
        }

        return productIds.map((productId, index) => {
            // Find the product details for this productId
            const product = productsArray.find(p => p.id === productId);
            const quantity = quantityArray[index] || 0;

            return (
                <TableRow key={`${productId}-${index}`}>
                    <TableCell className="w-[85%]">
                        {product ? (
                            <div className="flex items-center gap-2">
                                <span>{product.product_name}</span>
                            </div>
                        ) : (
                            <span className="text-gray-500">Product not found (ID: {productId})</span>
                        )}
                    </TableCell>
                    <TableCell className="w-[8%] border-l text-center">
                        {quantity}
                    </TableCell>
                </TableRow>
            );
        });
    };

    // Helper function to render product selector for editing
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

        // Display product count
        const productCount = order.product_id?.length || 0;
        let displayText = "-";
        if (productCount > 0) {
            displayText = `${productCount} product(s)`;
        }

        return (
            <div className="flex items-center justify-between group">
                <span>{displayText}</span>
                {isActionAuthorized && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 cursor-pointer"
                        onClick={() => {
                            setEditingField(field);
                            // Set the first product ID as the value to edit
                            const firstProductId = order.product_id && order.product_id.length > 0
                                ? order.product_id[0]
                                : "";
                            setEditedValue(firstProductId);
                            setEditingRowId(rowId);
                        }}
                    >
                        <Pencil className="h-3 w-3" />
                    </Button>
                )}
            </div>
        );
    };

    // Handle returned quantity change
    const handleReturnedQuantityChange = (index: number, value: number) => {
        setReturnedProducts(prev => prev.map((product, i) => {
            if (i === index) {
                // Ensure returned quantity doesn't exceed shipped quantity
                const maxAllowed = product.shippedQuantity;
                const newQuantity = Math.min(Math.max(0, value), maxAllowed);
                return { ...product, returnedQuantity: newQuantity };
            }
            return product;
        }));
    };


    // Add this interface near your other interfaces
    interface ReturnApiResponse {
        success: boolean;
        message: string;
        orderId: string;
        error?: string;
        details?: string;
    }

    const handleReturnSubmit = async () => {
        console.log('handleReturnSubmit called');

        if (!order || !isActionAuthorized) {
            console.log('Condition failed');
            toast.error("Not authorized or no order");
            return;
        }

        // Check if we have selected products
        const hasSelectedProducts = returnedProducts.some(p => p.returnedQuantity > 0);
        if (!hasSelectedProducts) {
            toast.error("Please select products to return");
            return;
        }

        const startTime = Date.now();

        // Log return submission attempt
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
            // ✅ Loading toast
            toast.loading("Processing return...");

            // ✅ DIRECT SUPA-BASE CALL (API ki jagah)
            const currentDate = new Date().toISOString().split('T')[0];

            // Step 1: Pehle product quantities update karein
            for (const returnedProduct of returnedProducts) {
                if (returnedProduct.returnedQuantity > 0) {
                    // Find the product in order.products_array
                    const product = order.products_array?.find(p => p.id === returnedProduct.productId);

                    if (product) {
                        // Calculate new quantities
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

                        // Update product in database
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

            // Step 2: Order status update karein
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

            // Step 3: Email bhejein (agar chahiye) - FIXED: Now passing returnedProducts as second argument
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
                    // Email fail hua to bhi process continue rahe
                }
            }

            // ✅ Loading toast dismiss karein
            toast.dismiss();

            // ✅ Success toast show karein
            toast.success("Return processed successfully!");

            // ✅ Modal close karein
            setIsReturnModalOpen(false);

            // ✅ Reset state
            setReturnedProducts([]);
            setPendingStatusChange(null);
            setEditingField(null);
            setEditingRowId(null);
            setEditedValue("");

            // ✅ Log success
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

            // ✅ IMMEDIATELY refresh data (timeout ke bina)
            console.log('✅ Refreshing data immediately...');
            await fetchOrders();
            await fetchAllProducts();

        } catch (err: any) {
            console.error('Error in handleReturnSubmit:', err);
            console.error('Error stack:', err.stack);

            // ✅ Loading toast dismiss karein
            toast.dismiss();

            // ✅ Error toast show karein
            toast.error(err.message || "Failed to process return");

            // Log error
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

    // Helper function to format action_date with AM/PM
    const formatActionDate = (dateTimeString: string | null) => {
        if (!dateTimeString) return "-";

        try {
            const date = new Date(dateTimeString);

            // Extract date parts
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            // Extract time parts
            let hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');

            // Convert to 12-hour format with AM/PM
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // 0 should be 12

            // Format: MM/DD/YYYY hh:mm AM/PM
            return `${month}/${day}/${year} (${hours}:${minutes} ${ampm})`;
        } catch (error) {
            console.error('Error formatting action_date:', error);
            return dateTimeString; // Return original if parsing fails
        }
    };

    const renderReturnModal = () => {
        return (
            <Dialog
                open={isReturnModalOpen}
                onOpenChange={(open) => {
                    console.log('Modal open state changed:', open);

                    // Only reset if modal is being closed
                    if (!open) {
                        console.log('Closing modal by user action');

                        // Ask for confirmation if there are selected products
                        const hasSelectedProducts = returnedProducts.some(p => p.returnedQuantity > 0);
                        if (hasSelectedProducts) {
                            const confirmed = window.confirm(
                                "You have selected products to return. Are you sure you want to cancel?"
                            );
                            if (!confirmed) {
                                return; // Don't close the modal
                            }
                        }

                        // Reset only when user explicitly closes modal
                        setIsReturnModalOpen(false);
                        setReturnedProducts([]);
                    }
                }}
            >
                <DialogContent className="sm:max-w-300 max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                        <DialogTitle>Process Return for Order #{order?.order_no}</DialogTitle>
                        <p className="text-sm text-gray-600 mt-1">
                            Select products and specify quantity to return to inventory
                        </p>
                    </DialogHeader>

                    <div className="space-y-4 py-4 overflow-x-hidden">


                        <div className="overflow-x-auto">
                            <Table className="td-table w-full min-w-162.5">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12.5 text-center td-th"></TableHead>
                                        <TableHead className="w-25 td-th">Shipped</TableHead>
                                        <TableHead className="w-37.5 td-th">Return to Stock</TableHead>
                                        <TableHead className=" td-th">Product</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {returnedProducts.map((product, index) => (
                                        <TableRow key={product.productId} className="hover:bg-gray-50">
                                            <TableCell className="text-center td-td">
                                                <div className="flex justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={product.returnedQuantity > 0}
                                                        onChange={(e) => {
                                                            const isChecked = e.target.checked;
                                                            setReturnedProducts(prev => prev.map((p, i) => {
                                                                if (i === index) {
                                                                    return {
                                                                        ...p,
                                                                        returnedQuantity: isChecked ? p.shippedQuantity : 0,
                                                                        isDamaged: !isChecked
                                                                    };
                                                                }
                                                                return p;
                                                            }));
                                                        }}
                                                        className="h-5 w-5 cursor-pointer"
                                                    />
                                                </div>
                                            </TableCell>
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
                                                        disabled={product.returnedQuantity === 0}
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

                        {/* Summary Section */}
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
                                    <span className="text-gray-600">Selected Products:</span>
                                    <span className="font-medium ml-2 text-lg">
                                        {returnedProducts.filter(p => p.returnedQuantity > 0).length}
                                    </span>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <span className="text-gray-600">Returning to Stock:</span>
                                    <span className="font-medium ml-2 text-lg text-green-600">
                                        {returnedProducts.reduce((sum, p) => sum + p.returnedQuantity, 0)}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        // Select all and set to maximum
                                        setReturnedProducts(prev => prev.map(p => ({
                                            ...p,
                                            returnedQuantity: p.shippedQuantity,
                                            isDamaged: false
                                        })));
                                    }}
                                    className="text-xs"
                                >
                                    Select All & Return Full Quantity
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        // Unselect all
                                        setReturnedProducts(prev => prev.map(p => ({
                                            ...p,
                                            returnedQuantity: 0,
                                            isDamaged: true
                                        })));
                                    }}
                                    className="text-xs"
                                >
                                    Unselect All
                                </Button>
                            </div>

                            {returnedProducts.some(p => p.returnedQuantity === 0) && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                                    <div className="flex items-start">
                                        <span className="text-red-600 mr-2">⚠️</span>
                                        <div>
                                            <strong className="text-red-700">Note:</strong>
                                            <p className="text-red-600 text-sm mt-1">
                                                {returnedProducts.filter(p => p.returnedQuantity === 0).length} item(s) are not selected and will not be added back to stock inventory.
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
                                // Don't reset pendingStatusChange here - let the submit button handle it
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
                                    isActionAuthorized,
                                    returnedProductsCount: returnedProducts.length,
                                    returnedProducts
                                });

                                // Check all conditions
                                if (!order) {
                                    console.error('❌ No order');
                                    toast.error("No order data");
                                    return;
                                }

                                if (!isActionAuthorized) {
                                    console.error('❌ Not authorized');
                                    toast.error("You are not authorized");
                                    return;
                                }

                                // Check if we have selected products
                                const hasSelectedProducts = returnedProducts.some(p => p.returnedQuantity > 0);
                                if (!hasSelectedProducts) {
                                    console.error('❌ No products selected for return');
                                    toast.error("Please select products to return");
                                    return;
                                }

                                console.log('✅ All conditions passed, calling handleReturnSubmit');
                                handleReturnSubmit();
                            }}
                            className="bg-teal-600 hover:bg-teal-700 cursor-pointer"
                            disabled={!order || !isActionAuthorized}
                        >
                            Confirm Return
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    };


    // Fetch data when authorized
    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
            fetchOrders();
            fetchAllProducts();
        }
    }, [loading, isLoggedIn, profile, isAuthorized]);

    const handleApprove = async () => {
        if (!order || !isActionAuthorized) return;

        const startTime = Date.now();

        // Log approve attempt
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
            // Update order status
            const { error } = await supabase
                .from('orders')
                .update({
                    order_status: `${process.env.NEXT_PUBLIC_STATUS_PROCESSING}`,
                    approved_by: profile?.id,
                    action_date: `${new Date().toISOString().split('T')[0]}`
                })
                .eq('id', order.id);

            if (error) {
                // Log approve error
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

            // Refresh data
            await fetchOrders();
            // ✅ Send approved order email (after successful approval)
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

        // Calculate difference in days
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

        return date.toLocaleDateString();
    };

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

    const calculateDaysOverdue = (shippedDate: string | null): number => {
        if (!shippedDate) return 0;

        const daysShipped = calculateDaysShipped(shippedDate);
        return Math.max(0, daysShipped - 45);
    };

    const handleReject = async () => {
        if (!order || !isActionAuthorized) return;


        const startTime = Date.now();

        // Log reject attempt
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

            // Only update product quantities if current status is one of the allowed statuses
            const allowedPreviousStatuses = [
                process.env.NEXT_PUBLIC_STATUS_AWAITING,
                process.env.NEXT_PUBLIC_STATUS_PROCESSING,
                process.env.NEXT_PUBLIC_STATUS_SHIPPED,
                process.env.NEXT_PUBLIC_STATUS_EXTENSION
            ].filter(Boolean);

            if (allowedPreviousStatuses.includes(order.order_status) && order.products && order.quantity) {
                const orderQuantity = parseInt(order.quantity) || 0;

                if (orderQuantity > 0) {
                    // Parse current product quantities
                    const currentStockQty = parseInt(order.products.stock_quantity) || 0;
                    const currentWithCustomerQty = parseInt(order.products.withCustomer) || 0;

                    // Calculate new quantities
                    const newStockQty = currentStockQty + orderQuantity; // Increase stock
                    const newWithCustomerQty = currentWithCustomerQty - orderQuantity; // Decrease withCustomer

                    // Ensure quantities don't go negative
                    const finalStockQty = Math.max(0, newStockQty).toString();
                    const finalWithCustomerQty = Math.max(0, newWithCustomerQty).toString();

                    // Update product quantities
                    const { error: productUpdateError } = await supabase
                        .from('products')
                        .update({
                            stock_quantity: finalStockQty,
                            withCustomer: finalWithCustomerQty
                        })
                        .eq('id', order.products.id);

                    if (productUpdateError) {
                        await logActivity({
                            type: 'product',
                            level: 'error',
                            action: 'product_quantity_update_failed_on_reject',
                            message: `Failed to update product quantities when rejecting order ${order.order_no}`,
                            userId: profile?.id || null,
                            orderId: order.id,
                            productId: order.products.id,
                            details: {
                                orderNumber: order.order_no,
                                productId: order.products.id,
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
                            productId: order.products.id,
                            details: {
                                orderNumber: order.order_no,
                                productId: order.products.id,
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

            // Update order status
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

            // ✅ Update local state immediately
            setOrders(prev => prev.map(o =>
                o.id === order.id ? {
                    ...o,
                    order_status: `${process.env.NEXT_PUBLIC_STATUS_REJECTED}`,
                    rejected_by: profile?.id,
                    rejectedBy: profile?.id,
                    action_date: currentDate,
                    shipped_date: null,
                    returned_date: null,
                    rejected_user: profile ? {
                        id: profile.id,
                        email: profile.email,
                        firstName: profile.firstName,
                        lastName: profile.lastName
                    } : undefined
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
                    productId: order.products?.id,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role,
                    rejectedBy: profile?.email
                },
                status: 'completed'
            });

            // Send rejected email
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

    // Edit functionality
    const handleEditClick = (field: string, value: string, rowId: string) => {
        if (!isActionAuthorized) return;
        setEditingField(field);
        setEditedValue(value || "");
        setEditingRowId(rowId);
    };

    const handleSaveEdit = async (field: string) => {
        if (!order || !isActionAuthorized || editingField !== field) return;

        const startTime = Date.now();

        // Store the old value in case we need to revert
        const oldValue = order[field as keyof Order];

        // Log edit attempt
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

            // 🔴 FIX 1: SPECIAL HANDLING FOR REJECTED STATUS - USE handleReject FUNCTION
            if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_REJECTED) {
                console.log('Rejecting order via dropdown...');

                // Call handleReject directly for consistent behavior
                await handleReject();

                // Reset editing state
                setEditingField(null);
                setEditingRowId(null);
                setEditedValue("");
                return; // Exit early since handleReject handles everything
            }

            // 🔴 FIX 2: Handle Processing status
            if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {

                // Call handleReject directly for consistent behavior
                await handleApprove();

                // Reset editing state
                setEditingField(null);
                setEditingRowId(null);
                setEditedValue("");
                return; // Exit early since handleReject handles everything
            }

            // Calculate revenue opportunity if device opportunity or budget is changed
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

            // 🔴 FIX 3: Handle Shipped status with tracking validation
            if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED) {
                // Check if tracking details are missing
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

                    // Open the tracking modal
                    setIsModalOpen(true);

                    // Store the pending status change
                    setPendingStatusChange({
                        field: field,
                        value: editedValue,
                        rowId: editingRowId || "order"
                    });

                    return; // Don't proceed with status change
                }
            }

            // 🔴 FIX 4: Handle Returned status via modal
            if (field === "order_status" && editedValue === process.env.NEXT_PUBLIC_STATUS_RETURNED) {
                handleStatusChangeToReturned(field, editedValue);
                return;
            }

            // 🔴 FIX 5: Update dates based on status changes
            if (field === "order_status") {
                const currentDate = new Date().toISOString().split('T')[0];

                // If changing to Shipped/Extension, set shipped_date
                if (editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED ||
                    editedValue === process.env.NEXT_PUBLIC_STATUS_EXTENSION) {
                    updateData.shipped_date = currentDate;
                    updateData.returned_date = null;
                }

                // If changing to other statuses, clear dates
                if (editedValue === process.env.NEXT_PUBLIC_STATUS_REJECTED ||
                    editedValue === process.env.NEXT_PUBLIC_STATUS_AWAITING ||
                    editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {
                    updateData.shipped_date = null;
                    updateData.returned_date = null;
                }
            }

            // 🔴 FIX 6: Clean optimistic update
            setOrders(prev => {
                const updatedOrder = prev.map(o => {
                    if (o.id === order.id) {
                        const updated = { ...o, [field]: editedValue };

                        // Update action_date and user fields
                        if (field === "order_status") {
                            if (editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {
                                updated.approvedBy = profile?.id;
                                updated.action_date = new Date().toISOString().split('T')[0];
                                updated.rejectedBy = null;
                            }

                            // Update dates
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

                        // Handle product_id field
                        if (field === "product_id") {
                            if (typeof editedValue === 'string') {
                                try {
                                    updated.product_id = JSON.parse(editedValue);
                                } catch (error) {
                                    updated.product_id = [editedValue];
                                }
                            } else if (Array.isArray(editedValue)) {
                                updated.product_id = editedValue;
                            } else {
                                updated.product_id = order.product_id;
                            }
                        }

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

            // 🔴 FIX 7: Clean database update
            const { error } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', order.id);

            if (error) {
                // Revert optimistic update on error
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

            // Log success
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

            // Send emails for status changes
            if (field === "order_status") {
                const updatedOrder = { ...order, ...updateData };

                if (editedValue === process.env.NEXT_PUBLIC_STATUS_PROCESSING) {
                    sendApprovedOrderEmail(updatedOrder);
                } else if (editedValue === process.env.NEXT_PUBLIC_STATUS_SHIPPED) {
                    sendShippedOrderEmail(updatedOrder);
                }
                // Rejected email already sent by handleReject function
            }

            // Reset editing state
            setEditingField(null);
            setEditingRowId(null);
            setEditedValue("");

            toast.success(`${field} updated successfully!`);

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
            // User closed modal without saving - reset everything
            setPendingStatusChange(null);
            setEditingField(null);
            setEditingRowId(null);
            setEditedValue("");
        }
    }, [isModalOpen, pendingStatusChange]);

    const handleTrackingUpdate = async () => {
        if (!order || !isActionAuthorized) return;

        const startTime = Date.now();

        // Log tracking update attempt
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
            // First update tracking data
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

            // ✅ IMPORTANT: Update local state immediately
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

            // ✅ Check if there's a pending status change to Shipped
            if (pendingStatusChange && pendingStatusChange.field === "order_status") {
                // Close modal first
                setIsModalOpen(false);

                // Show success toast
                toast.success("Tracking details saved. Now updating status to Shipped...");

                // Create updated order data with BOTH tracking and status
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

                // Now update the status
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

                // ✅ Update local state for status change as well
                setOrders(prev => prev.map(o =>
                    o.id === order.id ? {
                        ...o,
                        ...updatedOrderData
                    } : o
                ));

                // Send shipped email with the COMPLETE updated data
                sendShippedOrderEmail(updatedOrderData);

                // Log shipped email sent
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

                // Reset everything
                setEditingField(null);
                setEditingRowId(null);
                setEditedValue("");
                setPendingStatusChange(null);

                toast.success("Status updated to Shipped successfully!");
            } else {
                // Close modal
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

    // Function to send approved order email
    const sendApprovedOrderEmail = async (orderData: Order) => {
        try {
            // Check if order has all required data
            if (!orderData.order_by_user?.email) {
                return;
            }

            if (!orderData.products_array || orderData.products_array.length === 0) {
                return;
            }

            // Prepare products array for email template
            const productsForEmail = orderData.products_array.map((product, index) => ({
                name: product.product_name || `Product ${index + 1}`,
                quantity: orderData.quantity_array?.[index] || 0
            }));

            // Calculate total quantity
            const totalQuantity = productsForEmail.reduce((sum, product) => sum + product.quantity, 0);

            const template = emailTemplates.approvedOrderEmail({
                orderNumber: orderData.order_no,
                orderDate: orderData.order_date,
                customerName: orderData.contact_name || "Customer",
                customerEmail: orderData.order_by_user?.email,

                products: productsForEmail, // CHANGED: Pass products array instead of single product
                totalQuantity: totalQuantity, // ADDED: Pass total quantity

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

            const result = await sendEmail({
                to: orderData.order_by_user?.email,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });
        } catch (error) {
            console.error('Error sending approved order email:', error);
        }
    };

    // Function to send rejected order email
    const sendRejectedOrderEmail = async (orderData: Order) => {
        try {
            // Check if order has all required data
            if (!orderData.order_by_user?.email) {
                return;
            }

            if (!orderData.products_array || orderData.products_array.length === 0) {
                return;
            }

            // Prepare products array for email template
            const productsForEmail = orderData.products_array.map((product, index) => ({
                name: product.product_name || `Product ${index + 1}`,
                quantity: orderData.quantity_array?.[index] || 0
            }));

            // Calculate total quantity
            const totalQuantity = productsForEmail.reduce((sum, product) => sum + product.quantity, 0);

            const template = emailTemplates.rejectedOrderEmail({
                orderNumber: orderData.order_no,
                orderDate: orderData.order_date,
                customerName: orderData.contact_name || "Customer",
                customerEmail: orderData.order_by_user?.email,

                products: productsForEmail, // CHANGED: Pass products array instead of single product
                totalQuantity: totalQuantity, // ADDED: Pass total quantity

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

            const result = await sendEmail({
                to: orderData.order_by_user?.email,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });
        } catch (error) {
            console.error('Error sending rejected order email:', error);
        }
    };

    // Function to send returned order email - UPDATED VERSION
    const sendReturnedOrderEmail = async (orderData: Order, returnedProductsData: typeof returnedProducts) => {
        try {
            // Check if order has all required data
            if (!orderData.order_by_user?.email) {
                return;
            }

            if (!orderData.products_array || orderData.products_array.length === 0) {
                return;
            }

            // Prepare products array for email template with returned quantities
            const productsForEmail = orderData.products_array.map((product, index) => {
                const shippedQuantity = orderData.quantity_array?.[index] || 0;
                const returnedProduct = returnedProductsData.find(rp => rp.productId === product.id);
                const returnedQuantity = returnedProduct?.returnedQuantity || 0;
                const leftWithCustomer = shippedQuantity - returnedQuantity;

                return {
                    name: product.product_name || `Product ${index + 1}`,
                    shippedQuantity: shippedQuantity,
                    returnedQuantity: returnedQuantity,
                    leftWithCustomer: leftWithCustomer // New field for left quantity
                };
            });

            // Calculate totals
            const totalShipped = productsForEmail.reduce((sum, product) => sum + product.shippedQuantity, 0);
            const totalReturned = productsForEmail.reduce((sum, product) => sum + product.returnedQuantity, 0);
            const totalLeft = totalShipped - totalReturned;

            const template = emailTemplates.returnedOrderEmail({
                orderNumber: orderData.order_no,
                orderDate: orderData.order_date,
                customerName: orderData.contact_name || "Customer",
                customerEmail: orderData.order_by_user?.email,

                products: productsForEmail, // Pass products array with all details
                totalQuantity: totalShipped, // Total shipped quantity
                totalReturned: totalReturned, // Total returned quantity
                totalLeft: totalLeft, // Total left with customer

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

            const result = await sendEmail({
                to: orderData.order_by_user?.email,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });
        } catch (error) {
            console.error('Error sending returned order email:', error);
        }
    };

    // Function to send shipped order email
    const sendShippedOrderEmail = async (orderData: Order) => {
        try {
            // Check if order has all required data
            if (!orderData.order_by_user?.email) {
                return;
            }

            if (!orderData.products_array || orderData.products_array.length === 0) {
                return;
            }

            // Prepare products array for email template
            const productsForEmail = orderData.products_array.map((product, index) => ({
                name: product.product_name || `Product ${index + 1}`,
                quantity: orderData.quantity_array?.[index] || 0
            }));

            // Calculate total quantity
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

                products: productsForEmail, // CHANGED: Pass products array instead of single product
                totalQuantity: totalQuantity, // ADDED: Pass total quantity

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

            const result = await sendEmail({
                to: orderData.order_by_user?.email,
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
        if (!order || !isActionAuthorized) return;

        const file = event.target.files?.[0];
        if (!file) return;

        const startTime = Date.now();

        // Log file upload attempt
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

        // Check if file is PDF
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


            // Upload file to Supabase storage
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

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('TdSynnex')
                .getPublicUrl(filePath);


            // Update order with the file URL
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


            // Update local state
            setOrders(prev => prev.map(o =>
                o.id === order.id ? { ...o, return_label: publicUrl } : o
            ));

            // Clear the file input
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

    // Handle product selection - now updates the first product in the array
    const handleProductSelect = async (productId: string) => {
        if (!order || !isActionAuthorized) return;

        const startTime = Date.now();

        // Log product selection attempt
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
            // Get current product IDs array
            const currentProductIds = order.product_id || [];
            const updatedProductIds = [...currentProductIds];

            // If there are existing products, replace the first one
            if (updatedProductIds.length > 0) {
                updatedProductIds[0] = productId;
            } else {
                // If no products exist, add the new one
                updatedProductIds.push(productId);
            }

            // Update the order with the new product array
            const { error } = await supabase
                .from('orders')
                .update({
                    product_id: JSON.stringify(updatedProductIds) // Store as JSON string
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
                    oldProductIds: order.product_id,
                    newProductIds: updatedProductIds,
                    executionTimeMs: Date.now() - startTime,
                    userRole: profile?.role
                },
                status: 'completed'
            });

            // Refresh data to get updated product info
            await fetchOrders();

            // Reset editing state AFTER successful update
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

    const renderStatusDropdown = (field: string, value: any, rowId: string = "order") => {
        const displayValue = value || "-";
        const isEditing = editingField === field && editingRowId === rowId;

        // Check if there's a pending status change for this field
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
                            // Special handling for Returned status
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
                            // If it's Rejected, handleReject will be called via handleSaveEdit
                            if (editedValue !== process.env.NEXT_PUBLIC_STATUS_RETURNED) {
                                console.log('Saving non-return status');
                                handleSaveEdit(field);
                            } else {
                                console.log('Return status - should already be handled by modal');
                            }
                        }}
                        className="bg-teal-600 hover:bg-teal-700 cursor-pointer"
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
                {isActionAuthorized && (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 cursor-pointer"
                        onClick={() => {
                            console.log('Edit button clicked for status');
                            handleEditClick(field, value, rowId);
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
                <div className="flex-1 min-w-0">
                    <b className="block mb-2">Notes:</b>
                    <div className="whitespace-pre-wrap wrap-break-word max-h-30 overflow-y-auto pr-2 border border-gray-200 rounded p-2 bg-white">
                        {order.notes || "No notes available"}
                    </div>
                </div>
                {isActionAuthorized && (
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
            {order.order_status !== process.env.NEXT_PUBLIC_STATUS_AWAITING && profile?.role !== process.env.NEXT_PUBLIC_SUBSCRIBER && (
                <>
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold">Order #{order.order_no}</h1>
                        <p className="text-gray-600 mt-2">Order Date: {order.order_date}</p>
                    </div>
                </>
            )}

            {/* Main content with 70/30 split */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left column - 75% */}
                <div className="lg:w-[72%] space-y-6">
                    {/* Orders Section with Approve/Reject Buttons */}
                    <div>
                        {order.order_status !== process.env.NEXT_PUBLIC_STATUS_AWAITING && profile?.role !== process.env.NEXT_PUBLIC_SUBSCRIBER && (
                            <>
                                <h2 className="text-lg font-semibold mb-4">Order Details</h2>
                            </>
                        )}
                        {order.order_status === process.env.NEXT_PUBLIC_STATUS_AWAITING && profile?.role !== process.env.NEXT_PUBLIC_SUBSCRIBER ? (
                            <>
                                <Table className="hover:bg-white">
                                    <TableBody>
                                        <TableRow>
                                            <TableCell colSpan={2}>
                                                <div className="flex">
                                                    <Button
                                                        onClick={handleApprove}
                                                        className="bg-[#0A4647] hover:bg-[#093131] text-white cursor-pointer flex items-center gap-2"
                                                        disabled={!isActionAuthorized}
                                                    >
                                                        <CheckCircle size={18} />
                                                        Approve Order
                                                    </Button>
                                                    <Button
                                                        onClick={handleReject}
                                                        className="bg-red-700 hover:bg-red-800 text-white cursor-pointer mx-4 flex items-center gap-2"
                                                        variant="destructive"
                                                        disabled={!isActionAuthorized}
                                                    >
                                                        <XCircle size={18} />
                                                        Reject Order
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                                <div className="my-6">
                                    <h1 className="text-2xl font-bold">Order #{order.order_no}</h1>
                                    <p className="text-gray-600 mt-2">Order Date: {order.order_date}</p>
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
                                {/* Total row */}
                                {(order.product_id && order.product_id.length > 0) && (
                                    <TableRow className="bg-gray-50 font-semibold">
                                        <TableCell className="w-[85%] text-right">
                                            Total:
                                        </TableCell>
                                        <TableCell className="w-[15%] border-l text-center">
                                            {order.quantity || 0}
                                        </TableCell>
                                    </TableRow>
                                )}
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
                                    <TableCell colSpan={2} className="py-3">
                                        {renderNotesCell()}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Right column - 25% */}
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
                                        {order.order_status == process.env.NEXT_PUBLIC_STATUS_AWAITING ? (
                                            order.order_status
                                        ) : (
                                            renderStatusDropdown("order_status", order.order_status, "status")
                                        )}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    {renderTrackingSection()}

                    {/* Days Since Shipped & Overdue Status Section */}
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

                                                {/* Agar multiple wins hain toh dropdown show karein */}
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
        </div >
    )
}