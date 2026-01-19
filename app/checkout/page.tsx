"use client"

import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { AiOutlineShoppingCart } from "react-icons/ai";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function Page() {
  const router = useRouter();
  const { profile, isLoggedIn, loading, user } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    cartItems,
    isLoading: cartLoading,
    cartCount,
    refreshCart,
    clearCart,
    removeFromCart
  } = useCart();

  // Form state
  const [formData, setFormData] = useState({
    sales_executive: "",
    se_email: "",
    sales_manager: "",
    sm_email: "",
    reseller: "",
    dev_opportunity: 1,
    dev_budget: 1800,
    rev_opportunity: 1800,
    crm_account: "",
    segment: "",
    order_status: "pending",
    vertical: "",
    current_manufacturer: "",
    use_case: "",
    currently_running: "",
    licenses: "",
    isCopilot: "",
    isSecurity: "",
    current_protection: "",
    company_name: "",
    contact_name: "",
    email: "",
    address: "",
    state: "",
    city: "",
    zip: "",
    desired_date: "",
    notes: "",
    isTerms: false
  });

  const cartItem = cartItems[0]?.product;
  console.log("cartItem", cartItem)

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        sales_executive: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        se_email: profile.email || "",
        reseller: profile.reseller || ""
      }));
    }
  }, [profile]);

  // Calculate revenue opportunity when device opportunity or budget changes
  useEffect(() => {
    const revenue = formData.dev_opportunity * formData.dev_budget;
    setFormData(prev => ({
      ...prev,
      rev_opportunity: revenue
    }));
  }, [formData.dev_opportunity, formData.dev_budget]);

  useEffect(() => {
    refreshCart();
  }, []);

  useEffect(() => {
    if (loading) {
      console.log("AuthContext is still loading...");
      return;
    }

    console.log("AuthContext loaded - User:", user, "Profile:", profile, "isLoggedIn:", isLoggedIn);
    setAuthInitialized(true);

    if (!isLoggedIn || (profile?.isVerified === false && !profile)) {
      console.log("User not authenticated, redirecting to login");
      router.replace('/login/?redirect_to=checkout');
    } else {
      console.log("User authenticated, setting authChecked to true");
      setAuthChecked(true);
    }
  }, [loading, isLoggedIn, profile, user, router]);

  useEffect(() => {
    if (!authChecked || !authInitialized) {
      return;
    }
    console.log("Auth confirmed and initialized, fetching data...");
  }, [authChecked, authInitialized]);

  useEffect(() => {
    if (cartCount != 1) {
      if (!cartLoading) {
        router.replace('/cart')
      }
    }
  }, [cartCount, cartLoading]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === "" ? "" : parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Get quarter based on date
  const getQuarter = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    if (month >= 1 && month <= 3) return "Q1";
    if (month >= 4 && month <= 6) return "Q2";
    if (month >= 7 && month <= 9) return "Q3";
    return "Q4";
  };

  // Validate individual field
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

    if (name === 'desired_date') {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (value && selectedDate < today) {
        return "Delivery date cannot be in the past";
      }
    }

    if (name === 'isTerms' && !value) {
      return "You must agree to the Terms & Conditions";
    }

    // Required field validation
    if (value === "" || value === null || value === undefined) {
      return `${fieldName} is required`;
    }

    return "";
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const requiredFields = [
      'sales_executive', 'se_email', 'sales_manager', 'sm_email', 'reseller',
      'dev_opportunity', 'dev_budget', 'crm_account', 'segment', 'vertical',
      'current_manufacturer', 'use_case', 'currently_running', 'licenses',
      'isCopilot', 'isSecurity', 'current_protection', 'company_name',
      'contact_name', 'email', 'address', 'state', 'city', 'zip', 'desired_date',
      'isTerms'
    ];

    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Validate all required fields
    for (const field of requiredFields) {
      const value = formData[field as keyof typeof formData];
      const error = validateField(field, value);

      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);

    if (!isValid) {
      // Show toast for validation errors
      toast.error("Please fill in all required fields correctly", {
        style: { background: "red", color: "white" }
      });

      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        }
      }

      return false;
    }

    if (!cartItem) {
      toast.error("Cart Error", {
        description: "No product found in cart. Please add a product to continue.",
        style: { background: "red", color: "white" }
      });
      return false;
    }

    return true;
  };

  // Prepare data for submission
  const prepareOrderData = () => {
    const now = new Date();
    const orderDate = new Date(formData.desired_date);

    return {
      product_id: cartItem?.id || "",
      order_by: profile?.id || "",
      quantity: 1,
      sales_executive: formData.sales_executive,
      se_email: formData.se_email,
      sales_manager: formData.sales_manager,
      sm_email: formData.sm_email,
      reseller: formData.reseller,
      dev_opportunity: formData.dev_opportunity,
      dev_budget: formData.dev_budget,
      rev_opportunity: formData.rev_opportunity,
      crm_account: formData.crm_account,
      segment: formData.segment,
      vertical: formData.vertical,
      current_manufacturer: formData.current_manufacturer,
      use_case: formData.use_case,
      currently_running: formData.currently_running,
      licenses: formData.licenses,
      isCopilot: formData.isCopilot,
      isSecurity: formData.isSecurity,
      current_protection: formData.current_protection,
      company_name: formData.company_name,
      contact_name: formData.contact_name,
      email: formData.email,
      address: formData.address,
      state: formData.state,
      order_status: process.env.NEXT_PUBLIC_STATUS_AWAITING,
      city: formData.city,
      zip: formData.zip,
      desired_date: formData.desired_date,
      notes: formData.notes || null,
      isTerms: formData.isTerms,
      order_date: formData.desired_date,
      order_month: orderDate.toLocaleString('default', { month: 'long' }),
      order_year: orderDate.getFullYear(),
      order_quarter: getQuarter(formData.desired_date),
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    // Show loading toast
    const loadingToast = toast.loading("Processing your order...", {
      style: { background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd" },
    });

    try {
      const orderData = prepareOrderData();
      console.log("Submitting order data:", orderData);

      // Insert into database
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select();

      if (error) {
        throw error;
      }

      const stockQty = Number(cartItem?.stock_quantity) - 1;
      const withCustomerQty = Number(cartItem?.withCustomer) + 1;

      // FIXED: Use 'error' instead of 'perror'
      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock_quantity: stockQty,
          withCustomer: withCustomerQty,
        })
        .eq('id', cartItem?.id);

      if (updateError) throw updateError; // FIXED: Throw updateError

      console.log("Order submitted successfully:", data);

      // Remove product from cart after successful order
      if (cartItem?.id) {
        await removeFromCart(cartItem.id);
      }

      // Dismiss loading toast and show success toast
      toast.dismiss(loadingToast);
      toast.success("Order Placed Successfully!", {
        style: { background: "black", color: "white" }
      });

      // Redirect to order confirmation page
      setTimeout(() => {
        router.push('/thanks');
      }, 2000);

    } catch (error: any) {
      console.error("Error submitting order:", error);

      // Dismiss loading toast and show error toast
      toast.dismiss(loadingToast);

      let errorMessage = "Failed to place order. Please try again.";

      if (error.message.includes('row-level security')) {
        errorMessage = "Database security error. Please contact support.";
      } else if (error.message.includes('foreign key')) {
        errorMessage = "Product or user data error. Please refresh and try again.";
      }

      toast.error("Order Submission Failed", {
        description: errorMessage,
        style: { background: "red", color: "white" }
      });

    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to get error class
  const getErrorClass = (fieldName: string) => {
    return errors[fieldName]
      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
      : "border-gray-300 focus:ring-[#0A4647] focus:border-[#0A4647]";
  };

  return (
    <>
      {cartCount < 1 ? (
        <div className="h-[83vh] px-4 flex items-center justify-center">
          <div className="max-w-6xl w-full">
            <div className="bg-white rounded-lg p-12 text-center">
              <div className="text-6xl mb-6 flex justify-center">
                <AiOutlineShoppingCart />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Your cart is empty
              </h2>
              <p className="text-gray-600 mb-8">
                Add items to your cart to get started
              </p>
              <Link
                href="/product-category/alldevices"
                className="bg-[#35c8dc] text-white py-2 px-5 rounded-md font-semibold hover:bg-[#2db4c8] transition duration-200 inline-block"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      ) : cartCount > 1 ? (
        <></>
      ) : (
        <>
          <div className="min-h-screen p-4 my-7 md:p-8">
            <div className="max-w-7xl mx-auto">

              {/* Team Details Section */}
              <div className="bg-white mb-5 border">
                <div className="bg-[#0A4647]">
                  <h2 className="text-xl text-white font-bold py-2 px-4">Team Details</h2>
                </div>
                <div className="px-7 py-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sales Executive <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="sales_executive"
                        type="text"
                        value={formData.sales_executive}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('sales_executive')}`}
                        required
                      />
                      {errors.sales_executive && (
                        <p className="mt-1 text-sm text-red-600">{errors.sales_executive}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sales Executive Email <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="se_email"
                        type="email"
                        value={formData.se_email}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('se_email')}`}
                        required
                      />
                      {errors.se_email && (
                        <p className="mt-1 text-sm text-red-600">{errors.se_email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sales Manager <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="sales_manager"
                        type="text"
                        value={formData.sales_manager}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('sales_manager')}`}
                        required
                      />
                      {errors.sales_manager && (
                        <p className="mt-1 text-sm text-red-600">{errors.sales_manager}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sales Manager Email <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="sm_email"
                        type="email"
                        value={formData.sm_email}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('sm_email')}`}
                        required
                      />
                      {errors.sm_email && (
                        <p className="mt-1 text-sm text-red-600">{errors.sm_email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reseller <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="reseller"
                        type="text"
                        value={formData.reseller}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('reseller')}`}
                        required
                      />
                      {errors.reseller && (
                        <p className="mt-1 text-sm text-red-600">{errors.reseller}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Opportunity Details Section */}
              <div className="bg-white mb-5 border">
                <div className="bg-[#0A4647]">
                  <h2 className="text-xl text-white font-bold py-2 px-4">Opportunity Details</h2>
                </div>
                <div className="px-7 py-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Device Opportunity Size (Units) <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="dev_opportunity"
                        type="number"
                        min="1"
                        value={formData.dev_opportunity}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring ${getErrorClass('dev_opportunity')}`}
                        required
                      />
                      {errors.dev_opportunity && (
                        <p className="mt-1 text-sm text-red-600">{errors.dev_opportunity}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Budget Per Device ($) <span className="text-red-600">*</span>
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
                          $
                        </span>
                        <input
                          name="dev_budget"
                          type="number"
                          min="0"
                          step="0.01"
                          disabled
                          value={formData.dev_budget}
                          onChange={handleInputChange}
                          className={`flex-1 px-3 py-2 border rounded-r-md focus:outline-none focus:ring ${getErrorClass('dev_budget')}`}
                          required
                        />
                      </div>
                      {errors.dev_budget && (
                        <p className="mt-1 text-sm text-red-600">{errors.dev_budget}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Revenue Opportunity Size ($ Device Rev) <span className="text-red-600">*</span>
                        <span className="text-xs text-gray-500 ml-2">
                          (Calculated: {formatCurrency(formData.rev_opportunity)})
                        </span>
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
                          $
                        </span>
                        <input
                          name="rev_opportunity"
                          type="number"
                          value={formData.rev_opportunity}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CRM Account # <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="crm_account"
                        type="text"
                        value={formData.crm_account}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('crm_account')}`}
                        required
                      />
                      {errors.crm_account && (
                        <p className="mt-1 text-sm text-red-600">{errors.crm_account}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Segment <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="segment"
                        value={formData.segment}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('segment')}`}
                        required
                      >
                        <option value=""></option>
                        <option value="SMB">SMB</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Field">Field</option>
                        <option value="Majors">Majors</option>
                        <option value="State & Local">State & Local</option>
                      </select>
                      {errors.segment && (
                        <p className="mt-1 text-sm text-red-600">{errors.segment}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vertical <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="vertical"
                        value={formData.vertical}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('vertical')}`}
                        required
                      >
                        <option value=""></option>
                        <option value="Education">Education</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Retails">Retails</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Federal">Federal</option>
                      </select>
                      {errors.vertical && (
                        <p className="mt-1 text-sm text-red-600">{errors.vertical}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Manufacturer <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="current_manufacturer"
                        value={formData.current_manufacturer}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('current_manufacturer')}`}
                        required
                      >
                        <option value=""></option>
                        <option value="Acer">Acer</option>
                        <option value="Asus">Asus</option>
                        <option value="Apple">Apple</option>
                        <option value="Dell">Dell</option>
                        <option value="HP">HP</option>
                        <option value="Lenovo">Lenovo</option>
                        <option value="Microsoft">Microsoft</option>
                        <option value="Panasonic">Panasonic</option>
                        <option value="Samsung">Samsung</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.current_manufacturer && (
                        <p className="mt-1 text-sm text-red-600">{errors.current_manufacturer}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Use Case for this Demo Request <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="use_case"
                        value={formData.use_case}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('use_case')}`}
                        required
                      >
                        <option value=""></option>
                        <option value="Customer needs to use it in their own environment">Customer needs to use it in their own environment</option>
                        <option value="Distributor needs it for their own conferences/events">Distributor needs it for their own conferences/events</option>
                        <option value="Reseller looking to use it for one of their events">Reseller looking to use it for one of their events</option>
                      </select>
                      {errors.use_case && (
                        <p className="mt-1 text-sm text-red-600">{errors.use_case}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        What are you currently running on your devices? <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="currently_running"
                        value={formData.currently_running}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('currently_running')}`}
                        required
                      >
                        <option value=""></option>
                        <option value="Windows">Windows</option>
                        <option value="Chrome">Chrome</option>
                        <option value="MacOS">MacOS</option>
                      </select>
                      {errors.currently_running && (
                        <p className="mt-1 text-sm text-red-600">{errors.currently_running}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How many licenses do you have? <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="licenses"
                        value={formData.licenses}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('licenses')}`}
                        required
                      >
                        <option value=""></option>
                        <option value="1-10">1-10</option>
                        <option value="20-50">20-50</option>
                        <option value="100+">100+</option>
                      </select>
                      {errors.licenses && (
                        <p className="mt-1 text-sm text-red-600">{errors.licenses}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Are you currently using Copilot? <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="isCopilot"
                        value={formData.isCopilot}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('isCopilot')}`}
                        required
                      >
                        <option value=""></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                      {errors.isCopilot && (
                        <p className="mt-1 text-sm text-red-600">{errors.isCopilot}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Is security a factor for you? <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="isSecurity"
                        value={formData.isSecurity}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('isSecurity')}`}
                        required
                      >
                        <option value=""></option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                      {errors.isSecurity && (
                        <p className="mt-1 text-sm text-red-600">{errors.isSecurity}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How do you currently protect your devices? <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="current_protection"
                        type="text"
                        value={formData.current_protection}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('current_protection')}`}
                        required
                      />
                      {errors.current_protection && (
                        <p className="mt-1 text-sm text-red-600">{errors.current_protection}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Details Section */}
              <div className="bg-white mb-5 border">
                <div className="bg-[#0A4647]">
                  <h2 className="text-xl text-white font-bold py-2 px-4">Shipping Details</h2>
                </div>

                <div className="px-7 py-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="company_name"
                        type="text"
                        value={formData.company_name}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('company_name')}`}
                        required
                      />
                      {errors.company_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.company_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="contact_name"
                        type="text"
                        value={formData.contact_name}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('contact_name')}`}
                        required
                      />
                      {errors.contact_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.contact_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('email')}`}
                        required
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="address"
                        type="text"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('address')}`}
                        required
                      />
                      {errors.address && (
                        <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State <span className="text-red-600">*</span>
                      </label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('state')}`}
                        required
                      >
                        <option value=""></option>
                        <option value="Canada">Canada</option>
                        <option value="Alabama">Alabama</option>
                        <option value="Alaska">Alaska</option>
                        <option value="Arizona">Arizona</option>
                        <option value="Arkansas">Arkansas</option>
                        <option value="California">California</option>
                        <option value="Colorado">Colorado</option>
                        <option value="Connecticut">Connecticut</option>
                        <option value="Delaware">Delaware</option>
                        <option value="District Of Columbia">District Of Columbia</option>
                        <option value="Florida">Florida</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Hawaii">Hawaii</option>
                        <option value="Idaho">Idaho</option>
                        <option value="Illinois">Illinois</option>
                        <option value="Indiana">Indiana</option>
                        <option value="Iowa">Iowa</option>
                        <option value="Kansas">Kansas</option>
                        <option value="Kentucky">Kentucky</option>
                        <option value="Louisiana">Louisiana</option>
                        <option value="Maine">Maine</option>
                        <option value="Maryland">Maryland</option>
                        <option value="Massachusetts">Massachusetts</option>
                        <option value="Michigan">Michigan</option>
                        <option value="Minnesota">Minnesota</option>
                        <option value="Mississippi">Mississippi</option>
                        <option value="Missouri">Missouri</option>
                        <option value="Montana">Montana</option>
                        <option value="Nebraska">Nebraska</option>
                        <option value="Nevada">Nevada</option>
                        <option value="New Hampshire">New Hampshire</option>
                        <option value="New Jersey">New Jersey</option>
                        <option value="New Mexico">New Mexico</option>
                        <option value="New York">New York</option>
                        <option value="North Carolina">North Carolina</option>
                        <option value="North Dakota">North Dakota</option>
                        <option value="Ohio">Ohio</option>
                        <option value="Oklahoma">Oklahoma</option>
                        <option value="Oregon">Oregon</option>
                        <option value="Pennsylvania">Pennsylvania</option>
                        <option value="Puerto Rico">Puerto Rico</option>
                        <option value="Rhode Island">Rhode Island</option>
                        <option value="South Carolina">South Carolina</option>
                        <option value="South Dakota">South Dakota</option>
                        <option value="Tennessee">Tennessee</option>
                        <option value="Texas">Texas</option>
                        <option value="Utah">Utah</option>
                        <option value="Vermont">Vermont</option>
                        <option value="Virginia">Virginia</option>
                        <option value="Washington">Washington</option>
                        <option value="West Virginia">West Virginia</option>
                        <option value="Wisconsin">Wisconsin</option>
                        <option value="Wyoming">Wyoming</option>
                        <option value="Armed Forces (AA)">Armed Forces (AA)</option>
                        <option value="Armed Forces (AE)">Armed Forces (AE)</option>
                        <option value="Armed Forces (AP)">Armed Forces (AP)</option>
                        <option value="Alberta">Alberta</option>
                        <option value="British Columbia">British Columbia</option>
                        <option value="Manitoba">Manitoba</option>
                        <option value="New Brunswick">New Brunswick</option>
                        <option value="Newfoundland and Labrador">Newfoundland and Labrador</option>
                        <option value="Nova Scotia">Nova Scotia</option>
                        <option value="Ontario">Ontario</option>
                        <option value="Prince Edward Island">Prince Edward Island</option>
                        <option value="Quebec">Quebec</option>
                        <option value="Saskatchewan">Saskatchewan</option>
                        <option value="Northwest Territories">Northwest Territories</option>
                        <option value="Nunavut">Nunavut</option>
                        <option value="Yukon">Yukon</option>
                      </select>
                      {errors.state && (
                        <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="city"
                        type="text"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('city')}`}
                        required
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zip <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="zip"
                        type="text"
                        value={formData.zip}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('zip')}`}
                        required
                      />
                      {errors.zip && (
                        <p className="mt-1 text-sm text-red-600">{errors.zip}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Desired Demo Delivery Date <span className="text-red-600">*</span>
                      </label>
                      <input
                        name="desired_date"
                        type="date"
                        value={formData.desired_date}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${getErrorClass('desired_date')}`}
                        required
                        min={new Date().toISOString().split('T')[0]}
                      />
                      {errors.desired_date && (
                        <p className="mt-1 text-sm text-red-600">{errors.desired_date}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        rows={3}
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0A4647]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center mt-8">
                    <input
                      name="isTerms"
                      type="checkbox"
                      id="terms"
                      checked={formData.isTerms}
                      onChange={handleInputChange}
                      className={`h-4 w-4 ${errors.isTerms ? 'text-red-500 focus:ring-red-500' : 'text-[#0A4647] focus:ring-[#0A4647]'} border-gray-300 rounded`}
                      required
                    />
                    <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                      I have read and agree to the{' '}
                      <Link
                        href="/Terms-and-conditions.pdf"
                        target="_blank"
                        className="text-[#0A4647] hover:text-[#093c3d] hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms & Conditions
                      </Link>{' '}
                      <span className="text-red-600">*</span>
                    </label>
                  </div>
                  {errors.isTerms && (
                    <p className="mt-1 text-sm text-red-600">{errors.isTerms}</p>
                  )}
                </div>
              </div>

              {/* Product Order Section */}
              <div className="bg-white mb-5 border">
                <div className="bg-[#0A4647]">
                  <h2 className="text-xl text-white font-bold py-2 px-4">Your order</h2>
                </div>

                <div className="px-7 py-8">
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Product</h3>
                    <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                      <p className="text-gray-600">
                        {cartItem?.product_name} <b>x 1</b>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Place Order Button */}
              <div className="flex justify-center mb-8">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || cartLoading}
                  className="px-12 py-3 bg-[#0A4647] text-white cursor-pointer font-semibold rounded-md hover:bg-[#0a5c5e] focus:outline-none focus:ring-1 focus:ring-[#0A4647] focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}