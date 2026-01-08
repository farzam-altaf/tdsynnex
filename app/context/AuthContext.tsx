'use client';

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    reseller: string;
    login_at: string | null;
    login_count: string | null;
};

type AuthContextType = {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (authUser: User | null) => {
        if (!authUser) {
            setProfile(null);
            return;
        }
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("userId", authUser.id)
            .single();

        if (error) {
            console.error("Error fetching profile:", error.message);
            setProfile(null);
        } else {
            setProfile(data);
        }
    };

    useEffect(() => {
        const loadUser = async () => {
            setLoading(true);
            const { data } = await supabase.auth.getSession();
            const authUser = data.session?.user ?? null;
            setUser(authUser);
            await fetchProfile(authUser);
            setLoading(false);
        };

        loadUser();

        const {
             data: {subscription} } = supabase.auth.onAuthStateChange((_event, session) => {
            const authUser = session?.user ?? null;
            setUser(authUser);
            fetchProfile(authUser); // async but don't await
            setLoading(false);
        });

        return () => subscription?.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
