import { prisma } from '../lib/prisma';
import { TicketStatus, Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';


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
        layout: 'landscape',
        margin: 30,
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

      // Title
      doc.fontSize(16).font('Helvetica-Bold')
        .text(`Laporan Bulanan - ${monthNames[month - 1]} ${year}`, { align: 'center' });
      doc.moveDown(0.5);

      if (params.padalId) {
        doc.fontSize(10).font('Helvetica')
          .text('(Laporan Padal - Tiket yang ditugaskan)', { align: 'center' });
        doc.moveDown(0.5);
      }

      // Summary section
      doc.fontSize(12).font('Helvetica-Bold').text('Ringkasan:');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Total Tiket: ${reportData.summary.total}`);
      doc.text(`PENDING: ${reportData.summary.pending}`);
      doc.text(`PROSES: ${reportData.summary.proses}`);
      doc.text(`SELESAI: ${reportData.summary.selesai}`);
      doc.text(`DIBATALKAN: ${reportData.summary.dibatalkan}`);
      doc.text(`Rata-rata Rating: ${reportData.summary.averageRating !== null ? reportData.summary.averageRating.toFixed(1) : '-'}`);
      doc.moveDown(1);

      // Table header
      if (reportData.tickets.length === 0) {
        doc.fontSize(10).font('Helvetica')
          .text('Tidak ada tiket pada periode ini.', { align: 'center' });
      } else {
        // Define columns
        const columns = [
          { header: 'No. Tiket', width: 80 },
          { header: 'Judul', width: 100 },
          { header: 'Satker', width: 80 },
          { header: 'Divisi', width: 70 },
          { header: 'Lokasi', width: 70 },
          { header: 'Tgl Buat', width: 65 },
          { header: 'Tgl Assign', width: 65 },
          { header: 'Tgl Selesai', width: 65 },
          { header: 'Status', width: 65 },
          { header: 'Rating', width: 40 },
          { header: 'Feedback', width: 80 },
        ];

        const startX = doc.x;
        let currentY = doc.y;
        const rowHeight = 20;

        // Draw header row
        doc.fontSize(8).font('Helvetica-Bold');
        let xPos = startX;
        columns.forEach((col) => {
          doc.text(col.header, xPos, currentY, {
            width: col.width,
            height: rowHeight,
            ellipsis: true,
          });
          xPos += col.width;
        });

        currentY += rowHeight;

        // Draw a line under header
        doc.moveTo(startX, currentY - 3)
          .lineTo(startX + columns.reduce((sum, c) => sum + c.width, 0), currentY - 3)
          .stroke();

        // Draw data rows
        doc.fontSize(7).font('Helvetica');
        for (const ticket of reportData.tickets) {
          // Check if we need a new page
          if (currentY + rowHeight > doc.page.height - 50) {
            doc.addPage();
            currentY = 30;
          }

          xPos = startX;
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

          rowData.forEach((text, i) => {
            doc.text(text, xPos, currentY, {
              width: columns[i].width,
              height: rowHeight,
              ellipsis: true,
            });
            xPos += columns[i].width;
          });

          currentY += rowHeight;
        }
      }

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
