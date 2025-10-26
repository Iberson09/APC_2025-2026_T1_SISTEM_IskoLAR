import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/utils/email/sendEmail';

export async function GET() {
  try {
    const result = await sendEmail({
      to: 'iberson0966@gmail.com',
      subject: 'Test Email from IskoLAR',
      text: 'This is a test email to verify SendGrid configuration.',
      html: '<p>This is a test email to verify SendGrid configuration.</p>'
    });

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    console.error('Test email error:', error);
    const err = error as { message?: string; response?: { body?: unknown } };
    return NextResponse.json({ 
      success: false, 
      error: err.message || 'Failed to send test email',
      details: err.response?.body 
    }, { status: 500 });
  }
}