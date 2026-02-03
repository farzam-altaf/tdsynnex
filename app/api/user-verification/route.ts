/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

class PasswordHash {
    private itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    private iterationCountLog2: number
    private portableHashes: boolean
    constructor(iterationCountLog2: number, portableHashes: boolean) {
        if (iterationCountLog2 < 4 || iterationCountLog2 > 31) iterationCountLog2 = 8
        this.iterationCountLog2 = iterationCountLog2
        this.portableHashes = portableHashes
    }
    checkPassword(password: string, storedHash: string) {
        const hash = this.cryptPrivate(password, storedHash)
        return hash === storedHash
    }
    private cryptPrivate(password: string, setting: string) {
        let output = '*0'
        if (setting.substring(0, 2) === '*0') output = '*1'
        const id = setting.substring(0, 3)
        if (id !== '$P$' && id !== '$H$') return output
        const countLog2 = this.itoa64.indexOf(setting[3])
        if (countLog2 < 7 || countLog2 > 30) return output
        const count = 1 << countLog2
        const salt = setting.substring(4, 12)
        if (salt.length !== 8) return output
        let hash = crypto.createHash('md5').update(salt + password).digest()
        for (let i = 0; i < count; i++) {
            hash = crypto.createHash('md5').update(Buffer.concat([hash, Buffer.from(password)])).digest()
        }
        return setting.substring(0, 12) + this.encode64(hash, 16)
    }
    private encode64(input: Buffer, count: number) {
        let output = ''
        let i = 0
        do {
            let value = input[i++]
            output += this.itoa64[value & 0x3f]
            if (i < count) value |= input[i] << 8
            output += this.itoa64[(value >> 6) & 0x3f]
            if (i++ >= count) break
            if (i < count) value |= input[i] << 16
            output += this.itoa64[(value >> 12) & 0x3f]
            if (i++ >= count) break
            output += this.itoa64[(value >> 18) & 0x3f]
        } while (i < count)
        return output
    }
}

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json()
        console.log('wp-upgrade:start', { email })
        if (!email || !password) {
            console.log('wp-upgrade:missingFields', { emailPresent: !!email })
            return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
        }
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceRoleKey) {
            console.log('wp-upgrade:configError')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

        const { data: wp, error: wpErr } = await admin.from('wp_pass').select('hash').eq('email', email).single()
        console.log('wp-upgrade:wpLookup', { email, error: wpErr?.message, found: !!wp?.hash })
        if (wpErr || !wp?.hash) {
            return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 })
        }

        const hasher = new PasswordHash(8, true)
        const ok = hasher.checkPassword(password, wp.hash)
        console.log('wp-upgrade:hashCheck', { email, ok })
        if (!ok) {
            return NextResponse.json({ error: 'Invalid login credentials' }, { status: 401 })
        }

        const emailLower = String(email).toLowerCase()
        let targetUserId: string | null = null
        let page = 1
        const perPage = 200
        console.log('wp-upgrade:searchAuthByEmail:start', { email })
        while (true) {
            const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({ page, perPage })
            console.log('wp-upgrade:listUsers', { page, perPage, error: listErr?.message, count: usersPage?.users?.length })
            if (listErr) break
            const found = (usersPage?.users || []).find(u => String(u.email || '').toLowerCase() === emailLower)
            if (found) { targetUserId = found.id; break }
            if (!usersPage || (usersPage.users || []).length < perPage) break
            page += 1
        }
        if (!targetUserId) {
            console.log('wp-upgrade:authUserNotFound', { email })
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, { password })
        console.log('wp-upgrade:updatePassword', { email, userId: targetUserId, error: updErr?.message })


        const { error: userUpdErr } = await admin
            .from('users')
            .update({
                userId: targetUserId,
                password: null
            })
            .eq('email', email)


        const { error: delErr } = await admin
            .from('wp_pass')
            .delete()
            .eq('email', email)

        if (delErr) {
            console.log('wp-upgrade:wpPassDeleteError', delErr.message)
            // yahan hard fail nahi kar rahe, kyun ke main kaam ho chuka hai
        }

        if (userUpdErr) {
            console.log('wp-upgrade:usersTableUpdateError', userUpdErr.message)
            return NextResponse.json({ error: 'Failed to sync user record' }, { status: 500 })
        }


        if (updErr) {
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
        }

        console.log('wp-upgrade:success', { email, userId: targetUserId })
        return NextResponse.json({ success: true })
    } catch (e) {
        console.log('wp-upgrade:catch')
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
}