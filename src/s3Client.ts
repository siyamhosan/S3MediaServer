import { Client } from "minio";
import "dotenv/config";

const client = new Client({
  endPoint: process.env.HOST!,
  useSSL: true,
  accessKey: process.env.ACCESS_KEY!,
  secretKey: process.env.SECRET_KEY!,
});

const BUCKET = "";

export async function uploadFile({
  name,
  buffer,
}: {
  name: string;
  buffer: Buffer;
}) {
  await client.putObject(BUCKET, name, buffer);

  return {
    name,
    url: `https://${process.env.DOMAIN}/public/${name}`,
  };
}

export async function uploadLink({ name, url }: { name: string; url: string }) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  await client.putObject(BUCKET, name, buffer);
  return {
    name,
    url: `https://${process.env.DOMAIN}/public/${name}`,
  };
}

export async function getFile(
  name: string,
  bucket?: string
): Promise<Buffer | void> {
  return await client
    .getObject(bucket ?? BUCKET, name)
    .then(async (res) => {
      const buffers: Buffer[] = [];
      res.on("data", (chunk) => {
        buffers.push(chunk);
      });

      let done = false;

      res.on("end", () => {
        done = true;
      });

      while (!done) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const buffer = Buffer.concat(buffers);
      return buffer;
    })
    .catch((err) => {
      if (err) {
        return undefined;
      }
    });
}

export async function deleteFile(name: string) {
  await client.removeObject(BUCKET, name);
}
