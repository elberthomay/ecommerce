export const MAX_FILE_SIZE_IN_MB = 1;
export const MAX_IMAGE_COUNT = 10;
export const BUCKET_NAME =
  process.env.NODE_ENV === "test"
    ? "tomtomecommerce-test"
    : "tomtomecommerceimagebucket";
