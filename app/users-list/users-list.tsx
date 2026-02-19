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
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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
import { emailTemplates, sendEmail } from "@/lib/email"
import { logger, logAuth, logError, logSuccess, logWarning, logInfo } from "@/lib/logger"
import { toast } from "sonner"
import { AprovedUserCC } from "@/lib/emailconst"

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

export default function UsersList() {
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
    const [isUnverifiedOnly, setIsUnverifiedOnly] = useState(false);

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

    const allowedRoles = [superSubscriberRole, adminRole].filter(Boolean);
    const viewRoles = [superSubscriberRole].filter(Boolean);

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
    const isViewAuthorized = profile?.role && viewRoles.includes(profile.role);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const source = `${process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/users-list`;

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            let redirectUrl = '/login/?redirect_to=users-list';

            // If URL has ?_=true parameter, include it in redirect URL
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const hasUnverifiedParam = urlParams.get('_') === 'true';

                if (hasUnverifiedParam) {
                    redirectUrl = '/login/?redirect_to=users-list?_=true';
                }
            }

            // Log unauthorized access
            logAuth(
                'access_denied',
                'Unauthorized access to users list',
                profile?.id,
                {
                    isLoggedIn,
                    isVerified: profile?.isVerified,
                    redirectUrl
                },
                'failed',
                source
            );

            router.replace(redirectUrl);
            return;
        }

        // Check if user has permission to access this page
        if (!isAuthorized) {
            logWarning(
                'auth',
                'unauthorized_access',
                `User attempted to access users list without permission`,
                {
                    email: profile.email,
                    role: profile.role,
                    allowedRoles
                },
                profile.id,
                source
            );

            router.replace('/product-category/alldevices');
            return;
        }
        if (smRole == profile?.role) {
            router.replace('/product-category/alldevices');
            return;
        }

        // Log successful access
        logAuth(
            'page_access',
            `User accessed users list page`,
            profile.id,
            {
                role: profile.role,
                isUnverifiedOnly: searchParams.get('_') === 'true'
            },
            'completed',
            source
        );

    }, [loading, isLoggedIn, profile, router, isAuthorized, source, searchParams]);

    // Update fetchUsers to use searchParams
    const fetchUsers = async () => {
        const startTime = Date.now();
        try {
            setIsLoading(true);
            setError(null);

            // Use searchParams hook instead of window.location
            const hasUnverifiedParam = searchParams.get('_') === 'true';
            setIsUnverifiedOnly(hasUnverifiedParam);

            let query = supabase
                .from('users')
                .select('*')
                .order('registered_at', { ascending: false });

            // If URL has ?_=true, only fetch unverified users
            if (hasUnverifiedParam) {
                query = query.eq('isVerified', false);
            }

            const { data, error: supabaseError } = await query;

            if (supabaseError) {
                throw supabaseError;
            }

            if (data) {
                setUsers(data as User[]);
                const executionTime = Date.now() - startTime;
                logSuccess(
                    'db',
                    'users_fetch_success',
                    `Successfully fetched ${data.length} users`,
                    {
                        count: data.length,
                        isUnverifiedOnly: hasUnverifiedParam,
                        executionTime
                    },
                    profile?.id,
                    source
                );
            }
        } catch (err: unknown) {
            const executionTime = Date.now() - startTime;
            if (err instanceof Error) {
                setError(err.message || 'Failed to fetch users');
                logError(
                    'db',
                    'users_fetch_failed',
                    `Failed to fetch users: ${err.message}`,
                    err,
                    profile?.id,
                    source
                );
            } else {
                setError('Failed to fetch users');
                logError(
                    'db',
                    'users_fetch_failed',
                    'Failed to fetch users',
                    { error: err },
                    profile?.id,
                    source
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Update useEffect to depend on searchParams
    useEffect(() => {
        if (!loading && isLoggedIn && profile?.isVerified && isAuthorized) {
            fetchUsers();
        }
    }, [loading, isLoggedIn, profile, isAuthorized, searchParams]);

    // Handle edit user
    const handleEditUser = (user: User) => {
        setEditUser(user);
        setIsEditDialogOpen(true);
        logInfo(
            'user',
            'edit_user_clicked',
            `Edit user clicked for: ${user.email}`,
            {
                userId: user.id,
                email: user.email,
                currentName: `${user.firstName} ${user.lastName}`
            },
            profile?.id,
            source
        );
    };

    const handleSaveEdit = async () => {
        if (!editUser) return;

        const startTime = Date.now();
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

            const executionTime = Date.now() - startTime;
            logSuccess(
                'user',
                'user_updated',
                `User updated: ${editUser.email}`,
                {
                    userId: editUser.id,
                    email: editUser.email,
                    oldName: `${editUser.firstName} ${editUser.lastName}`,
                    newName: `${editUser.firstName} ${editUser.lastName}`,
                    executionTime,
                    updatedBy: profile?.email
                },
                profile?.id,
                source
            );

            fetchUsers(); // Refresh data
            setIsEditDialogOpen(false);
            setEditUser(null);
            toast.success("User updated successfully!");
        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            setError('Failed to update user');
            logError(
                'db',
                'user_update_failed',
                `Failed to update user ${editUser.email}`,
                {
                    error: error.message,
                    userId: editUser.id,
                    executionTime
                },
                profile?.id,
                source
            );
            toast.error("Failed to update user");
        }
    };

    // Handle change role
    const handleChangeRole = (user: User) => {
        setChangeRoleUser(user);
        setSelectedRole(user.role);
        setIsRoleDialogOpen(true);
        logInfo(
            'user',
            'change_role_clicked',
            `Change role clicked for: ${user.email}`,
            {
                userId: user.id,
                email: user.email,
                currentRole: user.role
            },
            profile?.id,
            source
        );
    };

    const handleSaveRole = async () => {
        if (!changeRoleUser || !selectedRole) return;

        const startTime = Date.now();
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: selectedRole })
                .eq('id', changeRoleUser.id);

            if (error) throw error;

            const executionTime = Date.now() - startTime;
            logSuccess(
                'user',
                'role_changed',
                `Role changed for ${changeRoleUser.email}`,
                {
                    userId: changeRoleUser.id,
                    email: changeRoleUser.email,
                    oldRole: changeRoleUser.role,
                    newRole: selectedRole,
                    executionTime,
                    changedBy: profile?.email
                },
                profile?.id,
                source
            );

            fetchUsers(); // Refresh data
            setIsRoleDialogOpen(false);
            setChangeRoleUser(null);
            setSelectedRole("");
            toast.success("Role updated successfully!");
        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            setError('Failed to update role');
            logError(
                'db',
                'role_change_failed',
                `Failed to change role for ${changeRoleUser.email}`,
                {
                    error: error.message,
                    userId: changeRoleUser.id,
                    oldRole: changeRoleUser.role,
                    newRole: selectedRole,
                    executionTime
                },
                profile?.id,
                source
            );
            toast.error("Failed to update role");
        }
    };

    // Handle verify user
    const handleVerifyUser = async (userId: string, email: string) => {
        const startTime = Date.now();
        try {
            const { error } = await supabase
                .from('users')
                .update({ isVerified: true })
                .eq('id', userId);

            if (error) throw error;

            const executionTime = Date.now() - startTime;
            logSuccess(
                'user',
                'user_approved',
                `User approved: ${email}`,
                {
                    userId,
                    email,
                    executionTime,
                    approvedBy: profile?.email
                },
                profile?.id,
                source
            );

            sendApprovedEmail(email);
            fetchUsers(); // Refresh data
            toast.success("User approved successfully!");
        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            setError('Failed to verify user');
            logError(
                'db',
                'user_approval_failed',
                `Failed to approve user ${email}`,
                {
                    error: error.message,
                    userId,
                    email,
                    executionTime
                },
                profile?.id,
                source
            );
            toast.error("Failed to approve user");
        }
    };

    const handleUnverifyUser = async (userId: string, email: string) => {
        const startTime = Date.now();
        try {
            const { error } = await supabase
                .from('users')
                .update({ isVerified: false })
                .eq('id', userId);

            if (error) throw error;

            const executionTime = Date.now() - startTime;
            logWarning(
                'user',
                'user_rejected',
                `User rejected: ${email}`,
                {
                    userId,
                    email,
                    executionTime,
                    rejectedBy: profile?.email
                },
                profile?.id,
                source
            );

            sendRejectedEmail(email)
            fetchUsers(); // Refresh data
            toast.success("User rejected successfully!");
        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            setError('Failed to unverify user');
            logError(
                'db',
                'user_rejection_failed',
                `Failed to reject user ${email}`,
                {
                    error: error.message,
                    userId,
                    email,
                    executionTime
                },
                profile?.id,
                source
            );
            toast.error("Failed to reject user");
        }
    };

    const sendApprovedEmail = async (userEmail: string) => {
        try {
            // If you want to include current date in email
            const currentDate = formatDateToCustomFormat(new Date().toISOString());

            const template = emailTemplates.approvedUserEmail(userEmail); // You may need to update emailTemplates

            const result = await sendEmail({
                to: userEmail,
                cc: AprovedUserCC,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });


            if (result.success) {
                logSuccess(
                    'email',
                    'approval_email_sent',
                    `Approval email sent to: ${userEmail}`,
                    {
                        to: userEmail,
                        subject: template.subject
                    },
                    profile?.id,
                    source
                );
            } else {
                logWarning(
                    'email',
                    'approval_email_failed',
                    `Failed to send approval email to: ${userEmail}`,
                    {
                        to: userEmail,
                        error: result.error
                    },
                    profile?.id,
                    source
                );
            }
        } catch (emailError: any) {
            logError(
                'email',
                'approval_email_exception',
                `Exception while sending approval email: ${emailError.message}`,
                emailError,
                profile?.id,
                source
            );
        }
    };

    const sendRejectedEmail = async (userEmail: string) => {
        try {
            const template = emailTemplates.rejectedUserEmail(userEmail);

            const result = await sendEmail({
                to: userEmail,
                cc: "",
                subject: template.subject,
                text: template.text,
                html: template.html,
            });

            if (result.success) {
                logSuccess(
                    'email',
                    'rejection_email_sent',
                    `Rejection email sent to: ${userEmail}`,
                    {
                        to: userEmail,
                        subject: template.subject
                    },
                    profile?.id,
                    source
                );
            } else {
                logWarning(
                    'email',
                    'rejection_email_failed',
                    `Failed to send rejection email to: ${userEmail}`,
                    {
                        to: userEmail,
                        error: result.error
                    },
                    profile?.id,
                    source
                );
            }
        } catch (emailError: any) {
            logError(
                'email',
                'rejection_email_exception',
                `Exception while sending rejection email: ${emailError.message}`,
                emailError,
                profile?.id,
                source
            );
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
                    <div className="text-left ps-2 font-medium">Approved</div>
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
                        {formatDateToCustomFormat(date)}
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
                        {formatDateToCustomFormat(date)}
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

    ]

    if (!isViewAuthorized) {
        columns.unshift(
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
                                    <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => {
                                            navigator.clipboard.writeText(user.email);
                                            logInfo(
                                                'user',
                                                'email_copied',
                                                `Email copied to clipboard: ${user.email}`,
                                                {
                                                    email: user.email
                                                },
                                                profile?.id,
                                                source
                                            );
                                        }}
                                    >
                                        Copy email
                                    </DropdownMenuItem>

                                    {smRole !== profile?.role && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="cursor-pointer"
                                                onClick={() => handleEditUser(user)}
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit User
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="cursor-pointer"
                                                onClick={() => handleChangeRole(user)}
                                            >
                                                <Key className="mr-2 h-4 w-4" />
                                                Change Role
                                            </DropdownMenuItem>
                                            {!user.isVerified ? (
                                                <DropdownMenuItem
                                                    onClick={() => handleVerifyUser(user.id, user.email)}
                                                    className="text-green-600 cursor-pointer"
                                                >
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Approve User
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    onClick={() => handleUnverifyUser(user.id, user.email)}
                                                    className="text-red-600 cursor-pointer"
                                                >
                                                    <XCircle className="mr-2 h-4 w-4" />
                                                    Reject User
                                                </DropdownMenuItem>
                                            )}
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
            }
        )
    }
    const [globalFilter, setGlobalFilter] = useState<string>("")
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
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: "auto", // Auto filter all string fields
        initialState: {
            pagination: {
                pageSize: 100,
                pageIndex: 0,
            },
        },
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter, // Add this
        },
    });


    // Format date to dd-MMM-yyyy
    const formatDateToCustomFormat = (dateString: string | null) => {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';

            const day = date.getDate().toString().padStart(2, '0');
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();

            return `${day}-${month}-${year}`;
        } catch (error) {
            return 'N/A';
        }
    };

    // Handle CSV export
    const handleExportCSV = () => {
        if (users.length === 0) {
            toast.error("No data to export");
            logWarning(
                'export',
                'csv_export_empty',
                'Attempted to export CSV with no data',
                {
                    usersCount: users.length
                },
                profile?.id,
                source
            );
            return;
        }

        try {
            // Prepare the data with custom date format
            const data = users.map(user => ({
                'First Name': user.firstName || '',
                'Last Name': user.lastName || '',
                'Email': user.email || '',
                'Role': user.role || '',
                'Verified': user.isVerified ? 'Yes' : 'No',
                'Registered': formatDateToCustomFormat(user.registered_at), // Use custom format
                'Last Login': formatDateToCustomFormat(user.login_at), // Use custom format
                'Login Count': user.login_count || 0,
                'User ID': user.id || ''
            }));

            // Convert to CSV string
            const csvString = convertToCSV(data);

            // Download file
            downloadCSV(csvString, `users_${new Date().toISOString().split('T')[0]}.csv`);

            logSuccess(
                'export',
                'csv_export_success',
                `CSV exported with ${users.length} records`,
                {
                    recordCount: users.length,
                    isUnverifiedOnly,
                },
                profile?.id,
                source
            );

            toast.success("CSV exported successfully!");
        } catch (error: any) {
            setError('Failed to export CSV');
            logError(
                'export',
                'csv_export_failed',
                `Failed to export CSV: ${error.message}`,
                {
                    error: error.message,
                    usersCount: users.length,
                },
                profile?.id,
                source
            );
            toast.error("Failed to export CSV");
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

    // Handle refresh
    const handleRefresh = async () => {
        logInfo(
            'user',
            'manual_refresh',
            'Manually refreshing users list',
            {
                currentCount: users.length,
                isUnverifiedOnly
            },
            profile?.id,
            source
        );
        await fetchUsers();
    };

    // Handle view toggle
    const handleViewToggle = (viewType: 'all' | 'pending') => {
        const newPath = viewType === 'pending' ? '/users-list?_=true' : '/users-list';
        logInfo(
            'navigation',
            'view_toggle',
            `Toggled view to: ${viewType}`,
            {
                from: isUnverifiedOnly ? 'pending' : 'all',
                to: viewType
            },
            profile?.id,
            source
        );
        router.push(newPath);
    };

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

    return (
        <div className="container mx-auto py-10 px-5">
            <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                    <h1 className="sm:text-3xl text-xl font-bold">
                    </h1>
                    {isUnverifiedOnly && (
                        <p className="text-sm text-gray-600 mt-1">
                            Showing {users.length} pending user approval{users.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    {isUnverifiedOnly && (
                        <Button
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => handleViewToggle('all')}
                            className="cursor-pointer"
                        >
                            {isLoading ? "Loading..." : "View All Users"}
                        </Button>
                    )}
                    {!isUnverifiedOnly && (
                        <Button
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => handleViewToggle('pending')}
                            className="cursor-pointer"
                        >
                            {isLoading ? "Loading..." : "View Pending Approvals"}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="cursor-pointer"
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
                                                onCheckedChange={(value: boolean) => {
                                                    column.toggleVisibility(!!value);
                                                    logInfo(
                                                        'ui',
                                                        'column_toggle',
                                                        `Column visibility toggled`,
                                                        {
                                                            columnId: column.id,
                                                            columnName: columnDisplayNames[column.id] || column.id,
                                                            isVisible: value
                                                        },
                                                        profile?.id,
                                                        source
                                                    );
                                                }}
                                            >
                                                {columnDisplayNames[column.id] || column.id}
                                            </DropdownMenuCheckboxItem>
                                        )
                                    })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="">
                        <Input
                            placeholder="Search..."
                            value={globalFilter ?? ""}
                            onChange={(event) => {
                                setGlobalFilter(event.target.value);
                            }}
                            className="pl-8"
                        />
                    </div>
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
                <div className="flex items-center justify-between py-4">
                    <div className="text-sm text-gray-600">
                        {/* {users.length} user{users.length !== 1 ? 's' : ''} found */}
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                        </div>

                        {table.getPageCount() > 1 && (
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                    {/* Safe page number generation */}
                                    {(() => {
                                        const pageCount = table.getPageCount();
                                        // Ensure pageCount is valid
                                        if (isNaN(pageCount) || !isFinite(pageCount) || pageCount <= 0) {
                                            return null;
                                        }

                                        // Show max 7 page buttons for better UX
                                        const maxVisiblePages = 7;
                                        const currentPage = table.getState().pagination.pageIndex;
                                        const pageCountInt = Math.min(pageCount, maxVisiblePages);

                                        return Array.from({ length: pageCountInt }, (_, i) => i).map(pageIndex => (
                                            <Button
                                                key={pageIndex}
                                                variant={currentPage === pageIndex ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                    table.setPageIndex(pageIndex);
                                                    logInfo(
                                                        'ui',
                                                        'page_changed',
                                                        `Page changed to: ${pageIndex + 1}`,
                                                        {
                                                            previousPage: currentPage + 1,
                                                            newPage: pageIndex + 1
                                                        },
                                                        profile?.id,
                                                        source
                                                    );
                                                }}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageIndex + 1}
                                            </Button>
                                        ));
                                    })()}
                                </div>

                                <div className="space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const prevPage = table.getState().pagination.pageIndex;
                                            table.previousPage();
                                            if (prevPage > 0) {
                                                logInfo(
                                                    'ui',
                                                    'previous_page',
                                                    `Navigated to previous page`,
                                                    {
                                                        fromPage: prevPage + 1,
                                                        toPage: table.getState().pagination.pageIndex + 1
                                                    },
                                                    profile?.id,
                                                    source
                                                );
                                            }
                                        }}
                                        disabled={!table.getCanPreviousPage()}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const prevPage = table.getState().pagination.pageIndex;
                                            table.nextPage();
                                            if (prevPage < table.getPageCount() - 1) {
                                                logInfo(
                                                    'ui',
                                                    'next_page',
                                                    `Navigated to next page`,
                                                    {
                                                        fromPage: prevPage + 1,
                                                        toPage: table.getState().pagination.pageIndex + 1
                                                    },
                                                    profile?.id,
                                                    source
                                                );
                                            }
                                        }}
                                        disabled={!table.getCanNextPage()}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-106.25">
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
                        <Button variant="outline" onClick={() => {
                            setIsEditDialogOpen(false);
                            logInfo(
                                'ui',
                                'edit_dialog_cancelled',
                                'Edit user dialog cancelled',
                                {
                                    userId: editUser?.id,
                                    email: editUser?.email
                                },
                                profile?.id,
                                source
                            );
                        }} className="cursor-pointer">
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
                        <Button variant="outline" onClick={() => {
                            setIsRoleDialogOpen(false);
                            logInfo(
                                'ui',
                                'role_dialog_cancelled',
                                'Change role dialog cancelled',
                                {
                                    userId: changeRoleUser?.id,
                                    email: changeRoleUser?.email
                                },
                                profile?.id,
                                source
                            );
                        }} className="cursor-pointer">
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