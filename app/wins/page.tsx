"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { emailTemplates, sendEmail } from "@/lib/email";

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
        deviceType: "product",
        selectedProduct: "",
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
    const [product, setProduct] = useState("");
    const [showOtherInput, setShowOtherInput] = useState(false);
    const router = useRouter();

    const fetchOrders = async () => {
        try {
            setIsLoading(true);

            let query = supabase
                .from('orders')
                .select(`
                    *,
                    products:product_id (
                        id,
                        product_name,
                        slug,
                        sku
                    )
                `)
                .order('order_no', { ascending: false });

            if (statusAwaiting && statusRejected) {
                query = query.not('order_status', 'in', `(${statusAwaiting},${statusRejected})`);
            }

            if (profile?.role === subscriber) {
                query = query.eq('order_by', profile?.id);
            }

            const { data, error } = await query;

            if (error) {
                return;
            }

            // Format the data
            const formattedData = data?.map(order => ({
                ...order,
                product_name: order.products?.product_name || "Standard Device Package"
            })) || [];

            setOrders(formattedData);

        } catch (error) {
        } finally {
            setIsLoading(false);
        }
    };

    // Set contact name when order is selected
    useEffect(() => {
        if (formData.orderNumber) {
            // IMPORTANT: Convert string to number for comparison
            const orderNumber = parseInt(formData.orderNumber);
            const selectedOrder = orders.find(order => order.order_no === orderNumber);


            if (selectedOrder) {
                // Get product name from the joined data
                const productName = selectedOrder.products?.product_name ||
                    selectedOrder.product_name ||
                    "Standard Device Package";


                // Set the product name for display
                setProduct(productName);

                // Update form data with auto-filled values
                setFormData(prev => ({
                    ...prev,
                    customerName: selectedOrder.company_name || "",
                    selectedProduct: productName,
                    // Auto-fill other fields from order
                    resellerName: selectedOrder.reseller || prev.resellerName,
                    resellerAccountNumber: selectedOrder.crm_account || prev.resellerAccountNumber,
                    numberOfUnits: selectedOrder.dev_opportunity?.toString() || prev.numberOfUnits,
                    totalDealRevenue: selectedOrder.rev_opportunity?.toString() || prev.totalDealRevenue,
                }));
            } else {
                // Reset if order not found
                setProduct("");
                setFormData(prev => ({
                    ...prev,
                    customerName: "",
                    selectedProduct: ""
                }));
            }
        } else {
            setProduct("");
            setFormData(prev => ({
                ...prev,
                customerName: "",
                selectedProduct: ""
            }));
        }
    }, [formData.orderNumber, orders]);

    // Check if user has access to this page
    useEffect(() => {
        if (loading) return;

        // Check if user is authenticated and verified
        if (!isLoggedIn || !profile?.isVerified) {
            router.replace('/login/?redirect_to=wins');
            return;
        }

        // ShopManager should not have access to this page
        // if (profile?.role === shopManager) {
        //     router.replace('/product-category/alldevices');
        //     return;
        // }

        // User is authorized, fetch orders
        fetchOrders();
    }, [loading, isLoggedIn, profile, router]);

    const validateField = (name: string, value: string) => {
        let error = "";

        switch (name) {
            case "submittedBy":
                if (!value.trim()) error = "Email is required";
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Please enter a valid email";
                break;
            case "orderNumber":
                if (!value) error = "Order number is required";
                break;
            case "selectedProduct":
                if (formData.deviceType === "product" && !value) error = "Please select a product";
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'radio') {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                selectedProduct: value === "other" ? "" : prev.selectedProduct,
                otherPartNumber: value === "product" ? "" : prev.otherPartNumber
            }));
            setShowOtherInput(value === "other");

            // Clear errors when switching
            setErrors(prev => ({
                ...prev,
                selectedProduct: "",
                otherPartNumber: ""
            }));
        } else {
            setFormData(prev => {
                const newData = { ...prev, [name]: value };
                return newData;
            });
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        Object.keys(formData).forEach(key => {
            if (key === "selectedProduct" && formData.deviceType === "other") return;
            if (key === "otherPartNumber" && formData.deviceType === "product") return;

            const value = formData[key as keyof typeof formData] as string;
            const error = validateField(key, value);
            if (error) newErrors[key] = error;
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            try {
                // Find the selected order - convert to number for comparison
                const orderNumber = parseInt(formData.orderNumber);
                const selectedOrder = orders.find(order => order.order_no === orderNumber);

                if (!selectedOrder) {
                    toast.error("Order not found!", {
                        style: { background: "red", color: "white" }
                    });
                    return;
                }

                // Prepare win data for your specific table structure
                const winData = {
                    product_id: formData.deviceType === "product" ? selectedOrder.product_id : null,
                    order_id: selectedOrder.id,
                    user_id: profile?.id,
                    submitted_by: formData.submittedBy,
                    isOther: formData.deviceType === "other",
                    otherDesc: formData.deviceType === "other" ? formData.otherPartNumber : null,
                    reseller: formData.resellerName,
                    orderHash: formData.synnexOrderNumber, // Assuming orderHash is Synnex order number
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


                // Insert into wins table
                const { data, error } = await supabase
                    .from('wins')
                    .insert([winData])
                    .select();

                if (error) {
                    throw error;
                }

                toast.success("Win reported successfully!", {
                    style: { background: "black", color: "white" }
                });

                sendWinEmail({
                    ...winData,
                    order_no: selectedOrder.order_no,
                    order_date: selectedOrder.order_date,
                    product_sku: selectedOrder.products?.sku || "",
                    quantity: selectedOrder.quantity || "1"
                });

                // Reset form
                setFormData({
                    orderNumber: "",
                    deviceType: "product",
                    selectedProduct: "",
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
                setProduct("");
                setShowOtherInput(false);

            } catch (error: any) {
                toast.success(`Error: ${error.message || "Failed to submit win"}`, {
                    style: { background: "red", color: "white" }
                });
            }
        } else {
            // Scroll to first error
            const firstError = Object.keys(errors)[0];
            const element = document.getElementsByName(firstError)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
        }
    };


    const sendWinEmail = async (oData: any) => {
        try {
            const template = emailTemplates.reportWinEmail({
                orderNumber: oData.orderHash,
                orderDate: oData.order_date,
                customerName: oData.customerName,
                submittedEmail: oData.submitted_by,

                productName: oData.product_sku,
                quantity: oData.quantity,

                resellerAccount: oData.resellerAccount,
                units: oData.units,
                pType: oData.purchaseType,
                dealRev: oData.deal_rev,
                reseller: oData.reseller,
                notes: oData.notes,
            });

            await sendEmail({
                to: oData.submitted_by,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });

        } catch (error) {
            toast.error("Failed to send checkout email. Please try again.");
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
                {/* Form Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-4xl">
                        Report a Win
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Report successful deals for orders
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-xl p-5 sm:p-6 md:p-8">
                    {/* Submitted By - Half width on large screens */}
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

                    {/* Order Number and Product Selection Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Order Number - Left side */}
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

                        {/* Device Selection (Only shown if order number is selected) - Right side */}
                        {formData.orderNumber && (
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    {/* Pre-defined product */}
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
                                            <span className="font-medium text-gray-700 text-sm block line-clamp-2">
                                                {product || "Select an order to see product"}
                                            </span>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Product from selected order
                                            </p>
                                        </div>
                                    </label>

                                    {/* Other option */}
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
                                            <span className="font-medium text-gray-700 text-sm">Other</span>
                                            <p className="text-xs text-gray-500 mt-1">Select if you have a different part</p>
                                        </div>
                                    </label>
                                </div>

                                {/* Other Part Number (shown when "other" is selected) */}
                                {showOtherInput && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            If other please specify Part# <span className="text-red-600">*</span>
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

                    {/* Reseller Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Reseller Name */}
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

                        {/* Synnex Order# */}
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

                    {/* Account and Customer Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Reseller Account # */}
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

                        {/* Customer Name (auto-filled but editable) */}
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

                    {/* Units and Revenue Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Number of Units */}
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

                        {/* Total Deal Revenue */}
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

                    {/* Purchase Type and Date Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Purchase Type */}
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

                        {/* Date of Purchase */}
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

                    {/* How TD SYNNEX SURFACE helped */}
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

                    {/* Submit Button */}
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