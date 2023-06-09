import { component$, useContext, useSignal } from "@builder.io/qwik";
import { routeAction$, z, zod$ } from "@builder.io/qwik-city";
import db from "~/utils/db";
import { LogContext } from "~/routes/layout";
import { md5 } from "~/utils/skey";

export const useRegister = routeAction$(
  async (form, { fail }) => {
    await db.read();
    const user = db.data.users.find((user) => user.username === form.username);
    if (user) {
      db.data.logs.push({
        id: db.data.logs.length + 1,
        userId: -1,
        action: "register",
        time: Date.now(),
        success: false,
        reason: `username '${form.username}' already exists`,
      });
      await db.write();
      return fail(403, { message: "username already exists" });
    }
    db.data.users.push({
      id: db.data.users.length + 1,
      username: form.username,
      password: form.password,
      seededPassword: "",
    });
    db.data.logs.push({
      id: db.data.logs.length + 1,
      userId: db.data.users[db.data.users.length - 1].id,
      action: "register",
      time: Date.now(),
      success: true,
      reason: "",
    });
    await db.write();
    return {
      message: "success",
    };
  },
  zod$({
    username: z.string().nonempty(),
    password: z.string().min(6),
  })
);

export default component$(() => {
  const errorMessages = useSignal("");
  const username = useSignal("");
  const password = useSignal("");
  const register = useRegister();
  const log = useContext(LogContext);

  return (
    <div class="flex h-full w-full flex-col gap-2">
      <h1 class="text-lg font-bold">Register</h1>
      <div class="flex flex-col gap-2">
        <label class="font-semibold">Username</label>
        <input
          name="username"
          type="text"
          class="rounded-lg border border-gray-300 p-2"
          onChange$={(e) => (username.value = e.target.value)}
        />
        <label class="font-semibold">Password</label>
        <input
          name="password"
          type="password"
          class="rounded-lg border border-gray-300 p-2"
          onChange$={(e) => (password.value = e.target.value)}
        />
        <button
          class="rounded-lg bg-blue-500 p-2 text-white"
          onClick$={async () => {
            errorMessages.value = "";
            switch (true) {
              case !username.value:
                return (errorMessages.value = "Username is required");
              case !password.value:
                return (errorMessages.value = "Password is required");
              case password.value.length < 6:
                return (errorMessages.value =
                  "Password must be at least 6 characters");
            }
            const result = await register.submit({
              username: username.value,
              password: md5(password.value),
            });
            if (result.value.failed) {
              await log(result.value.message!);
              return (errorMessages.value = result.value.message!);
            }
            await log(`registered user ${username.value} successfully`);
          }}
        >
          Register
        </button>
        {errorMessages.value.length > 0 && (
          <p class="text-red-500">{errorMessages.value}</p>
        )}
      </div>
    </div>
  );
});
