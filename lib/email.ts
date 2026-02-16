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
        text: `Dear Program Manager(s),\n\nYou have received a new user registration on TD Synnex.\nPlease review to approve or reject this user.\n\nReview Pending User(s)\n\nBelow are the details for this user:\n \nEmail (Username): ${userData.email}\nFirst Name: ${userData.firstName}\nLast Name: ${userData.lastName}\nReseller: ${userData.reseller}\n\nPlease login to the admin panel to review this user.\n\nBest regards,\nTD SYNNEX Team`,
        html: `
        <div
    style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid black">

    <!-- Header -->
    <div style="background: #0A4647; padding: 32px 24px; text-align: center;">
      <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX" style="max-width: 180px; height: auto;">
      <h1 style="color: white; margin: 20px 0 0; font-size: 24px; font-weight: 500;">New User Registration</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px; background: #ffffff;">

      <h2 style="color: #0A4647; margin: 0 0 24px; font-size: 20px; font-weight: 500;">Dear Program Manager(s),</h2>

      <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 8px;">
        A new user has registered on <strong>TD SYNNEX Portal</strong>.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #333333; margin: 0 0 32px;">
        Please review and approve or reject this request.
      </p>

      <!-- Button -->
      <div style="text-align: center; margin: 40px 0 32px;">
        <a href="/users-list?_=true"
          style="background: #0A4647; color: white; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 15px; display: inline-block;">
          Review Pending Users
        </a>
      </div>

      <!-- User Details - Simple Table Style -->
      <div style="background: #f8fafb; border: 1px solid #e2e8f0; border-radius: 8px; margin: 32px 0; padding: 24px;">
        <h3
          style="color: #0A4647; margin: 0 0 20px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          USER DETAILS</h3>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px;">Registered:</td>
            <td style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px;">${userData.registrationDate}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
              Email:</td>
            <td
              style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
              ${userData.email}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
              First Name:</td>
            <td
              style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
              ${userData.firstName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
              Last Name:</td>
            <td
              style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
              ${userData.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #4a5568; width: 120px; font-size: 14px; border-top: 1px solid #edf2f7;">
              Reseller:</td>
            <td
              style="padding: 10px 0; color: #1a202c; font-weight: 500; font-size: 14px; border-top: 1px solid #edf2f7;">
              ${userData.reseller}</td>
          </tr>
        </table>
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
                  <div
    style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid black;">

    <!-- Header -->
    <div style="background: #0A4647; padding: 32px 24px; text-align: center;">
      <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX" style="max-width: 180px; height: auto;">
      <h1 style="color: white; margin: 2; font-size: 24px; font-weight: 500; letter-spacing: -0.2px;">Account
        Registration Received</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 15px;">TD SYNNEX Partner Portal</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px; background: white;">

      <!-- Greeting -->
      <h2 style="color: #0A4647; margin: 0 0 24px; font-size: 20px; font-weight: 500;">Dear ${userData.firstName},</h2>

      <!-- Status Message -->
      <div
        style="background: #f8fafb; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 32px;">
        <div style="margin-bottom: 16px;">

        </div>
        <p style="margin: 0; color: #1e293b; font-size: 15px; line-height: 1.6;">
          Thank you for registering with <strong>TD SYNNEX</strong>. Your registration has been received and is
          currently under review by our Program Management team.
        </p>
      </div>

      <!-- What Happens Next -->
      <h3
        style="color: #0A4647; font-size: 18px; font-weight: 500; margin: 32px 0 20px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
        What Happens Next</h3>

      <div style="margin-bottom: 20px;">
        <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
          <div
            style="background: #0A4647; color: white; width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; margin-right: 16px;">
            1</div>
          <div>
            <p style="margin: 0 0 4px; font-weight: 600; color: #1e293b; font-size: 15px;">Registration Submitted</p>
            <p style="margin: 0; color: #4a5568; font-size: 14px;">${userData.registrationDate}</p>
          </div>
        </div>

        <div style="display: flex; align-items: flex-start;">
          <div
            style="background: #edf2f7; color: #4a5568; width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; margin-right: 16px;">
            2</div>
          <div>
            <p style="margin: 0 0 4px; font-weight: 600; color: #1e293b; font-size: 15px;">Admin Review</p>
            <p style="margin: 0; color: #4a5568; font-size: 14px;">1-2 business days</p>
          </div>
        </div>
      </div>

      <!-- Registration Details -->
      <h3
        style="color: #0A4647; font-size: 18px; font-weight: 500; margin: 40px 0 20px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
        Registration Details</h3>

      <div
        style="background: #f8fafb; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin-bottom: 32px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; color: #4a5568; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Full Name
            </td>
            <td
              style="padding: 12px 0; color: #1e293b; font-weight: 500; font-size: 14px; text-align: right; border-bottom: 1px solid #e2e8f0;">
              ${userData.firstName} ${userData.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #4a5568; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Email
              Address</td>
            <td
              style="padding: 12px 0; color: #1e293b; font-weight: 500; font-size: 14px; text-align: right; border-bottom: 1px solid #e2e8f0;">
              ${userData.email}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #4a5568; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Reseller
            </td>
            <td
              style="padding: 12px 0; color: #1e293b; font-weight: 500; font-size: 14px; text-align: right; border-bottom: 1px solid #e2e8f0;">
              ${userData.reseller}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0 0; color: #4a5568; font-size: 14px;">Registration Date</td>
            <td style="padding: 12px 0 0; color: #1e293b; font-weight: 500; font-size: 14px; text-align: right;">
              ${userData.registrationDate}</td>
          </tr>
        </table>
      </div>

      <!-- Note -->
      <div style="background: #f8fafb; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 32px 0;">
        <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
          <span style="font-weight: 600;">Note:</span> You will receive another email once your account has been
          approved. For questions or updates, please contact our support team.
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
          <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f8; padding: 30px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0"
            style="background: #ffffff; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); border: 1px solid black;">

            <!-- Header - Solid teal, no gradient -->
            <tr>
              <td style="background: #0A4647; padding: 32px 30px; text-align: center;">
                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX"
                  style="max-width: 160px; margin-bottom: 16px;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 500; letter-spacing: -0.2px;">
                  <b>WELCOME TO TD SYNNEX</b>
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 32px 30px; color: #1e293b;">
                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                  Hello <strong style="color: #0A4647;">${name}</strong>,
                </p>

                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
                  We're excited to have you on board! Your account has been successfully accessed.
                </p>

                <!-- Info Box - Clean and simple -->
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background: #f8fafb; border: 1px solid #e2e8f0; border-radius: 6px; margin: 24px 0;">
                  <tr>
                    <td style="padding: 20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 6px 0; color: #475569; font-size: 14px; width: 100px;">Email:</td>
                          <td style="padding: 6px 0; color: #1e293b; font-weight: 500; font-size: 14px;">${email}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #475569; font-size: 14px; width: 100px;">Login Time:</td>
                          <td style="padding: 6px 0; color: #1e293b; font-weight: 500; font-size: 14px;">${new
                Date().toLocaleString()}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 32px;">
                  If you don't recognize this activity, please contact our support team immediately.
                </p>

                <!-- Button - Solid teal -->
                <div style="text-align: center; margin: 32px 0 16px;">
                  <a href="#"
                    style="background: #0A4647; color: white; padding: 14px 36px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500; display: inline-block;">
                    Go to Dashboard
                  </a>
                </div>
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
        products, // Changed from productName/quantity to products array
        totalQuantity,
        subtotal,
        shipping,
        tax,
        total,
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
        products: Array<{
            name: string;
            quantity: number;
        }>;
        totalQuantity: number;
        subtotal: number;
        shipping: number;
        tax: number;
        total: number;
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
    }) => {
        // Generate product rows HTML
        const productRows = products.map(product => `
        <tr>
            <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
            <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
        </tr>
    `).join('');

        return {
            subject: `New Order #${orderNumber} | TD SYNNEX SURFACE`,
            text: `New TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello ${customerName},

            Thank you for your order from tdsynnex-surface.com.
            Once your order is approved, you will receive a confirmation email,
            after which it will be shipped to your customer.

            ORDER ITEMS
            ${products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n')}
            Total Items: ${totalQuantity}


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

            Use Case: ${useCase}
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
              <div style="font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8; padding:30px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table width="720" cellpadding="0" cellspacing="0"
            style="background:#ffffff; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.04); border: 1px solid black;">

            <!-- HEADER -->
            <tr>
              <td style="background:#0A4647; padding:32px 30px; text-align:center;">
                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX"
                  style="max-width:160px; margin-bottom:16px;">
                <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:500; letter-spacing:-0.2px;">
                  <b>New Order #${orderNumber} | TD SYNNEX SURFACE</b>
                </h1>
              </td>
            </tr>

            <!-- INTRO -->
            <tr>
              <td style="padding:32px 30px; color:#1e293b;">
                <p style="margin:0 0 4px; font-size:16px;"><strong>New Order (#${orderNumber})</strong></p>
                <p style="color:#475569; margin:0 0 24px; font-size:14px;">Placed On ${orderDate}</p>
                <p style="font-size:15px; line-height:1.6; color:#334155; margin:0;">
                  Hello <strong style="color:#0A4647;">${customerName}</strong>,<br>
                  Thank you for your order from <strong>tdsynnex-surface.com</strong>.
                  Once your order is approved, you will receive a confirmation email after which
                  it will be shipped to your customer.
                </p>
              </td>
            </tr>

            <!-- PRODUCTS TABLE -->
            <tr>
              <td style="padding:0 30px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td colspan="2"
                      style="background:#0A4647; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
                      Order Items (${totalQuantity} items)
                    </td>
                  </tr>
                  <tr style="background:#f8fafb;">
                    <td style="padding:10px 16px; border:1px solid #e2e8f0; font-weight:600; color:#1e293b;">Product
                    </td>
                    <td
                      style="padding:10px 16px; border:1px solid #e2e8f0; font-weight:600; color:#1e293b; text-align:center; width:100px;">
                      Quantity</td>
                  </tr>
                  ${productRows}
                </table>
              </td>
            </tr>

            <!-- TEAM DETAILS - FIXED WIDTH LEFT COLUMN -->
            <tr>
              <td style="padding:0 30px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td colspan="2"
                      style="background:#0A4647; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
                      Team Details
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Sales Executive</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${salesExecutive}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Sales Executive Email</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${salesExecutiveEmail}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Sales Manager</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${salesManager}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Sales Manager Email</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${salesManagerEmail}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Reseller</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${reseller}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- SHIPPING DETAILS - FIXED WIDTH LEFT COLUMN -->
            <tr>
              <td style="padding:0 30px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td colspan="2"
                      style="background:#0A4647; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
                      Shipping Details
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Company Name</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${companyName}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Contact Name</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${contactName}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Email Address</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${contactEmail}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Shipping Address</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${shippingAddress}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      City</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${city}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      State</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${state}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Zip</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${zip}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Desired Demo Delivery Date</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${deliveryDate}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- OPPORTUNITY DETAILS - FIXED WIDTH LEFT COLUMN -->
            <tr>
              <td style="padding:0 30px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td colspan="2"
                      style="background:#0A4647; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
                      Opportunity Details
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Device Opportunity Size (Units)</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${deviceUnits}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Budget Per Device ($)</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${budgetPerDevice}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Revenue Opportunity Size ($)</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${revenue}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      CRM Account #</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${crmAccount}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Vertical</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${vertical}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Segment</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${segment}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Use Case for this Demo Request</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${useCase}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Current Devices</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${currentDevices}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Number of Licenses</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${licenses}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Using Copilot</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${usingCopilot}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Is Security a Factor</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${securityFactor}</td>
                  </tr>
                  <tr>
                    <td
                      style="padding:12px 16px; border:1px solid #e2e8f0; background:#f8fafb; width:260px; font-weight:600; color:#1e293b;">
                      Device Protection</td>
                    <td style="padding:12px 16px; border:1px solid #e2e8f0; color:#334155;">${deviceProtection}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- NOTE -->
            <tr>
              <td style="padding:0 30px 32px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="background:#0A4647; color:#ffffff; padding:12px 16px; font-size:15px; font-weight:500;">
                      Note
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="padding:16px; border:1px solid #e2e8f0; color:#475569; background:#f8fafb; font-size:14px; line-height:1.6;">
                      ${note}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
        `
        };
    },


    newOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        products,

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

        products: Array<{ // CHANGED: Array type
            name: string;
            quantity: number;
        }>;

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
    }) => {
        // ✅ CALCULATIONS HERE
        const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);

        const productRows = products.map(product => `
        <tr>
            <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
            <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
        </tr>
    `).join('');

        const productListText = products.map(p => `Product: ${p.name}, Quantity: ${p.quantity}`).join('\n');

        // ✅ RETURN OBJECT HERE
        return {
            subject: `New Order #${orderNumber} | TD SYNNEX SURFACE`,
            text: `New TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello Team TD SYNNEX,

            You have received a new order from tdsynnex-surface.com. Please click on the link below to Review and Approve/Reject.

            ORDER ITEMS (${totalQuantity} items)
            ${productListText}

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
            <div style="font-family: Arial, Helvetica, sans-serif; background-color:#ffffff; padding:30px 0; ">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">

                    <table width="720" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    New Order #${orderNumber} | TD SYNNEX SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="margin:0 0 8px;"><strong>New TD SYNNEX Order (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 20px;">Placed On ${orderDate}</p>

                                <p style="line-height:1.6;">
                                    <strong>Hello TD SYNNEX Team,</strong><br />
                                    You have received a new order from <strong>tdsynnex-surface.com</strong>.
                                    Please click on the link below to Review and Approve/Reject.
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 30px;">
                                <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://tdsynnex.vercel.app'}/step1.png"
                                    alt="Thank you for your order"
                                    style="width:100%; max-width:720px; height:auto; display:block;" width="720" />
                            </td>
                        </tr>

                        <!-- PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items (${totalQuantity} items)
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th
                                            style="padding:10px; border:1px solid #ddd; text-align:center; width:100px;">
                                            Quantity</th>
                                    </tr>
                                    ${productRows}
                                </table>
                            </td>
                        </tr>

                        <!-- TEAM DETAILS - FIXED WIDTH LEFT COLUMN -->
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
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Sales Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Sales Executive Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Sales Manager</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Sales Manager Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Reseller</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${reseller}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SHIPPING DETAILS - FIXED WIDTH LEFT COLUMN -->
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
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Company Name</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Contact Name</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Email Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Shipping Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>City</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${city}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>State</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${state}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Zip</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Desired Demo Delivery Date</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deliveryDate}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- OPPORTUNITY DETAILS - FIXED WIDTH LEFT COLUMN -->
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
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Device Opportunity Size (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Budget Per Device ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Revenue Opportunity Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>CRM Account #</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${crmAccount}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Vertical</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${vertical}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Use Case for this Demo Request</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${useCase}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Current Devices</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentDevices}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Number of Licenses</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${licenses}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Using Copilot</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${usingCopilot}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Is Security a Factor</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${securityFactor}</td>
                                    </tr>
                                    <tr>
                                        <td
                                            style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;">
                                            <strong>Device Protection</strong></td>
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
                    </table>
                </td>
            </tr>
        </table>
    </div>
            `,
        };
    },


    approvedOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        products, // CHANGED: Array of products instead of single product
        totalQuantity, // ADDED: Total quantity

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

        products: Array<{ // CHANGED: Array type
            name: string;
            quantity: number;
        }>;
        totalQuantity: number; // ADDED

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
    }) => {
        // Generate product rows HTML
        const productRows = products.map(product => `
        <tr>
            <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
            <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
        </tr>
    `).join('');

        const productListText = products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n');

        return {
            subject: `Order Approved #${orderNumber} | TD SYNNEX SURFACE`,
            text: `Approved TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello,

            Your order placed on tdsynnex-surface.com has been approved.

            Once your package ships, you will receive a separate email containing
            shipping details, tracking information, and a prepaid return label.

            ORDER ITEMS (${totalQuantity} items)
            ${productListText}

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
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Order Approved #${orderNumber} | TD SYNNEX SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="margin:0 0 8px; font-size: 15px;"><strong>Approved Order
                                        (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;">Placed On ${orderDate}</p>

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

                        <tr>
                            <td style="padding: 30px;">
                                <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://tdsynnex.vercel.app'}/step2.png"
                                    alt="Thank you for your order"
                                    style="width:100%; max-width:720px; height:auto; display:block;" width="720" />
                            </td>
                        </tr>

                        <!-- PRODUCTS - UPDATED FOR MULTIPLE PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items (${totalQuantity} items)
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    ${productRows}
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
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Reseller</strong></td>
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
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Company Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Contact Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Email Address</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Shipping
                                                Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>City</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${city}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>State</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${state}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Zip</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Desired Demo Delivery
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
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Device Opportunity Size
                                                (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Budget Per Device
                                                ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Revenue Opportunity
                                                Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>CRM Account #</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${crmAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Vertical</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${vertical}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Use Case for this Demo
                                                Request</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${useCase}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Current
                                                Devices</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentDevices}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Number of
                                                Licenses</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${licenses}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Using Copilot</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${usingCopilot}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Is Security a
                                                Factor</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${securityFactor}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Device
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

                    </table>

                </td>
            </tr>
        </table>
    </div>
            
            `,
        };
    },


    rejectedOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        products, // CHANGED: Array of products
        totalQuantity, // ADDED

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

        products: Array<{
            name: string;
            quantity: number;
        }>;
        totalQuantity: number;

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
    }) => {
        // Generate product rows HTML
        const productRows = products.map(product => `
        <tr>
            <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
            <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
        </tr>
    `).join('');

        const productListText = products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n');

        return {
            subject: `Rejected Order #${orderNumber} | TD SYNNEX SURFACE`,
            text: `Rejected TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello,

            Your order placed on tdsynnex-surface.com has been rejected.

            ORDER ITEMS (${totalQuantity} items)
            ${productListText}

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
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Order Rejected #${orderNumber} | TD SYNNEX SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:15px;"><strong>Rejected Order
                                        (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;">Placed On ${orderDate}</p>
                            </td>
                        </tr>

                        <!-- PRODUCTS - UPDATED FOR MULTIPLE PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items (${totalQuantity} items)
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    ${productRows}
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


                    </table>

                </td>
            </tr>
        </table>
    </div>
            
            `,
        };
    },


    returnedOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        products, // CHANGED: Now an array of products with shippedQuantity, returnedQuantity, leftWithCustomer
        totalQuantity, // Total shipped quantity
        totalReturned, // Total returned quantity
        totalLeft, // Total left with customer

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

        products: Array<{
            name: string;
            shippedQuantity: number;
            returnedQuantity: number;
            leftWithCustomer: number;
        }>;
        totalQuantity: number;
        totalReturned: number;
        totalLeft: number;

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
    }) => {
        const productRows = products.map(product => {
            const returnedText = product.returnedQuantity > 0
                ? `<span style="
                        background:#e8f5e9;
                        color:#388e3c;
                        padding:4px 8px;
                        border-radius:4px;
                        font-weight:600;
                    ">${product.returnedQuantity}</span>`
                : `<span style="color:#999;">0</span>`;

            const leftText = product.leftWithCustomer > 0
                ? `<span style="
                        background:#fdecea;
                        color:#d32f2f;
                        padding:4px 8px;
                        border-radius:4px;
                        font-weight:600;
                        text-decoration:line-through;
                    ">${product.leftWithCustomer}</span>`
                : `<span style="color:#999;">0</span>`;

            return `
                <tr>
                    <td style="padding:12px; border:1px solid #ddd; font-size:14px;">
                        ${product.name}
                    </td>

                    <td style="padding:12px; border:1px solid #ddd;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="font-size:13px; padding-bottom:6px;">
                                    <strong>Shipped:</strong>
                                    <span style="font-weight:600;">
                                        ${product.shippedQuantity}
                                    </span>
                                </td>
                            </tr>

                            <tr>
                                <td style="font-size:13px; padding-bottom:6px;">
                                    <strong>Returned:</strong> ${returnedText}
                                </td>
                            </tr>

                            <tr>
                                <td style="font-size:13px;">
                                    <strong>Left:</strong> ${leftText}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            `;
        }).join('');


        // Generate text version
        const productListText = products.map(p => {
            const returnedText = p.returnedQuantity > 0 ? ` (${p.returnedQuantity} returned, ${p.leftWithCustomer} left with customer)` : '';
            return `- ${p.name}: Shipped ${p.shippedQuantity}${returnedText}`;
        }).join('\n');

        return {
            subject: `Order Returned #${orderNumber} | TD SYNNEX SURFACE`,
            text: `Returned TD SYNNEX Order (#${orderNumber})
Placed On ${orderDate}

Hello ${customerName},

Your order placed on tdsynnex-surface.com has been returned.

ORDER ITEMS (${totalQuantity} items shipped, ${totalReturned} returned)
${productListText}

SUMMARY:
Total Shipped: ${totalQuantity} items
Total Returned: ${totalReturned} items
Still With Customer: ${totalLeft} items

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
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Order Returned #${orderNumber} | TD SYNNEX SURFACE
                                </h1>
                                <p style="color:#ffffff; margin:10px 0 0; font-size:16px;">
                                    ${totalReturned} item(s) returned to stock
                                </p>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding: 30px; color:#333; margin-top: 15px;">
                                <p style="margin:0 0 8px; font-size:15px;"><strong>Returned Order
                                        (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 15px; font-size:15px;">Placed On ${orderDate}</p>
                                <p style="color:#666; margin:0 0 15px; font-size:15px;"><strong>Hello,
                                        ${customerName}</strong></p>
                                <p style="color:#666; margin:0 0 15px; font-size:15px;">
                                    Your order has been partially returned. Below are the details of returned items.
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 30px;">
                                <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://tdsynnex.vercel.app'}/step4.png"
                                    alt="Thank you for your order"
                                    style="width:100%; max-width:720px; height:auto; display:block;" width="720" />
                            </td>
                        </tr>

                        <!-- PRODUCTS - UPDATED WITH RETURN DETAILS -->
                        <tr>
                            <td style="padding:20px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0"
                                    style="border-collapse:collapse; border:1px solid #ddd;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left; font-size:16px;">
                                            Return Details (${totalQuantity} items shipped)
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:12px; border:1px solid #ddd; text-align:left; width:75%;">
                                            Product</th>
                                        <th style="padding:12px; border:1px solid #ddd; text-align:center; width:25%;">
                                            Quantity Status</th>
                                    </tr>
                                    ${productRows}
                                </table>
                            </td>
                        </tr>

                        <!-- REST OF THE EMAIL TEMPLATE REMAINS THE SAME -->
                        <!-- TEAM DETAILS -->
                        <tr>
                            <td style="padding:20px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0"
                                    style="border-collapse:collapse; border:1px solid #ddd;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Team Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Reseller</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${reseller}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SHIPPING DETAILS -->
                        <tr>
                            <td style="padding:20px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0"
                                    style="border-collapse:collapse; border:1px solid #ddd;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Shipping Details
                                        </th>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Company Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Contact Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Email Address</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Shipping
                                                Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>City</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${city}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>State</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${state}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Zip</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Desired Demo Delivery
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
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Device Opportunity Size
                                                (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Budget Per Device
                                                ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Revenue Opportunity
                                                Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>CRM Account #</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${crmAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Vertical</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${vertical}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Use Case for this Demo
                                                Request</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${useCase}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Current
                                                Devices</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentDevices}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Number of
                                                Licenses</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${licenses}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Using Copilot</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${usingCopilot}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Is Security a
                                                Factor</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${securityFactor}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Device
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

                    </table>
                </td>
            </tr>
        </table>
    </div>
            
            `,
        };
    },


    shippedOrderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,

        products, // CHANGED: Now an array of products
        totalQuantity, // ADDED: Total quantity

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

        products: Array<{ // CHANGED: Array type
            name: string;
            quantity: number;
        }>;
        totalQuantity: number; // ADDED

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
    }) => {
        // Generate product rows HTML
        const productRows = products.map(product => `
        <tr>
            <td style="padding:10px; border:1px solid #ddd;">${product.name}</td>
            <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
        </tr>
    `).join('');

        const productListText = products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n');

        return {
            subject: `Order Shipped #${orderNumber} | TD SYNNEX SURFACE`,
            text: `Shipped TD SYNNEX Order (#${orderNumber})
            Placed On ${orderDate}

            Hello,

            Your order placed on tdsynnex-surface.com has been shipped.

            ORDER ITEMS (${totalQuantity} items)
            ${productListText}

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
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- HEADER -->
                        <tr>
                            <td style="background:#0A4647; padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:12px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Order Shipped #${orderNumber} | TD SYNNEX SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- INTRO -->
                        <tr>
                            <td style="padding:30px 30px 0 30px; color:#333;">
                                <p style="margin:0 0 8px; font-size:15px;"><strong>Shipped Order
                                        (#${orderNumber})</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;">Placed On ${orderDate}</p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;"><strong>Hello,
                                        ${customerName}</strong></p>
                                <p style="color:#666; margin:0 0 20px; font-size:15px;">Your order on TD SYNNEX has been
                                    shipped. You can find below Tracking information and Return Label for your order.
                                </p>
                            </td>
                        </tr>

                        <tr>
                            <td style="padding: 30px;">
                                <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://tdsynnex.vercel.app'}/step3.png"
                                    alt="Thank you for your order"
                                    style="width:100%; max-width:720px; height:auto; display:block;" width="720" />
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
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Order Tracking
                                                #</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;"><a
                                                href=${orderTrackingLink}>${orderTracking}</a></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Return Tracking
                                                #</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;"><a
                                                href=${returnTrackingLink}>${returnTracking}</a></td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Case Type:</strong>
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

                        <!-- PRODUCTS - UPDATED FOR MULTIPLE PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items (${totalQuantity} items)
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    ${productRows}
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
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Reseller</strong></td>
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
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Company Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Contact Name</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Email Address</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Shipping
                                                Address</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippingAddress}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>City</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${city}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>State</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${state}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Zip</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${zip}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Desired Demo Delivery
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
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Device Opportunity Size
                                                (Units)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${deviceUnits}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Budget Per Device
                                                ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${budgetPerDevice}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Revenue Opportunity
                                                Size ($)</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${revenue}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>CRM Account #</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${crmAccount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Vertical</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${vertical}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Segment</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${segment}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Use Case for this Demo
                                                Request</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${useCase}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Current
                                                Devices</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${currentDevices}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Number of
                                                Licenses</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${licenses}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Using Copilot</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${usingCopilot}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Is Security a
                                                Factor</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${securityFactor}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Device
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

                    </table>

                </td>
            </tr>
        </table>
    </div>
            
            `,
        };
    },


    returnReminderEmail: ({
        orderNumber,
        orderDate,
        customerName,
        customerEmail,
        productName,
        productListText,
        productListHtml,
        totalQuantity,
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
        productListText: string;
        productListHtml: string;
        totalQuantity: number;
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
        ${productListText}
        Total Quantity: ${totalQuantity}

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
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

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
                                <p style="margin:0 0 8px;  font-size:15px;"><strong>Return Reminder Order
                                        #${orderNumber}</strong></p>
                                <p style="margin:0 0 8px;  font-size:15px;">Placed On ${orderDate}</p>
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
                                            Order Items (${totalQuantity} items total)
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    ${productListHtml}
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
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Customer Company
                                                Name</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Customer Contact
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Shipped Date</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippedDate}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Returned
                                                Tracking</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${returnTracking}</td>
                                    </tr>
                                </table>
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
        customerName,
        customerEmail,

        products, // CHANGED: Array of products instead of single product
        totalQuantity, // ADDED: Total quantity

        returnTracking,
        fileLink,

        salesExecutive,
        salesExecutiveEmail,
        salesManager,
        salesManagerEmail,

        companyName,
        contactEmail,
        shippedDate,
        daysCount,
    }: {
        orderNumber: string | number;
        orderDate: string;
        customerName: string;
        customerEmail: string;

        products: Array<{ // CHANGED: Array type
            name: string;
            quantity: number;
            slug?: string; // Optional slug for product link
        }>;
        totalQuantity: number; // ADDED

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
    }) => {
        // Generate product rows HTML
        const productRows = products.map(product => {
            const productLink = product.slug
                ? `${process.env.NEXT_PUBLIC_APP_URL}/product/${product.slug}`
                : '#';

            return `
        <tr>
            <td style="padding:10px; border:1px solid #ddd;">
                ${product.slug
                    ? `<a href="${productLink}" style="color:#0A4647; text-decoration:none;">${product.name}</a>`
                    : product.name
                }
            </td>
            <td style="padding:10px; border:1px solid #ddd; text-align:center;">${product.quantity}</td>
        </tr>
        `;
        }).join('');

        const productListText = products.map(p => `- ${p.name} (Quantity: ${p.quantity})`).join('\n');

        return {
            subject: `Overdue Reminder - Order #${orderNumber} (${companyName}) | TD SYNNEX SURFACE`,
            text: `Overdue Reminder Notification | TD SYNNEX SURFACE

                Return Reminder - Order #${orderNumber} (${companyName}) 
                Placed On: ${orderDate}

                Hello,

                Thank you for using TD SYNNEX SURFACE! We hope your experience was very positive.

                Your order for ${companyName} is now due for return. 
                You can view your return label using the link below or request it via email at support@tdsynnex-surface.com:

                View Return Label: ${fileLink}

                ORDER ITEMS (${totalQuantity} items)
                ${productListText}

                ORDER DETAILS
                Sales Executive: ${salesExecutive}
                Sales Executive Email: ${salesExecutiveEmail}
                Sales Manager: ${salesManager}
                Sales Manager Email: ${salesManagerEmail}
                Customer Company Name: ${companyName}
                Customer Contact Email: ${contactEmail}
                Shipped Date: ${shippedDate}
                Days Since Shipped: ${daysCount}
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
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

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
                                <p style="margin:0 0 8px;  font-size:15px;"><strong>Return Reminder Order
                                        #${orderNumber}</strong></p>
                                <p style="margin:0 0 8px;  font-size:15px;">Placed On ${orderDate}</p>
                                <p style="font-size:15px; line-height:1.6;">
                                    This is a message from the TD SYNNEX SURFACE team that <b>Order #${orderNumber}</b>
                                    for <b>(${companyName})</b> has now
                                    been shipped for a period of <b>${daysCount}</b> against the 45-day trial period.
                                </p>
                                <p>
                                    Your order for ${companyName} is now due for return. You can also
                                    obtain a soft copy of the return label by clicking on the below or sending a request
                                    at support@tdsynnex-surface.com,
                                </p>
                            </td>
                        </tr>

                        <!-- RETURN LABEL BUTTON -->
                        <tr>
                            <td style="padding:0; color:#333;">
                                <div style="text-align:center; margin:30px 0;">
                                    <a href="${fileLink}" style="
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

                        <!-- PRODUCTS TABLE - UPDATED FOR MULTIPLE PRODUCTS -->
                        <tr>
                            <td style="padding:0 30px 30px;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                    <tr>
                                        <th colspan="2"
                                            style="background:#0A4647; color:#ffffff; padding:12px; text-align:left;">
                                            Order Items (${totalQuantity} items)
                                        </th>
                                    </tr>
                                    <tr style="background:#f1f3f5;">
                                        <th style="padding:10px; border:1px solid #ddd; text-align:left;">Product</th>
                                        <th style="padding:10px; border:1px solid #ddd; text-align:center;">Quantity
                                        </th>
                                    </tr>
                                    ${productRows}
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
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales
                                                Executive</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutive}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Executive
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesExecutiveEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Manager</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManager}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Sales Manager
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${salesManagerEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Customer Company
                                                Name</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${companyName}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Customer Contact
                                                Email</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${contactEmail}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Shipped Date</strong>
                                        </td>
                                        <td style="padding:10px; border:1px solid #ddd;">${shippedDate}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Days Since
                                                Shipped</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${daysCount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:10px; border:1px solid #ddd; width:220px; background:#f8fafb;"><strong>Returned
                                                Tracking</strong></td>
                                        <td style="padding:10px; border:1px solid #ddd;">${returnTracking}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </div>
            
            `,
        };
    },


    reportWinEmail: ({
        orderNumber,
        synnexOrderNumber, // NEW: Add this parameter
        orderDate,
        customerName,
        submittedEmail,
        productName,
        productDetails, // NEW: For product details display
        quantity,
        resellerAccount,
        units,
        pType,
        dealRev,
        reseller,
        notes,
    }: {
        orderNumber: string | number;
        synnexOrderNumber?: string; // NEW: Optional parameter
        orderDate: string;
        customerName: string;
        submittedEmail: string;
        productName: string;
        productDetails?: string; // NEW: Optional parameter
        quantity: number;
        reseller: string;
        resellerAccount: string;
        units: string;
        pType: string;
        dealRev: string;
        notes: string;
    }) => {
        // Generate product rows HTML for multiple products
        let productDisplayHTML = '';
        let productText = '';

        if (productDetails && productDetails.length > 0) {
            // If we have product details array (for multiple products)
            productDisplayHTML = productDetails;
            productText = productName; // productName will contain the formatted text
        } else {
            // Single product or no details
            productDisplayHTML = `
        <tr>
            <td style="padding:10px; border:1px solid #ddd;">${productName}</td>
        </tr>`;
            productText = `Product: ${productName}`;
        }

        return {
            subject: `Report a Win | TD SYNNEX SURFACE`,
            text: `Report a Win | TD SYNNEX SURFACE
            Submitted by: ${submittedEmail}
            Win Reported Order#: ${orderNumber}

            ORDER ITEMS
            ${productText}

            RESELLER & ORDER DETAILS
            Reseller Account #: ${resellerAccount}
            Reseller Name: ${reseller}
            Synnex Order#: ${synnexOrderNumber || orderNumber}
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
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

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
                            <td style="padding:30px;">
                                <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://tdsynnex.vercel.app'}/step5.png"
                                    alt="Thank you for your order"
                                    style="width:100%; max-width:720px; height:auto; display:block;" width="720" />
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
                                    </tr>
                                    ${productDisplayHTML}
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
                                        <td style="padding:20px 10px; border:1px solid #ddd;">${synnexOrderNumber ||
                                            orderNumber}</td>
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

                    </table>

                </td>
            </tr>
        </table>
    </div>
            
            `,
        };
    },


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
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

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
                                    You have subscribed to <b>${product} (${sku})</b> on TD SYNNEX SURFACE. An email
                                    notification will be sent
                                    once the product is back in stock.
                                </p>
                                <p>
                                    Thank you for using TD SYNNEX SURFACE!
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
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

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
        html: `
            <div style="font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- Header -->
                        <tr>
                            <td
                                style="background:linear-gradient(135deg,#0A4647,#093636); padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:15px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Account Approved | TD SYNNEX SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6; margin-top:0;">
                                    Hi <strong>${email}</strong>,
                                </p>

                                <p style="font-size:15px; line-height:1.6;">
                                    Thank you for signing up! Your account has been reviewed and
                                    <strong>approved by our admin team</strong>.
                                </p>

                                <p style="font-size:15px; line-height:1.6;">
                                    You can now log in and start using the TD SYNNEX portal.
                                </p>

                                <!-- CTA Button -->
                                <div style="text-align:center; margin:35px 0;">
                                    <a href="/login"
                                        style="background:#093636; color:#ffffff; padding:14px 36px; text-decoration:none; border-radius:6px; font-size:16px; font-weight:bold; display:inline-block;">
                                        Login to Portal
                                    </a>
                                </div>

                                <p style="font-size:14px; line-height:1.6; color:#555;">
                                    If you have any questions or face issues accessing your account,
                                    feel free to contact our support team.
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
        html: `
            <div style="font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- Header -->
                        <tr>
                            <td
                                style="background:linear-gradient(135deg,#0A4647,#093636); padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:15px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Account Update | TD SYNNEX SURFACE
                                </h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6; margin-top:0;">
                                    Hi <strong>${email}</strong>,
                                </p>

                                <p style="font-size:15px; line-height:1.6;">
                                    Thank you for signing up for the TD SYNNEX portal.
                                </p>

                                <p style="font-size:15px; line-height:1.6; color:#b02a37;">
                                    After careful review, we’re unable to approve your account at this time.
                                </p>

                                <p style="font-size:15px; line-height:1.6; color:#555;">
                                    This decision may be based on internal verification or eligibility requirements.
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
        subject: 'Reset Your TD SYNNEX Password',
        text: `Hello ${name},\n\nYou requested to reset your password. Click the link below:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nTD SYNNEX Team`,
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
          <p>Best regards,<br><strong>TD SYNNEX Team</strong></p>
        </div>
      </div><div style="font-family: Arial, Helvetica, sans-serif; background-color:#f4f6f8; padding:30px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:10px; overflow:hidden; border: 1px solid black;">

                        <!-- Header -->
                        <tr>
                            <td
                                style="background:linear-gradient(135deg,#0A4647,#093636); padding:30px; text-align:center;">
                                <img src="https://tdsynnex.vercel.app/logo-w.png" alt="TD SYNNEX Logo"
                                    style="max-width:160px; margin-bottom:15px;" />
                                <h1 style="color:#ffffff; margin:0; font-size:26px;">
                                    Reset Your Password
                                </h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:30px; color:#333;">
                                <p style="font-size:15px; line-height:1.6; margin-top:0;">
                                    Hello <strong style="color:#0A4647;">${name}</strong>,
                                </p>

                                <p style="font-size:15px; line-height:1.6; color:#555;">
                                    You recently requested to reset your password for your TD SYNNEX account.
                                    Click the button below to set a new password:
                                </p>

                                <!-- Button -->
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #0A4647 0%, #093636 100%); 
                              color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                              font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(10, 70, 71, 0.3);">
                                        🔐 Reset Password
                                    </a>
                                </div>

                                <!-- Link fallback -->
                                <p style="font-size:14px; line-height:1.5; color:#777; text-align:center;">
                                    If the button doesn't work, copy and paste this link into your browser:<br>
                                    <span style="color:#0A4647; word-break:break-all;">${resetLink}</span>
                                </p>

                                <p
                                    style="font-size:14px; line-height:1.5; color:#888; text-align:center; margin-top:25px;">
                                    ⏰ This link will expire in <strong style="color:#0A4647;">1 hour</strong>.<br>
                                    If you didn't request this, please ignore this email.
                                </p>

                                <!-- Security Note -->
                                <div style="background:#f8f9fa; padding:15px; border-radius:6px; margin:20px 0;">
                                    <p style="font-size:14px; color:#666; margin:0; text-align:center;">
                                        ⚡ For security, never share this link with anyone.<br>
                                        Our team will never ask for your password.
                                    </p>
                                </div>

                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    `,
    }),
};