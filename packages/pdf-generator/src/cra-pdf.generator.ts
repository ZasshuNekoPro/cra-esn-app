import puppeteer from 'puppeteer-core';
import type { CraPdfData } from './types';
import { buildCraHtml } from './templates/cra.template';

export class CraPdfGenerator {
  async generate(data: CraPdfData): Promise<Buffer> {
    const html = buildCraHtml(data);
    const executablePath = process.env['PUPPETEER_EXECUTABLE_PATH'];
    const browser = await puppeteer.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    return Buffer.from(pdfBuffer);
  }
}
