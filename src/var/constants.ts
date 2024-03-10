export const CLIENT_HOST_NAME =
  process.env.CLIENT_HOST_NAME ?? "http://localhost:5173";
export const MAX_FILE_SIZE_IN_MB = 1;
export const MAX_IMAGE_COUNT = 10;
export const BUCKET_NAME =
  process.env.NODE_ENV === "test"
    ? "tomtomecommerce-test"
    : "tomtomecommerceimagebucket";

export const AWAITING_CONFIRMATION_TIMEOUT_MINUTE = 5;
export const CONFIRMED_TIMEOUT_MINUTE = 15;
export const DELIVERY_TIMEOUT_MINUTE = 15;
