"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

// Single product for each order number
const ORDER_PRODUCT_MAPPING: Record<number, string> = {
    1: "Surface Pro 11 - Snapdragon X Plus – 24GB – 1TBGB SSD -12″ w/Type Cover (#EP2-33681)",
    2: "Surface Laptop 7 - Snapdragon X Elite – 32GB – 1TBGB SSD -13.8″ (#EP2-33682)",
    3: "Surface Pro Keyboard - Black (#EP2-33683)",
    4: "Surface Laptop Studio 2 - i7 – 32GB – 2TBGB SSD -14.4″ (#EP2-33684)",
    5: "Surface Dock 2 (#EP2-33685)",
    6: "Surface Pro 9 - i5 – 16GB – 256GB SSD -13″ (#EP2-33686)",
    7: "Surface Slim Pen 2 (#EP2-33687)",
    8: "Surface Arc Mouse (#EP2-33688)",
    9: "Surface Laptop Go 3 - i5 – 8GB – 256GB SSD -12.4″ (#EP2-33689)",
    10: "Surface Headphones 2+ (#EP2-33690)",
    11: "Standard Device Package (#EP2-33691)",
    12: "Premium Device Package (#EP2-33692)",
    13: "Enterprise Device Package (#EP2-33693)",
    14: "Surface Pro Signature Keyboard (#EP2-33694)",
    15: "Surface Slim Pen 2 (#EP2-33695)",
    16: "Surface Adaptive Kit (#EP2-33696)",
    17: "Surface Dock 2 (#EP2-33697)",
    18: "Surface Earbuds (#EP2-33698)",
    19: "Surface Laptop Studio (#EP2-33699)",
    20: "Surface Pro X (#EP2-33700)"
};

// Customer names based on order number
const ORDER_CUSTOMER_MAPPING: Record<number, string> = {
    1: "GEML Corporation",
    2: "Tech Solutions Inc",
    3: "Digital Innovations LLC",
    4: "Global Systems Co",
    5: "Advanced Technologies Ltd",
    6: "Enterprise Solutions Group",
    7: "Innovative Systems Inc",
    8: "NextGen Technologies",
    9: "Smart Solutions Corp",
    10: "Future Tech Enterprises",
    11: "Alpha Business Systems",
    12: "Beta Tech Solutions",
    13: "Gamma Innovations",
    14: "Delta Systems Co",
    15: "Epsilon Technologies",
    16: "Zeta Business Group",
    17: "Eta Systems Inc",
    18: "Theta Tech Corp",
    19: "Iota Solutions Ltd",
    20: "Kappa Enterprises"
};

export default function Page() {
    const [formData, setFormData] = useState({
        orderNumber: "",
        deviceType: "product", // "product" or "other"
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
        submittedBy: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [product, setProduct] = useState("");
    const [showOtherInput, setShowOtherInput] = useState(false);
    const router = useRouter();
    const { profile, isLoggedIn, loading, user } = useAuth();

    useEffect(() => {
        if (formData.orderNumber) {
            const orderNum = parseInt(formData.orderNumber);
            const product = ORDER_PRODUCT_MAPPING[orderNum as keyof typeof ORDER_PRODUCT_MAPPING] || "Standard Device Package";
            setProduct(product);

            const customer = ORDER_CUSTOMER_MAPPING[orderNum as keyof typeof ORDER_CUSTOMER_MAPPING] || "General Customer";
            setFormData(prev => ({
                ...prev,
                customerName: customer,
                selectedProduct: product
            }));
        } else {
            setProduct("");
            setFormData(prev => ({
                ...prev,
                customerName: "",
                selectedProduct: ""
            }));
        }
    }, [formData.orderNumber]);



    const [authChecked, setAuthChecked] = useState(false);
    const [authInitialized, setAuthInitialized] = useState(false);


    // Handle auth check - IMPROVED VERSION
    useEffect(() => {
        // Only run auth check after auth is fully initialized
        if (loading) {
            // Still loading auth state
            console.log("AuthContext is still loading...");
            return;
        }

        // AuthContext loading is done, mark as initialized
        console.log("AuthContext loaded - User:", user, "Profile:", profile, "isLoggedIn:", isLoggedIn);
        setAuthInitialized(true);

        // Now check authentication status
        if (!isLoggedIn || profile?.isVerified === false && !profile) {
            console.log("User not authenticated, redirecting to login");
            router.replace('/login/?redirect_to=wins');
        } else {
            console.log("User authenticated, setting authChecked to true");
            setAuthChecked(true);
        }
    }, [loading, isLoggedIn, profile, user, router]);

    // Fetch data only after auth is confirmed AND initialized
    useEffect(() => {
        if (!authChecked || !authInitialized) {
            return; // Don't fetch data until auth is fully checked AND initialized
        }

        console.log("Auth confirmed and initialized, fetching data...");
    }, [authChecked, authInitialized]);


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
            setFormData(prev => ({ ...prev, [name]: value }));
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            console.log("Form submitted:", formData);
            // Handle form submission here
            alert("Form submitted successfully!");
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

    return (
        <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Form Header */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 sm:text-5xl">
                        Report a Win
                    </h1>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 md:p-10">

                    {/* Submitted By */}
                    <div className="mb-8">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Submitted by*
                        </label>
                        <input
                            type="email"
                            name="submittedBy"
                            value={formData.submittedBy}
                            onChange={handleChange}
                            className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition ${errors.submittedBy
                                ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                }`}
                            placeholder="Enter your email address"
                        />
                        {errors.submittedBy && (
                            <p className="mt-1 text-sm text-red-600">{errors.submittedBy}</p>
                        )}
                    </div>

                    {/* Order Number */}
                    <div className="mb-8">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            TD SYNNEX SURFACE Order #*
                        </label>
                        <select
                            name="orderNumber"
                            value={formData.orderNumber}
                            onChange={handleChange}
                            className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition bg-white ${errors.orderNumber
                                ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                }`}
                        >
                            <option value="">Select order number (1-20)</option>
                            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                <option key={num} value={num}>
                                    Order #{num}
                                </option>
                            ))}
                        </select>
                        {errors.orderNumber && (
                            <p className="mt-1 text-sm text-red-600">{errors.orderNumber}</p>
                        )}
                    </div>

                    {/* Device Selection (Only shown if order number is selected) */}
                    {formData.orderNumber && (
                        <div className="mb-8 space-y-6">
                            {/* Product selection - Direct radio buttons */}
                            <div className="space-y-4">
                                {/* Pre-defined product */}
                                <label className="flex items-start space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <input
                                        type="radio"
                                        name="deviceType"
                                        value="product"
                                        checked={formData.deviceType === "product"}
                                        onChange={handleChange}
                                        className="h-5 w-5 text-[#3ba1da] focus:ring-[#3ba1da] mt-1"
                                    />
                                    <div className="flex-1">
                                        <span className="font-medium text-gray-700">{product}</span>
                                        <p className="text-sm text-gray-500 mt-1">Pre-defined product for Order #{formData.orderNumber}</p>
                                    </div>
                                </label>

                                {/* Other option */}
                                <label className="flex items-start space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <input
                                        type="radio"
                                        name="deviceType"
                                        value="other"
                                        checked={formData.deviceType === "other"}
                                        onChange={handleChange}
                                        className="h-5 w-5 text-[#3ba1da] focus:ring-[#3ba1da] mt-1"
                                    />
                                    <div className="flex-1">
                                        <span className="font-medium text-gray-700">Other</span>
                                        <p className="text-sm text-gray-500 mt-1">Select if you have a different part</p>
                                    </div>
                                </label>
                            </div>

                            {/* Other Part Number (shown when "other" is selected) */}
                            {showOtherInput && (
                                <div className="mt-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        If other please specify Part#*
                                    </label>
                                    <input
                                        type="text"
                                        name="otherPartNumber"
                                        value={formData.otherPartNumber}
                                        onChange={handleChange}
                                        className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition ${errors.otherPartNumber
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

                    {/* Reseller Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Reseller Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Reseller Name*
                            </label>
                            <input
                                type="text"
                                name="resellerName"
                                value={formData.resellerName}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition ${errors.resellerName
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
                                Synnex Order#*
                            </label>
                            <input
                                type="text"
                                name="synnexOrderNumber"
                                value={formData.synnexOrderNumber}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition ${errors.synnexOrderNumber
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Reseller Account # */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Reseller Account #*
                            </label>
                            <input
                                type="text"
                                name="resellerAccountNumber"
                                value={formData.resellerAccountNumber}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition ${errors.resellerAccountNumber
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
                                Customer Name*
                            </label>
                            <input
                                type="text"
                                name="customerName"
                                value={formData.customerName}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition ${errors.customerName
                                    ? "border-red-500 focus:ring-2 focus:ring-red-300"
                                    : "border-gray-300 focus:border-[#3ba1da] focus:ring-2 focus:ring-[#3ba1da]/30"
                                    }`}
                                placeholder="Customer name"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Auto-filled based on order number - can be edited
                            </p>
                            {errors.customerName && (
                                <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
                            )}
                        </div>
                    </div>

                    {/* Units and Revenue Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Number of Units */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Number of Units*
                            </label>
                            <input
                                type="number"
                                name="numberOfUnits"
                                value={formData.numberOfUnits}
                                onChange={handleChange}
                                min="1"
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition ${errors.numberOfUnits
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
                                Total Deal Revenue ($)*
                            </label>
                            <input
                                type="number"
                                name="totalDealRevenue"
                                value={formData.totalDealRevenue}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition ${errors.totalDealRevenue
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Purchase Type */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Is this a one time purchase or roll-out?*
                            </label>
                            <select
                                name="purchaseType"
                                value={formData.purchaseType}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition bg-white ${errors.purchaseType
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
                                Date of Purchase*
                            </label>
                            <input
                                type="date"
                                name="purchaseDate"
                                value={formData.purchaseDate}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition ${errors.purchaseDate
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
                    <div className="mb-10">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            How did TD SYNNEX SURFACE help you close this deal?*
                        </label>
                        <textarea
                            name="howHelped"
                            value={formData.howHelped}
                            onChange={handleChange}
                            rows={5}
                            className={`w-full rounded-lg border px-4 py-3 text-gray-900 focus:outline-none transition resize-none ${errors.howHelped
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
                    <div className="flex justify-center pt-6">
                        <button
                            type="submit"
                            className="w-56 rounded-lg bg-[#3ba1da] px-8 py-3 text-lg font-semibold text-white transition-all duration-300 hover:bg-[#41abd6] hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#3ba1da]/50"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}