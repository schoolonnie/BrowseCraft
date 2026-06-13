export const MCSTATUS_BASE_URL = "https://api.mcstatus.io/v2/status/java";

async function convertToJson(res) {

  const responseText = await res.text();
  let data = responseText;

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    data = responseText || res.statusText;
  }

  if (res.ok) {
    return data;
  } else {
    throw {
      name: "servicesError",
      message: data || res.statusText,
      status: res.status,
    };
  }
}

export async function get(url) {
  const res = await fetch(url, { method: "GET" });
  return convertToJson(res);
}

// Testing
//const mcscanTestResponse = await get(MCSCAN_BASE_URL + "?edition=java&page=1");
//console.log(mcscanTestResponse);
// End of testing