import { component$, useSignal } from "@builder.io/qwik";
import { routeLoader$, useNavigate } from "@builder.io/qwik-city";
import db from "~/utils/db";

export const useLogLoader = routeLoader$(async (event) => {
  await db.read();
  const page = event.query.get("page")
    ? Math.max(1, Number(event.query.get("page")))
    : 1;
  const logs = db.data.logs.slice((page - 1) * 10, page * 10);
  const res = logs.map((log) => {
    const user = db.data.users.find((user) => user.id === log.userId);
    return {
      ...log,
      username: user ? user.username : "",
    };
  });
  return {
    page: page,
    total: Math.ceil(db.data.logs.length / 10),
    logs: res,
  };
});

export default component$(() => {
  const logs = useLogLoader();
  const pageInput = useSignal(logs.value.page);
  const navigate = useNavigate();
  return (
    <div class="flex h-full w-full flex-col gap-2">
      <h1 class="text-lg font-bold">Server Log</h1>
      <div class="flex-1">
        <table class="w-full">
          <thead>
            <tr>
              <th class="border">id</th>
              <th class="border">userid</th>
              <th class="border">username</th>
              <th class="border">time</th>
              <th class="border">action</th>
              <th class="border">success</th>
              <th class="border">reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.value.logs.map((log) => (
              <tr key={log.id}>
                <td class="border">{log.id}</td>
                <td class="border">{log.userId === -1 ? "-" : log.userId}</td>
                <td class="border">
                  {log.username === "" ? "-" : log.username}
                </td>
                <td class="border">{new Date(log.time).toLocaleString()}</td>
                <td class="border">{log.action}</td>
                <td class="border">{log.success ? "true" : "false"}</td>
                <td class="border">{log.reason === "" ? "-" : log.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            class="rounded border p-1"
            disabled={logs.value.page === 1}
            onClick$={() => navigate(`/log/?page=${logs.value.page - 1}`)}
          >
            Previous
          </button>
          <div class="mx-2">
            {logs.value.page}/{logs.value.total}
          </div>
          <button
            class="rounded border p-1"
            disabled={logs.value.page === logs.value.total}
            onClick$={() => navigate(`/log/?page=${logs.value.page + 1}`)}
          >
            Next
          </button>
        </div>
        <div>
          <input
            type="number"
            class="w-16 rounded border p-1"
            value={pageInput.value}
            onChange$={(e) => {
              pageInput.value = Number(e.target.value);
            }}
          />
          <button
            class="rounded border p-1"
            onClick$={() => navigate(`/log/?page=${pageInput.value}`)}
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
});
