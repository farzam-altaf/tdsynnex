"use client";

import { useEffect, useState } from "react";
import { Eye, Download, MoreVertical, Search, Filter, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

// Sample notification data
const NOTIFICATIONS = [
    {
        id: 1,
        orderNumber: "ORD-2024-001",
        date: "2024-01-15",
        status: "Delivered",
    },
    {
        id: 2,
        orderNumber: "ORD-2024-002",
        date: "2024-01-14",
        status: "Processing",
    },
    {
        id: 3,
        orderNumber: "ORD-2024-003",
        date: "2024-01-13",
        status: "Shipped",
    },
    {
        id: 4,
        orderNumber: "ORD-2024-004",
        date: "2024-01-12",
        status: "Pending",
    },
    {
        id: 5,
        orderNumber: "ORD-2024-005",
        date: "2024-01-11",
        status: "Delivered",
    },
    {
        id: 6,
        orderNumber: "ORD-2024-006",
        date: "2024-01-10",
        status: "Cancelled",
    },
    {
        id: 7,
        orderNumber: "ORD-2024-007",
        date: "2024-01-09",
        status: "Shipped",
    },
    {
        id: 8,
        orderNumber: "ORD-2024-008",
        date: "2024-01-08",
        status: "Processing",
    },
    {
        id: 9,
        orderNumber: "ORD-2024-009",
        date: "2024-01-07",
        status: "Delivered",
    },
    {
        id: 10,
        orderNumber: "ORD-2024-010",
        date: "2024-01-06",
        status: "Processing",
    },
    {
        id: 11,
        orderNumber: "ORD-2024-011",
        date: "2024-01-05",
        status: "Shipped",
    },
    {
        id: 12,
        orderNumber: "ORD-2024-012",
        date: "2024-01-04",
        status: "Pending",
    },
    {
        id: 13,
        orderNumber: "ORD-2024-013",
        date: "2024-01-03",
        status: "Delivered",
    },
    {
        id: 14,
        orderNumber: "ORD-2024-014",
        date: "2024-01-02",
        status: "Cancelled",
    },
    {
        id: 15,
        orderNumber: "ORD-2024-015",
        date: "2024-01-01",
        status: "Shipped",
    },
];

// Status badge colors
const statusColors: Record<string, string> = {
    Delivered: "bg-green-100 text-green-800",
    Processing: "bg-blue-100 text-blue-800",
    Shipped: "bg-purple-100 text-purple-800",
    Pending: "bg-yellow-100 text-yellow-800",
    Cancelled: "bg-red-100 text-red-800",
};

export default function NotificationsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [entriesPerPage, setEntriesPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const router = useRouter();
    const { profile, isLoggedIn, loading, user } = useAuth();
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
            router.replace('/login/?redirect_to=notification');
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


    // Get unique statuses for filter dropdown
    const statuses = ["All", ...new Set(NOTIFICATIONS.map(n => n.status))];

    // Filter notifications based on search and status
    const filteredNotifications = NOTIFICATIONS.filter(notification => {
        const matchesSearch =
            notification.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            notification.date.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "All" || notification.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Calculate pagination
    const totalPages = Math.ceil(filteredNotifications.length / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    // Handle row selection
    const toggleRowSelection = (id: number) => {
        setSelectedRows(prev =>
            prev.includes(id)
                ? prev.filter(rowId => rowId !== id)
                : [...prev, id]
        );
    };

    // Select all rows on current page
    const selectAllRows = () => {
        const pageIds = paginatedNotifications.map(n => n.id);
        if (selectedRows.length === pageIds.length && pageIds.every(id => selectedRows.includes(id))) {
            // Deselect all if all are selected
            setSelectedRows([]);
        } else {
            // Select all on current page
            const newSelected = [...new Set([...selectedRows, ...pageIds])];
            setSelectedRows(newSelected);
        }
    };

    // Handle page change
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Generate page numbers
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="mx-auto">
                {/* Search and Entries Control Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Entries per page selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Show</span>
                        <select
                            value={entriesPerPage}
                            onChange={(e) => {
                                setEntriesPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-gray-700">entries</span>
                    </div>

                    {/* Search input */}
                    <div className="relative w-full md:w-auto">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-700">Search: </span>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder="Search orders or dates..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notifications Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden my-6">
                    {/* Table Header with centered title */}
                    <div className="border-b border-gray-600 bg-[#0e4647]">
                        <div className="p-4">
                            <h2 className="text-4xl font-semibold text-white text-center">Notifications</h2>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#0e4647]">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white border-r border-gray-600 uppercase tracking-wider">
                                        Order#
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white border-r border-gray-600 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white border-r border-gray-600 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white border-r border-gray-600 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredNotifications.map((notification) => (
                                    <tr
                                        key={notification.id}
                                        className={`hover:bg-gray-50 transition-colors ${selectedRows.includes(notification.id) ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {notification.orderNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{notification.date}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-gray-800`}>
                                                {notification.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    className="border p-2 rounded-lg transition-colors cursor-pointer"
                                                    title="Download Invoice"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="py-1 border px-5 rounded-lg transition-colors cursor-pointer"
                                                    title="Download Invoice"
                                                >
                                                    Mark as read
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    {filteredNotifications.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-5xl mb-4">📭</div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No notifications found</h3>
                            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                        </div>
                    ) : (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                                Showing <span className="font-semibold">{filteredNotifications.length}</span> of{" "}
                                <span className="font-semibold">{NOTIFICATIONS.length}</span> notifications
                            </div>
                            <div className="flex items-center space-x-2">
                                <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                                    Previous
                                </button>
                                <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}