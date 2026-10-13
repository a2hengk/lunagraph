export async function lazyGreet(name: string) {
  const mod = await import("./greet");
  return mod.greet(name);
}
