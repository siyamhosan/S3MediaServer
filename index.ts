import { createWriteStream, readFileSync, writeFileSync } from "fs";
import { Client } from "minio";
import internal from "stream";
import "dotenv/config";

const minioClient = new Client({
  endPoint: process.env.HOST!,
  useSSL: true,
  accessKey: process.env.ACCESS_KEY!,
  secretKey: process.env.SECRET_KEY!,
});

async function uploadTest1() {
  // Destination bucket
  const bucket = "js-test-bucket";

  // Check if the bucket exists
  // If it doesn't, create it
  const exists = await minioClient.bucketExists(bucket);
  if (exists) {
    console.log("Bucket " + bucket + " exists.");
  } else {
    await minioClient.makeBucket(bucket, "us-east-1");
    console.log("Bucket " + bucket + ' created in "us-east-1".');
  }

  const file = readFileSync("./image-removebg-preview (2).png");
  const metaData = {
    "Content-Type": "image/png",
  };

  const objectName = "image-removebg-preview (2).png";

  // Upload the file
  await minioClient
    .putObject(bucket, objectName, file, metaData)
    .then((res) => {
      console.log("File uploaded successfully.");
      console.log(res);
    });
}

async function readTest1() {
  const objectName = "image-removebg-preview (2).png";

  const bucket = "js-test-bucket";

  const file = await minioClient.getObject(bucket, objectName);

  const savePath = "./test.png";

  file.pipe(createWriteStream(savePath));
}

async function uploadTest2() {
  const filePath = "./image-removebg-preview (2).png";

  const file = readFileSync(filePath);

  const fileBuffer = Buffer.from(file);

  const metaData = {
    "Content-Type": "image/png",
  };

  const objectName = "image-removebg-preview (3).png";

  const startTime = new Date();
  await minioClient
    .putObject("js-test-bucket", objectName, fileBuffer, metaData)
    .then((res) => {
      console.log("File uploaded successfully.");
      console.log(res);
      console.log(
        "Time taken: " + (new Date().getTime() - startTime.getTime()) + "ms"
      );
    });
}

async function readTest2() {
  const objectName = "image-removebg-preview (3).png";

  const bucket = "js-test-bucket";

  const startTime = new Date();

  await minioClient.getObject(bucket, objectName).then((res) => {
    console.log("File downloaded successfully.");
    console.log(
      "Time taken: " + (new Date().getTime() - startTime.getTime()) + "ms"
    );

    const file: internal.Readable = res;

    const buffer: Buffer[] = [];

    file.on("data", (chunk) => {
      buffer.push(chunk);
    });

    file.on("end", () => {
      const fileBuffer = Buffer.concat(buffer);
      console.log("File size: " + fileBuffer.length + " bytes");

      console.log(
        "Full file in:" + (new Date().getTime() - startTime.getTime()) + "ms"
      );

      const savePath = "./test2.png";

      writeFileSync(savePath, fileBuffer);
    });
  });
}

async function publicLinkCreator() {
  const objectName = "image-removebg-preview (3).png";
  const bucket = "js-test-bucket";

  const url = await minioClient.presignedGetObject(bucket, objectName);

  console.log(url);
}
