export const MOJANG_API_BASE_URL = "https://api.mojang.com/";
export const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? "http://localhost:3000/api"
  : `${window.location.origin}/api`;

async function convertToJson(res) {
  const responseText = await res.text();
  let data = responseText;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    data = responseText || res.statusText;
  }
  if (res.ok) return data;
  throw { name: "servicesError", message: data || res.statusText, status: res.status };
}

export async function get(url) {
  const response = await fetch(url);
  return convertToJson(response);
}

export async function getMojang(username) {
  try {
    let cleanUsername = username;
    if (typeof username === 'object' && username !== null) {
      cleanUsername = username.name || username.username || '';
    }

    if (!cleanUsername || cleanUsername === '[object Object]') {
      console.warn("getMojang blocked an invalid request object:", username);
      return {};
    }

    const response = await fetch(`${BACKEND_URL}/mojang?username=${encodeURIComponent(cleanUsername)}`);
    return convertToJson(response);
  } catch (error) {
    console.error("Mojang Name lookup error:", error);
    throw error;
  }
}

export async function getMojangProfileFromUuid(uuid) {
  try {
    const response = await fetch(`${BACKEND_URL}/mojang?uuid=${encodeURIComponent(uuid)}`);
    return convertToJson(response);
  } catch (error) {
    console.error("Mojang UUID lookup error:", error);
    throw error;
  }
}

export async function getHypixel(parameters) {
  try {
    const response = await fetch(`${BACKEND_URL}/hypixel?params=${encodeURIComponent(parameters)}`);
    return convertToJson(response);
  } catch (error) {
    console.error("Hypixel API error:", error);
    throw error;
  }
}

export async function getWynncraft(parameters) {
  try {
    let url = `${BACKEND_URL}/wynncraft`;
    if (parameters && parameters.username) {
      url += `?username=${encodeURIComponent(parameters.username)}`;
    }
    const response = await fetch(url);
    return convertToJson(response);
  } catch (error) {
    console.error("Wynncraft API error:", error);
    throw error;
  }
}