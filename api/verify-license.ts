import type { VercelRequest, VercelResponse } from '@vercel/node';

const GUMROAD_PRODUCT_ID = 'pkgoz';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ success: false, error: 'License key is required' });
  }

  // Basic format validation first
  const keyPattern = /^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/i;
  if (!keyPattern.test(licenseKey.trim())) {
    return res.status(400).json({ success: false, error: 'Invalid license key format' });
  }

  try {
    // Verify with Gumroad API
    const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        product_id: GUMROAD_PRODUCT_ID,
        license_key: licenseKey.trim(),
      }),
    });

    const data = await response.json();

    if (data.success) {
      // License is valid
      return res.status(200).json({
        success: true,
        purchase: {
          email: data.purchase?.email,
          created_at: data.purchase?.created_at,
          refunded: data.purchase?.refunded || false,
          chargebacked: data.purchase?.chargebacked || false,
        },
      });
    } else {
      // License is invalid
      return res.status(400).json({
        success: false,
        error: data.message || 'Invalid license key',
      });
    }
  } catch (error) {
    console.error('Gumroad API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify license. Please try again.',
    });
  }
}
