import axios, { AxiosError } from 'axios';

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
        const response = await axios.post('/api/send-email', data, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 seconds timeout
            validateStatus: (status) => status >= 200 && status < 500,
        });

        const result = response.data;

        if (response.status >= 400 || !result.success) {
            return {
                success: false,
                error: result.error || `HTTP ${response.status}: Failed to send email`
            };
        }

        return {
            success: true,
            message: result.message
        };

    } catch (error: unknown) {
        console.error('Email sending error:', error);

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Request timeout. Please try again.'
                };
            }

            if (axiosError.response) {
                // Server responded with error status
                return {
                    success: false,
                    error: `Server error (${axiosError.response.status}): ${'Unknown error'}`
                };
            }

            if (axiosError.request) {
                // Request made but no response
                return {
                    success: false,
                    error: 'No response from server. Please check your connection.'
                };
            }
        }

        // Generic error
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

export async function sendCronEmail(data: EmailData): Promise<{
    success: boolean;
    message?: string;
    error?: string;
}> {
    try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, data, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 seconds timeout
            validateStatus: (status) => status >= 200 && status < 500,
        });

        const result = response.data;

        if (response.status >= 400 || !result.success) {
            return {
                success: false,
                error: result.error || `HTTP ${response.status}: Failed to send email`
            };
        }

        return {
            success: true,
            message: result.message
        };

    } catch (error: unknown) {
        console.error('Email sending error:', error);

        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            if (axiosError.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Request timeout. Please try again.'
                };
            }

            if (axiosError.response) {
                // Server responded with error status
                return {
                    success: false,
                    error: `Server error (${axiosError.response.status}): ${'Unknown error'}`
                };
            }

            if (axiosError.request) {
                // Request made but no response
                return {
                    success: false,
                    error: 'No response from server. Please check your connection.'
                };
            }
        }

        // Generic error
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
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
        subject: `Welcome to TD SYNNEX, ${name}!`,
        text: `Hello ${name},\n\nWelcome to TD SYNNEX platform! Your login was successful.\n\nEmail: ${email}\n\nBest regards,\nTD SYNNEX Team`,
        html: `
      <div style="font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- Header -->
                        <tr>
                            <td
                                style="background:linear-gradient(135deg,#0A4647,#093636); padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:15px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Welcome to TD SYNNEX
                                </h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="font-size:16px; line-height:1.6; margin-top:0;">
                                    Hello <strong>${name}</strong>,
                                </p>

                                <p style="font-size:16px; line-height:1.6;">
                                    We're excited to have you on board! Your account has been successfully accessed.
                                </p>

                                <!-- Info Box -->
                                <table width="100%" cellpadding="0" cellspacing="0"
                                    style="background:#f8f9fa; border-left:4px solid #35c8dc; border-radius:6px; margin:25px 0;">
                                    <tr>
                                        <td style="padding:16px;">
                                            <p style="margin:0; font-size:15px;">
                                                <strong>Email:</strong> ${email}
                                            </p>
                                            <p style="margin:8px 0 0; font-size:15px;">
                                                <strong>Login Time:</strong> ${new Date().toLocaleString()}
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <p style="font-size:15px; line-height:1.6; color:#555;">
                                    If you don’t recognize this activity, please contact our support team immediately.
                                </p>

                                <!-- Button -->
                                <div style="text-align:center; margin:30px 0;">
                                    <a href="#"
                                        style="background:#35c8dc; color:#ffffff; padding:14px 34px; text-decoration:none; border-radius:6px; font-size:16px; font-weight:bold; display:inline-block;">
                                        Go to Dashboard
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    `,
    }),


    checkoutEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        productName,
        quantity,

        salesExecutive,
        salesExecutiveEmail,
        salesManager,
        salesManagerEmail,
        reseller,

        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,

        deviceUnits,
        budgetPerDevice,
        revenue,
        crmAccount,
        vertical,
        segment,
        useCase,
        currentDevices,
        licenses,
        usingCopilot,
        securityFactor,
        deviceProtection,

        note,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        productName: string;
        quantity: number;

        salesExecutive: string;
        salesExecutiveEmail: string;
        salesManager: string;
        salesManagerEmail: string;
        reseller: string;

        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;

        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        crmAccount: string;
        vertical: string;
        segment: string;
        useCase: string;
        currentDevices: string;
        licenses: string;
        usingCopilot: string;
        securityFactor: string;
        deviceProtection: string;

        note: string;
    }) => ({
        subject: `New Order #${orderNumber} | TD SYNNEX SURFACE`,

        text: `New TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello ${customerName},

            Thank you for your order from tdsynnex-surface.com.
            Once your order is approved, you will receive a confirmation email,
            after which it will be shipped to your customer.

            ORDER ITEMS
            Product: ${productName}
            Quantity: ${quantity}

            TEAM DETAILS
            Sales Executive: ${salesExecutive}
            Sales Executive Email: ${salesExecutiveEmail}
            Sales Manager: ${salesManager}
            Sales Manager Email: ${salesManagerEmail}
            Reseller: ${reseller}

            SHIPPING DETAILS
            Company Name: ${companyName}
            Contact Name: ${contactName}
            Email Address: ${contactEmail}
            Shipping Address: ${shippingAddress}
            City: ${city}
            State: ${state}
            Zip: ${zip}
            Desired Demo Delivery Date: ${deliveryDate}

            OPPORTUNITY DETAILS
            Device Opportunity Size (Units): ${deviceUnits}
            Budget Per Device ($): ${budgetPerDevice}
            Revenue Opportunity Size ($): ${revenue}
            CRM Account #: ${crmAccount}
            Vertical: ${vertical}
            Segment: ${segment}

            Use Case:
            ${useCase}

            Current Devices: ${currentDevices}
            Number of Licenses: ${licenses}
            Using Copilot: ${usingCopilot}
            Is Security a Factor: ${securityFactor}
            Device Protection: ${deviceProtection}

            NOTE
            ${note}

            If you have any questions, please contact us at support@tdsynnex-surface.com.

            Best regards,
            The TD SYNNEX Team`,
        html: `<div style="font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    New Order #${orderNumber}
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="margin:0 0 8px;"><strong>New TD SYNNEX Order (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 20px;">Placed On ${orderDate}</p>

                                <p style="font-size:15px; line-height:1.6;">
                                    Hello <strong>${customerName}</strong>,<br />
                                    Thank you for your order from <strong>tdsynnex-surface.com</strong>.
                                    Once your order is approved, you will receive a confirmation email after which
                                    it will be shipped to your customer.
                                </p>
                            </td>
                        </tr>

                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;">${productName}</td>
                                        <td style="padding:10px; border:1px solid #ddd; text-align:center;">${quantity}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- TEAM DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Team Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Reseller</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${reseller}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SHIPPING DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Shipping Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Company Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Contact Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Email Address</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Shipping
                                                Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>City</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${city}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>State</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${state}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Zip</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Desired Demo Delivery
                                                Date</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deliveryDate}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- OPPORTUNITY DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Opportunity Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device Opportunity Size
                                                (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Budget Per Device
                                                ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Revenue Opportunity
                                                Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>CRM Account #</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${crmAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Vertical</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${vertical}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Use Case for this Demo
                                                Request</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${useCase}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Current
                                                Devices</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentDevices}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Number of
                                                Licenses</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${licenses}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Using Copilot</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${usingCopilot}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Is Security a
                                                Factor</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${securityFactor}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device
                                                Protection</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceProtection}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- NOTE -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Note
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:12px; border:1px solid #ddd; color:#555;">
                                            ${note}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>`,
    }),


    newOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        productName,
        quantity,

        salesExecutive,
        salesExecutiveEmail,
        salesManager,
        salesManagerEmail,
        reseller,

        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,

        deviceUnits,
        budgetPerDevice,
        revenue,
        crmAccount,
        vertical,
        segment,
        useCase,
        currentDevices,
        licenses,
        usingCopilot,
        securityFactor,
        deviceProtection,

        note,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        productName: string;
        quantity: number;

        salesExecutive: string;
        salesExecutiveEmail: string;
        salesManager: string;
        salesManagerEmail: string;
        reseller: string;

        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;

        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        crmAccount: string;
        vertical: string;
        segment: string;
        useCase: string;
        currentDevices: string;
        licenses: string;
        usingCopilot: string;
        securityFactor: string;
        deviceProtection: string;

        note: string;
    }) => ({
        subject: `New Order #${orderNumber} | TD SYNNEX SURFACE`,

        text: `New TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello Team TD SYNNEX,

            You have received a new order from tdsynnex-surface.com. Please click on the link below to Review and Approve/Reject.

            ORDER ITEMS
            Product: ${productName}
            Quantity: ${quantity}

            TEAM DETAILS
            Sales Executive: ${salesExecutive}
            Sales Executive Email: ${salesExecutiveEmail}
            Sales Manager: ${salesManager}
            Sales Manager Email: ${salesManagerEmail}
            Reseller: ${reseller}

            SHIPPING DETAILS
            Company Name: ${companyName}
            Contact Name: ${contactName}
            Email Address: ${contactEmail}
            Shipping Address: ${shippingAddress}
            City: ${city}
            State: ${state}
            Zip: ${zip}
            Desired Demo Delivery Date: ${deliveryDate}

            OPPORTUNITY DETAILS
            Device Opportunity Size (Units): ${deviceUnits}
            Budget Per Device ($): ${budgetPerDevice}
            Revenue Opportunity Size ($): ${revenue}
            CRM Account #: ${crmAccount}
            Vertical: ${vertical}
            Segment: ${segment}

            Use Case:
            ${useCase}

            Current Devices: ${currentDevices}
            Number of Licenses: ${licenses}
            Using Copilot: ${usingCopilot}
            Is Security a Factor: ${securityFactor}
            Device Protection: ${deviceProtection}

            NOTE
            ${note}

            If you have any questions, please contact us at support@tdsynnex-surface.com.

            Best regards,
            The TD SYNNEX Team`,
        html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    New Order #${orderNumber}
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="margin:0 0 8px;"><strong>New TD SYNNEX Order (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 20px;">Placed On ${orderDate}</p>

                                <p style="font-size:15px; line-height:1.6;">
                                    <strong>Hello TD SYNNEX Team,</strong><br />
                                    You have received a new order from <strong>tdsynnex-surface.com</strong>.
                                    Please click on the link below to Review and Approve/Reject.
                                </p>
                            </td>
                        </tr>

                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;">${productName}</td>
                                        <td style="padding:10px; border:1px solid #ddd; text-align:center;">${quantity}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- TEAM DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Team Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Reseller</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${reseller}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SHIPPING DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Shipping Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Company Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Contact Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Email Address</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Shipping
                                                Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>City</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${city}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>State</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${state}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Zip</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Desired Demo Delivery
                                                Date</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deliveryDate}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- OPPORTUNITY DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Opportunity Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device Opportunity Size
                                                (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Budget Per Device
                                                ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Revenue Opportunity
                                                Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>CRM Account #</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${crmAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Vertical</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${vertical}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Use Case for this Demo
                                                Request</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${useCase}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Current
                                                Devices</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentDevices}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Number of
                                                Licenses</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${licenses}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Using Copilot</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${usingCopilot}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Is Security a
                                                Factor</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${securityFactor}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device
                                                Protection</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceProtection}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- NOTE -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Note
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:12px; border:1px solid #ddd; color:#555;">
                                            ${note}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    approvedOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        productName,
        quantity,

        salesExecutive,
        salesExecutiveEmail,
        salesManager,
        salesManagerEmail,
        reseller,

        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,

        deviceUnits,
        budgetPerDevice,
        revenue,
        crmAccount,
        vertical,
        segment,
        useCase,
        currentDevices,
        licenses,
        usingCopilot,
        securityFactor,
        deviceProtection,

        note,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        productName: string;
        quantity: number;

        salesExecutive: string;
        salesExecutiveEmail: string;
        salesManager: string;
        salesManagerEmail: string;
        reseller: string;

        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;

        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        crmAccount: string;
        vertical: string;
        segment: string;
        useCase: string;
        currentDevices: string;
        licenses: string;
        usingCopilot: string;
        securityFactor: string;
        deviceProtection: string;

        note: string;
    }) => ({
        subject: `Order Approved #${orderNumber} | TD SYNNEX SURFACE`,
        text: `Approved TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello,

            Your order placed on tdsynnex-surface.com has been approved.

            Once your package ships, you will receive a separate email containing
            shipping details, tracking information, and a prepaid return label.

            ORDER ITEMS
            Product: ${productName}
            Quantity: ${quantity}

            TEAM DETAILS
            Sales Executive: ${salesExecutive}
            Sales Executive Email: ${salesExecutiveEmail}
            Sales Manager: ${salesManager}
            Sales Manager Email: ${salesManagerEmail}
            Reseller: ${reseller}

            SHIPPING DETAILS
            Company Name: ${companyName}
            Contact Name: ${contactName}
            Email Address: ${contactEmail}
            Shipping Address: ${shippingAddress}
            City: ${city}
            State: ${state}
            Zip: ${zip}
            Desired Demo Delivery Date: ${deliveryDate}

            OPPORTUNITY DETAILS
            Device Opportunity Size (Units): ${deviceUnits}
            Budget Per Device ($): ${budgetPerDevice}
            Revenue Opportunity Size ($): ${revenue}
            CRM Account #: ${crmAccount}
            Vertical: ${vertical}
            Segment: ${segment}

            Use Case for this Demo Request:
            ${useCase}

            Current Devices: ${currentDevices}
            Number of Licenses: ${licenses}
            Using Copilot: ${usingCopilot}
            Is Security a Factor: ${securityFactor}
            Device Protection: ${deviceProtection}

            NOTE
            ${note}

            If you have any questions, please contact us at support@tdsynnex-surface.com.

            Best regards,
            The TD SYNNEX Team`,
        html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Order Approved #${orderNumber}
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="margin:0 0 8px;  font-size:20px;;"><strong>Approved Order (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:18px;">Placed On ${orderDate}</p>

                                <p style="font-size:15px; line-height:1.6;">
                                    Your order on tdsynnex-surface.com has been approved. Once your package ships, you
                                    will receive a shipping email with tracking information and a prepaid Return Label
                                    for your order.

                                </p>
                                <p>
                                    If you have any questions please contact us at support@tdsynnex-surface.com.
                                </p>
                            </td>
                        </tr>

                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;">${productName}</td>
                                        <td style="padding:10px; border:1px solid #ddd; text-align:center;">${quantity}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- TEAM DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Team Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Reseller</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${reseller}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SHIPPING DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Shipping Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Company Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Contact Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Email Address</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Shipping
                                                Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>City</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${city}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>State</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${state}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Zip</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Desired Demo Delivery
                                                Date</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deliveryDate}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- OPPORTUNITY DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Opportunity Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device Opportunity Size
                                                (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Budget Per Device
                                                ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Revenue Opportunity
                                                Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>CRM Account #</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${crmAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Vertical</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${vertical}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Use Case for this Demo
                                                Request</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${useCase}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Current
                                                Devices</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentDevices}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Number of
                                                Licenses</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${licenses}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Using Copilot</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${usingCopilot}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Is Security a
                                                Factor</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${securityFactor}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device
                                                Protection</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceProtection}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- NOTE -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Note
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:12px; border:1px solid #ddd; color:#555;">
                                            ${note}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    rejectedOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        productName,
        quantity,

        salesExecutive,
        salesExecutiveEmail,
        salesManager,
        salesManagerEmail,
        reseller,

        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,

        deviceUnits,
        budgetPerDevice,
        revenue,
        crmAccount,
        vertical,
        segment,
        useCase,
        currentDevices,
        licenses,
        usingCopilot,
        securityFactor,
        deviceProtection,

        note,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        productName: string;
        quantity: number;

        salesExecutive: string;
        salesExecutiveEmail: string;
        salesManager: string;
        salesManagerEmail: string;
        reseller: string;

        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;

        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        crmAccount: string;
        vertical: string;
        segment: string;
        useCase: string;
        currentDevices: string;
        licenses: string;
        usingCopilot: string;
        securityFactor: string;
        deviceProtection: string;

        note: string;
    }) => ({
        subject: `Rejected Order #${orderNumber} | TD SYNNEX SURFACE`,
        text: `Rejected TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello,

            Your order placed on tdsynnex-surface.com has been rejected.

            ORDER ITEMS
            Product: ${productName}
            Quantity: ${quantity}

            TEAM DETAILS
            Sales Executive: ${salesExecutive}
            Sales Executive Email: ${salesExecutiveEmail}
            Sales Manager: ${salesManager}
            Sales Manager Email: ${salesManagerEmail}
            Reseller: ${reseller}

            SHIPPING DETAILS
            Company Name: ${companyName}
            Contact Name: ${contactName}
            Email Address: ${contactEmail}
            Shipping Address: ${shippingAddress}
            City: ${city}
            State: ${state}
            Zip: ${zip}
            Desired Demo Delivery Date: ${deliveryDate}

            OPPORTUNITY DETAILS
            Device Opportunity Size (Units): ${deviceUnits}
            Budget Per Device ($): ${budgetPerDevice}
            Revenue Opportunity Size ($): ${revenue}
            CRM Account #: ${crmAccount}
            Vertical: ${vertical}
            Segment: ${segment}

            Use Case for this Demo Request:
            ${useCase}

            Current Devices: ${currentDevices}
            Number of Licenses: ${licenses}
            Using Copilot: ${usingCopilot}
            Is Security a Factor: ${securityFactor}
            Device Protection: ${deviceProtection}

            NOTE
            ${note}

            If you have any questions, please contact us at support@tdsynnex-surface.com.

            Best regards,
            The TD SYNNEX Team`,

        html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Order Rejected #${orderNumber}
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:18px;"><strong>Rejected Order (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:16px;">Placed On ${orderDate}</p>
                            </td>
                        </tr>

                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;">${productName}</td>
                                        <td style="padding:10px; border:1px solid #ddd; text-align:center;">${quantity}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- TEAM DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Team Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Reseller</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${reseller}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SHIPPING DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Shipping Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Company Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Contact Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Email Address</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Shipping
                                                Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>City</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${city}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>State</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${state}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Zip</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Desired Demo Delivery
                                                Date</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deliveryDate}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- OPPORTUNITY DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Opportunity Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device Opportunity Size
                                                (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Budget Per Device
                                                ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Revenue Opportunity
                                                Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>CRM Account #</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${crmAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Vertical</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${vertical}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Use Case for this Demo
                                                Request</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${useCase}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Current
                                                Devices</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentDevices}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Number of
                                                Licenses</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${licenses}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Using Copilot</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${usingCopilot}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Is Security a
                                                Factor</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${securityFactor}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device
                                                Protection</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceProtection}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- NOTE -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Note
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:12px; border:1px solid #ddd; color:#555;">
                                            ${note}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    returnedOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        productName,
        quantity,

        salesExecutive,
        salesExecutiveEmail,
        salesManager,
        salesManagerEmail,
        reseller,

        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,

        deviceUnits,
        budgetPerDevice,
        revenue,
        crmAccount,
        vertical,
        segment,
        useCase,
        currentDevices,
        licenses,
        usingCopilot,
        securityFactor,
        deviceProtection,

        note,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        productName: string;
        quantity: number;

        salesExecutive: string;
        salesExecutiveEmail: string;
        salesManager: string;
        salesManagerEmail: string;
        reseller: string;

        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;

        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        crmAccount: string;
        vertical: string;
        segment: string;
        useCase: string;
        currentDevices: string;
        licenses: string;
        usingCopilot: string;
        securityFactor: string;
        deviceProtection: string;

        note: string;
    }) => ({
        subject: `Order Returned #${orderNumber} | TD SYNNEX SURFACE`,
        text: `Returned TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello,

            Your order placed on tdsynnex-surface.com has been returned.

            ORDER ITEMS
            Product: ${productName}
            Quantity: ${quantity}

            TEAM DETAILS
            Sales Executive: ${salesExecutive}
            Sales Executive Email: ${salesExecutiveEmail}
            Sales Manager: ${salesManager}
            Sales Manager Email: ${salesManagerEmail}
            Reseller: ${reseller}

            SHIPPING DETAILS
            Company Name: ${companyName}
            Contact Name: ${contactName}
            Email Address: ${contactEmail}
            Shipping Address: ${shippingAddress}
            City: ${city}
            State: ${state}
            Zip: ${zip}
            Desired Demo Delivery Date: ${deliveryDate}

            OPPORTUNITY DETAILS
            Device Opportunity Size (Units): ${deviceUnits}
            Budget Per Device ($): ${budgetPerDevice}
            Revenue Opportunity Size ($): ${revenue}
            CRM Account #: ${crmAccount}
            Vertical: ${vertical}
            Segment: ${segment}

            Use Case for this Demo Request:
            ${useCase}

            Current Devices: ${currentDevices}
            Number of Licenses: ${licenses}
            Using Copilot: ${usingCopilot}
            Is Security a Factor: ${securityFactor}
            Device Protection: ${deviceProtection}

            NOTE
            ${note}

            If you have any questions, please contact us at support@tdsynnex-surface.com.

            Best regards,
            The TD SYNNEX Team`,

        html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Order Returned #${orderNumber}
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:18px;"><strong>Returned Order
                                        (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:16px;">Placed On ${orderDate}</p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;"><strong>Hello, ${customerName}</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;">Your order has been returned.</p>
                                <p style="margin:4px; font-size:15px;"><strong>If this TD SYNNEX Surface order
                                        helped you close, you can Report a Win on the program.</strong></p>
                                <!-- CTA Button -->
                                <div style="text-align:center; margin:30px 0;">
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/wins" style="
                                            background:#0A4647;
                                            color:#ffffff;
                                            padding:14px 34px;
                                            text-decoration:none;
                                            border-radius:6px;
                                            font-size:16px;
                                            font-weight:600;
                                            display:inline-block;
                                        ">
                                        Report a Win
                                    </a>
                                </div>
                            </td>
                        </tr>


                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;">${productName}</td>
                                        <td style="padding:10px; border:1px solid #ddd; text-align:center;">${quantity}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- TEAM DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Team Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Reseller</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${reseller}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SHIPPING DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Shipping Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Company Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Contact Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Email Address</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Shipping
                                                Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>City</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${city}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>State</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${state}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Zip</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Desired Demo Delivery
                                                Date</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deliveryDate}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- OPPORTUNITY DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Opportunity Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device Opportunity Size
                                                (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Budget Per Device
                                                ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Revenue Opportunity
                                                Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>CRM Account #</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${crmAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Vertical</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${vertical}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Use Case for this Demo
                                                Request</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${useCase}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Current
                                                Devices</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentDevices}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Number of
                                                Licenses</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${licenses}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Using Copilot</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${usingCopilot}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Is Security a
                                                Factor</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${securityFactor}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device
                                                Protection</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceProtection}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- NOTE -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Note
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:12px; border:1px solid #ddd; color:#555;">
                                            ${note}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TDsynnex Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    shippedOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        productName,
        quantity,

        returnTracking,
        orderTracking,
        fileLink,
        caseType,
        returnTrackingLink,
        orderTrackingLink,

        salesExecutive,
        salesExecutiveEmail,
        salesManager,
        salesManagerEmail,
        reseller,

        companyName,
        contactName,
        contactEmail,
        shippingAddress,
        city,
        state,
        zip,
        deliveryDate,

        deviceUnits,
        budgetPerDevice,
        revenue,
        crmAccount,
        vertical,
        segment,
        useCase,
        currentDevices,
        licenses,
        usingCopilot,
        securityFactor,
        deviceProtection,

        note,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        productName: string;
        quantity: number;

        returnTracking: string;
        orderTracking: string;
        fileLink: string;
        caseType: string;

        orderTrackingLink: string;
        returnTrackingLink: string;

        salesExecutive: string;
        salesExecutiveEmail: string;
        salesManager: string;
        salesManagerEmail: string;
        reseller: string;

        companyName: string;
        contactName: string;
        contactEmail: string;
        shippingAddress: string;
        city: string;
        state: string;
        zip: string;
        deliveryDate: string;

        deviceUnits: number | string;
        budgetPerDevice: number | string;
        revenue: number | string;
        crmAccount: string;
        vertical: string;
        segment: string;
        useCase: string;
        currentDevices: string;
        licenses: string;
        usingCopilot: string;
        securityFactor: string;
        deviceProtection: string;

        note: string;
    }) => ({
        subject: `Order Shipped #${orderNumber} | TD SYNNEX SURFACE`,
        text: `Shipped TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello,

            Your order placed on tdsynnex-surface.com has been shipped.

            ORDER ITEMS
            Product: ${productName}
            Quantity: ${quantity}

            TEAM DETAILS
            Sales Executive: ${salesExecutive}
            Sales Executive Email: ${salesExecutiveEmail}
            Sales Manager: ${salesManager}
            Sales Manager Email: ${salesManagerEmail}
            Reseller: ${reseller}

            SHIPPING DETAILS
            Company Name: ${companyName}
            Contact Name: ${contactName}
            Email Address: ${contactEmail}
            Shipping Address: ${shippingAddress}
            City: ${city}
            State: ${state}
            Zip: ${zip}
            Desired Demo Delivery Date: ${deliveryDate}

            OPPORTUNITY DETAILS
            Device Opportunity Size (Units): ${deviceUnits}
            Budget Per Device ($): ${budgetPerDevice}
            Revenue Opportunity Size ($): ${revenue}
            CRM Account #: ${crmAccount}
            Vertical: ${vertical}
            Segment: ${segment}

            Use Case for this Demo Request:
            ${useCase}

            Current Devices: ${currentDevices}
            Number of Licenses: ${licenses}
            Using Copilot: ${usingCopilot}
            Is Security a Factor: ${securityFactor}
            Device Protection: ${deviceProtection}

            NOTE
            ${note}

            If you have any questions, please contact us at support@tdsynnex-surface.com.

            Best regards,
            The TD SYNNEX Team`,

        html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Order Shipped #${orderNumber}
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:18px;"><strong>Shipped Order
                                        (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:16px;">Placed On ${orderDate}</p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;"><strong>Hello,
                                        ${customerName}</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;">Your order on TD SYNNEX has been
                                    shipped. You can find below Tracking information and Return Label for your order.
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Tracking Information
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Order Tracking
                                                #</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;"><a href=${orderTrackingLink}>${orderTracking}</a></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Return Tracking
                                                #</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;"><a href=${returnTrackingLink}>${returnTracking}</a></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Case Type:</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${caseType}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <div style="text-align:center; margin:30px 0;">
                                    <a href=${fileLink} style="
                                            background:#0A4647;
                                            color:#ffffff;
                                            padding:14px 34px;
                                            text-decoration:none;
                                            border-radius:6px;
                                            font-size:16px;
                                            font-weight:600;
                                            display:inline-block;
                                        ">
                                        View Return Label
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;">${productName}</td>
                                        <td style="padding:10px; border:1px solid #ddd; text-align:center;">${quantity}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- TEAM DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Team Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Reseller</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${reseller}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SHIPPING DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Shipping Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Company Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Contact Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Email Address</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Shipping
                                                Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>City</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${city}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>State</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${state}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Zip</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Desired Demo Delivery
                                                Date</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deliveryDate}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- OPPORTUNITY DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Opportunity Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device Opportunity Size
                                                (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Budget Per Device
                                                ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Revenue Opportunity
                                                Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>CRM Account #</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${crmAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Vertical</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${vertical}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Use Case for this Demo
                                                Request</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${useCase}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Current
                                                Devices</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentDevices}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Number of
                                                Licenses</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${licenses}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Using Copilot</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${usingCopilot}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Is Security a
                                                Factor</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${securityFactor}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Device
                                                Protection</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceProtection}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- NOTE -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Note
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:12px; border:1px solid #ddd; color:#555;">
                                            ${note}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TDsynnex Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    returnReminderEmail: ({
        orderNumber,
        orderDate,
        productName,
        productSlug,
        quantity,
        returnTracking,
        fileLink,
        salesExecutive,
        salesExecutiveEmail,
        salesManager,
        salesManagerEmail,
        companyName,
        contactEmail,
        shippedDate,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        productName: string;
        productSlug: string;
        quantity: number;

        returnTracking: string;
        fileLink: string;

        salesExecutive: string;
        salesExecutiveEmail: string;
        salesManager: string;
        salesManagerEmail: string;

        companyName: string;
        contactEmail: string;
        shippedDate: string;
    }) => ({
        subject: `Return Reminder - Order #${orderNumber} (${companyName}) | TD SYNNEX SURFACE`,
        text: `Return Reminder Notification | TD SYNNEX SURFACE

            Return Reminder - Order #${orderNumber} (${companyName}) 
            Placed On: ${orderDate}

            Hello,

            Thank you for using TD SYNNEX SURFACE! We hope your experience was very positive.

            Your order for ${companyName} is now due for return. 
            You can view your return label using the link below or request it via email at support@tdsynnex-surface.com:

            View Return Label: ${fileLink}

            ORDER ITEMS
            Product: ${productName}
            Quantity: ${quantity}

            ORDER DETAILS
            Sales Executive: ${salesExecutive}
            Sales Executive Email: ${salesExecutiveEmail}
            Sales Manager: ${salesManager}
            Sales Manager Email: ${salesManagerEmail}
            Customer Company Name: ${companyName}
            Customer Contact Email: ${contactEmail}
            Shipped Date: ${shippedDate}
            Returned Tracking: ${returnTracking}

            If you have any questions, please contact us at support@tdsynnex-surface.com.

            Best regards,
            The TD SYNNEX Team`,
        html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Return Reminder Notification Order #${orderNumber} (${companyName}) | TD SYNNEX
                                    SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px;  font-size:20px;"><strong>Return Reminder Order
                                        #${orderNumber}</strong></p>
                                <p style="margin:0 0 8px;  font-size:14px;">Placed On ${orderDate}</p>
                                <p style="font-size:15px; line-height:1.6;">
                                    Thank you for using TD SYNNEX SURFACE! We hope your experience was very positive.
                                </p>
                                <p>
                                    Your order for ${companyName} is now due for return. You can also
                                    obtain a soft copy of the return label by clicking on the below or sending a request
                                    at support@tdsynnex-surface.com,
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:0; color:#333;">
                                <div style="text-align:center; margin:30px 0;">
                                    <a href=${fileLink} style="
                                            background:#0A4647;
                                            color:#ffffff;
                                            padding:14px 34px;
                                            text-decoration:none;
                                            border-radius:6px;
                                            font-size:16px;
                                            font-weight:600;
                                            display:inline-block;
                                        ">
                                        View Return Label
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><a href=${`${process.env.NEXT_PUBLIC_APP_URL}/product/${productSlug}`}>${productName}</a></td>
                                        <td style="padding:10px; border:1px solid #ddd; text-align:center;">${quantity}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Order DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Customer Company
                                                Name</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Customer Contact
                                                Name</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Shipped Date</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippedDate}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Returned
                                                Tracking</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${returnTracking}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    returnReminderCronEmail: ({
        orderNumber,
        orderDate,
        productName,
        productSlug,
        quantity,
        daysCount,
        returnTracking,
        fileLink,
        salesExecutive,
        salesExecutiveEmail,
        salesManager,
        salesManagerEmail,
        companyName,
        contactEmail,
        shippedDate,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        productName: string;
        productSlug: string;
        quantity: number;

        returnTracking: string;
        fileLink: string;

        salesExecutive: string;
        salesExecutiveEmail: string;
        salesManager: string;
        salesManagerEmail: string;
        daysCount: string;

        companyName: string;
        contactEmail: string;
        shippedDate: string;
    }) => ({
        subject: `Overdue Reminder - Order #${orderNumber} (${companyName}) | TD SYNNEX SURFACE`,
        text: `Overdue Reminder Notification | TD SYNNEX SURFACE

            Return Reminder - Order #${orderNumber} (${companyName}) 
            Placed On: ${orderDate}

            Hello,

            Thank you for using TD SYNNEX SURFACE! We hope your experience was very positive.

            Your order for ${companyName} is now due for return. 
            You can view your return label using the link below or request it via email at support@tdsynnex-surface.com:

            View Return Label: ${fileLink}

            ORDER ITEMS
            Product: ${productName}
            Quantity: ${quantity}

            ORDER DETAILS
            Sales Executive: ${salesExecutive}
            Sales Executive Email: ${salesExecutiveEmail}
            Sales Manager: ${salesManager}
            Sales Manager Email: ${salesManagerEmail}
            Customer Company Name: ${companyName}
            Customer Contact Email: ${contactEmail}
            Shipped Date: ${shippedDate}
            Returned Tracking: ${returnTracking}

            If you have any questions, please contact us at support@tdsynnex-surface.com.

            Best regards,
            The TD SYNNEX Team`,
        html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Overdue Reminder Notification Order #${orderNumber} (${companyName}) | TD SYNNEX
                                    SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px;  font-size:20px;"><strong>Return Reminder Order
                                        #${orderNumber}</strong></p>
                                <p style="margin:0 0 8px;  font-size:14px;">Placed On ${orderDate}</p>
                                <p style="font-size:15px; line-height:1.6;">
                                     This is a message from the TD SYNNEX SURFACE team that <b>Order #${orderNumber}</b> for <b>(${companyName})</b> has now
                                    been shipped for a period of <b>${daysCount}</b> against the 30-day trial period.
                                </p>
                                <p>
                                    Your order for ${companyName} is now due for return. You can also
                                    obtain a soft copy of the return label by clicking on the below or sending a request
                                    at support@tdsynnex-surface.com,
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:0; color:#333;">
                                <div style="text-align:center; margin:30px 0;">
                                    <a href=${fileLink} style="
                                            background:#0A4647;
                                            color:#ffffff;
                                            padding:14px 34px;
                                            text-decoration:none;
                                            border-radius:6px;
                                            font-size:16px;
                                            font-weight:600;
                                            display:inline-block;
                                        ">
                                        View Return Label
                                    </a>
                                </div>
                            </td>
                        </tr>

                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><a href=${`${process.env.NEXT_PUBLIC_APP_URL}/product/${productSlug}`}>${productName}</a></td>
                                        <td style="padding:10px; border:1px solid #ddd; text-align:center;">${quantity}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Order DETAILS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Customer Company
                                                Name</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Customer Contact
                                                Name</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Shipped Date</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippedDate}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;"><strong>Returned
                                                Tracking</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${returnTracking}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    reportWinEmail: ({
        orderNumber,
        orderDate,
        customerName,
        submittedEmail,

        productName,
        quantity,

        resellerAccount,
        units,
        pType,
        dealRev,
        reseller,
        notes,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        submittedEmail: string;

        productName: string;
        quantity: number;

        reseller: string;
        resellerAccount: string;
        units: string;
        pType: string;
        dealRev: string;
        notes: string;
    }) => ({
        subject: `Report a Win | TD SYNNEX SURFACE`,
        text: `Report a Win | TD SYNNEX SURFACE
            Submitted by: ${submittedEmail}
            Win Reported Order#: ${orderNumber}

            ORDER ITEMS
            Product: ${productName}
            Quantity: ${quantity}

            RESELLER & ORDER DETAILS
            Reseller Account #: ${resellerAccount}
            Reseller Name: ${reseller}
            Synnex Order#: ${orderNumber}
            Customer Name: ${customerName}
            Number of Units: ${units}
            One-time purchase or roll out?: ${pType}
            Total Deal Revenue ($): ${dealRev}
            Date of Purchase: ${orderDate}

            HOW TD SYNNEX SURFACE HELPED CLOSE THE DEAL
            ${notes}


            If you have any questions, please contact us at support@tdsynnex-surface.com.

            Best regards,
            The TD SYNNEX Team`
        ,
        html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Report a Win | TD SYNNEX SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:14px;"><strong>Submitted by:
                                    </strong>${submittedEmail}</p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:14px;"><strong>Win Reported Order#
                                        ${orderNumber}</strong></p>
                            </td>
                        </tr>

                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr style="background:#0A4647; color: white;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd;">${productName}</td>
                                        <td style="padding:10px; border:1px solid #ddd; text-align:center;">${quantity}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"> 
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Reseller Account
                                                #</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${resellerAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Reseller
                                                Name</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${reseller}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Synnex
                                                Order#</strong>
                                        </td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${orderNumber}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Customer
                                                Name</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${customerName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Number of
                                                Units</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${units}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Is this be a
                                                one-time purchase or roll out?</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${pType}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Total Deal Revenue
                                                ($)</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${dealRev}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;"><strong>Date of
                                                Purchase</strong></td>
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${orderDate}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;" colspan="2"><strong>How
                                                did TD SYNNEX SURFACE help you close this deal?</strong></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:20px 10px; border:1px solid #ddd;" colspan="2">${notes}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    waitListEmail: ({
        product,
        sku,
        email,
    }: {
        product: string;
        sku: string;
        email: string;
    }) => ({
        subject: `Product Subscribed | TD SYNNEX SURFACE`,
        text: `Product Subscribed | TD SYNNEX SURFACE
                Dear ${email},

                You have successfully subscribed to the following product on TD SYNNEX SURFACE.

                PRODUCT DETAILS
                Product: ${product}
                SKU: ${sku}

                You will receive an email notification as soon as this product is back in stock.

                Thank you for using TD SYNNEX SURFACE.

                If you have any questions, please contact us at support@tdsynnex-surface.com.

                Best regards,
                The TD SYNNEX Team`
        ,
        html: `
            <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Product Subscribed | TD SYNNEX SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:14px;"><strong>Dear:
                                    </strong>${email}</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0 30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6;">
                                    You have subscribed to <b>${product} (${sku})</b> on TD SYNNEX SURFACE. An email notification will be sent
                                    once the product is back in stock.
                                </p>
                                <p>
                                    Thank you for using TD SYNNEX SURFACE!
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    backInStockEmail: ({
        product,
        sku,
        email,
        productUrl,
    }: {
        product: string;
        sku: string;
        email: string;
        productUrl: string;
    }) => ({
        subject: `Product Back In Stock | TD SYNNEX SURFACE`,
        text: `Product Back In Stock | TD SYNNEX SURFACE
            Hello ${email},

            Your subscribed product is now back in stock.

            PRODUCT DETAILS
            Product: ${product}
            SKU: ${sku}

            You can now add this product directly to your cart using the link below:
            ${productUrl}

            Thank you for using TD SYNNEX SURFACE.

            If you have any questions, please contact us at support@tdsynnex-surface.com.

            Best regards,
            The TD SYNNEX Team`,
        html: `
        <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Product Back In Stock | TD SYNNEX SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:14px;"><strong>Hello 
                                    </strong>${email},</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0 30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6;">
                                    Your Subscribed Product <b>${product} (${sku})</b> is now back in stock!
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0 30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6;">
                                    You can now add this product directly to your cart ${productUrl}
                                </p>
                                <p>
                                    Thank you for using TD SYNNEX SURFACE!
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br>
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>

                </td>
            </tr>
        </table>
    </div>
        `,
    }),


    approvedUserEmail: (email: string) => ({
        subject: `User Approved | TD SYNNEX SURFACE`,
        text: `Hi ${email},

            Thank you for signing up! Your account has been reviewed and approved by our admin team.

            You can now log in and start using the TD SYNNEX portal.

            Login: ${process.env.NEXT_PUBLIC_APP_URL}/login

            If you have any questions or experience issues accessing your account,
            please contact our support team.

            Best regards,
            The TD SYNNEX Team`,
        html: `<div style="font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- Header -->
                        <tr>
                            <td
                                style="background:linear-gradient(135deg,#0A4647,#093636); padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:15px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Account Approved
                                </h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="font-size:16px; line-height:1.6; margin-top:0;">
                                    Hi <strong>${email}</strong>,
                                </p>

                                <p style="font-size:16px; line-height:1.6;">
                                    Thank you for signing up! Your account has been reviewed and
                                    <strong>approved by our admin team</strong>.
                                </p>

                                <p style="font-size:16px; line-height:1.6;">
                                    You can now log in and start using the TD SYNNEX portal.
                                </p>

                                <!-- CTA Button -->
                                <div style="text-align:center; margin:35px 0;">
                                    <a href="/login"
                                        style="background:#35c8dc; color:#ffffff; padding:14px 36px; text-decoration:none; border-radius:6px; font-size:16px; font-weight:bold; display:inline-block;">
                                        Login to Portal
                                    </a>
                                </div>

                                <p style="font-size:14px; line-height:1.6; color:#555;">
                                    If you have any questions or face issues accessing your account,
                                    feel free to contact our support team.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br />
                                    <strong>The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </div>`,
    }),


    rejectedUserEmail: (email: string) => ({
        subject: `User Rejected | TD SYNNEX SURFACE`,
        text: `Hi ${email},

Thank you for your interest in the TD SYNNEX portal.

After careful review, we’re unable to approve your account at this time.
This decision may be based on internal verification or eligibility requirements.

If you believe this is a mistake or need further clarification,
please contact our support team for assistance.

Best regards,
The TD SYNNEX Team`,
        html: `    <div style="font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">

                        <!-- Header -->
                        <tr>
                            <td
                                style="background:linear-gradient(135deg,#0A4647,#093636); padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:15px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Account Update
                                </h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="font-size:16px; line-height:1.6; margin-top:0;">
                                    Hi <strong>${email}</strong>,
                                </p>

                                <p style="font-size:16px; line-height:1.6;">
                                    Thank you for signing up for the TD SYNNEX portal.
                                </p>

                                <p style="font-size:16px; line-height:1.6; color:#b02a37;">
                                    After careful review, we’re unable to approve your account at this time.
                                </p>

                                <p style="font-size:15px; line-height:1.6; color:#555;">
                                    This decision may be based on internal verification or eligibility requirements.
                                </p>

                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td
                                style="background:#f1f3f5; padding:20px; text-align:center; font-size:14px; color:#666;">
                                <p style="margin:0;">
                                    Best regards,<br />
                                    <strong style="margin-top:20px;">The TD SYNNEX Team</strong>
                                </p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
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