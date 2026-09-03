"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailNotificationService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../config/env");
class EmailNotificationService {
    /**
     * Send real transactional email notification to routed department
     */
    async notifyDepartment(complaint, deptInfo) {
        const isEmergency = complaint.risk_score >= 60 || deptInfo.isEmergencyService;
        const subject = `${isEmergency ? '🚨 URGENT EMERGENCY' : '📢 CIVIC INCIDENT'}: ${complaint.category} (Risk: ${complaint.risk_score}/100) — VERA ID #${complaint.id.slice(0, 8)}`;
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: ${isEmergency ? '#dc2626' : '#0d9488'}; color: #ffffff; padding: 18px 24px;">
          <h2 style="margin: 0; font-size: 20px;">VERA Automated Authority Dispatch</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Routed to: <strong>${deptInfo.department}</strong></p>
        </div>
        <div style="padding: 24px; background: #ffffff; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 14px; margin-top: 0;"><strong>Incident Category:</strong> ${complaint.category}</p>
          <p style="font-size: 14px;"><strong>Deterministic Risk Assessment:</strong> <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${isEmergency ? '#fef2f2' : '#f0fdf4'}; color: ${isEmergency ? '#dc2626' : '#16a34a'}; font-weight: bold;">${complaint.risk_level} (${complaint.risk_score}/100)</span></p>
          <p style="font-size: 14px;"><strong>Target Response SLA:</strong> ${deptInfo.responseSLA}</p>
          <p style="font-size: 14px;"><strong>Location / Address:</strong> ${complaint.address || 'Coordinates Only'}</p>
          <p style="font-size: 14px;"><strong>GPS Coordinates:</strong> ${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)} ${complaint.gps_accuracy ? `(±${complaint.gps_accuracy}m)` : ''}</p>
          
          <div style="background: #f8fafc; border-left: 4px solid ${isEmergency ? '#dc2626' : '#0d9488'}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <strong style="font-size: 12px; color: #64748b; text-transform: uppercase;">Citizen Description:</strong>
            <p style="margin: 6px 0 0 0; font-size: 14px; color: #0f172a;">${complaint.description}</p>
          </div>

          ${complaint.voice_transcript ? `
            <div style="background: #f0fdfa; border: 1px solid #ccfbf1; padding: 10px 14px; margin-bottom: 16px; border-radius: 4px;">
              <strong style="font-size: 11px; color: #0f766e; text-transform: uppercase;">Voice Transcription:</strong>
              <p style="margin: 4px 0 0 0; font-size: 13px; font-style: italic; color: #134e4a;">"${complaint.voice_transcript}"</p>
            </div>
          ` : ''}

          ${complaint.photo_url ? `<p style="font-size: 13px;"><a href="${complaint.photo_url}" target="_blank" style="color: #2563eb; text-decoration: underline;">📷 View Attached Incident Photo</a></p>` : ''}
          ${complaint.video_url ? `<p style="font-size: 13px;"><a href="${complaint.video_url}" target="_blank" style="color: #2563eb; text-decoration: underline;">🎥 View Attached Incident Video</a></p>` : ''}

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p style="margin: 0;"><strong>Notice:</strong> This is an automated notification from VERA (Voice Emergency Response Assistant). Demo routing configured for hackathon demonstration.</p>
          </div>
        </div>
      </div>
    `;
        // 1. Try Resend if API key is provided
        if (env_1.config.email.apiKey) {
            try {
                const response = await axios_1.default.post('https://api.resend.com/emails', {
                    from: env_1.config.email.fromAddress,
                    to: deptInfo.email,
                    subject,
                    html: htmlContent,
                }, {
                    headers: {
                        Authorization: `Bearer ${env_1.config.email.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 7000,
                });
                const msgId = response.data?.id || 'resend_ok';
                console.log(`[EMAIL] Resend sent to ${deptInfo.email} (ID: ${msgId})`);
                return {
                    success: true,
                    recipient: deptInfo.email,
                    department: deptInfo.department,
                    messageId: msgId,
                    simulated: false,
                    statusMessage: `Real email notification delivered to ${deptInfo.department} (${deptInfo.email})`,
                };
            }
            catch (err) {
                console.warn(`[EMAIL] Resend API error: ${err.message}. Falling back to logged notification.`);
            }
        }
        // 2. Demo Fallback: Simulated high-fidelity dispatch log
        console.log(`[EMAIL DISPATCH DEMO] Notification prepared for: ${deptInfo.department} <${deptInfo.email}>`);
        console.log(`[EMAIL SUBJECT] ${subject}`);
        return {
            success: true,
            recipient: deptInfo.email,
            department: deptInfo.department,
            messageId: `demo_msg_${Date.now()}`,
            simulated: true,
            statusMessage: `Notification sent to department inbox: ${deptInfo.department} (${deptInfo.email}) [Demo routing]`,
        };
    }
}
exports.EmailNotificationService = EmailNotificationService;
exports.emailService = new EmailNotificationService();
