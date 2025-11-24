import api from "./api";

const authAPI = {
  // Enable 2FA - Get QR Code
  enable2FA: async () => {
    const response = await api.post("/auth/2fa/enable");
    return response.data;
  },

  // Verify and activate 2FA
  verify2FA: async (token, secret) => {
    const response = await api.post("/auth/2fa/verify", { token, secret });
    return response.data;
  },

  // Disable 2FA
  disable2FA: async (token) => {
    const response = await api.post("/auth/2fa/disable", { token });
    return response.data;
  },

  // Validate 2FA during login
  validate2FALogin: async (tempToken, otp) => {
    const response = await api.post("/auth/2fa/validate", { tempToken, otp });
    return response.data;
  },
};

export default authAPI;
