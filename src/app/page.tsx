import type { Metadata } from "next";
import LandingClient from "./LandingClient";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Page() {
  return <LandingClient />;
}
