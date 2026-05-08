import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function createTemplate() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4

  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  const form = pdfDoc.getForm();

  // Title section
  page.drawText('Startup Metadata', {
    x: margin,
    y,
    size: 24,
    color: rgb(0, 0, 0),
  });
  y -= 40;

  // Company Name
  page.drawText('Company Name:', { x: margin, y, size: 11, color: rgb(0, 0, 0) });
  const companyField = form.createTextField('companyName');
  companyField.addToPage(page, {
    x: margin + 140,
    y: y - 15,
    width: 400,
    height: 20,
  });
  y -= 35;

  // Short Description
  page.drawText('Short Description (5 words):', { x: margin, y, size: 11, color: rgb(0, 0, 0) });
  const shortDescField = form.createTextField('shortDescription');
  shortDescField.addToPage(page, {
    x: margin + 140,
    y: y - 15,
    width: 400,
    height: 20,
  });
  y -= 35;

  // Long Description
  page.drawText('Description:', { x: margin, y, size: 11, color: rgb(0, 0, 0) });
  const longDescField = form.createTextField('longDescription');
  longDescField.addToPage(page, {
    x: margin,
    y: y - 200,
    width: width - margin * 2,
    height: 180,
  });
  longDescField.setFontSize(10);
  longDescField.enableMultiline();
  y -= 220;

  // HQ Location
  page.drawText('HQ Location:', { x: margin, y, size: 11, color: rgb(0, 0, 0) });
  const hqField = form.createTextField('hq');
  hqField.addToPage(page, {
    x: margin + 140,
    y: y - 15,
    width: 400,
    height: 20,
  });
  y -= 35;

  // Founding Year
  page.drawText('Founding Year:', { x: margin, y, size: 11, color: rgb(0, 0, 0) });
  const yearField = form.createTextField('foundingYear');
  yearField.addToPage(page, {
    x: margin + 140,
    y: y - 15,
    width: 100,
    height: 20,
  });
  y -= 35;

  // Employees
  page.drawText('Employees:', { x: margin, y, size: 11, color: rgb(0, 0, 0) });
  const empField = form.createTextField('employees');
  empField.addToPage(page, {
    x: margin + 140,
    y: y - 15,
    width: 400,
    height: 20,
  });
  y -= 35;

  // Website URL
  page.drawText('Website URL:', { x: margin, y, size: 11, color: rgb(0, 0, 0) });
  const websiteField = form.createTextField('websiteUrl');
  websiteField.addToPage(page, {
    x: margin + 140,
    y: y - 15,
    width: 400,
    height: 20,
  });
  y -= 35;

  // Video URL
  page.drawText('Video URL:', { x: margin, y, size: 11, color: rgb(0, 0, 0) });
  const videoField = form.createTextField('videoUrl');
  videoField.addToPage(page, {
    x: margin + 140,
    y: y - 15,
    width: 400,
    height: 20,
  });
  y -= 35;

  // Tags
  page.drawText('Tags:', { x: margin, y, size: 11, color: rgb(0, 0, 0) });
  const tagsField = form.createTextField('tags');
  tagsField.addToPage(page, {
    x: margin + 140,
    y: y - 15,
    width: 400,
    height: 20,
  });
  y -= 35;

  // Added Date
  page.drawText('Date Added:', { x: margin, y, size: 11, color: rgb(0, 0, 0) });
  const dateField = form.createTextField('addedDate');
  dateField.addToPage(page, {
    x: margin + 140,
    y: y - 15,
    width: 100,
    height: 20,
  });

  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  const templatePath = join(process.cwd(), 'template', 'default_template.pdf');
  writeFileSync(templatePath, pdfBytes);
  console.log('Template created at:', templatePath);
}

createTemplate().catch(console.error);
