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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Edit, Key, CheckCircle, XCircle } from "lucide-react"
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

// Define User type based on your Supabase table
export type User = {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    registered_at: string | null
    login_at: string | null
    login_count: number | null
    isVerified: boolean
}

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [editUser, setEditUser] = useState<User | null>(null);
    const [changeRoleUser, setChangeRoleUser] = useState<User | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>("");
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

    // Table states
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = useState({})

    // Role constants from environment variables
    const smRole = process.env.NEXT_PUBLIC_SHOPMANAGER;
    const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;
    const superSubscriberRole = process.env.NEXT_PUBLIC_SUPERSUBSCRIBER;
    const subscriberRole = process.env.NEXT_PUBLIC_SUBSCRIBER;

    const allowedRoles = [smRole, adminRole].filter(Boolean); // Remove undefined values

    const columnDisplayNames: Record<string, string> = {
        "firstName": "First Name",
        "lastName": "Last Name",
        "email": "Email",
        "role": "Role",
        "isVerified": "Verified",
        "registered_at": "Registered",
        "login_at": "Last Login",
        "login_count": "Login Count",
        "actions": "Actions"
    };

    // Role options for select
    const roleOptions = [
        { label: "Admin", value: adminRole || "Administrator" },
        { label: "Super Subscriber", value: superSubscriberRole || "Super-Subscriber" },
        { label: "Shop Manager", value: smRole || "Shop-Manager" },
        { label: "Subscriber", value: subscriberRole || "Subscriber" }
    ];

    // Check if current user is authorized
    const isAuthorized = profile?.role && allowedRoles.includes(profile.role);

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            console.log("User not authenticated, redirecting to login");
            router.replace('/login/?redirect_to=users-list');
            return;
        }

        // Check if user has permission to access this page
        if (!isAuthorized) {
            console.log("User not authorized, redirecting...");
            router.replace('/product-category/alldevices');
            return;
        }

    }, [loading, isLoggedIn, profile, router, isAuthorized]);

    // Fetch users data from Supabase
    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const { data, error: supabaseError } = await supabase
                .from('users')
                .select('*')
                .order('registered_at', { ascending: false });

            if (supabaseError) {
                throw supabaseError;
            }

            if (data) {
                setUsers(data as User[]);
            }
        } catch (err: unknown) {
            console.error('Error fetching users:', err);
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch users');
            } else {
                setError('Failed to fetch users');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch data when authorized
    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
            fetchUsers();
        }
    }, [loading, isLoggedIn, profile, isAuthorized]);

    // Handle edit user
    const handleEditUser = (user: User) => {
        setEditUser(user);
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editUser) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    firstName: editUser.firstName,
                    lastName: editUser.lastName,
                    email: editUser.email,
                })
                .eq('id', editUser.id);

            if (error) throw error;

            fetchUsers(); // Refresh data
            setIsEditDialogOpen(false);
            setEditUser(null);
        } catch (error) {
            console.error('Error updating user:', error);
            setError('Failed to update user');
        }
    };

    // Handle change role
    const handleChangeRole = (user: User) => {
        setChangeRoleUser(user);
        setSelectedRole(user.role);
        setIsRoleDialogOpen(true);
    };

    const handleSaveRole = async () => {
        if (!changeRoleUser || !selectedRole) return;

        try {
            const { error } = await supabase
                .from('users')
                .update({ role: selectedRole })
                .eq('id', changeRoleUser.id);

            if (error) throw error;

            fetchUsers(); // Refresh data
            setIsRoleDialogOpen(false);
            setChangeRoleUser(null);
            setSelectedRole("");
        } catch (error) {
            console.error('Error updating role:', error);
            setError('Failed to update role');
        }
    };

    // Handle verify user
    const handleVerifyUser = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ isVerified: true })
                .eq('id', userId);

            if (error) throw error;

            fetchUsers(); // Refresh data
        } catch (error) {
            console.error('Error verifying user:', error);
            setError('Failed to verify user');
        }
    };

    const handleUnverifyUser = async (userId: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ isVerified: false })
                .eq('id', userId);

            if (error) throw error;

            fetchUsers(); // Refresh data
        } catch (error) {
            console.error('Error unverifying user:', error);
            setError('Failed to unverify user');
        }
    };

    // Define columns with proper typing (removed select column)
    const columns: ColumnDef<User>[] = [
        // First Name column
        {
            accessorKey: "firstName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        First Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("firstName")}</div>,
        },

        // Last Name column
        {
            accessorKey: "lastName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Last Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2">{row.getValue("lastName")}</div>,
        },

        // Email column
        {
            accessorKey: "email",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Email
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <div className="text-left ps-2 lowercase">{row.getValue("email")}</div>,
        },

        // Role column
        {
            accessorKey: "role",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Role
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="text-left ps-2 capitalize">{row.getValue("role")}</div>
            ),
        },
        {
            accessorKey: "isVerified",
            header: ({ column }) => {
                return (
                    <div className="text-left ps-2 font-medium">Verified</div>
                )
            },
            cell: ({ row }) => {
                const isVerified = row.getValue("isVerified") as boolean;
                return (
                    <div className="text-left ps-2 capitalize">
                        {isVerified ? (
                            <span className="text-green-600 font-medium">Yes</span>
                        ) : (
                            <span className="text-red-600 font-medium">No</span>
                        )}
                    </div>
                )
            },
        },
        {
            accessorKey: "registered_at",
            header: ({ column }) => {
                return (
                    <div className="text-left ps-2 font-medium">Registered</div>
                )
            },
            cell: ({ row }) => {
                const date = row.getValue("registered_at") as string | null;
                return (
                    <div className="text-left ps-2">
                        {date ? new Date(date).toLocaleDateString() : 'N/A'}
                    </div>
                )
            },
        },
        {
            accessorKey: "login_at",
            header: ({ column }) => {
                return (
                    <div className="text-left ps-2 font-medium">Last Login</div>
                )
            },
            cell: ({ row }) => {
                const date = row.getValue("login_at") as string | null;
                return (
                    <div className="text-left ps-2">
                        {date ? new Date(date).toLocaleDateString() : 'N/A'}
                    </div>
                )
            },
        },
        {
            accessorKey: "login_count",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        className="hover:bg-transparent hover:text-current cursor-pointer justify-start w-full"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Login Count
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const count = row.getValue("login_count") as number | null;
                return <div className="text-left ps-2">{count || 0}</div>
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const user = row.original;

                // Only show actions for authorized users
                if (!isAuthorized) return null;

                return (
                    <div className="flex space-x-2 ps-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => navigator.clipboard.writeText(user.email)}
                                >
                                    Copy email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => handleEditUser(user)}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleChangeRole(user)}
                                >
                                    <Key className="mr-2 h-4 w-4" />
                                    Change Role
                                </DropdownMenuItem>
                                {!user.isVerified ? (
                                    <DropdownMenuItem
                                        onClick={() => handleVerifyUser(user.id)}
                                        className="text-green-600"
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Verify User
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onClick={() => handleUnverifyUser(user.id)}
                                        className="text-red-600"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Unverify User
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        }
    ]

    // Initialize table
    const table = useReactTable({
        data: users,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
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
        if (users.length === 0) {
            alert("No data to export");
            return;
        }

        try {
            // Prepare the data
            const data = users.map(user => ({
                'First Name': user.firstName || '',
                'Last Name': user.lastName || '',
                'Email': user.email || '',
                'Role': user.role || '',
                'Verified': user.isVerified ? 'Yes' : 'No',
                'Registered': user.registered_at ? new Date(user.registered_at).toLocaleDateString() : 'N/A',
                'Last Login': user.login_at ? new Date(user.login_at).toLocaleDateString() : 'N/A',
                'Login Count': user.login_count || 0,
                'User ID': user.id || ''
            }));

            // Convert to CSV string
            const csvString = convertToCSV(data);

            // Download file
            downloadCSV(csvString, `users_${new Date().toISOString().split('T')[0]}.csv`);

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
        <div className="container mx-auto py-10 px-5 h-lvh">
            <div className="flex justify-between items-center mb-6">
                <h1 className="sm:text-3xl text-xl font-bold">User Management</h1>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchUsers}
                        disabled={isLoading}
                    >
                        {isLoading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button onClick={handleExportCSV} className="bg-[#0A4647] hover:bg-[#093636] cursor-pointer">
                        <TbFileTypeCsv />
                        Export CSV
                    </Button>
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
                        placeholder="Filter emails..."
                        value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            table.getColumn("email")?.setFilterValue(event.target.value)
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
                                                <span className="ml-2">Loading users...</span>
                                            </div>
                                        ) : (
                                            "No users found."
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex items-center justify-end space-x-2 py-4">
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Make changes to user details here.
                        </DialogDescription>
                    </DialogHeader>
                    {editUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="firstName" className="text-right">
                                    First Name
                                </Label>
                                <Input
                                    id="firstName"
                                    value={editUser.firstName}
                                    onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                                    className="col-span-3 selection:bg-blue-500 selection:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="lastName" className="text-right">
                                    Last Name
                                </Label>
                                <Input
                                    id="lastName"
                                    value={editUser.lastName}
                                    onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                                    className="col-span-3 selection:bg-blue-500 selection:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="email" className="text-right">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={editUser.email}
                                    onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                                    className="col-span-3 selection:bg-blue-500 selection:text-white"
                                />
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

            {/* Change Role Dialog */}
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Change User Role</DialogTitle>
                        <DialogDescription>
                            Select a new role for {changeRoleUser?.firstName} {changeRoleUser?.lastName}
                        </DialogDescription>
                    </DialogHeader>
                    {changeRoleUser && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">
                                    Role
                                </Label>
                                <Select value={selectedRole} onValueChange={setSelectedRole} >
                                    <SelectTrigger className="col-span-3 cursor-pointer">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roleOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)} className="cursor-pointer">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveRole} className="bg-[#0A4647] hover:bg-[#093636] cursor-pointer">
                            Update Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}