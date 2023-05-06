import type { QRL } from "@builder.io/qwik";
import {
  $,
  component$,
  createContextId,
  Slot,
  useContextProvider,
  useSignal,
} from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";

export const LogContext = createContextId<QRL<(msg: string) => void>>("log");

export default component$(() => {
  const logMsg = useSignal<string[]>([]);
  const log = $((msg: string) => {
    // [hh:mm:ss] msg
    logMsg.value = [
      ...logMsg.value,
      `[${new Date().toLocaleTimeString()}] ${msg}`,
    ];
  });
  useContextProvider(LogContext, log);
  const location = useLocation();
  const pathname = location.url.pathname;

  return (
    <div class="flex min-h-screen w-full items-center justify-center bg-slate-400">
      <div class="m-8 flex min-h-[30rem] w-full max-w-5xl gap-4 rounded-lg bg-white p-4 shadow-xl">
        <main class="flex-1">
          <Slot />
        </main>
        <div class="flex w-1/3 flex-col gap-2 rounded-lg border border-gray-300 p-2">
          <div class="flex w-full flex-wrap gap-2 font-bold">
            <Link
              class={[
                "rounded-lg px-4 py-1 transition-colors hover:bg-blue-300",
                pathname === "/" ? "bg-blue-300" : "bg-blue-100",
              ]}
              href="/"
            >
              login
            </Link>
            <Link
              class={[
                "rounded-lg px-4 py-1 transition-colors hover:bg-blue-300",
                pathname === "/register/" ? "bg-blue-300" : "bg-blue-100",
              ]}
              href="/register"
            >
              register
            </Link>
            <Link
              class={[
                "rounded-lg px-4 py-1 transition-colors hover:bg-blue-300",
                pathname === "/log/" ? "bg-blue-300" : "bg-blue-100",
              ]}
              href="/log"
            >
              server log
            </Link>
          </div>
          <div class="h-full rounded-lg border p-2">
            <label class="text-lg font-semibold">log</label>
            <div class="flex flex-1 flex-col gap-2">
              {logMsg.value.map((msg, idx) => (
                <div key={idx} class="break-all rounded-lg bg-slate-200 p-2">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
