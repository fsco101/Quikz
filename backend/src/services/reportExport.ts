import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { Gradebook, GradeRow } from "./gradebook.js";

const ink = "FF070235",
  accent = "FF4648D4";
const headers = [
  "Surname",
  "Student",
  "Student ID",
  "Subject",
  "Term",
  "Quiz",
  "Attempt",
  "Correct",
  "Questions",
  "Score %",
  "Status",
  "Submitted (UTC)",
  "Focus warnings",
  "Time (s)",
  "Passing %",
];
const values = (r: GradeRow) => [
  r.surname,
  r.studentName,
  r.studentId,
  r.subjectCode,
  r.term,
  r.quizTitle,
  r.attempt,
  r.score,
  r.totalQuestions,
  r.percentage / 100,
  r.passed ? "Passed" : "Needs review",
  new Date(r.submittedAt),
  r.blurCount,
  r.timeSpentSeconds,
  r.passingPercentage / 100,
];
function title(
  sheet: ExcelJS.Worksheet,
  heading: string,
  subheading: string,
  columns: number,
) {
  sheet.mergeCells(1, 1, 1, columns);
  sheet.getCell(1, 1).value = heading;
  sheet.getRow(1).height = 32;
  sheet.getCell(1, 1).font = {
    name: "Calibri",
    size: 18,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  sheet.getCell(1, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: ink },
  };
  sheet.mergeCells(2, 1, 2, columns);
  sheet.getCell(2, 1).value = subheading;
  sheet.getCell(2, 1).font = { size: 10, color: { argb: "FF475569" } };
  sheet.getRow(2).height = 26;
}
export async function excelReport(report: Gradebook) {
  const book = new ExcelJS.Workbook();
  book.creator = "Quikz";
  book.created = new Date(report.generatedAt);
  const summary = book.addWorksheet("Summary");
  title(
    summary,
    "QUIKZ | Academic performance",
    `${report.viewer.name} | Generated ${report.generatedAt} | Faculty-defined passing marks`,
    6,
  );
  summary.addRow([]);
  summary.addRow([
    "Cohort",
    "Students",
    "Attempts",
    "Average",
    "Pass rate",
    "Passed",
  ]);
  summary.columns = [
    { width: 30 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
  ];
  for (const group of report.groups)
    summary.addRow([
      group.key,
      group.metrics.students,
      group.metrics.attempts,
      group.metrics.average / 100,
      group.metrics.passRate / 100,
      group.metrics.passed,
    ]);
  summary.addRow([
    "Overall",
    report.summary.students,
    report.summary.attempts,
    report.summary.average / 100,
    report.summary.passRate / 100,
    report.summary.passed,
  ]);
  summary.getColumn(4).numFmt = "0.00%";
  summary.getColumn(5).numFmt = "0.00%";
  summary.addRow([]);
  summary.addRow(["Score distribution", "Attempts"]);
  report.summary.distribution.forEach((bin) =>
    summary.addRow([bin.label, bin.count]),
  );
  summary.addRow([]);
  summary.addRow(["Applied filters"]);
  for (const [key, value] of Object.entries(report.filters)) {
    const row = summary.addRow([
      key,
      String(value || (value === 0 ? 0 : "Any")),
    ]);
    summary.mergeCells(row.number, 2, row.number, 6);
    row.height = 32;
  }
  summary.getColumn(2).alignment = { wrapText: true };
  for (const group of report.groups) {
    const sheet = book.addWorksheet(group.key.slice(0, 31), {
      views: [{ state: "frozen", ySplit: 4 }],
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });
    title(
      sheet,
      `QUIKZ | ${group.key}`,
      `${group.metrics.attempts} attempts | Average ${group.metrics.average.toFixed(2)}% | Pass rate ${group.metrics.passRate.toFixed(2)}% | Faculty-defined passing marks`,
      headers.length,
    );
    sheet.addRow([]);
    sheet.addRow(headers);
    sheet.columns = [
      18, 26, 28, 18, 20, 44, 12, 12, 12, 14, 18, 24, 16, 14, 14,
    ].map((width) => ({ width }));
    for (const record of group.rows) {
      const row = sheet.addRow(values(record));
      row.height = 32;
      row.alignment = { vertical: "middle", wrapText: true };
      row.getCell(11).font = {
        bold: true,
        color: { argb: record.passed ? "FF047857" : "FFB45309" },
      };
    }
    sheet.getColumn(15).numFmt = "0.00%";
    sheet.getColumn(10).numFmt = "0.00%";
    sheet.getColumn(12).numFmt = "yyyy-mm-dd hh:mm";
    sheet.autoFilter = { from: "A4", to: `O${Math.max(4, sheet.rowCount)}` };
    sheet.headerFooter.oddFooter = "Quikz | &P of &N";
  }
  for (const sheet of book.worksheets) {
    sheet.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(4).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: accent },
    };
    sheet.getRow(4).height = 26;
    sheet.eachRow((row, index) => {
      if (index > 4 && index % 2)
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF1F5FF" },
          };
        });
    });
  }
  return Buffer.from(await book.xlsx.writeBuffer());
}
export function pdfReport(report: Gradebook) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const width = doc.internal.pageSize.getWidth(),
    height = doc.internal.pageSize.getHeight();
  const heading = (cohort: string) => {
    doc.setFillColor(7, 2, 53);
    doc.rect(0, 0, width, 28, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("QUIKZ | Academic Performance Report", 12, 12);
    doc.setFontSize(10);
    doc.text(cohort, 12, 21);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.text(
      `Prepared for ${report.viewer.name.slice(0, 80)} | ${report.generatedAt.slice(0, 10)} | Faculty-defined passing marks`,
      12,
      35,
    );
    doc.text(
      `Subject: ${report.filters.subjectId ? report.subjects.find((s) => String(s._id) === report.filters.subjectId)?.code || "Archived" : "All authorized subjects"} | Status: ${report.filters.status} | Score: ${report.filters.minScore}-${report.filters.maxScore}% | Search: ${report.filters.search.slice(0, 55) || "Any"}`,
      12,
      40,
    );
  };
  heading(
    report.viewer.role === "student"
      ? "Personal report card"
      : "Faculty master gradebook",
  );
  doc.setTextColor(7, 2, 53);
  doc.setFontSize(12);
  doc.text(
    `${report.summary.students} students   |   ${report.summary.attempts} attempts   |   Average ${report.summary.average.toFixed(2)}%   |   Pass rate ${report.summary.passRate.toFixed(2)}%`,
    12,
    52,
  );
  autoTable(doc, {
    startY: 60,
    head: [
      ["Year level / Section", "Students", "Attempts", "Average", "Pass rate"],
    ],
    body: report.groups.map((g) => [
      g.key,
      g.metrics.students,
      g.metrics.attempts,
      `${g.metrics.average.toFixed(2)}%`,
      `${g.metrics.passRate.toFixed(2)}%`,
    ]),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [70, 72, 212] },
    margin: { top: 47, bottom: 18, left: 12, right: 12 },
    willDrawPage: () =>
      heading(
        report.viewer.role === "student"
          ? "Personal report card"
          : "Faculty master gradebook",
      ),
  });
  for (const group of report.groups) {
    doc.addPage();
    const ordered = [...group.rows].sort(
      (a, b) =>
        a.surname.localeCompare(b.surname) ||
        a.studentName.localeCompare(b.studentName) ||
        b.percentage - a.percentage,
    );
    autoTable(doc, {
      startY: 48,
      head: [
        [
          "Surname / Student",
          "Subject / Term",
          "Quiz / Attempt",
          "Score",
          "Result",
          "Submitted (UTC)",
        ],
      ],
      body: ordered.map((r) => [
        `${r.surname}\n${r.studentName}`,
        `${r.subjectCode}\n${r.term}`,
        `${r.quizTitle}\nAttempt ${r.attempt}`,
        `${r.score}/${r.totalQuestions}\n${r.percentage.toFixed(2)}%`,
        `${r.passed ? "Passed" : "Needs review"}\nPass mark ${r.passingPercentage}%`,
        r.submittedAt.slice(0, 16).replace("T", " "),
      ]),
      styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [70, 72, 212] },
      columnStyles: {
        0: { cellWidth: 54 },
        1: { cellWidth: 44 },
        2: { cellWidth: 78 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 42 },
      },
      margin: { top: 47, bottom: 18, left: 12, right: 12 },
      rowPageBreak: "avoid",
      willDrawPage: () => heading(group.key),
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4)
          data.cell.styles.textColor =
            data.cell.text[0] === "Passed" ? [4, 120, 87] : [180, 83, 9];
      },
    });
    let y = (doc as any).lastAutoTable.finalY + 12;
    if (y > height - 40) {
      doc.addPage();
      heading(group.key);
      y = 54;
    }
    doc.setTextColor(7, 2, 53);
    doc.setFontSize(9);
    doc.text(
      "Certification: reviewed against the recorded assessment results.",
      12,
      y,
    );
    doc.text(
      "Faculty verification signature: ____________________________________    Date: __________________",
      12,
      y + 10,
    );
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.text(
      `Instructor(s): ${[...new Set(group.rows.map((r) => r.facultyName))].join(", ").slice(0, 140)}`,
      12,
      y + 17,
    );
  }
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text(
      `Quikz | Confidential academic record | Page ${page} of ${doc.getNumberOfPages()}`,
      12,
      height - 8,
    );
  }
  return Buffer.from(doc.output("arraybuffer"));
}
