import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TRIP_TEXT_MAX_LENGTH } from "./resolve";

const input = z.object({ text: z.string().trim().min(3).max(TRIP_TEXT_MAX_LENGTH) });

/** Public (passengers have no account): reads a free-text trip and returns registered origin/destination stops. */
export const interpretTrip = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const { interpretTripText } = await import("./interpret.server");
    return interpretTripText(data.text);
  });
