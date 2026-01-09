"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";

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

interface FilterIds {
    formFactorId: string;
    processorId: string;
    memoryId: string;
    storageId: string;
    screenSizeId: string;
}

export default function Page() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editSlug = searchParams.get('_');

    // State for form fields
    const [primaryImage, setPrimaryImage] = useState<File | null>(null);
    const [primaryImagePreview, setPrimaryImagePreview] = useState<string | null>(null);
    const [additionalImages, setAdditionalImages] = useState<File[]>([]);
    const [additionalImagesPreview, setAdditionalImagesPreview] = useState<string[]>([]);
    const [removedExistingImages, setRemovedExistingImages] = useState<string[]>([]);

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

    // Filter options from database
    const [filterOptions, setFilterOptions] = useState<FilterOptions>({
        formfactor: [],
        processor: [],
        memory: [],
        storage: [],
        screenSizesize: [],
    });

    // Filter IDs state
    const [filterIds, setFilterIds] = useState<FilterIds>({
        formFactorId: "",
        processorId: "",
        memoryId: "",
        storageId: "",
        screenSizeId: "",
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
    const { user, profile, loading } = useAuth();

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
                console.error("Error fetching product:", error);
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

            // Fetch filter titles for display
            const filterTypes = ["form_factor", "processor", "memory", "storage", "screen_size"];
            const filterPromises = filterTypes.map(async (type) => {
                const { data } = await supabase
                    .from("filters")
                    .select("id, title")
                    .eq("type", type);

                return { type, data: data || [] };
            });

            const filterResults = await Promise.all(filterPromises);

            // Create mapping object
            const filterMappings: Record<string, Record<string, string>> = {};
            filterResults.forEach(result => {
                const key = result.type === "form_factor" ? "formFactor" :
                    result.type === "screen_size" ? "screenSize" : result.type;

                const mapping: Record<string, string> = {};
                result.data.forEach(item => {
                    mapping[item.id] = item.title;
                });

                filterMappings[key] = mapping;
            });

            // Set form data with product values
            setFormData({
                productName: product.product_name || "",
                sku: product.sku || "",
                formFactor: filterMappings.formFactor?.[product.form_factor] || product.form_factor || "",
                processor: filterMappings.processor?.[product.processor] || product.processor || "",
                memory: filterMappings.memory?.[product.memory] || product.memory || "",
                storage: filterMappings.storage?.[product.storage] || product.storage || "",
                screenSize: filterMappings.screenSize?.[product.screen_size] || product.screen_size || "",
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

            // Set filter IDs
            setFilterIds({
                formFactorId: product.form_factor || "",
                processorId: product.processor || "",
                memoryId: product.memory || "",
                storageId: product.storage || "",
                screenSizeId: product.screen_size || "",
            });

            // Fetch filter options after setting form data
            await fetchFilterOptions();

        } catch (error) {
            console.error("Error fetching product for edit:", error);
            toast.error("Failed to load product for editing", {
                style: { background: "red", color: "white" }
            });
            router.push('/add-device');
        } finally {
            setIsLoadingProduct(false);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            setIsLoading(true);
            const types = ["form_factor", "processor", "memory", "storage", "screen_size"];

            const promises = types.map(async (type) => {
                const { data, error } = await supabase
                    .from("filters")
                    .select("id, title")
                    .eq("type", type)
                    .order("title");

                if (error) {
                    console.error(`Error fetching ${type}:`, error);
                    return { type, items: [] };
                }

                const items = data?.map(item => ({ id: item.id, title: item.title })) || [];
                return { type, items };
            });

            const results = await Promise.all(promises);

            const newOptions: FilterOptions = {
                formfactor: [],
                processor: [],
                memory: [],
                storage: [],
                screenSizesize: [],
            };

            results.forEach(result => {
                const key = result.type.replace("_", "").replace("screen", "screenSize") as keyof FilterOptions;
                newOptions[key] = [...result.items.map(item => item.title), "Custom"];
            });

            setFilterOptions(newOptions);
        } catch (error) {
            console.error("Error fetching filter options:", error);
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
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    };

    const insertCustomFilter = async (title: string, type: string) => {
        try {
            const slug = createSlug(title);

            const { data: existingFilter, error: checkError } = await supabase
                .from("filters")
                .select("id, title")
                .eq("slug", slug)
                .eq("type", type)
                .maybeSingle();

            if (checkError) {
                console.error("Check filter error:", checkError);
                toast.error("Something went wrong while checking filter", {
                    style: { background: "black", color: "white" }
                });
                return null;
            }

            if (existingFilter) {
                return { id: existingFilter.id, title: existingFilter.title };
            }

            const { data, error } = await supabase
                .from("filters")
                .insert({
                    title,
                    slug,
                    type,
                    user_id: user?.id,
                })
                .select("id, title")
                .single();

            if (error) {
                console.error("Insert error:", error);
                toast.error("Failed to save custom filter. Please try again.", {
                    style: { background: "black", color: "white" }
                });
                return null;
            }
            return { id: data.id, title: data.title };
        } catch (err) {
            console.error("Unexpected error:", err);
            toast.error("Unexpected error occurred", {
                style: { background: "black", color: "white" }
            });
            return null;
        }
    };

    const handleInputChange = async (field: keyof FormData, value: string) => {
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

            if (value) {
                const typeMap: Record<string, string> = {
                    formFactor: "form_factor",
                    processor: "processor",
                    memory: "memory",
                    storage: "storage",
                    screenSize: "screen_size",
                };

                const type = typeMap[field];
                const { data } = await supabase
                    .from("filters")
                    .select("id")
                    .eq("type", type)
                    .eq("title", value)
                    .single();

                if (data) {
                    const idField = `${field}Id` as keyof FilterIds;
                    setFilterIds(prev => ({ ...prev, [idField]: data.id }));
                }
            }
        }
    };

    const handleRadioChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCustomInputChange = (field: keyof CustomInputs, value: string) => {
        setCustomInputs(prev => ({ ...prev, [field]: value }));
    };

    const handleAddAndSelectFilter = async (
        field: keyof CustomInputs,
        type: string
    ) => {
        const customValue = customInputs[field];
        if (!customValue.trim()) {
            toast.error("Please enter a value", {
                style: { background: "black", color: "white" }
            });
            return;
        }

        const result = await insertCustomFilter(customValue.trim(), type);
        if (result) {
            const formFieldMap: Record<string, keyof FormData> = {
                formFactor: "formFactor",
                processor: "processor",
                memory: "memory",
                storage: "storage",
                screenSize: "screenSize",
            };

            const formField = formFieldMap[field];
            if (formField) {
                setFormData(prev => ({ ...prev, [formField]: result.title }));

                const idField = `${formField}Id` as keyof FilterIds;
                setFilterIds(prev => ({ ...prev, [idField]: result.id }));
            }

            setCustomInputs(prev => ({ ...prev, [field]: "" }));
            await fetchFilterOptions();

            toast.success(`${type} "${result.title}" added and selected!`, {
                style: { background: "black", color: "white" }
            });
        }
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
                    console.error("Error uploading primary image:", uploadError);
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
                    console.error("Error uploading additional image:", uploadError);
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
            console.error("Error uploading images:", error);
            throw error;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsFormLoading(true);

        try {
            // Check for required fields
            const requiredFields = [
                { field: 'productName', label: 'Product Name', value: formData.productName },
                { field: 'sku', label: 'SKU', value: formData.sku },
                { field: 'formFactor', label: 'Form Factor', value: formData.formFactor },
                { field: 'processor', label: 'Processor', value: formData.processor },
                { field: 'memory', label: 'Memory', value: formData.memory },
                { field: 'storage', label: 'Storage', value: formData.storage },
                { field: 'screenSize', label: 'Screen Size', value: formData.screenSize },
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
                { field: 'formFactor', customField: 'formFactor' },
                { field: 'processor', customField: 'processor' },
                { field: 'memory', customField: 'memory' },
                { field: 'storage', customField: 'storage' },
                { field: 'screenSize', customField: 'screenSize' },
            ];

            const missingCustomInputs = customFieldsToCheck.filter(({ field, customField }) => {
                const formValue = formData[field as keyof FormData];
                const customValue = customInputs[customField as keyof CustomInputs];
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

            // Process custom filters
            const fieldMap: Record<string, { formField: keyof FormData, dbField: string }> = {
                formFactor: { formField: "formFactor", dbField: "form_factor" },
                processor: { formField: "processor", dbField: "processor" },
                memory: { formField: "memory", dbField: "memory" },
                storage: { formField: "storage", dbField: "storage" },
                screenSize: { formField: "screenSize", dbField: "screen_size" },
            };

            const customPromises = Object.entries(fieldMap)
                .filter(([customField]) => {
                    const formField = fieldMap[customField as keyof typeof fieldMap].formField;
                    return formData[formField] === "Custom" && customInputs[customField as keyof CustomInputs]?.trim();
                })
                .map(async ([customField, { dbField }]) => {
                    const value = customInputs[customField as keyof CustomInputs];
                    if (value?.trim()) {
                        const result = await insertCustomFilter(value.trim(), dbField);
                        if (result) {
                            const formField = fieldMap[customField as keyof typeof fieldMap].formField;
                            setFormData(prev => ({ ...prev, [formField]: result.title }));

                            const idField = `${formField}Id` as keyof FilterIds;
                            setFilterIds(prev => ({ ...prev, [idField]: result.id }));

                            return { field: customField, id: result.id, value: result.title };
                        }
                    }
                    return null;
                });

            const results = await Promise.all(customPromises);
            if (results.some(result => result !== null)) {
                await fetchFilterOptions();
            }

            // Upload images
            const imageUrls = await uploadImagesToSupabase();

            // Create slug
            const slug = createSlug(formData.productName);

            // Prepare final data
            const finalFormData = {
                ...formData,
                totalInventory: formData.totalInventory ? parseInt(formData.totalInventory) : null,
                stockQuantity: formData.stockQuantity ? parseInt(formData.stockQuantity) : null,
            };

            const toBool = (value?: string) => value === "Yes";

            if (isEditing && productId) {
                // UPDATE EXISTING PRODUCT
                const { data: pRow } = await supabase
                    .from("products")
                    .select("product_name")
                    .eq("product_name", finalFormData.productName)
                    .neq("id", productId)
                    .single();

                if (pRow) {
                    toast.error("Unable to update the device because a device with the same title already exists.", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }

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

                // Update device
                const { error } = await supabase
                    .from("products")
                    .update({
                        product_name: finalFormData.productName,
                        slug: slug,
                        sku: finalFormData.sku,
                        form_factor: filterIds.formFactorId,
                        processor: filterIds.processorId,
                        memory: filterIds.memoryId,
                        storage: filterIds.storageId,
                        screen_size: filterIds.screenSizeId,
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
                    .eq("id", productId)
                    .eq("user_id", profile?.userId);

                if (error) {
                    console.error("Update error:", error);
                    toast.error("Failed to update device. Please try again.", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }

                toast.success("Device updated successfully!", {
                    style: { background: "black", color: "white" }
                });

                router.push(`/product/${slug}`);

            } else {
                // CREATE NEW PRODUCT
                const { data: pRow } = await supabase
                    .from("products")
                    .select("product_name")
                    .eq("product_name", finalFormData.productName)
                    .single();

                if (pRow) {
                    toast.error("Unable to add the device because a device with the same title already exists.", {
                        style: { background: "red", color: "white" }
                    });
                    setIsFormLoading(false);
                    return;
                }

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

                // Insert new device
                const { error } = await supabase
                    .from("products")
                    .insert({
                        product_name: finalFormData.productName,
                        slug: slug,
                        sku: finalFormData.sku,
                        form_factor: filterIds.formFactorId,
                        processor: filterIds.processorId,
                        memory: filterIds.memoryId,
                        storage: filterIds.storageId,
                        screen_size: filterIds.screenSizeId,
                        technologies: finalFormData.technologies,
                        inventory_type: finalFormData.inventoryType,
                        total_inventory: finalFormData.totalInventory,
                        stock_quantity: finalFormData.stockQuantity,
                        date: finalFormData.currentDate,
                        copilot: toBool(finalFormData.copilotPC),
                        five_g_Enabled: toBool(finalFormData.fiveGEnabled),
                        post_status: finalFormData.postStatus,
                        description: finalFormData.description,
                        isBundle: false,
                        isInStock: true,
                        thumbnail: imageUrls.primary,
                        gallery: imageUrls.additional,
                        user_id: user?.id,
                    });

                if (error) {
                    console.error("Submission error:", error);
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
            console.error("Error submitting form:", error);
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

        setFilterIds({
            formFactorId: "",
            processorId: "",
            memoryId: "",
            storageId: "",
            screenSizeId: "",
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
                                    ? "bg-[#3ba1da] text-white border border-[#41abd6]"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent"
                                    }`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                )}

                {showCustomInput && (
                    <div className="flex gap-2 mt-2">
                        <input
                            type="text"
                            placeholder={`Enter custom ${label.toLowerCase()}`}
                            value={customInputs[customField]}
                            onChange={(e) =>
                                handleCustomInputChange(customField, e.target.value)
                            }
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md
                focus:outline-none focus:ring-2 focus:ring-[#3ba1da]"
                        />
                        <button
                            type="button"
                            onClick={() => handleAddAndSelectFilter(customField, type)}
                            className="px-4 py-2 bg-[#3ba1da] text-white font-medium rounded-md
                hover:bg-[#41abd6] focus:outline-none focus:ring-2 focus:ring-[#41abd6]"
                        >
                            Add
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (isLoadingProduct) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#3ba1da] mx-auto" />
                    <p className="mt-4 text-gray-600">Loading product data...</p>
                </div>
            </div>
        );
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
                                                <span className="text-[#3ba1da] font-medium cursor-pointer hover:text-[#41abd6] transition-colors">
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
                                            <span className="text-[#3ba1da] font-medium cursor-pointer hover:text-[#41abd6] transition-colors">
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ba1da]"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ba1da]"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ba1da]"
                                />
                                <p className="text-xs text-gray-500 mt-1">Example: Wi-Fi 6, Bluetooth 5.3, vPro</p>
                            </div>

                            {/* Inventory Type */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Inventory Type</label>
                                <select
                                    value={formData.inventoryType}
                                    onChange={(e) => handleInputChange('inventoryType', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ba1da]"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ba1da]"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ba1da]"
                                />
                            </div>

                            {/* Upload Date */}
                            <div>
                                <label className="block text-gray-700 text-sm font-medium mb-2">Date</label>
                                <input
                                    type="date"
                                    value={formData.currentDate}
                                    onChange={(e) => handleInputChange('currentDate', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ba1da]"
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
                                                className="text-[#3ba1da] focus:ring-[#41abd6]"
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
                                                className="text-[#3ba1da] focus:ring-[#41abd6]"
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
                                                className="text-[#3ba1da] focus:ring-[#41abd6]"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3ba1da]"
                                />
                                <p className="text-xs text-gray-500 mt-1">Add details like condition, highlights, notes.</p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center cursor-default">
                            <button
                                type="submit"
                                disabled={isFormLoading}
                                className={`px-12 py-3 bg-[#3ba1da] text-white font-medium rounded-md 
                  focus:outline-none focus:ring-2 focus:ring-[#41abd6] focus:ring-offset-2
                  transition-colors 
                  ${isFormLoading ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#41abd6] cursor-pointer'}`}
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