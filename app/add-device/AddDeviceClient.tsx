"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import {
    logActivity,
    logError,
    logSuccess,
    logInfo,
    logWarning,
    logDb
} from "@/lib/logger";

interface FormData {
    productName: string;
    sku: string;
    formFactor: string;
    processor: string;
    memory: string;
    storage: string;
    screenSize: string;
    technologies: string;
    totalInventory: string;
    stockQuantity: string;
    currentDate: string;
    inventoryType: string;
    description: string;
    copilotPC: string;
    fiveGEnabled: string;
    postStatus: string;
}

interface CustomInputs {
    formFactor: string;
    processor: string;
    memory: string;
    storage: string;
    screenSize: string;
}

interface FilterOptions {
    formfactor: string[];
    processor: string[];
    memory: string[];
    storage: string[];
    screenSizesize: string[];
}

export default function AddDeviceClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editSlug = searchParams.get('_');

    // State for form fields
    const [primaryImage, setPrimaryImage] = useState<File | null>(null);
    const [primaryImagePreview, setPrimaryImagePreview] = useState<string | null>(null);
    const [additionalImages, setAdditionalImages] = useState<File[]>([]);
    const [additionalImagesPreview, setAdditionalImagesPreview] = useState<string[]>([]);
    const [removedExistingImages, setRemovedExistingImages] = useState<string[]>([]);

    // Helper function to get field section for logging
    const getFieldSection = (field: string): string => {
        const sections: Record<string, string> = {
            productName: 'basic_info',
            sku: 'basic_info',
            formFactor: 'specifications',
            processor: 'specifications',
            memory: 'specifications',
            storage: 'specifications',
            screenSize: 'specifications',
            technologies: 'specifications',
            totalInventory: 'inventory',
            stockQuantity: 'inventory',
            inventoryType: 'inventory',
            currentDate: 'basic_info',
            description: 'details',
            copilotPC: 'features',
            fiveGEnabled: 'features',
            postStatus: 'publishing'
        };
        return sections[field] || 'other';
    };

    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState<FormData>({
        productName: "",
        sku: "",
        formFactor: "",
        processor: "",
        memory: "",
        storage: "",
        screenSize: "",
        technologies: "",
        totalInventory: "",
        stockQuantity: "",
        currentDate: getTodayDate(),
        inventoryType: "",
        description: "",
        copilotPC: "No",
        fiveGEnabled: "No",
        postStatus: "Publish",
    });

    // Custom input states
    const [customInputs, setCustomInputs] = useState<CustomInputs>({
        formFactor: "",
        processor: "",
        memory: "",
        storage: "",
        screenSize: "",
    });

    // Filter options from existing products
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        formfactor: [],
        processor: [],
        memory: [],
        storage: [],
        screenSizesize: [],
    });

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoadingProduct, setIsLoadingProduct] = useState(false);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [productId, setProductId] = useState<string | null>(null);

    // Static options
    const inventoryTypes = ["Program", "Global"];
    const yesNoOptions = ["Yes", "No"];
    const postStatusOptions = ["Publish", "Private"];
    const { profile, isLoggedIn, loading, user } = useAuth();
    const [authChecked, setAuthChecked] = useState(false);
    const [authInitialized, setAuthInitialized] = useState(false);
    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const superSubscriberRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const subscriberRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

    // Role options for select
    const roleOptions = [
        { label: "Admin", value: adminRole || "Administrator" },
        { label: "Super Subscriber", value: superSubscriberRole || "Super-Subscriber" },
        { label: "Shop Manager", value: smRole || "Shop-Manager" },
        { label: "Subscriber", value: subscriberRole || "Subscriber" }
    ];

    const allowedRoles = [smRole, adminRole].filter(Boolean); // Remove undefined values

    // Check if current user is authorized
    const isAuthorized = profile?.role && allowedRoles.includes(profile.role);

    useEffect(() => {
        if (!isAuthorized) {
            router.replace('/product-category/alldevices');
            return;
        }
    }, [isAuthorized, router]);

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            logActivity({
                type: 'auth',
                level: 'warning',
                action: 'unauthorized_device_access_attempt',
                message: 'User attempted to access device page without proper authentication',
                userId: profile?.userId || null,
                details: {
                    isLoggedIn,
                    isVerified: profile?.isVerified,
                    userRole: profile?.role,
                    redirectTo: editSlug ? `add-device?_=${editSlug}` : 'add-device'
                },
                status: 'failed'
            });
            if (!editSlug) {
                router.replace('/login/?redirect_to=add-device');
            } else {
                router.replace(`/login/?redirect_to=add-device?_=${editSlug}`);
            }
            return;
        }

        // Check if user has permission to access this page
        if (!isAuthorized) {
            logActivity({
                type: 'auth',
                level: 'warning',
                action: 'unauthorized_role_device_access',
                message: 'User attempted to access device page without proper role',
                userId: profile.userId || null,
                details: {
                    userRole: profile.role,
                    allowedRoles,
                    isEditing,
                    editSlug
                },
                status: 'failed'
            });
            router.replace('/product-category/alldevices');
            return;
        }

    }, [loading, isLoggedIn, profile, router, isAuthorized]);

    // Check if we're in edit mode
    useEffect(() => {
        if (editSlug) {
            setIsEditing(true);
            fetchProductForEdit(editSlug);
        } else {
            fetchFilterOptions();
        }
    }, [editSlug]);

    // Fetch product data for editing
    const fetchProductForEdit = async (slug: string) => {
        try {
            setIsLoadingProduct(true);

            // Fetch product by slug
            const { data: product, error } = await supabase
                .from("products")
                .select("*")
                .eq("slug", slug)
                .single();

            if (error || !product) {
                toast.error("Product not found", {
                    style: { background: "red", color: "white" }
                });
                router.push('/add-device');
                return;
            }

            // Set product ID for updates
            setProductId(product.id);

            // Set primary image preview
            if (product.thumbnail) {
                setPrimaryImagePreview(product.thumbnail);
            }

            // Set additional images preview
            if (product.gallery) {
                let galleryArray: string[] = [];

                if (Array.isArray(product.gallery)) {
                    galleryArray = product.gallery;
                } else if (typeof product.gallery === 'string') {
                    try {
                        const parsed = JSON.parse(product.gallery);
                        if (Array.isArray(parsed)) {
                            galleryArray = parsed;
                        } else if (typeof parsed === 'string') {
                            try {
                                const reParsed = JSON.parse(parsed);
                                if (Array.isArray(reParsed)) {
                                    galleryArray = reParsed;
                                }
                            } catch {
                                // If re-parsing fails, treat as string
                                if (parsed.includes(',')) {
                                    galleryArray = parsed.split(',').map(url => url.trim());
                                } else if (parsed.trim()) {
                                    galleryArray = [parsed.trim()];
                                }
                            }
                        }
                    } catch {
                        if (product.gallery.includes('[')) {
                            const cleaned = product.gallery
                                .replace(/[\[\]"]/g, '')
                                .split(',')
                                .map((url: string) => url.trim())
                                .filter((url: string) => url.length > 0);

                            galleryArray = cleaned;

                        } else if (product.gallery.includes(',')) {
                            galleryArray = product.gallery
                                .split(',')
                                .map((url: string) => url.trim());

                        } else if (product.gallery.trim()) {
                            galleryArray = [product.gallery.trim()];
                        }

                    }
                }

                setAdditionalImagesPreview(galleryArray);
            }

            // Set form data with product values - directly using text values
            setFormData({
                productName: product.product_name || "",
                sku: product.sku || "",
                formFactor: product.form_factor || "",
                processor: product.processor || "",
                memory: product.memory || "",
                storage: product.storage || "",
                screenSize: product.screen_size || "",
                technologies: product.technologies || "",
                totalInventory: product.total_inventory?.toString() || "",
                stockQuantity: product.stock_quantity?.toString() || "",
                currentDate: product.date?.split('T')[0] || getTodayDate(),
                inventoryType: product.inventory_type || "",
                description: product.description || "",
                copilotPC: product.copilot ? "Yes" : "No",
                fiveGEnabled: product.five_g_Enabled ? "Yes" : "No",
                postStatus: product.post_status || "Publish",
            });

            // Fetch filter options after setting form data
            await fetchFilterOptions();

        } catch (error) {
            toast.error("Failed to load product for editing", {
                style: { background: "red", color: "white" }
            });
            router.push('/add-device');
        } finally {
            setIsLoadingProduct(false);
        }
    };

    // Fetch unique filter options from existing products
    const fetchFilterOptions = async () => {
        try {
            setIsLoading(true);

            // Fetch distinct values for each filter column from products table
            const { data: formFactorData } = await supabase
                .from("products")
                .select("form_factor")
                .not("form_factor", "is", null)
                .not("form_factor", "eq", "");

            const { data: processorData } = await supabase
                .from("products")
                .select("processor")
                .not("processor", "is", null)
                .not("processor", "eq", "");

            const { data: memoryData } = await supabase
                .from("products")
                .select("memory")
                .not("memory", "is", null)
                .not("memory", "eq", "");

            const { data: storageData } = await supabase
                .from("products")
                .select("storage")
                .not("storage", "is", null)
                .not("storage", "eq", "");

            const { data: screenSizeData } = await supabase
                .from("products")
                .select("screen_size")
                .not("screen_size", "is", null)
                .not("screen_size", "eq", "");

            // Extract unique values
            const formFactorOptions = [...new Set(formFactorData?.map(item => item.form_factor) || [])].sort();
            const processorOptions = [...new Set(processorData?.map(item => item.processor) || [])].sort();
            const memoryOptions = [...new Set(memoryData?.map(item => item.memory) || [])].sort();
            const storageOptions = [...new Set(storageData?.map(item => item.storage) || [])].sort();
            const screenSizeOptions = [...new Set(screenSizeData?.map(item => item.screen_size) || [])].sort();

            setFilterOptions({
                formfactor: [...formFactorOptions, "Custom"],
                processor: [...processorOptions, "Custom"],
                memory: [...memoryOptions, "Custom"],
                storage: [...storageOptions, "Custom"],
                screenSizesize: [...screenSizeOptions, "Custom"],
            });

        } catch (error) {
            toast.error("Failed to load filter options", {
                style: { background: "black", color: "white" }
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'primary' | 'additional') => {
        const files = event.target.files;
        if (!files) return;

        if (type === 'primary') {
            const file = files[0];
            if (file) {
                setPrimaryImage(file);
                const imageUrl = URL.createObjectURL(file);
                setPrimaryImagePreview(imageUrl);
            }
        } else {
            const newImages: File[] = [];
            const newPreviews: string[] = [];
            const maxImages = Math.min(files.length, 6 - additionalImages.length);

            for (let i = 0; i < maxImages; i++) {
                const file = files[i];
                newImages.push(file);
                const imageUrl = URL.createObjectURL(file);
                newPreviews.push(imageUrl);
            }

            setAdditionalImages(prev => [...prev, ...newImages]);
            setAdditionalImagesPreview(prev => [...prev, ...newPreviews]);

            if (files.length > maxImages) {
                toast.warning(`Maximum 6 images allowed. ${maxImages} images added.`, {
                    style: { background: "black", color: "white" }
                });
            }
        }
    };

    const removeAdditionalImage = (index: number) => {
        const imageUrl = additionalImagesPreview[index];

        // Check if this is an existing image (URL) or a new upload (blob URL)
        const isExistingImage = imageUrl?.startsWith('http');

        if (isExistingImage) {
            setRemovedExistingImages(prev => [...prev, imageUrl]);
            toast.info("Existing image marked for removal. Save to apply changes.", {
                style: { background: "black", color: "white" }
            });
        }

        setAdditionalImages(prev => prev.filter((_, i) => i !== index));
        setAdditionalImagesPreview(prev => prev.filter((_, i) => i !== index));
    };

    const createSlug = (text: string) => {
        // Generate random 10-character string
        const generateRandomString = (length: number) => {
            const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return result;
        };

        const randomString = generateRandomString(10);

        // Create base slug from text
        const baseSlug = text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();

        // Remove trailing dash if exists
        const cleanBaseSlug = baseSlug.replace(/-$/, '');

        // Combine with random string
        return `${cleanBaseSlug}-${randomString}`;
    };

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        const fieldMap: Record<string, keyof CustomInputs> = {
            formFactor: "formFactor",
            processor: "processor",
            memory: "memory",
            storage: "storage",
            screenSize: "screenSize",
        };

        if (fieldMap[field] && value !== "Custom") {
            setCustomInputs(prev => ({ ...prev, [fieldMap[field]]: "" }));
        }
    };

    const handleRadioChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCustomInputChange = (field: keyof CustomInputs, value: string) => {
        setCustomInputs(prev => ({ ...prev, [field]: value }));
    };

    const uploadImagesToSupabase = async () => {
        const imageUrls: { primary: string | null; additional: string[] } = {
            primary: null,
            additional: []
        };

        try {
            // Upload primary image only if new image is selected
            if (primaryImage) {
                const fileExt = primaryImage.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `devices/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('TdSynnex')
                    .upload(filePath, primaryImage);

                if (uploadError) {
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('TdSynnex')
                    .getPublicUrl(filePath);

                imageUrls.primary = publicUrl;
            } else if (primaryImagePreview && !primaryImage) {
                imageUrls.primary = primaryImagePreview;
            }

            // Upload new additional images
            for (const image of additionalImages) {
                const fileExt = image.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `devices/gallery/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('TdSynnex')
                    .upload(filePath, image);

                if (uploadError) {
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('TdSynnex')
                    .getPublicUrl(filePath);

                imageUrls.additional.push(publicUrl);
            }

            // Add existing additional images in edit mode (excluding removed ones and blob URLs)
            if (isEditing) {
                const existingImages = additionalImagesPreview.filter(img =>
                    !img.startsWith('blob:') &&
                    (img.startsWith('http://') || img.startsWith('https://')) &&
                    !removedExistingImages.includes(img)
                );

                imageUrls.additional = [...imageUrls.additional, ...existingImages];
            }

            return imageUrls;
        } catch (error) {
            throw error;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const submitStartTime = Date.now();
        setIsFormLoading(true);

        try {
            await logActivity({
                type: 'product',
                level: 'info',
                action: 'product_form_submission_attempt',
                message: `Product form submission ${isEditing ? 'update' : 'create'} attempt`,
                userId: profile?.userId || null,
                details: {
                    isEditing,
                    productName: formData.productName,
                    sku: formData.sku,
                    userRole: profile?.role
                },
                status: 'processing'
            });

            // Check for required fields
            const requiredFields = [
                { field: 'productName', label: 'Product Name', value: formData.productName },
                { field: 'sku', label: 'SKU', value: formData.sku },
                // { field: 'formFactor', label: 'Form Factor', value: formData.formFactor },
                // { field: 'processor', label: 'Processor', value: formData.processor },
                // { field: 'memory', label: 'Memory', value: formData.memory },
                // { field: 'storage', label: 'Storage', value: formData.storage },
                // { field: 'screenSize', label: 'Screen Size', value: formData.screenSize },
                { field: 'inventoryType', label: 'Inventory Type', value: formData.inventoryType },
                { field: 'totalInventory', label: 'Total Inventory', value: formData.totalInventory },
                { field: 'stockQuantity', label: 'Stock Quantity', value: formData.stockQuantity },
                { field: 'copilotPC', label: 'Copilot + PC', value: formData.copilotPC },
                { field: 'fiveGEnabled', label: '5G Enabled', value: formData.fiveGEnabled },
                { field: 'postStatus', label: 'Post Status', value: formData.postStatus },
            ];

            const emptyFields = requiredFields.filter(field => {
                if (!field.value || field.value.trim() === '') {
                    return true;
                }

                if (field.value === "Custom") {
                    const customFieldMap: Record<string, keyof CustomInputs> = {
                        formFactor: "formFactor",
                        processor: "processor",
                        memory: "memory",
                        storage: "storage",
                        screenSize: "screenSize",
                    };

                    if (customFieldMap[field.field as keyof typeof customFieldMap] &&
                        !customInputs[customFieldMap[field.field as keyof typeof customFieldMap]]?.trim()) {
                        return true;
                    }
                }

                return false;
            });

            if (emptyFields.length > 0) {
                const fieldNames = emptyFields.map(field => field.label).join(', ');
                toast.error(`Please fill in the following required fields: ${fieldNames}`, {
                    style: { background: "red", color: "white" }
                });
                setIsFormLoading(false);
                return;
            }

            // Check if "Custom" is selected but custom input is empty
            const customFieldsToCheck = [
                { field: 'formFactor' as const, customField: 'formFactor' as const },
                { field: 'processor' as const, customField: 'processor' as const },
                { field: 'memory' as const, customField: 'memory' as const },
                { field: 'storage' as const, customField: 'storage' as const },
                { field: 'screenSize' as const, customField: 'screenSize' as const },
            ];

            const missingCustomInputs = customFieldsToCheck.filter(({ field, customField }) => {
                const formValue = formData[field];
                const customValue = customInputs[customField];
                return formValue === "Custom" && (!customValue || customValue.trim() === '');
            });

            if (missingCustomInputs.length > 0) {
                const fieldNames = missingCustomInputs.map(({ field }) => {
                    const labelMap: Record<string, string> = {
                        formFactor: "Form Factor",
                        processor: "Processor",
                        memory: "Memory",
                        storage: "Storage",
                        screenSize: "Screen Size",
                    };
                    return labelMap[field] || field;
                }).join(', ');

                toast.error(`Please enter custom values for: ${fieldNames}`, {
                    style: { background: "red", color: "white" }
                });
                setIsFormLoading(false);
                return;
            }

            // Check if primary image is uploaded (for new products only)
            if (!isEditing && !primaryImage) {
                toast.error("Please upload a primary image", {
                    style: { background: "red", color: "white" }
                });
                setIsFormLoading(false);
                return;
            }

            // Validate numeric fields
            if (formData.totalInventory) {
                const totalInv = parseInt(formData.totalInventory);
                if (isNaN(totalInv) || totalInv < 0) {
                    toast.error("Total Inventory must be a valid positive number", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }
            }

            if (formData.stockQuantity) {
                const stockQty = parseInt(formData.stockQuantity);
                if (isNaN(stockQty) || stockQty < 0) {
                    toast.error("Stock Quantity must be a valid positive number", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }
            }

            // Check if stock quantity is less than or equal to total inventory
            if (formData.totalInventory && formData.stockQuantity) {
                const totalInv = parseInt(formData.totalInventory);
                const stockQty = parseInt(formData.stockQuantity);

                if (stockQty > totalInv) {
                    toast.error("Stock quantity cannot be greater than total inventory", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }
            }

            // Check if date is valid
            if (formData.currentDate) {
                const selectedDate = new Date(formData.currentDate);
                const today = new Date();

                selectedDate.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);

                if (selectedDate > today) {
                    toast.error("Date cannot be in the future", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }
            }

            // Upload images
            const imageUrls = await uploadImagesToSupabase();

            // Create slug
            const slug = createSlug(formData.productName);

            // Prepare final data with direct text values
            // For custom fields, use the custom input value if "Custom" is selected
            const getFieldValue = (field: keyof FormData, customField: keyof CustomInputs): string => {
                if (formData[field] === "Custom") {
                    return customInputs[customField] || formData[field];
                }
                return formData[field];
            };

            const finalFormData = {
                productName: formData.productName,
                sku: formData.sku,
                formFactor: getFieldValue('formFactor', 'formFactor'),
                processor: getFieldValue('processor', 'processor'),
                memory: getFieldValue('memory', 'memory'),
                storage: getFieldValue('storage', 'storage'),
                screenSize: getFieldValue('screenSize', 'screenSize'),
                technologies: formData.technologies,
                inventoryType: formData.inventoryType,
                totalInventory: formData.totalInventory ? parseInt(formData.totalInventory) : null,
                stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : null,
                currentDate: formData.currentDate,
                copilotPC: formData.copilotPC,
                fiveGEnabled: formData.fiveGEnabled,
                postStatus: formData.postStatus,
                description: formData.description,
            };

            const toBool = (value?: string) => value === "Yes";

            if (isEditing && productId) {

                const { data: pRowSKU } = await supabase
                    .from("products")
                    .select("sku")
                    .eq("sku", finalFormData.sku.trim())
                    .neq("id", productId)
                    .single();

                if (pRowSKU) {
                    toast.error("Unable to update the device because a device with the same SKU already exists.", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }

                // Get existing product data to preserve existing images
                const { data: existingProduct } = await supabase
                    .from("products")
                    .select("gallery")
                    .eq("id", productId)
                    .single();

                let finalGallery: string[] = [...imageUrls.additional];

                // Helper function to parse existing gallery
                const parseExistingGallery = (galleryData: any): string[] => {
                    if (!galleryData) return [];

                    try {
                        if (Array.isArray(galleryData)) return galleryData;
                        if (typeof galleryData === 'string') {
                            try {
                                const parsed = JSON.parse(galleryData);
                                if (Array.isArray(parsed)) return parsed;
                                if (typeof parsed === 'string') {
                                    const reParsed = JSON.parse(parsed);
                                    if (Array.isArray(reParsed)) return reParsed;
                                    return [reParsed];
                                }
                                return [parsed];
                            } catch {
                                // Handle comma-separated string
                                return galleryData.split(',').map((url: string) => url.trim()).filter((url: string) => url);
                            }
                        }
                        return [];
                    } catch {
                        return [];
                    }
                };

                // Add existing images that aren't being removed
                if (existingProduct?.gallery) {
                    const existingGallery = parseExistingGallery(existingProduct.gallery);
                    existingGallery.forEach((url: string) => {
                        if (!removedExistingImages.includes(url) && !finalGallery.includes(url)) {
                            finalGallery.push(url);
                        }
                    });
                }

                // Update device - directly store text values
                const { error } = await supabase
                    .from("products")
                    .update({
                        product_name: finalFormData.productName,
                        slug: slug,
                        sku: finalFormData.sku,
                        form_factor: finalFormData.formFactor,
                        processor: finalFormData.processor,
                        memory: finalFormData.memory,
                        storage: finalFormData.storage,
                        screen_size: finalFormData.screenSize,
                        technologies: finalFormData.technologies,
                        inventory_type: finalFormData.inventoryType,
                        total_inventory: finalFormData.totalInventory,
                        stock_quantity: finalFormData.stockQuantity,
                        date: finalFormData.currentDate,
                        copilot: toBool(finalFormData.copilotPC),
                        five_g_Enabled: toBool(finalFormData.fiveGEnabled),
                        post_status: finalFormData.postStatus,
                        description: finalFormData.description,
                        thumbnail: imageUrls.primary,
                        gallery: finalGallery,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", productId);

                if (error) {
                    toast.error("Failed to update device. Please try again.", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }

                toast.success("Device updated successfully!", {
                    style: { background: "black", color: "white" }
                });

                // Log validation passed
                await logActivity({
                    type: 'validation',
                    level: 'success',
                    action: 'form_validation_passed',
                    message: 'Product form validation passed',
                    userId: profile?.userId || null,
                    details: {
                        validationTimeMs: Date.now() - submitStartTime,
                        hasPrimaryImage: !isEditing ? !!primaryImage : true,
                        additionalImagesCount: additionalImages.length
                    },
                    status: 'completed'
                });

                router.push(`/product/${slug}`);

            } else {

                const { data: pRowSKU } = await supabase
                    .from("products")
                    .select("sku")
                    .eq("sku", finalFormData.sku.trim())
                    .single();

                if (pRowSKU) {
                    toast.error("Unable to add the device because a device with the same SKU already exists.", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }

                // Insert new device - directly store text values
                const { error } = await supabase
                    .from("products")
                    .insert({
                        product_name: finalFormData.productName,
                        slug: slug,
                        sku: finalFormData.sku,
                        form_factor: finalFormData.formFactor,
                        processor: finalFormData.processor,
                        memory: finalFormData.memory,
                        storage: finalFormData.storage,
                        screen_size: finalFormData.screenSize,
                        technologies: finalFormData.technologies,
                        inventory_type: finalFormData.inventoryType,
                        total_inventory: finalFormData.totalInventory,
                        stock_quantity: finalFormData.stockQuantity,
                        withCustomer: '0',
                        date: finalFormData.currentDate,
                        copilot: toBool(finalFormData.copilotPC),
                        five_g_Enabled: toBool(finalFormData.fiveGEnabled),
                        post_status: finalFormData.postStatus,
                        description: finalFormData.description,
                        isBundle: false,
                        isInStock: true,
                        thumbnail: imageUrls.primary,
                        gallery: imageUrls.additional,
                        user_id: profile?.userId,
                    });

                if (error) {
                    toast.error("Failed to add device. Please try again.", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }

                toast.success("Device added successfully!", {
                    style: { background: "black", color: "white" }
                });

                resetForm();
                router.push("/product-category/alldevices/");
            }

            setIsFormLoading(false);

        } catch (error) {
            toast.error("Failed to process device. Please try again.", {
                style: { background: "red", color: "white" }
            });
            setIsFormLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            productName: "",
            sku: "",
            formFactor: "",
            processor: "",
            memory: "",
            storage: "",
            screenSize: "",
            technologies: "",
            totalInventory: "",
            stockQuantity: "",
            currentDate: getTodayDate(),
            inventoryType: "",
            description: "",
            copilotPC: "No",
            fiveGEnabled: "No",
            postStatus: "Publish",
        });

        setCustomInputs({
            formFactor: "",
            processor: "",
            memory: "",
            storage: "",
            screenSize: "",
        });

        setPrimaryImage(null);
        setPrimaryImagePreview(null);
        setAdditionalImages([]);
        setAdditionalImagesPreview([]);
        setRemovedExistingImages([]);

        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            (input as HTMLInputElement).value = '';
        });
    };

    const renderFieldWithCustom = (
        label: string,
        field: keyof FormData,
        options: string[],
        customField: keyof CustomInputs,
        type: string
    ) => {
        const safeOptions = options || [];
        const showCustomInput = formData[field] === "Custom";

        return (
            <div>
                <label className="block text-gray-700 text-sm font-medium mb-2">
                    {label}
                </label>

                {isLoading ? (
                    <div className="animate-pulse flex space-x-2">
                        <div className="h-9 bg-gray-200 rounded w-24"></div>
                        <div className="h-9 bg-gray-200 rounded w-24"></div>
                        <div className="h-9 bg-gray-200 rounded w-24"></div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {safeOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => handleInputChange(field, option)}
                                className={`px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${formData[field] === option
                                    ? "bg-[#35c8dc] text-white border border-[#33aaba]"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent"
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}

                {showCustomInput && (
                    <div className="mt-2">
                        <input
                            type="text"
                            placeholder={`Enter custom ${label.toLowerCase()}`}
                            value={customInputs[customField]}
                            onChange={(e) =>
                                handleCustomInputChange(customField, e.target.value)
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-[#35c8dc]"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Custom value will be saved when you submit the form
                        </p>
                    </div>
                )}
            </div>
        );
    };

    if (isLoadingProduct) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#35c8dc] mx-auto" />
                    <p className="mt-4 text-gray-600">Loading product data...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <>
            </>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Back
                        </button>
                        <h1 className="text-2xl font-normal text-gray-900">
                            {isEditing ? 'Edit Device' : 'Add New Device'}
                        </h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Product Images Section */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Product Images</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Primary Image */}
                            <div>
                                <div className="flex items-center space-x-2 mb-3">
                                    <span className="text-gray-700 font-medium">Primary</span>
                                    <span className="text-xs text-gray-500">Thumbnail Image</span>
                                </div>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                    {primaryImagePreview ? (
                                        <div className="relative">
                                            <img src={primaryImagePreview} alt="Primary" className="max-h-48 mx-auto rounded" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPrimaryImage(null);
                                                    setPrimaryImagePreview(null);
                                                }}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-gray-400 mb-3">
                                                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <label className="cursor-pointer inline-block">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, 'primary')}
                                                />
                                                <span className="text-[#35c8dc] font-medium cursor-pointer hover:text-[#33aaba] transition-colors">
                                                    Click to upload
                                                </span>
                                            </label>
                                            <p className="text-xs text-gray-500 mt-2">Maximum file size: 10MB</p>
                                            <p className="text-xs text-gray-500">Supported: PNG, JPG, WEBP</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Additional Images */}
                            <div>
                                <div className="flex items-center space-x-2 mb-3">
                                    <span className="text-gray-700 font-medium">Gallery</span>
                                    <span className="text-xs text-gray-500">Additional Images</span>
                                </div>

                                {additionalImagesPreview.length === 0 ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                                        <div className="text-gray-400 mb-3">
                                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <label className="cursor-pointer inline-block">
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => handleImageUpload(e, 'additional')}
                                            />
                                            <span className="text-[#35c8dc] font-medium cursor-pointer hover:text-[#33aaba] transition-colors">
                                                Click to upload
                                            </span>
                                        </label>
                                        <p className="text-xs text-gray-500 mt-2">Upload up to 6 images at once</p>
                                        <p className="text-xs text-gray-500">Maximum file size: 10MB each</p>
                                        <p className="text-xs text-gray-500">Supported: PNG, JPG, WEBP</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            {additionalImagesPreview.map((img, index) => (
                                                <div key={index} className="relative border rounded-lg overflow-hidden">
                                                    <img src={img} alt={`Additional ${index + 1}`} className="w-full h-24 object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAdditionalImage(index)}
                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                            {additionalImagesPreview.length < 6 && (
                                                <label className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={(e) => handleImageUpload(e, 'additional')}
                                                    />
                                                    <span className="text-3xl text-gray-400">+</span>
                                                    <span className="text-xs text-gray-500 mt-1">Add more</span>
                                                </label>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">Click + to add more images (max 6)</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Product Details Form */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Product Name */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    Product Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter product name"
                                    value={formData.productName}
                                    onChange={(e) => handleInputChange('productName', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#35c8dc]"
                                    required
                                />
                            </div>

                            {/* SKU */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">
                                    SKU <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter SKU"
                                    value={formData.sku}
                                    onChange={(e) => handleInputChange('sku', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#35c8dc]"
                                    required
                                />
                            </div>

                            {/* Form Factor */}
                            {renderFieldWithCustom("Form Factor", "formFactor", filterOptions.formfactor, "formFactor", "form_factor")}

                            {/* Processor */}
                            {renderFieldWithCustom("Processor", "processor", filterOptions.processor, "processor", "processor")}

                            {/* Memory */}
                            {renderFieldWithCustom("Memory", "memory", filterOptions.memory, "memory", "memory")}

                            {/* Storage */}
                            {renderFieldWithCustom("Storage", "storage", filterOptions.storage, "storage", "storage")}

                            {/* Screen Size */}
                            {renderFieldWithCustom("Screen Size", "screenSize", filterOptions.screenSizesize, "screenSize", "screen_size")}

                            {/* Technologies */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Technologies</label>
                                <input
                                    type="text"
                                    placeholder="Enter technologies (comma separated)"
                                    value={formData.technologies}
                                    onChange={(e) => handleInputChange('technologies', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#35c8dc]"
                                />
                                <p className="text-xs text-gray-500 mt-1">Example: Wi-Fi 6, Bluetooth 5.3, vPro</p>
                            </div>

                            {/* Inventory Type */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Inventory Type</label>
                                <select
                                    value={formData.inventoryType}
                                    onChange={(e) => handleInputChange('inventoryType', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#35c8dc]"
                                >
                                    <option value="">Select inventory type</option>
                                    {inventoryTypes.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Total Inventory */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Total Inventory</label>
                                <input
                                    type="number"
                                    placeholder="Enter total inventory"
                                    value={formData.totalInventory}
                                    onChange={(e) => handleInputChange('totalInventory', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#35c8dc]"
                                />
                            </div>

                            {/* Stock Quantity */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Stock Quantity</label>
                                <input
                                    type="number"
                                    placeholder="Enter stock quantity"
                                    value={formData.stockQuantity}
                                    onChange={(e) => handleInputChange('stockQuantity', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#35c8dc]"
                                />
                            </div>

                            {/* Upload Date */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Date</label>
                                <input
                                    type="date"
                                    value={formData.currentDate}
                                    onChange={(e) => handleInputChange('currentDate', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#35c8dc]"
                                />
                            </div>

                            {/* Copilot + PC */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Copilot + PC</label>
                                <div className="flex gap-4">
                                    {yesNoOptions.map((option) => (
                                        <label key={option} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="copilotPC"
                                                value={option}
                                                checked={formData.copilotPC === option}
                                                onChange={(e) => handleRadioChange('copilotPC', e.target.value)}
                                                className="text-[#35c8dc] focus:ring-[#33aaba]"
                                            />
                                            <span className="text-gray-700">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* 5G Enabled */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">5G Enabled</label>
                                <div className="flex gap-4">
                                    {yesNoOptions.map((option) => (
                                        <label key={option} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="fiveGEnabled"
                                                value={option}
                                                checked={formData.fiveGEnabled === option}
                                                onChange={(e) => handleRadioChange('fiveGEnabled', e.target.value)}
                                                className="text-[#35c8dc] focus:ring-[#33aaba]"
                                            />
                                            <span className="text-gray-700">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Post Status */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Post Status</label>
                                <div className="flex gap-4">
                                    {postStatusOptions.map((option) => (
                                        <label key={option} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="postStatus"
                                                value={option}
                                                checked={formData.postStatus === option}
                                                onChange={(e) => handleRadioChange('postStatus', e.target.value)}
                                                className="text-[#35c8dc] focus:ring-[#33aaba]"
                                            />
                                            <span className="text-gray-700">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className="block text-gray-700 text-sm font-medium mb-2">Description</label>
                                <textarea
                                    placeholder="Enter device description"
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#35c8dc]"
                                />
                                <p className="text-xs text-gray-500 mt-1">Add details like condition, highlights, notes.</p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center cursor-default">
                            <button
                                type="submit"
                                disabled={isFormLoading}
                                className={`px-12 py-3 bg-[#35c8dc] text-white font-medium rounded-md 
                  focus:outline-none focus:ring-2 focus:ring-[#33aaba] focus:ring-offset-2
                  transition-colors 
                  ${isFormLoading ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#33aaba] cursor-pointer'}`}
                            >
                                {isFormLoading ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Device' : 'Submit')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}