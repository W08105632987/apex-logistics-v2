import { Shipment, ShipmentStatus, EmailLog } from '../types';

export function getStatusColor(status: ShipmentStatus): {
  bg: string;
  text: string;
  badgeBg: string;
  badgeBorder: string;
  hex: string;
} {
  switch (status) {
    case 'delivered':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        badgeBg: 'bg-emerald-100',
        badgeBorder: 'border-emerald-200',
        hex: '#059669',
      };
    case 'out_for_delivery':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        badgeBg: 'bg-blue-100',
        badgeBorder: 'border-blue-200',
        hex: '#1d4ed8',
      };
    case 'in_transit':
    case 'received_at_facility':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        badgeBg: 'bg-sky-100',
        badgeBorder: 'border-sky-200',
        hex: '#0284c7',
      };
    case 'customs_clearance':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        badgeBg: 'bg-purple-100',
        badgeBorder: 'border-purple-200',
        hex: '#7e22ce',
      };
    case 'exception_hold':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        badgeBg: 'bg-rose-100',
        badgeBorder: 'border-rose-200',
        hex: '#e11d48',
      };
    case 'manifest_created':
    case 'picked_up':
    default:
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        badgeBg: 'bg-blue-100',
        badgeBorder: 'border-blue-200',
        hex: '#1d4ed8',
      };
  }
}

export function formatStatusLabel(status: ShipmentStatus): string {
  switch (status) {
    case 'manifest_created':
      return 'Manifest Created & Registered';
    case 'picked_up':
      return 'Consignment Collected';
    case 'received_at_facility':
      return 'Received at Sorting Hub';
    case 'in_transit':
      return 'In Global Transit';
    case 'customs_clearance':
      return 'Customs Cleared & Processed';
    case 'out_for_delivery':
      return 'Out for Delivery';
    case 'delivered':
      return 'Delivered & Signed';
    case 'exception_hold':
      return 'Exception / On Hold';
    default:
      return status;
  }
}

export function generateShipmentEmailHTML(
  shipment: Shipment,
  trigger: ShipmentStatus | 'booking_created' | 'custom_broadcast',
  customNote?: string
): { subject: string; html: string } {
  const currentStatusLabel = formatStatusLabel(shipment.status);
  const color = getStatusColor(shipment.status);
  const estDate = new Date(shipment.estimatedDelivery).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let subject = '';
  let headline = '';
  let subheadline = '';
  let iconEmoji = '📦';

  if (trigger === 'booking_created' || trigger === 'manifest_created') {
    subject = `[APEX Global Logistics] Shipment Booked #${shipment.trackingNumber} - In Processing`;
    headline = 'Your Shipment is Booked & Registered';
    subheadline = `Air Waybill generated for consignment to ${shipment.receiver.city}, ${shipment.receiver.country}.`;
    iconEmoji = '🛫';
  } else if (trigger === 'in_transit' || trigger === 'received_at_facility') {
    subject = `[Transit Update] #${shipment.trackingNumber} - Moved to ${shipment.currentLocation.city}`;
    headline = 'Shipment is On the Move';
    subheadline = `Your package has arrived at ${shipment.currentLocation.description}, ${shipment.currentLocation.city}.`;
    iconEmoji = '🚢';
  } else if (trigger === 'customs_clearance') {
    subject = `[Customs Notice] #${shipment.trackingNumber} Cleared Customs in ${shipment.currentLocation.country}`;
    headline = 'Customs Inspection & Duty Cleared';
    subheadline = `International freight release completed. Transferred to local regional carrier network.`;
    iconEmoji = '🛂';
  } else if (trigger === 'out_for_delivery') {
    subject = `⚡ [Action Today] #${shipment.trackingNumber} is Out for Delivery!`;
    headline = 'Courier is Out For Delivery';
    subheadline = `Estimated delivery today. Courier assigned: ${shipment.assignedCourier?.name || 'APEX Express Driver'}.`;
    iconEmoji = '🚚';
  } else if (trigger === 'delivered') {
    subject = `✅ [Delivered] Shipment #${shipment.trackingNumber} Has Been Successfully Delivered`;
    headline = 'Package Successfully Delivered';
    subheadline = `Signed for by ${shipment.signatureProof?.signedBy || shipment.receiver.name} in ${shipment.receiver.city}.`;
    iconEmoji = '🎉';
  } else if (trigger === 'exception_hold') {
    subject = `⚠️ [Urgent Notice] Action Required on Shipment #${shipment.trackingNumber}`;
    headline = 'Shipment On Temporary Hold';
    subheadline = `A shipment checkpoint exception was recorded in the prototype. Please confirm the next action with operations.`;
    iconEmoji = '⚠️';
  } else {
    subject = `[Status Update] Shipment #${shipment.trackingNumber}: ${currentStatusLabel}`;
    headline = `Status: ${currentStatusLabel}`;
    subheadline = `Latest checkpoint recorded at ${shipment.currentLocation.city}, ${shipment.currentLocation.country}.`;
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #1e3a8a; padding: 24px 32px; border-bottom: 3px solid #1d4ed8;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                      APEX<span style="font-weight: 300; color: #67e8f9;"> LOGISTICS</span>
                    </div>
                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #bfdbfe; margin-top: 2px;">
                      Global Freight &amp; Courier Portal
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #ffffff; font-family: monospace;">
                      ${shipment.trackingNumber}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notification Hero -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: left;">
              <div style="display: inline-block; background-color: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">
                ${currentStatusLabel}
              </div>
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${headline}
              </h1>
              <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.5;">
                ${subheadline}
              </p>
              ${
                customNote
                  ? `<div style="margin-top: 16px; padding: 12px 16px; background-color: #f1f5f9; border-left: 4px solid #1d4ed8; border-radius: 4px; font-size: 13px; color: #334155;">
                      <strong>Note:</strong> ${customNote}
                    </div>`
                  : ''
              }
            </td>
          </tr>

          <!-- Tracking Highlights Box -->
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                <tr>
                  <td width="50%" style="vertical-align: top; padding-right: 12px;">
                    <div style="font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">Origin</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${shipment.originHub.city}, ${shipment.originHub.country}</div>
                    <div style="font-size: 11px; color: #64748b;">${shipment.sender.name}</div>
                  </td>
                  <td width="50%" style="vertical-align: top; padding-left: 12px; border-left: 1px solid #e2e8f0;">
                    <div style="font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">Destination</div>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${shipment.receiver.city}, ${shipment.receiver.country}</div>
                    <div style="font-size: 11px; color: #64748b;">${shipment.receiver.name}</div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 12px; margin-top: 12px; border-top: 1px solid #e2e8f0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Estimated Arrival</div>
                          <div style="font-size: 14px; font-weight: 700; color: #1d4ed8; margin-top: 2px;">${estDate}</div>
                        </td>
                        <td align="right">
                          <div style="font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Carrier Service</div>
                          <div style="font-size: 12px; font-weight: 600; color: #334155; margin-top: 2px;">${shipment.serviceType.replace('_', ' ').toUpperCase()}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Latest Checkpoint Record -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                Latest Milestone Event
              </div>
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 14px 16px; border: 1px solid #e2e8f0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="24" style="vertical-align: top;">
                      <div style="width: 10px; height: 10px; border-radius: 50%; background-color: #1d4ed8; margin-top: 4px;"></div>
                    </td>
                    <td>
                      <div style="font-size: 13px; font-weight: 700; color: #0f172a;">
                        ${shipment.checkpoints[0]?.title || currentStatusLabel}
                      </div>
                      <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                        ${shipment.checkpoints[0]?.description || shipment.statusMessage}
                      </div>
                      <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                        ${shipment.currentLocation.city}, ${shipment.currentLocation.country} &bull; ${new Date(shipment.updatedAt).toUTCString()}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 28px 32px; text-align: center;">
              <a href="#/track/${shipment.trackingNumber}" style="display: inline-block; width: 100%; box-sizing: border-box; background-color: #1d4ed8; color: #ffffff; font-size: 14px; font-weight: 700; text-align: center; text-decoration: none; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(29, 78, 216, 0.2);">
                View shipment status &rarr;
              </a>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                Tracking ID: <span style="font-family: monospace; color: #0f172a; font-weight: 600;">${shipment.trackingNumber}</span>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
                This simulated notification is addressed to <span style="color: #0f172a; font-weight: 600;">${shipment.receiver.email}</span>.
                <br>
                This is a prototype notification preview. No email has been sent by this demo workflow.
              </div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 8px;">
                &copy; ${new Date().getFullYear()} Apex Logistics. Sample notification template.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return { subject, html };
}

// Simulated Email Notification Preview
export function sendSimulatedEmail(
  shipment: Shipment,
  trigger: ShipmentStatus | 'booking_created' | 'custom_broadcast',
  customNote?: string,
  targetEmailOverride?: string
): EmailLog {
  const { subject, html } = generateShipmentEmailHTML(shipment, trigger, customNote);
  const emailLog: EmailLog = {
    id: 'EML-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    shipmentId: shipment.id,
    trackingNumber: shipment.trackingNumber,
    recipientEmail: targetEmailOverride || shipment.receiver.email,
    recipientName: shipment.receiver.name,
    subject,
    statusTrigger: trigger,
    sentAt: new Date().toISOString(),
    htmlContent: html,
    status: 'simulated',
    isRead: false,
  };

  return emailLog;
}
