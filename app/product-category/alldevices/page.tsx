"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Drawer } from "antd";
import { FaFilter } from "react-icons/fa";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Sample product data - replace with API data
const PRODUCTS = [
    {
        id: 1,
        name: "Surface Pro 11",
        description: "Surface Pro 11 – Snapdragon X Plus – 16GB – 256GB SSD – 12″ w/Type Cover",
        sku: "#EP2-33681",
        category: "2in1s",
        processor: "Snapdragon X Plus",
        screenSize: '12"',
        memory: "24GB",
        storage: "1TB",
        copilotPC: true,
        fiveG: true,
        image: "/pro-laptop-1.png",
    },
    {
        id: 2,
        name: "Surface Laptop 7",
        description: "Surface Pro 11 – Snapdragon X Plus – 16GB – 256GB SSD – 12″ w/Type Cover",
        sku: "#EP2-33682",
        category: "Notebooks",
        processor: "Snapdragon X Elite",
        screenSize: '13.8"',
        memory: "32GB",
        storage: "1TB",
        copilotPC: true,
        fiveG: true,
        image: "/pro-laptop-1.png",
    },
    {
        id: 3,
        name: "Surface Pro Keyboard",
        description: "Surface Pro 11 – Snapdragon X Plus – 16GB – 256GB SSD – 12″ w/Type Cover",
        sku: "#EP2-33683",
        category: "Accessories",
        processor: "N/A",
        screenSize: "N/A",
        memory: "N/A",
        storage: "N/A",
        copilotPC: false,
        fiveG: false,
        image: "/pro-laptop-1.png",
    },
    {
        id: 4,
        name: "Surface Laptop Studio 2",
        description: "Surface Pro 11 – Snapdragon X Plus – 16GB – 256GB SSD – 12″ w/Type Cover",
        sku: "#EP2-33684",
        category: "Notebooks",
        processor: "Intel® Core™ Ultra 7",
        screenSize: '14.4"',
        memory: "32GB",
        storage: "2TB",
        copilotPC: true,
        fiveG: false,
        image: "/pro-laptop-1.png",
    },
    {
        id: 5,
        name: "Surface Dock 2",
        description: "Surface Pro 11 – Snapdragon X Plus – 16GB – 256GB SSD – 12″ w/Type Cover",
        sku: "#EP2-33685",
        category: "Accessories",
        processor: "N/A",
        screenSize: "N/A",
        memory: "N/A",
        storage: "N/A",
        copilotPC: false,
        fiveG: false,
        image: "/pro-laptop-1.png",
    },
    {
        id: 6,
        name: "Surface Pro 9",
        description: "Surface Pro 11 – Snapdragon X Plus – 16GB – 256GB SSD – 12″ w/Type Cover",
        sku: "#EP2-33686",
        category: "2in1s",
        processor: "Intel® Core™ Ultra 5",
        screenSize: '13"',
        memory: "16GB",
        storage: "256GB",
        copilotPC: true,
        fiveG: true,
        image: "/pro-laptop-1.png",
    },
    {
        id: 7,
        name: "Surface Slim Pen 2",
        description: "Surface Pro 11 – Snapdragon X Plus – 16GB – 256GB SSD – 12″ w/Type Cover",
        sku: "#EP2-33687",
        category: "Accessories",
        processor: "N/A",
        screenSize: "N/A",
        memory: "N/A",
        storage: "N/A",
        copilotPC: false,
        fiveG: false,
        image: "/pro-laptop-1.png",
    },
    {
        id: 8,
        name: "Surface Laptop Go 3",
        description: "Surface Pro 11 – Snapdragon X Plus – 16GB – 256GB SSD – 12″ w/Type Cover",
        sku: "#EP2-33689",
        category: "Notebooks",
        processor: "Intel® Core™ Ultra 5",
        screenSize: '12.4"',
        memory: "8GB",
        storage: "256GB",
        copilotPC: true,
        fiveG: false,
        image: "/pro-laptop-1.png",
    },
    {
        id: 9,
        name: "Surface Headphones 2+",
        description: "Surface Pro 11 – Snapdragon X Plus – 16GB – 256GB SSD – 12″ w/Type Cover",
        sku: "#EP2-33690",
        category: "Accessories",
        processor: "N/A",
        screenSize: "N/A",
        memory: "N/A",
        storage: "N/A",
        copilotPC: false,
        fiveG: false,
        image: "/pro-laptop-1.png",
    },
];

// Filter options
const FILTERS = {
    formFactor: ["2in1s", "Notebooks", "Accessories"],
    processor: ["Snapdragon X Elite", "Snapdragon X Plus", "Intel® Core™ Ultra 7", "Intel® Core™ Ultra 5"],
    screenSize: ['12"', '13.8"', '13"', '15"'],
    memory: ["24GB", "16GB", "32GB", "8GB"],
    storage: ["1TB", "256GB", "512GB", "2TB"],
    copilotPC: ["Yes"],
    fiveGEnabled: ["Yes"],
};

// Get all filter keys
const FILTER_KEYS = Object.keys(FILTERS);

export default function Page() {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
    const router = useRouter()
    const [filters, setFilters] = useState<Record<string, string[]>>({
        formFactor: [],
        processor: [],
        screenSize: [],
        memory: [],
        storage: [],
        copilotPC: [],
        fiveGEnabled: [],
    });

    const [showFilters, setShowFilters] = useState(false);
    // Set all filters to be open by default
    const [openFilters, setOpenFilters] = useState<string[]>(FILTER_KEYS);

    useEffect(() => {
        const checkAuth = async () => {
            const { data } = await supabase.auth.getSession()

            if (!data.session) {
                router.replace('/login/?redirect_to=product-category/alldevices')
                return
            }

            setIsLoggedIn(true)
        }

        checkAuth()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                router.replace('/login')
            } else {
                setIsLoggedIn(true)
            }
        })

        return () => subscription.unsubscribe()
    }, [router])

    // Toggle individual filter open/close state
    const toggleFilter = (filterType: string) => {
        setOpenFilters(prev => 
            prev.includes(filterType)
                ? prev.filter(f => f !== filterType)
                : [...prev, filterType]
        );
    };

    // Optional: prevent UI flicker
    if (isLoggedIn === null) return null

    // Filter products based on selected filters
    const filteredProducts = PRODUCTS.filter(product => {
        return Object.entries(filters).every(([key, values]) => {
            if (values.length === 0) return true;

            // Map filter keys to product property names
            const keyMapping: Record<string, keyof typeof product> = {
                formFactor: "category",
                fiveGEnabled: "fiveG",
                copilotPC: "copilotPC",
                processor: "processor",
                screenSize: "screenSize",
                memory: "memory",
                storage: "storage"
            };

            const productKey = keyMapping[key] || key as keyof typeof product;
            const productValue = product[productKey];

            // Handle undefined/null values
            if (productValue === undefined || productValue === null) {
                return false;
            }

            // Handle boolean filters
            if (key === "copilotPC" || key === "fiveGEnabled") {
                return values.includes("Yes") ? productValue === true : true;
            }

            // Handle string values
            return values.includes(productValue.toString());
        });
    });

    const handleFilterChange = (filterType: string, value: string) => {
        setFilters(prev => {
            const currentValues = prev[filterType] || [];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];

            return { ...prev, [filterType]: newValues };
        });
    };

    const clearFilters = () => {
        setFilters({
            formFactor: [],
            processor: [],
            screenSize: [],
            memory: [],
            storage: [],
            copilotPC: [],
            fiveGEnabled: [],
        });
    };

    const getActiveFilterCount = () => {
        return Object.values(filters).reduce((total, values) => total + values.length, 0);
    };

    // Helper component for filter section
    const FilterSection = ({ filterKey, title }: { filterKey: string, title: string }) => (
        <div className="border-b pb-4">
            <button
                onClick={() => toggleFilter(filterKey)}
                className="flex items-center justify-between w-full text-left font-semibold text-gray-800 hover:text-[#3ba1da]"
            >
                {title}
                {openFilters.includes(filterKey) ? (
                    <ChevronUp className="h-4 w-4" />
                ) : (
                    <ChevronDown className="h-4 w-4" />
                )}
            </button>
            {openFilters.includes(filterKey) && (
                <div className="mt-3 space-y-2">
                    {FILTERS[filterKey as keyof typeof FILTERS].map(item => (
                        <label key={item} className="flex items-center space-x-3 cursor-pointer py-1">
                            <input
                                type="checkbox"
                                checked={filters[filterKey].includes(item)}
                                onChange={() => handleFilterChange(filterKey, item)}
                                className="h-4 w-4 text-[#3ba1da] rounded border-gray-300 focus:ring-[#3ba1da]"
                            />
                            <span className="text-gray-700 text-sm">{item}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen ">
            <div className="flex">
                {/* Fixed Filter Sidebar - Desktop */}
                <div className="hidden lg:block w-64 flex-shrink-0 h-full top-0 overflow-y-auto bg-white border-r border-gray-200">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            {getActiveFilterCount() > 0 && (
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-[#3ba1da] hover:text-[#41abd6]"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Form Factor */}
                            <FilterSection filterKey="formFactor" title="Form Factor" />
                            
                            {/* Processor */}
                            <FilterSection filterKey="processor" title="Processor" />
                            
                            {/* Screen Size */}
                            <FilterSection filterKey="screenSize" title="Screen Size" />
                            
                            {/* Memory */}
                            <FilterSection filterKey="memory" title="Memory" />
                            
                            {/* Storage */}
                            <FilterSection filterKey="storage" title="Storage" />
                            
                            {/* Copilot + PC */}
                            <FilterSection filterKey="copilotPC" title="Copilot + PC" />
                            
                            {/* 5G Enabled */}
                            <FilterSection filterKey="fiveGEnabled" title="5G Enabled" />
                        </div>
                    </div>
                </div>

                {/* Main Content Area (right side of sidebar) */}
                <div className="flex-1 min-h-screen sm:px-0 px-6">
                    {/* Mobile filter button */}
                    <div className="lg:hidden p-4 flex items-center justify-between gap-3">
                        {/* Mobile Heading */}
                        <div className=""></div>
                        <h1 className="text-4xl  text-gray-900">
                            All Devices
                        </h1>

                        {/* Filter Button */}
                        <button
                            onClick={() => setShowFilters(true)}
                            className="m-2"
                        >
                            <FaFilter size={15} />
                        </button>
                    </div>


                    {/* Full Width Banner - Only on Large Screens */}
                    <div className="relative h-[60vh] w-full overflow-hidden hidden lg:block">
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                                backgroundImage: "url('/products-panel.png')",
                            }}
                        />
                    </div>


                    {/* Products Section */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-14">
                        {/* Results header */}
                        {getActiveFilterCount() > 0 && (
                            <div className="mb-8">
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {Object.entries(filters).map(([key, values]) =>
                                        values.map(value => (
                                            <span
                                                key={`${key}-${value}`}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#3ba1da]/10 text-[#3ba1da] text-sm"
                                            >
                                                {value}
                                                <button
                                                    onClick={() => handleFilterChange(key, value)}
                                                    className="ml-1 hover:text-red-500"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        ))
                                    )}
                                    <button
                                        onClick={clearFilters}
                                        className="text-sm text-gray-600 hover:text-[#3ba1da]"
                                    >
                                        Clear all
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Products grid */}
                        <div className="w-full lg:max-w-7xl lg:mx-auto lg:px-6">
                            {filteredProducts.length > 0 ? (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-10">
                                    {filteredProducts.map(product => (
                                        <div
                                            key={product.id}
                                            className="bg-white border border-gray-300 sm:p-5 p-3 overflow-hidden hover:shadow-md transition-shadow duration-300 group"
                                        >
                                            {/* Image */}
                                            <div className="flex items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                                                <Image
                                                    src={product.image}
                                                    alt={product.name}
                                                    width={230}
                                                    height={230}
                                                    className="object-cover"
                                                />
                                            </div>

                                            {/* Product Info */}
                                            <div className="space-y-2 text-center">
                                                <p className="text-gray-600 sm:text-md sm:font-semibold sm:text-md text-sm">
                                                    {product.description}
                                                </p>

                                                <p className="text-gray-500 text-sm py-4">
                                                    <b>SKU</b> {product.sku}
                                                </p>

                                                <div className="flex justify-center pt-2">
                                                    <button className="px-4 py-1.5 text-xs font-medium text-[#0a4647] border border-[#0a4647] rounded hover:bg-[#0a4647] hover:text-white transition-colors">
                                                        Add to cart
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-600 text-lg">
                                        No products found matching your filters.
                                    </p>
                                    <button
                                        onClick={clearFilters}
                                        className="mt-4 text-[#3ba1da] hover:text-[#41abd6] font-medium"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile filters drawer */}
            <Drawer
                title={
                    <div className="flex items-center justify-between">
                        <span className="text-xl font-bold">Filters</span>
                        {getActiveFilterCount() > 0 && (
                            <button
                                onClick={clearFilters}
                                className="text-sm text-[#3ba1da] hover:text-[#41abd6]"
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                }
                placement="right"
                onClose={() => setShowFilters(false)}
                open={showFilters}
                size={300}
                className="filter-drawer"
            >
                <div className="space-y-6">
                    {/* Form Factor */}
                    <FilterSection filterKey="formFactor" title="Form Factor" />
                    
                    {/* Processor */}
                    <FilterSection filterKey="processor" title="Processor" />
                    
                    {/* Screen Size */}
                    <FilterSection filterKey="screenSize" title="Screen Size" />
                    
                    {/* Memory */}
                    <FilterSection filterKey="memory" title="Memory" />
                    
                    {/* Storage */}
                    <FilterSection filterKey="storage" title="Storage" />
                    
                    {/* Copilot + PC */}
                    <FilterSection filterKey="copilotPC" title="Copilot + PC" />
                    
                    {/* 5G Enabled */}
                    <FilterSection filterKey="fiveGEnabled" title="5G Enabled" />
                </div>
            </Drawer>
        </div>
    );
}