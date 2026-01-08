import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transportCache: Transporter | null = null;

export async function getTransport(): Promise<Transporter> {
  if (transportCache) {
    return transportCache;
  }

  // Check if production SMTP settings are provided via environment variables
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  if (smtpHost && smtpUser && smtpPass) {
    // Use production SMTP
    console.log('📧 Using production SMTP:', smtpHost);
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort ? parseInt(smtpPort) : 587,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    transportCache = transporter;
    return transporter;
  }

  // Fall back to Ethereal test account
  try {
    console.log('📧 Using Ethereal test mode (no real emails will be sent)');
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    transportCache = transporter;
    return transporter;
  } catch (e) {
    // Brak sieci → zwróć obiekt transportu, który nic nie robi
    console.warn('Nie można utworzyć transportu email, używam pustego mocka');
    return {
      // Zwróć minimalny interfejs wymagany przez wywołujący kod
      sendMail: async () => ({ messageId: 'mock', previewUrl: null })
    } as any;
  }
}

export interface ReservationEmailData {
  reservationId: number;
  customerEmail: string;
  customerName?: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: number;
  reservationDate: string; // YYYY-MM-DD
  reservationStartTime: string; // HH:mm
  reservationEndTime: string; // HH:mm
  companyTimezone: string;
  cancelUrl?: string;
  icsContent?: string;
}

export interface EmailSettings {
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  fromEmail?: string;
  fromName?: string;
}

export async function sendReservationConfirmationEmail(data: ReservationEmailData, settings?: EmailSettings) {
  const transporter = await getTransport();

  const formattedDate = new Date(data.reservationDate).toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const googleMapsLink = data.companyAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(data.companyAddress)}`
    : null;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Potwierdzenie rezerwacji - ${data.companyName}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 8px 0;">Potwierdzenie rezerwacji</h1>
          <p style="color: #e0e7ff; font-size: 16px; margin: 0;">${data.companyName}</p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #0c4a6e; font-size: 16px; font-weight: 500; margin: 0;">
              <strong>Witaj ${data.customerName || data.customerEmail}!</strong><br>
              Twoja rezerwacja została potwierdzona. Szczegóły znajdziesz poniżej.
            </p>
          </div>

          <!-- Reservation Details -->
          <div style="margin-bottom: 24px;">
            <h2 style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Szczegóły rezerwacji</h2>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Usługa:</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${data.serviceName}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Data:</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${formattedDate}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Godzina:</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${data.reservationStartTime} - ${data.reservationEndTime}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Czas trwania:</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${data.serviceDuration} minut</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #64748b; font-size: 14px;">Cena:</span>
                <span style="color: #059669; font-size: 18px; font-weight: 600;">${data.servicePrice.toFixed(2)} zł</span>
              </div>
            </div>
          </div>

          <!-- Company Details -->
          <div style="margin-bottom: 24px;">
            <h2 style="color: #1e293b; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Dane firmy</h2>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Nazwa:</span><br>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${data.companyName}</span>
              </div>
              
              ${data.companyAddress ? `
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Adres:</span><br>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${data.companyAddress}</span>
                ${googleMapsLink ? `<br><a href="${googleMapsLink}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">Zobacz na mapie →</a>` : ''}
              </div>
              ` : ''}
              
              ${data.companyPhone ? `
              <div>
                <span style="color: #64748b; font-size: 14px;">Telefon:</span><br>
                <span style="color: #1e293b; font-size: 16px; font-weight: 500;">${data.companyPhone}</span>
              </div>
              ` : ''}
            </div>
          </div>

          ${data.cancelUrl ? `
          <!-- Cancel Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0;">Jeśli chcesz anulować rezerwację, kliknij poniższy przycisk:</p>
            <a href="${data.cancelUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
              Anuluj rezerwację
            </a>
          </div>
          ` : ''}

          <!-- Calendar Info -->
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>💡 Wskazówka:</strong> W załączniku znajdziesz plik kalendarza (.ics), który możesz dodać do swojego kalendarza.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 14px; margin: 0;">
            Dziękujemy za skorzystanie z naszych usług!<br>
            <span style="font-size: 12px;">Ta wiadomość została wygenerowana automatycznie.</span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Potwierdzenie rezerwacji - ${data.companyName}
    
    Witaj ${data.customerName || data.customerEmail}!
    Twoja rezerwacja została potwierdzona.
    
    Szczegóły rezerwacji:
    - Usługa: ${data.serviceName}
    - Data: ${formattedDate}
    - Godzina: ${data.reservationStartTime} - ${data.reservationEndTime}
    - Czas trwania: ${data.serviceDuration} minut
    - Cena: ${data.servicePrice.toFixed(2)} zł
    
    Dane firmy:
    - Nazwa: ${data.companyName}
    ${data.companyAddress ? `- Adres: ${data.companyAddress}` : ''}
    ${data.companyPhone ? `- Telefon: ${data.companyPhone}` : ''}
    
    ${data.cancelUrl ? `Aby anulować rezerwację, odwiedź: ${data.cancelUrl}` : ''}
    
    Dziękujemy za skorzystanie z naszych usług!
  `;

  try {
    const result = await transporter.sendMail({
      from: process.env.FROM_EMAIL || settings?.fromEmail || 'noreply@queueless.local',
      to: data.customerEmail,
      subject: `Potwierdzenie rezerwacji - ${data.serviceName}`,
      text: textContent,
      html: htmlContent,
      attachments: data.icsContent ? [
        {
          filename: 'rezerwacja.ics',
          content: data.icsContent,
          contentType: 'text/calendar'
        }
      ] : undefined
    });

    console.log('Email wysłany:', result.messageId);

    // Dla Ethereal zwróć URL podglądu
    if ('getTestMessageUrl' in transporter && typeof transporter.getTestMessageUrl === 'function') {
      const previewUrl = transporter.getTestMessageUrl(result);
      console.log('Podgląd emaila:', previewUrl);
      return { success: true, messageId: result.messageId, previewUrl };
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Błąd wysyłania emaila:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
