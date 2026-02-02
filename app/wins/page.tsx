"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { emailTemplates, sendEmail } from "@/lib/email";
import { logger, logAuth, logError, logSuccess, logWarning, logInfo } from "@/lib/logger";

// Role constants
const shopManager = process.env.NEXT_PUBLIC_SHOPMANAGER;
const admin = process.env.NEXT_PUBLIC_ADMINISTRATOR;
const superSubscriber = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
const subscriber = process.env.NEXT_PUBLIC_SUBSCRIBER;
const statusAwaiting = process.env.NEXT_PUBLIC_STATUS_AWAITING;
const statusRejected = process.env.NEXT_PUBLIC_STATUS_REJECTED;

export default function Page() {
    const { profile, isLoggedIn, loading, user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        orderNumber: "",
        deviceType: "product", // Default to "product" instead of empty
        selectedProducts: [] as string[],
        otherPartNumber: "",
        resellerName: "",
        synnexOrderNumber: "",
        resellerAccountNumber: "",
        customerName: "",
        numberOfUnits: "",
        totalDealRevenue: "",
        purchaseType: "",
        purchaseDate: "",
        howHelped: "",
        submittedBy: profile?.email || "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [products, setProducts] = useState<any[]>([]);
    const [showOtherInput, setShowOtherInput] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const router = useRouter();

    const source = `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/wins`;

    const fetchOrders = async () => {
        const startTime = Date.now();
        try {
            setIsLoading(true);

            // FIX 1: Get ALL wins from ALL users to hide orders from everyone
            const { data: allWins, error: winsError } = await supabase
                .from('wins')
                .select('order_id')
                .not('order_id', 'is', null);

            let excludedOrderIds: string[] = [];
            if (!winsError && allWins) {
                // Create a Set to remove duplicates
                excludedOrderIds = [...new Set(allWins.map(win => win.order_id).filter(id => id))];
            }

            logInfo(
                'db',
                'wins_fetched',
                `Fetched wins from database`,
                {
                    totalWins: allWins?.length || 0,
                    excludedOrdersCount: excludedOrderIds.length,
                    excludedOrderIds
                },
                profile?.id,
                source
            );

            // Now fetch orders
            let query = supabase
                .from('orders')
                .select('*')
                .order('order_no', { ascending: false });

            if (statusAwaiting && statusRejected) {
                query = query.not('order_status', 'in', `(${statusAwaiting},${statusRejected})`);
            }

            if (profile?.role === subscriber) {
                query = query.eq('order_by', profile?.id);
            }

            const { data, error } = await query;

            if (error) {
                logError(
                    'db',
                    'orders_fetch_failed',
                    `Failed to fetch orders: ${error.message}`,
                    error,
                    profile?.id,
                    source
                );
                return;
            }

            // Filter out orders that have ANY wins (from any user)
            const filteredData = data?.filter(order => {
                return !excludedOrderIds.includes(order.id);
            }) || [];

            const formattedData = filteredData.map(order => {
                let productIds: string[] = [];

                if (order.product_id) {
                    if (typeof order.product_id === 'string') {
                        try {
                            const parsed = JSON.parse(order.product_id);
                            if (Array.isArray(parsed)) {
                                productIds = parsed;
                            }
                        } catch {
                            if (order.product_id.includes(',')) {
                                productIds = order.product_id.split(',').map((id: string) => id.trim().replace(/[\[\]"]/g, ''));
                            } else if (order.product_id.trim() !== '') {
                                productIds = [order.product_id.replace(/[\[\]"]/g, '')];
                            }
                        }
                    } else if (Array.isArray(order.product_id)) {
                        productIds = order.product_id;
                    }
                }

                return {
                    ...order,
                    _product_ids: productIds,
                    _has_products: productIds.length > 0
                };
            });

            setOrders(formattedData);

            const executionTime = Date.now() - startTime;
            logSuccess(
                'db',
                'orders_fetch_success',
                `Successfully fetched ${formattedData.length} orders (${data?.length || 0} total, ${excludedOrderIds.length} excluded due to existing wins)`,
                {
                    totalOrders: data?.length || 0,
                    filteredOrders: formattedData.length,
                    excludedOrders: excludedOrderIds.length,
                    executionTime,
                    isSubscriber: profile?.role === subscriber
                },
                profile?.id,
                source
            );

        } catch (error: any) {
            logError(
                'system',
                'orders_fetch_exception',
                `Exception while fetching orders: ${error.message}`,
                error,
                profile?.id,
                source
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch products when order is selected AND deviceType is "product"
    useEffect(() => {
        if (formData.orderNumber && formData.deviceType === "product") {
            const orderNumber = parseInt(formData.orderNumber);
            const selectedOrder = orders.find(order => order.order_no === orderNumber);

            if (selectedOrder) {
                const fetchProductsForOrder = async () => {
                    setLoadingProducts(true);
                    const productIds = selectedOrder._product_ids || [];

                    if (productIds.length > 0) {
                        const { data: products, error } = await supabase
                            .from('products')
                            .select('id, product_name, slug, sku')
                            .in('id', productIds);

                        if (!error && products) {
                            const orderProducts = products.map(product => ({
                                id: product.id,
                                name: product.product_name || "Unknown Product",
                                sku: product.sku || "",
                                quantity: 1
                            }));

                            setProducts(orderProducts);

                            // Auto-select all products by default
                            setFormData(prev => ({
                                ...prev,
                                customerName: selectedOrder.company_name || "",
                                selectedProducts: orderProducts.map(p => p.id),
                                resellerName: selectedOrder.reseller || prev.resellerName,
                                resellerAccountNumber: selectedOrder.crm_account || prev.resellerAccountNumber,
                                numberOfUnits: selectedOrder.dev_opportunity?.toString() || prev.numberOfUnits,
                                totalDealRevenue: selectedOrder.rev_opportunity?.toString() || prev.totalDealRevenue,
                            }));
                        } else {
                            console.error("Error fetching products:", error);
                            setProducts([]);
                        }
                    } else {
                        setProducts([]);
                        // If no products found, auto-switch to "other"
                        setFormData(prev => ({
                            ...prev,
                            deviceType: "other",
                            selectedProducts: []
                        }));
                        setShowOtherInput(true);
                    }
                    setLoadingProducts(false);
                };

                fetchProductsForOrder();

                logInfo(
                    'ui',
                    'order_selected',
                    `Order #${orderNumber} selected`,
                    {
                        orderId: selectedOrder.id,
                        orderNo: orderNumber,
                        customerName: selectedOrder.company_name,
                        productCount: selectedOrder._product_ids?.length || 0
                    },
                    profile?.id,
                    source
                );
            } else {
                setProducts([]);
                setFormData(prev => ({
                    ...prev,
                    customerName: "",
                    selectedProducts: []
                }));
            }
        } else if (formData.orderNumber && formData.deviceType === "other") {
            // If deviceType is "other", just set customer name
            const orderNumber = parseInt(formData.orderNumber);
            const selectedOrder = orders.find(order => order.order_no === orderNumber);

            if (selectedOrder) {
                setFormData(prev => ({
                    ...prev,
                    customerName: selectedOrder.company_name || "",
                    selectedProducts: [],
                    resellerName: selectedOrder.reseller || prev.resellerName,
                    resellerAccountNumber: selectedOrder.crm_account || prev.resellerAccountNumber,
                    numberOfUnits: selectedOrder.dev_opportunity?.toString() || prev.numberOfUnits,
                    totalDealRevenue: selectedOrder.rev_opportunity?.toString() || prev.totalDealRevenue,
                }));
            }
        } else {
            setProducts([]);
            setFormData(prev => ({
                ...prev,
                customerName: "",
                selectedProducts: []
            }));
        }
    }, [formData.orderNumber, formData.deviceType, orders]);

    // Check if user has access to this page
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            logAuth(
                'access_denied',
                'Unauthorized access to wins page',
                profile?.id,
                {
                    isLoggedIn,
                    isVerified: profile?.isVerified,
                    role: profile?.role
                },
                'failed',
                source
            );

            router.replace('/login/?redirect_to=wins');
            return;
        }

        logAuth(
            'page_access',
            `User accessed wins reporting page`,
            profile.id,
            {
                role: profile.role,
                email: profile.email
            },
            'completed',
            source
        );

        fetchOrders();
    }, [loading, isLoggedIn, profile, router]);

    const validateField = (name: string, value: any) => {
        let error = "";

        switch (name) {
            case "submittedBy":
                if (!value.trim()) error = "Email is required";
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Please enter a valid email";
                break;
            case "orderNumber":
                if (!value) error = "Order number is required";
                break;
            case "selectedProducts":
                if (formData.deviceType === "product" && (!Array.isArray(value) || value.length === 0)) {
                    error = "Please select at least one product";
                }
                break;
            case "otherPartNumber":
                if (formData.deviceType === "other" && !value.trim()) error = "Part number is required";
                break;
            case "resellerName":
                if (!value.trim()) error = "Reseller name is required";
                break;
            case "synnexOrderNumber":
                if (!value.trim()) error = "Synnex order number is required";
                break;
            case "resellerAccountNumber":
                if (!value.trim()) error = "Account number is required";
                break;
            case "customerName":
                if (!value.trim()) error = "Customer name is required";
                break;
            case "numberOfUnits":
                if (!value) error = "Number of units is required";
                else if (parseInt(value) < 1) error = "Must be at least 1 unit";
                break;
            case "totalDealRevenue":
                if (!value) error = "Total deal revenue is required";
                else if (parseFloat(value) < 0) error = "Revenue cannot be negative";
                break;
            case "purchaseType":
                if (!value) error = "Please select purchase type";
                break;
            case "purchaseDate":
                if (!value) error = "Purchase date is required";
                break;
            case "howHelped":
                if (!value.trim()) error = "This field is required";
                else if (value.trim().length < 10) error = "Please provide more details";
                break;
        }

        return error;
    };

    const handleProductSelection = (productId: string) => {
        setFormData(prev => {
            const isSelected = prev.selectedProducts.includes(productId);
            let newSelectedProducts;

            if (isSelected) {
                newSelectedProducts = prev.selectedProducts.filter(id => id !== productId);
            } else {
                newSelectedProducts = [...prev.selectedProducts, productId];
            }

            if (newSelectedProducts.length > 0) {
                setErrors(prev => ({ ...prev, selectedProducts: "" }));
            }

            return { ...prev, selectedProducts: newSelectedProducts };
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'radio' && name === "deviceType") {
            const newDeviceType = value;

            // Reset relevant fields when switching device type
            const resetData: any = {
                [name]: newDeviceType,
                selectedProducts: [],
                otherPartNumber: ""
            };

            // If switching to "product", fetch products if order is selected
            if (newDeviceType === "product" && formData.orderNumber) {
                // Products will be fetched by the useEffect
            }

            setFormData(prev => ({
                ...prev,
                ...resetData
            }));

            setShowOtherInput(newDeviceType === "other");

            // Clear errors
            setErrors(prev => ({
                ...prev,
                selectedProducts: "",
                otherPartNumber: ""
            }));

            logInfo(
                'ui',
                'device_type_changed',
                `Device type changed to: ${newDeviceType}`,
                {
                    deviceType: newDeviceType,
                    productCount: newDeviceType === "product" ? formData.selectedProducts.length : 0
                },
                profile?.id,
                source
            );
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        Object.keys(formData).forEach(key => {
            if (key === "selectedProducts" && formData.deviceType === "other") return;
            if (key === "otherPartNumber" && formData.deviceType === "product") return;

            const value = formData[key as keyof typeof formData];
            const error = validateField(key, value);
            if (error) newErrors[key] = error;
        });

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            logWarning(
                'validation',
                'form_validation_failed',
                `Form validation failed with ${Object.keys(newErrors).length} errors`,
                {
                    errors: newErrors,
                    fieldCount: Object.keys(formData).length
                },
                profile?.id,
                source
            );
        }

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const startTime = Date.now();

        logInfo(
            'win',
            'win_submission_started',
            `Win submission started`,
            {
                orderNumber: formData.orderNumber,
                submittedBy: formData.submittedBy,
                productCount: formData.selectedProducts.length,
                deviceType: formData.deviceType
            },
            profile?.id,
            source
        );

        if (validateForm()) {
            try {
                const orderNumber = parseInt(formData.orderNumber);
                const selectedOrder = orders.find(order => order.order_no === orderNumber);

                if (!selectedOrder) {
                    logError(
                        'validation',
                        'order_not_found',
                        `Order not found for win submission`,
                        {
                            orderNumber: formData.orderNumber,
                            availableOrders: orders.length
                        },
                        profile?.id,
                        source
                    );

                    toast.error("Order not found!", {
                        style: { background: "red", color: "white" }
                    });
                    return;
                }

                // FIX: Define winEntries with proper type
                const winEntries: Array<{
                    product_id: string | null;
                    order_id: string;
                    user_id: string | undefined;
                    submitted_by: string;
                    isOther: boolean;
                    otherDesc: string | null;
                    reseller: string;
                    orderHash: string;
                    resellerAccount: string;
                    customerName: string;
                    units: number;
                    deal_rev: number;
                    purchaseType: string;
                    purchaseDate: string;
                    notes: string;
                    created_at: string;
                    updated_at: string;
                }> = [];

                // FIX: Use orderHash from orders table instead of form field
                const orderHash = selectedOrder.orderHash || formData.synnexOrderNumber;

                if (formData.deviceType === "product") {
                    // If multiple products, convert to JSON array string
                    if (formData.selectedProducts.length > 1) {
                        // Multiple products - store as JSON array string
                        const productIdsArray = JSON.stringify(formData.selectedProducts);

                        const winData = {
                            product_id: productIdsArray,
                            order_id: selectedOrder.id,
                            user_id: profile?.id,
                            submitted_by: formData.submittedBy,
                            isOther: false,
                            otherDesc: null,
                            reseller: formData.resellerName,
                            orderHash: orderHash, // Use orderHash from orders table
                            resellerAccount: formData.resellerAccountNumber,
                            customerName: formData.customerName,
                            units: parseInt(formData.numberOfUnits),
                            deal_rev: parseFloat(formData.totalDealRevenue),
                            purchaseType: formData.purchaseType,
                            purchaseDate: formData.purchaseDate,
                            notes: formData.howHelped,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                        winEntries.push(winData);

                        logInfo(
                            'win',
                            'multiple_products_combined',
                            `Multiple products combined into single win entry`,
                            {
                                productIds: formData.selectedProducts,
                                productCount: formData.selectedProducts.length,
                                storedAs: productIdsArray,
                                orderHashUsed: orderHash
                            },
                            profile?.id,
                            source
                        );
                    } else if (formData.selectedProducts.length === 1) {
                        // Single product - store as single ID
                        for (const productId of formData.selectedProducts) {
                            const winData = {
                                product_id: productId,
                                order_id: selectedOrder.id,
                                user_id: profile?.id,
                                submitted_by: formData.submittedBy,
                                isOther: false,
                                otherDesc: null,
                                reseller: formData.resellerName,
                                orderHash: orderHash, // Use orderHash from orders table
                                resellerAccount: formData.resellerAccountNumber,
                                customerName: formData.customerName,
                                units: parseInt(formData.numberOfUnits),
                                deal_rev: parseFloat(formData.totalDealRevenue),
                                purchaseType: formData.purchaseType,
                                purchaseDate: formData.purchaseDate,
                                notes: formData.howHelped,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            };
                            winEntries.push(winData);
                        }
                    }
                } else {
                    // For "other" device type
                    const winData = {
                        product_id: null,
                        order_id: selectedOrder.id,
                        user_id: profile?.id,
                        submitted_by: formData.submittedBy,
                        isOther: true,
                        otherDesc: formData.otherPartNumber,
                        reseller: formData.resellerName,
                        orderHash: orderHash, // Use orderHash from orders table
                        resellerAccount: formData.resellerAccountNumber,
                        customerName: formData.customerName,
                        units: parseInt(formData.numberOfUnits),
                        deal_rev: parseFloat(formData.totalDealRevenue),
                        purchaseType: formData.purchaseType,
                        purchaseDate: formData.purchaseDate,
                        notes: formData.howHelped,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    winEntries.push(winData);
                }

                logInfo(
                    'win',
                    'win_data_prepared',
                    `Win data prepared for insertion`,
                    {
                        winEntriesCount: winEntries.length,
                        deviceType: formData.deviceType,
                        selectedProductsCount: formData.selectedProducts.length,
                        orderId: selectedOrder.id,
                        orderNo: selectedOrder.order_no,
                        orderHashUsed: orderHash
                    },
                    profile?.id,
                    source
                );

                // Insert into wins table
                const { data, error } = await supabase
                    .from('wins')
                    .insert(winEntries)
                    .select();

                if (error) {
                    throw error;
                }

                const executionTime = Date.now() - startTime;

                logSuccess(
                    'win',
                    'win_submission_success',
                    `Win reported successfully for order #${selectedOrder.order_no}`,
                    {
                        winCount: data?.length || 0,
                        orderId: selectedOrder.id,
                        orderNo: selectedOrder.order_no,
                        orderHash: orderHash,
                        submittedBy: formData.submittedBy,
                        customerName: formData.customerName,
                        units: winEntries[0].units,
                        dealRevenue: winEntries[0].deal_rev,
                        executionTime,
                        deviceType: formData.deviceType,
                        isOther: formData.deviceType === "other",
                        productCount: formData.selectedProducts.length
                    },
                    profile?.id,
                    source
                );

                toast.success(`Win reported successfully for ${formData.selectedProducts.length} product${formData.selectedProducts.length > 1 ? 's' : ''}!`, {
                    style: { background: "black", color: "white" }
                });

                // Send win email for each product (or one for "other")
                if (formData.deviceType === "product") {
                    if (formData.selectedProducts.length === 1) {
                        // Single product - send single email
                        winEntries.forEach(winEntry => {
                            // For single product, create product details array
                            const product = products.find(p => p.id === winEntry.product_id);
                            const productDetails = [{
                                name: product?.name || "Product",
                                quantity: 1,
                                sku: product?.sku || ""
                            }];

                            sendWinEmail({
                                ...winEntry,
                                order_no: selectedOrder.order_no,
                                order_date: selectedOrder.order_date,
                                product_name: product?.name || "Product",
                                product_sku: product?.sku || "",
                                quantity: 1,
                                multiple_products: false,
                                product_details: productDetails
                            });
                        });
                    } else {
                        // Multiple products - send one email with ALL products listed
                        // Create detailed product list for email
                        const productDetails = formData.selectedProducts.map(productId => {
                            const product = products.find(p => p.id === productId);
                            return {
                                name: product?.name || "Unknown Product",
                                quantity: 1,
                                sku: product?.sku || ""
                            };
                        });

                        sendWinEmail({
                            ...winEntries[0],
                            order_no: selectedOrder.order_no,
                            order_date: selectedOrder.order_date,
                            product_name: `${productDetails.length} Products`,
                            product_sku: "",
                            quantity: productDetails.length,
                            multiple_products: true,
                            product_details: productDetails
                        });
                    }
                } else {
                    // For "other" device type
                    winEntries.forEach(winEntry => {
                        // For "other" product, create product details array
                        const productDetails = [{
                            name: winEntry.otherDesc || "Other Product",
                            quantity: 1,
                            sku: ""
                        }];

                        sendWinEmail({
                            ...winEntry,
                            order_no: selectedOrder.order_no,
                            order_date: selectedOrder.order_date,
                            product_name: winEntry.otherDesc || "Other Product",
                            product_sku: "",
                            quantity: 1,
                            multiple_products: false,
                            product_details: productDetails
                        });
                    });
                }

                // Remove the submitted order from the current state WITHOUT page refresh
                setOrders(prevOrders => prevOrders.filter(order => order.order_no !== orderNumber));

                // Reset form
                setFormData({
                    orderNumber: "", // Clear the selected order from dropdown
                    deviceType: "product", // Reset to "product" default
                    selectedProducts: [],
                    otherPartNumber: "",
                    resellerName: "",
                    synnexOrderNumber: "",
                    resellerAccountNumber: "",
                    customerName: "",
                    numberOfUnits: "",
                    totalDealRevenue: "",
                    purchaseType: "",
                    purchaseDate: "",
                    howHelped: "",
                    submittedBy: profile?.email || "",
                });
                setProducts([]);
                setShowOtherInput(false);

                logInfo(
                    'ui',
                    'form_reset_and_order_removed',
                    `Form reset and order #${orderNumber} removed from dropdown`,
                    {
                        winCount: winEntries.length,
                        removedOrderNumber: orderNumber,
                        orderHashUsed: orderHash
                    },
                    profile?.id,
                    source
                );

            } catch (error: any) {
                const executionTime = Date.now() - startTime;
                logError(
                    'db',
                    'win_submission_failed',
                    `Failed to submit win: ${error.message}`,
                    {
                        error: error.message,
                        orderNumber: formData.orderNumber,
                        submittedBy: formData.submittedBy,
                        productCount: formData.selectedProducts.length,
                        executionTime
                    },
                    profile?.id,
                    source
                );

                toast.error(`Error: ${error.message || "Failed to submit win"}`, {
                    style: { background: "red", color: "white" }
                });
            }
        } else {
            const firstError = Object.keys(errors)[0];
            const element = document.getElementsByName(firstError)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();

                logInfo(
                    'ui',
                    'scroll_to_error',
                    `Scrolled to first validation error: ${firstError}`,
                    {
                        firstError,
                        totalErrors: Object.keys(errors).length
                    },
                    profile?.id,
                    source
                );
            }
        }
    };

    const sendWinEmail = async (oData: any) => {
        const startTime = Date.now();
        try {
            // Prepare product display for email
            let productRowsHTML = '';
            let productText = '';
            let totalQuantity = 0;

            if (oData.product_details && Array.isArray(oData.product_details)) {
                // Multiple products or single product with details array
                productRowsHTML = oData.product_details.map((product: any) => `
                <tr>
                    <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
                </tr>
            `).join('');

                productText = oData.product_details.map((p: any, index: number) =>
                    `${index + 1}. ${p.name} (Quantity: ${p.quantity})`
                ).join('\n');

                totalQuantity = oData.product_details.reduce((sum: number, product: any) =>
                    sum + product.quantity, 0
                );
            } else {
                // Fallback for backward compatibility
                productRowsHTML = `
                <tr>
                    <td style="padding:10px; border:1px solid #ddd;">${oData.product_name}</td>
                </tr>`;
                productText = `Product: ${oData.product_name}\nQuantity: ${oData.quantity}`;
                totalQuantity = parseInt(oData.quantity) || 1;
            }

            // Use internal order_no for Win Reported Order# and orderHash for Synnex Order#
            const template = emailTemplates.reportWinEmail({
                orderNumber: oData.order_no || "N/A", // Internal order number for "Win Reported Order#"
                synnexOrderNumber: oData.orderHash || "N/A", // Synnex order number for "Synnex Order#"
                orderDate: oData.order_date,
                customerName: oData.customerName,
                submittedEmail: oData.submitted_by,
                productName: productText, // For text version - contains product list
                productDetails: productRowsHTML, // For HTML version - contains table rows
                quantity: totalQuantity, // Total quantity across all products
                resellerAccount: oData.resellerAccount,
                units: oData.units,
                pType: oData.purchaseType,
                dealRev: oData.deal_rev,
                reseller: oData.reseller,
                notes: oData.notes,
            });

            const result = await sendEmail({
                to: oData.submitted_by,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });

            const executionTime = Date.now() - startTime;

            if (result.success) {
                logSuccess(
                    'email',
                    'win_email_sent',
                    `Win email sent successfully to ${oData.submitted_by}`,
                    {
                        to: oData.submitted_by,
                        subject: template.subject,
                        orderNumber: oData.order_no,
                        orderHash: oData.orderHash,
                        productCount: oData.product_details?.length || 1,
                        executionTime
                    },
                    profile?.id,
                    source
                );
            } else {
                logWarning(
                    'email',
                    'win_email_failed',
                    `Failed to send win email to ${oData.submitted_by}`,
                    {
                        to: oData.submitted_by,
                        error: result.error,
                        orderNumber: oData.order_no,
                        orderHash: oData.orderHash,
                        executionTime
                    },
                    profile?.id,
                    source
                );
            }

        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            logError(
                'email',
                'win_email_exception',
                `Exception while sending win email: ${error.message}`,
                {
                    error: error.message,
                    to: oData.submitted_by,
                    orderNumber: oData.order_no,
                    orderHash: oData.orderHash,
                    executionTime
                },
                profile?.id,
                source
            );

            toast.error("Failed to send win email. Please try again.");
        }
    };

    if (loading || isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3ba1da] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-4xl">
                        Report a Win
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Report successful deals for orders
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-xl p-5 sm:p-6 md:p-8">
                    <div className="mb-6 md:w-1/2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Submitted by <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="email"
                            name="submittedBy"
                            value={formData.submittedBy}
                            onChange={handleChange}
                            className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition text-sm ${errors.submittedBy
                                ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                }`}
                            placeholder="Enter your email address"
                        />
                        {errors.submittedBy && (
                            <p className="mt-1 text-sm text-red-600">{errors.submittedBy}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Order # <span className="text-red-600">*</span>
                            </label>
                            <select
                                name="orderNumber"
                                value={formData.orderNumber}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition bg-white text-sm ${errors.orderNumber
                                    ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                    : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                    }`}
                            >
                                <option value="">Select an order</option>
                                {orders.map(order => (
                                    <option key={order.id} value={order.order_no}>
                                        Order #{order.order_no}
                                    </option>
                                ))}
                            </select>
                            {orders.length === 0 && !isLoading && (
                                <p className="mt-2 text-sm text-gray-500">
                                    No orders available to report wins.
                                </p>
                            )}
                            {errors.orderNumber && (
                                <p className="mt-1 text-sm text-red-600">{errors.orderNumber}</p>
                            )}
                        </div>

                        {formData.orderNumber && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                                        Choose Product Type <span className="text-red-600">*</span>
                                    </label>

                                    <div className="space-y-3">
                                        <label className="flex items-start space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 h-full">
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="product"
                                                checked={formData.deviceType === "product"}
                                                onChange={handleChange}
                                                className="h-4 w-4 text-[#3ba1da] focus:ring-[#3ba1da] mt-1 flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-gray-700 text-sm">
                                                    Products from this order
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Select one or more products from the order
                                                </p>
                                            </div>
                                        </label>

                                        <label className="flex items-start space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 h-full">
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="other"
                                                checked={formData.deviceType === "other"}
                                                onChange={handleChange}
                                                className="h-4 w-4 text-[#3ba1da] focus:ring-[#3ba1da] mt-1 flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-gray-700 text-sm">Other Product</span>
                                                <p className="text-xs text-gray-500 mt-1">Select if you have a different part</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Show products only when "Products from this order" is selected */}
                                {formData.deviceType === "product" && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Select Products <span className="text-red-600">*</span>
                                            <span className="text-xs text-gray-500 font-normal ml-2">
                                                (Select one or more)
                                            </span>
                                        </label>

                                        {loadingProducts ? (
                                            <div className="flex justify-center items-center p-4 border border-gray-200 rounded-lg">
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#3ba1da]"></div>
                                                <span className="ml-2 text-sm text-gray-600">Loading products...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                                                    {products.length > 0 ? (
                                                        products.map((product, index) => (
                                                            <label
                                                                key={product.id || index}
                                                                className="flex items-start space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.selectedProducts.includes(product.id)}
                                                                    onChange={() => handleProductSelection(product.id)}
                                                                    className="h-4 w-4 text-[#3ba1da] focus:ring-[#3ba1da] mt-1 flex-shrink-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="font-medium text-gray-700 text-sm">
                                                                        {product.name}
                                                                    </span>
                                                                    {product.sku && (
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            SKU: {product.sku}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-xs text-gray-500">
                                                                        Quantity: {product.quantity}
                                                                    </p>
                                                                </div>
                                                            </label>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-gray-500 p-2">
                                                            No products found for this order
                                                        </p>
                                                    )}
                                                </div>

                                                {errors.selectedProducts && (
                                                    <p className="mt-1 text-sm text-red-600">{errors.selectedProducts}</p>
                                                )}

                                                {formData.selectedProducts.length > 0 && (
                                                    <p className="mt-2 text-sm text-gray-600">
                                                        Selected: {formData.selectedProducts.length} product{formData.selectedProducts.length > 1 ? 's' : ''}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Show other input only when "Other Product" is selected */}
                                {showOtherInput && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Please specify Part# <span className="text-red-600">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="otherPartNumber"
                                            value={formData.otherPartNumber}
                                            onChange={handleChange}
                                            className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition text-sm ${errors.otherPartNumber
                                                ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                                : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                                }`}
                                            placeholder="Enter part number"
                                        />
                                        {errors.otherPartNumber && (
                                            <p className="mt-1 text-sm text-red-600">{errors.otherPartNumber}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Rest of the form remains the same */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Reseller Name <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                name="resellerName"
                                value={formData.resellerName}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition text-sm ${errors.resellerName
                                    ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                    : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                    }`}
                                placeholder="Enter reseller name"
                            />
                            {errors.resellerName && (
                                <p className="mt-1 text-sm text-red-600">{errors.resellerName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Synnex Order# <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                name="synnexOrderNumber"
                                value={formData.synnexOrderNumber}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition text-sm ${errors.synnexOrderNumber
                                    ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                    : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                    }`}
                                placeholder="Enter Synnex order number"
                            />
                            {errors.synnexOrderNumber && (
                                <p className="mt-1 text-sm text-red-600">{errors.synnexOrderNumber}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Reseller Account # <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                name="resellerAccountNumber"
                                value={formData.resellerAccountNumber}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition text-sm ${errors.resellerAccountNumber
                                    ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                    : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                    }`}
                                placeholder="Enter account number"
                            />
                            {errors.resellerAccountNumber && (
                                <p className="mt-1 text-sm text-red-600">{errors.resellerAccountNumber}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Customer Name <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="text"
                                name="customerName"
                                value={formData.customerName}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition text-sm ${errors.customerName
                                    ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                    : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                    }`}
                                placeholder="Customer name"
                            />
                            {errors.customerName && (
                                <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Number of Units <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="number"
                                name="numberOfUnits"
                                value={formData.numberOfUnits}
                                onChange={handleChange}
                                min="1"
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition text-sm ${errors.numberOfUnits
                                    ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                    : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                    }`}
                                placeholder="0"
                            />
                            {errors.numberOfUnits && (
                                <p className="mt-1 text-sm text-red-600">{errors.numberOfUnits}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Total Deal Revenue ($) <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="number"
                                name="totalDealRevenue"
                                value={formData.totalDealRevenue}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition text-sm ${errors.totalDealRevenue
                                    ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                    : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                    }`}
                                placeholder="0.00"
                            />
                            {errors.totalDealRevenue && (
                                <p className="mt-1 text-sm text-red-600">{errors.totalDealRevenue}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Is this a one time purchase or roll-out? <span className="text-red-600">*</span>
                            </label>
                            <select
                                name="purchaseType"
                                value={formData.purchaseType}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition bg-white text-sm ${errors.purchaseType
                                    ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                    : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                    }`}
                            >
                                <option value="">Select option</option>
                                <option value="one-time">One Time Purchase</option>
                                <option value="roll-out">Roll-out</option>
                            </select>
                            {errors.purchaseType && (
                                <p className="mt-1 text-sm text-red-600">{errors.purchaseType}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Date of Purchase <span className="text-red-600">*</span>
                            </label>
                            <input
                                type="date"
                                name="purchaseDate"
                                value={formData.purchaseDate}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition text-sm ${errors.purchaseDate
                                    ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                    : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                    }`}
                            />
                            {errors.purchaseDate && (
                                <p className="mt-1 text-sm text-red-600">{errors.purchaseDate}</p>
                            )}
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            How did TD SYNNEX SURFACE help you close this deal? <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            name="howHelped"
                            value={formData.howHelped}
                            onChange={handleChange}
                            rows={4}
                            className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition resize-none text-sm ${errors.howHelped
                                ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                }`}
                            placeholder="Describe how TD SYNNEX SURFACE contributed to closing this deal..."
                        />
                        {errors.howHelped && (
                            <p className="mt-1 text-sm text-red-600">{errors.howHelped}</p>
                        )}
                    </div>

                    <div className="flex justify-center pt-4">
                        <button
                            type="submit"
                            className="w-48 rounded-lg bg-[#3ba1da] cursor-pointer px-6 py-2.5 text-base font-semibold text-white transition-all duration-300 hover:bg-[#41abd6] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#3ba1da]/50"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}