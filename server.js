import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

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
['uploads'].forEach(dir => {
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
    const timestamp = Date.now();
    
    // Create output directory
    const outputDir = `public/slips/${timestamp}`;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    
    // Generate individual HTML files
    const employeeLinks = [];
    data.forEach((employee, index) => {
      employee.logoUrl = logoDataUrl;
      const html = `<html><head><style>body{font-family:Arial;}</style></head><body>${template(employee)}</body></html>`;
      const filename = `${employee.code || employee.name || index}_slip.html`;
      fs.writeFileSync(`${outputDir}/${filename}`, html);
      employeeLinks.push({
        name: employee.name || `Employee ${index + 1}`,
        id: employee.code || employee.employeeId || `EMP-${index + 1}`,
        filename: filename
      });
    });
    
    // Generate index page
    const indexHtml = `
    <html>
    <head>
      <title>Salary Slips - ${data.length} Employees</title>
      <style>
        body { font-family: Arial; margin: 40px; }
        h1 { color: #333; }
        .employee-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .employee-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .employee-card a { text-decoration: none; color: #007bff; font-weight: bold; }
        .employee-card a:hover { text-decoration: underline; }
        .stats { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <h1>Salary Slips Generated</h1>
      <div class="stats">
        <strong>Total Employees:</strong> ${data.length} | 
        <strong>Generated:</strong> ${new Date().toLocaleString()}
      </div>
      <div class="employee-list">
        ${employeeLinks.map(emp => `
          <div class="employee-card">
            <a href="/slips/${timestamp}/${emp.filename}" target="_blank">
              ${emp.name}
            </a>
            <div style="color: #666; font-size: 0.9em;">Employee Code: ${emp.id}</div>
          </div>
        `).join('')}
      </div>
    </body>
    </html>`;
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(indexHtml);

  } catch (error) {
    console.error('Error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Server error during processing' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
