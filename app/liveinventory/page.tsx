"use client";

import * as React from "react";
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
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Key,
  CheckCircle,
  XCircle,
  View,
  Eye,
  Trash,
  Search,
  X,
} from "lucide-react";
import {
  logActivity,
  logError,
  logSuccess,
  logInfo,
  logWarning,
} from "@/lib/logger";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { TbFileTypeCsv } from "react-icons/tb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusOutlined } from "@ant-design/icons";
import { toast } from "sonner";

// Define Product type based on your Supabase table - Now using text values directly
export type Product = {
  id: string;
  product_name: string;
  slug: string;
  sku: string;
  stock_quantity: number | null;
  total_inventory: number | null;
  withCustomer: string | null;
  inventory_type: string | null;
  processor: string | null; // Now stores text value directly
  form_factor: string | null; // Now stores text value directly
  memory: string | null;
  storage: string | null;
  screen_size: string | null;
  technologies: string | null;
  description: string | null;
  copilot: boolean | null;
  five_g_Enabled: boolean | null;
  post_status: string | null;
  isBundle: boolean | null;
  isInStock: boolean | null;
  thumbnail: string | null;
  gallery: string[] | null;
  date: string | null;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 1000,
  });

  // For dropdown options in edit modal - fetch unique values from products table
  const [processorOptions, setProcessorOptions] = useState<string[]>([]);
  const [formFactorOptions, setFormFactorOptions] = useState<string[]>([]);

  // Role constants from environment variables
  const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
  const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
  const ssRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
  const sRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

  const allowedRoles = [smRole, adminRole, sRole, ssRole].filter(Boolean); // Remove undefined values
  const actionRoles = [smRole, adminRole].filter(Boolean); // Remove undefined values

  const columnDisplayNames: Record<string, string> = {
    product_name: "Product Name",
    sku: "SKU",
    stock_quantity: "Stock Quantity",
    total_inventory: "Total Inventory",
    withCustomer: "With Customer",
    inventory_type: "Inventory Owner",
    processor: "Processor",
    form_factor: "Form Factor",
    memory: "Memory",
    storage: "Storage",
    screen_size: "Screen Size",
    technologies: "Technologies",
    copilot: "Copilot + PC",
    five_g_Enabled: "5G Enabled",
    post_status: "Post Status",
    actions: "Actions",
  };

  // Check if current user is authorized
  const isAuthorized = profile?.role && allowedRoles.includes(profile.role);
  const isActionAuthorized =
    profile?.role && actionRoles.includes(profile.role);

  // Handle auth check
  useEffect(() => {
    if (loading) return;

    if (!isLoggedIn || !profile?.isVerified) {
      router.replace("/login/?redirect_to=liveinventory");
      return;
    }

    // Check if user has permission to access this page
    if (!isAuthorized) {
      router.replace("/product-category/alldevices");
      return;
    }
  }, [loading, isLoggedIn, profile, router, isAuthorized]);

  // Fetch products data from Supabase - Now directly without joining filters table
  const fetchProducts = async () => {
    const startTime = Date.now();

    // Log fetch attempt
    await logActivity({
      type: "product",
      level: "info",
      action: "products_fetch_attempt",
      message: "Attempting to fetch products",
      userId: profile?.id || null,
      details: {
        userRole: profile?.role,
        isActionAuthorized,
      },
    });

    try {
      setIsLoading(true);
      setError(null);

      // Fetch products directly - no joins needed anymore
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .order("product_name", { ascending: true });

      if (productsError) {
        await logActivity({
          type: "product",
          level: "error",
          action: "products_fetch_failed",
          message: `Failed to fetch products: ${productsError.message}`,
          userId: profile?.id || null,
          details: {
            error: productsError,
            executionTimeMs: Date.now() - startTime,
            userRole: profile?.role,
          },
          status: "failed",
        });
        throw productsError;
      }

      if (productsData) {
        await logActivity({
          type: "product",
          level: "success",
          action: "products_fetch_success",
          message: `Successfully fetched ${productsData.length} products`,
          userId: profile?.id || null,
          details: {
            productsCount: productsData.length,
            executionTimeMs: Date.now() - startTime,
            userRole: profile?.role,
          },
          status: "completed",
        });

        setProducts(productsData as Product[]);

        // Extract unique values for dropdowns
        extractUniqueOptions(productsData as Product[]);
      }
    } catch (err: unknown) {
      await logActivity({
        type: "product",
        level: "error",
        action: "products_fetch_error",
        message: "Failed to fetch products",
        userId: profile?.id || null,
        details: {
          error: err,
          executionTimeMs: Date.now() - startTime,
          userRole: profile?.role,
        },
        status: "failed",
      });
      if (err instanceof Error) {
        setError(err.message || "Failed to fetch products");
      } else {
        setError("Failed to fetch products");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Extract unique values for dropdown options
  const extractUniqueOptions = (productsData: Product[]) => {
    // Extract unique processor values
    const processors = [
      ...new Set(
        productsData
          .map((p) => p.processor)
          .filter(
            (value): value is string =>
              value !== null && value !== undefined && value !== "",
          ),
      ),
    ].sort();

    // Extract unique form factor values
    const formFactors = [
      ...new Set(
        productsData
          .map((p) => p.form_factor)
          .filter(
            (value): value is string =>
              value !== null && value !== undefined && value !== "",
          ),
      ),
    ].sort();

    setProcessorOptions(processors);
    setFormFactorOptions(formFactors);
  };

  // Fetch data when authorized
  useEffect(() => {
    if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
      fetchProducts();
    }
  }, [loading, isLoggedIn, profile, isAuthorized]);

  // Handle view product
  const handleViewProduct = async (product: Product) => {
    await logActivity({
      type: "ui",
      level: "info",
      action: "product_view_clicked",
      message: `User clicked to view product ${product.product_name}`,
      userId: profile?.id || null,
      productId: product.id,
      details: {
        productName: product.product_name,
        sku: product.sku,
        userRole: profile?.role,
      },
    });

    router.push(`/product/${product.slug}`);
  };

  // Handle edit product
  const handleEditProduct = async (product: Product) => {
    await logActivity({
      type: "ui",
      level: "info",
      action: "product_edit_clicked",
      message: `User clicked to edit product ${product.product_name}`,
      userId: profile?.id || null,
      productId: product.id,
      details: {
        productName: product.product_name,
        sku: product.sku,
        userRole: profile?.role,
      },
    });

    router.push(`/add-device?_=${product.slug}`);
  };

  // Handle add product
  const handleAddProduct = async () => {
    await logActivity({
      type: "ui",
      level: "info",
      action: "product_add_clicked",
      message: "User clicked to add new product",
      userId: profile?.id || null,
      details: {
        userRole: profile?.role,
      },
    });
    router.push(`/add-device`);
  };

  const handleSaveEdit = async () => {
    if (!editProduct) return;

    const startTime = Date.now();

    // Log edit attempt
    await logActivity({
      type: "product",
      level: "info",
      action: "product_edit_save_attempt",
      message: `Attempting to save edits for product ${editProduct.product_name}`,
      userId: profile?.id || null,
      productId: editProduct.id,
      details: {
        productName: editProduct.product_name,
        sku: editProduct.sku,
        userRole: profile?.role,
      },
    });

    try {
      const { error } = await supabase
        .from("products")
        .update({
          product_name: editProduct.product_name,
          sku: editProduct.sku,
          stock_quantity: editProduct.stock_quantity,
          total_inventory: editProduct.total_inventory,
          processor: editProduct.processor,
          form_factor: editProduct.form_factor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editProduct.id);

      if (error) {
        await logActivity({
          type: "product",
          level: "error",
          action: "product_edit_save_failed",
          message: `Failed to save product edits: ${error.message}`,
          userId: profile?.id || null,
          productId: editProduct.id,
          details: {
            productName: editProduct.product_name,
            error: error,
            executionTimeMs: Date.now() - startTime,
            userRole: profile?.role,
          },
          status: "failed",
        });
        throw error;
      }

      await logActivity({
        type: "product",
        level: "success",
        action: "product_edit_save_success",
        message: `Successfully saved edits for product ${editProduct.product_name}`,
        userId: profile?.id || null,
        productId: editProduct.id,
        details: {
          productName: editProduct.product_name,
          sku: editProduct.sku,
          stockQuantity: editProduct.stock_quantity,
          totalInventory: editProduct.total_inventory,
          processor: editProduct.processor,
          formFactor: editProduct.form_factor,
          executionTimeMs: Date.now() - startTime,
          userRole: profile?.role,
        },
        status: "completed",
      });

      fetchProducts(); // Refresh data
      setIsEditDialogOpen(false);
      setEditProduct(null);

      toast.success("Product updated successfully!", {
        style: { background: "black", color: "white" },
      });
    } catch (error) {
      await logActivity({
        type: "product",
        level: "error",
        action: "product_edit_save_error",
        message: `Failed to save product edits`,
        userId: profile?.id || null,
        productId: editProduct.id,
        details: {
          productName: editProduct.product_name,
          error: error,
          executionTimeMs: Date.now() - startTime,
          userRole: profile?.role,
        },
        status: "failed",
      });
      setError("Failed to update product");

      toast.error("Failed to update product", {
        style: { background: "red", color: "white" },
      });
    }
  };

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
        );
      },
      cell: ({ row }) => {
        const quantity = row.getValue("stock_quantity") as number | null;
        return (
          <div
            className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}
          >
            {row.getValue("product_name")}
          </div>
        );
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
        );
      },
      cell: ({ row }) => {
        const quantity = row.getValue("stock_quantity") as number | null;
        return (
          <div
            className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}
          >
            {row.getValue("sku")}
          </div>
        );
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
        );
      },
      cell: ({ row }) => {
        const quantity = row.getValue("stock_quantity") as number | null;
        return (
          <div
            className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}
          >
            {quantity !== null ? quantity : "N/A"}
          </div>
        );
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
        );
      },
      cell: ({ row }) => {
        const inventory = row.getValue("withCustomer") as number | null;
        const quantity = row.getValue("stock_quantity") as number | null;
        return (
          <div
            className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}
          >
            {inventory !== null ? inventory : "N/A"}
          </div>
        );
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
        );
      },
      cell: ({ row }) => {
        const inventory = row.getValue("total_inventory") as number | null;
        const quantity = row.getValue("stock_quantity") as number | null;
        return (
          <div
            className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}
          >
            {inventory !== null ? inventory : "N/A"}
          </div>
        );
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
        );
      },
      cell: ({ row }) => {
        const inventory_type = row.getValue("inventory_type") as string | null;
        const quantity = row.getValue("stock_quantity") as number | null;
        return (
          <div
            className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}
          >
            {inventory_type || "N/A"}
          </div>
        );
      },
    },
    // Processor column - now direct text value
    {
      accessorKey: "processor",
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
        );
      },
      cell: ({ row }) => {
        const processor = row.getValue("processor") as string | null;
        const quantity = row.getValue("stock_quantity") as number | null;
        return (
          <div
            className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}
          >
            {processor || "N/A"}
          </div>
        );
      },
    },

    // Form Factor column - now direct text value
    {
      accessorKey: "form_factor",
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
        );
      },
      cell: ({ row }) => {
        const formFactor = row.getValue("form_factor") as string | null;
        const quantity = row.getValue("stock_quantity") as number | null;
        return (
          <div
            className={`text-left ps-2 font-medium ${quantity == 0 && "text-red-600"}`}
          >
            {formFactor || "N/A"}
          </div>
        );
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
          const startTime = Date.now();

          // Log delete attempt
          await logActivity({
            type: "product",
            level: "warning",
            action: "product_delete_attempt",
            message: `Attempting to delete product ${product.product_name}`,
            userId: profile?.id || null,
            productId: product.id,
            details: {
              productName: product.product_name,
              sku: product.sku,
              userRole: profile?.role,
              deletedBy: profile?.email,
            },
          });

          try {
            const { error } = await supabase
              .from("products")
              .delete()
              .eq("id", product.id);

            if (error) {
              await logActivity({
                type: "product",
                level: "error",
                action: "product_delete_failed",
                message: `Failed to delete product: ${error.message}`,
                userId: profile?.id || null,
                productId: product.id,
                details: {
                  productName: product.product_name,
                  error: error,
                  executionTimeMs: Date.now() - startTime,
                  userRole: profile?.role,
                },
                status: "failed",
              });
              throw error;
            }

            await logActivity({
              type: "product",
              level: "success",
              action: "product_delete_success",
              message: `Successfully deleted product ${product.product_name}`,
              userId: profile?.id || null,
              productId: product.id,
              details: {
                productName: product.product_name,
                sku: product.sku,
                stockQuantity: product.stock_quantity,
                totalInventory: product.total_inventory,
                executionTimeMs: Date.now() - startTime,
                userRole: profile?.role,
                deletedBy: profile?.email,
              },
              status: "completed",
            });

            // Refresh the products list
            fetchProducts();
            setIsDeleteDialogOpen(false);

            toast.success("Product deleted successfully!", {
              style: { background: "black", color: "white" },
            });
          } catch (error) {
            await logActivity({
              type: "product",
              level: "error",
              action: "product_delete_error",
              message: `Failed to delete product ${product.product_name}`,
              userId: profile?.id || null,
              productId: product.id,
              details: {
                productName: product.product_name,
                error: error,
                executionTimeMs: Date.now() - startTime,
                userRole: profile?.role,
              },
              status: "failed",
            });
            setError("Failed to delete product");

            toast.error("Failed to delete product", {
              style: { background: "red", color: "white" },
            });
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
            <AlertDialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the product "{product.product_name}" (SKU: {product.sku}).
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
        );
      },
    });
  }

  const [globalFilter, setGlobalFilter] = useState<string>("");

  // Add autoResetPageIndex: false to table options
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
    autoResetPageIndex: false, // Add this line
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "auto",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      globalFilter, // Add this
    },
  });

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
      logActivity({
        type: "export",
        level: "warning",
        action: "csv_export_empty",
        message: "Attempted to export CSV with no products data",
        userId: profile?.id || null,
        details: {
          productsCount: products.length,
          userRole: profile?.role,
        },
        status: "skipped",
      });
      toast.info("No data to export");
      return;
    }

    const startTime = Date.now();

    // Log export attempt
    logActivity({
      type: "export",
      level: "info",
      action: "csv_export_attempt",
      message: "Attempting to export products to CSV",
      userId: profile?.id || null,
      details: {
        productsCount: products.length,
        userRole: profile?.role,
      },
    });

    try {
      // Prepare the data
      const data = products.map((product) => ({
        "Product Name": product.product_name || "",
        SKU: product.sku || "",
        "Stock Quantity": product.stock_quantity || 0,
        "Total Inventory": product.total_inventory || 0,
        "With Customer": product.withCustomer || 0,
        "Inventory Owner": product.inventory_type || "N/A",
        Processor: product.processor || "N/A",
        "Form Factor": product.form_factor || "N/A",
        "Product ID": product.id || "",
      }));

      // Convert to CSV string
      const csvString = convertToCSV(data);

      // Download file
      downloadCSV(
        csvString,
        `products_${new Date().toISOString().split("T")[0]}.csv`,
      );

      logActivity({
        type: "export",
        level: "success",
        action: "csv_export_success",
        message: `Successfully exported ${products.length} products to CSV`,
        userId: profile?.id || null,
        details: {
          productsCount: products.length,
          fileName: `products_${new Date().toISOString().split("T")[0]}.csv`,
          executionTimeMs: Date.now() - startTime,
          userRole: profile?.role,
        },
        status: "completed",
      });
    } catch (error) {
      logActivity({
        type: "export",
        level: "error",
        action: "csv_export_failed",
        message: `Failed to export products to CSV`,
        userId: profile?.id || null,
        details: {
          errorDetails: error,
          executionTimeMs: Date.now() - startTime,
          userRole: profile?.role,
        },
        status: "failed",
      });
      setError("Failed to export CSV");
    }
  };

  // Helper function to convert array of objects to CSV
  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);

    // Escape quotes and wrap in quotes if contains comma
    const escapeCSV = (field: any) => {
      if (field === null || field === undefined) return "";
      const string = String(field);
      if (
        string.includes(",") ||
        string.includes('"') ||
        string.includes("\n")
      ) {
        return `"${string.replace(/"/g, '""')}"`;
      }
      return string;
    };

    const headerRow = headers.map(escapeCSV).join(",");
    const dataRows = data.map((row) =>
      headers.map((header) => escapeCSV(row[header])).join(","),
    );

    return [headerRow, ...dataRows].join("\n");
  };

  // Helper function to download CSV
  const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-10 px-5">
      <div className="flex justify-between items-center mb-6">
        <h1 className="sm:text-3xl text-xl font-bold"></h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchProducts}
            disabled={isLoading}
            className="cursor-pointer"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            onClick={handleExportCSV}
            className="bg-[#0A4647] hover:bg-[#093636] cursor-pointer"
          >
            <TbFileTypeCsv />
            Export CSV
          </Button>
          {isActionAuthorized && (
            <Button
              onClick={handleAddProduct}
              className="bg-[#0A4647] hover:bg-[#093636] cursor-pointer"
            >
              <PlusOutlined />
              Add Product
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="w-full">
        <div className="flex items-center justify-between py-4 gap-4">
          <div className="">
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
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search..."
              value={globalFilter ?? ""}
              onChange={(event) => {
                setGlobalFilter(event.target.value);
                logActivity({
                  type: "ui",
                  level: "info",
                  action: "global_search_applied",
                  message: `Global search applied: ${event.target.value}`,
                  userId: profile?.id || null,
                  details: {
                    searchTerm: event.target.value,
                    previousTerm: globalFilter,
                    filteredCount: products.length,
                    userRole: profile?.role,
                  },
                });
              }}
              className="pl-8 pr-4 py-2 w-full border-2 focus:border-[#0A4647] transition-all"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter("")}
                className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-[#0A4647] hover:bg-[#0A4647]"
                >
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
                              header.getContext(),
                            )}
                      </TableHead>
                    );
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
                          cell.getContext(),
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
          <div className="flex justify-between items-center"></div>

          {/* Bottom row: Pagination controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Page info for desktop */}
            <div className="hidden sm:block text-sm text-gray-600"></div>

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
                  <span className="font-medium">
                    {table.getState().pagination.pageIndex + 1}
                  </span>
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
                    return Array.from({ length: pageCount }, (_, i) => i).map(
                      (pageIndex) => (
                        <Button
                          key={pageIndex}
                          variant={
                            currentPage === pageIndex ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => table.setPageIndex(pageIndex)}
                          className="w-8 h-8 p-0"
                        >
                          {pageIndex + 1}
                        </Button>
                      ),
                    );
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
                    </Button>,
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
                      </span>,
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
                      </Button>,
                    );
                  }

                  // Add ellipsis before last page if needed
                  if (end < pageCount - 2) {
                    pages.push(
                      <span key="ellipsis2" className="px-2 text-gray-500">
                        ...
                      </span>,
                    );
                  }

                  // Always show last page
                  pages.push(
                    <Button
                      key={pageCount - 1}
                      variant={
                        currentPage === pageCount - 1 ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => table.setPageIndex(pageCount - 1)}
                      className="w-8 h-8 p-0"
                    >
                      {pageCount}
                    </Button>,
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
                  onChange={(e) =>
                    setEditProduct({
                      ...editProduct,
                      product_name: e.target.value,
                    })
                  }
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
                  onChange={(e) =>
                    setEditProduct({ ...editProduct, sku: e.target.value })
                  }
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
                  value={editProduct.stock_quantity || ""}
                  onChange={(e) =>
                    setEditProduct({
                      ...editProduct,
                      stock_quantity:
                        e.target.value === "" ? null : parseInt(e.target.value),
                    })
                  }
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
                  value={editProduct.total_inventory || ""}
                  onChange={(e) =>
                    setEditProduct({
                      ...editProduct,
                      total_inventory:
                        e.target.value === "" ? null : parseInt(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="processor" className="text-right">
                  Processor
                </Label>
                <Select
                  value={editProduct.processor || ""}
                  onValueChange={(value) =>
                    setEditProduct({ ...editProduct, processor: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select processor" />
                  </SelectTrigger>
                  <SelectContent>
                    {processorOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem
                      value="__custom__"
                      className="text-[#3ba1da] font-medium"
                    >
                      + Add Custom
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="form_factor" className="text-right">
                  Form Factor
                </Label>
                <Select
                  value={editProduct.form_factor || ""}
                  onValueChange={(value) =>
                    setEditProduct({ ...editProduct, form_factor: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select form factor" />
                  </SelectTrigger>
                  <SelectContent>
                    {formFactorOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem
                      value="__custom__"
                      className="text-[#3ba1da] font-medium"
                    >
                      + Add Custom
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[#0A4647] hover:bg-[#093636] cursor-pointer"
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
