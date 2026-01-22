import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, from } = body;

    // Validation
    if (!to || !subject || !text) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: to, subject, and text are required' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid email address format' 
        },
        { status: 400 }
      );
    }

    let senderFrom = from || process.env.EMAIL_FROM;
    
    // Check if senderFrom has email format
    if (!senderFrom.includes('@')) {
      // Agar sirf name hai, toh Resend ka default email add karein
      senderFrom = `${senderFrom} <onboarding@resend.dev>`;
    }

    // Send email
    const { data, error } = await resend.emails.send({
      from: senderFrom, // Fixed sender
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: 'Email sent successfully',
    });

  } catch (error: any) {
    console.error('Server Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}