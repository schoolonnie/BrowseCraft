export const HYPIXEL_API_BASE_URL = "https://api.hypixel.net/v2/";
export const WYNNCRAFT_API_BASE_URL = "https://api.wynncraft.com/v3/";
export const HIVE_API_BASE_URL = "https://api.playhive.com/v0/"
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