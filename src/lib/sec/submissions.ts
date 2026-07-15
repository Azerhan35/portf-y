import "server-only";
import { secFetch } from "./http";

export type Form4Filing = {
  accessionNumber: string;
  filingDate: string;
  primaryDocument: string;
  cikNumeric: string;
  documentUrl: string;
};

const FORM4_RE = /^4(\/A)?$/;

// Verilen (10 haneli, sıfır dolgulu) CIK için son Form 4 dosyalamalarını getirir.
// `submissions` endpoint'i yalnızca en güncel ~1000 dosyalamayı döner — Faz 1
// (Form 4) için bu yeterli; eski geçmişe gitmek gerekirse `filings.files`
// altındaki sayfalanmış arşiv dosyaları ayrıca çekilmeli.
export async function getRecentForm4Filings(cikPadded: string, limit = 20): Promise<Form4Filing[]> {
  const res = await secFetch(`https://data.sec.gov/submissions/CIK${cikPadded}.json`);
  const data = await res.json();

  const recent = data?.filings?.recent;
  if (!recent) return [];

  const cikNumeric = String(Number(cikPadded));
  const filings: Form4Filing[] = [];

  for (let i = 0; i < recent.form.length && filings.length < limit; i++) {
    if (!FORM4_RE.test(recent.form[i])) continue;

    const accessionNumber: string = recent.accessionNumber[i];
    const accessionNoDashes = accessionNumber.replace(/-/g, "");
    const primaryDocument: string = recent.primaryDocument[i];

    // `primaryDocument` genelde bir XSLT görüntüleyici yolu olur
    // (ör. "xslF345X06/form4.xml") — asıl parse edilebilir ham XML, aynı dosya
    // adıyla accession klasörünün kökünde durur (alt klasör olmadan).
    const rawXmlFilename = primaryDocument.split("/").pop() ?? primaryDocument;

    filings.push({
      accessionNumber,
      filingDate: recent.filingDate[i],
      primaryDocument,
      cikNumeric,
      documentUrl: `https://www.sec.gov/Archives/edgar/data/${cikNumeric}/${accessionNoDashes}/${rawXmlFilename}`,
    });
  }

  return filings;
}
