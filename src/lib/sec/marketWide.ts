import "server-only";
import { secFetch } from "./http";
import type { Form4Filing } from "./submissions";

const SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";
const PAGE_SIZE = 100;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// EDGAR'ın tam metin arama API'si (SEC'in kendi arama arayüzünün arka ucu).
// `forms=4` ile piyasa genelinde, herhangi bir CIK bilmeden en güncel Form 4
// dosyalamalarını keşfetmemizi sağlar — "büyük oyuncular" akışının kaynağı budur.
// Aynı dosyalamanın birden fazla CIK'i olabilir (issuer + reporting owner(lar));
// SEC, accession klasörünü bu CIK'lerin HERHANGİ biri altında da sunduğu için
// ilkini kullanmak yeterli — gerçek ticker'ı zaten XML'in kendisinden (issuer)
// okuyoruz (bkz. form4Parser.ts), bu listeden tahmin etmemize gerek yok.
export async function discoverRecentForm4Filings(maxResults = 150): Promise<Form4Filing[]> {
  const today = new Date();
  const windowStart = new Date(today);
  windowStart.setUTCDate(windowStart.getUTCDate() - 2);

  const startdt = isoDate(windowStart);
  const enddt = isoDate(today);

  const filings: Form4Filing[] = [];
  let from = 0;

  while (filings.length < maxResults) {
    const url =
      `${SEARCH_URL}?q=%22%22&forms=4&dateRange=custom` +
      `&startdt=${startdt}&enddt=${enddt}&from=${from}`;

    const res = await secFetch(url);
    const data = await res.json();
    const hits: Array<{
      _id: string;
      _source: { adsh: string; file_date: string; ciks: string[] };
    }> = data?.hits?.hits ?? [];

    if (hits.length === 0) break;

    for (const hit of hits) {
      const [accessionNumber, primaryDocument] = hit._id.split(":");
      const cikNumeric = String(Number(hit._source.ciks[0]));
      const accessionNoDashes = accessionNumber.replace(/-/g, "");

      filings.push({
        accessionNumber,
        filingDate: hit._source.file_date,
        primaryDocument,
        cikNumeric,
        documentUrl: `https://www.sec.gov/Archives/edgar/data/${cikNumeric}/${accessionNoDashes}/${primaryDocument}`,
      });
    }

    from += PAGE_SIZE;
    if (hits.length < PAGE_SIZE) break;
  }

  return filings.slice(0, maxResults);
}
