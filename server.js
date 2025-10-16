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
    
    // Generate HTML for all employees (fast, no timeout)
    let allHtml = '<html><head><style>body{font-family:Arial;} .page-break{page-break-after:always;}</style></head><body>';
    
    data.forEach((employee, index) => {
      employee.logoUrl = logoDataUrl;
      allHtml += template(employee);
      if (index < data.length - 1) allHtml += '<div class="page-break"></div>';
    });
    
    allHtml += '</body></html>';
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(allHtml);

  } catch (error) {
    console.error('Error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Server error during processing' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
