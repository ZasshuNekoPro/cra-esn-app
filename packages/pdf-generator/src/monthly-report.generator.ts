import puppeteer from 'puppeteer-core';
import type { MonthlyReportData } from './monthly-report.types';
import { buildMonthlyReportHtml } from './templates/monthly-report.template';

export class MonthlyReportPdfGenerator {
  async generate(data: MonthlyReportData): Promise<Buffer> {
    const html = buildMonthlyReportHtml(data);
    const executablePath =
      process.env['PUPPETEER_EXECUTABLE_PATH'] ??
      '/home/neko/.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64/chrome';
    const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return Buffer.from(pdfBuffer);
  }
}
