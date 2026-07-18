import type { ExecuteCurlRequest, ExecuteCurlResponse } from "../types/curlExec";

// Point this at wherever curl-exec.js is running.
const RUN_CURL_URL = "http://10.177.44.29:4417/run-curl";

export async function runCurl(payload: ExecuteCurlRequest): Promise<ExecuteCurlResponse> {
  const res = await fetch(RUN_CURL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data as ExecuteCurlResponse;
}
