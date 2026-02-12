# Environment Variables Configuration

This document lists all required environment variables for AttendX.

## Backend (.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/attendx
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/attendx

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Cloudinary (for avatar uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email Service (NEW - Phase 14)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=AttendX <noreply@attendx.com>

# Client URL (for email links)
CLIENT_URL=http://localhost:5173
# OR for production:
# CLIENT_URL=https://your-domain.com
```

## Frontend (.env)

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:5000/api/v1
# OR for production:
# VITE_API_BASE_URL=https://your-api-domain.com/api/v1
```

## Email Service Setup

### Gmail Configuration

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and your device
   - Copy the generated 16-character password
3. **Use in .env:**
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=abcd efgh ijkl mnop  # The 16-char app password
   ```

### Other Email Providers

#### SendGrid
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

#### Mailgun
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASSWORD=your-mailgun-password
```

#### AWS SES
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-ses-smtp-username
EMAIL_PASSWORD=your-ses-smtp-password
```

## Testing Email Service

To test if your email configuration is working:

1. Start the server
2. Create a new user via Admin Dashboard
3. Check the console for "✅ Email sent: [message-id]"
4. Check the user's email inbox for the welcome email

## Troubleshooting

### Email Not Sending

- **Check console logs** for error messages
- **Verify credentials** in .env file
- **Check spam folder** in recipient's email
- **Firewall issues:** Ensure port 587 is not blocked
- **Gmail:** Make sure "Less secure app access" is OFF and you're using an App Password

### Email Service Not Configured

If you see "⚠️ Email service not configured. Skipping email." in the console:
- The system will continue to work without emails
- Users will be created successfully, but won't receive welcome emails
- This is intentional for development environments where email is not critical

## Production Recommendations

1. **Use a dedicated email service** (SendGrid, Mailgun, AWS SES) instead of Gmail
2. **Set up SPF, DKIM, and DMARC** records for your domain
3. **Use environment-specific configurations:**
   - Development: Console logging only (optional)
   - Staging: Test email service
   - Production: Production email service with monitoring
4. **Monitor email delivery rates** and bounce rates
5. **Implement email queue** for high-volume sending (e.g., using Bull or BullMQ)

## Email Templates

All email templates use a **Sky Blue (#0EA5E9)** theme and are fully responsive. Templates include:

- **Welcome Email:** Sent when admin creates a new user
- **Low Attendance Warning:** Sent when student attendance drops below 75%
- **Device Security Alert:** Sent when device is bound or reset
- **Session Started:** (Optional) Notify students when a session starts

Templates are defined in `src/services/email.service.js` and can be customized as needed.
