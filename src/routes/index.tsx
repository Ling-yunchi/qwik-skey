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
      db.data.logs.push({
        id: db.data.logs.length + 1,
        userId: -1,
        action: "seed",
        time: Date.now(),
        success: false,
        reason: `user ${form.username} not found`,
      });
      await db.write();
      return fail(404, { message: "User not found" });
    }
    const seed = getSeed();
    user.seededPassword = md5(user.password + seed);
    db.data.logs.push({
      id: db.data.logs.length + 1,
      userId: user.id,
      action: "seed",
      time: Date.now(),
      success: true,
      reason: "",
    });
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
      db.data.logs.push({
        id: db.data.logs.length + 1,
        userId: -1,
        action: "login",
        time: Date.now(),
        success: false,
        reason: `user ${form.username} not found`,
      });
      await db.write();
      return fail(404, { message: "User not found" });
    }
    if (user.seededPassword !== form.password) {
      db.data.logs.push({
        id: db.data.logs.length + 1,
        userId: user.id,
        action: "login",
        time: Date.now(),
        success: false,
        reason: `invalid password`,
      });
      await db.write();
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
    db.data.logs.push({
      id: db.data.logs.length + 1,
      userId: user.id,
      action: "login",
      time: Date.now(),
      success: true,
      reason: "",
    });
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
      db.data.logs.push({
        id: db.data.logs.length + 1,
        userId: -1,
        action: "auth",
        time: Date.now(),
        success: false,
        reason: `user ${form.userId} not found`,
      });
      await db.write();
      return fail(404, { message: "User not found" });
    }
    const userKey = db.data.keys.find((key) => key.userId === user.id);
    if (!userKey) {
      db.data.logs.push({
        id: db.data.logs.length + 1,
        userId: user.id,
        action: "auth",
        time: Date.now(),
        success: false,
        reason: `user ${user.username} not login`,
      });
      await db.write();
      return fail(403, { message: "Invalid key" });
    }
    if (userKey.key !== md5(form.key)) {
      db.data.logs.push({
        id: db.data.logs.length + 1,
        userId: user.id,
        action: "auth",
        time: Date.now(),
        success: false,
        reason: `user ${user.username} invalid key`,
      });
      await db.write();
      return fail(403, { message: "Invalid key" });
    }
    userKey.key = form.key;
    db.data.logs.push({
      id: db.data.logs.length + 1,
      userId: user.id,
      action: form.action,
      time: Date.now(),
      success: true,
      reason: "",
    });
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

  const loginErrorMessages = useSignal("");
  const username = useSignal("alice");
  const password = useSignal("123456");
  const keyNum = useSignal(5);

  const loginUsername = useSignal("");
  const loginPassword = useSignal("");
  const userId = useSignal(0);
  const keys = useSignal<string[]>([]);
  const keyIdx = useSignal(1);

  const authErrorMessages = useSignal("");
  const key = useSignal("");
  const action = useSignal("");

  const log = useContext(LogContext);

  return (
    <div class="flex h-full w-full flex-col">
      {/* Login */}
      <div class="flex flex-col gap-2">
        <h1 class="text-lg font-bold">Login</h1>
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
            loginErrorMessages.value = "";
            switch (true) {
              case !username.value:
                return (loginErrorMessages.value = "Username is required");
              case !password.value:
                return (loginErrorMessages.value = "Password is required");
              case password.value.length < 6:
                return (loginErrorMessages.value =
                  "Password must be at least 6 characters");
              case keyNum.value <= 0:
                return (loginErrorMessages.value =
                  "Key number must be greater than 0");
            }
            const seedRes = await seed.submit({ username: username.value });
            if (seedRes.value.failed) {
              return (loginErrorMessages.value = seedRes.value.message!);
            }
            await log(`seed: ${seedRes.value.seed}`);
            keys.value = generateKeys(
              md5(password.value),
              seedRes.value.seed!,
              keyNum.value
            );
            await log(
              `generate ${keyNum.value} keys: ${keys.value.join(", ")}`
            );
            const loginRes = await login.submit({
              username: username.value,
              password: md5(md5(password.value) + seedRes.value.seed),
              key: keys.value[0],
            });
            if (loginRes.value.failed) {
              await log(`login fail: ${loginRes.value.message}`);
              keys.value = [];
              return (loginErrorMessages.value = loginRes.value.message!);
            }
            keyIdx.value = 1;
            userId.value = loginRes.value.userId!;
            loginUsername.value = username.value;
            loginPassword.value = password.value;
            await log(`${username.value}(id:${userId.value}) login success`);
          }}
        >
          Login
        </button>
        {loginErrorMessages.value.length > 0 && (
          <p class="text-red-500">{loginErrorMessages.value}</p>
        )}
      </div>
      {/* Auth */}
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
                  [{idx}]{k}
                </div>
              ))}
            </>
          )}
        </div>
        <div class="flex flex-1 flex-col gap-2">
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
                  authErrorMessages.value = "";
                  switch (true) {
                    case !key.value:
                      return (authErrorMessages.value = "Key is required");
                    case !action.value:
                      return (authErrorMessages.value = "Action is required");
                  }
                  const res = await auth.submit({
                    userId: userId.value,
                    key: key.value,
                    action: action.value,
                  });
                  if (res.value.failed) {
                    await log(`auth fail: ${res.value.message}`);
                    return (authErrorMessages.value = res.value.message!);
                  }
                  keyIdx.value++;
                  await log(`auth success: ${res.value.message}`);
                  if (keyIdx.value === keys.value.length) {
                    await log("fresh keys");
                    const seedRes = await seed.submit({
                      username: loginUsername.value,
                    });
                    if (seedRes.value.failed) {
                      await log(`fresh keys fail: ${seedRes.value.message}`);
                      return (authErrorMessages.value = seedRes.value.message!);
                    }
                    await log(`seed: ${seedRes.value.seed}`);
                    const newKeys = generateKeys(
                      loginPassword.value,
                      seedRes.value.seed!,
                      keyNum.value
                    );
                    const loginRes = await login.submit({
                      username: loginUsername.value,
                      password: md5(
                        md5(loginPassword.value) + seedRes.value.seed
                      ),
                      key: newKeys[0],
                    });
                    if (loginRes.value.failed) {
                      await log(`fresh keys fail: ${loginRes.value.message}`);
                      return (authErrorMessages.value =
                        loginRes.value.message!);
                    }
                    keys.value = [...keys.value, ...newKeys];
                    keyIdx.value = keys.value.length - keyNum.value + 1;
                    await log(`fresh keys success: ${newKeys.join(", ")}`);
                  }
                }}
              >
                Next
              </button>
              {authErrorMessages.value.length > 0 && (
                <p class="text-red-500">{authErrorMessages.value}</p>
              )}
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
