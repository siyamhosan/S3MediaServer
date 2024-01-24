import fastify, { RouteGenericInterface } from "fastify";
import { readFileSync } from "fs";
import { getFile, uploadFile } from "./s3Client";
import fastifyFavicon from "fastify-favicon";
import "dotenv/config";

const server = fastify();
const notFoundHtml = readFileSync("./public/404.html");
const uploadHtml = readFileSync("./public/upload.html");

server.register(fastifyFavicon, {
  path: "./public",
});
server.register(require("@fastify/multipart"));

server.get("/", async (request, reply) => {
  return { hello: "world" };
});

interface TransParams extends RouteGenericInterface {
  Params: {
    id?: string;
    bucket?: string;
  };
}

server.get("/trans", async (request, reply) => {
  return reply.status(400).type("text/html").send(notFoundHtml);
});

server.get<TransParams>("/trans/:bucket/:id", async (request, reply) => {
  let id = request.params.id;
  const bucket = request.params.bucket;

  console.log(id, bucket);

  if (!id || !bucket) {
    return reply.status(400).type("text/html").send(notFoundHtml);
  }
  if (!id?.endsWith(".html")) id += ".html";

  await getFile(id, bucket)
    .catch((err) => {
      return reply.status(400).type("text/html").send(notFoundHtml);
    })
    .then(async (fileBuffer) => {
      if (!fileBuffer) {
        return reply.status(400).type("text/html").send(notFoundHtml);
      }

      const file = fileBuffer;

      return reply.status(200).type("text/html").send(file);
    });
});

interface PublicParams extends RouteGenericInterface {
  Params: {
    file?: string;
  };
  Querystring: {
    dl?: string;
  };
}

server.get<PublicParams>("/public/:file", async (request, reply) => {
  const fileName = request.params?.file;

  if (!fileName) {
    return reply.status(400).type("text/html").send(notFoundHtml);
  }

  await getFile(fileName, "public")
    .catch((err) => {
      return reply.status(400).type("text/html").send(notFoundHtml);
    })
    .then(async (fileBuffer) => {
      if (!fileBuffer) {
        return reply.status(400).type("text/html").send(notFoundHtml);
      }

      const file = fileBuffer;

      let type;
      switch (fileName.split(".").pop()) {
        case "html":
          type = "text/html";
          break;
        case "css":
          type = "text/css";
          break;
        case "js":
          type = "text/javascript";
          break;
        default:
          type = "text/plain";
          break;
      }

      const dl = request.query?.dl;
      if (
        dl === "true" ||
        dl === "1" ||
        dl === "yes" ||
        dl === "y" ||
        dl === "t" ||
        dl === "on"
      ) {
        reply.header(
          "Content-Disposition",
          `attachment; filename="${fileName}"`
        );
      }

      return reply.status(200).type(type).send(file);
    });
});

// just testing
const UPLOAD_PASS = "pass2";

server.get("/upload", async (request, reply) => {
  return reply.status(200).type("text/html").send(uploadHtml);
});

const RetryLeft = new Map<string, number>();

server.get<{ Params: { pass?: string } }>(
  "/validate/:pass",
  async (request, reply) => {
    const pass = request.params.pass;
    const retryLeft = RetryLeft.get(request.ip) ?? 5;

    if (retryLeft <= 0) {
      return reply.status(200).type("text/plain").send("blocked");
    }

    if (!pass) return reply.status(200).type("text/plain").send("false");

    if (pass === UPLOAD_PASS) {
      RetryLeft.set(request.ip, 5);

      return reply.status(200).type("text/plain").send("true");
    } else {
      RetryLeft.set(request.ip, retryLeft - 1);

      return reply.status(200).type("text/plain").send("false");
    }
  }
);

server.post<{ Body: { pass?: string; file?: File } }>(
  "/upload",
  async (request, reply) => {
    const pass = request.body?.pass;
    const file = request.body?.file;

    if (!pass || !file) {
      return reply.status(400).type("text/html").send(uploadHtml);
    }
    const name = file.name;

    if (pass !== UPLOAD_PASS) {
      return reply.status(400).type("text/html").send(uploadHtml);
    }

    const fileBufferArray = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileBufferArray);

    await uploadFile({
      name,
      buffer: fileBuffer,
    })
      .then(async (res) => {
        return reply.status(200).redirect(res.url);
      })
      .catch((err) => {
        return reply
          .status(400)
          .type("text/html")
          .send("Failed to upload file.");
      });
  }
);

server.listen(
  {
    port: parseInt(process.env.PORT || "3000"),
    host: "0.0.0.0",
  },
  (err, address) => {
    if (err) throw err;
    console.log(`Server listening on ${address}`);
  }
);
