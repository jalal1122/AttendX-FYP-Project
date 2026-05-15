export const DEPARTMENT_OPTIONS = [
  "AI",
  "IT",
  "CS",
  "BBA",
  "BCA",
  "ECE",
  "EEE",
  "ME",
  "CE",
  "MBA",
  "MCA",
  "Biotechnology",
  "Commerce",
  "Economics",
];

export const SEMESTER_OPTIONS = Array.from({ length: 8 }, (_, index) => index + 1);

// Last 4 starting batches plus current year (5 total), 4-year programs.
export const getBatchOptions = (year = new Date().getFullYear()) =>
  Array.from({ length: 5 }, (_, index) => {
    const startYear = year - 4 + index;
    const endYear = startYear + 4;
    return `${startYear}-${endYear}`;
  });
