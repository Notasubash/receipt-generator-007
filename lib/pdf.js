import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { DANCING_SCRIPT_B64 } from '../lib/Dancingscript';

function registerDancingScript(doc) {
  doc.addFileToVFS('DancingScript.ttf', DANCING_SCRIPT_B64);
  doc.addFont('DancingScript.ttf', 'DancingScript', 'normal');
  doc.addFont('DancingScript.ttf', 'DancingScript', 'bold');
}

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
  const doc = new jsPDF({ unit: 'mm', format: [210, 100], orientation: 'l' });
  registerDancingScript(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const aptName     = (settings.apartmentName || 'Apartment').toUpperCase();
  const aptAddress  = settings.address || '';
  const designation = settings.designation || 'Secy./Treasurer.';
  const currency    = safeCurrency(settings.currency);

  const DARK_BLUE  = [26, 26, 100];
  const FIELD_BLUE = [30, 80, 180];
  const BODY_DARK  = [26, 26, 46];

  // Group receipts by receiptNumber — each group = one PDF page
  const groups = new Map();
  receipts.forEach((r) => {
    const key = r.receiptNumber || String(startReceiptNo);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  let pageIndex = 0;

  groups.forEach((groupReceipts, receiptNumber) => {
    if (pageIndex > 0) doc.addPage();
    pageIndex++;

    // Aggregate values for this group
    const totalAmount = groupReceipts.reduce((s, r) => s + Number(r.paidAmount || 0), 0);
    const lastEntry   = groupReceipts[groupReceipts.length - 1];
    const dateStr     = lastEntry.paymentDate
      ? format(new Date(lastEntry.paymentDate), 'dd/MM/yyyy')
      : format(new Date(), 'dd/MM/yyyy');
    const mode        = lastEntry.modeOfPayment || 'Cash';

    const isMultiMonth = groupReceipts.length > 1;
    const firstMonth   = groupReceipts[0].month || '—';
    const lastMonth    = lastEntry.month || '—';

    // Page background & borders
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, 'F');

    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.8);
    doc.rect(6, 6, pageW - 12, pageH - 12);
    doc.setLineWidth(0.3);
    doc.rect(8.5, 8.5, pageW - 17, pageH - 17);

    // Apartment name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...DARK_BLUE);
    const nameLines = doc.splitTextToSize(aptName, pageW - 50);
    let y = 22;
    nameLines.forEach((line) => {
      doc.text(line, pageW / 2, y, { align: 'center' });
      y += 7;
    });

    // Address
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

    // Divider
    doc.setDrawColor(...DARK_BLUE);
    doc.setLineWidth(0.4);
    doc.line(13, y, pageW - 13, y);
    y += 7;

    // No: | Receipt | Date:
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...BODY_DARK);
    doc.text(`No: ${receiptNumber}`, 14, y);
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

    // Body sentence segments
    const ownerName   = flat.ownerName || '—';
    const flatNumber  = flat.flatNumber || '—';
    const amountWords = amountToWords(totalAmount);

    const segments = isMultiMonth
      ? [
          { text: 'Received with thanks from', dynamic: false },
          { text: ownerName,                   dynamic: true  },
          { text: 'flat No.',                  dynamic: false },
          { text: flatNumber,                  dynamic: true  },
          { text: 'the sum of Rupees',         dynamic: false },
          { text: amountWords,                 dynamic: true  },
          { text: 'towards Maintenance charges for the months from', dynamic: false },
          { text: firstMonth,                  dynamic: true  },
          { text: 'to',                        dynamic: false },
          { text: lastMonth,                   dynamic: true  },
          { text: 'by',                        dynamic: false },
          { text: mode + '.',                  dynamic: true  },
        ]
      : [
          { text: 'Received with thanks from', dynamic: false },
          { text: ownerName,                   dynamic: true  },
          { text: 'flat No.',                  dynamic: false },
          { text: flatNumber,                  dynamic: true  },
          { text: 'the sum of Rupees',         dynamic: false },
          { text: amountWords,                 dynamic: true  },
          { text: 'towards Maintenance charges for the month of', dynamic: false },
          { text: firstMonth,                  dynamic: true  },
          { text: 'by',                        dynamic: false },
          { text: mode + '.',                  dynamic: true  },
        ];

    // Flatten to word tokens
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

    wordTokens.forEach(({ text, dynamic }) => {
      doc.setFont('DancingScript', 'normal');
      doc.setFontSize(11);
      const w = doc.getTextWidth(text);

      if (cx + w > rightEdge && cx > lx) {
        flushSpan();
        cx = lx;
        cy += lineH;
        if (text === ' ') return;
      }

      doc.setTextColor(...(dynamic ? FIELD_BLUE : BODY_DARK));
      doc.text(text, cx, cy);

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

    doc.setDrawColor(...FIELD_BLUE);
    underlineSpans.forEach(({ x1, x2, y: uy }) => {
      drawDottedUnderline(doc, x1, x2, uy + 1.2);
    });

    // Remarks (if any) — rendered after mode of payment, before amount
    const remarksText = groupReceipts
      .map((r) => r.remarks?.trim())
      .filter(Boolean)
      .join(' | ');

    if (remarksText) {
      cy += 8;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 130);
      const remarkLines = doc.splitTextToSize(`Remarks: ${remarksText}`, rightEdge - lx);
      remarkLines.forEach((line) => {
        doc.text(line, lx, cy);
        cy += 5;
      });
    }

    // Amount + Designation
    const bottomY = cy + (remarksText ? 6 : 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...DARK_BLUE);
    const currencyLabel = currency + ' ';
    const cw = doc.getTextWidth(currencyLabel);
    doc.text(currencyLabel, 14, bottomY);

    doc.setFont('DancingScript', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(...FIELD_BLUE);
    const amountText = `${totalAmount.toLocaleString('en-IN')} /-`;
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

    // Computer generated notice — centered at the bottom
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 160);
    doc.text(
      'This is a computer generated receipt. No signature is required.',
      pageW / 2,
      pageH - 10,
      { align: 'center' }
    );
  });

  return doc;
}

export function downloadReceiptPDF(settings, flat, receipts, filename, startReceiptNo) {
  const doc = generateReceiptPDF(settings, flat, receipts, startReceiptNo);
  const name = filename || `receipt_${flat.flatNumber}_${Date.now()}.pdf`;
  doc.save(name);
}