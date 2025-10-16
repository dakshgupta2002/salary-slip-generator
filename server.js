import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

// Register Handlebars helpers
Handlebars.registerHelper('add', function() {
  return Array.prototype.slice.call(arguments, 0, -1).reduce((sum, num) => sum + (parseFloat(num) || 0), 0);
});

Handlebars.registerHelper('subtract', function(a, b) {
  return (parseFloat(a) || 0) - (parseFloat(b) || 0);
});

// Ensure directories exist
['uploads', 'output'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Load logo once at startup
let logoDataUrl;
try {
  const logoBase64 = fs.readFileSync('public/3d.jpg', 'base64');
  logoDataUrl = `data:image/jpeg;base64,${logoBase64}`;
} catch (error) {
  console.warn('Logo file not found, PDFs will generate without logo');
  logoDataUrl = '';
}

app.post('/generate', upload.single('file'), async (req, res) => {
  let browser;
  let outputDir;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse file
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(fileExt)) {
      return res.status(400).json({ error: 'Unsupported file format' });
    }

    let data;
    try {
      const workbook = XLSX.readFile(req.file.path);
      data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    } catch (error) {
      console.error('File parsing error:', error.message);
      return res.status(400).json({ error: 'Invalid file format. Please ensure it\'s a valid Excel or CSV file.' });
    }
    
    if (!data.length) {
      return res.status(400).json({ error: 'No data found in file' });
    }

    const template = Handlebars.compile(fs.readFileSync('template.hbs', 'utf8'));
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    outputDir = `output/${Date.now()}`;
    fs.mkdirSync(outputDir, { recursive: true });
    
    // Generate PDFs
    for (const employee of data) {
      employee.logoUrl = logoDataUrl;
      const html = template(employee);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({ 
        path: `${outputDir}/${employee.employeeId || employee.name}_salary_slip.pdf`,
        format: 'A4',
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
      });
      await page.close();
    }
    
    await browser.close();
    browser = null;
    
    // Create ZIP
    const zipPath = `${outputDir}.zip`;
    await createZip(outputDir, zipPath);
    
    res.download(zipPath, 'salary-slips.zip', (err) => {
      // Cleanup
      if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true });
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      
      if (err) console.error('Download error:', err);
    });
    
  } catch (error) {
    console.error('Generation error:', error);
    
    // Cleanup on error
    if (browser) await browser.close().catch(() => {});
    if (outputDir && fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true });
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    
    res.status(500).json({ error: 'Failed to generate salary slips' });
  }
});

function createZip(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', resolve);
    archive.on('error', reject);
    
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
