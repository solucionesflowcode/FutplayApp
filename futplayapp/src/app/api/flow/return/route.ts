import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let token = "";

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    token = body.token || "";
  } else {
    const formData = await request.formData();
    token = (formData.get("token") as string) || "";
  }

  const params = new URLSearchParams({ flowSuccess: "1" });
  if (token && token !== "{token}") {
    params.set("token", token);
  }

  return NextResponse.redirect(
    new URL(`/dashboard?${params.toString()}`, request.url),
    302,
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || "";

  const params = new URLSearchParams({ flowSuccess: "1" });
  if (token && token !== "{token}") {
    params.set("token", token);
  }

  return NextResponse.redirect(
    new URL(`/dashboard?${params.toString()}`, request.url),
    302,
  );
}
