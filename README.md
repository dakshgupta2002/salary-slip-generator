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

## Required Columns (Excel/CSV):

**Employee Information:**
- `code` - Employee Code (e.g., HW-122, 3D-DIAL-008)
- `name` - Employee Name
- `designation` - Job Title/Position
- `department` - Department Name
- `location` - Work Location
- `month` - Salary Month (e.g., SEPTEMBER)
- `year` - Salary Year (e.g., 2025)

**Bank & Compliance Details:**
- `PFAccount` - Provident Fund Account Number
- `UAN` - Universal Account Number
- `PAN` - PAN Card Number
- `bank` - Bank Account Details
- `ESI` - Employee State Insurance Number

**Earnings:**
- `basic` - Basic Salary Amount
- `specialAllowance` - Special Allowance Amount
- `reimburse` - Reimbursement Amount

**Deductions:**
- `providentFund` - PF Deduction Amount
- `insurance` - ESI/Health Insurance Amount
- `advancePaid` - Advance Payment Deducted (optional, defaults to 0)

## Features

- ✅ Supports Excel and CSV files
- ✅ Bulk PDF generation with embedded logo
- ✅ Professional salary slip template
- ✅ ZIP download of all slips
- ✅ Clean web interface
- ✅ Production-ready error handling
- ✅ Automatic cleanup of temporary files
