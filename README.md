# Salary Slip Generator

Generate PDF salary slips from Excel/CSV data for 100-200 employees.

## Quick Start

```bash
npm install
npm start
```

Open http://localhost:3000

## Deployment

### Environment Variables
- `PORT` - Server port (default: 3000)

### Requirements
- Node.js 16+
- Sufficient memory for PDF generation (recommend 1GB+)

## Usage

1. Prepare Excel (.xlsx, .xls) or CSV file with required columns
2. Upload file via web interface
3. Download ZIP containing all PDF salary slips

## File Format

**Required columns:**
- employeeId, name, designation, department
- month, year
- basicSalary, hra, specialAllowance, otherAllowances, grossSalary
- pf, professionalTax, incomeTax, otherDeductions, totalDeductions
- netSalary

## Features

- ✅ Supports Excel and CSV files
- ✅ Bulk PDF generation with embedded logo
- ✅ Professional salary slip template
- ✅ ZIP download of all slips
- ✅ Clean web interface
- ✅ Production-ready error handling
- ✅ Automatic cleanup of temporary files
