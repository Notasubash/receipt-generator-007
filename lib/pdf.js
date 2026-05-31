// lib/pdf.js
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { DANCING_SCRIPT_B64 } from '../lib/Dancingscript';

// ── Register Dancing Script into jsPDF ────────────────────────────────────────
function registerDancingScript(doc) {
  doc.addFileToVFS('DancingScript.ttf', DANCING_SCRIPT_B64);
  doc.addFont('DancingScript.ttf', 'DancingScript', 'normal');
  doc.addFont('DancingScript.ttf', 'DancingScript', 'bold');
}

// ── Amount to words (Indian system) ──────────────────────────────────────────
function amountToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
    'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const num = Math.floor(Number(amount) || 0);
  if (num === 0) return 'Zero Rupees Only';
  return convert(num) + ' Rupees Only';
}

function safeCurrency(raw) {
  if (!raw) return 'Rs.';
  return raw.replace('₹', 'Rs.');
}

// ── Dotted underline ──────────────────────────────────────────────────────────
function drawDottedUnderline(doc, x1, x2, y) {
  const dashLen = 0.8;
  const gapLen  = 0.8;
  doc.setLineWidth(0.25);
  let cx = x1;
  while (cx < x2) {
    doc.line(cx, y, Math.min(cx + dashLen, x2), y);
    cx += dashLen + gapLen;
  }
}

export function generateReceiptPDF(settings, flat, receipts, startReceiptNo = 1) {
  const doc = new jsPDF({ unit: 'mm', format: [210, 90], orientation: 'l' });
  registerDancingScript(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const aptName     = (settings.apartmentName || 'Apartment').toUpperCase();
  const aptAddress  = settings.address || '';
  const designation = settings.designation || 'Secy./Treasurer.';
  const currency    = safeCurrency(settings.currency);
  const receiptBase = parseInt(settings.receiptStartNumber, 10) || parseInt(startReceiptNo, 10) || 1;

  const DARK_BLUE  = [26, 26, 100];
  const FIELD_BLUE = [30, 80, 180];
  const BODY_DARK  = [26, 26, 46];

  receipts.forEach((receipt, index) => {
    if (index > 0) doc.addPage();

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, 'F');

    // Borders
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.8);
    doc.rect(6, 6, pageW - 12, pageH - 12);
    doc.setLineWidth(0.3);
    doc.rect(8.5, 8.5, pageW - 17, pageH - 17);

    // ── Apartment name ────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...DARK_BLUE);
    const nameLines = doc.splitTextToSize(aptName, pageW - 50);
    let y = 22;
    nameLines.forEach((line) => {
      doc.text(line, pageW / 2, y, { align: 'center' });
      y += 7;
    });

    // ── Address ───────────────────────────────────────────────────
    if (aptAddress) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 80);
      const addrLines = doc.splitTextToSize(aptAddress, pageW - 50);
      addrLines.forEach((line) => {
        doc.text(line, pageW / 2, y, { align: 'center' });
        y += 5;
      });
    }

    y += 3;

    // ── Divider ───────────────────────────────────────────────────
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.4);
    doc.line(13, y, pageW - 13, y);
    y += 7;

    // ── No: | Receipt | Date: ─────────────────────────────────────
const receiptNo = String(receiptBase + index);
    const dateStr = receipt.paymentDate
      ? format(new Date(receipt.paymentDate), 'dd/MM/yyyy')
      : format(new Date(), 'dd/MM/yyyy');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...BODY_DARK);
    doc.text(`No: ${receiptNo}`, 14, y);
    doc.text(`Date: ${dateStr}`, pageW - 14, y, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const titleW = doc.getTextWidth('Receipt');
    const titleX = pageW / 2 - titleW / 2;
    doc.text('Receipt', pageW / 2, y, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.setDrawColor(...BODY_DARK);
    doc.line(titleX, y + 1, titleX + titleW, y + 1);

    y += 11;

    // ── Body sentence ─────────────────────────────────────────────
    const ownerName   = flat.ownerName || '—';
    const flatNumber  = flat.flatNumber || '—';
    const amountWords = amountToWords(receipt.paidAmount);
    const month       = receipt.month || '—';
    const mode        = receipt.modeOfPayment || 'Cash';

    const segments = [
      { text: "Received with thanks from", dynamic: false },
      { text: ownerName,                                      dynamic: true  },
      { text: 'flat No.',                                     dynamic: false },
      { text: flatNumber,                                     dynamic: true  },
      { text: 'the sum of Rupees',                            dynamic: false },
      { text: amountWords,                                    dynamic: true  },
      { text: 'towards Maintenance charges for the month of', dynamic: false },
      { text: month,                                          dynamic: true  },
      { text: 'by',                                           dynamic: false },
      { text: mode + '.',                                     dynamic: true  },
    ];

    // Flatten to word tokens with explicit space tokens between
    const wordTokens = [];
    segments.forEach((seg) => {
      seg.text.trim().split(/\s+/).forEach((word) => {
        if (wordTokens.length > 0) wordTokens.push({ text: ' ', dynamic: false });
        wordTokens.push({ text: word, dynamic: seg.dynamic });
      });
    });

    const lx        = 14;
    const rightEdge = pageW - 14;
    const lineH     = 7.5;
    let cx = lx;
    let cy = y;

    const underlineSpans = [];
    let spanStart = null, spanEnd = null, spanY = null;

    function flushSpan() {
      if (spanStart !== null) {
        underlineSpans.push({ x1: spanStart, x2: spanEnd, y: spanY });
        spanStart = spanEnd = spanY = null;
      }
    }

    function setTokenFont(dynamic) {
      // All body text uses Dancing Script — only color differs
      doc.setFont('DancingScript', 'normal');
      doc.setFontSize(11);
    }

    wordTokens.forEach(({ text, dynamic }) => {
      setTokenFont(dynamic);
      const w = doc.getTextWidth(text);

      // Wrap
      if (cx + w > rightEdge && cx > lx) {
        flushSpan();
        cx = lx;
        cy += lineH;
        if (text === ' ') return;
      }

      doc.setTextColor(...(dynamic ? FIELD_BLUE : BODY_DARK));
      doc.text(text, cx, cy);

      // Track underline spans
      if (dynamic && text.trim() !== '') {
        if (spanStart === null || spanY !== cy) {
          flushSpan();
          spanStart = cx;
          spanEnd   = cx + w;
          spanY     = cy;
        } else {
          spanEnd = cx + w;
        }
      } else if (text === ' ' && spanStart !== null && spanY === cy) {
        spanEnd = cx + w;
      } else if (text !== ' ') {
        flushSpan();
      }

      cx += w;
    });

    flushSpan();

    // Draw dotted underlines
    doc.setDrawColor(...FIELD_BLUE);
    underlineSpans.forEach(({ x1, x2, y: uy }) => {
      drawDottedUnderline(doc, x1, x2, uy + 1.2);
    });

    // ── Amount + Designation — placed just below body text ──────
    // cy is where the last body line ended; add a small gap
    const bottomY = cy + 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...DARK_BLUE);
    const currencyLabel = currency + ' ';
    const cw = doc.getTextWidth(currencyLabel);
    doc.text(currencyLabel, 14, bottomY);

    doc.setFont('DancingScript', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(...FIELD_BLUE);
    const amountText = `${Number(receipt.paidAmount || 0).toLocaleString('en-IN')} /-`;
    const ax = 14 + cw;
    const aw = doc.getTextWidth(amountText);
    doc.text(amountText, ax, bottomY);
    doc.setDrawColor(...FIELD_BLUE);
    drawDottedUnderline(doc, ax, ax + aw, bottomY + 1.2);
    drawDottedUnderline(doc, ax, ax + aw, bottomY + 2.6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...BODY_DARK);
    doc.text(designation, pageW - 14, bottomY, { align: 'right' });


  });

  return doc;
}

export function downloadReceiptPDF(settings, flat, receipts, filename, startReceiptNo) {
  const doc = generateReceiptPDF(settings, flat, receipts, startReceiptNo);
  const name = filename || `receipt_${flat.flatNumber}_${Date.now()}.pdf`;
  doc.save(name);
}