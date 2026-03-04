const axios = require('axios');
const FormData = require('form-data');

class AloeVerificationService {
  constructor() {
    this.mlBase = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    this.endpoint = process.env.ALOE_VERIFIER_URL || `${this.mlBase}/verify/aloe`;
    this.timeout = Number(process.env.ALOE_VERIFIER_TIMEOUT || 15000);
    this.endpointCandidates = [
      this.endpoint,
      `${this.mlBase}/verify/aloe`,
      `${this.mlBase}/verify-aloe`,
      `${this.mlBase}/api/v1/verify/aloe`,
      `${this.mlBase}/api/verify/aloe`,
    ];
  }

  buildForm(imageBuffer) {
    const formData = new FormData();
    formData.append('image', imageBuffer, {
      filename: `aloe-verify-${Date.now()}.jpg`,
      contentType: 'image/jpeg',
    });
    return formData;
  }

  async postToEndpoint(endpoint, imageBuffer) {
    const formData = this.buildForm(imageBuffer);
    const response = await axios.post(
      endpoint,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: this.timeout,
      }
    );
    return response;
  }

  normalizeResponse(responseData = {}) {
    if (responseData.success === false) {
      throw new Error(responseData.error || 'Aloe verifier error');
    }

    const isAloe = Boolean(responseData.is_aloe);
    const aloeScore = Number(responseData.aloe_score || 0);
    const competitorScore = Number(responseData.non_aloe_score || 0);
    const threshold = Number(responseData.threshold || 0);

    return {
      isAloe,
      score: aloeScore,
      competitorScore,
      threshold,
      provider: responseData.provider || 'local-transformers-clip',
      model: responseData.model || null,
    };
  }

  async verify(imageBuffer) {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
      return { isAloe: false, score: 0, reason: 'invalid_image' };
    }

    const uniqueCandidates = Array.from(new Set(this.endpointCandidates.filter(Boolean)));
    let lastError = null;

    for (const candidate of uniqueCandidates) {
      try {
        const response = await this.postToEndpoint(candidate, imageBuffer);
        if (!response?.data) {
          throw new Error('Aloe verifier returned empty response');
        }
        return this.normalizeResponse(response.data);
      } catch (error) {
        const status = Number(error?.response?.status || 0);
        if (status === 404) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    if (lastError) {
      return {
        isAloe: true,
        score: 0,
        competitorScore: 0,
        threshold: 0,
        provider: 'verifier-unavailable',
        model: null,
        fallback: true,
        reason: 'verifier_endpoint_not_found',
      };
    }

    throw new Error('Aloe verifier endpoints unavailable');
  }
}

module.exports = new AloeVerificationService();
