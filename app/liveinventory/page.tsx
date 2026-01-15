"use client"

import * as React from "react"
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Edit, Key, CheckCircle, XCircle, View, Eye, Trash } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { TbFileTypeCsv } from "react-icons/tb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { PlusOutlined } from "@ant-design/icons"

// Define Product type based on your Supabase table
export type Product = {
    id: string
    product_name: string
    slug: string
    sku: string
    stock_quantity: number | null
    total_inventory: number | null
    processor: string | null
    form_factor: string | null
    processor_title?: string | null  // from filters table
    form_factor_title?: string | null // from filters table
}

// Define Filter type for joins
export type Filter = {
    id: string
    title: string
}

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Table states
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    // Role constants from environment variables
    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const ssRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const sRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

    const allowedRoles = [smRole, adminRole, sRole, ssRole].filter(Boolean); // Remove undefined values
    const actionRoles = [smRole, adminRole].filter(Boolean); // Remove undefined values

    const columnDisplayNames: Record<string, string> = {
        "product_name": "Product Name",
        "sku": "SKU",
        "stock_quantity": "Stock Quantity",
        "total_inventory": "Total Inventory",
        "withCustomer": "With Customer",
        "inventory_type": "Inventory Owner",
        "processor_title": "Processor",
        "form_factor_title": "Form Factor",
        "actions": "Actions"
    };

    // Check if current user is authorized
    const isAuthorized = profile?.role && allowedRoles.includes(profile.role);
    const isActionAuthorized = profile?.role && actionRoles.includes(profile.role);

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            console.log("User not authenticated, redirecting to login");
            router.replace('/login/?redirect_to=liveinventory');
            return;
        }

        // Check if user has permission to access this page
        if (!isAuthorized) {
            console.log("User not authorized, redirecting...");
            router.replace('/product-category/alldevices');
            return;
        }

    }, [loading, isLoggedIn, profile, router, isAuthorized]);

    // Fetch products data from Supabase with joins to filters table
    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // First, let's check the structure of the tables
            console.log("Fetching products data...");

            // Fetch products with joins to filters table
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select(`
                    *,
                    processor_filter:processor!inner (title),
                    form_factor_filter:form_factor!inner (title)
                `)
                .order('product_name', { ascending: true });

            if (productsError) {
                console.error("Products fetch error:", productsError);
                throw productsError;
            }

            console.log("Products data fetched:", productsData);

            if (productsData) {
                // Transform the data to match our Product type
                const transformedProducts = productsData.map((product: any) => ({
                    id: product.id,
                    product_name: product.product_name || '',
                    sku: product.sku || '',
                    slug: product.slug || '',
                    stock_quantity: product.stock_quantity,
                    total_inventory: product.total_inventory,
                    withCustomer: product.withCustomer,
                    inventory_type: product.inventory_type,
                    processor: product.processor,
                    form_factor: product.form_factor,
                    processor_title: product.processor_filter?.title || null,
                    form_factor_title: product.form_factor_filter?.title || null
                }));
                setProducts(transformedProducts as Product[]);
            }
        } catch (err: unknown) {
            console.error('Error fetching products:', err);
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch products');
            } else {
                setError('Failed to fetch products');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Alternative fetch method if the above doesn't work
    const fetchProductsAlternative = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Fetch products
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('*')
                .order('product_name', { ascending: true });

            if (productsError) throw productsError;

            // Fetch filters
            const { data: filtersData, error: filtersError } = await supabase
                .from('filters')
                .select('id, title');

            if (filtersError) throw filtersError;

            console.log("Products:", productsData);
            console.log("Filters:", filtersData);

            // Create a map of filter IDs to titles
            const filterMap = new Map();
            if (filtersData) {
                filtersData.forEach((filter: Filter) => {
                    filterMap.set(filter.id, filter.title);
                });
            }

            // Transform products
            const transformedProducts = productsData?.map((product: any) => ({
                id: product.id,
                slug: product.slug,
                product_name: product.product_name || '',
                sku: product.sku || '',
                stock_quantity: product.stock_quantity,
                total_inventory: product.total_inventory,
                withCustomer: product.withCustomer,
                processor: product.processor,
                inventory_type: product.inventory_type,
                form_factor: product.form_factor,
                processor_title: product.processor ? filterMap.get(product.processor) || null : null,
                form_factor_title: product.form_factor ? filterMap.get(product.form_factor) || null : null
            }));

            console.log("product: ", productsData)

            setProducts(transformedProducts || []);

        } catch (err: unknown) {
            console.error('Error fetching products:', err);
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch products');
            } else {
                setError('Failed to fetch products');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch data when authorized
    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
            // Try the first method, fall back to alternative
            fetchProducts().catch(() => fetchProductsAlternative());
        }
    }, [loading, isLoggedIn, profile, isAuthorized]);

    // Handle view product
    const handleViewProduct = (product: Product) => {
        router.push(`/product/${product.slug}`)
    };

    // Handle edit product
    const handleEditProduct = (product: Product) => {
        router.push(`/add-device?_=${product.slug}`)
    };

    // Handle add product
    const handleAddProduct = () => {
        router.push(`/add-device`)
    };

    const handleSaveEdit = async () => {
        if (!editProduct) return;

        try {
            const { error } = await supabase
                .from('products')
                .update({
                    product_name: editProduct.product_name,
                    sku: editProduct.sku,
                    stock_quantity: editProduct.stock_quantity,
                    total_inventory: editProduct.total_inventory,
                })
                .eq('id', editProduct.id);

            if (error) throw error;

            fetchProducts(); // Refresh data
            setIsEditDialogOpen(false);
            setEditProduct(null);
        } catch (error) {
            console.error('Error updating product:', error);
            setError('Failed to update product');
        }
    };

    // Fetch filters for dropdowns in edit modal
    const [processorFilters, setProcessorFilters] = useState<Filter[]>([]);
    const [formFactorFilters, setFormFactorFilters] = useState<Filter[]>([]);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                // Assuming you have a way to identify processor vs form_factor filters
                // You might need to adjust this based on your filters table structure
                const { data, error } = await supabase
                    .from('filters')
                    .select('id, title')
                    .or('type.eq.processor,type.eq.form_factor')
                    .order('title', { ascending: true });

                if (error) throw error;

                if (data) {
                    // You might need to separate these based on your data structure
                    // For now, we'll use all filters
                    setProcessorFilters(data);
                    setFormFactorFilters(data);
                }
            } catch (err) {
                console.error('Error fetching filters:', err);
            }
        };

        if (isEditDialogOpen) {
            fetchFilters();
        }
    }, [isEditDialogOpen]);


    // Define columns with proper typing
    const columns: ColumnDef<Product>[] = [
        // Product Name column
        {
            accessorKey: "product_name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Product Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const quantity = row.getValue("stock_quantity") as number | null;
                return (
                    <div className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}>{row.getValue("product_name")}</div>
                )
            },
        },

        // SKU column
        {
            accessorKey: "sku",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        SKU
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const quantity = row.getValue("stock_quantity") as number | null;
                return (
                    <div className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}>{row.getValue("sku")}</div>)
            },
        },

        // Stock Quantity column
        {
            accessorKey: "stock_quantity",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Devices In Stock
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const quantity = row.getValue("stock_quantity") as number | null;
                return (
                    <div className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}>
                        {quantity !== null ? quantity : 'N/A'}
                    </div>
                )
            },
        },
        {
            accessorKey: "withCustomer",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        With Customer
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const inventory = row.getValue("withCustomer") as number | null;
                const quantity = row.getValue("stock_quantity") as number | null;
                return (
                    <div className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}>
                        {inventory !== null ? inventory : 'N/A'}
                    </div>
                )
            },
        },
        // Total Inventory column
        {
            accessorKey: "total_inventory",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Total Inventory
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const inventory = row.getValue("total_inventory") as number | null;
                const quantity = row.getValue("stock_quantity") as number | null;
                return (
                    <div className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}>
                        {inventory !== null ? inventory : 'N/A'}
                    </div>
                )
            },
        },
        {
            accessorKey: "inventory_type",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Inventory Owner
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const inventory_type = row.getValue("inventory_type") as string | null;
                const quantity = row.getValue("stock_quantity") as number | null;
                return <div className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}>{inventory_type || 'N/A'}</div>
            },
        },
        // Processor column (from filters table)
        {
            accessorKey: "processor_title",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Processor
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const processor = row.getValue("processor_title") as string | null;
                const quantity = row.getValue("stock_quantity") as number | null;
                return <div className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}>{processor || 'N/A'}</div>
            },
        },

        // Form Factor column (from filters table)
        {
            accessorKey: "form_factor_title",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Form Factor
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const formFactor = row.getValue("form_factor_title") as string | null;
                const quantity = row.getValue("stock_quantity") as number | null;
                return <div className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}>{formFactor || 'N/A'}</div>
            },
        },
    ];

    // Only add actions column if user is authorized for actions
    if (isActionAuthorized) {
        columns.unshift({
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const product = row.original;
                const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

                const handleDeleteClick = () => {
                    setIsDeleteDialogOpen(true);
                };

                const handleConfirmDelete = async () => {
                    try {
                        const { error } = await supabase
                            .from('products')
                            .delete()
                            .eq('id', product.id);

                        if (error) throw error;

                        // Refresh the products list
                        fetchProducts();
                        setIsDeleteDialogOpen(false);
                    } catch (error) {
                        console.error('Error deleting product:', error);
                        setError('Failed to delete product');
                    }
                };

                return (
                    <div className="flex space-x-2 ps-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => navigator.clipboard.writeText(product.sku)}
                                >
                                    Copy SKU
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => handleViewProduct(product)}
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Product
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => handleEditProduct(product)}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Product
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                    onClick={handleDeleteClick}
                                >
                                    <Trash className="mr-2 h-4 w-4" />
                                    Delete Product
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Delete Confirmation Dialog */}
                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the product
                                        "{product.product_name}" (SKU: {product.sku}).
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleConfirmDelete}
                                        className="bg-red-500 hover:bg-red-600"
                                    >
                                        Delete Product
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )
            },
        });
    }

    // Initialize table
    const table = useReactTable({
        data: products,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination,
        },
    })

    // Show loading states
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-lg">Loading authentication...</div>
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

    const handleExportCSV = () => {
        if (products.length === 0) {
            alert("No data to export");
            return;
        }

        try {
            // Prepare the data
            const data = products.map(product => ({
                'Product Name': product.product_name || '',
                'SKU': product.sku || '',
                'Stock Quantity': product.stock_quantity || 0,
                'Total Inventory': product.total_inventory || 0,
                'Processor': product.processor_title || 'N/A',
                'Form Factor': product.form_factor_title || 'N/A',
                'Product ID': product.id || ''
            }));

            // Convert to CSV string
            const csvString = convertToCSV(data);

            // Download file
            downloadCSV(csvString, `products_${new Date().toISOString().split('T')[0]}.csv`);

            console.log("CSV exported successfully");
        } catch (error) {
            console.error('Error exporting CSV:', error);
            setError('Failed to export CSV');
        }
    };

    // Helper function to convert array of objects to CSV
    const convertToCSV = (data: any[]) => {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);

        // Escape quotes and wrap in quotes if contains comma
        const escapeCSV = (field: any) => {
            if (field === null || field === undefined) return '';
            const string = String(field);
            if (string.includes(',') || string.includes('"') || string.includes('\n')) {
                return `"${string.replace(/"/g, '""')}"`;
            }
            return string;
        };

        const headerRow = headers.map(escapeCSV).join(',');
        const dataRows = data.map(row =>
            headers.map(header => escapeCSV(row[header])).join(',')
        );

        return [headerRow, ...dataRows].join('\n');
    };

    // Helper function to download CSV
    const downloadCSV = (csvContent: string, fileName: string) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    };

    return (
        <div className="container mx-auto py-10 px-5">
            <div className="flex justify-between items-center mb-6">
                <h1 className="sm:text-3xl text-xl font-bold">Product Management</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchProducts}
                        disabled={isLoading}
                        className="cursor-pointer"
                    >
                        {isLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button onClick={handleExportCSV} className="bg-[#0A4647] hover:bg-[#093636] cursor-pointer">
                        <TbFileTypeCsv />
                        Export CSV
                    </Button>
                    {isActionAuthorized &&
                        <Button onClick={handleAddProduct} className="bg-[#0A4647] hover:bg-[#093636] cursor-pointer">
                            <PlusOutlined />
                            Add Product
                        </Button>
                    }
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="w-full">
                <div className="flex items-center py-4 gap-4">
                    <Input
                        placeholder="Filter products..."
                        value={(table.getColumn("product_name")?.getFilterValue() as string) ?? ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            table.getColumn("product_name")?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto">
                                Columns <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value: boolean) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {columnDisplayNames[column.id] || column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="bg-[#0A4647] hover:bg-[#0A4647]">
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead
                                                key={header.id}
                                                className="text-white font-semibold border-r border-[#2d5f60] last:border-r-0"
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className="hover:bg-gray-50"
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className="border-r border-gray-200 last:border-r-0 align-middle"
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center border-r-0"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                                <span className="ml-2">Loading products...</span>
                                            </div>
                                        ) : (
                                            "No products found."
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex flex-col gap-4 py-4">
                    {/* Top row: Rows per page selector */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 whitespace-nowrap">Show</span>
                            <select
                                value={pagination.pageSize}
                                onChange={e => table.setPageSize(Number(e.target.value))}
                                className="border rounded px-2 py-1 text-sm"
                            >
                                {[5, 10, 20, 30, 50].map(pageSize => (
                                    <option key={pageSize} value={pageSize}>
                                        {pageSize}
                                    </option>
                                ))}
                            </select>
                            <span className="text-sm text-gray-600 whitespace-nowrap">entries</span>
                        </div>

                        {/* Page info for mobile */}
                        <div className="text-sm text-gray-600 sm:hidden">
                            {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
                        </div>
                    </div>

                    {/* Bottom row: Pagination controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Page info for desktop */}
                        <div className="hidden sm:block text-sm text-gray-600">
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                        </div>

                        <div className="flex items-center justify-center space-x-1 w-full sm:w-auto">
                            {/* Mobile simplified pagination */}
                            <div className="sm:hidden flex items-center justify-center w-full">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="flex-1 max-w-[100px]"
                                >
                                    ‹ Prev
                                </Button>

                                <div className="mx-4 flex items-center">
                                    <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span>
                                    <span className="mx-1 text-gray-500">of</span>
                                    <span className="text-gray-600">{table.getPageCount()}</span>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="flex-1 max-w-[100px]"
                                >
                                    Next ›
                                </Button>
                            </div>

                            {/* Desktop full pagination */}
                            <div className="hidden sm:flex items-center space-x-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="px-3"
                                >
                                    Previous
                                </Button>

                                {/* Smart page numbers with ellipsis */}
                                {(() => {
                                    const pageCount = table.getPageCount();
                                    const currentPage = table.getState().pagination.pageIndex;

                                    if (pageCount <= 7) {
                                        // Show all pages for small page counts
                                        return Array.from({ length: pageCount }, (_, i) => i).map(pageIndex => (
                                            <Button
                                                key={pageIndex}
                                                variant={currentPage === pageIndex ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => table.setPageIndex(pageIndex)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageIndex + 1}
                                            </Button>
                                        ));
                                    }

                                    // Smart pagination for many pages
                                    const pages = [];

                                    // Always show first page
                                    pages.push(
                                        <Button
                                            key={0}
                                            variant={currentPage === 0 ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => table.setPageIndex(0)}
                                            className="w-8 h-8 p-0"
                                        >
                                            1
                                        </Button>
                                    );

                                    // Calculate dynamic range
                                    let start = Math.max(1, currentPage - 1);
                                    let end = Math.min(pageCount - 2, currentPage + 1);

                                    // Adjust if at the beginning
                                    if (currentPage <= 2) {
                                        start = 1;
                                        end = 3;
                                    }

                                    // Adjust if at the end
                                    if (currentPage >= pageCount - 3) {
                                        start = pageCount - 4;
                                        end = pageCount - 2;
                                    }

                                    // Add ellipsis after first page if needed
                                    if (start > 1) {
                                        pages.push(
                                            <span key="ellipsis1" className="px-2 text-gray-500">
                                                ...
                                            </span>
                                        );
                                    }

                                    // Add middle pages
                                    for (let i = start; i <= end; i++) {
                                        pages.push(
                                            <Button
                                                key={i}
                                                variant={currentPage === i ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => table.setPageIndex(i)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {i + 1}
                                            </Button>
                                        );
                                    }

                                    // Add ellipsis before last page if needed
                                    if (end < pageCount - 2) {
                                        pages.push(
                                            <span key="ellipsis2" className="px-2 text-gray-500">
                                                ...
                                            </span>
                                        );
                                    }

                                    // Always show last page
                                    pages.push(
                                        <Button
                                            key={pageCount - 1}
                                            variant={currentPage === pageCount - 1 ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => table.setPageIndex(pageCount - 1)}
                                            className="w-8 h-8 p-0"
                                        >
                                            {pageCount}
                                        </Button>
                                    );

                                    return pages;
                                })()}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="px-3"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Product Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Product</DialogTitle>
                        <DialogDescription>
                            Make changes to product details here.
                        </DialogDescription>
                    </DialogHeader>
                    {editProduct && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="product_name" className="text-right">
                                    Product Name
                                </Label>
                                <Input
                                    id="product_name"
                                    value={editProduct.product_name}
                                    onChange={(e) => setEditProduct({ ...editProduct, product_name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sku" className="text-right">
                                    SKU
                                </Label>
                                <Input
                                    id="sku"
                                    value={editProduct.sku}
                                    onChange={(e) => setEditProduct({ ...editProduct, sku: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stock_quantity" className="text-right">
                                    Stock Quantity
                                </Label>
                                <Input
                                    id="stock_quantity"
                                    type="number"
                                    value={editProduct.stock_quantity || ''}
                                    onChange={(e) => setEditProduct({
                                        ...editProduct,
                                        stock_quantity: e.target.value === '' ? null : parseInt(e.target.value)
                                    })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="total_inventory" className="text-right">
                                    Total Inventory
                                </Label>
                                <Input
                                    id="total_inventory"
                                    type="number"
                                    value={editProduct.total_inventory || ''}
                                    onChange={(e) => setEditProduct({
                                        ...editProduct,
                                        total_inventory: e.target.value === '' ? null : parseInt(e.target.value)
                                    })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="processor" className="text-right">
                                    Processor
                                </Label>
                                <Select
                                    value={editProduct.processor || ''}
                                    onValueChange={(value) => setEditProduct({ ...editProduct, processor: value })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select processor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {processorFilters.map((filter) => (
                                            <SelectItem key={filter.id} value={filter.id}>
                                                {filter.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="form_factor" className="text-right">
                                    Form Factor
                                </Label>
                                <Select
                                    value={editProduct.form_factor || ''}
                                    onValueChange={(value) => setEditProduct({ ...editProduct, form_factor: value })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select form factor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {formFactorFilters.map((filter) => (
                                            <SelectItem key={filter.id} value={filter.id}>
                                                {filter.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="cursor-pointer">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} className="bg-[#0A4647] hover:bg-[#093636] cursor-pointer">
                            Save changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}