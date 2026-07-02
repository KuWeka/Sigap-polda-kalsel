import { prisma } from '../lib/prisma';
import { TicketStatus, Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ReportParams {
  month: number;       // 1-12
  year: number;        // 4-digit year
  padalId?: string;    // Filter for Padal role (only their own tickets)
}

export interface ReportTicketRow {
  nomorTiket: string;
  judul: string;
  namaSatker: string;
  divisiSatker: string | null;
  lokasi: string;
  tanggalBuat: Date;
  tanggalAssign: Date | null;
  tanggalSelesai: Date | null;
  status: TicketStatus;
  rating: {
    bintang: number;
    feedback: string;
  } | null;
}

export interface ReportSummary {
  total: number;
  pending: number;
  proses: number;
  selesai: number;
  dibatalkan: number;
  averageRating: number | null;
}

export interface ReportData {
  tickets: ReportTicketRow[];
  summary: ReportSummary;
}

// ─── Get Monthly Report ──────────────────────────────────────────────────────

/**
 * Get monthly report data filtered by month/year.
 * Scoped by role:
 * - Bidtekkom: all tickets (padalId not provided)
 * - Padal: only tickets assigned to them (padalId provided)
 *
 * Includes all columns per Req 12.3:
 * nomorTiket, judul, namaSatker, divisiSatker, lokasi, tanggalBuat,
 * tanggalAssign, tanggalSelesai, status, rating.bintang, rating.feedback
 *
 * Summary per Req 12.6:
 * total, per-status counts, average rating (1 decimal, null if no ratings)
 *
 * _Requirements: 12.1, 12.2, 12.3, 12.6, 12.7_
 */
export async function getMonthlyReport(params: ReportParams): Promise<ReportData> {
  const { month, year, padalId } = params;

  // Build date range for the specified month/year
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1); // First day of next month

  // Build where clause (TASK-008: Use Prisma type instead of any)
  const where: Prisma.TicketWhereInput = {
    tanggalBuat: {
      gte: startDate,
      lt: endDate,
    },
  };

  // Scope by Padal if padalId provided (Req 12.2)
  if (padalId) {
    where.padalId = padalId;
  }

  // Query tickets with relations
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { tanggalBuat: 'asc' },
    include: {
      creator: {
        select: {
          nama: true,
        },
      },
      rating: {
        select: {
          bintang: true,
          feedback: true,
        },
      },
    },
  });

  // Map to ReportTicketRow
  const reportTickets: ReportTicketRow[] = tickets.map((ticket) => ({
    nomorTiket: ticket.nomorTiket,
    judul: ticket.judul,
    namaSatker: ticket.creator.nama,
    divisiSatker: ticket.divisiSatker,
    lokasi: ticket.lokasi,
    tanggalBuat: ticket.tanggalBuat,
    tanggalAssign: ticket.tanggalAssign,
    tanggalSelesai: ticket.tanggalSelesai,
    status: ticket.status,
    rating: ticket.rating
      ? { bintang: ticket.rating.bintang, feedback: ticket.rating.feedback }
      : null,
  }));

  // Calculate summary
  const summary = calculateSummary(reportTickets);

  return {
    tickets: reportTickets,
    summary,
  };
}

// ─── Calculate Summary ───────────────────────────────────────────────────────

function calculateSummary(tickets: ReportTicketRow[]): ReportSummary {
  const total = tickets.length;
  const pending = tickets.filter((t) => t.status === 'PENDING').length;
  const proses = tickets.filter((t) => t.status === 'PROSES').length;
  const selesai = tickets.filter((t) => t.status === 'SELESAI').length;
  const dibatalkan = tickets.filter((t) => t.status === 'DIBATALKAN').length;

  // Average rating: only from tickets that have a rating (Req 12.6)
  const ratedTickets = tickets.filter((t) => t.rating !== null);
  let averageRating: number | null = null;

  if (ratedTickets.length > 0) {
    const sum = ratedTickets.reduce((acc, t) => acc + t.rating!.bintang, 0);
    averageRating = Math.round((sum / ratedTickets.length) * 10) / 10;
  }

  return {
    total,
    pending,
    proses,
    selesai,
    dibatalkan,
    averageRating,
  };
}

// ─── Export PDF ──────────────────────────────────────────────────────────────

/**
 * Generate a PDF report with tabular layout + summary section.
 * Uses pdfkit to create a downloadable PDF buffer.
 *
 * _Requirements: 12.4_
 */
export async function exportPDF(params: ReportParams): Promise<Buffer> {
  const reportData = await getMonthlyReport(params);

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 40,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { month, year } = params;
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const monthName = monthNames[month - 1];

      // --- KOP SURAT (LETTERHEAD) ---
      doc.font('Helvetica-Bold').fontSize(14).text('KEPOLISIAN NEGARA REPUBLIK INDONESIA', { align: 'center' });
      doc.fontSize(12).text('DAERAH KALIMANTAN SELATAN', { align: 'center' });
      doc.font('Helvetica').fontSize(10).text('Jalan Bina Praja Timur, Kelurahan Sungai Tiung, Kecamatan Cempaka, Kota Banjarbaru – Kalimantan Selatan – Indonesia', { align: 'center' });
      
      // Draw double line for letterhead
      doc.moveDown(0.5);
      let lineY = doc.y;
      doc.lineWidth(2).moveTo(40, lineY).lineTo(doc.page.width - 40, lineY).stroke();
      doc.lineWidth(1).moveTo(40, lineY + 3).lineTo(doc.page.width - 40, lineY + 3).stroke();

      // Tambahkan Logo jika ada file-nya di folder public/images
      const logoPoldaPath = path.join(__dirname, '../../public/images/logo_polda.png');
      const logoBidtikPath = path.join(__dirname, '../../public/images/logo_bidtik.png');

      if (fs.existsSync(logoPoldaPath)) {
        // Logo Polda Kalsel di kiri
        doc.image(logoPoldaPath, 45, 25, { width: 55 });
      }

      if (fs.existsSync(logoBidtikPath)) {
        // Logo Bid TIK di kanan
        doc.image(logoBidtikPath, doc.page.width - 100, 25, { width: 55 });
      }

      doc.moveDown(2);

      // --- TITLE ---
      doc.font('Helvetica-Bold').fontSize(12).text('LAPORAN BULANAN TIKET', { align: 'center', underline: true });
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#2B6CB0').text(`Bulan ${monthName} ${year}`, { align: 'center' });
      if (params.padalId) {
        doc.fillColor('black').font('Helvetica-Oblique').text('(Laporan Padal - Tiket yang ditugaskan)', { align: 'center' });
      }
      doc.fillColor('black'); // Reset to default

      doc.moveDown(2);

      // --- SUMMARY TEXT ---
      // Instead of big cards, use formal text format
      doc.font('Helvetica-Bold').fontSize(9).text('RINGKASAN:', 40, doc.y);
      doc.font('Helvetica').fontSize(9)
         .text(`Total: ${reportData.summary.total} | Pending: ${reportData.summary.pending} | Proses: ${reportData.summary.proses} | Selesai: ${reportData.summary.selesai} | Dibatalkan: ${reportData.summary.dibatalkan} | Rating: ${reportData.summary.averageRating ?? '-'}`, 40, doc.y);
      doc.moveDown(1);

      // --- TABLE SECTION ---
      if (reportData.tickets.length === 0) {
        doc.moveDown(1);
        doc.font('Helvetica-Oblique').fontSize(10).text('Tidak ada tiket pada periode ini.', { align: 'center' });
      } else {
        // Adjust column widths to fit A4 Portrait (595.28 - 80 margin = 515.28 usable width)
        const columns = [
          { header: 'NO. TIKET', width: 55 },
          { header: 'JUDUL', width: 80 },
          { header: 'SATKER', width: 50 },
          { header: 'DIVISI', width: 40 },
          { header: 'LOKASI', width: 40 },
          { header: 'TGL BUAT', width: 45 },
          { header: 'TGL ASSIGN', width: 45 },
          { header: 'TGL SELESAI', width: 45 },
          { header: 'STATUS', width: 45 },
          { header: 'RATING', width: 25 },
          { header: 'FEEDBACK', width: 45 },
        ];

        let startX = 40;
        let currentY = doc.y;
        const rowHeight = 35; // taller rows like in screenshot
        const totalWidth = columns.reduce((sum, c) => sum + c.width, 0); // 760

        const drawRow = (y: number, rowData: string[], isHeader = false) => {
          let xPos = startX;
          doc.lineWidth(0.5).strokeColor('#888888'); // gray grid lines
          
          rowData.forEach((text, i) => {
            if (isHeader) doc.font('Helvetica-Bold');
            else doc.font('Helvetica');
            
            doc.fillColor('black').fontSize(7);
            doc.text(text, xPos + 4, y + 6, {
              width: columns[i].width - 8,
              height: rowHeight - 6,
              align: 'left'
            });
            
            // Draw left border for this cell
            doc.moveTo(xPos, y).lineTo(xPos, y + rowHeight).stroke();
            xPos += columns[i].width;
          });
          
          // Draw rightmost border
          doc.moveTo(startX + totalWidth, y).lineTo(startX + totalWidth, y + rowHeight).stroke();
          
          // Draw bottom border
          doc.moveTo(startX, y + rowHeight).lineTo(startX + totalWidth, y + rowHeight).stroke();

          return y + rowHeight;
        };

        // Draw top border for the first row (header)
        doc.moveTo(startX, currentY).lineTo(startX + totalWidth, currentY).stroke();
        
        // Draw Header
        const headerData = columns.map(c => c.header);
        currentY = drawRow(currentY, headerData, true);

        // Draw Data Rows
        for (const ticket of reportData.tickets) {
          // Check page break
          if (currentY + rowHeight > doc.page.height - 40) {
            doc.addPage();
            currentY = 40;
            doc.moveTo(startX, currentY).lineTo(startX + totalWidth, currentY).stroke();
            currentY = drawRow(currentY, headerData, true);
          }

          const rowData = [
            ticket.nomorTiket,
            ticket.judul,
            ticket.namaSatker,
            ticket.divisiSatker ?? '-',
            ticket.lokasi,
            formatDate(ticket.tanggalBuat),
            ticket.tanggalAssign ? formatDate(ticket.tanggalAssign) : '-',
            ticket.tanggalSelesai ? formatDate(ticket.tanggalSelesai) : '-',
            ticket.status,
            ticket.rating ? String(ticket.rating.bintang) : '-',
            ticket.rating ? ticket.rating.feedback : '-',
          ];

          currentY = drawRow(currentY, rowData, false);
        }
      }

      // --- FOOTER / SIGNATURE ---
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      } else {
        doc.moveDown(3);
      }

      const today = new Date();
      const formattedDate = `${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;
      
      const signX = doc.page.width - 250;
      let signY = doc.y;
      
      doc.font('Helvetica').fontSize(10);
      doc.text(`Banjarmasin, ${formattedDate}`, signX, signY, { align: 'center', width: 200 });
      signY += 15;
      doc.text('Administrator Utama SIAGA,', signX, signY, { align: 'center', width: 200 });
      
      signY += 60; // Space for signature
      
      doc.font('Helvetica-Bold');
      doc.text('BID TIK POLDA KALSEL', signX, signY, { align: 'center', width: 200 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ─── Export Excel ────────────────────────────────────────────────────────────

/**
 * Generate an Excel (.xlsx) report with data sheet + summary section.
 * Uses exceljs to create a downloadable buffer.
 *
 * _Requirements: 12.5_
 */
export async function exportExcel(params: ReportParams): Promise<Buffer> {
  const reportData = await getMonthlyReport(params);

  const { month, year } = params;
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIGAP';
  workbook.created = new Date();

  // ─── Data Sheet ──────────────────────────────────────────────────────────
  const dataSheet = workbook.addWorksheet('Laporan');

  // Title row
  dataSheet.mergeCells('A1:K1');
  const titleCell = dataSheet.getCell('A1');
  titleCell.value = `Laporan Bulanan - ${monthNames[month - 1]} ${year}`;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  // Empty row
  dataSheet.addRow([]);

  // Column headers (row 3)
  const headers = [
    'No. Tiket',
    'Judul',
    'Nama Satker',
    'Divisi Satker',
    'Lokasi',
    'Tanggal Buat',
    'Tanggal Assign',
    'Tanggal Selesai',
    'Status',
    'Rating (Bintang)',
    'Feedback',
  ];

  const headerRow = dataSheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // Set column widths
  dataSheet.columns = [
    { width: 18 },  // No. Tiket
    { width: 30 },  // Judul
    { width: 20 },  // Nama Satker
    { width: 18 },  // Divisi Satker
    { width: 20 },  // Lokasi
    { width: 14 },  // Tanggal Buat
    { width: 14 },  // Tanggal Assign
    { width: 14 },  // Tanggal Selesai
    { width: 14 },  // Status
    { width: 14 },  // Rating
    { width: 30 },  // Feedback
  ];

  // Data rows
  for (const ticket of reportData.tickets) {
    const row = dataSheet.addRow([
      ticket.nomorTiket,
      ticket.judul,
      ticket.namaSatker,
      ticket.divisiSatker ?? '-',
      ticket.lokasi,
      formatDate(ticket.tanggalBuat),
      ticket.tanggalAssign ? formatDate(ticket.tanggalAssign) : '-',
      ticket.tanggalSelesai ? formatDate(ticket.tanggalSelesai) : '-',
      ticket.status,
      ticket.rating ? ticket.rating.bintang : '-',
      ticket.rating ? ticket.rating.feedback : '-',
    ]);

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  // ─── Summary Section ─────────────────────────────────────────────────────
  // Add empty rows before summary
  dataSheet.addRow([]);
  dataSheet.addRow([]);

  // Summary header
  const summaryHeaderRow = dataSheet.addRow(['Ringkasan']);
  summaryHeaderRow.font = { bold: true, size: 12 };

  dataSheet.addRow(['Total Tiket', reportData.summary.total]);
  dataSheet.addRow(['PENDING', reportData.summary.pending]);
  dataSheet.addRow(['PROSES', reportData.summary.proses]);
  dataSheet.addRow(['SELESAI', reportData.summary.selesai]);
  dataSheet.addRow(['DIBATALKAN', reportData.summary.dibatalkan]);
  dataSheet.addRow([
    'Rata-rata Rating',
    reportData.summary.averageRating !== null
      ? reportData.summary.averageRating.toFixed(1)
      : '-',
  ]);

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
