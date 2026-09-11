import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import {
  ApprovalPolicy,
  evaluateToolCall,
  isCriticalDestructiveCommand,
  readSandboxPolicy,
  SandboxProfile,
  ToolPermission,
  ToolPolicyDecision,
  writeSandboxPolicy,
} from "@pi-harness/policy";
import { runSandboxedCommand } from "../src/process-sandbox.js";

const root = await mkdtemp(join(tmpdir(), "pi-harness-verify-"));
const workspaceRoot = join(root, "workspace");
const privateRoot = join(workspaceRoot, "private");
const sibling = join(root, "sibling");
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
let requests = 0;
const server = createServer((_request, response) => {
  requests++;
  response.end("sandbox-network-ok");
});
const run = (command: string, overrides: Partial<Parameters<typeof runSandboxedCommand>[0]> = {}) =>
  runSandboxedCommand({
    command,
    commandId: randomUUID(),
    workspaceRoot,
    protectedPaths: [privateRoot],
    allowedDomains: [],
    timeoutMs: 10_000,
    maxOutputBytes: 16_384,
    onOutput() {},
    ...overrides,
  });

try {
  await mkdir(privateRoot, { recursive: true });
  await writeFile(sibling, "outside-secret");
  await writeFile(join(privateRoot, "credential"), "private-secret");
  await symlink(sibling, join(workspaceRoot, "escape"));
  assert.deepEqual((await readSandboxPolicy(privateRoot)).network.allowedDomains, []);
  const policy = await writeSandboxPolicy(privateRoot, {
    network: { allowedDomains: ["GitHub.com:443"], deniedDomains: ["*:22"] },
    profile: SandboxProfile.READ_ONLY,
  });
  assert.deepEqual(policy.network, {
    allowedDomains: ["GitHub.com:443"],
    deniedDomains: ["*:22"],
  });
  assert.equal(policy.profile, SandboxProfile.READ_ONLY);
  assert.equal(isCriticalDestructiveCommand("rm -rf .", workspaceRoot), true);
  assert.equal(isCriticalDestructiveCommand("rm -rf ./dist", workspaceRoot), false);
  assert.equal(isCriticalDestructiveCommand("git clean -fdx", workspaceRoot), true);
  assert.equal(isCriticalDestructiveCommand("find . -delete", workspaceRoot), true);
  assert.equal(
    (
      await evaluateToolCall({
        approvalPolicy: ApprovalPolicy.FULL_ACCESS,
        arguments: { command: "rm -rf ." },
        policy: { permission: ToolPermission.SHELL },
        workspaceRoot,
      })
    ).decision,
    ToolPolicyDecision.ASK,
  );
  assert.equal(
    (
      await evaluateToolCall({
        approvalPolicy: ApprovalPolicy.FULL_ACCESS,
        arguments: { path: "blocked" },
        policy: {
          allowMissing: true,
          permission: ToolPermission.WORKSPACE_WRITE,
          risk: "write",
          summary: "write",
        },
        workspaceRoot,
      })
    ).decision,
    ToolPolicyDecision.ALLOW,
  );

  const success = await run(
    'printf ok > result; cat result; printf temp > "$TMPDIR/check"; cat "$TMPDIR/check"',
  );
  assert.equal(success.exitCode, 0, success.all);
  assert.equal(success.all, "oktemp");
  const readOnly = await run("printf denied > readonly-result", { isWorkspaceWritable: false });
  assert.equal(readOnly.failed, true);
  await assert.rejects(readFile(join(workspaceRoot, "readonly-result"), "utf8"));
  const node = await run(`${quote(process.execPath)} -e 'process.stdout.write("node-ok")'`);
  assert.equal(node.exitCode, 0, node.all);
  assert.equal(node.all, "node-ok");
  for (const command of [
    `cat ${quote(sibling)}`,
    "cat escape",
    "cat private/credential",
    `printf bad > ${quote(sibling)}`,
    "printf bad > private/credential",
  ]) {
    const result = await run(command);
    assert.equal(result.failed, true, command);
    assert.doesNotMatch(result.all ?? "", /outside-secret|private-secret/);
  }
  assert.equal(await readFile(sibling, "utf8"), "outside-secret");
  assert.equal(await readFile(join(privateRoot, "credential"), "utf8"), "private-secret");
  const skillDirectory = join(root, "skills", "example");
  await mkdir(skillDirectory, { recursive: true });
  await writeFile(join(skillDirectory, "resource"), "skill-ok");
  const skillRoot = await realpath(skillDirectory);
  const readPaths = [skillRoot];
  assert.equal(
    (await run(`cat ${quote(join(skillRoot, "resource"))}`, { readPaths })).all,
    "skill-ok",
  );
  assert.equal((await run("cat private/credential", { readPaths })).failed, true);
  assert.equal(
    (await run(`printf bad > ${quote(join(skillRoot, "resource"))}`, { readPaths })).failed,
    true,
  );

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  const unrestricted = await run(`curl --noproxy '' --max-time 2 -fsS ${url}`);
  assert.equal(unrestricted.exitCode, 0, unrestricted.all);
  assert.equal(requests, 1);
  const restricted = await run(`curl --noproxy '' --max-time 2 -fsS ${url}`, {
    allowedDomains: ["example.com"],
  });
  assert.equal(restricted.failed, true);
  assert.equal(requests, 1);
  const allowed = await run(`curl --noproxy '' --max-time 2 -fsS ${url}`, {
    allowedDomains: [`127.0.0.1:${address.port}`],
  });
  assert.equal(allowed.exitCode, 0, allowed.all);
  assert.equal(allowed.all, "sandbox-network-ok");
  const approved = await run(`curl --noproxy '' --max-time 2 -fsS ${url}`, {
    allowedDomains: ["example.com"],
    onNetworkApproval: async ({ host, port }) => host === "127.0.0.1" && port === address.port,
  });
  assert.equal(approved.exitCode, 0, approved.all);
  const denied = await run(`curl --noproxy '' --max-time 2 -fsS ${url}`, {
    deniedDomains: [`127.0.0.1:${address.port}`],
    onNetworkApproval: async () => true,
  });
  assert.equal(denied.failed, true);
  assert(
    denied.violations.some((line) =>
      line.includes(`deny network-outbound 127.0.0.1:${address.port}`),
    ),
  );
  const credential = await run(`printf '%s' "$PI_HARNESS_VERIFY_TOKEN"`, {
    credentials: [
      {
        injectHosts: ["api.example.com"],
        name: "PI_HARNESS_VERIFY_TOKEN",
        value: "real-token-must-not-enter-command-env",
      },
    ],
  });
  assert.equal(credential.exitCode, 0, credential.all);
  assert.doesNotMatch(credential.all ?? "", /real-token-must-not-enter-command-env/u);
  assert.match(credential.all ?? "", /^fake_value_/u);

  const background = await run("sleep 20 & echo $!");
  assert.equal(background.exitCode, 0, background.all);
  const pid = Number(background.all?.trim());
  assert(Number.isInteger(pid) && pid > 0);
  await setTimeout(100);
  assert.throws(() => process.kill(pid, 0));
  assert.equal((await run("sleep 20", { timeoutMs: 500 })).timedOut, true);
  const abort = new AbortController();
  const pending = run("sleep 20", { signal: abort.signal });
  const timer = globalThis.setTimeout(() => abort.abort(), 500);
  try {
    assert.equal((await pending).isCanceled, true);
  } finally {
    clearTimeout(timer);
  }
  assert.equal((await run("yes x", { maxOutputBytes: 1024 })).isMaxBuffer, true);
  const secondWorkspace = join(root, "second");
  await mkdir(secondWorkspace);
  await writeFile(join(secondWorkspace, "second-secret"), "second");
  const concurrent = await Promise.all([
    run(`test ! -r ${quote(join(secondWorkspace, "second-secret"))} && printf one`),
    run("cat second-secret", { workspaceRoot: secondWorkspace }),
  ]);
  assert.deepEqual(
    concurrent.map((result) => result.all),
    ["one", "second"],
  );
  assert.equal((await run("exit 7")).exitCode, 7);
  console.log(
    "Sandbox verification passed: files, symlinks, policy writes, network, process cleanup, timeout, abort, output, concurrency, exit status.",
  );
} finally {
  server.closeAllConnections();
  if (server.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await rm(root, { recursive: true, force: true });
}
