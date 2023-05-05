import { component$, useContext, useSignal } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeAction$, z, zod$ } from "@builder.io/qwik-city";
import db from "~/utils/db";
import { md5, getSeed, generateKeys } from "~/utils/skey";
import { LogContext } from "~/routes/layout";

export const useSeed = routeAction$(
  async (form, { fail }) => {
    await db.read();
    const user = db.data.users.find((user) => user.username === form.username);
    if (!user) {
      return fail(404, { message: "User not found" });
    }
    const seed = getSeed();
    user.seededPassword = md5(user.password + seed);
    await db.write();
    return {
      seed,
    };
  },
  zod$({
    username: z.string().nonempty(),
  })
);

export const useLogin = routeAction$(
  async (form, { fail }) => {
    await db.read();
    const user = db.data.users.find((user) => user.username === form.username);
    if (!user) {
      return fail(404, { message: "User not found" });
    }
    if (user.seededPassword !== form.password) {
      return fail(403, { message: "Invalid password" });
    }
    const userKey = db.data.keys.find((key) => key.userId === user.id);
    if (!userKey) {
      db.data.keys.push({
        userId: user.id,
        key: form.key,
      });
    } else {
      userKey.key = form.key;
    }
    await db.write();
    return {
      userId: user.id,
    };
  },
  zod$({
    username: z.string().nonempty(),
    password: z.string().min(6),
    key: z.string().nonempty(),
  })
);

export const useAuth = routeAction$(
  async (form, { fail }) => {
    await db.read();
    const user = db.data.users.find((user) => user.id === form.userId);
    if (!user) {
      return fail(404, { message: "User not found" });
    }
    const userKey = db.data.keys.find((key) => key.userId === user.id);
    if (!userKey) {
      return fail(403, { message: "Invalid key" });
    }
    if (userKey.key !== md5(form.key)) {
      return fail(403, { message: "Invalid key" });
    }
    userKey.key = form.key;
    await db.write();
    return {
      message: `user ${user.username} do ${form.action} action success`,
    };
  },
  zod$({
    userId: z.number(),
    key: z.string().nonempty(),
    action: z.string().nonempty(),
  })
);

export default component$(() => {
  const login = useLogin();
  const seed = useSeed();
  const auth = useAuth();

  const errorMessages = useSignal("");
  const username = useSignal("alice");
  const password = useSignal("123456");
  const keyNum = useSignal(5);

  const userId = useSignal(0);
  const keys = useSignal<string[]>([]);
  const keyIdx = useSignal(1);

  const key = useSignal("");
  const action = useSignal("");

  const log = useContext(LogContext);

  return (
    <div class="flex h-full w-full flex-col">
      <div class="flex flex-col gap-2">
        <h1 class="text-lg font-bold">登录</h1>
        <label class="font-semibold">Username</label>
        <input
          name="username"
          type="text"
          class="rounded-lg border border-gray-300 p-2"
          value={username.value}
          onChange$={(e) => (username.value = e.target.value)}
        />
        <label class="font-semibold">Password</label>
        <input
          name="password"
          type="password"
          class="rounded-lg border border-gray-300 p-2"
          value={password.value}
          onChange$={(e) => (password.value = e.target.value)}
        />
        <label class="font-semibold">Key Number</label>
        <input
          name="keyNum"
          type="number"
          class="rounded-lg border border-gray-300 p-2"
          value={keyNum.value}
          onChange$={(e) => (keyNum.value = parseInt(e.target.value))}
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
              case keyNum.value <= 0:
                return (errorMessages.value =
                  "Key number must be greater than 0");
            }
            const seedRes = await seed.submit({ username: username.value });
            if (seedRes.value.failed) {
              return (errorMessages.value = seedRes.value.message!);
            }
            await log(`获取Seed: ${seedRes.value.seed}`);
            keys.value = generateKeys(
              md5(password.value),
              seedRes.value.seed!,
              keyNum.value
            );
            await log(`生成${keyNum.value}个Key: ${keys.value.join(", ")}`);
            const loginRes = await login.submit({
              username: username.value,
              password: md5(md5(password.value) + seedRes.value.seed),
              key: keys.value[0],
            });
            if (loginRes.value.failed) {
              log(`登录失败: ${loginRes.value.message}`);
              keys.value = [];
              return (errorMessages.value = loginRes.value.message!);
            }
            keyIdx.value = 1;
            userId.value = loginRes.value.userId!;
            log(`用户${username.value}(id:${userId.value})登录成功`);
          }}
        >
          Login
        </button>
        {errorMessages.value.length > 0 && (
          <p class="text-red-500">{errorMessages.value}</p>
        )}
      </div>

      <div class="mt-2 flex gap-2">
        <div class="flex flex-col gap-2">
          {keys.value.length > 0 && (
            <>
              <label class="text-lg font-semibold">Key</label>
              {keys.value.map((k, idx) => (
                <div
                  key={idx}
                  class={`flex-1 rounded-lg border border-gray-300 p-2 ${
                    idx < keyIdx.value
                      ? "bg-green-200"
                      : idx === keyIdx.value
                      ? "bg-blue-300"
                      : "bg-gray-200"
                  } cursor-pointer transition-colors hover:bg-opacity-80`}
                  onClick$={() => (key.value = k)}
                >
                  {idx}:{k}
                </div>
              ))}
            </>
          )}
        </div>
        <div class="flex-1 flex flex-col gap-2">
          {keys.value.length > 0 && (
            <>
              <label class="font-semibold">Key</label>
              <input
                value={key.value}
                onChange$={(e) => (key.value = e.target.value)}
                class="rounded-lg border border-gray-300 p-2"
              />
              <label class="font-semibold">Action</label>
              <input
                value={action.value}
                onChange$={(e) => (action.value = e.target.value)}
                class="rounded-lg border border-gray-300 p-2"
              />
              <button
                class="rounded-lg bg-blue-500 p-2 text-white"
                onClick$={async () => {
                  const res = await auth.submit({
                    userId: userId.value,
                    key: key.value,
                    action: action.value,
                  });
                  if (res.value.failed) {
                    return log(`认证失败: ${res.value.message}`);
                  }
                  keyIdx.value++;
                  log(`认证成功: ${res.value.message}`);
                }}
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "S/Key Authentication",
  meta: [
    {
      name: "S/Key Authentication",
      content: "S/Key Authentication",
    },
  ],
};
