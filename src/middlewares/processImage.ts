import catchAsync from "./catchAsync";
import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { MAX_FILE_SIZE_IN_MB, MAX_IMAGE_COUNT } from "../var/constants";
// import fileType from "file-type";
import ImageError from "../errors/ImageError";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_IN_MB * 1024 * 1024 },
});

export default function processImage() {
  return [
    upload.array("images", MAX_IMAGE_COUNT),
    catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      if (!req.is("multipart/form-data")) {
        return next();
      }

      //try to parse body
      try {
        req.body = JSON.parse(req.body.body);
      } catch (e) {
        req.body = {};
      }
      const uploadedFiles = req.files;
      if (!uploadedFiles || uploadedFiles.length === 0)
        throw new ImageError("No image provided");

      const validationResult = await Promise.all(
        (uploadedFiles as Express.Multer.File[]).map(async (file) => {
          // const mimeType = (await fileType.fileTypeFromBuffer(file.buffer))
          //   ?.mime;
          const mimeType = file.mimetype;

          const isCorrectType = mimeType && mimeType === "image/webp";
          return isCorrectType
            ? file.buffer
            : {
                field: file.originalname,
                message: "File is not of type WEBP",
              };
        })
      );
      const errors = validationResult.filter(
        (fileOrError) => !(fileOrError instanceof Buffer)
      ) as { field: string; message: string }[];

      if (errors.length !== 0)
        throw new ImageError("File is not of type WEBP", errors);
      else next();
    }),
  ];
}
