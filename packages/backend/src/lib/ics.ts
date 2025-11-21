import { DateTime } from 'luxon';

export interface ICSEvent {
  uid: string;
  startTime: DateTime;
  endTime: DateTime;
  summary: string;
  description?: string;
  location?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendee?: {
    name: string;
    email: string;
  };
  reminders?: Array<{
    minutes: number;
    method: 'DISPLAY' | 'EMAIL';
  }>;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatDateTime(dt: DateTime): string {
  return dt.toFormat('yyyyMMddTHHmmss');
}

function generateUID(): string {
  return `${Date.now()}@queueless.local`;
}

export function generateICS(event: ICSEvent): string {
  const lines: string[] = [];
  
  // Nagłówki
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//QueueLess//QueueLess Reservation System//PL');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:REQUEST');
  lines.push('BEGIN:VEVENT');
  
  // UID
  lines.push(`UID:${event.uid || generateUID()}`);
  
  // Czas trwania
  lines.push(`DTSTART:${formatDateTime(event.startTime)}`);
  lines.push(`DTEND:${formatDateTime(event.endTime)}`);
  lines.push(`DTSTAMP:${formatDateTime(DateTime.now())}`);
  
  // Tytuł i opis
  lines.push(`SUMMARY:${escapeICSText(event.summary)}`);
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }
  
  // Lokalizacja
  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }
  
  // Organizator
  if (event.organizer) {
    lines.push(`ORGANIZER;CN=${escapeICSText(event.organizer.name)}:mailto:${event.organizer.email}`);
  }
  
  // Uczestnik
  if (event.attendee) {
    lines.push(`ATTENDEE;CN=${escapeICSText(event.attendee.name)};ROLE=REQ-PARTICIPANT:mailto:${event.attendee.email}`);
  }
  
  // Status
  lines.push('STATUS:CONFIRMED');
  lines.push('SEQUENCE:0');
  
  // Przypomnienia
  if (event.reminders && event.reminders.length > 0) {
    event.reminders.forEach((reminder, index) => {
      lines.push('BEGIN:VALARM');
      lines.push(`TRIGGER:-PT${reminder.minutes}M`);
      lines.push(`ACTION:${reminder.method}`);
      lines.push(`DESCRIPTION:Przypomnienie o wizycie`);
      lines.push('END:VALARM');
    });
  } else {
    // Domyślne przypomnienia: 24h i 1h przed
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT24H');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:Przypomnienie o wizycie jutro');
    lines.push('END:VALARM');
    
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT1H');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:Przypomnienie o wizycie za 1 godzinę');
    lines.push('END:VALARM');
  }
  
  // Zakończenie
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}

export function generateReservationICS(
  serviceName: string,
  companyName: string,
  companyAddress: string | null,
  companyEmail: string,
  customerEmail: string,
  customerName: string | null,
  date: string, // YYYY-MM-DD
  startTime: string, // HH:mm
  endTime: string, // HH:mm
  timezone: string = 'Europe/Warsaw',
  description?: string
): string {
  const startDateTime = DateTime.fromFormat(`${date}T${startTime}`, 'yyyy-MM-ddTHH:mm', { zone: timezone });
  const endDateTime = DateTime.fromFormat(`${date}T${endTime}`, 'yyyy-MM-ddTHH:mm', { zone: timezone });
  
  const event: ICSEvent = {
    uid: `reservation-${Date.now()}@queueless.local`,
    startTime: startDateTime,
    endTime: endDateTime,
    summary: `Rezerwacja: ${serviceName} - ${companyName}`,
    description: description || `Rezerwacja usługi ${serviceName} w ${companyName}.`,
    location: companyAddress || undefined,
    organizer: {
      name: companyName,
      email: companyEmail
    },
    attendee: {
      name: customerName || customerEmail,
      email: customerEmail
    },
    reminders: [
      { minutes: 1440, method: 'DISPLAY' }, // 24h przed
      { minutes: 60, method: 'DISPLAY' }     // 1h przed
    ]
  };
  
  return generateICS(event);
}