import sgMail, { ClientResponse } from '@sendgrid/mail';

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is not set');
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendGridResponse {
  success: boolean;
  response?: ClientResponse;
  error?: {
    message: string;
    code?: string;
    details?: {
      errors?: Array<{
        message: string;
        field?: string;
        help?: string;
      }>;
      [key: string]: unknown;
    };
  };
}

export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<SendGridResponse> {
  try {
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable is not set');
    }

    const fromEmail = process.env.EMAIL_FROM;
    const msg = {
      to,
      from: {
        email: fromEmail,
        name: 'IskoLAR Support'
      },
      subject,
      text: text || '',
      html: html || '',
      mail_settings: {
        sandbox_mode: {
          enable: false
        }
      }
    };

    const result = await sgMail.send(msg);
    return { success: true, response: result[0] };
  } catch (error: unknown) {
    const err = error as { 
      message: string; 
      code?: string; 
      response?: { 
        body?: { 
          errors?: Array<{ message: string }> 
        } 
      } 
    };
    
    console.error('SendGrid Error:', {
      error: err.message,
      response: err.response?.body,
      code: err.code
    });
    
    const errorMessage = err.response?.body?.errors?.[0]?.message || err.message;
    return { 
      success: false, 
      error: {
        message: errorMessage,
        code: err.code,
        details: err.response?.body
      }
    };
  }
}
