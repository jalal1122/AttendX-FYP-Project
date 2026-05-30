import multer from "multer";

const spreadsheetFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/csv",
    "text/plain",
  ];

  const allowedExtensions = /xlsx|xls|csv/;
  const hasAllowedExtension = allowedExtensions.test(
    file.originalname.toLowerCase(),
  );

  if (hasAllowedExtension || allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error("Only Excel or CSV files are allowed for bulk student import"));
};

const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: spreadsheetFileFilter,
});

export default spreadsheetUpload;
