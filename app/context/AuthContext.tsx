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
    userId: string;
    reseller: string;
    isVerified: boolean;
    login_at: string | null;
    login_count: string | null;
};

type AuthContextType = {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    isLoggedIn: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

    const fetchProfile = async (authUser: User | null) => {
        if (!authUser) {
            setProfile(null);
            setIsLoggedIn(false);
            return;
        }

        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("userId", authUser.id)
            .eq("isVerified", true)
            .single();

        if (error) {
            setProfile(null);
            setIsLoggedIn(false);
        } else {
            setProfile(data);
            setIsLoggedIn(true);
        }
    };

    useEffect(() => {
        const loadUser = async () => {
            setLoading(true);
            const { data } = await supabase.auth.getSession();
            const authUser = data.session?.user ?? null;
            setUser(authUser);

            if (authUser) {
                setIsLoggedIn(true);
                await fetchProfile(authUser);
            } else {
                setIsLoggedIn(false);
                setProfile(null);
            }

            setLoading(false);
        };

        loadUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const authUser = session?.user ?? null;
            setUser(authUser);

            if (authUser) {
                setIsLoggedIn(true);
                fetchProfile(authUser); // async but don't await
            } else {
                setIsLoggedIn(false);
                setProfile(null);
            }

            setLoading(false);
        });

        return () => subscription?.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading, isLoggedIn }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}