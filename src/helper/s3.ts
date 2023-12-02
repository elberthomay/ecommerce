import { S3Client } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";

const s3Client = new S3Client({
  region: "ap-southeast-1",
  credentials: fromEnv(),
});
