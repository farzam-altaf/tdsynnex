// Email sending utility
export interface EmailData {
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
    from?: string;
}

export async function sendEmail(data: EmailData): Promise<{
    success: boolean;
    message?: string;
    error?: string;
}> {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            return {
                success: false,
                error: result.error || 'Failed to send email'
            };
        }

        return {
            success: true,
            message: result.message
        };

    } catch (error: any) {
        console.error('Email sending error:', error);
        return {
            success: false,
            error: error.message || 'Network error'
        };
    }
}

// Email Templates
export const emailTemplates = {
    registrationAdminNotification: (userData: {
        firstName: string;
        lastName: string;
        email: string;
        reseller: string;
        registrationDate: string;
        formId?: string;
    }) => ({
        subject: `New User Registration | TD SYNNEX (Awaiting Approval)`,
        text: `Dear Program Manager(s),\n\nYou have received a new user registration on TD Synnex.\nPlease review to approve or reject this user.\n\nReview Pending User(s)\n\nBelow are the details for this user:\n \nEmail (Username): ${userData.email}\nFirst Name: ${userData.firstName}\nLast Name: ${userData.lastName}\nReseller: ${userData.reseller}\n\nPlease login to the admin panel to review this user.\n\nBest regards,\nTDsynnex Team`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 0;">
        <!-- Header with Logo -->
        <div style="background: linear-gradient(135deg, #0A4647 0%, #093636 100%); padding: 30px 20px; text-align: center;">
          <img src="https://tdsynnex.vercel.app/logo.png" alt="TD SYNNEX Logo" style="max-width: 200px; height: auto;">
          <h1 style="color: white; margin: 20px 0 0 0; font-size: 28px; font-weight: bold;">New User Registration</h1>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 30px; background: #f8f9fa;">
          <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            
            <h2 style="color: #0A4647; margin-top: 0; font-size: 24px;">Dear Program Manager(s),</h2>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 25px;">
              You have received a new user registration on <strong>TD Synnex</strong>.<br>
              Please review to approve or reject this user.
            </p>

            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0 40px 0;">
              <a href="/users-list?_=true" style="background: linear-gradient(135deg, #0A4647 0%, #093636 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block; box-shadow: 0 4px 15px rgba(30, 58, 138, 0.3);">
                Review Pending User(s)
              </a>
            </div>

            <!-- User Details Card -->
            <div style="background: #f0f7ff; padding: 30px; border-radius: 10px; border-left: 5px solid #0A4647; margin: 30px 0;">
              <h3 style="color: #0A4647; margin-top: 0; font-size: 20px; margin-bottom: 25px;">📋 User Registration Details</h3>
              
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e1e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;">User registered date</p>
                  <p style="margin: 5px 0 0 0; font-weight: bold; color: #0A4647; font-size: 16px;">${userData.registrationDate}</p>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e1e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;">Email (Username)</p>
                  <p style="margin: 5px 0 0 0; font-weight: bold; color: #0A4647; font-size: 16px;">${userData.email}</p>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e1e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;">First Name</p>
                  <p style="margin: 5px 0 0 0; font-weight: bold; color: #0A4647; font-size: 16px;">${userData.firstName}</p>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e1e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;">Last Name</p>
                  <p style="margin: 5px 0 0 0; font-weight: bold; color: #0A4647; font-size: 16px;">${userData.lastName}</p>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e1e8f0;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;">Reseller</p>
                  <p style="margin: 5px 0 0 0; font-weight: bold; color: #0A4647; font-size: 16px;">${userData.reseller}</p>
                </div>
              </div>
            </div>


            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 15px; margin-bottom: 10px;">Best regards,</p>
              <p style="color: #0A4647; font-size: 18px; font-weight: bold; margin: 0;">The TD SYNNEX Team</p>
              <p style="color: #64748b; font-size: 14px; margin-top: 10px;">TD Synnex Admin Portal</p>
            </div>
          </div>
        </div>
      </div>
    `,
    }),

    // Registration Email to User (Waiting for Approval)
    registrationUserWaiting: (userData: {
            firstName: string;
            lastName: string;
            email: string;
            reseller: string;
            registrationDate: string;
        }) => ({
            subject: `Your Registration is Under Review | TD SYNNEX`,
            text: `Dear ${userData.firstName} ${userData.lastName},\n\nThank you for registering with TD Synnex. Your registration has been received and is currently under review by our Program Management team.\n\nWe will review your application and notify you once your account has been approved. This process typically takes 1-2 business days.\n\nRegistration Details:\n- Name: ${userData.firstName} ${userData.lastName}\n- Email: ${userData.email}\n- Reseller: ${userData.reseller}\n- Registration Date: ${userData.registrationDate}\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nTD SYNNEX Team`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Header -->
        <div
            style="background: linear-gradient(135deg, #0A4647 0%, #093636 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Account Registration Received</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">TD SYNNEX Partner Portal</p>
        </div>

        <!-- Main Content -->
        <div
            style="padding: 40px 30px; background: white; border-radius: 0 0 10px 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">

            <!-- Greeting -->
            <h2 style="color: #35c8dc; margin-top: 0; font-size: 24px;">Dear ${userData.firstName},</h2>

            <!-- Status Message -->
            <div
                style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin: 20px 0 30px 0; border-left: 4px solid #0A4647;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                    <div
                        style="background: #0A4647; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 20px;">
                        ⏳
                    </div>
                    <div>
                        <h3 style="margin: 0; color: #35c8dc; font-size: 20px;">Registration Under Review</h3>
                        <p style="margin: 5px 0 0 0; color: #64748b;">Your account is pending approval</p>
                    </div>
                </div>

                <p style="margin: 0; color: #334155; line-height: 1.6;">
                    Thank you for registering with <strong>TD Synnex</strong>. Your registration has been received and
                    is currently under review by our Program Management team.
                </p>
            </div>

            <!-- Timeline -->
            <div style="margin: 30px 0;">
                <h3 style="color: #35c8dc; font-size: 18px; margin-bottom: 20px;">📋 What Happens Next?</h3>

                <div style="display: flex; align-items: flex-start; margin-bottom: 25px;">
                    <div
                        style="background: #0A4647; color: white; min-width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">
                        1</div>
                    <div>
                        <p style="margin: 0 0 5px 0; font-weight: bold; color: #1e293b;">Registration Submitted</p>
                        <p style="margin: 0; color: #64748b; font-size: 14px;">Your application has been received
                            (${userData.registrationDate})</p>
                    </div>
                </div>

                <div style="display: flex; align-items: flex-start; margin-bottom: 25px;">
                    <div
                        style="background: #f1f5f9; color: #64748b; min-width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; border: 2px solid #cbd5e1;">
                        2</div>
                    <div>
                        <p style="margin: 0 0 5px 0; font-weight: bold; color: #1e293b;">Admin Review</p>
                        <p style="margin: 0; color: #64748b; font-size: 14px;">Our team is reviewing your application
                            (1-2 business days)</p>
                    </div>
                </div>
            </div>

            <!-- User Details -->
            <div
                style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e2e8f0;">
                <h3 style="color: #35c8dc; font-size: 18px; margin-top: 0; margin-bottom: 20px;">📝 Your Registration
                    Details</h3>

                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Full Name:</td>
                        <td
                            style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #35c8dc;">
                            ${userData.firstName} ${userData.lastName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Email Address:
                        </td>
                        <td
                            style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #35c8dc;">
                            ${userData.email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Reseller:</td>
                        <td
                            style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #35c8dc;">
                            ${userData.reseller}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b;">Registration Date:</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #35c8dc;">
                            ${userData.registrationDate}</td>
                    </tr>
                </table>
            </div>

            <!-- Note -->
            <div
                style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.5;">
                    💡 <strong>Note:</strong> You will receive another email once your account has been approved. If you
                    have any questions or need to update your registration information, please contact our support team.
                </p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 15px; margin-bottom: 10px;">Best regards,</p>
                <p style="color: #35c8dc; font-size: 18px; font-weight: bold; margin: 0;">TD SYNNEX Partner Portal Team
                </p>
            </div>
        </div>
    </div>
                `,
    }),

    // Welcome/Login Email
    welcomeEmail: (name: string, email: string) => ({
        subject: `Welcome to TDsynnex, ${name}!`,
        text: `Hello ${name},\n\nWelcome to TDsynnex platform! Your login was successful.\n\nEmail: ${email}\n\nBest regards,\nTDsynnex Team`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
        <div style="background: white; padding: 30px; border-radius: 8px; color: #333;">
          <h1 style="color: #3ba1da; text-align: center; margin-bottom: 30px;">🎉 Welcome to TDsynnex!</h1>
          
          <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
          
          <p style="font-size: 16px; line-height: 1.6;">Welcome to the TDsynnex platform! Your login was successful.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3ba1da;">
            <p style="margin: 0;"><strong>📧 Email:</strong> ${email}</p>
            <p style="margin: 10px 0 0 0;"><strong>🕐 Login Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6;">If this wasn't you, please contact our support team immediately.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="#" style="background: #3ba1da; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
            <p>Best regards,<br><strong>The TDsynnex Team</strong></p>
          </div>
        </div>
      </div>
    `,
    }),

    // Password Reset Email
    passwordReset: (name: string, resetLink: string) => ({
        subject: 'Reset Your TDsynnex Password',
        text: `Hello ${name},\n\nYou requested to reset your password. Click the link below:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nTDsynnex Team`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #3ba1da; text-align: center;">Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>You requested to reset your password. Click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #3ba1da 0%, #41abd6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(59, 161, 218, 0.3);">
            🔐 Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center;">
          This link will expire in 1 hour.<br>
          If you didn't request this, please ignore this email.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p>Best regards,<br><strong>TDsynnex Team</strong></p>
        </div>
      </div>
    `,
    }),

    // Order Confirmation Email
    orderConfirmation: (orderNo: string, customerName: string, orderDetails: any) => ({
        subject: `Order Confirmation - ${orderNo}`,
        text: `Hello ${customerName},\n\nThank you for your order!\n\nOrder Number: ${orderNo}\nStatus: ${orderDetails.status}\nTotal: $${orderDetails.total}\n\nBest regards,\nTDsynnex Team`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #3ba1da; text-align: center;">✅ Order Confirmed!</h2>
        <p>Hello ${customerName},</p>
        <p>Thank you for your order! Here are your order details:</p>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; border: 1px solid #e9ecef;">
          <h3 style="color: #333; margin-top: 0;">📦 Order Summary</h3>
          <p><strong>Order Number:</strong> ${orderNo}</p>
          <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">${orderDetails.status}</span></p>
          <p><strong>Total Amount:</strong> <span style="font-size: 18px; font-weight: bold; color: #3ba1da;">$${orderDetails.total}</span></p>
          <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="#" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Track Your Order
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p>Best regards,<br><strong>TDsynnex Team</strong></p>
        </div>
      </div>
    `,
    }),

    // Simple Notification Email
    notification: (title: string, message: string, recipientName: string) => ({
        subject: `Notification: ${title}`,
        text: `Hello ${recipientName},\n\n${message}\n\nBest regards,\nTDsynnex Team`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #3ba1da;">📢 ${title}</h2>
        <p>Hello ${recipientName},</p>
        <div style="background: #fff8e1; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
          <p style="margin: 0; font-size: 16px; line-height: 1.6;">${message}</p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
          <p>Best regards,<br><strong>TDsynnex Team</strong></p>
        </div>
      </div>
    `,
    }),
};