export const DEFAULT_SITE_BASE_URL = "https://taiwan-company-network.david888.com/";
export const BOX_API_UPLOAD_URL = "https://box.david888.com/api.php?action=upload";

export function buildGraphShareUrl(company, baseUrl = DEFAULT_SITE_BASE_URL) {
  const safeBase = baseUrl || DEFAULT_SITE_BASE_URL;
  try {
    const url = new URL("graph", safeBase);
    if (company) {
      url.searchParams.set("company", company);
    }
    return url.toString();
  } catch {
    const query = company ? `?company=${encodeURIComponent(company)}` : "";
    return `${safeBase.replace(/\/?$/, "/")}graph${query}`;
  }
}

export function buildGraphShareText({ company, pageUrl, imageUrl, shareUrl } = {}) {
  const title = `${company || "888台灣公司關係網"} - 888台灣的公司關係網`;
  const lines = [
    `🏢 ${title}`,
    `📊 公司與法人關係索引`,
    pageUrl ? `🔗 關係圖連結：${pageUrl}` : null,
    imageUrl ? `🖼️ 圖片網址：${imageUrl}` : null,
    shareUrl ? `☁️ 888box 預覽：${shareUrl}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export async function uploadGraphToBox({
  blob,
  fileName = "graph.png",
  company = "",
  pageUrl = "",
  fetchFn = (typeof fetch !== "undefined" ? fetch : null),
} = {}) {
  if (!fetchFn) {
    return { success: false, error: "Fetch is not available in this environment." };
  }
  if (!blob) {
    return { success: false, error: "Image blob is required for upload." };
  }

  const effectivePageUrl = pageUrl || buildGraphShareUrl(company);
  const title = `${company || "888台灣公司關係網"} - 888台灣的公司關係網`;
  const description = `${company || "888台灣公司關係網"} 的公司與法人關係索引。\n網址：${effectivePageUrl}`;

  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append("title", title);
  formData.append("description", description);

  try {
    const response = await fetchFn(BOX_API_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error ${response.status}`,
      };
    }

    const result = await response.json();
    if (result.result === "success" && (result.data?.url || result.url)) {
      return {
        success: true,
        id: result.data?.id || null,
        imageUrl: result.data?.url || result.url,
        shareUrl: result.data?.share_url || result.share_url || null,
        name: result.data?.name || result.name || null,
        width: result.data?.width || null,
        height: result.data?.height || null,
      };
    }

    return {
      success: false,
      error: result.message || "888box upload returned an unsuccessful response.",
    };
  } catch (err) {
    return {
      success: false,
      error: err?.message || "Failed to upload to 888box.",
    };
  }
}
