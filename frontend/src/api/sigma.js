import axios from 'axios';

// Get API base URL from Vite environment, fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeaders = (token) => {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

export const login = async (userId) => {
  const response = await axios.post(`${API_URL}/auth/demo-login`, { user_id: userId });
  return response.data;
};

export const validateRule = async (ruleText, token) => {
  try {
    const response = await axios.post(`${API_URL}/validate-rule`, { rule: ruleText }, getAuthHeaders(token));
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) throw error;
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return { valid: false, errors: [{ line: 1, message: error.message }] };
  }
};

export const runRule = async (ruleText, datasetId, token) => {
  const response = await axios.post(`${API_URL}/run-rule`, { rule: ruleText, dataset: datasetId }, getAuthHeaders(token));
  return response.data;
};

export const getLogDatasets = async (token) => {
  const response = await axios.get(`${API_URL}/log-datasets`, getAuthHeaders(token));
  return response.data;
};

export const getChallenges = async (token) => {
  const response = await axios.get(`${API_URL}/challenges`, getAuthHeaders(token));
  return response.data;
};

export const submitChallenge = async (id, ruleText, token) => {
  const response = await axios.post(`${API_URL}/challenges/${id}/submit`, { rule: ruleText }, getAuthHeaders(token));
  return response.data;
};

export const transpileRule = async (ruleText, target, token) => {
  const response = await axios.post(`${API_URL}/transpile-rule`, { rule: ruleText, target }, getAuthHeaders(token));
  return response.data;
};

export const explainRule = async (ruleText, datasetId, failed, token) => {
  const response = await axios.post(`${API_URL}/explain-rule`, { rule: ruleText, dataset: datasetId, failed }, getAuthHeaders(token));
  return response.data;
};
