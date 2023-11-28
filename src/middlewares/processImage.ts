import catchAsync from "./catchAsync";
import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { MAX_FILE_SIZE_IN_MB } from "../var/constants";
import fileType from "file-type";
import ImageError from "../errors/ImageError";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_IN_MB * 1024 * 1024 },
});

export default function processImage() {
  return [
    upload.array("images", 10),
    catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      //try to parse body
      try {
        req.body = JSON.parse(req.body);
      } catch (e) {
        req.body = {};
        return next();
      }
      const uploadedFiles = req.files;
      if (!uploadedFiles || uploadedFiles.length === 0)
        throw new ImageError("No image provided");
      const validatedFiles = await Promise.all(
        (uploadedFiles as Express.Multer.File[]).map(async (file) => {
          const fileTypeResult = await fileType.fileTypeFromBuffer(file.buffer);
          if (!fileTypeResult || fileTypeResult.mime !== "image/webp")
            return {
              field: file.filename,
              message: "File is not of type WEBP",
            };
          else return file.buffer;
        })
      );
      const errors = validatedFiles.filter(
        (fileOrError) => !(fileOrError instanceof Buffer)
      ) as { field: string; message: string }[];
      if (errors) throw new ImageError("File is not of type WEBP", errors);
      else next();
    }),
  ];
}
