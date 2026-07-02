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
      
      // Theme colors
      const primaryColor = '#1A365D'; // Dark blue
      const secondaryColor = '#2B6CB0'; // Lighter blue
      const accentColor = '#EDF2F7'; // Light gray for backgrounds
      const textColor = '#2D3748';
      const white = '#FFFFFF';

      // --- HEADER ---
      // Draw a subtle header background
      doc.rect(0, 0, doc.page.width, 90).fill(primaryColor);
      
      // Title
      doc.fillColor(white).fontSize(22).font('Helvetica-Bold')
         .text('SIGAP', 40, 30);
      
      doc.fontSize(14).font('Helvetica')
         .text(`Laporan Bulanan - ${monthNames[month - 1]} ${year}`, 40, 58);

      if (params.padalId) {
        doc.fontSize(10).font('Helvetica-Oblique')
          .text('Laporan Padal - Tiket yang ditugaskan', doc.page.width - 290, 40, { width: 250, align: 'right' });
      } else {
        doc.fontSize(10).font('Helvetica')
          .text('Bidtekkom Polda Kalsel', doc.page.width - 290, 40, { width: 250, align: 'right' });
      }

      // --- SUMMARY CARDS ---
      doc.moveDown(4); // Move past header
      const summaryStartY = 110;
      doc.y = summaryStartY;

      const drawCard = (x: number, y: number, title: string, value: string | number, bgColor: string, txtColor: string) => {
        doc.roundedRect(x, y, 115, 60, 6).fill(bgColor);
        doc.fillColor(txtColor).fontSize(10).font('Helvetica').text(title, x, y + 15, { width: 115, align: 'center' });
        doc.fontSize(18).font('Helvetica-Bold').text(String(value), x, y + 32, { width: 115, align: 'center' });
      };

      const cardSpacing = 129; // (760 - (115*6)) / 5 = 14. 115 + 14 = 129
      let currentX = 40;
      
      drawCard(currentX, summaryStartY, 'Total Tiket', reportData.summary.total, '#EBF8FF', '#2B6CB0');
      currentX += cardSpacing;
      drawCard(currentX, summaryStartY, 'PENDING', reportData.summary.pending, '#FFF5F5', '#C53030');
      currentX += cardSpacing;
      drawCard(currentX, summaryStartY, 'PROSES', reportData.summary.proses, '#FFFFF0', '#B7791F');
      currentX += cardSpacing;
      drawCard(currentX, summaryStartY, 'SELESAI', reportData.summary.selesai, '#F0FFF4', '#2F855A');
      currentX += cardSpacing;
      drawCard(currentX, summaryStartY, 'DIBATALKAN', reportData.summary.dibatalkan, '#F7FAFC', '#4A5568');
      currentX += cardSpacing;
      drawCard(currentX, summaryStartY, 'Rata-rata Rating', reportData.summary.averageRating !== null ? reportData.summary.averageRating.toFixed(1) : '-', '#FAF5FF', '#6B46C1');

      doc.y = summaryStartY + 90;
      
      // --- TABLE SECTION ---
      if (reportData.tickets.length === 0) {
        doc.moveDown(2);
        doc.fillColor(textColor).fontSize(12).font('Helvetica-Oblique')
          .text('Tidak ada tiket pada periode ini.', { align: 'center' });
      } else {
        // Define columns
        const columns = [
          { header: 'No. Tiket', width: 85 },
          { header: 'Judul', width: 120 },
          { header: 'Satker', width: 75 },
          { header: 'Divisi', width: 70 },
          { header: 'Lokasi', width: 70 },
          { header: 'Tgl Buat', width: 55 },
          { header: 'Tgl Assign', width: 55 },
          { header: 'Tgl Selesai', width: 55 },
          { header: 'Status', width: 60 },
          { header: 'Rating', width: 35 },
          { header: 'Feedback', width: 80 },
        ];

        let startX = 40;
        let currentY = doc.y;
        const rowHeight = 22;
        const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);

        // Function to draw header
        const drawTableHeader = (y: number) => {
          doc.roundedRect(startX, y, totalWidth, rowHeight, 4).fill(secondaryColor);
          doc.fillColor(white).fontSize(8).font('Helvetica-Bold');
          
          let xPos = startX;
          columns.forEach((col) => {
            doc.text(col.header, xPos + 4, y + 6, {
              width: col.width - 8,
              height: rowHeight,
              ellipsis: true,
              align: 'left'
            });
            xPos += col.width;
          });
          return y + rowHeight;
        };

        currentY = drawTableHeader(currentY);

        // Draw data rows
        let isAlternateRow = false;

        for (const ticket of reportData.tickets) {
          // Check if we need a new page
          if (currentY + rowHeight > doc.page.height - 40) {
            doc.addPage();
            currentY = 40;
            currentY = drawTableHeader(currentY);
          }

          // Row background
          if (isAlternateRow) {
            doc.rect(startX, currentY, totalWidth, rowHeight).fill(accentColor);
          }
          isAlternateRow = !isAlternateRow;

          // Text color based on status for the status column
          const getStatusColor = (status: string) => {
            switch(status) {
              case 'PENDING': return '#C53030';
              case 'PROSES': return '#B7791F';
              case 'SELESAI': return '#2F855A';
              default: return textColor;
            }
          };

          let xPos = startX;
          const rowData = [
            { text: ticket.nomorTiket, color: textColor },
            { text: ticket.judul, color: textColor },
            { text: ticket.namaSatker, color: textColor },
            { text: ticket.divisiSatker ?? '-', color: textColor },
            { text: ticket.lokasi, color: textColor },
            { text: formatDate(ticket.tanggalBuat), color: textColor },
            { text: ticket.tanggalAssign ? formatDate(ticket.tanggalAssign) : '-', color: textColor },
            { text: ticket.tanggalSelesai ? formatDate(ticket.tanggalSelesai) : '-', color: textColor },
            { text: ticket.status, color: getStatusColor(ticket.status), bold: true },
            { text: ticket.rating ? String(ticket.rating.bintang) : '-', color: textColor },
            { text: ticket.rating ? ticket.rating.feedback : '-', color: textColor },
          ];

          rowData.forEach((item, i) => {
            doc.fillColor(item.color).fontSize(8);
            if (item.bold) doc.font('Helvetica-Bold');
            else doc.font('Helvetica');

            doc.text(item.text, xPos + 4, currentY + 6, {
              width: columns[i].width - 8,
              height: rowHeight,
              ellipsis: true,
            });
            xPos += columns[i].width;
          });

          currentY += rowHeight;
        }
        
        // Draw bottom border for the table
        doc.moveTo(startX, currentY).lineTo(startX + totalWidth, currentY).strokeColor('#E2E8F0').lineWidth(1).stroke();
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
