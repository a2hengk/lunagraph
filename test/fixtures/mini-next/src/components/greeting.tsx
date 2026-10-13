import { greet } from "@/lib/greet";
import type { User } from "@/lib/types";

export function Greeting({ name }: { name: User["name"] }) {
  return <p>{greet(name)}</p>;
}
