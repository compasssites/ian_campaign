import type { APIRoute } from "astro";
import { app } from "../../api/index";

const handle: APIRoute = async (context) => {
  return app.fetch(context.request, context.locals.runtime.env);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
