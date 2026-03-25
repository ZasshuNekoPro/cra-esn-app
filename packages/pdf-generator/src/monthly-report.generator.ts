import puppeteer from 'puppeteer-core';
import type { MonthlyReportData } from './monthly-report.types';
import { buildMonthlyReportHtml } from './templates/monthly-report.template';

export class MonthlyReportPdfGenerator {
  async generate(data: MonthlyReportData): Promise<Buffer> {
    const html = buildMonthlyReportHtml(data);
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return Buffer.from(pdfBuffer);
  }
}
