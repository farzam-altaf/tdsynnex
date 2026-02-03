import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ✅ PHPass verification function
function verifyWordPressPassword(password: string, storedHash: string): boolean {
    try {
        console.log('🔐 Verifying WordPress password...')
        console.log('Password length:', password.length)
        console.log('Hash prefix:', storedHash.substring(0, 30) + '...')

        const itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

        // Validate hash format
        if (!storedHash || (!storedHash.startsWith('$P$') && !storedHash.startsWith('$H$'))) {
            console.log('❌ Not a valid PHPass hash')
            return false
        }

        // Extract count code and salt
        const countCode = storedHash.charAt(3)
        const countIndex = itoa64.indexOf(countCode)

        if (countIndex < 7 || countIndex > 30) {
            console.log(`❌ Invalid count code: ${countCode}, index: ${countIndex}`)
            return false
        }

        // Calculate iterations: 2^countIndex
        const iterations = Math.pow(2, countIndex)
        const salt = storedHash.substring(4, 12)

        console.log(`🔍 Count code: ${countCode}, Iterations: ${iterations}, Salt: ${salt}`)

        // First hash: md5(salt + password)
        let hash = crypto.createHash('md5').update(salt + password).digest('hex')

        // Perform iterations
        for (let i = 0; i < iterations; i++) {
            hash = crypto.createHash('md5').update(hash + password).digest('hex')
        }

        // Reconstruct full hash
        const reconstructedHash = storedHash.substring(0, 12) + hash

        const isValid = storedHash === reconstructedHash
        console.log('✅ Verification result:', isValid)

        return isValid

    } catch (error) {
        return false
    }
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()
        console.log('📧 User check start for:', email)

        if (!email || !password) {
            console.log('❌ Missing email or password')
            return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
        }

        // ✅ CORRECT ENVIRONMENT VARIABLES
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        console.log('🔑 Env check:', {
            hasUrl: !!supabaseUrl,
            hasKey: !!serviceRoleKey
        })

        if (!supabaseUrl || !serviceRoleKey) {
            console.log('❌ Server configuration error')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // ✅ STEP 1: Check if user exists in public.users table
        const { data: user, error: userError } = await admin
            .from('users')
            .select('id, email, password, userId, isVerified, firstName, lastName, role')
            .eq('email', email)
            .single()

        // In your /api/verify-login route, add this after getting the user:

        console.log('👤 Full user data from database:', {
            id: user?.id,
            email: user?.email,
            hasPassword: !!user?.password,
            passwordLength: user?.password?.length,
            passwordFirst50Chars: user?.password?.substring(0, 50),
            passwordStartsWith: user?.password?.substring(0, 10),
            hasUserId: !!user?.userId,
            userId: user?.userId,
            isVerified: user?.isVerified,
            firstName: user?.firstName,
            lastName: user?.lastName,
            role: user?.role
        });

        // Also add password verification debug:
        console.log('🔐 Password verification details:');
        console.log('Input password length:', password.length);
        console.log('Stored hash type:', user?.password?.startsWith('$P$') ? 'PHPass' :
            user?.password?.startsWith('$H$') ? 'PHPass ($H$)' :
                user?.password?.startsWith('$2') ? 'BCrypt' : 'Unknown');

        // ❌ User not found in database at all
        if (userError || !user) {
            console.log('❌ User not found in database')
            return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 })
        }

        // ✅ STEP 2: Check if user already has userId (already in Supabase Auth)
        if (user.userId) {
            console.log('✅ User already has userId, exists in Supabase Auth:', user.userId)
            return NextResponse.json({
                success: true,
                message: 'User exists in Supabase Auth',
                userId: user.userId,
                email: user.email,
                isVerified: user.isVerified || false,
                needsPasswordUpdate: false,
                existsInAuth: true
            })
        }

        // ✅ STEP 3: Verify WordPress password BEFORE creating in Supabase Auth
        if (!user.password) {
            console.log('❌ No password hash found in database')
            return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 })
        }

        console.log('🔐 Verifying WordPress password before migration...')
        const isPasswordValid = verifyWordPressPassword(password, user.password)

        if (!isPasswordValid) {
            console.log('❌ WordPress password verification failed')
            return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 })
        }

        console.log('✅ WordPress password verified successfully')

        // ✅ STEP 4: User exists in public.users, password is correct, and NOT in Supabase Auth
        console.log('🔄 User exists in DB with correct password but not in Supabase Auth, creating...')

        try {
            // Create user in Supabase Auth
            const { data: authData, error: authError } = await admin.auth.admin.createUser({
                email: email.trim().toLowerCase(),
                password: password, // User's provided password (already verified)
                email_confirm: true,
                user_metadata: {
                    first_name: user.firstName || '',
                    last_name: user.lastName || '',
                    role: user.role || 'user',
                    migrated_from_legacy: true,
                    legacy_id: user.id
                }
            })

            if (authError) {

                // Check if user already exists in auth (race condition)
                if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
                    console.log('ℹ️ User already exists in auth, fetching...')

                    // Try to get existing user
                    const { data: existingUsers } = await admin.auth.admin.listUsers()

                    const existingUser = existingUsers.users.find(u =>
                        u?.email?.toLowerCase() === email.toLowerCase()
                    )

                    if (existingUser) {
                        console.log('✅ Found existing auth user:', existingUser.id)

                        // Update public.users with auth userId
                        await admin
                            .from('users')
                            .update({
                                userId: existingUser.id,
                                password: null, // Remove legacy password
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', user.id)

                        return NextResponse.json({
                            success: true,
                            message: 'User already existed in auth, linked successfully',
                            userId: existingUser.id,
                            email: user.email,
                            isVerified: user.isVerified || false,
                            needsPasswordUpdate: true,
                            existsInAuth: true
                        })
                    }
                }

                return NextResponse.json({
                    error: 'Failed to create user account',
                    details: authError.message
                }, { status: 500 })
            }

            console.log('✅ Created user in Supabase Auth:', authData.user.id)

            // ✅ STEP 5: Update public.users with auth userId and remove legacy password
            const { error: updateError } = await admin
                .from('users')
                .update({
                    userId: authData.user.id,
                    password: null, // ✅ Remove legacy WordPress password
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)

            if (updateError) {
                // Still return success because auth user was created
            } else {
                console.log('✅ Updated public.users with auth userId and removed legacy password')
            }

            // ✅ STEP 6: Return success
            return NextResponse.json({
                success: true,
                message: 'User created in Supabase Auth successfully',
                userId: authData.user.id,
                email: user.email,
                isVerified: user.isVerified || false,
                needsPasswordUpdate: false,
                existsInAuth: true,
                newlyCreated: true
            })

        } catch (createError: any) {
            return NextResponse.json({
                error: 'Failed to create user account',
                details: createError.message
            }, { status: 500 })
        }

    } catch (error: any) {
        console.log('🔥 API Error:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message
        }, { status: 500 })
    }
}