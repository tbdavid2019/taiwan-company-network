export function graphShareFileName(company) {
  const safeCompany = String(company || "")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return `${safeCompany || "888台灣公司關係網"}-公司關係圖.png`;
}
