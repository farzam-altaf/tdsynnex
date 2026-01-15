"use client"

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner"; // Optional: for notifications

export default function Page() {
    const router = useRouter();
    const { profile, isLoggedIn, loading, user } = useAuth();
    const [isUpdating, setIsUpdating] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        reseller: ""
    });

    // Handle auth check
    useEffect(() => {
        if (loading) return;

        if (!isLoggedIn || !profile?.isVerified) {
            console.log("User not authenticated, redirecting to login");
            router.replace('/login/?redirect_to=edit-profile');
            return;
        }

    }, [loading, isLoggedIn, profile, router]);

    // Load user data when profile is available
    useEffect(() => {
        if (profile) {
            setFormData({
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                email: profile.email || "",
                reseller: profile.reseller || "" // Assuming reseller field exists
            });
        }
    }, [profile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.id) {
            toast.error("User not found",
                { style: { background: "red", color: "white" } }
            );
            return;
        }

        setIsUpdating(true);

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    reseller: formData.reseller
                })
                .eq('id', profile?.id);

            if (error) throw error;

            toast.success("Profile updated successfully!", { style: { background: "black", color: "white" } });
            // You might want to refresh the auth context here
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(error.message || "Failed to update profile", { style: { background: "red", color: "white" } });
        } finally {
            setIsUpdating(false);
        }
    };

    const handlePasswordReset = () => {
        router.push('/password-reset');
    };

    // Show loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#35c8dc]" />
                    <p className="mt-2 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-10 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
                <p className="text-gray-600 mt-2">Update your personal information</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
                {/* First Name */}
                <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-gray-700">
                        First Name
                    </Label>
                    <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter your first name"
                        className="focus:ring-2 focus:ring-[#35c8dc] focus:border-transparent selection:bg-blue-500"
                        required
                    />
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-gray-700">
                        Last Name
                    </Label>
                    <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter your last name"
                        className="focus:ring-2 focus:ring-[#35c8dc] focus:border-transparent selection:bg-blue-500"
                        required
                    />
                </div>

                {/* Email (Disabled) */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">
                        Email Address
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        value={formData.email}
                        disabled
                        className="bg-gray-50 cursor-not-allowed text-gray-500"
                    />
                    <p className="text-sm text-gray-500">Email cannot be changed</p>
                </div>

                {/* Reseller */}
                <div className="space-y-2">
                    <Label htmlFor="reseller" className="text-gray-700">
                        Reseller
                    </Label>
                    <Input
                        id="reseller"
                        name="reseller"
                        value={formData.reseller}
                        onChange={handleInputChange}
                        placeholder="Enter reseller information"
                        className="focus:ring-2 focus:ring-[#35c8dc] focus:border-transparent selection:bg-blue-500"
                    />
                </div>


                {/* Submit Button */}
                <div className="pt-6">
                    <Button
                        type="submit"
                        disabled={isUpdating}
                        className="w-full py-3 text-white cursor-pointer font-medium rounded-lg transition-colors duration-200"
                        style={{
                            backgroundColor: '#35c8dc',
                            backgroundImage: 'linear-gradient(to right, #35c8dc, #2db4c8)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2db4c8';
                            e.currentTarget.style.backgroundImage = 'linear-gradient(to right, #2db4c8, #26a0b4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#35c8dc';
                            e.currentTarget.style.backgroundImage = 'linear-gradient(to right, #35c8dc, #2db4c8)';
                        }}
                    >
                        {isUpdating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Update Profile'
                        )}
                    </Button>
                </div>

                {/* Password Reset Button */}
                <div className="pt-4 border-t border-gray-200">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handlePasswordReset}
                        className="w-full flex items-center cursor-pointer justify-center gap-2 border-[#35c8dc] text-[#35c8dc] hover:bg-[#35c8dc] hover:text-white transition-colors"
                    >
                        <Lock className="h-4 w-4" />
                        Reset Password
                    </Button>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                        Click to reset your password
                    </p>
                </div>
            </form>
        </div>
    );
}