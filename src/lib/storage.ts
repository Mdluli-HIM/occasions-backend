import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Swaps between local-disk storage (dev) and Cloudflare R2 (production) based
// on STORAGE_DRIVER. Callers only ever deal with saveFile() — nothing else in
// the app needs to know which driver is active.
//
// R2 is S3-compatible, so the same @aws-sdk/client-s3 client works — just
// pointed at R2's endpoint instead of AWS. See README "Deploying" section for
// how to create the bucket + API token.

type SaveFileInput = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

const driver = process.env.STORAGE_DRIVER === "r2" ? "r2" : "local";

const localUploadDir = path.join(process.cwd(), "uploads", "providers");
fs.mkdirSync(localUploadDir, { recursive: true });

let r2Client: S3Client | null = null;

function getR2Client() {
  if (r2Client) return r2Client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "STORAGE_DRIVER=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY to be set.",
    );
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return r2Client;
}

export async function saveFile({ buffer, filename, contentType }: SaveFileInput): Promise<{ url: string }> {
  if (driver === "local") {
    const filePath = path.join(localUploadDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    return { url: `/uploads/providers/${filename}` };
  }

  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_URL;

  if (!bucket || !publicBaseUrl) {
    throw new Error("STORAGE_DRIVER=r2 requires R2_BUCKET and R2_PUBLIC_URL to be set.");
  }

  const key = `providers/${filename}`;

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // R2 buckets are private by default — R2_PUBLIC_URL should point at
      // either the bucket's public dev URL or a custom domain with public
      // access enabled. See README.
    }),
  );

  return { url: `${publicBaseUrl.replace(/\/$/, "")}/${key}` };
}

export const storageDriver = driver;
