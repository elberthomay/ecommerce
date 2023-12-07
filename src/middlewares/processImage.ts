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

/**
 * Process images of type webp from multipart request
 * @param force
 *  true : throw error if request is not of type multipart/form-data
 * "hasPicture": throw error if no picture is sent
 * @param maxImageCount maximum image count
 * @throws ImageError
 */
export default function processImage(
  force: boolean | "hasPicture",
  maxImageCount: number
) {
  return [
    upload.array("images", maxImageCount),
    catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      if (!req.is("multipart/form-data")) {
        if (force) throw new ImageError("No image provided");
        else return next();
      }

      //input type is multipart form

      //try to parse body
      try {
        req.body = JSON.parse(req.body.body);
      } catch (e) {
        req.body = {};
      }
      const uploadedFiles = req.files;
      if (uploadedFiles && uploadedFiles.length !== 0) {
        //has file

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
        else return next();
      } else {
        //no file
        if (force === "hasPicture") throw new ImageError("No image provided");
        else return next();
      }
    }),
  ];
}
